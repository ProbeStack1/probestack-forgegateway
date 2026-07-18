import axiosInstance from '../services/axiosInstance';
import API_BASE_URL from '../config/apiConfig';

export const ProjectsAPI = {
  getProjectsByOrg: async (orgId) => {
    try {
      const res = await axiosInstance.get(`${API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${orgId}`);
      const data = res.data?.data || res.data || [];
      const projectSet = new Map();
      (Array.isArray(data) ? data : []).forEach((spec) => {
        const proj = { id: spec.organizationId || spec.projectId || orgId, name: spec.organizationId || orgId };
        projectSet.set(proj.id, proj);
      });
      return { status: 'SUCCESS', data: Array.from(projectSet.values()) };
    } catch {
      return { status: 'SUCCESS', data: [] };
    }
  },

  getById: async (projectId) => {
    try {
      const res = await axiosInstance.get(`${API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${projectId}`);
      const data = res.data?.data || res.data || [];
      const first = Array.isArray(data) ? data[0] : null;
      const name = first?.organizationId || projectId;
      return { data: { id: projectId, name } };
    } catch {
      return { data: { id: projectId, name: projectId } };
    }
  },
};

export const SpecsAPI = {
  list: async (projectId) => {
    try {
      const res = await axiosInstance.get(`${API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${projectId}`);
      return { status: 'SUCCESS', data: res.data?.data || res.data || [] };
    } catch {
      return { status: 'SUCCESS', data: [] };
    }
  },

  // Returns a flat list of spec stubs; uses spec ID as the gcsUrl key.
  listGcsSpecsByOrg: async (orgId) => {
    try {
      const res = await axiosInstance.get(`${API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${orgId}`);
      const data = res.data?.data || res.data || [];
      const specs = (Array.isArray(data) ? data : []).map((spec) => {
        const id = spec.id || spec.specMetadataId || spec._id;
        const updatedMs = spec.updatedAt ? new Date(spec.updatedAt).getTime() : null;
        const createdMs = spec.createdAt ? new Date(spec.createdAt).getTime() : null;
        return {
          gcsUrl: id,
          projectId: spec.organizationId || orgId,
          name: spec.specContent?.info?.title || spec.title || spec.name || id,
          updated: updatedMs ? updatedMs / 1000 : null,
          created: createdMs ? createdMs / 1000 : null,
          // Inline the raw record so getGcsSpecContent can fall back to it
          _inline: spec,
        };
      });
      return { data: { specs } };
    } catch {
      return { data: { specs: [] } };
    }
  },

  // Fetches spec content; specId is the spec's `id` field used as gcsUrl.
  getGcsSpecContent: async (specId) => {
    try {
      const res = await axiosInstance.get(
        `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${specId}/content`
      );
      const raw = res.data?.content ?? res.data?.specContent ?? res.data;
      const content = typeof raw === 'string' ? raw : (raw ? JSON.stringify(raw) : null);
      return { data: { content } };
    } catch {
      return { data: { content: null } };
    }
  },

  deleteGcsSpec: async (specId) => {
    try {
      await axiosInstance.delete(
        `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${specId}`
      );
      return { status: 'SUCCESS' };
    } catch {
      return { status: 'SUCCESS' };
    }
  },
};

export const ContractTestingAPI = {
  Mocks: {
    list: async () => {
      try {
        const res = await axiosInstance.get(`${API_BASE_URL}/mock-api/v1/api/mocks`);
        return { data: res.data?.data || res.data || [] };
      } catch {
        return { data: [] };
      }
    },
  },
  Contracts: {
    list: async () => {
      try {
        const res = await axiosInstance.get(`${API_BASE_URL}/contract-testing/v1/api/contracttesting/history`);
        return { data: res.data?.data || res.data || [] };
      } catch {
        return { data: [] };
      }
    },
  },
};
