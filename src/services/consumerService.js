import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const consumerService = {
  createConsumer: async (consumerData) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.CONSUMERS.CREATE,
        consumerData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create consumer',
      };
    }
  },

  getAllConsumers: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CONSUMERS.GET_ALL);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch consumers',
      };
    }
  },

  getConsumerById: async (id) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONSUMERS.GET_BY_ID(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch consumer',
      };
    }
  },

  updateConsumer: async (id, consumerData) => {
    try {
      const response = await axiosInstance.put(
        API_ENDPOINTS.CONSUMERS.UPDATE(id),
        consumerData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update consumer',
      };
    }
  },

  deleteConsumer: async (id) => {
    try {
      const response = await axiosInstance.delete(
        API_ENDPOINTS.CONSUMERS.DELETE(id)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete consumer',
      };
    }
  },
};
