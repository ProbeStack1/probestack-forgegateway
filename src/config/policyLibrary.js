import {
  Route, ShieldCheck, Gauge, Database, ShieldAlert, Fingerprint, DollarSign, RefreshCw,
  Lock, Share2, Timer, ScrollText,
  KeyRound, Ticket, Zap, BarChart2,
  ArrowLeftRight, SearchCode, Braces, FileCode2, HardDrive,
} from 'lucide-react';

// Shared policy catalog — single source of truth for both the Proxy Editor's
// "Add Policy" picker (src/pages/ProxyEditor.jsx) and the Create API dialog's
// "Attach Frameworks" > Policy multiselect (src/pages/Gateway/ProxiesView.jsx),
// so both surfaces always offer the exact same policy list. `icon` is a
// lucide-react component reference — render it as `<item.icon />`, not text.
export const POLICY_LIBRARY = [
  {
    cat: 'AI / LLM',
    cls: 'ai-item',
    items: [
      { name: 'LLM-RoutingPolicy', icon: Route, typeKey: 'llm-route' },
      { name: 'LLM-GuardRails', icon: ShieldCheck, typeKey: 'llm-guard' },
      { name: 'LLM-TokenQuota', icon: Gauge, typeKey: 'llm-quota' },
      { name: 'LLM-SemanticCache', icon: Database, typeKey: 'llm-cache' },
      { name: 'AI-PromptInjectionGuard', icon: ShieldAlert, typeKey: 'prompt-inject' },
      { name: 'AI-PIIRedaction', icon: Fingerprint, typeKey: 'ai-pii' },
      { name: 'AI-CostTracker', icon: DollarSign, typeKey: 'ai-cost' },
      { name: 'LLM-FallbackRouter', icon: RefreshCw, typeKey: 'llm-fallback' },
    ],
  },
  {
    cat: 'MCP Gateway',
    cls: 'mcp-item',
    items: [
      { name: 'MCP-AuthValidator', icon: Lock, typeKey: 'mcp-auth' },
      { name: 'MCP-ToolRouter', icon: Share2, typeKey: 'mcp-route' },
      { name: 'MCP-RateLimit', icon: Timer, typeKey: 'mcp-ratelimit' },
      { name: 'MCP-AuditLogger', icon: ScrollText, typeKey: 'mcp-log' },
    ],
  },
  {
    cat: 'Security',
    cls: '',
    items: [
      { name: 'VerifyAPIKey', icon: KeyRound, typeKey: 'verify-key' },
      { name: 'OAuthV2', icon: Lock, typeKey: 'oauth' },
      { name: 'JWT Verify', icon: Ticket, typeKey: 'jwt' },
      { name: 'SpikeArrest', icon: Zap, typeKey: 'spike' },
      { name: 'Quota', icon: BarChart2, typeKey: 'quota' },
    ],
  },
  {
    cat: 'Mediation',
    cls: '',
    items: [
      { name: 'AssignMessage', icon: ArrowLeftRight, typeKey: 'assign-message' },
      { name: 'ExtractVariables', icon: SearchCode, typeKey: 'extract-vars' },
      { name: 'JSONToXML', icon: Braces, typeKey: 'json-to-xml' },
      { name: 'JavaScript', icon: FileCode2, typeKey: 'javascript' },
      { name: 'ResponseCache', icon: HardDrive, typeKey: 'response-cache' },
    ],
  },
];

// Maps a POLICY_LIBRARY item's typeKey to the actual Apigee policy XML root
// element name used when generating its minimal policy definition.
// NOTE: Apigee's real XML root element for a JavaScript callout is
// "Javascript" (capital J, lowercase rest) — "JavaScript" is rejected at
// bundle-import time with "unknown XML root element".
export const POLICY_TYPE_TO_ELEMENT = {
  'verify-key': 'VerifyAPIKey',
  'oauth': 'OAuthV2',
  'jwt': 'VerifyJWT',
  'spike': 'SpikeArrest',
  'quota': 'Quota',
  'llm-route': 'Javascript',
  'llm-guard': 'Javascript',
  'llm-quota': 'Javascript',
  'llm-cache': 'Javascript',
  'prompt-inject': 'Javascript',
  'ai-pii': 'Javascript',
  'ai-cost': 'StatisticsCollector',
  'llm-fallback': 'Javascript',
  'mcp-auth': 'Javascript',
  'mcp-route': 'Javascript',
  'mcp-ratelimit': 'Javascript',
  'mcp-log': 'MessageLogging',
  'assign-message': 'AssignMessage',
  'extract-vars': 'ExtractVariables',
  'json-to-xml': 'JSONToXML',
  'javascript': 'Javascript',
  'response-cache': 'ResponseCache',
};

