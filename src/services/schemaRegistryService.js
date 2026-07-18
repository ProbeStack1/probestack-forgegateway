import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

// See the comment on getAllDomains below — pulls a domain name out of either
// a plain string entry or a JSON-stringified full schema document.
const extractDomain = (entry) => {
  if (typeof entry !== 'string') return null;
  const trimmed = entry.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const doc = JSON.parse(trimmed);
    return doc.domain || doc.definition?.['x-domain'] || null;
  } catch {
    return null;
  }
};

export const schemaRegistryService = {
  list: async (organizationId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SCHEMA_REGISTRY.LIST(organizationId));
      const raw = response.data;
      const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch schemas' };
    }
  },

  getById: async (schemaId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SCHEMA_REGISTRY.GET(schemaId));
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Schema not found' };
    }
  },

  getBySpec: async (specId) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SCHEMA_REGISTRY.GET_BY_SPEC(specId));
      const raw = response.data;
      const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch schemas for spec' };
    }
  },

  getByDomain: async (domain) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SCHEMA_REGISTRY.GET_BY_DOMAIN(domain));
      const raw = response.data;
      const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch schemas for domain' };
    }
  },

  // Sorted list of every distinct, non-empty domain string in use — not
  // scoped to an organization (same as getByDomain), so this powers
  // "browse all domains" pickers rather than "domains this org uses".
  //
  // Defensive parsing: the endpoint is documented to return plain domain
  // strings (["billing", "orders", ...]), but as of 2026-07 it's actually
  // returning full schema documents JSON-stringified per array element
  // (unfiltered, undeduplicated, most with no domain at all) — a backend
  // bug, not an intentional shape. `extractDomain` below handles both: a
  // plain string is returned as-is, a stringified document has its
  // `domain`/`definition['x-domain']` pulled out. Safe to keep once the
  // backend is fixed, since the plain-string path is the fast path.
  getAllDomains: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SCHEMA_REGISTRY.LIST_DOMAINS);
      const raw = Array.isArray(response.data?.data) ? response.data.data : [];
      const domains = new Set();
      raw.forEach(entry => {
        const domain = extractDomain(entry);
        if (domain) domains.add(domain);
      });
      const data = [...domains].sort((a, b) => a.localeCompare(b));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch domains' };
    }
  },

  create: async (payload) => {
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.SCHEMA_REGISTRY.CREATE, payload);
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data?.message || 'Failed to create schema',
      };
    }
  },

  // X-User-Email is set automatically by axiosInstance's request interceptor
  // (localStorage 'userEmail', falling back to a system account) — no need
  // to pass it explicitly per call.
  update: async (schemaId, payload) => {
    try {
      const response = await axiosInstance.put(API_ENDPOINTS.SCHEMA_REGISTRY.UPDATE(schemaId), payload);
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      const status = error.response?.status;
      const fallback = status === 404 ? 'Schema not found — it may have been deleted'
        : status === 409 ? 'A schema with this name already exists in this organization'
        : 'Failed to update schema';
      return {
        success: false,
        status,
        error: error.response?.data?.message || fallback,
      };
    }
  },

  delete: async (schemaId) => {
    try {
      const response = await axiosInstance.delete(API_ENDPOINTS.SCHEMA_REGISTRY.DELETE(schemaId));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete schema' };
    }
  },
};
