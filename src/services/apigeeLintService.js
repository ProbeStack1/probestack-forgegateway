import axios from 'axios';

// Resolved at build time from Vite env. Defaults to the deployed service.
// Override locally in .env: VITE_APIGEE_LINT_BASE_URL=http://localhost:8080/lint/v1
export const APIGEE_LINT_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APIGEE_LINT_BASE_URL) ||
  'https://forgegateway.probestack.io/lint/v1';

const lintClient = axios.create({
  baseURL: APIGEE_LINT_BASE_URL,
  timeout: 90000, // downloading + extracting + linting a bundle can take a while
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

export const apigeeLintService = {
  // GET /lint/v1/rules → { internalRules, customRules, externalRules }
  getRules: async () => {
    try {
      const response = await lintClient.get('/rules');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to load Apigee lint rules'),
      };
    }
  },

  // POST /lint/v1/validate/url → runs apigeelint against a downloadable bundle archive.
  validateUrl: async ({ downloadUrl, profile = 'apigeex', useCustomRules = true }) => {
    try {
      const response = await lintClient.post('/validate/url', {
        downloadUrl,
        profile,
        useCustomRules,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to run Apigee lint scan'),
      };
    }
  },

  // POST /lint/v1/validate → runs apigeelint against an uploaded bundle archive
  // (multipart/form-data). Used when the bundle is already in hand as a Blob
  // rather than reachable via a downloadUrl. Note: plain axios (not lintClient)
  // so the JSON content-type default doesn't clobber the multipart boundary.
  validateBundle: async ({ file, fileName = 'bundle.zip', profile = 'apigeex', useCustomRules = true }) => {
    try {
      const form = new FormData();
      form.append('profile', profile);
      form.append('useCustomRules', String(useCustomRules));
      form.append('bundle', file, fileName);
      const response = await axios.post(`${APIGEE_LINT_BASE_URL}/validate`, form);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: unwrapError(error, 'Failed to run Apigee lint scan'),
      };
    }
  },
};
