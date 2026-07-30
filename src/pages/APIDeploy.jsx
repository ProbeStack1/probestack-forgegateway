import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  GitBranch,
  History,
  Key,
  Layers,
  LayoutDashboard,
  Loader2,
  Network,
  Puzzle,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Server,
  ServerCog,
  Shield,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { APIGEE_ENDPOINTS } from '../config/apigeeConfig';
import { apigeeApiFetch, initializeApigeeToken } from '../services/apigeeApiService';
import { deploymentService } from '../services/deploymentService';
import { onboardingService } from '../services/onboardingService';
import { mcpGenerationService } from '../services/mcpGenerationService';
import MCPApiDeployDetail from './mcp-generation/components/MCPApiDeployDetail';
import ApigeeMainPage from './Apigee/ApigeePage';
import { GridSkeleton, HistorySkeleton, ListSkeleton } from '../components/ui/SkeletonLoader';
import { getMicroserviceDeploymentUrlFromResource } from '../lib/deploymentUrl';
import GitHubDeploymentStatusPanel from '../components/GitHubDeploymentStatusPanel';

const API_CATEGORIES = [
  { id: 'microservice', label: 'Microservice', icon: Server, projectType: 'MICROSERVICE', description: 'Containerized services' },
  { id: 'apigee', label: 'Apigee X', icon: Shield, description: 'Proxy and gateway assets' },
  { id: 'kong', label: 'Kong Konnect', icon: Zap, description: 'Kong gateway services' },
  { id: 'mcp', label: 'MCP', icon: Puzzle, description: 'Model context servers' },
];

const APIGEE_SUBTYPES = [
  { id: 'proxy', label: 'API Proxy', icon: Network, projectType: 'APIGEE_PROXY', deploymentKey: 'apigee-api-proxy' },
  { id: 'shared-flow', label: 'Shared Flow', icon: GitBranch, projectType: 'APIGEE_SHARED_FLOW', deploymentKey: 'apigee-shared-flow' },
  { id: 'config', label: 'Config', icon: ServerCog },
];

const getApigeeSubtypes = (gatewayMode) => [
  {
    id: 'proxy',
    label: gatewayMode ? 'Proxy' : 'API Proxy',
    icon: Network,
    projectType: 'APIGEE_PROXY',
    deploymentKey: 'apigee-api-proxy',
  },
  {
    id: 'shared-flow',
    label: gatewayMode ? 'Shared Function' : 'Shared Flow',
    icon: GitBranch,
    projectType: 'APIGEE_SHARED_FLOW',
    deploymentKey: 'apigee-shared-flow',
  },
  {
    id: 'config',
    label: 'Config',
    icon: ServerCog,
  },
];

const KONG_SUBTYPES = [
  { id: 'gateway-service', label: 'Gateway Service', icon: Zap, projectType: 'KONG_GATEWAY_SERVICE', deploymentKey: 'kong-gateway-service' },
];

const DEPLOYMENT_TYPES = {
  MICROSERVICE: 'microservice',
  APIGEE_PROXY: 'apigee-api-proxy',
  APIGEE_SHARED_FLOW: 'apigee-shared-flow',
  KONG_GATEWAY_SERVICE: 'kong-gateway-service',
  MCP: 'mcp',
};

const isMicroserviceHistoryEntry = (entry) =>
  entry?.type === DEPLOYMENT_TYPES.MICROSERVICE || entry?.projectType === 'MICROSERVICE';

/**
 * MCP history entries flow through the same `mapHistory()` reshape as Apigee
 * + microservice rows but carry the MCP-only sidecar `mcpDetails`
 * (runId / runUrl / commitSha / deployedUrl / repoFullName / branch / …).
 * The catalog table and the DeploymentLogModal use this guard to swap in
 * MCP-shaped header/sidebar/log lines so we don't surface "Revision N/A"
 * for a GitHub-Actions-driven Cloud Run deploy.
 */
const isMcpHistoryEntry = (entry) =>
  entry?.type === DEPLOYMENT_TYPES.MCP
  || (entry?.projectType || '').toUpperCase() === 'MCP'
  || (entry?.resourceType || '').toLowerCase() === 'mcp';

/** Short-form commit/run id for the log subtitle ("abc1234"). */
const shortRef = (value, length = 7) =>
  value ? String(value).slice(0, length) : '';

const FALLBACK_APIGEE_ORGS = [
  { id: 'prod-org', label: 'prod-org', value: 'prod-org' },
  { id: 'dev-org', label: 'dev-org', value: 'dev-org' },
  { id: 'staging-org', label: 'staging-org', value: 'staging-org' },
];

const FALLBACK_APIGEE_ENVS = [
  { id: 'dev', label: 'dev', value: 'dev' },
  { id: 'test', label: 'test', value: 'test' },
  { id: 'staging', label: 'staging', value: 'staging' },
  { id: 'prod', label: 'prod', value: 'prod' },
];

const GENERIC_ENVS = [
  { id: 'development', label: 'Development', value: 'Development' },
  { id: 'testing', label: 'Testing', value: 'Testing' },
  { id: 'staging', label: 'Staging', value: 'Staging' },
  { id: 'production', label: 'Production', value: 'Production' },
];

const GITHUB_BASE_STAGES = [
  'Validate Request',
  'Dispatch GitHub Workflow',
  'Match Workflow Run',
];

const MCP_ITEMS = [
  {
    id: 'mcp-1',
    type: DEPLOYMENT_TYPES.MCP,
    name: 'Data Analysis MCP',
    version: 'v1.0.0',
    description: 'Model Context Protocol for data analysis',
    status: 'Ready',
    appId: 'MCP-2024-001',
    environment: 'development',
    governanceStatus: 88,
    testResultStatus: { passed: 8, total: 10 },
    updatedAt: Date.now(),
  },
];

// Friendly language labels for MCP runtime values (mirrors MCPCatalog).
const LANGUAGE_LABEL = {
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  raw: 'Raw',
};

const apiTypeForSubtype = (category, subtype) => {
  if (category?.id === 'microservice') return DEPLOYMENT_TYPES.MICROSERVICE;
  if (category?.id === 'mcp') return DEPLOYMENT_TYPES.MCP;
  if (category?.id === 'kong') return subtype?.deploymentKey || DEPLOYMENT_TYPES.KONG_GATEWAY_SERVICE;
  return subtype?.deploymentKey || DEPLOYMENT_TYPES.APIGEE_PROXY;
};

