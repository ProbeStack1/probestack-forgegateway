const PROD_URL  = 'https://forgegateway.probestack.io/mcp-generate/v1/api';
const LOCAL_URL = 'http://localhost:8100/mcp-generate/v1/api';

// The bundler evaluates this at module load. Browser only — safe.
const isLocalHost = typeof window !== 'undefined'
  && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);

const MCP_GEN_BASE_URL = 'https://forgegateway.probestack.io/mcp-generate/v1/api';

export const MCP_GEN_ENDPOINTS = {
  PROJECTS: {
    ROOT:             `${MCP_GEN_BASE_URL}/projects`,
    BY_ID:   (id)  => `${MCP_GEN_BASE_URL}/projects/${id}`,
    GENERATE:(id)  => `${MCP_GEN_BASE_URL}/projects/${id}/generate`,
    INLINE:           `${MCP_GEN_BASE_URL}/projects/generate-inline`,
    FILES:   (id)  => `${MCP_GEN_BASE_URL}/projects/${id}/files`,
    FILE_CONTENT: (id) => `${MCP_GEN_BASE_URL}/projects/${id}/files/content`,
    DOWNLOAD:(id)  => `${MCP_GEN_BASE_URL}/projects/${id}/download`,
    CONFIGS: (id)  => `${MCP_GEN_BASE_URL}/projects/${id}/client-configs`,
    DEPLOY:  (id)  => `${MCP_GEN_BASE_URL}/projects/${id}/deploy-to-github`,
    PUSH:    (id)  => `${MCP_GEN_BASE_URL}/projects/${id}/push-to-github`,
    LATEST_RUN: (id) => `${MCP_GEN_BASE_URL}/projects/${id}/workflow-runs/latest`,
    RUN_STEPS: (id, runId) => `${MCP_GEN_BASE_URL}/projects/${id}/workflow-runs/${runId}/steps`,
    MOCK: (id) => `${MCP_GEN_BASE_URL}/projects/${id}/mock`,
    REGENERATE: (id) => `${MCP_GEN_BASE_URL}/projects/${id}/mock/regenerate`,

    // --- NEW endpoints for lifecycle actions ---
    RESTORE:    (id) => `${MCP_GEN_BASE_URL}/projects/${id}/restore`,
    CLONE:      (id) => `${MCP_GEN_BASE_URL}/projects/${id}/clone`,
    VERSION:    (id) => `${MCP_GEN_BASE_URL}/projects/${id}/version`,
    DEPRECATE:  (id) => `${MCP_GEN_BASE_URL}/projects/${id}/deprecate`,
    UNDEPRECATE:(id) => `${MCP_GEN_BASE_URL}/projects/${id}/undeprecate`,
  },
  PROBE:  `${MCP_GEN_BASE_URL}/probe`,
  CALL:   `${MCP_GEN_BASE_URL}/call`,
  TOKEN:  `${MCP_GEN_BASE_URL}/token`,

  // ----- Iteration 5: AI synthesis, universal parser, Cloud Run deploy -----
  AI_SYNTHESIZE:        `${MCP_GEN_BASE_URL}/ai/synthesize-tool`,
  AI_SYNTHESIZE_CAPS:   `${MCP_GEN_BASE_URL}/ai/synthesize-capabilities`,
  COLLECTIONS_PARSE:    `${MCP_GEN_BASE_URL}/collections/parse`,
  // ─── Audit / activity / deploy history ────────────────────────────
  AUDIT:        (id) => `${MCP_GEN_BASE_URL}/projects/${id}/audit`,
  RECONCILE:    (id) => `${MCP_GEN_BASE_URL}/projects/${id}/audit/reconcile`,
  DEPLOYMENTS:  (id) => `${MCP_GEN_BASE_URL}/projects/${id}/deployments`,
  ROLLBACK:     (id) => `${MCP_GEN_BASE_URL}/projects/${id}/rollback`,
};

export default MCP_GEN_BASE_URL;
