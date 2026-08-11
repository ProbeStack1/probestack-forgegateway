import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
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