const normalizeTimestamp = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value) => {
  const parsed = normalizeTimestamp(value);
  if (!parsed) return 'N/A';
  return `${parsed.toLocaleDateString('en-CA')} ${parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
};

const formatLocalDateTime = (value) => {
  const parsed = normalizeTimestamp(value);
  if (!parsed) return 'N/A';
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const stableCommitId = (value) => {
  const source = String(value || 'artifact');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').slice(0, 8);
};

const artifactOptionLabel = (artifact, item) => {
  const version = artifact.artifactVersion || artifact.version || artifact.proxyVersion || item?.version || 'v1.0.0';
  const revision = artifact.apigeeRevision || artifact.revision || artifact.revisionNumber || 'N/A';
  const createdAt =
    artifact.createdAt ||
    artifact.created_at ||
    artifact.updatedAt ||
    artifact.timestamp ||
    artifact.deployedAt;
  const commitId = artifact.commitId || artifact.commitSha || artifact.gitCommitId || stableCommitId(artifact.artifactId || artifact.id || `${version}-${revision}`);
  const envs = Array.isArray(artifact.deployedEnvironments) ? artifact.deployedEnvironments : [];
  const envLabel = envs.map((env) => `[${env}]`).join(' ');
  return `${version}-rev${revision}-${commitId}-${formatLocalDateTime(createdAt)}${envLabel ? ` ${envLabel}` : ''}`;
};

const extractData = (response) => response?.data?.data ?? response?.data ?? response ?? [];

const normalizeEnv = (value) => (value || '').trim().toLowerCase();

const hasEnv = (values = [], environment) =>
  values.map(normalizeEnv).includes(normalizeEnv(environment));

const requiresChangeRequest = (environment) => ['prod', 'cert'].includes(normalizeEnv(environment));

const statusFromApi = (value) => {
  if (value === 'SUCCESS') return 'success';
  if (value === 'FAILED') return 'failed';
  if (value === 'IN_PROGRESS' || value === 'PENDING' || value === 'QUEUED') return 'pending';
  return 'pending';
};

const deploymentTypeFromHistory = (record, fallbackType) => {
  const projectType = (record?.projectType || '').toUpperCase();
  if (DEPLOYMENT_TYPES[projectType]) return DEPLOYMENT_TYPES[projectType];

  const resourceType = (record?.resourceType || '').toLowerCase();
  if (resourceType === 'apis') return DEPLOYMENT_TYPES.APIGEE_PROXY;
  if (resourceType === 'sharedflow' || resourceType === 'shared-flow') return DEPLOYMENT_TYPES.APIGEE_SHARED_FLOW;
  if (resourceType === 'kong') return DEPLOYMENT_TYPES.KONG_GATEWAY_SERVICE;
  if (resourceType === 'microservice') return DEPLOYMENT_TYPES.MICROSERVICE;
  if (resourceType === 'mcp') return DEPLOYMENT_TYPES.MCP;

  return fallbackType || DEPLOYMENT_TYPES.MICROSERVICE;
};

const statusStyles = {
  'Ready for Deployment': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  failed: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  // ── MCP item-level statuses (mirror microservice tone for parity) ──
  Deployed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  Failed: 'bg-rose-500/10    text-rose-300    border-rose-500/25',
  Pushed: 'bg-sky-500/10     text-sky-300     border-sky-500/25',
  Ready: 'bg-amber-500/10   text-amber-300   border-amber-500/25',
  Deploying: 'bg-blue-500/10    text-blue-300    border-blue-500/25',
  Draft: 'bg-slate-500/10   text-slate-300   border-slate-600/40',
};

const actionStyles = {
  create: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  generate: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  promote: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  rollback: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
};

const inputClassName =
  'h-10 w-full rounded-lg border border-slate-700/80 bg-[#0c1220] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60';

const typeIcons = {
  [DEPLOYMENT_TYPES.MICROSERVICE]: Server,
  [DEPLOYMENT_TYPES.APIGEE_PROXY]: Network,
  [DEPLOYMENT_TYPES.APIGEE_SHARED_FLOW]: GitBranch,
  [DEPLOYMENT_TYPES.KONG_GATEWAY_SERVICE]: Zap,
  [DEPLOYMENT_TYPES.MCP]: Puzzle,
  'apigee-target-server': ServerCog,
  'apigee-kvm': Key,
  'apigee-app': LayoutDashboard,
  'apigee-product': Box,
};

const typeLabels = {
  [DEPLOYMENT_TYPES.MICROSERVICE]: 'Microservice',
  [DEPLOYMENT_TYPES.APIGEE_PROXY]: 'Apigee Proxy',
  [DEPLOYMENT_TYPES.APIGEE_SHARED_FLOW]: 'Shared Flow',
  [DEPLOYMENT_TYPES.KONG_GATEWAY_SERVICE]: 'Kong Service',
  [DEPLOYMENT_TYPES.MCP]: 'MCP',
  'apigee-target-server': 'Backend Service',
  'apigee-kvm': 'KVM',
  'apigee-app': 'Developer App',
  'apigee-product': 'API Product',
};

const StatusIcon = ({ status }) => {
  if (status === 'success' || status === 'Ready for Deployment' || status === 'Ready' || status === 'Deployed') return <CheckCircle className="h-4 w-4" />;
  if (status === 'failed' || status === 'Failed') return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

const Badge = ({ children, className }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', className)}>
    {children}
  </span>
);

const formatTokenLabel = (value) => {
  if (!value) return 'N/A';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDeploymentType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['CI_CD', 'CICD', 'CI/CD'].includes(normalized)) return 'CI/CD';
  if (['MANAGEMENT_API', 'DIRECT', 'DIRECT_MANAGEMENT_API'].includes(normalized)) return 'Direct (Management API)';
  return formatTokenLabel(value);
};

const Panel = ({ children, className }) => (
  <section className={cn('rounded-2xl border border-slate-800/90 bg-[#171b2e]/92 shadow-[0_20px_60px_rgba(0,0,0,0.18)]', className)}>
    {children}
  </section>
);

export default function APIDeploy({ isGateway = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { microserviceId } = useParams();
  const [category, setCategory] = useState(API_CATEGORIES[0]);
  const [subtype, setSubtype] = useState(null);
  const [deploymentType, setDeploymentType] = useState(DEPLOYMENT_TYPES.MICROSERVICE);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState('');
  const [catalogView, setCatalogView] = useState('list');
  const { state } = location;
  // const isGateway = state?.isGateway || false;
  const gatewayBackPath = state?.from || '/gateway/environments';

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const [apigeeOrgs, setApigeeOrgs] = useState([]);
  const [apigeeEnvs, setApigeeEnvs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [envsLoading, setEnvsLoading] = useState(false);
  const [apigeeError, setApigeeError] = useState('');

  const [artifacts, setArtifacts] = useState([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState('');
  const [selectedArtifactId, setSelectedArtifactId] = useState('');

  const [action, setAction] = useState('promote');
  const [targetEnvironment, setTargetEnvironment] = useState('');
  const [apigeeOrg, setApigeeOrg] = useState('');
  const [serviceNowCr, setServiceNowCr] = useState('');
  const [serviceNowValidated, setServiceNowValidated] = useState(false);
  const [serviceNowValidating, setServiceNowValidating] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [operationStatus, setOperationStatus] = useState('idle');
  const [operationMessage, setOperationMessage] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const isApigeeManagementFlow =
    deploymentType === DEPLOYMENT_TYPES.APIGEE_PROXY ||
    deploymentType === DEPLOYMENT_TYPES.APIGEE_SHARED_FLOW;
  const isMicroserviceDeploymentFlow = deploymentType === DEPLOYMENT_TYPES.MICROSERVICE;
  const routeMode = location.pathname.endsWith('/history')
    ? 'history'
    : microserviceId
      ? 'detail'
      : 'catalog';

  // const activeSubtypes = category.id === 'apigee' ? APIGEE_SUBTYPES : category.id === 'kong' ? KONG_SUBTYPES : [];

  const filteredItems = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return items;
    return items.filter((item) =>
      [item.name, item.description, item.appId, item.apigeeProxyName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(cleanQuery))
    );
  }, [items, query]);

  useEffect(() => {
    if (isGateway) {
      const apigeeCategory = API_CATEGORIES.find(c => c.id === 'apigee');
      if (apigeeCategory && category.id !== apigeeCategory.id) {
        setCategory(apigeeCategory);
      }
      // Do NOT force subtype; let the user select from the subtype row
      if (category.id === 'apigee' && (!subtype || subtype.id !== 'proxy')) {
        setSubtype(APIGEE_SUBTYPES[0]);
      }
    }
  }, [isGateway]);

  useEffect(() => {
    if (routeMode !== 'history') return;

    // If gateway mode, force category to apigee and subtype to proxy? Or keep subtype as per URL but ensure category is apigee.
    if (isGateway) {
      const apigeeCategory = API_CATEGORIES.find(c => c.id === 'apigee');
      if (apigeeCategory && category.id !== apigeeCategory.id) {
        setCategory(apigeeCategory);
      }
      // Optionally, if subtype is not valid for apigee, set to proxy
      if (subtype && !APIGEE_SUBTYPES.some(s => s.id === subtype.id)) {
        setSubtype(APIGEE_SUBTYPES[0]);
      }
      return; // skip reading from URL params because we want to enforce gateway behavior
    }

    // Normal history mode: read from URL params
    const params = new URLSearchParams(location.search);
    // ... rest
  }, [isGateway, routeMode, category.id, location.search, subtype?.id]);
  // useEffect(() => {
  //   if (routeMode !== 'history') return;
  //   const params = new URLSearchParams(location.search);
  //   const categoryFilter = params.get('category');
  //   const subtypeFilter = params.get('subtype');
  //   const proxyFilter = params.get('proxy');

  //   if (categoryFilter) {
  //     const nextCategory = API_CATEGORIES.find((entry) => entry.id === categoryFilter);
  //     if (nextCategory && nextCategory.id !== category.id) setCategory(nextCategory);
  //   }
  //   if (subtypeFilter) {
  //     const nextSubtype = [...APIGEE_SUBTYPES, ...KONG_SUBTYPES].find((entry) => entry.id === subtypeFilter);
  //     if (nextSubtype && nextSubtype.id !== subtype?.id) setSubtype(nextSubtype);
  //   }
  //   if (proxyFilter) setQuery(proxyFilter);
  // }, [category.id, location.search, routeMode, subtype?.id]);

  const selectedArtifact = artifacts.find((artifact) => artifact.artifactId === selectedArtifactId);

  const rollbackArtifact = useMemo(() => {
    if (!targetEnvironment) return null;
    return artifacts.find((artifact) => hasEnv(artifact.canRollbackIn, targetEnvironment)) || null;
  }, [artifacts, targetEnvironment]);

  const resolveArtifactForAction = (artifactList = artifacts) => {
    if (action === 'rollback') {
      return artifactList.find((artifact) => hasEnv(artifact.canRollbackIn, targetEnvironment)) || null;
    }
    return artifactList.find((artifact) => !hasEnv(artifact.deployedEnvironments, targetEnvironment)) || artifactList[0] || null;
  };

  // useEffect(() => {
  //   if (category.id === 'apigee') {
  //     setSubtype(APIGEE_SUBTYPES[0]);
  //   } else if (category.id === 'kong') {
  //     setSubtype(KONG_SUBTYPES[0]);
  //   } else {
  //     setSubtype(null);
  //   }
  //   setSelectedItem(null);
  // }, [category.id]);

  useEffect(() => {
    loadDeployableItems();
  }, [category.id, subtype?.id]);

  useEffect(() => {
    if (!microserviceId || items.length === 0) return;
    const match = items.find((item) => item.id === microserviceId);
    if (match && match.id !== selectedItem?.id) {
      selectItem(match);
    }
  }, [microserviceId, items, selectedItem?.id]);

  useEffect(() => {
    if (selectedItem && (isApigeeManagementFlow || isMicroserviceDeploymentFlow)) {
      loadApigeeOrganizations();
      loadArtifacts(selectedItem, { keepSelection: false });
    }
  }, [selectedItem?.id, deploymentType]);

  useEffect(() => {
    if (isApigeeManagementFlow && apigeeOrg) {
      loadApigeeEnvironments(apigeeOrg);
    } else {
      setApigeeEnvs([]);
    }
  }, [apigeeOrg, isApigeeManagementFlow]);

  useEffect(() => {
    if (!(isApigeeManagementFlow || isMicroserviceDeploymentFlow) || action !== 'rollback') return;
    setSelectedArtifactId(rollbackArtifact?.artifactId || '');
    setOperationError('');
  }, [action, rollbackArtifact?.artifactId, isApigeeManagementFlow, isMicroserviceDeploymentFlow]);

  const activeSubtypes = useMemo(() => {
    if (category.id === 'apigee') return getApigeeSubtypes(isGateway);
    if (category.id === 'kong') return KONG_SUBTYPES;
    return [];
  }, [category.id, isGateway]);

  // Update the useEffect that sets subtype when category changes
  useEffect(() => {
    if (category.id === 'apigee') {
      const subtypes = getApigeeSubtypes(isGateway);
      setSubtype(subtypes[0]);   // now uses dynamic array
    } else if (category.id === 'kong') {
      setSubtype(KONG_SUBTYPES[0]);
    } else {
      setSubtype(null);
    }
    setSelectedItem(null);
  }, [category.id, isGateway]);
  const resetConfiguration = () => {
    setAction('promote');
    setTargetEnvironment('');
    setApigeeOrg('');
    setServiceNowCr('');
    setServiceNowValidated(false);
    setServiceNowValidating(false);
    setOperationError('');
    setOperationStatus('idle');
    setOperationMessage('');
    setArtifacts([]);
    setSelectedArtifactId('');
    setArtifactsError('');
  };

  const normalizeApigeeNameList = (data, primaryKey) => {
    const list = Array.isArray(data) ? data : Array.isArray(data?.[primaryKey]) ? data[primaryKey] : [];
    return list
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.displayName || item?.id || item?.organization))
      .filter(Boolean);
  };

  const mapDeploymentCandidate = (item, deploymentKey, projectTypeFallback) => {
    const microservice = item?.microservice || {};
    const requirement = item?.requirement || {};
    const apiDesign = item?.apiDesign || {};
    const specMetadata = apiDesign?.specMetadata || {};
    const mockApi = item?.mockApi || {};
    const codeGenResults = Array.isArray(item?.codeGenResults) ? item.codeGenResults : [];
    const successfulCodeGen = codeGenResults.find((result) => result?.status === 'SUCCESS') || codeGenResults[0] || {};
    const deploymentUrl = deploymentKey === DEPLOYMENT_TYPES.MICROSERVICE
      ? getMicroserviceDeploymentUrlFromResource(item)
      : '';
    const testCases = Array.isArray(item?.testCases) ? item.testCases : [];
    const updatedAt = successfulCodeGen.updatedAt || mockApi.updatedAt || specMetadata.uploadedAt || microservice.expectedGoLiveDate;
    const status = apiDesign?.id || successfulCodeGen?.status === 'SUCCESS' ? 'Ready for Deployment' : 'Pending Code Generation';
    const version = item?.projectMetadata?.version || '1.0.0';

    return {
      id: microservice.id || item.id,
      type: deploymentKey,
      projectType: projectTypeFallback,
      organizationId: microservice.organizationId || item.organizationId || requirement.organizationId,
      name: microservice.apiName || specMetadata.specName || successfulCodeGen.artifactId || 'Unnamed Service',
      apigeeProxyName: successfulCodeGen.artifactId || microservice.applicationName || specMetadata.specName || 'Unnamed Service',
      appId: microservice.applicationId || 'N/A',
      version: `v${version}`,
      description: requirement.functionalRequirements || specMetadata.fileName || 'No description available',
      status,
      environment: successfulCodeGen.environment || (status === 'Ready' ? 'staging' : 'development'),
      governanceStatus: requirement?.id && apiDesign?.id ? 95 : 70,
      testResultStatus: { passed: testCases.length || (status === 'Ready' ? 10 : 7), total: testCases.length || 10 },
      updatedAt: normalizeTimestamp(updatedAt)?.getTime() || Date.now(),
      deploymentUrl,
    };
  };

  const mapHistory = (records, fallbackItem = selectedItem) =>
    (Array.isArray(records) ? records : []).map((record) => ({
      id: record.deploymentId || record.id,
      microserviceId: record.microserviceId || record.microservice?.id || fallbackItem?.id,
      type: deploymentTypeFromHistory(record, fallbackItem?.type || deploymentType),
      projectType: record.projectType || fallbackItem?.projectType,
      resourceType: record.resourceType,
      name: record.apigeeProxyName || fallbackItem?.name || 'Deployment',
      environment: record.targetEnvironment || 'N/A',
      status: statusFromApi(record.status),
      action: (record.action || 'PROMOTE').toLowerCase(),
      deploymentType: formatDeploymentType(record.deploymentType || record.deploymentMethod || record.method || 'MANAGEMENT_API'),
      method: record.method || 'MANAGEMENT_API',
      deployedAt: formatDateTime(record.completedAt || record.startedAt),
      deploymentUrl:
        fallbackItem?.type === DEPLOYMENT_TYPES.MICROSERVICE
          ? fallbackItem?.deploymentUrl || ''
          : fallbackItem?.type === DEPLOYMENT_TYPES.MCP
            ? (record.responsePayload?.deployedUrl || fallbackItem?.deployedUrl || '')
            : '',
      artifactLabel: record.artifactLabel || (record.apigeeRevision ? `Revision ${record.apigeeRevision}` : 'N/A'),
      lastDeployedOn: formatDateTime(record.completedAt || record.startedAt),
      apigeeOrg: record.apigeeOrg,
      apigeeProxyName: record.apigeeProxyName,
      apigeeRevision: record.apigeeRevision,
      sourceEnvironment: record.sourceEnvironment,
      rollbackFromRevision: record.rollbackFromRevision,
      rollbackToRevision: record.rollbackToRevision,
      // MCP-only sidecar (undefined for non-MCP rows).
      mcpDetails: record.mcpDetails,
      serviceNowCr: record.serviceNowCr || record.serviceNowCR,
      responsePayload: record.responsePayload || record.errorResponse || record.response || record.apiResponse,
      errorMessage: record.errorMessage || record.error || record.failureReason || record.message,
      updatedAt: normalizeTimestamp(record.lastUploadedOn || record.uploadedAt || record.artifactUploadedAt || record.completedAt || record.startedAt || record.createdAt)?.getTime() || 0,
    }));

  const loadDeployableItems = async () => {
    setItemsLoading(true);
    setItemsError('');
    setSelectedItem(null);
    resetConfiguration();

    try {
      let fetchedItems = [];
      let nextDeploymentType = apiTypeForSubtype(category, subtype);

      if (category.id === 'mcp') {
        // Pull MCP servers from the MCP Generation service. Empty list
        // when none exist — NO dummy fallback (per "no N/A, no
        // hardcoded data" rule). Only fields actually present on the
        // McpProject document are surfaced; missing optional fields
        // are omitted entirely so the row renderer can hide them.
        try {
          const res = await mcpGenerationService.listProjects({});
          if (res.success && Array.isArray(res.data)) {
            fetchedItems = res.data.map((p) => {
              const id = p.identity || {};
              const ob = p.onboarding || {};
              const gen = p.generated || {};
              // Deploy status from the real workflow run + deployed
              // service URL written back by the bridge.
              const conclusion = (p.latestRunConclusion || '').toLowerCase();
              let status;
              if (p.deployedServiceUrl) status = 'Deployed';
              else if (conclusion === 'failure') status = 'Failed';
              else if (p.pushedAt) status = 'Pushed';
              else if (gen.files && gen.files.length) status = 'Ready';
              else status = 'Draft';

              const row = {
                id: p.id,
                type: DEPLOYMENT_TYPES.MCP,
                name: id.displayName || id.slug || p.id,
                status,
                raw: p,
              };
              // Version cell — MCP servers don't always set an identity
              // version (user complaint: "agar version hai to dikhao
              // warna column hata do"). Fall back to the runtime
              // language version (e.g. "TypeScript 20") so the column
              // is always populated with something meaningful; only
              // when neither is set do we drop the field entirely so
              // the row renderer's `{item.version}` shows an em-dash.
              const rt = p.runtime || {};
              // Pretty-print language + version: "typescript node20"
              // → "TypeScript Node 20". Falls back to raw values when
              // the LANGUAGE_LABEL map / version doesn't match.
              const langPretty = rt.language
                ? (LANGUAGE_LABEL[rt.language] || rt.language.charAt(0).toUpperCase() + rt.language.slice(1))
                : null;
              const versionPretty = rt.languageVersion
                ? String(rt.languageVersion).replace(/^(node|python|java|jdk)(\d+)$/i, (_, k, v) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`)
                : null;
              const runtimeLabel = langPretty
                ? (versionPretty ? `${langPretty} ${versionPretty}` : langPretty)
                : null;
              // Prefer the MCP server's own id.version (e.g. "v1.0.0")
              // when set; otherwise show the cleaned runtime label so
              // the column is never empty.
              if (id.version) row.version = id.version;
              else if (runtimeLabel) row.version = runtimeLabel;
              if (id.summary) row.description = id.summary;
              if (ob.applicationId) row.appId = ob.applicationId;
              if (ob.applicationName) row.applicationName = ob.applicationName;
              // BOTH field names — `deployedUrl` keeps the
              // back-compatible alias for any callers that grep on the
              // older spelling, and `deploymentUrl` is what the row
              // renderer (`DeployableRow`) + grid card actually read.
              // Without the second one the catalog stuck on
              // `DEPLOYMENT URL: N/A` even after the URL was scraped.
              if (p.deployedServiceUrl) {
                row.deployedUrl = p.deployedServiceUrl;
                row.deploymentUrl = p.deployedServiceUrl;
              }
              if (p.pushedRepoUrl) row.repoUrl = p.pushedRepoUrl;
              if (p.latestRunUrl) row.latestRunUrl = p.latestRunUrl;
              if (p.latestRunConclusion) row.latestConclusion = p.latestRunConclusion;
              if (p.updatedAt || p.createdAt) row.updatedAt = p.updatedAt || p.createdAt;
              return row;
            });
          } else {
            fetchedItems = [];
          }
        } catch (_e) {
          fetchedItems = [];
        }
      } else {
        const projectType =
          category.id === 'microservice'
            ? category.projectType
            : subtype?.projectType;
        if (!projectType) {
          setItems([]);
          setDeploymentType(nextDeploymentType);
          setHistory([]);
          return;
        }

        const result = await onboardingService.getAllByProjectType(projectType);
        if (!result.success) {
          throw new Error(result.error || 'Unable to load deployable items');
        }

        fetchedItems = (result.data?.data || []).map((entry) =>
          mapDeploymentCandidate(entry, nextDeploymentType, projectType)
        );
      }

      setDeploymentType(nextDeploymentType);
      setItems(fetchedItems);
      await loadHistoryForItems(fetchedItems);
    } catch (error) {
      console.error('Error loading deployable items:', error);
      setItems([]);
      setHistory([]);
      setItemsError(error.message || 'Unable to load deployable items');
    } finally {
      setItemsLoading(false);
    }
  };

  const loadHistoryForItems = async (visibleItems = items) => {
    const ids = visibleItems.map((item) => item.id).filter(Boolean);
    if (ids.length === 0) {
      setHistory([]);
      setHistoryError('');
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    // ── MCP rows: fetch deploy history from OUR audit endpoint ───────
    // The senior team's bulk-history endpoint indexes only the
    // `deployment_history` collection — MCP servers persist their
    // history under `mcp_projects.auditTrail.deployHistory` instead.
    // We therefore fan out one `/audit` call per MCP and reshape the
    // entries into the same record format `mapHistory()` accepts so
    // the rest of the table renders identically. Non-MCP items
    // continue to use the senior bulk endpoint.
    const mcpItems = visibleItems.filter((i) => i.type === DEPLOYMENT_TYPES.MCP);
    const otherItems = visibleItems.filter((i) => i.type !== DEPLOYMENT_TYPES.MCP);

    try {
      const tasks = [];

      // 1) Senior bulk endpoint for non-MCP rows.
      if (otherItems.length > 0) {
        const ids2 = otherItems.map((i) => i.id);
        tasks.push(
          deploymentService.getDeploymentHistoryBulk(ids2).then((res) => {
            if (!res.success) throw new Error(res.error || 'Unable to load deployment history');
            const byMicroservice = extractData(res);
            return otherItems.flatMap((item) =>
              mapHistory(byMicroservice?.[item.id] || [], item)
            );
          })
        );
      }

      // 2) Our audit endpoint per MCP row, transformed into the
      //    record shape `mapHistory()` consumes. We surface MCP-only
      //    fields (repo, commit, run URL, deployed URL, rollback
      //    linkage) as first-class entries so the row renderer can
      //    show real values instead of N/A placeholders meant for
      //    Apigee artifacts.
      for (const item of mcpItems) {
        tasks.push(
          mcpGenerationService.getAudit(item.id).then((res) => {
            if (!res.success) return [];
            const trail = (res.data && res.data.deployHistory ? res.data
              : (res.data?.data || {})) || {};
            const entries = Array.isArray(trail.deployHistory) ? trail.deployHistory : [];
            const records = entries.map((d) => ({
              deploymentId: d.runId,
              microserviceId: item.id,
              projectType: 'MCP',
              resourceType: 'mcp',
              apigeeProxyName: item.name,
              status: mcpStatusToSenior(d.conclusion, d.status),
              action: d.rolledBackFrom ? 'ROLLBACK' : 'DEPLOY',
              method: 'GITHUB_ACTIONS',
              deploymentType: 'GitHub Actions',
              startedAt: d.by?.timestamp,
              completedAt: d.by?.timestamp,
              createdAt: d.by?.timestamp,
              artifactLabel: d.commitSha ? `Commit ${String(d.commitSha).slice(0, 7)}` : `Run ${d.runId || ''}`,
              errorMessage: d.failedReason,
              // Rollback linkage: when the run is a rollback, the
              // original deploy lives under `rolledBackFrom` (a runId)
              // and the rollback head is `runId` itself.
              rollbackFromRevision: d.rolledBackFrom || null,
              rollbackToRevision: d.rolledBackFrom ? d.runId : null,
              // MCP-only sidecars consumed by HistoryRow's MCP branch.
              mcpDetails: {
                runId: d.runId,
                runUrl: d.runUrl,
                commitSha: d.commitSha,
                deployedUrl: d.deployedUrl,
                failedStep: d.failedStep,
                durationMs: d.durationMs,
                triggeredBy: d.by?.email,
                repoFullName: item.raw?.pushedRepoFullName,
                branch: item.raw?.pushedBranch,
              },
              responsePayload: { runUrl: d.runUrl, deployedUrl: d.deployedUrl, failedStep: d.failedStep },
            }));
            return mapHistory(records, item);
          })
        );
      }

      const chunks = await Promise.all(tasks);
      const mapped = chunks.flat().sort((left, right) => right.updatedAt - left.updatedAt);
      setHistory(mapped);
    } catch (error) {
      console.error('Error loading deployment history:', error);
      setHistory([]);
      setHistoryError(error.message || 'Unable to load deployment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // GitHub conclusion → senior-style uppercase status the row renderer
  // already understands ("SUCCESS" / "FAILED" / "IN_PROGRESS").
  const mcpStatusToSenior = (conclusion, status) => {
    if (!status || status === 'in_progress' || status === 'queued') return 'IN_PROGRESS';
    if ((conclusion || '').toLowerCase() === 'success') return 'SUCCESS';
    if (['failure', 'cancelled', 'timed_out'].includes((conclusion || '').toLowerCase())) return 'FAILED';
    return 'COMPLETED';
  };

  const loadApigeeOrganizations = async () => {
    if (!isApigeeManagementFlow) return;
    setOrgsLoading(true);
    setApigeeError('');

    try {
      await initializeApigeeToken();
      const response = await apigeeApiFetch(APIGEE_ENDPOINTS.ORGANIZATIONS.LIST);
      if (!response.ok) throw new Error('Unable to load Apigee organizations');
      const data = await response.json();
      const orgs = normalizeApigeeNameList(data, 'organizations').map((name) => ({
        id: name,
        label: name,
        value: name,
      }));
      setApigeeOrgs(orgs);
    } catch (error) {
      console.error('Error loading Apigee organizations:', error);
      setApigeeError(error.message || 'Unable to load Apigee organizations');
    } finally {
      setOrgsLoading(false);
    }
  };

  const loadApigeeEnvironments = async (organization) => {
    setEnvsLoading(true);
    setApigeeError('');

    try {
      const response = await apigeeApiFetch(APIGEE_ENDPOINTS.ENVIRONMENT.LIST(organization));
      if (!response.ok) throw new Error('Unable to load Apigee environments');
      const data = await response.json();
      const envs = normalizeApigeeNameList(data, 'environments').map((name) => ({
        id: name,
        label: name,
        value: name,
      }));
      setApigeeEnvs(envs);
    } catch (error) {
      console.error('Error loading Apigee environments:', error);
      setApigeeError(error.message || 'Unable to load Apigee environments');
    } finally {
      setEnvsLoading(false);
    }
  };

  const loadArtifacts = async (item = selectedItem, options = {}) => {
    if (!item?.id) return;
    setArtifactsLoading(true);
    setArtifactsError('');

    const result = await deploymentService.getDeploymentArtifacts(item.id);
    if (result.success) {
      const records = extractData(result);
      const nextArtifacts = Array.isArray(records) ? records : [];
      setArtifacts(nextArtifacts);
      setSelectedArtifactId((current) =>
        options.keepSelection && current
          ? current
          : nextArtifacts[0]?.artifactId || ''
      );
    } else {
      setArtifacts([]);
      setSelectedArtifactId('');
      setArtifactsError(result.error || 'Unable to load deployment artifacts');
    }

    setArtifactsLoading(false);
  };

  const syncArtifacts = async () => {
    if (!selectedItem?.id) return;
    if (!apigeeOrg) {
      setArtifactsError('Select an Apigee organization first');
      return;
    }

    setArtifactsLoading(true);
    setArtifactsError('');

    const payload = {
      organizationId: selectedItem.organizationId,
      projectType: selectedItem.projectType,
      artifactVersion: selectedItem.version,
      apigeeOrg,
      apigeeProxyName: selectedItem.apigeeProxyName,
    };

    const result = await deploymentService.syncDeploymentArtifacts(selectedItem.id, payload);
    if (result.success) {
      const records = extractData(result);
      const nextArtifacts = Array.isArray(records) ? records : [];
      setArtifacts(nextArtifacts);
      setSelectedArtifactId(nextArtifacts[0]?.artifactId || '');
    } else {
      setArtifactsError(result.error || 'Unable to sync revisions');
    }

    setArtifactsLoading(false);
  };

  const validateServiceNow = () => {
    setServiceNowValidating(true);
    window.setTimeout(() => {
      setServiceNowValidated(true);
      setServiceNowValidating(false);
    }, 800);
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setAction('promote');
    setTargetEnvironment('');
    setServiceNowCr('');
    setServiceNowValidated(false);
    setOperationError('');
    setOperationStatus('idle');
    setOperationMessage('');
  };

  const openDeployPage = (item) => {
    selectItem(item);
    // navigate(`/api-deploy/${item.id}/deploy`);
    navigate(`${item.id}/deploy`, { relative: 'path' });
  };

  const selectAction = (nextAction) => {
    setAction(nextAction);
    setOperationError('');
    if (nextAction === 'promote' && !selectedArtifactId && artifacts[0]) {
      setSelectedArtifactId(artifacts[0].artifactId);
    }
  };

  const runDeployment = async () => {
    setOperationError('');
    setOperationMessage('');

    if (!selectedItem) {
      setOperationError('Select an API first');
      return false;
    }
    if (!targetEnvironment) {
      setOperationError('Select a target environment');
      return false;
    }
    if (requiresChangeRequest(targetEnvironment) && (!serviceNowCr || !serviceNowValidated)) {
      setOperationError('Validate a ServiceNow CR before deployment');
      return false;
    }

    const isMicroserviceFlow = selectedItem.type === DEPLOYMENT_TYPES.MICROSERVICE;

    if (!isApigeeManagementFlow && !isMicroserviceFlow) {
      setOperationStatus('success');
      setOperationMessage('Deployment request prepared for this API type');
      return true;
    }

    if (isApigeeManagementFlow && !apigeeOrg) {
      setOperationError('Select an Apigee organization');
      return false;
    }
    if (!selectedArtifactId) {
      setOperationError(action === 'rollback' ? 'No eligible rollback revision found' : 'Select a revision');
      return false;
    }
    if (action === 'rollback' && rollbackArtifact?.artifactId !== selectedArtifactId) {
      setOperationError('Rollback can only use the previous deployed revision for this environment');
      return false;
    }
    if (action === 'promote' && hasEnv(selectedArtifact?.deployedEnvironments, targetEnvironment)) {
      setOperationError('This revision is already deployed to the selected environment');
      return false;
    }

    setOperationStatus('running');

    const payload = {
      targetEnvironment,
      ...(serviceNowCr ? { serviceNowCr } : {}),
    };

    const result = isMicroserviceFlow
      ? action === 'rollback'
        ? await deploymentService.rollbackDeploymentGithubAndPoll(selectedItem.id, {
          ...payload,
          rollbackToArtifactId: selectedArtifactId,
        })
        : await deploymentService.promoteDeploymentGithubAndPoll(selectedItem.id, {
          ...payload,
          artifactId: selectedArtifactId,
          ...(selectedArtifact?.bundleUrl ? { zipUrl: selectedArtifact.bundleUrl } : {}),
        })
      : action === 'rollback'
        ? await deploymentService.rollbackDeployment(selectedItem.id, {
          ...payload,
          rollbackToArtifactId: selectedArtifactId,
        })
        : await deploymentService.promoteDeployment(selectedItem.id, {
          ...payload,
          artifactId: selectedArtifactId,
        });

    const microserviceFinalStatus = result.finalEvent?.status;
    const microserviceCompleted = !isMicroserviceFlow || ['SUCCESS', 'TRIGGERED'].includes(microserviceFinalStatus);

    if (result.success && microserviceCompleted) {
      setOperationStatus('success');
      setOperationMessage(
        result.finalEvent?.message ||
        result.data?.message ||
        `${action === 'rollback' ? 'Rollback' : 'Promote'} completed`
      );
      await Promise.all([
        loadArtifacts(selectedItem, { keepSelection: true }),
        loadHistoryForItems(items),
      ]);
      return true;
    }

    setOperationStatus('failed');
    setOperationError(result.error || result.finalEvent?.message || 'Deployment failed');
    await loadHistoryForItems(items);
    return false;
  };

  const runCicdDeploymentAndPoll = async (onEvent) => {
    setOperationError('');
    setOperationMessage('');

    if (!selectedItem) {
      setOperationError('Select an API first');
      return { success: false, error: 'Select an API first' };
    }
    if (!targetEnvironment) {
      setOperationError('Select a target environment');
      return { success: false, error: 'Select a target environment' };
    }
    if (!apigeeOrg) {
      setOperationError('Select an Apigee organization');
      return { success: false, error: 'Select an Apigee organization' };
    }
    if (requiresChangeRequest(targetEnvironment) && (!serviceNowCr || !serviceNowValidated)) {
      setOperationError('Validate a ServiceNow CR before deployment');
      return { success: false, error: 'Validate a ServiceNow CR before deployment' };
    }
    let effectiveArtifactId = selectedArtifactId;
    let effectiveArtifact = selectedArtifact;
    let effectiveRollbackArtifact = rollbackArtifact;

    if (!effectiveArtifactId) {
      setOperationMessage('Syncing Apigee revisions before starting CI/CD...');
      const syncPayload = {
        organizationId: selectedItem.organizationId,
        projectType: selectedItem.projectType,
        artifactVersion: selectedItem.version,
        apigeeOrg,
        apigeeProxyName: selectedItem.apigeeProxyName,
      };
      const syncResult = await deploymentService.syncDeploymentArtifacts(selectedItem.id, syncPayload);
      if (!syncResult.success) {
        const message = syncResult.error || 'Unable to sync Apigee revisions';
        setOperationError(message);
        return { success: false, error: message };
      }

      const syncedArtifacts = extractData(syncResult);
      const nextArtifacts = Array.isArray(syncedArtifacts) ? syncedArtifacts : [];
      setArtifacts(nextArtifacts);
      const resolvedArtifact = resolveArtifactForAction(nextArtifacts);
      if (!resolvedArtifact?.artifactId) {
        const message = action === 'rollback' ? 'No eligible rollback revision found' : 'No deployable revision found';
        setOperationError(message);
        return { success: false, error: message };
      }

      effectiveArtifactId = resolvedArtifact.artifactId;
      effectiveArtifact = resolvedArtifact;
      effectiveRollbackArtifact = action === 'rollback' ? resolvedArtifact : effectiveRollbackArtifact;
      setSelectedArtifactId(effectiveArtifactId);
    }

    if (action === 'rollback' && effectiveRollbackArtifact?.artifactId !== effectiveArtifactId) {
      const message = 'Rollback can only use the previous deployed revision for this environment';
      setOperationError(message);
      return { success: false, error: message };
    }
    if (action === 'promote' && hasEnv(effectiveArtifact?.deployedEnvironments, targetEnvironment)) {
      const message = 'This revision is already deployed to the selected environment';
      setOperationError(message);
      return { success: false, error: message };
    }

    setOperationStatus('running');

    const payload = {
      targetEnvironment,
      ...(serviceNowCr ? { serviceNowCr } : {}),
    };

    const result =
      action === 'rollback'
        ? await deploymentService.rollbackDeploymentGithubAndPoll(selectedItem.id, {
          ...payload,
          rollbackToArtifactId: effectiveArtifactId,
        }, onEvent)
        : await deploymentService.promoteDeploymentGithubAndPoll(selectedItem.id, {
          ...payload,
          artifactId: effectiveArtifactId,
          ...(effectiveArtifact?.bundleUrl ? { zipUrl: effectiveArtifact.bundleUrl } : {}),
        }, onEvent);

    if (result.success && ['SUCCESS', 'TRIGGERED'].includes(result.finalEvent?.status)) {
      setOperationStatus('success');
      setOperationMessage(result.finalEvent?.message || `${action === 'rollback' ? 'Rollback' : 'Promote'} pipeline completed`);
      await Promise.all([
        loadArtifacts(selectedItem, { keepSelection: true }),
        loadHistoryForItems(items),
      ]);
      return result;
    }

    setOperationStatus('failed');
    setOperationError(result.error || result.finalEvent?.message || 'GitHub pipeline failed');
    await loadHistoryForItems(items);
    return { ...result, success: false };
  };

  const copyText = (value, id) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(''), 1200);
  };

  const orgOptions = apigeeOrgs.length > 0 ? apigeeOrgs : FALLBACK_APIGEE_ORGS;
  const envOptions = isApigeeManagementFlow
    ? apigeeEnvs.length > 0
      ? apigeeEnvs
      : FALLBACK_APIGEE_ENVS
    : GENERIC_ENVS;

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100">

      <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-2 2xl:px-8">
        {routeMode === 'history' ? (
          <HistoryScreen
            history={history}
            historyLoading={historyLoading}
            historyError={historyError}
            items={items}
            loadHistoryForItems={loadHistoryForItems}
            category={category}
            setCategory={setCategory}
            activeSubtypes={activeSubtypes}
            subtype={subtype}
            setSubtype={setSubtype}
            query={query}
            setQuery={setQuery}
            expandedHistoryId={expandedHistoryId}
            setExpandedHistoryId={setExpandedHistoryId}
            copiedId={copiedId}
            copyText={copyText}
            isGateway={isGateway}
            onBack={() => navigate('/api-deploy', { state: { isGateway } })}
          />
        ) : routeMode === 'detail' ? (
          <DeploymentDetailPage
            selectedItem={selectedItem}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            navigate={navigate}
            isApigeeManagementFlow={isApigeeManagementFlow}
            apigeeOrg={apigeeOrg}
            setApigeeOrg={setApigeeOrg}
            orgOptions={orgOptions}
            orgsLoading={orgsLoading}
            targetEnvironment={targetEnvironment}
            setTargetEnvironment={(value) => {
              setTargetEnvironment(value);
              setServiceNowValidated(false);
            }}
            envOptions={envOptions}
            envsLoading={envsLoading}
            apigeeError={apigeeError}
            syncArtifacts={syncArtifacts}
            artifactsLoading={artifactsLoading}
            serviceNowCr={serviceNowCr}
            setServiceNowCr={(value) => {
              setServiceNowCr(value);
              setServiceNowValidated(false);
            }}
            serviceNowValidated={serviceNowValidated}
            serviceNowValidating={serviceNowValidating}
            validateServiceNow={validateServiceNow}
            action={action}
            setAction={selectAction}
            artifacts={artifacts}
            artifactsError={artifactsError}
            selectedArtifactId={selectedArtifactId}
            setSelectedArtifactId={setSelectedArtifactId}
            selectedArtifact={selectedArtifact}
            rollbackArtifact={rollbackArtifact}
            operationError={operationError}
            operationStatus={operationStatus}
            operationMessage={operationMessage}
            runDeployment={runDeployment}
            runCicdDeploymentAndPoll={runCicdDeploymentAndPoll}
            history={history.filter((entry) =>
              entry.microserviceId === selectedItem?.id ||
              entry.name === selectedItem?.apigeeProxyName ||
              entry.name === selectedItem?.name
            )}
            isGateway={isGateway}
            gatewayBackPath={gatewayBackPath}
          />
        ) : (
          <CatalogPage
            category={category}
            setCategory={setCategory}
            activeSubtypes={activeSubtypes}
            subtype={subtype}
            setSubtype={setSubtype}
            query={query}
            setQuery={setQuery}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            filteredItems={filteredItems}
            selectedItem={selectedItem}
            openDeployPage={openDeployPage}
            catalogView={catalogView}
            setCatalogView={setCatalogView}
            history={history}
            copiedId={copiedId}
            copyText={copyText}
            onHistoryClick={() => navigate('/api-deploy/history', { state: { isGateway } })}
            isGateway={isGateway}
            onGatewayBack={gatewayBackPath}
          />
        )}
      </main>
    </div>
  );
}

