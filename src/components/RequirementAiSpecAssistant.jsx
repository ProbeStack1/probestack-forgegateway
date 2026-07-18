import React, { useMemo, useState } from 'react';
import YAML from 'js-yaml';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Braces,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  Edit3,
  Eye,
  FileCode2,
  FileJson,
  Grid3X3,
  Link2,
  List,
  Loader2,
  Save,
  Search,
  Shield,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import InfoPopover from './ui/InfoPopover';
import { cn } from '../lib/utils';
import { specForgeAgentService } from '../services/specForgeAgentService';
import { apiDesignService } from '../services/apiDesignService';

const CONNECTOR_TYPES = [
  { value: 'forgesphere', label: 'ForgeSphere' },
  { value: 'forgecatalog', label: 'ForgeCatalog' },
  { value: 'spec_library', label: 'Spec Library' },
  { value: 'swaggerhub', label: 'SwaggerHub' },
  { value: 'github', label: 'GitHub' },
];

const CONNECTOR_VISUALS = {
  forgesphere: {
    accent: 'bg-primary',
    text: 'text-primary',
    tint: 'bg-primary/10',
    active: 'border-primary/45 bg-primary/[0.08]',
    icon: 'border-primary/25 bg-primary/10 text-primary',
  },
  forgecatalog: {
    accent: 'bg-emerald-400',
    text: 'text-emerald-300',
    tint: 'bg-emerald-500/10',
    active: 'border-emerald-400/45 bg-emerald-500/[0.08]',
    icon: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  spec_library: {
    accent: 'bg-sky-400',
    text: 'text-sky-300',
    tint: 'bg-sky-500/10',
    active: 'border-sky-400/45 bg-sky-500/[0.08]',
    icon: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
  },
  swaggerhub: {
    accent: 'bg-violet-400',
    text: 'text-violet-300',
    tint: 'bg-violet-500/10',
    active: 'border-violet-400/45 bg-violet-500/[0.08]',
    icon: 'border-violet-400/25 bg-violet-500/10 text-violet-300',
  },
  github: {
    accent: 'bg-amber-400',
    text: 'text-amber-300',
    tint: 'bg-amber-500/10',
    active: 'border-amber-400/45 bg-amber-500/[0.08]',
    icon: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  },
};

const FLOW_STAGES = [
  { id: 'sources', label: 'Sources' },
  { id: 'requirement', label: 'Requirement' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'generate', label: 'Generate' },
  { id: 'schema', label: 'Schema Validation' },
];

const MANUAL_SPEC_PAGE_SIZE = 8;

const REQUIREMENT_MODES = [
  { id: 'manual', label: 'Manual', icon: FileCode2 },
  { id: 'file', label: 'File Upload', icon: Upload },
  { id: 'link', label: 'Link', icon: Link2 },
];

const DEFAULT_CONNECTOR = {
  type: 'forgesphere',
  name: 'ForgeSphere Specs',
  specs_endpoint: '',
  auth_header: 'Authorization',
  auth_token: '',
};

const CONNECTORS_STORAGE_KEY = 'probeStack_specForgeAgentConnectors';
const SELECTED_CONNECTORS_STORAGE_KEY = 'probeStack_specForgeAgentSelectedConnectors';
const APP_API_BASE_URL = 'https://forgesphere.probestack.io';
const DEFAULT_ORGANIZATION_ID = 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c';

const getBrowserValue = (key, fallback = '') => {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) || fallback;
};

const withBearerPrefix = (token) => {
  const trimmed = token?.trim();
  if (!trimmed) return '';
  return /^bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`;
};

const getDefaultConnectorValues = () => {
  const organizationId = getBrowserValue('userOrganizationId', DEFAULT_ORGANIZATION_ID);
  const organizationName = getBrowserValue('userOrganization', '');
  const authToken = withBearerPrefix(getBrowserValue('authToken', ''));
  const githubConfigs = (() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('githubConfigs') || '[]');
    } catch {
      return [];
    }
  })();
  const firstGithubConfig = Array.isArray(githubConfigs) ? githubConfigs[0] : null;
  const githubOwner = firstGithubConfig?.owner || firstGithubConfig?.organization || organizationName || 'probestack';
  const githubRepo = firstGithubConfig?.repo || firstGithubConfig?.repository || 'api-specs';
  const githubBranch = firstGithubConfig?.branch || 'main';

  return {
    forgesphere: {
      name: 'ForgeSphere Specs',
      specs_endpoint: `${APP_API_BASE_URL}/api-design/v1/api/apidesign/imported-specs?organizationId=${encodeURIComponent(organizationId)}`,
      auth_header: 'Authorization',
      auth_token: authToken,
    },
    forgecatalog: {
      name: 'ForgeCatalog Specs',
      specs_endpoint: `${APP_API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${encodeURIComponent(organizationId)}`,
      auth_header: 'Authorization',
      auth_token: authToken,
    },
    spec_library: {
      name: 'Spec Library',
      specs_endpoint: `${APP_API_BASE_URL}/api-design/v1/api/apidesign/library?organizationId=${encodeURIComponent(organizationId)}`,
      auth_header: 'Authorization',
      auth_token: authToken,
    },
    swaggerhub: {
      name: 'SwaggerHub Specs',
      specs_endpoint: organizationName
        ? `https://api.swaggerhub.com/apis/${encodeURIComponent(organizationName)}?page=1&limit=100`
        : 'https://api.swaggerhub.com/apis?page=1&limit=100&sort=CREATED&order=DESC',
      auth_header: 'Authorization',
      auth_token: '',
    },
    github: {
      name: 'GitHub OpenAPI Specs',
      specs_endpoint: `https://api.github.com/repos/${encodeURIComponent(githubOwner)}/${encodeURIComponent(githubRepo)}/contents?ref=${encodeURIComponent(githubBranch)}`,
      auth_header: 'Authorization',
      auth_token: firstGithubConfig?.token ? withBearerPrefix(firstGithubConfig.token) : '',
    },
  };
};

const makeConnectorForType = (type) => {
  const connectorType = CONNECTOR_TYPES.find((item) => item.value === type);
  const defaultValues = getDefaultConnectorValues()[type] || {};
  return {
    ...DEFAULT_CONNECTOR,
    ...defaultValues,
    id: type,
    type,
    name: defaultValues.name || `${connectorType?.label || 'Connector'} Specs`,
  };
};

const loadSavedConnectors = () => {
  if (typeof window === 'undefined') {
    return CONNECTOR_TYPES.map((item) => makeConnectorForType(item.value));
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONNECTORS_STORAGE_KEY) || '[]');
    const savedByType = new Map(
      Array.isArray(parsed)
        ? parsed.filter((connector) => connector?.type).map((connector) => [connector.type, connector])
        : [],
    );
    return CONNECTOR_TYPES.map((item) => {
      const defaults = makeConnectorForType(item.value);
      const saved = savedByType.get(item.value) || {};
      return {
        ...defaults,
        ...saved,
        id: item.value,
        type: item.value,
        name: saved.name || defaults.name,
        specs_endpoint: saved.specs_endpoint || defaults.specs_endpoint,
        auth_header: saved.auth_header || defaults.auth_header,
        auth_token: defaults.auth_token,
      };
    });
  } catch {
    return CONNECTOR_TYPES.map((item) => makeConnectorForType(item.value));
  }
};

const saveConnectorDrafts = (connectors) => {
  if (typeof window === 'undefined') return;
  const safeConnectors = connectors.map(({ auth_token, ...connector }) => connector);
  window.localStorage.setItem(CONNECTORS_STORAGE_KEY, JSON.stringify(safeConnectors));
};

const loadSelectedConnectorTypes = () => {
  const allConnectorTypes = CONNECTOR_TYPES.map((item) => item.value);
  if (typeof window === 'undefined') return allConnectorTypes;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SELECTED_CONNECTORS_STORAGE_KEY) || '[]');
    const selected = Array.isArray(parsed)
      ? parsed.filter((type) => allConnectorTypes.includes(type))
      : [];
    return selected.length ? selected : allConnectorTypes;
  } catch {
    return allConnectorTypes;
  }
};

const saveSelectedConnectorTypes = (selectedTypes) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SELECTED_CONNECTORS_STORAGE_KEY, JSON.stringify(selectedTypes));
};

const buildRequirementMarkdown = (functionalReqs, nonFunctionalReqs) => {
  const parts = ['# Functional Requirement', functionalReqs.trim()];
  if (nonFunctionalReqs.trim()) {
    parts.push('', '# Non-Functional Requirement', nonFunctionalReqs.trim());
  }
  return parts.join('\n');
};

const normalizeRecommendation = (recommendation, index) => ({
  id: recommendation.recommendation_id || recommendation.id || `recommendation-${index}`,
  recommendationId: recommendation.recommendation_id || recommendation.id || `recommendation-${index}`,
  name: recommendation.spec_name || recommendation.specName || recommendation.name || 'Recommended Spec',
  specName: recommendation.spec_name || recommendation.specName || recommendation.name || 'Recommended Spec',
  fileName: recommendation.metadata?.fileName || recommendation.name || recommendation.spec_name || 'openapi.yaml',
  basePath: recommendation.base_path || recommendation.basePath || '/',
  connectorName: recommendation.connector_name || recommendation.connectorName || recommendation.connector?.name || 'Connected source',
  connectorType: recommendation.connector_type || recommendation.connectorType || recommendation.connector?.type || 'connector',
  similarity: Number(recommendation.similarity || recommendation.matchScore || 0),
  metadata: recommendation.metadata || {},
  specContent: recommendation.spec_content || recommendation.content || '',
});

