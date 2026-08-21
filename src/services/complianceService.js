import axios from 'axios';

// Resolved at build time from Vite env. Defaults to the deployed
// service so the React app works out of the box without any extra config.
// Override locally in .env: VITE_GOVERNANCE_BASE_URL=http://localhost:8188/compliance-api
export const GOVERNANCE_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOVERNANCE_BASE_URL) ||
  'https://forgegateway.probestack.io/compliance-api';

const complianceClient = axios.create({
  baseURL: GOVERNANCE_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const unwrapError = (error, fallback) => (
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  fallback
);

export const complianceService = {
  getComplianceRules: async ({ assetType }) => {
    try {
      const response = await complianceClient.get('/governance/v1/compliance-rules', {
        params: {
          resourceType: assetType,
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load compliance rules'),
      };
    }
  },

  createComplianceRule: async (payload) => {
    try {
      const response = await complianceClient.post(
        '/governance/v1/compliance-rules',
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to create compliance rule'),
      };
    }
  },

  submitRuleRequest: async (payload) => {
    try {
      const response = await complianceClient.post(
        '/governance/v1/rule-requests',
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to submit rule request'),
      };
    }
  },

  getLintingRules: async ({ assetType, status = 'all' } = {}) => {
    try {
      const response = await complianceClient.get('/governance/v1/linting-rules', {
        params: { assetType, status },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load linting rules'),
      };
    }
  },

  updateComplianceRuleStatus: async (ruleId, enabled, updatedBy) => {
    try {
      const response = await complianceClient.patch(
        `/governance/v1/compliance-rules/${encodeURIComponent(ruleId)}/status`,
        {
          enabled,
          status: enabled ? 'ACTIVE' : 'INACTIVE',
          updatedBy,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to update compliance rule status'),
      };
    }
  },

  runComplianceCheck: async (payload) => {
    try {
      const response = await complianceClient.post('/governance/v1/compliance-scans/run-check', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to run compliance check'),
      };
    }
  },

  getRecentComplianceScans: async ({ assetType }) => {
    try {
      const response = await complianceClient.get('/governance/v1/compliance-scans/recent', {
        params: {
          assetType,
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load recent compliance scans'),
      };
    }
  },

  getComplianceScan: async (scanId) => {
    try {
      const response = await complianceClient.get(
        `/governance/v1/compliance-scan/${encodeURIComponent(scanId)}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load compliance scan details'),
      };
    }
  },

  getComplianceRuleDetail: async (ruleId) => {
    try {
      const response = await complianceClient.get(
        `/governance/v1/compliance-rules/${encodeURIComponent(ruleId)}`,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load compliance rule detail'),
      };
    }
  },

  getComplianceScanHistory: async ({ projectName, assetType, requestedBy, page = 0, size = 20 } = {}) => {
    try {
      const response = await complianceClient.get(
        '/governance/v1/compliance-scans/history',
        { params: { projectName, assetType, requestedBy, page, size } },
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load compliance scan history'),
      };
    }
  },

  downloadComplianceReport: async (scanId, format = 'html') => {
    try {
      const response = await complianceClient.get(
        '/governance/v1/reports/compliance/download',
        { params: { scanId, format }, responseType: 'blob' },
      );
      return { success: true, data: response.data, headers: response.headers };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to download compliance report'),
      };
    }
  },

  sendReportEmail: async (payload) => {
    try {
      const response = await complianceClient.post(
        '/governance/v1/reports/email',
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to send compliance report email'),
      };
    }
  },

  previewReportBody: async (scanId, reportType) => {
    try {
      const response = await complianceClient.get('/governance/v1/reports/email/preview', {
        params: { scanId, reportType },
        responseType: 'text',
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load email preview'),
      };
    }
  },
};
