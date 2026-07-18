import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Static Code Analysis Service.
 *
 * Wraps the {@code /contract-testing/v1/api/static-code-analysis} endpoints
 * exposed by fsp-contract-testing-svc. Every method returns the canonical
 * `{ success: true|false, data|error }` envelope used everywhere else in
 * the frontend so callers can branch with a single ternary.
 */
export const staticCodeAnalysisService = {
  // ─── PREDEFINED RULES ───
  getPredefinedRules: async (targetType) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.GET_PREDEFINED_RULES(targetType)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch predefined rules',
      };
    }
  },

  // ─── CUSTOM RULES (CRUD) ───
  getCustomRules: async (targetType, targetId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.GET_CUSTOM_RULES(targetType, targetId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch custom rules',
      };
    }
  },

  addCustomRule: async (ruleData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.ADD_CUSTOM_RULE,
        ruleData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add custom rule',
      };
    }
  },

  updateCustomRule: async (ruleId, ruleData) => {
    try {
      const response = await axiosInstance.put(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.UPDATE_CUSTOM_RULE(ruleId),
        ruleData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update custom rule',
      };
    }
  },

  deleteCustomRule: async (ruleId) => {
    try {
      const response = await axiosInstance.delete(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.DELETE_CUSTOM_RULE(ruleId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete custom rule',
      };
    }
  },

  // ─── RUN ANALYSIS (sync) ───
  runAnalysis: async (targetType, targetId, ruleIds = []) => {
    try {
      const url = API_ENDPOINTS.STATIC_CODE_ANALYSIS.RUN_ANALYSIS(targetType, targetId);
      const params = ruleIds && ruleIds.length > 0 ? { ruleIds: ruleIds.join(',') } : {};
      const response = await axiosInstance.post(url, null, { params });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to run static code analysis',
      };
    }
  },

  // ─── REPORTS ───
  getLatestReport: async (targetType, targetId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.GET_LATEST_REPORT(targetType, targetId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch latest report',
      };
    }
  },

  getReportById: async (reportId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.GET_REPORT_BY_ID(reportId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch report',
      };
    }
  },

  getReportHistory: async (targetType, targetId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.STATIC_CODE_ANALYSIS.GET_REPORT_HISTORY(targetType, targetId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch report history',
      };
    }
  },

  /**
   * Run analysis with Server-Sent Events streaming using fetch (supports headers).
   *
   * Backend signature (patch v1):
   *   GET /stream/{targetType}/{targetId}?ruleIds=R001,R005&userEmail=...
   *   Header: X-User-Email
   *
   * @param {string} targetType         "MICROSERVICE" | "APIGEE" | "KONG"
   * @param {string} targetId           e.g. microserviceId
   * @param {string[]} ruleIds          empty → run all rules; non-empty → only those rules
   * @param {function} onProgress       called for every progress event
   * @param {function} onComplete       called once with the final report DTO
   * @param {function} onError          called on any failure
   * @returns {AbortController}         caller can .abort() to cancel mid-stream
   */
  streamAnalysis: (targetType, targetId, ruleIds, onProgress, onComplete, onError) => {
    const url = API_ENDPOINTS.STATIC_CODE_ANALYSIS.STREAM_ANALYSIS(targetType, targetId);
    const controller = new AbortController();
    const userEmail = localStorage.getItem('userEmail') || '';

    const params = new URLSearchParams();
    if (userEmail) params.append('userEmail', userEmail);
    if (ruleIds && ruleIds.length > 0) params.append('ruleIds', ruleIds.join(','));
    const finalUrl = url + (params.toString() ? `?${params.toString()}` : '');

    fetch(finalUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(userEmail ? { 'X-User-Email': userEmail } : {}),
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = () => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) return;
              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split('\n\n');
              buffer = events.pop() || '';
              for (const event of events) {
                const lines = event.split('\n');
                let eventType = 'message';
                let data = '';
                for (const line of lines) {
                  if (line.startsWith('event:')) eventType = line.substring(6).trim();
                  else if (line.startsWith('data:')) data = line.substring(5).trim();
                }
                if (!data) continue;
                try {
                  const parsed = JSON.parse(data);
                  if (eventType === 'progress') {
                    if (onProgress) onProgress(parsed);
                    if (parsed.status === 'COMPLETED' && parsed.report) {
                      if (onComplete) onComplete(parsed.report);
                      reader.cancel();
                      return;
                    }
                    if (parsed.status === 'FAILED') {
                      if (onError) onError(parsed.error || 'Analysis failed');
                      reader.cancel();
                      return;
                    }
                  } else if (eventType === 'error') {
                    if (onError) onError(parsed.error || 'Analysis error');
                    reader.cancel();
                    return;
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE data:', e);
                }
              }
              readStream();
            })
            .catch((err) => {
              if (err.name !== 'AbortError') {
                if (onError) onError(err.message || 'Stream reading error');
              }
            });
        };
        readStream();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          if (onError) onError(err.message || 'Failed to connect to analysis stream');
        }
      });

    return controller;
  },
};

export default staticCodeAnalysisService;
