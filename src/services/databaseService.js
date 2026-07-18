import { API_ENDPOINTS } from '../config/apiConfig';

export const databaseService = {
  async testConnection(connectionData) {
    try {
      const response = await fetch(API_ENDPOINTS.CONNECTOR_CONFIGURATIONS.TEST_DB_CONNECTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Connection test failed' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Network error' };
    }
  },
};