const JAVASCRIPT_STUB_SOURCE = '// Auto-generated placeholder — implement policy logic here.\n';

// Some policy types are schema-invalid without specific required child elements —
// Apigee's bundle-import validation rejects the whole bundle otherwise (e.g.
// VerifyAPIKey without an <APIKey ref> fails import with "The APIKey element must
// specify a ref attribute"). These are placeholder values the user is expected to
// replace with real config via Proxy Editor once the API exists — just enough to
// make the generated bundle importable, not to make the policy correct as-is.
const REQUIRED_POLICY_BODY = {
  VerifyAPIKey: () => `<APIKey ref="request.queryparam.apikey"/>`,
  OAuthV2: () => `<Operation>VerifyAccessToken</Operation>`,
  VerifyJWT: () => `<Algorithm>HS256</Algorithm>
  <Source>request.header.Authorization</Source>
  <SecretKey>
    <Value ref="private.jwt-secret"/>
  </SecretKey>`,
  SpikeArrest: () => `<Rate>30ps</Rate>`,
  Quota: () => `<Interval>1</Interval>
  <TimeUnit>minute</TimeUnit>
  <Allow count="100"/>`,
  // AssignMessage is schema-valid with no body at all, but a no-op policy is a
  // confusing default to hand back — this sets a harmless marker header instead,
  // so the effect of attaching it is visible without any further edits.
  AssignMessage: () => `<AssignTo createNew="false" type="response"/>
  <Set>
    <Headers>
      <Header name="X-Policy-Applied">AssignMessage</Header>
    </Headers>
  </Set>`,
  // ExtractVariables needs a Source and at least one extraction rule to do
  // anything useful; deploy-safe default that reads the resource path.
  ExtractVariables: () => `<Source>request</Source>
  <VariablePrefix>extracted</VariablePrefix>
  <URIPath>
    <Pattern ignoreCase="true">/{resource}</Pattern>
  </URIPath>`,
  // StatisticsCollector requires at least one <Statistic ref="..."> child —
  // omitting it fails bundle import ("Element 'Statistics' is missing").
  StatisticsCollector: () => `<Statistics>
    <Statistic name="ai_cost" ref="request.header.x-ai-cost" type="integer"/>
  </Statistics>`,
  // MessageLogging without a target (Syslog/CloudLogging) does nothing useful;
  // Syslog is the only target Apigee X/hybrid supports, so default to one.
  MessageLogging: () => `<Syslog>
    <Message>{request.verb} {request.uri} {response.status.code}</Message>
    <Host>localhost</Host>
    <Port>514</Port>
  </Syslog>`,
};

// A Javascript policy is schema-invalid without a <ResourceURL> pointing to a
// real .js resource in the bundle, so its minimal XML — and a matching stub
// resource file via policyResourceFile() below — must always be generated together.
export const MINIMAL_POLICY_XML = (type, name) => {
  if (type === 'Javascript') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Javascript name="${name}" timeLimit="200">
  <DisplayName>${name}</DisplayName>
  <Properties/>
  <ResourceURL>jsc://${name}.js</ResourceURL>
</Javascript>
`;
  }
  const requiredBody = REQUIRED_POLICY_BODY[type]?.();
  return `<?xml version="1.0" encoding="UTF-8"?>
<${type || 'Policy'} name="${name}">
  <DisplayName>${name}</DisplayName>${requiredBody ? `\n  ${requiredBody}` : ''}
</${type || 'Policy'}>
`;
};

// Companion resource file a generated policy needs alongside its XML (currently
// only Javascript, whose <ResourceURL> above must resolve to a real bundle
// resource) — returns { path, content } relative to the bundle's apiproxy/
// (or sharedflowbundle/) root, or null when the policy type needs no resource.
export const policyResourceFile = (type, name) =>
  type === 'Javascript' ? { path: `resources/jsc/${name}.js`, content: JAVASCRIPT_STUB_SOURCE } : null;

// Flattens POLICY_LIBRARY's category groups into a single list of
// { name, typeKey, icon, cat } — the shape the Create API dialog's
// Policy multiselect renders directly.
export const flattenPolicyLibrary = () =>
  POLICY_LIBRARY.flatMap((group) => group.items.map((item) => ({ ...item, cat: group.cat })));
