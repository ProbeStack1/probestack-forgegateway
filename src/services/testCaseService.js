// services/testCaseService.js

import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const testCaseService = {
  generate: async (microserviceId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosInstance.post(
        API_ENDPOINTS.TEST_CASE.GENERATE(microserviceId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate test cases',
      };
    }
  },

  getTestCases: async (microserviceId, limit = 500, offset = 0) => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.TEST_CASE.GET_TEST_CASES(microserviceId)}?limit=${limit}&offset=${offset}`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch test cases',
      };
    }
  },

  run: async (microserviceId, baseUrl) => {
    try {
      const response = await axiosInstance.post(
        `${API_ENDPOINTS.TEST_CASE.RUN(microserviceId)}?baseUrl=${encodeURIComponent(baseUrl)}`,
        null
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to run test cases',
      };
    }
  },

  getResults: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.TEST_CASE.GET_RESULTS(microserviceId));
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch test results',
      };
    }
  },

  getGenerationHistory: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.TEST_CASE.GENERATION_HISTORY);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch generation history',
      };
    }
  },

  getExecutionHistory: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.TEST_CASE.EXECUTION_HISTORY);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch execution history',
      };
    }
  },

  getExecutionHistoryForMicroservice: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.TEST_CASE.EXECUTION_HISTORY_BY_MICROSERVICE(microserviceId)
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch microservice execution history',
      };
    }
  },

  getGenerationHistoryForMicroservice: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.TEST_CASE.GENERATION_HISTORY_BY_MICROSERVICE(microserviceId)
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch generation history',
      };
    }
  },

  getSpecContent: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.TEST_CASE.SPEC_CONTENT(microserviceId));
      return { success: true, content: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch spec content',
      };
    }
  },

  /**
   * Import a Postman/OpenAPI collection from a URL
   * (used after microservice generation to auto-store the generated Postman collection)
   */
  importCollectionFromUrl: async (microserviceId, url) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.TEST_CASE.IMPORT_COLLECTION_FROM_URL(microserviceId),
        { url }
      );
      return { success: true, data: response.data.data }; // returns historyId
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to import collection from URL',
      };
    }
  },

  /**
   * Generate test cases from one or more existing collection histories
   * (by their history IDs)
   */
  generateFromHistory: async (microserviceId, historyIds) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.TEST_CASE.GENERATE_FROM_HISTORY(microserviceId),
        { historyIds }
      );
      return { success: true, data: response.data.data }; // list of TestCase
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate test cases from selected collections',
      };
    }
  },

  /**
   * Get the raw content (YAML/JSON) of a specific collection by its historyId
   * Used for Monaco editor preview
   */
  getCollectionContent: async (historyId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.TEST_CASE.GET_COLLECTION_CONTENT(historyId));
      return { success: true, content: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch collection content',
      };
    }
  },

  /**
   * Run a single test case with optional custom request body.
   * @param {string} microserviceId
   * @param {string} testCaseId
   * @param {string} baseUrl - Target API base URL
   * @param {object|null} customRequestBody - JSON object to send, or null to use stored sample
   */
  runSingleTestCase: async (microserviceId, testCaseId, baseUrl, customRequestBody = null) => {
    try {
      const payload = { baseUrl };
      if (customRequestBody !== null) {
        payload.customRequestBody = customRequestBody;
      }
      const response = await axiosInstance.post(
        API_ENDPOINTS.TEST_CASE.SINGLE_RUN(microserviceId, testCaseId),
        payload
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to run single test case',
      };
    }
  },

  /**
   * Get the health score of a microservice based on its latest execution.
   * @param {string} microserviceId
   */
  getScore: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.TEST_CASE.SCORE(microserviceId));
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch score',
      };
    }
  },

  /**
   * Compare two execution runs by their IDs.
   * @param {string} runId1
   * @param {string} runId2
   */
  compareRuns: async (runId1, runId2) => {
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.TEST_CASE.COMPARE_RUNS, {
        runId1,
        runId2,
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to compare runs',
      };
    }
  },
};