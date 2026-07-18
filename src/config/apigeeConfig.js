const APIGEE_BASE_URL = 'https://forgesphere.probestack.io/apigee-wrapper';
export const TOKEN_API_END_POINT = 'https://forgesphere.probestack.io/apigee-wrapper/auth/apigee/token';

export const APIGEE_ENDPOINTS = {
  APP_CREDENTIALS: {
    CREATE_KEY: (org, developerId, appName) =>
      `${APIGEE_BASE_URL}/organizations/${org}/developers/${developerId}/apps/${appName}/keys`,
    ATTACH_PRODUCTS: (org, developerId, appName, consumerKey) =>
      `${APIGEE_BASE_URL}/organizations/${org}/developers/${developerId}/apps/${appName}/keys/${consumerKey}`,
    CREATE: (org, developerId, appName) =>
      `${APIGEE_BASE_URL}/organizations/${org}/developers/${developerId}/apps/${appName}/keys`,
    ROTATE: (org, developerId, appName, consumerKey) =>
      `${APIGEE_BASE_URL}/organizations/${org}/developers/${developerId}/apps/${appName}/keys/${consumerKey}/rotate`,
    UPDATE_PRODUCT_STATUS: (org, developerId, appName, consumerKey, productName, action) => {
      const method = action === 'APPROVE' ? 'POST' : 'DELETE';
      return {
        url: `${APIGEE_BASE_URL}/organizations/${org}/developers/${developerId}/apps/${appName}/keys/${consumerKey}/apiProducts/${productName}`,
        method,
      };
    },
  },
  TLS_KEYSTORES: {
    LIST: (org, env) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores`,
    GET: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores/${name}`,
    CREATE: (org, env) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores`,
    DELETE: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores/${name}`,
    ALIASES: {
      LIST: (org, env, ksName) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores/${ksName}/aliases`,
      GET: (org, env, ksName, alias) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores/${ksName}/aliases/${alias}`,
      CREATE: (org, env, ksName) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores/${ksName}/aliases`,
      DELETE: (org, env, ksName, alias) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keystores/${ksName}/aliases/${alias}`,
    },
  },
  ORGANIZATIONS: {
    LIST: `${APIGEE_BASE_URL}/organizations`,
  },
  ENVIRONMENT: {
    LIST: (org) => `${APIGEE_BASE_URL}/organizations/${org}/environments`,
  },
  APIS: {
    LIST: (org) => `${APIGEE_BASE_URL}/organizations/${org}/apis`,
    IMPORT: (org, name) => `${APIGEE_BASE_URL}/organizations/${org}/apis?action=import&name=${encodeURIComponent(name)}`,
  },
  DEVELOPERS: {
    LIST: (org) => `${APIGEE_BASE_URL}/organizations/${org}/developers`,
  },
  TARGET_SERVERS: {
    LIST: (org, env) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/targetservers`,
    GET: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/targetservers/${name}`,
    CREATE: (org, env) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/targetservers`,
    UPDATE: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/targetservers/${name}`,
    DELETE: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/targetservers/${name}`,
  },
  KVM_ENV_LEVEL: {
    LIST: (org, env) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps`,
    GET: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${name}`,
    CREATE: (org, env) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps`,
    DELETE: (org, env, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${name}`,
  },
  KVM_ENV_LEVEL_ENTRY: {
    LIST: (org, env, kvm) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries`,
    GET: (org, env, kvm, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries/${name}`,
    CREATE: (org, env, kvm) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries`,
    UPDATE: (org, env, kvm, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries/${name}`,
    DELETE: (org, env, kvm, name) => `${APIGEE_BASE_URL}/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries/${name}`,
  },
  PRODUCTS: {
    LIST: (org) => `${APIGEE_BASE_URL}/organizations/${org}/apiproducts`,
    GET: (org, name) => `${APIGEE_BASE_URL}/organizations/${org}/apiproducts/${name}`,
    CREATE: (org) => `${APIGEE_BASE_URL}/organizations/${org}/apiproducts`,
    UPDATE: (org, name) => `${APIGEE_BASE_URL}/organizations/${org}/apiproducts/${name}`,
    DELETE: (org, name) => `${APIGEE_BASE_URL}/organizations/${org}/apiproducts/${name}`,
  },
  APPS: {
    LIST: (org, developer_email) => `${APIGEE_BASE_URL}/organizations/${org}/developers/${developer_email}/apps`,
    GET: (org, developer_email, name) => `${APIGEE_BASE_URL}/organizations/${org}/developers/${developer_email}/apps/${name}`,
    CREATE: (org, developer_email) => `${APIGEE_BASE_URL}/organizations/${org}/developers/${developer_email}/apps`,
    UPDATE: (org, developer_email, name) => `${APIGEE_BASE_URL}/organizations/${org}/developers/${developer_email}/apps/${name}`,
    DELETE: (org, developer_email, name) => `${APIGEE_BASE_URL}/organizations/${org}/developers/${developer_email}/apps/${name}`,
  },
};

export default APIGEE_BASE_URL;
