import axiosInstance from './axiosInstance';
import { TESTING_ENDPOINTS } from '../config/testingConfig';
import { isLocalMcpUrl, localListTools, localCallTool } from './localMcpClient';

const SPHERE_TOKEN = '04fca544-92c9-4f81-962b-fa8207a6cf2c';

// (REMOVED) axiosInstance.defaults.headers.common['X-Sphere-Service-Token'] = SPHERE_TOKEN;

const wrap = async (fn, errMsg = 'Request failed') => {
  try {
    const res = await fn();
    return { success: true, data: res.data?.data ?? res.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || errMsg,
      status: error.response?.status,
    };
  }
};

/* ------------------------------------------------------------------ */
/*                 1) AD-HOC HTTP REQUEST EXECUTION                    */
/* ------------------------------------------------------------------ */

const AUTH_DTO = (a) => {
  if (!a || a.type === 'none') return null;
  if (a.type === 'bearer') return { type: 'BEARER', token: a.token || '' };
  if (a.type === 'basic')  return { type: 'BASIC', username: a.username || '', password: a.password || '' };
  return null;
};

const RAW_LANG = { json: 'JSON', text: 'TEXT', xml: 'XML', html: 'HTML', javascript: 'JAVASCRIPT' };

const BODY_DTO = (b) => {
  if (!b || b.type === 'none') return null;
  if (b.type === 'raw') return { mode: 'RAW', raw: b.value || '', language: RAW_LANG[b.language] || 'TEXT' };
  if (b.type === 'form-data') return {
    mode: 'FORM_DATA',
    formData: (b.fields || []).filter(f => f.enabled && f.key?.trim())
      .map(f => ({ key: f.key, value: f.value, type: 'TEXT' })),
  };
  if (b.type === 'x-www-form-urlencoded') return {
    mode: 'URL_ENCODED',
    urlEncoded: (b.fields || []).filter(f => f.enabled && f.key?.trim())
      .map(f => ({ key: f.key, value: f.value })),
  };
  return null;
};

