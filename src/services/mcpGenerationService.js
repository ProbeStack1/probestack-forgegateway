/**
 * mcpGenerationService — axios wrappers for the MCP Generation wizard.
 *
 * Returns `{success, data}` on success, `{success: false, error}` on
 * failure. Mirrors testingService.js conventions so callers feel the
 * same.
 *
 * Note: this service ships with NO auth headers — the new
 * forgeq-mcp-generation-svc deliberately has no shared auth filter. The
 * consuming platform (ForgeSphere) adds its own auth filter in front.
 */
import axios from 'axios';
import { MCP_GEN_ENDPOINTS } from '../config/mcpGenerationConfig';

const client = axios.create({
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Audit-actor wrappers — same shape `onboardingService.js#withCreateAudit`
 * uses. The frontend stamps `createdBy` / `updatedBy` on the request
 * body (NOT headers, NOT nested objects) so the catalog tables across
 * the platform read uniformly from those fields.
 *
 * `userEmail` is the localStorage key the senior team already standardised
 * on (see `Profile.jsx`, `ProxyEditor.jsx`, `onboardingService.js`).
 */
const getCurrentAuditActor = (payload = {}) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedEmail = window.localStorage.getItem('userEmail');
    if (storedEmail && storedEmail.trim()) return storedEmail.trim();
  }
  return payload.updatedBy || payload.createdBy || null;
};

const withCreateAudit = (payload = {}) => {
  const actor = getCurrentAuditActor(payload);
  return {
    ...payload,
    createdBy: payload.createdBy || actor,
    updatedBy: payload.updatedBy || actor,
  };
};

const withUpdateAudit = (payload = {}) => {
  const actor = getCurrentAuditActor(payload);
  return {
    ...payload,
    updatedBy: payload.updatedBy || actor,
  };
};

const wrap = async (fn, errMsg = 'Request failed') => {
  try {
    const res = await fn();
    // Backend envelope: { success, data, error }
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      return res.data.success
        ? { success: true, data: res.data.data }
        : { success: false, error: res.data.error || errMsg };
    }
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.response?.data?.message || error.message || errMsg,
      status: error.response?.status,
    };
  }
};

