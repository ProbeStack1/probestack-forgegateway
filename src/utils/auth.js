export const AUTH_COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME || 'ps_auth_token';
export const PROBESTACK_LOGIN_URL = import.meta.env.VITE_PROBESTACK_LOGIN_URL || 'https://probestack.io/login';

const readCookie = (name) => {
  if (typeof document === 'undefined') return '';

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
};

export const isAuthenticated = () => Boolean(readCookie(AUTH_COOKIE_NAME));

export const getAuthToken = () => readCookie(AUTH_COOKIE_NAME);

export const getLoginRedirectUrl = () => {
  const loginUrl = new URL(PROBESTACK_LOGIN_URL);
  loginUrl.searchParams.set('returnTo', window.location.href);
  return loginUrl.toString();
};

// Sends the user back to login. Safe to call repeatedly (e.g. from
// multiple interceptors/effects) since the navigation itself unmounts the app.
export const redirectToLogin = () => {
  window.location.replace(getLoginRedirectUrl());
};
