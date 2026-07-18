// src/services/apigeeApiService.js
import { apigeeTokenService } from './apigeeTokenService';

// ========== Token Management (existing) ==========
let cachedToken = null;
let tokenExpiry = null;
let refreshPromise = null;
const REFRESH_BUFFER_MS = 60 * 1000;

function parseAbsoluteExpiry(value) {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 9999999999 ? value : value * 1000;
  }
  const parsedDate = Date.parse(value);
  if (!isNaN(parsedDate)) return parsedDate;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue > 9999999999 ? numericValue : numericValue * 1000;
  }
  return null;
}

function extractTokenPayload(payload) {
  if (typeof payload === 'string') return { token: payload, expiresAt: null };
  const token = payload?.access_token || payload?.token || payload?.id_token || null;
  const expiresAt =
    parseAbsoluteExpiry(payload?.expiresAt) ??
    parseAbsoluteExpiry(payload?.expires_at) ??
    parseAbsoluteExpiry(payload?.expiry) ??
    null;
  return { token, expiresAt };
}

async function refreshTokenInternal() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const result = await apigeeTokenService.getApigeeAccessToken();
    if (!result.success) throw new Error(result.error || 'Failed to fetch Apigee token');
    const { token, expiresAt } = extractTokenPayload(result.data);
    if (!token) throw new Error('Invalid token response');
    cachedToken = token;
    tokenExpiry = expiresAt;
    return token;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function getValidToken() {
  if (cachedToken && tokenExpiry && Date.now() + REFRESH_BUFFER_MS < tokenExpiry) {
    return cachedToken;
  }
  return refreshTokenInternal();
}

export async function initializeApigeeToken(initialToken) {
  if (initialToken) {
    cachedToken = initialToken;
    tokenExpiry = null;
    return cachedToken;
  }
  return getValidToken();
}

export function setApigeeToken(token, options = {}) {
  cachedToken = token;
  tokenExpiry = options.expiresAt || null;
  return token;
}

export function clearApigeeToken() {
  cachedToken = null;
  tokenExpiry = null;
  refreshPromise = null;
}

export async function apigeeApiFetch(url, options = {}, retryCount = 1) {
  const token = await getValidToken();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401 && retryCount > 0) {
    await refreshTokenInternal();
    return apigeeApiFetch(url, options, retryCount - 1);
  }
  return response;
}

export async function apigeeApiRequest(url, options = {}) {
  const response = await apigeeApiFetch(url, options, 1);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API failed: ${response.status} ${errorText}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) return await response.json();
  return null;
}

// ========== Metrics Fetching (new) ==========
const APIGEE_ORG = 'gen-ai-onboarding';
const API_BASE = 'https://apigee.googleapis.com/v1';

function getTimeRangeParams(timeRange) {
  const now = new Date();
  let startDate = new Date();
  switch (timeRange) {
    case '1 hour':
      startDate.setHours(now.getHours() - 1);
      break;
    case '6 hours':
      startDate.setHours(now.getHours() - 6);
      break;
    case '24 hours':
      startDate.setDate(now.getDate() - 1);
      break;
    case '7 days':
      startDate.setDate(now.getDate() - 7);
      break;
    default:
      startDate.setHours(now.getHours() - 1);
  }
  const formatDate = (d) => {
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };
  return { from: formatDate(startDate), to: formatDate(now) };
}

const metricSelectMap = {
  Traffic: 'sum(message_count)',
  'Error Rate': 'sum(is_error)',
  Latency: 'avg(total_response_time)',
  Throughput: 'tps',
  'Cache Hit': 'sum(cache_hit)',
  'Request Size': 'avg(request_size)',
  Bandwidth: 'sum(response_size)',
};

function buildSelectParam(selectedGraphs) {
  return selectedGraphs.map(g => metricSelectMap[g]).filter(Boolean).join(',');
}

function mapApigeeNameToMetric(apigeeName) {
  const entry = Object.entries(metricSelectMap).find(([_, v]) => v === apigeeName);
  return entry ? entry[0] : null;
}

export async function fetchApigeeMetrics(environment, proxyName, selectedGraphs, timeRange) {
  if (selectedGraphs.length === 0) return {};
  const { from, to } = getTimeRangeParams(timeRange);
  const select = buildSelectParam(selectedGraphs);
  if (!select) return {};

  const timeRangeParam = `${encodeURIComponent(from)}~${encodeURIComponent(to)}`;
  const url = `${API_BASE}/organizations/gen-ai-poc-onboarding/environments/${environment}/stats/apiproxy?select=${select}&timeRange=${timeRangeParam}&timeUnit=minute&filter=apiproxy%20eq%20${encodeURIComponent(proxyName)}`;

  try {
    const data = await apigeeApiRequest(url);
    const result = {};
    if (data?.stats?.data) {
      for (const metricStat of data.stats.data) {
        const metricName = mapApigeeNameToMetric(metricStat.name);
        if (!metricName) continue;
        const values = metricStat.values.map(v => parseFloat(v.value) || 0);
        result[metricName] = values;
      }
    }
    for (const graph of selectedGraphs) {
      if (!result[graph]) result[graph] = [];
    }
    return result;
  } catch (error) {
    console.error('Apigee API request failed:', error);
    throw error;
  }
}



// import { apigeeTokenService } from './apigeeTokenService';
// import {
//   clearStoredApigeeAuth,
//   getStoredApigeeAuth,
//   getStoredApigeeToken,
//   isStoredApigeeTokenExpiringSoon,
//   setStoredApigeeAuth,
// } from './apigeeTokenStore';

// const REFRESH_BUFFER_MS = 60 * 1000;

// let refreshPromise = null;
// let refreshTimerId = null;

