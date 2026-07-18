import axios from "axios";
import { GOVERNANCE_BASE_URL } from "./complianceService";

const owaspClient = axios.create({
  baseURL: GOVERNANCE_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const unwrapError = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  fallback;

export const owaspService = {
  getOwaspRules: async ({ assetType, category, status } = {}) => {
    try {
      const response = await owaspClient.get("/governance/v1/owasp-rules", {
        params: { resourceType: assetType, category, status },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to load OWASP rules"),
      };
    }
  },

  createOwaspRule: async (payload) => {
    try {
      const response = await owaspClient.post(
        "/governance/v1/owasp-rules",
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to create OWASP rule"),
      };
    }
  },

  runOwaspCheck: async (payload) => {
    try {
      const response = await owaspClient.post(
        "/governance/v1/owasp-scans/run-check",
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to submit OWASP scan"),
      };
    }
  },

  getRecentOwaspScans: async ({ projectName, assetType } = {}) => {
    try {
      const response = await owaspClient.get(
        "/governance/v1/owasp-scans/recent",
        {
          params: { projectName, assetType },
        },
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to load recent OWASP scans"),
      };
    }
  },

  getOwaspScan: async (scanId) => {
    try {
      const response = await owaspClient.get(
        `/governance/v1/owasp-scans/${encodeURIComponent(scanId)}`,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to load OWASP scan details"),
      };
    }
  },

  submitOwaspScan: async (payload) => {
    try {
      const response = await owaspClient.post(
        "/governance/v1/owasp-scans/submit",
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to submit OWASP scan"),
      };
    }
  },

  sendReportEmail: async (payload) => {
    try {
      const response = await owaspClient.post(
        "/governance/v1/reports/email",
        payload,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to send report email"),
      };
    }
  },

  getOwaspRuleDetail: async (ruleId) => {
    try {
      const response = await owaspClient.get(
        `/governance/v1/owasp-rules/${encodeURIComponent(ruleId)}`,
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to load OWASP rule detail"),
      };
    }
  },

  getOwaspScanHistory: async ({ projectName, assetType, requestedBy, page = 0, size = 20 } = {}) => {
    try {
      const response = await owaspClient.get(
        "/governance/v1/owasp-scans/history",
        { params: { projectName, assetType, requestedBy, page, size } },
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to load OWASP scan history"),
      };
    }
  },

  downloadOwaspReport: async (scanId, format = "html") => {
    try {
      const response = await owaspClient.get(
        "/governance/v1/reports/owasp/download",
        { params: { scanId, format }, responseType: "blob" },
      );
      return { success: true, data: response.data, headers: response.headers };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, "Failed to download OWASP report"),
      };
    }
  },
};
