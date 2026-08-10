import onboardingApi from "./onboardingClient.js";

const unwrapList = (res, label) => {
  if (res.data.status === "SUCCESS") return res.data.data || [];
  throw new Error(res.data.message || `Failed to fetch ${label}`);
};

const unwrapSingle = (res, label) => {
  if (res.data.status === "SUCCESS") return res.data.data;
  throw new Error(res.data.message || `Failed to fetch ${label}`);
};

const buildQuery = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  return sp.toString() ? `?${sp.toString()}` : '';
};

/** Business units (paginated) */
export const getBusinessUnits = async (page = 0, size = 100) => {
  const res = await onboardingApi.get(`/api/v1/onboarding/business-units?page=${page}&size=${size}`);
  return unwrapList(res, "business units");
};

/** Single business unit with its projects + applications */
export const getBusinessUnitTree = async (buId) => {
  const res = await onboardingApi.get(`/api/v1/onboarding/business-units/${buId}/tree`);
  return unwrapSingle(res, "business unit tree");
};

/** Projects (paginated) */
export const getProjects = async (page = 0, size = 100) => {
  const res = await onboardingApi.get(`/api/v1/onboarding/projects?page=${page}&size=${size}`);
  return unwrapList(res, "projects");
};

export const getProjectDetail = async (projectId) => {
  const res = await onboardingApi.get(`/api/v1/onboarding/projects/${projectId}`);
  return unwrapSingle(res, "project detail");
};

export const getProjectApplications = async (projectId) => {
  const res = await onboardingApi.get(`/api/v1/onboarding/projects/${projectId}/applications`);
  return unwrapList(res, "project applications");
};

/**
 * Applications (paginated, filterable).
 * Supports: projectId, businessUnitId, status, search, page, size
 */
export const getApplications = async (filters = {}) => {
  const { page = 0, size = 100, projectId, businessUnitId, status, search } = filters || {};
  const query = buildQuery({ page, size, projectId, businessUnitId, status, search });
  const res = await onboardingApi.get(`/api/v1/onboarding/applications${query}`);
  return unwrapList(res, "applications");
};

export const getApplicationDetail = async (appId) => {
  const res = await onboardingApi.get(`/api/v1/onboarding/applications/${appId}`);
  return unwrapSingle(res, "application detail");
};
