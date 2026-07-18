export const KONG_STORAGE_KEYS = {
  SETTINGS: 'probeStack_kongSettings',
};

export const DEFAULT_KONG_BASE_URL = 'https://forgesphere.probestack.io/kong-wrapper';
export const DEFAULT_KONG_REGION = 'in';

const normalizeBaseUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return DEFAULT_KONG_BASE_URL;
  }

  const trimmedUrl = url.trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return DEFAULT_KONG_BASE_URL;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname}`.replace(/\/+$/, '');
  } catch {
    return DEFAULT_KONG_BASE_URL;
  }
};

export const getStoredKongSettings = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(KONG_STORAGE_KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const saveKongSettings = (settings) => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextSettings = {
    ...getStoredKongSettings(),
    ...settings,
  };

  window.localStorage.setItem(
    KONG_STORAGE_KEYS.SETTINGS,
    JSON.stringify(nextSettings)
  );
};

export const getKongBaseUrl = () => {
  const storedSettings = getStoredKongSettings();
  return normalizeBaseUrl(storedSettings.konnect_base_url || DEFAULT_KONG_BASE_URL);
};

export const setKongBaseUrl = (baseUrl) => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  saveKongSettings({ konnect_base_url: normalizedBaseUrl });
  return normalizedBaseUrl;
};

export const getKongControlPlaneId = () => {
  const storedSettings = getStoredKongSettings();
  return storedSettings.control_plane_id || '';
};

export const setKongControlPlaneId = (controlPlaneId) => {
  const normalizedControlPlaneId =
    typeof controlPlaneId === 'string' ? controlPlaneId.trim() : '';
  saveKongSettings({ control_plane_id: normalizedControlPlaneId });
  return normalizedControlPlaneId;
};

export const getKongRegion = () => {
  const storedSettings = getStoredKongSettings();
  return storedSettings.region === 'us' ? 'us' : DEFAULT_KONG_REGION;
};

export const setKongRegion = (region) => {
  const normalizedRegion = region === 'us' ? 'us' : DEFAULT_KONG_REGION;
  saveKongSettings({ region: normalizedRegion });
  return normalizedRegion;
};

export const KONG_ENDPOINTS = {
  CONTROL_PLANE: {
    get LIST() {
      return `${getKongBaseUrl()}/v2/control-planes`;
    },
    SERVICES: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/services`,
    SERVICE_BY_ID: (controlPlaneId, serviceId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/services/${serviceId}`,
    ROUTES: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/routes`,
    ROUTE_BY_ID: (controlPlaneId, routeId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/routes/${routeId}`,
    ROUTE_PLUGINS: (controlPlaneId, routeId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/routes/${routeId}/plugins`,
    PLUGINS: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/plugins`,
    AVAILABLE_PLUGINS: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/v1/available-plugins`,
    PLUGIN_SCHEMA: (controlPlaneId, pluginName) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/schemas/plugins/${encodeURIComponent(pluginName)}`,
    SERVICE_PLUGINS: (controlPlaneId, serviceId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/services/${serviceId}/plugins`,
    PLUGIN_BY_ID: (controlPlaneId, pluginId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/plugins/${pluginId}`,
    CONSUMERS: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers`,
    CONSUMER_BY_ID: (controlPlaneId, consumerId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers/${consumerId}`,
    CONSUMER_JWT: (controlPlaneId, consumerId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers/${consumerId}/jwt`,
    CONSUMER_KEY_AUTH: (controlPlaneId, consumerId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers/${consumerId}/key-auth`,
    CONSUMER_BASIC_AUTH: (controlPlaneId, consumerId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers/${consumerId}/basic-auth`,
    CONSUMER_HMAC_AUTH: (controlPlaneId, consumerId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers/${consumerId}/hmac-auth`,
    CONSUMER_ACLS: (controlPlaneId, consumerId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/consumers/${consumerId}/acls`,
    UPSTREAMS: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/upstreams`,
    UPSTREAM_BY_ID: (controlPlaneId, upstreamId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/upstreams/${upstreamId}`,
    UPSTREAM_TARGETS: (controlPlaneId, upstreamId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/upstreams/${upstreamId}/targets`,
    UPSTREAM_TARGET_BY_ID: (controlPlaneId, upstreamId, targetId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/upstreams/${upstreamId}/targets/${targetId}`,
    VAULTS: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/vaults`,
    VAULT_BY_ID: (controlPlaneId, vaultId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/vaults/${vaultId}`,
    CA_CERTIFICATES: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/ca_certificates`,
    CA_CERTIFICATE_BY_ID: (controlPlaneId, certificateId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/ca_certificates/${certificateId}`,
    CERTIFICATES: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/certificates`,
    CERTIFICATE_BY_ID: (controlPlaneId, certificateId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/certificates/${certificateId}`,
    SNIS: (controlPlaneId) =>
      `${getKongBaseUrl()}/v2/control-planes/${controlPlaneId}/core-entities/snis`,
  },
};

export default getKongBaseUrl;
