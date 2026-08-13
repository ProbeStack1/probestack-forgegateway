import { onboardingService } from "../../../services/onboardingService";

const getCurrentUserEmail = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("userEmail") || "";
};

// Falls back to the logged-in ForgeSphere user's identity (hydrated into
// localStorage by main.jsx from the session URL params) when no formal
// onboarding context has been selected/loaded, so creator/modifier tracking
// never hard-blocks an action just because the onboarding list is empty.
export const getFallbackOnboardingId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem("organizationId") ||
    window.localStorage.getItem("userOrganizationId") ||
    getCurrentUserEmail() ||
    ""
  );
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

export const getTrackingHeaders = ({ onboardingId, microserviceId, projectId, projectName, applicationId, applicationName } = {}) => {
  const headers = {
    "Content-Type": "application/json",
  };

  const effectiveOnboardingId = onboardingId || getFallbackOnboardingId();
  if (effectiveOnboardingId) {
    headers["x-onboarding-id"] = effectiveOnboardingId;
  }

  if (microserviceId) {
    headers["x-microservice-id"] = microserviceId;
  }

  // Business hierarchy (fsp-onboarding-svc) — which Project/Application this
  // resource belongs to. Independent of onboardingId/microserviceId above,
  // which track a separate, older onboarding-context system.
  if (projectId) headers["x-project-id"] = projectId;
  if (projectName) headers["x-project-name"] = projectName;
  if (applicationId) headers["x-application-id"] = applicationId;
  if (applicationName) headers["x-application-name"] = applicationName;

  const createdBy = getCurrentUserEmail();
  headers["x-created-by"] = createdBy || "unknown-user";

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
