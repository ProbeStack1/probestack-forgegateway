import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

export const specShareService = {
  /**
   * Share a spec as a downloadable file attachment via email.
   * Sends multipart/form-data so the backend can forward the file
   * as an email attachment to the recipient.
   *
   * @param {Object} params
   * @param {string} params.recipientEmail
   * @param {string} params.specContent       - Raw YAML or JSON string
   * @param {string} params.specFileName      - e.g. "my-spec.yaml"
   * @param {string} params.specFileMimeType  - e.g. "application/x-yaml"
   * @param {string} [params.specName]
   * @param {string} [params.specId]
   * @param {string} [params.mockServerUrl]
   * @param {string} [params.mockServerName]
   * @param {Array}  [params.mockEndpoints]
   */
  sendSpecByEmail: async ({
    recipientEmail,
    specContent,
    specFileName,
    specFileMimeType,
    specName = '',
    specId = '',
    mockServerUrl = '',
    mockServerName = '',
    mockEndpoints = [],
  }) => {
    try {
      const form = new FormData();

      // Spec file as a real downloadable attachment
      const blob = new Blob([specContent], { type: specFileMimeType });
      const file = new File([blob], specFileName, { type: specFileMimeType });
      form.append('specFile', file, specFileName);

      // Metadata fields
      form.append('recipientEmail', recipientEmail);
      form.append('specName', specName);
      form.append('specId', specId);
      form.append('mockServerUrl', mockServerUrl);
      form.append('mockServerName', mockServerName);
      form.append('mockEndpoints', JSON.stringify(mockEndpoints));

      const response = await axiosInstance.post(
        API_ENDPOINTS.SPEC_SHARE.SEND,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to share spec',
      };
    }
  },
};
