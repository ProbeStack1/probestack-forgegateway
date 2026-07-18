const TOKEN_URL = (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
  ? '/dev-token/token'
  : 'https://forgesphere.probestack.io/apigee-wrapper/auth/apigee/token';
const APIGEE_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
  ? '/apigee-wrapper'
  : 'https://forgesphere.probestack.io/apigee-wrapper';

let _cachedToken = null;
let _tokenFetchedAt = 0;
const TOKEN_TTL_MS = 50 * 60_000; // 50 min — refresh just before the typical 1h GCP token expiry.

const fetchApigeeToken = async () => {
  if (_cachedToken && Date.now() - _tokenFetchedAt < TOKEN_TTL_MS) {
    return _cachedToken;
  }
  const res = await fetch(TOKEN_URL);
  if (!res.ok) throw new Error(`Token service error: ${res.status}`);
  const body = await res.json();
  const token = body.access_token || body.token;
  if (!token) throw new Error('Token service returned no access_token field.');
  _cachedToken = token;
  _tokenFetchedAt = Date.now();
  return token;
};

const authedFetch = async (url, options = {}) => {
  const token = await fetchApigeeToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${url} → ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
};

export const apigeeProxyService = {
  /** List Apigee organizations the caller can see. Falls back to the
   *  default POC org if the upstream returns an empty list. */
  listOrganizations: async () => {
    try {
      const data = await authedFetch(`${APIGEE_BASE}/organizations`);
      const orgs = (data.organizations || []).map((o) => o.organization).filter(Boolean);
      if (orgs.length > 0) return { success: true, data: orgs };
      return { success: true, data: ['gen-ai-poc-onboarding'] };
    } catch (err) {
      console.warn('[apigeeProxyService.listOrganizations] falling back to default org:', err.message);
      return { success: true, data: ['gen-ai-poc-onboarding'] };
    }
  },

  /** List Apigee proxy names for one organization. */
  listProxies: async (org) => {
    if (!org) return { success: false, error: 'org is required' };
    try {
      const data = await authedFetch(`${APIGEE_BASE}/organizations/${encodeURIComponent(org)}/apis`);
      // The wrapper may respond either as ["proxy1","proxy2"] or as
      // { proxies: [{ name: "..." }] } depending on the route. Handle both.
      let proxies;
      if (Array.isArray(data)) {
        proxies = data.map((x) => (typeof x === 'string' ? x : x?.name)).filter(Boolean);
      } else if (Array.isArray(data?.proxies)) {
        proxies = data.proxies.map((p) => (typeof p === 'string' ? p : p?.name)).filter(Boolean);
      } else if (Array.isArray(data?.apis)) {
        proxies = data.apis.map((p) => (typeof p === 'string' ? p : p?.name)).filter(Boolean);
      } else {
        proxies = [];
      }
      return { success: true, data: proxies };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch proxies' };
    }
  },

  /** Run the real apigeelint bundle linter (server-side) against one proxy
   *  revision. Backend contract: POST {APIGEE_BASE}/organizations/{org}/apis/{api}/lint
   *  → { org, api, revision, profile, fileCount, errorCount, warningCount, report }
   *  where `report` is apigeelint's own per-file report (same shape as `-f json.js`). */
  lintProxyBundle: async (org, api, { rev, profile } = {}) => {
    if (!org || !api) return { success: false, error: 'org and api are required' };
    try {
      const params = new URLSearchParams();
      if (rev) params.set('rev', rev);
      if (profile) params.set('profile', profile);
      const qs = params.toString();
      const url = `${APIGEE_BASE}/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/lint${qs ? `?${qs}` : ''}`;
      const data = await authedFetch(url, { method: 'POST' });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to lint proxy bundle' };
    }
  },
};
