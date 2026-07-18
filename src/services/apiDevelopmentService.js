import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const apiDevelopmentService = {
  createProjectMetadata: async (data) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.CREATE_PROJECT_METADATA,
        data
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create project metadata',
      };
    }
  },

  generateCode: async (microserviceId, payload = {}) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.GENERATE_CODE(microserviceId),
        payload
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate code',
      };
    }
  },

  getCodeArtifact: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_CODE_ARTIFACT(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch generated artifact',
      };
    }
  },

  uploadToGitHub: async (microserviceId) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.UPLOAD_GITHUB(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to deploy to GitHub',
      };
    }
  },

  getLatestGitHubRun: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_LATEST_GITHUB_RUN(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch latest GitHub workflow run',
      };
    }
  },

  getAuditLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          params.append(key, value);
        }
      });

      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_AUDIT_LOGS(params.toString())
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch audit logs',
      };
    }
  },

  // ─── NEW: Merge ───
merge: async (microserviceId, payload) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.API_DEVELOPMENT.MERGE(microserviceId),
      payload
    );
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to merge branches',
      statusCode: error.response?.status,
    };
  }
},

// ─── NEW: Deprecate ───
deprecate: async (microserviceId, payload = {}) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.API_DEVELOPMENT.DEPRECATE(microserviceId),
      payload
    );
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to trigger deprecation workflow',
      statusCode: error.response?.status,
    };
  }
},

  /**
   * Get Pull Request status for polling (approval, mergeability)
   */
  getPrStatus: async (microserviceId) => {
    const response = await fetch(`${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/merge/pr-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
        'x-user-email': localStorage.getItem('userEmail') || 'testUser@probestack.io',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch PR status');
    }
    return data;
  },

};
