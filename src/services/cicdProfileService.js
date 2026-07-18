// src/services/cicdProfileService.js
import axiosInstance from './axiosInstance';

const CICD_BASE = '/cicd-automation/v1/api';

const pickError = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

// ─── BRANCHING STRATEGY ──────────────────────────────────────────────
export const createStrategy = async (payload) => {
  try {
    const res = await axiosInstance.post(`${CICD_BASE}/branching-strategies`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to create strategy') };
  }
};

export const listStrategies = async ({ all = false } = {}) => {
  try {
    const url = `${CICD_BASE}/branching-strategies${all ? '?all=true' : ''}`;
    const res = await axiosInstance.get(url);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to list strategies') };
  }
};

export const getStrategy = async (id) => {
  try {
    const res = await axiosInstance.get(`${CICD_BASE}/branching-strategies/${id}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load strategy') };
  }
};

export const updateStrategy = async (id, payload) => {
  try {
    const res = await axiosInstance.put(`${CICD_BASE}/branching-strategies/${id}`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to update strategy') };
  }
};

export const deleteStrategy = async (id) => {
  try {
    await axiosInstance.delete(`${CICD_BASE}/branching-strategies/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to delete strategy') };
  }
};

// ─── PROJECT CI/CD CONFIG ──────────────────────────────────────────────

// FIXED: added 'filtered' param to fetch all configs by default
export const getAllConfigs = async (microserviceId, options = {}) => {
  try {
    const { filtered = false } = options; // default false to get all data
    const url = `${CICD_BASE}/cicd-config/${microserviceId}/all${filtered === false ? '?filtered=false' : ''}`;
    const res = await axiosInstance.get(url);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to fetch configs') };
  }
};

export const upsertPipeline = async (microserviceId, projectType, payload) => {
  try {
    const res = await axiosInstance.put(
      `${CICD_BASE}/cicd-config/${microserviceId}/${projectType}`,
      payload
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to save pipeline config') };
  }
};

export const applyStrategy = async (microserviceId, strategyId, notes = '') => {
  try {
    const res = await axiosInstance.post(
      `${CICD_BASE}/cicd-config/${microserviceId}/strategies`,
      { strategyId, notes }
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to apply strategy') };
  }
};

export const removeStrategy = async (microserviceId, strategyId) => {
  try {
    await axiosInstance.delete(`${CICD_BASE}/cicd-config/${microserviceId}/strategies/${strategyId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to remove strategy') };
  }
};

export const setDefaultStrategy = async (microserviceId, strategyId) => {
  try {
    const res = await axiosInstance.patch(
      `${CICD_BASE}/cicd-config/${microserviceId}/strategies/${strategyId}/default`
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to set default strategy') };
  }
};

export const applyProfileToApp = async (microserviceId, profileId) => {
  try {
    const res = await axiosInstance.post(
      `${CICD_BASE}/cicd-config/${microserviceId}/apply-profile/${profileId}`
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to apply profile') };
  }
};

// ─── PROFILES ──────────────────────────────────────────────────────────

export const createProfile = async (payload) => {
  try {
    const res = await axiosInstance.post(`${CICD_BASE}/profiles`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to create profile') };
  }
};

export const listProfiles = async ({ all = false } = {}) => {
  try {
    const url = `${CICD_BASE}/profiles${all ? '?all=true' : ''}`;
    const res = await axiosInstance.get(url);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to list profiles') };
  }
};

export const getProfile = async (profileId) => {
  try {
    const res = await axiosInstance.get(`${CICD_BASE}/profiles/${profileId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to get profile') };
  }
};

export const deleteProfile = async (profileId) => {
  try {
    await axiosInstance.delete(`${CICD_BASE}/profiles/${profileId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to delete profile') };
  }
};

// ─── TEST CONNECTIONS ──────────────────────────────────────────────────

export const testApigeeConnection = async (payload) => {
  try {
    const res = await axiosInstance.post(`${CICD_BASE}/test/apigee`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Apigee test failed') };
  }
};

export const testKongConnection = async (payload) => {
  try {
    const res = await axiosInstance.post(`${CICD_BASE}/test/kong`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Kong test failed') };
  }
};

// ─── DEFAULT EXPORT ────────────────────────────────────────────────────

export const cicdProfileService = {
  createStrategy,
  listStrategies,
  getStrategy,
  updateStrategy,
  deleteStrategy,
  getAllConfigs,
  upsertPipeline,
  applyStrategy,
  removeStrategy,
  setDefaultStrategy,
  applyProfileToApp,
  createProfile,
  listProfiles,
  getProfile,
  deleteProfile,
  testApigeeConnection,
  testKongConnection,
};

export default cicdProfileService;