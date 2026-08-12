// Shared helpers for calling Apigee's Analytics stats API directly from the browser
// (https://apigee.googleapis.com/v1/organizations/{org}/environments/{env}/stats/{dimension}).
// Auth token + proxy list still go through the internal apigee-wrapper backend.

export const APIGEE_ORG = 'gen-ai-poc-onboarding';
const APIGEE_WRAPPER_BASE = 'https://forgesphere.probestack.io/apigee-wrapper';
const TOKEN_URL = `${APIGEE_WRAPPER_BASE}/auth/apigee/token`;
const PROXIES_URL = `${APIGEE_WRAPPER_BASE}/organizations/${APIGEE_ORG}/apis/details`;

export const fetchApigeeToken = async () => {
  const res = await fetch(TOKEN_URL);
  if (!res.ok) throw new Error(`Token service error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
};

export const fetchApigeeProxies = async (token) => {
  const res = await fetch(PROXIES_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to fetch proxies: ${res.statusText}`);
  const data = await res.json();
  return data.proxies || [];
};

// --- Time range → Apigee's `timeRange` param ---
// Apigee's timeRange has no timezone marker and is evaluated in UTC, so timestamps must be
// formatted from UTC fields (not local time) or requests near "now" get rejected as future.
const RANGE_HOURS = {
  '1 hour': 1, '3 hours': 3, '6 hours': 6, '12 hours': 12,
  '1 day': 24, '3 days': 72, '7 days': 168, '14 days': 336,
};

export const getTimeRangeTimestamps = (timeRange) => {
  // Small buffer so the end timestamp is safely behind Apigee's server clock/ingestion lag.
  const now = new Date(Date.now() - 60 * 1000);
  const hours = RANGE_HOURS[timeRange] ?? 24;
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const format = (d) => {
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
  };
  return { start: format(start), end: format(now) };
};

export const getTimeUnitForRange = (timeRange) => {
  const hours = RANGE_HOURS[timeRange] ?? 24;
  return hours <= 6 ? 'minute' : 'hour';
};

// Raw epoch-ms bounds for a `timeRange` — for UI code that needs to reconstruct approximate
// per-bucket timestamps on responses that only return bare values (e.g. the canned/derived
// graphs, which combine multiple selects client-side and so don't carry Apigee's own buckets).
export const getTimeRangeMs = (timeRange) => {
  const end = Date.now() - 60 * 1000;
  const hours = RANGE_HOURS[timeRange] ?? 24;
  return { startMs: end - hours * 60 * 60 * 1000, endMs: end };
};

// --- Extract a metric's numeric time series from an Apigee stats response ---
// Shape varies by call: time-series calls (timeUnit set) return `values: [{timestamp, value}]`;
// breakdown calls (no timeUnit, one row per dimension value) return bare `values: ["2"]`.
export const getMetricSeries = (metricsArr, expectedName, indexFallback = 0) => {
  if (!Array.isArray(metricsArr)) return [];
  const match = metricsArr.find((m) => m.name === expectedName) || metricsArr[indexFallback];
  if (!match || !Array.isArray(match.values)) return [];
  return match.values.map((v) => parseFloat(v && typeof v === "object" ? v.value : v) || 0);
};

export const sumSeries = (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0);
export const avgSeries = (arr) => (Array.isArray(arr) && arr.length ? sumSeries(arr) / arr.length : 0);

// --- Apigee's stats endpoint enforces a strict per-project quota (UAPStatsCallsPerMinutePerProject,
// commonly 100 req/min, shared across every tab/user hitting this org) — and the UI can easily fire
// many of these at once (several proxies × several graphs on first load). All stats calls below go
// through a small concurrency queue, plus retry-with-backoff on 429, instead of firing unbounded in
// parallel and surfacing a raw quota error to the user.
const STATS_MAX_CONCURRENT = 4;
const STATS_MAX_RETRIES = 3;
let statsActiveCount = 0;
const statsQueue = [];

const runNextInStatsQueue = () => {
  if (statsActiveCount >= STATS_MAX_CONCURRENT || statsQueue.length === 0) return;
  statsActiveCount += 1;
  const { task, resolve, reject } = statsQueue.shift();
  task()
    .then(resolve, reject)
    .finally(() => {
      statsActiveCount -= 1;
      runNextInStatsQueue();
    });
};

