import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const connectorConfigurationService = {
  createConnectorConfiguration: async (configData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.CREATE,
        configData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create connector configuration',
      };
    }
  },

  getAllConnectorConfigurations: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.GET_ALL);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch connector configurations',
      };
    }
  },

  getConnectorConfigurationById: async (id) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.GET_BY_ID(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch connector configuration',
      };
    }
  },

  getConnectorConfigurationByApplicationId: async (applicationId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.GET_BY_ORGANIZATION_ID(applicationId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch connector configuration',
      };
    }
  },

  getConnectorConfigurationDefaults: async (organizationId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.GET_DEFAULTS(organizationId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch connector defaults',
      };
    }
  },

  updateConnectorConfiguration: async (id, configData) => {
    try {
      const response = await axiosInstance.put(
        API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.UPDATE(id),
        configData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update connector configuration',
      };
    }
  },

  deleteConnectorConfiguration: async (id) => {
    try {
      const response = await axiosInstance.delete(
        API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete connector configuration',
      };
    }
  },
};