function CatalogPage({
  isGateway = false,
  onGatewayBack = null,
  category,
  setCategory,
  activeSubtypes,
  subtype,
  setSubtype,
  query,
  setQuery,
  itemsLoading,
  itemsError,
  filteredItems,
  selectedItem,
  openDeployPage,
  catalogView,
  setCatalogView,
  history,
  copiedId,
  copyText,
  onHistoryClick,
}) {
  const [apigeeResourceType, setApigeeResourceType] = useState('Target Server');
  const [logEntry, setLogEntry] = useState(null);
  const isApigeeConfig = category.id === 'apigee' && subtype?.id === 'config';
  const isApigeeList = category.id === 'apigee' && (subtype?.id === 'proxy' || subtype?.id === 'shared-flow');
  const isMicroserviceList = category.id === 'microservice';
  const isMcpList = category.id === 'mcp';
  const latestHistoryByItemId = useMemo(() => {
    const entriesByItemId = {};
    history.forEach((entry) => {
      if (!entry.microserviceId) return;
      if (!entriesByItemId[entry.microserviceId] || entry.updatedAt > entriesByItemId[entry.microserviceId].updatedAt) {
        entriesByItemId[entry.microserviceId] = entry;
      }
    });
    return entriesByItemId;
  }, [history]);

  const visibleSubtypes = isGateway
    ? activeSubtypes.filter(st => st.id === 'proxy')
    : activeSubtypes;

  return (
    <div className="grid gap-4">
      <FilterBar
        category={category}
        setCategory={setCategory}
        activeSubtypes={activeSubtypes}
        subtype={subtype}
        setSubtype={setSubtype}
        query={query}
        setQuery={setQuery}
        showSearch={false}
        onHistoryClick={onHistoryClick}
        hideCategorySelector={isGateway}
        onGatewayBack={onGatewayBack}
      />


      {isApigeeConfig ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0e172a]">
          <ApigeeMainPage
            key={apigeeResourceType}
            resourceType={apigeeResourceType}
            setResourceType={setApigeeResourceType}
            showHeader={!isGateway}
          />
        </div>
      ) : (
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              {/* <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">{category.label}</h2>
              {subtype && (
                <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-200">
                  {subtype.label}
                </Badge>
              )}
            </div> */}
              <p className="mt-1 text-sm text-slate-400">Select a record to open the deployment workflow.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {itemsLoading && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
              <SearchInput query={query} setQuery={setQuery} />
              <ViewToggle view={catalogView} setView={setCatalogView} />
            </div>
          </div>

          {itemsError ? (
            <EmptyState icon={AlertCircle} title="Unable to load APIs" description={itemsError} />
          ) : itemsLoading ? (
            catalogView === 'grid' ? <GridSkeleton cards={8} /> : <ListSkeleton rows={6} />
          ) : filteredItems.length === 0 ? (
            <EmptyState icon={FileCode2} title="No deployable APIs found" description="Try another category or clear the search filter." />
          ) : catalogView === 'grid' ? (
            <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-4">
              <DeployableGrid
                items={filteredItems}
                selectedItem={selectedItem}
                onSelect={openDeployPage}
                isApigeeList={isApigeeList}
                isMicroserviceList={isMicroserviceList}
                isMcpList={isMcpList}
                latestHistoryByItemId={latestHistoryByItemId}
                onOpenLogs={setLogEntry}
              />
            </div>
          ) : (
            <DeployableList
              items={filteredItems}
              selectedItem={selectedItem}
              onSelect={openDeployPage}
              scrollable
              isApigeeList={isApigeeList}
              isMicroserviceList={isMicroserviceList}
              isMcpList={isMcpList}
              latestHistoryByItemId={latestHistoryByItemId}
              onOpenLogs={setLogEntry}
            />
          )}
        </Panel>
      )}

      <DeploymentLogModal
        entry={logEntry}
        onClose={() => setLogEntry(null)}
        copiedId={copiedId}
        copyText={copyText}
      />
    </div>
  );
}

