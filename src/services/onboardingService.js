import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

const getCurrentAuditActor = (payload = {}) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedEmail = window.localStorage.getItem('userEmail');
    if (storedEmail && storedEmail.trim()) {
      return storedEmail.trim();
    }
  }

  return (
    payload.updatedBy ||
    payload.createdBy ||
    null
  );
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

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const extractPageContent = (responseData) => {
  const data = responseData?.data || responseData || {};
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.items)) return data.items;
  return [];
};

export const onboardingService = {
  createOnboardingContext: async (onboardingData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ONBOARDING.CREATE_CONTEXT,
        withCreateAudit(onboardingData)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create onboarding context',
      };
    }
  },

  getOnboardingContexts: async (projectType) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_CONTEXTS(projectType)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding contexts',
      };
    }
  },

  getOnboardingContextsPage: async (projectType, { search = '', page = 0, pageSize = 15, status = 'UNARCHIVED' } = {}) => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ONBOARDING.CREATE_CONTEXT}${buildQueryString({
          projectType,
          search,
          status,
          page,
          size: pageSize,
        })}`
      );
      const pageData = response.data?.data || {};
      return {
        success: true,
        data: {
          success: true,
          data: extractPageContent(response.data),
          page: Number.isFinite(pageData.page) ? pageData.page : page,
          size: Number.isFinite(pageData.size) ? pageData.size : pageSize,
          totalElements: Number.isFinite(pageData.totalElements) ? pageData.totalElements : 0,
          totalPages: Number.isFinite(pageData.totalPages) ? pageData.totalPages : 0,
          first: Boolean(pageData.first),
          last: Boolean(pageData.last),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding context page',
      };
    }
  },

  getOnboardingContextById: async (id) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_CONTEXT_BY_ID(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding context',
      };
    }
  },

  updateOnboardingContextStatus: async (id, status) => {
    try {
      const response = await axiosInstance.patch(
        API_ENDPOINTS.ONBOARDING.UPDATE_CONTEXT_STATUS(id),
        withUpdateAudit({ status })
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update onboarding context status',
      };
    }
  },

  createResourceForOnboarding: async (id, payload = {}) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ONBOARDING.CREATE_CONTEXT_RESOURCE(id),
        withCreateAudit(payload)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create onboarding resource',
      };
    }
  },

  getResourceDetails: async (id) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_RESOURCE_DETAILS(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch resource details',
      };
    }
  },

  updateResourceApiName: async (id, apiName) => {
    try {
      const response = await axiosInstance.patch(
        API_ENDPOINTS.ONBOARDING.UPDATE_RESOURCE_API_NAME(id),
        withUpdateAudit({ apiName })
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update resource API name',
      };
    }
  },

  createOnboarding: async (onboardingData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ONBOARDING.CREATE,
        withCreateAudit(onboardingData)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create onboarding',
      };
    }
  },

  updateOnboarding: async (id, onboardingData) => {
    try {
      const response = await axiosInstance.put(
        API_ENDPOINTS.ONBOARDING.UPDATE(id),
        withUpdateAudit(onboardingData)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update onboarding',
      };
    }
  },

  getOnboardingById: async (id) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_BY_ID(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding',
      };
    }
  },

  getApplicationNames: async (projectType) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_APPLICATION_NAMES(projectType)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch application names',
      };
    }
  },

  getByApplicationId: async (applicationId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_BY_APPLICATION_ID(applicationId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding by application ID',
      };
    }
  },

  cloneOnboarding: async (applicationId, payload = {}) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ONBOARDING.CLONING(applicationId),
        withCreateAudit(payload)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to clone onboarding',
      };
    }
  },

  versionOnboarding: async (applicationId, payload = {}) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ONBOARDING.VERSIONING(applicationId),
        withUpdateAudit(payload)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create onboarding version',
      };
    }
  },

  getAllByProjectType: async (projectType) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ONBOARDING.GET_ALL_BY_PROJECT_TYPE(projectType)
      );
      // Older deployments return an array in `data`; the current paginated
      // endpoint returns it in `data.content`/`data.items`. Keep the original
      // envelope and expose one stable array so consumers (notably AI Deploy)
      // do not incorrectly show "No deployable APIs found" for a valid page.
      const payload = response.data?.data ?? response.data ?? {};
      const rows = extractPageContent(response.data);
      return {
        success: true,
        data: {
          ...(payload && !Array.isArray(payload) ? payload : {}),
          data: rows,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboardings by project type',
      };
    }
  },

  updateOnboardingStatus: async (id, status) => {
    try {
      const response = await axiosInstance.patch(
        API_ENDPOINTS.ONBOARDING.UPDATE_STATUS(id),
        withUpdateAudit({ status })
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update onboarding status',
      };
    }
  },

  getAllSummaryByProjectType: async (projectType, { search = '', pageSize = 200, status = 'UNARCHIVED' } = {}) => {
    try {
      const allRows = [];
      let page = 0;
      let totalPages = 1;

      do {
        const response = await axiosInstance.get(
          `${API_ENDPOINTS.ONBOARDING.CREATE}${buildQueryString({
            projectType,
            view: 'summary',
            search,
            status,
            page,
            size: pageSize,
          })}`
        );
        const pageData = response.data?.data || {};
        allRows.push(...extractPageContent(response.data));
        totalPages = Number.isFinite(pageData.totalPages) ? pageData.totalPages : 1;
        page += 1;
      } while (page < totalPages);

      return {
        success: true,
        data: {
          success: true,
          data: allRows,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding summaries by project type',
      };
    }
  },

  getSummaryPageByProjectType: async (projectType, { search = '', page = 0, pageSize = 15, status = 'UNARCHIVED' } = {}) => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ONBOARDING.CREATE}${buildQueryString({
          projectType,
          view: 'summary',
          search,
          status,
          page,
          size: pageSize,
        })}`
      );
      const pageData = response.data?.data || {};
      return {
        success: true,
        data: {
          success: true,
          data: extractPageContent(response.data),
          page: Number.isFinite(pageData.page) ? pageData.page : page,
          size: Number.isFinite(pageData.size) ? pageData.size : pageSize,
          totalElements: Number.isFinite(pageData.totalElements) ? pageData.totalElements : 0,
          totalPages: Number.isFinite(pageData.totalPages) ? pageData.totalPages : 0,
          first: Boolean(pageData.first),
          last: Boolean(pageData.last),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch onboarding summary page by project type',
      };
    }
  },
};
