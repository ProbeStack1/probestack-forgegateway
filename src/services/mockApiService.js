import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

const MOCK_API_TIMEOUT_MS = 120000;

const getErrorMessage = (error, fallback) => {
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return 'Mock API request is taking longer than expected. Please try again, or check the mock service status.';
  }
  if (error.response?.status) {
    return error.response?.data?.message || `Mock API request failed with ${error.response.status} ${error.response.statusText || ''}`.trim();
  }
  return error.response?.data?.message || fallback;
};

export const mockApiService = {
  getSpecEndpoints: async (specMetadataId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.MOCK_API.GET_SPEC_ENDPOINTS(specMetadataId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch spec endpoints'),
      };
    }
  },

  getSpecEndpointsByResourceId: async (resourceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.MOCK_API.GET_SPEC_ENDPOINTS(resourceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch resource endpoints'),
      };
    }
  },

  generateFromSpec: async (data) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.MOCK_API.GENERATE_FROM_SPEC,
        data,
        { timeout: MOCK_API_TIMEOUT_MS }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to generate mock server'),
      };
    }
  },

  getByMicroservice: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.MOCK_API.GET_BY_MICROSERVICE(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch mocks for microservice'),
      };
    }
  },

  getMockEndpoints: async (mockId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.MOCK_API.GET_MOCK_ENDPOINTS(mockId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to fetch mock endpoints'),
      };
    }
  },

  runMock: async (mockId) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.MOCK_API.RUN_MOCK(mockId),
        undefined,
        { timeout: MOCK_API_TIMEOUT_MS }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to run mock server'),
      };
    }
  },
};
