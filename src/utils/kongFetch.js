import { getKongBaseUrl, getKongRegion } from "../config/kongConfig";
import {
  getKongTrackingHeaders,
  KONG_TRACKING_REQUIRED_MESSAGE,
} from "../pages/Kong/kongTracking";

const buildKongUrl = (pathOrUrl, regionOverride) => {
  const baseUrl = getKongBaseUrl();
  const isAbsoluteUrl = /^https?:\/\//i.test(pathOrUrl);
  const url = new URL(
    isAbsoluteUrl ? pathOrUrl : `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`
  );

  url.searchParams.set("region", regionOverride || getKongRegion());
  return url.toString();
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const kongFetch = async (pathOrUrl, options = {}) => {
  const {
    region,
    headers = {},
    body,
    tracking = {},
    requireTracking,
    ...restOptions
  } = options;
  const method = String(restOptions.method || "GET").toUpperCase();
  const trackingHeaders = getKongTrackingHeaders(tracking);

  if (
    requireTracking !== false &&
    MUTATING_METHODS.has(method) &&
    !trackingHeaders["x-onboarding-id"]
  ) {
    throw new Error(KONG_TRACKING_REQUIRED_MESSAGE);
  }

  const response = await fetch(buildKongUrl(pathOrUrl, region), {
    ...restOptions,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...trackingHeaders,
      ...headers,
    },
    body: body !== undefined
      ? typeof body === "string"
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  const responseText = await response.text();
  let parsedPayload = {};

  try {
    parsedPayload = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsedPayload = {};
  }

  if (!response.ok) {
    const error = new Error(
      parsedPayload.message || `Kong request failed (${response.status})`
    );
    error.status = response.status;
    error.payload = parsedPayload;
    throw error;
  }

  return parsedPayload;
};

export default kongFetch;
