const API_BASE_URL = 'https://forgegateway.probestack.io';

export const API_ENDPOINTS = {
  CONSUMERS: {
    CREATE: `${API_BASE_URL}/consumer/v1/api/consumers`,
    GET_ALL: `${API_BASE_URL}/consumer/v1/api/consumers`,
    GET_BY_ID: (id) => `${API_BASE_URL}/consumer/v1/api/consumers/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/consumer/v1/api/consumers/${id}`,
    DELETE: (id) => `${API_BASE_URL}/consumer/v1/api/consumers/${id}`,
  },
  CONNECTOR_CONFIGURATIONS: {
    CREATE: `${API_BASE_URL}/onboarding/v1/api/connector-configurations`,
    GET_ALL: `${API_BASE_URL}/onboarding/v1/api/connector-configurations`,
    GET_BY_ID: (id) => `${API_BASE_URL}/onboarding/v1/api/connector-configurations/${id}`,
    GET_BY_ORGANIZATION_ID: (organizationId) => `${API_BASE_URL}/onboarding/v1/api/connector-configurations/organization/${organizationId}`,
    GET_DEFAULTS: (organizationId = '') => `${API_BASE_URL}/onboarding/v1/api/connector-configurations/defaults${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`,
    UPDATE: (id) => `${API_BASE_URL}/onboarding/v1/api/connector-configurations/${id}`,
    DELETE: (id) => `${API_BASE_URL}/onboarding/v1/api/connector-configurations/${id}`,
    TEST_DB_CONNECTION: `${API_BASE_URL}/onboarding/api/v1/database/test-connection`,
  },
  ONBOARDING: {
    CREATE: `${API_BASE_URL}/onboarding/v1/api/onboarding`,
    GET_BY_ID: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/${id}`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/${id}/status`,
    CREATE_CONTEXT: `${API_BASE_URL}/onboarding/v1/api/onboarding/contexts`,
    GET_CONTEXTS: (projectType) => `${API_BASE_URL}/onboarding/v1/api/onboarding/contexts${projectType ? `?projectType=${encodeURIComponent(projectType)}` : ''}`,
    GET_CONTEXT_BY_ID: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/contexts/${id}`,
    UPDATE_CONTEXT_STATUS: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/contexts/${id}/status`,
    CREATE_CONTEXT_RESOURCE: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/contexts/${id}/resources`,
    GET_RESOURCE_DETAILS: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/resources/${id}`,
    UPDATE_RESOURCE_API_NAME: (id) => `${API_BASE_URL}/onboarding/v1/api/onboarding/resources/${id}/api-name`,
    GET_APPLICATION_NAMES: (projectType) => `${API_BASE_URL}/onboarding/v1/api/onboarding/application-names?projectType=${projectType}`,
    GET_BY_APPLICATION_ID: (applicationId) => `${API_BASE_URL}/onboarding/v1/api/onboarding/application-id?applicationId=${applicationId}`,
    CLONING: (applicationId) => `${API_BASE_URL}/onboarding/v1/api/onboarding/${applicationId}/clone`,
    VERSIONING: (applicationId) => `${API_BASE_URL}/onboarding/v1/api/onboarding/${applicationId}/versioning`,
    GET_ALL_BY_PROJECT_TYPE: (projectType) => `${API_BASE_URL}/onboarding/v1/api/onboarding?projectType=${projectType}`,
    GET_AUDIT_LOGS: (params = '') => `${API_BASE_URL}/onboarding/v1/api/audit-logs${params ? `?${params}` : ''}`,
  },
  REQUIREMENTS: {
    CREATE: `${API_BASE_URL}/requirement/v1/api/requirements`,
    GENERATE_SPEC_RECOMMENDATIONS: `${API_BASE_URL}/requirement/v1/api/requirements/ai/spec-recommendations`,
    SELECT_RECOMMENDED_SPEC: `${API_BASE_URL}/requirement/v1/api/requirements/ai/spec-selection`,
    AI_GENERATED_SPEC: `${API_BASE_URL}/requirement/v1/api/requirements/ai/generated-spec`,
  },
  // API_DESIGN: {
  //   GET_ALL_BY_ORGANIZATION_ID:(organizationId)=> `${API_BASE_URL}/api-design/v1/api/apidesign/uploaded-specs/organization/${organizationId}`,
  //   UPLOAD_SPEC: `${API_BASE_URL}/api-design/v1/api/apidesign/upload-spec`,
  //   CREATE: `${API_BASE_URL}/api-design/v1/api/apidesign/create`,
  // },
  API_DESIGN: {
    // Step 3 - API Design page: Tab 1 "Your Specs"
    GET_IMPORTED_BY_MICROSERVICE: (microserviceId) => `${API_BASE_URL}/api-design/v1/api/apidesign/imported-specs/microservice/${microserviceId}`,

    // Step 3 - API Design page: Tab 2 "Spec Library"
    GET_LIBRARY: (organizationId) => `${API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${organizationId}`,

    // Step 3 - Upload new spec (always pass microserviceId)
    UPLOAD_SPEC: `${API_BASE_URL}/api-design/v1/api/apidesign/upload-spec`,

    // Step 3 - Save/Next button
    CREATE: `${API_BASE_URL}/api-design/v1/api/apidesign/create`,

    // Fetch raw spec content by spec-metadata ID
    GET_SPEC_CONTENT: (id) => `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${id}/content`,

    // Update spec metadata (specContent as form field)
    UPDATE_SPEC_METADATA: (id) => `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${id}`,

    // Promote imported spec to organization library
    PROMOTE_TO_LIBRARY: (id) => `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${id}/promote-to-library`,
  },
  MOCK_API: {
    GET_SPEC_ENDPOINTS: (specMetadataId) => `${API_BASE_URL}/mock-api/v1/api/mocks/spec-endpoints/${specMetadataId}`,
    GENERATE_FROM_SPEC: `${API_BASE_URL}/mock-api/v1/api/mocks/generate-from-spec`,
    RUN_MOCK: (mockId) => `${API_BASE_URL}/mock-api/v1/api/mocks/${mockId}/run`,
    GET_BY_MICROSERVICE: (microserviceId) => `${API_BASE_URL}/mock-api/v1/api/mocks?microserviceId=${microserviceId}`,
    GET_MOCK_ENDPOINTS: (mockId) => `${API_BASE_URL}/mock-api/v1/api/mocks/${mockId}/endpoints`,
  },
    CONTRACT_TESTING: {
    GET_STATUS: (microserviceId) => `${API_BASE_URL}/contract-testing/v1/api/contracttesting/status?microserviceId=${microserviceId}`,
    GET_BY_MICROSERVICE: (microserviceId) => `${API_BASE_URL}/contract-testing/v1/api/contracttesting/microservice/${microserviceId}`,
    SEND_APPROVAL: `${API_BASE_URL}/contract-testing/v1/api/contracttesting/send-approval`,
    APPROVALS: `${API_BASE_URL}/contract-testing/v1/api/contracttesting/approvals`,
    REVIEW: (id) => `${API_BASE_URL}/contract-testing/v1/api/contracttesting/review/${id}`,
    APPROVE: (id) => `${API_BASE_URL}/contract-testing/v1/api/contracttesting/review/${id}/approve`,
    REJECT: (id) => `${API_BASE_URL}/contract-testing/v1/api/contracttesting/review/${id}/reject`,
    HISTORY: `${API_BASE_URL}/contract-testing/v1/api/contracttesting/history`,
    SENT_APPROVALS: `${API_BASE_URL}/contract-testing/v1/api/contracttesting/sent-approvals`,
    APPROVAL_DETAILS: (id) => `${API_BASE_URL}/contract-testing/v1/api/contracttesting/approval/${id}/details`,
  },

  // ─── Static Code Analysis Endpoints ───
  STATIC_CODE_ANALYSIS: {
    // Predefined rules
    GET_PREDEFINED_RULES: (targetType) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/predefined-rules/${targetType}`,

    // Custom rules CRUD
    GET_CUSTOM_RULES: (targetType, targetId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/rules/${targetType}/${targetId}`,
    ADD_CUSTOM_RULE: `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/rules`,
    UPDATE_CUSTOM_RULE: (ruleId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/rules/${ruleId}`,
    DELETE_CUSTOM_RULE: (ruleId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/rules/${ruleId}`,

    // Run analysis (synchronous)
    RUN_ANALYSIS: (targetType, targetId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/run/${targetType}/${targetId}`,

    // Streaming analysis (SSE)
    STREAM_ANALYSIS: (targetType, targetId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/stream/${targetType}/${targetId}`,

    // Reports
    GET_LATEST_REPORT: (targetType, targetId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/reports/${targetType}/${targetId}/latest`,
    GET_REPORT_BY_ID: (reportId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/reports/${reportId}`,
    GET_REPORT_HISTORY: (targetType, targetId) =>
      `${API_BASE_URL}/contract-testing/v1/api/static-code-analysis/reports/${targetType}/${targetId}/history`,
  },
TEST_CASE: {
    GENERATE: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/generate`,
    GET_TEST_CASES: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/test-cases`,
    RUN: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/run`,
    GET_RESULTS: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/results`,
    GENERATION_HISTORY: `${API_BASE_URL}/test/api/v1/generation-history`,
    EXECUTION_HISTORY: `${API_BASE_URL}/test/api/v1/execution-history`,
    EXECUTION_HISTORY_BY_MICROSERVICE: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/executions`,
    GENERATION_HISTORY_BY_MICROSERVICE: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/generation-history`,
    SPEC_CONTENT: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/spec-content`,
    IMPORT_COLLECTION_FROM_URL: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/collections/import-from-url`,
    GENERATE_FROM_HISTORY: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/generate-from-history`,
    GET_COLLECTION_CONTENT: (historyId) => `${API_BASE_URL}/test/api/v1/test-specs/collections/${historyId}/content`,
    SINGLE_RUN: (microserviceId, testCaseId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/test-cases/${testCaseId}/run`,
    SCORE: (microserviceId) => `${API_BASE_URL}/test/api/v1/test-specs/${microserviceId}/score`,
    COMPARE_RUNS: `${API_BASE_URL}/test/api/v1/test-specs/compare-runs`,
  },
  API_DEVELOPMENT: {
    CREATE_PROJECT_METADATA: `${API_BASE_URL}/api-development/v1/project-metadata`,
    GENERATE_CODE: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/generate-code`,
    GET_CODE_ARTIFACT: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/code-artifact`,
    UPLOAD_GITHUB: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deploy-to-github`,
    GET_LATEST_GITHUB_RUN: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deploy-to-github/latest-run`,
    SYNC_DEPLOYMENT_ARTIFACTS: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployment-artifacts/sync`,
    GET_DEPLOYMENT_ARTIFACTS: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployment-artifacts`,
    PROMOTE_DEPLOYMENT: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployments/promote`,
    PROMOTE_DEPLOYMENT_GITHUB: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployments/promote/github`,
    ROLLBACK_DEPLOYMENT: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployments/rollback`,
    ROLLBACK_DEPLOYMENT_GITHUB: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployments/rollback/github`,
    GET_DEPLOYMENT_HISTORY: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployments/history`,
    GET_GITHUB_PIPELINE_STATUS: (microserviceId, deploymentId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deployments/${deploymentId}/github/status`,
    GET_GITHUB_PIPELINE_LOGS: (microserviceId, params = '') => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/github-pipeline-logs${params ? `?${params}` : ''}`,
    GET_DEPLOYMENT_HISTORY_BULK: (microserviceIds) => `${API_BASE_URL}/api-development/v1/api-development/deployments/history?microserviceIds=${encodeURIComponent(microserviceIds)}`,
    GET_AUDIT_LOGS: (params = '') => `${API_BASE_URL}/api-development/v1/api-development/audit-logs${params ? `?${params}` : ''}`,
    MERGE: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/merge`,
    DEPRECATE: (microserviceId) => `${API_BASE_URL}/api-development/v1/api-development/${microserviceId}/deprecate`,
  },
    SPEC_SHARE: {
    SEND: `${API_BASE_URL}/api-design/v1/api/apidesign/share-spec`,
  },
  SCHEMA_REGISTRY: {
    LIST:        (orgId)    => `${API_BASE_URL}/api-design/v1/api/schemas?organizationId=${orgId}`,
    GET:         (schemaId) => `${API_BASE_URL}/api-design/v1/api/schemas/${schemaId}`,
    GET_BY_SPEC: (specId)   => `${API_BASE_URL}/api-design/v1/api/schemas/spec/${specId}`,
    GET_BY_DOMAIN: (domain) => `${API_BASE_URL}/api-design/v1/api/schemas/domain/${encodeURIComponent(domain)}`,
    LIST_DOMAINS:              `${API_BASE_URL}/api-design/v1/api/schemas/domains`,
    CREATE:                     `${API_BASE_URL}/api-design/v1/api/schemas`,
    UPDATE:      (schemaId) => `${API_BASE_URL}/api-design/v1/api/schemas/${schemaId}`,
    DELETE:      (schemaId) => `${API_BASE_URL}/api-design/v1/api/schemas/${schemaId}`,
  },
  WORKFLOWS: {
    LIST:         (userEmail)    => `${API_BASE_URL}/onboarding/api/workflows?userEmail=${encodeURIComponent(userEmail)}`,
    LIST_BY_ORG:  (organization) => `${API_BASE_URL}/onboarding/api/workflows/organization?organization=${encodeURIComponent(organization)}`,
    CREATE: `${API_BASE_URL}/onboarding/api/workflows`,
    UPDATE: (id) => `${API_BASE_URL}/onboarding/api/workflows/${id}`,
    DELETE: (id) => `${API_BASE_URL}/onboarding/api/workflows/${id}`,
  },
  // ─── Peer Review (contract-testing-svc) ───
  PEER_REVIEW: {
    GET_STATUS: (microserviceId) => `${API_BASE_URL}/contract-testing/v1/api/peerreview/status?microserviceId=${microserviceId}`,
    GET_BY_MICROSERVICE: (microserviceId) => `${API_BASE_URL}/contract-testing/v1/api/peerreview/microservice/${microserviceId}`,
    SEND_APPROVAL: `${API_BASE_URL}/contract-testing/v1/api/peerreview/send-approval`,
    APPROVALS: `${API_BASE_URL}/contract-testing/v1/api/peerreview/approvals`,
    SENT_APPROVALS: `${API_BASE_URL}/contract-testing/v1/api/peerreview/sent-approvals`,
    REVIEW: (id) => `${API_BASE_URL}/contract-testing/v1/api/peerreview/review/${id}`,
    APPROVAL_DETAILS: (id) => `${API_BASE_URL}/contract-testing/v1/api/peerreview/approval/${id}/details`,
    APPROVE: (id) => `${API_BASE_URL}/contract-testing/v1/api/peerreview/review/${id}/approve`,
    REJECT: (id) => `${API_BASE_URL}/contract-testing/v1/api/peerreview/review/${id}/reject`,
  },
};

export default API_BASE_URL;
