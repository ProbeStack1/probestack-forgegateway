const PROTOCOL_OPTIONS = ["http", "https", "grpc", "grpcs", "ws", "wss"];

const SERVICE_PLUGIN_OPTIONS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

const createPlugin = ({
  type,
  key,
  label,
  desc,
  scopes,
  defaults,
  fields,
  buildPayload,
}) => ({
  type,
  key,
  label,
  desc,
  scopes,
  defaults,
  fields,
  buildPayload,
});

export const KONG_PLUGIN_DEFINITIONS = [
  createPlugin({
    type: "Traffic Control",
    key: "rate-limiting",
    label: "Rate Limiting",
    desc: "Limit the number of requests over a period of time.",
    scopes: ["global", "service", "route"],
    defaults: {
      enabled: true,
      protocols: ["http", "https"],
      tags: ["global", "rate-limit"],
      config: {
        minute: 100,
        hour: 5000,
        policy: "local",
        fault_tolerant: true,
        hide_client_headers: false,
        error_code: 429,
        error_message: "API rate limit exceeded",
      },
    },
    fields: [
      {
        section: "General Information",
        fields: [
          { path: "enabled", label: "Enabled", type: "toggle" },
          { path: "protocols", label: "Protocols", type: "multiselect", options: PROTOCOL_OPTIONS },
          { path: "tags", label: "Tags", type: "array" },
        ],
      },
      {
        section: "Configuration",
        fields: [
          { path: "config.minute", label: "Per Minute Limit", type: "number" },
          { path: "config.hour", label: "Per Hour Limit", type: "number" },
          {
            path: "config.policy",
            label: "Policy",
            type: "select",
            options: [
              { label: "Local", value: "local" },
              { label: "Cluster", value: "cluster" },
              { label: "Redis", value: "redis" },
            ],
          },
          { path: "config.fault_tolerant", label: "Fault Tolerant", type: "toggle" },
          { path: "config.hide_client_headers", label: "Hide Client Headers", type: "toggle" },
          { path: "config.error_code", label: "Error Code", type: "number" },
          { path: "config.error_message", label: "Error Message", type: "text" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "rate-limiting",
      enabled: Boolean(form.enabled),
      protocols: Array.isArray(form.protocols) ? form.protocols : [],
      tags: Array.isArray(form.tags) ? form.tags.filter(Boolean) : [],
      config: {
        minute: Number(form.config?.minute ?? 0),
        hour: Number(form.config?.hour ?? 0),
        policy: form.config?.policy || "local",
        fault_tolerant: Boolean(form.config?.fault_tolerant),
        hide_client_headers: Boolean(form.config?.hide_client_headers),
        error_code: Number(form.config?.error_code ?? 429),
        error_message: form.config?.error_message || "API rate limit exceeded",
      },
    }),
  }),
  createPlugin({
    type: "Authentication",
    key: "key-auth",
    label: "Key Authentication",
    desc: "Secure services using API key authentication.",
    scopes: ["service", "route"],
    defaults: {
      config: {
        key_names: ["apikey"],
        key_in_header: true,
        key_in_query: true,
        hide_credentials: true,
      },
    },
    fields: [
      {
        section: "Configuration",
        fields: [
          { path: "config.key_names", label: "Key Names", type: "array" },
          { path: "config.key_in_header", label: "Key In Header", type: "toggle" },
          { path: "config.key_in_query", label: "Key In Query", type: "toggle" },
          { path: "config.hide_credentials", label: "Hide Credentials", type: "toggle" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "key-auth",
      config: {
        key_names: Array.isArray(form.config?.key_names) ? form.config.key_names.filter(Boolean) : [],
        key_in_header: Boolean(form.config?.key_in_header),
        key_in_query: Boolean(form.config?.key_in_query),
        hide_credentials: Boolean(form.config?.hide_credentials),
      },
    }),
  }),
  createPlugin({
    type: "Authentication",
    key: "jwt",
    label: "JWT",
    desc: "Verify and authenticate JSON Web Tokens.",
    scopes: ["service", "route"],
    defaults: {
      config: {
        uri_param_names: ["jwt"],
        cookie_names: [],
        header_names: ["Authorization"],
        key_claim_name: "iss",
        secret_is_base64: false,
        claims_to_verify: ["exp"],
        anonymous: null,
        run_on_preflight: true,
        maximum_expiration: 0,
      },
    },
    fields: [
      {
        section: "Configuration",
        fields: [
          { path: "config.uri_param_names", label: "URI Param Names", type: "array" },
          { path: "config.cookie_names", label: "Cookie Names", type: "array" },
          { path: "config.header_names", label: "Header Names", type: "array" },
          { path: "config.key_claim_name", label: "Key Claim Name", type: "text" },
          { path: "config.secret_is_base64", label: "Secret Is Base64", type: "toggle" },
          { path: "config.claims_to_verify", label: "Claims To Verify", type: "array" },
          { path: "config.anonymous", label: "Anonymous Consumer ID", type: "text", allowNull: true },
          { path: "config.run_on_preflight", label: "Run On Preflight", type: "toggle" },
          { path: "config.maximum_expiration", label: "Maximum Expiration", type: "number" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "jwt",
      config: {
        uri_param_names: Array.isArray(form.config?.uri_param_names) ? form.config.uri_param_names.filter(Boolean) : [],
        cookie_names: Array.isArray(form.config?.cookie_names) ? form.config.cookie_names.filter(Boolean) : [],
        header_names: Array.isArray(form.config?.header_names) ? form.config.header_names.filter(Boolean) : [],
        key_claim_name: form.config?.key_claim_name || "iss",
        secret_is_base64: Boolean(form.config?.secret_is_base64),
        claims_to_verify: Array.isArray(form.config?.claims_to_verify) ? form.config.claims_to_verify.filter(Boolean) : [],
        anonymous: form.config?.anonymous ? form.config.anonymous : null,
        run_on_preflight: Boolean(form.config?.run_on_preflight),
        maximum_expiration: Number(form.config?.maximum_expiration ?? 0),
      },
    }),
  }),
  createPlugin({
    type: "Security",
    key: "cors",
    label: "CORS",
    desc: "Enable Cross-Origin Resource Sharing for your services.",
    scopes: ["service", "route"],
    defaults: {
      config: {
        origins: ["*"],
        methods: [...SERVICE_PLUGIN_OPTIONS],
        headers: ["Accept", "Authorization", "Content-Type"],
        exposed_headers: ["X-Auth-Token"],
        credentials: true,
        max_age: 3600,
        preflight_continue: false,
      },
    },
    fields: [
      {
        section: "Configuration",
        fields: [
          { path: "config.origins", label: "Origins", type: "array" },
          { path: "config.methods", label: "Methods", type: "array" },
          { path: "config.headers", label: "Headers", type: "array" },
          { path: "config.exposed_headers", label: "Exposed Headers", type: "array" },
          { path: "config.credentials", label: "Credentials", type: "toggle" },
          { path: "config.max_age", label: "Max Age", type: "number" },
          { path: "config.preflight_continue", label: "Preflight Continue", type: "toggle" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "cors",
      config: {
        origins: Array.isArray(form.config?.origins) ? form.config.origins.filter(Boolean) : [],
        methods: Array.isArray(form.config?.methods) ? form.config.methods.filter(Boolean) : [],
        headers: Array.isArray(form.config?.headers) ? form.config.headers.filter(Boolean) : [],
        exposed_headers: Array.isArray(form.config?.exposed_headers) ? form.config.exposed_headers.filter(Boolean) : [],
        credentials: Boolean(form.config?.credentials),
        max_age: Number(form.config?.max_age ?? 0),
        preflight_continue: Boolean(form.config?.preflight_continue),
      },
    }),
  }),
  createPlugin({
    type: "Traffic Control",
    key: "acl",
    label: "ACL",
    desc: "Control access based on defined access control lists.",
    scopes: ["service", "route"],
    defaults: {
      config: {
        allow: ["admin-group", "user-group"],
        deny: [],
        hide_groups_header: false,
      },
    },
    fields: [
      {
        section: "Configuration",
        fields: [
          { path: "config.allow", label: "Allowed Groups", type: "array" },
          { path: "config.deny", label: "Denied Groups", type: "array" },
          { path: "config.hide_groups_header", label: "Hide Groups Header", type: "toggle" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "acl",
      config: {
        allow: Array.isArray(form.config?.allow) ? form.config.allow.filter(Boolean) : [],
        deny: Array.isArray(form.config?.deny) && form.config.deny.length
          ? form.config.deny.filter(Boolean)
          : null,
        hide_groups_header: Boolean(form.config?.hide_groups_header),
      },
    }),
  }),
  createPlugin({
    type: "Security",
    key: "ip-restriction",
    label: "IP Restriction",
    desc: "Allow or deny requests based on client IP.",
    scopes: ["service", "route"],
    defaults: {
      config: {
        allow: ["127.0.0.1", "10.0.0.0/8", "192.168.0.0/16"],
        deny: [],
        status: 403,
        message: "Your IP is not allowed",
      },
    },
    fields: [
      {
        section: "Configuration",
        fields: [
          { path: "config.allow", label: "Allowed IPs", type: "array" },
          { path: "config.deny", label: "Denied IPs", type: "array" },
          { path: "config.status", label: "Status", type: "number" },
          { path: "config.message", label: "Message", type: "text" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "ip-restriction",
      config: {
        allow: Array.isArray(form.config?.allow) ? form.config.allow.filter(Boolean) : [],
        deny: Array.isArray(form.config?.deny) && form.config.deny.length
          ? form.config.deny.filter(Boolean)
          : null,
        status: Number(form.config?.status ?? 403),
        message: form.config?.message || "Your IP is not allowed",
      },
    }),
  }),
  createPlugin({
    type: "Transformation",
    key: "request-transformer",
    label: "Request Transformer",
    desc: "Modify incoming requests before forwarding.",
    scopes: ["service", "route"],
    defaults: {
      config: {
        add: {
          headers: ["X-Custom-Header:my-value"],
          querystring: ["added_param:value"],
          body: [],
        },
        remove: {
          headers: ["X-Remove-This"],
          querystring: [],
          body: [],
        },
        rename: {
          headers: [],
          querystring: [],
          body: [],
        },
        replace: {
          headers: [],
          querystring: [],
          body: [],
        },
        append: {
          headers: [],
          querystring: [],
          body: [],
        },
      },
    },
    fields: [
      {
        section: "Configuration",
        fields: [
          { path: "config.add.headers", label: "Add Headers", type: "array" },
          { path: "config.add.querystring", label: "Add Querystring", type: "array" },
          { path: "config.add.body", label: "Add Body", type: "array" },
          { path: "config.remove.headers", label: "Remove Headers", type: "array" },
          { path: "config.remove.querystring", label: "Remove Querystring", type: "array" },
          { path: "config.remove.body", label: "Remove Body", type: "array" },
          { path: "config.rename.headers", label: "Rename Headers", type: "array" },
          { path: "config.rename.querystring", label: "Rename Querystring", type: "array" },
          { path: "config.rename.body", label: "Rename Body", type: "array" },
          { path: "config.replace.headers", label: "Replace Headers", type: "array" },
          { path: "config.replace.querystring", label: "Replace Querystring", type: "array" },
          { path: "config.replace.body", label: "Replace Body", type: "array" },
          { path: "config.append.headers", label: "Append Headers", type: "array" },
          { path: "config.append.querystring", label: "Append Querystring", type: "array" },
          { path: "config.append.body", label: "Append Body", type: "array" },
        ],
      },
    ],
    buildPayload: (form) => ({
      name: "request-transformer",
      config: {
        add: {
          headers: Array.isArray(form.config?.add?.headers) ? form.config.add.headers.filter(Boolean) : [],
          querystring: Array.isArray(form.config?.add?.querystring) ? form.config.add.querystring.filter(Boolean) : [],
          body: Array.isArray(form.config?.add?.body) ? form.config.add.body.filter(Boolean) : [],
        },
        remove: {
          headers: Array.isArray(form.config?.remove?.headers) ? form.config.remove.headers.filter(Boolean) : [],
          querystring: Array.isArray(form.config?.remove?.querystring) ? form.config.remove.querystring.filter(Boolean) : [],
          body: Array.isArray(form.config?.remove?.body) ? form.config.remove.body.filter(Boolean) : [],
        },
        rename: {
          headers: Array.isArray(form.config?.rename?.headers) ? form.config.rename.headers.filter(Boolean) : [],
          querystring: Array.isArray(form.config?.rename?.querystring) ? form.config.rename.querystring.filter(Boolean) : [],
          body: Array.isArray(form.config?.rename?.body) ? form.config.rename.body.filter(Boolean) : [],
        },
        replace: {
          headers: Array.isArray(form.config?.replace?.headers) ? form.config.replace.headers.filter(Boolean) : [],
          querystring: Array.isArray(form.config?.replace?.querystring) ? form.config.replace.querystring.filter(Boolean) : [],
          body: Array.isArray(form.config?.replace?.body) ? form.config.replace.body.filter(Boolean) : [],
        },
        append: {
          headers: Array.isArray(form.config?.append?.headers) ? form.config.append.headers.filter(Boolean) : [],
          querystring: Array.isArray(form.config?.append?.querystring) ? form.config.append.querystring.filter(Boolean) : [],
          body: Array.isArray(form.config?.append?.body) ? form.config.append.body.filter(Boolean) : [],
        },
      },
    }),
  }),
];

export const KONG_PLUGIN_TYPES = [...new Set(KONG_PLUGIN_DEFINITIONS.map((plugin) => plugin.type))];

export const getPluginsByType = (type) =>
  KONG_PLUGIN_DEFINITIONS.filter((plugin) => plugin.type === type);

export const getPluginDefinition = (pluginKey) =>
  KONG_PLUGIN_DEFINITIONS.find((plugin) => plugin.key === pluginKey) || null;

export const findPluginDefinitionFromEntity = (pluginEntity) =>
  getPluginDefinition(pluginEntity?.name || "");
