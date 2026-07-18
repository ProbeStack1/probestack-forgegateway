export const API_DEVELOPMENT_SECURITY_OPTIONS = [
  {
    label: 'OAuth2 Resource Server',
    value: 'OAuth 2.0',
    description: 'JWT validation, scopes, protected APIs, and Spring Security config.',
  },
  {
    label: 'OAuth2.1 Resource Server',
    value: 'OAuth 2.1',
    description: 'OAuth2.1-aligned defaults, JWT validation, scopes, and protected APIs.',
  },
  {
    label: 'JWT Token Validation',
    value: 'JWT',
    description: 'Lightweight local JWT validation with sample token generation assets.',
  },
  {
    label: 'External Identity Provider',
    value: 'IDP',
    description: 'Okta, Microsoft Entra ID, Auth0, Keycloak issuer configuration.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'API Key Security',
    value: 'Api-Key',
    description: 'API key header validation and protected endpoint filter.',
  },
  {
    label: 'HMAC Signature',
    value: 'HMAC',
    description: 'Signed request validation with timestamp and replay protection.',
  },
];

export const API_DEVELOPMENT_LOGGING_OPTIONS = [
  {
    label: 'Structured Console Logging',
    value: 'CONSOLE',
    description: 'JSON-ready logs for local runs, containers, and Cloud Run stdout collection.',
  },
  {
    label: 'GCP Cloud Logging',
    value: 'GCP',
    description: 'Structured log fields aligned to Google Cloud Logging.',
  },
  {
    label: 'Grafana / Loki',
    value: 'GRAFANA',
    description: 'Structured logs suitable for collector-based ingestion.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Splunk',
    value: 'SPLUNK',
    description: 'Structured logs suitable for Splunk forwarder or HEC ingestion.',
    badge: 'Coming soon',
    disabled: true,
  },
];

export const API_DEVELOPMENT_LOG_DESTINATION_OPTIONS = [
  { label: 'Console', value: 'CONSOLE', description: 'Write logs to stdout.' },
  { label: 'File', value: 'FILE', description: 'Write logs to service log file.' },
  { label: 'Console + File', value: 'CONSOLE_AND_FILE', description: 'Write logs to both destinations.' },
];

export const API_DEVELOPMENT_VALIDATION_OPTIONS = [
  {
    label: 'Development Mode',
    value: 'DEVELOPMENT',
    description: 'Validation disabled by default so copied sample requests are easier to test.',
  },
  {
    label: 'Production Validation Mode',
    value: 'PRODUCTION',
    description: 'Generated APIs enforce request validation by default.',
  },
];

export const API_DEVELOPMENT_PERSISTENCE_OPTIONS = [
  {
    label: 'MongoDB',
    value: 'MONGODB',
    description: 'Spring Data Mongo repository and Mongo config.',
  },
  {
    label: 'PostgreSQL',
    value: 'POSTGRESQL',
    description: 'Spring Data JPA, entity, repository, and migration script.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'MySQL',
    value: 'MYSQL',
    description: 'JPA repository with SQL migration assets.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'No Database',
    value: 'NONE',
    description: 'Service-only scaffold without persistence layer.',
    badge: 'Coming soon',
    disabled: true,
  },
];

export const API_DEVELOPMENT_RESILIENCY_OPTIONS = [
  {
    label: 'Timeouts',
    value: 'TIMEOUTS',
    description: 'Default connect/read timeout configuration.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Retry',
    value: 'RETRY',
    description: 'Retry config for safe transient downstream failures.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Circuit Breaker',
    value: 'CIRCUIT_BREAKER',
    description: 'Resilience4j circuit breaker starter config.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Rate Limiting',
    value: 'RATE_LIMITING',
    description: 'Request throttling config and filter placeholder.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Bulkhead',
    value: 'BULKHEAD',
    description: 'Isolate downstream resources and thread pools.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Caching',
    value: 'CACHING',
    description: 'Local cache or Redis-ready configuration.',
    badge: 'Coming soon',
    disabled: true,
  },
];

export const API_DEVELOPMENT_OBSERVABILITY_OPTIONS = [
  {
    label: 'Health Checks',
    description: '/actuator/health and readiness/liveness probes.',
  },
  {
    label: 'Metrics',
    description: 'Micrometer metrics and standard HTTP metrics.',
  },
  {
    label: 'Distributed Tracing',
    description: 'Trace ID propagation and OpenTelemetry starter config.',
  },
  {
    label: 'Prometheus Endpoint',
    description: '/actuator/prometheus and scrape config placeholder.',
  },
];

export const API_DEVELOPMENT_EXTERNAL_INTEGRATION_OPTIONS = [
  {
    label: 'REST Client',
    description: 'WebClient config, DTOs, timeout, and error mapping.',
  },
  {
    label: 'Feign Client',
    description: 'Declarative client interface and config.',
  },
  {
    label: 'Kafka Producer',
    description: 'Producer config, event model, and sample publisher.',
  },
  {
    label: 'Kafka Consumer',
    description: 'Listener config, retry topic pattern, and sample handler.',
  },
  {
    label: 'GCP Pub/Sub',
    description: 'Publisher/subscriber config and sample event handler.',
  },
  {
    label: 'Webhook Client',
    description: 'Signed outbound callback support.',
  },
];

export const API_DEVELOPMENT_DEPLOYMENT_OPTIONS = [
  {
    label: 'Google Cloud Run',
    value: 'CLOUD_RUN',
    description: 'Docker and Cloud Run deployment documentation assets.',
  },
  {
    label: 'GKE / Kubernetes',
    value: 'GKE',
    description: 'Deployment, Service, ConfigMap, Secret, Ingress, and HPA YAML.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Helm Chart',
    value: 'HELM',
    description: 'Reusable Helm chart values and templates.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'AWS',
    value: 'AWS',
    description: 'ECS/EKS deployment scaffolding.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'Azure',
    value: 'AZURE',
    description: 'AKS/App Service deployment scaffolding.',
    badge: 'Coming soon',
    disabled: true,
  },
  {
    label: 'OpenShift',
    value: 'OPENSHIFT',
    description: 'Route, deployment config, and OpenShift metadata.',
    badge: 'Coming soon',
    disabled: true,
  },
];
