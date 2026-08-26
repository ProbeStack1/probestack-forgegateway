import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

// Import library CSS as raw text (no PostCSS processing) — avoids the
// library's Tailwind build colliding with this app's own Tailwind build.
import libraryStyles from '@probestack/probestack-ui-library/style.css?raw';

// Strip the library's `@property --tw-*` registrations before injecting.
// @property is GLOBAL/document-wide — it can't be scoped to
// .probestack-ui-library. The library (built with Tailwind v4) registers
// e.g. `@property --tw-gradient-from { syntax: "<color>"; initial-value:
// #0000; }`. Once that's anywhere in the document, --tw-gradient-from is
// type-locked to a bare <color> EVERYWHERE — including this app's own
// Tailwind v3 rules, which set it to a color+position token pair (valid in
// v3, not a bare <color>), so it becomes an invalid declaration and
// silently falls back to the registered initial-value (transparent). That
// would break gradient buttons app-wide, not just inside the library's own
// UI. Dropping these registrations avoids the collision — the library's
// own utilities still work fine as plain (untyped) custom properties.
const strippedLibraryStyles = libraryStyles.replace(/@property\s+--[\w-]+\s*\{[^{}]*\}/g, '');

const probestackLibraryStyleTag = document.createElement('style');
probestackLibraryStyleTag.innerHTML = strippedLibraryStyles;
document.head.appendChild(probestackLibraryStyleTag);

import App from './App.jsx';

// The ForgeSphere landing page forwards the active session as URL query
// params when linking here (separate origin, so localStorage isn't shared).
// Mirrors hydrateAuthContextFromUrl in forgesphere-api-lifecycle's main.jsx.
const hydrateAuthContextFromUrl = () => {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const userEmail = params.get('userEmail')?.trim();
  const authToken = params.get('authToken')?.trim();
  const userRole = params.get('userRole')?.trim();
  const organizationId = params.get('organizationId')?.trim();

  if (userEmail) localStorage.setItem('userEmail', userEmail);
  if (authToken) localStorage.setItem('authToken', authToken);
  if (userRole) localStorage.setItem('userRole', userRole);
  if (organizationId) {
    localStorage.setItem('organizationId', organizationId);
    localStorage.setItem('userOrganizationId', organizationId);
  }

  const authParamNames = ['userEmail', 'authToken', 'userRole', 'organizationId'];
  const hasAuthParams = authParamNames.some((name) => params.has(name));
  if (!hasAuthParams) return;

  authParamNames.forEach((name) => params.delete(name));
  const remainingQuery = params.toString();
  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`,
  );
};

hydrateAuthContextFromUrl();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