export const testingService = {
  /** Execute a one-off request via ForgeQ. Result is never persisted. */
  executeAdhoc: async ({ method, url, headers, auth, body }) => {
    const payload = {
      method,
      url: { raw: url },
      headers: (headers || []).filter(h => h.enabled && h.key?.trim())
        .map(h => ({ key: h.key, value: h.value })),
      auth: AUTH_DTO(auth),
      body: BODY_DTO(body),
      noHistory: true,
    };
    const out = await wrap(
      () => axiosInstance.post(TESTING_ENDPOINTS.REQUEST.ADHOC_EXECUTE, payload, {
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Failed to execute request',
    );
    if (!out.success) return out;

    // Normalise the ForgeQ envelope. Backend returns:
    //   data: { runId, status, totalMs, finalUrl, response: { httpStatus,
    //           statusText, headers:[{key,value}], body, contentType }, ... }
    const r = out.data?.response || {};
    const headersObj = (r.headers || []).reduce((acc, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {});
    const status = r.httpStatus ?? 0;
    const ct = r.contentType || headersObj['Content-Type'] || headersObj['content-type'] || '';
    let parsed = r.body;
    if (typeof parsed === 'string' && ct.includes('json')) {
      try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
    }
    return {
      success: true,
      data: {
        status,
        statusText: r.statusText || statusTextFor(status),
        headers: headersObj,
        data: parsed,
        totalMs: out.data?.totalMs ?? 0,
        phases: Array.isArray(out.data?.phases) ? out.data.phases : [],
        network: out.data?.network || null,
        finalUrl: out.data?.finalUrl || null,
        method: out.data?.method || null,
        runId: out.data?.runId || null,
        runAt: out.data?.runAt || null,
        error: out.data?.error || null,
      },
    };
  },

  /* ----------------------------------------------------------------- */
  /*    2) MCP CATALOG + INSPECTOR                                      */
  /* ----------------------------------------------------------------- */

  fetchMcpCatalog: ({ q, category, limit = 200 } = {}) => {
    const params = {};
    if (q) params.q = q;
    if (category && category !== 'All') params.category = category;
    if (limit) params.limit = limit;
    return wrap(
      () => axiosInstance.get(TESTING_ENDPOINTS.MCP.CATALOG, {
        params,
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Failed to load MCP catalog',
    ).then((out) => {
      if (!out.success) return out;
      // Backend may return { items: [...] } or [...] depending on version.
      const raw = out.data?.items ?? out.data ?? [];
      const items = Array.isArray(raw) ? raw.map((it) => ({
        slug: it.slug,
        name: it.name,
        desc: it.description || '',
        category: it.category || 'Other',
        transport: it.transport || 'STREAMABLE_HTTP',
        requiresAuth: !!it.requiresAuth,
        official: !!it.official,
        source: it.source || 'OFFICIAL_REGISTRY',
        homepage: it.homepage,
        serverUrl: it.serverUrl,
        // Backend hints — STDIO catalog entries are flagged as
        // connectable:false + localOnly:true because they need a local
        // process and cannot be opened from a browser.
        connectable: it.connectable !== false,
        localOnly: !!it.localOnly,
        authHelp: it.authHelp || '',
      })) : [];
      return { success: true, data: items };
    });
  },

  mcpConnect: (server) => {
    const localUrl = server?.url || server?.server_url;
    if (isLocalMcpUrl(localUrl)) {
      return Promise.resolve({ success: true, data: { local: true, url: localUrl } });
    }
    return wrap(
      () => axiosInstance.post(TESTING_ENDPOINTS.MCP.INSPECT_CONNECT, { server }, {
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Connect failed'
    );
  },

  mcpListTools: async (server) => {
    // ── Local-MCP fast path ────────────────────────────────────────
    // When the user runs an MCP server on their laptop, the cloud
    // backend can't reach it. Bypass it and dial directly from the
    // browser using the JSON-RPC client we ship with the UI. If the
    // user configured bearer auth on their server, the connector ref
    // carries `auth_header` (snake_case) or `authHeader` — forward
    // whichever is set so we don't get a 401.
    const localUrl = server?.url || server?.server_url;
    if (isLocalMcpUrl(localUrl)) {
      const auth = server?.auth_header || server?.authHeader;
      return localListTools(localUrl, auth);
    }
    const out = await wrap(
      () => axiosInstance.post(TESTING_ENDPOINTS.MCP.INSPECT_TOOLS_LIST, { server }, {
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Failed to list tools'
    );
    if (!out.success) return out;
    // Backend wraps the MCP JSON-RPC response in a McpInspectResult envelope.
    // Real tool list lives at `parsed_result.tools`.
    const pr = out.data?.parsed_result || {};
    const tools = Array.isArray(pr.tools) ? pr.tools : [];
    if (!out.data?.is_success && tools.length === 0) {
      return { success: false, error: out.data?.error_message || 'tools/list returned no tools' };
    }
    return { success: true, data: { tools } };
  },

  mcpCallTool: async (server, toolName, args) => {
    const localUrl = server?.url || server?.server_url;
    if (isLocalMcpUrl(localUrl)) {
      const auth = server?.auth_header || server?.authHeader;
      return localCallTool(localUrl, toolName, args, auth);
    }
    const out = await wrap(
      () => axiosInstance.post(TESTING_ENDPOINTS.MCP.INSPECT_TOOLS_CALL, { server, tool_name: toolName, arguments: args }, {
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Tool call failed',
    );
    if (!out.success) return out;
    // Surface the parsed MCP result + the inspect-envelope metadata.
    const env = out.data || {};
    return {
      success: true,
      data: {
        ok: env.is_success !== false && !env.parsed_result?.isError,
        latencyMs: env.latency_ms ?? 0,
        result: env.parsed_result || env.response_json || null,
        error: env.error_message || null,
        traceSteps: Array.isArray(env.trace_steps) ? env.trace_steps : [],
        raw: env,
      },
    };
  },

  /* ----------------------------------------------------------------- */
  /*    3) FUNCTIONAL SUITE                                            */
  /* ----------------------------------------------------------------- */
  executeFunctionalSuite: async (payload) => {
    return wrap(
      () => axiosInstance.post(TESTING_ENDPOINTS.SUITE.RUN, payload, {
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Failed to run functional suite',
    );
  },

  /* ----------------------------------------------------------------- */
  /*    4) PERFORMANCE TEST                                            */
  /* ----------------------------------------------------------------- */
executePerformanceTest: async (payload) => {
  return wrap(
    () => axiosInstance.post(TESTING_ENDPOINTS.PERFORMANCE.RUN, payload, {
      headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN },
      timeout: 180000   // 3 minutes
    }),
    'Failed to run performance test',
  );
},

  getPerformanceStatus: async (runId) => {
  return wrap(
    () => axiosInstance.get(`${TESTING_ENDPOINTS.PERFORMANCE.STATUS}/${runId}`, {
      headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
    }),
    'Failed to fetch performance status'
  );
},

  /* ----------------------------------------------------------------- */
  /*    5) HISTORY                                                     */
  /* ----------------------------------------------------------------- */
  getHistory: async (params = {}) => {
    return wrap(
      () => axiosInstance.get(TESTING_ENDPOINTS.HISTORY.GET, {
        params,
        headers: { 'X-Sphere-Service-Token': SPHERE_TOKEN }
      }),
      'Failed to fetch history',
    );
  },
};

/** Build the ServerRef the inspector expects. */
export const buildServerRef = ({ serverId, serverUrl, transport, authToken, headerName = 'Authorization' }) => {
  const ref = { transport };
  if (serverId) ref.server_id = serverId;
  if (serverUrl) ref.server_url = serverUrl;
  if (authToken) {
    ref.auth_headers = [{
      key: headerName,
      value: headerName.toLowerCase() === 'authorization' && !authToken.startsWith('Bearer ')
        ? `Bearer ${authToken}` : authToken,
    }];
  }
  return ref;
};

function statusTextFor(s) {
  if (s === 0) return 'Network Error';
  if (s === 200) return 'OK';
  if (s === 201) return 'Created';
  if (s === 204) return 'No Content';
  if (s === 301) return 'Moved Permanently';
  if (s === 302) return 'Found';
  if (s === 400) return 'Bad Request';
  if (s === 401) return 'Unauthorized';
  if (s === 403) return 'Forbidden';
  if (s === 404) return 'Not Found';
  if (s === 500) return 'Internal Server Error';
  return s >= 200 && s < 300 ? 'OK' : 'Error';
}

export default testingService;
