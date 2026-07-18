import axiosInstance from './axiosInstance';
import { TOKEN_API_END_POINT } from '../config/apigeeConfig';

export const apigeeTokenService = {
    getApigeeAccessToken: async () => {
        try {
            const response = await axiosInstance.get(
                TOKEN_API_END_POINT
            );
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch imported specs',
            };
        }
    },
};
