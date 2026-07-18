import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, ChevronRight, Sparkles, Loader2, CheckCircle2, CheckCircle, RefreshCw,
  Github, Cloud, FileCode2, Zap, AlertTriangle, AlertCircle, Check, Bot,
  ArrowLeft, Copy, Link2, Layers, BarChart2, FileText, Eye, GitMerge,
  Server, Globe, Play, Pause, Square
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const STEP_LABELS = ['Basic Info', 'LLM Setup', 'Generate Specification', 'Schema Mapping'];

const CONNECTOR_TABS = [
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'swagger', label: 'Swagger', icon: FileCode2 },
  { id: 'forgestudio', label: 'ForgeStudio', icon: Zap },
  { id: 'cloudstorage', label: 'Cloud Storage', icon: Cloud },
  { id: 'jira', label: 'Jira', icon: Layers },
];

const DOMAINS = [
  'E-Commerce', 'Finance', 'Healthcare', 'Logistics', 'Identity & Auth',
  'Order Management', 'Payment', 'Inventory', 'Analytics', 'Notifications', 'Other',
];

const PROVIDER_TABS = [
  { id: 'google', label: 'Google', available: 2, total: 4 },
  { id: 'anthropic', label: 'Anthropic', available: 0, total: 3 },
  { id: 'openai', label: 'OpenAI', available: 0, total: 4 },
  { id: 'meta', label: 'Meta', available: 0, total: 2 },
  { id: 'mistral', label: 'Mistral', available: 0, total: 1 },
  { id: 'xai', label: 'xAI', available: 0, total: 1 },
  { id: 'qwen', label: 'Qwen', available: 0, total: 1 },
];

const GOOGLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', stage: 'Production', status: 'Ready', integrated: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', stage: 'Preview', status: 'Ready', integrated: true },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (Preview)', stage: 'Preview', status: 'API Key', integrated: false },
  { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash (Preview)', stage: 'Preview', status: 'API Key', integrated: false },
];

const RECOMMENDED_MODELS = [
  {
    id: 'gemini-2.5-flash',
    provider: 'Google',
    name: 'gemini-2.5-flash',
    description: 'Fast, cost-effective model ideal for generating complete API specifications. Excellent for structured output and code generation.',
    integrated: true,
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'Google',
    name: 'gemini-2.5-pro',
    description: 'Advanced reasoning model for complex API designs requiring deep domain understanding and nuanced schema generation.',
    integrated: true,
  },
];

const AI_SUGGESTED_PARAMS = { temperature: 0.2, maxTokens: 65536, topP: 0.95, topK: 20 };

const SCHEMA_PROJECTS = [
  {
    id: 'order-mgmt',
    name: 'Order Management Standards',
    schemas: 1,
    description: 'Company-wide standard schema for Order Management APIs. All order-related APIs must conform to these field definitions, naming conventions, and data types.',
    icon: '🧩',
  },
  {
    id: 'payment',
    name: 'Payment Standards',
    schemas: 1,
    description: 'Company standard schema for payment APIs',
    icon: '🧩',
  },
  {
    id: 'banking',
    name: 'Banking APIs',
    schemas: 1,
    description: 'Schema validation project for banking domain',
    icon: '🧩',
  },
];

const MOCK_COMPLIANCE = {
  score: 82,
  matched: 9,
  totalFields: 11,
  missing: 2,
  mismatches: 0,
  schemaName: 'Order Management Standards',
  issues: [
    { type: 'error', message: "Required field 'currency' from organization schema not found in specification" },
    { type: 'warning', message: "Field 'shippingAddress' from organization schema not found in specification" },
    { type: 'error', message: '1 required field(s) from org schema are missing: currency' },
  ],
  fields: [
    { field: 'orderId', schemaType: 'string', specType: 'string', status: 'ok' },
    { field: 'customerId', schemaType: 'string', specType: 'string', status: 'ok' },
    { field: 'orderDate', schemaType: 'string', specType: 'string', status: 'ok' },
    { field: 'status', schemaType: 'string', specType: 'string', status: 'ok' },
    { field: 'totalAmount', schemaType: 'number', specType: 'number', status: 'ok' },
    { field: 'currency', schemaType: 'string', specType: '—', status: 'missing' },
    { field: 'items', schemaType: 'array', specType: 'array', status: 'ok' },
    { field: 'shippingAddress', schemaType: 'object', specType: '—', status: 'missing' },
    { field: 'paymentMethod', schemaType: 'string', specType: 'string', status: 'ok' },
  ],
};

const MOCK_LLM_SCHEMA_FIELDS = [
  { schema: 'StandardResponse', count: 4, fields: [
    { name: 'eventTimestamp', type: 'string/date-time' },
    { name: 'statusCode', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'data', type: 'object' },
  ]},
  { schema: 'ErrorResponse', count: 1, fields: [
    { name: 'error', type: 'object' },
  ]},
  { schema: 'PaginationMetadata', count: 6, fields: [
    { name: 'page', type: 'integer/int32' },
    { name: 'pageSize', type: 'integer/int32' },
    { name: 'totalItems', type: 'integer/int32' },
    { name: 'totalPages', type: 'integer/int32' },
    { name: 'hasNext', type: 'boolean' },
    { name: 'hasPrev', type: 'boolean' },
  ]},
];

const MOCK_API_ENDPOINTS = [
  { method: 'GET', path: '/health', summary: 'Health Check', section: 'MONITORING' },
  { method: 'GET', path: '/products', summary: 'List all products', section: 'PRODUCTS' },
  { method: 'POST', path: '/products', summary: 'Create a product', section: 'PRODUCTS' },
  { method: 'GET', path: '/products/{productId}', summary: 'Get product by ID', section: 'PRODUCTS' },
  { method: 'PUT', path: '/products/{productId}', summary: 'Update product', section: 'PRODUCTS' },
  { method: 'DELETE', path: '/products/{productId}', summary: 'Delete product', section: 'PRODUCTS' },
  { method: 'GET', path: '/inventory', summary: 'List inventory', section: 'INVENTORY' },
  { method: 'PATCH', path: '/inventory/{sku}', summary: 'Adjust stock', section: 'INVENTORY' },
];