export const mcpGenerationService = {
  // ----- Projects CRUD -----
  createProject: (body) => wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.ROOT, withCreateAudit(body)), 'Failed to create project'),

  listProjects: ({ ownerEmail, workspaceId, includeDeleted = false } = {}) =>
    wrap(
      () => client.get(MCP_GEN_ENDPOINTS.PROJECTS.ROOT, {
        params: { ownerEmail, workspaceId, includeDeleted },
      }),
      'Failed to list projects',
    ),

  getProject: (id) => wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.BY_ID(id)), 'Failed to fetch project'),
  updateProject: (id, patch) => wrap(() => client.put(MCP_GEN_ENDPOINTS.PROJECTS.BY_ID(id), withUpdateAudit(patch)), 'Failed to update project'),

  /**
   * Soft-delete (archive) – pass `actorEmail` and `reason`.
   * Backend expects `?hard=false` and a body with `actorEmail` and `reason`.
   */
  deleteProject: (id, { actorEmail, reason } = {}) =>
    wrap(
      () => client.delete(MCP_GEN_ENDPOINTS.PROJECTS.BY_ID(id), {
        params: { hard: false },
        data: { actorEmail, reason },
      }),
      'Failed to delete project',
    ),

  /**
   * Restore a soft-deleted project – pass `updatedBy` in the body.
   */
  restoreProject: (id, { updatedBy } = {}) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.PROJECTS.RESTORE(id), withUpdateAudit({ updatedBy })),
      'Failed to restore project',
    ),

  // ----- Lifecycle actions (clone / version / deprecate / undeprecate) -----
  cloneProject: (id, { createdBy, slug } = {}) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.PROJECTS.CLONE(id), withCreateAudit({ createdBy, slug })),
      'Clone failed',
    ),

  versionProject: (id, { createdBy, versionNumber } = {}) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.PROJECTS.VERSION(id), withCreateAudit({ createdBy, versionNumber })),
      'Versioning failed',
    ),

  deprecateProject: (id, { updatedBy, reason } = {}) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.PROJECTS.DEPRECATE(id), withUpdateAudit({ updatedBy, reason })),
      'Deprecate failed',
    ),

  undeprecateProject: (id, { updatedBy } = {}) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.PROJECTS.UNDEPRECATE(id), withUpdateAudit({ updatedBy })),
      'Undeprecate failed',
    ),

  // ----- Generation -----
  generate: (id) => wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.GENERATE(id)), 'Generation failed'),
  generateInline: (spec) => wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.INLINE, spec), 'Inline generation failed'),
  listFiles: (id) => wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.FILES(id)), 'Failed to list files'),
  fileContent: (id, path) =>
    wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.FILE_CONTENT(id), { params: { path } }), 'Failed to fetch file content'),
  downloadUrl: (id) => MCP_GEN_ENDPOINTS.PROJECTS.DOWNLOAD(id),
  clientConfigs: (id) => wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.CONFIGS(id)), 'Failed to fetch client configs'),

  // ----- Deploy bridge -----
  deployToGithub: (id) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.DEPLOY(id)), 'Failed to prepare deploy'),
  pushToGithub: (id) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.PUSH(id), withUpdateAudit({})), 'Push failed'),
  getLatestWorkflowRun: (id) =>
    wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.LATEST_RUN(id)), 'Workflow run lookup failed'),
  getWorkflowRunSteps: (id, runId) =>
    wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.RUN_STEPS(id, runId)), 'Workflow steps lookup failed'),

  // ----- Live helpers -----
  probe: ({ url, transport = 'streamable-http', authHeader, mock = false }) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.PROBE, { url, transport, authHeader, mock }), 'Probe failed'),
  call: ({ url, transport = 'streamable-http', authHeader, toolName, arguments: args, mock = false }) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.CALL, { url, transport, authHeader, toolName, arguments: args, mock }), 'Call failed'),
  generateToken: () => wrap(() => client.get(MCP_GEN_ENDPOINTS.TOKEN), 'Failed to generate token'),

  // ----- AI tools -----
  synthesizeTool: (description) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.AI_SYNTHESIZE, { description }), 'AI tool synthesis failed'),
  synthesizeCapabilities: ({ description, toolCount = 3, resourceCount = 0, promptCount = 0 }) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.AI_SYNTHESIZE_CAPS, { description, toolCount, resourceCount, promptCount }),
      'AI capability synthesis failed',
    ),
  parseCollection: (raw) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.COLLECTIONS_PARSE, { raw }), 'Collection parsing failed'),

  // ----- Audit / activity -----
  getAudit: (id) => wrap(() => client.get(MCP_GEN_ENDPOINTS.AUDIT(id)), 'Audit lookup failed'),
  getDeployments: (id) => wrap(() => client.get(MCP_GEN_ENDPOINTS.DEPLOYMENTS(id)), 'Deploy history lookup failed'),
  reconcileAudit: (id) => wrap(() => client.post(MCP_GEN_ENDPOINTS.RECONCILE(id), {}), 'Audit reconcile failed'),
  rollback: (id, { toRunId }) =>
    wrap(
      () => client.post(MCP_GEN_ENDPOINTS.ROLLBACK(id), withUpdateAudit({}), { params: { toRunId } }),
      'Rollback failed',
    ),

  // ----- MOCK SERVER -----
  generateMock: (projectId, payload) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.MOCK(projectId), payload), 'Mock generation failed'),
  getMock: (projectId) =>
    wrap(() => client.get(MCP_GEN_ENDPOINTS.PROJECTS.MOCK(projectId)), 'Failed to fetch mock server'),
  deleteMock: (projectId) =>
    wrap(() => client.delete(MCP_GEN_ENDPOINTS.PROJECTS.MOCK(projectId)), 'Failed to delete mock server'),
  regenerateMock: (projectId, payload) =>
    wrap(() => client.post(MCP_GEN_ENDPOINTS.PROJECTS.REGENERATE(projectId), payload), 'Mock regeneration failed'),
};

export default mcpGenerationService;