const normalizeSourceSpec = (spec = {}, index, context = {}) => {
  const id = spec.spec_metadata_id || spec.specMetadataId || spec.generated_spec_id || spec.id || spec.recommendation_id || `manual-spec-${index}`;
  const name = spec.spec_name || spec.specName || spec.info?.title || spec.title || spec.name || spec.fileName || spec.filename || 'Connected Spec';
  const isOpenApiObject = Boolean(spec.openapi || spec.swagger || spec.paths || spec.info);
  return {
    id,
    specMetadataId: spec.spec_metadata_id || spec.specMetadataId || spec.id || id,
    recommendationId: id,
    name,
    specName: spec.spec_name || spec.specName || name,
    fileName: spec.metadata?.fileName || spec.fileName || spec.filename || spec.name || makeSpecFileName(name),
    basePath: spec.base_path || spec.basePath || spec.baseUrl || spec.url || '/',
    connectorName: spec.connector_name || spec.connectorName || spec.connector?.name || context.connectorName || 'Connected source',
    connectorType: spec.connector_type || spec.connectorType || spec.connector?.type || context.connectorType || 'connector',
    similarity: Number(spec.similarity || spec.matchScore || 0),
    metadata: spec.metadata || {},
    specContent: spec.spec_content || spec.specContent || spec.content || spec.raw_content || spec.openapi_content || (isOpenApiObject ? JSON.stringify(spec, null, 2) : ''),
    contentUrl: spec.content_url || spec.contentUrl || spec.download_url || spec.raw_url || spec.url || '',
  };
};

