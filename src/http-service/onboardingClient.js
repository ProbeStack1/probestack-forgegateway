import axios from "axios";
import { getAuthToken } from "../utils/auth.js";
import { ONBOARDING_ORG_ID } from "../utils/constants.js";

// fsp-onboarding — source of truth for Business Units, Projects and
// Applications. Separate backend from ./client.js (main gateway API) and
// ./apigeeWrapperClient.js (Apigee proxy for products/apps/developers).
const DEFAULT_BASE_URL = "https://probestack.io/onboarding-api";
const BASE_URL = import.meta.env.VITE_ONBOARDING_API_BASE_URL || DEFAULT_BASE_URL;

const onboardingApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "X-Partner-Id": "probestack",
  },
});

onboardingApi.interceptors.request.use((config) => {
  config.headers["X-Organization-Id"] = ONBOARDING_ORG_ID;
  config.headers["X-User-Email"] = localStorage.getItem("userEmail") || "admin@probestack.io";
  config.headers["X-User-Role"] = localStorage.getItem("userRole") || "USER";

  const token = getAuthToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

export default onboardingApi;
