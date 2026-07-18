// src/services/cicdPipelineConfigService.js
import axiosInstance from './axiosInstance';

const BASE_PATH = '/cicd-automation/v1/api/pipeline-configs';

export const PROJECT_TYPE_BY_TAB = {
  apigeex:      'APIGEEX',
  microservice: 'MICROSERVICE',
  kong:         'KONG',
};

/** Reverse lookup so we can route a backend response back to its tab. */
export const TAB_BY_PROJECT_TYPE = Object.fromEntries(
  Object.entries(PROJECT_TYPE_BY_TAB).map(([tab, type]) => [type, tab]),
);

/** GET every config the current user owns (one per projectType). */
const listMine = async () => {
  try {
    const res = await axiosInstance.get(BASE_PATH);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load pipeline configs') };
  }
};

/** GET a single config by projectType. Returns {success:true, data:null} when none exists yet (HTTP 204). */
const getByType = async (projectType) => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/${projectType}`);
    if (res.status === 204) return { success: true, data: null };
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load pipeline config') };
  }
};

/** PUT (upsert) a config for the given projectType. */
const upsert = async (projectType, payload) => {
  try {
    const res = await axiosInstance.put(`${BASE_PATH}/${projectType}`, { ...payload, projectType });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to save pipeline config') };
  }
};

const remove = async (projectType) => {
  try {
    await axiosInstance.delete(`${BASE_PATH}/${projectType}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to delete pipeline config') };
  }
};

const pickError = (err, fallback) =>
  err?.response?.data?.message
  || err?.response?.data?.error
  || err?.message
  || fallback;

export const cicdPipelineConfigService = {
  listMine,
  getByType,
  upsert,
  remove,
};

export default cicdPipelineConfigService;
