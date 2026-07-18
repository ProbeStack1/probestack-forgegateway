import { onboardingService } from "../../../services/onboardingService";

const getCurrentUserEmail = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("userEmail") || "";
};

const unwrapList = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

export const normalizeOnboardingOption = (entry, fallbackProjectType = "") => {
  const onboarding = entry?.onboarding || {};
  const microservice = entry?.microservice || entry?.resource || {};
  const apiDetails = entry?.apiDetails || entry?.apiDesign || {};

  const id =
    entry?.onboardingId ||
    onboarding?.id ||
    onboarding?.onboardingId ||
    entry?.id ||
    entry?.resourceId ||
    microservice?.id;

  const microserviceId =
    entry?.microserviceId ||
    microservice?.id ||
    entry?.resourceId ||
    "";

  const name =
    microservice?.apiName ||
    microservice?.applicationName ||
    apiDetails?.apiName ||
    entry?.apiName ||
    entry?.applicationName ||
    onboarding?.applicationName ||
    onboarding?.applicationId ||
    id;
  const businessUnit =
    entry?.businessUnit ||
    onboarding?.businessUnit ||
    microservice?.businessUnit ||
    "";
  const teamName =
    entry?.teamName ||
    onboarding?.teamName ||
    microservice?.teamName ||
    "";
  const applicationId =
    entry?.applicationId ||
    onboarding?.applicationId ||
    microservice?.applicationId ||
    "";
  const applicationName =
    entry?.applicationName ||
    onboarding?.applicationName ||
    microservice?.applicationName ||
    "";

  if (!id) {
    return null;
  }

  return {
    id,
    onboardingId: id,
    microserviceId,
    businessUnit,
    teamName,
    applicationId,
    applicationName,
    label: `${applicationId || name}${applicationName ? ` - ${applicationName}` : ""}${entry?.version ? ` (${entry.version})` : ""}`,
    projectType: entry?.projectType || onboarding?.projectType || fallbackProjectType,
  };
};

export const loadApigeeOnboardingOptions = async () => {
  const result = await onboardingService.getOnboardingContexts();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch onboarding contexts");
  }

  const byId = new Map();

  unwrapList(result.data)
    .map((entry) => normalizeOnboardingOption(entry))
    .filter(Boolean)
    .forEach((option) => {
      if (!byId.has(option.onboardingId)) {
        byId.set(option.onboardingId, option);
      }
    });

  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
};

export const getTrackingHeaders = ({ onboardingId, microserviceId } = {}) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (onboardingId) {
    headers["x-onboarding-id"] = onboardingId;
  }

  if (microserviceId) {
    headers["x-microservice-id"] = microserviceId;
  }

  const createdBy = getCurrentUserEmail();
  if (createdBy) {
    headers["x-created-by"] = createdBy;
  }

  return headers;
};

export const appendTrackingQuery = (url, { onboardingId, microserviceId } = {}) => {
  if (!onboardingId) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ onboardingId });

  if (microserviceId) {
    params.set("microserviceId", microserviceId);
  }

  return `${url}${separator}${params.toString()}`;
};