const enqueueStatsRequest = (task) =>
  new Promise((resolve, reject) => {
    statsQueue.push({ task, resolve, reject });
    runNextInStatsQueue();
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Runs one stats fetch through the concurrency queue, retrying on 429 with backoff
// (honoring Retry-After when Apigee sends one) before giving up ---
const fetchStatsJson = async (url, token) =>
  enqueueStatsRequest(async () => {
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status !== 429 || attempt >= STATS_MAX_RETRIES) {
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Apigee stats API rate limit exceeded — please wait a moment and try again');
          }
          throw new Error(`Apigee stats API error: ${response.statusText}`);
        }
        return response.json();
      }
      const retryAfterSeconds = Number(response.headers.get('Retry-After'));
      const backoffMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 1000 * 2 ** attempt + Math.random() * 300;
      await sleep(backoffMs);
    }
  });

/**
 * Time-series stats for a single dimension value (e.g. one proxy) — used for sparkline graphs.
 * Returns one numeric array per entry in `selectExprs`, aligned to the same time buckets.
 */
export const fetchApigeeStats = async (token, environment, dimension, selectExprs, timeRange, filterExpr) => {
  const { start, end } = getTimeRangeTimestamps(timeRange);
  const timeUnit = getTimeUnitForRange(timeRange);
  let url =
    `https://apigee.googleapis.com/v1/organizations/${APIGEE_ORG}/environments/${environment}/stats/${dimension}` +
    `?select=${encodeURIComponent(selectExprs.join(','))}` +
    `&timeRange=${encodeURIComponent(`${start}~${end}`)}` +
    `&timeUnit=${timeUnit}`;
  if (filterExpr) url += `&filter=${encodeURIComponent(filterExpr)}`;

  const data = await fetchStatsJson(url, token);
  const metricsArr =
    data?.environments?.[0]?.dimensions?.[0]?.metrics || data?.environments?.[0]?.metrics || [];

  return selectExprs.map((expr, idx) => getMetricSeries(metricsArr, expr, idx));
};

/**
 * Same call as `fetchApigeeStats`, but keeps each point's timestamp and the response's
 * `metaData.notices` instead of collapsing to bare numbers — used where the UI shows a
 * detailed, human-readable breakdown (per-point table, totals, data source) rather than
 * just a sparkline.
 */
export const fetchApigeeStatsDetailed = async (token, environment, dimension, selectExprs, timeRange, filterExpr) => {
  const { start, end } = getTimeRangeTimestamps(timeRange);
  const timeUnit = getTimeUnitForRange(timeRange);
  let url =
    `https://apigee.googleapis.com/v1/organizations/${APIGEE_ORG}/environments/${environment}/stats/${dimension}` +
    `?select=${encodeURIComponent(selectExprs.join(','))}` +
    `&timeRange=${encodeURIComponent(`${start}~${end}`)}` +
    `&timeUnit=${timeUnit}`;
  if (filterExpr) url += `&filter=${encodeURIComponent(filterExpr)}`;

  const data = await fetchStatsJson(url, token);
  const dimensionEntry = data?.environments?.[0]?.dimensions?.[0];
  const metricsArr = dimensionEntry?.metrics || data?.environments?.[0]?.metrics || [];
  const notices = data?.metaData?.notices || [];

  const series = {};
  selectExprs.forEach((expr, idx) => {
    const match = metricsArr.find((m) => m.name === expr) || metricsArr[idx];
    const points = (match?.values || [])
      .map((v) => ({ timestamp: Number(v.timestamp), value: parseFloat(v.value) || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);
    series[expr] = points;
  });

  return { series, notices, dimensionName: dimensionEntry?.name || null };
};

/**
 * Aggregate breakdown by dimension value (no timeUnit) — one row per value observed for
 * `dimension` (e.g. one row per status code, per proxy, per target host) with totals for
 * each entry in `selectExprs`.
 */
export const fetchApigeeBreakdown = async (token, environment, dimension, selectExprs, timeRange, filterExpr) => {
  const { start, end } = getTimeRangeTimestamps(timeRange);
  let url =
    `https://apigee.googleapis.com/v1/organizations/${APIGEE_ORG}/environments/${environment}/stats/${dimension}` +
    `?select=${encodeURIComponent(selectExprs.join(','))}` +
    `&timeRange=${encodeURIComponent(`${start}~${end}`)}`;
  if (filterExpr) url += `&filter=${encodeURIComponent(filterExpr)}`;

  const data = await fetchStatsJson(url, token);
  const dims = data?.environments?.[0]?.dimensions || [];

  return dims.map((d) => {
    const row = { name: d.name };
    selectExprs.forEach((expr, idx) => {
      row[expr] = sumSeries(getMetricSeries(d.metrics, expr, idx));
    });
    return row;
  });
};
