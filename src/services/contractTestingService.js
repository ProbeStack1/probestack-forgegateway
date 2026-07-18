import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const contractTestingService = {
  /**
   * Get the current approval status (ALLOWED / BLOCKED) for a microservice.
   * Used by the API design service to lock spec edits while a review is in flight.
   */
  getApprovalStatus: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONTRACT_TESTING.GET_STATUS(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch approval status',
      };
    }
  },

  /**
   * Get the full ContractTesting document for a microservice — includes the latest
   * architectReview / consumerReview snapshots. Use this on Step 6 to render the cards.
   */
  getMicroservice: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONTRACT_TESTING.GET_BY_MICROSERVICE(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch contract testing data',
      };
    }
  },

  /**
   * Send a new approval request (ARCHITECT or CONSUMER).
   * The payload MUST include the rich preview fields (specContent, specEndpoints,
   * mockEndpoints, mockServerBaseUrl) so the approver can see the same view later.
   */
  sendApprovalRequest: async (data) => {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.CONTRACT_TESTING.SEND_APPROVAL,
        data
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send approval request',
      };
    }
  },

  /**
   * Get all approval requests where the current user is the approver (any status).
   */
  getAllApprovals: async () => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONTRACT_TESTING.APPROVALS
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch approvals',
      };
    }
  },

  /**
   * Fetch a single approval for review.
   * If its status is SENT, it will be promoted to IN_PROGRESS automatically on the backend.
   */
  getApprovalForReview: async (approvalId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONTRACT_TESTING.REVIEW(approvalId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch approval details',
      };
    }
  },

  /**
   * Approve an approval request with an optional message.
   * @param {string} approvalId - ID of the history record
   * @param {string} [message] - Optional comment from approver (sent as query param)
   */
  approveApproval: async (approvalId, message = null) => {
    try {
      let url = API_ENDPOINTS.CONTRACT_TESTING.APPROVE(approvalId);
      if (message && message.trim() !== '') {
        url += `?message=${encodeURIComponent(message)}`;
      }
      const response = await axiosInstance.post(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve request',
      };
    }
  },

  /**
   * Reject an approval request with a required reason.
   * @param {string} approvalId - ID of the history record
   * @param {string} reason - Reason for rejection (required)
   */
  rejectApproval: async (approvalId, reason) => {
    try {
      if (!reason || reason.trim() === '') {
        return { success: false, error: 'Rejection reason is required' };
      }
      const url = `${API_ENDPOINTS.CONTRACT_TESTING.REJECT(approvalId)}?reason=${encodeURIComponent(reason)}`;
      const response = await axiosInstance.post(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject request',
      };
    }
  },

  /**
   * Get the immutable history of every approval-request send for a microservice.
   */
  getHistory: async (microserviceId, page = 0, size = 20) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONTRACT_TESTING.HISTORY,
        { params: { microserviceId, page, size } }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch history',
      };
    }
  },

  /**
   * Get all approval requests sent by the current user (across all microservices).
   */
  getSentApprovals: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CONTRACT_TESTING.SENT_APPROVALS);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  /**
   * Get full details of a specific approval (works for both sender and approver).
   * Auto‑promotes SENT → IN_PROGRESS when approver views it.
   */
  getApprovalDetails: async (approvalId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CONTRACT_TESTING.APPROVAL_DETAILS(approvalId));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },
};