// const clearRefreshTimer = () => {
//   if (refreshTimerId !== null && typeof window !== 'undefined') {
//     window.clearTimeout(refreshTimerId);
//   }

//   refreshTimerId = null;
// };

// const scheduleRefresh = (expiresAt) => {
//   clearRefreshTimer();

//   if (typeof window === 'undefined' || !expiresAt) {
//     return;
//   }

//   const refreshInMs = Math.max(expiresAt - Date.now() - REFRESH_BUFFER_MS, 0);

//   refreshTimerId = window.setTimeout(() => {
//     refreshToken({ force: true }).catch((error) => {
//       console.error('Failed to auto-refresh Apigee token', error);
//     });
//   }, refreshInMs);
// };

// const persistToken = ({ token, expiresAt = null }) => {
//   const storedAuth = setStoredApigeeAuth({
//     token,
//     expiresAt,
//     lastRefreshAt: Date.now(),
//   });

//   scheduleRefresh(storedAuth?.expiresAt);
//   return storedAuth?.token ?? null;
// };

// const parseAbsoluteExpiry = (value) => {
//   if (!value) {
//     return null;
//   }

//   if (typeof value === 'number' && Number.isFinite(value)) {
//     return value > 9999999999 ? value : value * 1000;
//   }

//   const parsedDate = Date.parse(value);
//   if (!Number.isNaN(parsedDate)) {
//     return parsedDate;
//   }

//   const numericValue = Number(value);
//   if (Number.isFinite(numericValue) && numericValue > 0) {
//     return numericValue > 9999999999 ? numericValue : numericValue * 1000;
//   }

//   return null;
// };

// const parseRelativeExpiry = (value) => {
//   if (!value) {
//     return null;
//   }

//   const numericValue = Number(value);
//   if (!Number.isFinite(numericValue) || numericValue <= 0) {
//     return null;
//   }

//   return Date.now() + numericValue * 1000;
// };

// const extractTokenPayload = (payload) => {
//   if (typeof payload === 'string') {
//     return { token: payload, expiresAt: null };
//   }

//   const token =
//     payload?.token ??
//     payload?.access_token ??
//     payload?.accessToken ??
//     payload?.id_token ??
//     payload?.idToken ??
//     null;

//   const expiresAt =
//     parseAbsoluteExpiry(payload?.expiresAt) ??
//     parseAbsoluteExpiry(payload?.expires_at) ??
//     parseAbsoluteExpiry(payload?.expiry) ??
//     parseRelativeExpiry(payload?.expiresIn) ??
//     parseRelativeExpiry(payload?.expires_in);

//   return { token, expiresAt };
// };

// const refreshToken = async ({ force = false } = {}) => {
//   const storedAuth = getStoredApigeeAuth();

//   if (
//     !force &&
//     storedAuth?.token &&
//     !isStoredApigeeTokenExpiringSoon(REFRESH_BUFFER_MS)
//   ) {
//     scheduleRefresh(storedAuth.expiresAt);
//     return storedAuth.token;
//   }

//   if (refreshPromise) {
//     return refreshPromise;
//   }

//   refreshPromise = (async () => {
//     const tokenResult = await apigeeTokenService.getApigeeAccessToken();

//     if (!tokenResult.success) {
//       throw new Error(tokenResult.error);
//     }

//     const { token, expiresAt } = extractTokenPayload(tokenResult.data);

//     if (!token) {
//       throw new Error('Apigee token service returned an invalid token payload');
//     }

//     return persistToken({ token, expiresAt });
//   })();

//   try {
//     return await refreshPromise;
//   } finally {
//     refreshPromise = null;
//   }
// };

// const getValidToken = async () => {
//   const storedToken = getStoredApigeeToken();

//   if (storedToken && !isStoredApigeeTokenExpiringSoon(REFRESH_BUFFER_MS)) {
//     scheduleRefresh(getStoredApigeeAuth()?.expiresAt);
//     return storedToken;
//   }

//   return refreshToken({ force: !storedToken });
// };

// export const initializeApigeeToken = async (token) => {
//   const storedToken = getStoredApigeeToken();

//   if (storedToken) {
//     scheduleRefresh(getStoredApigeeAuth()?.expiresAt);

//     if (isStoredApigeeTokenExpiringSoon(REFRESH_BUFFER_MS)) {
//       try {
//         return await refreshToken();
//       } catch (error) {
//         console.error('Failed to refresh stored Apigee token', error);
//       }
//     }

//     return storedToken;
//   }

//   if (token) {
//     return persistToken({ token });
//   }

//   return refreshToken({ force: true });
// };

// export const setApigeeToken = (token, options = {}) =>
//   persistToken({ token, expiresAt: options.expiresAt ?? null });

// export const getApigeeToken = () => getStoredApigeeToken();

// export const clearApigeeToken = () => {
//   clearRefreshTimer();
//   clearStoredApigeeAuth();
// };

// export const apigeeApiFetch = async (url, options = {}, retryCount = 1) => {
//   const token = await getValidToken();

//   const headers = {
//     ...options.headers,
//     'x-apigee-token': token,
//   };

//   let response = await fetch(url, { ...options, headers });

//   if (response.status === 401 && retryCount > 0) {
//     const newToken = await refreshToken({ force: true });

//     return apigeeApiFetch(
//       url,
//       {
//         ...options,
//         headers: {
//           ...options.headers,
//           'x-apigee-token': newToken,
//         },
//       },
//       retryCount - 1
//     );
//   }

//   return response;
// };

// export const apigeeApiRequest = async (url, options = {}) => {
//   const response = await apigeeApiFetch(url, options, 1);

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`API failed: ${response.status} ${errorText}`);
//   }

//   const contentType = response.headers.get('content-type');

//   if (contentType?.includes('application/json')) {
//     return await response.json();
//   }

//   return null;
// };
