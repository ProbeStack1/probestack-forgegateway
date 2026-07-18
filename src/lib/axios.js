import axios from "axios";

// Create an axios instance with Authorization interceptor
const authenticatedAxios = axios.create();

// Request interceptor to add Authorization header.
// Token is stored/sent as-is (trimmed only). Auth0 may return JWE tokens when
// no API audience is requested; those cannot be decoded on jwt.io but are still
// valid for server-side validation. Ensure the auth callback requests an
// audience (API identifier) if decodable JWTs are required.
authenticatedAxios.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem("authToken");
    const token = typeof raw === "string" ? raw.trim() : "";

    if (!config.headers) {
      config.headers = {};
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (import.meta.env.DEV) {
      console.warn("[Auth] No authToken in localStorage — request will be unauthenticated:", config.url || config.baseURL);
    }

    // Set X-Partner-Id header from companyName (always, if available)
    const companyName = localStorage.getItem("companyName") || "probestack";
    config.headers["X-Partner-Id"] = companyName.toLowerCase();

    if (import.meta.env.DEV) {
      console.debug("[Auth] Headers processed for", config.method?.toUpperCase(), config.url || config.baseURL, {
        hasAuth: !!token,
        partnerId: config.headers["X-Partner-Id"]
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default authenticatedAxios;
