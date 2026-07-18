import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const apiDesignService = {
  getImportedByMicroservice: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DESIGN.GET_IMPORTED_BY_MICROSERVICE(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch imported specs',
      };
    }
  },

  getLibrary: async (organizationId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DESIGN.GET_LIBRARY(organizationId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch spec library',
      };
    }
  },

  uploadSpec: async (organizationId, importMethod, file, importUrl, specContent, microserviceId) => {
    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);
      formData.append('importMethod', importMethod);
      if (microserviceId) formData.append('microserviceId', microserviceId);
      if (file) formData.append('file', file);
      if (importUrl) formData.append('importUrl', importUrl);
      if (specContent) formData.append('specContent', specContent);

      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DESIGN.UPLOAD_SPEC,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload spec',
      };
    }
  },

  createApiDesign: async (data) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DESIGN.CREATE,
        data
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create API design',
      };
    }
  },

  getSpecContent: async (specId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DESIGN.GET_SPEC_CONTENT(specId)
      );
      const raw = response.data;

      // Direct string (raw YAML/JSON spec body)
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return { success: true, content: raw };
      }

      // Wrapped: { ..., data: string }
      if (typeof raw?.data === 'string' && raw.data.trim().length > 0) {
        return { success: true, content: raw.data };
      }

      // Wrapped: { ..., data: { specContent: '...' } }
      if (typeof raw?.data?.specContent === 'string') {
        return { success: true, content: raw.data.specContent };
      }

      // Wrapped: { ..., data: { content: '...' } }
      if (typeof raw?.data?.content === 'string') {
        return { success: true, content: raw.data.content };
      }

      // Wrapped: { ..., data: <OpenAPI/Swagger spec object> }
      if (raw?.data && typeof raw.data === 'object' &&
          (raw.data.swagger || raw.data.openapi || raw.data.paths || raw.data.info)) {
        return { success: true, content: JSON.stringify(raw.data, null, 2) };
      }

      // Raw response IS the OpenAPI/Swagger spec object
      if (raw && typeof raw === 'object' &&
          (raw.swagger || raw.openapi || raw.paths || raw.info)) {
        return { success: true, content: JSON.stringify(raw, null, 2) };
      }

      // Fallback: serialize whatever is in data
      if (raw?.data && typeof raw.data === 'object') {
        return { success: true, content: JSON.stringify(raw.data, null, 2) };
      }

      return { success: false, error: 'Could not extract spec content from response.' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch spec content',
      };
    }
  },

  promoteToLibrary: async (specId) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DESIGN.PROMOTE_TO_LIBRARY(specId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to promote spec to library',
      };
    }
  },

  promoteToCatalog: async ({ orgId, projectId, specId, title, specContent, createdBy }) => {
    try {
      const response = await fetch('https://forgestudio.probestack.io/api/v1/specs/gcs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, projectId, specId, source: 'forgesphere', title, specContent, createdBy }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.message || 'Failed to promote spec to ForgeCatalog' };
      }
      return { success: true, data: await response.json() };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to promote spec to ForgeCatalog' };
    }
  },

  updateSpec: async (specId, specContent) => {
    try {
      const formData = new FormData();
      formData.append('specContent', specContent);
      const response = await axiosInstance.put(
        API_ENDPOINTS.API_DESIGN.UPDATE_SPEC_METADATA(specId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update spec',
      };
    }
  },
};
