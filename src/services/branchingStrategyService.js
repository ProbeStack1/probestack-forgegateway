// src/services/branchingStrategyService.js

import axiosInstance from './axiosInstance';
const BASE_PATH = '/cicd-automation/v1/api';

/* ─────────────────── Strategy CRUD ─────────────────── */

const createStrategy = async (payload) => {
  try {
    const res = await axiosInstance.post(`${BASE_PATH}/branching-strategies`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to create strategy') };
  }
};

const listStrategies = async ({ all = false } = {}) => {
  try {
    const url = `${BASE_PATH}/branching-strategies${all ? '?all=true' : ''}`;
    const res = await axiosInstance.get(url);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to list strategies') };
  }
};

const getStrategy = async (id) => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/branching-strategies/${id}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load strategy') };
  }
};

const updateStrategy = async (id, payload) => {
  try {
    const res = await axiosInstance.put(`${BASE_PATH}/branching-strategies/${id}`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to update strategy') };
  }
};

const deleteStrategy = async (id) => {
  try {
    await axiosInstance.delete(`${BASE_PATH}/branching-strategies/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to delete strategy') };
  }
};

/* ─────────────────── Project ↔ Strategy assignments ─────────────────── */

const applyStrategy = async ({ projectName, projectType, strategyId, notes }) => {
  try {
    const res = await axiosInstance.post(`${BASE_PATH}/project-strategy-assignments`, {
      projectName, projectType, strategyId, notes,
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to apply strategy') };
  }
};

const listAssignmentsForProject = async (projectName, projectType) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_PATH}/project-strategy-assignments?projectName=${encodeURIComponent(projectName)}&projectType=${projectType}`
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load assignments') };
  }
};

const listMyAssignments = async () => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/project-strategy-assignments`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load assignments') };
  }
};

const listAllAssignments = async () => {
  try {
    const res = await axiosInstance.get(`${BASE_PATH}/project-strategy-assignments?all=true`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to load assignments') };
  }
};

const unapplyAssignment = async (id) => {
  try {
    await axiosInstance.delete(`${BASE_PATH}/project-strategy-assignments/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: pickError(err, 'Failed to remove assignment') };
  }
};

/* ─────────────────── Helpers ─────────────────── */

const pickError = (err, fallback) =>
  err?.response?.data?.message
  || err?.response?.data?.error
  || err?.message
  || fallback;

export const branchingStrategyService = {
  createStrategy,
  listStrategies,
  getStrategy,
  updateStrategy,
  deleteStrategy,
  applyStrategy,
  listAssignmentsForProject,
  listMyAssignments,
  listAllAssignments,
  unapplyAssignment,
};

export default branchingStrategyService;
