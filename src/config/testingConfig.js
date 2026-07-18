const PROD_URL = 'https://forgeq.probestack.io';
const LOCAL_URL = 'http://localhost:8083';

// Resolved at module load; safe — browser only.
const isLocalHost = typeof window !== 'undefined'
  && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);

const TESTING_BASE_URL = 'https://forgeq.probestack.io';

export const TESTING_ENDPOINTS = {
  // Ad-hoc HTTP request execution.
  REQUEST: {
    ADHOC_EXECUTE:        `${TESTING_BASE_URL}/api/v1/requests/adhoc/execute`,
    ADHOC_EXECUTE_STREAM: `${TESTING_BASE_URL}/api/v1/requests/adhoc/execute/stream`,
  },

  // MCP catalog + live inspector.
  MCP: {
    CATALOG:            `${TESTING_BASE_URL}/api/v1/requests/mcp/catalog`,
    CATALOG_REFRESH:    `${TESTING_BASE_URL}/api/v1/requests/mcp/catalog/refresh`,
    INSPECT_CONNECT:    `${TESTING_BASE_URL}/api/v1/requests/mcp/inspect/connect`,
    INSPECT_DISCONNECT: `${TESTING_BASE_URL}/api/v1/requests/mcp/inspect/disconnect`,
    INSPECT_TOOLS_LIST: `${TESTING_BASE_URL}/api/v1/requests/mcp/inspect/tools/list`,
    INSPECT_TOOLS_CALL: `${TESTING_BASE_URL}/api/v1/requests/mcp/inspect/tools/call`,
  },

  // ---- NEW: Functional Suite, Performance, History ----
  SUITE: {
    RUN: `${TESTING_BASE_URL}/api/v1/requests/api/v1/suites/run`,
  },
  PERFORMANCE: {
      RUN: `${TESTING_BASE_URL}/api/v1/requests/performance/run`,
      STATUS: `${TESTING_BASE_URL}/api/v1/requests/performance/status`,
  },
  HISTORY: {
    GET: `${TESTING_BASE_URL}/api/v1/requests/api/v1/history`,
  },
};

export default TESTING_BASE_URL;