const MOCK_SPEC_YAML = `openapi: 3.1.0
info:
  title: E-Commerce Product Catalog & Inventory API
  description: |
    This API provides a comprehensive and robust solution for managing...
    The API exposes a rich set of endpoints to facilitate complete CRUD...
    Further enhancing its utility, the API supports multi-warehouse man...
    **Operational Details:**
    * **Request Tracing:** All requests include \`X-Request-ID\` and \`X-...
    * **Idempotency:** Mutation operations (POST, PUT, PATCH) support...
    * **Service Level Agreements (SLAs):** Typical response times are...
  version: 1.0.0
contact:
  name: API Support`;

const MOCK_COMPANY_YAML = `#  ══════════════════════════════════════════════
# Company Standard Specification
# Source: Order Management Standards
# ══════════════════════════════════════════════

openapi: "3.0.3"
info:
  title: "Company Standard – Order Management Standards"
  description: "Auto-generated from uploaded company schema definitions"
  version: "1.0.0"

components:
  schemas:

    # — Source: order_management_schema.json —
    Order management schema:`;

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtTimestamp = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

const buildLogs = (specName, model) => [
  { t: fmtTimestamp(), level: 'INFO', msg: `Starting pipeline for domain: E-Commerce` },
  { t: fmtTimestamp(), level: 'INFO', msg: `Output format: YAML` },
  { t: fmtTimestamp(), level: 'INFO', msg: `Spec style: REST` },
  { t: fmtTimestamp(), level: 'INFO', msg: `Using AI-expanded full description (1823 chars)` },
  { t: fmtTimestamp(), level: 'INFO', msg: `LLM Model: ${model} | Temp: 0.2 | Max Tokens: 65536` },
  { t: fmtTimestamp(), level: 'STEP', msg: `Sending request to backend...` },
  { t: fmtTimestamp(), level: 'INFO', msg: `Job created: 1ba5de61... — polling for updates` },
  { t: fmtTimestamp(), level: 'STEP', msg: `▶ searching: Searching spec library (3-tier: cache → semantic → generate)...` },
];

const buildCompletionLogs = () => [
  { t: fmtTimestamp(), level: 'WARN', msg: '[MEDIUM] Idempotency key for mutations: 8 mutation(s) missing Idempotency-Key: POST /products, PUT /products/{productId}' },
  { t: fmtTimestamp(), level: 'WARN', msg: '[MEDIUM] Timeout configuration documented: No timeout configuration or SLA documentation found' },
  { t: fmtTimestamp(), level: 'STEP', msg: '▶ validating: Auto-fixing 7 issues (round 1/1)...' },
  { t: fmtTimestamp(), level: 'OK', msg: '✓ validating: Rule validation complete (4052ms) — 84.6% compliant, 4 issues' },
  { t: fmtTimestamp(), level: 'STEP', msg: '▶ onboarding: Uploading to GCS, indexing, and auto-pushing to GitHub...' },
  { t: fmtTimestamp(), level: 'OK', msg: '✓ onboarding: Onboarded in 70777ms (GCS + VectorStore) — GitHub: GitHub owner/repo not configured' },
  { t: fmtTimestamp(), level: 'OK', msg: '✓ completed: Pipeline complete' },
  { t: fmtTimestamp(), level: 'OK', msg: '🏁 Pipeline completed successfully' },
];

const suggestNames = (brief) => {
  const words = brief.trim().split(/\s+/).filter(Boolean);
  const core = words.slice(0, 4).join(' ');
  return [
    `${core} Management API`,
    `${core} Service API`,
    `${core} Platform API`,
  ].map(s => s.slice(0, 50));
};

// ─── sub-components ───────────────────────────────────────────────────────────

function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 py-4 px-6">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center min-w-[120px]">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done && 'bg-primary border-primary text-white',
                active && 'bg-primary border-primary text-white',
                !done && !active && 'bg-transparent border-gray-600 text-gray-500',
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : num}
              </div>
              <span className={cn(
                'mt-1.5 text-[11px] font-medium whitespace-nowrap',
                active ? 'text-primary' : done ? 'text-primary/70' : 'text-gray-500',
              )}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-1 mt-[-18px]',
                done ? 'bg-primary/60' : 'bg-gray-700',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LogLine({ entry }) {
  const levelColor = {
    INFO: 'text-blue-400',
    STEP: 'text-yellow-400',
    OK: 'text-green-400',
    WARN: 'text-orange-400',
    ERROR: 'text-red-400',
  }[entry.level] || 'text-gray-400';
  return (
    <div className="flex gap-2 text-[11px] font-mono leading-5">
      <span className="text-gray-500 flex-shrink-0">{entry.t}</span>
      <span className={cn('font-semibold flex-shrink-0 w-8', levelColor)}>{entry.level}</span>
      <span className="text-gray-300 break-all">{entry.msg}</span>
    </div>
  );
}

