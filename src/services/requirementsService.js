import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

const AI_SPEC_REQUEST_TIMEOUT_MS = 180000;

export const requirementsService = {
  createRequirement: async (requirementData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.REQUIREMENTS.CREATE,
        requirementData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create requirement',
      };
    }
  },

  generateSpecRecommendations: async (recommendationData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.REQUIREMENTS.GENERATE_SPEC_RECOMMENDATIONS,
        recommendationData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate spec recommendations',
      };
    }
  },

  selectRecommendedSpec: async (selectionData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.REQUIREMENTS.SELECT_RECOMMENDED_SPEC,
        selectionData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to select recommended spec',
      };
    }
  },

  generateAiSpec: async (specData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.REQUIREMENTS.AI_GENERATED_SPEC,
        specData,
        { timeout: AI_SPEC_REQUEST_TIMEOUT_MS }
      );
      return { success: true, data: response.data };
    } catch (error) {
      const wasCanceled = error.code === 'ERR_CANCELED' || error.name === 'CanceledError';
      const timedOut = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');

      return {
        success: false,
        error: error.response?.data?.message
          || (timedOut ? 'AI spec generation timed out. Please retry or shorten the requirement.' : null)
          || (wasCanceled ? 'AI spec generation request was canceled before completion.' : null)
          || 'Failed to generate AI spec',
      };
    }
  },
};
