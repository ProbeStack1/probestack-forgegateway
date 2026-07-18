// src/services/projectCicdConfigService.js
import axiosInstance from './axiosInstance';

// ─── Base path for pipeline config endpoints ────────────────────────────
const BASE_PATH = '/cicd-automation/v1/api/cicd-config';

// ─── Helper ──────────────────────────────────────────────────────────────
const pickError = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

// ─── Create pipeline config ──────────────────────────────────────────────
const create = async (payload) => {
  try {
    const res = await axiosInstance.post(BASE_PATH, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to create pipeline config') };
  }
};

// ─── Get pipeline config by onboardingId + projectType ──────────────────
const getByOnboardingAndType = async (onboardingId, projectType) => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/onboarding/${onboardingId}/type/${projectType}`);
    if (res.status === 204) return { success: true, data: null };
    return { success: true, data: res.data };
  } catch (err) {
    if (err.response?.status === 204) return { success: true, data: null };
    return { success: false, error: pickError(err, 'Failed to load pipeline config') };
  }
};

// ─── Get aggregate (strategies + all pipeline configs) for an application ──
const getAggregate = async (onboardingId) => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/${onboardingId}/all`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to fetch aggregate data') };
  }
};

// ─── Get pipeline config by internal ID (for UI after creation) ──────
const getById = async (id) => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/${id}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load config') };
  }
};

// ─── Update pipeline config ──────────────────────────────────────────────
const update = async (id, payload) => {
  try {
    const res = await axiosInstance.put(`${BASE_PATH}/${id}`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to update pipeline config') };
  }
};

// ─── Delete pipeline config ──────────────────────────────────────────────
const remove = async (id) => {
  try {
    await axiosInstance.delete(`${BASE_PATH}/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to delete pipeline config') };
  }
};

// ─── Export ──────────────────────────────────────────────────────────────
export const projectCicdConfigService = {
  create,
  getByOnboardingAndType,
  getAggregate,
  getById,
  update,
  remove,
};

export default projectCicdConfigService;