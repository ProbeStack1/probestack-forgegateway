// src/services/applicationStrategyService.js
import axiosInstance from './axiosInstance';

const BASE_PATH = '/cicd-automation/v1/api/strategies';

const pickError = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

// ─── Get strategies for an application ──────────────────────────────────
const getByOnboardingId = async (onboardingId) => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/onboarding/${onboardingId}`);
    if (res.status === 204) return { success: true, data: null };
    return { success: true, data: res.data };
  } catch (err) {
    if (err.response?.status === 204) return { success: true, data: null };
    return { success: false, error: pickError(err, 'Failed to load strategies') };
  }
};

// ─── Upsert (replace) strategies for an application ──────────────────────
const upsert = async (onboardingId, payload) => {
  try {
    const res = await axiosInstance.put(`${BASE_PATH}/onboarding/${onboardingId}`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to save strategies') };
  }
};

// ─── Clone strategies from source to target application ──────────────────
const cloneStrategies = async (sourceOnboardingId, targetOnboardingId) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_PATH}/clone?sourceOnboardingId=${encodeURIComponent(sourceOnboardingId)}&targetOnboardingId=${encodeURIComponent(targetOnboardingId)}`
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to clone strategies') };
  }
};

// ─── Delete strategies for an application ──────────────────────────────
const remove = async (onboardingId) => {
  try {
    await axiosInstance.delete(`${BASE_PATH}/onboarding/${onboardingId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to delete strategies') };
  }
};

export const applicationStrategyService = {
  getByOnboardingId,
  upsert,
  cloneStrategies,
  remove,
};

export default applicationStrategyService;