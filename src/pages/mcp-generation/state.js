/**
 * Wizard state + reducer. Single source of truth for Steps 2–8.
 *
 * Shape intentionally mirrors the backend `McpProject` so we can POST
 * it almost verbatim via `mcpGenerationService.generateInline`.
 */

export const initialState = {
  projectId: null,
  onboardingContextId: null,
  connectorContextId: null,
  connectorSummary: null,
  isExistingOnboardingLoaded: false,
  onboarding: {
    organizationId: null,
    businessUnit: '',
    teamName: '',
    applicationName: '',
    applicationId: '',
    projectOwner: '',
    ownerEmail: '',
    projectSME: '',
    projectSMEEmail: '',
    projectDLEmail: '',
    expectedGoLiveDate: '',
    goLiveDate: '',
    testerName: '',
    testerEmail: '',
    serviceNowGroupName: '',
    serviceNowGroup: '',
    serviceNowEmail: '',
    consumerIds: [],
  },
  source: 'blank',
  identity: {
    displayName: '',
    slug: '',
    slugDirty: false,
    summary: '',
    description: '',
    category: 'Developer Tools',
    emoji: '🔌',
    license: 'MIT',
  },
  capabilities: {
    tools: [],
    resources: [],
    prompts: [],
  },
  runtime: {
    language: 'typescript',
    languageVersion: 'node20',
    sdkVersion: '^1.0.0',
    bundler: 'tsx',
    runner: 'python',
    buildTool: 'maven',
  },
  transport: {
    kind: 'streamable-http',
    baseUrl: 'http://localhost:3500/mcp',
  },
  auth: {
    kind: 'bearer',
    headerName: 'Authorization',
    generatedToken: '',
    oauth: null,
    customMiddleware: '',
  },
  advanced: {
    rateLimit: { enabled: false, requestsPerMinute: 60 },
    cors:       { enabled: true,  allowedOrigins: '*' },
    logging:    { enabled: true },
    healthCheck:{ enabled: true,  path: '/healthz' },
    metrics:    { enabled: false, path: '/metrics' },
  },
  generated: {
    files: [],
    totalBytes: 0,
    generatedAt: null,
    lastError: null,
  },
  deployPrep: null,
  pushedCommitSha:      null,
  pushedRepoUrl:        null,
  latestRunId:          null,
  deployedServiceUrl:   null,
  microserviceMirrorId: null,
  touchedSinceDeploy:   false,

  // ─── MCP Design (Step 3) ──────────────────────────────
  selectedSpec: null,   // <--- ADDED

  ui: {
    toolModalOpen: false,      editingToolIndex: null,
    resourceModalOpen: false,  editingResourceIndex: null,
    promptModalOpen: false,    editingPromptIndex: null,
    selectedFilePath: null,
  },
};

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECT_ID':  return { ...state, projectId: action.id };

    case 'CLEAR_ONBOARDING':
      return {
        ...state,
        onboardingContextId: null,
        connectorContextId: null,
        connectorSummary: null,
        isExistingOnboardingLoaded: false,
        onboarding: { ...initialState.onboarding },
      };

    case 'SET_CONNECTOR':
      return { ...state, connectorContextId: action.id || null, connectorSummary: action.summary || null };

    case 'SET_ONBOARDING_PATCH':
      return { ...state, onboarding: { ...state.onboarding, ...action.patch } };

    case 'SET_ONBOARDING_CONTEXT': {
      const ctx = action.context || {};
      const data = ctx.onboardingData || {};
      const lock = action.actionMode === 'update' || ctx.isNew === false;
      return {
        ...state,
        onboardingContextId: ctx.onboardingContextId || ctx.onboardingId || null,
        connectorContextId: ctx.connectorId || ctx.existingConfigId || state.connectorContextId,
        isExistingOnboardingLoaded: lock,
        onboarding: {
          ...state.onboarding,
          organizationId:      data.organizationId      ?? state.onboarding.organizationId,
          businessUnit:        data.businessUnit        || '',
          teamName:            data.teamName            || '',
          applicationName:     data.applicationName     || '',
          applicationId:       data.applicationId       || '',
          projectOwner:        data.projectOwner        || '',
          ownerEmail:          data.ownerEmail          || '',
          projectSME:          data.projectSME          || '',
          projectSMEEmail:     data.projectSMEEmail     || '',
          projectDLEmail:      data.projectDLEmail      || '',
          expectedGoLiveDate:  data.expectedGoLiveDate  || data.goLiveDate || '',
          goLiveDate:          data.goLiveDate          || data.expectedGoLiveDate || '',
          testerName:          data.testerName          || '',
          testerEmail:         data.testerEmail         || '',
          serviceNowGroupName: data.serviceNowGroupName || data.serviceNowGroup || '',
          serviceNowGroup:     data.serviceNowGroup     || data.serviceNowGroupName || '',
          serviceNowEmail:     data.serviceNowEmail     || '',
          consumerIds:         ctx.consumerIds          || [],
        },
      };
    }
    case 'SET_SOURCE': return { ...state, source: action.source };

    case 'SET_IDENTITY': {
      const next = { ...state.identity, ...action.patch };
      if ('displayName' in action.patch && !state.identity.slugDirty) {
        next.slug = (next.displayName || '').toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return { ...state, identity: next };
    }
    case 'MARK_SLUG_DIRTY': return { ...state, identity: { ...state.identity, slugDirty: true } };

    // tools / resources / prompts
    case 'ADD_TOOL':
      return { ...state, capabilities: { ...state.capabilities, tools: [...state.capabilities.tools, action.tool] } };
    case 'UPDATE_TOOL':
      return { ...state, capabilities: { ...state.capabilities, tools: state.capabilities.tools.map((t, i) => i === action.index ? { ...t, ...action.patch } : t) } };
    case 'REMOVE_TOOL':
      return { ...state, capabilities: { ...state.capabilities, tools: state.capabilities.tools.filter((_, i) => i !== action.index) } };
    case 'ADD_RESOURCE':
      return { ...state, capabilities: { ...state.capabilities, resources: [...state.capabilities.resources, action.resource] } };
    case 'UPDATE_RESOURCE':
      return { ...state, capabilities: { ...state.capabilities, resources: state.capabilities.resources.map((r, i) => i === action.index ? { ...r, ...action.patch } : r) } };
    case 'REMOVE_RESOURCE':
      return { ...state, capabilities: { ...state.capabilities, resources: state.capabilities.resources.filter((_, i) => i !== action.index) } };
    case 'ADD_PROMPT':
      return { ...state, capabilities: { ...state.capabilities, prompts: [...state.capabilities.prompts, action.prompt] } };
    case 'UPDATE_PROMPT':
      return { ...state, capabilities: { ...state.capabilities, prompts: state.capabilities.prompts.map((p, i) => i === action.index ? { ...p, ...action.patch } : p) } };
    case 'REMOVE_PROMPT':
      return { ...state, capabilities: { ...state.capabilities, prompts: state.capabilities.prompts.filter((_, i) => i !== action.index) } };

    case 'SET_CAPABILITIES_FROM_SPEC':
      return {
        ...state,
        capabilities: {
          ...state.capabilities,
          tools: action.tools || [],
          resources: action.resources || [],
          prompts: action.prompts || [],
        },
        touchedSinceDeploy: true,
      };

    // ─── NEW: Handle spec selection ──────────────────────────────────
    case 'SET_SELECTED_SPEC':
      return { ...state, selectedSpec: action.payload };

    case 'CLEAR_SELECTED_SPEC':
      return { ...state, selectedSpec: null };

    case 'SET_RUNTIME':   return { ...state, runtime:   { ...state.runtime,   ...action.patch }, touchedSinceDeploy: true };
    case 'SET_TRANSPORT': return { ...state, transport: { ...state.transport, ...action.patch }, touchedSinceDeploy: true };
    case 'SET_AUTH':      return { ...state, auth:      { ...state.auth,      ...action.patch }, touchedSinceDeploy: true };
    case 'SET_ADVANCED':
      return { ...state, advanced: { ...state.advanced, ...action.patch,
        rateLimit: action.patch.rateLimit ? { ...state.advanced.rateLimit, ...action.patch.rateLimit } : state.advanced.rateLimit,
        cors:       action.patch.cors       ? { ...state.advanced.cors,       ...action.patch.cors       } : state.advanced.cors,
        logging:    action.patch.logging    ? { ...state.advanced.logging,    ...action.patch.logging    } : state.advanced.logging,
        healthCheck:action.patch.healthCheck? { ...state.advanced.healthCheck,...action.patch.healthCheck} : state.advanced.healthCheck,
        metrics:    action.patch.metrics    ? { ...state.advanced.metrics,    ...action.patch.metrics    } : state.advanced.metrics,
      } };

    case 'SET_GENERATED':
      return {
        ...state,
        generated: {
          files: action.files || [],
          totalBytes: action.totalBytes || 0,
          generatedAt: action.generatedAt || new Date().toISOString(),
          lastError: null,
        },
      };
    case 'GENERATION_FAILED':
      return { ...state, generated: { ...state.generated, lastError: action.error } };

    case 'SET_DEPLOY_PREP':
      return { ...state, deployPrep: { ...(state.deployPrep || {}), ...(action.payload || {}) } };
    case 'CLEAR_DEPLOY_PREP':
      return { ...state, deployPrep: null };

    case 'OPEN_TOOL_MODAL':      return { ...state, ui: { ...state.ui, toolModalOpen: true,  editingToolIndex: action.index ?? null } };
    case 'CLOSE_TOOL_MODAL':     return { ...state, ui: { ...state.ui, toolModalOpen: false, editingToolIndex: null } };
    case 'OPEN_RESOURCE_MODAL':  return { ...state, ui: { ...state.ui, resourceModalOpen: true,  editingResourceIndex: action.index ?? null } };
    case 'CLOSE_RESOURCE_MODAL': return { ...state, ui: { ...state.ui, resourceModalOpen: false, editingResourceIndex: null } };
    case 'OPEN_PROMPT_MODAL':    return { ...state, ui: { ...state.ui, promptModalOpen: true,  editingPromptIndex: action.index ?? null } };
    case 'CLOSE_PROMPT_MODAL':   return { ...state, ui: { ...state.ui, promptModalOpen: false, editingPromptIndex: null } };
    case 'SELECT_FILE':          return { ...state, ui: { ...state.ui, selectedFilePath: action.path } };

    case 'PATCH':
      return { ...state, ...(action.payload || {}) };

    case 'HYDRATE_FROM_SERVER':
      return {
        ...state,
        projectId: action.data.id || null,
        onboardingContextId: action.data.onboardingId || action.data.onboardingContextId || state.onboardingContextId,
        isExistingOnboardingLoaded: action.data.onboardingId ? true : state.isExistingOnboardingLoaded,
        onboarding: action.data.onboarding || state.onboarding,
        connectorContextId: action.data.connectorId || action.data.connectorContextId || state.connectorContextId,
        connectorSummary: action.data.connectorId ? null : state.connectorSummary,
        source:    action.data.source     || state.source,
        identity:  action.data.identity  || state.identity,
        capabilities: action.data.capabilities || state.capabilities,
        runtime:   action.data.runtime   || state.runtime,
        transport: action.data.transport || state.transport,
        auth:      action.data.auth      || state.auth,
        advanced:  action.data.advanced  || state.advanced,
        generated: action.data.generated || state.generated,
        selectedSpec: action.data.selectedSpec || state.selectedSpec,
        pushedCommitSha:    action.data.pushedCommitSha    || state.pushedCommitSha,
        pushedRepoUrl:      action.data.pushedRepoUrl      || state.pushedRepoUrl,
        pushedBranch:       action.data.pushedBranch       || state.pushedBranch,
        pushedActionsUrl:   action.data.pushedActionsUrl   || state.pushedActionsUrl,
      };

    case 'APPLY_TEMPLATE':
      if (!action.spec) return {
        ...initialState, ui: state.ui,
        onboardingContextId: state.onboardingContextId,
        isExistingOnboardingLoaded: state.isExistingOnboardingLoaded,
        onboarding: state.onboarding,
        source: 'blank',
      };
      return {
        ...initialState,
        ui: state.ui,
        onboardingContextId: state.onboardingContextId,
        isExistingOnboardingLoaded: state.isExistingOnboardingLoaded,
        onboarding: state.onboarding,
        source: action.templateId || 'template',
        identity:  { ...initialState.identity, ...action.spec.identity },
        capabilities: { ...initialState.capabilities, ...action.spec.capabilities },
        runtime:   { ...initialState.runtime,   ...(action.spec.runtime   || {}) },
        transport: { ...initialState.transport, ...(action.spec.transport || {}) },
        auth:      { ...initialState.auth,      ...(action.spec.auth      || {}) },
        advanced:  { ...initialState.advanced,  ...(action.spec.advanced  || {}) },
        selectedSpec: null, // reset spec selection when applying a template
      };

    case 'APPLY_PRESET': {
      const presets = {
        production: { rateLimit: { enabled: true, requestsPerMinute: 60 }, cors: { enabled: true, allowedOrigins: 'https://forgeq.probestack.io,https://forgegateway.probestack.io' }, logging: { enabled: true }, healthCheck: { enabled: true, path: '/healthz' }, metrics: { enabled: true, path: '/metrics' } },
        development:{ rateLimit: { enabled: false, requestsPerMinute: 60 }, cors: { enabled: true, allowedOrigins: '*' }, logging: { enabled: true }, healthCheck: { enabled: true, path: '/healthz' }, metrics: { enabled: false, path: '/metrics' } },
      };
      const p = presets[action.preset];
      return p ? { ...state, advanced: { ...state.advanced, ...p } } : state;
    }

    case 'RESET_TO_INITIAL': return { ...initialState };

    default: return state;
  }
}

/** Totals used by Step 3 gating + Step 9 stats. */
export const capabilityCount = (s) =>
  (s.capabilities.tools?.length || 0) +
  (s.capabilities.resources?.length || 0) +
  (s.capabilities.prompts?.length || 0);