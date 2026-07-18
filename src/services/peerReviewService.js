import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Peer Review Service — mirrors {@code contractTestingService.js} so the
 * ApprovalsPage can render both kinds of approvals through one consistent
 * envelope.
 *
 * Every method returns `{ success: true, data }` or `{ success: false, error }`.
 */
export const peerReviewService = {
  /** Submit a new peer review request (architect → approvers). */
  sendApprovalRequest: async (payload) => {
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.PEER_REVIEW.SEND_APPROVAL, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send peer review request',
      };
    }
  },

  /** Latest peer review for a microservice (status + payload echo). */
  getMicroservice: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.PEER_REVIEW.GET_BY_MICROSERVICE(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch peer review',
      };
    }
  },

  /** "Manage Approvals" page — items where current user is the approver. */
  getAllApprovals: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.PEER_REVIEW.APPROVALS);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch peer reviews',
      };
    }
  },

  /** "My Requests" — items where current user is the sender. */
  getSentApprovals: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.PEER_REVIEW.SENT_APPROVALS);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  /** Fetch full review detail (auto SENT → IN_PROGRESS when approver opens). */
  getApprovalForReview: async (historyId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.PEER_REVIEW.REVIEW(historyId));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch peer review',
      };
    }
  },

  /** Read-only detail (works for both sender and approver). */
  getApprovalDetails: async (historyId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.PEER_REVIEW.APPROVAL_DETAILS(historyId));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  /** Approve with an optional message comment. */
  approveApproval: async (historyId, message = null) => {
    try {
      let url = API_ENDPOINTS.PEER_REVIEW.APPROVE(historyId);
      if (message && message.trim() !== '') {
        url += `?message=${encodeURIComponent(message)}`;
      }
      const response = await axiosInstance.post(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve peer review',
      };
    }
  },

  /** Reject with a mandatory reason. */
  rejectApproval: async (historyId, reason) => {
    try {
      if (!reason || reason.trim() === '') {
        return { success: false, error: 'Rejection reason is required' };
      }
      const url = `${API_ENDPOINTS.PEER_REVIEW.REJECT(historyId)}?reason=${encodeURIComponent(reason)}`;
      const response = await axiosInstance.post(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject peer review',
      };
    }
  },

  /** Status badge for the architect's Step 10 card. */
  getApprovalStatus: async (microserviceId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.PEER_REVIEW.GET_STATUS(microserviceId));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch peer review status',
      };
    }
  },
};

export default peerReviewService;
