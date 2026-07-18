const APIGEE_AUTH_STORAGE_KEY = 'probeStack_apigeeAuth';
const LEGACY_APIGEE_TOKEN_KEY = 'apigee_token';

let cachedApigeeAuth;

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeTimestamp = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseStoredAuth = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== 'object' || typeof parsed.token !== 'string') {
      return null;
    }

    return {
      token: parsed.token,
      expiresAt: normalizeTimestamp(parsed.expiresAt),
      lastRefreshAt: normalizeTimestamp(parsed.lastRefreshAt),
    };
  } catch {
    return null;
  }
};

const persistStoredAuth = (auth) => {
  cachedApigeeAuth = auth;

  if (!canUseLocalStorage()) {
    return auth;
  }

  if (!auth?.token) {
    window.localStorage.removeItem(APIGEE_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_APIGEE_TOKEN_KEY);
    return null;
  }

  window.localStorage.setItem(APIGEE_AUTH_STORAGE_KEY, JSON.stringify(auth));
  window.localStorage.removeItem(LEGACY_APIGEE_TOKEN_KEY);
  return auth;
};

const migrateLegacyToken = () => {
  if (!canUseLocalStorage()) {
    return null;
  }

  const legacyToken = window.localStorage.getItem(LEGACY_APIGEE_TOKEN_KEY);
  if (!legacyToken) {
    return null;
  }

  return persistStoredAuth({
    token: legacyToken,
    expiresAt: null,
    lastRefreshAt: null,
  });
};

export const getStoredApigeeAuth = () => {
  if (cachedApigeeAuth !== undefined) {
    return cachedApigeeAuth;
  }

  if (!canUseLocalStorage()) {
    cachedApigeeAuth = null;
    return cachedApigeeAuth;
  }

  const storedAuth = parseStoredAuth(
    window.localStorage.getItem(APIGEE_AUTH_STORAGE_KEY)
  );

  cachedApigeeAuth = storedAuth ?? migrateLegacyToken();
  return cachedApigeeAuth;
};

export const getStoredApigeeToken = () => getStoredApigeeAuth()?.token ?? null;

export const setStoredApigeeAuth = ({
  token,
  expiresAt = null,
  lastRefreshAt = Date.now(),
}) => {
  if (!token) {
    return persistStoredAuth(null);
  }

  return persistStoredAuth({
    token,
    expiresAt: normalizeTimestamp(expiresAt),
    lastRefreshAt: normalizeTimestamp(lastRefreshAt),
  });
};

export const clearStoredApigeeAuth = () => {
  persistStoredAuth(null);
};

export const isStoredApigeeTokenExpiringSoon = (bufferMs = 0) => {
  const auth = getStoredApigeeAuth();

  if (!auth?.token) {
    return true;
  }

  if (!auth.expiresAt) {
    return false;
  }

  return Date.now() + bufferMs >= auth.expiresAt;
};
