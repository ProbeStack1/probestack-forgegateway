import axios from 'axios';

const SCORE_BASE_URL = 'https://forgegateway.probestack.io';

const scoreClient = axios.create({
  baseURL: SCORE_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const unwrapError = (error, fallback) => (
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  fallback
);

export const specScoreService = {
  scoreSpec: async (specContent) => {
    try {
      const response = await scoreClient.post('/v1/score', { spec: specContent });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to score API spec'),
      };
    }
  },
};

export default specScoreService;

