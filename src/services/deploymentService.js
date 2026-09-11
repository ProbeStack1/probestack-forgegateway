import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from './axiosInstance';
import { initializeApigeeToken } from './apigeeApiService';

const unwrapError = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  fallback;

const apigeeTokenHeaders = async () => {
  const token = await initializeApigeeToken();
  return {
    headers: {
      'x-apigee-token': token,
    },
  };
};

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const extractData = (response) => response?.data?.data ?? response?.data ?? response ?? {};

const normalizePipelineStatus = (status, conclusion) => {
  if (status === 'completed') {
    return conclusion === 'success' ? 'SUCCESS' : 'FAILED';
  }
  return status ? 'JOBS_UPDATED' : 'WAITING_FOR_RUN';
};

const pollGithubPipelineStatus = async (microserviceId, deploymentId, action, onEvent) => {
  const events = [];

  for (let poll = 0; poll < 120; poll += 1) {
    await sleep(5000);
    const statusResult = await deploymentService.getGithubPipelineStatus(microserviceId, deploymentId);
    if (!statusResult.success) {
      const event = {
        microserviceId,
        deploymentId,
        action,
        status: 'FAILED',
        message: statusResult.error || 'Unable to fetch GitHub pipeline status',
        timestamp: new Date().toISOString(),
      };
      events.push(event);
      onEvent?.(event);
      return events;
    }

    const data = extractData(statusResult);
    const run = data.run;
    const jobs = data.jobs || [];
    const eventStatus = data.matched
      ? normalizePipelineStatus(run?.status, run?.conclusion)
      : 'WAITING_FOR_RUN';
    const event = {
      microserviceId,
      deploymentId,
      action,
      status: eventStatus,
      message: data.matched ? 'GitHub pipeline status updated' : data.message || 'Waiting for GitHub workflow run',
      data,
      timestamp: new Date().toISOString(),
    };

    events.push(event);
    onEvent?.(event);

    if (eventStatus === 'SUCCESS' || eventStatus === 'FAILED') {
      return events;
    }
  }

  const timeoutEvent = {
    microserviceId,
    deploymentId,
    action,
    status: 'TIMEOUT',
    message: 'GitHub workflow status polling timed out',
    timestamp: new Date().toISOString(),
  };
  events.push(timeoutEvent);
  onEvent?.(timeoutEvent);
  return events;
};

const triggerAndPollGithubPipeline = async ({ microserviceId, payload, action, trigger, onEvent }) => {
  const triggerResult = await trigger(microserviceId, payload);
  if (!triggerResult.success) {
    return triggerResult;
  }

  const data = extractData(triggerResult);
  const deploymentId = data.history?.deploymentId;
  const triggeredEvent = {
    microserviceId,
    deploymentId,
    action,
    status: 'TRIGGERED',
    message: data.message || 'GitHub workflow triggered',
    data,
    timestamp: new Date().toISOString(),
  };
  onEvent?.(triggeredEvent);

  if (!deploymentId) {
    return { success: true, events: [triggeredEvent], finalEvent: triggeredEvent };
  }

  const polledEvents = await pollGithubPipelineStatus(microserviceId, deploymentId, action, onEvent);
  const events = [triggeredEvent, ...polledEvents];
  return { success: true, events, finalEvent: events[events.length - 1] };
};

export const deploymentService = {
  async getDeploymentCatalog(projectType) {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.API_DEVELOPMENT.GET_DEPLOYMENT_CATALOG(projectType));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to load deployment catalog') };
    }
  },
  async syncDeploymentArtifacts(microserviceId, payload) {
    try {
      const config = await apigeeTokenHeaders();
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.SYNC_DEPLOYMENT_ARTIFACTS(microserviceId),
        payload,
        config
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to sync deployment artifacts') };
    }
  },

  async getDeploymentArtifacts(microserviceId) {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_DEPLOYMENT_ARTIFACTS(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to load deployment artifacts') };
    }
  },

  async promoteDeployment(microserviceId, payload) {
    try {
      const config = await apigeeTokenHeaders();
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.PROMOTE_DEPLOYMENT(microserviceId),
        payload,
        config
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to promote deployment') };
    }
  },

  async promoteDeploymentGithub(microserviceId, payload) {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.PROMOTE_DEPLOYMENT_GITHUB(microserviceId),
        payload
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to trigger GitHub promote pipeline') };
    }
  },

  async promoteDeploymentGithubAndPoll(microserviceId, payload, onEvent) {
    return triggerAndPollGithubPipeline({
      microserviceId,
      payload,
      action: 'PROMOTE',
      trigger: deploymentService.promoteDeploymentGithub,
      onEvent,
    });
  },

  async rollbackDeployment(microserviceId, payload) {
    try {
      const config = await apigeeTokenHeaders();
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.ROLLBACK_DEPLOYMENT(microserviceId),
        payload,
        config
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to rollback deployment') };
    }
  },

  async rollbackDeploymentGithub(microserviceId, payload) {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.API_DEVELOPMENT.ROLLBACK_DEPLOYMENT_GITHUB(microserviceId),
        payload
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to trigger GitHub rollback pipeline') };
    }
  },

  async rollbackDeploymentGithubAndPoll(microserviceId, payload, onEvent) {
    return triggerAndPollGithubPipeline({
      microserviceId,
      payload,
      action: 'ROLLBACK',
      trigger: deploymentService.rollbackDeploymentGithub,
      onEvent,
    });
  },

  async getDeploymentHistory(microserviceId) {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_DEPLOYMENT_HISTORY(microserviceId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to load deployment history') };
    }
  },

  async getGithubPipelineStatus(microserviceId, deploymentId) {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_GITHUB_PIPELINE_STATUS(microserviceId, deploymentId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to load GitHub pipeline status') };
    }
  },

  async getGithubPipelineLogs(microserviceId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.deploymentId) params.set('deploymentId', filters.deploymentId);
      if (filters.sessionId) params.set('sessionId', filters.sessionId);
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_GITHUB_PIPELINE_LOGS(microserviceId, params.toString())
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to load GitHub pipeline logs') };
    }
  },

  async getDeploymentHistoryBulk(microserviceIds) {
    try {
      const ids = Array.isArray(microserviceIds) ? microserviceIds.join(',') : microserviceIds;
      const response = await axiosInstance.get(
        API_ENDPOINTS.API_DEVELOPMENT.GET_DEPLOYMENT_HISTORY_BULK(ids)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: unwrapError(error, 'Unable to load deployment history') };
    }
  },
};