function ViewToggle({ view, setView }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950/30 p-1">
      {[
        { id: 'list', label: 'List', icon: Layers },
        { id: 'grid', label: 'Grid', icon: LayoutDashboard },
      ].map((entry) => {
        const Icon = entry.icon;
        const active = view === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => setView(entry.id)}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition',
              active
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-slate-100'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterBar({ category, setCategory, activeSubtypes, subtype, setSubtype, query, setQuery, showSearch = true, onHistoryClick, hideCategorySelector = false, onGatewayBack }) {
  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {!hideCategorySelector ?
          (
            <div className="flex flex-wrap gap-2">
              {API_CATEGORIES.map((entry) => {
                const Icon = entry.icon;
                const selected = entry.id === category.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setCategory(entry)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                      selected
                        ? 'border-orange-500/40 bg-orange-500/15 text-orange-200 shadow-[0_10px_30px_rgba(249,115,22,0.12)]'
                        : 'border-slate-700 bg-slate-950/30 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {entry.label}
                  </button>
                );
              })}
            </div>
          ) :
          (
            <div className="flex gap-2 items-center">
              {/* <button
                onClick={onGatewayBack}
                className="text-[#ff5b1f] rounded-md text-sm font-medium"
              >
                <ArrowLeft />
              </button> */}
              <h1 className="text-xl font-semibold text-white">API Deploy</h1>
            </div>
          )
        }

        {showSearch ? (
          <SearchInput query={query} setQuery={setQuery} />
        ) : onHistoryClick ? (
          <button
            type="button"
            onClick={onHistoryClick}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/30 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-100 sm:w-auto"
          >
            <History className="h-4 w-4 text-orange-300" />
            Deployment history
          </button>
        ) : null}
      </div>

      {activeSubtypes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {activeSubtypes.map((entry) => {
            const Icon = entry.icon;
            const selected = entry.id === subtype?.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSubtype(entry)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  selected
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-700 bg-slate-950/30 text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// function FilterBar({ category, setCategory, activeSubtypes, subtype, setSubtype, query, setQuery, showSearch = true, onHistoryClick }) {
//   return (
//     <Panel className="p-4">
//       <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
//         <div className="flex flex-wrap gap-2">
//           {API_CATEGORIES.map((entry) => {
//             const Icon = entry.icon;
//             const selected = entry.id === category.id;
//             return (
//               <button
//                 key={entry.id}
//                 type="button"
//                 onClick={() => setCategory(entry)}
//                 className={cn(
//                   'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
//                   selected
//                     ? 'border-orange-500/40 bg-orange-500/15 text-orange-200 shadow-[0_10px_30px_rgba(249,115,22,0.12)]'
//                     : 'border-slate-700 bg-slate-950/30 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70'
//                 )}
//               >
//                 <Icon className="h-4 w-4" />
//                 {entry.label}
//               </button>
//             );
//           })}
//         </div>

//         {showSearch ? (
//           <SearchInput query={query} setQuery={setQuery} />
//         ) : onHistoryClick ? (
//           <button
//             type="button"
//             onClick={onHistoryClick}
//             className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/30 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-100 sm:w-auto"
//           >
//             <History className="h-4 w-4 text-orange-300" />
//             Deployment history
//           </button>
//         ) : null}
//       </div>

//       {activeSubtypes.length > 0 && (
//         <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
//           {activeSubtypes.map((entry) => {
//             const Icon = entry.icon;
//             const selected = entry.id === subtype?.id;
//             return (
//               <button
//                 key={entry.id}
//                 type="button"
//                 onClick={() => setSubtype(entry)}
//                 className={cn(
//                   'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
//                   selected
//                     ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
//                     : 'border-slate-700 bg-slate-950/30 text-slate-400 hover:text-slate-200'
//                 )}
//               >
//                 <Icon className="h-3.5 w-3.5" />
//                 {entry.label}
//               </button>
//             );
//           })}
//         </div>
//       )}
//     </Panel>
//   );
// }

function SearchInput({ query, setQuery }) {
  return (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search APIs, proxy names, IDs"
        className="h-10 w-full rounded-lg border border-slate-700/80 bg-[#0c1220] pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
      />
    </div>
  );
}

function DeploymentDetailPage({
  selectedItem,
  itemsLoading,
  itemsError,
  navigate,
  isApigeeManagementFlow,
  apigeeOrg,
  setApigeeOrg,
  orgOptions,
  orgsLoading,
  targetEnvironment,
  setTargetEnvironment,
  envOptions,
  envsLoading,
  apigeeError,
  syncArtifacts,
  artifactsLoading,
  serviceNowCr,
  setServiceNowCr,
  serviceNowValidated,
  serviceNowValidating,
  validateServiceNow,
  action,
  setAction,
  artifacts,
  artifactsError,
  selectedArtifactId,
  setSelectedArtifactId,
  selectedArtifact,
  rollbackArtifact,
  operationError,
  operationStatus,
  operationMessage,
  runDeployment,
  runCicdDeploymentAndPoll,
  history,
  isGateway = false,
  gatewayBackPath,
}) {
  const isMicroserviceDeploymentFlow = selectedItem?.type === DEPLOYMENT_TYPES.MICROSERVICE;

  if (itemsLoading) {
    return <Panel><ListSkeleton rows={4} /></Panel>;
  }

  if (itemsError) {
    return <Panel><EmptyState icon={AlertCircle} title="Unable to open deployment" description={itemsError} /></Panel>;
  }

  if (!selectedItem) {
    return (
      <Panel>
        <EmptyState icon={FileCode2} title="Deployment record not found" description="Return to the catalog and choose a deployable API." />
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={() => navigate(isGateway ? '/gateway/api-deploy' : '/api-deploy')}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 transition hover:shadow-[0_10px_30px_rgba(249,115,22,0.12)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </button>
        </div>
      </Panel>
    );
  }

  if (isApigeeManagementFlow) {
    return (
      <ApigeeManagementDeployPage
        selectedItem={selectedItem}
        navigate={navigate}
        apigeeOrg={apigeeOrg}
        setApigeeOrg={setApigeeOrg}
        orgOptions={orgOptions}
        orgsLoading={orgsLoading}
        targetEnvironment={targetEnvironment}
        setTargetEnvironment={setTargetEnvironment}
        envOptions={envOptions}
        envsLoading={envsLoading}
        apigeeError={apigeeError}
        syncArtifacts={syncArtifacts}
        serviceNowCr={serviceNowCr}
        setServiceNowCr={setServiceNowCr}
        serviceNowValidated={serviceNowValidated}
        serviceNowValidating={serviceNowValidating}
        validateServiceNow={validateServiceNow}
        action={action}
        setAction={setAction}
        artifacts={artifacts}
        artifactsLoading={artifactsLoading}
        artifactsError={artifactsError}
        selectedArtifactId={selectedArtifactId}
        setSelectedArtifactId={setSelectedArtifactId}
        selectedArtifact={selectedArtifact}
        rollbackArtifact={rollbackArtifact}
        operationError={operationError}
        operationStatus={operationStatus}
        operationMessage={operationMessage}
        runDeployment={runDeployment}
        runCicdDeploymentAndPoll={runCicdDeploymentAndPoll}
        isGateway={isGateway}
        gatewayBackPath={gatewayBackPath}
        history={history}
      />
    );
  }

  // MCP detail view — sourced entirely from the MCP project document.
  // We deliberately render BEFORE the senior team's generic deploy
  // panel so the MCP row never falls back into Apigee/microservice
  // form fields (env select, ServiceNow CR, artifact dropdown, etc.)
  // that don't apply to MCP servers. Senior files stay untouched.
  if (selectedItem?.type === DEPLOYMENT_TYPES.MCP) {
    return <MCPApiDeployDetail item={selectedItem} navigate={navigate} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_500px]">
      <div className="space-y-6">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4">
            <button
              type="button"
              onClick={() => navigate(isGateway ? '/gateway/api-deploy' : '/api-deploy')}
              className="mb-4 text-sm font-semibold text-slate-400 transition hover:text-white flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/30 px-3 py-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to catalog
            </button>
            <SelectedSummary item={selectedItem} />
          </div>
          <ReadinessBoard item={selectedItem} artifacts={artifacts} history={history} />
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-base font-semibold text-white">Recent activity for this API</h2>
            <p className="mt-1 text-sm text-slate-400">Latest promote and rollback attempts for the selected record.</p>
          </div>
          {history.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Deployment attempts will appear here after the first action." compact />
          ) : (
            <div className="divide-y divide-slate-800">
              {history.slice(0, 5).map((entry) => (
                <MiniHistoryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="xl:sticky xl:top-6 xl:self-start">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Deployment action</h2>
          <p className="mt-1 text-sm text-slate-400">All changes require an environment and a validated CR.</p>
        </div>
        <div className="space-y-4 p-5">
          {isApigeeManagementFlow ? (
            <ApigeeConfiguration
              apigeeOrg={apigeeOrg}
              setApigeeOrg={setApigeeOrg}
              orgOptions={orgOptions}
              orgsLoading={orgsLoading}
              targetEnvironment={targetEnvironment}
              setTargetEnvironment={setTargetEnvironment}
              envOptions={envOptions}
              envsLoading={envsLoading}
              apigeeError={apigeeError}
              selectedItem={selectedItem}
              syncArtifacts={syncArtifacts}
              artifactsLoading={artifactsLoading}
            />
          ) : (
            <GenericConfiguration targetEnvironment={targetEnvironment} setTargetEnvironment={setTargetEnvironment} />
          )}

          <ChangeRequest
            serviceNowCr={serviceNowCr}
            setServiceNowCr={setServiceNowCr}
            serviceNowValidated={serviceNowValidated}
            serviceNowValidating={serviceNowValidating}
            validateServiceNow={validateServiceNow}
          />

          {(isApigeeManagementFlow || isMicroserviceDeploymentFlow) && (
            <RevisionPicker
              action={action}
              setAction={setAction}
              artifacts={artifacts}
              artifactsLoading={artifactsLoading}
              artifactsError={artifactsError}
              selectedArtifactId={selectedArtifactId}
              setSelectedArtifactId={setSelectedArtifactId}
              selectedArtifact={selectedArtifact}
              rollbackArtifact={rollbackArtifact}
              targetEnvironment={targetEnvironment}
              selectedItem={selectedItem}
            />
          )}

          {!isApigeeManagementFlow && !isMicroserviceDeploymentFlow && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Release source</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircle className="h-4 w-4 text-emerald-300" />
                Latest generated artifact
              </div>
            </div>
          )}

          {operationError && (
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
              {operationError}
            </div>
          )}

          {operationStatus === 'success' && operationMessage && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {operationMessage}
            </div>
          )}

          <button
            type="button"
            onClick={runDeployment}
            disabled={operationStatus === 'running'}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold shadow-sm transition',
              action === 'rollback'
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-orange-500 text-white hover:bg-orange-400',
              operationStatus === 'running' && 'cursor-not-allowed opacity-70'
            )}
          >
            {operationStatus === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : action === 'rollback' ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {operationStatus === 'running'
              ? 'Running deployment'
              : action === 'rollback'
                ? 'Rollback environment'
                : 'Promote revision'}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function ApigeeManagementDeployPage({
  selectedItem,
  navigate,
  apigeeOrg,
  setApigeeOrg,
  orgOptions,
  orgsLoading,
  targetEnvironment,
  setTargetEnvironment,
  envOptions,
  envsLoading,
  apigeeError,
  syncArtifacts,
  artifactsLoading,
  serviceNowCr,
  setServiceNowCr,
  serviceNowValidated,
  serviceNowValidating,
  validateServiceNow,
  action,
  setAction,
  artifacts,
  artifactsError,
  selectedArtifactId,
  setSelectedArtifactId,
  selectedArtifact,
  rollbackArtifact,
  operationError,
  operationStatus,
  operationMessage,
  runDeployment,
  runCicdDeploymentAndPoll,
  history,
}) {
  const isSharedFlow = selectedItem.type === DEPLOYMENT_TYPES.APIGEE_SHARED_FLOW;
  const assetLabel = isSharedFlow ? 'Shared Flow' : 'Proxy';
  const artifactType = selectedArtifact?.artifactType || selectedArtifact?.importMethod || 'Nexus snapshot';
  const showChangeRequest = requiresChangeRequest(targetEnvironment);
  const [showRecentActivityModal, setShowRecentActivityModal] = useState(false);
  const [deployPath, setDeployPath] = useState('github');
  const [flowStatus, setFlowStatus] = useState('idle');
  const [flowStageIndex, setFlowStageIndex] = useState(-1);
  const [testStatus, setTestStatus] = useState('idle');
  const [processModal, setProcessModal] = useState(null);
  const [ciCdStages, setCiCdStages] = useState([...GITHUB_BASE_STAGES, 'Poll Job Stages']);
  const [githubPipelineData, setGithubPipelineData] = useState(null);
  const testSummary = { total: 12, passed: 12, failed: 0 };

  const runMockTests = async () => {
    setTestStatus('running');
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    setTestStatus('success');
    return testSummary;
  };

  const startGithubFlow = async () => {
    setProcessModal('github');
    setFlowStatus('running');
    setFlowStageIndex(0);
    setTestStatus('idle');
    setCiCdStages([...GITHUB_BASE_STAGES, 'Poll Job Stages']);
    setGithubPipelineData(null);

    const statusStage = {
      STARTED: 0,
      TRIGGERED: 1,
      WAITING_FOR_RUN: 2,
      RUN_FOUND: 2,
      JOBS_UPDATED: 3,
      SUCCESS: 3,
      FAILED: 3,
      TIMEOUT: 3,
    };

    const result = await runCicdDeploymentAndPoll((event) => {
      if (event.data) {
        setGithubPipelineData(event.data);
      }
      const githubStages = githubStageNames(event.data);
      if (githubStages.length) {
        setCiCdStages([...GITHUB_BASE_STAGES, ...githubStages]);
        setFlowStageIndex(GITHUB_BASE_STAGES.length + githubCurrentStageIndex(event.data));
        return;
      }
      setFlowStageIndex(statusStage[event.status] ?? 0);
    });

    if (!result.success) {
      setFlowStatus('failed');
      return;
    }

    setFlowStatus('success');
  };

  const startDirectFlow = async () => {
    setProcessModal('direct');
    setDeployPath('direct');
    setFlowStatus('direct-running');
    setTestStatus('idle');
    setGithubPipelineData(null);

    const deployed = await runDeployment();
    if (!deployed) {
      setFlowStatus('failed');
      return;
    }

    setFlowStatus('testing');
    const tests = await runMockTests();
    const testsPassed = tests.failed === 0;
    setFlowStatus(testsPassed ? 'success' : 'failed');
  };

  const isFlowBusy = ['running', 'direct-running', 'testing'].includes(flowStatus) || operationStatus === 'running';
  const canConfigureDeployment = Boolean(apigeeOrg && targetEnvironment);

  return (
    <div className="space-y-6">
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-5">
          <button
            type="button"
            onClick={() => navigate(isGateway ? '/gateway/api-deploy' : '/api-deploy')}
            className="mb-5 text-sm font-semibold text-slate-400 transition hover:text-white flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/30 px-3 py-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{assetLabel} destination</h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose the Apigee organization and environment for this deployment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecentActivityModal(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/40 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-white"
            >
              <History className="h-4 w-4 text-orange-300" />
              Recent activities
            </button>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
            <span className="text-slate-500">{assetLabel}</span>
            <span className="font-semibold text-white">{selectedItem.apigeeProxyName}</span>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-8 px-6 py-6 xl:grid-cols-2">
          <FormControl
            label="Organization"
            required
            help="The Apigee organization where this asset exists."
          >
            <select
              value={apigeeOrg}
              onChange={(event) => setApigeeOrg(event.target.value)}
              className={inputClassName}
            >
              <option value="">{orgsLoading ? 'Loading organizations...' : 'Select organization'}</option>
              {orgOptions.map((org) => (
                <option key={org.id} value={org.value}>{org.label}</option>
              ))}
            </select>
          </FormControl>

          <FormControl
            label="Target Environment"
            required
            help="The environment that should receive the selected revision."
          >
            <select
              value={targetEnvironment}
              onChange={(event) => setTargetEnvironment(event.target.value)}
              className={inputClassName}
            >
              <option value="">{envsLoading ? 'Loading environments...' : 'Select environment'}</option>
              {envOptions.map((env) => (
                <option key={env.id} value={env.value}>{env.label}</option>
              ))}
            </select>
            {targetEnvironment && showChangeRequest && (
              <p className="mt-2 text-sm text-orange-200">ServiceNow validation is required for {normalizeEnv(targetEnvironment)} deployments.</p>
            )}
          </FormControl>

          {/* Sync revisions is temporarily hidden until the manual refresh flow is finalized. */}

          {apigeeError && (
            <div className="xl:col-span-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">
              {apigeeError}
            </div>
          )}
        </div>
      </Panel>

      {canConfigureDeployment ? (
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold text-white">Revision and change control</h2>
            <p className="mt-1 text-sm text-slate-400">Choose promote or rollback, then run through CI/CD or deploy directly through the Management API.</p>
          </div>

          <div className="space-y-7 px-6 py-6">
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/30 p-1">
              {[
                { id: 'promote', label: 'Promote', icon: Rocket },
                { id: 'rollback', label: 'Rollback', icon: RotateCcw },
              ].map((entry) => {
                const Icon = entry.icon;
                const active = action === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setAction(entry.id);
                      if (entry.id === 'rollback') {
                        setDeployPath('direct');
                      }
                    }}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition',
                      active
                        ? 'bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.18)]'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {entry.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DeployPathCard
                active={deployPath === 'github'}
                icon={GitBranch}
                title="GitHub Artifactory + CI/CD"
                description={action === 'rollback' ? 'Deploy the rollback revision through the GitHub Actions pipeline.' : 'Select an artifact version and promote through the GitHub Actions pipeline.'}
                onClick={() => setDeployPath('github')}
              />
              <DeployPathCard
                active={deployPath === 'direct'}
                icon={Rocket}
                title="Direct Deploy"
                description={action === 'rollback' ? 'Rollback directly using the Apigee Management API.' : 'Promote the selected revision immediately using the Apigee Management API.'}
                onClick={() => setDeployPath('direct')}
              />
            </div>

            <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
              <FormControl label={`${assetLabel} name`} required help="The Apigee asset name used by the deployment API.">
                <input value={selectedItem.apigeeProxyName} readOnly className={cn(inputClassName, 'cursor-default text-slate-300')} />
              </FormControl>

              <FormControl label="Artifact source" required help={`The selected deployment source for this ${action}.`}>
                <input
                  value={action === 'rollback' ? 'Apigee Management API' : deployPath === 'github' ? 'GitHub Artifactory' : 'Apigee Management API'}
                  readOnly
                  className={cn(inputClassName, 'cursor-default text-slate-300')}
                />
              </FormControl>

              <FormControl
                label={action === 'rollback' ? 'Rollback Revision' : 'Artifact Version'}
                required
                help={action === 'rollback' ? 'The previous deployed revision that will be restored.' : 'The revision or artifact version to promote.'}
              >
                <select
                  value={selectedArtifactId}
                  onChange={(event) => setSelectedArtifactId(event.target.value)}
                  disabled={artifactsLoading || artifacts.length === 0 || action === 'rollback'}
                  className={cn(inputClassName, 'disabled:text-slate-500')}
                >
                  <option value="">
                    {artifactsLoading
                      ? 'Loading revisions...'
                      : action === 'rollback'
                        ? 'No rollback revision available'
                        : 'Select revision'}
                  </option>
                  {artifacts.map((artifact) => (
                    <option key={artifact.artifactId} value={artifact.artifactId}>
                      {artifactOptionLabel(artifact, selectedItem)}
                    </option>
                  ))}
                </select>
                {artifactsError && <p className="mt-2 text-sm text-rose-300">{artifactsError}</p>}
                {selectedArtifact && (
                  <p className="mt-2 text-xs text-slate-500">
                    {artifactType} | Revision {selectedArtifact.apigeeRevision || 'N/A'}
                  </p>
                )}
                {action === 'rollback' && targetEnvironment && rollbackArtifact && (
                  <p className="mt-2 text-sm text-orange-200">
                    Revision {rollbackArtifact.apigeeRevision || 'N/A'} will be restored to {normalizeEnv(targetEnvironment)}.
                  </p>
                )}
                {action === 'rollback' && targetEnvironment && !rollbackArtifact && !artifactsLoading && (
                  <p className="mt-2 text-sm text-amber-200">No rollback revision is available for {normalizeEnv(targetEnvironment)}.</p>
                )}
              </FormControl>

              {showChangeRequest && (
                <FormControl label="ServiceNow CR" required help="Validate the change request before prod or cert deployment.">
                  <div className="flex gap-2">
                    <input
                      value={serviceNowCr}
                      onChange={(event) => setServiceNowCr(event.target.value)}
                      placeholder="CR123456"
                      className={cn(inputClassName, 'flex-1')}
                    />
                    <button
                      type="button"
                      onClick={validateServiceNow}
                      disabled={!serviceNowCr || serviceNowValidated || serviceNowValidating}
                      className={cn(
                        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition',
                        serviceNowValidated
                          ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                          : 'bg-orange-500 text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      {serviceNowValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : serviceNowValidated ? <Check className="h-4 w-4" /> : null}
                      {serviceNowValidated ? 'Valid' : serviceNowValidating ? 'Checking' : 'Validate'}
                    </button>
                  </div>
                </FormControl>
              )}
            </div>

            {operationError && (
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
                {operationError}
              </div>
            )}

            {operationStatus === 'success' && operationMessage && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {operationMessage}
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <Panel className="p-6">
          <div className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="rounded-lg border border-orange-500/25 bg-orange-500/10 p-3 text-orange-300">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Select destination first</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Choose an Apigee organization and target environment to unlock revision selection, promote, rollback, and deployment actions.
              </p>
            </div>
          </div>
        </Panel>
      )}

      {/* {canConfigureDeployment && ( */}
      <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {flowStatus === 'failed' && deployPath === 'github' ? (
          <p className="text-sm text-amber-200">CI/CD failed. Continue with direct Management API deployment.</p>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap justify-end gap-3">
          {deployPath === 'github' && flowStatus !== 'failed' && (
            <button
              type="button"
              onClick={startGithubFlow}
              disabled={!canConfigureDeployment || isFlowBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {flowStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              {action === 'rollback' ? 'Start CI/CD Rollback' : 'Start CI/CD Promote'}
            </button>
          )}

          {(deployPath === 'direct' || flowStatus === 'failed') && (
            <button
              type="button"
              onClick={startDirectFlow}
              disabled={isFlowBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {flowStatus === 'direct-running' || flowStatus === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {action === 'rollback' ? 'Rollback Directly' : 'Deploy Directly'}
            </button>
          )}
        </div>
      </div>
      {/* )} */}

      <RecentActivityModal
        isOpen={showRecentActivityModal}
        onClose={() => setShowRecentActivityModal(false)}
        history={history}
        onViewAll={() => {
          const proxyFilter = selectedItem.apigeeProxyName || selectedItem.name;
          setShowRecentActivityModal(false);
          navigate(`/api-deploy/history?category=apigee&subtype=proxy&proxy=${encodeURIComponent(proxyFilter)}`);
        }}
      />

      <DeploymentProcessModal
        type={processModal}
        action={action}
        stages={ciCdStages}
        activeIndex={flowStageIndex}
        status={flowStatus}
        testStatus={testStatus}
        tests={testSummary}
        githubData={githubPipelineData}
        onClose={() => setProcessModal(null)}
      />
    </div>
  );
}

function DeployPathCard({ active, icon: Icon, title, description, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl border p-4 text-left transition',
        disabled
          ? 'cursor-not-allowed border-slate-800 bg-slate-950/20 opacity-50'
          : active
            ? 'border-orange-500/40 bg-orange-500/10 shadow-[0_16px_36px_rgba(249,115,22,0.12)]'
            : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg border p-2', active ? 'border-orange-500/30 bg-orange-500/15 text-orange-200' : 'border-slate-700 bg-slate-900 text-slate-400')}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-400">{description}</p>
        </div>
      </div>
    </button>
  );
}

function DeploymentProcessModal({ type, action, stages, activeIndex, status, testStatus, tests, githubData, onClose }) {
  if (!type) return null;
  const isGithub = type === 'github';
  const finished = ['success', 'failed'].includes(status);
  const directStages = [
    'Validate Request',
    action === 'rollback' ? 'Management API Rollback' : 'Management API Deploy',
    'Run Test Cases',
  ];
  const visibleStages = isGithub ? stages : directStages;
  const modalTitle = isGithub ? 'GitHub Artifactory CI/CD promotion' : 'Direct Management API deployment';
  const modalDescription = isGithub
    ? 'Resolving the selected artifact, checking out SCM configuration, validating the bundle, and promoting through CI/CD.'
    : `${action === 'rollback' ? 'Rolling back' : 'Deploying'} the selected revision directly through the Apigee Management API, then running post-deployment tests.`;
  const activeStage = isGithub
    ? visibleStages[Math.max(activeIndex, 0)] || visibleStages[0]
    : status === 'testing' || status === 'success'
      ? 'Run Test Cases'
      : status === 'direct-running'
        ? action === 'rollback' ? 'Management API Rollback' : 'Management API Deploy'
        : 'Validate Request';
  const taskRows = processTaskRows(activeStage, isGithub, status, testStatus, tests);

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:py-8">
      <div className="w-full max-w-6xl animate-[slideUp_0.28s_ease-out] overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1020] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-white">{modalTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">{modalDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-white"
            aria-label="Close deployment progress"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-6 py-5">
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-center gap-4">
              {visibleStages.map((stage, index) => {
                const complete = isGithub
                  ? activeIndex > index || (status === 'failed' && index < activeIndex)
                  : (status === 'direct-running' && index === 0) || ((status === 'testing' || status === 'success') && index < 2) || (status === 'success' && index === 2);
                const active = isGithub
                  ? activeIndex === index
                  : (status === 'direct-running' && index === 1) || (status === 'testing' && index === 2);
                const failed = isGithub && status === 'failed' && index === activeIndex;
                return (
                  <React.Fragment key={stage}>
                    <ProcessStepPill index={index} label={stage} complete={complete} active={active} failed={failed} />
                    {index < visibleStages.length - 1 && <ChevronDown className="-rotate-90 text-slate-600" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#171b2e]/95 p-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                'rounded-xl border p-3',
                status === 'failed'
                  ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
                  : status === 'success'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                    : 'border-orange-500/25 bg-orange-500/10 text-orange-300'
              )}>
                {status === 'failed' ? (
                  <XCircle className="h-6 w-6" />
                ) : status === 'success' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xl font-semibold text-white">{activeStage}</h4>
                <p className="mt-2 text-sm text-slate-400">{stageDescription(activeStage, isGithub, status === 'failed')}</p>
                {isGithub && <GitHubStagesDisclosure data={githubData} />}
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {taskRows.map((task) => (
                <div key={task.label} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-4">
                  <ProcessTaskIcon state={task.state} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{task.label}</p>
                    {task.detail && <p className="mt-1 text-xs text-slate-500">{task.detail}</p>}
                  </div>
                </div>
              ))}
            </div>

            {testStatus !== 'idle' && (
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {testStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-orange-300" /> : <CheckCircle className="h-4 w-4 text-emerald-300" />}
                  {testStatus === 'running' ? 'Running post-deployment test cases' : 'Post-deployment test summary'}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <TestStat label="Ran" value={tests.total} />
                  <TestStat label="Passed" value={testStatus === 'success' ? tests.passed : '-'} tone="success" />
                  <TestStat label="Failed" value={testStatus === 'success' ? tests.failed : '-'} tone="failed" />
                </div>
              </div>
            )}
          </div>

          {isGithub && status === 'failed' && (
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              CI/CD could not be completed. Close this progress window and use <span className="font-semibold">Deploy Directly</span> to continue through the Management API path.
            </div>
          )}

          {finished && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function githubStageNames(data) {
  const stages = Array.isArray(data?.stages) ? data.stages : [];
  return stages
    .map((stage, index) => ({
      key: `${stage.jobName || 'job'}-${stage.number ?? index}-${stage.name || index}`,
      label: stage.name || stage.jobName || `GitHub stage ${index + 1}`,
    }))
    .filter((stage, index, list) => list.findIndex((candidate) => candidate.key === stage.key) === index)
    .map((stage) => stage.label);
}

function githubCurrentStageIndex(data) {
  const stages = Array.isArray(data?.stages) ? data.stages : [];
  if (!stages.length) return 0;

  const currentStage = data?.currentStage;
  if (currentStage) {
    const currentIndex = stages.findIndex((stage) =>
      stage.name === currentStage.name &&
      stage.jobName === currentStage.jobName &&
      String(stage.number ?? '') === String(currentStage.number ?? '')
    );
    if (currentIndex >= 0) return currentIndex;
  }

  const runningIndex = stages.findIndex((stage) => stage.status !== 'completed');
  if (runningIndex >= 0) return runningIndex;

  const failedIndex = stages.findIndex((stage) => stage.conclusion && stage.conclusion !== 'success');
  if (failedIndex >= 0) return failedIndex;

  return stages.length - 1;
}

function GitHubStagesDisclosure({ data }) {
  const [expanded, setExpanded] = useState(true);
  const stages = githubWorkflowStages(data);
  const currentStage = data?.currentStage;
  const currentLabel = currentStage?.name || stages.find((stage) => workflowUiState(stage.status, stage.conclusion) === 'running')?.name;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-900/50"
      >
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', !expanded && '-rotate-90')} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">GitHub workflow stages</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {currentLabel ? `Current: ${currentLabel}` : data?.message || 'Waiting for GitHub stage details'}
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500">{stages.length} stages</span>
      </button>

      {expanded && (
        <div className="divide-y divide-slate-800/80 border-t border-slate-800">
          {stages.length > 0 ? (
            stages.map((stage, index) => {
              const state = workflowUiState(stage.status, stage.conclusion);
              return (
                <div key={`${stage.jobName || 'job'}-${stage.number ?? index}-${stage.name || index}`} className="flex items-center gap-3 px-4 py-3">
                  <GitHubStatusIcon state={state} small />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{stage.name || `Stage ${index + 1}`}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {stage.jobName ? `${stage.jobName} | ${formatGithubStepMeta(stage)}` : formatGithubStepMeta(stage)}
                    </p>
                  </div>
                  <GitHubStatusBadge state={state} label={stage.conclusion || stage.status || 'queued'} compact />
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <GitHubStatusIcon state="running" small />
              <div>
                <p className="text-sm font-medium text-slate-100">Waiting for workflow run</p>
                <p className="mt-0.5 text-xs text-slate-500">Stage names will appear after GitHub creates the run.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function githubWorkflowStages(data) {
  if (Array.isArray(data?.stages) && data.stages.length) {
    return data.stages;
  }

  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs.flatMap((job) => {
    const steps = Array.isArray(job.steps) && job.steps.length ? job.steps : [job];
    return steps.map((step) => ({
      ...step,
      jobName: step.jobName || job.name,
    }));
  });
}

function workflowUiState(status, conclusion) {
  if (conclusion === 'skipped') return 'skipped';
  if (status === 'completed') {
    if (conclusion === 'success') return 'success';
    if (conclusion === 'skipped') return 'skipped';
    return 'failed';
  }
  if (status === 'in_progress' || status === 'queued' || status === 'requested' || status === 'waiting' || status === 'running') {
    return 'running';
  }
  if (conclusion === 'success') return 'success';
  if (conclusion === 'failure' || conclusion === 'cancelled' || conclusion === 'timed_out') return 'failed';
  return 'pending';
}

function GitHubStatusIcon({ state, small = false }) {
  const size = small ? 'h-4 w-4' : 'h-5 w-5';
  const className = cn(size, 'shrink-0');

  if (state === 'success') return <CheckCircle className={cn(className, 'text-emerald-300')} />;
  if (state === 'failed') return <XCircle className={cn(className, 'text-rose-300')} />;
  if (state === 'skipped') return <Clock className={cn(className, 'text-yellow-300')} />;
  if (state === 'running') return <Loader2 className={cn(className, 'animate-spin text-orange-300')} />;
  return <Clock className={cn(className, 'text-slate-500')} />;
}

function GitHubStatusBadge({ state, label, compact = false }) {
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center rounded-full border font-semibold capitalize',
      compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      state === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
      state === 'failed' && 'border-rose-500/25 bg-rose-500/10 text-rose-200',
      state === 'skipped' && 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
      state === 'running' && 'border-orange-500/25 bg-orange-500/10 text-orange-200',
      state === 'pending' && 'border-slate-700 bg-slate-900 text-slate-400'
    )}>
      {label || state}
    </span>
  );
}

function formatGithubStepMeta(step) {
  if (step.startedAt && step.completedAt) {
    return `${formatTimeOnly(step.startedAt)} - ${formatTimeOnly(step.completedAt)}`;
  }
  if (step.startedAt) {
    return `Started ${formatTimeOnly(step.startedAt)}`;
  }
  return step.status === 'queued' ? 'Queued' : 'Waiting for GitHub update';
}

function formatTimeOnly(value) {
  const parsed = normalizeTimestamp(value);
  if (!parsed) return value;
  return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function stageDescription(stage, isGithub, failed) {
  if (failed) return 'The scan detected a policy issue, so direct deployment is available as the recovery path.';
  if (stage.includes('Artifact')) return 'Resolving the selected artifact version and preparing it for promotion.';
  if (stage.includes('Dispatch')) return 'Calling the backend endpoint that triggers the GitHub Actions workflow.';
  if (stage.includes('Match')) return 'Finding the workflow run whose title contains the generated run key.';
  if (stage.includes('Poll')) return 'Polling GitHub job status and updating each stage.';
  if (stage.includes('SCM')) return 'Checking out source metadata and deployment workflow configuration.';
  if (stage.includes('Bundle')) return 'Packaging policies, proxy endpoints, targets, and supporting files into a deployable bundle.';
  if (stage.includes('Security')) return 'Checking hardcoded secrets, dependency vulnerabilities, and secure header expectations.';
  if (stage.includes('Unit')) return 'Running unit checks before deployment promotion.';
  if (stage === 'Deployment') return 'Promoting the validated artifact through the configured pipeline.';
  if (stage.includes('Registry')) return 'Publishing deployment outputs to artifact registry.';
  if (stage === 'Testing' || stage.includes('Test')) return 'Running health, contract, and smoke checks after deployment.';
  if (stage.includes('Management API')) return 'Calling Apigee Management API with the selected revision and target environment.';
  if (stage.includes('Validate')) return 'Checking required organization, environment, and revision inputs before deploy.';
  return isGithub ? 'Executing the next CI/CD stage.' : 'Waiting for Apigee to return the revision deployment result.';
}

function processTaskRows(activeStage, isGithub, status, testStatus, tests) {
  if (status === 'failed') {
    return [
      { label: 'Validating deployment request...', detail: 'Organization, environment, and revision inputs were checked.', state: 'success' },
      { label: 'Dispatching GitHub workflow...', detail: 'The backend attempted to trigger GitHub Actions.', state: 'failed' },
      { label: 'Recording deployment history...', detail: 'Failure details are stored for review.', state: 'pending' },
    ];
  }

  if (testStatus === 'running' || testStatus === 'success') {
    return [
      { label: 'Executing contract test suite...', detail: `${tests.total} post-deployment checks prepared.`, state: testStatus === 'success' ? 'success' : 'running' },
      { label: 'Validating gateway route health...', detail: 'Smoke checks verify the promoted revision is reachable.', state: testStatus === 'success' ? 'success' : 'running' },
      { label: 'Collecting test summary...', detail: testStatus === 'success' ? `${tests.passed} passed, ${tests.failed} failed.` : 'Awaiting final test result.', state: testStatus === 'success' ? 'success' : 'pending' },
    ];
  }

  if (!isGithub) {
    return [
      { label: 'Validating deployment request...', detail: 'Organization, environment, and revision are checked.', state: status === 'direct-running' ? 'success' : 'pending' },
      { label: 'Calling Apigee Management API...', detail: 'Deployment request is sent directly to Apigee.', state: status === 'direct-running' ? 'running' : 'pending' },
      { label: 'Preparing post-deployment tests...', detail: 'Test cases will run after a successful deployment response.', state: 'pending' },
    ];
  }

  if (activeStage.includes('Security')) {
    return [
      { label: 'Scanning for hardcoded secrets...', detail: 'Looking for leaked credentials and private keys.', state: 'running' },
      { label: 'Checking dependency vulnerabilities...', detail: 'Inspecting bundle dependencies for known risks.', state: 'running' },
      { label: 'Validating security headers...', detail: 'Evaluating configured gateway response protections.', state: 'running' },
    ];
  }

  return [
    { label: `${activeStage} started...`, detail: 'Pipeline worker accepted the stage.', state: 'running' },
    { label: 'Collecting stage metadata...', detail: 'Preparing logs, artifact metadata, and status updates.', state: 'running' },
    { label: 'Waiting for stage completion...', detail: 'The next stage starts automatically after this completes.', state: 'pending' },
  ];
}

function ProcessStepPill({ index, label, complete, active, failed }) {
  return (
    <div className={cn(
      'flex min-w-[150px] items-center gap-3 rounded-xl border px-4 py-3',
      failed
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
        : complete
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          : active
            ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
            : 'border-slate-800 bg-slate-950/40 text-slate-400'
    )}>
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        failed ? 'bg-rose-500/20' : complete ? 'bg-emerald-500/20' : active ? 'bg-orange-500/20' : 'bg-slate-800'
      )}>
        {failed ? <XCircle className="h-4 w-4" /> : complete ? <Check className="h-4 w-4" /> : index + 1}
      </span>
      <span className="whitespace-nowrap text-sm font-medium">{label}</span>
    </div>
  );
}

function ProcessTaskIcon({ state }) {
  if (state === 'success') {
    return <CheckCircle className="h-5 w-5 shrink-0 text-emerald-300" />;
  }
  if (state === 'failed') {
    return <XCircle className="h-5 w-5 shrink-0 text-rose-300" />;
  }
  if (state === 'running') {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-orange-500" />;
  }
  return <Clock className="h-5 w-5 shrink-0 text-slate-500" />;
}

function TestStat({ label, value, tone }) {
  const toneClass = tone === 'success' ? 'text-emerald-300' : tone === 'failed' ? 'text-rose-300' : 'text-white';
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', toneClass)}>{value}</p>
    </div>
  );
}

function RecentActivityModal({ isOpen, onClose, history, onViewAll }) {
  const [expandedId, setExpandedId] = useState(null);
  const latestHistory = history.slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent deployment activity</h2>
            <p className="mt-1 text-sm text-slate-400">Latest five deployment events for this proxy.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
            >
              View all
            </button>
            <button
              type="button"
              onClick={onClose}
              className=" p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
              aria-label="Close recent deployment activity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-150px)] overflow-y-auto p-4 sm:p-5">
          {history.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Deployment attempts will appear here after the first action." compact />
          ) : (
            <div className="space-y-2">
              {latestHistory.map((entry) => (
                <RecentActivityAccordionItem
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentActivityAccordionItem({ entry, expanded, onToggle }) {
  const statusClass = statusStyles[entry.status] || statusStyles.pending;
  const actionClass = actionStyles[entry.action] || actionStyles.promote;
  const isRollback = entry.action === 'rollback';
  const isGenerate = entry.action === 'generate';
  const ActionIcon = isRollback ? RotateCcw : isGenerate ? FileCode2 : Rocket;
  const isMicroservice = isMicroserviceHistoryEntry(entry);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]/80">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-900/70  md:items-center"
      >
        <div className='flex justify-between items-center w-full'>

          <div className="min-w-0 text-sm">
            <span className="font-semibold text-white">{entry.apigeeProxyName || entry.name}</span>
            {!isMicroservice && (
              <>
                <span className="mx-2 text-slate-700">|</span>
                <span className="text-slate-400">Rev {entry.apigeeRevision || 'N/A'}</span>
                <span className="mx-2 text-slate-700">|</span>
                <span className="text-slate-400">{entry.environment || 'N/A'}</span>
              </>
            )}
            <span className="mx-2 text-slate-700">|</span>
            <span className="text-slate-500">{entry.deployedAt}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            <Badge className={statusClass}>
              <StatusIcon status={entry.status} />
              {entry.status.toUpperCase()}
            </Badge>
            {/* <Badge className={actionClass}>
            <ActionIcon className="h-3.5 w-3.5" />
            {entry.action.toUpperCase()}
          </Badge>
          <Badge className="border-slate-700 bg-slate-900/70 text-slate-300">
            {entry.deploymentType}
          </Badge> */}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition md:justify-self-end', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/25 px-4 py-3">
          <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
            <CompactDetail label="Action" value={formatTokenLabel(entry.action)} />
            <CompactDetail label="Deployment type" value={entry.deploymentType} />
            {!isMicroservice && <CompactDetail label="Revision" value={entry.apigeeRevision} />}
            {!isMicroservice && <CompactDetail label="Proxy" value={entry.apigeeProxyName || entry.name} />}
            {!isMicroservice && <CompactDetail label="Organization" value={entry.apigeeOrg} />}
            {!isMicroservice && <CompactDetail label="Environment" value={entry.environment} />}
            <CompactDetail label="Completed" value={entry.deployedAt} />
            {!isMicroservice && <CompactDetail label="Artifact" value={entry.artifactLabel} />}
            <CompactLinkDetail label="Deployment URL" value={entry.deploymentUrl} />
            {!isMicroservice && <CompactDetail label="ServiceNow CR" value={entry.serviceNowCr} />}
          </div>
          {entry.errorMessage && (
            <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-rose-200">Error</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-rose-100">{entry.errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function CompactDetail({ label, value }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 border-b border-slate-800/60 py-1.5 last:border-b-0">
      <span className="w-28 shrink-0 text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-sm font-medium text-slate-200">{value || 'N/A'}</span>
    </div>
  );
}

function CompactLinkDetail({ label, value }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 border-b border-slate-800/60 py-1.5 last:border-b-0">
      <span className="w-28 shrink-0 text-xs uppercase tracking-wide text-slate-500">{label}</span>
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate text-sm font-medium text-orange-200 transition-colors hover:text-white"
          title={value}
        >
          {value}
        </a>
      ) : (
        <span className="min-w-0 text-sm font-medium text-slate-500">N/A</span>
      )}
    </div>
  );
}

function FormControl({ label, required = false, count, help, children }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        {label}{required && <span className="text-orange-300">*</span>}
        {typeof count === 'number' && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{count}</span>
        )}
      </span>
      {help && <span className="mt-1.5 block text-sm leading-5 text-slate-500">{help}</span>}
      <div className="mt-3">{children}</div>
    </label>
  );
}

function ReadinessBoard({ item, artifacts, history }) {
  const latestSuccess = history.find((entry) => entry.status === 'success');
  const latestFailure = history.find((entry) => entry.status === 'failed');

  return (
    <div className="grid gap-4 p-5 md:grid-cols-3">
      <ReadinessTile label="Governance" value={`${item.governanceStatus || 0}%`} detail="Policy checks" tone="amber" />
      <ReadinessTile label="Tests" value={`${item.testResultStatus?.passed || 0}/${item.testResultStatus?.total || 0}`} detail="Passing cases" tone="slate" />
      <ReadinessTile label="Revisions" value={artifacts.length || 0} detail="Deployable artifacts" tone="emerald" />
      <ReadinessTile label="Current env" value={item.environment || 'N/A'} detail="Last generated target" tone="slate" />
      <ReadinessTile label="Last success" value={latestSuccess?.environment || 'N/A'} detail={latestSuccess?.deployedAt || 'No success yet'} tone="emerald" />
      <ReadinessTile label="Last failure" value={latestFailure?.environment || 'N/A'} detail={latestFailure?.deployedAt || 'No failure'} tone="rose" />
    </div>
  );
}

function ReadinessTile({ label, value, detail, tone }) {
  const tones = {
    amber: 'bg-orange-500/10 text-orange-200 border-orange-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25',
    rose: 'bg-rose-500/10 text-rose-200 border-rose-500/25',
    slate: 'bg-slate-950/30 text-slate-200 border-slate-800',
  };

  return (
    <div className={cn('rounded-xl border p-4', tones[tone] || tones.slate)}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

function MiniHistoryRow({ entry }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusStyles[entry.status] || statusStyles.pending}>
          <StatusIcon status={entry.status} />
          {entry.status.toUpperCase()}
        </Badge>
        <Badge className={actionStyles[entry.action] || actionStyles.promote}>{entry.action.toUpperCase()}</Badge>
        <Badge className="border-slate-700 bg-slate-900/70 text-slate-300">{entry.deploymentType || 'N/A'}</Badge>
        <span className="text-sm font-medium text-white">Revision {entry.apigeeRevision || 'N/A'}</span>
      </div>
      <p className="text-xs text-slate-500">{entry.environment} | {entry.deployedAt}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, compact = false }) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', compact ? 'min-h-64' : 'min-h-56')}>
      <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DeployableList({ items, selectedItem, onSelect, scrollable = false, isApigeeList = false, isMicroserviceList = false, isMcpList = false, latestHistoryByItemId = {}, onOpenLogs }) {
  // MCP rows now share the same Promote/Rollback + View-log action column
  // microservice rows have. Per-row data plumbing already exists — see
  // `loadDeploymentHistory()`'s MCP audit-trail branch (around line 698)
  // which surfaces `mcpDetails` + a `latestHistory` entry keyed on the
  // MCP project's id. The button only needs to be exposed.
  const showManagementActions = isApigeeList || isMicroserviceList || isMcpList;
  const gridTemplateClass = isApigeeList
    ? 'grid-cols-[minmax(160px,0.9fr)_80px_120px_150px_140px_100px_100px_135px_185px]'
    : isMicroserviceList
      ? 'grid-cols-[minmax(0,0.75fr)_115px_90px_130px_minmax(0,1fr)_180px_185px]'
      : isMcpList
        ? 'grid-cols-[minmax(0,0.75fr)_115px_90px_130px_minmax(0,1fr)_180px_185px]'
        : 'grid-cols-[minmax(0,0.75fr)_115px_90px_130px_minmax(0,1fr)_180px]';

  return (
    <div>
      <div className={`hidden ${gridTemplateClass} gap-4 border-b border-slate-800 bg-slate-950/20 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid`}>
        <span>API</span>
        {isApigeeList ? (
          <>
            <span className='ml-4'>Version</span>
            <span>Quality</span>
            <span>Artifact Version</span>
            <span>Last Deployed on</span>
            <span>Action</span>
            <span>Status</span>
            <span>Deployment type</span>
          </>
        ) : (
          <>
            <span>Type</span>
            <span>{isMcpList ? 'Runtime' : 'Version'}</span>
            <span>Quality</span>
            <span>Deployment URL</span>
            <span>Status</span>
          </>
        )}
        {showManagementActions && <span>Actions</span>}
      </div>
      <div className={cn('divide-y divide-slate-800', scrollable && 'max-h-[calc(100vh-300px)] overflow-y-auto')}>
        {items.map((item) => (
          <DeployableRow
            key={item.id}
            item={item}
            selected={item.id === selectedItem?.id}
            onSelect={() => onSelect(item)}
            isApigeeList={isApigeeList}
            isMicroserviceList={isMicroserviceList}
            isMcpList={isMcpList}
            latestHistory={latestHistoryByItemId[item.id]}
            onOpenLogs={onOpenLogs}
          />
        ))}
      </div>
    </div>
  );
}

function DeployableGrid({ items, selectedItem, onSelect, isApigeeList = false, isMicroserviceList = false, isMcpList = false, latestHistoryByItemId = {}, onOpenLogs }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => (
        <DeployableGridCard
          key={item.id}
          item={item}
          selected={item.id === selectedItem?.id}
          onSelect={() => onSelect(item)}
          isApigeeList={isApigeeList}
          isMicroserviceList={isMicroserviceList}
          isMcpList={isMcpList}
          latestHistory={latestHistoryByItemId[item.id]}
          onOpenLogs={onOpenLogs}
        />
      ))}
    </div>
  );
}

function DeployableGridCard({ item, selected, onSelect, isApigeeList = false, isMicroserviceList = false, isMcpList = false, latestHistory, onOpenLogs }) {
  const Icon = typeIcons[item.type] || Box;
  const isMcp = item.type === DEPLOYMENT_TYPES.MCP || isMcpList;
  // MCP cards now expose the Re-deploy/Rollback + View-log buttons (button
  // label "Promote/Rollback" stays as-is for table parity; clicking opens
  // `MCPApiDeployDetail` which contains the real Re-deploy + per-revision
  // Rollback flow).
  const showManagementActions = isApigeeList || isMicroserviceList || isMcp;
  const testScore = `${item.testResultStatus?.passed || 0}/${item.testResultStatus?.total || 0}`;
  const deploymentStatus = latestHistory?.status || item.status;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex min-h-48 flex-col rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-orange-500/45 bg-orange-500/[0.08]'
          : 'border-slate-800 bg-slate-950/25 hover:border-slate-700 hover:bg-slate-900/55'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-2.5 text-orange-300">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white" title={item.name}>{item.name}</p>
            <p className="mt-1 text-xs text-slate-500">{typeLabels[item.type] || item.type}</p>
          </div>
        </div>
        <Badge className={cn(statusStyles[deploymentStatus] || statusStyles.Pending)}>
          <StatusIcon status={deploymentStatus} />
          {isApigeeList && latestHistory ? deploymentStatus.toUpperCase() : deploymentStatus}
        </Badge>
      </div>
      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-slate-400">{item.description}</p>
      {!isApigeeList && item.deploymentUrl && (
        <a
          href={item.deploymentUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-100 transition-colors hover:bg-orange-500/15 hover:text-white"
          title={item.deploymentUrl}
        >
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{item.deploymentUrl}</span>
        </a>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {isApigeeList ? (
          <>
            <GridMetric label="Artifact Version" value={latestHistory?.artifactLabel || 'N/A'} />
            <GridMetric label="Last Deployed" value={latestHistory?.lastDeployedOn || 'N/A'} />
            <GridMetric label="Action" value={latestHistory?.action?.toUpperCase() || 'N/A'} />
          </>
        ) : (
          <>
            <GridMetric label={isMcp ? 'Runtime' : 'Version'} value={item.version} />
            <GridMetric label="Gov" value={isMcp ? '—' : `${item.governanceStatus || 0}%`} />
            <GridMetric label="Tests" value={isMcp ? '—' : testScore} />
          </>
        )}
      </div>
      {showManagementActions && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary-hover"
          >
            <span className="truncate">Promote/Rollback</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenLogs?.(latestHistory);
            }}
            disabled={!latestHistory}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/50 disabled:text-slate-500"
            title="View deployment log"
            aria-label="View deployment log"
          >
            <FileCode2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </button>
  );
}

function GridMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/35 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function DeployableRow({ item, selected, onSelect, isApigeeList = false, isMicroserviceList = false, isMcpList = false, latestHistory, onOpenLogs }) {
  const Icon = typeIcons[item.type] || Box;
  const isMcp = item.type === DEPLOYMENT_TYPES.MCP || isMcpList;
  // Mirrors `DeployableGridCard` — MCP rows now show the same action column
  // microservice rows have. Promote/Rollback opens `MCPApiDeployDetail` (it
  // already hosts the rollback popover); View Log opens the existing
  // `DeploymentLogModal` with MCP-shape rendering applied below.
  const showManagementActions = isApigeeList || isMicroserviceList || isMcp;
  const testScore = `${item.testResultStatus?.passed || 0}/${item.testResultStatus?.total || 0}`;
  const deploymentStatus = latestHistory?.status || 'N/A';
  const deploymentStatusStyle = latestHistory ? statusStyles[deploymentStatus] : 'border-slate-700 bg-slate-900/70 text-slate-400';
  const gridTemplateClass = isApigeeList
    ? 'grid-cols-[minmax(160px,0.9fr)_80px_120px_150px_140px_100px_100px_135px_185px]'
    : isMicroserviceList
      ? 'grid-cols-[minmax(0,0.75fr)_115px_90px_130px_minmax(0,1fr)_180px_185px]'
      : isMcp
        ? 'grid-cols-[minmax(0,0.75fr)_115px_90px_130px_minmax(0,1fr)_180px_185px]'
        : 'grid-cols-[minmax(0,0.75fr)_115px_90px_130px_minmax(0,1fr)_180px]';

  return (
    <div
      className={cn(
        'grid w-full gap-3 px-4 py-4 text-left transition md:items-center md:gap-4',
        gridTemplateClass,
        selected
          ? 'bg-orange-500/[0.08] shadow-[inset_3px_0_0_rgba(249,115,22,0.9)]'
          : 'hover:bg-slate-900/55'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn(
          'mt-0.5 rounded-md border p-2',
          selected
            ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
            : 'border-slate-700 bg-slate-950/30 text-slate-400'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white" title={item.name}>{item.name}</p>
          {/* <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.description}</p> */}
        </div>
      </div>
      {isApigeeList ? (
        <>
          <p className="text-xs text-slate-500 ml-6">{item.version}</p>
          <p className="text-xs text-slate-500">{item.governanceStatus || 0}% gov | {testScore} tests</p>
          <p className="truncate text-xs font-medium text-slate-300" title={latestHistory?.artifactLabel || 'N/A'}>{latestHistory?.artifactLabel || 'N/A'}</p>
          <p className="text-xs text-slate-500">{latestHistory?.lastDeployedOn || 'N/A'}</p>
          <Badge className={cn('w-fit', latestHistory ? actionStyles[latestHistory.action] || actionStyles.promote : 'border-slate-700 bg-slate-900/70 text-slate-400')}>
            {latestHistory ? latestHistory.action.toUpperCase() : 'N/A'}
          </Badge>
          <Badge className={cn('w-fit', deploymentStatusStyle)}>
            {latestHistory && <StatusIcon status={deploymentStatus} />}
            {deploymentStatus === 'N/A' ? deploymentStatus : deploymentStatus.toUpperCase()}
          </Badge>
          <p className="text-xs font-medium text-slate-300">{latestHistory?.deploymentType || 'N/A'}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-medium text-slate-300">{typeLabels[item.type] || item.type}</p>
          <p className="text-xs text-slate-500">{item.version || '—'}</p>
          <p className="text-xs text-slate-500">
            {isMcp ? '—' : `${item.governanceStatus || 0}% gov | ${testScore} tests`}
          </p>
          <div className="min-w-0">
            {item.deploymentUrl ? (
              <a
                href={item.deploymentUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="block truncate text-xs font-semibold text-orange-200 transition-colors hover:text-white"
                title={item.deploymentUrl}
              >
                {item.deploymentUrl}
              </a>
            ) : (
              <span className="text-xs text-slate-500">N/A</span>
            )}
          </div>
          <Badge className={cn('w-fit', statusStyles[item.status] || statusStyles.Pending)}>
            <StatusIcon status={item.status} />
            {item.status}
          </Badge>
        </>
      )}
      {showManagementActions && (
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 flex min-w-0 flex-1 items-center justify-center gap-2 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title="Promote/Rollback"
          >
            <span className="truncate">Promote/Rollback</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenLogs?.(latestHistory)}
            disabled={!latestHistory}
            title="View deployment log"
            aria-label="View deployment log"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/50 disabled:text-slate-500"
          >
            <FileCode2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryScreen({
  history,
  historyLoading,
  historyError,
  items,
  loadHistoryForItems,
  category,
  setCategory,
  activeSubtypes,
  subtype,
  setSubtype,
  query,
  setQuery,
  expandedHistoryId,
  setExpandedHistoryId,
  copiedId,
  copyText,
  onBack,
  isGateway = false,
}) {
  const [logEntry, setLogEntry] = useState(null);
  const cleanQuery = query.trim().toLowerCase();
  const visibleHistory = cleanQuery
    ? history.filter((entry) =>
      [entry.name, entry.apigeeProxyName, entry.apigeeOrg, entry.environment, entry.apigeeRevision, entry.deploymentUrl]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(cleanQuery))
    )
    : history;
  const isMicroserviceHistory = category.id === DEPLOYMENT_TYPES.MICROSERVICE;
  const isMcpHistory = category.id === 'mcp';
  // Both MCP & Microservice hide Apigee-only columns (Revision, Proxy,
  // Org, ServiceNow CR). MCP additionally swaps in repo / commit / run
  // URL / rollback-from-to rows inside the expanded section.
  const hideProxyFields = isMicroserviceHistory || isMcpHistory;

  return (
    <div className="grid gap-6">
      <FilterBar
        category={category}
        setCategory={setCategory}
        activeSubtypes={activeSubtypes}
        subtype={subtype}
        setSubtype={setSubtype}
        query={query}
        setQuery={setQuery}
        hideCategorySelector={isGateway}
      />

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-orange-300" />
              <h2 className="text-base font-semibold text-white">Deployment history</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Review promote and rollback activity across the selected API category.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={isGateway ? () => navigate('/gateway/api-deploy') : onBack}
              className="flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to catalog
            </button>
            <button
              type="button"
              onClick={() => loadHistoryForItems(items)}
              disabled={historyLoading || items.length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {historyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>
        </div>

        {historyError ? (
          <EmptyState icon={AlertCircle} title="Unable to load history" description={historyError} />
        ) : historyLoading ? (
          <HistorySkeleton rows={7} />
        ) : visibleHistory.length === 0 ? (
          <EmptyState icon={History} title="No deployment history yet" description="Successful and failed deploy actions will appear here." />
        ) : (
          <div>
            <div className={cn(
              'hidden gap-4 border-b border-slate-800 bg-slate-950/20 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid',
              hideProxyFields
                ? 'grid-cols-[120px_120px_minmax(0,0.9fr)_minmax(0,1fr)_150px_160px_40px]'
                : 'grid-cols-[120px_120px_minmax(0,0.85fr)_minmax(0,1fr)_150px_90px_160px_40px]',
            )}>
              <span>Status</span>
              <span>Action</span>
              <span>Resource</span>
              <span>Deployment URL</span>
              <span>Deploy type</span>
              {!hideProxyFields && <span>Revision</span>}
              <span>Completed</span>
              <span />
            </div>
            <div className="max-h-[calc(100vh-330px)] divide-y divide-slate-800 overflow-y-auto">
              {visibleHistory.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedHistoryId === entry.id}
                  onToggle={() => setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)}
                  copiedId={copiedId}
                  copyText={copyText}
                  onOpenLogs={() => setLogEntry(entry)}
                  hideProxyFields={hideProxyFields}
                  isMcp={isMcpHistory || entry.type === DEPLOYMENT_TYPES.MCP}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>

      <DeploymentLogModal
        entry={logEntry}
        onClose={() => setLogEntry(null)}
        copiedId={copiedId}
        copyText={copyText}
      />
    </div>
  );
}

function SelectedSummary({ item }) {
  const Icon = typeIcons[item.type] || Box;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/25 p-4">
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-3 text-orange-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">{item.name}</p>
          <p className="mt-1 text-sm text-slate-500">{item.apigeeProxyName || item.appId}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{item.description}</p>
        </div>
        <Badge className="border-slate-700 bg-slate-900/70 text-slate-300">{item.version}</Badge>
      </div>
    </div>
  );
}

function ApigeeConfiguration({
  apigeeOrg,
  setApigeeOrg,
  orgOptions,
  orgsLoading,
  targetEnvironment,
  setTargetEnvironment,
  envOptions,
  envsLoading,
  apigeeError,
  selectedItem,
  syncArtifacts,
  artifactsLoading,
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Apigee organization">
          <select
            value={apigeeOrg}
            onChange={(event) => setApigeeOrg(event.target.value)}
            className={inputClassName}
          >
            <option value="">{orgsLoading ? 'Loading orgs...' : 'Select organization'}</option>
            {orgOptions.map((org) => (
              <option key={org.id} value={org.value}>{org.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Target environment">
          <select
            value={targetEnvironment}
            onChange={(event) => setTargetEnvironment(event.target.value)}
            className={inputClassName}
          >
            <option value="">{envsLoading ? 'Loading envs...' : 'Select environment'}</option>
            {envOptions.map((env) => (
              <option key={env.id} value={env.value}>{env.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Proxy name</p>
            <p className="truncate text-sm font-medium text-white">{selectedItem.apigeeProxyName}</p>
          </div>
          <button
            type="button"
            onClick={syncArtifacts}
            disabled={!apigeeOrg || artifactsLoading}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {artifactsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync
          </button>
        </div>
        {apigeeError && <p className="mt-2 text-xs text-amber-300">{apigeeError}</p>}
      </div>
    </div>
  );
}

function GenericConfiguration({ targetEnvironment, setTargetEnvironment }) {
  return (
    <Field label="Target environment">
      <select
        value={targetEnvironment}
        onChange={(event) => setTargetEnvironment(event.target.value)}
        className={inputClassName}
      >
        <option value="">Select environment</option>
        {GENERIC_ENVS.map((env) => (
          <option key={env.id} value={env.value}>{env.label}</option>
        ))}
      </select>
    </Field>
  );
}

function ChangeRequest({
  serviceNowCr,
  setServiceNowCr,
  serviceNowValidated,
  serviceNowValidating,
  validateServiceNow,
}) {
  return (
    <Field label="ServiceNow CR">
      <div className="flex gap-2">
        <input
          value={serviceNowCr}
          onChange={(event) => setServiceNowCr(event.target.value)}
          placeholder="CR123456"
          className={cn(inputClassName, 'flex-1')}
        />
        <button
          type="button"
          onClick={validateServiceNow}
          disabled={!serviceNowCr || serviceNowValidated || serviceNowValidating}
          className={cn(
            'inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition',
            serviceNowValidated
              ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
              : 'bg-orange-500 text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {serviceNowValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : serviceNowValidated ? <Check className="h-4 w-4" /> : null}
          {serviceNowValidated ? 'Valid' : serviceNowValidating ? 'Checking' : 'Validate'}
        </button>
      </div>
    </Field>
  );
}

function RevisionPicker({
  action,
  setAction,
  artifacts,
  artifactsLoading,
  artifactsError,
  selectedArtifactId,
  setSelectedArtifactId,
  selectedArtifact,
  rollbackArtifact,
  targetEnvironment,
  selectedItem,
}) {
  const selectedArtifactLabel =
    selectedArtifact?.apigeeRevision
      ? `Revision ${selectedArtifact.apigeeRevision}`
      : selectedArtifact?.artifactVersion ||
      selectedArtifact?.version ||
      selectedArtifact?.proxyVersion ||
      selectedArtifact?.artifactId ||
      'N/A';
  const rollbackArtifactLabel =
    rollbackArtifact?.apigeeRevision
      ? `revision ${rollbackArtifact.apigeeRevision}`
      : rollbackArtifact?.artifactVersion ||
      rollbackArtifact?.version ||
      rollbackArtifact?.proxyVersion ||
      rollbackArtifact?.artifactId ||
      'the rollback artifact';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'promote', label: 'Promote', icon: Rocket },
          { id: 'rollback', label: 'Rollback', icon: RotateCcw },
        ].map((entry) => {
          const Icon = entry.icon;
          const selected = action === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setAction(entry.id)}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-md border text-sm font-medium transition',
                selected
                  ? entry.id === 'rollback'
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                  : 'border-slate-700 bg-slate-950/30 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <Field label={action === 'rollback' ? 'Rollback revision' : 'Revision'}>
        <select
          value={selectedArtifactId}
          onChange={(event) => setSelectedArtifactId(event.target.value)}
          disabled={artifactsLoading || artifacts.length === 0 || action === 'rollback'}
          className={cn(inputClassName, 'disabled:text-slate-500')}
        >
          <option value="">
            {artifactsLoading ? 'Loading revisions...' : action === 'rollback' ? 'No rollback available' : 'Select revision'}
          </option>
          {artifacts.map((artifact) => (
            <option key={artifact.artifactId} value={artifact.artifactId}>
              {artifactOptionLabel(artifact, selectedItem)}
            </option>
          ))}
        </select>
      </Field>

      {artifactsError && <p className="text-xs text-rose-300">{artifactsError}</p>}

      {selectedArtifact && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Selected revision</p>
              <p className="mt-1 text-sm font-semibold text-white">{selectedArtifactLabel}</p>
            </div>
            {selectedArtifact.deployedEnvironments?.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1">
                {selectedArtifact.deployedEnvironments.map((env) => (
                  <Badge key={env} className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">{env}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {action === 'rollback' && targetEnvironment && rollbackArtifact && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Rollback will deploy {rollbackArtifactLabel} to {normalizeEnv(targetEnvironment)}.
        </div>
      )}

      {action === 'rollback' && targetEnvironment && !rollbackArtifact && !artifactsLoading && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          No rollback is available for {normalizeEnv(targetEnvironment)}.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function HistoryRow({ entry, expanded, onToggle, copiedId, copyText, onOpenLogs, hideProxyFields = false, isMcp = false }) {
  const statusClass = statusStyles[entry.status] || statusStyles.pending;
  const actionClass = actionStyles[entry.action] || actionStyles.promote;
  const isRollback = entry.action === 'rollback';
  const isGenerate = entry.action === 'generate';
  const ActionIcon = isRollback ? RotateCcw : isGenerate ? FileCode2 : Rocket;
  const isMicroservice = (hideProxyFields || isMicroserviceHistoryEntry(entry)) && !isMcp;
  const mcp = entry.mcpDetails || {};

  // Both microservice & MCP use the compact (no-Revision) grid.
  const isCompact = hideProxyFields || isMicroservice || isMcp;

  return (
    <article className="bg-[#171b2e]/50">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-900/60 md:items-center md:gap-4',
          isCompact
            ? 'md:grid-cols-[120px_120px_minmax(0,0.9fr)_minmax(0,1fr)_150px_160px_40px]'
            : 'md:grid-cols-[120px_120px_minmax(0,0.85fr)_minmax(0,1fr)_150px_90px_160px_40px]',
        )}
      >
        <Badge className={cn('w-fit', statusClass)}>
          <StatusIcon status={entry.status} />
          {entry.status.toUpperCase()}
        </Badge>
        <Badge className={cn('w-fit', actionClass)}>
          <ActionIcon className="h-3.5 w-3.5" />
          {entry.action.toUpperCase()}
        </Badge>
        <div className="min-w-0 md:pr-3">
          <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
          {isMcp ? (
            (mcp.repoFullName || mcp.branch) && (
              <p className="mt-1 truncate text-xs text-slate-500">
                {[mcp.repoFullName, mcp.branch].filter(Boolean).join(' · ')}
              </p>
            )
          ) : (
            <p className="mt-1 truncate text-xs text-slate-500">{entry.apigeeOrg || '—'} | {entry.environment || '—'}</p>
          )}
          {entry.errorMessage && (
            <p className="mt-2 line-clamp-1 text-xs text-rose-300">{entry.errorMessage}</p>
          )}
        </div>
        <div className="min-w-0">
          {entry.deploymentUrl ? (
            <a
              href={entry.deploymentUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="block truncate text-xs font-semibold text-orange-200 transition-colors hover:text-white"
              title={entry.deploymentUrl}
            >
              {entry.deploymentUrl}
            </a>
          ) : (
            <span className="text-xs text-slate-500">—</span>
          )}
        </div>
        <p className="text-xs font-medium text-slate-300">{entry.deploymentType || '—'}</p>
        {!isCompact && <p className="text-xs font-medium text-slate-300">Rev {entry.apigeeRevision || 'N/A'}</p>}
        <p className="text-xs text-slate-500">{entry.deployedAt}</p>
        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition md:justify-self-end', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="grid gap-3 border-t border-slate-800 bg-slate-950/20 px-5 py-4 lg:grid-cols-3">
          <div className="lg:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={onOpenLogs}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              View deployment log
            </button>
          </div>

          {/* MCP-specific rows — real GitHub Actions / repo info, no
              Apigee/ServiceNow placeholders. */}
          {isMcp ? (
            <>
              <LinkedDetail label="Deployment URL" value={entry.deploymentUrl} />
              <Detail label="Action" value={formatTokenLabel(entry.action)} />
              <Detail label="Deployment type" value={entry.deploymentType} />
              <Detail label="Repository" value={mcp.repoFullName} />
              <Detail label="Branch" value={mcp.branch} />
              <Detail label="Commit" value={mcp.commitSha ? String(mcp.commitSha).slice(0, 12) : null} />
              <LinkedDetail label="Workflow run" value={mcp.runUrl} />
              <Detail label="Triggered by" value={mcp.triggeredBy} />
              <Detail label="Duration" value={mcp.durationMs != null ? `${Math.round(mcp.durationMs / 1000)}s` : null} />
              {entry.action === 'rollback' && (
                <>
                  <Detail label="Rollback from" value={entry.rollbackFromRevision ? String(entry.rollbackFromRevision).slice(0, 12) : null} />
                  <Detail label="Rollback to" value={entry.rollbackToRevision ? String(entry.rollbackToRevision).slice(0, 12) : null} />
                </>
              )}
              {mcp.failedStep && <Detail label="Failed step" value={mcp.failedStep} />}
            </>
          ) : (
            <>
              {!isMicroservice && <Detail label="Artifact" value={entry.artifactLabel} />}
              <LinkedDetail label="Deployment URL" value={entry.deploymentUrl} />
              <Detail label="Action" value={formatTokenLabel(entry.action)} />
              <Detail label="Deployment type" value={entry.deploymentType} />
              {!isMicroservice && <Detail label="Revision" value={entry.apigeeRevision} />}
              {!isMicroservice && <Detail label="Organization" value={entry.apigeeOrg} />}
              {!isMicroservice && <Detail label="Proxy" value={entry.apigeeProxyName} />}
              {!isMicroservice && <Detail label="Environment" value={entry.environment} />}
              {!isMicroservice && <Detail label="ServiceNow CR" value={entry.serviceNowCr} />}
              {!isMicroservice && <Detail label="Rollback from" value={entry.rollbackFromRevision} />}
              {!isMicroservice && <Detail label="Rollback to" value={entry.rollbackToRevision} />}
            </>
          )}

          {entry.errorMessage && (
            <div className="lg:col-span-3 rounded-lg border border-rose-500/25 bg-rose-500/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-rose-200">Error</p>
                <button
                  type="button"
                  onClick={() => copyText(entry.errorMessage, `${entry.id}-error`)}
                  className="inline-flex items-center gap-1 text-xs text-rose-100"
                >
                  {copiedId === `${entry.id}-error` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </button>
              </div>
              <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs text-rose-100">
                {entry.errorMessage}
              </p>
            </div>
          )}

          {entry.responsePayload && (
            <div className="lg:col-span-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Response</p>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">
                {JSON.stringify(entry.responsePayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

const stringifyLogPayload = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const buildDeploymentLogLines = (entry) => {
  if (!entry) return [];
  const isMicroservice = isMicroserviceHistoryEntry(entry);
  const isMcp = isMcpHistoryEntry(entry);
  const action = formatTokenLabel(entry.action).toLowerCase();
  const status = entry.status === 'failed' ? 'failed' : entry.status === 'success' ? 'completed' : 'pending';
  const resourceName = entry.apigeeProxyName || entry.name || 'selected resource';
  const target = [entry.apigeeOrg, entry.environment].filter(Boolean).join(' / ') || 'target runtime';
  const revision = entry.apigeeRevision || entry.rollbackToRevision || 'N/A';

  if (isMcp) {
    /*
     * MCP deploys run through GitHub Actions → Cloud Run. The log lines
     * should reflect that pipeline (workflow run, commit, deployed URL,
     * rollback linkage) rather than Apigee revision/management-plane
     * language. All values pulled from `entry.mcpDetails` written by
     * `loadDeploymentHistory()`'s MCP audit branch — no placeholders.
     */
    const mcp = entry.mcpDetails || {};
    const lines = [
      { level: 'info', message: `Deployment job opened for ${resourceName}.` },
      { level: 'info', message: `Action: ${formatTokenLabel(entry.action)} | Type: ${entry.deploymentType || 'GitHub Actions'} | Trigger: ${mcp.triggeredBy || 'system'}.` },
    ];
    if (mcp.repoFullName) {
      lines.push({ level: 'info', message: `Source: ${mcp.repoFullName}${mcp.branch ? ` @ ${mcp.branch}` : ''}.` });
    }
    if (mcp.commitSha) {
      lines.push({ level: 'info', message: `Commit ${shortRef(mcp.commitSha)} resolved for deploy.` });
    }
    if (mcp.runId || mcp.runUrl) {
      lines.push({ level: 'info', message: `GitHub workflow run ${shortRef(mcp.runId)} dispatched${mcp.runUrl ? ` (${mcp.runUrl})` : ''}.` });
    }
    if (entry.action === 'rollback' && entry.rollbackFromRevision) {
      lines.push({
        level: 'warn',
        message: `Rollback path selected — restoring commit from run ${shortRef(entry.rollbackFromRevision)}.`,
      });
    }
    if (mcp.deployedUrl) {
      lines.push({ level: 'success', message: `Cloud Run service URL: ${mcp.deployedUrl}.` });
    }
    if (entry.status === 'failed') {
      if (mcp.failedStep) {
        lines.push({ level: 'error', message: `Pipeline failed at step "${mcp.failedStep}".` });
      }
      if (entry.errorMessage) {
        lines.push({ level: 'error', message: entry.errorMessage });
      }
      lines.push({ level: 'error', message: `Deployment ${status}.` });
      return lines;
    }
    if (typeof mcp.durationMs === 'number') {
      lines.push({ level: 'debug', message: `Pipeline duration ${(mcp.durationMs / 1000).toFixed(1)}s.` });
    }
    lines.push({ level: 'success', message: `Deployment ${status}.` });
    if (entry.deployedAt) {
      lines.push({ level: 'info', message: `Audit entry stored at ${entry.deployedAt}.` });
    }
    return lines;
  }

  if (isMicroservice) {
    const lines = [
      { level: 'info', message: `Deployment job opened for ${resourceName}.` },
      { level: 'info', message: `Action: ${formatTokenLabel(entry.action)} | Type: ${entry.deploymentType || 'N/A'}.` },
    ];

    if (entry.deploymentUrl) {
      lines.push({ level: 'info', message: `Deployment URL: ${entry.deploymentUrl}.` });
    }

    if (entry.status === 'failed') {
      lines.push({ level: 'error', message: entry.errorMessage || 'Deployment request failed before completion.' });
      const payload = stringifyLogPayload(entry.responsePayload);
      if (payload) {
        lines.push({ level: 'debug', message: `Error response payload:\n${payload}` });
      }
      lines.push({ level: 'error', message: `Deployment ${status}.` });
      return lines;
    }

    if (entry.responsePayload) {
      lines.push({ level: 'debug', message: `Deployment response:\n${stringifyLogPayload(entry.responsePayload)}` });
    }

    lines.push({ level: 'success', message: `Deployment ${status}.` });
    lines.push({ level: 'info', message: `Post-deployment audit entry stored at ${entry.deployedAt || 'N/A'}.` });
    return lines;
  }

  const lines = [
    { level: 'info', message: `Deployment job opened for ${resourceName}.` },
    { level: 'info', message: `Action: ${formatTokenLabel(entry.action)} | Type: ${entry.deploymentType || 'N/A'} | Target: ${target}.` },
    { level: 'info', message: `Resolved artifact ${entry.artifactLabel || `Revision ${revision}`}.` },
  ];

  if (entry.serviceNowCr) {
    lines.push({ level: 'info', message: `Linked ServiceNow change request ${entry.serviceNowCr}.` });
  }

  if (entry.action === 'rollback') {
    lines.push({
      level: 'warn',
      message: `Rollback path selected from revision ${entry.rollbackFromRevision || 'current'} to revision ${entry.rollbackToRevision || revision}.`,
    });
  } else {
    lines.push({ level: 'info', message: `Promotion path selected for revision ${revision}.` });
  }

  lines.push({ level: 'info', message: `Submitted ${action} request to Apigee management plane.` });

  if (entry.status === 'failed') {
    lines.push({ level: 'error', message: entry.errorMessage || 'Deployment request failed before completion.' });
    const payload = stringifyLogPayload(entry.responsePayload);
    if (payload) {
      lines.push({ level: 'debug', message: `Error response payload:\n${payload}` });
    }
    lines.push({ level: 'error', message: `Deployment ${status} for revision ${revision}.` });
    return lines;
  }

  if (entry.responsePayload) {
    lines.push({ level: 'debug', message: `Management API response:\n${stringifyLogPayload(entry.responsePayload)}` });
  }

  lines.push({ level: 'success', message: `Deployment ${status} for revision ${revision}.` });
  lines.push({ level: 'info', message: `Post-deployment audit entry stored at ${entry.deployedAt || 'N/A'}.` });
  return lines;
};

function DeploymentLogModal({ entry, onClose, copiedId, copyText }) {
  const [githubStatus, setGithubStatus] = useState({ loading: false, error: '', data: null, history: null });

  useEffect(() => {
    let active = true;

    const loadGithubStatus = async () => {
      if (!entry?.microserviceId || !entry?.id) {
        setGithubStatus({
          loading: false,
          error: 'Deployment id is not available for GitHub status lookup.',
          data: null,
          history: entry,
        });
        return;
      }

      setGithubStatus({ loading: true, error: '', data: null, history: entry });

      // MCP entries don't have a senior `microservice` row in `microservice`
      // mongo collection, so the senior `/github/status` endpoint returns
      // 404. Use the MCP service's workflow-run endpoints + reshape into the
      // `{payload, run, jobs}` shape `GitHubDeploymentStatusPanel` expects.
      if (isMcpHistoryEntry(entry)) {
        const projectId = entry.microserviceId;
        const runId = entry.mcpDetails?.runId;
        const [latestRes, stepsRes] = await Promise.all([
          mcpGenerationService.getLatestWorkflowRun(projectId),
          runId ? mcpGenerationService.getWorkflowRunSteps(projectId, runId) : Promise.resolve({ success: true, data: null }),
        ]);
        if (!active) return;
        if (!latestRes.success && !stepsRes.success) {
          setGithubStatus({
            loading: false,
            error: latestRes.error || stepsRes.error || 'Unable to load GitHub pipeline status',
            data: null,
            history: entry,
          });
          return;
        }
        // Backend shape:
        //   { repo, repoName, runFound, runId, deploymentStatus,
        //     deployedServiceUrl, run: { id, name, displayTitle,
        //     status, conclusion, htmlUrl, createdAt, updatedAt } }
        // The nested `run` carries the timestamps + workflow name — we
        // were earlier reading them at the top level, hence the N/A.
        const latest = latestRes.success ? (latestRes.data || {}) : {};
        const steps = stepsRes.success ? (stepsRes.data || {}) : {};
        const nestedRun = (latest && latest.run) ? latest.run : {};

        // Normalise into the SAME shape the senior endpoint emits, so
        // `GitHubDeploymentStatusPanel` renders Started / Updated /
        // Duration / Repository / Workflow without a special-case path.
        const run = {
          id: nestedRun.id ?? latest.runId ?? runId,
          name: nestedRun.name ?? nestedRun.displayTitle,
          displayTitle: nestedRun.displayTitle ?? nestedRun.name,
          status: nestedRun.status,
          conclusion: nestedRun.conclusion,
          html_url: nestedRun.htmlUrl ?? nestedRun.html_url ?? entry.mcpDetails?.runUrl,
          // Panel reads both camel + snake — provide both for safety.
          createdAt: nestedRun.createdAt ?? nestedRun.created_at,
          updatedAt: nestedRun.updatedAt ?? nestedRun.updated_at,
          created_at: nestedRun.createdAt ?? nestedRun.created_at,
          updated_at: nestedRun.updatedAt ?? nestedRun.updated_at,
        };

        // The panel's `groupPipelineSteps` sorts every step across every
        // job by `step.number` and then groups them under one "Setup"
        // bucket unless it encounters `Start group: <name>` marker steps.
        // GitHub Actions assigns step numbers per-job (each job starts at
        // 1), so after the sort, step #1 from job-A interleaves with
        // step #1 from job-B and the user sees doubled rows like
        //   "1. Set up job (lint-and-test)" / "1. Set up job (deploy)".
        //
        // Fix without touching the panel:
        //   1. Prefix each job's step list with a synthetic
        //      "Start group: <jobName>" marker. The panel's grouping
        //      regex consumes it and opens a fresh collapsible section
        //      for that job's steps.
        //   2. Strip `step.number` from MCP entries — once jobs are
        //      properly grouped we no longer need the numeric sort,
        //      and stripping the number also avoids the redundant
        //      "1. " prefix in the display (matches how GitHub itself
        //      renders step names in the UI).
        const rawJobs = Array.isArray(steps?.jobs) ? steps.jobs : [];
        const jobs = rawJobs.map((job) => ({
          ...job,
          steps: [
            { name: `Start group: ${job.name || 'Job'}`, jobName: job.name },
            ...((job.steps) || []).map((s) => {
              // Drop number — keep startedAt/completedAt/status/conclusion.
              // eslint-disable-next-line no-unused-vars
              const { number, ...rest } = s;
              return { ...rest, jobName: job.name };
            }),
          ],
        }));
        setGithubStatus({
          loading: false,
          error: '',
          data: {
            // top-level keys read directly as `payload.*` in the panel
            deploymentId: entry.id || latest.runId || runId,
            runId: run.id,
            repo: latest.repo ?? entry.mcpDetails?.repoFullName,
            repoName: latest.repoName ?? entry.mcpDetails?.repoFullName,
            workflow: run.name ?? 'mcp-deploy',
            workflowName: run.name ?? 'mcp-deploy',
            deploymentStatus: latest.deploymentStatus,
            runUrl: run.html_url,
            // canonical run + jobs blocks the panel renders
            run,
            jobs,
            deployment: { deploymentId: entry.id || latest.runId || runId, id: entry.id },
            matched: !!run.id,
          },
          history: entry,
        });
        return;
      }

      const result = await deploymentService.getGithubPipelineStatus(entry.microserviceId, entry.id);
      if (!active) return;

      setGithubStatus({
        loading: false,
        error: result.success ? '' : result.error || 'Unable to load GitHub pipeline status',
        data: result.success ? result.data : null,
        history: entry,
      });
    };

    loadGithubStatus();
    return () => {
      active = false;
    };
  }, [entry]);

  if (!entry) return null;

  const isMicroservice = isMicroserviceHistoryEntry(entry);
  // MCP-aware rendering — declared at component scope so the header
  // subtitle, sidebar Details, and log-line builder can all reference
  // the same `isMcp` + `mcp` (sidecar bag with repo/branch/commit/
  // runUrl/deployedUrl/triggeredBy/durationMs/failedStep).
  const isMcp = isMcpHistoryEntry(entry);
  const mcp = entry.mcpDetails || {};
  const lines = buildDeploymentLogLines(entry);
  const logText = lines
    .map((line, index) => {
      const sequence = String(index + 1).padStart(2, '0');
      return `[${sequence}] ${line.level.toUpperCase()} ${line.message}`;
    })
    .join('\n');
  const statusClass = statusStyles[entry.status] || statusStyles.pending;
  const actionClass = actionStyles[entry.action] || actionStyles.promote;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-[#080d1d] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileCode2 className="h-4 w-4 text-cyan-300" />
              <h3 className="text-lg font-semibold text-white">Deployment log</h3>
              <Badge className={statusClass}>
                <StatusIcon status={entry.status} />
                {entry.status.toUpperCase()}
              </Badge>
              <Badge className={actionClass}>{entry.action.toUpperCase()}</Badge>
            </div>
            <p className="mt-2 truncate text-sm text-slate-400">
              {isMcp
                ? (() => {
                  /*
                   * MCP servers don't have Apigee revisions or environments —
                   * they deploy to a single Cloud Run URL via GitHub Actions.
                   * Show commit + run id (real values) instead of falling
                   * through to the Apigee shape ("Revision N/A | N/A").
                   */
                  const parts = [entry.name || 'MCP'];
                  if (mcp.commitSha) parts.push(`Commit ${shortRef(mcp.commitSha)}`);
                  if (mcp.runId) parts.push(`Run ${shortRef(mcp.runId)}`);
                  if (mcp.repoFullName) parts.push(mcp.repoFullName);
                  return parts.join(' | ');
                })()
                : isMicroservice
                  ? entry.name
                  : `${entry.apigeeProxyName || entry.name} | Revision ${entry.apigeeRevision || 'N/A'} | ${entry.environment || 'N/A'}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(logText, `${entry.id}-log`)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
            >
              {copiedId === `${entry.id}-log` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === `${entry.id}-log` ? 'Copied' : 'Copy log'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/40 text-slate-400 transition hover:bg-slate-900 hover:text-white"
              aria-label="Close deployment log"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-3">
            {isMcp ? (
              <>
                {/* MCP-shaped sidebar — real fields from `mcpDetails`, no N/A
                    placeholders for Apigee-only concepts (Org/Env/Revision). */}
                <LinkedDetail label="Deployed URL" value={mcp.deployedUrl || entry.deploymentUrl} />
                <LinkedDetail label="Run URL" value={mcp.runUrl} />
                <Detail label="Repository" value={mcp.repoFullName} />
                <Detail label="Branch" value={mcp.branch} />
                <Detail label="Commit" value={mcp.commitSha ? shortRef(mcp.commitSha) : null} />
                <Detail label="Triggered by" value={mcp.triggeredBy} />
                {mcp.failedStep && <Detail label="Failed step" value={mcp.failedStep} />}
                {/* <Detail label="Duration"
                        value={typeof mcp.durationMs === 'number'
                                 ? `${(mcp.durationMs / 1000).toFixed(1)}s`
                                 : null} /> */}
                <Detail label="Deployment type" value={entry.deploymentType} />
                <Detail label="Completed" value={entry.deployedAt} />
              </>
            ) : (
              <>
                {!isMicroservice && <Detail label="Organization" value={entry.apigeeOrg} />}
                {!isMicroservice && <Detail label="Environment" value={entry.environment} />}
                {isMicroservice && <LinkedDetail label="Deployment URL" value={entry.deploymentUrl} />}
                <Detail label="Deployment type" value={entry.deploymentType} />
                <Detail label="Completed" value={entry.deployedAt} />
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Log output</p>
              <p className="text-xs text-slate-600">{lines.length} entries</p>
            </div>
            <div className="max-h-[60vh] overflow-auto p-4 font-mono text-xs leading-6">
              {lines.map((line, index) => (
                <div key={`${line.level}-${index}`} className="grid grid-cols-[42px_74px_minmax(0,1fr)] gap-3 border-b border-slate-900/80 py-2 last:border-b-0">
                  <span className="text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                  <span
                    className={cn(
                      'font-semibold uppercase',
                      line.level === 'success' && 'text-emerald-300',
                      line.level === 'error' && 'text-rose-300',
                      line.level === 'warn' && 'text-amber-300',
                      line.level === 'debug' && 'text-cyan-300',
                      line.level === 'info' && 'text-slate-400'
                    )}
                  >
                    {line.level}
                  </span>
                  <span className="whitespace-pre-wrap break-words text-slate-200">{line.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <GitHubDeploymentStatusPanel
              state={githubStatus}
              title="GitHub Pipeline Status"
              description="Fetched from the deployment GitHub status endpoint for this history entry."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-200">{value || 'N/A'}</p>
    </div>
  );
}

function LinkedDetail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-sm font-medium text-orange-200 transition-colors hover:text-white"
          title={value}
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 text-sm font-medium text-slate-500">N/A</p>
      )}
    </div>
  );
}
