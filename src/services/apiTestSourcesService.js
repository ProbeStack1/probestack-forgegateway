/**
 * apiTestSourcesService — feeds the three left-sidebar tabs on the API
 * Test page (Microservice / Apigee Proxy / Kong) with the EXACT same
 * data Dashboard.jsx renders.
 *
 * Every source family is an `onboarding` record filed under a different
 * `projectType`:
 *   • MICROSERVICE
 *   • APIGEE_PROXY
 *   • KONG_GATEWAY_SERVICE
 *
 * Per-source endpoint discovery is a two-step walk (mirrors Dashboard):
 *   1. `apiDesignService.getImportedByMicroservice(rowId)` → imported
 *      specs metadata.
 *   2. `mockApiService.getSpecEndpoints(specMetadataId)` → parsed
 *      endpoint rows (path · method · summary · responseBody).
 *
 * The deployed base URL is derived through `getMicroserviceDeploymentUrlFromResource`
 * — same helper Dashboard's drawer uses to render "Deployed URL" — so
 * the row we hand to APITest.jsx is byte-for-byte aligned with what the
 * dashboard drawer shows.
 *
 * Rules baked in (per product owner):
 *   • Only render entries that have a `name`.
 *   • Skip fields that are missing — NEVER render "N/A".
 *   • If the upstream returns nothing, return [] (the page already has a
 *     "No items available" empty state).
 */
import { API_ENDPOINTS } from '../config/apiConfig';
import { onboardingService } from './onboardingService';
import { apiDesignService } from './apiDesignService';
import { mockApiService } from './mockApiService';
import axiosInstance from './axiosInstance';
import { getMicroserviceDeploymentUrlFromResource } from '../lib/deploymentUrl';

const safeArray = (value) => (Array.isArray(value) ? value : []);
const trim = (value) => (typeof value === 'string' ? value.trim() : value);

const unwrap = (result) => {
  const data = result?.data?.data ?? result?.data ?? [];
  return safeArray(data);
};

/**
 * Walk an OpenAPI 3.x document and produce an APITest-shape endpoint
 * list. Required `query` and `header` params are surfaced into
 * `defaultParams` / `defaultHeaders` (enum-first auto-fill) so the
 * Params tab is pre-populated — without this, deployed Spring services
 * (which validate params strictly) return 400 the moment the user clicks
 * Send.
 */
const openApiToEndpoints = (spec, prefix = 'ep') => {
  if (!spec || typeof spec !== 'object') return [];
  const paths = spec.paths || {};
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const out = [];
  let i = 0;
  for (const [path, operations] of Object.entries(paths)) {
    if (!operations || typeof operations !== 'object') continue;
    const pathParams = safeArray(operations.parameters);
    for (const m of methods) {
      const op = operations[m];
      if (!op) continue;
      i += 1;
      const params = [...pathParams, ...safeArray(op.parameters)];
      const defaultFor = (p) => {
        if (p?.example != null) return String(p.example);
        if (p?.schema?.example != null) return String(p.schema.example);
        const e = safeArray(p?.schema?.enum);
        if (e.length) return String(e[0]);
        return '';
      };
      const queryParams = params
        .filter(p => p?.in === 'query')
        .map(p => ({
          key: p.name,
          value: defaultFor(p),
          enabled: !!p.required,
          description: p.description || (p.required ? 'required' : ''),
        }));
      const headerParams = params
        .filter(p => p?.in === 'header' && !/^accept|^content-type|^authorization$/i.test(p.name))
        .map(p => ({
          key: p.name,
          value: defaultFor(p),
          enabled: !!p.required,
        }));
      let defaultBody = null;
      const reqBody = op.requestBody;
      if (reqBody?.content) {
        for (const [, c] of Object.entries(reqBody.content)) {
          const ex = c?.example ?? c?.schema?.example;
          if (ex != null) {
            defaultBody = typeof ex === 'string' ? ex : JSON.stringify(ex, null, 2);
            break;
          }
        }
      }
      out.push({
        id: `${prefix}-${i}`,
        path,
        method: m.toUpperCase(),
        name: op.summary || op.operationId || `${m.toUpperCase()} ${path}`,
        description: op.description || op.summary || '',
        defaultParams: queryParams,
        defaultHeaders: headerParams,
        authType: 'none',
        defaultBody,
      });
    }
  }
  return out;
};

/**
 * Convert a single spec-endpoints row (from `mockApiService.getSpecEndpoints`)
 * into the APITest endpoint shape. These rows already have path + method
 * + summary, so we just normalise the field names.
 */