const extractLoadedSpecs = (payload, defaultContext = {}) => {
  const found = [];
  const pushSpec = (spec, context) => {
    if (!spec || typeof spec !== 'object') return;
    found.push(normalizeSourceSpec(spec, found.length, context));
  };
  const visitSpecArray = (items, context = {}) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const nestedSpecs = item.specs || item.loaded_specs || item.source_specs || item.documents || item.items || item.apis || item.results;
      if (Array.isArray(nestedSpecs)) {
        visitSpecArray(nestedSpecs, {
          connectorName: item.name || item.connector_name || item.connectorName || context.connectorName,
          connectorType: item.type || item.connector_type || item.connectorType || context.connectorType,
        });
        return;
      }
      pushSpec(item, context);
    });
  };
  const visitPayload = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      visitSpecArray(value, defaultContext);
      return;
    }
    if (value.openapi || value.swagger || value.paths || value.info) {
      pushSpec(value, defaultContext);
      return;
    }
    visitSpecArray(value.specs, defaultContext);
    visitSpecArray(value.loaded_specs, defaultContext);
    visitSpecArray(value.source_specs, defaultContext);
    visitSpecArray(value.documents, defaultContext);
    visitSpecArray(value.items, defaultContext);
    visitSpecArray(value.apis, defaultContext);
    visitSpecArray(value.results, defaultContext);
    if (Array.isArray(value.connectors)) {
      value.connectors.forEach((connector) => {
        visitSpecArray(connector?.specs || connector?.loaded_specs || connector?.source_specs || connector?.documents || connector?.items || connector?.apis || connector?.results, {
          connectorName: connector?.name || connector?.connector_name || connector?.connectorName || defaultContext.connectorName,
          connectorType: connector?.type || connector?.connector_type || connector?.connectorType || defaultContext.connectorType,
        });
      });
    }
    if (value.data && value.data !== value) visitPayload(value.data);
  };

  visitPayload(payload);

  const seen = new Set();
  return found.filter((item) => {
    const key = [
      item.id,
      item.name,
      item.fileName,
      item.connectorType,
      item.basePath,
      item.specContent ? String(item.specContent).slice(0, 120) : '',
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchConnectorSpecs = async (connector) => {
  const headers = {
    Accept: 'application/json, text/yaml, application/yaml, text/plain;q=0.9, */*;q=0.8',
  };
  if (connector.auth_header && connector.auth_token) {
    headers[connector.auth_header] = connector.auth_token;
  }
  if (connector.headers && typeof connector.headers === 'object') {
    Object.assign(headers, connector.headers);
  }

  const response = await fetch(connector.specs_endpoint, { headers });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${connector.name || connector.type} failed (${response.status})`);
  }

  let payload = responseText;
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = responseText;
  }

  if (typeof payload === 'string') {
    return [normalizeSourceSpec({
      id: `${connector.type}-manual-spec`,
      name: connector.name || 'Connected Spec',
      content: payload,
    }, 0, {
      connectorName: connector.name,
      connectorType: connector.type,
    })];
  }

  return extractLoadedSpecs(payload, {
    connectorName: connector.name,
    connectorType: connector.type,
  });
};

const getPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const makeSpecFileName = (name, format = 'yaml') => {
  const base = (name || 'generated-api')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'generated-api';
  return `${base}.${format === 'json' ? 'json' : 'yaml'}`;
};

const isMissingSessionError = (message) => (
  /session/i.test(message || '') && /not found/i.test(message || '')
);

const inferBaseUrlFromSpec = (specContent, fallback = '/') => {
  if (!specContent) return fallback || '/';
  try {
    const parsed = JSON.parse(specContent);
    return parsed?.servers?.[0]?.url || fallback || '/';
  } catch {
    const match = String(specContent).match(/^\s*-\s*url:\s*['"]?([^'"\n]+)/im);
    return match?.[1]?.trim() || fallback || '/';
  }
};

const normalizeSchemaType = (raw) => {
  if (!raw) return 'any';
  const value = String(raw).toLowerCase().trim().replace(/\(.*\)/, '').trim();
  if (['varchar', 'text', 'char', 'nvarchar', 'string', 'str'].includes(value)) return 'string';
  if (['int', 'int4', 'int8', 'bigint', 'smallint', 'integer', 'tinyint', 'mediumint'].includes(value)) return 'integer';
  if (['float', 'double', 'decimal', 'numeric', 'real', 'number'].includes(value)) return 'number';
  if (['bool', 'boolean', 'bit'].includes(value)) return 'boolean';
  if (['string', 'integer', 'number', 'boolean', 'array', 'object'].includes(value)) return value;
  return value;
};

const fieldTypeColor = (type) => ({
  string: '#10b981',
  number: '#3b82f6',
  integer: '#3b82f6',
  boolean: '#f59e0b',
  array: '#8b5cf6',
  object: '#ec4899',
  any: '#64748b',
}[type] || '#64748b');

const extractSchemasFromSpecContent = (content) => {
  if (!content?.trim()) return [];
  try {
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = YAML.load(content);
    }
    if (!parsed || typeof parsed !== 'object') return [];

    const components = parsed.components?.schemas || parsed.definitions || {};
    return Object.entries(components)
      .filter(([, schema]) => schema?.properties)
      .map(([name, schema]) => ({
        name,
        description: schema.description || '',
        properties: Object.fromEntries(
          Object.entries(schema.properties || {}).map(([fieldName, field]) => [
            fieldName,
            { ...field, type: normalizeSchemaType(field.type || (field.$ref ? 'object' : 'any')) },
          ]),
        ),
        required: schema.required || [],
      }));
  } catch {
    return [];
  }
};

const applySpecDisplayEdits = (content, apiName, baseUrl) => {
  if (!content) return content;
  const cleanApiName = apiName?.trim();
  const cleanBaseUrl = baseUrl?.trim();

  try {
    const parsed = JSON.parse(content);
    if (cleanApiName) {
      parsed.info = { ...(parsed.info || {}), title: cleanApiName };
    }
    if (cleanBaseUrl) {
      parsed.servers = Array.isArray(parsed.servers) && parsed.servers.length
        ? [{ ...parsed.servers[0], url: cleanBaseUrl }, ...parsed.servers.slice(1)]
        : [{ url: cleanBaseUrl }];
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    let next = String(content);
    if (cleanApiName) {
      if (/^\s*title:\s*.*$/im.test(next)) {
        next = next.replace(/^(\s*title:\s*).*$/im, `$1${cleanApiName}`);
      } else if (/^\s*info:\s*$/im.test(next)) {
        next = next.replace(/^(\s*info:\s*)$/im, `$1\n  title: ${cleanApiName}`);
      }
    }
    if (cleanBaseUrl) {
      if (/^\s*-\s*url:\s*.*$/im.test(next)) {
        next = next.replace(/^(\s*-\s*url:\s*).*$/im, `$1${cleanBaseUrl}`);
      } else {
        next = next.replace(/^(openapi:\s*.*)$/im, `$1\nservers:\n  - url: ${cleanBaseUrl}`);
      }
    }
    return next;
  }
};

export default function RequirementAiSpecAssistant({
  functionalReqs,
  setFunctionalReqs,
  nonFunctionalReqs,
  setNonFunctionalReqs,
  setReqGenStatus,
  setAiInput,
  onSpecSelected,
  onSchemaValidation,
  onViewSpec,
  showMessage,
  apiDesignOptions,
  organizationId,
  microserviceId,
  functionalPlaceholder = 'Describe the functional requirements for this API...',
  nonFunctionalPlaceholder = 'Performance, security, availability requirements...',
  statusKeys = { functional: 'functionalReqs', nonFunctional: 'nonFunctionalReqs' },
  metricFields,
}) {
  const [agentPageOpen, setAgentPageOpen] = useState(false);
  const [requirementMode, setRequirementMode] = useState('manual');
  const [requirementUrl, setRequirementUrl] = useState('');
  const [requirementFile, setRequirementFile] = useState(null);
  const [activeStage, setActiveStage] = useState('sources');
  const [activeConnectorType, setActiveConnectorType] = useState('forgesphere');
  const [stageStatus, setStageStatus] = useState({});
  const [session, setSession] = useState(null);
  const [connectors, setConnectors] = useState(loadSavedConnectors);
  const [selectedConnectorTypes, setSelectedConnectorTypes] = useState(loadSelectedConnectorTypes);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState([]);
  const [sourceSpecs, setSourceSpecs] = useState([]);
  const [selectedManualSpecId, setSelectedManualSpecId] = useState('');
  const [recommendationListMode, setRecommendationListMode] = useState('recommended');
  const [manualSpecPage, setManualSpecPage] = useState(1);
  const [isLoadingManualSpecs, setIsLoadingManualSpecs] = useState(false);
  const [manualSpecsError, setManualSpecsError] = useState('');
  const [ingestedMarkdown, setIngestedMarkdown] = useState('');
  const [generatedSpec, setGeneratedSpec] = useState(null);
  const [generatedApiName, setGeneratedApiName] = useState('');
  const [generatedBaseUrl, setGeneratedBaseUrl] = useState('');
  const [previewSpec, setPreviewSpec] = useState(null);
  const [editingSpecContent, setEditingSpecContent] = useState('');
  const [isPersistingForValidation, setIsPersistingForValidation] = useState(false);
  // Tracks whichever spec (generated or recommended) is currently open for schema validation,
  // independent of `generatedSpec` — recommendations never go through the generate step.
  const [activeValidationSpec, setActiveValidationSpec] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [workingStage, setWorkingStage] = useState(null);
  const [isRecommendingSettings, setIsRecommendingSettings] = useState(false);
  const [schemaSearchTerm, setSchemaSearchTerm] = useState('');
  const [schemaViewMode, setSchemaViewMode] = useState('grid');
  const [generationOptions, setGenerationOptions] = useState({
    apiName: apiDesignOptions?.apiName || '',
    version: '1.0.0',
    basePath: '',
    outputFormat: 'yaml',
    specStyle: 'rest',
  });

  const requirementMarkdown = useMemo(
    () => buildRequirementMarkdown(functionalReqs, nonFunctionalReqs),
    [functionalReqs, nonFunctionalReqs],
  );

  const cleanedConnectors = useMemo(
    () => connectors
      .filter((connector) => selectedConnectorTypes.includes(connector.type))
      .map((connector) => ({
        type: connector.type,
        name: connector.name?.trim() || CONNECTOR_TYPES.find((item) => item.value === connector.type)?.label || 'Connector',
        specs_endpoint: connector.specs_endpoint?.trim() || '',
        auth_header: connector.auth_header?.trim() || undefined,
        auth_token: connector.auth_token?.trim() || undefined,
        headers: connector.headers || undefined,
      }))
      .filter((connector) => connector.specs_endpoint),
    [connectors, selectedConnectorTypes],
  );

  const selectedRecommendations = useMemo(
    () => recommendations.filter((item) => selectedRecommendationIds.includes(item.recommendationId)),
    [recommendations, selectedRecommendationIds],
  );

  const selectedManualSpec = useMemo(
    () => sourceSpecs.find((item) => item.recommendationId === selectedManualSpecId) || null,
    [sourceSpecs, selectedManualSpecId],
  );

  const manualSpecPageCount = Math.max(1, Math.ceil(sourceSpecs.length / MANUAL_SPEC_PAGE_SIZE));
  const safeManualSpecPage = Math.min(manualSpecPage, manualSpecPageCount);
  const paginatedManualSpecs = useMemo(
    () => sourceSpecs.slice((safeManualSpecPage - 1) * MANUAL_SPEC_PAGE_SIZE, safeManualSpecPage * MANUAL_SPEC_PAGE_SIZE),
    [sourceSpecs, safeManualSpecPage],
  );

  const activeConnector = useMemo(
    () => connectors.find((connector) => connector.type === activeConnectorType) || makeConnectorForType(activeConnectorType),
    [activeConnectorType, connectors],
  );

  const schemaPreviewContent = useMemo(
    () => activeValidationSpec?.specContent || '',
    [activeValidationSpec],
  );

  const schemaPreviewSchemas = useMemo(
    () => extractSchemasFromSpecContent(schemaPreviewContent),
    [schemaPreviewContent],
  );

  const filteredSchemaPreviewSchemas = useMemo(
    () => schemaPreviewSchemas.filter((schema) => !schemaSearchTerm || schema.name.toLowerCase().includes(schemaSearchTerm.toLowerCase())),
    [schemaPreviewSchemas, schemaSearchTerm],
  );

  const schemaFieldCount = useMemo(
    () => schemaPreviewSchemas.reduce((total, schema) => total + Object.keys(schema.properties || {}).length, 0),
    [schemaPreviewSchemas],
  );

  const hasRequirementInput = (
    requirementMode === 'manual' ? !!functionalReqs.trim()
      : requirementMode === 'file' ? !!requirementFile
        : !!requirementUrl.trim()
  );

  const updateRequirementStatus = (key, value, configuredText = 'Configured', emptyText = 'Ready') => {
    setReqGenStatus((prev) => ({
      ...prev,
      [key]: {
        status: value ? configuredText : emptyText,
        completed: !!value,
      },
    }));
  };

  const syncFunctionalRequirement = (newValue) => {
    setFunctionalReqs(newValue);
    updateRequirementStatus(statusKeys.functional, newValue);
    const nonFuncText = nonFunctionalReqs ? `\n\nNon-Functional requirement:- ${nonFunctionalReqs}` : '';
    setAiInput(newValue ? `Functional requirement:- ${newValue}${nonFuncText}` : '');
  };

  const syncNonFunctionalRequirement = (newValue) => {
    setNonFunctionalReqs(newValue);
    updateRequirementStatus(statusKeys.nonFunctional, newValue, 'Configured', 'Not configured');
    const funcText = functionalReqs ? `Functional requirement:- ${functionalReqs}` : '';
    const separator = functionalReqs && newValue ? '\n\n' : '';
    setAiInput(newValue ? `${funcText}${separator}Non-Functional requirement:- ${newValue}` : funcText);
  };

  const setStage = (stage, status, message = '') => {
    setStageStatus((prev) => ({ ...prev, [stage]: { status, message } }));
  };

  const ensureSession = async () => {
    if (session?.session_id) return session;
    const result = await specForgeAgentService.createSession();
    if (!result.success) throw new Error(result.error);
    setSession(result.data);
    return result.data;
  };

  const openAgentPanel = () => {
    if (!hasRequirementInput) {
      showMessage('Provide a requirement using manual text, file upload, or link.', 'error');
      return;
    }
    setAgentPageOpen(true);
    setErrorMessage('');
    setActiveStage(recommendations.length ? 'recommendations' : 'sources');
  };

  const updateConnector = (id, patch) => {
    setConnectors((prev) => prev.map((connector) => (
      connector.id === id ? { ...connector, ...patch } : connector
    )));
  };

  const updateSelectedConnectorTypes = (updater) => {
    setSelectedConnectorTypes((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveSelectedConnectorTypes(next);
      return next;
    });
  };

  const toggleConnectorSelection = (type) => {
    setActiveConnectorType(type);
    updateSelectedConnectorTypes((prev) => (
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    ));
  };

  const connectSources = async () => {
    if (cleanedConnectors.length === 0) {
      throw new Error('Select at least one connector with a configured endpoint before searching.');
    }

    setStage('sources', 'active', 'Connecting source endpoints');
    let activeSession = await ensureSession();
    let result = await specForgeAgentService.setupConnectors(activeSession.session_id, cleanedConnectors);

    if (!result.success && isMissingSessionError(result.error)) {
      setStage('sources', 'active', 'Session expired, creating a new one');
      setSession(null);
      const newSessionResult = await specForgeAgentService.createSession();
      if (!newSessionResult.success) throw new Error(newSessionResult.error);
      activeSession = newSessionResult.data;
      setSession(activeSession);
      result = await specForgeAgentService.setupConnectors(activeSession.session_id, cleanedConnectors);
    }

    if (!result.success) throw new Error(result.error);
    saveConnectorDrafts(connectors);
    saveSelectedConnectorTypes(selectedConnectorTypes);
    const loadedSpecs = extractLoadedSpecs(result.data);
    setSourceSpecs(loadedSpecs);
    setSelectedManualSpecId('');
    setManualSpecPage(1);
    setStage('sources', 'complete', `${result.data?.specs_loaded || 0} specs loaded`);
    return activeSession;
  };

  const ingestRequirement = async (activeSession) => {
    setStage('requirement', 'active', 'Converting requirement to Markdown');
    let result;
    if (requirementMode === 'file') {
      result = await specForgeAgentService.ingestRequirementFile(activeSession.session_id, requirementFile);
    } else if (requirementMode === 'link') {
      result = await specForgeAgentService.ingestRequirementUrl(activeSession.session_id, requirementUrl.trim());
    } else {
      result = await specForgeAgentService.ingestRequirement(activeSession.session_id, requirementMarkdown);
    }
    if (!result.success) throw new Error(result.error);
    setIngestedMarkdown(result.data?.requirement_markdown || requirementMarkdown);
    setStage('requirement', 'complete', 'Requirement stored as Markdown');
  };

  const searchRecommendations = async (activeSession) => {
    setActiveStage('recommendations');
    setStage('recommendations', 'active', 'Searching connected specs');
    const searchResult = await specForgeAgentService.searchRecommendations(activeSession.session_id, {
      threshold: 0.6,
      limit: 10,
    });
    if (!searchResult.success) throw new Error(searchResult.error);

    const normalized = (searchResult.data?.recommendations || []).map(normalizeRecommendation);
    setRecommendations(normalized);
    setSelectedRecommendationIds(normalized.slice(0, Math.min(1, normalized.length)).map((item) => item.recommendationId));
    setStage('recommendations', 'complete', `${normalized.length} recommendations found`);
    setActiveStage('recommendations');
  };

  const runFindSpecsFlow = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setErrorMessage('');
    setGeneratedSpec(null);
    setRecommendations([]);
    setSelectedRecommendationIds([]);
    setSelectedManualSpecId('');
    setRecommendationListMode('recommended');
    let currentStage = 'sources';

    try {
      currentStage = 'sources';
      setWorkingStage(currentStage);
      setActiveStage('sources');
      const activeSession = await connectSources();
      currentStage = 'requirement';
      setWorkingStage(currentStage);
      setActiveStage('requirement');
      await ingestRequirement(activeSession);
      currentStage = 'recommendations';
      setWorkingStage(currentStage);
      await searchRecommendations(activeSession);
    } catch (error) {
      const message = error?.message || 'SpecForge agent flow failed.';
      setErrorMessage(message);
      showMessage(message, 'error');
      setStage(currentStage, 'error', message);
      setActiveStage(currentStage);
    } finally {
      setWorkingStage(null);
      setIsWorking(false);
    }
  };

  const toggleRecommendation = (recommendationId) => {
    setRecommendationListMode('recommended');
    setSelectedManualSpecId('');
    setSelectedRecommendationIds((prev) => {
      if (prev.includes(recommendationId)) return [];
      return [recommendationId];
    });
  };

  const toggleManualSpec = (specId) => {
    setRecommendationListMode('manual');
    setSelectedRecommendationIds([]);
    setSelectedManualSpecId((prev) => (prev === specId ? '' : specId));
  };

  const loadManualSpecsFromConnectors = async () => {
    if (cleanedConnectors.length === 0) {
      showMessage('Select at least one connector before manual selection.', 'error');
      return;
    }

    setRecommendationListMode('manual');
    setIsLoadingManualSpecs(true);
    setManualSpecsError('');
    setSelectedRecommendationIds([]);
    setSelectedManualSpecId('');
    setManualSpecPage(1);

    try {
      const results = await Promise.allSettled(cleanedConnectors.map(fetchConnectorSpecs));
      const loadedSpecs = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
      const failures = results
        .map((result) => (result.status === 'rejected' ? result.reason?.message : ''))
        .filter(Boolean);

      setSourceSpecs(loadedSpecs);
      if (failures.length) {
        const message = `Loaded ${loadedSpecs.length} specs. ${failures.length} connector${failures.length > 1 ? 's' : ''} failed.`;
        setManualSpecsError(message);
        showMessage(message, loadedSpecs.length ? 'warning' : 'error');
      } else {
        setManualSpecsError('');
      }
    } catch (error) {
      const message = error?.message || 'Failed to load manual specs.';
      setSourceSpecs([]);
      setManualSpecsError(message);
      showMessage(message, 'error');
    } finally {
      setIsLoadingManualSpecs(false);
    }
  };

  const hydrateGenerationDefaults = async (recommendationIds = selectedRecommendationIds) => {
    const scopedRecommendations = recommendations.filter((item) => recommendationIds.includes(item.recommendationId));
    const primaryRecommendation = scopedRecommendations[0];
    const inferredFormat = String(primaryRecommendation?.format || '').toLowerCase().includes('json') ? 'json' : 'yaml';
    const fallback = {
      apiName: apiDesignOptions?.apiName || primaryRecommendation?.name || '',
      version: primaryRecommendation?.version || '1.0.0',
      basePath: primaryRecommendation?.basePath || '/',
      outputFormat: inferredFormat,
    };

    if (!session?.session_id) {
      const message = 'Create a SpecForge session before asking the AI agent for generation settings.';
      setErrorMessage(message);
      setStage('generate', 'error', message);
      showMessage(message, 'error');
      return;
    }

    setIsRecommendingSettings(true);
    setStage('generate', 'active', 'AI recommending generation settings');
    const result = await specForgeAgentService.recommendGenerationSettings(session.session_id, {
      selected_recommendation_ids: recommendationIds,
      output_format: generationOptions.outputFormat || fallback.outputFormat,
      spec_style: generationOptions.specStyle || 'rest',
    });
    setIsRecommendingSettings(false);

    if (!result.success) {
      setGenerationOptions((prev) => ({
        ...prev,
        apiName: prev.apiName?.trim() || '',
        version: prev.version?.trim() || fallback.version,
        basePath: prev.basePath?.trim() || fallback.basePath,
        outputFormat: prev.outputFormat || fallback.outputFormat,
      }));
      const message = result.error || 'AI settings request failed. Check backend health and logs.';
      setErrorMessage(message);
      setStage('generate', 'error', message);
      showMessage(message, 'error');
      return;
    }

    if (result.data?.source !== 'ai_agent') {
      // const message = result.data?.message || 'Gemini requirement analysis agent is unavailable; settings were not generated by AI.';
      setGenerationOptions((prev) => ({
        ...prev,
        apiName: prev.apiName?.trim() || '',
        version: prev.version?.trim() || fallback.version,
        basePath: prev.basePath?.trim() || fallback.basePath,
        outputFormat: prev.outputFormat || fallback.outputFormat,
      }));
      // setErrorMessage(message);
      // setStage('generate', 'error', message);
      // showMessage(message, 'error');
      return;
    }

    setErrorMessage('');
    setGenerationOptions((prev) => ({
      ...prev,
      apiName: result.data?.api_name || '',
      version: result.data?.version || '1.0.0',
      basePath: result.data?.base_path || '/',
      outputFormat: result.data?.output_format || 'yaml',
    }));
    setStage('generate', 'active', 'AI settings ready');
  };

  const continueToGenerationSettings = async ({ fresh = false } = {}) => {
    const recommendationIds = fresh ? [] : selectedRecommendationIds;
    if (fresh) {
      setSelectedRecommendationIds([]);
    }
    await hydrateGenerationDefaults(recommendationIds);
    setActiveStage('generate');
  };

  const updateGeneratedFields = (field, value) => {
    if (field === 'name') setGeneratedApiName(value);
    if (field === 'baseUrl') setGeneratedBaseUrl(value);
    setGeneratedSpec((prev) => {
      if (!prev) return prev;
      const nextName = field === 'name' ? value : generatedApiName;
      const nextBaseUrl = field === 'baseUrl' ? value : generatedBaseUrl;
      return {
        ...prev,
        name: nextName,
        specName: nextName,
        fileName: makeSpecFileName(nextName, generationOptions.outputFormat),
        baseUrl: nextBaseUrl,
        specContent: applySpecDisplayEdits(prev.specContent, nextName, nextBaseUrl),
      };
    });
  };

  const generateSpec = async () => {
    if (!session?.session_id) {
      showMessage('Run source search before generation.', 'error');
      return;
    }

    setIsWorking(true);
    setErrorMessage('');
    setActiveStage('generate');
    setStage('generate', 'active', 'Generating OpenAPI spec');

    try {
      const apiName = generationOptions.apiName.trim();
      const basePath = generationOptions.basePath?.trim();
      const result = await specForgeAgentService.generateSpec(session.session_id, {
        selected_recommendation_ids: selectedRecommendationIds,
        api_name: apiName || undefined,
        version: generationOptions.version || '1.0.0',
        base_path: basePath || undefined,
        output_format: generationOptions.outputFormat || 'yaml',
        spec_style: generationOptions.specStyle || 'rest',
        standards: ['company-api-standards'],
      });

      if (!result.success) throw new Error(result.error);

      const recommendedBaseUrl = result.data?.base_path || basePath || inferBaseUrlFromSpec(result.data.spec_content, '/');
      const resolvedApiName = result.data?.api_name || apiName || generationOptions.apiName;
      if (!resolvedApiName) {
        throw new Error('GenerationAgent did not return an API name.');
      }
      const editedContent = applySpecDisplayEdits(result.data.spec_content, resolvedApiName, recommendedBaseUrl);
      const spec = {
        id: result.data.generated_spec_id,
        generatedSpecId: result.data.generated_spec_id,
        specMetadataId: result.data.generated_spec_id,
        name: resolvedApiName,
        specName: resolvedApiName,
        fileName: makeSpecFileName(resolvedApiName, generationOptions.outputFormat),
        source: 'SpecForge Agent',
        baseUrl: recommendedBaseUrl,
        specContent: editedContent,
        usedRecommendations: result.data.used_recommendations || selectedRecommendations,
        generated: true,
      };

      setGeneratedApiName(resolvedApiName);
      setGeneratedBaseUrl(recommendedBaseUrl);
      setGeneratedSpec(spec);
      setPreviewSpec(spec);
      setEditingSpecContent(editedContent);
      setStage('generate', 'complete', 'Generated spec is ready');

      // Persist the generated spec and hand off straight to schema validation — same
      // real-ID-backed validation experience as a Design-step spec.
      const openedValidation = await validateGeneratedSpec(spec, resolvedApiName, recommendedBaseUrl);
      if (openedValidation) {
        setStage('schema', 'complete', 'Schema validation opened');
      } else {
        showMessage('Generated spec is ready for review.', 'success');
      }
    } catch (error) {
      const message = error?.message || 'Failed to generate spec.';
      setErrorMessage(message);
      setStage('generate', 'error', message);
      showMessage(message, 'error');
    } finally {
      setIsWorking(false);
    }
  };

  const useSpecForDesign = (spec = generatedSpec) => {
    if (!spec) return;
    const specContent = applySpecDisplayEdits(spec.specContent, generatedApiName || spec.name, generatedBaseUrl || spec.baseUrl);
    onSpecSelected?.({
      id: spec.id,
      specMetadataId: spec.specMetadataId || spec.id,
      name: generatedApiName || spec.name,
      specName: generatedApiName || spec.specName || spec.name,
      fileName: makeSpecFileName(generatedApiName || spec.name, generationOptions.outputFormat),
      source: spec.source || 'SpecForge Agent',
      baseUrl: generatedBaseUrl || spec.baseUrl,
      specContent,
      generatedSpecId: spec.generatedSpecId,
    });
    setAgentPageOpen(false);
  };

  // A freshly generated spec only exists in the SpecForge agent session — it has no real
  // API-design-service ID yet. Upload it first (same 'CREATE' upload the Design step uses for
  // cloned/created specs) so schema validation gets a real, persisted spec ID, exactly like a
  // Design-step spec.
  const useValidatedSpecForDesign = () => {
    if (!activeValidationSpec) {
      showMessage('Validate or select a spec before using it in API Design.', 'error');
      return;
    }

    onSpecSelected?.({
      id: activeValidationSpec.id,
      specMetadataId: activeValidationSpec.specMetadataId || activeValidationSpec.id,
      name: activeValidationSpec.name,
      specName: activeValidationSpec.specName || activeValidationSpec.name,
      fileName: activeValidationSpec.fileName || makeSpecFileName(activeValidationSpec.name, generationOptions.outputFormat),
      source: activeValidationSpec.source || 'SpecForge Agent',
      baseUrl: activeValidationSpec.baseUrl,
      specContent: activeValidationSpec.specContent || activeValidationSpec.content,
      generatedSpecId: activeValidationSpec.generatedSpecId,
    });
    setAgentPageOpen(false);
  };

  // A freshly generated spec only exists in the SpecForge agent session, so upload it
  // before schema validation needs a real API-design-service spec ID.
  const persistSpecForValidation = async ({ name, specContent }) => {
    if (!organizationId) {
      throw new Error('Missing organization context — cannot persist this spec for validation.');
    }
    const uploadResult = await apiDesignService.uploadSpec(organizationId, 'CREATE', null, null, specContent, microserviceId);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload spec for validation.');
    }

    if (microserviceId) {
      const importedResult = await apiDesignService.getImportedByMicroservice(microserviceId);
      const list = importedResult.success ? (importedResult.data?.data || importedResult.data || []) : [];
      const persisted = list[list.length - 1];
      if (persisted?.id) {
        return {
          id: persisted.id,
          specMetadataId: persisted.id,
          specName: persisted.specName || persisted.fileName || name,
          fileName: persisted.fileName || makeSpecFileName(name),
        };
      }
    }

    const uploaded = uploadResult.data?.data || uploadResult.data || {};
    if (!uploaded.id) {
      throw new Error('Spec uploaded but no ID was returned.');
    }
    return {
      id: uploaded.id,
      specMetadataId: uploaded.id,
      specName: uploaded.specName || name,
      fileName: uploaded.fileName || makeSpecFileName(name),
    };
  };

  // Shared by the manual "Schema validation" button and the automatic post-generate handoff.
  const validateGeneratedSpec = async (spec, name, baseUrl) => {
    const specContent = applySpecDisplayEdits(spec.specContent, name, baseUrl);

    let persisted = spec.persistedSpec;
    if (!persisted) {
      setIsPersistingForValidation(true);
      try {
        persisted = await persistSpecForValidation({ name, specContent });
        setGeneratedSpec((prev) => (prev && prev.id === spec.id ? { ...prev, persistedSpec: persisted } : prev));
      } catch (error) {
        showMessage(error.message || 'Failed to prepare spec for schema validation.', 'error');
        return false;
      } finally {
        setIsPersistingForValidation(false);
      }
    }

    const validationSpec = {
      ...spec,
      id: persisted.id,
      specMetadataId: persisted.id,
      name,
      specName: persisted.specName || name,
      fileName: persisted.fileName || makeSpecFileName(name, generationOptions.outputFormat),
      baseUrl,
      specContent,
      content: specContent,
      source: spec.source || 'SpecForge Agent',
    };
    setActiveValidationSpec(validationSpec);
    setActiveStage('schema');
    onSchemaValidation?.(validationSpec);
    return true;
  };

  const runSchemaValidation = async () => {
    if (!generatedSpec) {
      showMessage('Generate a spec before schema validation.', 'error');
      return;
    }
    const name = generatedApiName || generatedSpec.name;
    const baseUrl = generatedBaseUrl || generatedSpec.baseUrl;
    const ok = await validateGeneratedSpec(generatedSpec, name, baseUrl);
    if (ok) setStage('schema', 'complete', 'Schema validation opened');
  };

  // Recommendations come from already-connected/uploaded sources, so they already carry a real
  // spec ID — no upload needed, unlike a freshly generated spec. Jumps straight to the schema
  // validation step, skipping generate entirely.
  const resolveSpecContentForValidation = async (item) => {
    if (item?.specContent) return item.specContent;
    if (item?.specMetadataId || item?.id) {
      const result = await apiDesignService.getSpecContent(item.specMetadataId || item.id);
      if (result.success && result.content) return result.content;
    }
    if (item?.contentUrl && /^https?:\/\//i.test(item.contentUrl)) {
      const response = await fetch(item.contentUrl);
      if (response.ok) return response.text();
    }
    return '';
  };

  const buildRecommendationValidationSpec = async (item) => {
    const rawSpecContent = await resolveSpecContentForValidation(item);
    if (!rawSpecContent) {
      return null;
    }
    const specContent = applySpecDisplayEdits(rawSpecContent, item.name, item.basePath);
    return {
      id: item.id || item.recommendationId,
      specMetadataId: item.specMetadataId || item.id || item.recommendationId,
      name: item.name,
      specName: item.specName || item.name,
      fileName: item.fileName || makeSpecFileName(item.name),
      baseUrl: item.basePath,
      specContent,
      content: specContent,
      source: item.connectorName || 'Recommended spec',
    };
  };

  const runRecommendationSchemaValidation = async (item) => {
    const validationSpec = await buildRecommendationValidationSpec(item);
    if (!validationSpec) {
      showMessage('This recommended spec has no content available for validation yet.', 'error');
      return;
    }
    setActiveValidationSpec(validationSpec);
    setActiveStage('schema');
    setStage('schema', 'complete', 'Schema validation opened');
    onSchemaValidation?.(validationSpec);
  };

  const continueSelectedRecommendationToSchema = async () => {
    const selectedRecommendation = selectedRecommendations[0];
    if (!selectedRecommendation) {
      showMessage('Select one recommended spec before schema validation.', 'error');
      return;
    }
    await runRecommendationSchemaValidation(selectedRecommendation);
  };

  const continueSelectedManualSpecToSchema = async () => {
    if (!selectedManualSpec) {
      showMessage('Select one manual spec before schema validation.', 'error');
      return;
    }
    await runRecommendationSchemaValidation(selectedManualSpec);
  };

  // Re-opens the full validation overlay for whichever spec was validated last — already has a
  // persisted ID, so no re-upload needed.
  const reopenSchemaValidation = () => {
    if (!activeValidationSpec) return;
    onSchemaValidation?.(activeValidationSpec);
  };

  const openPreviewEditor = (spec = generatedSpec) => {
    if (!spec) return;
    const specContent = applySpecDisplayEdits(spec.specContent, generatedApiName || spec.name, generatedBaseUrl || spec.baseUrl);
    setPreviewSpec({ ...spec, specContent });
    setEditingSpecContent(specContent);
  };

  const savePreviewEdits = () => {
    setGeneratedSpec((prev) => prev ? { ...prev, specContent: editingSpecContent } : prev);
    setPreviewSpec((prev) => prev ? { ...prev, specContent: editingSpecContent } : prev);
    showMessage('Spec edits saved in this workflow.', 'success');
  };

  const savePreviewEditsAndUse = () => {
    savePreviewEdits();
    useSpecForDesign({ ...(previewSpec || generatedSpec), specContent: editingSpecContent });
  };

  const getStageState = (stageId) => {
    const status = stageStatus[stageId]?.status;
    if (status) return status;
    if (activeStage === stageId) return 'active';
    return 'idle';
  };

  const renderStageIcon = (stageId) => {
    const state = getStageState(stageId);
    if (state === 'complete') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (state === 'active') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    if (state === 'error') return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <span className="h-2 w-2 rounded-full bg-slate-600" />;
  };

  const renderRequirementTabs = () => (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-dark-700 bg-[#0b1020]/70 p-1">
        {REQUIREMENT_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setRequirementMode(mode.id)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors',
                requirementMode === mode.id ? 'bg-primary text-white' : 'text-slate-400 hover:text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {mode.label}
            </button>
          );
        })}
      </div>

      {requirementMode === 'manual' && (
        <textarea
          className="h-36 w-full resize-none rounded-lg border border-dark-700 bg-[#0f172a80] px-3 py-2 text-sm text-white outline-none focus:border-primary/60"
          placeholder={functionalPlaceholder}
          value={functionalReqs}
          onChange={(event) => syncFunctionalRequirement(event.target.value)}
        />
      )}

      {requirementMode === 'file' && (
        <div className="rounded-lg border border-dashed border-dark-700 bg-[#0f172a80] p-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Upload className="h-7 w-7 text-primary" />
            <div>
              <p className="text-sm font-semibold text-white">
                {requirementFile ? requirementFile.name : 'Upload requirement file'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Supported: .md, .txt, .docx, .pdf up to 10 MB</p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15">
              Choose file
              <input
                type="file"
                accept=".md,.txt,.docx,.pdf"
                className="hidden"
                onChange={(event) => setRequirementFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
      )}

      {requirementMode === 'link' && (
        <Input
          value={requirementUrl}
          onChange={(event) => setRequirementUrl(event.target.value)}
          placeholder="https://example.com/requirements.md"
          className="h-10 text-sm"
        />
      )}
    </div>
  );

  const renderConnectorStage = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-dark-700/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Spec source defaults</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            {CONNECTOR_TYPES.length} defaults are available. {cleanedConnectors.length} selected source{cleanedConnectors.length === 1 ? '' : 's'} will be sent to the agent.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateSelectedConnectorTypes(CONNECTOR_TYPES.map((item) => item.value))}
            className="rounded-full border border-dark-600 bg-dark-900/40 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-primary/35 hover:text-white"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => updateSelectedConnectorTypes([])}
            className="rounded-full border border-dark-600 bg-dark-900/40 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-red-400/35 hover:text-red-200"
          >
            Clear
          </button>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            <Search className="h-3.5 w-3.5" />
            60% minimum match
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {CONNECTOR_TYPES.map((item) => {
          const connector = connectors.find((draft) => draft.type === item.value);
          const configured = !!connector?.specs_endpoint?.trim();
          const active = activeConnectorType === item.value;
          const selected = selectedConnectorTypes.includes(item.value);
          const visual = CONNECTOR_VISUALS[item.value] || CONNECTOR_VISUALS.forgesphere;
          return (
            <div
              key={item.value}
              role="button"
              tabIndex={0}
              onClick={() => setActiveConnectorType(item.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveConnectorType(item.value);
                }
              }}
              className={cn(
                'group relative min-h-[132px] overflow-hidden rounded-lg border border-transparent bg-dark-900/20 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-dark-900/35',
                active
                  ? `${visual.active} shadow-[0_18px_50px_-36px_rgba(255,91,31,0.9)]`
                  : 'hover:border-dark-600',
                !selected && 'opacity-55',
              )}
            >
              <span className={cn('absolute inset-x-0 top-0 h-1', selected ? visual.accent : 'bg-slate-700')} />
              <span className="flex items-center justify-between gap-3">
                <span className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                  active && selected ? visual.icon : 'border-dark-600 bg-dark-800/50 text-slate-400 group-hover:border-dark-500',
                )}>
                  <Database className="h-4 w-4" />
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={selected}
                  aria-label={`${selected ? 'Exclude' : 'Include'} ${item.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleConnectorSelection(item.value);
                  }}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                    selected
                      ? 'border-green-400/45 bg-green-400/25 hover:bg-green-400/30'
                      : 'border-slate-500/45 bg-slate-700/70 hover:bg-slate-600/75',
                  )}
                >
                  <span className="sr-only">{selected ? 'Included' : 'Excluded'}</span>
                  <span className={cn(
                    'absolute left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform',
                    selected ? 'translate-x-5 bg-green-300' : 'translate-x-0 bg-slate-300',
                  )} />
                </button>
              </span>
              <span className={cn('mt-4 block truncate text-sm font-semibold', active ? 'text-white' : 'text-slate-100')}>
                {item.label}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">{connector?.name || `${item.label} Specs`}</span>
              <span className={cn(
                'mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold',
                configured ? 'text-green-300' : 'text-amber-300',
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', configured ? 'bg-green-400' : 'bg-amber-300')} />
                {configured ? 'Endpoint ready' : 'Needs endpoint'}
              </span>
            </div>
          );
        })}
      </div>

      <details className="group rounded-lg bg-dark-900/20 px-4 py-3">
        <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={cn('flex items-center gap-2 text-xs font-semibold uppercase tracking-wide', CONNECTOR_VISUALS[activeConnectorType]?.text || 'text-primary')}>
              <span className={cn('h-2 w-2 rounded-full', CONNECTOR_VISUALS[activeConnectorType]?.accent || 'bg-primary')} />
              {CONNECTOR_TYPES.find((item) => item.value === activeConnectorType)?.label || 'Connector'} defaults
              {!selectedConnectorTypes.includes(activeConnectorType) && (
                <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-300">
                  excluded from run
                </span>
              )}
            </div>
            <p className="mt-1 max-w-4xl truncate text-xs text-slate-500">{activeConnector.specs_endpoint}</p>
          </div>
          <span className="w-fit rounded-full border border-dark-600 bg-dark-800/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors group-open:border-primary/30 group-open:text-primary">
            Advanced defaults
          </span>
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
          <Input value={activeConnector.name} onChange={(event) => updateConnector(activeConnector.id, { name: event.target.value })} placeholder="Connector display name" className="h-10 text-sm" />
          <Input value={activeConnector.auth_header} onChange={(event) => updateConnector(activeConnector.id, { auth_header: event.target.value })} placeholder="Auth header" className="h-10 text-sm" />
        </div>
        <Input value={activeConnector.specs_endpoint} onChange={(event) => updateConnector(activeConnector.id, { specs_endpoint: event.target.value })} placeholder="https://connector-host/specs" className="mt-3 h-10 text-sm" />
        <Input value={activeConnector.auth_token} onChange={(event) => updateConnector(activeConnector.id, { auth_token: event.target.value })} placeholder="Bearer token or API key" className="mt-3 h-10 text-sm" type="password" />
      </details>

      {cleanedConnectors.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg bg-[linear-gradient(90deg,rgba(34,197,94,0.10),rgba(14,165,233,0.07),rgba(255,91,31,0.06))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-green-200">Ready for discovery</p>
          <div className="flex flex-wrap gap-2">
            {cleanedConnectors.map((connector) => (
              <span key={connector.type} className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold text-green-300">
                {connector.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-200">
          Select at least one connector with a ready endpoint to run discovery.
        </div>
      )}

      <button type="button" onClick={runFindSpecsFlow} disabled={isWorking || cleanedConnectors.length === 0 || !hasRequirementInput} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Connect, ingest requirement, and find specs
      </button>
    </div>
  );

  const renderRequirementStage = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(360px,0.38fr)]">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white">Functional requirement</h3>
          <p className="mt-1 text-sm text-slate-400">Edit the same requirement input used in the wizard, then rerun discovery when it changes.</p>
        </div>
        {renderRequirementTabs()}
        <button type="button" onClick={runFindSpecsFlow} disabled={isWorking || cleanedConnectors.length === 0 || !hasRequirementInput} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
          {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Update requirement and find specs
        </button>
      </div>

      <div className="space-y-3 border-l border-dark-700/80 pl-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <FileCode2 className="h-4 w-4 text-primary" />
          Stored Markdown
        </div>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-[#070d1d] p-4 text-xs leading-6 text-slate-300 ring-1 ring-dark-700/70">
          {ingestedMarkdown || requirementMarkdown || 'Requirement will appear here after ingestion.'}
        </pre>
      </div>
    </div>
  );

  const renderRecommendationSearchState = () => (
    <div className="relative overflow-hidden border border-primary/35 bg-[#0f172a]/80 p-6 shadow-[0_0_30px_rgba(255,91,31,0.08)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-primary/25 bg-primary/10" />
          <div className="absolute inset-1 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Search className="relative h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">Searching connected specs</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Gemini SearchSpecAgent is comparing the requirement against every loaded connector spec and applying the 60 percent match threshold.
        </p>

        <div className="mt-5 grid w-full max-w-3xl gap-3 md:grid-cols-3">
          <div className="border border-dark-700 bg-[#070d1d]/70 p-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{stageStatus.sources?.message || 'Connected specs loaded'}</p>
          </div>
          <div className="border border-dark-700 bg-[#070d1d]/70 p-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirement</p>
            <p className="mt-1 text-sm font-semibold text-green-300">{stageStatus.requirement?.message || 'Stored as Markdown'}</p>
          </div>
          <div className="border border-dark-700 bg-[#070d1d]/70 p-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Threshold</p>
            <p className="mt-1 text-sm font-semibold text-primary">60 percent minimum</p>
          </div>
        </div>

        <div className="mt-6 w-full max-w-3xl space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="overflow-hidden border border-dark-700 bg-[#070d1d]/70 p-4">
              <div className="h-3 w-1/3 animate-pulse bg-slate-700/70" />
              <div className="mt-3 h-2 w-full animate-pulse bg-slate-800" />
              <div className="mt-2 h-2 w-2/3 animate-pulse bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSpecSelectionRow = (item, selected, onSelect, { showSimilarity = true } = {}) => (
    <div
      key={item.recommendationId}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn('w-full cursor-pointer rounded-lg border p-4 text-left transition-all', selected ? 'border-primary/60 bg-primary/10 shadow-[0_0_18px_rgba(255,91,31,0.12)]' : 'border-dark-700 bg-[#0f172a]/70 hover:border-primary/40')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary text-white' : 'border-slate-600 text-transparent')}>
              <Check className="h-3.5 w-3.5" />
            </span>
            <p className="truncate text-sm font-semibold text-white">{item.name}</p>
          </div>
          <p className="mt-2 text-xs text-slate-400">{item.connectorName} / {item.connectorType} / {item.basePath || '/'}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {showSimilarity && (
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">{getPercent(item.similarity)}</span>
          )}
          {!showSimilarity && item.fileName && (
            <span className="max-w-[180px] truncate rounded-full border border-slate-600/60 bg-slate-700/20 px-2.5 py-1 text-xs font-semibold text-slate-300">{item.fileName}</span>
          )}
          <div className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
            <button type="button" title="View spec" onClick={() => onViewSpec?.(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecommendationsStage = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{recommendationListMode === 'manual' ? 'Manual spec selection' : 'Recommended specs'}</h3>
          <p className="mt-1 text-xs text-slate-400">
            {recommendationListMode === 'manual'
              ? 'Select any loaded connector spec for schema validation.'
              : 'Select one spec for schema validation, open the full manual list, or generate fresh from the requirement.'}
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {recommendationListMode === 'manual' ? (selectedManualSpecId ? '1/1 selected' : '0/1 selected') : `${selectedRecommendationIds.length}/1 selected`}
        </span>
      </div>

      {workingStage === 'recommendations' || stageStatus.recommendations?.status === 'active' ? (
        renderRecommendationSearchState()
      ) : recommendationListMode === 'recommended' && recommendations.length === 0 ? (
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/70 p-6 text-center">
          <FileJson className="mx-auto h-7 w-7 text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-white">No matching specs found</p>
          <p className="mt-1 text-xs text-slate-400">Adjust sources or requirement detail and search again.</p>
        </div>
      ) : recommendationListMode === 'manual' && isLoadingManualSpecs ? (
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/70 p-6 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-sm font-semibold text-white">Loading connector specs</p>
          <p className="mt-1 text-xs text-slate-400">Calling selected connector APIs and combining their specs.</p>
        </div>
      ) : recommendationListMode === 'manual' && sourceSpecs.length === 0 ? (
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/70 p-6 text-center">
          <FileJson className="mx-auto h-7 w-7 text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-white">No manual specs available</p>
          <p className="mt-1 text-xs text-slate-400">{manualSpecsError || 'Selected connector APIs did not return specs for manual selection.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendationListMode === 'manual' && manualSpecsError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-200">
              {manualSpecsError}
            </div>
          )}
          {(recommendationListMode === 'manual' ? paginatedManualSpecs : recommendations).map((item) => {
            const selected = selectedRecommendationIds.includes(item.recommendationId);
            const manualSelected = selectedManualSpecId === item.recommendationId;
            return renderSpecSelectionRow(
              item,
              recommendationListMode === 'manual' ? manualSelected : selected,
              () => (recommendationListMode === 'manual' ? toggleManualSpec(item.recommendationId) : toggleRecommendation(item.recommendationId)),
              { showSimilarity: recommendationListMode !== 'manual' },
            );
          })}
          {recommendationListMode === 'manual' && sourceSpecs.length > MANUAL_SPEC_PAGE_SIZE && (
            <div className="flex flex-col gap-3 rounded-lg border border-dark-700 bg-[#0f172a]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Showing {(safeManualSpecPage - 1) * MANUAL_SPEC_PAGE_SIZE + 1}-{Math.min(safeManualSpecPage * MANUAL_SPEC_PAGE_SIZE, sourceSpecs.length)} of {sourceSpecs.length}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setManualSpecPage((page) => Math.max(1, page - 1))} disabled={safeManualSpecPage === 1} className="h-8 rounded-lg border border-dark-600 px-3 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">
                  Previous
                </button>
                <span className="text-xs font-semibold text-slate-400">Page {safeManualSpecPage} of {manualSpecPageCount}</span>
                <button type="button" onClick={() => setManualSpecPage((page) => Math.min(manualSpecPageCount, page + 1))} disabled={safeManualSpecPage === manualSpecPageCount} className="h-8 rounded-lg border border-dark-600 px-3 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {workingStage !== 'recommendations' && stageStatus.recommendations?.status !== 'active' && (
        <div className="grid gap-3 md:grid-cols-3">
          <button type="button" onClick={() => continueToGenerationSettings({ fresh: true })} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary hover:bg-primary/15">
            Generate New Spec
          </button>
          <button type="button" onClick={() => { if (recommendationListMode === 'manual') { setRecommendationListMode('recommended'); return; } loadManualSpecsFromConnectors(); }} disabled={isLoadingManualSpecs} className={cn('inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', recommendationListMode === 'manual' ? 'border-slate-500/50 bg-slate-700/30 text-slate-200 hover:bg-slate-700/45' : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15')}>
            {isLoadingManualSpecs ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {recommendationListMode === 'manual' ? 'Show Recommendations' : 'Select Manual'}
          </button>
          <button type="button" onClick={recommendationListMode === 'manual' ? continueSelectedManualSpecToSchema : continueSelectedRecommendationToSchema} disabled={recommendationListMode === 'manual' ? !selectedManualSpecId || isLoadingManualSpecs : selectedRecommendationIds.length !== 1} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            Use selected spec for validation
          </button>
        </div>
      )}
    </div>
  );

  const renderGenerateStage = () => (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_120px_minmax(180px,0.45fr)_140px]">
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Recommended API name</Label>
          <Input value={generationOptions.apiName} onChange={(event) => setGenerationOptions((prev) => ({ ...prev, apiName: event.target.value }))} placeholder="Recommended API name" className="h-10 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Version</Label>
          <Input value={generationOptions.version} onChange={(event) => setGenerationOptions((prev) => ({ ...prev, version: event.target.value }))} placeholder="1.0.0" className="h-10 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Base path</Label>
          <Input value={generationOptions.basePath} onChange={(event) => setGenerationOptions((prev) => ({ ...prev, basePath: event.target.value }))} placeholder="/api/v1/resource" className="h-10 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">File type</Label>
          <select value={generationOptions.outputFormat} onChange={(event) => setGenerationOptions((prev) => ({ ...prev, outputFormat: event.target.value }))} className="h-10 w-full rounded-lg border border-dark-700 bg-[#0b1020] px-3 text-sm text-white outline-none focus:border-primary/60">
            <option value="yaml">YAML</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      <button type="button" onClick={generateSpec} disabled={isWorking || isRecommendingSettings} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isWorking || isRecommendingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isRecommendingSettings ? 'Recommending settings...' : 'Generate spec'}
      </button>

      {generatedSpec && (
        <div className={cn('grid gap-4', previewSpec ? 'xl:grid-cols-[minmax(320px,0.42fr)_minmax(420px,0.58fr)]' : 'grid-cols-1')}>
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              Generated spec review
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label className="text-xs text-green-100">Recommended API name</Label>
                <Input value={generatedApiName} onChange={(event) => updateGeneratedFields('name', event.target.value)} className="h-10 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-green-100">Recommended base path</Label>
                <Input value={generatedBaseUrl} onChange={(event) => updateGeneratedFields('baseUrl', event.target.value)} className="h-10 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => openPreviewEditor(generatedSpec)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-green-400/30 px-3 text-xs font-semibold text-green-200 hover:bg-green-400/10">
                <Edit3 className="h-4 w-4" />
                Preview and edit
              </button>
              <button type="button" onClick={() => useSpecForDesign(generatedSpec)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90">
                <Check className="h-4 w-4" />
                Use in API Design
              </button>
              <button type="button" onClick={runSchemaValidation} disabled={isPersistingForValidation} className="inline-flex h-9 items-center gap-2 rounded-lg border border-green-400/30 px-3 text-xs font-semibold text-green-200 hover:bg-green-400/10 disabled:cursor-not-allowed disabled:opacity-60">
                {isPersistingForValidation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Schema validation
              </button>
            </div>
          </div>

          {previewSpec && (
            <div className="min-w-0 rounded-lg border border-dark-700 bg-[#0f172a]/80">
              <div className="flex items-start justify-between gap-4 border-b border-dark-700 p-4">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileJson className="h-4 w-4 text-primary" />
                    Preview and edit generated spec
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-400">{previewSpec.fileName || previewSpec.name}</p>
                </div>
                <button type="button" onClick={() => setPreviewSpec(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" title="Close editor">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <textarea value={editingSpecContent} onChange={(event) => setEditingSpecContent(event.target.value)} spellCheck={false} className="min-h-[460px] w-full resize-y rounded-lg border border-dark-700 bg-[#0b1020] p-4 font-mono text-xs leading-6 text-slate-300 outline-none focus:border-primary/60" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dark-700 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Link2 className="h-4 w-4" />
                  {previewSpec.source || 'SpecForge Agent'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setPreviewSpec(null)} className="h-9 rounded-lg border border-dark-700 px-4 text-xs font-semibold text-slate-300 hover:bg-dark-800">Close</button>
                  <button type="button" onClick={savePreviewEdits} className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-semibold text-primary hover:bg-primary/15">
                    <Save className="h-4 w-4" />
                    Save edits
                  </button>
                  <button type="button" onClick={savePreviewEditsAndUse} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary/90">
                    <Check className="h-4 w-4" />
                    Use in API Design
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSchemaValidationStage = () => (
    <div className="-m-5 overflow-hidden border border-[#232942] bg-[#0b0f1e]">
      <div className="flex items-center gap-3 border-b border-[#232942] bg-[#161b2e] px-4 py-2.5">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-white">Schema Validation</span>
        {activeValidationSpec && (
          <>
            <span className="text-slate-600">/</span>
            <span className="max-w-[320px] truncate text-sm text-slate-300">{activeValidationSpec.name}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          {activeValidationSpec && (
            <>
              <button type="button" onClick={useValidatedSpecForDesign} className="inline-flex h-8 items-center gap-2 rounded-lg border border-green-400/30 bg-green-400/10 px-3 text-xs font-semibold text-green-200 hover:bg-green-400/15">
                <Check className="h-3.5 w-3.5" />
                Use in API Design
              </button>
              <button type="button" onClick={reopenSchemaValidation} disabled={isPersistingForValidation} className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
                {isPersistingForValidation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                {isPersistingForValidation ? 'Preparing spec...' : 'Open full validation'}
              </button>
            </>
          )}
        </div>
      </div>

      {!activeValidationSpec ? (
        <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
          <Shield className="mb-4 h-10 w-10 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Generate or select a spec first</p>
          <p className="mt-1 text-xs text-slate-500">The schema validation step needs OpenAPI content from generation or a recommendation.</p>
        </div>
      ) : (
        <div className="flex h-[min(720px,calc(100vh-260px))] min-h-[520px] items-stretch overflow-hidden">
          <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-[#232942] bg-[#0f172a]">
            <div className="border-b border-[#232942] p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <BookOpen className="h-3.5 w-3.5" />
                Field Standards
              </h3>
              <p className="mb-3 text-xs leading-5 text-slate-500">
                Upload a JSON rule file, then drag rules onto highlighted fields to fix issues.
              </p>
              <button type="button" onClick={reopenSchemaValidation} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                <Upload className="h-3.5 w-3.5" />
                Upload Rules File
              </button>
            </div>

            <div className="mt-auto shrink-0 space-y-2 border-t border-[#232942] p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Activity className="h-3.5 w-3.5" />
                Stats
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Schemas', value: schemaPreviewSchemas.length, color: 'text-white' },
                  { label: 'Fields', value: schemaFieldCount, color: 'text-white' },
                  { label: 'Valid', value: schemaFieldCount, color: 'text-green-400' },
                  { label: 'Issues', value: 0, color: 'text-green-400' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-[#232942] bg-[#161b2e] p-2.5 text-center">
                    <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b border-[#232942] bg-[#0f172a] px-4 py-2.5">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={schemaSearchTerm}
                  onChange={(event) => setSchemaSearchTerm(event.target.value)}
                  placeholder="Search schemas..."
                  className="w-full rounded-lg border border-[#232942] bg-[#161b2e] py-1.5 pl-8 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex items-center rounded-lg border border-[#232942] bg-[#0b0f1e] p-0.5">
                <button type="button" onClick={() => setSchemaViewMode('grid')} className={cn('rounded p-1.5 transition-colors', schemaViewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white')} title="Grid view">
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setSchemaViewMode('list')} className={cn('rounded p-1.5 transition-colors', schemaViewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white')} title="List view">
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              {schemaPreviewSchemas.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-medium text-green-400">All valid</span>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {schemaPreviewSchemas.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Database className="mb-4 h-12 w-12 text-slate-600" />
                  <p className="font-medium text-slate-400">No schemas found</p>
                  <p className="mt-1 text-sm text-slate-600">This spec has no component schemas or definitions.</p>
                </div>
              ) : filteredSchemaPreviewSchemas.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Search className="mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">No schemas match "{schemaSearchTerm}"</p>
                </div>
              ) : (
                <div className={schemaViewMode === 'grid' ? 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
                  {filteredSchemaPreviewSchemas.map((schema) => (
                    <AgentSchemaCard key={schema.name} schema={schema} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );

  const renderActiveStage = () => {
    if (activeStage === 'sources') return renderConnectorStage();
    if (activeStage === 'requirement') return renderRequirementStage();
    if (activeStage === 'recommendations') return renderRecommendationsStage();
    if (activeStage === 'generate') return renderGenerateStage();
    return renderSchemaValidationStage();
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label className="flex items-center gap-1.5 text-xs text-gray-300">
                Functional Requirements
                <InfoPopover type="functional" />
              </Label>
              <button type="button" onClick={openAgentPanel} disabled={!hasRequirementInput} className={cn('inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all', hasRequirementInput ? 'bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90' : 'cursor-not-allowed border border-dark-700 text-slate-500')}>
                <Wand2 className="h-4 w-4" />
                Enhance & Find Specs
              </button>
            </div>
            {renderRequirementTabs()}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-gray-300">
              Non-Functional Requirements
              <InfoPopover type="nonFunctional" />
            </Label>
            <textarea className="h-28 w-full resize-none rounded-lg border border-dark-700 bg-[#0f172a80] px-3 py-2 text-sm text-white outline-none focus:border-primary/60" placeholder={nonFunctionalPlaceholder} value={nonFunctionalReqs} onChange={(event) => syncNonFunctionalRequirement(event.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(metricFields || [
              { label: 'Expected TPS', placeholder: 'e.g., 1000' },
              { label: 'SLA (ms)', placeholder: 'e.g., 200' },
              { label: 'Availability (%)', placeholder: 'e.g., 99.9' },
            ]).map((field) => (
              <div key={field.label} className="space-y-2">
                <Label className="text-xs text-gray-300">{field.label}</Label>
                <Input placeholder={field.placeholder} className={field.className || 'h-9 text-sm'} value={field.value} onChange={field.onChange ? (event) => field.onChange(event.target.value) : undefined} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {agentPageOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[linear-gradient(180deg,#15192b_0%,#0e172a_46%,#111827_100%)] text-white">
          <div className="sticky top-0 z-10 border-b border-dark-700 bg-dark-800/95 shadow-soft backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-4 px-6 py-4">
              <button type="button" onClick={() => setAgentPageOpen(false)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-dark-600 bg-dark-900/45 px-3 text-xs font-semibold text-slate-300 transition-colors hover:border-primary/40 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to requirement
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Bot className="h-4 w-4" />
                  ForgeSphere Agent
                </div>
                <h3 className="mt-1 truncate text-lg font-bold text-white">Requirement ingestion and spec discovery</h3>
                {/* <p className="mt-1 truncate text-xs text-slate-400">Backend: {specForgeAgentService.baseUrl}</p> */}
              </div>
              <button type="button" onClick={() => setAgentPageOpen(false)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-dark-700/70 hover:text-white" title="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <main className="mx-auto w-full max-w-[1720px] px-6 py-6">
            <div className="px-1 py-3">
              <div className="grid gap-4 md:grid-cols-5">
                {FLOW_STAGES.map((stage, index) => {
                  const state = getStageState(stage.id);
                  const isActive = activeStage === stage.id;
                  const isComplete = state === 'complete';
                  const isError = state === 'error';
                  const isBeforeActive = index < FLOW_STAGES.findIndex((item) => item.id === activeStage);
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={async () => {
                        if (stage.id === 'generate') {
                          await hydrateGenerationDefaults();
                        }
                        setActiveStage(stage.id);
                      }}
                      className={cn(
                        'group relative min-h-[74px] rounded-lg px-1 py-2 text-left outline-none transition-all',
                        isActive
                          ? 'bg-primary/[0.06]'
                          : isComplete
                            ? 'bg-green-500/[0.04]'
                            : 'hover:bg-white/[0.025]',
                      )}
                    >
                      <span className="flex items-center">
                        <span className={cn(
                          'relative z-[1] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all',
                          isActive && 'border-primary bg-primary/15 shadow-[0_0_18px_rgba(255,91,31,0.22)]',
                          isComplete && !isActive && 'border-green-500/30 bg-green-500/10',
                          isError && 'border-red-500/40 bg-red-500/10',
                          !isActive && !isComplete && !isError && 'border-dark-600 bg-dark-800/55 group-hover:border-primary/35 group-hover:bg-primary/10',
                        )}>
                          {renderStageIcon(stage.id)}
                        </span>
                        {index < FLOW_STAGES.length - 1 && (
                          <span className={cn('ml-3 hidden h-px flex-1 md:block', isBeforeActive || isComplete ? 'bg-primary/80' : 'bg-dark-600/80')} />
                        )}
                      </span>
                      <span className="mt-2 block min-w-0">
                        <span className={cn('block truncate text-sm font-semibold transition-colors', isActive ? 'text-white' : 'text-slate-300 group-hover:text-white')}>
                          {stage.label}
                        </span>
                        <span className={cn('mt-1 block truncate text-xs', state === 'complete' && 'text-green-300', state === 'active' && 'text-primary', state === 'error' && 'text-red-300', state === 'idle' && 'text-slate-500')}>
                          {stageStatus[stage.id]?.message || state}
                        </span>
                      </span>
                      <span className="sr-only">Step {index + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mt-5 rounded-lg bg-dark-800/45 p-6 shadow-[0_24px_70px_-58px_rgba(255,91,31,0.7)]">
              {renderActiveStage()}
            </div>
          </main>
        </div>
      )}

    </>
  );
}

function AgentSchemaCard({ schema }) {
  const [expanded, setExpanded] = useState(true);
  const fields = Object.entries(schema.properties || {});

  return (
    <div className="overflow-hidden rounded-xl border border-[#232942] bg-[#161b2e]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#1a2438]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Braces className="h-4 w-4 flex-shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold text-white">{schema.name}</span>
          <span className="flex-shrink-0 text-xs text-slate-500">{fields.length} fields</span>
        </span>
        <ChevronRight className={cn('h-4 w-4 flex-shrink-0 text-slate-500 transition-transform', expanded && 'rotate-90')} />
      </button>

      {expanded && (
        <div className="divide-y divide-[#1a2035] border-t border-[#232942]">
          {fields.map(([name, field]) => (
            <AgentSchemaFieldRow
              key={name}
              name={name}
              field={field}
              required={schema.required?.includes(name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentSchemaFieldRow({ name, field, required }) {
  const type = normalizeSchemaType(field.type);
  const color = fieldTypeColor(type);

  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span
        className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
        style={{ background: `${color}22`, color }}
      >
        {type}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm text-slate-200">{name}</span>
          {required && <span className="text-[10px] font-bold text-primary">*</span>}
        </div>
        {field.format && <p className="mt-0.5 font-mono text-[10px] text-slate-500">{field.format}</p>}
      </div>
    </div>
  );
}
