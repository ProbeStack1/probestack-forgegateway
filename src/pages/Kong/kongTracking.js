import { onboardingService } from "../../services/onboardingService";

export const KONG_PROJECT_TYPE = "KONG_GATEWAY_SERVICE";
export const KONG_TRACKING_REQUIRED_MESSAGE =
  "Select Business Unit, Team Name, and Application ID before changing Kong resources.";

const KONG_TRACKING_STORAGE_KEY = "probeStack_kongGatewayBuilderTracking";
const KONG_SELECTED_ONBOARDING_ID_KEY = "probeStack_kongGatewayBuilderOnboardingId";
const COMPATIBILITY_ONBOARDING_KEYS = [
  "probeStack_proxyOnboardingContextId",
  "probeStack_onboardingContextId",
];

const getStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
};

const readJson = (key) => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getStoredString = (key) => {
  const storage = getStorage();
  if (!storage) return "";

  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
};

const unwrapList = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.contexts)) return data.contexts;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && `${value}`.trim() !== "") || "";

export const normalizeKongOnboardingOption = (entry = {}) => {
  const onboarding = entry.onboarding || entry.onboardingContext || entry.context || {};
  const microservice = entry.microservice || entry.resource || entry.application || {};

  const onboardingId = firstValue(
    entry.onboardingId,
    entry.onboarding_id,
    entry.contextId,
    entry.id,
    entry._id,
    onboarding.onboardingId,
    onboarding.id,
    onboarding._id,
    microservice.onboardingId
  );

  if (!onboardingId) {
    return null;
  }

  const businessUnit = firstValue(entry.businessUnit, onboarding.businessUnit, microservice.businessUnit);
  const teamName = firstValue(entry.teamName, onboarding.teamName, microservice.teamName);
  const applicationId = firstValue(entry.applicationId, onboarding.applicationId, microservice.applicationId);
  const applicationName = firstValue(entry.applicationName, onboarding.applicationName, microservice.applicationName);

  return {
    id: onboardingId,
    onboardingId,
    businessUnit,
    teamName,
    applicationId,
    applicationName,
    label: `${applicationId || onboardingId}${applicationName ? ` - ${applicationName}` : ""}`,
    projectType: firstValue(entry.projectType, onboarding.projectType, KONG_PROJECT_TYPE),
  };
};

export const loadKongOnboardingOptions = async () => {
  const result = await onboardingService.getOnboardingContexts(KONG_PROJECT_TYPE);

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch Kong onboarding contexts");
  }

  const byId = new Map();
  unwrapList(result.data)
    .map(normalizeKongOnboardingOption)
    .filter(Boolean)
    .forEach((option) => {
      if (!byId.has(option.onboardingId)) {
        byId.set(option.onboardingId, option);
      }
    });

  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
};

export const getCurrentKongUserEmail = () => getStoredString("userEmail").trim();

export const getStoredKongTracking = () => readJson(KONG_TRACKING_STORAGE_KEY) || {};

export const getSelectedKongOnboardingId = () => {
  const stored = getStoredKongTracking();
  const explicit = firstValue(
    getStoredString(KONG_SELECTED_ONBOARDING_ID_KEY),
    stored.onboardingId,
    stored.selectedOption?.onboardingId
  );

  if (explicit) return `${explicit}`;

  for (const key of COMPATIBILITY_ONBOARDING_KEYS) {
    const value = getStoredString(key).trim();
    if (value) return value;
  }

  return "";
};

export const setStoredKongTracking = (onboardingId, selectedOption = null) => {
  const storage = getStorage();
  if (!storage) return;

  try {
    const nextId = onboardingId || "";
    const payload = {
      onboardingId: nextId,
      selectedOption: selectedOption || null,
    };

    storage.setItem(KONG_TRACKING_STORAGE_KEY, JSON.stringify(payload));

    if (nextId) {
      storage.setItem(KONG_SELECTED_ONBOARDING_ID_KEY, nextId);
      COMPATIBILITY_ONBOARDING_KEYS.forEach((key) => storage.setItem(key, nextId));
    } else {
      storage.removeItem(KONG_SELECTED_ONBOARDING_ID_KEY);
      COMPATIBILITY_ONBOARDING_KEYS.forEach((key) => storage.removeItem(key));
    }
  } catch {
    // Ignore localStorage write failures; kongFetch will still validate before mutations.
  }
};

export const getKongTrackingHeaders = ({ onboardingId } = {}) => {
  const headers = {};
  const selectedOnboardingId = firstValue(onboardingId);
  const userEmail = getCurrentKongUserEmail();

  if (selectedOnboardingId) {
    headers["x-onboarding-id"] = `${selectedOnboardingId}`;
  }

  if (userEmail) {
    headers["x-user-email"] = userEmail;
  }

  return headers;
};

export const getKongSourceInfo = (resource = {}) => {
  const safeResource = resource && typeof resource === "object" ? resource : {};
  const forgeSphere = safeResource.forgeSphere || {};
  const onboarding = forgeSphere.onboarding || forgeSphere.onboardingContext || forgeSphere.onboardingDetails || null;
  const createdVia = `${forgeSphere.createdVia || safeResource.createdVia || ""}`.toUpperCase();
  const isForgeSphere = createdVia === "FORGESPHERE" || forgeSphere.isTracked === true;
  const onboardingId = firstValue(
    forgeSphere.onboardingId,
    forgeSphere.onboardingContextId,
    onboarding?.id,
    onboarding?._id,
    onboarding?.onboardingId
  );

  return {
    isForgeSphere,
    label: isForgeSphere ? "ForgeSphere" : "Kong Console",
    onboardingId,
    onboarding,
  };
};
export const getKongResourceOnboardingId = (resource = {}) => getKongSourceInfo(resource).onboardingId || "";

export const matchesKongOnboarding = (resource = {}, onboardingId = "") => {
  if (!onboardingId) {
    return true;
  }

  return getKongResourceOnboardingId(resource) === onboardingId;
};
