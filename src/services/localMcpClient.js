const LOOPBACK_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
]);

/** True when the URL points at a host the cloud cannot dial. */
export const isLocalMcpUrl = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return LOOPBACK_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
};

/** A single MCP session — protocolVersion / sessionId / nextId. */
const newSession = () => ({
  id: 1,
  initialized: false,
  sessionId: null,
});

/**
 * Per-URL session cache. The MCP server keeps a single transport
 * instance alive for the whole process, so it accepts `initialize`
 * exactly once and rejects subsequent ones with
 *   "Invalid Request: Server already initialized" (JSON-RPC -32600).
 * We therefore reuse the same session object across all calls to the
 * same URL within one browser tab.
 */
const SESSIONS = new Map();
const sessionFor = (url) => {
  let s = SESSIONS.get(url);
  if (!s) { s = newSession(); SESSIONS.set(url, s); }
  return s;
};

/** Drop the cached session — used when initialize comes back with an
 *  error we can't recover from, so the next call starts clean. */
const dropSession = (url) => { SESSIONS.delete(url); };

/* ----------------------------------------------------------------- */

const buildRequest = (session, method, params) => ({
  jsonrpc: '2.0',
  id: session.id++,
  method,
  params,
});

/** Parse either a plain JSON body or a single SSE `data:` frame. */
const parseMcpResponse = async (resp) => {
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  const text = await resp.text();
  if (ct.includes('text/event-stream')) {
    // Find the first `data:` line — that's the JSON-RPC reply.
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('data:')) {
        return JSON.parse(line.slice(5).trim());
      }
    }
    throw new Error('SSE stream did not contain a data frame');
  }
  return text ? JSON.parse(text) : {};
};

const post = async (url, session, body, authHeader) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (session.sessionId) headers['Mcp-Session-Id'] = session.sessionId;
  // The user can configure bearer auth on their generated MCP server
  // (Step 5 of the wizard). When that's on, the server rejects calls
  // missing the `Authorization` header with HTTP 401. Forward whatever
  // header string the caller computed (e.g. `Bearer ghp_…`).
  if (authHeader && typeof authHeader === 'string' && authHeader.trim()) {
    headers.Authorization = authHeader.trim();
  }
  let resp;
  try {
    resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (e) {
    // The most common failure here is the user not having the MCP
    // server running, or a CORS preflight failing. Both surface in
    // fetch() as a TypeError with no useful body.
    throw new Error(
      `Could not reach MCP server at ${url}.\n` +
      `Make sure it is running and serves "Access-Control-Allow-Origin: *" so the browser can talk to it directly.`,
    );
  }
  if (!resp.ok) {
    // Special-case 401 so the user immediately knows the issue is the
    // bearer token (their MCP server has auth enabled).
    if (resp.status === 401) {
      throw new Error(
        `MCP server returned 401 Unauthorized. Your server has bearer auth enabled — ` +
        `make sure the "Authorization header" field is filled in (e.g. \`Bearer <token>\`).`,
      );
    }
    // For 400 the MCP server typically returns a JSON-RPC error body
    // (e.g. "Server already initialized", "Bad Request: no active MCP
    // session"). Try to surface that body verbatim — it's far more
    // useful than a generic "HTTP 400 Bad Request".
    if (resp.status === 400) {
      try {
        const parsed = await parseMcpResponse(resp);
        if (parsed?.error?.message) return parsed; // let caller handle JSON-RPC error
      } catch { /* fall through to generic error */ }
    }
    throw new Error(`MCP server responded with HTTP ${resp.status} ${resp.statusText}`);
  }
  // Capture session id assigned by the server on the first response.
  const sid = resp.headers.get('Mcp-Session-Id');
  if (sid) session.sessionId = sid;
  return parseMcpResponse(resp);
};

const ensureInitialized = async (url, session, authHeader) => {
  if (session.initialized) return;
  const initParams = {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'forgesphere-ui', version: '0.1' },
  };
  const out = await post(url, session, buildRequest(session, 'initialize', initParams), authHeader);
  if (out.error) {
    // The MCP SDK rejects a second `initialize` on the same Server
    // instance with -32600 "Server already initialized". This happens
    // when the user is still running an older build of their generated
    // MCP server (pre per-session-transport patch). Surface a clear,
    // actionable message instead of the raw JSON-RPC error.
    const msg = out.error.message || JSON.stringify(out.error);
    if (/already initialized/i.test(msg)) {
      throw new Error(
        'The MCP server is already initialized for another client. ' +
        'Restart your local server (Ctrl+C and `npm start` again) — ' +
        'or rebuild it from the latest generated zip so it supports ' +
        'multiple sessions.',
      );
    }
    throw new Error(`MCP initialize failed: ${msg}`);
  }
  session.initialized = true;
};

/**
 * List tools exposed by a local MCP server. Resolves to
 *   { success: true, data: { tools: [{ name, description, inputSchema }, …] } }
 * or
 *   { success: false, error: '<human-readable>' }.
 */
export const localListTools = async (url, authHeader) => {
  // Reuse the per-URL session so we don't re-send `initialize` on every
  // Probe click — the MCP server rejects a second initialize with
  // HTTP 400 "Server already initialized" (JSON-RPC -32600).
  const session = sessionFor(url);
  try {
    await ensureInitialized(url, session, authHeader);
    const out = await post(url, session, buildRequest(session, 'tools/list', {}), authHeader);
    if (out.error) {
      return { success: false, error: out.error.message || 'tools/list failed' };
    }
    const tools = Array.isArray(out.result?.tools) ? out.result.tools : [];
    return { success: true, data: { tools } };
  } catch (e) {
    // If the cached session is stale (server restarted, lost the
    // session id, etc.) drop it so the next call starts clean.
    const msg = e?.message || String(e);
    if (/already initialized|session/i.test(msg)) dropSession(url);
    return { success: false, error: msg };
  }
};

/**
 * Call a single tool against the local MCP server.
 *  args is an object — passed straight through as `arguments`.
 */
export const localCallTool = async (url, toolName, args, authHeader) => {
  // Reuse the per-URL session (see localListTools for the rationale).
  const session = sessionFor(url);
  const t0 = performance.now();
  try {
    await ensureInitialized(url, session, authHeader);
    const out = await post(url, session, buildRequest(session, 'tools/call', {
      name: toolName,
      arguments: args ?? {},
    }), authHeader);
    const latencyMs = Math.round(performance.now() - t0);
    if (out.error) {
      return { success: false, error: out.error.message || 'tools/call failed', latencyMs };
    }
    return {
      success: true,
      data: {
        ok:        !out.result?.isError,
        latencyMs,
        result:    out.result,
        error:     out.result?.isError ? 'MCP tool returned isError=true' : null,
        raw:       out,
      },
    };
  } catch (e) {
    const msg = e?.message || String(e);
    if (/already initialized|session/i.test(msg)) dropSession(url);
    return { success: false, error: msg, latencyMs: Math.round(performance.now() - t0) };
  }
};