function MethodBadge({ method }) {
  const colors = {
    GET: 'bg-green-500/20 text-green-400 border-green-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded border', colors[method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30')}>
      {method}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CreateSpecWizard({
  isOpen,
  onClose,
  organizationId,
  microserviceId,
  showMessage,
  onSpecCreated,
  generateAiSpec,
  initialFunctionalReqs = '',
  initialNonFunctionalReqs = '',
}) {
  // Step navigation
  const [step, setStep] = useState(1);

  // Step 1 state
  const [activeConnector, setActiveConnector] = useState('forgestudio');
  const [connectorFields, setConnectorFields] = useState({});
  const [connectorConnected, setConnectorConnected] = useState({});
  const [specName, setSpecName] = useState('');
  const [briefDesc, setBriefDesc] = useState(initialFunctionalReqs.slice(0, 200) || '');
  const [fullDesc, setFullDesc] = useState('');
  const [isGeneratingFullDesc, setIsGeneratingFullDesc] = useState(false);
  const [domain, setDomain] = useState('');
  const [format, setFormat] = useState('YAML');
  const [version, setVersion] = useState('1.0.0');
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [connectorError, setConnectorError] = useState('');

  // Step 2 state
  const [selectedModelId, setSelectedModelId] = useState('');
  const [activeProvider, setActiveProvider] = useState('google');
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(32768);
  const [topP, setTopP] = useState(1);
  const [topK, setTopK] = useState(40);
  const [modelVersion, setModelVersion] = useState('');
  const [modelError, setModelError] = useState('');

  // Step 3 state
  const [genStatus, setGenStatus] = useState('idle'); // idle | generating | complete | error
  const [liveLogs, setLiveLogs] = useState([]);
  const [genProgress, setGenProgress] = useState(0);
  const [completionLogs, setCompletionLogs] = useState([]);
  const [generatedSpec, setGeneratedSpec] = useState(null);
  const logRef = useRef(null);

  // Step 4 state
  const [s4View, setS4View] = useState('choose'); // choose | schemaSelect | comparing | compliance | tabs
  const [selectedSchemaId, setSelectedSchemaId] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [complianceData, setComplianceData] = useState(null);
  const [activeTab, setActiveTab] = useState('api-docs');
  const [diffMode, setDiffMode] = useState('side-by-side');
  const [showPipelineTrace, setShowPipelineTrace] = useState(false);

  // Auto scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [liveLogs, completionLogs]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setGenStatus('idle');
      setLiveLogs([]);
      setCompletionLogs([]);
      setGeneratedSpec(null);
      setS4View('choose');
      setComplianceData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Step 1 handlers ──────────────────────────────────────────────────────────

  const handleConnectorField = (field, value) => {
    setConnectorFields(prev => ({ ...prev, [`${activeConnector}.${field}`]: value }));
  };

  const getConnectorField = (field) => connectorFields[`${activeConnector}.${field}`] || '';

  const handleConnectConnector = () => {
    const key = activeConnector === 'forgestudio' ? 'apiUrl' : activeConnector === 'github' ? 'token' : 'apiKey';
    if (!getConnectorField(key)) {
      setConnectorError('Please fill in the required fields before connecting.');
      return;
    }
    setConnectorConnected(prev => ({ ...prev, [activeConnector]: true }));
    setConnectorError('');
  };

  const handleGenerateFullDesc = () => {
    if (!briefDesc.trim()) return;
    setIsGeneratingFullDesc(true);
    setTimeout(() => {
      setFullDesc(
        `A RESTful API for ${briefDesc.trim()}. ` +
        'This API provides comprehensive CRUD operations, follows OpenAPI 3.x specifications, ' +
        'and supports authentication via OAuth 2.0. It is designed for high-availability deployments ' +
        'with built-in rate limiting, observability hooks, and structured error responses.'
      );
      setIsGeneratingFullDesc(false);
    }, 1200);
  };

  const handleAiSuggestNames = () => {
    if (!briefDesc.trim()) return;
    setNameSuggestions(suggestNames(briefDesc));
    setShowNameSuggestions(true);
  };

  const canGoToStep2 = specName.trim().length >= 10 && briefDesc.trim().length > 0 && domain;

  // ── Step 2 handlers ──────────────────────────────────────────────────────────

  const handleApplyAllParams = () => {
    setTemperature(AI_SUGGESTED_PARAMS.temperature);
    setMaxTokens(AI_SUGGESTED_PARAMS.maxTokens);
    setTopP(AI_SUGGESTED_PARAMS.topP);
    setTopK(AI_SUGGESTED_PARAMS.topK);
  };

  const selectedModel = GOOGLE_MODELS.find(m => m.id === selectedModelId) || null;
  const selectedRecommended = RECOMMENDED_MODELS.find(m => m.id === selectedModelId) || null;

  const canGoToStep3 = !!selectedModelId;

  // ── Step 3 handlers ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenStatus('generating');
    setLiveLogs([]);
    setGenProgress(0);

    const logs = buildLogs(specName, `Google / ${selectedModelId}`);
    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setLiveLogs(prev => [...prev, logs[i]]);
      setGenProgress(Math.round((i / logs.length) * 60));
    }

    try {
      let spec = null;
      if (generateAiSpec && microserviceId && organizationId) {
        const result = await generateAiSpec({
          microserviceId,
          organizationId,
          functionalRequirements: briefDesc + (initialNonFunctionalReqs ? `\n${initialNonFunctionalReqs}` : ''),
          save: true,
        });
        if (result.success) {
          spec = result.data;
        }
      }
      setGeneratedSpec(spec);
    } catch (_) {
      // non-fatal, proceed with mock
    }

    setGenProgress(100);
    const cLogs = buildCompletionLogs();
    for (const log of cLogs) {
      await new Promise(r => setTimeout(r, 300));
      setCompletionLogs(prev => [...prev, log]);
    }

    setGenStatus('complete');
  };

  // ── Step 4 handlers ──────────────────────────────────────────────────────────

  const handleCompareWithSchema = async () => {
    if (!selectedSchemaId) return;
    setIsComparing(true);
    setS4View('comparing');
    await new Promise(r => setTimeout(r, 2000));
    setComplianceData(MOCK_COMPLIANCE);
    setIsComparing(false);
    setS4View('compliance');
  };

  const handleAcceptSpec = () => {
    if (onSpecCreated) onSpecCreated(generatedSpec);
    if (showMessage) showMessage('Spec accepted and saved for API Design.', 'success');
    onClose();
  };

  const handleAutoAlignDone = () => {
    if (onSpecCreated) onSpecCreated(generatedSpec);
    if (showMessage) showMessage('Spec auto-aligned and saved.', 'success');
    onClose();
  };

  // ── navigation ───────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === 1 && !canGoToStep2) {
      setConnectorError('Please fill in Specification Name, Brief Description, and select a Domain.');
      return;
    }
    if (step === 2) {
      if (!canGoToStep3) { setModelError('Please select a model to continue.'); return; }
      setModelError('');
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  // ── connector form content ───────────────────────────────────────────────────

  const renderConnectorForm = () => {
    const isConnected = connectorConnected[activeConnector];
    if (activeConnector === 'forgestudio') return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">Connect to your ForgeStudio instance to browse and import production specifications.</p>
        <input
          placeholder="ForgeStudio API URL (e.g. https://forgestudio.probestack.io/api/v1)"
          value={getConnectorField('apiUrl')}
          onChange={e => handleConnectorField('apiUrl', e.target.value)}
          className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="API Key / Token"
            value={getConnectorField('apiKey')}
            onChange={e => handleConnectorField('apiKey', e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
          <input
            placeholder="Organization ID (optional)"
            value={getConnectorField('orgId')}
            onChange={e => handleConnectorField('orgId', e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={handleConnectConnector}
          className={cn(
            'w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all',
            isConnected
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30'
          )}
        >
          <Link2 className="w-3.5 h-3.5" />
          {isConnected ? 'Connected ✓' : 'Connect ForgeStudio'}
        </button>
        {!isConnected && (
          <p className="text-[11px] text-orange-400">Please connect to at least one source to continue</p>
        )}
      </div>
    );

    if (activeConnector === 'github') return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">Connect your GitHub account to import API specs from repositories.</p>
        <input
          placeholder="GitHub Personal Access Token"
          type="password"
          value={getConnectorField('token')}
          onChange={e => handleConnectorField('token', e.target.value)}
          className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
        />
        <input
          placeholder="Repository (e.g. org/repo)"
          value={getConnectorField('repo')}
          onChange={e => handleConnectorField('repo', e.target.value)}
          className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
        />
        <button onClick={handleConnectConnector} className={cn('w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all', isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30')}>
          <Github className="w-3.5 h-3.5" />
          {isConnected ? 'Connected ✓' : 'Connect GitHub'}
        </button>
      </div>
    );

    if (activeConnector === 'swagger') return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">Connect to SwaggerHub to import existing API specs.</p>
        <input placeholder="SwaggerHub API Key" value={getConnectorField('apiKey')} onChange={e => handleConnectorField('apiKey', e.target.value)} className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
        <input placeholder="Organization / Owner" value={getConnectorField('org')} onChange={e => handleConnectorField('org', e.target.value)} className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
        <button onClick={handleConnectConnector} className={cn('w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold', isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30')}>
          <FileCode2 className="w-3.5 h-3.5" />
          {isConnected ? 'Connected ✓' : 'Connect Swagger'}
        </button>
      </div>
    );

    if (activeConnector === 'cloudstorage') return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">Connect to cloud storage (GCS, S3, Azure Blob) to import spec files.</p>
        <input placeholder="Bucket / Container URL" value={getConnectorField('bucket')} onChange={e => handleConnectorField('bucket', e.target.value)} className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
        <input placeholder="Access Key / Service Account" value={getConnectorField('accessKey')} onChange={e => handleConnectorField('accessKey', e.target.value)} className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
        <button onClick={handleConnectConnector} className={cn('w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold', isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30')}>
          <Cloud className="w-3.5 h-3.5" />
          {isConnected ? 'Connected ✓' : 'Connect Storage'}
        </button>
      </div>
    );

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">Connect to Jira to pull requirements and user stories directly.</p>
        <input placeholder="Jira Base URL" value={getConnectorField('url')} onChange={e => handleConnectorField('url', e.target.value)} className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
        <input placeholder="API Token" value={getConnectorField('token')} onChange={e => handleConnectorField('token', e.target.value)} className="w-full h-9 px-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
        <button onClick={handleConnectConnector} className={cn('w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold', isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30')}>
          <Layers className="w-3.5 h-3.5" />
          {isConnected ? 'Connected ✓' : 'Connect Jira'}
        </button>
      </div>
    );
  };

  // ── step renderers ───────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {/* Connectors */}
      <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white">Connectors</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Connect to your sources to search and export API designs seamlessly</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {CONNECTOR_TABS.map(tab => {
            const Icon = tab.icon;
            const connected = connectorConnected[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveConnector(tab.id); setConnectorError(''); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  activeConnector === tab.id
                    ? 'bg-primary text-white border-primary'
                    : 'border-dark-700 text-gray-300 hover:border-primary/40 hover:text-white',
                  connected && activeConnector !== tab.id && 'border-green-500/30 text-green-400',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {connected && <Check className="w-3 h-3 text-green-400" />}
              </button>
            );
          })}
        </div>
        {renderConnectorForm()}
        {connectorError && step === 1 && (
          <p className="mt-2 text-[11px] text-orange-400">{connectorError}</p>
        )}
      </div>

      {/* Spec Name */}
      <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-white">
              Specification Name <span className="text-red-400">*</span>
            </label>
            <span className="text-[11px] text-gray-500">{specName.length}/40-50 chars</span>
          </div>
          <div className="relative">
            <input
              value={specName}
              onChange={e => { setSpecName(e.target.value.slice(0, 50)); setShowNameSuggestions(false); }}
              placeholder="Enter a descriptive specification name"
              className="w-full h-10 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Use 40-50 characters for a descriptive, meaningful specification name</p>
          <button
            onClick={handleAiSuggestNames}
            disabled={!briefDesc.trim()}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Suggest Names
          </button>
          {showNameSuggestions && nameSuggestions.length > 0 && (
            <div className="mt-2 rounded-lg border border-dark-700 bg-[#0f172a]/70 p-2 space-y-1">
              {nameSuggestions.map(s => (
                <button key={s} onClick={() => { setSpecName(s); setShowNameSuggestions(false); }} className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-300 hover:bg-primary/10 hover:text-white transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Brief Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-white">
              Brief Description <span className="text-red-400">*</span>
            </label>
            <span className="text-[11px] text-gray-500">{briefDesc.trim().split(/\s+/).filter(Boolean).length}/50 words</span>
          </div>
          <textarea
            value={briefDesc}
            onChange={e => setBriefDesc(e.target.value)}
            placeholder="Describe the API you need..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary/50"
          />
          <p className="mt-1 text-[11px] text-gray-500">Write a short summary — AI will expand it into a detailed description</p>
        </div>

        {/* Full Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-white">Full Description</label>
            <button
              onClick={handleGenerateFullDesc}
              disabled={!briefDesc.trim() || isGeneratingFullDesc}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 font-semibold"
            >
              {isGeneratingFullDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Generate
            </button>
          </div>
          <textarea
            value={fullDesc}
            onChange={e => setFullDesc(e.target.value)}
            placeholder="AI will generate a detailed description from your brief summary above, or type your own..."
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary/50"
          />
          <p className="mt-1 text-[11px] text-gray-500">Auto-generated from brief description — you can edit it anytime</p>
        </div>

        {/* Configuration */}
        <div>
          <label className="text-sm font-semibold text-white block mb-3">Configuration</label>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <select
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                style={{ backgroundColor: '#0f172a99' }}
              >
                <option value="">Select a domain... *</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                style={{ backgroundColor: '#0f172a99' }}
              >
                <option value="YAML">YAML</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <label className="text-sm text-gray-300 min-w-[56px]">Version</label>
            <input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="w-32 h-9 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
            />
            <span className="text-[11px] text-gray-500">Semantic version (e.g. 1.0.0) — maps to OpenAPI info.version</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {/* Recommended Models */}
      <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
        <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Recommended Models
        </p>
        <div className="space-y-3">
          {RECOMMENDED_MODELS.map(model => (
            <label
              key={model.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                selectedModelId === model.id
                  ? 'border-primary bg-primary/10'
                  : 'border-dark-700 bg-[#0f172a]/30 hover:border-primary/30',
              )}
            >
              <input
                type="radio"
                name="recommended-model"
                value={model.id}
                checked={selectedModelId === model.id}
                onChange={() => { setSelectedModelId(model.id); setModelError(''); }}
                className="mt-0.5 accent-orange-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{model.provider} / {model.name}</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-green-500/20 text-green-400 border border-green-500/30">Integrated ✓</span>
                </div>
                <p className="mt-1 text-xs text-gray-400 leading-4">{model.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Available Models */}
      <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-white">Available Models</p>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-dark-700 rounded-lg px-2.5 py-1 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Re-check
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">Only Google models are integrated via Vertex AI</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {PROVIDER_TABS.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                activeProvider === p.id
                  ? 'bg-primary text-white border-primary'
                  : 'border-dark-700 text-gray-400 hover:border-primary/40 hover:text-white',
              )}
            >
              {p.label} {p.available}/{p.total}
            </button>
          ))}
        </div>
        {activeProvider === 'google' ? (
          <div className="grid grid-cols-2 gap-3">
            {GOOGLE_MODELS.map(model => (
              <label
                key={model.id}
                className={cn(
                  'p-4 rounded-xl border cursor-pointer transition-all',
                  !model.integrated && 'opacity-60',
                  selectedModelId === model.id ? 'border-primary bg-primary/10' : 'border-dark-700 bg-[#0f172a]/30 hover:border-primary/30',
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold text-white">{model.name}</span>
                  <input
                    type="radio"
                    name="available-model"
                    value={model.id}
                    checked={selectedModelId === model.id}
                    disabled={!model.integrated}
                    onChange={() => { if (model.integrated) { setSelectedModelId(model.id); setModelError(''); } }}
                    className="accent-orange-500 mt-0.5"
                  />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className={cn('px-1.5 py-0.5 text-[10px] rounded border', model.stage === 'Production' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>
                    {model.stage}
                  </span>
                  <span className={cn('px-1.5 py-0.5 text-[10px] rounded border flex items-center gap-1', model.status === 'Ready' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30')}>
                    {model.status === 'Ready' ? <Check className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                    {model.status}
                  </span>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl border border-dark-700 bg-[#0f172a]/30">
            <p className="text-xs text-gray-400">No {PROVIDER_TABS.find(p => p.id === activeProvider)?.label} models are currently integrated.</p>
            <p className="text-[11px] text-gray-500 mt-1">Only Google models are available via Vertex AI.</p>
          </div>
        )}
        {modelError && <p className="mt-2 text-xs text-orange-400">{modelError}</p>}
      </div>

      {/* Model Parameters */}
      <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <p className="text-sm font-semibold text-white">Model Parameters</p>
        </div>
        {!selectedModelId ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/30 mb-4">
            <Server className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-400">No model selected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/10 mb-4">
            <Server className="w-4 h-4 text-primary" />
            <span className="text-xs text-white font-medium">Google / {selectedModelId}</span>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-orange-400 font-medium">Temperature</label>
              <span className="text-xs text-white font-semibold">{temperature}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-orange-400 font-medium block mb-1">Max Tokens</label>
              <input
                type="number" value={maxTokens} min={1024} max={131072} step={1024}
                onChange={e => setMaxTokens(Number(e.target.value))}
                className="w-full h-9 px-2 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-300 font-medium">Top P</label>
                <span className="text-xs text-white">{topP}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05} value={topP}
                onChange={e => setTopP(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-300 font-medium">Top K</label>
                <span className="text-xs text-white">{topK}</span>
              </div>
              <input
                type="range" min={1} max={100} step={1} value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Model Version <span className="text-gray-500">(optional)</span></label>
            <input
              type="text" value={modelVersion} onChange={e => setModelVersion(e.target.value)}
              placeholder="e.g., 2025-01"
              className="w-full h-9 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* AI Suggested Parameters */}
      <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            AI Suggested Parameters
          </p>
          <button
            onClick={handleApplyAllParams}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Apply All
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">Based on your agent name and description</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'TEMPERATURE', value: AI_SUGGESTED_PARAMS.temperature, sub: 'Precise & factual' },
            { label: 'MAX TOKENS', value: AI_SUGGESTED_PARAMS.maxTokens.toLocaleString(), sub: 'Full specification' },
            { label: 'TOP P', value: AI_SUGGESTED_PARAMS.topP, sub: 'Full diversity' },
            { label: 'TOP K', value: AI_SUGGESTED_PARAMS.topK, sub: 'Balanced range' },
          ].map(item => (
            <div key={item.label} className="rounded-lg border border-dark-700 bg-[#0f172a]/40 p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</p>
              <p className="text-lg font-bold text-primary mt-1">{item.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-400">A low temperature promotes deterministic output, while a moderate topK balances focus with the ability to handle diverse inquiries within a reasonable token limit.</p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (genStatus === 'idle') return (
      <div className="space-y-5">
        {/* Summary */}
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-white">Generate Specification</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">Review your setup and generate the API specification</p>
          <div className="rounded-lg border border-dark-700 overflow-hidden">
            {[
              ['STYLE', 'REST'],
              ['NAME', specName || '—'],
              ['DOMAIN', domain || '—'],
              ['FORMAT', format],
              ['VERSION', version],
              ['LLM MODEL', `Google / ${selectedModelId || '—'}`],
              ['TEMPERATURE', temperature],
              ['MAX TOKENS', maxTokens.toLocaleString()],
              ['DESCRIPTION', (briefDesc || '—').slice(0, 120) + ((briefDesc?.length > 120) ? '...' : '')],
            ].map(([k, v], i) => (
              <div key={k} className={cn('grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5', i % 2 === 0 ? 'bg-[#0f172a]/60' : 'bg-[#0f172a]/30')}>
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{k}</span>
                <span className="text-sm text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleGenerate}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <Zap className="w-4 h-4" />
          Generate Specification
        </button>
      </div>
    );

    if (genStatus === 'generating') return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Generating Specification...</p>
              <p className="text-xs text-gray-400">Pipeline is running — please wait</p>
            </div>
            <span className="ml-auto text-xs text-gray-500">{genProgress}% complete</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-dark-700 overflow-hidden mb-4">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${genProgress}%` }} />
          </div>

          {liveLogs.length > 0 && liveLogs[liveLogs.length - 1] && (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dark-700 bg-[#0f172a]/40 mb-3">
              <div className="w-5 h-5 rounded-full border border-primary/40 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-xs font-medium text-white">{liveLogs[liveLogs.length - 1]?.msg?.replace(/▶\s*\w+:\s*/, '') || 'Searching...'}</p>
                <p className="text-[11px] text-gray-500">Analyzing intent, entities, API boundaries...</p>
              </div>
            </div>
          )}
        </div>

        {/* Live Logs */}
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Live Logs
            </span>
            <span className="text-xs text-gray-500">{liveLogs.length}</span>
          </div>
          <div ref={logRef} className="space-y-0.5 max-h-48 overflow-y-auto">
            {liveLogs.map((l, i) => <LogLine key={i} entry={l} />)}
          </div>
        </div>

        <div className="flex gap-2">
          <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-dark-700 text-gray-400 opacity-50">
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>
          <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 opacity-50">
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        </div>
      </div>
    );

    // complete
    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="grid grid-cols-4 gap-0 divide-x divide-dark-700 mb-4">
            {[
              { value: 'AI', label: 'SOURCE' },
              { value: format, label: 'FORMAT' },
              { value: '4', label: 'ISSUES' },
              { value: '8', label: 'STANDARDS' },
            ].map(item => (
              <div key={item.label} className="text-center px-4 first:pl-0 last:pr-0">
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowPipelineTrace(v => !v)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showPipelineTrace && 'rotate-90')} />
            {showPipelineTrace ? 'Hide' : 'Show'} Pipeline Trace (8 steps)
          </button>
        </div>

        {/* Completion Logs */}
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Execution Logs
            </span>
            <span className="text-xs text-gray-500">{completionLogs.length}</span>
          </div>
          <div ref={logRef} className="space-y-0.5 max-h-48 overflow-y-auto">
            {completionLogs.map((l, i) => <LogLine key={i} entry={l} />)}
          </div>
        </div>

        <button
          onClick={() => setStep(4)}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <ChevronRight className="w-4 h-4" />
          Proceed to Schema Mapping
        </button>
      </div>
    );
  };

  const renderStep4 = () => {
    if (s4View === 'choose') return (
      <div className="space-y-4">
        {/* Auto-Align */}
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Auto-Align with AI</p>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary text-white">RECOMMENDED</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-11">
            AI rewrites your spec to add missing fields, fix type mismatches, and match your company naming conventions. Takes ~5-10 seconds. Does NOT regenerate from scratch.
          </p>
          <button
            onClick={() => setS4View('schemaSelect')}
            className="ml-11 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
          >
            <Bot className="w-3.5 h-3.5" />
            Auto-Align Now
          </button>
        </div>

        {/* Regenerate */}
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#0f172a]/60 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-sm font-semibold text-white">Regenerate from Scratch</p>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-11">
            Re-runs the full pipeline with your schema definitions injected into the LLM prompt. Use when the spec is too far off to fix incrementally. Takes ~30-60 seconds.
          </p>
          <button
            onClick={() => { setStep(3); setGenStatus('idle'); setS4View('choose'); }}
            className="ml-11 flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-700 text-gray-300 text-xs font-semibold hover:bg-[#0f172a]/60 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-green-400" />
            Regenerate
          </button>
        </div>

        {/* Accept Current */}
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#0f172a]/60 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-white">Accept Current Spec</p>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-11">
            Proceed with the current spec as-is. You can still review and edit it in the Spec Editor afterwards.
          </p>
          <button
            onClick={handleAcceptSpec}
            className="ml-11 flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-700 text-gray-300 text-xs font-semibold hover:bg-[#0f172a]/60 transition-all"
          >
            Accept & Continue →
          </button>
        </div>
      </div>
    );

    if (s4View === 'schemaSelect') return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="flex items-center gap-3 mb-1">
            <Layers className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-white">Compare with Company Schema</p>
          </div>
          <p className="text-xs text-gray-400 mb-5">Select a schema project to validate the generated spec against your org standards</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {SCHEMA_PROJECTS.map(proj => (
              <button
                key={proj.id}
                onClick={() => setSelectedSchemaId(proj.id)}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all',
                  selectedSchemaId === proj.id
                    ? 'border-primary bg-primary/10'
                    : 'border-dark-700 bg-[#0f172a]/30 hover:border-primary/30',
                )}
              >
                <div className="text-xl mb-2">{proj.icon}</div>
                <p className="text-xs font-semibold text-white leading-4">{proj.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{proj.schemas} schema</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-3">{proj.description}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCompareWithSchema}
              disabled={!selectedSchemaId || isComparing}
              className={cn(
                'flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all',
                selectedSchemaId && !isComparing
                  ? 'bg-primary/80 hover:bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed',
              )}
            >
              {isComparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              {isComparing ? 'Comparing...' : 'Compare with Schema'}
            </button>
            <button
              onClick={() => { setActiveTab('api-docs'); setS4View('tabs'); }}
              className="px-4 h-11 rounded-xl border border-dark-700 text-xs font-medium text-gray-300 hover:text-white hover:border-primary/40 transition-all"
            >
              Skip — View Spec As-Is
            </button>
          </div>
        </div>
      </div>
    );

    if (s4View === 'comparing') return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-white">Comparing specifications...</p>
          <p className="text-xs text-gray-400 mt-1">Analyzing field mappings and compliance</p>
        </div>
      </div>
    );

    if (s4View === 'compliance') return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Compliance Report</p>
              <p className="text-xs text-gray-400">Compared against {SCHEMA_PROJECTS.find(p => p.id === selectedSchemaId)?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-5">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#22c55e" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 34 * (complianceData?.score / 100)} ${2 * Math.PI * 34}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{complianceData?.score}%</span>
                <span className="text-[9px] text-gray-400 uppercase">COMPLIANCE</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 flex-1">
              {[
                { v: complianceData?.matched, l: 'MATCHED' },
                { v: complianceData?.totalFields, l: 'TOTAL FIELDS' },
                { v: complianceData?.missing, l: 'MISSING' },
                { v: complianceData?.mismatches, l: 'MISMATCHES' },
              ].map(item => (
                <div key={item.l} className="text-center">
                  <p className="text-2xl font-bold text-white">{item.v}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{item.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-white">Issues ({complianceData?.issues?.length})</p>
            {complianceData?.issues?.map((issue, i) => (
              <div key={i} className={cn('flex items-start gap-2 p-2.5 rounded-lg border text-xs', issue.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300')}>
                {issue.type === 'error' ? <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                {issue.message}
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-white mb-2">Field Diff</p>
            <div className="rounded-lg overflow-hidden border border-dark-700">
              <div className="grid grid-cols-4 px-3 py-2 bg-[#0f172a]/60 text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                <span>FIELD</span><span>SCHEMA TYPE</span><span>SPEC TYPE</span><span>STATUS</span>
              </div>
              {complianceData?.fields?.map(f => (
                <div key={f.field} className="grid grid-cols-4 px-3 py-2 border-t border-dark-700 bg-[#0f172a]/30 text-xs">
                  <span className="text-white font-mono">{f.field}</span>
                  <span className="text-gray-400">{f.schemaType}</span>
                  <span className="text-gray-400">{f.specType}</span>
                  <span className={cn('font-medium', f.status === 'ok' ? 'text-green-400' : 'text-red-400')}>
                    {f.status === 'ok' ? '✓ OK' : '✗ Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setActiveTab('field-mapper'); setS4View('tabs'); }}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            <GitMerge className="w-4 h-4" />
            View Full Mapping
          </button>
          <button
            onClick={handleAutoAlignDone}
            className="px-4 h-11 rounded-xl border border-dark-700 text-xs font-medium text-gray-300 hover:border-primary/40 hover:text-white transition-all"
          >
            Auto-Align & Finish
          </button>
        </div>
      </div>
    );

    // tabs view
    return (
      <div className="space-y-3">
        {/* Tab Bar */}
        <div className="flex border-b border-dark-700">
          {[
            { id: 'api-docs', label: 'API Documentation', icon: FileText },
            { id: 'field-mapper', label: 'Field Mapper', icon: GitMerge },
            { id: 'spec-diff', label: 'Spec Diff', icon: Copy },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'api-docs' && (
          <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-5 max-h-[calc(100vh-320px)] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">{specName || 'API Specification'}</h3>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">v{version}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">OPENAPI</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 max-w-lg">{fullDesc || briefDesc}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <span className="px-2 py-1 text-[11px] rounded bg-[#0f172a]/60 border border-dark-700 text-gray-300 font-mono">https://api.example.com/api/v1</span>
              <span className="px-2 py-1 text-[11px] rounded bg-[#0f172a]/60 border border-dark-700 text-gray-300 font-mono">https://dev.api.example.com/api/v1</span>
            </div>
            <div className="flex gap-3 text-xs text-primary mb-5">
              <span>{MOCK_API_ENDPOINTS.length} endpoints</span>
              <span className="text-gray-500">·</span>
              <span>35 schemas</span>
              <span className="text-gray-500">·</span>
              <span>{MOCK_API_ENDPOINTS.filter(e => e.method === 'GET').length} GET</span>
              <span className="text-gray-500">·</span>
              <span>{MOCK_API_ENDPOINTS.filter(e => e.method === 'POST').length} POST</span>
            </div>
            {Array.from(new Set(MOCK_API_ENDPOINTS.map(e => e.section))).map(section => (
              <div key={section} className="mb-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{section}</p>
                <div className="space-y-1">
                  {MOCK_API_ENDPOINTS.filter(e => e.section === section).map(endpoint => (
                    <div key={`${endpoint.method}${endpoint.path}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-dark-700 bg-[#0f172a]/30 hover:bg-[#0f172a]/50 transition-colors">
                      <MethodBadge method={endpoint.method} />
                      <code className="text-xs font-mono text-white flex-1">{endpoint.path}</code>
                      <span className="text-xs text-gray-400">{endpoint.summary}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'field-mapper' && (
          <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-dark-700 text-xs flex-wrap">
              <span className="flex items-center gap-1 text-green-400"><Check className="w-3 h-3" />{complianceData?.matched ?? 9} matched</span>
              <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle className="w-3 h-3" />0 mismatches</span>
              <span className="flex items-center gap-1 text-red-400"><X className="w-3 h-3" />{complianceData?.missing ?? 2} missing</span>
              <span className="ml-auto px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 text-[11px] font-semibold">{complianceData?.score ?? 82}% compliance</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90">
                <Bot className="w-3 h-3" />
                Auto-Align
              </button>
            </div>
            <div className="grid grid-cols-[1fr_24px_1fr] max-h-[calc(100vh-360px)] overflow-y-auto">
              {/* Left column */}
              <div className="border-r border-dark-700 p-4">
                <p className="text-xs font-semibold text-blue-400 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  LLM Generated <span className="text-gray-500 font-normal ml-1">137 fields</span>
                </p>
                {MOCK_LLM_SCHEMA_FIELDS.map(group => (
                  <div key={group.schema} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <button className="flex items-center gap-1 text-[11px] font-semibold text-white">
                        <ChevronRight className="w-3 h-3" />{group.schema}
                      </button>
                      <span className="text-[10px] text-gray-500">{group.count} fields</span>
                    </div>
                    {group.fields.map(f => (
                      <div key={f.name} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#0f172a]/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          </div>
                          <span className="text-xs text-white font-mono">{f.name}</span>
                          <span className="text-[10px] text-gray-500">{f.type}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">Unmapped</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Center drag hint */}
              <div className="flex items-center justify-center">
                <div className="writing-vertical text-[9px] uppercase tracking-widest text-gray-600" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                  DRAG TO MAP
                </div>
              </div>

              {/* Right column */}
              <div className="p-4">
                <p className="text-xs font-semibold text-yellow-400 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Company Standard <span className="text-gray-500 font-normal ml-1">11 fields</span>
                </p>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-white">order_management_schema.json</span>
                    <span className="text-[10px] text-gray-500">11 fields</span>
                  </div>
                  {complianceData?.fields?.map(f => (
                    <div key={f.field} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#0f172a]/50 transition-colors">
                      <div className="flex items-center gap-1.5">
                        {f.status === 'ok'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        <span className="text-xs text-white font-mono">{f.field}</span>
                        <span className="text-[10px] text-gray-500">{f.schemaType}</span>
                        {f.status === 'ok' && <span className="text-[10px] text-green-400">100%</span>}
                      </div>
                      <span className={cn('text-[10px] font-medium', f.status === 'ok' ? 'text-green-400' : 'text-red-400')}>
                        {f.status === 'ok' ? 'Mapped ✓' : 'Missing ✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spec-diff' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Specification Comparison</p>
                <span className="px-2 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400 border border-green-500/30">{complianceData?.score ?? 82}% match</span>
                <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">YAML</span>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-dark-700 rounded-lg px-2.5 py-1 transition-colors">
                <Copy className="w-3 h-3" />
                Side-by-Side
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                <Check className="w-3 h-3" />{complianceData?.matched ?? 9} matched
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertCircle className="w-3 h-3" />{complianceData?.missing ?? 2} missing
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setS4View('compliance')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-700 text-xs text-gray-300 hover:text-white hover:border-primary/40 transition-all"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Report
                </button>
                <button
                  onClick={handleAutoAlignDone}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all"
                >
                  <Bot className="w-3 h-3" /> Auto-Align to Company Standard
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[calc(100vh-380px)] overflow-y-auto">
              <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700 bg-[#0f172a]/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-[11px] font-semibold text-gray-300">LLM Generated Specification</span>
                    <span className="text-[10px] text-gray-500 border border-dark-700 rounded px-1.5 py-0.5">{specName?.slice(0, 18) || 'Spec'}...</span>
                  </div>
                  <button className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                </div>
                <pre className="p-3 text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-5 max-h-64 overflow-y-auto">
                  {MOCK_SPEC_YAML}
                </pre>
              </div>
              <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700 bg-[#0f172a]/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[11px] font-semibold text-gray-300">Company Standard Specification</span>
                    <span className="text-[10px] text-gray-500 border border-dark-700 rounded px-1.5 py-0.5">Order Management...</span>
                  </div>
                  <button className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                </div>
                <pre className="p-3 text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-5 max-h-64 overflow-y-auto">
                  {MOCK_COMPANY_YAML}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* footer action */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleAutoAlignDone}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finish & Save Spec
          </button>
        </div>
      </div>
    );
  };

  // ── layout ───────────────────────────────────────────────────────────────────

  const showNextBtn = step < 3 || (step === 3 && genStatus === 'idle');
  const showBackBtn = step > 1 && !(step === 3 && genStatus === 'generating');

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgb(10 13 28)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-dark-700 flex-shrink-0" style={{ backgroundColor: 'rgb(15 19 38)' }}>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Create Spec Wizard</span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/20 text-primary border border-primary/30">BUILDER</span>
          <span className="text-gray-600">·</span>
          <span className="text-sm text-gray-400">{specName || 'Untitled'}</span>
          <span className="text-gray-600">·</span>
          <span className="text-sm text-gray-400">Step {step} of {TOTAL_STEPS}</span>
        </div>
        <div className="ml-auto flex gap-2">
          {showBackBtn && (
            <button
              onClick={handleBack}
              className="px-4 py-1.5 rounded-lg border border-dark-700 text-xs font-semibold text-gray-300 hover:text-white hover:border-primary/40 transition-all"
            >
              ← Back
            </button>
          )}
          {showNextBtn && (
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              Next &gt;
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex-shrink-0 border-b border-dark-700" style={{ backgroundColor: 'rgb(15 19 38)' }}>
        <StepBar step={step} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Footer status bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-t border-dark-700 text-[11px] text-gray-500" style={{ backgroundColor: 'rgb(15 19 38)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Security Active
        </span>
        <span>{STEP_LABELS[step - 1]}</span>
      </div>
    </div>
  );
}
