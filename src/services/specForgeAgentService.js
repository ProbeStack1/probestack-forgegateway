import axios from 'axios';

const DEFAULT_AGENT_BASE_URL = 'https://forgesphere.probestack.io/spec-gen-agent';
// const AGENT_BASE_URL = (
//   import.meta.env.VITE_SPECFORGE_AGENT_BASE_URL || DEFAULT_AGENT_BASE_URL
// ).replace(/\/+$/, '');
const AGENT_BASE_URL = 'https://forgesphere.probestack.io/spec-gen-agent';

const agentClient = axios.create({
  baseURL: AGENT_BASE_URL,
  timeout: 900000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.message) return detail.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return fallback;
};

const asResult = async (request, fallback) => {
  try {
    const response = await request();
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, fallback) };
  }
};

export const specForgeAgentService = {
  baseUrl: AGENT_BASE_URL,

  createSession: () => asResult(
    () => agentClient.post('/sessions'),
    'Failed to create SpecForge agent session',
  ),

  getSession: (sessionId) => asResult(
    () => agentClient.get(`/sessions/${sessionId}`),
    'Failed to load SpecForge agent session',
  ),

  setupConnectors: (sessionId, connectors) => asResult(
    () => agentClient.put(`/sessions/${sessionId}/connectors`, { connectors }),
    'Failed to connect specification sources',
  ),

  ingestRequirement: (sessionId, requirementMarkdown) => asResult(
    () => agentClient.post(`/sessions/${sessionId}/requirements`, {
      text: requirementMarkdown,
    }),
    'Failed to ingest requirement',
  ),

  ingestRequirementUrl: (sessionId, url) => asResult(
    () => agentClient.post(`/sessions/${sessionId}/requirements`, { url }),
    'Failed to ingest requirement URL',
  ),

  ingestRequirementFile: (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return asResult(
      () => agentClient.post(`/sessions/${sessionId}/requirements`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
      'Failed to ingest requirement file',
    );
  },

  searchRecommendations: (sessionId, { threshold = 0.6, limit = 10 } = {}) => asResult(
    () => agentClient.post(`/sessions/${sessionId}/recommendations/search`, {
      threshold,
      limit,
    }),
    'Failed to search recommended specifications',
  ),

  recommendGenerationSettings: (sessionId, payload) => asResult(
    () => agentClient.post(`/sessions/${sessionId}/specs/recommend-settings`, payload),
    'Failed to recommend generation settings',
  ),

  generateSpec: (sessionId, payload) => asResult(
    () => agentClient.post(`/sessions/${sessionId}/specs/generate`, payload),
    'Failed to generate specification',
  ),
};

export default specForgeAgentService;
