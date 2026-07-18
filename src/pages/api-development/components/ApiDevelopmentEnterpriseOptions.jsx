import React from 'react';
import { Card, CardTitle } from '../../../components/ui/card';
import EnterpriseOptionCard from './EnterpriseOptionCard';
import {
  API_DEVELOPMENT_DEPLOYMENT_OPTIONS,
  API_DEVELOPMENT_EXTERNAL_INTEGRATION_OPTIONS,
  API_DEVELOPMENT_LOG_DESTINATION_OPTIONS,
  API_DEVELOPMENT_LOGGING_OPTIONS,
  API_DEVELOPMENT_OBSERVABILITY_OPTIONS,
  API_DEVELOPMENT_SECURITY_OPTIONS,
  API_DEVELOPMENT_VALIDATION_OPTIONS,
} from '../apiDevelopmentOptions';
import { Sparkles, CheckCircle, XCircle, Activity, Shield, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };

const addAddon = (values, addon) => [...new Set([...values, addon])];
const removeAddon = (values, addon) => values.filter((value) => value !== addon);

export default function ApiDevelopmentEnterpriseOptions({
  authenticationType,
  setAuthenticationType,
  frameworkAddons,
  setFrameworkAddons,
  apiDevLoggingProvider,
  setApiDevLoggingProvider,
  apiDevLogDestination,
  setApiDevLogDestination,
  apiDevValidationMode,
  setApiDevValidationMode,
  apiDevDeploymentTarget,
  setApiDevDeploymentTarget,
  sections = ['security', 'logging', 'operations', 'observability', 'externalIntegrations', 'testAssets', 'deployment'],
  selectedTestCategories,
  setSelectedTestCategories,
}) {
  const loggingEnabled = frameworkAddons.includes('enterpriseLogging');
  const showSection = (section) => sections.includes(section);

  const setAddonEnabled = (addon, enabled) => {
    setFrameworkAddons((previous) => (enabled ? addAddon(previous, addon) : removeAddon(previous, addon)));
  };

  return (
    <>
      {showSection('security') && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Security Configuration</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Generate authentication, authorization, protected endpoints, and validation helpers.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_SECURITY_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.value}
              name="apiDevelopmentSecurity"
              checked={authenticationType === option.value}
              disabled={option.disabled}
              label={option.label}
              description={option.description}
              badge={option.badge}
              onChange={() => !option.disabled && setAuthenticationType(option.value)}
            />
          ))}
        </div>
      </Card>
      )}

      {showSection('logging') && (
      <Card className="p-4" style={cardStyle}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="mb-2">Logging</CardTitle>
            <p className="text-xs text-gray-400">Choose the generated logging provider. Runtime destination remains config-driven in the generated service.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dark-700 bg-[#0f172a]/50 px-3 py-2 text-xs text-gray-300">
            <input
              type="checkbox"
              className="accent-primary"
              checked={loggingEnabled}
              onChange={(event) => setAddonEnabled('enterpriseLogging', event.target.checked)}
            />
            Generate logging assets
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_LOGGING_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.value}
              name="apiDevelopmentLogging"
              checked={apiDevLoggingProvider === option.value}
              disabled={!loggingEnabled || option.disabled}
              label={option.label}
              description={option.description}
              badge={option.badge}
              onChange={() => !option.disabled && setApiDevLoggingProvider(option.value)}
            />
          ))}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Log Destination</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {API_DEVELOPMENT_LOG_DESTINATION_OPTIONS.map((option) => (
              <EnterpriseOptionCard
                key={option.value}
                name="apiDevelopmentLogDestination"
                checked={apiDevLogDestination === option.value}
                disabled={!loggingEnabled}
                label={option.label}
                description={option.description}
                onChange={() => setApiDevLogDestination(option.value)}
              />
            ))}
          </div>
        </div>
      </Card>
      )}

      {showSection('operations') && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Operations &amp; Runtime</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Add runtime support for common enterprise API behavior.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <EnterpriseOptionCard
            type="checkbox"
            checked={frameworkAddons.includes('exceptionHandling')}
            label="Global Exception Handling"
            description="Structured API error responses and validation errors."
            onChange={(event) => setAddonEnabled('exceptionHandling', event.target.checked)}
          />
          <EnterpriseOptionCard
            type="checkbox"
            checked={frameworkAddons.includes('observability')}
            label="Observability"
            description="Actuator, health, metrics, and tracing scaffold."
            onChange={(event) => setAddonEnabled('observability', event.target.checked)}
          />
          <EnterpriseOptionCard
            type="checkbox"
            checked={loggingEnabled}
            label="Audit Logging"
            description="Business operation summaries are included when logging assets are generated."
            onChange={(event) => setAddonEnabled('enterpriseLogging', event.target.checked)}
          />
          <EnterpriseOptionCard
            type="checkbox"
            checked={loggingEnabled}
            label="PII Masking"
            description="Sensitive request headers and fields are masked by generated logging defaults."
            onChange={(event) => setAddonEnabled('enterpriseLogging', event.target.checked)}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Validation Mode</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_VALIDATION_OPTIONS.map((option) => (
              <EnterpriseOptionCard
                key={option.value}
                name="apiDevelopmentValidation"
                checked={apiDevValidationMode === option.value}
                label={option.label}
                description={option.description}
                onChange={() => setApiDevValidationMode(option.value)}
              />
            ))}
          </div>
        </div>
      </Card>
      )}

      {showSection('observability') && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Observability</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Generate production-grade telemetry assets and actuator endpoints.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_OBSERVABILITY_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.label}
              type="checkbox"
              checked={false}
              disabled
              label={option.label}
              description={option.description}
              badge="Coming soon"
            />
          ))}
        </div>
      </Card>
      )}

      {showSection('externalIntegrations') && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">External Integrations</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Generate client adapters and integration-safe patterns.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_EXTERNAL_INTEGRATION_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.label}
              type="checkbox"
              checked={false}
              disabled
              label={option.label}
              description={option.description}
              badge="Coming soon"
            />
          ))}
        </div>
      </Card>
      )}

      {showSection('testAssets') && (
        <>
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Test Assets</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Choose generated testing assets included with the bundle.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <EnterpriseOptionCard
            type="checkbox"
            checked={frameworkAddons.includes('testCollection')}
            label="Postman Collection"
            description="Runnable Postman collection with security helpers."
            onChange={(event) => setAddonEnabled('testCollection', event.target.checked)}
          />
          <EnterpriseOptionCard type="checkbox" checked={false} disabled label="JUnit Tests" description="Controller, service, and repository test scaffolds." badge="Coming soon" />
          <EnterpriseOptionCard type="checkbox" checked={false} disabled label="Integration Tests" description="Spring Boot integration tests with test profile." badge="Coming soon" />
          <EnterpriseOptionCard type="checkbox" checked={false} disabled label="Testcontainers" description="Database/integration dependency containers for tests." badge="Coming soon" />
          <EnterpriseOptionCard type="checkbox" checked={false} disabled label="ForgeFuzz Collection" description="Planned generated ForgeQ test asset support." badge="Coming soon" />
        </div>
      </Card>

{/* ---- API Test Scenarios ---- */}
<Card className="p-4" style={cardStyle}>
  <CardTitle className="mb-2">Test Case Scenarios</CardTitle>
  <p className="mb-3 text-xs text-gray-400">
    Select which types of API test cases to generate from the OpenAPI specification.
  </p>
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {[
      { value: 'POSITIVE', label: 'Positive', description: 'Happy-path test cases for successful responses.' },
      { value: 'NEGATIVE', label: 'Negative', description: 'Error-handling and validation failure test cases.' },
      { value: 'PERFORMANCE', label: 'Performance', description: 'Latency and threshold test cases.' },
      { value: 'SECURITY', label: 'Security', description: 'Authentication and authorization test cases.' },
      { value: 'SCHEMA_VALIDATION', label: 'Schema Validation', description: 'Verify response structure matches the OpenAPI schema.' },
      { value: 'BOUNDARY', label: 'Boundary & Constraint', description: 'Test min/max limits, lengths, and enum boundaries.' },
      { value: 'IDEMPOTENCY', label: 'Idempotency', description: 'Ensure PUT/DELETE/PATCH requests are safe to repeat.' },
      { value: 'FUZZ', label: 'Fuzz & Injection', description: 'Test SQL injection, XSS, and malformed payloads.' },
    ].map((option) => (
      <EnterpriseOptionCard
        key={option.value}
        type="checkbox"
        checked={selectedTestCategories.includes(option.value)}
        label={option.label}
        description={option.description}
        onChange={(event) => {
          if (event.target.checked) {
            setSelectedTestCategories([...selectedTestCategories, option.value]);
          } else {
            setSelectedTestCategories(selectedTestCategories.filter(c => c !== option.value));
          }
        }}
      />
    ))}
  </div>
</Card>

      </>
      )}

      {showSection('deployment') && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Deployment Target</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Choose deployment assets to include in the generated ZIP.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_DEPLOYMENT_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.value}
              name="apiDevelopmentDeployment"
              checked={apiDevDeploymentTarget === option.value}
              disabled={option.disabled}
              label={option.label}
              description={option.description}
              badge={option.badge}
              onChange={() => !option.disabled && setApiDevDeploymentTarget(option.value)}
            />
          ))}
        </div>
      </Card>
      )}
    </>
  );
}