const specEndpointToRow = (r, prefix, i) => ({
  id: trim(r?.id) || `${prefix}-${i}`,
  path: r?.path || '',
  method: String(r?.method || 'GET').toUpperCase(),
  name: trim(r?.summary) || trim(r?.operationId) || `${String(r?.method || 'GET').toUpperCase()} ${r?.path || ''}`,
  description: trim(r?.summary) || '',
  defaultParams: [],
  defaultHeaders: [],
  authType: 'none',
  defaultBody: trim(r?.requestBodySample) || null,
});

/**
 * Pull the displayed name off an onboarding row. The order mirrors
 * Dashboard's mapOnboardingToRow — first match wins. NEVER fabricates a
 * name; returns null when nothing is set so the row is dropped.
 */
const onboardingRowName = (item) => {
  const ms = item?.microservice || {};
  return (
    trim(ms.apiName) ||
    trim(item?.applicationName) ||
    trim(ms.applicationName) ||
    trim(ms.serviceName) ||
    trim(item?.name) ||
    null
  );
};

const onboardingRowId = (item) => {
  const ms = item?.microservice || {};
  return trim(ms.id || ms._id || item?._id || item?.id);
};

/**
 * Discover endpoints for a single onboarding row.
 *
 * Strategy (in order):
 *   1. PREFERRED — deployed service's live OpenAPI doc at
 *      `${baseUrl}/v3/api-docs` (only Microservice rows have this; it's
 *      the only source with full param signatures).
 *   2. FALLBACK — senior's mock-api `spec-endpoints` (path+method only)
 *      via apiDesignService → mockApiService chain.
 *
 * Returns [] if neither yields anything.
 */
const discoverEndpoints = async (rowId, baseUrl) => {
  // 1) /v3/api-docs from the deployed service (best signal source)
  if (baseUrl) {
    try {
      const docsRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/v3/api-docs`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (docsRes.ok) {
        const docs = await docsRes.json();
        const eps = openApiToEndpoints(docs, `${rowId || 'ep'}`);
        if (eps.length) return eps;
      }
    } catch { /* fall through to mock-api fallback */ }
  }

  // 2) imported specs → spec-endpoints chain
  if (!rowId) return [];
  try {
    const importedRes = await apiDesignService.getImportedByMicroservice(rowId);
    if (!importedRes?.success) return [];
    const specs = unwrap(importedRes);
    const seen = new Set();
    const all = [];
    for (const spec of specs) {
      const specMetaId = trim(spec?.id || spec?.specMetadataId);
      if (!specMetaId) continue;
      const epRes = await mockApiService.getSpecEndpoints(specMetaId);
      if (!epRes?.success) continue;
      unwrap(epRes).forEach((r, i) => {
        const row = specEndpointToRow(r, `${rowId}-ep`, i);
        const key = `${row.method}-${row.path}`;
        if (seen.has(key)) return;
        seen.add(key);
        all.push(row);
      });
    }
    return all;
  } catch {
    return [];
  }
};

/**
 * Generic loader — fetches every onboarding row for one `projectType`,
 * derives base URL + endpoints, and returns the picker-ready list.
 */
const loadByProjectType = async (projectType) => {
  let rows = [];
  try {
    const res = await onboardingService.getAllByProjectType(projectType);
    if (!res?.success) return [];
    rows = safeArray(res.data?.data || res.data);
  } catch {
    return [];
  }

  const out = [];
  for (const item of rows) {
    const name = onboardingRowName(item);
    if (!name) continue;
    const rowId = onboardingRowId(item);
    const baseUrl = (getMicroserviceDeploymentUrlFromResource(item || {}) || '').replace(/\/+$/, '');
    const endpoints = await discoverEndpoints(rowId, baseUrl);
    out.push({
      id: rowId || `${projectType.toLowerCase()}-${out.length}`,
      name,
      baseUrl,
      endpoints,
    });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export const loadMicroservices = () => loadByProjectType('MICROSERVICE');
export const loadApigeeProxies = () => loadByProjectType('APIGEE_PROXY');
export const loadKongServices  = () => loadByProjectType('KONG_GATEWAY_SERVICE');

export const loadAllSources = async () => {
  const [microservice, apigee, kong] = await Promise.all([
    loadMicroservices().catch(() => []),
    loadApigeeProxies().catch(() => []),
    loadKongServices().catch(() => []),
  ]);
  return {
    microservice,
    'apigee-proxy': apigee,
    kong,
  };
};

export const SOURCE_TABS = [
  { id: 'microservice', label: 'Microservice' },
  { id: 'apigee-proxy', label: 'Apigee Proxy' },
  { id: 'kong',         label: 'Kong'         },
];

// Re-export so other files (e.g. APITest.jsx) can ping endpoints from
// the same axios instance used everywhere else. Used by feature-flag
// callers — does not affect the default loader path.
export { axiosInstance, API_ENDPOINTS };
