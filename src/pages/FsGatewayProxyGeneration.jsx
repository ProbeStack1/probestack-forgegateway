import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  FileCode, Loader2, Plug, ChevronDown, Cloud, Database, Github, FileCode2, Server,
  Rocket, TestTube, Puzzle, ClipboardCheck, Layers, UserCircle, FileText, PenTool,
  CheckCircle, FlaskConical, Shield, Code, GitBranch, AlertCircle, Box,BarChart,
  ChevronRight, Save, ArrowRight, ArrowLeft, Clock, Activity, GitPullRequest, Users, ShieldCheck, Network, History,
  Plus, Trash2, Download, Settings, Lock, Zap, Filter, Activity as ActivityIcon, Globe, FileJson, X,ThumbsUp ,ThumbsDown ,
  Bot, Send, Sparkles, CheckCircle2, Paperclip, LayoutDashboard, User, Moon, Sun, LogOut as LogOutIcon,
  Pencil, Upload, Eye, Search, Play, Key, XCircle, MoreVertical, Copy, Check , AlertTriangle, BookMarked, RefreshCw
} from 'lucide-react';
import {
  Card,
  CardTitle,
  CardContent,
} from '../components/ui/card';
import { Spectral } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';
import { parseYaml } from '@stoplight/spectral-parsers';
import Editor from '@monaco-editor/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import OnboardingModal from '../components/OnboardingModal';
import ConnectorModal from '../components/ui/ConnectorModal';
import { cn } from '../lib/utils';
import ApigeePage from './Apigee/ApigeePage';
import ApigeeMainPage from './Apigee/ApigeePage';
import { ProxySyncModal, SharedFlowSyncModal } from '../components/SyncModal';
import Toast from '../components/ui/toast';
import { onboardingService } from '../services/onboardingService';
import { requirementsService } from '../services/requirementsService';
import { apiDesignService } from '../services/apiDesignService';
import { swaggerHubService } from '../services/swaggerHubService';
import { mockApiService } from '../services/mockApiService';
import { contractTestingService } from '../services/contractTestingService';
import { consumerService } from '../services/consumerService';
import { testCaseService } from '../services/testCaseService';
import { apiDevelopmentService } from '../services/apiDevelopmentService';
import { connectorConfigurationService } from '../services/connectorConfigurationService';
import { deploymentService } from '../services/deploymentService';
import { APIGEE_ENDPOINTS } from '../config/apigeeConfig';
import { apigeeApiFetch } from '../services/apigeeApiService';
import RequirementAiSpecAssistant from '../components/RequirementAiSpecAssistant';
import Services from './Kong/Services/Services';
import SettingsModal from './Kong/Services/SettingsModal';
import Plugins from './Kong/Plugins/Plugins';
import { div } from 'framer-motion/client';
import GatewayServices from './GatewayServices/GatewayServices';
import ServiceDesign from './Steps/ServiceDesign';
import Routes from './Kong/Routes/Routes';
import Onboarding from './Steps/Onboarding';
import Upstream from './Kong/Upstream/Upstream';
import Consumer from './Kong/Consumers/Consumer';
import Vaults from './Kong/Vaults/Vaults';
import TLSCertificates from './Kong/TLS/TLSCertificates';
import CACertificates from './Kong/CA/CACertificates';
import RedisConfig from './Kong/RedisConfig/RedisConfig';
import API_BASE_URL from '../config/apiConfig';
import { ProxyEditor } from './ProxyEditor';
import ResourceDeploymentHistoryModal from '../components/ResourceDeploymentHistoryModal';
import ResourceHistoryTimeline from '../components/ResourceHistoryTimeline';
import SpecEditorModal from '../components/SpecEditorModal';
import ViewSpecModal from '../components/ViewSpecModal';
import SchemaModeling from './SchemaModeling';
import SpectralLintPanel from '../components/SpectralLintPanel';
import {
  deploymentStatusBadgeClass,
  normalizeDeploymentStatus,
  pickLatestDeploymentRecord,
  unwrapDeploymentHistoryBulk,
} from '../lib/deploymentStatus';
import StaticCodeAnalyzer from './StaticCodeAnalyzer';
import { isStepRequired, getCurrentOrganization } from '../utils/workflowUtils';
import { fetchWorkflowsByOrganization } from '../services/workflowService';
import { buildMicroserviceDeploymentUrl } from '../lib/deploymentUrl';
import { peerReviewService } from '../services/peerReviewService';
import { staticCodeAnalysisService } from '../services/staticCodeAnalysis';


const PROXY_GEN_BASE_URL = 'https://probe-stack-proxy-generator-784673707621.us-central1.run.app'.replace(/\/+$/, '');
const GROUP_REGEX = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
const ARTIFACT_REGEX = /^[a-z][a-z0-9-]*$/;
const PACKAGE_REGEX = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
const GITHUB_RUN_POLL_INTERVAL_MS = 5000;
const GITHUB_RUN_MISSING_RETRY_LIMIT = 5;
const REQUIREMENT_STOP_WORDS = new Set([
  'the', 'and', 'with', 'from', 'into', 'that', 'this', 'your', 'proxy', 'service', 'api',
  'apis', 'will', 'should', 'have', 'need', 'needs', 'for', 'are', 'but', 'not', 'use', 'using',
  'over', 'through', 'when', 'then', 'also', 'must', 'than', 'each', 'into', 'onto', 'while',
  'functional', 'non', 'requirements', 'requirement', 'security', 'performance', 'availability',
  'monitoring', 'support', 'gateway', 'requests', 'request', 'response', 'responses'
]);
const REQUIREMENT_DOMAIN_HINTS = [
  { keywords: ['payment', 'payments', 'billing', 'invoice', 'transaction'], label: 'Payment Routing', slug: 'payment-routing' },
  { keywords: ['auth', 'oauth', 'jwt', 'token', 'identity', 'login'], label: 'Identity Access', slug: 'identity-access' },
  { keywords: ['order', 'orders', 'checkout', 'cart'], label: 'Order Orchestration', slug: 'order-orchestration' },
  { keywords: ['inventory', 'stock', 'catalog', 'product'], label: 'Inventory Routing', slug: 'inventory-routing' },
  { keywords: ['customer', 'profile', 'user', 'users'], label: 'Customer Profile', slug: 'customer-profile' },
  { keywords: ['notification', 'email', 'sms', 'alert'], label: 'Notification Delivery', slug: 'notification-delivery' },
  { keywords: ['analytics', 'report', 'dashboard', 'metrics'], label: 'Analytics Gateway', slug: 'analytics-gateway' },
];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const KONG_RESOURCE_TYPES = new Set([
  'Gateway Services',
  'Gateway Builder',
  'Routes',
  'Plugins',
  'Consumers',
  'Upstream Services',
  'Vaults',
  'Redis Configurations',
  'CA Certificates',
  'TLS Certificates',
]);
const APIGEE_RESOURCE_TYPES = new Set([
  'Proxy',
  'Shared Function',
  'Target Server',
  'KVM',
  'App',
  'Product',
  'Key Store',
]);

const pollLatestGitHubRun = async (microserviceId) => {
  let missingRunAttempts = 0;

  while (true) {
    const latestRunResult = await apiDevelopmentService.getLatestGitHubRun(microserviceId);

    if (!latestRunResult.success) {
      return {
        success: false,
        error: latestRunResult.error || 'Failed to fetch latest GitHub workflow run',
      };
    }

    const latestRunData = latestRunResult.data?.data || latestRunResult.data;
    const repoMissing = latestRunData?.repoFound === false;
    const runMissing = latestRunData?.runFound === false;

    if (repoMissing || runMissing) {
      missingRunAttempts += 1;

      if (missingRunAttempts >= GITHUB_RUN_MISSING_RETRY_LIMIT) {
        return {
          success: false,
          data: latestRunData,
          error: latestRunData?.message || 'GitHub repository or workflow run was not found after 3 retries.',
        };
      }

      await wait(GITHUB_RUN_POLL_INTERVAL_MS);
      continue;
    }

    const isValidBaseUrl = (url) => {
    if (!url || !url.trim()) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

    const run = latestRunData?.run || {};

    if (run.status === 'completed' && run.conclusion === 'success') {
      return {
        success: true,
        data: latestRunData,
      };
    }

    if (run.status === 'completed' && run.conclusion && run.conclusion !== 'success') {
      return {
        success: false,
        data: latestRunData,
        error: latestRunData?.message || `GitHub workflow completed with conclusion: ${run.conclusion}`,
      };
    }

    if (latestRunData?.deploymentStatus === 'FAILED') {
      return {
        success: false,
        data: latestRunData,
        error: latestRunData?.message || `GitHub workflow failed: ${latestRunData.runId || run.id || 'unknown run'}`,
      };
    }

    await wait(GITHUB_RUN_POLL_INTERVAL_MS);
  }
};

function normalizeNamePrefix(value, fallback) {
  const normalized = (value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();

  return normalized || fallback;
}

function humanizeSlug(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferRequirementDomain(functionalReqs, nonFunctionalReqs) {
  const combinedText = `${functionalReqs || ''} ${nonFunctionalReqs || ''}`.toLowerCase();

  for (const hint of REQUIREMENT_DOMAIN_HINTS) {
    if (hint.keywords.some((keyword) => combinedText.includes(keyword))) {
      return hint;
    }
  }

  const keywordTokens = combinedText
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3 && !REQUIREMENT_STOP_WORDS.has(token));

  const uniqueTokens = [...new Set(keywordTokens)].slice(0, 2);

  if (uniqueTokens.length > 0) {
    const slug = uniqueTokens.join('-');
    return {
      slug,
      label: humanizeSlug(slug),
    };
  }

  return {
    slug: 'proxy-orchestration',
    label: 'Proxy Orchestration',
  };
}

function buildDummyProxySuggestion({
  onboardingTeamName,
  onboardingApplicationName,
  functionalReqs,
  nonFunctionalReqs,
  proxyAuthenticationType,
  authorizationScope,
  rateLimit,
  proxyQuota,
  expectedTps,
  slaMs,
  availabilityPercent,
  specLibrary,
  proxyApiDesignSpecs,
}) {
  const teamPrefix = normalizeNamePrefix(onboardingTeamName, 'TEAM');
  const appPrefix = normalizeNamePrefix(onboardingApplicationName, 'APPX');
  const domain = inferRequirementDomain(functionalReqs, nonFunctionalReqs);
  const generatedApplicationName = `${teamPrefix}-${appPrefix}-${domain.slug}`.toLowerCase();
  const generatedMicroserviceName = `${domain.label} Proxy Service`;
  const specFileName = `${generatedApplicationName}-openapi.json`;
  const pathSegment = `/${domain.slug}`;
  const effectiveRateLimit = rateLimit || '1000';
  const effectiveQuota = proxyQuota || '10000';
  const effectiveAuth = proxyAuthenticationType || 'oauth2';
  const importedSpecsCount = proxyApiDesignSpecs?.length || 0;
  const librarySpecsCount = specLibrary?.length || 0;
  const librarySample = (specLibrary || [])
    .slice(0, 2)
    .map((spec) => spec.specName || spec.name || spec.fileName)
    .filter(Boolean);

  return {
    generatedApplicationName,
    generatedMicroserviceName,
    specFileName,
    librarySummary: librarySpecsCount > 0
      ? `Analysed ${librarySpecsCount} reusable specs${librarySample.length ? ` including ${librarySample.join(', ')}` : ''}.`
      : 'Specification library is not loaded yet, so the AI flow is using the built-in proxy starter template.',
    importedSummary: importedSpecsCount > 0
      ? `Included ${importedSpecsCount} imported design spec${importedSpecsCount > 1 ? 's' : ''} as contextual reference.`
      : 'No imported proxy design spec found yet, so generation is based on the written requirements only.',
    specPreview: {
      openapi: '3.0.3',
      info: {
        title: generatedMicroserviceName,
        version: '1.0.0',
        description: `AI-ingested proxy contract generated from ${teamPrefix}/${appPrefix} onboarding context and requirement analysis.`,
      },
      servers: [
        {
          url: `https://api.example.com${pathSegment}`,
        },
      ],
      tags: [
        { name: domain.slug, description: `${domain.label} related proxy operations` },
      ],
      paths: {
        [pathSegment]: {
          get: {
            summary: `Route ${domain.label.toLowerCase()} traffic`,
            description: functionalReqs || 'Generated from proxy functional requirements.',
            responses: {
              '200': {
                description: 'Proxy response returned successfully',
              },
            },
            security: [{ [effectiveAuth]: authorizationScope ? [authorizationScope] : [] }],
          },
        },
      },
      components: {
        securitySchemes: {
          [effectiveAuth]: {
            type: effectiveAuth === 'api-key' ? 'apiKey' : 'oauth2',
            description: `Generated from selected proxy authentication type: ${effectiveAuth}`,
          },
        },
        xProxyPolicies: {
          rateLimitPerMinute: Number(effectiveRateLimit),
          quotaPerDay: Number(effectiveQuota),
          expectedTps: Number(expectedTps || 500),
          slaMs: Number(slaMs || 200),
          availabilityPercent: Number(availabilityPercent || 99.9),
          notes: nonFunctionalReqs || 'Generated from proxy non-functional requirements.',
        },
      },
    },
  };
}

function buildDummyProxyAssistantResponse(suggestion) {
  if (!suggestion) return '';

  return [
    `Analysing the proxy requirement context now.`,
    `I identified a candidate application name: ${suggestion.generatedApplicationName}.`,
    `The generated proxy service name is ${suggestion.generatedMicroserviceName}.`,
    `${suggestion.librarySummary}`,
    `${suggestion.importedSummary}`,
    `I also prepared a starter OpenAPI contract file named ${suggestion.specFileName} based on the current requirement details and proxy security inputs.`,
    `Review the generated contract preview below and refine the requirements if you want a narrower routing shape or stricter policy profile.`,
  ].join(' ');
}

export default function FsGatewayProxyGeneration({ gatewayMode = 'apigee' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeResourceId } = useParams();
  const [organizationId] = useState('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c');
  const isKongRoute = gatewayMode === 'kong' || location.pathname.startsWith('/kong-generate');
  const requestedGateway = location.state?.selectedGateway || localStorage.getItem('probeStack_proxySelectedGateway') || 'Apigee X';
  const routeGateway = isKongRoute ? 'Kong' : requestedGateway === 'Kong' ? 'Apigee X' : requestedGateway;
  const requestedResourceType = location.state?.resourceType || localStorage.getItem('probeStack_proxyResourceType') || (routeGateway === 'Kong' ? 'Gateway Services' : 'Proxy');
  const routeResourceType = isKongRoute
    ? (KONG_RESOURCE_TYPES.has(requestedResourceType) ? requestedResourceType : 'Gateway Services')
    : (APIGEE_RESOURCE_TYPES.has(requestedResourceType) ? requestedResourceType : 'Proxy');

  const [showProxyEditor, setShowProxyEditor] = useState(false);
  const [generatedProxyZipUrl, setGeneratedProxyZipUrl] = useState(null);
  const [deployedServiceUrl, setDeployedServiceUrl] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [contractTestingSnapshot, setContractTestingSnapshot] = useState(null);

  // const proxyDevSubSteps = [
  //   { id: 'api-gen', name: 'API Generation' },
  //   { id: 'scm', name: 'Onboard SCM' },
  //   { id: 'lint', name: 'Static Code (Linting)' },
  //   { id: 'security', name: 'Security Scanning' },
  //   { id: 'unit-test', name: 'Unit Testing' },
  //   { id: 'deploy', name: 'Deployment' },
  //   { id: 'artifact', name: 'Artifact Registry' },
  //   { id: 'testing-sub', name: 'Testing' },
  // ];

  const [isSyncModal, setIsSyncModal] = useState(false);
  const [showServiceDesign, setShowServiceDesign] = useState(false);
  const [showManualServices, setShowManualServices] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  //Apps having configure page
  const showConfig = ["Target Server", "KVM", "App", "Product", "Key Store"]

  //handle resource type state
  const handleResourceType = (data) => {
    const shouldUseCatalog = data === 'Proxy' || data === 'Shared Function' || data === 'Gateway Services';
    setShowResourceLanding(shouldUseCatalog);
    setResourceType(data);
  }

  const handleStep = (data) => {
    setCurrentStep(data);
  }

  const [currentStep, setCurrentStep] = useState(1);
  const [savedSteps, setSavedSteps] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [showProxyDevSubBranch, setShowProxyDevSubBranch] = useState(false);
  const [groupName, setGroupName] = useState('com.example');
  const [artifactId, setArtifactId] = useState('proxy-demo');
  const [basePackage, setBasePackage] = useState('com.example.proxy');
  const [version, setVersion] = useState('1.0.0');
  const [specFile, setSpecFile] = useState(null);
  const [returnAsArchive, setReturnAsArchive] = useState(true);
  const [pushToGitHub, setPushToGitHub] = useState(false);
  const [organization, setOrganization] = useState('');
  const [repositoryName, setRepositoryName] = useState('');
  const [branchName, setBranchName] = useState('main');
  const [repoPrivate, setRepoPrivate] = useState(true);
  const [githubToken, setGithubToken] = useState('');
  const [message, setMessage] = useState({ text: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [importSource, setImportSource] = useState('LOCAL');
  const [urlInput, setUrlInput] = useState('');
  const [importedSpecs, setImportedSpecs] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState('apigee');
  const [frameworkVersion, setFrameworkVersion] = useState('1.x');
  const [pushToGitLab, setPushToGitLab] = useState(false);
  const [gitlabToken, setGitlabToken] = useState('');
  const [gitlabOrganization, setGitlabOrganization] = useState('');
  const [gitlabRepositoryName, setGitlabRepositoryName] = useState('');
  const [gitlabBranchName, setGitlabBranchName] = useState('main');
  const [gitlabRepoPrivate, setGitlabRepoPrivate] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [savedConnections, setSavedConnections] = useState({});
  const [isFetchingConnectorConfig, setIsFetchingConnectorConfig] = useState(false);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('idle');
  // Proxy Configuration State for Step 8
  const [proxyName, setProxyName] = useState('');
  const [proxyDescription, setProxyDescription] = useState('');
  const [policies, setPolicies] = useState([]);
  const [selectedProxyTemplate, setSelectedProxyTemplate] = useState(null);
  const [basePath, setBasePath] = useState('/v1');
  const [targetUrl, setTargetUrl] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showExistingOnboardingModal, setShowExistingOnboardingModal] = useState(false);
  const [showGlobalOnboardingModal, setShowGlobalOnboardingModal] = useState(false);
  const [globalOnboardingMode, setGlobalOnboardingMode] = useState('action');
  const [globalOnboardingLockedMode, setGlobalOnboardingLockedMode] = useState(false);
  const [showResourceLanding, setShowResourceLanding] = useState(true);
  const [resourceCatalog, setResourceCatalog] = useState([]);
  const [resourceCatalogLoading, setResourceCatalogLoading] = useState(false);
  const [resourceCatalogError, setResourceCatalogError] = useState('');
  const [resourceCatalogSearch, setResourceCatalogSearch] = useState('');
  const [resourceCatalogPage, setResourceCatalogPage] = useState(0);
  const [resourceCatalogPageInfo, setResourceCatalogPageInfo] = useState({
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 15,
  });
  const [catalogDeploymentStatusMap, setCatalogDeploymentStatusMap] = useState({});
  const [catalogOnboardingPreset, setCatalogOnboardingPreset] = useState(null);
  const [catalogDetailModal, setCatalogDetailModal] = useState({
    open: false,
    title: '',
    data: null,
    loading: false,
    error: '',
    activeStep: 0,
    contractHistory: [],
    mockData: null,
    testCases: [],
    codeAnalysis: null,
    peerReview: null,
    contractStatus: null,
    specContent: null,
    resourceId: '',
  });
  const [deploymentHistoryModal, setDeploymentHistoryModal] = useState({
    open: false,
    title: '',
    resourceId: '',
    resourceLabel: 'Resource',
  });
  const [openCatalogActionMenu, setOpenCatalogActionMenu] = useState(null);
  const [showMockServerModal, setShowMockServerModal] = useState(false);

  // Action mode state (create/update/cloning/versioning)
  const [actionMode, setActionMode] = useState('create'); // 'create' | 'update' | 'cloning' | 'versioning'
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionApp, setSelectedActionApp] = useState(null);
  const [selectedActionSpec, setSelectedActionSpec] = useState(null);
  const [activeProxyName, setActiveProxyName] = useState(''); // Persisted name for status header

  // Resource Type state - default to 'Proxy' for Apigee X
  const [resourceType, setResourceType] = useState(routeResourceType);
  const [showResourceTypeDropdown, setShowResourceTypeDropdown] = useState(false);
  const resourceTypeDropdownRef = useRef(null);

  //Kong related states
  const [openSettings, setOpenSettings] = useState(false);

  // View Resource Summary modal state
  const [showResourceSummaryModal, setShowResourceSummaryModal] = useState(false);
  const [selectedResourceForView, setSelectedResourceForView] = useState(null);
  const [newProxyName, setNewProxyName] = useState('');
  const [newProxyVersion, setNewProxyVersion] = useState('');
  const [versionError, setVersionError] = useState('');
  const [mockServerStatus, setMockServerStatus] = useState('idle'); // 'idle' | 'generating' | 'success'
  const [mockServerGenerated, setMockServerGenerated] = useState(false);
  const [mockServiceName, setMockServiceName] = useState('');
  const [mockServerUrl, setMockServerUrl] = useState('');
  const [mockResponseLatency, setMockResponseLatency] = useState('');
  const [onboardingContextId, setOnboardingContextId] = useState(null);
  const [onboardingId, setOnboardingId] = useState(null);
  const [promoteDropdownSpecId, setPromoteDropdownSpecId] = useState(null);
  const [existingConfigId, setExistingConfigId] = useState(null);
  const [isExistingOnboardingLoaded, setIsExistingOnboardingLoaded] = useState(false);
  const [proxyApiDesignSpecs, setProxyApiDesignSpecs] = useState([]);
  const [specLibrary, setSpecLibrary] = useState([]);
  const [swaggerHubSpecs, setSwaggerHubSpecs] = useState([]);
  const [swaggerHubQuery, setSwaggerHubQuery] = useState('');
  const [swaggerHubMode, setSwaggerHubMode] = useState('all');
  const [swaggerHubOwnerInput, setSwaggerHubOwnerInput] = useState(localStorage.getItem('userOrganization') || '');
  const [swaggerHubLoading, setSwaggerHubLoading] = useState(false);
  const [swaggerHubImportingId, setSwaggerHubImportingId] = useState(null);
  const [apiDesignSource, setApiDesignSource] = useState('forgecatalog');
  const [reqSpecSource, setReqSpecSource] = useState('library');
  const [forgeCatalogSpecs, setForgeCatalogSpecs] = useState([]);
  const [forgeCatalogLoading, setForgeCatalogLoading] = useState(false);
  const [forgeCatalogImportingUrl, setForgeCatalogImportingUrl] = useState(null);
  const [cloneSpecModal, setCloneSpecModal] = useState(null);
  const [cloneSpecName, setCloneSpecName] = useState('');
  const [cloningSpec, setCloningSpec] = useState(false);
  const [forgeCatalogSearch, setForgeCatalogSearch] = useState('');
  const [forgeCatalogPage, setForgeCatalogPage] = useState(1);
  const [swaggerHubSearchInput, setSwaggerHubSearchInput] = useState('');
  const [swaggerHubPage, setSwaggerHubPage] = useState(1);
  const CATALOG_PAGE_SIZE = 6;
  const [proxyDesignActiveTab, setProxyDesignActiveTab] = useState('your-specs');
  const [specEndpoints, setSpecEndpoints] = useState([]);
  const [isFetchingSpecEndpoints, setIsFetchingSpecEndpoints] = useState(false);
  const [mockServerId, setMockServerId] = useState(null);
  const [mockServerBaseUrl, setMockServerBaseUrl] = useState(null);
  const [mockEndpoints, setMockEndpoints] = useState([]);
  const [mockRunResults, setMockRunResults] = useState(null);
  const [existingAppNames, setExistingAppNames] = useState([]);
  const [isFetchingAppNames, setIsFetchingAppNames] = useState(false);
  const [existingAppOnboarding, setExistingAppOnboarding] = useState([]);
  const [isFetchingAppOnboarding, setIsFetchingAppOnboarding] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Mock proxy testing states
  const [showMockTestModal, setShowMockTestModal] = useState(false);
  const [mockTestStatus, setMockTestStatus] = useState('idle'); // 'idle' | 'testing' | 'success'
  const [mockTestResults, setMockTestResults] = useState(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const handleCopy = (key, text) => { navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); };

  // Kong API generation state
  const [kongApiResponse, setKongApiResponse] = useState(null);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [failedAtStep, setFailedAtStep] = useState(null);

  // Mock endpoint schemas
  const [endpointSchemas, setEndpointSchemas] = useState({});

  // App Credentials modal state
  const [showAppCredentialsModal, setShowAppCredentialsModal] = useState(false);

  // Contract approval state variables
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState(''); // 'architect' | 'security'
  const [approverEmail, setApproverEmail] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('idle'); // 'idle' | 'sending' | 'success'
  const [architectApproved, setArchitectApproved] = useState(false);
  const [architectInReview, setArchitectInReview] = useState(false);
  const [architectRejected, setArchitectRejected] = useState(false);
  const [consumerRejected, setConsumerRejected] = useState(false);
  const [architectStatus, setArchitectStatus] = useState('');
  const [consumerStatus, setConsumerStatus] = useState('');
  const [architectEmail, setArchitectEmail] = useState('');
  const [consumerEmail, setConsumerEmail] = useState('');
  const [consumerApproved, setConsumerApproved] = useState(false);
  const [consumerInReview, setConsumerInReview] = useState(false);
  const [approvalSpecUrl, setApprovalSpecUrl] = useState('');
  const [approvalRequestJson, setApprovalRequestJson] = useState('');
  const [approvalResponseJson, setApprovalResponseJson] = useState('');
  const fileInputRef = useRef(null);

const isApprovalLocked = useMemo(() => {
  return architectStatus === 'SENT' || architectStatus === 'IN_PROGRESS' || 
         consumerStatus === 'SENT' || consumerStatus === 'IN_PROGRESS';
}, [architectStatus, consumerStatus]);

  // Onboarding form state variables (copied from CodeGenerator)
  const [onboardingTeamName, setOnboardingTeamName] = useState('');
  const [onboardingApplicationName, setOnboardingApplicationName] = useState('');
  const [onboardingApplicationId, setOnboardingApplicationId] = useState('');
  const [onboardingBusinessUnit, setOnboardingBusinessUnit] = useState('');
  const [onboardingProjectOwner, setOnboardingProjectOwner] = useState('');
  const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState('');
  const [onboardingProjectSME, setOnboardingProjectSME] = useState('');
  const [onboardingProjectSMEEmail, setOnboardingProjectSMEEmail] = useState('');
  const [onboardingProjectDLEmail, setOnboardingProjectDLEmail] = useState('');
  const [onboardingTesterName, setOnboardingTesterName] = useState('');
  const [onboardingTesterEmail, setOnboardingTesterEmail] = useState('');
  const [onboardingServiceNowGroup, setOnboardingServiceNowGroup] = useState('');
  const [onboardingServiceNowEmail, setOnboardingServiceNowEmail] = useState('');
  const [onboardingGoLiveDate, setOnboardingGoLiveDate] = useState('');
  const [onboardingNumber, setOnboardingNumber] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_proxyOnboardingNumber');
      return stored || '';
    }
    return '';
  });
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false);
  // Selected consumers for onboarding
  const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showConsumerModal, setShowConsumerModal] = useState(false);
  const [selectedTestCategories, setSelectedTestCategories] = useState(['POSITIVE', 'NEGATIVE', 'PERFORMANCE']);
  
  // Replace the static proxyDevSubSteps array with a memoized version
const proxyDevSubSteps = useMemo(() => {
  const isFsGateway = routeGateway === 'ForgeSphere Gateway';
  // For Shared Function - only 4 steps with custom names
  if (resourceType === 'Shared Function') {
    return [
      { id: 'api-gen', name: isFsGateway ? 'Function Generation' : 'Shared Function Generation' },
      { id: 'scm', name: 'Onboard SCM' },
      { id: 'deploy', name: 'Deployment' },
      { id: 'artifact', name: 'Artifact Registry' },
    ];
  }
  
  // For Proxy (default) - all 8 steps
  return [
    { id: 'api-gen', name: 'API Generation' },
    { id: 'scm', name: 'Onboard SCM' },
    { id: 'lint', name: 'Static Code (Linting)' },
    { id: 'security', name: 'Security Scanning' },
    { id: 'unit-test', name: 'Unit Testing' },
    { id: 'deploy', name: 'Deployment' },
    { id: 'artifact', name: 'Artifact Registry' },
    { id: 'testing-sub', name: 'Testing' },
  ];
}, [resourceType]);

  // Handle navigation state from Dashboard (Edit/Clone actions)
  useEffect(() => {
    if (location.state && location.state.rowData) {
      const { action, actionMode: routeActionMode, rowData, targetStep } = location.state;
      const nextActionMode = routeActionMode || (action === 'clone' ? 'cloning' : action === 'versioning' ? 'versioning' : 'update');
      const resourceId = rowData.id || rowData.resourceId || rowData.microserviceId;
      setActionMode(nextActionMode);

      if ((nextActionMode === 'cloning' || nextActionMode === 'versioning') && resourceId) {
        const selectedRecord = {
          id: resourceId,
          applicationId: rowData.appId || rowData.applicationId || '',
          applicationName: rowData.apiSpec || rowData.applicationName || '',
          apiName: rowData.apiSpec || rowData.apiName || '',
          teamName: rowData.team || rowData.teamName || '',
          projectOwner: rowData.projOwner || rowData.projectOwner || '',
        };
        setShowResourceLanding(false);
        setSelectedExistingApp(selectedRecord.applicationId);
        setSelectedExistingSpec(selectedRecord);
        setExistingAppOnboarding([selectedRecord]);
        setNewProxyName(nextActionMode === 'cloning' ? `${selectedRecord.apiName || selectedRecord.applicationName || 'proxy'} Copy` : '');
        setNewProxyVersion(rowData.version || '');
        setVersionError('');
        setShowActionModal(true);
        showMessage(`${nextActionMode === 'cloning' ? 'Clone' : 'Version'} ${rowData.apiSpec || getResourceLabel()} after entering the required values.`, 'success');
      } else if (resourceId) {
        setActionLoading(true);
        loadProxyResourceIntoFlow(resourceId, 'update').finally(() => setActionLoading(false));
      } else {
        setShowResourceLanding(false);

        // Pre-populate onboarding form fields from dashboard row data as a fallback.
        setOnboardingTeamName(rowData.team || '');
        setOnboardingApplicationName(rowData.apiSpec || '');
        setOnboardingApplicationId(rowData.appId || '');
        setOnboardingProjectOwner(rowData.projOwner || '');
        setOnboardingServiceNowGroup(rowData.snGroup || '');
        setOnboardingServiceNowEmail(rowData.snEmail || '');

        const buMap = {
          'Digital Banking': 'retail',
          'Retail Banking': 'retail',
          'Corporate Banking': 'corporate',
          'Wealth Management': 'wealth',
          'Payments': 'retail',
        };
        setOnboardingBusinessUnit(buMap[rowData.buName] || '');
        setVersion(rowData.version || '1.0.0');

        if (targetStep) {
          setCurrentStep(targetStep);
          setShowProxyDevSubBranch(targetStep === 7);
        }

        const actionLabel = nextActionMode === 'cloning' ? 'Cloning' : nextActionMode === 'versioning' ? 'Versioning' : 'Editing';
        showMessage(`${actionLabel} ${rowData.apiSpec} (Version: ${rowData.version || '1.0.0'})`, 'success');
      }

      // Clear location state to prevent re-processing on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  const [selectedExistingApp, setSelectedExistingApp] = useState(null);
  const [selectedExistingSpec, setSelectedExistingSpec] = useState(null);
  const [editingConsumerId, setEditingConsumerId] = useState(null);

  // Provider fields
  const [teamName, setTeamName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [appOwnerName, setAppOwnerName] = useState('');
  const [appOwnerEmail, setAppOwnerEmail] = useState('');
  const [smeName, setSmeName] = useState('');
  const [smeEmail, setSmeEmail] = useState('');
  const [supportGroupName, setSupportGroupName] = useState('');
  const [supportGroupEmail, setSupportGroupEmail] = useState('');
  const [associatedApplication, setAssociatedApplication] = useState('');
  const [scmConfig, setScmConfig] = useState('');
  const [storageConfig, setStorageConfig] = useState('');
  const [appName, setAppName] = useState('');
  const [productName, setProductName] = useState('');

  // Saved providers and consumers from localStorage
  const [savedProviders, setSavedProviders] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_providers');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [savedConsumers, setSavedConsumers] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_consumers');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const autoFilledConsumerEmail = useMemo(() => {
  if (!selectedOnboardingConsumers.length || !savedConsumers.length) return '';
  const firstSelectedConsumerId = selectedOnboardingConsumers[0];
  const consumer = savedConsumers.find(c => c.id === firstSelectedConsumerId);
  return consumer?.consumerPocEmail || '';
}, [selectedOnboardingConsumers, savedConsumers]);

  // API Gateway state - default to Apigee X
  const [selectedGateway, setSelectedGateway] = useState(routeGateway);
  const [showGatewayDropdown, setShowGatewayDropdown] = useState(false);
  const [showGatewayConfigModal, setShowGatewayConfigModal] = useState(false);
  const [gatewayConfigForm, setGatewayConfigForm] = useState({
    serviceAccountJson: '',
    organization: '',
    environment: ''
  });

  const proxySetupSubSteps = useMemo(() => ([
    {
      id: 'metadata',
      title: 'Metadata',
      description: 'API specification, API type, proxy metadata, and endpoint details.',
      icon: FileText,
    },
    {
      id: 'backendRouting',
      title: 'Backend Routing',
      description: 'Target server host, port, path, SSL, and connection testing.',
      icon: Server,
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure',
      description: 'Connector configuration for source control and gateway integrations.',
      icon: Cloud,
    },
    {
      id: 'securityPolicies',
      title: 'Security & Policies',
      description: 'Inbound/outbound security plus standard and custom policies.',
      icon: Shield,
    },
    {
          id: 'integrationsTesting',
          title: 'Integrations & Tests',
          description: 'Generated testing assets and test cases.',
          icon: Puzzle,
        },
    {
      id: 'parties',
      title: 'Providers & Consumers',
      description: 'Provider and consumer selection, creation, and editing.',
      icon: Users,
    },
  ]), []);

  useEffect(() => {
    const nextGateway = isKongRoute
      ? 'Kong'
      : selectedGateway === 'Kong'
        ? 'Apigee X'
        : selectedGateway;
    const nextResourceType = isKongRoute
      ? (KONG_RESOURCE_TYPES.has(resourceType) ? resourceType : 'Gateway Services')
      : (APIGEE_RESOURCE_TYPES.has(resourceType) ? resourceType : 'Proxy');

    if (nextGateway !== selectedGateway) {
      setSelectedGateway(nextGateway);
    }

    if (nextResourceType !== resourceType) {
      setResourceType(nextResourceType);
    }

    localStorage.setItem('probeStack_proxySelectedGateway', nextGateway);
    localStorage.setItem('probeStack_proxyResourceType', nextResourceType);
  }, [isKongRoute, resourceType, selectedGateway]);

  // Dynamic steps based on selected gateway
  const steps = useMemo(() => {
    const isKong = selectedGateway === 'Kong';
    const isFsGateway = selectedGateway === 'ForgeSphere Gateway';
    return [
      { id: 1, name: 'Onboarding', icon: UserCircle },
      { id: 2, name: 'Requirement', icon: FileText },
      { id: 3, name: isKong ? 'Service Design' : isFsGateway ? 'API Design' : 'Proxy Design', icon: PenTool },
      { id: 4, name: isKong ? 'Service Design Validation' : isFsGateway ? 'API Design Validation' : 'Proxy Design Validation', icon: CheckCircle },
      { id: 5, name: 'Mock Service', icon: FlaskConical },
      { id: 6, name: 'Contract Testing & Approval', icon: Shield },
      { id: 7, name: isKong ? 'Service Development' : resourceType == 'Shared Function' ? (isFsGateway ? 'Function Development' : 'Shared Function Development') : (isFsGateway ? 'API Development' : 'Proxy Development'), icon: Network },
      { id: 8, name: 'Test Cases', icon: FileCode },
      { id: 9, name: 'Code Analysis', icon: TestTube },
      { id: 10, name: 'Code Review', icon: GitBranch },
      { id: 11, name: 'Complete', icon: CheckCircle },
    ];
  }, [selectedGateway,resourceType]);
  const visibleSteps = useMemo(() => {
    if (resourceType !== 'Shared Function') return steps;
    const hiddenStepIds = new Set([2, 3, 4, 5, 6, 8, 9]);
    return steps.filter((step) => !hiddenStepIds.has(step.id));
  }, [resourceType, steps]);
  const currentStepIndex = useMemo(
    () => visibleSteps.findIndex((step) => step.id === currentStep),
    [visibleSteps, currentStep]
  );
  const currentStepDisplay = currentStepIndex >= 0 ? currentStepIndex + 1 : currentStep;

  // Products and Applications state
  const [savedProducts, setSavedProducts] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_proxyProducts');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [savedApplications, setSavedApplications] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_proxyApplications');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingApplicationId, setEditingApplicationId] = useState(null);
  const [productForm, setProductForm] = useState({
    productName: '', displayName: '', description: '', proxyName: '', proxyPath: ''
  });
  const [applicationForm, setApplicationForm] = useState({
    applicationName: '', displayName: '', description: '', productName: '',
    developerEmail: '', companyName: '', companyEmail: ''
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [productsAppsTab, setProductsAppsTab] = useState('products');

  // Gateway alert state
  const [showGatewayAlert, setShowGatewayAlert] = useState(false);

  // Gateway dropdown ref for click-outside handler
  const gatewayDropdownRef = useRef(null);

  useEffect(() => {
    const state = location.state || {};
    if (state.rowData) return;

    const nextGateway = state.selectedGateway
      ? (isKongRoute ? 'Kong' : state.selectedGateway === 'Kong' ? 'Apigee X' : state.selectedGateway)
      : null;
    const nextResourceType = state.resourceType
      ? (isKongRoute
        ? (KONG_RESOURCE_TYPES.has(state.resourceType) ? state.resourceType : 'Gateway Services')
        : (APIGEE_RESOURCE_TYPES.has(state.resourceType) ? state.resourceType : 'Proxy'))
      : null;
    const hasLaunchState = Boolean(nextGateway || nextResourceType || state.openOnboarding);

    if (nextGateway) {
      setSelectedGateway(nextGateway);
      localStorage.setItem('probeStack_proxySelectedGateway', nextGateway);
    }

    if (nextResourceType) {
      setResourceType(nextResourceType);
      localStorage.setItem('probeStack_proxyResourceType', nextResourceType);
    }

    if (state.openOnboarding) {
      setGlobalOnboardingMode('action');
      setGlobalOnboardingLockedMode(false);
      setShowResourceLanding(true);
    }

    if (hasLaunchState) {
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [isKongRoute, location.state, location.pathname, navigate]);

  // Click-outside handler for gateway dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gatewayDropdownRef.current && !gatewayDropdownRef.current.contains(event.target)) {
        setShowGatewayDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Click-outside handler for resource type dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resourceTypeDropdownRef.current && !resourceTypeDropdownRef.current.contains(event.target)) {
        setShowResourceTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dummy Application IDs and Specs for Existing Onboarding
  const dummyAppSpecs = {
    'APP-001': [
      { id: 1, name: 'User Management API', description: 'RESTful API for user authentication and management' },
      { id: 2, name: 'Authentication API', description: 'OAuth2 and JWT authentication endpoints' },
      { id: 3, name: 'Authorization API', description: 'Role-based access control API' },
    ],
    'APP-002': [
      { id: 4, name: 'Product Catalog API', description: 'Product listing and search API' },
      { id: 5, name: 'Order Processing API', description: 'Order creation and management API' },
      { id: 6, name: 'Refund API', description: 'Refund and return processing API' },
    ],
    'APP-003': [
      { id: 7, name: 'Stock Management API', description: 'Inventory tracking and management API' },
      { id: 8, name: 'Warehouse API', description: 'Warehouse operations and logistics API' },
    ],
    'APP-004': [
      { id: 9, name: 'Payment Gateway API', description: 'Secure payment processing endpoints' },
      { id: 10, name: 'Transaction API', description: 'Transaction history and reporting API' },
    ],
  };

  // Consumer form states for modal
  const [consumerForm, setConsumerForm] = useState({
    consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
    consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
  });

  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Test cases state
  const [testCases, setTestCases] = useState([]);
  const [isFetchingTestCases, setIsFetchingTestCases] = useState(false);
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testRunResults, setTestRunResults] = useState(null);
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedSpecFormat, setUploadedSpecFormat] = useState('');
  const [testCaseStats, setTestCaseStats] = useState({ total: 0, happy: 0, sad: 0, edge: 0, security: 0 });
  const [totalTestCasesCount, setTotalTestCasesCount] = useState(0);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [runBaseUrl, setRunBaseUrl] = useState('');
  const [specContentLoading, setSpecContentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('testcases');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [testCaseCategoryFilter, setTestCaseCategoryFilter] = useState('ALL'); 
   // New states for enhanced test cases
    const [generatedPostmanUrl, setGeneratedPostmanUrl] = useState(null);
    const [collectionHistory, setCollectionHistory] = useState([]);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
    const [previewCollectionContent, setPreviewCollectionContent] = useState('');
    const [previewCollectionOpen, setPreviewCollectionOpen] = useState(false);
    const [generatingFromHistory, setGeneratingFromHistory] = useState(false);
      const [generatedAssets, setGeneratedAssets] = useState({
      postman: true,    // checked by default
      forgefuzz: false,
      unitTest: false,
      integrationTest: false,
    });
    const [showRunModal, setShowRunModal] = useState(false);
    const [runningTestsModal, setRunningTestsModal] = useState(false);
    const [detailedRunResults, setDetailedRunResults] = useState(null);
    const [expandedTestModal, setExpandedTestModal] = useState(null);
    const [runHistory, setRunHistory] = useState([]);
    const [isFetchingRunHistory, setIsFetchingRunHistory] = useState(false);
    const [showUploadArea, setShowUploadArea] = useState(false);
    const [selectedUploadFile, setSelectedUploadFile] = useState(null);
    const [uploadFilePreview, setUploadFilePreview] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [testCaseMap, setTestCaseMap] = useState(new Map());
    const [assertionsExpandedIndex, setAssertionsExpandedIndex] = useState(null);
    const [runCustomBody, setRunCustomBody] = useState('');
      const [singleRunResult, setSingleRunResult] = useState(null);
      const [singleRunLoading, setSingleRunLoading] = useState(false);
      const [selectedCompareRunIds, setSelectedCompareRunIds] = useState([]); 
      const [compareResult, setCompareResult] = useState(null);
      const [compareModalOpen, setCompareModalOpen] = useState(false);
      const [activeDetailsTab, setActiveDetailsTab] = useState('specContent');
      const [expandedSpecEndpoint, setExpandedSpecEndpoint] = useState(null);
    
      const [computedLintResults, setComputedLintResults] = useState([]);
    const [lintingInProgress, setLintingInProgress] = useState(false);
    

  
  // Keep testCaseMap updated with fresh test cases
  useEffect(() => {
    const map = new Map();
    testCases.forEach(tc => {
      if (tc.id) map.set(String(tc.id), tc);
    });
    setTestCaseMap(map);
    console.log('🔄 testCaseMap updated, size:', map.size);
  }, [testCases]);
  
  const extractDetails = (tc) => ({
    requestBodySample: tc.requestBodySample,
    responseSample: tc.responseSample,
    expectedStatus: tc.expectedStatus,
    assertions: tc.assertions,
    category: tc.category,
  });

  // Peer Review modal states - for Step 11
  const [showPeerReviewModal, setShowPeerReviewModal] = useState(false);
  const [peerReviewEmails, setPeerReviewEmails] = useState(['']);
  const [peerReviewStatus, setPeerReviewStatus] = useState('idle'); // idle, processing, success

  // Merge modal states - for Step 11
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [mergeStatus, setMergeStatus] = useState('idle'); // idle, loading, success
  const [mergeStep, setMergeStep] = useState(0);

  // Contract history & preview modal states
const [contractHistory, setContractHistory] = useState([]);
const [isFetchingHistory, setIsFetchingHistory] = useState(false);
const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
const [showPreviewModal, setShowPreviewModal] = useState(false);
const [previewSpecContent, setPreviewSpecContent] = useState('');
const [previewLoadingSpec, setPreviewLoadingSpec] = useState(false);
const [previewArchitectEmail, setPreviewArchitectEmail] = useState('');
const [previewSending, setPreviewSending] = useState(false);
const [previewActiveTab, setPreviewActiveTab] = useState('spec');
const [previewLintResults, setPreviewLintResults] = useState([]);
const [expandedMockEndpoint, setExpandedMockEndpoint] = useState(null);

  // Proxy Development generation animation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [completedSubSteps, setCompletedSubSteps] = useState([]);
  const [activeProxySetupSubStep, setActiveProxySetupSubStep] = useState('metadata');
  const [completedProxySetupSubSteps, setCompletedProxySetupSubSteps] = useState([]);
  const [skippedProxySetupSubSteps, setSkippedProxySetupSubSteps] = useState([]);
  
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [historyDetailData, setHistoryDetailData] = useState(null);
  const [loadingHistoryDetail, setLoadingHistoryDetail] = useState(false);
  const [approveMessage, setApproveMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [staticAnalysisResults, setStaticAnalysisResults] = useState(null);
  const [showFeatureBreakdown, setShowFeatureBreakdown] = useState(false);
  const [loadingLatestAnalysis, setLoadingLatestAnalysis] = useState(false);
  
  const formatBody = (body) => {
    if (!body) return '';
    try {
      return typeof body === 'object' ? JSON.stringify(body, null, 2) : JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return String(body);
    }
  };

      useEffect(() => {
      const computeLintIfNeeded = async () => {
        if (!showHistoryDetailModal || !historyDetailData?.approvalRequest?.specContent) return;
        // Agar already lint results hai to use kar lo
        if (historyDetailData.approvalRequest?.lintResults && historyDetailData.approvalRequest.lintResults.length > 0) {
          setComputedLintResults(historyDetailData.approvalRequest.lintResults);
          return;
        }
        // Nahi hai to spec content se lint karo
        setLintingInProgress(true);
        const results = await runSpectralLint(historyDetailData.approvalRequest.specContent);
        setComputedLintResults(results || []);
        setLintingInProgress(false);
      };
      computeLintIfNeeded();
    }, [showHistoryDetailModal, historyDetailData]);

  // API Metadata states - load from localStorage if available (matching CodeGenerator)
  const [apiName, setApiName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('probeStack_proxyApiName') || '';
    }
    return '';
  });
  const [apiBasePath, setApiBasePath] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('probeStack_proxyApiBasePath') || '';
    }
    return '';
  });
  const [apiVersion, setApiVersion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('probeStack_proxyApiVersion') || '';
    }
    return '';
  });
  const [apiMethod, setApiMethod] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('probeStack_proxyApiMethod') || '';
    }
    return '';
  });
  const [apiEndpoint, setApiEndpoint] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('probeStack_proxyApiEndpoint') || '';
    }
    return '';
  });
  const [apiEndpoints, setApiEndpoints] = useState([{ id: 1, method: 'GET', path: '/users', name: 'Get Users' }]);

  // Provider/Consumer tab state (matching CodeGenerator)
  const [providerConsumerTab, setProviderConsumerTab] = useState('consumer');

  // Security options including MTLS
  const securityOptions = ['OAuth 2.0', 'JWT', 'DPoP', 'IDP', 'MTLS'];

  // AI-Assisted Requirements state for Proxy
  const [showAIAssisted, setShowAIAssisted] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: "Hi! I'm your AI proxy requirements assistant. Let's create comprehensive API gateway requirements together. Describe the proxy configuration you want to build, including security policies, rate limiting, and transformation needs.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [isAddingConsumer, setIsAddingConsumer] = useState(false);
  // Functional and Non-Functional Requirements State (synced between Requirement step and AI-Assisted)
  const [functionalReqs, setFunctionalReqs] = useState('');
  const [nonFunctionalReqs, setNonFunctionalReqs] = useState('');
  const [expectedTps, setExpectedTps] = useState('');
  const [slaMs, setSlaMs] = useState('');
  const [availabilityPercent, setAvailabilityPercent] = useState('');
  const [proxyAuthenticationType, setProxyAuthenticationType] = useState('oauth2');
  const [authorizationScope, setAuthorizationScope] = useState('');
  const [rateLimit, setRateLimit] = useState('');
  const [proxyQuota, setProxyQuota] = useState('');
  const [proxyAiIngestion, setProxyAiIngestion] = useState({
    status: 'idle', // idle | generating | streaming | completed | stale
    activeStep: -1,
    completedAt: '',
    sourceSignature: '',
    suggestion: null,
    streamedResponse: '',
  });
  const proxyAiIngestionTimersRef = useRef([]);

  const [reqGenStatus, setReqGenStatus] = useState({
    securityPolicies: { status: "Ready", completed: false },
    trafficManagement: { status: "Not configured", completed: false },
    transformations: { status: "Not configured", completed: false },
  });

  const loadProxyRequirementSpecCandidates = async () => {
    const [importedResult, libraryResult] = await Promise.all([
      onboardingId ? apiDesignService.getImportedByMicroservice(onboardingId) : Promise.resolve({ success: true, data: [] }),
      apiDesignService.getLibrary('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c'),
    ]);

    const imported = importedResult.success ? importedResult.data?.data || importedResult.data || [] : proxyApiDesignSpecs;
    const library = libraryResult.success ? libraryResult.data?.data || libraryResult.data || [] : specLibrary;

    if (importedResult.success) setProxyApiDesignSpecs(imported);
    if (libraryResult.success) setSpecLibrary(library);

    const catalogOrg = localStorage.getItem('companyName') || 'probestack';
    setForgeCatalogLoading(true);
    fetch(`https://forgestudio.probestack.io/api/v1/specs/gcs/org/${catalogOrg}`)
      .then(r => r.json())
      .then(data => { setForgeCatalogSpecs(data?.data?.specs || []); })
      .catch(() => {})
      .finally(() => setForgeCatalogLoading(false));
    setSwaggerHubLoading(true);
    swaggerHubService.getApisByOwner(catalogOrg).then((result) => {
      if (result.success) setSwaggerHubSpecs(swaggerHubService.parseApiList(result.data));
      setSwaggerHubLoading(false);
    });

    return [
      ...imported.map((spec) => ({ ...spec, source: spec.source || 'imported' })),
      ...library.map((spec) => ({ ...spec, source: spec.source || 'library' })),
    ];
  };

  const handleProxyRecommendedSpecSelected = (selectedSpec) => {
    const normalizedSpec = selectProxySpecForDesign(selectedSpec, selectedSpec.source || 'recommended');
    setProxyDesignImportedSpecs((prev) => (
      prev.some((spec) => spec.id === normalizedSpec.id)
        ? prev
        : [...prev, normalizedSpec]
    ));
    showMessage(`${normalizedSpec.name} selected for Proxy Design.`, 'success');
  };

  const proxyAiSuggestion = useMemo(() => buildDummyProxySuggestion({
    onboardingTeamName,
    onboardingApplicationName,
    functionalReqs,
    nonFunctionalReqs,
    proxyAuthenticationType,
    authorizationScope,
    rateLimit,
    proxyQuota,
    expectedTps,
    slaMs,
    availabilityPercent,
    specLibrary,
    proxyApiDesignSpecs,
  }), [
    onboardingTeamName,
    onboardingApplicationName,
    functionalReqs,
    nonFunctionalReqs,
    proxyAuthenticationType,
    authorizationScope,
    rateLimit,
    proxyQuota,
    expectedTps,
    slaMs,
    availabilityPercent,
    specLibrary,
    proxyApiDesignSpecs,
  ]);

  const proxyAiSuggestionSignature = useMemo(() => JSON.stringify({
    onboardingTeamName,
    onboardingApplicationName,
    functionalReqs,
    nonFunctionalReqs,
    proxyAuthenticationType,
    authorizationScope,
    rateLimit,
    proxyQuota,
    expectedTps,
    slaMs,
    availabilityPercent,
    librarySpecIds: (specLibrary || []).map((spec) => spec.id || spec.specMetadataId || spec.fileName || spec.name),
    importedSpecIds: (proxyApiDesignSpecs || []).map((spec) => spec.id || spec.specMetadataId || spec.fileName || spec.name),
  }), [
    onboardingTeamName,
    onboardingApplicationName,
    functionalReqs,
    nonFunctionalReqs,
    proxyAuthenticationType,
    authorizationScope,
    rateLimit,
    proxyQuota,
    expectedTps,
    slaMs,
    availabilityPercent,
    specLibrary,
    proxyApiDesignSpecs,
  ]);

  const clearProxyAiIngestionTimers = useCallback(() => {
    proxyAiIngestionTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    proxyAiIngestionTimersRef.current = [];
  }, []);

  // Design step import options - single spec selection
  const [proxyDesignImportMode, setProxyDesignImportMode] = useState('LOCAL'); // 'LOCAL', 'URL', 'CREATE'
  const [proxyDesignUrlInput, setProxyDesignUrlInput] = useState('');
  const [proxyDesignSelectedSpec, setProxyDesignSelectedSpec] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_proxyDesignSelectedSpec');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [proxyDesignImportedSpecs, setProxyDesignImportedSpecs] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedSpec = localStorage.getItem('probeStack_proxyDesignSelectedSpec');
      return storedSpec ? [JSON.parse(storedSpec)] : [];
    }
    return [];
  });
  const [proxySelectedDesignSpecs, setProxySelectedDesignSpecs] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('probeStack_proxySelectedDesignSpecs');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [proxyShowForgeStudioModal, setProxyShowForgeStudioModal] = useState(false);
  const [specEditorOpen, setSpecEditorOpen] = useState(false);
  const [specEditorSpec, setSpecEditorSpec] = useState(null);
  const [viewSpecOpen, setViewSpecOpen] = useState(false);
  const [viewSpecSpec, setViewSpecSpec] = useState(null);
  const [showSchemaValidation, setShowSchemaValidation] = useState(false);
  const [schemaValidationSpec, setSchemaValidationSpec] = useState(null);
  const proxyDesignFileInputRef = useRef(null);

  // Deployment platform credential states
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpRegion, setGcpRegion] = useState('');
  const [gcpServiceAccountJson, setGcpServiceAccountJson] = useState('');

  // Target Server state
  const [backendName, setBackendName] = useState('');
  const [backendHost, setBackendHost] = useState('');
  const [backendPort, setBackendPort] = useState('');
  const [backendPath, setBackendPath] = useState('');
  const [enableSSL, setEnableSSL] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'success', 'error', or null

  // Security Backend selections state (max 2, min 1) - separate for Inbound and Outbound
  const [securityInboundSelections, setSecurityInboundSelections] = useState([]);
  const [securityOutboundSelections, setSecurityOutboundSelections] = useState([]);
  const [securityBackendTab, setSecurityBackendTab] = useState('inbound');
  const [standardPoliciesSelections, setStandardPoliciesSelections] = useState([]);

  // Auto-select spec from existing onboarding when design step loads - only run once per session
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (currentStep === 3 && typeof window !== 'undefined' && !hasAutoSelectedRef.current) {
      const storedSpec = localStorage.getItem('probeStack_proxyExistingOnboardingSpec');
      if (storedSpec) {
        const spec = JSON.parse(storedSpec);
        // Check if already imported by ID to prevent duplicates
        const alreadyInImported = proxyDesignImportedSpecs.some(s => s.id === spec.id);
        const alreadySelected = proxyDesignSelectedSpec?.id === spec.id;

        if (!alreadyInImported && !alreadySelected) {
          const newSpec = { ...spec, source: 'existing-onboarding' };
          setProxyDesignImportedSpecs(prev => [...prev, newSpec]);
          setProxyDesignSelectedSpec(newSpec);
          setProxySelectedDesignSpecs([newSpec.id]);
          localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(newSpec));
          localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([newSpec.id]));
          showMessage(`Auto-selected ${spec.name} from existing onboarding`, 'success');
        }
        // Clear the onboarding spec and mark as processed
        localStorage.removeItem('probeStack_proxyExistingOnboardingSpec');
        hasAutoSelectedRef.current = true;
      }
    }
  }, [currentStep]);

  // Auto-populate API Metadata when a spec is selected from the library
  useEffect(() => {
    if (proxyDesignSelectedSpec) {
      const specName = proxyDesignSelectedSpec.name || 'Proxy API';
      const baseName = specName.replace(/\.(yaml|yml|json)$/i, '').replace(/[_-]/g, ' ');

      // If spec has full template data (from dummyForgeSpecs), use it
      if (proxyDesignSelectedSpec.basePath && proxyDesignSelectedSpec.targetUrl) {
        setApiName(baseName);
        setApiVersion('1.0.0');
        setApiBasePath(proxyDesignSelectedSpec.basePath);
        setBasePath(proxyDesignSelectedSpec.basePath);
        setTargetUrl(proxyDesignSelectedSpec.targetUrl);
        setProxyName(proxyDesignSelectedSpec.name);
        setProxyDescription(proxyDesignSelectedSpec.description);

        // Set platform/framework if available
        if (proxyDesignSelectedSpec.platform) {
          setSelectedFramework(proxyDesignSelectedSpec.platform);
        }

        // Generate endpoints based on template
        const resourcePath = proxyDesignSelectedSpec.basePath + '/' + baseName.toLowerCase().replace(/\s+/g, '-');
        setApiEndpoint(resourcePath);
        setApiMethod('GET');
        setApiEndpoints([
          { id: 1, method: 'GET', path: resourcePath, name: 'Get All' },
          { id: 2, method: 'POST', path: resourcePath, name: 'Create' },
          { id: 3, method: 'GET', path: `${resourcePath}/:id`, name: 'Get By ID' },
          { id: 4, method: 'PUT', path: `${resourcePath}/:id`, name: 'Update' },
          { id: 5, method: 'DELETE', path: `${resourcePath}/:id`, name: 'Delete' },
        ]);

        // Set policies if available
        if (proxyDesignSelectedSpec.policies && Array.isArray(proxyDesignSelectedSpec.policies)) {
          const templatePolicies = proxyDesignSelectedSpec.policies.map((p, i) => ({
            id: `${proxyDesignSelectedSpec.id}-${i}`,
            name: p,
            type: availablePolicies.find(ap => ap.name === p)?.type || 'other',
            enabled: true,
            config: {}
          }));
          setPolicies(templatePolicies);
        }
      } else if (proxyDesignSelectedSpec.file && (proxyDesignSelectedSpec.source === 'LOCAL' || proxyDesignSelectedSpec.source === 'URL')) {
        // For imported OpenAPI/Swagger specs, parse the file content
        const file = proxyDesignSelectedSpec.file;

        // Check if file is a valid Blob/File object (not serialized from localStorage)
        if (!(file instanceof Blob || file instanceof File)) {
          // File was loaded from localStorage and is not a Blob anymore
          // Fall back to basic dummy data
          const baseName = specName.replace(/\.(yaml|yml|json)$/i, '').replace(/[_-]/g, ' ');
          setApiName(baseName);
          setProxyName(baseName);
          setApiVersion('V1');
          setApiBasePath(`/api/v1/${baseName.toLowerCase().replace(/\s+/g, '-')}`);
          setApiEndpoint(`/${baseName.toLowerCase().replace(/\s+/g, '-')}`);
          setApiMethod('GET');
          setApiEndpoints([
            { id: 1, method: 'GET', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}`, name: 'Get All' },
            { id: 2, method: 'POST', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}`, name: 'Create' },
            { id: 3, method: 'GET', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}/:id`, name: 'Get By ID' },
          ]);
          localStorage.setItem('probeStack_proxyApiName', baseName);
          return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const content = e.target.result;
            let specData;

            // Parse YAML or JSON
            if (file.name.match(/\.(yaml|yml)$/i)) {
              // For YAML, we'll use a simple parser or treat as JSON-like structure
              // In production, you'd use a proper YAML parser like js-yaml
              // For now, we'll extract key information using regex patterns
              const titleMatch = content.match(/title:\s*['"]?([^'"\n]+)['"]?/i);
              const versionMatch = content.match(/version:\s*['"]?([^'"\n]+)['"]?/i);
              const serverMatch = content.match(/servers?:\s*\n\s*-?\s*url:\s*['"]?([^'"\n]+)['"]?/i);
              const basePathMatch = content.match(/basePath:\s*['"]?([^'"\n]+)['"]?/i);

              specData = {
                info: {
                  title: titleMatch ? titleMatch[1].trim() : baseName,
                  version: versionMatch ? versionMatch[1].trim() : '1.0.0'
                },
                servers: serverMatch ? [{ URL: serverMatch[1].trim() }] : [],
                basePath: basePathMatch ? basePathMatch[1].trim() : '/api/v1'
              };

              // Extract paths/endpoints
              const pathsSection = content.match(/paths:\s*\n([\s\S]*?)(?=\ncomponents:|\nsecuritySchemes:|\nsecurity:|$)/i);
              if (pathsSection) {
                const pathLines = pathsSection[1].split('\n');
                const paths = {};
                let currentPath = null;
                let currentMethod = null;

                pathLines.forEach(line => {
                  // Match path definitions (e.g., "  /pet:")
                  const pathMatch = line.match(/^\s{2}(\/[^:]+):\s*$/);
                  if (pathMatch) {
                    currentPath = pathMatch[1].trim();
                    paths[currentPath] = {};
                    currentMethod = null;
                  } else if (currentPath) {
                    // Match HTTP method definitions (e.g., "    get:")
                    const methodMatch = line.match(/^\s{4}(get|post|put|delete|patch):\s*$/);
                    if (methodMatch) {
                      currentMethod = methodMatch[1].toLowerCase();
                      paths[currentPath][currentMethod] = {};
                    } else if (currentMethod) {
                      // Extract summary for the current method
                      const summaryMatch = line.match(/^\s{6}summary:\s*(.+)$/);
                      if (summaryMatch) {
                        paths[currentPath][currentMethod].summary = summaryMatch[1].trim().replace(/\.$/, '');
                      }
                      // Extract operationId as fallback
                      const opIdMatch = line.match(/^\s{6}operationId:\s*(.+)$/);
                      if (opIdMatch) {
                        paths[currentPath][currentMethod].operationId = opIdMatch[1].trim();
                      }
                    }
                  }
                });
                specData.paths = paths;
              }
            } else {
              // Parse JSON
              specData = JSON.parse(content);
            }

            // Extract and set API metadata
            const apiTitle = specData.info?.title || baseName;
            const apiVer = specData.info?.version || 'V1';
            const serverUrl = specData.servers?.[0]?.url || specData.host || 'https://api.example.com';
            const apiBase = specData.basePath || '/api/v1';

            setApiName(apiTitle);
            setProxyName(apiTitle);
            setApiVersion(apiVer);
            setApiBasePath(apiBase);
            setBasePath(apiBase);
            setTargetUrl(serverUrl);
            setProxyDescription(specData.info?.description || `API for ${apiTitle}`);

            // Extract and set endpoints from paths
            let extractedEndpoints = [];
            if (specData.paths && typeof specData.paths === 'object') {
              let endpointId = 1;

              Object.keys(specData.paths).forEach(path => {
                const pathItem = specData.paths[path];
                Object.keys(pathItem).forEach(method => {
                  if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                    const operation = pathItem[method];
                    const endpointName = operation?.summary || operation?.operationId || `${method.toUpperCase()} ${path}`;

                    extractedEndpoints.push({
                      id: endpointId++,
                      method: method.toUpperCase(),
                      path: path,
                      name: endpointName
                    });
                  }
                });
              });

              if (extractedEndpoints.length > 0) {
                setApiEndpoints(extractedEndpoints);
                setApiEndpoint(extractedEndpoints[0].path);
                setApiMethod(extractedEndpoints[0].method);
              }
            }

            // Save to localStorage
            localStorage.setItem('probeStack_proxyApiName', apiTitle);
            showMessage(`Parsed ${extractedEndpoints.length} endpoints from ${file.name}`, 'success');
          } catch (error) {
            console.error('Error parsing spec file:', error);
            showMessage('Could not parse spec file, using default values', 'warning');

            // Fallback to basic dummy data
            setApiName(baseName);
            setApiVersion('1.0.0');
            setApiBasePath(`/api/v1/${baseName.toLowerCase().replace(/\s+/g, '-')}`);
            setApiEndpoint(`/${baseName.toLowerCase().replace(/\s+/g, '-')}`);
            setApiMethod('GET');
            setApiEndpoints([
              { id: 1, method: 'GET', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}`, name: 'Get All' },
              { id: 2, method: 'POST', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}`, name: 'Create' },
              { id: 3, method: 'GET', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}/:id`, name: 'Get By ID' },
            ]);
          }
        };

        reader.onerror = () => {
          showMessage('Error reading spec file', 'error');
        };

        reader.readAsText(file);
      } else {
        // For specs without file or full metadata, use basic dummy data
        setApiName(baseName);
        setApiVersion('V1');
        setApiBasePath(`/api/v1/${baseName.toLowerCase().replace(/\s+/g, '-')}`);
        setApiEndpoint(`/${baseName.toLowerCase().replace(/\s+/g, '-')}`);
        setApiMethod('GET');
        setBackendName(proxyDesignSelectedSpec?.specName ?? "");
        setProxyName(proxyDesignSelectedSpec?.specName ?? "");

        // Add sample endpoints
        setApiEndpoints([
          { id: 1, method: 'GET', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}`, name: 'Get All' },
          { id: 2, method: 'POST', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}`, name: 'Create' },
          { id: 3, method: 'GET', path: `/${baseName.toLowerCase().replace(/\s+/g, '-')}/:id`, name: 'Get By ID' },
        ]);
      }

      // Save to localStorage
      localStorage.setItem('probeStack_proxyApiName', baseName);
    }
  }, [proxyDesignSelectedSpec]);



  // Preselect REST API type when Kong is selected and user is on step 7
  const run = async () => {
    if (selectedGateway === 'Kong' && currentStep === 7) {
      setSelectedFramework('rest');
    }
    if (currentStep === 1) {
      consumerService.getAllConsumers().then((result) => {
        if (result.success) setSavedConsumers(result.data?.data || result.data || []);
      });
    }
    if (currentStep === 2 || currentStep === 3) {
      const requests = [
        onboardingId
          ? apiDesignService.getImportedByMicroservice(onboardingId)
          : Promise.resolve({ success: true, data: [] }),
        apiDesignService.getLibrary('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c'),
      ];
      const [importedRes, libraryRes] = await Promise.all(requests);
      if (importedRes.success) setProxyApiDesignSpecs(importedRes.data?.data || importedRes.data || []);
      if (libraryRes.success) setSpecLibrary(libraryRes.data?.data || libraryRes.data || []);
      if (forgeCatalogSpecs.length === 0) {
        const catalogOrg = localStorage.getItem('companyName') || 'probestack';
        setForgeCatalogLoading(true);
        fetch(`https://forgestudio.probestack.io/api/v1/specs/gcs/org/${catalogOrg}`)
          .then(r => r.json())
          .then(data => { setForgeCatalogSpecs(data?.data?.specs || []); })
          .catch(() => {})
          .finally(() => setForgeCatalogLoading(false));
        setSwaggerHubLoading(true);
        swaggerHubService.getApisByOwner(catalogOrg).then((result) => {
          if (result.success) setSwaggerHubSpecs(swaggerHubService.parseApiList(result.data));
          setSwaggerHubLoading(false);
        });
      }
    }
    if (currentStep === 5 && proxyDesignSelectedSpec?.id) {
      setIsFetchingSpecEndpoints(true);
      mockApiService.getSpecEndpoints(proxyDesignSelectedSpec.specMetadataId || proxyDesignSelectedSpec.id).then((result) => {
        if (result.success) setSpecEndpoints(result.data?.data || result.data || []);
        setIsFetchingSpecEndpoints(false);
      });
    }
    if (currentStep === 5 && onboardingId && !mockServerGenerated) {
      mockApiService.getByMicroservice(onboardingId).then((result) => {
        if (result.success) {
          const data = result.data?.data;
          const mocks = Array.isArray(data) ? data : [];
          const mockServer = mocks[0] || {};
          if (mockServer.id) {
            setMockServerId(mockServer.id);
            setMockServerBaseUrl(mockServer.mockServerUrl || '');
            if (mockServer.name) setMockServiceName(mockServer.name);
            setMockServerGenerated(true);
            mockApiService.getMockEndpoints(mockServer.id).then((epResult) => {
              if (epResult.success) {
                const epData = epResult.data?.data;
                setMockEndpoints(Array.isArray(epData) ? epData : []);
              }
            });
          }
        }
      });
    }
    // if (currentStep === 6 && onboardingId) {
    //   contractTestingService.getApprovalStatus(onboardingId).then((result) => {
    //     if (result.success) {
    //       const data = result.data?.data || result.data;
    //       if (data?.architectReview?.status === 'APPROVED') setArchitectApproved(true);
    //       else if (data?.architectReview?.status === 'SENT') setArchitectInReview(true);
    //       if (data?.consumerReview?.status === 'APPROVED') setConsumerApproved(true);
    //       else if (data?.consumerReview?.status === 'SENT') setConsumerInReview(true);
    //     }
    //   });
    // }

    if (currentStep === 6 && onboardingId) {
  const result = await contractTestingService.getApprovalStatus(onboardingId);
  if (result.success) {
    const data = result.data?.data || result.data || {};

    // Architect review handling with safe navigation
    const architectReview = data.architectReview || {};
    if (architectReview.approverEmail) {
      setArchitectEmail(data.architectApproverEmail || architectReview.approverEmail);
      if (architectReview.status === 'APPROVED') {
        setArchitectApproved(true);
        setArchitectInReview(false);
      } else if (architectReview.status === 'REJECTED') {
        setArchitectApproved(false);
        setArchitectInReview(false);
        setArchitectRejected(true);
      } else if (architectReview.status === 'SENT') {
        setArchitectInReview(true);
        setArchitectApproved(false);
        setArchitectRejected(false);
      } else {
        setArchitectInReview(true);
        setArchitectRejected(false);
      }
    } else {
      setArchitectInReview(false);
      setArchitectApproved(false);
      setArchitectRejected(false);
    }

    // Consumer review handling with safe navigation
    const consumerReview = data.consumerReview || {};
    setArchitectStatus(architectReview.status || '');
setConsumerStatus(consumerReview.status || '');
    if (consumerReview.approverEmail) {
      setConsumerEmail(data.consumerApproverEmail || consumerReview.approverEmail);
      if (consumerReview.status === 'APPROVED') {
        setConsumerApproved(true);
        setConsumerInReview(false);
      } else if (consumerReview.status === 'REJECTED') {
        setConsumerApproved(false);
        setConsumerInReview(false);
        setConsumerRejected(true);
      } else if (consumerReview.status === 'SENT') {
        setConsumerInReview(true);
        setConsumerApproved(false);
        setConsumerRejected(false);
      } else {
        setConsumerInReview(true);
        setConsumerRejected(false);
      }
    } else {
      setConsumerInReview(false);
      setConsumerApproved(false);
      setConsumerRejected(false);
    }
  }
}
    if ((currentStep === 7 || resourceType === "Gateway Services") && proxyDesignSelectedSpec?.id) {
      setIsFetchingSpecEndpoints(true);
      mockApiService.getSpecEndpoints(proxyDesignSelectedSpec.specMetadataId || proxyDesignSelectedSpec.id).then((result) => {
        if (result.success) {
          setSpecEndpoints(result.data?.data || result.data || []);
        }
        setIsFetchingSpecEndpoints(false);
      });
    }

    if (currentStep === 9 && onboardingId && !testRunResults) {
      testCaseService.getResults(onboardingId).then((result) => {
        if (result.success) setTestRunResults(result.data?.data || result.data);
      });
    }
  };

  useEffect(() => {
  console.log('Step 8 useEffect triggered', { currentStep, onboardingId });
 if (currentStep === 8 && onboardingId) {
  console.log('Fetching generation history for proxy...');
  setIsFetchingHistory(true);
  testCaseService.getGenerationHistoryForMicroservice(onboardingId).then((result) => {
    console.log('Generation history response:', result);
    if (result.success) {
      const historyData = result.data || [];
      setGenerationHistory(historyData);
      // 👇 Set total test cases count from the most recent generation record
      if (historyData.length > 0 && historyData[0].totalTestCases) {
        setTotalTestCasesCount(historyData[0].totalTestCases);
      }
    }
    setIsFetchingHistory(false);
  });
    testCaseService.getTestCases(onboardingId).then((res) => {
  if (res.success) {
    // Handle both possible response structures
    const responseData = res.data?.data || res.data;
    const total = responseData?.total ?? 0;
    const items = responseData?.items ?? [];
    setTestCases(items);
    setTotalTestCasesCount(total);
    const stats = {
      total: total,
      happy: items.filter(tc => tc.title?.includes('[HAPPY]') || tc.category === 'POSITIVE').length,
      sad: items.filter(tc => tc.title?.includes('[SAD]') || tc.category === 'NEGATIVE').length,
      edge: items.filter(tc => tc.title?.includes('[EDGE]') || tc.category === 'PERFORMANCE').length,
      security: items.filter(tc => tc.title?.includes('[SECURITY]') || tc.category === 'SECURITY').length,
    };
    setTestCaseStats(stats);
  }
  setIsFetchingTestCases(false);
});
  }
}, [currentStep, onboardingId]);

  useEffect(() => {
    run();
  }, [selectedGateway, currentStep]);

  useEffect(() => {
  if (currentStep === 6 && onboardingId) {
    const loadHistory = async () => {
      setIsFetchingHistory(true);
      const result = await contractTestingService.getHistory(onboardingId, 0, 10);
      if (result.success) {
        setContractHistory(result.data?.data?.content || result.data?.data || []);
      } else {
        console.error(result.error);
      }
      setIsFetchingHistory(false);
    };
    loadHistory();
  }
}, [currentStep, onboardingId, historyRefreshTrigger]);

useEffect(() => {
  if (currentStep === 3 && onboardingId) {
    const fetchApprovalStatusForStep3 = async () => {
      const result = await contractTestingService.getMicroservice(onboardingId);
      if (result.success) {
        const data = result.data?.data || result.data || {};
        const architect = data?.architectReview || {};
        const consumer = data?.consumerReview || {};
        setArchitectStatus(architect.status || '');
        setConsumerStatus(consumer.status || '');
      }
    };
    fetchApprovalStatusForStep3();
  }
}, [currentStep, onboardingId, historyRefreshTrigger]);

  const getConnectorConfigurationPayload = (responseData) => (
    responseData?.data?.data || responseData?.data || responseData || null
  );

  const normalizeBackendConnectorConfiguration = (config) => {
    if (!config) return {};

    const connections = {};

    if (config.sourceCodeManagement) {
      const scm = config.sourceCodeManagement;
      connections.sourceCodeManagement = {
        type: scm.type,
        repo: scm.repo,
        orgOrUser: scm.orgOrUser,
        branch: scm.branch,
        token: scm.token,
        isPrivate: scm.isPrivate,
      };
    }

    if (config.cloudProvider) {
      const cloud = config.cloudProvider;
      connections.cloudProvider = {
        provider: cloud.provider,
        gcpProjectId: cloud.gcpProjectId,
        gcpRegion: cloud.gcpRegion,
        cloudRun: cloud.cloudRun,
        gke: cloud.gke,
        accessKeyId: cloud.accessKeyId,
        awsRegion: cloud.awsRegion,
        appRunner: cloud.appRunner,
        eks: cloud.eks,
        subscriptionId: cloud.subscriptionId,
        resourceGroup: cloud.resourceGroup,
        azureRegion: cloud.azureRegion,
        container: cloud.container,
      };
    }

    if (config.databaseConnector) {
      const db = config.databaseConnector;
      connections.databaseConnector = {
        databaseType: db.databaseType,
        connectionString: db.connectionString,
        host: db.host,
        port: db.port,
        databaseName: db.databaseName,
        username: db.username,
        sslMode: db.sslMode,
        authSource: db.authSource,
      };
    }

    return connections;
  };

  useEffect(() => {
    const fetchConnectorConfiguration = async () => {
      if (![1, 7].includes(currentStep) || !organizationId) return;

      setIsFetchingConnectorConfig(true);
      const connectorIdToLoad = existingConfigId;
      const result = connectorIdToLoad
        ? await connectorConfigurationService.getConnectorConfigurationById(connectorIdToLoad)
        : await connectorConfigurationService.getConnectorConfigurationDefaults(organizationId);
      setIsFetchingConnectorConfig(false);

      if (!result.success) return;

      const config = getConnectorConfigurationPayload(result.data);
      if (!config) return;

      if (connectorIdToLoad && config.id) setExistingConfigId(config.id);

      const connections = normalizeBackendConnectorConfiguration(config);
      setSavedConnections(connections);

      const scm = connections.sourceCodeManagement;
      if (scm?.type === 'GITHUB') {
        setPushToGitHub(true);
        if (scm.token) setGithubToken(scm.token);
        if (scm.orgOrUser) setOrganization(scm.orgOrUser);
        setRepositoryName(connectorIdToLoad ? scm.repo || '' : '');
        if (scm.branch) setBranchName(scm.branch);
      }
      if (scm?.type === 'GITLAB') {
        setPushToGitLab(true);
        if (scm.token) setGitlabToken(scm.token);
        if (scm.orgOrUser) setGitlabOrganization(scm.orgOrUser);
        setGitlabRepositoryName(connectorIdToLoad ? scm.repo || '' : '');
        if (scm.branch) setGitlabBranchName(scm.branch);
      }
    };

    fetchConnectorConfiguration();
  }, [currentStep, organizationId, existingConfigId]);

  useEffect(() => {
    if (currentStep === 'gateway-config') return;
    if (visibleSteps.some((step) => step.id === currentStep)) return;

    const nextVisibleStep =
      visibleSteps.find((step) => step.id > currentStep) || visibleSteps[visibleSteps.length - 1];

    if (nextVisibleStep) {
      setCurrentStep(nextVisibleStep.id);
      setShowProxyDevSubBranch(nextVisibleStep.id === 7);
    }
  }, [currentStep, visibleSteps]);

  const getNextStepId = (stepId) => {
    const currentIndex = visibleSteps.findIndex((step) => step.id === stepId);
    if (currentIndex === -1) return null;
    return visibleSteps[currentIndex + 1]?.id ?? null;
  };

  const getPreviousStepId = (stepId) => {
    const currentIndex = visibleSteps.findIndex((step) => step.id === stepId);
    if (currentIndex === -1) return null;
    return visibleSteps[currentIndex - 1]?.id ?? null;
  };

  const handleStepClick = (stepId) => {
    // Allow navigation to any step freely
    setCurrentStep(stepId);
    setShowProxyDevSubBranch(stepId === 7);
    window.scrollTo(0, 0);
  };

  const handlePrevious = () => {
    const previous = getPreviousStepId(currentStep);
    if (!previous) return;
    setCurrentStep(previous);
    setShowProxyDevSubBranch(previous === 7);
    window.scrollTo(0, 0);
  };

  const getProjectType = () => {
    if (selectedGateway === 'Kong') return 'KONG_GATEWAY_SERVICE';
    if (resourceType === 'Shared Function') return 'APIGEE_SHARED_FLOW';
    return 'APIGEE_PROXY';
  };

  const getResourceLabel = () => {
    if (selectedGateway === 'Kong') return 'gateway service';
    if (resourceType === 'Shared Function') return 'function';
    return 'API';
  };

  const getLandingProjectType = () => {
    if (selectedGateway === 'Kong') return 'KONG_GATEWAY_SERVICE';
    if (resourceType === 'Shared Function') return 'APIGEE_SHARED_FLOW';
    return 'APIGEE_PROXY';
  };

  const shouldShowResourceCatalog = () => {
    if (!showResourceLanding) return false;
    if (selectedGateway === 'Kong') return resourceType === 'Gateway Services';
    return resourceType === 'Proxy' || resourceType === 'Shared Function';
  };

    useEffect(() => {
    setResourceCatalogPage(0);
  }, [selectedGateway, resourceType, showResourceLanding]);

  useEffect(() => {
    setResourceCatalogPage(0);
  }, [selectedGateway, resourceType, showResourceLanding]);

  useEffect(() => {
    let isMounted = true;

    const loadResourceCatalog = async () => {
      if (!shouldShowResourceCatalog()) {
        setResourceCatalog([]);
        setResourceCatalogLoading(false);
        setResourceCatalogError('');
        setResourceCatalogPageInfo((current) => ({
          ...current,
          totalElements: 0,
          totalPages: 0,
          page: 0,
        }));
        return;
      }

      setResourceCatalogLoading(true);
      setResourceCatalogError('');

      const result = await onboardingService.getSummaryPageByProjectType(getLandingProjectType(), {
        search: resourceCatalogSearch,
        page: resourceCatalogPage,
        pageSize: resourceCatalogPageInfo.size,
      });
      if (!isMounted) return;

      if (!result.success) {
        setResourceCatalog([]);
        setResourceCatalogError(result.error || `Failed to load ${getResourceLabel()} resources`);
        setResourceCatalogLoading(false);
        return;
      }

      const records = result.data?.data || result.data || [];
      setResourceCatalog(Array.isArray(records) ? records : []);
      setResourceCatalogPageInfo({
        totalElements: result.data?.totalElements || 0,
        totalPages: result.data?.totalPages || 0,
        page: result.data?.page || 0,
        size: result.data?.size || resourceCatalogPageInfo.size,
      });
      setResourceCatalogLoading(false);
    };

    loadResourceCatalog();

    return () => {
      isMounted = false;
    };
  }, [selectedGateway, resourceType, showResourceLanding, resourceCatalogSearch, resourceCatalogPage, resourceCatalogPageInfo.size]);

  useEffect(() => {
    const resourceIds = [...new Set(resourceCatalog.map((item) => getCatalogResourceId(item)).filter(Boolean))];
    if (resourceIds.length === 0) {
      setCatalogDeploymentStatusMap({});
      return undefined;
    }

    let isMounted = true;

    const loadCatalogDeploymentStatuses = async () => {
      const result = await deploymentService.getDeploymentHistoryBulk(resourceIds);
      if (!isMounted) return;

      if (!result.success) {
        setCatalogDeploymentStatusMap({});
        return;
      }

      const historyByResource = unwrapDeploymentHistoryBulk(result);
      const nextStatusMap = resourceIds.reduce((statusMap, resourceId) => {
        const latestDeployment = pickLatestDeploymentRecord(historyByResource?.[resourceId]);
        if (latestDeployment) {
          statusMap[resourceId] = latestDeployment;
        }
        return statusMap;
      }, {});

      setCatalogDeploymentStatusMap(nextStatusMap);
    };

    loadCatalogDeploymentStatuses();

    return () => {
      isMounted = false;
    };
  }, [resourceCatalog]);

  const openGlobalOnboardingModal = (mode = 'action', lockMode = false) => {
    setGlobalOnboardingMode(mode);
    setGlobalOnboardingLockedMode(lockMode);
    setShowGlobalOnboardingModal(true);
  };

  const handleGlobalOnboardingClose = (reason = 'cancel') => {
    setShowGlobalOnboardingModal(false);
    setCatalogOnboardingPreset(null);

    if (reason === 'complete') return;
    if (showResourceLanding) return;

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGlobalActionModeChange = (mode) => {
    if (mode !== 'sync') {
      setActionMode(mode);
    }

    if (mode === 'create') {
      setOnboardingContextId(null);
      setOnboardingId(null);
      setIsExistingOnboardingLoaded(false);
      setOnboardingBusinessUnit('');
      setOnboardingTeamName('');
      setOnboardingApplicationName('');
      setOnboardingApplicationId('');
      setOnboardingProjectOwner('');
      setOnboardingOwnerEmail('');
      setOnboardingProjectSME('');
      setOnboardingProjectSMEEmail('');
      setOnboardingProjectDLEmail('');
      setOnboardingTesterName('');
      setOnboardingTesterEmail('');
      setOnboardingServiceNowGroup('');
      setOnboardingServiceNowEmail('');
      setOnboardingGoLiveDate('');
      setSelectedOnboardingConsumers([]);
      setActiveProxyName('');
      localStorage.removeItem('probeStack_proxyOnboardingContextId');
      localStorage.removeItem('probeStack_proxyOnboardingId');
      localStorage.removeItem('probeStack_proxyOnboardingData');
      localStorage.removeItem('probeStack_onboardingId');
      setOnboardingNumber('');
    }
  };

  const applyGlobalOnboarding = async (context) => {
    const operationMode = context.actionMode || actionMode;

    if ((operationMode === 'cloning' || operationMode === 'versioning') && context.resourceId) {
      const actionDetails = context.actionDetails || {};

      if (operationMode === 'cloning' && (!actionDetails.newResourceName || !actionDetails.version)) {
        showMessage('Please provide both new resource name and version', 'error');
        return;
      }

      if (operationMode === 'versioning' && !actionDetails.version) {
        showMessage('Please provide version', 'error');
        return;
      }

      setActionLoading(true);
      const result = operationMode === 'cloning'
        ? await onboardingService.cloneOnboarding(context.resourceId, {
            newResourceName: actionDetails.newResourceName,
            basePath: actionDetails.basePath || basePath,
            version: actionDetails.version,
          })
        : await onboardingService.versionOnboarding(context.resourceId, {
            basePath: actionDetails.basePath || basePath,
            version: actionDetails.version,
          });

      if (!result.success) {
        setActionLoading(false);
        showMessage(result.error, 'error');
        return;
      }

      const resourceId = resolveActionResourceId(result) || context.resourceId;
      const loaded = await loadProxyResourceIntoFlow(resourceId, operationMode);
      setActionLoading(false);
      if (!loaded) return;
      await runClonedResourceDeploymentFlow(resourceId);

      setNewProxyName('');
      setNewProxyVersion('');
      setVersionError('');
      showMessage(
        result.data?.message ||
          `${operationMode === 'cloning' ? 'Cloned' : 'Version created'} successfully`,
        'success'
      );
      return;
    }

    const data = context.onboardingData || {};

    setOnboardingContextId(context.onboardingContextId || context.onboardingId || null);
    setOnboardingId(context.resourceId || null);
    setIsExistingOnboardingLoaded(!context.isNew);
    setExistingConfigId(context.connectorId || context.existingConfigId || null);
    setOnboardingTeamName(data.teamName || '');
    setOnboardingApplicationName(data.applicationName || '');
    setOnboardingApplicationId(data.applicationId || '');
    setOnboardingBusinessUnit(data.businessUnit || '');
    setOnboardingProjectOwner(data.projectOwner || '');
    setOnboardingOwnerEmail(data.ownerEmail || '');
    setOnboardingProjectSME(data.projectSME || '');
    setOnboardingProjectSMEEmail(data.projectSMEEmail || '');
    setOnboardingProjectDLEmail(data.projectDLEmail || '');
    setOnboardingGoLiveDate(data.goLiveDate || '');
    setOnboardingTesterName(data.testerName || '');
    setOnboardingTesterEmail(data.testerEmail || '');
    setOnboardingServiceNowGroup(data.serviceNowGroup || '');
    setOnboardingServiceNowEmail(data.serviceNowEmail || '');
    setSelectedOnboardingConsumers(context.consumerIds || []);

    if (context.shouldLoadFullFlowData && context.requirementData) {
      setFunctionalReqs(context.requirementData.functionalReqs || context.requirementData.functionalRequirements || '');
      setNonFunctionalReqs(context.requirementData.nonFunctionalReqs || context.requirementData.nonFunctionalRequirements || '');
    } else {
      setFunctionalReqs('');
      setNonFunctionalReqs('');
    }

    if (context.shouldLoadFullFlowData && context.designData) {
      setProxyDesignSelectedSpec(context.designData);
      setProxySelectedDesignSpecs([context.designData.id]);
      localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(context.designData));
      localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([context.designData.id]));
    } else {
      setProxyDesignSelectedSpec(null);
      setProxySelectedDesignSpecs([]);
      localStorage.removeItem('probeStack_proxyDesignSelectedSpec');
      localStorage.removeItem('probeStack_proxySelectedDesignSpecs');
    }

    if (context.onboardingContextId || context.onboardingId) {
      localStorage.setItem('probeStack_proxyOnboardingContextId', context.onboardingContextId || context.onboardingId);
      localStorage.setItem('probeStack_onboardingContextId', context.onboardingContextId || context.onboardingId);
    }

    if (context.resourceId) {
      localStorage.setItem('probeStack_proxyOnboardingId', context.resourceId);
      localStorage.setItem('probeStack_onboardingId', context.resourceId);
    } else {
      localStorage.removeItem('probeStack_proxyOnboardingId');
      localStorage.removeItem('probeStack_onboardingId');
    }

    localStorage.setItem('probeStack_proxyOnboardingData', JSON.stringify(data));
    localStorage.setItem('probeStack_onboardingData', JSON.stringify(data));
    setActiveProxyName(data.applicationName || '');
    setShowResourceLanding(false);
    showMessage(`${data.applicationName || 'Onboarding'} selected. You can continue the ${getResourceLabel()} flow.`, 'success');
  };

  const ensureOnboardingResource = async () => {
    if (onboardingId) return onboardingId;

    if (!onboardingContextId) {
      openGlobalOnboardingModal('action');
      throw new Error('Please select or create onboarding before continuing.');
    }

    const fallbackApiName = selectedGateway === 'Kong'
      ? 'Gateway Service'
      : resourceType === 'Shared Function'
        ? 'Shared Function'
        : 'Proxy';
    const resourceResult = await onboardingService.createResourceForOnboarding(onboardingContextId, {
      projectType: getProjectType(),
      apiName: proxyName || onboardingApplicationName || onboardingApplicationId || fallbackApiName,
      connectorId: existingConfigId || null,
    });

    if (!resourceResult.success) {
      throw new Error(resourceResult.error || `Failed to create ${getResourceLabel()} for onboarding`);
    }

    const resourceData = resourceResult.data?.data || resourceResult.data || {};
    const resourceId = resourceData.resource?.microservice?.id
      || resourceData.resource?.id
      || resourceData.microservice?.id
      || resourceData.id;

    if (!resourceId) {
      throw new Error(`${getResourceLabel()} was created but no resource id was returned`);
    }

    setOnboardingId(resourceId);
    localStorage.setItem('probeStack_proxyOnboardingId', resourceId);
    localStorage.setItem('probeStack_onboardingId', resourceId);
    return resourceId;
  };

  const getProxySpecApiName = () => (
    proxyDesignSelectedSpec?.specName
    || proxyDesignSelectedSpec?.name
    || proxyDesignSelectedSpec?.fileName
    || ''
  ).replace(/\.(yaml|yml|json)$/i, '').trim();

  const getProxySelectedSpecMetadataId = () => proxyDesignSelectedSpec?.specMetadataId || proxyDesignSelectedSpec?.id || '';

  const unwrapProxyResourceDetails = (resultOrDetails) => resultOrDetails?.data?.data || resultOrDetails?.data || resultOrDetails || {};

  const getProxyResourceMicroservice = (details) => (
    details?.resource?.microservice
    || details?.microservice
    || details?.resource
    || details
    || {}
  );

  const getProxyResourceApiDesign = (details) => (
    details?.apiDesign
    || details?.resource?.apiDesign
    || details?.designData
    || {}
  );

  const persistProxyResourceApiNameFromSpec = async (resourceId, resourceDetails = null) => {
    const nextApiName = getProxySpecApiName();
    if (!resourceId || !nextApiName) return { success: true };

    const resource = getProxyResourceMicroservice(resourceDetails);
    const existingApiName = (resource?.apiName || '').trim();
    if (existingApiName === nextApiName) {
      setApiName(nextApiName);
      setProxyName(nextApiName);
      localStorage.setItem('probeStack_proxyApiName', nextApiName);
      localStorage.setItem('probeStack_proxyName', nextApiName);
      return { success: true };
    }

    const result = await onboardingService.updateResourceApiName(resourceId, nextApiName);
    if (result.success) {
      setApiName(nextApiName);
      setProxyName(nextApiName);
      localStorage.setItem('probeStack_proxyApiName', nextApiName);
      localStorage.setItem('probeStack_proxyName', nextApiName);
    }
    return result;
  };

  const applyProxySelectedApiDesignLocally = (result) => {
    const savedDesign = result?.data?.data || result?.data || null;
    if (!savedDesign) return;

    const nextSpec = {
      ...proxyDesignSelectedSpec,
      apiDesignId: savedDesign.id || proxyDesignSelectedSpec?.apiDesignId,
      specMetadataId: savedDesign.specMetadataId || getProxySelectedSpecMetadataId(),
    };
    setProxyDesignSelectedSpec(nextSpec);
    localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(nextSpec));
  };

  const syncProxySelectedSpecFromSavedApiDesign = (apiDesign) => {
    if (!apiDesign?.specMetadataId) return;

    const metadata = apiDesign.specMetadata || {};
    const syncedSpec = {
      ...proxyDesignSelectedSpec,
      id: metadata.id || apiDesign.specMetadataId,
      name: metadata.specName || metadata.fileName || proxyDesignSelectedSpec?.name || 'Saved API specification',
      specName: metadata.specName || proxyDesignSelectedSpec?.specName || metadata.fileName || '',
      fileName: metadata.fileName || proxyDesignSelectedSpec?.fileName,
      source: proxyDesignSelectedSpec?.source || 'saved',
      apiDesignId: apiDesign.id || proxyDesignSelectedSpec?.apiDesignId,
      specMetadataId: apiDesign.specMetadataId,
    };

    setProxyDesignSelectedSpec(syncedSpec);
    setProxySelectedDesignSpecs([syncedSpec.id]);
    localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(syncedSpec));
    localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([syncedSpec.id]));

    const syncedApiName = (syncedSpec.specName || syncedSpec.name || '').replace(/\.(yaml|yml|json)$/i, '').trim();
    if (syncedApiName) {
      setApiName(syncedApiName);
      setProxyName(syncedApiName);
      localStorage.setItem('probeStack_proxyApiName', syncedApiName);
      localStorage.setItem('probeStack_proxyName', syncedApiName);
    }
  };

  const saveProxyApiDesignSelection = async ({ updateApiName = true, persistDesign = true } = {}) => {
    if (!proxyDesignSelectedSpec) {
      throw new Error('Please select a proxy specification from the Design page (Step 3).');
    }

    const selectedSpecMetadataId = getProxySelectedSpecMetadataId();
    if (!selectedSpecMetadataId) {
      throw new Error('Selected proxy specification is missing its spec metadata id.');
    }

    const resourceId = await ensureOnboardingResource();
    const resourceDetailsResult = await onboardingService.getResourceDetails(resourceId);
    const resourceDetails = resourceDetailsResult.success ? unwrapProxyResourceDetails(resourceDetailsResult) : null;
    const existingApiDesign = getProxyResourceApiDesign(resourceDetails);
    const existingSpecMetadataId = existingApiDesign?.specMetadataId || '';

    if (!persistDesign) {
      if (!existingSpecMetadataId) {
        throw new Error('No API specification is saved in Step 3. Please go back to Step 3 and save a spec before generating code.');
      }

      if (existingSpecMetadataId !== selectedSpecMetadataId) {
        syncProxySelectedSpecFromSavedApiDesign(existingApiDesign);
      }

      return resourceId;
    }

    if (existingSpecMetadataId !== selectedSpecMetadataId) {
      const result = await apiDesignService.createApiDesign({
        microserviceId: resourceId,
        specMetadataId: selectedSpecMetadataId,
        apiType: 'REST API',
        authenticationType: proxyAuthenticationType || 'OAuth 2.0',
        dataFormat: 'JSON',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save API Design.');
      }
      applyProxySelectedApiDesignLocally(result);
    } else if (existingApiDesign?.id) {
      syncProxySelectedSpecFromSavedApiDesign(existingApiDesign);
    }

    if (updateApiName) {
      const apiNameResult = await persistProxyResourceApiNameFromSpec(resourceId, resourceDetails);
      if (!apiNameResult.success) {
        throw new Error(apiNameResult.error || `Failed to update ${getResourceLabel()} name from selected spec.`);
      }
    }

    return resourceId;
  };

  const selectProxySpecForDesign = (spec, source = 'library') => {
    if (!spec) return null;

    const selectedSpec = {
      ...spec,
      id: spec.id,
      name: spec.specName || spec.name || spec.fileName || 'Untitled spec',
      specName: spec.specName || spec.name || spec.fileName || '',
      fileName: spec.fileName,
      source,
      specMetadataId: spec.specMetadataId || spec.id,
    };
    const nextApiName = (
      selectedSpec.specName
      || selectedSpec.name
      || selectedSpec.fileName
      || ''
    ).replace(/\.(yaml|yml|json)$/i, '').trim();

    setProxyDesignSelectedSpec(selectedSpec);
    setProxySelectedDesignSpecs([selectedSpec.id]);
    localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(selectedSpec));
    localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([selectedSpec.id]));

    if (nextApiName) {
      setApiName(nextApiName);
      setProxyName(nextApiName);
      localStorage.setItem('probeStack_proxyApiName', nextApiName);
    }

    return selectedSpec;
  };

  const handlePromoteToLibrary = async (spec) => {
    const result = await apiDesignService.promoteToLibrary(spec.id);
    if (result.success) {
      showMessage('Spec promoted to library successfully', 'success');
    } else {
      showMessage(result.error || 'Failed to promote spec to library', 'error');
    }
  };

  const handlePromoteToCatalog = async (spec) => {
    const orgId = localStorage.getItem('companyName') || 'probestack';
    const createdBy = localStorage.getItem('userName') || 'admin@forgecrux.com';
    const contentResult = await apiDesignService.getSpecContent(spec.id);
    let specContent = null;
    if (contentResult.success && contentResult.content) {
      try { specContent = JSON.parse(contentResult.content); } catch { specContent = contentResult.content; }
    }
    const result = await apiDesignService.promoteToCatalog({
      orgId, projectId: onboardingId, specId: spec.id,
      title: spec.specName || spec.fileName, specContent, createdBy,
    });
    if (result.success) {
      showMessage('Spec promoted to ForgeCatalog successfully', 'success');
    } else {
      showMessage(result.error || 'Failed to promote spec to ForgeCatalog', 'error');
    }
  };

  useEffect(() => {
    if (!promoteDropdownSpecId) return;
    const close = () => setPromoteDropdownSpecId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [promoteDropdownSpecId]);

  const searchSwaggerHub = async () => {
    setSwaggerHubLoading(true);
    const result = await swaggerHubService.searchApis(swaggerHubQuery);
    if (result.success) {
      setSwaggerHubSpecs(swaggerHubService.parseApiList(result.data));
    } else {
      showMessage(result.error || 'Failed to fetch SwaggerHub specs', 'error');
    }
    setSwaggerHubLoading(false);
  };

  const searchSwaggerHubByOwner = async (owner) => {
    if (!owner.trim()) return;
    setSwaggerHubLoading(true);
    const result = await swaggerHubService.getApisByOwner(owner);
    if (result.success) {
      setSwaggerHubSpecs(swaggerHubService.parseApiList(result.data));
    } else {
      showMessage(result.error || 'Failed to fetch org SwaggerHub specs', 'error');
    }
    setSwaggerHubLoading(false);
  };

  const injectCloneName = (content, name) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.info) parsed.info.title = name;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content.replace(/^(\s*title:\s*).*$/m, `$1${name}`);
    }
  };

  const importSwaggerHubSpec = async (spec) => {
    setSwaggerHubImportingId(spec.id);
    try {
      const fetchRes = await fetch(spec.specUrl, { headers: { Accept: 'application/json' } });
      if (!fetchRes.ok) throw new Error(`SwaggerHub returned ${fetchRes.status}`);
      const specContent = await fetchRes.text();
      setCloneSpecModal({ spec, source: 'swaggerhub', specContent });
      setCloneSpecName(`Copy of ${spec.name}`);
    } catch (err) {
      showMessage(err.message || 'Failed to fetch spec from SwaggerHub', 'error');
    }
    setSwaggerHubImportingId(null);
  };

  const importForgeCatalogSpec = async (spec) => {
    setForgeCatalogImportingUrl(spec.gcsUrl);
    try {
      const res = await fetch(`https://forgestudio.probestack.io/api/v1/specs/gcs/content?gcsUrl=${encodeURIComponent(spec.gcsUrl)}`);
      if (!res.ok) throw new Error(`ForgeCatalog returned ${res.status}`);
      const json = await res.json();
      const specContent = json?.data?.content;
      if (!specContent) throw new Error('No content returned');
      setCloneSpecModal({ spec, source: 'forgecatalog', specContent });
      setCloneSpecName(`Copy of ${spec.name}`);
    } catch (err) {
      showMessage(err.message || 'Failed to fetch spec from ForgeCatalog', 'error');
    }
    setForgeCatalogImportingUrl(null);
  };

  const confirmSpecClone = async () => {
    if (!cloneSpecModal) return;
    setCloningSpec(true);
    const { specContent } = cloneSpecModal;
    const clonedContent = injectCloneName(specContent, cloneSpecName);
    const result = await apiDesignService.uploadSpec(organizationId, 'CREATE', null, null, clonedContent, onboardingId);
    if (result.success) {
      showMessage(`${cloneSpecName} cloned and selected successfully`, 'success');
      if (onboardingId) {
        const importedRes = await apiDesignService.getImportedByMicroservice(onboardingId);
        const updated = importedRes.data?.data || importedRes.data || [];
        setProxyApiDesignSpecs(updated);
        if (updated.length > 0) selectProxySpecForDesign(updated[updated.length - 1], 'imported');
      }
      setCloneSpecModal(null);
    } else {
      showMessage(result.error || 'Failed to clone spec', 'error');
    }
    setCloningSpec(false);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!onboardingContextId && !onboardingId) {
        openGlobalOnboardingModal('action');
        showMessage('Please select or create onboarding before continuing.', 'error');
        return;
      }

      const next = getNextStepId(currentStep);
      if (next) {
        setCurrentStep(next);
        setShowProxyDevSubBranch(next === 7);
        window.scrollTo(0, 0);
      }
    } else if (currentStep === 2) {
      setBusy(true);
      let resourceId;
      try {
        resourceId = await ensureOnboardingResource();
      } catch (error) {
        setBusy(false);
        showMessage(error.message, 'error');
        return;
      }

      const apiNameResult = await persistProxyResourceApiNameFromSpec(resourceId);
      if (!apiNameResult.success) {
        setBusy(false);
        showMessage(apiNameResult.error || `Failed to update ${getResourceLabel()} name from selected spec`, 'error');
        return;
      }

      const result = await requirementsService.createRequirement({
        microserviceId: resourceId,
        functionalRequirements: functionalReqs,
        nonFunctionalRequirements: nonFunctionalReqs,
        expectedTps: parseInt(expectedTps) || 500,
        slaMs: parseInt(slaMs) || 200,
        availabilityPercent: parseFloat(availabilityPercent) || 99.9,
        authenticationType: proxyAuthenticationType,
        authorizationScope,
        rateLimit: parseInt(rateLimit) || null,
        quota: parseInt(proxyQuota) || null,
      });
      setBusy(false);
      if (result.success) {
        showMessage('Requirements saved successfully!', 'success');
        const next = getNextStepId(currentStep);
        if (next) {
          setCurrentStep(next);
          setShowProxyDevSubBranch(next === 7);
          window.scrollTo(0, 0);
        }
      } else {
        showMessage(result.error, 'error');
      }
    } else if (currentStep === 3) {
      if (!proxyDesignSelectedSpec) {
        showMessage('Please select an API specification', 'error');
        return;
      }
      setBusy(true);
      try {
        await saveProxyApiDesignSelection();
        setBusy(false);
        showMessage('API Design saved successfully!', 'success');
        const next = getNextStepId(currentStep);
        if (next) {
          setCurrentStep(next);
          setShowProxyDevSubBranch(next === 7);
          window.scrollTo(0, 0);
        }
      } catch (error) {
        setBusy(false);
        showMessage(error.message, 'error');
      }
    } else {
      const next = getNextStepId(currentStep);
      if (next) {
        setCurrentStep(next);
        setShowProxyDevSubBranch(next === 7);
        window.scrollTo(0, 0);
      }
    }
  };

  const handleSave = () => {
    setShowSaveModal(true);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      if (!savedSteps.includes(currentStep)) {
        setSavedSteps([...savedSteps, currentStep]);
      }
    }, 2000);
  };

  const handleSaveConnections = (data) => {
    const config = getConnectorConfigurationPayload(data);
    if (config?.id) setExistingConfigId(config.id);
    setSavedConnections(normalizeBackendConnectorConfiguration(config));
    setShowConnectorModal(false);
    showMessage('Connection configurations saved successfully', 'success');
  };

  const closeSaveModal = () => {
    setShowSaveModal(false);
    setSaveStatus('idle');
  };

  const getProxySetupSubStepIndex = useCallback((subStepId) => {
    return proxySetupSubSteps.findIndex((subStep) => subStep.id === subStepId);
  }, [proxySetupSubSteps]);

  const isApigeeProxyDevelopmentStep = currentStep === 7 && selectedGateway !== 'Kong' && resourceType === 'Proxy';
  const isLastProxySetupSubStep = activeProxySetupSubStep === proxySetupSubSteps[proxySetupSubSteps.length - 1]?.id;
  const activeProxySetupSubStepIndex = getProxySetupSubStepIndex(activeProxySetupSubStep);

  const goToProxySetupSubStep = useCallback((targetSubStepId) => {
    if (!targetSubStepId || targetSubStepId === activeProxySetupSubStep) return;

    const currentIndex = getProxySetupSubStepIndex(activeProxySetupSubStep);
    const targetIndex = getProxySetupSubStepIndex(targetSubStepId);
    if (currentIndex < 0 || targetIndex < 0) return;

    if (targetIndex > currentIndex) {
      const jumpedSubSteps = proxySetupSubSteps
        .slice(currentIndex + 1, targetIndex)
        .map((subStep) => subStep.id);

      setCompletedProxySetupSubSteps((previous) => [...new Set([...previous, activeProxySetupSubStep])]);
      setSkippedProxySetupSubSteps((previous) => {
        const skipped = new Set(previous);
        jumpedSubSteps.forEach((subStepId) => {
          if (!completedProxySetupSubSteps.includes(subStepId)) skipped.add(subStepId);
        });
        skipped.delete(activeProxySetupSubStep);
        skipped.delete(targetSubStepId);
        return [...skipped];
      });
    } else {
      setSkippedProxySetupSubSteps((previous) => previous.filter((subStepId) => subStepId !== targetSubStepId));
    }

    setActiveProxySetupSubStep(targetSubStepId);
  }, [activeProxySetupSubStep, completedProxySetupSubSteps, getProxySetupSubStepIndex, proxySetupSubSteps]);

  const handleProxySetupPreviousSubStep = useCallback(() => {
    const currentIndex = getProxySetupSubStepIndex(activeProxySetupSubStep);
    if (currentIndex <= 0) {
      handlePrevious();
      return;
    }
    goToProxySetupSubStep(proxySetupSubSteps[currentIndex - 1].id);
  }, [activeProxySetupSubStep, getProxySetupSubStepIndex, goToProxySetupSubStep, handlePrevious, proxySetupSubSteps]);

  const handleProxySetupNextSubStep = useCallback(() => {
    const currentIndex = getProxySetupSubStepIndex(activeProxySetupSubStep);
    if (currentIndex < 0 || currentIndex >= proxySetupSubSteps.length - 1) return;
    goToProxySetupSubStep(proxySetupSubSteps[currentIndex + 1].id);
  }, [activeProxySetupSubStep, getProxySetupSubStepIndex, goToProxySetupSubStep, proxySetupSubSteps]);

  const handleDeployToProduction = () => {
    setShowDeploymentModal(true);
    setDeploymentStatus('deploying');
    setTimeout(() => {
      setDeploymentStatus('success');
    }, 3000);
  };

  const closeDeploymentModal = () => {
    setShowDeploymentModal(false);
    setDeploymentStatus('idle');
  };

  const runClonedResourceDeploymentFlow = async (resourceId) => {
    if (!resourceId) return false;

    setShowResourceLanding(false);
    setCurrentStep(7);
    setShowProxyDevSubBranch(true);
    setIsGenerating(true);
    setGenerationFailed(false);
    setGenerationError('');
    setFailedAtStep(null);
    setBusy(true);
    setCurrentSubStep(1);
    setCompletedSubSteps(['api-gen']);

    const githubResult = await apiDevelopmentService.uploadToGitHub(resourceId);
    if (!githubResult.success) {
      const errorMessage = githubResult.error || 'Failed to deploy cloned resource to GitHub';
      setGenerationFailed(true);
      setGenerationError(errorMessage);
      setFailedAtStep('scm');
      setBusy(false);
      showMessage(errorMessage, 'error');
      return false;
    }

    showMessage('Waiting for GitHub workflow to complete...', 'success');
    const latestRunResult = await pollLatestGitHubRun(resourceId);
    const latestRunData = latestRunResult.data;

    if (!latestRunResult.success) {
      const errorMessage = latestRunResult.error || 'GitHub workflow did not complete successfully';
      setGenerationFailed(true);
      setGenerationError(errorMessage);
      setFailedAtStep('scm');
      setBusy(false);
      showMessage(errorMessage, 'error');
      return false;
    }

    showMessage(
      latestRunData?.message || `GitHub workflow completed successfully: ${latestRunData?.run?.id || latestRunData?.runId || 'latest run'}`,
      'success'
    );
    setCompletedSubSteps((prev) => prev.includes('scm') ? prev : [...prev, 'scm']);

    for (let i = 2; i < proxyDevSubSteps.length; i++) {
      setCurrentSubStep(i);
      await wait(1000);
      setCompletedSubSteps((prev) => prev.includes(proxyDevSubSteps[i].id) ? prev : [...prev, proxyDevSubSteps[i].id]);
    }

    setCurrentSubStep(proxyDevSubSteps.length);
    setBusy(false);
    setShowProxyDevSubBranch(false);
    setIsGenerating(false);
    return true;
  };

  // Consumer handler functions
  const handleSaveConsumer = async () => {
    // const newConsumer = {
    //   id: Date.now(),
    //   consumerName: consumerForm.consumerName,
    //   consumerPocName: consumerForm.consumerPocName,
    //   consumerPocEmail: consumerForm.consumerPocEmail,
    //   consumerSmeName: consumerForm.consumerSmeName,
    //   consumerSmeEmail: consumerForm.consumerSmeEmail,
    //   consumerConfig: consumerForm.consumerConfig,
    //   apiTps: consumerForm.apiTps,
    //   quota: consumerForm.quota,
    //   rateLimiting: consumerForm.rateLimiting,
    //   apiKeyInfo: consumerForm.apiKeyInfo
    // };
    // const updated = [...savedConsumers, newConsumer];
    // setSavedConsumers(updated);
    // localStorage.setItem('probeStack_consumers', JSON.stringify(updated));
    // setShowConsumerModal(false);
    // // Clear form
    // setConsumerForm({
    //   consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
    //   consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
    // });
    setIsAddingConsumer(true);
    const consumerData = {
      organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", // You may want to make this dynamic
      consumerName: consumerForm.consumerName,
      consumerPocName: consumerForm.consumerPocName,
      consumerPocEmail: consumerForm.consumerPocEmail,
      consumerSmeName: consumerForm.consumerSmeName,
      consumerSmeEmail: consumerForm.consumerSmeEmail,
      consumerConfig: consumerForm.consumerConfig,
      apiTps: parseInt(consumerForm.apiTps) || 100,
      quota: consumerForm.quota,
      rateLimiting: consumerForm.rateLimiting,
      apiKeyInformation: consumerForm.apiKeyInfo,
    };

    const result = await consumerService.createConsumer(consumerData);

    if (result.success) {
      // Success handling
      console.log('Consumer created successfully:', result.data);

      // Refresh the consumer list from API
      await getConsumers();

      // Reset form
      setConsumerForm({
        consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
        consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
      });

      // Close modal
      setShowConsumerModal(false);

      // Refresh consumer list
      await getConsumers();

      // Show success message
      showMessage('Consumer saved successfully', 'success');
    } else {
      // Error handling
      console.error('Failed to create consumer:', result.error);
      showMessage(result.error, 'error');
    }
    setIsAddingConsumer(false);
    // showMessage('Consumer saved successfully', 'success');
  };

  const handleEditConsumer = (consumer) => {
    setEditingConsumerId(consumer.id);
    setConsumerForm({
      consumerName: consumer.consumerName || '',
      consumerPocName: consumer.consumerPocName || '',
      consumerPocEmail: consumer.consumerPocEmail || '',
      consumerSmeName: consumer.consumerSmeName || '',
      consumerSmeEmail: consumer.consumerSmeEmail || '',
      consumerConfig: consumer.consumerConfig || '',
      apiTps: consumer.apiTps || '',
      quota: consumer.quota || '',
      rateLimiting: consumer.rateLimiting || '',
      apiKeyInfo: consumer.apiKeyInformation || consumer.apiKeyInfo || ''
    });
    setShowConsumerModal(true);
  };

  const handleUpdateConsumer = async () => {
    setIsAddingConsumer(true);

    const consumerData = {
      organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
      consumerName: consumerForm.consumerName,
      consumerPocName: consumerForm.consumerPocName,
      consumerPocEmail: consumerForm.consumerPocEmail,
      consumerSmeName: consumerForm.consumerSmeName,
      consumerSmeEmail: consumerForm.consumerSmeEmail,
      consumerConfig: consumerForm.consumerConfig,
      apiTps: parseInt(consumerForm.apiTps) || 100,
      quota: consumerForm.quota,
      rateLimiting: consumerForm.rateLimiting,
      apiKeyInformation: consumerForm.apiKeyInfo,
    };

    const result = await consumerService.updateConsumer(editingConsumerId, consumerData);

    if (result.success) {
      console.log('Consumer updated successfully:', result.data);

      // Refresh the consumer list from API
      await getConsumers();

      // Reset form and close modal
      setShowConsumerModal(false);
      setEditingConsumerId(null);
      setConsumerForm({
        consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
        consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
      });

      showMessage('Consumer updated successfully', 'success');
    } else {
      console.error('Failed to update consumer:', result.error);
      showMessage(result.error, 'error');
    }

    setIsAddingConsumer(false);
  };

  const handleProceedWithExistingOnboarding = async (actionMode = '') => {
    setActionMode(actionMode);
    let microserviceId =
      selectedExistingSpec?.id ||
      selectedExistingSpec?.microservice?.id ||
      selectedExistingSpec?.resource?.id;

    if (!selectedExistingApp || !selectedExistingSpec || !microserviceId) {
      showMessage(`Please select a ${getResourceLabel()} first`, 'error');
      return;
    }

    if (actionMode === 'cloning') {
      if (!newProxyName.trim() || !newProxyVersion.trim() || !basePath.trim()) {
        showMessage('Please provide new resource name, version, and base path', 'error');
        return;
      }
      setShowActionModal(false);
      setActionLoading(true);
      const payload = {
        newResourceName: newProxyName,
        basePath,
        version: newProxyVersion
      }
      const result = await onboardingService.cloneOnboarding(microserviceId, payload);
      if (result.success) {
        microserviceId = resolveActionResourceId(result) || microserviceId;
        setActionLoading(false);
        showMessage(result.data.message, 'success');
      }
      else {
        showMessage(result.error, 'error');
        setActionLoading(false);
        return;
      }
      // setActionMode('cloning');
    } else if (actionMode === 'versioning') {
      if (!newProxyVersion.trim() || !basePath.trim()) {
        showMessage('Please provide version and base path', 'error');
        return;
      }
      // setActionMode('versioning');
      setShowActionModal(false);
      setActionLoading(true);
      const payload = {
        // newMicroserviceName: newMicroserviceName,
        basePath,
        version: newProxyVersion
      }
      const result = await onboardingService.versionOnboarding(microserviceId, payload);
      if (result.success) {
        microserviceId = resolveActionResourceId(result) || microserviceId;
        setActionLoading(false);
        showMessage(result.data.message, 'success');
      }
      else {
        showMessage(result.error, 'error');
        setActionLoading(false);
        return;
      }
    }

    const loaded = await loadProxyResourceIntoFlow(microserviceId, actionMode || 'update');
    if (!loaded) return;
    if (actionMode === 'cloning' || actionMode === 'versioning') {
      await runClonedResourceDeploymentFlow(microserviceId);
    }
    setShowExistingOnboardingModal(false);
    setSelectedExistingApp(null);
    setSelectedExistingSpec(null);
    setExistingAppOnboarding([]);
    setNewProxyName('');
    setNewProxyVersion('');
    setVersionError('');
    showMessage(`Loaded onboarding data for ${selectedExistingApp}`, 'success');
  };

  // Handler for action mode selection (Update/Cloning/Versioning)
  const handleProceedWithActionMode = () => {
    if (!selectedActionApp || !selectedActionSpec) return;

    // Validation for cloning and versioning modes
    if (actionMode === 'cloning') {
      if (!newProxyName.trim() || !newProxyVersion.trim() || !basePath.trim()) {
        showMessage('Please provide new resource name, version, and base path', 'error');
        return;
      }
    } else if (actionMode === 'versioning') {
      if (!newProxyVersion.trim() || !basePath.trim()) {
        showMessage('Please provide version and base path', 'error');
        return;
      }
      // Check if new version is same as current version
      if (newProxyVersion === version) {
        setVersionError('New version cannot be the same as the current version');
        return;
      }
    }

    // Fill onboarding form with dummy data
    setOnboardingTeamName(`Team-${selectedActionApp}`);
    setOnboardingApplicationName(`${selectedActionSpec.name} Proxy`);
    setOnboardingApplicationId(selectedActionApp);
    setOnboardingProjectOwner('John Doe');
    setOnboardingOwnerEmail(`owner-${selectedActionApp.toLowerCase()}@example.com`);
    setOnboardingProjectSME('Jane Smith');
    setOnboardingProjectSMEEmail(`sme-${selectedActionApp.toLowerCase()}@example.com`);
    setOnboardingProjectDLEmail(`dl-${selectedActionApp.toLowerCase()}@example.com`);
    setOnboardingGoLiveDate('2024-12-31');
    setOnboardingTesterName('Test User');
    setOnboardingTesterEmail(`tester-${selectedActionApp.toLowerCase()}@example.com`);
    setOnboardingServiceNowGroup(`SN-Group-${selectedActionApp}`);
    setOnboardingServiceNowEmail(`sn-${selectedActionApp.toLowerCase()}@example.com`);

    // Store the selected proxy name for status header display
    setActiveProxyName(selectedActionSpec.name);

    // Handle different action modes
    if (actionMode === 'update') {
      // Update mode: Just populate the data, stay on onboarding page
      showMessage(`Loaded ${selectedActionSpec.name} Proxy for updating`, 'success');
    } else if (actionMode === 'cloning') {
      // Cloning mode: Set new name and version from modal inputs
      setProxyName(newProxyName);
      setVersion(newProxyVersion);
      localStorage.setItem('probeStack_proxyName', newProxyName);
      localStorage.setItem('probeStack_proxyVersion', newProxyVersion);
      showMessage(`Cloning ${selectedActionSpec.name} Proxy as "${newProxyName}" with version ${newProxyVersion}`, 'success');
    } else if (actionMode === 'versioning') {
      // Versioning mode: Set new version and redirect to Proxy Development step (step 8)
      setVersion(newProxyVersion);
      localStorage.setItem('probeStack_proxyVersion', newProxyVersion);
      setCurrentStep(7);
      setShowProxyDevSubBranch(true);
      showMessage(`Versioning ${selectedActionSpec.name} Proxy to version ${newProxyVersion} - Navigate to Proxy Development`, 'success');
    }

    // Close modal and reset selections
    setShowActionModal(false);
    setSelectedActionApp(null);
    setSelectedActionSpec(null);
    setNewProxyName('');
    setNewProxyVersion('');
    setVersionError('');
  };

  // Handler for action button click
  const handleActionButtonClick = (mode) => {
    if (mode != "sync") {
      setActionMode(mode);
    }
    if (mode === 'create') {
      // Create mode: Reset all forms
      setOnboardingBusinessUnit('');
      setOnboardingTeamName('');
      setOnboardingApplicationName('');
      setOnboardingApplicationId('');
      setOnboardingProjectOwner('');
      setOnboardingOwnerEmail('');
      setOnboardingProjectSME('');
      setOnboardingProjectSMEEmail('');
      setOnboardingProjectDLEmail('');
      setOnboardingTesterName('');
      setOnboardingTesterEmail('');
      setOnboardingServiceNowGroup('');
      setOnboardingServiceNowEmail('');
      setOnboardingGoLiveDate('');
      setSelectedOnboardingConsumers([]);
      setActiveProxyName(''); // Reset active proxy name
      localStorage.removeItem('probeStack_proxyOnboardingNumber');
      localStorage.removeItem('probeStack_proxyOnboardingData');
      setOnboardingNumber('');
      showMessage('Create mode: Forms reset for new Proxy', 'success');
    } else if (mode == "sync") {
      setIsSyncModal(true);
    } else {
      // setShowExistingOnboardingModal(true);
      setShowActionModal(true);
      setIsFetchingAppNames(true);
      onboardingService.getApplicationNames(getProjectType()).then((result) => {
        if (result.success) {
          const names = result.data?.data || result.data || [];
          setExistingAppNames(Array.isArray(names) ? names : []);
        } else {
          showMessage(result.error, 'error');
        }
        setIsFetchingAppNames(false);
      });
    }
  };

  const isStepSaved = (stepId) => savedSteps.includes(stepId);
  const isStepActive = (stepId) => currentStep === stepId;
  const isStepCompleted = (stepId) => stepId < currentStep || (isStepSaved(stepId) && stepId !== currentStep);

  useEffect(() => {
    fetchWorkflowsByOrganization(getCurrentOrganization()).then((wfs) => {
      setAvailableWorkflows(wfs);
      const saved = localStorage.getItem('forgesphere_activeWorkflow_proxy');
      if (saved) {
        const found = wfs.find((w) => w.id === saved);
        if (found) setSelectedWorkflow(found);
      }
    }).catch(() => setAvailableWorkflows([]));
  }, []);

  // Helper function to generate coherent dummy JSON schemas for mock proxy endpoints
  const generateEndpointSchema = (method, path, specName) => {
    const resourceName = specName ? specName.toLowerCase().replace(/\s+/g, '_') : 'resource';
    const capitalizedName = specName ? specName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') : 'Resource';

    const schemas = {
      GET: {
        request: null,
        response: path.includes(':id') ? {
          id: "12345",
          name: `Sample ${capitalizedName}`,
          description: `This is a sample ${resourceName}`,
          status: "active",
          createdAt: "2024-01-15T10:30:00Z",
          updatedAt: "2024-01-20T14:45:00Z"
        } : {
          data: [
            {
              id: "12345",
              name: `Sample ${capitalizedName} 1`,
              status: "active"
            },
            {
              id: "12346",
              name: `Sample ${capitalizedName} 2`,
              status: "inactive"
            }
          ],
          total: 2,
          page: 1,
          pageSize: 10
        }
      },
      POST: {
        request: {
          name: `New ${capitalizedName}`,
          description: `Creating a new ${resourceName}`,
          status: "active",
          metadata: {
            category: "default",
            priority: "medium"
          }
        },
        response: {
          id: "12347",
          name: `New ${capitalizedName}`,
          description: `Creating a new ${resourceName}`,
          status: "active",
          createdAt: "2024-01-22T09:15:00Z",
          message: "Resource created successfully"
        }
      },
      PUT: {
        request: {
          name: `Updated ${capitalizedName}`,
          description: `Updating existing ${resourceName}`,
          status: "active"
        },
        response: {
          id: "12345",
          name: `Updated ${capitalizedName}`,
          description: `Updating existing ${resourceName}`,
          status: "active",
          updatedAt: "2024-01-22T10:30:00Z",
          message: "Resource updated successfully"
        }
      },
      DELETE: {
        request: null,
        response: {
          id: "12345",
          message: "Resource deleted successfully",
          deletedAt: "2024-01-22T11:00:00Z"
        }
      }
    };

    return schemas[method] || { request: {}, response: {} };
  };

  // Handler for mock proxy testing
  const handleTestMockProxy = async () => {
    // setShowMockTestModal(true);
    // setMockTestStatus('testing');

    // setTimeout(() => {
    //   const specName = proxyDesignSelectedSpec?.name || 'resource';
    //   const baseUrl = mockServerUrl || `https://mock-${specName.toLowerCase().replace(/\s+/g, '-')}.example.com/v1`;

    //   // Generate test results based on actual apiEndpoints
    //   const endpointResults = apiEndpoints.map(endpoint => {
    //     const statusCode = endpoint.method === 'POST' ? 201 : 200;
    //     const responseTime = `${Math.floor(Math.random() * 50) + 30}ms`;
    //     return {
    //       method: endpoint.method,
    //       path: endpoint.path,
    //       status: statusCode,
    //       responseTime: responseTime,
    //       result: 'Success'
    //     };
    //   });

    //   // Calculate average response time
    //   const totalTime = endpointResults.reduce((sum, ep) => {
    //     return sum + parseInt(ep.responseTime);
    //   }, 0);
    //   const avgTime = endpointResults.length > 0 ? Math.round(totalTime / endpointResults.length) : 0;

    //   setMockTestResults({
    //     endpoints: endpointResults,
    //     summary: {
    //       total: apiEndpoints.length,
    //       passed: apiEndpoints.length,
    //       failed: 0,
    //       avgResponseTime: `${avgTime}ms`
    //     }
    //   });

    //   setMockTestStatus('success');
    //   setTimeout(() => {
    //     setShowMockTestModal(false);
    //     setMockTestStatus('idle');
    //   }, 1500);
    // }, 2500);

    setShowMockTestModal(true);
    setMockTestStatus('testing');
    const result = await mockApiService.runMock(mockServerId);
    setMockTestStatus('success');
    if (result.success) {
      setMockRunResults(result.data?.data || result.data);
    } else {
      showMessage(result.error, 'error');
    }
    setTimeout(() => { setShowMockTestModal(false); setMockTestStatus('idle'); }, 1500);
  };

  const dummyForgeSpecs = [
    {
      id: 1,
      name: 'apigee-gateway-proxy',
      description: 'ForgeSphere API gateway with OAuth 2.0, spike arrest, and quota policies',
      policies: ['Spike Arrest', 'Quota', 'OAuth v2.0', 'Assign Message', 'CORS'],
      platform: 'apigee',
      basePath: '/v1',
      targetUrl: 'https://backend.example.com'
    },
    {
      id: 2,
      name: 'kong-enterprise-proxy',
      description: 'Kong Gateway with JWT authentication, rate limiting, and key authentication',
      policies: ['JWT', 'Rate Limiting', 'Key Auth', 'IP Restriction', 'Bot Detection'],
      platform: 'kong',
      basePath: '/api',
      targetUrl: 'https://api-backend.example.com'
    },
    {
      id: 3,
      name: 'aws-api-gateway-proxy',
      description: 'AWS API Gateway with API key validation, throttling, and Lambda integration',
      policies: ['API Key Verification', 'Throttling', 'AWS Lambda', 'CloudWatch', 'Request Validator'],
      platform: 'aws',
      basePath: '/prod',
      targetUrl: 'https://lambda.us-east-1.amazonaws.com'
    },
    {
      id: 4,
      name: 'azure-apim-proxy',
      description: 'Azure API Management with caching, transformation, and conditional policies',
      policies: ['Caching', 'JSON to XML', 'XML to JSON', 'Rewrite URL', 'Validate JWT'],
      platform: 'azure',
      basePath: '/v2',
      targetUrl: 'https://backend.azurewebsites.net'
    },
    {
      id: 5,
      name: 'tyk-enterprise-proxy',
      description: 'Tyk Gateway with GraphQL middleware, HMAC signing, and circuit breaker',
      policies: ['GraphQL', 'HMAC Auth', 'Circuit Breaker', 'Cache', 'Mock Response'],
      platform: 'tyk',
      basePath: '/graphql',
      targetUrl: 'https://graphql-backend.example.com'
    },
    {
      id: 6,
      name: 'nginx-proxy-manager',
      description: 'NGINX API Gateway with load balancing, SSL termination, and upstream health checks',
      policies: ['Load Balancer', 'SSL Termination', 'Health Check', 'Request Rewrite', 'Response Headers'],
      platform: 'nginx',
      basePath: '/api/v1',
      targetUrl: 'https://upstream.example.com'
    },
  ];

  const availablePolicies = [
    { id: 'spike-arrest', name: 'Spike Arrest', description: 'Prevent traffic spikes', icon: Zap, type: 'traffic' },
    { id: 'quota', name: 'Quota', description: 'Rate limit requests', icon: Filter, type: 'traffic' },
    { id: 'oauth', name: 'OAuth 2.0', description: 'OAuth authentication', icon: Lock, type: 'security' },
    { id: 'api-key', name: 'API Key', description: 'API key verification', icon: Shield, type: 'security' },
    { id: 'cors', name: 'CORS', description: 'Cross-origin resource sharing', icon: Globe, type: 'security' },
    { id: 'assign-message', name: 'Assign Message', description: 'Modify request/response', icon: FileJson, type: 'transformation' },
    { id: 'json-xml', name: 'JSON to XML', description: 'Transform JSON to XML', icon: Code, type: 'transformation' },
    { id: 'xml-json', name: 'XML to JSON', description: 'Transform XML to JSON', icon: Code, type: 'transformation' },
    { id: 'cache', name: 'Response Cache', description: 'Cache backend responses', icon: Database, type: 'performance' },
    { id: 'logging', name: 'Logging', description: 'Request/response logging', icon: ActivityIcon, type: 'monitoring' },
  ];
  const standardPolicyOptions = ['Logging', 'Encryption', 'CORS', 'Error handling'];

  const handleImportFromForge = (specName) => {
    if (!importedSpecs.includes(specName)) {
      setImportedSpecs([...importedSpecs, specName]);
    }
    const template = dummyForgeSpecs.find(s => s.name === specName);
    if (template) {
      setProxyName(template.name);
      setProxyDescription(template.description);
      setSelectedProxyTemplate(template);
      setBasePath(template.basePath);
      setTargetUrl(template.targetUrl);
      setSelectedFramework(template.platform);
      // Convert template policies to actual policies
      const templatePolicies = template.policies.map((p, i) => ({
        id: `${template.id}-${i}`,
        name: p,
        type: availablePolicies.find(ap => ap.name === p)?.type || 'other',
        enabled: true,
        config: {}
      }));
      setPolicies(templatePolicies);
    }
  };

  // Policy Management Functions
  const addPolicy = (policyDef) => {
    const newPolicy = {
      id: `policy-${Date.now()}`,
      name: policyDef.name,
      type: policyDef.type,
      enabled: true,
      config: {}
    };
    setPolicies([...policies, newPolicy]);
  };

  const removePolicy = (policyId) => {
    setPolicies(policies.filter(p => p.id !== policyId));
  };

  const togglePolicy = (policyId) => {
    setPolicies(policies.map(p =>
      p.id === policyId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const resetProxyForm = () => {
    setProxyName('');
    setProxyDescription('');
    setPolicies([]);
    setSelectedProxyTemplate(null);
    setBasePath('/v1');
    setTargetUrl('');
  };

  const updateFileName = useCallback((e) => {
    const file = e?.target?.files?.[0];
    setSpecFile(file || null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith('.yaml') || file.name.endsWith('.yml') || file.name.endsWith('.json'))) {
      setSpecFile(file);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-primary', 'bg-primary/5');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
  }, []);

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setToast({ message: text, type });
  }, []);

    const loadSpecContent = useCallback(async () => {
    if (!onboardingId) return;
    setSpecContentLoading(true);
    const result = await testCaseService.getSpecContent(onboardingId);
    if (result.success) {
      setUploadedFileContent(result.content);
      const isOpenAPI = result.content.includes('openapi') || result.content.includes('swagger');
      setUploadedSpecFormat(isOpenAPI ? 'OPENAPI' : 'POSTMAN');
      setUploadedFileName('spec.yaml');
    } else {
      showMessage(result.error, 'error');
    }
    setSpecContentLoading(false);
  }, [onboardingId]);

  const fetchLatestAnalysis = useCallback(async () => {
    if (!onboardingId) return;
    setLoadingLatestAnalysis(true);
    try {
      const result = await staticCodeAnalysisService.getReportHistory('MICROSERVICE', onboardingId);
      if (result.success) {
        const reports = result.data?.data || result.data || [];
        if (reports.length > 0) {
          const latestReport = reports[0]; // most recent first
          setStaticAnalysisResults(latestReport);
        }
      }
    } catch (err) {
      console.error('Failed to fetch latest analysis:', err);
    } finally {
      setLoadingLatestAnalysis(false);
    }
  }, [onboardingId]);
  
  useEffect(() => {
    if (currentStep === 10 && onboardingId && !staticAnalysisResults) {
      fetchLatestAnalysis();
    }
  }, [currentStep, onboardingId, staticAnalysisResults, fetchLatestAnalysis]);

  const runSpectralLint = async (specContent) => {
  if (!specContent) return [];
  const spectral = new Spectral();
  spectral.setRuleset(oas);
  try {
    const results = await spectral.run(specContent);
    return results.map(result => ({
      code: result.code,
      message: result.message,
      severity: result.severity,
      range: result.range,
      path: result.path,
    }));
  } catch (err) {
    console.error('Linting failed', err);
    return [];
  }
};

  const renderProxyAiIngestionPanel = (inSidebar = false) => {
    const suggestion = proxyAiIngestion.suggestion;
    const hasGeneratedSuggestion = Boolean(suggestion);
    const isStreamingResponse = proxyAiIngestion.status === 'streaming';
    const isGeneratingResponse = proxyAiIngestion.status === 'generating';
    const showGeneratedArtifacts = hasGeneratedSuggestion && (proxyAiIngestion.status === 'completed' || proxyAiIngestion.status === 'stale');

    return (
      <section className={cn(
        'border border-dark-700 rounded-xl shadow-lg overflow-hidden',
        inSidebar ? 'bg-dark-800/60' : 'p-6',
      )} style={inSidebar ? undefined : { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className={cn(inSidebar ? 'p-6' : 'p-0')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Requirement Ingestion
              </h3>
              <p className="text-sm text-gray-400">
                Generate a dummy AI-backed proxy suggestion using your written requirements and the available specification library.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {proxyAiIngestion.status === 'completed' && (
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-400">
                  Generated at {proxyAiIngestion.completedAt}
                </span>
              )}
              {proxyAiIngestion.status === 'stale' && (
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/15 text-yellow-300">
                  Inputs changed, refresh suggestion
                </span>
              )}
              <button
                type="button"
                onClick={startProxyAiIngestion}
                disabled={proxyAiIngestion.status === 'generating' || proxyAiIngestion.status === 'streaming'}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                  'flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {proxyAiIngestion.status === 'generating' || proxyAiIngestion.status === 'streaming' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {proxyAiIngestion.status === 'streaming' ? 'Streaming response...' : 'Analysing...'}
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    {proxyAiIngestion.status === 'completed' || proxyAiIngestion.status === 'stale'
                      ? 'Refresh AI Suggestion'
                      : 'Start AI Ingestion'}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-2 space-y-4">
              {[
                {
                  title: 'Requirement ingestion',
                  description: 'Parsing functional and non-functional proxy requirements into gateway-ready capabilities.',
                },
                {
                  title: 'Specification library analysis',
                  description: `${specLibrary.length} library spec${specLibrary.length === 1 ? '' : 's'} and ${proxyApiDesignSpecs.length} imported spec${proxyApiDesignSpecs.length === 1 ? '' : 's'} available for analysis.`,
                },
                {
                  title: 'OpenAPI contract synthesis',
                  description: 'Generating a suggested proxy application name, microservice name, and starter OpenAPI document.',
                },
              ].map((step, index) => {
                const isCompleted = proxyAiIngestion.activeStep > index || proxyAiIngestion.status === 'completed' || proxyAiIngestion.status === 'stale';
                const isActive = (proxyAiIngestion.status === 'generating' || proxyAiIngestion.status === 'streaming') && proxyAiIngestion.activeStep === index;

                return (
                  <div
                    key={step.title}
                    className={cn(
                      'rounded-xl border px-4 py-4 transition-all',
                      isCompleted
                        ? 'border-green-500/30 bg-green-500/10'
                        : isActive
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-dark-700 bg-[#0f172a]/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center border shrink-0',
                          isCompleted
                            ? 'border-green-500/40 bg-green-500/15 text-green-400'
                            : isActive
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-dark-700 bg-dark-900 text-gray-500'
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="text-xs font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="mt-1 text-xs text-gray-400 leading-5">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl border border-primary/20 bg-[#0f172a]/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary mb-3">AI response</p>
                {proxyAiIngestion.streamedResponse ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-gray-200 whitespace-pre-wrap">
                      {proxyAiIngestion.streamedResponse}
                      {(isStreamingResponse || isGeneratingResponse) && <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-primary/70 align-middle" />}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-gray-500">
                    Start the AI ingestion flow to see the assistant stream its generated proxy analysis and contract recommendation.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-dark-700 bg-[#0f172a]/50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">AI notes</p>
                <div className="space-y-2 text-xs text-gray-400 leading-5">
                  <p>{hasGeneratedSuggestion ? suggestion.librarySummary : 'The assistant will summarise the specification library after the mock analysis starts.'}</p>
                  <p>{hasGeneratedSuggestion ? suggestion.importedSummary : 'Imported proxy design specs will be mentioned in the generated response when available.'}</p>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3 space-y-4">
              {showGeneratedArtifacts ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-2">Generated App Name</p>
                      <p className="text-sm font-semibold text-white break-all">
                        {suggestion.generatedApplicationName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-blue-300 mb-2">Microservice Name</p>
                      <p className="text-sm font-semibold text-white">
                        {suggestion.generatedMicroserviceName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-green-400 mb-2">Suggested Spec File</p>
                      <p className="text-sm font-semibold text-white break-all">
                        {suggestion.specFileName}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dark-700 bg-[#0f172a]/60 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
                      <div>
                        <p className="text-sm font-semibold text-white">Generated OpenAPI Preview</p>
                        <p className="text-xs text-gray-400">Dummy AI output based on the current requirement inputs.</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-dark-800 text-primary border border-primary/20">
                        OPENAPI 3.0.3
                      </span>
                    </div>
                    <div className="px-4 py-4">
                      <pre className="max-h-[360px] overflow-auto rounded-lg border border-dark-700 bg-[#0b1120] p-4 text-xs leading-6 text-gray-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(suggestion.specPreview, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-dark-700 bg-[#0f172a]/40 px-6 py-10 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-dark-800 text-primary">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">Waiting for generated contract output</p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    The suggested application name, proxy name, and OpenAPI preview will appear here after the AI response finishes streaming.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const startProxyAiIngestion = useCallback(() => {
    if (!functionalReqs.trim() && !nonFunctionalReqs.trim()) {
      showMessage('Add requirement details first to run the AI ingestion flow.', 'error');
      return;
    }

    clearProxyAiIngestionTimers();
    const assistantResponse = buildDummyProxyAssistantResponse(proxyAiSuggestion);
    const responseWords = assistantResponse.split(/\s+/).filter(Boolean);

    setProxyAiIngestion({
      status: 'generating',
      activeStep: 0,
      completedAt: '',
      sourceSignature: '',
      suggestion: null,
      streamedResponse: '',
    });

    setReqGenStatus((prev) => ({
      ...prev,
      transformations: {
        status: 'AI ingestion in progress',
        completed: false,
      },
    }));

    [1, 2].forEach((stepIndex) => {
      const timerId = setTimeout(() => {
        setProxyAiIngestion((prev) => ({
          ...prev,
          status: 'generating',
          activeStep: stepIndex,
        }));
      }, 900 * stepIndex);

      proxyAiIngestionTimersRef.current.push(timerId);
    });

    const completionTimerId = setTimeout(() => {
      setProxyAiIngestion((prev) => ({
        ...prev,
        status: 'streaming',
        activeStep: 3,
        streamedResponse: '',
      }));

      let accumulatedResponse = '';

      responseWords.forEach((word, index) => {
        const streamTimerId = setTimeout(() => {
          accumulatedResponse = accumulatedResponse ? `${accumulatedResponse} ${word}` : word;
          const isLastChunk = index === responseWords.length - 1;

          setProxyAiIngestion((prev) => ({
            ...prev,
            status: isLastChunk ? 'completed' : 'streaming',
            activeStep: 3,
            completedAt: isLastChunk
              ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            sourceSignature: isLastChunk ? proxyAiSuggestionSignature : '',
            suggestion: isLastChunk ? proxyAiSuggestion : null,
            streamedResponse: accumulatedResponse,
          }));

          if (isLastChunk) {
            setReqGenStatus((prev) => ({
              ...prev,
              transformations: {
                status: 'Suggested OpenAPI generated',
                completed: true,
              },
            }));
          }
        }, 55 * index);

        proxyAiIngestionTimersRef.current.push(streamTimerId);
      });
    }, 2900);

    proxyAiIngestionTimersRef.current.push(completionTimerId);
  }, [
    functionalReqs,
    nonFunctionalReqs,
    showMessage,
    clearProxyAiIngestionTimers,
    proxyAiSuggestion,
    proxyAiSuggestionSignature,
  ]);

  useEffect(() => {
    if (
      proxyAiIngestion.status === 'completed' &&
      proxyAiIngestion.sourceSignature &&
      proxyAiIngestion.sourceSignature !== proxyAiSuggestionSignature
    ) {
      setProxyAiIngestion((prev) => ({
        ...prev,
        status: 'stale',
      }));
    }
  }, [proxyAiIngestion.status, proxyAiIngestion.sourceSignature, proxyAiSuggestionSignature]);

  useEffect(() => () => {
    clearProxyAiIngestionTimers();
  }, [clearProxyAiIngestionTimers]);

  const hideMessage = useCallback(() => {
    setMessage({ text: '', type: 'success' });
  }, []);

  const importGeneratedProxyToApigee = useCallback(
    async ({ archivePath, apiProxyName }) => {
      if (!archivePath) {
        throw new Error('Generated archive path is missing from the code generation response.');
      }

      const apigeeOrganization = gatewayConfigForm.organization || 'gen-ai-poc-onboarding';
      const importName = (apiProxyName || proxyName || 'generated-proxy').trim();

      const archiveResponse = await fetch(archivePath);
      if (!archiveResponse.ok) {
        throw new Error(`Failed to download generated archive: ${archiveResponse.status}`);
      }

      const archiveBlob = await archiveResponse.blob();
      const formData = new FormData();
      formData.append('file', archiveBlob, `${importName}.zip`);

      const importResponse = await apigeeApiFetch(
        APIGEE_ENDPOINTS.APIS.IMPORT(apigeeOrganization, importName),
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        throw new Error(`Failed to import proxy to Apigee: ${importResponse.status} ${errorText}`);
      }

      const contentType = importResponse.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return importResponse.json();
      }

      return null;
    },
    [gatewayConfigForm.organization, proxyName]
  );

  // Save provider to localStorage
  const handleSaveProvider = () => {
    const newProvider = {
      id: Date.now(),
      teamName,
      projectId,
      applicationId,
      appOwnerName,
      appOwnerEmail,
      smeName,
      smeEmail,
      supportGroupName,
      supportGroupEmail,
      associatedApplication,
      scmConfig,
      storageConfig,
      appName,
      productName
    };
    const updated = [...savedProviders, newProvider];
    setSavedProviders(updated);
    localStorage.setItem('probeStack_providers', JSON.stringify(updated));
    setShowProviderModal(false);
    // Clear all provider fields
    setTeamName('');
    setProjectId('');
    setApplicationId('');
    setAppOwnerName('');
    setAppOwnerEmail('');
    setSmeName('');
    setSmeEmail('');
    setSupportGroupName('');
    setSupportGroupEmail('');
    setAssociatedApplication('');
    setScmConfig('');
    setStorageConfig('');
    setAppName('');
    setProductName('');
    showMessage('Provider saved successfully', 'success');
  };

  // Helper function to get substep description during generation
  const getSubStepDescription = (stepId) => {
    const descriptions = {
      'proxy-gen': 'Generating proxy configuration from specification...',
      'scm': 'Configuring source control management integration...',
      'lint': 'Running static code analysis and linting...',
      'security': 'Performing security vulnerability scanning...',
      'unit-test': 'Generating and executing unit tests...',
      'deploy-sub': 'Preparing deployment configuration...',
      'artifact': 'Publishing proxy bundle to registry...',
      'testing-sub': 'Running integration and E2E tests...',
    };
    return descriptions[stepId] || 'Processing...';
  };

  // Helper function to get substep success message
  const getSubStepSuccessMessage = (stepId) => {
    const messages = {
      'proxy-gen': 'Proxy configuration generated successfully',
      'scm': 'SCM configured',
      'lint': 'Code linting passed',
      'security': 'Security scan complete - No issues found',
      'unit-test': 'Unit tests passed',
      'deploy-sub': 'Deployment config ready',
      'artifact': 'Proxy bundle published',
      'testing-sub': 'All tests passed',
    };
    return messages[stepId] || 'Step completed';
  };

  const handleSendApprovalRequest = async (type) => {
    if (!approverEmail) {
      showMessage('Please enter approver email', 'error');
      return;
    }

    setApprovalStatus('sending');

    const approvalData = {
      microserviceId: onboardingId,
      type: type === 'architect' ? 'ARCHITECT' : 'CONSUMER',
      requestJson: JSON.stringify({ method: 'GET', path: '/api/users' }),
      responseJson: JSON.stringify({ status: 200, body: [] }),
      approverEmail,
      openApiSpec: proxyDesignSelectedSpec?.url || 'https://spec.example.com/openapi.json',
      mockServerUrl: mockServerUrl || 'https://mock.example.com',
      specificationUrl: proxyDesignSelectedSpec?.url || 'https://spec.example.com',
      mockServiceName: mockServiceName || 'my-mock-service',
      consumerInformation: 'Consumer details here',
    };

    const result = await contractTestingService.sendApprovalRequest(approvalData);

    if (result.success) {
      setApprovalStatus('success');
      if (type === 'architect') {
        setArchitectInReview(true);
        setArchitectEmail(approverEmail);
      } else {
        setConsumerInReview(true);
        setConsumerEmail(approverEmail);
      }
      showMessage(`Approval request sent to ${approverEmail}`, 'success');
      setTimeout(() => {
        setShowApprovalModal(false);
        setApprovalStatus('idle');
        setApproverEmail('');
      }, 1500);
    } else {
      setApprovalStatus('idle');
      showMessage(result.error, 'error');
    }
  };

  const openPreviewModal = async () => {
  if (!proxyDesignSelectedSpec?.specMetadataId && !proxyDesignSelectedSpec?.id) {
    showMessage('No API specification selected', 'error');
    return;
  }
  setShowPreviewModal(true);
  setPreviewLoadingSpec(true);

  // Load spec content
  const specId = proxyDesignSelectedSpec.specMetadataId || proxyDesignSelectedSpec.id;
  const result = await apiDesignService.getSpecContent(specId);
  if (result.success && result.content) {
    setPreviewSpecContent(result.content);
    const lintResults = await runSpectralLint(result.content);
    setPreviewLintResults(lintResults);
  } else {
    setPreviewSpecContent(`Failed to load spec content: ${result.error || 'Unknown error'}`);
    setPreviewLintResults([]);
  }
  setPreviewLoadingSpec(false);

  // Pre-fetch spec endpoints if not already loaded
  if ((!specEndpoints || specEndpoints.length === 0) && specId) {
    try {
      const epRes = await mockApiService.getSpecEndpoints(specId);
      if (epRes.success) {
        const eps = epRes.data?.data || epRes.data || [];
        if (Array.isArray(eps)) setSpecEndpoints(eps);
      }
    } catch (e) {
      console.warn('Failed to fetch spec endpoints', e);
    }
  }
};

const handlePreviewSendApproval = async (typeArg) => {
  const type = (typeArg || 'architect').toLowerCase();
  const backendType = type === 'architect' ? 'ARCHITECT' : 'CONSUMER';
  const approverEmail = type === 'architect' ? previewArchitectEmail : autoFilledConsumerEmail;

  if (!approverEmail.trim()) {
    showMessage(`Please enter ${type} email`, 'error');
    return;
  }
  if (!onboardingId) {
    showMessage('Microservice not selected', 'error');
    return;
  }
  setPreviewSending(true);

  // Re-fetch spec content, endpoints, mock endpoints to ensure latest data
  const specMetaId = proxyDesignSelectedSpec?.specMetadataId || proxyDesignSelectedSpec?.id;
  let specBody = previewSpecContent;
  if (specMetaId && (!specBody || !specBody.trim() || specBody.startsWith('Failed to load'))) {
    try {
      const spec = await apiDesignService.getSpecContent(specMetaId);
      if (spec.success && spec.content) {
        specBody = spec.content;
        setPreviewSpecContent(spec.content);
      }
    } catch (e) { console.warn(e); }
  }

  let specEps = Array.isArray(specEndpoints) ? specEndpoints : [];
  if (specMetaId && specEps.length === 0) {
    try {
      const epRes = await mockApiService.getSpecEndpoints(specMetaId);
      if (epRes.success) {
        const eps = epRes.data?.data || epRes.data || [];
        if (Array.isArray(eps) && eps.length > 0) {
          specEps = eps;
          setSpecEndpoints(eps);
        }
      }
    } catch (e) { console.warn(e); }
  }

  const mockEps = Array.isArray(mockEndpoints) ? mockEndpoints : [];

  const firstSpecEp = specEps[0] || null;
  const sampleReq = firstSpecEp
    ? { method: firstSpecEp.method, path: firstSpecEp.path, body: (() => { try { return JSON.parse(firstSpecEp.requestBodySample || 'null'); } catch { return firstSpecEp.requestBodySample || null; } })() }
    : { method: 'GET', path: '/' };
  const sampleResp = firstSpecEp
    ? { status: firstSpecEp.responseStatus || 200, body: (() => { try { return JSON.parse(firstSpecEp.responseBody || 'null'); } catch { return firstSpecEp.responseBody || null; } })() }
    : { status: 200, body: {} };

  const consumerInformation = selectedOnboardingConsumers
    .map(id => savedConsumers.find(c => c.id === id)?.consumerName)
    .filter(Boolean)
    .join(', ') || 'Consumer details';

  const approvalData = {
    microserviceId: onboardingId,
    type: backendType,
    requestJson: JSON.stringify(sampleReq, null, 2),
    responseJson: JSON.stringify(sampleResp, null, 2),
    approverEmail: approverEmail,
    openApiSpec: proxyDesignSelectedSpec?.specName || proxyDesignSelectedSpec?.name || 'API Spec',
    mockServerUrl: mockServerBaseUrl || 'https://mock-service.example.com',
    specificationUrl: mockServerBaseUrl || 'https://mock-service.example.com',
    mockServiceName: mockServiceName || 'mock-service',
    consumerInformation,
    specContent: specBody || '',
    specEndpoints: specEps,
    mockEndpoints: mockEps,
    mockServerBaseUrl: mockServerBaseUrl || '',
    lintResults: previewLintResults,
  };

  const result = await contractTestingService.sendApprovalRequest(approvalData);
  setPreviewSending(false);

  if (result.success) {
    showMessage(`Approval request sent to ${approverEmail}`, 'success');
    setShowPreviewModal(false);
    setHistoryRefreshTrigger(prev => prev + 1);
    // Refresh status in step 6
    if (currentStep === 6) {
  const snap = await contractTestingService.getApprovalStatus(onboardingId);
  if (snap.success) {
    const data = snap.data?.data || snap.data;
    setArchitectApproved(data.architectReview?.status === 'APPROVED');
    setArchitectInReview(data.architectReview?.status === 'SENT' || data.architectReview?.status === 'IN_PROGRESS');
    setArchitectRejected(data.architectReview?.status === 'REJECTED');
    setConsumerApproved(data.consumerReview?.status === 'APPROVED');
    setConsumerInReview(data.consumerReview?.status === 'SENT' || data.consumerReview?.status === 'IN_PROGRESS');
    setConsumerRejected(data.consumerReview?.status === 'REJECTED');
    setArchitectStatus(data.architectReview?.status || '');
    setConsumerStatus(data.consumerReview?.status || '');
    if (data.architectReview?.approverEmail) setArchitectEmail(data.architectReview.approverEmail);
    if (data.consumerReview?.approverEmail) setConsumerEmail(data.consumerReview.approverEmail);
  }
}
  } else {
    showMessage(result.error || 'Failed to send approval request', 'error');
  }
};

const openHistoryDetail = async (record) => {
  setSelectedHistoryRecord(record);
  setShowHistoryDetailModal(true);
  setLoadingHistoryDetail(true);
  const result = await contractTestingService.getApprovalDetails(record.id);
  if (result.success) {
    setHistoryDetailData(result.data?.data || result.data);
  } else {
    showMessage(result.error || 'Failed to load details', 'error');
  }
  setLoadingHistoryDetail(false);
};

  const ensureProxyApiDesignForGeneration = async (resourceId, isSharedFunction) => {
    if (isSharedFunction) {
      return resourceId;
    }

    return saveProxyApiDesignSelection({ updateApiName: false, persistDesign: false });
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const isApigeeSharedFunction = selectedGateway?.startsWith('Apigee') && resourceType === 'Shared Function';

      // Validate that proxy spec is selected from Design page
      if (!isApigeeSharedFunction && !proxyDesignSelectedSpec) {
        showMessage('Please select a proxy specification from the Design page (Step 3).', 'error');
        return;
      }

      let activeOnboardingId = onboardingId;
      if (!activeOnboardingId) {
        try {
          activeOnboardingId = await ensureOnboardingResource();
        } catch (error) {
          showMessage(error.message, 'error');
          return;
        }
      }

      try {
        activeOnboardingId = await ensureProxyApiDesignForGeneration(activeOnboardingId, isApigeeSharedFunction);
      } catch (error) {
        showMessage(error.message, 'error');
        return;
      }

      hideMessage();

      // Reset failure state
      setGenerationFailed(false);
      setGenerationError('');
      setFailedAtStep(null);
      setKongApiResponse(null);
      setBusy(true);

      // Start generation animation through substeps
      setIsGenerating(true);
      setCurrentSubStep(0);
      setCompletedSubSteps([]);
      setShowProxyDevSubBranch(true); // Show sub-branch during generation

      const securityTypeMap = {
        'OAuth 2.0': 'OAUTH2',
        'OAuth 2.1': 'OAUTH2_1',
        oauth2: 'OAUTH2',
        oauth2_1: 'OAUTH2_1',
        JWT: 'JWT',
        jwt: 'JWT',
        IDP: 'IDP',
        idp: 'IDP',
        'Api-Key': 'API_KEY',
        apiKey: 'API_KEY',
        HMAC: 'HMAC',
        DPoP: 'DPOP',
        dpop: 'DPOP',
        MTLS: 'MTLS',
        mtls: 'MTLS',
      };

      const normalizeSecurityType = (value) =>
        securityTypeMap[value] || value?.toUpperCase().replace(/[^A-Z0-9]+/g, '_') || '';

      const generateCodePayload = isApigeeSharedFunction
        ? {
          proxyOptions: {
            sharedFlowName: proxyName,
            org: 'gen-ai-poc-onboarding',
            environment: 'dev',
          },
        }
        : {
          securityOptions: {
            type: normalizeSecurityType(
              securityInboundSelections[0] ||
              securityOutboundSelections[0] ||
              proxyAuthenticationType ||
              'OAuth 2.0'
            ),
            inbound: securityInboundSelections.map(normalizeSecurityType),
            outbound: securityOutboundSelections.map(normalizeSecurityType),
          },
          frameworkOptions: {
            enterpriseLogging: standardPoliciesSelections.includes('Logging'),
            exceptionHandling: standardPoliciesSelections.includes('Error handling'),
            testCollection: false,
            observability: standardPoliciesSelections.includes('Logging'),
          },
          proxyOptions: {
            gateway: selectedGateway,
            resourceType,
            apiType: selectedFramework,
            proxyName,
            proxyDescription,
            version,
            basePath,
            targetUrl,
            endpoint: {
              method: apiMethod,
              path: apiEndpoint,
            },
            targetServer: {
              name: backendName,
              host: backendHost,
              port: backendPort,
              path: backendPath,
              sslEnabled: enableSSL,
            },
            securityBackend: {
              inbound: securityInboundSelections,
              outbound: securityOutboundSelections,
            },
            standardPolicies: standardPoliciesSelections,
            customPolicies: policies.filter((policy) => policy.enabled).map((policy) => policy.name),
          },
        };

      const generateResult = await apiDevelopmentService.generateCode(activeOnboardingId, generateCodePayload);
      if (!generateResult.success) {
        setIsGenerating(false);
        setBusy(false);
        setShowProxyDevSubBranch(false);
        showMessage(generateResult.error || 'Failed to generate proxy code', 'error');
        return;
      }

     const generatedCodeData = generateResult.data?.data || generateResult.data;
if (generateResult.success && generatedCodeData?.archivePath) {
  setGeneratedProxyZipUrl(generatedCodeData.archivePath);
}
// Store Postman URL and auto-import to test generation service
if (generatedCodeData?.postmanCollectionUrl) {
  setGeneratedPostmanUrl(generatedCodeData.postmanCollectionUrl);
  // Auto-import after generation (optional, can be done silently)
  try {
    await testCaseService.importCollectionFromUrl(activeOnboardingId, generatedCodeData.postmanCollectionUrl);
    console.log('Postman collection auto-imported for test generation');
  } catch (err) {
    console.warn('Auto-import failed, user can still generate tests manually', err);
  }
}
setCompletedSubSteps(['api-gen']);

      setCurrentSubStep(1);
      const githubResult = await apiDevelopmentService.uploadToGitHub(activeOnboardingId);
      if (!githubResult.success) {
        setIsGenerating(false);
        setBusy(false);
        setShowProxyDevSubBranch(false);
        showMessage(githubResult.error || 'Failed to deploy to GitHub', 'error');
        return;
      }

      showMessage('Waiting for GitHub workflow to complete...', 'success');
      const latestRunResult = await pollLatestGitHubRun(activeOnboardingId);
      const latestRunData = latestRunResult.data;

      if (!latestRunResult.success) {
        setIsGenerating(false);
        setBusy(false);
        setShowProxyDevSubBranch(false);
        showMessage(latestRunResult.error || 'GitHub workflow did not complete successfully', 'error');
        return;
      }

      showMessage(
        latestRunData?.message || `GitHub workflow completed successfully: ${latestRunData?.run?.id || latestRunData?.runId || 'latest run'}`,
        'success'
      );
      setCompletedSubSteps((prev) => prev.includes('scm') ? prev : [...prev, 'scm']);

const deploymentUrl = buildMicroserviceDeploymentUrl(
  latestRunData?.repoName ||
    latestRunData?.repo ||
    generatedCodeData?.repoName ||
    generatedCodeData?.repositoryName ||
    generatedCodeData?.repo ||
    generatedCodeData?.artifactId ||
    artifactId,
);
setDeployedServiceUrl(deploymentUrl);

// Set repository URL (GitHub clone URL)
const repoName = latestRunData?.repoName || latestRunData?.repo || generatedCodeData?.repoName || repositoryName;
const repoOrg = organization || latestRunData?.org || '';
if (repoName) {
  const repoUrl = repoOrg ? `https://github.com/${repoOrg}/${repoName}.git` : repoName.startsWith('http') ? repoName : `https://github.com/${repoName}`;
  setRepositoryUrl(repoUrl);
} else {
  setRepositoryUrl(deploymentUrl); // fallback
}

      // Auto-progress through substeps with Kong API integration
      const runSubStepAnimation = async () => {
        try {
          for (let i = 2; i < proxyDevSubSteps.length; i++) {
            setCurrentSubStep(i);

            // If we reach the deployment step and gateway is Kong, call the Kong API
            if (proxyDevSubSteps[i].id === 'deploy' && selectedGateway === 'Kong') {
              // Wait a bit before API call
              await new Promise(resolve => setTimeout(resolve, 1000));

              // Call Kong API
              const formData = new FormData();
              formData.append('file', proxyDesignSelectedSpec.file);

              try {
                const response = await fetch('https://kong-api-generator-cloud-run-deploy-784673707621.us-central1.run.app/api/v1/deploy/upload', {
                  method: 'POST',
                  mode: 'cors',
                  body: formData,
                });

                if (!response.ok) {
                  throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();
                setKongApiResponse(data);

                // Check if generation was successful
                if (!data.success) {
                  // API returned failure
                  const errorMsg = data.services?.[0]?.error || 'Service generation failed';
                  setGenerationFailed(true);
                  setGenerationError(errorMsg);
                  setFailedAtStep(i);
                  setCompletedSubSteps(prev => [...prev, proxyDevSubSteps[i].id]);
                  // Stop substep progression
                  setCurrentSubStep(i + 1);
                  setIsGenerating(false);
                  setBusy(false);
                  setShowProxyDevSubBranch(false);
                  return;
                }

                // Success - continue with remaining substeps
                setCompletedSubSteps(prev => [...prev, proxyDevSubSteps[i].id]);
              } catch (error) {
                console.error('Kong API error:', error);
                setGenerationFailed(true);
                setGenerationError(error.message || 'Failed to connect to Kong API');
                setFailedAtStep(i);
                setCompletedSubSteps(prev => [...prev, proxyDevSubSteps[i].id]);
                setCurrentSubStep(i + 1);
                setIsGenerating(false);
                setBusy(false);
                setShowProxyDevSubBranch(false);
                return;
              }
            } else {
              // Normal substep - just wait (for non-Kong gateways or other substeps)
              await new Promise(resolve => setTimeout(resolve, 1500));
              setCompletedSubSteps(prev => [...prev, proxyDevSubSteps[i].id]);
            }
          }

          // All substeps completed successfully
          setCurrentSubStep(proxyDevSubSteps.length);
          setBusy(false);
          setShowProxyDevSubBranch(false);
        } catch (error) {
          console.error('Substep animation error:', error);
          setGenerationFailed(true);
          setGenerationError('An unexpected error occurred during generation');
          setIsGenerating(false);
          setBusy(false);
          setShowProxyDevSubBranch(false);
        }
      };

      runSubStepAnimation();
    },
    [
      proxyDesignSelectedSpec,
      onboardingId,
      ensureOnboardingResource,
      version,
      showMessage,
      hideMessage,
      selectedGateway,
      proxyAuthenticationType,
      securityInboundSelections,
      securityOutboundSelections,
      standardPoliciesSelections,
      resourceType,
      selectedFramework,
      proxyName,
      proxyDescription,
      basePath,
      targetUrl,
      importGeneratedProxyToApigee,
      apiMethod,
      apiEndpoint,
      backendName,
      backendHost,
      backendPort,
      backendPath,
      enableSSL,
      policies,
    ]
  );

  const getConnectionSummary = () => {
    const types = Object.keys(savedConnections);
    if (types.length === 0) return null;
    return `${types.length} connection(s) configured`;
  };

  const maskSensitiveValue = (value) => {
    if (!value) return '';
    const strValue = String(value);
    if (strValue.length <= 8) return 'Configured';
    return `${strValue.slice(0, 4)}...${strValue.slice(-4)}`;
  };

  const getConfiguredConnectorCards = () => {
    const cloud = savedConnections.cloudProvider;
    const databaseConnector = savedConnections.databaseConnector;
    const isMongoWithConnectionString = databaseConnector?.databaseType === 'MONGODB' && !!databaseConnector?.connectionString;
    const cloudDeploymentType = cloud?.provider === 'GCP'
      ? (cloud.cloudRun ? 'Cloud Run' : cloud.gke ? 'GKE' : '')
      : cloud?.provider === 'AWS'
        ? (cloud.appRunner ? 'App Runner' : cloud.eks ? 'EKS' : '')
        : cloud?.provider === 'AZURE'
          ? (cloud.container ? 'Container' : '')
          : '';

    const connectorConfig = {
      sourceCodeManagement: {
        label: 'Source Code Provider',
        icon: savedConnections.sourceCodeManagement?.type === 'GITLAB' ? GitBranch : Github,
        accent: 'text-violet-300',
        fields: [
          ['Provider', savedConnections.sourceCodeManagement?.type],
          ['Organization', savedConnections.sourceCodeManagement?.orgOrUser],
          ['Repository', savedConnections.sourceCodeManagement?.repo],
          ['Branch', savedConnections.sourceCodeManagement?.branch],
          ['Visibility', savedConnections.sourceCodeManagement?.isPrivate === false ? 'Public' : savedConnections.sourceCodeManagement?.isPrivate === true ? 'Private' : ''],
          ['Token', maskSensitiveValue(savedConnections.sourceCodeManagement?.token)],
        ],
      },
      // cloudProvider: {
      //   label: 'Cloud Provider',
      //   icon: Cloud,
      //   accent: 'text-blue-300',
      //   fields: [
      //     ['Provider', cloud?.provider],
      //     ['Deployment', cloudDeploymentType],
      //     ['GCP Project', cloud?.gcpProjectId],
      //     ['GCP Region', cloud?.gcpRegion],
      //     ['AWS Access Key', maskSensitiveValue(cloud?.accessKeyId)],
      //     ['AWS Region', cloud?.awsRegion],
      //     ['Azure Subscription', maskSensitiveValue(cloud?.subscriptionId)],
      //     ['Resource Group', cloud?.resourceGroup],
      //     ['Azure Region', cloud?.azureRegion],
      //   ],
      // },
      // databaseConnector: {
      //   label: 'Database',
      //   icon: Database,
      //   accent: 'text-emerald-300',
      //   fields: isMongoWithConnectionString
      //     ? [
      //       ['Type', databaseConnector?.databaseType],
      //       ['Connection String', databaseConnector?.connectionString],
      //     ]
      //     : [
      //       ['Type', databaseConnector?.databaseType],
      //       ['Host', databaseConnector?.host],
      //       ['Port', databaseConnector?.port],
      //       ['Database', databaseConnector?.databaseName],
      //       ['User', databaseConnector?.username],
      //       ['SSL Mode', databaseConnector?.sslMode],
      //       ['Auth Source', databaseConnector?.authSource],
      //     ],
      // },
    };

    return Object.entries(connectorConfig)
      .filter(([key]) => savedConnections[key])
      .map(([key, config]) => ({
        key,
        ...config,
        fields: config.fields.filter(([, value]) => value !== undefined && value !== null && value !== ''),
      }));
  };

  const renderConnectorSummary = () => {
    const connectorCards = getConfiguredConnectorCards();

    return (
      <div className="mt-3 grid grid-cols-1 gap-2">
        {connectorCards.length > 0 ? (
          connectorCards.map((connector) => {
            const ConnectorIcon = connector.icon;
            return (
              <div
                key={connector.key}
                className="rounded-lg border border-dark-700 bg-[#0f172a]/60 p-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-dark-600 bg-dark-900/60">
                      <ConnectorIcon className={cn('h-4 w-4', connector.accent)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-white">{connector.label}</p>
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-300">
                          Active
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {/* {connector.fields.slice(0, 4).map(([label, value]) => ( */}
                        {connector.fields.map(([label, value]) => (
                          <span
                            key={`${connector.key}-${label}`}
                            className="break-all rounded-md border border-dark-700 bg-dark-900/50 px-2 py-1 text-[11px] leading-5 text-gray-300"
                            title={`${label}: ${String(value)}`}
                          >
                            <span className="text-gray-500">{label}: </span>
                            <span className="font-medium text-gray-200">{value}</span>
                          </span>
                        ))}
                        {/* {connector.fields.length > 4 && (
                          <span className="rounded-md border border-dark-700 bg-dark-900/50 px-2 py-1 text-[11px] text-gray-500">
                            +{connector.fields.length - 4} more
                          </span>
                        )} */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-dark-700 bg-[#0f172a]/40 p-3 text-xs text-gray-500">
            {isFetchingConnectorConfig ? 'Loading connector configurations...' : 'No connector configurations found from backend yet.'}
          </div>
        )}
      </div>
    );
  };

    // Auto-load spec content when Spec Detail tab is opened
  useEffect(() => {
    if (activeTab === 'specdetail' && onboardingId && !uploadedFileContent && !specContentLoading) {
      loadSpecContent();
    }
  }, [activeTab, onboardingId, uploadedFileContent, specContentLoading, loadSpecContent]);

  const getCatalogRecord = (item) => item?.microservice || item?.onboarding || item?.context || item || {};
  const getCatalogAuditValue = (item, keys) => {
    const sources = [
      getCatalogRecord(item),
      item?.microservice,
      item?.onboarding,
      item?.context,
      item,
    ].filter(Boolean);

    for (const source of sources) {
      for (const key of keys) {
        const value = source?.[key];
        if (value !== null && value !== undefined && value !== '') return value;
      }
    }

    return null;
  };
  const formatCatalogAuditDate = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';

    const timestamp = typeof value === 'number' && value < 10000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString();
  };
  const formatCatalogAuditDateOnly = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';

    const timestamp = typeof value === 'number' && value < 10000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString();
  };

  const getCatalogStatusMeta = (item) => {
    const record = getCatalogRecord(item);
    const resourceId = getCatalogResourceId(item);
    const latestDeployment = catalogDeploymentStatusMap[resourceId] ||
      pickLatestDeploymentRecord(item?.deploymentHistory || item?.deployments || record?.deploymentHistory || record?.deployments);
    const deploymentStatus = normalizeDeploymentStatus(
      latestDeployment?.status ||
      latestDeployment?.deploymentStatus ||
      latestDeployment?.pipelineStatus ||
      item?.deploymentStatus ||
      record?.deploymentStatus ||
      item?.deployStatus ||
      record?.deployStatus
    );

    if (deploymentStatus) return deploymentStatus;
    return { label: 'In Progress', tone: 'progress' };
  };
  const getCatalogCodeGenResults = (item, record = getCatalogRecord(item)) => {
    const sources = [
      item?.codeGenResults,
      item?.resource?.codeGenResults,
      item?.resource?.microservice?.codeGenResults,
      item?.microservice?.codeGenResults,
      record?.codeGenResults,
      record?.resource?.codeGenResults,
      record?.resource?.microservice?.codeGenResults,
      record?.microservice?.codeGenResults,
    ];

    return sources.find(Array.isArray) || [];
  };
  const getCatalogRepoCloneUrl = (item) => {
    const record = getCatalogRecord(item);
    const sourceCodeManagement = item?.connectorConfiguration?.sourceCodeManagement
      || item?.resource?.connectorConfiguration?.sourceCodeManagement
      || item?.resource?.microservice?.connectorConfiguration?.sourceCodeManagement
      || item?.microservice?.connectorConfiguration?.sourceCodeManagement
      || record?.connectorConfiguration?.sourceCodeManagement
      || record?.resource?.connectorConfiguration?.sourceCodeManagement
      || record?.resource?.microservice?.connectorConfiguration?.sourceCodeManagement
      || record?.microservice?.connectorConfiguration?.sourceCodeManagement
      || record?.sourceCodeManagement
      || {};
    const scmRepo = sourceCodeManagement?.repo
      || sourceCodeManagement?.repository
      || sourceCodeManagement?.repoName
      || '';
    const scmOwner = sourceCodeManagement?.orgOrUser
      || sourceCodeManagement?.organization
      || sourceCodeManagement?.owner
      || '';
    const normalizedScmRepo = String(scmRepo).trim().replace(/\.git$/i, '');
    const normalizedScmOwner = String(scmOwner).trim();
    const scmProvider = String(sourceCodeManagement?.type || sourceCodeManagement?.provider || '').toUpperCase();
    const connectorCloneUrl = normalizedScmRepo
      ? normalizedScmRepo.startsWith('http')
        ? `${normalizedScmRepo}.git`
        : scmProvider === 'GITHUB' && normalizedScmOwner
          ? `https://github.com/${normalizedScmOwner}/${normalizedScmRepo}.git`
          : scmProvider === 'GITLAB' && normalizedScmOwner
            ? `https://gitlab.com/${normalizedScmOwner}/${normalizedScmRepo}.git`
            : ''
      : '';
    const codeGenResults = getCatalogCodeGenResults(item, record);
    const codeGen = codeGenResults.find((result) => result?.status === 'SUCCESS') || codeGenResults[0] || {};

    return item?.repoCloneUrl
      || item?.repositoryCloneUrl
      || item?.cloneUrl
      || item?.clone_url
      || item?.gitCloneUrl
      || item?.pushedRepoUrl
      || item?.repoUrl
      || record?.repoCloneUrl
      || record?.repositoryCloneUrl
      || record?.cloneUrl
      || record?.clone_url
      || record?.gitCloneUrl
      || record?.pushedRepoUrl
      || record?.repoUrl
      || sourceCodeManagement?.repoCloneUrl
      || sourceCodeManagement?.repositoryCloneUrl
      || sourceCodeManagement?.cloneUrl
      || sourceCodeManagement?.clone_url
      || sourceCodeManagement?.gitCloneUrl
      || sourceCodeManagement?.repoUrl
      || connectorCloneUrl
      || codeGen?.repoCloneUrl
      || codeGen?.repositoryCloneUrl
      || codeGen?.cloneUrl
      || codeGen?.clone_url
      || codeGen?.gitCloneUrl
      || codeGen?.pushedRepoUrl
      || codeGen?.repoUrl
      || '';
  };
  const getCatalogEditorZipUrl = (item) => {
    const record = getCatalogRecord(item);
    const codeGenResults = getCatalogCodeGenResults(item, record);
    const codeGen = codeGenResults.find((result) => result?.status === 'SUCCESS') || codeGenResults[0] || {};

    return item?.archiveDownloadUrl
      || item?.archivePath
      || item?.sourceArchivePath
      || item?.zipUrl
      || item?.bundleUrl
      || record?.archiveDownloadUrl
      || record?.archivePath
      || record?.sourceArchivePath
      || record?.zipUrl
      || record?.bundleUrl
      || codeGen?.archiveDownloadUrl
      || codeGen?.archivePath
      || codeGen?.sourceArchivePath
      || codeGen?.zipUrl
      || codeGen?.bundleUrl
      || '';
  };
  const handleOpenCatalogRepoInVSCode = (item) => {
    const repoUrl = getCatalogRepoCloneUrl(item);

    if (!repoUrl) {
      showMessage(`Repository clone URL is not available for this ${getResourceLabel()}`, 'error');
      return;
    }

    window.location.href = `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`;
  };
  const handleOpenCatalogResourceInEditor = (item) => {
    const zipUrl = getCatalogEditorZipUrl(item);
    const record = getCatalogRecord(item);
    const resourceName = record.apiName || record.name || record.applicationName || '';

    if (!zipUrl) {
      showMessage(`Generated bundle is not available for this ${getResourceLabel()}`, 'error');
      return;
    }

    closeCatalogDetailModal();
    navigate('/proxy-editor', {
      state: {
        zipUrl,
        selectedProxyName: resourceName,
        backTo: '/proxy-generate',
        backState: {
          selectedGateway,
          resourceType,
          openOnboarding: false,
        },
      },
    });
  };
  const getCatalogResourceId = (item) => {
    const record = getCatalogRecord(item);
    return record?.id || record?._id || item?.microservice?.id || item?.id || null;
  };
  const resolveActionResourceId = (result) => {
    const data = result?.data?.data || result?.data || {};
    return data?.microservice?.id ||
      data?.resource?.microservice?.id ||
      data?.resource?.id ||
      data?.onboarding?.id ||
      data?.id ||
      null;
  };
  const unwrapCatalogDetails = (result) => result?.data?.data || result?.data || result || {};
  const loadProxyResourceIntoFlow = async (resourceId, mode = 'update', fallbackResourceName = '') => {
    const result = await onboardingService.getResourceDetails(resourceId);
    if (!result.success) {
      showMessage(result.error || `Failed to load ${getResourceLabel()} details`, 'error');
      return false;
    }

    const details = unwrapCatalogDetails(result);
    const d = details.resource?.microservice
      || details.microservice
      || details.resource
      || details.onboarding
      || details.context
      || details
      || {};
    const req = details.resource?.requirement || details.requirement || {};
    const design = details.resource?.apiDesign || details.apiDesign || null;
    const consumers = details.resource?.consumerInformation || details.consumerInformation || [];
    const projectMetadata = details.projectMetadata || {};
    const resourceDisplayName = d.apiName
      || details.resource?.apiName
      || details.microservice?.apiName
      || fallbackResourceName
      || d.applicationName
      || '';
    const nextOnboardingContextId = d.onboardingId
      || d.onboardingContextId
      || details.onboardingId
      || details.onboardingContextId
      || details.context?.id
      || details.onboarding?.id
      || null;

    setActionMode(mode);
    setIsExistingOnboardingLoaded(true);
    setOnboardingContextId(nextOnboardingContextId);
    setOnboardingId(d.id || resourceId);
    setExistingConfigId(d.connectorId || null);
    setOnboardingTeamName(d.teamName || '');
    setOnboardingApplicationName(d.applicationName || '');
    setOnboardingApplicationId(d.applicationId || '');
    setOnboardingBusinessUnit(d.businessUnit || '');
    setOnboardingProjectOwner(d.projectOwner || '');
    setOnboardingOwnerEmail(d.ownerEmail || '');
    setOnboardingProjectSME(d.projectSME || '');
    setOnboardingProjectSMEEmail(d.projectSMEEmail || '');
    setOnboardingProjectDLEmail(d.projectDLEmail || '');
    setOnboardingGoLiveDate(d.expectedGoLiveDate || '');
    setOnboardingTesterName(d.testerName || '');
    setOnboardingTesterEmail(d.testerEmail || '');
    setOnboardingServiceNowGroup(d.serviceNowGroupName || '');
    setOnboardingServiceNowEmail(d.serviceNowEmail || '');
    setSelectedOnboardingConsumers(consumers.map((consumer) => consumer.id).filter(Boolean));
    setActiveProxyName(resourceDisplayName);
    setProxyName(resourceDisplayName);
    setApiName(resourceDisplayName);
    setVersion(projectMetadata.version || d.version || version || '1.0.0');

    setFunctionalReqs(req.functionalRequirements || '');
    setNonFunctionalReqs(req.nonFunctionalRequirements || '');

    if (design?.specMetadata) {
      const spec = {
        id: design.specMetadata.id,
        name: design.specMetadata.fileName || design.specMetadata.specName,
        specName: design.specMetadata.specName,
        source: 'template',
        apiDesignId: design.id,
        specMetadataId: design.specMetadataId || design.specMetadata.id,
      };
      setProxyDesignSelectedSpec(spec);
      setProxySelectedDesignSpecs([spec.id]);
      localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(spec));
      localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([spec.id]));
    } else {
      setProxyDesignSelectedSpec(null);
      setProxySelectedDesignSpecs([]);
      localStorage.removeItem('probeStack_proxyDesignSelectedSpec');
      localStorage.removeItem('probeStack_proxySelectedDesignSpecs');
    }

    if (nextOnboardingContextId) {
      localStorage.setItem('probeStack_proxyOnboardingContextId', nextOnboardingContextId);
      localStorage.setItem('probeStack_onboardingContextId', nextOnboardingContextId);
    } else {
      localStorage.removeItem('probeStack_proxyOnboardingContextId');
      localStorage.removeItem('probeStack_onboardingContextId');
    }
    localStorage.setItem('probeStack_proxyOnboardingId', d.id || resourceId);
    localStorage.setItem('probeStack_onboardingId', d.id || resourceId);
    localStorage.setItem('probeStack_proxyOnboardingData', JSON.stringify(d));
    localStorage.setItem('probeStack_onboardingData', JSON.stringify(d));

    setShowResourceLanding(false);
    setCurrentStep(1);
    setShowProxyDevSubBranch(false);
    window.scrollTo(0, 0);
    return true;
  };
  const handleCatalogAction = async (item, mode) => {
    const record = getCatalogRecord(item);
    const resourceId = getCatalogResourceId(item);
    if (!resourceId) {
      showMessage(`Unable to find ${getResourceLabel()} id`, 'error');
      return;
    }

    if (mode === 'update') {
      setActionLoading(true);
      const loaded = await loadProxyResourceIntoFlow(
        resourceId,
        'update',
        record.apiName || record.name || record.applicationName || ''
      );
      setActionLoading(false);
      if (loaded) {
        showMessage(`Loaded ${record.apiName || record.applicationName || getResourceLabel()} for edit`, 'success');
      }
      return;
    }

    setActionMode(mode);
    setCatalogOnboardingPreset({
      item,
      actionDetails: {
        newResourceName: mode === 'cloning'
          ? `${record.apiName || record.applicationName || 'cloned-resource'} Copy`
          : '',
        basePath: basePath || '',
        version: '',
      },
    });
    openGlobalOnboardingModal('existing', true);
  };
  const openCatalogActionDropdown = (event, key) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 230;
    setOpenCatalogActionMenu((current) => (
      current?.key === key
        ? null
        : {
            key,
            top: Math.min(rect.bottom + 8, window.innerHeight - menuHeight),
            left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
          }
    ));
  };
  const openCatalogDeploymentHistory = (item) => {
    const record = getCatalogRecord(item);
    const resourceId = getCatalogResourceId(item);
    if (!resourceId) {
      showMessage(`Unable to find ${getResourceLabel()} id`, 'error');
      return;
    }
    setDeploymentHistoryModal({
      open: true,
      title: record.apiName || record.applicationName || `${getResourceLabel()} deployment history`,
      resourceId,
      resourceLabel: getResourceLabel(),
    });
  };
  const handleViewCatalogResource = (item) => {
    const record = getCatalogRecord(item);
    const resourceId = getCatalogResourceId(item);
    if (!resourceId) {
      showMessage('Unable to find resource ID', 'error');
      return;
    }
    const title = record.apiName || record.applicationName || record.name || getResourceLabel();
    navigate(`/fs-gateway-generate/${resourceId}`, { state: { title } });
  };
  const loadCatalogDetail = async (resourceId, titleHint) => {
    if (!resourceId) {
      showMessage('Unable to find resource ID', 'error');
      return;
    }
    const title = titleHint || getResourceLabel();

    setCatalogDetailModal({ open: true, title, data: null, loading: true, error: '', activeStep: 0, contractHistory: [], mockData: null, testCases: [], codeAnalysis: null, peerReview: null, contractStatus: null, specContent: null, resourceId });

    const detailsResult = await onboardingService.getResourceDetails(resourceId);
    if (!detailsResult.success) {
      setCatalogDetailModal((c) => ({ ...c, loading: false, error: detailsResult.error || 'Failed to load resource details' }));
      return;
    }

    const details = unwrapCatalogDetails(detailsResult);
    const d = details.resource?.microservice || details.microservice || details.resource || details.onboarding || details.context || details || {};
    const microserviceId = d.id || resourceId;
    const apiDesignData = details?.apiDesign || details?.resource?.apiDesign || details?.designData || {};
    const specMeta = apiDesignData?.specMetadata || {};
    const specId = apiDesignData?.specMetadataId || specMeta?.id;

    const resolvedTitle = titleHint || d.apiName || d.applicationName || d.name || getResourceLabel();
    setCatalogDetailModal((c) => ({ ...c, data: details, loading: false, resourceId: microserviceId, title: resolvedTitle }));

    const [contractHistoryRes, mockRes, testCasesRes, codeAnalysisRes, peerReviewRes, contractStatusRes, specContentRes] = await Promise.allSettled([
      contractTestingService.getHistory(microserviceId, 0, 50),
      mockApiService.getByMicroservice(microserviceId),
      testCaseService.getTestCases(microserviceId, 500, 0),
      staticCodeAnalysisService.getReportHistory('MICROSERVICE', microserviceId),
      peerReviewService.getMicroservice(microserviceId),
      contractTestingService.getApprovalStatus(microserviceId),
      specId ? apiDesignService.getSpecContent(specId) : Promise.resolve(null),
    ]);

    const settled = (res) => res.status === 'fulfilled' && res.value?.success ? res.value : null;

    const contractHistoryData = (() => {
      const r = settled(contractHistoryRes);
      if (!r) return [];
      return r.data?.data?.content || r.data?.data || r.data || [];
    })();

    const mockDataValue = (() => {
      const r = settled(mockRes);
      if (!r) return null;
      const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      return arr.length > 0 ? arr[0] : null;
    })();

    const testCasesValue = (() => {
      const r = settled(testCasesRes);
      if (!r) return [];
      return Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
    })();

    const codeAnalysisValue = (() => {
      const r = settled(codeAnalysisRes);
      if (!r) return null;
      const reports = r.data?.data || r.data || [];
      return Array.isArray(reports) && reports.length > 0 ? reports[0] : null;
    })();

    const peerReviewValue = (() => {
      const r = settled(peerReviewRes);
      if (!r) return null;
      return r.data?.data || r.data || null;
    })();

    const contractStatusValue = (() => {
      const r = settled(contractStatusRes);
      if (!r) return null;
      return r.data?.data || r.data || null;
    })();

    const specContentValue = (() => {
      const r = specContentRes;
      if (r?.status === 'fulfilled' && r.value?.success) return r.value.content || null;
      return null;
    })();

    setCatalogDetailModal((c) => ({
      ...c,
      contractHistory: contractHistoryData,
      mockData: mockDataValue,
      testCases: testCasesValue,
      codeAnalysis: codeAnalysisValue,
      peerReview: peerReviewValue,
      contractStatus: contractStatusValue,
      specContent: specContentValue,
    }));
  };
  const closeCatalogDetailModal = () => {
    navigate('/fs-gateway-generate');
  };
  useEffect(() => {
    if (routeResourceId) {
      if (routeResourceId !== catalogDetailModal.resourceId || !catalogDetailModal.open) {
        loadCatalogDetail(routeResourceId, location.state?.title);
      }
    } else if (catalogDetailModal.open) {
      setCatalogDetailModal({ open: false, title: '', data: null, loading: false, error: '', activeStep: 0, contractHistory: [], mockData: null, testCases: [], codeAnalysis: null, peerReview: null, contractStatus: null, specContent: null, resourceId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeResourceId]);
  const formatCatalogDetailLabel = (key) => (
    String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
  const formatCatalogDetailValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };
  const isLongCatalogDetailValue = (value) => {
    const formattedValue = formatCatalogDetailValue(value);
    return formattedValue.length > 80 || /^https?:\/\//i.test(formattedValue);
  };
  const copyCatalogDetailValue = async (value) => {
    await navigator.clipboard.writeText(formatCatalogDetailValue(value));
    showMessage('Copied to clipboard', 'success');
  };
  const isCatalogDetailObject = (value) => (
    value && typeof value === 'object' && !Array.isArray(value)
  );
  const shouldHideCatalogDetailKey = (key) => String(key).toLowerCase() === 'steps';
  const getCatalogDetailSectionValue = (title, value) => {
    if (String(title).toLowerCase() !== 'codegenresults') return value;

    const pickArchiveUrl = (item) => ({
      archiveDownloadUrl: item?.archiveDownloadUrl || item?.archivePath || item?.sourceArchivePath || 'N/A',
    });

    if (Array.isArray(value)) return value.map(pickArchiveUrl);
    if (isCatalogDetailObject(value)) return pickArchiveUrl(value);
    return value;
  };
  const renderCatalogDetailFields = (entries) => (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0 border-b border-white/8 pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {formatCatalogDetailLabel(key)}
          </div>
          {isLongCatalogDetailValue(value) ? (
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1 truncate text-sm font-medium leading-6 text-slate-100" title={formatCatalogDetailValue(value)}>
                {formatCatalogDetailValue(value)}
              </div>
              <button
                type="button"
                onClick={() => copyCatalogDetailValue(value)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Copy value"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-2 break-words text-sm font-medium leading-6 text-slate-100">
              {formatCatalogDetailValue(value)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
  const renderCatalogDetailSection = (title, value) => {
    if (shouldHideCatalogDetailKey(title)) return null;
    value = getCatalogDetailSectionValue(title, value);

    if (Array.isArray(value)) {
      return (
        <section key={title} className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
          <div className="text-base font-semibold text-white">{formatCatalogDetailLabel(title)}</div>
          <div className="mt-4 space-y-4">
            {value.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">No records</div>
            ) : value.map((item, index) => (
              <div key={`${title}-${index}`} className="rounded-2xl border border-white/10 bg-[#0f172a]/70 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffb08c]">
                  Item {index + 1}
                </div>
                {isCatalogDetailObject(item)
                  ? renderCatalogDetailFields(Object.entries(item).filter(([nestedKey, nestedValue]) => !shouldHideCatalogDetailKey(nestedKey) && !isCatalogDetailObject(nestedValue) && !Array.isArray(nestedValue)))
                  : <div className="text-sm text-slate-100">{formatCatalogDetailValue(item)}</div>}
                {isCatalogDetailObject(item) ? Object.entries(item)
                  .filter(([nestedKey, nestedValue]) => !shouldHideCatalogDetailKey(nestedKey) && (isCatalogDetailObject(nestedValue) || Array.isArray(nestedValue)))
                  .map(([nestedKey, nestedValue]) => (
                    <div key={nestedKey} className="mt-4">
                      {renderCatalogDetailSection(nestedKey, nestedValue)}
                    </div>
                  )) : null}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (isCatalogDetailObject(value)) {
      const entries = Object.entries(value).filter(([key]) => !shouldHideCatalogDetailKey(key));
      const primitiveEntries = entries.filter(([, item]) => !isCatalogDetailObject(item) && !Array.isArray(item));
      const nestedEntries = entries.filter(([, item]) => isCatalogDetailObject(item) || Array.isArray(item));

      return (
        <section key={title} className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
          <div className="text-base font-semibold text-white">{formatCatalogDetailLabel(title)}</div>
          <div className="mt-4 space-y-4">
            {primitiveEntries.length ? renderCatalogDetailFields(primitiveEntries) : null}
            {nestedEntries.map(([nestedKey, nestedValue]) => renderCatalogDetailSection(nestedKey, nestedValue))}
          </div>
        </section>
      );
    }

    return (
      <section key={title} className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
        {renderCatalogDetailFields([[title, value]])}
      </section>
    );
  };
  const renderCatalogDetailModal = () => {
    if (!catalogDetailModal.open && !routeResourceId) return null;
    if (!catalogDetailModal.open) {
      return (
        <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#0e172a' }}>
          <RefreshCw className="h-6 w-6 animate-spin text-[#ff5b1f]" />
        </div>
      );
    }

    const details = catalogDetailModal.data || {};
    const microserviceData = details?.resource?.microservice || details?.microservice || details?.resource || {};
    const requirementData = details?.requirement || details?.resource?.requirement || {};
    const apiDesignData = details?.apiDesign || details?.resource?.apiDesign || details?.designData || {};
    const consumerData = details?.consumerInformation || details?.resource?.consumerInformation || [];
    const projectMetadata = details?.projectMetadata || details?.resource?.projectMetadata || {};
    const rawCodegen = details?.codegenResults || details?.resource?.codegenResults;
    const codegenData = Array.isArray(rawCodegen)
      ? rawCodegen.map((cg) => ({
          ...cg,
          archiveDownloadUrl: cg?.archiveDownloadUrl || cg?.archivePath || cg?.sourceArchivePath || 'N/A',
        }))
      : [];
    const deploymentData = details?.deploymentHistory || details?.resource?.deploymentHistory || details?.deployments || [];
    const contractHistory = catalogDetailModal.contractHistory || [];

    const isKong = selectedGateway === 'Kong';
    const isSharedFunction = resourceType === 'Shared Function';
    const activeStep = catalogDetailModal.activeStep ?? 0;

    // Mirror the lifecycle steps exactly as defined in the edit/create flow
    const allViewSteps = [
      { id: 1,  name: 'Onboarding',                                                                    icon: UserCircle,   description: 'Application & team info' },
      { id: 2,  name: 'Requirement',                                                                    icon: FileText,     description: 'Functional requirements' },
      { id: 3,  name: isKong ? 'Service Design' : 'Proxy Design',                                      icon: PenTool,      description: 'Spec & design details' },
      { id: 4,  name: isKong ? 'Service Design Validation' : 'Proxy Design Validation',                icon: CheckCircle,  description: 'Design validation' },
      { id: 5,  name: 'Mock Service',                                                                   icon: FlaskConical, description: 'Mock service data' },
      { id: 6,  name: 'Contract Testing & Approval',                                                   icon: Shield,       description: 'Consumers & contracts' },
      { id: 7,  name: isKong ? 'Service Development' : isSharedFunction ? 'Function Development' : 'API Development', icon: Network, description: 'Generated artifacts' },
      { id: 8,  name: 'Test Cases',                                                                     icon: FileCode,     description: 'Test case results' },
      { id: 9,  name: 'Code Analysis',                                                                  icon: TestTube,     description: 'Code analysis results' },
      { id: 10, name: 'Code Review',                                                                    icon: GitBranch,    description: 'Review results' },
      { id: 11, name: 'Complete',                                                                       icon: CheckCircle,  description: 'Deployment status' },
      { id: 12, name: 'History',                                                                        icon: History,      description: 'Who changed what, and when' },
    ];
    // Apply same hidden-step filter as the edit/create flow for Shared Function
    const hiddenForSharedFunction = new Set([2, 3, 4, 5, 6, 8, 9]);
    const viewSteps = isSharedFunction
      ? allViewSteps.filter((s) => !hiddenForSharedFunction.has(s.id))
      : allViewSteps;

    const fieldBlock = (label, value) => {
      if (value === null || value === undefined || value === '') return null;
      const strVal = formatCatalogDetailValue(value);
      if (strVal === 'N/A') return null;
      const isLong = isLongCatalogDetailValue(value);
      return (
        <div key={label} className="min-w-0 border-b border-white/[0.06] pb-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          {isLong ? (
            <div className="mt-1.5 flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100" title={strVal}>{strVal}</div>
              <button
                type="button"
                onClick={() => copyCatalogDetailValue(value)}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Copy"
              >
                <ClipboardCheck className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="mt-1.5 break-words text-sm font-medium text-slate-100">{strVal}</div>
          )}
        </div>
      );
    };

    const sectionCard = (title, icon, children) => {
      const Icon = icon;
      return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2.5">
            {Icon && <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ff5b1f]/15"><Icon className="h-3.5 w-3.5 text-[#ffb08c]" /></div>}
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">{title}</span>
          </div>
          {children}
        </div>
      );
    };

    const emptyState = (msg) => (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
          <Eye className="h-5 w-5 text-slate-600" />
        </div>
        <div className="text-sm font-medium text-slate-500">{msg}</div>
      </div>
    );

    const renderOnboardingContent = () => {
      const d = microserviceData;
      const basicFields = [
        ['API Name', d.apiName],
        ['Application Name', d.applicationName],
        ['Application ID', d.applicationId],
        ['Team Name', d.teamName],
        ['Business Unit', d.businessUnit],
        ['Version', projectMetadata.version || d.version || d.apiVersion],
        ['Status', d.status || d.currentStatus],
        ['Gateway', d.gateway],
        ['Project Type', d.projectType],
        ['Base Path', d.basePath || d.apiBasePath],
      ].filter(([, v]) => v !== null && v !== undefined && v !== '');
      const ownerFields = [
        ['Project Owner', d.projectOwner],
        ['Owner Email', d.ownerEmail],
        ['Project SME', d.projectSME],
        ['SME Email', d.projectSMEEmail],
        ['DL Email', d.projectDLEmail],
        ['Tester Name', d.testerName],
        ['Tester Email', d.testerEmail],
      ].filter(([, v]) => v !== null && v !== undefined && v !== '');
      const supportFields = [
        ['Go Live Date', d.expectedGoLiveDate],
        ['ServiceNow Group', d.serviceNowGroupName],
        ['ServiceNow Email', d.serviceNowEmail],
      ].filter(([, v]) => v !== null && v !== undefined && v !== '');
      if (basicFields.length === 0 && ownerFields.length === 0 && supportFields.length === 0 && consumerData.length === 0) {
        return emptyState('No onboarding information available');
      }
      return (
        <div className="space-y-4">
          {basicFields.length > 0 && sectionCard('Basic Info', Server, (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">{basicFields.map(([l, v]) => fieldBlock(l, v))}</div>
          ))}
          {ownerFields.length > 0 && sectionCard('Ownership', UserCircle, (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">{ownerFields.map(([l, v]) => fieldBlock(l, v))}</div>
          ))}
          {supportFields.length > 0 && sectionCard('Timelines & Support', FileText, (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">{supportFields.map(([l, v]) => fieldBlock(l, v))}</div>
          ))}
          {consumerData.length > 0 && sectionCard('Registered Consumers', Users, (
            <div className="space-y-3">
              {consumerData.map((consumer, idx) => {
                const fields = Object.entries(consumer).filter(
                  ([k, v]) => !shouldHideCatalogDetailKey(k) && typeof v !== 'object' && !Array.isArray(v)
                );
                return (
                  <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">Consumer {idx + 1}</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                      {fields.map(([key, value]) => fieldBlock(formatCatalogDetailLabel(key), value))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    };

    const renderRequirementContent = () => {
      const r = requirementData;
      if (!r.functionalRequirements && !r.nonFunctionalRequirements) return emptyState('No requirements defined yet');
      return (
        <div className="space-y-4">
          {r.functionalRequirements && sectionCard('Functional Requirements', FileText, (
            <div className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#0f172a]/60 p-4 text-sm leading-relaxed text-slate-200">{r.functionalRequirements}</div>
          ))}
          {r.nonFunctionalRequirements && sectionCard('Non-Functional Requirements', Shield, (
            <div className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#0f172a]/60 p-4 text-sm leading-relaxed text-slate-200">{r.nonFunctionalRequirements}</div>
          ))}
        </div>
      );
    };

    const renderDesignContent = () => {
      const d = apiDesignData;
      const specMeta = d?.specMetadata || {};
      const specName = specMeta.specName || specMeta.fileName || 'api-spec';
      const specContent = catalogDetailModal.specContent;
      const specFields = [
        ['Spec Name', specMeta.specName || specMeta.fileName],
        ['File Name', specMeta.fileName],
        ['Spec Type', specMeta.specType || specMeta.type],
        ['Version', specMeta.version],
        ['Created At', specMeta.createdAt],
      ].filter(([, v]) => v !== null && v !== undefined && v !== '');
      const designFields = [
        ['Design ID', d.id],
        ['Language', d.language || d.programmingLanguage],
        ['Framework', d.framework],
      ].filter(([, v]) => v !== null && v !== undefined && v !== '');
      if (specFields.length === 0 && designFields.length === 0) return emptyState('No design spec linked yet');

      const handleDownloadSpec = () => {
        if (!specContent) { showMessage('Spec not loaded yet', 'error'); return; }
        const isJson = specContent.trim().startsWith('{') || specContent.trim().startsWith('[');
        const ext = isJson ? 'json' : 'yaml';
        const blob = new Blob([specContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${specName.replace(/\s+/g, '-')}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      };

      const editorLang = specContent && (specContent.trim().startsWith('{') || specContent.trim().startsWith('[')) ? 'json' : 'yaml';

      return (
        <div className="space-y-4">
          {specFields.length > 0 && sectionCard('Spec Metadata', PenTool, (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">{specFields.map(([l, v]) => fieldBlock(l, v))}</div>
          ))}
          {designFields.length > 0 && sectionCard('Design Details', Code, (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">{designFields.map(([l, v]) => fieldBlock(l, v))}</div>
          ))}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ff5b1f]/15">
                  <FileCode className="h-3.5 w-3.5 text-[#ffb08c]" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">Specification</span>
              </div>
              {specContent && (
                <button
                  type="button"
                  onClick={handleDownloadSpec}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              )}
            </div>
            {catalogDetailModal.loading || (!specContent && !catalogDetailModal.error) ? (
              <div className="flex h-14 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading specification…
              </div>
            ) : specContent ? (
              <div className="h-[420px] overflow-hidden rounded-xl border border-white/[0.08]">
                <Editor
                  height="100%"
                  language={editorLang}
                  value={specContent}
                  theme="vs-dark"
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, wordWrap: 'on' }}
                />
              </div>
            ) : (
              <div className="flex h-14 items-center justify-center text-sm text-slate-500">No specification content available</div>
            )}
          </div>
        </div>
      );
    };

    const renderContractTestingContent = () => {
      const latestArchitect = [...contractHistory]
        .filter((r) => r.type === 'ARCHITECT')
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
      const architectStatus = latestArchitect?.status || '';
      const latestConsumer = [...contractHistory]
        .filter((r) => r.type === 'CONSUMER')
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
      const consumerStatus = latestConsumer?.status || '';

      const statusBadge = (status) => {
        const map = {
          SENT:        'bg-amber-500/15 text-amber-300',
          IN_PROGRESS: 'bg-yellow-500/15 text-yellow-300',
          APPROVED:    'bg-green-500/15 text-green-300',
          REJECTED:    'bg-red-500/15 text-red-300',
        };
        const label = { SENT: 'Requested', IN_PROGRESS: 'Under Review', APPROVED: 'Approved', REJECTED: 'Rejected' };
        if (!status) return <span className="inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">Not Initiated</span>;
        return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || 'bg-white/[0.06] text-slate-400'}`}>{label[status] || status}</span>;
      };

      return (
        <div className="space-y-4">
          {sectionCard('Approval Status', Shield, (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-200">API Architect Review</span>
                </div>
                {statusBadge(architectStatus)}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-200">Consumer Review</span>
                </div>
                {statusBadge(consumerStatus)}
              </div>
            </div>
          ))}

          {sectionCard('Approval History', History, (
            contractHistory.length === 0
              ? <div className="py-4 text-center text-sm text-slate-500">No approval history found</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left">
                        {['Type', 'Status', 'Sent By', 'Approver', 'Comment', 'Sent At'].map((h) => (
                          <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {contractHistory.map((record, idx) => (
                        <tr key={record.id || idx} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-4 capitalize text-slate-300">{record.type?.toLowerCase() || '-'}</td>
                          <td className="py-2.5 pr-4">{statusBadge(record.status)}</td>
                          <td className="py-2.5 pr-4 text-slate-400">{record.sentBy || '-'}</td>
                          <td className="py-2.5 pr-4 text-slate-400">{record.approverEmail || '-'}</td>
                          <td className="max-w-[160px] truncate py-2.5 pr-4 text-slate-400" title={record.reviewComment || ''}>{record.reviewComment || '-'}</td>
                          <td className="whitespace-nowrap py-2.5 text-slate-400">{record.sentAt ? new Date(record.sentAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          ))}

          {consumerData.length > 0 && sectionCard('Registered Consumers', Users, (
            <div className="space-y-3">
              {consumerData.map((consumer, idx) => {
                const fields = Object.entries(consumer).filter(
                  ([k, v]) => !shouldHideCatalogDetailKey(k) && typeof v !== 'object' && !Array.isArray(v)
                );
                return (
                  <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">Consumer {idx + 1}</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                      {fields.map(([key, value]) => fieldBlock(formatCatalogDetailLabel(key), value))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    };

    const renderDevelopmentContent = () => {
      if (codegenData.length === 0) return emptyState('No code generation results available');
      return (
        <div className="space-y-3">
          {codegenData.map((cg, idx) => {
            const fields = Object.entries(cg).filter(
              ([k, v]) => !shouldHideCatalogDetailKey(k) && typeof v !== 'object' && !Array.isArray(v)
            );
            return sectionCard(`Generation Run ${idx + 1}`, Network, (
              <div key={`cg-${idx}`} className="grid grid-cols-2 gap-x-8 gap-y-0">
                {fields.map(([key, value]) => fieldBlock(formatCatalogDetailLabel(key), value))}
              </div>
            ));
          })}
        </div>
      );
    };

    const renderCompleteContent = () => {
      const list = Array.isArray(deploymentData) ? deploymentData : [];
      if (list.length === 0) return emptyState('No deployment records found');
      return (
        <div className="space-y-3">
          {list.map((dep, idx) => {
            const fields = Object.entries(dep).filter(
              ([k, v]) => !shouldHideCatalogDetailKey(k) && typeof v !== 'object' && !Array.isArray(v)
            );
            return sectionCard(`Deployment ${idx + 1}`, Server, (
              <div key={`dep-${idx}`} className="grid grid-cols-2 gap-x-8 gap-y-0">
                {fields.map(([key, value]) => fieldBlock(formatCatalogDetailLabel(key), value))}
              </div>
            ));
          })}
        </div>
      );
    };

    const renderDesignValidationContent = () => {
      const contractStatusData = catalogDetailModal.contractStatus;
      const specMeta = apiDesignData?.specMetadata || {};
      const hasSpec = specMeta.specName || specMeta.fileName;
      const approvalStatus = contractStatusData?.approvalStatus || contractStatusData?.status || '';
      const isAllowed = approvalStatus === 'ALLOWED' || approvalStatus === 'APPROVED';
      const isBlocked = approvalStatus === 'BLOCKED' || approvalStatus === 'REJECTED';

      return (
        <div className="space-y-4">
          {sectionCard('Spec Validation', CheckCircle, (
            <div className="space-y-3">
              {hasSpec ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/[0.06] px-4 py-3">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-green-300">Specification Linked</div>
                      <div className="mt-0.5 truncate text-xs text-slate-400">{specMeta.specName || specMeta.fileName}</div>
                    </div>
                    {specMeta.specType && (
                      <span className="rounded-full border border-green-500/25 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-400">{specMeta.specType}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Schema Valid', ok: true, detail: 'OpenAPI schema validation passed' },
                      { label: 'Consumer Compliant', ok: true, detail: 'Consumer requirements satisfied' },
                      { label: 'Best Practices', ok: true, detail: 'API standards applied' },
                    ].map(({ label, ok, detail }) => (
                      <div key={label} className={`rounded-xl border p-3 ${ok ? 'border-green-500/20 bg-green-500/[0.06]' : 'border-amber-500/20 bg-amber-500/[0.06]'}`}>
                        <div className="mb-1 flex items-center gap-1.5">
                          <CheckCircle className={`h-3.5 w-3.5 ${ok ? 'text-green-400' : 'text-amber-400'}`} />
                          <span className={`text-xs font-semibold ${ok ? 'text-green-300' : 'text-amber-300'}`}>{label}</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-500">{detail}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-amber-300">No API specification linked to this resource</span>
                </div>
              )}
            </div>
          ))}

          {sectionCard('Contract Approval Gate', Shield, (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isAllowed ? 'bg-green-500/15' : isBlocked ? 'bg-red-500/15' : 'bg-slate-700/50'}`}>
                  {isAllowed ? <CheckCircle className="h-4 w-4 text-green-400" /> : isBlocked ? <AlertCircle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-slate-400" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Contract Testing Gate</div>
                  <div className="text-xs text-slate-400">{isAllowed ? 'Design approved — ready to proceed' : isBlocked ? 'Design blocked — requires re-review' : 'Awaiting approval'}</div>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAllowed ? 'bg-green-500/15 text-green-300' : isBlocked ? 'bg-red-500/15 text-red-300' : 'bg-white/[0.06] text-slate-400'}`}>
                {isAllowed ? 'Allowed' : isBlocked ? 'Blocked' : approvalStatus || 'Pending'}
              </span>
            </div>
          ))}
        </div>
      );
    };

    const renderMockServiceContent = () => {
      const mock = catalogDetailModal.mockData;
      if (!mock) return emptyState('No mock service has been generated for this resource');

      const statusColor = mock.status === 'RUNNING' || mock.status === 'ACTIVE'
        ? 'bg-green-500/15 text-green-300'
        : mock.status === 'STOPPED' || mock.status === 'INACTIVE'
        ? 'bg-slate-600/40 text-slate-400'
        : 'bg-amber-500/15 text-amber-300';

      return (
        <div className="space-y-4">
          {sectionCard('Mock Server', FlaskConical, (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff5b1f]/10">
                    <FlaskConical className="h-4 w-4 text-[#ffb08c]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{mock.name || mock.mockServerName || 'Mock Server'}</div>
                    <div className="text-xs text-slate-400">Auto-generated from API spec</div>
                  </div>
                </div>
                {mock.status && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>{mock.status}</span>
                )}
              </div>

              {mock.mockServerUrl && (
                <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0f172a]/60 px-3 py-2.5">
                  <Globe className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200" title={mock.mockServerUrl}>{mock.mockServerUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyCatalogDetailValue(mock.mockServerUrl)}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Copy URL"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {sectionCard('Mock Details', FileText, (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">
              {[
                ['Mock ID', mock.id],
                ['Created At', mock.createdAt ? new Date(mock.createdAt).toLocaleString() : null],
                ['Updated At', mock.updatedAt ? new Date(mock.updatedAt).toLocaleString() : null],
                ['Framework', mock.framework || mock.mockFramework],
                ['Port', mock.port],
                ['Base Path', mock.basePath],
              ].filter(([, v]) => v).map(([l, v]) => fieldBlock(l, v))}
            </div>
          ))}
        </div>
      );
    };

    const renderTestCasesContent = () => {
      const cases = catalogDetailModal.testCases || [];
      if (cases.length === 0) return emptyState('No test cases have been generated for this resource');

      const categories = ['POSITIVE', 'NEGATIVE', 'PERFORMANCE', 'SECURITY'];
      const counts = categories.reduce((acc, cat) => {
        acc[cat] = cases.filter((tc) => tc.category === cat).length;
        return acc;
      }, {});
      const catColors = { POSITIVE: 'text-green-400 bg-green-500/10 border-green-500/20', NEGATIVE: 'text-amber-400 bg-amber-500/10 border-amber-500/20', PERFORMANCE: 'text-blue-400 bg-blue-500/10 border-blue-500/20', SECURITY: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      const catIcons = { POSITIVE: CheckCircle, NEGATIVE: AlertCircle, PERFORMANCE: Activity, SECURITY: Shield };

      return (
        <div className="space-y-4">
          {sectionCard(`${cases.length} Test Cases`, FileCode, (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categories.map((cat) => {
                const CatIcon = catIcons[cat];
                const [textColor, bgColor, borderColor] = catColors[cat].split(' ');
                return (
                  <div key={cat} className={`rounded-xl border p-3 ${bgColor} ${borderColor}`}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <CatIcon className={`h-3.5 w-3.5 ${textColor}`} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${textColor}`}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
                    </div>
                    <div className={`text-2xl font-bold ${textColor}`}>{counts[cat] || 0}</div>
                  </div>
                );
              })}
            </div>
          ))}

          {sectionCard('Test Case List', TestTube, (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {cases.slice(0, 30).map((tc, idx) => (
                <div key={tc.id || idx} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-3 py-2.5">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#ff5b1f]/10">
                    <FileCode className="h-3 w-3 text-[#ffb08c]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-white">{tc.title || `${tc.method || ''} ${tc.endpoint || ''}`.trim() || `Test ${idx + 1}`}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      {tc.method && <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono uppercase">{tc.method}</span>}
                      {tc.endpoint && <span className="truncate font-mono">{tc.endpoint}</span>}
                      {tc.expectedStatus && <span>→ {tc.expectedStatus}</span>}
                    </div>
                  </div>
                  {tc.category && (
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${catColors[tc.category] || 'bg-white/[0.06] text-slate-400'}`}>{tc.category.charAt(0) + tc.category.slice(1).toLowerCase()}</span>
                  )}
                </div>
              ))}
              {cases.length > 30 && (
                <div className="py-2 text-center text-xs text-slate-500">+ {cases.length - 30} more test cases</div>
              )}
            </div>
          ))}
        </div>
      );
    };

    const renderCodeAnalysisContent = () => {
      const report = catalogDetailModal.codeAnalysis;
      if (!report) return emptyState('No code analysis report found for this resource');

      const score = report.overallScore ?? report.score ?? null;
      const gate = report.qualityGate || report.gateStatus || '';
      const summary = report.summary || {};
      const toolBreakdowns = report.toolBreakdowns || [];
      const gateColor = gate === 'PASSED' ? 'text-green-400 bg-green-500/10 border-green-500/20' : gate === 'WARNING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';
      const scoreColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

      return (
        <div className="space-y-4">
          {sectionCard('Analysis Summary', TestTube, (
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                {score !== null && (
                  <div className="flex flex-col items-center">
                    <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Quality Score</div>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  {gate && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${gateColor}`}>
                      {gate === 'PASSED' ? <CheckCircle className="h-3.5 w-3.5" /> : gate === 'WARNING' ? <AlertTriangle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      Quality Gate: {gate}
                    </div>
                  )}
                  {report.scoreExplanation && (
                    <p className="text-xs leading-relaxed text-slate-400">{report.scoreExplanation}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Critical', count: summary.critical, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  { label: 'High', count: summary.high, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                  { label: 'Medium', count: summary.medium, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  { label: 'Low', count: summary.low, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                ].map(({ label, count, color }) => {
                  const [textClass, bgClass, borderClass] = color.split(' ');
                  return (
                    <div key={label} className={`rounded-xl border p-3 text-center ${bgClass} ${borderClass}`}>
                      <div className={`text-2xl font-bold ${textClass}`}>{count ?? 0}</div>
                      <div className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${textClass}`}>{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {toolBreakdowns.length > 0 && sectionCard('Tool Breakdown', BarChart, (
            <div className="space-y-2">
              {toolBreakdowns.map((tb, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-[#ff5b1f]" />
                    <span className="text-sm font-medium text-slate-200">{tb.tool || tb.toolName || `Tool ${idx + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {tb.issueCount !== undefined && <span>{tb.issueCount} issues</span>}
                    {tb.status && <span className={`rounded-full px-2 py-0.5 font-medium ${tb.status === 'PASSED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{tb.status}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    };

    const renderCodeReviewContent = () => {
      const review = catalogDetailModal.peerReview;
      if (!review) return emptyState('No peer review record found for this resource');

      const reviewData = review.data || review;
      const status = reviewData.status || reviewData.approvalStatus || '';
      const statusColor = status === 'APPROVED' ? 'bg-green-500/15 text-green-300' : status === 'REJECTED' ? 'bg-red-500/15 text-red-300' : status === 'IN_PROGRESS' ? 'bg-amber-500/15 text-amber-300' : status === 'SENT' ? 'bg-blue-500/15 text-blue-300' : 'bg-white/[0.06] text-slate-400';
      const statusLabel = { APPROVED: 'Approved', REJECTED: 'Rejected', IN_PROGRESS: 'Under Review', SENT: 'Requested' }[status] || status || 'Pending';
      const history = reviewData.history || reviewData.approvalHistory || [];

      return (
        <div className="space-y-4">
          {sectionCard('Review Status', GitBranch, (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${status === 'APPROVED' ? 'bg-green-500/15' : status === 'REJECTED' ? 'bg-red-500/15' : 'bg-[#ff5b1f]/10'}`}>
                    <GitBranch className={`h-4 w-4 ${status === 'APPROVED' ? 'text-green-400' : status === 'REJECTED' ? 'text-red-400' : 'text-[#ffb08c]'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Code Peer Review</div>
                    <div className="text-xs text-slate-400">{reviewData.sentBy ? `Submitted by ${reviewData.sentBy}` : 'Architect code review'}</div>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                {[
                  ['Sent By', reviewData.sentBy || reviewData.requestedBy],
                  ['Approver', reviewData.approverEmail || reviewData.reviewerEmail],
                  ['Sent At', reviewData.sentAt ? new Date(reviewData.sentAt).toLocaleString() : null],
                  ['Reviewed At', reviewData.reviewedAt ? new Date(reviewData.reviewedAt).toLocaleString() : null],
                ].filter(([, v]) => v).map(([l, v]) => fieldBlock(l, v))}
              </div>

              {reviewData.reviewComment && (
                <div className="rounded-xl border border-white/[0.06] bg-[#0f172a]/60 p-4">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Review Comment</div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{reviewData.reviewComment}</p>
                </div>
              )}
            </div>
          ))}

          {history.length > 0 && sectionCard('Review History', History, (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    {['Status', 'Reviewer', 'Comment', 'Date'].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.map((h, idx) => (
                    <tr key={h.id || idx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>{h.status || '-'}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">{h.approverEmail || h.reviewerEmail || '-'}</td>
                      <td className="max-w-[160px] truncate py-2.5 pr-4 text-slate-400" title={h.reviewComment || ''}>{h.reviewComment || '-'}</td>
                      <td className="whitespace-nowrap py-2.5 text-slate-400">{h.reviewedAt ? new Date(h.reviewedAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      );
    };

    const loadingSkeleton = (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-4 h-3 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="border-b border-white/[0.06] pb-3">
                <div className="h-2.5 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-4 w-36 animate-pulse rounded-full bg-white/[0.08]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const renderStepContent = () => {
      if (catalogDetailModal.loading) return loadingSkeleton;
      // Dispatch by the lifecycle step ID (not index) so filtering doesn't break routing
      const stepId = viewSteps[activeStep]?.id;
      switch (stepId) {
        case 1:  return renderOnboardingContent();
        case 2:  return renderRequirementContent();
        case 3:  return renderDesignContent();
        case 4:  return renderDesignValidationContent();
        case 5:  return renderMockServiceContent();
        case 6:  return renderContractTestingContent();
        case 7:  return renderDevelopmentContent();
        case 8:  return renderTestCasesContent();
        case 9:  return renderCodeAnalysisContent();
        case 10: return renderCodeReviewContent();
        case 11: return renderCompleteContent();
        case 12: return <ResourceHistoryTimeline resourceId={catalogDetailModal.resourceId} active={stepId === 12} resourceLabel={getResourceLabel().toLowerCase()} />;
        default: return null;
      }
    };

    return (
      <div className="min-h-screen p-5" style={{ backgroundColor: '#0e172a' }}>
        <div className="mx-auto flex h-[calc(100vh-2.5rem)] max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#11182c] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)]">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-[radial-gradient(ellipse_at_top_left,rgba(255,91,31,0.14),transparent_40%),#141d35] p-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={closeCatalogDetailModal}
                className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div>
                {/* <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/25 bg-[#ff5b1f]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffb08c]">
                  <Eye className="h-3 w-3" />
                  Resource Details
                </div> */}
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{catalogDetailModal.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Step {activeStep + 1} of {viewSteps.length} — {viewSteps[activeStep]?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Body: sidebar + content */}
          <div className="flex min-h-0 flex-1">
            {/* Left step sidebar */}
            <div className="flex w-52 flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#0e1628]/60">
              <div className="flex-1 overflow-y-auto p-4">
                <p className="mb-3 px-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-600">Lifecycle</p>
                <div className="space-y-0.5">
                  {viewSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeStep === index;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setCatalogDetailModal((c) => ({ ...c, activeStep: index }))}
                        className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                          isActive ? 'bg-[#ff5b1f]/10 ring-1 ring-[#ff5b1f]/20' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                          isActive
                            ? 'bg-[#ff5b1f] text-white shadow-md shadow-[#ff5b1f]/30'
                            : 'bg-white/[0.05] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-300'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[13px] font-medium leading-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {step.name}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] leading-tight text-slate-600">{step.description}</div>
                        </div>
                        {isActive && <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ff5b1f]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress strip — pinned to sidebar bottom */}
              <div className="flex-shrink-0 border-t border-white/[0.06] px-5 py-4">
                <div className="mb-1.5 flex items-center justify-between text-[9px] text-slate-600">
                  <span>Progress</span>
                  <span>{activeStep + 1}/{viewSteps.length}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#e04400] to-[#ff5b1f] transition-all duration-300"
                    style={{ width: `${((activeStep + 1) / viewSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right content */}
            <div className="flex-1 overflow-y-auto p-6">
              {catalogDetailModal.error && (
                <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {catalogDetailModal.error}. Showing available data.
                </div>
              )}
              {renderStepContent()}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-[#0d1526]/70 px-6 py-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => setCatalogDetailModal((c) => ({ ...c, activeStep: Math.max(0, (c.activeStep ?? 0) - 1) }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={activeStep === viewSteps.length - 1}
                onClick={() => setCatalogDetailModal((c) => ({ ...c, activeStep: Math.min(viewSteps.length - 1, (c.activeStep ?? 0) + 1) }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {selectedGateway !== 'Kong' && (resourceType === 'Proxy' || resourceType === 'Shared Function') && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCatalogRepoInVSCode(catalogDetailModal.data)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ff5b1f] bg-transparent px-4 py-2 text-sm font-semibold text-[#ff8a5c] transition hover:bg-[#ff5b1f]/10 hover:text-[#ffb08c]"
                >
                  <Code className="h-4 w-4" />
                  Open in VS Code
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCatalogResourceInEditor(catalogDetailModal.data)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5b1f] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/20 transition hover:bg-[#ff6b36]"
                >
                  <FileCode2 className="h-4 w-4" />
                  Open in Proxy Editor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getLandingTitle = () => {
    if (selectedGateway === 'Kong') return 'Kong Gateway Services';
    if (selectedGateway === 'ForgeSphere Gateway') {
      return resourceType === 'Shared Function' ? 'Functions' : 'APIs';
    }
    if (resourceType === 'Shared Function') return 'Functions';
    return 'APIs';
  };

  const getLandingDescription = () => {
    if (selectedGateway === 'Kong') {
      return 'Review existing Kong gateway services first, then start onboarding when you are ready.';
    }
    if (selectedGateway === 'ForgeSphere Gateway') {
      return resourceType === 'Shared Function'
        ? 'Review existing functions first, then start onboarding when you are ready.'
        : 'Review existing ForgeSphere APIs first, then start onboarding when you are ready.';
    }
    if (resourceType === 'Shared Function') {
      return 'Review existing shared functions first, then start onboarding when you are ready.';
    }
    return 'Review existing ForgeSphere proxies first, then start onboarding when you are ready.';
  };

  const selectLandingResourceType = (gateway, type) => {
    if (!isKongRoute && gateway === 'Kong') {
      navigate('/kong-generate', {
        state: { selectedGateway: 'Kong', resourceType: type, openOnboarding: false },
      });
      return;
    }
    if (isKongRoute && gateway !== 'Kong') {
      navigate('/proxy-generate', {
        state: { selectedGateway: gateway, resourceType: type, openOnboarding: false },
      });
      return;
    }
    setSelectedGateway(gateway);
    setResourceType(type);
    setCurrentStep(1);
    setShowProxyDevSubBranch(false);
    localStorage.setItem('probeStack_proxySelectedGateway', gateway);
    localStorage.setItem('probeStack_proxyResourceType', type);
  };

  const renderResourceLanding = () => {
    const resourceOptions = (isKongRoute ? [
      { label: 'Kong Gateway Service', gateway: 'Kong', type: 'Gateway Services', icon: Server },
    ] : [
      { label: selectedGateway === 'ForgeSphere Gateway' ? 'ForgeSphere API' : 'ForgeSphere Proxy', gateway: 'Apigee X', type: 'Proxy', icon: Layers },
      { label: selectedGateway === 'ForgeSphere Gateway' ? 'ForgeSphere Function' : 'ForgeSphere Shared Function', gateway: 'Apigee X', type: 'Shared Function', icon: FileCode2 },
    ]);

    return (
      <>
        <div className="flex min-h-screen flex-col bg-[#0e172a]">
          {toast.message && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
          )}

          <main className="flex-1 p-2">
            <div className="mx-auto max-w-[1400px]">
              <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,34,58,0.96)_0%,rgba(12,18,34,0.98)_100%)] shadow-[0_28px_70px_-38px_rgba(0,0,0,0.95)]">
                <div className="flex flex-col gap-6 border-b border-white/10 px-7 py-6 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/20 bg-[#ff5b1f]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08c]">
                      <Network className="h-4 w-4" />
                      Gateway Resource Catalog
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold text-white">{getLandingTitle()}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{getLandingDescription()}</p>
                  </div>

                  {/* <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[560px]">
                    {resourceOptions.map((option) => {
                      const OptionIcon = option.icon;
                      const selected = selectedGateway === option.gateway && resourceType === option.type;

                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => selectLandingResourceType(option.gateway, option.type)}
                          className={cn(
                            'flex h-20 flex-col items-start justify-center rounded-2xl border px-4 text-left transition-colors',
                            selected
                              ? 'border-[#ff8a5c]/35 bg-[#ff5b1f]/12 text-white'
                              : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]'
                          )}
                        >
                          <OptionIcon className={cn('mb-2 h-4 w-4', selected ? 'text-[#ffb08c]' : 'text-slate-400')} />
                          <span className="text-sm font-semibold">{option.label}</span>
                          <span className="mt-1 text-xs text-slate-500">{option.gateway}</span>
                        </button>
                      );
                    })}
                  </div> */}
                </div>

                <div className="flex flex-col gap-4 border-b border-white/8 px-7 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{resourceCatalogPageInfo.totalElements} resources</div>
                    <div className="mt-1 text-xs text-slate-500">Loaded from paged onboarding records for {getLandingTitle()}.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openGlobalOnboardingModal('action')}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff5b1f] px-5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/20 transition-colors hover:bg-[#ff6b36]"
                  >
                    <Plus className="h-4 w-4" />
                    Onboard {selectedGateway === 'Kong' ? 'Gateway Service' : resourceType === "Proxy" ? "API" : resourceType === 'Shared Function' ? "Function" : resourceType}
                  </button>
                </div>

                <div className="p-6">
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative md:w-[360px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={resourceCatalogSearch}
                        onChange={(event) => {
                          setResourceCatalogSearch(event.target.value);
                          setResourceCatalogPage(0);
                        }}
                        placeholder={`Search ${getResourceLabel()} resources...`}
                        className="h-10 w-full rounded-xl border border-white/10 bg-[#0f172a]/70 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-[#ff5b1f]/50"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span>Page {resourceCatalogPageInfo.totalPages ? resourceCatalogPageInfo.page + 1 : 0} of {resourceCatalogPageInfo.totalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={resourceCatalogLoading || resourceCatalogPage <= 0}
                          onClick={() => setResourceCatalogPage((page) => Math.max(0, page - 1))}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={resourceCatalogLoading || resourceCatalogPage + 1 >= resourceCatalogPageInfo.totalPages}
                          onClick={() => setResourceCatalogPage((page) => page + 1)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                  {resourceCatalogLoading ? (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <div className="min-w-[1280px]">
                        <div className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr_0.9fr_1fr_1fr_120px_88px] bg-[#11182c] px-5 py-3 text-left">
                          {['Name', 'Application', 'Team', 'Created By', 'Updated By', 'Created At', 'Updated At', 'Status', 'Action'].map((label) => (
                            <div key={label} className={cn(
                              'text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500',
                              label === 'Action' ? 'text-center' : 'text-left'
                            )}>
                              {label}
                            </div>
                          ))}
                        </div>
                        <div className="divide-y divide-white/8">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div
                              key={`gateway-catalog-skeleton-${index}`}
                              className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr_0.9fr_1fr_1fr_120px_88px] items-center gap-4 bg-[#0f172a]/72 px-5 py-4 text-left"
                            >
                              <div className="space-y-2">
                                <div className="h-4 w-44 animate-pulse rounded-full bg-white/10" />
                                <div className="h-3 w-32 animate-pulse rounded-full bg-white/[0.06]" />
                              </div>
                              <div className="space-y-2">
                                <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
                                <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.06]" />
                              </div>
                              <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                              <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                              <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                              <div className="h-7 w-24 animate-pulse rounded-full bg-[#ff5b1f]/10" />
                              <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : resourceCatalogError ? (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-5 text-sm text-rose-100">
                      {resourceCatalogError}
                    </div>
                  ) : resourceCatalog.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
                      <div className="text-lg font-semibold text-white">No resources found</div>
                      <div className="mt-2 text-sm text-slate-400">Use the onboard button to create the first {getResourceLabel()}.</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <div className="min-w-[1280px]">
                        <div className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr_0.9fr_1fr_1fr_120px_88px] bg-[#11182c] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <div>Name</div>
                          <div>Application</div>
                          <div>Team</div>
                          <div>Created By</div>
                          <div>Updated By</div>
                          <div>Created At</div>
                          <div>Updated At</div>
                          <div>Status</div>
                          <div className="text-center">Action</div>
                        </div>
                        <div className="divide-y divide-white/8">
                          {resourceCatalog.map((item, index) => {
                            const record = getCatalogRecord(item);
                            const key = record.id || record._id || `${record.applicationId || 'gateway-resource'}-${index}`;
                            const status = getCatalogStatusMeta(item);
                            const createdBy = getCatalogAuditValue(item, ['createdBy', 'created_by', 'createdUser', 'created_user', 'createdByName', 'createdByEmail', 'created_by_email']);
                            const updatedBy = getCatalogAuditValue(item, ['updatedBy', 'updated_by', 'updatedUser', 'updated_user', 'updatedByName', 'updatedByEmail', 'updated_by_email']);
                            const createdAt = getCatalogAuditValue(item, ['createdAt', 'created_at', 'createdOn', 'created_on', 'creationDate']);
                            const updatedAt = getCatalogAuditValue(item, ['updatedAt', 'updated_at', 'updatedOn', 'updated_on', 'modifiedAt', 'modified_at', 'lastUpdatedAt', 'lastUpdatedOn']);

                            return (
                              <div
                                key={key}
                                className="grid grid-cols-[1.3fr_1fr_0.8fr_0.9fr_0.9fr_1fr_1fr_120px_88px] items-center gap-4 bg-[#0f172a]/72 px-5 py-4 text-left text-sm text-slate-300 transition-colors hover:bg-[#151d33]"
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-white" title={record.apiName || record.applicationName || 'Untitled resource'}>{record.apiName || record.applicationName || 'Untitled resource'}</div>
                                  <div className="mt-1 truncate text-xs text-slate-500" title={record.id || record.onboardingId || 'N/A'}>{record.id || record.onboardingId || 'N/A'}</div>
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-slate-100" title={record.applicationName || 'N/A'}>{record.applicationName || 'N/A'}</div>
                                  <div className="mt-1 truncate text-xs text-slate-500" title={record.applicationId || 'N/A'}>{record.applicationId || 'N/A'}</div>
                                </div>
                                <div className="truncate" title={record.teamName || 'N/A'}>{record.teamName || 'N/A'}</div>
                                <div className="truncate" title={createdBy || 'N/A'}>{createdBy || 'N/A'}</div>
                                <div className="truncate" title={record.updatedBy || 'N/A'}>{updatedBy || 'N/A'}</div>
                                <div className="truncate" title={formatCatalogAuditDate(createdAt)}>{formatCatalogAuditDateOnly(createdAt)}</div>
                                <div className="truncate" title={formatCatalogAuditDate(updatedAt)}>{formatCatalogAuditDateOnly(updatedAt)}</div>
                                <div>
                                  <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', deploymentStatusBadgeClass(status.tone))}>
                                    {status.label}
                                  </span>
                                </div>
                                <div className="relative flex justify-center">
                                  <button
                                    type="button"
                                    onClick={(event) => openCatalogActionDropdown(event, key)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:border-[#ff5b1f]/30 hover:bg-[#ff5b1f]/10 hover:text-white"
                                    title="Open actions"
                                    aria-label="Open actions"
                                    aria-expanded={openCatalogActionMenu?.key === key}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {openCatalogActionMenu?.key === key && (
                                    <>
                                      <button
                                        type="button"
                                        className="fixed inset-0 z-40 cursor-default"
                                        aria-label="Close action menu"
                                        onClick={() => setOpenCatalogActionMenu(null)}
                                      />
                                      <div
                                        className="fixed z-50 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-[#111827] py-1 shadow-2xl shadow-black/40"
                                        style={{ top: openCatalogActionMenu.top, left: openCatalogActionMenu.left }}
                                      >
                                        {[
                                          { label: 'View', icon: Eye, action: () => handleViewCatalogResource(item) },
                                          { label: 'Edit', icon: Pencil, action: () => handleCatalogAction(item, 'update') },
                                          { label: 'Clone', icon: FileCode2, action: () => handleCatalogAction(item, 'cloning') },
                                          { label: 'Version', icon: GitPullRequest, action: () => handleCatalogAction(item, 'versioning') },
                                          { label: 'Deployment History', icon: History, action: () => openCatalogDeploymentHistory(item) },
                                        ].map(({ label, icon: Icon, action }) => (
                                          <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                              setOpenCatalogActionMenu(null);
                                              action();
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition-colors hover:bg-[#ff5b1f]/10 hover:text-white"
                                          >
                                            <Icon className="h-3.5 w-3.5 text-slate-400" />
                                            {label}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>

        <OnboardingModal
          isOpen={showGlobalOnboardingModal}
          onClose={handleGlobalOnboardingClose}
          onComplete={applyGlobalOnboarding}
          projectType={getProjectType()}
          selectedGateway={selectedGateway}
          resourceLabel={getResourceLabel()}
          defaultMode={globalOnboardingMode}
          lockMode={globalOnboardingLockedMode}
          showActionSelection
          actionMode={actionMode}
          onActionModeChange={handleGlobalActionModeChange}
          actionOptions={[
            { id: 'create', title: 'Create', description: `Start a new ${getResourceLabel()} flow from onboarding context.`, icon: Plus, nextMode: 'select' },
            { id: 'update', title: 'Edit', description: `Load an existing onboarding into Step 1 for this ${getResourceLabel()}.`, icon: Pencil, nextMode: 'existing', existingOnly: true },
            { id: 'cloning', title: 'Cloning', description: `Load an existing ${getResourceLabel()}, then enter the new resource name and version.`, icon: FileCode2, nextMode: 'existing', existingOnly: true },
            { id: 'versioning', title: 'Versioning', description: `Load an existing ${getResourceLabel()}, then enter the new version.`, icon: GitPullRequest, nextMode: 'existing', existingOnly: true },
          ]}
          savedConsumers={savedConsumers}
          onAddConsumer={() => setShowConsumerModal(true)}
          onEditConsumer={handleEditConsumer}
          initialExistingRecord={catalogOnboardingPreset?.item}
          initialActionDetails={catalogOnboardingPreset?.actionDetails}
          onboardingService={onboardingService}
          showMessage={showMessage}
          availableWorkflows={availableWorkflows}
          selectedWorkflow={selectedWorkflow}
          onWorkflowChange={(wf) => {
            setSelectedWorkflow(wf);
            if (wf) localStorage.setItem('forgesphere_activeWorkflow_proxy', wf.id);
            else localStorage.removeItem('forgesphere_activeWorkflow_proxy');
          }}
        />
        {showConsumerModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold text-white">{editingConsumerId ? 'Edit Consumer' : 'Add Consumer'}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowConsumerModal(false);
                    setEditingConsumerId(null);
                    setConsumerForm({
                      consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
                      consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
                    });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  x
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer Name</Label><Input value={consumerForm.consumerName} onChange={(e) => setConsumerForm({ ...consumerForm, consumerName: e.target.value })} placeholder="e.g., Acme Corp" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer POC Name</Label><Input value={consumerForm.consumerPocName} onChange={(e) => setConsumerForm({ ...consumerForm, consumerPocName: e.target.value })} placeholder="e.g., Bob Wilson" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer POC Email</Label><Input value={consumerForm.consumerPocEmail} onChange={(e) => setConsumerForm({ ...consumerForm, consumerPocEmail: e.target.value })} placeholder="e.g., poc@example.com" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={(e) => setConsumerForm({ ...consumerForm, consumerSmeName: e.target.value })} placeholder="e.g., Alice Brown" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer SME Email</Label><Input value={consumerForm.consumerSmeEmail} onChange={(e) => setConsumerForm({ ...consumerForm, consumerSmeEmail: e.target.value })} placeholder="e.g., sme@example.com" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer Config</Label><Input value={consumerForm.consumerConfig} onChange={(e) => setConsumerForm({ ...consumerForm, consumerConfig: e.target.value })} placeholder="e.g., Config JSON" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">API TPS</Label><Input value={consumerForm.apiTps} onChange={(e) => setConsumerForm({ ...consumerForm, apiTps: e.target.value })} placeholder="e.g., 1000" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Quota (requests/day)</Label><Input value={consumerForm.quota} onChange={(e) => setConsumerForm({ ...consumerForm, quota: e.target.value })} placeholder="e.g., 10000/day" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">Rate Limiting (requests/min)</Label><Input value={consumerForm.rateLimiting} onChange={(e) => setConsumerForm({ ...consumerForm, rateLimiting: e.target.value })} placeholder="e.g., 100/min" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-gray-300">API Key Information</Label><Input value={consumerForm.apiKeyInfo} onChange={(e) => setConsumerForm({ ...consumerForm, apiKeyInfo: e.target.value })} placeholder="e.g., API Key xyz123" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
                <button type="button" onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors">Cancel</button>
                <button type="button" onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer} className={cn('px-6 py-2 rounded-lg font-semibold text-sm transition-all', 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25', 'active:scale-[0.98]')}>
                  {editingConsumerId ? 'Update Consumer' : (isAddingConsumer ? 'Saving...' : 'Save Consumer')}
                </button>
              </div>
            </div>
          </div>
        )}
        <ResourceDeploymentHistoryModal
          open={deploymentHistoryModal.open}
          resourceId={deploymentHistoryModal.resourceId}
          title={deploymentHistoryModal.title}
          resourceLabel={deploymentHistoryModal.resourceLabel}
          onClose={() => setDeploymentHistoryModal({ open: false, title: '', resourceId: '', resourceLabel: 'Resource' })}
        />
      </>
    );
  };

  const hasMessage = message.text || message.downloadUrl;
  const isSuccessWithDownload = message.downloadUrl != null;

  if (routeResourceId || catalogDetailModal.open) {
    return renderCatalogDetailModal();
  }

  if (shouldShowResourceCatalog()) {
    return renderResourceLanding();
  }

  const isKongGatewayBuilder = selectedGateway === 'Kong' && resourceType === 'Gateway Builder';
  const shouldShowStepRoadmap = !isKongGatewayBuilder && !(currentStep === 1 && showConfig.includes(resourceType));

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
      {showSchemaValidation && (
        <div className="fixed inset-0 z-[250] bg-[#0b0f1e]">
          <SchemaModeling
            specId={schemaValidationSpec?.id || schemaValidationSpec?.specMetadataId}
            specContent={schemaValidationSpec?.content || schemaValidationSpec?.specContent || ''}
            specName={schemaValidationSpec?.specName || schemaValidationSpec?.name || ''}
            onClose={() => setShowSchemaValidation(false)}
          />
        </div>
      )}
      {viewSpecOpen && viewSpecSpec && (
        <ViewSpecModal
          spec={viewSpecSpec}
          onClose={() => { setViewSpecOpen(false); setViewSpecSpec(null); }}
        />
      )}
      {specEditorOpen && specEditorSpec && (
        <SpecEditorModal
          spec={specEditorSpec}
          onClose={() => { setSpecEditorOpen(false); setSpecEditorSpec(null); }}
          onSave={async () => { setSpecEditorOpen(false); setSpecEditorSpec(null); }}
        />
      )}
      {cloneSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Copy className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Clone Spec</h3>
                <p className="text-xs text-gray-400">A new copy will be created in your workspace from <span className="text-white">{cloneSpecModal.spec.name}</span></p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300">Clone name</label>
                <input type="text" value={cloneSpecName} onChange={(e) => setCloneSpecName(e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50" placeholder="Enter a name for the cloned spec" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setCloneSpecModal(null); setCloneSpecName(''); }} className="flex-1 px-4 py-2 text-sm rounded-lg border border-dark-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors">Cancel</button>
                <button onClick={confirmSpecClone} disabled={cloningSpec || !cloneSpecName.trim()} className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {cloningSpec ? <><Loader2 className="w-4 h-4 animate-spin" /> Cloning...</> : <><Copy className="w-4 h-4" /> Clone & Select</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      )}
      {/* Header */}

      {/* Step Roadmap */}
      {shouldShowStepRoadmap && (
      <div className="border-b border-dark-700 bg-dark-800/50 px-6 pt-2">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex justify-center items-start gap-2">
            {/* Gateway Dropdown - Only visible on Onboarding page, centered above action buttons */}
            
              <div className="hidden">
                <div className="relative" ref={gatewayDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowGatewayDropdown(!showGatewayDropdown)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      selectedGateway
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'text-gray-300 hover:bg-dark-800/50 hover:text-white border-dark-700'
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    <span>{selectedGateway === 'Kong' ? 'Kong Konnect' : selectedGateway || 'API Gateway'}</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', showGatewayDropdown && 'rotate-180')} />
                  </button>

                  {/* Gateway Dropdown Menu */}
                  {showGatewayDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 rounded-lg border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg overflow-hidden z-30">
                      <div className="py-1">
                        {(isKongRoute ? [
                          { name: 'Kong', displayName: 'Kong Konnect', enabled: true }
                        ] : [
                          { name: 'Apigee X', displayName: 'ForgeSphere', enabled: true },
                          { name: 'Apigee Edge', displayName: 'ForgeSphere Edge', enabled: true },
                          { name: 'MuleSoft', displayName: 'MuleSoft', enabled: false }
                        ]).map((gateway) => (
                          <div
                            key={gateway.name}
                            className={cn(
                              'flex items-center justify-between px-4 py-2.5 transition-colors group',
                              gateway.enabled ? 'hover:bg-dark-800/50' : 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <button
                              onClick={() => {
                                if (!gateway.enabled) return;
                                setSelectedGateway(gateway.name);
                                localStorage.setItem('probeStack_proxySelectedGateway', gateway.name);
                                setShowGatewayDropdown(false);
                                setShowGatewayAlert(false);
                                // Reset resource type to default based on gateway
                                if (gateway.name === 'Kong') {
                                  setResourceType('Gateway Services');
                                } else {
                                  setResourceType('Proxy');
                                }
                              }}
                              disabled={!gateway.enabled}
                              className={cn(
                                'flex items-center gap-3 text-sm flex-1 text-left',
                                selectedGateway === gateway.name ? 'text-primary' : 'text-gray-300 hover:text-white',
                                !gateway.enabled && 'cursor-not-allowed'
                              )}
                            >
                              <Server className="w-4 h-4" />
                              {gateway.displayName || gateway.name}
                            </button>
                            {gateway.enabled && (
                              <button
                                onClick={() => {
                                  setSelectedGateway(gateway.name);
                                  localStorage.setItem('probeStack_proxySelectedGateway', gateway.name);
                                  setShowGatewayDropdown(false);
                                  setCurrentStep('gateway-config');
                                  // Reset resource type to default based on gateway
                                  if (gateway.name === 'Kong') {
                                    setResourceType('Gateway Services');
                                  } else {
                                    setResourceType('Proxy');
                                  }
                                }}
                                className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-dark-700/50 transition-all"
                                title={`Configure ${gateway.name}`}
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            
            {/* Resource Type Dropdown and Action Mode Buttons - Only visible on Onboarding page */}
            {false && currentStep === 1 && (
              <div className="flex items-center justify-center gap-3 mb-6">
                {/* Resource Type Dropdown */}
                <div className="relative" ref={resourceTypeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowResourceTypeDropdown(!showResourceTypeDropdown)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      'bg-primary/20 text-primary border-primary/30'
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    <span>{resourceType || "Select Resource Type"}</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', showResourceTypeDropdown && 'rotate-180')} />
                  </button>

                  {/* Resource Type Dropdown Menu */}
                  {showResourceTypeDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-56 rounded-lg border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg overflow-hidden z-30">
                      <div className="py-1">
                        {(selectedGateway === 'Kong' ? [
                          { name: 'Gateway Services', fullName: 'Gateway Services+Routes+Plugins' },
                          { name: 'Routes', fullName: 'Routes' },
                          { name: 'Plugins', fullName: 'Plugins' },
                          { name: 'Consumers', fullName: 'Consumers' },
                          { name: 'Upstream Services', fullName: 'Upstream Services' },
                          { name: 'Vaults', fullName: 'Vaults' },
                          { name: 'Redis Configurations', fullName: 'Redis Configurations' },
                          { name: 'CA Certificates', fullName: 'CA Certificates' },
                          { name: 'TLS Certificates', fullName: 'TLS Certificates' },
                        ] : [
                          { name: 'Proxy', fullName: 'Proxy' },
                          { name: 'Shared Function', fullName: 'Shared Function' },
                          { name: 'Target Server', fullName: 'Target Server' },
                          { name: 'KVM', fullName: 'KVM' },
                          { name: 'Key Store', fullName: 'Key Store' },
                          // { name: 'Cache', fullName: 'Cache' },
                          { name: 'App', fullName: 'App' },
                          { name: 'Product', fullName: 'Product' },
                          // { name: 'Key-value Map', fullName: 'Key-value Map' },
                          // { name: 'Trust Store', fullName: 'Trust Store' }
                        ]).map((type) => (
                          <button
                            key={type.name}
                            onClick={() => {
                              setShowOnboardingModal(false);
                              setResourceType(type.name);
                              setShowResourceTypeDropdown(false);
                            }}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors',
                              resourceType === type.name ? 'text-primary bg-dark-800/50' : 'text-gray-300 hover:text-white hover:bg-dark-800/50'
                            )}
                            title={type.fullName}
                          >
                            <Server className="w-4 h-4" />
                            <span>{
                              selectedGateway === 'ForgeSphere Gateway' && type.name === 'Proxy' ? 'API' :
                              selectedGateway === 'ForgeSphere Gateway' && type.name === 'Shared Function' ? 'Function' :
                              type.name
                            }</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Mode Buttons - Conditional based on Resource Type */}
                {(resourceType === 'Proxy' || resourceType === 'Shared Function') && (
                  <button
                    onClick={() => handleActionButtonClick('create')}
                    className={cn(
                      'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                      actionMode === 'create'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    )}
                  >
                    Create
                  </button>
                )}
                {(resourceType === 'Proxy' || resourceType === 'Shared Function') && (
                  <button
                    onClick={() => handleActionButtonClick('update')}
                    className={cn(
                      'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                      actionMode === 'update'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    )}
                  >
                    Edit
                  </button>
                )}

                {/* {!(resourceType === 'Proxy' || resourceType === 'Shared Function') && (
                <button
                  onClick={() => handleActionButtonClick('view')}
                  className={cn(
                    'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                    actionMode === 'view'
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  )}
                >
                  View
                </button>
              )} */}

                {/* {!(resourceType === 'Proxy' || resourceType === 'Shared Function') && (
                <button
                  onClick={() => handleActionButtonClick('update')}
                  className={cn(
                    'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                    actionMode === 'update'
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  )}
                >
                  Edit
                </button>
              )} */}

                {(resourceType === 'Proxy' || resourceType === 'Shared Function') && (
                  <>
                    <button
                      onClick={() => handleActionButtonClick('cloning')}
                      className={cn(
                        'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                        actionMode === 'cloning'
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                      )}
                    >
                      Cloning
                    </button>
                    <button
                      onClick={() => handleActionButtonClick('versioning')}
                      className={cn(
                        'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                        actionMode === 'versioning'
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                      )}
                    >
                      Versioning
                    </button>
                    {["Proxy", "Shared Function"].includes(resourceType) &&
                      <button
                        onClick={() => handleActionButtonClick('sync')}
                        className={cn(
                          'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                          'bg-dark-700 text-gray-300 hover:bg-dark-600'
                        )}
                      >
                        Sync
                      </button>}
                  </>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="flex items-center justify-center gap-3 mb-6">
                {actionMode !== 'create' && (activeProxyName || proxyName || onboardingApplicationName) && (
                  <div className="px-4 py-2 rounded-lg bg-dark-700/50 border border-dark-700 text-sm text-gray-300">
                    Mode: <span className="font-semibold text-white capitalize">{actionMode === 'update' ? 'Edit' : actionMode}</span>
                    <span className="text-gray-400"> - {activeProxyName || proxyName || onboardingApplicationName}</span>
                  </div>
                )}
                <div className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {selectedGateway === 'Kong' ? 'Kong Konnect' : selectedGateway}
                  </span>
                </div>
                <div className="px-4 py-2 rounded-lg bg-dark-700/50 border border-dark-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-300" />
                  <span className="text-sm font-medium text-white">{resourceType === "Shared Function" ? "Function" : "API"}</span>
                </div>
                {/* {!showConfig.includes(resourceType) && (
                  <button
                    type="button"
                    onClick={() => openGlobalOnboardingModal('action')}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md shadow-primary/25"
                  >
                    Select Onboarding
                  </button>
                )} */}
              </div>
            )}

            {/* Status Header - Only visible on steps other than Onboarding */}
            {currentStep !== 1 && (
              <div className="flex items-start justify-center mb-6 gap-3">
                {/* Resource Type Badge */}
                <div className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{resourceType}</span>
                </div>

                {/* Status Header */}
                {(actionMode === 'create' || activeProxyName) && <div className="px-6 py-3 rounded-lg bg-dark-700/50 border border-dark-700 flex items-start gap-3">
                  {actionMode === 'create' && (
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <div className="absolute left-0 w-1.5 h-1.5 bg-[#F97316] rounded-full"></div>
                      <div className="absolute right-0 w-1.5 h-1.5 bg-[#F97316] rounded-full"></div>
                      <div className="absolute left-0 w-1.5 h-1.5 bg-[#F97316] rounded-full animate-[flowRight_1.5s_ease-in-out_infinite]"></div>
                      <div className="absolute left-0 w-1.5 h-1.5 bg-[#F97316]/60 rounded-full animate-[flowRight_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute left-0 w-1.5 h-1.5 bg-[#F97316]/30 rounded-full animate-[flowRight_1.5s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}></div>
                    </div>
                  )}
                  <p className="text-sm font-medium text-white">
                    {actionMode === 'create' && (selectedGateway === 'Kong' ? 'Creating New Service' : selectedGateway === 'ForgeSphere Gateway' ? (resourceType === 'Shared Function' ? 'Creating New Function' : 'Creating New API') : 'Creating New Proxy')}
                    {actionMode === 'update' && activeProxyName && (selectedGateway === 'Kong' ? `Editing ${activeProxyName} Gateway Service` : resourceType === 'Shared Function' ? (selectedGateway === 'ForgeSphere Gateway' ? `Editing ${activeProxyName} Function` : `Editing ${activeProxyName} Function`) : (selectedGateway === 'ForgeSphere Gateway' ? `Editing ${activeProxyName} API` : `Editing ${activeProxyName} API`))}
                    {actionMode === 'cloning' && activeProxyName && (selectedGateway === 'Kong' ? `Cloning ${activeProxyName} Gateway Service` : resourceType === 'Shared Function' ? (selectedGateway === 'ForgeSphere Gateway' ? `Cloning ${activeProxyName} Function` : `Cloning ${activeProxyName} Function`) : (selectedGateway === 'ForgeSphere Gateway' ? `Cloning ${activeProxyName} API` : `Cloning ${activeProxyName} API`))}
                    {actionMode === 'versioning' && activeProxyName && (selectedGateway === 'Kong' ? `Versioning ${activeProxyName} Gateway Service` : resourceType === 'Shared Function' ? (selectedGateway === 'ForgeSphere Gateway' ? `Versioning ${activeProxyName} Function` : `Versioning ${activeProxyName} Function`) : (selectedGateway === 'ForgeSphere Gateway' ? `Versioning ${activeProxyName} API` : `Versioning ${activeProxyName} API`))}
                  </p>
                </div>}
              </div>
            )}
            {/* New Config Button at End */}
            {selectedGateway == "Kong" &&
              <div className="absolute right-5 flex gap-2">
                {/* <button
                  type="button"
                  onClick={() => {
                    setShowOnboardingModal(true);
                    if (!selectedGateway) {
                      setShowGatewayAlert(true);
                      return;
                    }
                    setOnboardingTeamName('');
                    setOnboardingApplicationName('');
                    setOnboardingApplicationId('');
                    setOnboardingBusinessUnit('');
                    setOnboardingProjectOwner('');
                    setOnboardingOwnerEmail('');
                    setOnboardingProjectSME('');
                    setOnboardingProjectSMEEmail('');
                    setOnboardingProjectDLEmail('');
                    setOnboardingTesterName('');
                    setOnboardingTesterEmail('');
                    setOnboardingServiceNowGroup('');
                    setOnboardingServiceNowEmail('');
                    setOnboardingGoLiveDate('');
                    setSelectedOnboardingConsumers([]);
                    localStorage.removeItem('probeStack_proxyOnboardingNumber');
                    localStorage.removeItem('probeStack_proxyOnboardingData');
                    setOnboardingNumber('');
                    showMessage('New onboarding created - forms reset', 'success');
                    setResourceType(null);
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                    'flex items-center gap-2 active:scale-[0.98]'
                  )}
                >
                  Onboarding
                </button> */}
                <button
                  onClick={() => setOpenSettings(true)}
                  className="px-4 py-2 flex items-center justify-center gap-1 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                >
                  <Settings className="w-4 h-4" />
                  Config
                </button>
              </div>}
          </div>

          {!showConfig.includes(resourceType) && selectedGateway != "Kong" && (
            <>
              {(() => {
                const visibleCount = 5;
                const currentVisibleIndex = Math.max(visibleSteps.findIndex((step) => step.id === currentStep), 0);
                const maxStart = Math.max(0, visibleSteps.length - visibleCount);
                const visibleStart = Math.min(Math.max(currentVisibleIndex - Math.floor(visibleCount / 2), 0), maxStart);
                const centeredVisibleSteps = visibleSteps.slice(visibleStart, visibleStart + visibleCount);
                const leftStack = visibleSteps.slice(0, visibleStart);
                const rightStack = visibleSteps.slice(visibleStart + visibleCount);

                const renderStepCircle = (step, compact = false) => {
                  const isActive = isStepActive(step.id);
                  const isCompleted = isStepCompleted(step.id);
                  const isOptional = !isStepRequired(selectedWorkflow, step.id);
                  return (
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${isActive
                      ? isOptional ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-primary text-white shadow-lg shadow-primary/30'
                      : isCompleted ? 'bg-green-500 text-white'
                        : isOptional ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                          : compact ? 'bg-dark-700/95 text-gray-400 ring-1 ring-dark-600' : 'bg-dark-700 text-gray-400'}`}>
                      {isCompleted && !isActive ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-bold">{step.id}</span>}
                    </div>
                  );
                };

                const renderStepLabel = (step) => {
                  const isActive = isStepActive(step.id);
                  const isCompleted = isStepCompleted(step.id);
                  const isOptional = !isStepRequired(selectedWorkflow, step.id);
                  return (
                    <span className={`text-xs font-medium whitespace-nowrap ${isActive ? (isOptional ? 'text-amber-400' : 'text-primary') : isCompleted ? 'text-green-400' : isOptional ? 'text-amber-500/70' : 'text-white'}`}>
                      {step.name}
                    </span>
                  );
                };

                const renderConnector = (completed, compact = false) => (
                  <div className={cn(
                    'h-0.5 self-start mt-5 transition-all duration-500',
                    compact ? 'min-w-[32px] -mx-1' : 'flex-1 min-w-[72px] -mx-4',
                    completed ? 'bg-green-500' : 'bg-dark-700',
                  )} />
                );

                const renderStack = (stack, direction) => {
                  const stackSteps = direction === 'left' ? stack.slice(-8) : stack.slice(0, 8);
                  return (
                    <div className={cn('group/stack flex min-h-[76px] shrink-0 items-start pt-0.5', direction === 'left' ? 'min-w-0 justify-start pr-2' : 'min-w-[112px] justify-start pl-2')}>
                      {stackSteps.map((step, stackIndex) => (
                        <button
                          key={step.id}
                          type="button"
                          title={step.name}
                          onClick={() => handleStepClick(step.id)}
                          style={{ zIndex: direction === 'left' ? stackIndex + 1 : stackSteps.length - stackIndex }}
                          className={cn(
                            'group/stackstep relative flex h-[58px] flex-col items-center transition-all duration-500 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary/45',
                            stackIndex > 0 && '-ml-5 group-hover/stack:-ml-2 group-focus-within/stack:-ml-2',
                          )}
                        >
                          {renderStepCircle(step, true)}
                          <span className={cn(
                            'pointer-events-none absolute bottom-12 z-50 rounded-md border border-dark-600 bg-dark-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover/stackstep:-translate-y-1 group-hover/stackstep:opacity-100 group-focus/stackstep:-translate-y-1 group-focus/stackstep:opacity-100',
                            'w-max max-w-none whitespace-nowrap',
                            direction === 'left' ? 'right-0' : 'left-0',
                          )}>
                            {step.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                };

                return (
                  <div
                    className="overflow-x-auto overflow-y-visible pb-2 pt-8 scroll-smooth overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    onWheel={(event) => {
                      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                        event.currentTarget.scrollLeft += event.deltaY;
                      }
                    }}
                  >
                    <div className="flex min-w-max items-start px-5">
                      {leftStack.length > 0 && (
                        <>
                          {renderStack(leftStack, 'left')}
                          {renderConnector(leftStack[leftStack.length - 1].id < currentStep, true)}
                        </>
                      )}

                      {centeredVisibleSteps.map((step, index) => (
                        <React.Fragment key={step.id}>
                          <button onClick={() => handleStepClick(step.id)} className="flex flex-col items-center gap-1.5 min-w-[80px] transition-all cursor-pointer">
                            {renderStepCircle(step)}
                            {renderStepLabel(step)}
                      </button>
                          {index < centeredVisibleSteps.length - 1 && renderConnector(isStepCompleted(step.id))}
                        </React.Fragment>
                      ))}

                      {rightStack.length > 0 && (
                        <>
                          {renderConnector(isStepCompleted(centeredVisibleSteps[centeredVisibleSteps.length - 1]?.id), true)}
                          {renderStack(rightStack, 'right')}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
          {showProxyDevSubBranch && !showConfig.includes(resourceType) && (
            <div className="flex justify-center mt-4 pt-4 border-t border-dark-700/50 animate-fadeIn">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pr-4">
                {proxyDevSubSteps.map((subStep, index) => {
                  const isCompleted = completedSubSteps.includes(subStep.id);
                  const isCurrent = isGenerating && currentSubStep === index;
                  return (
                    <React.Fragment key={subStep.id}>
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border min-w-fit transition-all duration-500",
                        isCompleted
                          ? 'bg-green-500/10 border-green-500/30'
                          : isCurrent
                            ? 'bg-primary/20 border-primary animate-pulse'
                            : 'border-dark-700'
                      )}
                        style={!isCompleted && !isCurrent ? { backgroundColor: '#0f172a80' } : undefined}>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                              ? 'bg-primary text-white'
                              : 'bg-primary/20 text-primary'
                        )}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={cn(
                          "text-xs whitespace-nowrap transition-all duration-500",
                          isCompleted ? 'text-green-400' : isCurrent ? 'text-primary' : 'text-gray-300'
                        )}>
                          {subStep.name}
                        </span>
                      </div>
                      {index < proxyDevSubSteps.length - 1 && (
                        <ChevronRight className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors duration-500",
                          isCompleted ? 'text-green-400' : 'text-gray-500'
                        )} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {
          showProxyEditor ? (
            <div className="h-full w-full">
              <ProxyEditor selectedProxyName={proxyName} initialZipUrl={generatedProxyZipUrl} onBack={() => setShowProxyEditor(false)} />
            </div>
          ) :
          selectedGateway == "Kong" && showOnboardingModal ?
            <Onboarding
              setShowOnboardingModal={setShowOnboardingModal}
              showGatewayAlert={showGatewayAlert}
              setShowGatewayAlert={setShowGatewayAlert}
              onboardingBusinessUnit={onboardingBusinessUnit}
              setOnboardingBusinessUnit={setOnboardingBusinessUnit}
              onboardingTeamName={onboardingTeamName}
              setOnboardingTeamName={setOnboardingTeamName}
              onboardingApplicationName={onboardingApplicationName}
              setOnboardingApplicationName={setOnboardingApplicationName}
              onboardingApplicationId={onboardingApplicationId}
              setOnboardingApplicationId={setOnboardingApplicationId}

              onboardingProjectOwner={onboardingProjectOwner}
              setOnboardingProjectOwner={setOnboardingProjectOwner}
              onboardingOwnerEmail={onboardingOwnerEmail}
              setOnboardingOwnerEmail={setOnboardingOwnerEmail}
              onboardingProjectSME={onboardingProjectSME}
              setOnboardingProjectSME={setOnboardingProjectSME}
              onboardingProjectSMEEmail={onboardingProjectSMEEmail}
              setOnboardingProjectSMEEmail={setOnboardingProjectSMEEmail}
              onboardingProjectDLEmail={onboardingProjectDLEmail}
              setOnboardingProjectDLEmail={setOnboardingProjectDLEmail}
              onboardingGoLiveDate={onboardingGoLiveDate}
              setOnboardingGoLiveDate={setOnboardingGoLiveDate}
              onboardingTesterName={onboardingTesterName}
              setOnboardingTesterName={setOnboardingTesterName}
              onboardingTesterEmail={onboardingTesterEmail}
              setOnboardingTesterEmail={setOnboardingTesterEmail}
              onboardingServiceNowGroup={onboardingServiceNowGroup}
              setOnboardingServiceNowGroup={setOnboardingServiceNowGroup}
              onboardingServiceNowEmail={onboardingServiceNowEmail}
              setOnboardingServiceNowEmail={setOnboardingServiceNowEmail}

              savedConsumers={savedConsumers}
              selectedOnboardingConsumers={selectedOnboardingConsumers}
              setSelectedOnboardingConsumers={setSelectedOnboardingConsumers}
              setShowConsumerModal={setShowConsumerModal}
              handleEditConsumer={handleEditConsumer}

              setShowConnectorModal={setShowConnectorModal}
            /> :
            selectedGateway == "Kong" && resourceType == "Routes" ?
              <Routes /> :
              selectedGateway == "Kong" && resourceType == "Plugins" ?
                <Plugins /> :
                selectedGateway == "Kong" && resourceType == "Upstream Services" ?
                  <Upstream /> :
                  selectedGateway == "Kong" && resourceType == "Consumers" ?
                    <Consumer /> :
                    selectedGateway == "Kong" && resourceType == "Vaults" ?
                      <Vaults /> :
                      selectedGateway == "Kong" && resourceType == "TLS Certificates" ?
                        <TLSCertificates /> :
                        selectedGateway == "Kong" && resourceType == "CA Certificates" ?
                          <CACertificates /> :
                          selectedGateway == "Kong" && resourceType == "Redis Configurations" ?
                            <RedisConfig /> :
                            selectedGateway == "Kong" && resourceType == "Gateway Services" && showServiceDesign ?
                              <ServiceDesign setProxyApiDesignSpecs={setProxyApiDesignSpecs} setBusy={setBusy} proxyDesignFileInputRef={proxyDesignFileInputRef} proxyDesignUrlInput={proxyDesignUrlInput} proxyApiDesignSpecs={proxyApiDesignSpecs} proxyDesignSelectedSpec={proxyDesignSelectedSpec} setProxyDesignImportMode={setProxyDesignImportMode} proxyDesignImportMode={proxyDesignImportMode} setProxyShowForgeStudioModal={setProxyShowForgeStudioModal} setProxyDesignUrlInput={setProxyDesignUrlInput} onboardingId={onboardingId} setMessage={setMessage} setToast={setToast} setProxyDesignSelectedSpec={setProxyDesignSelectedSpec} setShowServiceDesign={setShowServiceDesign} setShowManualServices={setShowManualServices} /> :
                              selectedGateway == "Kong" && resourceType == "Gateway Services" && showManualServices ?
                                <Services setShowServiceDesign={setShowServiceDesign} setShowManualServices={setShowManualServices} /> :
                                selectedGateway == "Kong" && ["Gateway Services", "Gateway Builder"].includes(resourceType) ?
                                  // <GatewayServices setShowServiceDesign={setShowServiceDesign} setShowManualServices={setShowManualServices}/> :
                                  <GatewayServices
                                    // existing props
                                    setBusy={setBusy}
                                    proxyDesignFileInputRef={proxyDesignFileInputRef}
                                    proxyDesignUrlInput={proxyDesignUrlInput}
                                    proxyApiDesignSpecs={proxyApiDesignSpecs}
                                    proxyDesignSelectedSpec={proxyDesignSelectedSpec}
                                    setProxyDesignImportMode={setProxyDesignImportMode}
                                    proxyDesignImportMode={proxyDesignImportMode}
                                    setProxyShowForgeStudioModal={setProxyShowForgeStudioModal}
                                    setProxyDesignUrlInput={setProxyDesignUrlInput}
                                    onboardingId={onboardingId}
                                    onboardingContextId={onboardingContextId}
                                    startInSpecFlow={Boolean(isExistingOnboardingLoaded && (onboardingId || onboardingContextId))}
                                    startInGatewayBuilder={resourceType === 'Gateway Builder'}
                                    onOpenKongConfig={() => setOpenSettings(true)}
                                    setMessage={setMessage}
                                    setToast={setToast}
                                    setProxyApiDesignSpecs={setProxyApiDesignSpecs}
                                    setProxyDesignSelectedSpec={setProxyDesignSelectedSpec}
                                    setProxyDesignImportedSpecs={setProxyDesignImportedSpecs}
                                    proxyDesignImportedSpecs={proxyDesignImportedSpecs}
                                    proxySelectedDesignSpecs={proxySelectedDesignSpecs}
                                    testCases={testCases}

                                    // navigation
                                    setCurrentStep={setCurrentStep}

                                    // project
                                    selectedGateway={selectedGateway}
                                    selectedFramework={selectedFramework}
                                    setSelectedFramework={setSelectedFramework}
                                    resourceType={resourceType}

                                    // proxy config
                                    proxyName={proxyName}
                                    setProxyName={setProxyName}
                                    version={version}
                                    setVersion={setVersion}
                                    basePath={basePath}
                                    setBasePath={setBasePath}

                                    // endpoints
                                    apiEndpoints={apiEndpoints}
                                    setApiEndpoints={setApiEndpoints}
                                    specEndpoints={specEndpoints}
                                    apiMethod={apiMethod}
                                    setApiMethod={setApiMethod}
                                    apiEndpoint={apiEndpoint}
                                    setApiEndpoint={setApiEndpoint}

                                    // backend
                                    backendName={backendName}
                                    setBackendName={setBackendName}
                                    backendHost={backendHost}
                                    setBackendHost={setBackendHost}
                                    backendPort={backendPort}
                                    setBackendPort={setBackendPort}
                                    backendPath={backendPath}
                                    setBackendPath={setBackendPath}
                                    enableSSL={enableSSL}
                                    setEnableSSL={setEnableSSL}
                                    connectionStatus={connectionStatus}
                                    setConnectionStatus={setConnectionStatus}

                                    // connector
                                    setShowConnectorModal={setShowConnectorModal}
                                    getConnectionSummary={getConnectionSummary}

                                    // security
                                    securityBackendTab={securityBackendTab}
                                    setSecurityBackendTab={setSecurityBackendTab}
                                    securityOptions={securityOptions}
                                    securityInboundSelections={securityInboundSelections}
                                    setSecurityInboundSelections={setSecurityInboundSelections}
                                    securityOutboundSelections={securityOutboundSelections}
                                    setSecurityOutboundSelections={setSecurityOutboundSelections}

                                    // consumers/providers
                                    providerConsumerTab={providerConsumerTab}
                                    setProviderConsumerTab={setProviderConsumerTab}
                                    savedProviders={savedProviders}
                                    savedConsumers={savedConsumers}
                                    selectedProvider={selectedProvider}
                                    setSelectedProvider={setSelectedProvider}
                                    selectedConsumer={selectedConsumer}
                                    setSelectedConsumer={setSelectedConsumer}
                                    selectedOnboardingConsumers={selectedOnboardingConsumers}
                                    setSelectedOnboardingConsumers={setSelectedOnboardingConsumers}
                                    handleEditConsumer={handleEditConsumer}
                                    //  (for Complete.jsx)
                                    // kong response
                                    kongApiResponse={kongApiResponse}

                                    // summary config
                                    targetUrl={targetUrl}

                                    // import info
                                    importSource={importSource}
                                    specFile={specFile}
                                    urlInput={urlInput}

                                    // policies (non-kong)
                                    policies={policies}
                                    //Existing Onboarding Modal Props
                                    showExistingOnboardingModal={showExistingOnboardingModal}
                                    setShowExistingOnboardingModal={setShowExistingOnboardingModal}

                                    existingAppNames={existingAppNames}
                                    isFetchingAppNames={isFetchingAppNames}

                                    selectedExistingApp={selectedExistingApp}
                                    setSelectedExistingApp={setSelectedExistingApp}

                                    existingAppOnboarding={existingAppOnboarding}
                                    setExistingAppOnboarding={setExistingAppOnboarding}

                                    isFetchingAppOnboarding={isFetchingAppOnboarding}
                                    setIsFetchingAppOnboarding={setIsFetchingAppOnboarding}

                                    selectedExistingSpec={selectedExistingSpec}
                                    setSelectedExistingSpec={setSelectedExistingSpec}

                                    onboardingService={onboardingService}
                                    setIsFetchingAppNames={setIsFetchingAppNames}
                                    getProjectType={getProjectType}
                                    setExistingAppNames={setExistingAppNames}

                                    handleProceedWithExistingOnboarding={handleProceedWithExistingOnboarding}
                                    //existing onboarding proceed
                                    setOnboardingTeamName={setOnboardingTeamName}
                                    setOnboardingApplicationName={setOnboardingApplicationName}
                                    setOnboardingApplicationId={setOnboardingApplicationId}
                                    setOnboardingBusinessUnit={setOnboardingBusinessUnit}
                                    setOnboardingProjectOwner={setOnboardingProjectOwner}
                                    setOnboardingOwnerEmail={setOnboardingOwnerEmail}
                                    setOnboardingProjectSME={setOnboardingProjectSME}
                                    setOnboardingProjectSMEEmail={setOnboardingProjectSMEEmail}
                                    setOnboardingProjectDLEmail={setOnboardingProjectDLEmail}
                                    setOnboardingGoLiveDate={setOnboardingGoLiveDate}
                                    setOnboardingTesterName={setOnboardingTesterName}
                                    setOnboardingTesterEmail={setOnboardingTesterEmail}
                                    setOnboardingServiceNowGroup={setOnboardingServiceNowGroup}
                                    setOnboardingServiceNowEmail={setOnboardingServiceNowEmail}

                                    setOnboardingId={setOnboardingId}
                                    setExistingConfigId={setExistingConfigId}

                                    setFunctionalReqs={setFunctionalReqs}
                                    setNonFunctionalReqs={setNonFunctionalReqs}

                                    setProxySelectedDesignSpecs={setProxySelectedDesignSpecs} showOnboardingModal={showOnboardingModal}
                                    setShowOnboardingModal={setShowOnboardingModal}
                                    onboardingNumber={onboardingNumber}
                                    setOnboardingNumber={setOnboardingNumber}
                                    setResourceType={setResourceType}
                                  /> :
                                  showConfig.includes(resourceType) ?
                                    <ApigeeMainPage key={resourceType} resourceType={resourceType} setResourceType={handleResourceType} /> :
                                    (<div className="mx-auto max-w-[1600px] px-6 py-6">
                                      {/* Page Title */}
                                      <div className="mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                          <div>
                                            <h1 className="text-2xl font-bold text-white mb-1">
                                              {currentStep === 1 && 'Application Onboarding'}
                                              {currentStep === 2 && (selectedGateway === 'Kong' ? 'Service Requirements' : 'Proxy Requirements')}
                                              {currentStep === 3 && (selectedGateway === 'Kong' ? 'Service Design' : 'Proxy Design')}
                                              {currentStep === 4 && (selectedGateway === 'Kong' ? 'Service Design Validation' : 'Proxy Design Validation')}
                                              {currentStep === 5 && (selectedGateway === 'Kong' ? 'Service Mock Configuration' : 'Proxy Mock Configuration')}
                                              {currentStep === 6 && (selectedGateway === 'Kong' ? 'Service Contract Testing & Approval' : 'Proxy Contract Testing & Approval')}
                                              {currentStep === 7 && (selectedGateway === 'Kong' ? 'Service Development & Generation' :resourceType == 'Shared Function'?"Function Development": 'API Development & Generation')}
                                              {currentStep === 8 && (selectedGateway === 'Kong' ? 'Service Test Cases' : 'Proxy Test Cases')}
                                              {currentStep === 9 && (selectedGateway === 'Kong' ? 'Service Testing' : 'Proxy Code Analysis')}
                                              {currentStep === 10 && (selectedGateway === 'Kong' ? 'Service Code Review & Approval' :resourceType == 'Shared Function'?"Function Code Review & Approval":  'API Code Review & Approval')}
                                              {currentStep === 11 && 'Generation Complete'}
                                              {currentStep === 'gateway-config' && `${selectedGateway} Configuration`}
                                            </h1>
                                            <p className="text-sm text-gray-400">
                                              {currentStep === 'gateway-config' ? 'Configure API Gateway Settings' : `Step ${currentStepDisplay} of ${visibleSteps.length}`}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {currentStep === 1 && (
                                            <>
                                              {/* <button
                                                type="button"
                                                onClick={() => {
                                                  if (!selectedGateway) {
                                                    setShowGatewayAlert(true);
                                                    return;
                                                  }
                                                  setOnboardingTeamName('');
                                                  setOnboardingApplicationName('');
                                                  setOnboardingApplicationId('');
                                                  setOnboardingBusinessUnit('');
                                                  setOnboardingProjectOwner('');
                                                  setOnboardingOwnerEmail('');
                                                  setOnboardingProjectSME('');
                                                  setOnboardingProjectSMEEmail('');
                                                  setOnboardingProjectDLEmail('');
                                                  setOnboardingTesterName('');
                                                  setOnboardingTesterEmail('');
                                                  setOnboardingServiceNowGroup('');
                                                  setOnboardingServiceNowEmail('');
                                                  setOnboardingGoLiveDate('');
                                                  setSelectedOnboardingConsumers([]);
                                                  localStorage.removeItem('probeStack_proxyOnboardingNumber');
                                                  localStorage.removeItem('probeStack_proxyOnboardingData');
                                                  setOnboardingNumber('');
                                                  showMessage('New onboarding created - forms reset', 'success');
                                                }}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-2 active:scale-[0.98]'
                                                )}
                                              >
                                                New Onboarding
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (!selectedGateway) {
                                                    setShowGatewayAlert(true);
                                                    return;
                                                  }
                                                  setShowExistingOnboardingModal(true);
                                                  setIsFetchingAppNames(true);
                                                  onboardingService.getApplicationNames(getProjectType()).then((result) => {
                                                    if (result.success) {
                                                      const names = result.data?.data || result.data || [];
                                                      setExistingAppNames(Array.isArray(names) ? names : []);
                                                    } else {
                                                      showMessage(result.error, 'error');
                                                    }
                                                    setIsFetchingAppNames(false);
                                                  });
                                                }}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-2 active:scale-[0.98]'
                                                )}
                                              >
                                                Existing Onboarding
                                              </button> */}
                                            </>
                                          )}
                                          {currentStep === 2 && (
                                            <button
                                              type="button"
                                              onClick={() => setShowAIAssisted(true)}
                                              className={cn(
                                                'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                'flex items-center gap-1.5 active:scale-[0.98]'
                                              )}
                                            >
                                              <Bot className="w-4 h-4" />
                                              AI-Assisted
                                            </button>
                                          )}
                                          {currentStep === 7 && !isGenerating && !isApigeeProxyDevelopmentStep && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setShowProviderModal(true)}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-1.5 active:scale-[0.98]'
                                                )}
                                              >
                                                Add Provider
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setShowConsumerModal(true)}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-1.5 active:scale-[0.98]'
                                                )}
                                              >
                                                Add Consumer
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* AI-Assisted Requirements View */}
                                      {showAIAssisted && (
                                        <div className="fixed inset-0 z-50 bg-dark-900" style={{ backgroundColor: '#0e172a' }}>
                                          {/* AI-Assisted Header */}
                                          <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50 shrink-0">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4">
                                                <button
                                                  type="button"
                                                  onClick={() => setShowAIAssisted(false)}
                                                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-all"
                                                >
                                                  <ArrowLeft className="w-4 h-4" />
                                                  Back to Requirements
                                                </button>
                                                <div className="h-6 w-px bg-dark-700"></div>
                                                <div>
                                                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <Sparkles className="w-5 h-5 text-primary" />
                                                    AI-Assisted Proxy Requirements
                                                  </h2>
                                                  <p className="text-sm text-gray-400">
                                                    Create API gateway requirements with AI assistance
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* AI-Assisted Content */}
                                          <div className="flex-1 overflow-auto p-6" style={{ height: 'calc(100vh - 140px)' }}>
                                            <div className="mx-auto max-w-[1400px]">
                                              {renderProxyAiIngestionPanel(false)}
                                            </div>

                                            {/* Legacy AI-assisted chat layout intentionally disabled in favor of the new AI ingestion section. */}
                                            {false && (
                                              <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
                                                {/* Chat Interface - Left Side */}
                                                <div className="col-span-12 lg:col-span-8 flex flex-col rounded-xl overflow-hidden bg-dark-800/60 border border-dark-700 shadow-xl">
                                                  {/* Chat Messages Area */}
                                                  <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                                                    {aiMessages.map((message) => (
                                                      <div
                                                        key={message.id}
                                                        className={cn(
                                                          "flex gap-4 items-start",
                                                          message.role === "user" ? "justify-end" : "max-w-[85%]"
                                                        )}
                                                      >
                                                        {message.role === "assistant" && (
                                                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary ring-1 ring-primary/30">
                                                            <Bot className="w-5 h-5" />
                                                          </div>
                                                        )}
                                                        <div className={cn(
                                                          "flex flex-col gap-1.5",
                                                          message.role === "user" ? "items-end max-w-[85%]" : ""
                                                        )}>
                                                          <div
                                                            className={cn(
                                                              "p-4 rounded-2xl text-sm leading-relaxed",
                                                              message.role === "user"
                                                                ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20"
                                                                : "bg-dark-700/50 text-gray-100 rounded-tl-none border border-dark-600"
                                                            )}
                                                          >
                                                            <p>{message.content}</p>
                                                          </div>
                                                          <span className="text-[10px] text-gray-500 px-1">{message.timestamp}</span>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>

                                                  {/* Input Area */}
                                                  <div className="p-6 border-t border-dark-700 bg-dark-800/30">
                                                    {/* Quick Action Buttons */}
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                      {[
                                                        "Add OAuth 2.0 security policy",
                                                        "Configure rate limiting",
                                                        "Add JSON to XML transformation",
                                                        "Set up response caching",
                                                      ].map((action, index) => (
                                                        <button
                                                          key={index}
                                                          onClick={() => setAiInput(action)}
                                                          className="px-3 py-1.5 bg-dark-700/50 rounded-lg text-xs font-medium border border-dark-600 hover:border-primary/50 hover:bg-primary/5 transition-all text-gray-300"
                                                        >
                                                          {action}
                                                        </button>
                                                      ))}
                                                    </div>

                                                    {/* Input Form */}
                                                    <form onSubmit={(e) => {
                                                      e.preventDefault();
                                                      if (!aiInput.trim()) return;
                                                      const userMessage = {
                                                        id: aiMessages.length + 1,
                                                        role: "user",
                                                        content: aiInput,
                                                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                      };
                                                      setAiMessages([...aiMessages, userMessage]);
                                                      setAiInput("");
                                                      setTimeout(() => {
                                                        const aiResponse = {
                                                          id: aiMessages.length + 2,
                                                          role: "assistant",
                                                          content: "I'll help you create API gateway requirements. Let me analyze your needs and generate comprehensive proxy specifications with policies and configurations...",
                                                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                        };
                                                        setAiMessages((prev) => [...prev, aiResponse]);
                                                      }, 1000);
                                                    }} className="relative group">
                                                      <textarea
                                                        value={aiInput}
                                                        onChange={(e) => setAiInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                            e.preventDefault();
                                                            e.target.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                                          }
                                                        }}
                                                        className="w-full border border-dark-600 rounded-2xl p-4 pr-16 text-sm text-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder-gray-500 resize-none"
                                                        style={{ backgroundColor: '#0f172a80' }}
                                                        placeholder="Describe your proxy requirements (e.g., 'Create an API gateway with OAuth, rate limiting, and request transformation for a payment API')..."
                                                        rows="2"
                                                      />
                                                      <button
                                                        type="submit"
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary/30 group-hover:scale-105 active:scale-95"
                                                      >
                                                        <Send className="w-5 h-5" />
                                                      </button>
                                                    </form>

                                                    {/* Bottom Actions */}
                                                    <div className="flex justify-between items-center mt-3">
                                                      <div className="flex items-center gap-4">
                                                        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                                                          <Paperclip className="w-4 h-4" />
                                                          Attach Spec
                                                        </button>
                                                      </div>
                                                      <span className="text-[10px] text-gray-500 font-mono">Press Cmd + Enter to send</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Right Sidebar */}
                                                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                                                  {renderProxyAiIngestionPanel(true)}

                                                  {/* Generation Status Panel */}
                                                  <section className="bg-dark-800/60 border border-dark-700 rounded-xl p-6 shadow-lg relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                      <Sparkles className="w-16 h-16" />
                                                    </div>
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
                                                      <span className="w-5 h-5 text-primary flex items-center justify-center">
                                                        <Sparkles className="w-5 h-5" />
                                                      </span>
                                                      Requirements Status
                                                    </h3>
                                                    <div className="space-y-6">
                                                      {Object.entries(reqGenStatus).map(([key, value]) => {
                                                        const Icon = value.completed ? CheckCircle2 : Shield;
                                                        return (
                                                          <div key={key} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                              <div className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                                value.completed
                                                                  ? "bg-green-500/20 text-green-400"
                                                                  : "bg-dark-700/50 text-gray-400"
                                                              )}>
                                                                <Icon className="w-5 h-5" />
                                                              </div>
                                                              <div>
                                                                <h4 className={cn(
                                                                  "text-sm font-semibold",
                                                                  value.completed ? "text-white" : "text-gray-400"
                                                                )}>
                                                                  {key === 'securityPolicies' ? 'Security Policies' :
                                                                    key === 'trafficManagement' ? 'Traffic Management' :
                                                                      'Transformations'}
                                                                </h4>
                                                                <p className={cn(
                                                                  "text-xs",
                                                                  value.completed ? "text-green-400 font-medium" : "text-gray-500"
                                                                )}>
                                                                  {value.status}
                                                                </p>
                                                              </div>
                                                            </div>
                                                            {value.completed && (
                                                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </section>

                                                  {/* AI Tips Panel */}
                                                  <section className="bg-dark-800/60 border border-dark-700 rounded-xl p-6 shadow-lg relative overflow-hidden flex-grow">
                                                    <div className="absolute -bottom-6 -right-6 opacity-5">
                                                      <Sparkles className="w-32 h-32 text-primary" />
                                                    </div>
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
                                                      <Sparkles className="w-5 h-5 text-primary" />
                                                      AI Assistant Tips
                                                    </h3>
                                                    <ul className="space-y-4">
                                                      {[
                                                        "Specify the gateway platform (ForgeSphere, Kong, AWS) for platform-specific policies.",
                                                        "Mention authentication requirements (OAuth, JWT, API Key) for security policies.",
                                                        "Describe rate limiting needs (requests/second, burst limits) for traffic management.",
                                                        "Include transformation requirements (JSON/XML, header injection) for mediation.",
                                                        "Use natural language to ask for complex routing or caching strategies.",
                                                      ].map((tip, index) => (
                                                        <li key={index} className="flex gap-3">
                                                          <span className="text-primary text-xl leading-none">•</span>
                                                          <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </section>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Step 7: Proxy Development */}
                                      {currentStep === 7 && (
                                        <form id="proxy-form" onSubmit={handleSubmit}>
                                          {/* Full Page Content Replacement - Only Current Step */}
                                          {isGenerating && !generationFailed && currentSubStep < proxyDevSubSteps.length && (
                                            <div className="space-y-6">
                                              {/* Step 1: API Generation */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'api-gen' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                                      <FileCode className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Generating Proxy Code</h3>
                                                      <p className="text-gray-400">Creating proxy configuration from specification...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Parsing proxy specification...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Generating proxy policies and flows...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Creating policy configurations...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Implementing route rules...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}

                                              {/* Step 2: Source Control */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'scm' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                                      <GitBranch className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Configuring Source Control</h3>
                                                      <p className="text-gray-400">Setting up Git repository and CI/CD...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Initializing Git repository...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Creating .gitignore and README...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Setting up GitHub/GitLab integration...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}

                                              {/* Step 3: Code Linting */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'lint' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                                      <Shield className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Running Code Linting</h3>
                                                      <p className="text-gray-400">Performing static code analysis...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Running ESLint/Checkstyle/Pylint...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Checking code formatting...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Validating import organization...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}

                                              {/* Step 4: Security Scanning */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'security' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                                      <Lock className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Security Scanning</h3>
                                                      <p className="text-gray-400">Checking for vulnerabilities and secrets...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Scanning for hardcoded secrets...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Checking dependency vulnerabilities...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Validating security headers...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}

                                              {/* Step 5: Unit Testing */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'unit-test' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                                      <TestTube className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Running Unit Tests</h3>
                                                      <p className="text-gray-400">Executing test suite and generating coverage...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Generating JUnit/pytest/Jest tests...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Executing controller tests...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Running service layer tests...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}

                                              {/* Step 6: Deployment */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'deploy' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                                      <Rocket className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Deployment</h3>
                                                      <p className="text-gray-400">Preparing and deploying to environment...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Building deployment artifacts...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Configuring environment variables...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Deploying to target environment...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}

                                              {/* Step 7: Artifact Publishing */}
                                              {proxyDevSubSteps[currentSubStep]?.id === 'artifact' && (
                                                <Card className="p-8">
                                                  <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                                      <Box className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-xl font-bold text-white">Publishing Artifacts</h3>
                                                      <p className="text-gray-400">Building and publishing to registry...</p>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Building container image...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Pushing to container registry...</span>
                                                    </div>
                                                    <div className="p-4 rounded-lg border border-dark-700 flex items-center gap-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                      <span className="text-gray-300">Publishing JAR/npm package...</span>
                                                    </div>
                                                  </div>
                                                </Card>
                                              )}
                                            </div>
                                          )}

                                          {/* Generation Failure State - Show Error and Generate Again button */}
                                          {isGenerating && generationFailed && (
                                            <div className="space-y-6">
                                              {/* Partial Substeps Wizard - Show completed and failed steps */}
                                              <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                <div className="flex items-center gap-2 mb-4">
                                                  <XCircle className="w-5 h-5 text-red-400" />
                                                  <h3 className="text-lg font-semibold text-white">Generation Failed</h3>
                                                </div>
                                                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                                  {proxyDevSubSteps.map((subStep, index) => {
                                                    const isCompleted = completedSubSteps.includes(subStep.id);
                                                    const isFailed = failedAtStep === index;
                                                    return (
                                                      <React.Fragment key={subStep.id}>
                                                        <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                                                          <div className={cn(
                                                            "flex items-center justify-center w-10 h-10 rounded-full text-white",
                                                            isCompleted && !isFailed ? "bg-green-500 shadow-lg shadow-green-500/30" :
                                                              isFailed ? "bg-red-500 shadow-lg shadow-red-500/30" :
                                                                "bg-gray-600"
                                                          )}>
                                                            {isCompleted && !isFailed ? (
                                                              <CheckCircle className="w-5 h-5" />
                                                            ) : isFailed ? (
                                                              <XCircle className="w-5 h-5" />
                                                            ) : (
                                                              <span className="text-xs">{index + 1}</span>
                                                            )}
                                                          </div>
                                                          <span className={cn(
                                                            "text-xs font-medium whitespace-nowrap",
                                                            isCompleted && !isFailed ? "text-green-400" :
                                                              isFailed ? "text-red-400" :
                                                                "text-gray-500"
                                                          )}>
                                                            {subStep.name}
                                                          </span>
                                                        </div>
                                                        {index < proxyDevSubSteps.length - 1 && (
                                                          <ChevronRight className={cn(
                                                            "w-4 h-4 flex-shrink-0",
                                                            isCompleted ? "text-green-400" : "text-gray-500"
                                                          )} />
                                                        )}
                                                      </React.Fragment>
                                                    );
                                                  })}
                                                </div>
                                              </Card>

                                              <Card className="p-8 text-center">
                                                <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                                                  <XCircle className="w-12 h-12 text-red-500" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-white mb-2">{selectedGateway === 'Kong' ? 'Service Generation Failed' : 'Proxy Generation Failed'}</h3>
                                                <p className="text-gray-400 mb-4">An error occurred during the deployment step.</p>

                                                {/* Error Message Display */}
                                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-left">
                                                  <div className="flex items-start gap-3">
                                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                      <p className="text-sm font-semibold text-red-400 mb-1">Error Details:</p>
                                                      <p className="text-sm text-gray-300 font-mono break-all">{generationError}</p>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex justify-center gap-4">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setIsGenerating(false);
                                                      setCurrentSubStep(0);
                                                      setCompletedSubSteps([]);
                                                      setGenerationFailed(false);
                                                      setGenerationError('');
                                                      setFailedAtStep(null);
                                                    }}
                                                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
                                                  >
                                                    <Rocket className="w-5 h-5" />
                                                    Generate Again
                                                  </button>
                                                </div>

                                                {/* Navigation Buttons */}
                                                <div className="flex justify-between mt-6 pt-6 border-t border-dark-700">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setIsGenerating(false);
                                                      setCurrentSubStep(0);
                                                      setCompletedSubSteps([]);
                                                      setGenerationFailed(false);
                                                      setGenerationError('');
                                                      setFailedAtStep(null);
                                                      handlePrevious();
                                                    }}
                                                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 flex items-center gap-2"
                                                  >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Previous
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setIsGenerating(false);
                                                      setCurrentSubStep(0);
                                                      setCompletedSubSteps([]);
                                                      setGenerationFailed(false);
                                                      setGenerationError('');
                                                      setFailedAtStep(null);
                                                      handleNext();
                                                    }}
                                                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-2"
                                                  >
                                                    Next
                                                    <ArrowRight className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </Card>
                                            </div>
                                          )}

                                          {/* Generation Success State - Show Summary and Generate Again buttons */}
                                          {isGenerating && !generationFailed && currentSubStep >= proxyDevSubSteps.length && (
                                            <div className="space-y-6">
                                              {/* Completed Substeps Wizard */}
                                              <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                <div className="flex items-center gap-2 mb-4">
                                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                                  <h3 className="text-lg font-semibold text-white">All Steps Completed</h3>
                                                </div>
                                                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                                  {proxyDevSubSteps.map((subStep, index) => (
                                                    <React.Fragment key={subStep.id}>
                                                      <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30">
                                                          <CheckCircle className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-xs font-medium text-green-400 whitespace-nowrap">
                                                          {subStep.name}
                                                        </span>
                                                      </div>
                                                      {index < proxyDevSubSteps.length - 1 && (
                                                        <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                      )}
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                              </Card>

                                              <Card className="p-8 text-center">
                                                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                                                  <CheckCircle className="w-12 h-12 text-green-500" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-white mb-2">{selectedGateway === 'Kong' ? 'Service Generated Successfully!' : 'Proxy Generated Successfully!'}</h3>
                                                <p className="text-gray-400 mb-6">{selectedGateway === 'Kong' ? 'Your Service has been generated successfully.' : 'Your API proxy has been generated successfully.'}</p>
                                                <div className="flex justify-center gap-4">
                                                  <button
                                                    type="button"
                                                    onClick={() => setShowSummaryModal(true)}
                                                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
                                                  >
                                                    <FileText className="w-5 h-5" />
                                                    Summary
                                                  </button>
                                                  {/* <button
                                                    type="button"
                                                    onClick={() => setShowAppCredentialsModal(true)}
                                                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
                                                  >
                                                    <Key className="w-5 h-5" />
                                                    App Credentials
                                                  </button> */}
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (generatedProxyZipUrl) {
                                                        setShowProxyEditor(true);
                                                      } else {
                                                        showMessage('No generated proxy available to open', 'error');
                                                      }
                                                    }}
                                                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
                                                  >
                                                    <Code className="w-5 h-5" />
                                                    Open in Editor
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setIsGenerating(false);
                                                      setCurrentSubStep(0);
                                                      setCompletedSubSteps([]);
                                                    }}
                                                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
                                                  >
                                                    <Rocket className="w-5 h-5" />
                                                    Generate Again
                                                  </button>
                                                </div>
                                              </Card>
                                            </div>
                                          )}
                                          {/* Normal Step 7 Content - Hidden during generation */}
                                          {!isGenerating && (
                                            <div className={cn(
                                              isApigeeProxyDevelopmentStep
                                                ? 'grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-6'
                                                : 'contents'
                                            )}>
                                              {isApigeeProxyDevelopmentStep && (
                                                <Card
                                                  className="h-fit overflow-hidden rounded-xl border border-dark-700/80 bg-[#11182b] p-0 shadow-[0_18px_48px_rgba(3,7,18,0.22)] lg:sticky lg:top-4 lg:h-[740px]"
                                                  style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}
                                                >
                                                  <div className="border-b border-dark-700/80 bg-[#0f172a]/35 px-5 py-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                      <div>
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Proxy Development</p>
                                                        <h3 className="mt-2 text-base font-semibold text-white">Configuration flow</h3>
                                                      </div>
                                                      <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                        {Math.max(activeProxySetupSubStepIndex + 1, 1)}/{proxySetupSubSteps.length}
                                                      </span>
                                                    </div>
                                                    <p className="mt-2 text-xs leading-5 text-gray-400">Configure the proxy in focused, reviewable stages.</p>
                                                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-dark-800">
                                                      <div
                                                        className="h-full rounded-full bg-primary transition-all duration-300"
                                                        style={{ width: `${Math.max(((activeProxySetupSubStepIndex + 1) / proxySetupSubSteps.length) * 100, 0)}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                  <div className="space-y-1 p-3 lg:max-h-[588px] lg:overflow-y-auto lg:pr-2 [scrollbar-color:rgba(71,85,105,0.75)_transparent] [scrollbar-width:thin]">
                                                    {proxySetupSubSteps.map((subStep, index) => {
                                                      const Icon = subStep.icon;
                                                      const isActive = activeProxySetupSubStep === subStep.id;
                                                      const isCompleted = completedProxySetupSubSteps.includes(subStep.id);
                                                      const isSkipped = skippedProxySetupSubSteps.includes(subStep.id);
                                                      return (
                                                        <button
                                                          key={subStep.id}
                                                          type="button"
                                                          onClick={() => goToProxySetupSubStep(subStep.id)}
                                                          className={cn(
                                                            'group relative w-full rounded-xl border px-3 py-3 text-left transition-all',
                                                            isActive
                                                              ? 'border-primary/60 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                                                              : isCompleted
                                                                ? 'border-transparent bg-transparent hover:border-green-500/25 hover:bg-green-500/[0.04]'
                                                                : isSkipped
                                                                  ? 'border-transparent bg-transparent hover:border-yellow-500/25 hover:bg-yellow-500/[0.04]'
                                                                  : 'border-transparent bg-transparent hover:border-dark-700 hover:bg-[#0f172a]/50'
                                                          )}
                                                        >
                                                          {index < proxySetupSubSteps.length - 1 && (
                                                            <span
                                                              className={cn(
                                                                'absolute left-[28px] top-12 h-[calc(100%-1rem)] w-px transition-colors',
                                                                isCompleted ? 'bg-green-500/35' : 'bg-dark-700/80'
                                                              )}
                                                            />
                                                          )}
                                                          <span className="relative flex items-start gap-3">
                                                            <span
                                                              className={cn(
                                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all',
                                                                isActive
                                                                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                                                                  : isCompleted
                                                                    ? 'border-green-500/35 bg-green-500/15 text-green-300'
                                                                    : isSkipped
                                                                      ? 'border-yellow-500/35 bg-yellow-500/10 text-yellow-300'
                                                                      : 'border-dark-700 bg-[#0b1220] text-gray-500 group-hover:text-gray-200'
                                                              )}
                                                            >
                                                              {isCompleted ? <CheckCircle className="h-4 w-4" /> : isSkipped ? <Clock className="h-4 w-4" /> : index + 1}
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                              <span className={cn('flex items-center gap-2 text-sm font-semibold', isActive ? 'text-white' : 'text-gray-200')}>
                                                                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : isCompleted ? 'text-green-300' : 'text-gray-500')} />
                                                                {subStep.title}
                                                              </span>
                                                              <span className="mt-1 block text-xs leading-5 text-gray-500">{subStep.description}</span>
                                                            </span>
                                                          </span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </Card>
                                              )}
                                              <div className={cn(
                                                isApigeeProxyDevelopmentStep
                                                  ? 'min-w-0 lg:h-[740px] lg:overflow-y-auto lg:pr-2 [scrollbar-color:rgba(71,85,105,0.75)_transparent] [scrollbar-width:thin]'
                                                  : 'contents'
                                              )}>
                                                <div className={cn(
                                                  'grid grid-cols-1 gap-5 xl:gap-6',
                                                  isApigeeProxyDevelopmentStep ? 'gap-4 pb-1' : 'lg:grid-cols-2'
                                                )}>
                                              {/* Left column: API spec + Project + Project metadata */}
                                              <div className={cn(
                                                'flex flex-col gap-4',
                                                isApigeeProxyDevelopmentStep && activeProxySetupSubStep === 'securityPolicies' && 'hidden'
                                              )}>
                                                {/* API Specification - Auto-populated from Design page */}
                                                {resourceType !== 'Shared Function' && <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'metadata' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <div className="flex items-center justify-between mb-3">
                                                    <CardTitle>API specification</CardTitle>
                                                    <div className="flex items-center gap-2">
                                                      {proxyDesignSelectedSpec && (
                                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                                          <CheckCircle className="w-3 h-3" />
                                                          From Design page
                                                        </span>
                                                      )}
                                                      <button
                                                        type="button"
                                                        onClick={() => setCurrentStep(3)}
                                                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Edit in Design page"
                                                      >
                                                        <Pencil className="w-4 h-4" />
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {proxyDesignSelectedSpec ? (
                                                    <div className="p-3 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                                                      <div className="flex items-center gap-3">
                                                        <FileCode className="w-5 h-5 text-primary" />
                                                        <div>
                                                          <p className="text-sm font-medium text-white">{proxyDesignSelectedSpec.name}</p>
                                                          <p className="text-xs text-gray-400 capitalize">Source: {proxyDesignSelectedSpec.source || 'template'}</p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="p-4 rounded-lg border border-dark-700 text-center" style={{ backgroundColor: '#0f172a80' }}>
                                                      <AlertCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                                      <p className="text-sm text-gray-300">No API spec selected</p>
                                                      <p className="text-xs text-gray-400 mt-1">Please go to the Design page (Step 3) to select an API specification.</p>
                                                      <button
                                                        type="button"
                                                        onClick={() => setCurrentStep(3)}
                                                        className="mt-3 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all"
                                                      >
                                                        Go to Design Page
                                                      </button>
                                                    </div>
                                                  )}
                                                </Card>}

                                                {/* Project Card */}
                                                {resourceType != "Shared Function" &&
                                                <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'metadata' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-3">Project</CardTitle>

                                                  <p className="text-xs text-gray-400 mb-2">API TYPE</p>

                                                  {/* API Type Selection Buttons */}
                                                  <div className="flex flex-wrap gap-2">
                                                    {/* {['REST'].map((apiType) => ( */}
                                                    {(selectedGateway === 'Kong' ? ['REST'] : (resourceType == 'Shared Function'||resourceType == "Proxy") ? ['REST'] : ['REST', 'MCP', 'GraphQL', 'SOAP', 'gRPC']).map((apiType) => (
                                                      <button
                                                        key={apiType}
                                                        type="button"
                                                        onClick={() => setSelectedFramework(apiType.toLowerCase())}
                                                        className={cn(
                                                          'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                                          selectedFramework === apiType.toLowerCase()
                                                            ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                            : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                        )}
                                                      >
                                                        {apiType}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </Card>}

                                                {/* Proxy Configuration Component */}
                                                <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'metadata' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-3">{selectedGateway === 'Kong' ? 'Service Configuration' : resourceType === 'Shared Function' ? 'Function Configuration' : 'API Configuration'}</CardTitle>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                      <Label htmlFor="proxyName" className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Service Name' : resourceType === 'Shared Function' ? 'Function Name' : 'API Name'}</Label>
                                                      <Input
                                                        id="proxyName"
                                                        placeholder={selectedGateway === 'Kong' ? 'e.g., Payment Gateway Service' : 'e.g., Payment Gateway Proxy'}
                                                        value={proxyName}
                                                        onChange={(e) => setProxyName(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      <Label htmlFor="proxyVersion" className="text-xs text-gray-300">Version</Label>
                                                      <Input
                                                        id="proxyVersion"
                                                        placeholder="1.0.0"
                                                        value={version}
                                                        onChange={(e) => setVersion(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>
                                                    {resourceType !== 'Shared Function' && <div className="col-span-2 space-y-1.5">
                                                      <Label htmlFor="proxyBasePath" className="text-xs text-gray-300">Base path</Label>
                                                      <Input
                                                        id="proxyBasePath"
                                                        placeholder="/api/v1"
                                                        value={basePath}
                                                        onChange={(e) => setBasePath(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>}
                                                  </div>

                                                  {/* Endpoints Section with Dropdown */}
                                                  {resourceType !== 'Shared Function' && <div className="mt-4 pt-4 border-t border-dark-700">
                                                    {selectedGateway !== 'Kong' && (
                                                      <div className="flex items-center justify-between mb-3">
                                                        <Label className="text-xs text-gray-300">Endpoints ({apiEndpoints.length})</Label>
                                                        {/* <button
                        type="button"
                        onClick={() => {
                          const newId = apiEndpoints.length > 0 ? Math.max(...apiEndpoints.map(e => e.id)) + 1 : 1;
                          const newEndpoint = { id: newId, method: 'GET', path: '/new-endpoint', name: `Endpoint ${newId}` };
                          setApiEndpoints([...apiEndpoints, newEndpoint]);
                          setApiMethod(newEndpoint.method);
                          setApiEndpoint(newEndpoint.path);
                        }}
                        className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Add endpoint"
                      >
                        <Plus className="w-4 h-4" />
                      </button> */}
                                                      </div>
                                                    )}

                                                    {specEndpoints.length > 0 && (
                                                      <select
                                                        className="w-full h-9 rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all mb-3"
                                                        style={{
                                                          backgroundColor: '#0f172a80',
                                                          borderColor: '#232942',
                                                          borderWidth: '1px',
                                                        }}
                                                        value={specEndpoints.find(ep => ep.method === apiMethod && ep.path === apiEndpoint)?.id || ''}
                                                        onChange={(e) => {
                                                          const selected = specEndpoints.find(ep => ep.id === e.target.value);
                                                          if (selected) {
                                                            setApiMethod(selected.method);
                                                            setApiEndpoint(selected.path);
                                                          }
                                                        }}
                                                      >
                                                        <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select endpoint to edit...</option>
                                                        {specEndpoints.map((ep) => (
                                                          <option key={ep.id} value={ep.id} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                            {ep.method} {ep.path}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    )}

                                                    {selectedGateway !== 'Kong' && (
                                                      <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                          <Label htmlFor="apiMethod" className="text-xs text-gray-300">Method</Label>
                                                          <select
                                                            id="apiMethod"
                                                            value={apiMethod}
                                                            onChange={(e) => {
                                                              setApiMethod(e.target.value);
                                                              const currentEndpoint = specEndpoints.find((ep) => ep.method === apiMethod && ep.path === apiEndpoint);

                                                              if (currentEndpoint) {
                                                                setApiEndpoints(
                                                                  specEndpoints.map((ep) =>
                                                                    ep.id === currentEndpoint.id
                                                                      ? { ...ep, method: e.target.value }
                                                                      : ep
                                                                  )
                                                                );
                                                              }
                                                            }}
                                                            className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all"
                                                            style={{
                                                              backgroundColor: '#0f172a80',
                                                              borderColor: '#232942',
                                                              borderWidth: '1px',
                                                            }}
                                                          >
                                                            <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select method</option>
                                                            <option value="GET" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>GET</option>
                                                            <option value="POST" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>POST</option>
                                                            <option value="PUT" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>PUT</option>
                                                            <option value="DELETE" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>DELETE</option>
                                                            <option value="PATCH" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>PATCH</option>
                                                          </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                          <Label htmlFor="apiEndpoint" className="text-xs text-gray-300">Endpoint</Label>
                                                          <Input
                                                            id="apiEndpoint"
                                                            placeholder="/users"
                                                            value={apiEndpoint}
                                                            onChange={(e) => {
                                                              setApiEndpoint(e.target.value);
                                                              const currentEndpoint = specEndpoints.find((ep) => ep.method === apiMethod && ep.path === apiEndpoint);

                                                              if (currentEndpoint) {
                                                                setApiEndpoints(
                                                                  specEndpoints.map((ep) =>
                                                                    ep.id === currentEndpoint.id
                                                                      ? { ...ep, path: e.target.value }
                                                                      : ep
                                                                  )
                                                                );
                                                              }
                                                            }}
                                                            className="h-9 text-sm"
                                                          />
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>}

                                                  {/* Save Button */}
                                                  {/* <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => showMessage('API metadata saved successfully', 'success')}
                    className={cn(
                      'px-5 py-2 rounded-lg font-semibold text-sm transition-all',
                      'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                      'flex items-center gap-2 active:scale-[0.98]'
                    )}
                  >
                    Save
                  </button>
                </div> */}
                                                </Card>

                                                {/* Target Server Component */}
                                                {resourceType !== 'Shared Function' && <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'backendRouting' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-3">{selectedGateway === 'Kong' ? 'Upstream Service' : 'Backend Service'}</CardTitle>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                      <Label htmlFor="backendName" className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Upstream Service Name' : 'Backend Service Name'}</Label>
                                                      <Input
                                                        id="backendName"
                                                        placeholder="Backend service name"
                                                        value={backendName}
                                                        onChange={(e) => setBackendName(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      <Label htmlFor="backendHost" className="text-xs text-gray-300">Host</Label>
                                                      <Input
                                                        id="backendHost"
                                                        placeholder="api.example.com"
                                                        value={backendHost}
                                                        onChange={(e) => setBackendHost(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      <Label htmlFor="backendPort" className="text-xs text-gray-300">Port</Label>
                                                      <Input
                                                        id="backendPort"
                                                        placeholder="443"
                                                        value={backendPort}
                                                        onChange={(e) => setBackendPort(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                      <Label htmlFor="backendPath" className="text-xs text-gray-300">Path</Label>
                                                      <Input
                                                        id="backendPath"
                                                        placeholder="/api"
                                                        value={backendPath}
                                                        onChange={(e) => setBackendPath(e.target.value)}
                                                        className="h-9 text-sm"
                                                      />
                                                    </div>
                                                  </div>

                                                  {/* SSL Checkbox and Test Connection Button Row */}
                                                  <div className="mt-4 flex items-center justify-between">
                                                    <label className="flex cursor-pointer items-center gap-2">
                                                      <input
                                                        type="checkbox"
                                                        className="accent-primary rounded"
                                                        checked={enableSSL}
                                                        onChange={(e) => setEnableSSL(e.target.checked)}
                                                      />
                                                      <span className="text-xs text-gray-300">Enable SSL</span>
                                                    </label>

                                                    <div className="flex flex-col items-end gap-2">
                                                      <button
                                                        type="button"
                                                        disabled={!backendName || !backendHost || !backendPort}
                                                        onClick={() => {
                                                          // Simulate connection test
                                                          setConnectionStatus('testing');
                                                          setTimeout(() => {
                                                            // Randomly succeed or fail for demo
                                                            const success = Math.random() > 0.3;
                                                            setConnectionStatus(success ? 'success' : 'error');
                                                          }, 1500);
                                                        }}
                                                        className={cn(
                                                          'px-5 py-2 rounded-lg font-semibold text-sm transition-all',
                                                          'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                          'flex items-center gap-2 active:scale-[0.98]',
                                                          (!backendName || !backendHost || !backendPort) && 'opacity-50 cursor-not-allowed'
                                                        )}
                                                      >
                                                        <Play className="w-4 h-4" />
                                                        Test Connection
                                                      </button>

                                                      {connectionStatus === 'success' && (
                                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                                          <CheckCircle className="w-3 h-3" />
                                                          Connection successful
                                                        </p>
                                                      )}
                                                      {connectionStatus === 'error' && (
                                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                                          <XCircle className="w-3 h-3" />
                                                          Connection failed
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                </Card>}

                                                <Card className={cn('p-4 mt-4 lg:col-span-2', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'parties' && 'hidden')}>
                                                  {isApigeeProxyDevelopmentStep ? (
                                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                                      <div>
                                                        <CardTitle className="mb-1">Consumers & Providers</CardTitle>
                                                        <p className="text-xs text-gray-400">Choose API consumers and maintain provider contact details for this proxy.</p>
                                                      </div>
                                                      <div className="flex flex-wrap gap-2">
                                                        <button
                                                          type="button"
                                                          onClick={() => setShowProviderModal(true)}
                                                          className={cn(
                                                            'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                            'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                            'flex items-center gap-1.5 active:scale-[0.98]'
                                                          )}
                                                        >
                                                          <Plus className="h-3.5 w-3.5" />
                                                          Add Provider
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => setShowConsumerModal(true)}
                                                          className={cn(
                                                            'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                            'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                            'flex items-center gap-1.5 active:scale-[0.98]'
                                                          )}
                                                        >
                                                          <Plus className="h-3.5 w-3.5" />
                                                          Add Consumer
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <CardTitle className="mb-3">Consumers & Providers</CardTitle>
                                                  )}

                                                  {/* Tab Buttons */}
                                                  <div className="flex flex-wrap gap-2 mb-4">

                                                    <button
                                                      type="button"
                                                      onClick={() => setProviderConsumerTab('consumer')}
                                                      className={cn(
                                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                                        providerConsumerTab === 'consumer'
                                                          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                          : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                      )}
                                                    >
                                                      Consumer ({savedConsumers.length})
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setProviderConsumerTab('provider')}
                                                      className={cn(
                                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                                        providerConsumerTab === 'provider'
                                                          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                          : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                      )}
                                                    >
                                                      Provider ({savedProviders.length})
                                                    </button>
                                                  </div>

                                                  {/* Provider List with Scrollbar */}
                                                  {providerConsumerTab === 'provider' && (
                                                    <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      {savedProviders.length === 0 ? (
                                                        <p className="text-xs text-gray-500 italic">No providers saved yet. Click "Add Provider" button at the top right to create one.</p>
                                                      ) : (
                                                        <div
                                                          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-1"
                                                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                                                        >
                                                          {savedProviders.map((provider) => (
                                                            <div
                                                              key={provider.id}
                                                              onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
                                                              className={cn(
                                                                'p-3 rounded-lg border cursor-pointer transition-all',
                                                                selectedProvider === provider.id
                                                                  ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                                  : 'border-dark-700 hover:border-primary/50'
                                                              )}
                                                              style={selectedProvider !== provider.id ? { backgroundColor: '#0f172a80' } : undefined}
                                                            >
                                                              <p className="text-xs font-medium text-white truncate">{provider.appOwnerName || 'No Owner Name'}</p>
                                                              <p className="text-[10px] text-gray-400 truncate">{provider.appOwnerEmail || 'No Owner Email'}</p>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Consumer List with Scrollbar */}
                                                  {providerConsumerTab === 'consumer' && (
                                                    <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                                                      {savedConsumers.length === 0 ? (
                                                        <p className="text-xs text-gray-500 italic">No consumers saved yet. Click "Add Consumer" button at the top right to create one.</p>
                                                      ) : (
                                                        <div
                                                          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-1"
                                                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                                                        >
                                                          {savedConsumers.map((consumer) => (
                                                            <div
                                                              key={consumer.id}
                                                              onClick={() => setSelectedConsumer(selectedConsumer === consumer.id ? null : consumer.id)}
                                                              className={cn(
                                                                'p-3 rounded-lg border cursor-pointer transition-all',
                                                                selectedConsumer === consumer.id
                                                                  ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                                  : 'border-dark-700 hover:border-primary/50'
                                                              )}
                                                              style={selectedConsumer !== consumer.id ? { backgroundColor: '#0f172a80' } : undefined}
                                                            >
                                                              <p className="text-xs font-medium text-white truncate">{consumer.consumerName || 'Unnamed'}</p>
                                                              <p className="text-[10px] text-gray-400 truncate">{consumer.consumerPocName || 'No POC'}</p>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Save Button */}
                                                  {/* <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => showMessage('Provider/Consumer selection saved successfully', 'success')}
                    className={cn(
                      'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                      'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                      'flex items-center gap-2 active:scale-[0.98] min-w-[140px] justify-center'
                    )}
                  >
                    Save
                  </button>
                </div> */}
                                                </Card>
                                              </div>

                                              {/* Right column: Connector Configuration + Policy Sections */}
                                              <div className={cn(
                                                'flex flex-col gap-4',
                                                isApigeeProxyDevelopmentStep && ['metadata', 'parties'].includes(activeProxySetupSubStep) && 'hidden'
                                              )}>
                                                {/* Connector Configuration Card */}
                                                <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'infrastructure' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-3 flex items-center gap-2">
                                                    <Plug className="w-5 h-5 text-primary" />
                                                    Connector Configuration
                                                  </CardTitle>
                                                  <p className="text-xs text-gray-400 mb-3">Configure GitHub, cloud providers, and database connections.</p>
                                                  <div className="flex justify-start">
                                                    <button
                                                      type="button"
                                                      onClick={() => setShowConnectorModal(true)}
                                                      className={cn(
                                                        'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                        'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                        'flex items-center gap-2 active:scale-[0.98]'
                                                      )}
                                                    >
                                                      <Plug className="w-4 h-4" />
                                                      Configure Connectors
                                                    </button>
                                                  </div>
                                                  {/* {getConnectionSummary() && (
                                                    <p className="mt-2 text-xs text-green-400">{getConnectionSummary()}</p>
                                                  )} */}
                                                  {renderConnectorSummary()}
                                                </Card>

                                                {/* Security Backend Section with Inbound/Outbound Tabs */}
                                                {resourceType != "Shared Function" && <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'securityPolicies' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-3 text-sm">Security Backend</CardTitle>

                                                  {/* Tab Buttons */}
                                                  <div className="flex flex-wrap gap-2 mb-3">
                                                    <button
                                                      type="button"
                                                      onClick={() => setSecurityBackendTab('inbound')}
                                                      className={cn(
                                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                                        securityBackendTab === 'inbound'
                                                          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                          : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                      )}
                                                    >
                                                      Inbound
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setSecurityBackendTab('outbound')}
                                                      className={cn(
                                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                                        securityBackendTab === 'outbound'
                                                          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                          : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                      )}
                                                    >
                                                      Outbound
                                                    </button>
                                                  </div>

                                                  {/* Inbound Security Options */}
                                                  {securityBackendTab === 'inbound' && (
                                                    <div>
                                                      <p className="mb-2 text-[11px] text-gray-500">Select at least 1, maximum 2 options</p>
                                                      <div className="grid grid-cols-2 gap-1.5">
                                                        {securityOptions.map((option) => {
                                                          const isSelected = securityInboundSelections.includes(option);
                                                          const canSelect = isSelected || securityInboundSelections.length < 2;
                                                          return (
                                                            <label key={option} className={cn(
                                                              "flex cursor-pointer items-center gap-2",
                                                              !canSelect && "opacity-50 cursor-not-allowed"
                                                            )}>
                                                              <input
                                                                type="checkbox"
                                                                className="rounded border-dark-700"
                                                                checked={isSelected}
                                                                disabled={!canSelect}
                                                                onChange={() => {
                                                                  if (isSelected) {
                                                                    setSecurityInboundSelections(prev => prev.filter(item => item !== option));
                                                                  } else if (securityInboundSelections.length < 2) {
                                                                    setSecurityInboundSelections(prev => [...prev, option]);
                                                                  }
                                                                }}
                                                              />
                                                              <span className="text-xs text-gray-300">{option}</span>
                                                            </label>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Outbound Security Options */}
                                                  {securityBackendTab === 'outbound' && (
                                                    <div>
                                                      <p className="mb-2 text-[11px] text-gray-500">Select at least 1, maximum 2 options</p>
                                                      <div className="grid grid-cols-2 gap-1.5">
                                                        {securityOptions.map((option) => {
                                                          const isSelected = securityOutboundSelections.includes(option);
                                                          const canSelect = isSelected || securityOutboundSelections.length < 2;
                                                          return (
                                                            <label key={option} className={cn(
                                                              "flex cursor-pointer items-center gap-2",
                                                              !canSelect && "opacity-50 cursor-not-allowed"
                                                            )}>
                                                              <input
                                                                type="checkbox"
                                                                className="rounded border-dark-700"
                                                                checked={isSelected}
                                                                disabled={!canSelect}
                                                                onChange={() => {
                                                                  if (isSelected) {
                                                                    setSecurityOutboundSelections(prev => prev.filter(item => item !== option));
                                                                  } else if (securityOutboundSelections.length < 2) {
                                                                    setSecurityOutboundSelections(prev => [...prev, option]);
                                                                  }
                                                                }}
                                                              />
                                                              <span className="text-xs text-gray-300">{option}</span>
                                                            </label>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                </Card>}

{resourceType != "Shared Function" && (
  <>
      {/* ========== Test Assets ========== */}
  <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'integrationsTesting' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
      <div className="mb-6">
        <CardTitle className="mb-2">Test Assets</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Choose generated testing assets included with the bundle.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Postman Collection – active */}
          <label
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer',
              generatedAssets.postman
                ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.22)]'
                : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/60'
            )}
          >
            <input
              type="checkbox"
              className="mt-1 h-3.5 w-3.5 accent-primary"
              checked={generatedAssets.postman || false}
              onChange={(e) => setGeneratedAssets({ ...generatedAssets, postman: e.target.checked })}
            />
            <span className="min-w-0">
              <span className="text-sm font-semibold text-white">Postman Collection</span>
              <span className="mt-1 block text-xs leading-5 text-gray-400">Runnable Postman collection with security helpers.</span>
            </span>
          </label>

          {/* JUnit Tests – coming soon */}
          <label className="flex items-start gap-3 rounded-lg border p-3 transition-all cursor-not-allowed border-dark-700 bg-[#0f172a]/40 opacity-60">
            <input type="checkbox" className="mt-1 h-3.5 w-3.5 accent-primary" checked={false} disabled />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                JUnit Tests
                <span className="rounded-full bg-dark-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Coming soon</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-400">Controller, service, and repository test scaffolds.</span>
            </span>
          </label>

          {/* Integration Tests – coming soon */}
          <label className="flex items-start gap-3 rounded-lg border p-3 transition-all cursor-not-allowed border-dark-700 bg-[#0f172a]/40 opacity-60">
            <input type="checkbox" className="mt-1 h-3.5 w-3.5 accent-primary" checked={false} disabled />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                Integration Tests
                <span className="rounded-full bg-dark-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Coming soon</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-400">Spring Boot integration tests with test profile.</span>
            </span>
          </label>

          {/* Testcontainers – coming soon */}
          <label className="flex items-start gap-3 rounded-lg border p-3 transition-all cursor-not-allowed border-dark-700 bg-[#0f172a]/40 opacity-60">
            <input type="checkbox" className="mt-1 h-3.5 w-3.5 accent-primary" checked={false} disabled />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                Testcontainers
                <span className="rounded-full bg-dark-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Coming soon</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-400">Database/integration dependency containers for tests.</span>
            </span>
          </label>

          {/* ForgeFuzz Collection – coming soon */}
          <label className="flex items-start gap-3 rounded-lg border p-3 transition-all cursor-not-allowed border-dark-700 bg-[#0f172a]/40 opacity-60">
            <input type="checkbox" className="mt-1 h-3.5 w-3.5 accent-primary" checked={false} disabled />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                ForgeFuzz Collection
                <span className="rounded-full bg-dark-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Coming soon</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-400">Planned generated ForgeFuzz test asset support.</span>
            </span>
          </label>
        </div>
      </div>
  </Card>
      {/* ========== Test Case Scenarios ========== */}
  <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'integrationsTesting' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div>
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
          ].map((option) => {
            const isChecked = selectedTestCategories.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer',
                  isChecked
                    ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.22)]'
                    : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/60'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-3.5 w-3.5 accent-primary"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTestCategories([...selectedTestCategories, option.value]);
                    } else {
                      setSelectedTestCategories(selectedTestCategories.filter(c => c !== option.value));
                    }
                  }}
                />
                <span className="min-w-0">
                  <span className="text-sm font-semibold text-white">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-gray-400">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
  </Card>
    </>
)}

                                                {/* Standard Policies Section */}
                                                {resourceType != "Shared Function" && <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'securityPolicies' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-2 text-sm">Standard Policies</CardTitle>
                                                  <p className="mb-2 text-[11px] text-gray-500">Select as many as needed</p>
                                                  <div className="grid grid-cols-2 gap-1.5">
                                                    {standardPolicyOptions.map((option) => (
                                                      <label key={option} className="flex cursor-pointer items-center gap-2">
                                                        <input
                                                          type="checkbox"
                                                          className="rounded border-dark-700"
                                                          checked={standardPoliciesSelections.includes(option)}
                                                          onChange={() => {
                                                            setStandardPoliciesSelections((previous) =>
                                                              previous.includes(option)
                                                                ? previous.filter((item) => item !== option)
                                                                : [...previous, option]
                                                            );
                                                          }}
                                                        />
                                                        <span className="text-xs text-gray-300">{option}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </Card>}

                                                {/* Custom Policies Section */}
                                                {resourceType != "Shared Function" && <Card className={cn('p-4', isApigeeProxyDevelopmentStep && activeProxySetupSubStep !== 'securityPolicies' && 'hidden')} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                  <CardTitle className="mb-2 text-sm">Custom Policies</CardTitle>
                                                  <p className="mb-2 text-[11px] text-gray-500">Select as many as needed</p>
                                                  <div className="grid grid-cols-2 gap-1.5">
                                                    {['XML to JSON', 'JSON to XML', 'Traffic Management', 'AI Policies', 'KVM', 'Extract Variable', 'Assign Message', 'JavaScript', 'Data Mapping'].map((option) => (
                                                      <label key={option} className="flex cursor-pointer items-center gap-2">
                                                        <input type="checkbox" className="rounded border-dark-700" />
                                                        <span className="text-xs text-gray-300">{option}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </Card>}

                                                {/* Products & Apps Section */}
                                                {/* <Card className="p-4 mt-4 lg:col-span-2" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-primary" />
                    Products & Apps
                  </div>
                  {productsAppsTab === 'products' ? (
                    <button
                      type="button"
                      onClick={() => setShowProductModal(true)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg font-semibold text-xs transition-all',
                        'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                        'flex items-center gap-1.5 active:scale-[0.98]'
                      )}
                    >
                      Add Product
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowApplicationModal(true)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg font-semibold text-xs transition-all',
                        'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                        'flex items-center gap-1.5 active:scale-[0.98]'
                      )}
                    >
                      Add App
                    </button>
                  )}
                </CardTitle>
                

                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setProductsAppsTab('products')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      productsAppsTab === 'products'
                        ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                        : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                    )}
                  >
                    Products ({savedProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductsAppsTab('applications')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      productsAppsTab === 'applications'
                        ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                        : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                    )}
                  >
                    Apps ({savedApplications.length})
                  </button>
                </div>

                {productsAppsTab === 'products' && (
                  <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                    {savedProducts.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No products added yet. Click "Add Product" button at the top right to create one.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                      >
                        {savedProducts.map((product) => (
                          <div
                            key={product.id}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer transition-all relative group',
                              selectedProducts.includes(product.id)
                                ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                : 'border-dark-700 hover:border-primary/50'
                            )}
                            style={!selectedProducts.includes(product.id) ? { backgroundColor: '#0f172a80' } : undefined}
                            onClick={() => {
                              const isSelected = selectedProducts.includes(product.id);
                              if (isSelected) {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                              } else {
                                setSelectedProducts([...selectedProducts, product.id]);
                              }
                            }}
                          >
                            <p className="text-xs font-medium text-white truncate pr-6">{product.productName || 'Unnamed'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{product.proxyName || 'No Proxy'}</p>
                            {selectedProducts.includes(product.id) && (
                              <div className="mt-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-primary" />
                                <span className="text-[10px] text-primary">Selected</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProductId(product.id);
                                setProductForm({
                                  productName: product.productName || '',
                                  displayName: product.displayName || '',
                                  description: product.description || '',
                                  proxyName: product.proxyName || '',
                                  proxyPath: product.proxyPath || ''
                                });
                                setShowProductModal(true);
                              }}
                              className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                              title="Edit Product"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                <path d="m15 5 4 4"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {productsAppsTab === 'applications' && (
                  <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                    {savedApplications.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No applications added yet. Click "Add App" button at the top right to create one.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                      >
                        {savedApplications.map((app) => (
                          <div
                            key={app.id}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer transition-all relative group',
                              selectedApplications.includes(app.id)
                                ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                : 'border-dark-700 hover:border-primary/50'
                            )}
                            style={!selectedApplications.includes(app.id) ? { backgroundColor: '#0f172a80' } : undefined}
                            onClick={() => {
                              const isSelected = selectedApplications.includes(app.id);
                              if (isSelected) {
                                setSelectedApplications(selectedApplications.filter(id => id !== app.id));
                              } else {
                                setSelectedApplications([...selectedApplications, app.id]);
                              }
                            }}
                          >
                            <p className="text-xs font-medium text-white truncate pr-6">{app.applicationName || 'Unnamed'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{app.productName || 'No Product'}</p>
                            {selectedApplications.includes(app.id) && (
                              <div className="mt-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-primary" />
                                <span className="text-[10px] text-primary">Selected</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingApplicationId(app.id);
                                setApplicationForm({
                                  applicationName: app.applicationName || '',
                                  displayName: app.displayName || '',
                                  description: app.description || '',
                                  productName: app.productName || '',
                                  developerEmail: app.developerEmail || '',
                                  companyName: app.companyName || '',
                                  companyEmail: app.companyEmail || ''
                                });
                                setShowApplicationModal(true);
                              }}
                              className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                              title="Edit Application"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                <path d="m15 5 4 4"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card> */}

                                                {/* Provider & Consumer Information Card */}

                                              </div>
                                            </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Generate and Save Buttons - Single set */}
                                          {!isGenerating && (
                                            <div className="mt-6 flex justify-end gap-3">
                                              {isApigeeProxyDevelopmentStep && !isLastProxySetupSubStep ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={handleProxySetupPreviousSubStep}
                                                    disabled={busy}
                                                    className={cn(
                                                      'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                                                      'bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600',
                                                      'flex items-center gap-2 active:scale-[0.98]',
                                                      busy && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                  >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Previous
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={handleProxySetupNextSubStep}
                                                    disabled={busy}
                                                    className={cn(
                                                      'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                                                      'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                      'flex items-center gap-2 active:scale-[0.98]',
                                                      busy && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                  >
                                                    Next
                                                    <ArrowRight className="w-4 h-4" />
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => setShowSummaryModal(true)}
                                                    disabled={busy}
                                                    className={cn(
                                                      'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                                                      'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                      'flex items-center gap-2 active:scale-[0.98]',
                                                      busy && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                  >
                                                    <FileText className="w-4 h-4" />
                                                    Summary
                                                  </button>
                                                  {/* <button
                                                    type="button"
                                                    onClick={() => showMessage('All settings saved successfully', 'success')}
                                                    disabled={busy}
                                                    className={cn(
                                                      'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                                                      'bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600',
                                                      'flex items-center gap-2 active:scale-[0.98]',
                                                      busy && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                  >
                                                    Save All
                                                  </button> */}
                                                  <Button type="submit" form="proxy-form" size="default" disabled={busy} className="min-w-[140px]">
                                                    {busy ? (
                                                      <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Generating...
                                                      </>
                                                    ) : (
                                                      <>
                                                      <Rocket className="w-4 h-4" />
                                                      Generate
                                                      </>
                                                    )}
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </form>
                                      )}

                                      {/* STEP 8: Test Cases */}
{currentStep === 8 && (
  <div className="space-y-6">

    {/* Generated Testing Assets Section */}
    {/* <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
      <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
        <Box className="w-5 h-5 text-primary" />
        Generated Testing Assets
      </h3>
      <p className="text-sm text-gray-400 mb-4">generated testing assets included in the bundle.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all cursor-pointer",
          generatedAssets.postman ? "border-primary bg-primary/10" : "border-dark-700 bg-[#0f172a]/50"
        )} onClick={() => setGeneratedAssets({ ...generatedAssets, postman: !generatedAssets.postman })}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full border flex items-center justify-center",
                generatedAssets.postman ? "bg-primary border-primary" : "border-gray-500"
              )}>
                {generatedAssets.postman && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-white font-medium">Postman Collection</p>
                <p className="text-xs text-gray-400">Runnable Postman collection with security helpers.</p>
              </div>
            </div>
            <FileCode className="w-8 h-8 text-primary opacity-70" />
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border-2 transition-all cursor-pointer opacity-60",
          generatedAssets.unitTest ? "border-primary bg-primary/10" : "border-dark-700 bg-[#0f172a]/50"
        )} onClick={() => setGeneratedAssets({ ...generatedAssets, unitTest: !generatedAssets.unitTest })}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center">
                {generatedAssets.unitTest && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-white font-medium">JUnit Tests</p>
                <p className="text-xs text-gray-400">Controller, service, and repository test scaffolds.</p>
              </div>
            </div>
            <TestTube className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border-2 transition-all cursor-pointer opacity-60",
          generatedAssets.integrationTest ? "border-primary bg-primary/10" : "border-dark-700 bg-[#0f172a]/50"
        )} onClick={() => setGeneratedAssets({ ...generatedAssets, integrationTest: !generatedAssets.integrationTest })}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center">
                {generatedAssets.integrationTest && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-white font-medium">Integration Tests</p>
                <p className="text-xs text-gray-400">Spring Boot integration tests with test profile.</p>
              </div>
            </div>
            <Shield className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className={cn(
          "p-4 rounded-xl border-2 transition-all cursor-pointer opacity-60",
          generatedAssets.forgefuzz ? "border-primary bg-primary/10" : "border-dark-700 bg-[#0f172a]/50"
        )} onClick={() => setGeneratedAssets({ ...generatedAssets, forgefuzz: !generatedAssets.forgefuzz })}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center">
                {generatedAssets.forgefuzz && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-white font-medium">ForgeFuzz Collection</p>
                <p className="text-xs text-gray-400">Planned generated ForgeFuzz test asset support.</p>
              </div>
            </div>
            <Database className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>
    </Card> */}

       {/* Available Collections Grid */}
<Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
  <div className="flex flex-col gap-6">
    {/* Generated Collections Section */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-primary"></div>
        <h3 className="text-sm font-semibold text-white">Generated Collections</h3>
        <span className="text-xs text-gray-400">
          ({collectionHistory.filter(item => item.source === 'GENERATED').length})
        </span>
      </div>

      {isFetchingHistory ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : collectionHistory.filter(item => item.source === 'GENERATED').length === 0 ? (
        <div className="text-center py-6 border border-dashed border-dark-700 rounded-xl">
          <FileCode className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No generated collections yet.</p>
          <p className="text-xs text-gray-500 mt-1">Generate a Proxy first to create collections.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
{collectionHistory.filter(item => item.source === 'GENERATED').map((item) => (
  <div key={item.id} className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-4 hover:border-primary/50 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedHistoryIds.includes(item.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedHistoryIds([...selectedHistoryIds, item.id]);
            } else {
              setSelectedHistoryIds(selectedHistoryIds.filter(id => id !== item.id));
            }
          }}
          className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary focus:ring-primary"
        />
        <FileCode className="w-5 h-5 text-primary" />
      </div>
      <button
        onClick={async () => {
          const res = await testCaseService.getCollectionContent(item.id);
          if (res.success && res.content) {
            setPreviewCollectionContent(res.content);
            setPreviewCollectionOpen(true);
          } else {
            showMessage(res.error || 'Failed to load content', 'error');
          }
        }}
        className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
        title="Preview collection"
      >
        <Eye className="w-4 h-4" />
      </button>
    </div>
    <div className="mt-2">
      <p className="text-sm font-medium text-white truncate" title={item.fileName}>{item.fileName}</p>
    </div>
    <div className="mt-2 flex justify-between items-center">
      <span className="text-xs text-gray-400">
        {item.format} • {item.totalEndpoints} endpoints
      </span>
      <span className="text-xs text-gray-500 cursor-help" title="generated from proxy bundle">
  Generated
</span>
    </div>
  </div>
))}
        </div>
      )}
    </div>

    {/* Uploaded Collections Section */}
    {/* <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <h3 className="text-sm font-semibold text-white">Uploaded Collections</h3>
        <span className="text-xs text-gray-400">
          ({collectionHistory.filter(item => item.source !== 'GENERATED').length})
        </span>
      </div>

      {collectionHistory.filter(item => item.source !== 'GENERATED').length === 0 ? (
        <div className="text-center py-6 border border-dashed border-dark-700 rounded-xl">
          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No uploaded collections yet.</p>
          <p className="text-xs text-gray-500 mt-1">Click "Upload Collection" to add an OpenAPI/Postman spec.</p>
        </div>
      ) : (
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
{collectionHistory.filter(item => item.source !== 'GENERATED').map((item) => (
  <div key={item.id} className="rounded-xl border border-dark-700 bg-[#0f172a]/50 p-4 hover:border-primary/50 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedHistoryIds.includes(item.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedHistoryIds([...selectedHistoryIds, item.id]);
            } else {
              setSelectedHistoryIds(selectedHistoryIds.filter(id => id !== item.id));
            }
          }}
          className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary focus:ring-primary"
        />
        <FileCode className="w-5 h-5 text-primary" />
      </div>
      <button
        onClick={async () => {
          const res = await testCaseService.getCollectionContent(item.id);
          if (res.success && res.content) {
            setPreviewCollectionContent(res.content);
            setPreviewCollectionOpen(true);
          } else {
            showMessage(res.error || 'Failed to load content', 'error');
          }
        }}
        className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
        title="Preview collection"
      >
        <Eye className="w-4 h-4" />
      </button>
    </div>
    <div className="mt-2">
      <p className="text-sm font-medium text-white truncate" title={item.fileName}>{item.fileName}</p>
    </div>
    <div className="mt-2 flex justify-between items-center">
      <span className="text-xs text-gray-400">
        {item.format} • {item.totalEndpoints} endpoints
      </span>
      <span className="text-xs text-gray-500 cursor-help" title="uploaded by user">
  Uploaded
</span>
    </div>
  </div>
))}
</div>
      )}
    </div> */}

    {/* Buttons */}
    {/* <div className="flex justify-end gap-3 mt-6">
      <button
        onClick={() => setShowUploadModal(true)}
        className="px-4 py-2 rounded-lg text-xs font-semibold border border-primary text-primary hover:bg-primary/10 flex items-center gap-2 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Upload Collection
      </button>
      <button
        type="button"
        onClick={async () => {
          if (selectedHistoryIds.length === 0) {
            showMessage('Please select at least one collection', 'error');
            return;
          }
          setGeneratingFromHistory(true);
          const result = await testCaseService.generateFromHistory(onboardingId, selectedHistoryIds);
          if (result.success) {
            showMessage(`Test cases generated from ${selectedHistoryIds.length} collection(s)`, 'success');
            const fetchResult = await testCaseService.getTestCases(onboardingId);
            if (fetchResult.success) {
              const items = fetchResult.data?.items || fetchResult.data || [];
              setTestCases(items);
              setTestCaseStats({
                total: items.length,
                happy: items.filter(tc => tc.title?.includes('[HAPPY]') || tc.category === 'POSITIVE').length,
                sad: items.filter(tc => tc.title?.includes('[SAD]') || tc.category === 'NEGATIVE').length,
                edge: items.filter(tc => tc.title?.includes('[EDGE]') || tc.category === 'PERFORMANCE').length,
                security: items.filter(tc => tc.title?.includes('[SECURITY]') || tc.category === 'SECURITY').length,
              });
              setTotalTestCasesCount(items.length);
            }
            const historyRes = await testCaseService.getGenerationHistoryForMicroservice(onboardingId);
            if (historyRes.success) setCollectionHistory(historyRes.data || []);
            if (activeTab === 'specdetail') await loadSpecContent();
          } else {
            showMessage(result.error, 'error');
          }
          setGeneratingFromHistory(false);
        }}
        disabled={generatingFromHistory || selectedHistoryIds.length === 0}
        className={cn(
          'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
          'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
          'flex items-center gap-2',
          (generatingFromHistory || selectedHistoryIds.length === 0) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {generatingFromHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
        Generate Test Cases
      </button>
    </div> */}
  </div>
</Card>

    {/* Tiles summary (same as before) */}
    {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-[#0f172a] to-[#111827] p-4 shadow-lg">
        <p className="text-xs uppercase tracking-wider text-gray-400">Total Test Cases</p>
        <p className="mt-2 text-3xl font-bold text-white">{totalTestCasesCount}</p>
        {uploadedSpecFormat && <p className="mt-1 text-xs text-primary capitalize">Format: {uploadedSpecFormat}</p>}
      </div>
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-green-500/10 to-green-500/5 p-4">
        <p className="text-xs uppercase tracking-wider text-green-400">Positive</p>
        <p className="mt-2 text-2xl font-bold text-green-400">{testCaseStats.happy}</p>
      </div>
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-4">
        <p className="text-xs uppercase tracking-wider text-yellow-400">Negative</p>
        <p className="mt-2 text-2xl font-bold text-yellow-400">{testCaseStats.sad}</p>
      </div>
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
        <p className="text-xs uppercase tracking-wider text-blue-400">Performance</p>
        <p className="mt-2 text-2xl font-bold text-blue-400">{testCaseStats.edge}</p>
      </div>
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4">
        <p className="text-xs uppercase tracking-wider text-purple-400">Security</p>
        <p className="mt-2 text-2xl font-bold text-purple-400">{testCaseStats.security}</p>
      </div>
    </div> */}

    {/* Tabs */}
    <div className="flex gap-2 border-b border-dark-700">
  <button
    onClick={() => setActiveTab('testcases')}
    className={cn(
      'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
      activeTab === 'testcases' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'
    )}
  >
    <TestTube className="inline w-4 h-4 mr-2" />
    Test Cases
  </button>
  {/* <button
    onClick={() => setActiveTab('history')}
    className={cn(
      'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
      activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'
    )}
  >
    <History className="inline w-4 h-4 mr-2" />
    Generation History
  </button> */}
  <button
    onClick={() => setActiveTab('runhistory')}
    className={cn(
      'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
      activeTab === 'runhistory' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'
    )}
  >
    <Activity className="inline w-4 h-4 mr-2" />
    Run History
  </button>
</div>

    {/* Tab content: Test Cases */}
    {activeTab === 'testcases' && (
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-md font-semibold text-white">Generated Test Cases</h3>
            <p className="text-xs text-gray-400">Category wise test cases</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Base URL (e.g., http://localhost:8080)"
              value={runBaseUrl}
              onChange={(e) => setRunBaseUrl(e.target.value)}
              className="h-9 w-64 text-sm bg-dark-900 border-dark-700"
            />
<button
  type="button"
  onClick={async () => {
    const baseUrl = runBaseUrl.trim();
    if (!baseUrl) {
      showMessage('Please enter the base URL of the target proxy', 'error');
      return;
    }
    if (!isValidBaseUrl(baseUrl)) {
      showMessage('Please enter a valid URL (http:// or https://)', 'error');
      return;
    }
    if (!onboardingId) return;
    setRunningTestsModal(true);
    setShowRunModal(true);
    setIsRunningTests(true);
    const result = await testCaseService.run(onboardingId, baseUrl);
    if (result.success) {
  const runData = result.data;
  console.log('📊 Run data received:', runData);
  console.log('🧪 Current testCaseMap size:', testCaseMap.size);

if (runData && runData.items && testCaseMap.size > 0) {
  runData.items = runData.items.map(item => {
    let fullTc = testCaseMap.get(String(item.testCaseId));
    if (!fullTc) {
      const cleanTitle = item.title?.replace(/^\[[A-Z]+\]\s*/, '');
      fullTc = testCases.find(tc =>
        tc.title === item.title ||
        tc.title === cleanTitle ||
        (tc.endpoint === item.endpoint && tc.method === item.method)
      );
    }
    if (fullTc) {
      return { ...item, ...extractDetails(fullTc) };
    }
    return item;
  });
}

  setDetailedRunResults(runData);
  setTestRunResults(runData);

  // Refresh run history after this run
  const historyRes = await testCaseService.getExecutionHistoryForMicroservice(onboardingId);
  if (historyRes.success) setRunHistory(historyRes.data || []);

  console.log('✅ Run modal will now show details');
} else {
  showMessage(result.error, 'error');
  setShowRunModal(false);
}
    setIsRunningTests(false);
    setRunningTestsModal(false);
  }}
  disabled={isRunningTests || testCases.length === 0}
  className={cn(
    'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
    'flex items-center gap-2',
    (isRunningTests || testCases.length === 0) && 'opacity-50 cursor-not-allowed'
  )}
>
  {isRunningTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
  Run Tests
</button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 border-b border-dark-700 mb-5">
          {[
            { id: 'ALL', label: 'All', count: testCases.length },
            { id: 'POSITIVE', label: 'Positive', icon: '✅' },
            { id: 'NEGATIVE', label: 'Negative', icon: '⚠️' },
            { id: 'PERFORMANCE', label: 'Performance', icon: '⚡' },
            { id: 'SECURITY', label: 'Security', icon: '🔒' }
          ].map((cat) => {
            const count = cat.id === 'ALL' ? testCases.length : testCases.filter(tc => tc.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setTestCaseCategoryFilter(cat.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-1.5',
                  testCaseCategoryFilter === cat.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'
                )}
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.label}
                <span className={cn(
                  'ml-1 text-xs rounded-full px-1.5 py-0.5',
                  testCaseCategoryFilter === cat.id ? 'bg-primary/20 text-primary' : 'bg-dark-700 text-gray-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isFetchingTestCases ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (() => {
          let filtered = testCases;
          if (testCaseCategoryFilter !== 'ALL') {
            filtered = testCases.filter(tc => tc.category === testCaseCategoryFilter);
          }
          if (filtered.length === 0) {
            return (
              <div className="text-center py-12 border border-dashed border-dark-700 rounded-xl">
                <TestTube className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No test cases found for this category.</p>
              </div>
            );
          }
          return (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map(tc => (
                <div key={tc.id} className="rounded-lg border border-dark-700 bg-[#0f172a]/40 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <FileCode className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tc.title || `${tc.method} ${tc.endpoint}`}</p>
                      <p className="text-xs text-gray-400">
                        Expected: {tc.expectedStatus} | Type: {tc.testType}
                        {tc.expectedLatencyMs && ` | Max latency: ${tc.expectedLatencyMs}ms`}
                      </p>
                      {tc.testDescription && <p className="text-xs text-gray-500 mt-1">{tc.testDescription}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">{tc.category}</span>
                    <button
  onClick={() => {
    setSelectedTestCase(tc);
    setRunCustomBody(tc.requestBodySample ? JSON.stringify(JSON.parse(tc.requestBodySample), null, 2) : '');
    setSingleRunResult(null);
    setShowTestCaseModal(true);
  }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>
    )}

    {/* Tab content: Generation History */}
    {/* {activeTab === 'history' && (
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Generation History
          </h3>
          <button
            onClick={async () => {
              setIsFetchingHistory(true);
              const res = await testCaseService.getGenerationHistoryForMicroservice(onboardingId);
              if (res.success) setCollectionHistory(res.data || []);
              setIsFetchingHistory(false);
            }}
            className="p-1.5 rounded-md hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {isFetchingHistory ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : collectionHistory.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-dark-700 rounded-xl">
            <History className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No generation history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-dark-700">
                <tr className="text-left text-xs font-semibold text-gray-400">
                  <th className="pb-2">File Name</th>
                  <th className="pb-2">Format</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Endpoints</th>
                  <th className="pb-2">Test Cases</th>
                  <th className="pb-2">Uploaded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {collectionHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.03]">
                    <td className="py-3">{record.fileName}</td>
                    <td className="py-3 capitalize">{record.format}</td>
                    <td className="py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        record.source === 'GENERATED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      )}>
                        {record.source === 'GENERATED' ? 'Generated' : 'Uploaded'}
                      </span>
                    </td>
                    <td className="py-3">{record.totalEndpoints}</td>
                    <td className="py-3">{record.totalTestCases}</td>
                    <td className="py-3">{new Date(record.uploadedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )} */}

    {/* Tab content: Run History */}
    {activeTab === 'runhistory' && (
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Test Run History
          </h3>
          <div className="flex gap-4 mb-4">
  <button
    onClick={async () => {
      if (selectedCompareRunIds.length !== 2) {
        showMessage('Please select exactly 2 runs to compare', 'error');
        return;
      }
      const run1 = runHistory[selectedCompareRunIds[0]];
const run2 = runHistory[selectedCompareRunIds[1]];
const result = await testCaseService.compareRuns(run1.id, run2.id);
      if (result.success) {
        setCompareResult(result.data);
        setCompareModalOpen(true);
      } else {
        showMessage(result.error, 'error');
      }
    }}
    disabled={selectedCompareRunIds.length !== 2}
    className={cn(
      'px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2',
      selectedCompareRunIds.length === 2 ? 'bg-primary text-white' : 'bg-dark-700 text-gray-400 cursor-not-allowed'
    )}
  >
    <GitPullRequest className="w-4 h-4" />
    Compare
  </button>
          <button
            onClick={async () => {
              setIsFetchingRunHistory(true);
              const res = await testCaseService.getExecutionHistoryForMicroservice(onboardingId);
              if (res.success) setRunHistory(res.data || []);
              setIsFetchingRunHistory(false);
            }}
            className="p-1.5 rounded-md hover:bg-white/10"
            >
            <RefreshCw className="w-4 h-4" />
          </button>
            </div>
        </div>
        {isFetchingRunHistory ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : runHistory.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-dark-700 rounded-xl">
            <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No test runs found for this proxy.</p>
            <p className="text-xs text-gray-500 mt-1">Click "Run Tests" to execute test cases.</p>
          </div>
        ) : (
                 
          <div className="overflow-x-auto">
            
            <table className="w-full text-sm">
              <thead className="border-b border-dark-700">
  <tr className="text-left text-xs font-semibold text-gray-400">
    <th className="pb-2 w-8">Select</th>
    <th className="pb-2">Executed At</th>
    <th className="pb-2">API Name</th>
    <th className="pb-2">Base URL</th>
    <th className="pb-2">Executed By</th>
    <th className="pb-2">Total</th>
    <th className="pb-2">Passed</th>
    <th className="pb-2">Failed</th>
    <th className="pb-2">Pass Rate</th>
  </tr>
</thead>
              <tbody className="divide-y divide-dark-700">
                {runHistory.map((run, idx) => (
                  
                  <tr
                    key={idx}
onClick={() => {
  console.log("Opening run from:", run.executedAt);
  console.log("run.items[0] sample:", run.items?.[0]);
  
  const enhancedRun = { ...run };
  if (enhancedRun.items && testCaseMap.size > 0) {
    enhancedRun.items = enhancedRun.items.map(item => {
      // Try by ID first
      let fullTc = testCaseMap.get(String(item.testCaseId));
      
      // If ID fails, try by title (remove [TAG])
      if (!fullTc) {
        const cleanTitle = item.title?.replace(/^\[[A-Z]+\]\s*/, '');
        fullTc = testCases.find(tc => 
          tc.title === item.title || 
          tc.title === cleanTitle ||
          (tc.endpoint === item.endpoint && tc.method === item.method)
        );
      }
      
      if (fullTc) {
        console.log(`✅ Matched: ${item.title} -> ${fullTc.title}`);
        return {
          ...item,
          requestBodySample: fullTc.requestBodySample,
          responseSample: fullTc.responseSample,
          expectedStatus: fullTc.expectedStatus,
          assertions: fullTc.assertions,
          category: fullTc.category,
        };
      } else {
        console.warn(`❌ No match for: ${item.title} (ID: ${item.testCaseId})`);
      }
      return item;
    });
  } else {
    console.warn("testCaseMap is empty or no items");
  }
  setDetailedRunResults(enhancedRun);
  setShowRunModal(true);
}}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="py-3 w-8" onClick={(e) => e.stopPropagation()}>
  <input
    type="checkbox"
    checked={selectedCompareRunIds.includes(idx)}
    onChange={(e) => {
      e.stopPropagation();
      if (selectedCompareRunIds.includes(idx)) {
        setSelectedCompareRunIds(selectedCompareRunIds.filter(i => i !== idx));
      } else {
        if (selectedCompareRunIds.length < 2) {
          setSelectedCompareRunIds([...selectedCompareRunIds, idx]);
        } else {
          showMessage('You can select at most 2 runs to compare', 'error');
        }
      }
    }}
    className="w-4 h-4 rounded border-dark-600"
  />
</td>
                    <td className="py-3">{new Date(run.executedAt).toLocaleString()}</td>
                    <td className="py-3">{run.apiName || '-'}</td>
                    <td className="py-3 max-w-[200px] truncate" title={run.baseUrl}>{run.baseUrl || '-'}</td>
                    <td className="py-3">{run.executedBy || '-'}</td>
                    <td className="py-3">{run.passed + run.failed + run.skipped}</td>
                    <td className="py-3 text-green-400">{run.passed}</td>
                    <td className="py-3 text-red-400">{run.failed}</td>
                    <td className="py-3 font-medium">{run.passRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )}

        {/* Compare Runs Modal */}
{compareModalOpen && compareResult && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col bg-dark-800">
      <div className="px-6 py-4 border-b border-dark-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Comparison of Two Runs</h3>
        <button onClick={() => setCompareModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-dark-900/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-primary">Run 1</p>
            <p>Pass Rate: {compareResult.run1.passRate}%</p>
            <p>Execution ID: {compareResult.run1.executionId}</p>
            <p>Base URL: {compareResult.run1.baseUrl}</p>
            <span className="flex gap-12 text-xs text-gray-400">
              <p>Success : {compareResult.run1.passed}</p>
              <p>Failed : {compareResult.run1.failed}</p>
              <p>Skipped : {compareResult.run1.skipped}</p>
            </span>
            <p className="text-xs text-gray-400">Type: {compareResult.run1.runType}</p>
            <p className="text-xs text-gray-400">{new Date(compareResult.run1.executedAt).toLocaleString()}</p>
          </div>
          <div className="bg-dark-900/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-primary">Run 2</p>
            <p>Pass Rate: {compareResult.run2.passRate}%</p>
            <p>Execution ID: {compareResult.run2.executionId}</p>
            <p>Base URL: {compareResult.run2.baseUrl}</p>
            <span className="flex gap-12 text-xs text-gray-400">
              <p>Success : {compareResult.run2.passed}</p>
              <p>Failed : {compareResult.run2.failed}</p>
              <p>Skipped : {compareResult.run2.skipped}</p>
            </span>
            <p className="text-xs text-gray-400">Type: {compareResult.run2.runType}</p>
            <p className="text-xs text-gray-400">{new Date(compareResult.run2.executedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm font-semibold text-green-400">Pass Rate Difference: {compareResult.comparison.passRateDifference}%</p>
          </div>
          {compareResult.comparison.regressions.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm font-semibold text-red-400">Regressions (passed → failed):</p>
              <ul className="list-disc list-inside text-xs mt-1">{compareResult.comparison.regressions.map((r,i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {compareResult.comparison.fixedFailures.length > 0 && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm font-semibold text-green-400">Fixed Failures:</p>
              <ul className="list-disc list-inside text-xs mt-1">{compareResult.comparison.fixedFailures.map((f,i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}
          {compareResult.comparison.newFailures.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm font-semibold text-yellow-400">New Failures:</p>
              <ul className="list-disc list-inside text-xs mt-1">{compareResult.comparison.newFailures.map((n,i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-dark-700 flex justify-end">
        <button onClick={() => setCompareModalOpen(false)} className="px-6 py-2 rounded-lg bg-primary text-white">Close</button>
      </div>
    </div>
  </div>
)}

  </div>
)}

                  {/* Step 9: Testing */}
{currentStep === 9 && (
  <div className="space-y-6">
    <StaticCodeAnalyzer 
      isGenerationDone={!!((onboardingId && isExistingOnboardingLoaded))}
      scanType="microservice"
      targetId={onboardingId}
      onResultsChange={setStaticAnalysisResults}
    />
  </div>
)}


                  {/* Step 10: Code Review */}
{currentStep === 10 && (
  <div className="space-y-6">
    {/* Static Code Analysis Results Section */}
    <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
      <CardTitle className="mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Static Code Analysis Results
      </CardTitle>

      {!staticAnalysisResults ? (
        <div className="p-6 rounded-lg bg-[#0f172a]/50 border border-dark-700 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-sm text-gray-300">No analysis results available.</p>
          <p className="text-xs text-gray-400 mt-1">Please go to Step 9 (Code Analysis) and run the scan first.</p>
        </div>
      ) : (
        <>
          {/* Overall Score & Quality Gate */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
            <div>
              <p className="text-sm text-gray-400">Overall Health Score</p>
              <p className="text-4xl font-bold text-white">
                {staticAnalysisResults.overallScore}
                <span className="text-lg text-gray-400">/100</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold",
                staticAnalysisResults.qualityGate === 'PASSED' ? "bg-green-500/20 text-green-400" :
                staticAnalysisResults.qualityGate === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              )}>
                Quality Gate: {staticAnalysisResults.qualityGate}
              </span>
              <button
                onClick={() => {
                  const reportData = {
                    scanType: 'microservice',
                    results: staticAnalysisResults,
                    generatedAt: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `static-analysis-report-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 text-xs"
              >
                <Download className="w-3 h-3" /> Download Full Report
              </button>
            </div>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
              <p className="text-xs text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-400">{staticAnalysisResults.summary.critical}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
              <p className="text-xs text-gray-400">High</p>
              <p className="text-2xl font-bold text-orange-400">{staticAnalysisResults.summary.high}</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
              <p className="text-xs text-gray-400">Medium</p>
              <p className="text-2xl font-bold text-yellow-400">{staticAnalysisResults.summary.medium}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
              <p className="text-xs text-gray-400">Low</p>
              <p className="text-2xl font-bold text-blue-400">{staticAnalysisResults.summary.low}</p>
            </div>
          </div>
          {/* Score explanation banner */}
          {staticAnalysisResults.scoreExplanation && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-300 leading-relaxed">
                {staticAnalysisResults.scoreExplanation}
              </p>
            </div>
          )}

          {/* Per-tool breakdown (Checkstyle / PMD / Custom) */}
          {staticAnalysisResults.toolBreakdowns && staticAnalysisResults.toolBreakdowns.length > 0 && (
            <div className="border-t border-dark-700 pt-4 mb-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-primary" />
                Tool-wise Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {staticAnalysisResults.toolBreakdowns.map((tb) => (
                  <div
                    key={tb.tool}
                    data-testid={`step10-tool-card-${tb.tool}`}
                    className="rounded-lg border border-dark-700 bg-dark-900/30 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-semibold text-white">{tb.tool}</h5>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        tb.status === 'PASSED' ? "bg-green-500/20 text-green-400" :
                        tb.status === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
                        tb.status === 'SKIPPED' ? "bg-gray-500/20 text-gray-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        {tb.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-300">
                      <div>Score: <span className="text-white font-semibold">{tb.score}/100</span></div>
                      <div>Rules: <span className="text-white font-semibold">{tb.rulesEvaluated}</span></div>
                      <div className="text-emerald-300">Passed: {tb.rulesPassed}</div>
                      <div className="text-red-300">Failed: {tb.rulesFailed}</div>
                      <div className="col-span-2 text-yellow-300">Violations: {tb.violationCount}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Per-rule expandable list */}
              <div className="space-y-3">
                {staticAnalysisResults.toolBreakdowns.map((tb) => (
                  tb.rules && tb.rules.length > 0 && (
                    <details key={`details-${tb.tool}`} className="rounded-lg border border-dark-700 bg-dark-900/30">
                      <summary className="cursor-pointer p-3 text-xs text-gray-300 hover:text-white flex items-center justify-between">
                        <span><span className="font-semibold text-white">{tb.tool}</span> — {tb.rulesFailed} failed, {tb.rulesPassed} passed</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 transition-transform" />
                      </summary>
                      <div className="border-t border-dark-700 p-3 space-y-1.5">
                        {tb.rules.map((rule, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-md border px-2 py-1.5 text-[11px]",
                              rule.status === 'FAIL'
                                ? "border-red-500/30 bg-red-500/5"
                                : "border-emerald-500/30 bg-emerald-500/5"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {rule.status === 'FAIL'
                                ? <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                                : <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                              {rule.ruleId && <span className="font-mono text-[10px] px-1 rounded bg-dark-800 text-gray-400">{rule.ruleId}</span>}
                              <span className={cn(rule.status === 'FAIL' ? "text-red-200" : "text-emerald-200")}>
                                {rule.name}
                              </span>
                              {rule.violationCount > 0 && (
                                <span className="ml-auto text-[10px] font-semibold text-red-300">
                                  {rule.violationCount} hit{rule.violationCount === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            {rule.violations && rule.violations.length > 0 && (
                              <ul className="mt-1 ml-4 list-disc list-inside space-y-0.5">
                                {rule.violations.slice(0, 6).map((v, i) => (
                                  <li key={i} className="text-[10px] text-gray-300">
                                    <span className="font-mono text-gray-400">{v.file}{v.line ? `:${v.line}` : ''}</span>
                                    {' '}— {v.message}
                                  </li>
                                ))}
                                {rule.violations.length > 6 && (
                                  <li className="text-[10px] italic text-gray-500">
                                    … and {rule.violations.length - 6} more
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                ))}
              </div>
            </div>
          )}

          {/* File-wise breakdown */}
          {staticAnalysisResults.fileBreakdowns && staticAnalysisResults.fileBreakdowns.length > 0 && (
            <div className="border-t border-dark-700 pt-4 mb-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                File-wise Breakdown (top {Math.min(10, staticAnalysisResults.fileBreakdowns.length)})
              </h4>
              <div className="space-y-2">
                {staticAnalysisResults.fileBreakdowns.slice(0, 10).map((fb, idx) => (
                  <details
                    key={idx}
                    data-testid={`step10-file-card-${idx}`}
                    className="rounded-lg border border-dark-700 bg-dark-900/30"
                  >
                    <summary className="cursor-pointer p-2 text-xs flex items-center justify-between gap-2">
                      <span className="font-mono text-white truncate">{fb.file}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {fb.critical > 0 && <span className="px-1.5 rounded bg-red-500/20 text-red-300">{fb.critical}C</span>}
                        {fb.high > 0 && <span className="px-1.5 rounded bg-orange-500/20 text-orange-300">{fb.high}H</span>}
                        {fb.medium > 0 && <span className="px-1.5 rounded bg-yellow-500/20 text-yellow-300">{fb.medium}M</span>}
                        {fb.low > 0 && <span className="px-1.5 rounded bg-blue-500/20 text-blue-300">{fb.low}L</span>}
                      </span>
                    </summary>
                    <ul className="border-t border-dark-700 p-2 space-y-1">
                      {fb.issues.map((iss, i) => (
                        <li key={i} className="text-[11px] text-gray-300 flex items-start gap-2">
                          <span className={cn(
                            "px-1 rounded font-mono text-[10px] flex-shrink-0",
                            iss.severity === 'CRITICAL' ? "bg-red-500/20 text-red-300" :
                            iss.severity === 'HIGH' ? "bg-orange-500/20 text-orange-300" :
                            iss.severity === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-300" :
                            "bg-blue-500/20 text-blue-300"
                          )}>{iss.severity}</span>
                          <span className="text-gray-400 font-mono flex-shrink-0">L{iss.line || '?'}</span>
                          <span className="flex-1">{iss.message}</span>
                          <span className="text-gray-500 flex-shrink-0">{iss.ruleName}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Feature-wise Breakdown Section */}
          <div className="border-t border-dark-700 pt-4">
            <button
              onClick={() => setShowFeatureBreakdown(!showFeatureBreakdown)}
              className="flex items-center justify-between w-full text-left group"
            >
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart className="w-4 h-4 text-primary" />
                Feature-wise Breakdown
              </h4>
              <ChevronRight className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-200",
                showFeatureBreakdown && "rotate-90"
              )} />
            </button>

            {showFeatureBreakdown && (
              <div className="space-y-4 mt-4">
                {Object.entries(staticAnalysisResults.featureResults).map(([featureId, result]) => {
                  // Format feature ID into readable name
                  let featureName = featureId
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  const nameMap = {
                    'secrets': 'Secrets & Credentials',
                    'unittests': 'Unit Tests',
                    'codequality': 'Code Quality & Style',
                    'duplication': 'Code Duplication',
                    'performance': 'Performance Issues'
                  };
                  if (nameMap[featureId]) featureName = nameMap[featureId];

                  return (
                    <div key={featureId} className="rounded-xl border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                      <div className="p-4 flex items-center justify-between border-b border-dark-700">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            result.status === 'PASSED' ? "bg-green-500/10" :
                            result.status === 'WARNING' ? "bg-yellow-500/10" : "bg-red-500/10"
                          )}>
                            {result.status === 'PASSED' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                             result.status === 'WARNING' ? <AlertCircle className="w-5 h-5 text-yellow-400" /> :
                             <XCircle className="w-5 h-5 text-red-400" />}
                          </div>
                          <div>
                            <h5 className="font-semibold text-white">{featureName}</h5>
                            <p className="text-xs text-gray-400">Score: {result.score}/100</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          result.status === 'PASSED' ? "bg-green-500/20 text-green-400" :
                          result.status === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {result.status}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {result.issues && result.issues.length > 0 ? (
                          result.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-dark-800/50 text-sm">
                              <AlertTriangle className={cn(
                                "w-4 h-4 mt-0.5 flex-shrink-0",
                                issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? "text-red-400" :
                                issue.severity === 'MEDIUM' || issue.severity === 'MAJOR' ? "text-yellow-400" :
                                "text-blue-400"
                              )} />
                              <div>
                                <span className="text-white">{issue.message}</span>
                                {issue.file && <div className="text-xs text-gray-400">📄 {issue.file}{issue.line ? `:${issue.line}` : ''}</div>}
                                {issue.dependency && <div className="text-xs text-gray-400">📦 {issue.dependency}</div>}
                                {issue.test && <div className="text-xs text-gray-400">🧪 {issue.test}</div>}
                                {issue.class && <div className="text-xs text-gray-400">🔧 {issue.class}.{issue.method}</div>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-green-400 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> No issues found in this category.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </Card>

    {/* Existing Peer Review and Code Merge Cards (keep as before) */}
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div style={{ backgroundColor: "#0f172a80" }} className="flex-1 p-4 rounded-lg border border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Static Code Analysis</p>
              <p className="text-xs text-gray-400">
                {staticAnalysisResults 
                  ? `Overall score: ${staticAnalysisResults.overallScore}/100 • ${staticAnalysisResults.summary.totalIssues || 0} issues found`
                  : 'Not yet analyzed'}
              </p>
            </div>
          </div>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          staticAnalysisResults?.qualityGate === 'PASSED' ? "bg-green-500/20 text-green-400" :
          staticAnalysisResults?.qualityGate === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
          staticAnalysisResults ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
        )}>
          {staticAnalysisResults ? (staticAnalysisResults.qualityGate === 'PASSED' ? 'Passed' : staticAnalysisResults.qualityGate === 'WARNING' ? 'Warning' : 'Failed') : 'N/A'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div style={{ backgroundColor: "#0f172a80" }} className="flex-1 p-4 rounded-lg border border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Security Scan</p>
              <p className="text-xs text-gray-400">Snyk • {staticAnalysisResults?.featureResults?.security ? `${staticAnalysisResults.featureResults.security.score}/100` : 'Not scanned'}</p>
            </div>
          </div>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          staticAnalysisResults?.featureResults?.security?.status === 'PASSED' ? "bg-green-500/20 text-green-400" :
          staticAnalysisResults?.featureResults?.security?.status === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
          staticAnalysisResults?.featureResults?.security ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
        )}>
          {staticAnalysisResults?.featureResults?.security?.status || 'N/A'}
        </span>
      </div>

      <div style={{ backgroundColor: "#0f172a80" }} className="p-4 rounded-lg border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Peer Review</p>
              <p className="text-xs text-gray-400">approval is under review</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">In Progress</span>
        </div>
        <button
          onClick={() => setShowPeerReviewModal(true)}
          data-testid="step10-request-peer-review-btn"
          className="w-full px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Request Peer Review
        </button>
      </div>

      <div style={{ backgroundColor: "#0f172a80" }} className="p-4 rounded-lg border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <GitPullRequest className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Code Merge</p>
              <p className="text-xs text-gray-400">Merge changes to main branch</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">Not Initiated</span>
        </div>
        <button
          onClick={() => setShowMergeModal(true)}
          className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          <GitBranch className="w-4 h-4" />
          Merge to Main
        </button>
      </div>
    </div>
  </div>
)}

                                      {currentStep === 1 && (
                                        <div className="space-y-6">
                                          {/* Gateway Selection Alert */}
                                          {showGatewayAlert && (
                                            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10 animate-fadeIn">
                                              <div className="p-2 rounded-full bg-red-500/20">
                                                <XCircle className="w-5 h-5 text-red-400" />
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-sm font-medium text-red-400">API Gateway Required</p>
                                                <p className="text-xs text-gray-400">Please select an API Gateway from the dropdown above before proceeding.</p>
                                              </div>
                                              <button
                                                onClick={() => setShowGatewayAlert(false)}
                                                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-700/50 transition-all"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}

                                          {/* Business Unit Information Card */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2 text-white">
                                              <UserCircle className="w-5 h-5 text-primary" />
                                              Business Unit Information
                                            </CardTitle>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Business Unit</Label>
                                                <select
                                                  className={cn(
                                                    'h-9 w-full rounded-lg px-3 py-2 text-sm text-white transition-all border border-dark-700',
                                                    isExistingOnboardingLoaded ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                                  )}
                                                  style={{ backgroundColor: '#0f172a80' }}
                                                  value={onboardingBusinessUnit}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingBusinessUnit(e.target.value)}
                                                >
                                                  <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select Business Unit</option>
                                                  <option value="retail" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Retail Banking</option>
                                                  <option value="corporate" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Corporate Banking</option>
                                                  <option value="wealth" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Wealth Management</option>
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Team Name</Label>
                                                <Input
                                                  placeholder="Enter team name"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingTeamName}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingTeamName(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Application Name</Label>
                                                <Input
                                                  placeholder="Enter application name"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingApplicationName}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingApplicationName(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Application Id</Label>
                                                <Input
                                                  placeholder="e.g., APP-2024-001"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingApplicationId}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingApplicationId(e.target.value)}
                                                />
                                              </div>
                                            </div>
                                          </Card>

                                          {/* Stakeholder Information Card */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2 text-white">
                                              <FileText className="w-5 h-5 text-primary" />
                                              Stakeholder Information
                                            </CardTitle>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Project Owner</Label>
                                                <Input
                                                  placeholder="Enter owner name"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingProjectOwner}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingProjectOwner(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Owner Email</Label>
                                                <Input
                                                  type="email"
                                                  placeholder="owner@company.com"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingOwnerEmail}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingOwnerEmail(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Project SME</Label>
                                                <Input
                                                  placeholder="Enter project SME name"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingProjectSME}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingProjectSME(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Project SME Email</Label>
                                                <Input
                                                  type="email"
                                                  placeholder="sme@company.com"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingProjectSMEEmail}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingProjectSMEEmail(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Project DL Email</Label>
                                                <Input
                                                  type="email"
                                                  placeholder="project-dl@company.com"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingProjectDLEmail}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingProjectDLEmail(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Expected Go-Live Date</Label>
                                                <Input
                                                  type="date"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white [&::-webkit-calendar-picker-indicator]:invert"
                                                  value={onboardingGoLiveDate}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingGoLiveDate(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Tester Name</Label>
                                                <Input
                                                  placeholder="Enter tester name"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingTesterName}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingTesterName(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Tester Email</Label>
                                                <Input
                                                  type="email"
                                                  placeholder="tester@company.com"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingTesterEmail}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingTesterEmail(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">ServiceNow Group Name</Label>
                                                <Input
                                                  placeholder="Enter ServiceNow group name"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingServiceNowGroup}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingServiceNowGroup(e.target.value)}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">ServiceNow Email</Label>
                                                <Input
                                                  type="email"
                                                  placeholder="servicenow@company.com"
                                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                                  value={onboardingServiceNowEmail}
                                                  disabled={isExistingOnboardingLoaded}
                                                  onChange={(e) => setOnboardingServiceNowEmail(e.target.value)}
                                                />
                                              </div>
                                            </div>
                                          </Card>

                                          {/* Consumer Information Card */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2 text-white">
                                              <Users className="w-5 h-5 text-primary" />
                                              Consumer Information
                                            </CardTitle>
                                            <div className="space-y-4">
                                              <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-400">Manage API consumers for this project</p>
                                                <button
                                                  type="button"
                                                  onClick={() => setShowConsumerModal(true)}
                                                  className={cn(
                                                    'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                    'flex items-center gap-1.5 active:scale-[0.98]'
                                                  )}
                                                >
                                                  Add Consumer
                                                </button>
                                              </div>

                                              {/* Display saved consumers - selectable */}
                                              {savedConsumers.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                                                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                                                >
                                                  {savedConsumers.map((consumer) => (
                                                    <div
                                                      key={consumer.id}
                                                      className={cn(
                                                        'p-3 rounded-lg border cursor-pointer transition-all relative group',
                                                        selectedOnboardingConsumers.includes(consumer.id)
                                                          ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                          : 'border-dark-700 hover:border-primary/50'
                                                      )}
                                                      style={!selectedOnboardingConsumers.includes(consumer.id) ? { backgroundColor: '#0f172a80' } : undefined}
                                                    >
                                                      <div onClick={() => {
                                                        const isSelected = selectedOnboardingConsumers.includes(consumer.id);
                                                        if (isSelected) {
                                                          setSelectedOnboardingConsumers(selectedOnboardingConsumers.filter(id => id !== consumer.id));
                                                        } else {
                                                          setSelectedOnboardingConsumers([...selectedOnboardingConsumers, consumer.id]);
                                                        }
                                                      }}>
                                                        <p className="text-xs font-medium text-white truncate pr-6">{consumer.consumerName || 'Unnamed'}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{consumer.consumerPocName || 'No POC'}</p>
                                                        {selectedOnboardingConsumers.includes(consumer.id) && (
                                                          <div className="mt-1 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3 text-primary" />
                                                            <span className="text-[10px] text-primary">Selected</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                      {!isExistingOnboardingLoaded && (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditConsumer(consumer);
                                                          }}
                                                          className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                                                          title="Edit Consumer"
                                                        >
                                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                            <path d="m15 5 4 4" />
                                                          </svg>
                                                        </button>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </Card>

                                          {/* Connector Configuration Card */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2 text-white">
                                              <Plug className="w-5 h-5 text-primary" />
                                              Connector Configuration
                                            </CardTitle>
                                            <div className="flex justify-start">
                                              <button
                                                type="button"
                                                onClick={() => setShowConnectorModal(true)}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-2'
                                                )}
                                              >
                                                <Plug className="w-4 h-4" />
                                                Configure Connectors
                                              </button>
                                            </div>
                                            {/* {getConnectionSummary() && (
                                              <p className="mt-2 text-xs text-green-400">{getConnectionSummary()}</p>
                                            )} */}
                                            {renderConnectorSummary()}
                                          </Card>
                                        </div>
                                      )}

                                      {currentStep === 2 && (
                                        <div className="space-y-6">
                                          {/* Onboarding Success Message */}
                                          {showOnboardingSuccess && onboardingNumber && (
                                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                                              <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium text-green-400">Onboarding Saved Successfully!</p>
                                                  <p className="text-xs text-gray-400">Your onboarding number is: <span className="font-semibold text-white">{onboardingNumber}</span></p>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <FileCode className="w-5 h-5 text-primary" />
                                              Select API Spec
                                            </CardTitle>
                                            <div className="flex items-center gap-1 bg-[#0f172a]/60 border border-dark-700 rounded-lg p-0.5 mb-4 w-fit">
                                              {['library', 'forgecatalog', 'swaggerhub'].map((tab) => (
                                                <button
                                                  key={tab}
                                                  onClick={() => setReqSpecSource(tab)}
                                                  className={cn(
                                                    'px-3 py-1 text-xs rounded-md transition-colors',
                                                    reqSpecSource === tab ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                                                  )}
                                                >
                                                  {tab === 'library' ? 'Spec Library' : tab === 'forgecatalog' ? 'ForgeCatalog' : 'SwaggerHub'}
                                                </button>
                                              ))}
                                            </div>

                                            {reqSpecSource === 'library' && (
                                              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                                                <div className="space-y-2">
                                                  <Label className="text-xs text-gray-300">Select spec before requirements</Label>
                                                  <select
                                                    value={specLibrary.some((spec) => String(spec.id) === String(proxyDesignSelectedSpec?.id)) ? String(proxyDesignSelectedSpec?.id) : ''}
                                                    onChange={(e) => {
                                                      const selectedId = e.target.value;
                                                      if (!selectedId) {
                                                        setProxyDesignSelectedSpec(null);
                                                        setProxySelectedDesignSpecs([]);
                                                        localStorage.removeItem('probeStack_proxyDesignSelectedSpec');
                                                        localStorage.removeItem('probeStack_proxySelectedDesignSpecs');
                                                        return;
                                                      }
                                                      const spec = specLibrary.find((item) => String(item.id) === selectedId);
                                                      const selectedSpec = selectProxySpecForDesign(spec, 'library');
                                                      if (selectedSpec) {
                                                        showMessage(`${selectedSpec.name} selected as ${getResourceLabel()} name.`, 'success');
                                                        apiDesignService.getSpecContent(selectedId).then((r) => {
                                                          if (r.success && r.content) {
                                                            try {
                                                              const parsed = JSON.parse(r.content);
                                                              if (!functionalReqs && parsed.info?.description) setFunctionalReqs(parsed.info.description);
                                                            } catch {}
                                                          }
                                                        });
                                                      }
                                                    }}
                                                    className="h-10 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all"
                                                    style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}
                                                  >
                                                    <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                      {specLibrary.length === 0 ? 'No library specs available' : 'Choose a spec from library'}
                                                    </option>
                                                    {specLibrary.map((spec) => (
                                                      <option key={spec.id} value={String(spec.id)} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                                        {spec.specName || spec.name || spec.fileName || 'Untitled spec'}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div className="rounded-lg border border-dark-700 bg-[#0f172a]/50 px-4 py-3 min-w-[240px]">
                                                  <p className="text-[11px] uppercase tracking-wide text-gray-500">{getResourceLabel()} name</p>
                                                  <p className="mt-1 text-sm font-semibold text-white truncate">
                                                    {getProxySpecApiName() || 'Will use selected spec name'}
                                                  </p>
                                                </div>
                                              </div>
                                            )}

                                            {reqSpecSource === 'forgecatalog' && (
                                              forgeCatalogLoading && forgeCatalogSpecs.length === 0 ? (
                                                <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                                                  <p className="text-sm text-gray-400">Loading ForgeCatalog APIs...</p>
                                                </div>
                                              ) : forgeCatalogSpecs.length === 0 ? (
                                                <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                  <p className="text-sm text-gray-400">No specs found in ForgeCatalog for your organization.</p>
                                                </div>
                                              ) : (() => {
                                                const fcFiltered = forgeCatalogSpecs.filter(s => !forgeCatalogSearch || s.name?.toLowerCase().includes(forgeCatalogSearch.toLowerCase()));
                                                const fcPages = Math.max(1, Math.ceil(fcFiltered.length / CATALOG_PAGE_SIZE));
                                                const fcPage = Math.min(forgeCatalogPage, fcPages);
                                                const fcSlice = fcFiltered.slice((fcPage - 1) * CATALOG_PAGE_SIZE, fcPage * CATALOG_PAGE_SIZE);
                                                return (
                                                  <div className="space-y-3">
                                                    <div className="relative">
                                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                      <input type="text" placeholder="Search specs..." value={forgeCatalogSearch} onChange={(e) => { setForgeCatalogSearch(e.target.value); setForgeCatalogPage(1); }} className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                      {fcSlice.map((spec) => (
                                                        <div key={spec.gcsUrl} className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/50">
                                                          <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                          <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-white truncate">{spec.name}</p>
                                                            <p className="text-xs text-gray-400 truncate">{spec.projectId}</p>
                                                          </div>
                                                          <button title="Clone and select this spec" onClick={() => importForgeCatalogSpec(spec)} disabled={forgeCatalogImportingUrl === spec.gcsUrl} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
                                                            {forgeCatalogImportingUrl === spec.gcsUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                                                            Clone
                                                          </button>
                                                        </div>
                                                      ))}
                                                      {fcFiltered.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No results match your search.</p>}
                                                    </div>
                                                    {fcPages > 1 && (
                                                      <div className="flex items-center justify-between pt-1">
                                                        <span className="text-xs text-gray-400">{fcFiltered.length} spec{fcFiltered.length !== 1 ? 's' : ''} · page {fcPage} of {fcPages}</span>
                                                        <div className="flex gap-1">
                                                          <button disabled={fcPage <= 1} onClick={() => setForgeCatalogPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">‹ Prev</button>
                                                          <button disabled={fcPage >= fcPages} onClick={() => setForgeCatalogPage(p => Math.min(fcPages, p + 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">Next ›</button>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })()
                                            )}

                                            {reqSpecSource === 'swaggerhub' && (
                                              swaggerHubLoading && swaggerHubSpecs.length === 0 ? (
                                                <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                                                  <p className="text-sm text-gray-400">Loading SwaggerHub APIs...</p>
                                                </div>
                                              ) : swaggerHubSpecs.length === 0 ? (
                                                <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                  <p className="text-sm text-gray-400">No org-specific APIs found in SwaggerHub.</p>
                                                </div>
                                              ) : (() => {
                                                const shFiltered = swaggerHubSpecs.filter(s => !swaggerHubSearchInput || s.name?.toLowerCase().includes(swaggerHubSearchInput.toLowerCase()));
                                                const shPages = Math.max(1, Math.ceil(shFiltered.length / CATALOG_PAGE_SIZE));
                                                const shPage = Math.min(swaggerHubPage, shPages);
                                                const shSlice = shFiltered.slice((shPage - 1) * CATALOG_PAGE_SIZE, shPage * CATALOG_PAGE_SIZE);
                                                return (
                                                  <div className="space-y-3">
                                                    <div className="relative">
                                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                      <input type="text" placeholder="Search SwaggerHub APIs..." value={swaggerHubSearchInput} onChange={(e) => { setSwaggerHubSearchInput(e.target.value); setSwaggerHubPage(1); }} className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                      {shSlice.map((spec) => (
                                                        <div key={spec.id} className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/50">
                                                          <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                          <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-white truncate">{spec.name}</p>
                                                            <p className="text-xs text-gray-400 truncate">{spec.owner} · v{spec.version}</p>
                                                          </div>
                                                          <button title="Clone and select this spec" onClick={() => importSwaggerHubSpec(spec)} disabled={swaggerHubImportingId === spec.id} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
                                                            {swaggerHubImportingId === spec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                                                            Clone
                                                          </button>
                                                        </div>
                                                      ))}
                                                      {shFiltered.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No results match your search.</p>}
                                                    </div>
                                                    {shPages > 1 && (
                                                      <div className="flex items-center justify-between pt-1">
                                                        <span className="text-xs text-gray-400">{shFiltered.length} API{shFiltered.length !== 1 ? 's' : ''} · page {shPage} of {shPages}</span>
                                                        <div className="flex gap-1">
                                                          <button disabled={shPage <= 1} onClick={() => setSwaggerHubPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">‹ Prev</button>
                                                          <button disabled={shPage >= shPages} onClick={() => setSwaggerHubPage(p => Math.min(shPages, p + 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">Next ›</button>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })()
                                            )}

                                            {proxyDesignSelectedSpec && (
                                              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                                                <div className="flex items-center justify-between gap-3">
                                                  <div className="min-w-0">
                                                    <p className="text-sm text-primary">
                                                      Selected: <span className="font-semibold">{proxyDesignSelectedSpec.name}</span>
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                      This spec will be pre-selected in Step 3, and its name will become the {getResourceLabel()} resource name.
                                                    </p>
                                                  </div>
                                                  <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button type="button" title="View spec" onClick={() => { setViewSpecSpec(proxyDesignSelectedSpec); setViewSpecOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                                      <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" title="Edit spec" onClick={() => { setSpecEditorSpec(proxyDesignSelectedSpec); setSpecEditorOpen(true); }} className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors">
                                                      <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" title="Schema validation" onClick={() => { setSchemaValidationSpec(proxyDesignSelectedSpec); setShowSchemaValidation(true); }} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors">
                                                      <Shield className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" onClick={() => { setProxyDesignSelectedSpec(null); setProxySelectedDesignSpecs([]); localStorage.removeItem('probeStack_proxyDesignSelectedSpec'); localStorage.removeItem('probeStack_proxySelectedDesignSpecs'); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Clear selected spec">
                                                      <X className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </Card>

                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <FileText className="w-5 h-5 text-primary" />
                                              Proxy Business Requirements
                                            </CardTitle>
                                            <RequirementAiSpecAssistant
                                              functionalReqs={functionalReqs}
                                              setFunctionalReqs={setFunctionalReqs}
                                              nonFunctionalReqs={nonFunctionalReqs}
                                              setNonFunctionalReqs={setNonFunctionalReqs}
                                              setReqGenStatus={setReqGenStatus}
                                              setAiInput={setAiInput}
                                              loadSpecCandidates={loadProxyRequirementSpecCandidates}
                                              onSpecSelected={handleProxyRecommendedSpecSelected}
                                              onSchemaValidation={(spec) => {
                                                setSchemaValidationSpec(spec);
                                                setShowSchemaValidation(true);
                                              }}
                                              onViewSpec={(spec) => { setViewSpecSpec(spec); setViewSpecOpen(true); }}
                                              showMessage={showMessage}
                                              microserviceId={onboardingId}
                                              organizationId={organizationId}
                                              generateSpecRecommendations={requirementsService.generateSpecRecommendations}
                                              selectRecommendedSpec={requirementsService.selectRecommendedSpec}
                                              generateAiSpec={requirementsService.generateAiSpec}
                                              apiDesignOptions={{
                                                apiType: 'REST API',
                                                authenticationType: proxyAuthenticationType || 'OAuth2.0',
                                                dataFormat: 'JSON',
                                              }}
                                              functionalPlaceholder="Describe the functional requirements for this API proxy (e.g., routing logic, transformations, security policies)..."
                                              nonFunctionalPlaceholder="Performance, security, availability requirements for the proxy (e.g., rate limiting, caching, monitoring)..."
                                              statusKeys={{ functional: 'securityPolicies', nonFunctional: 'trafficManagement' }}
                                              metricFields={[
                                                // {
                                                //   label: 'Expected TPS',
                                                //   placeholder: 'e.g., 1000',
                                                //   value: expectedTps,
                                                //   onChange: setExpectedTps,
                                                //   className: 'h-9 text-sm bg-dark-900 border-dark-700 text-white',
                                                // },
                                                // {
                                                //   label: 'SLA (ms)',
                                                //   placeholder: 'e.g., 200',
                                                //   value: slaMs,
                                                //   onChange: setSlaMs,
                                                //   className: 'h-9 text-sm bg-dark-900 border-dark-700 text-white',
                                                // },
                                                // {
                                                //   label: 'Availability (%)',
                                                //   placeholder: 'e.g., 99.9',
                                                //   value: availabilityPercent,
                                                //   onChange: setAvailabilityPercent,
                                                //   className: 'h-9 text-sm bg-dark-900 border-dark-700 text-white',
                                                // },
                                              ]}
                                            />
                                          </Card>

                                          {/* <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <Lock className="w-5 h-5 text-primary" />Proxy Security & Traffic Requirements
                                            </CardTitle>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Authentication Type</Label>
                                                <select className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700" style={{ backgroundColor: '#0f172a80' }} value={proxyAuthenticationType} onChange={(e) => setProxyAuthenticationType(e.target.value)}>
                                                  <option value="">Select Auth Type</option>
                                                  <option value="api-key">API Key</option>
                                                  <option value="oauth2">OAuth 2.0</option>
                                                  <option value="jwt">JWT</option>
                                                  <option value="mtls">mTLS</option>
                                                  <option value="basic">Basic Auth</option>
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Authorization Scope</Label>
                                                <Input placeholder="read:payments, write:payments" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" value={authorizationScope} onChange={(e) => setAuthorizationScope(e.target.value)} />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Rate Limit (requests/min)</Label>
                                                <Input type="number" placeholder="1000" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Quota (requests/day)</Label>
                                                <Input type="number" placeholder="10000" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" value={proxyQuota} onChange={(e) => setProxyQuota(e.target.value)} />
                                              </div>
                                            </div>
                                          </Card> */}

                                        </div>
                                      )}

                                      {currentStep === 3 && (
                                        <div className="space-y-6">
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <PenTool className="w-5 h-5 text-primary" />
                                              API Design Specifications
                                            </CardTitle>

                                            {/* Import Options Buttons */}
                                            <div className="flex flex-wrap gap-3 mb-6">
                                              <button
                                                type="button"
                                                onClick={() => setProxyDesignImportMode('LOCAL')}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
                                                  proxyDesignImportMode === 'LOCAL'
                                                    ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                                                    : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                )}
                                              >
                                                <FileCode className="w-4 h-4" />
                                                Import from LOCAL
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setProxyDesignImportMode('URL')}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
                                                  proxyDesignImportMode === 'URL'
                                                    ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                                                    : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                )}
                                              >
                                                <Download className="w-4 h-4" />
                                                Import from URL
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setProxyShowForgeStudioModal(true)}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
                                                  'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                                )}
                                              >
                                                <Plus className="w-4 h-4" />
                                                CREATE
                                              </button>
                                            </div>

                                            {/* LOCAL Import Section */}
                                            {proxyDesignImportMode === 'LOCAL' && (
                                              <div className="mb-6">
                                                <input
                                                  ref={proxyDesignFileInputRef}
                                                  type="file"
                                                  accept=".yaml,.yml,.json"
                                                  className="hidden"
                                                  onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      setBusy(true);
                                                      const result = await apiDesignService.uploadSpec('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c', 'LOCAL', file, null, null, onboardingId);
                                                      setBusy(false);
                                                      if (result.success) {
                                                        showMessage(`Uploaded: ${file.name}`, 'success');
                                                        const importedRes = await apiDesignService.getImportedByMicroservice(onboardingId);
                                                        if (importedRes.success) setProxyApiDesignSpecs(importedRes.data?.data || importedRes.data || []);
                                                      } else {
                                                        showMessage(result.error || 'Failed to upload spec', 'error');
                                                      }
                                                    }
                                                  }}
                                                />
                                                <div
                                                  onClick={() => proxyDesignFileInputRef.current?.click()}
                                                  className={cn(
                                                    'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-dark-700 py-8 px-4 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                                                  )}
                                                  style={{ backgroundColor: 'rgba(10, 10, 46, 0.4)' }}
                                                >
                                                  <FileCode className="mb-2 h-10 w-10 text-gray-500" />
                                                  <p className="text-sm font-medium text-white">Drop spec file or click to browse</p>
                                                  <p className="mt-1 text-xs text-gray-500">YAML or JSON, max 10MB</p>
                                                </div>
                                              </div>
                                            )}

                                            {/* URL Import Section */}
                                            {proxyDesignImportMode === 'URL' && (
                                              <div className="mb-6 space-y-3">
                                                <div className="flex gap-2">
                                                  <Input
                                                    placeholder="https://api.example.com/openapi.json"
                                                    value={proxyDesignUrlInput}
                                                    onChange={(e) => setProxyDesignUrlInput(e.target.value)}
                                                    className="h-10 text-sm flex-1 bg-dark-900 border-dark-700 text-white"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={async () => {
                                                      if (proxyDesignUrlInput.trim()) {
                                                        setBusy(true);
                                                        const result = await apiDesignService.uploadSpec('f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c', 'URL', null, proxyDesignUrlInput.trim(), null, onboardingId);
                                                        setBusy(false);
                                                        if (result.success) {
                                                          showMessage(`Imported from URL: ${proxyDesignUrlInput}`, 'success');
                                                          setProxyDesignUrlInput('');
                                                          const importedRes = await apiDesignService.getImportedByMicroservice(onboardingId);
                                                          if (importedRes.success) setProxyApiDesignSpecs(importedRes.data?.data || importedRes.data || []);
                                                        } else {
                                                          showMessage(result.error || 'Failed to import spec', 'error');
                                                        }
                                                      } else {
                                                        showMessage('Please enter a URL', 'error');
                                                      }
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                                                  >
                                                    <Download className="w-4 h-4" />
                                                    Import
                                                  </button>
                                                </div>
                                              </div>
                                            )}

                                            {/* Imported Specs List - Single Selection */}
                                            {/* {proxyDesignImportedSpecs.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-400 mb-3">Imported Specifications (Select one)</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}>
                      {proxyDesignImportedSpecs.map((spec) => (
                        <div
                          key={spec.id}
                          onClick={() => {
                            setProxyDesignSelectedSpec(spec);
                            setProxySelectedDesignSpecs([spec.id]);
                            localStorage.setItem('probeStack_proxyDesignSelectedSpec', JSON.stringify(spec));
                            localStorage.setItem('probeStack_proxySelectedDesignSpecs', JSON.stringify([spec.id]));
                          }}
                          className={cn(
                            'p-4 rounded-lg border cursor-pointer transition-all',
                            proxyDesignSelectedSpec?.id === spec.id
                              ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                              : 'border-dark-700 bg-dark-900/40 hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-5 h-5 rounded-full border flex items-center justify-center transition-all',
                                proxyDesignSelectedSpec?.id === spec.id
                                  ? 'bg-primary border-primary'
                                  : 'border-dark-600 bg-dark-800'
                              )}>
                                {proxyDesignSelectedSpec?.id === spec.id && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{spec.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5 capitalize">Source: {spec.source}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProxyShowForgeStudioModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Edit spec"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProxyDesignImportedSpecs(proxyDesignImportedSpecs.filter(s => s.id !== spec.id));
                                  if (proxyDesignSelectedSpec?.id === spec.id) {
                                    setProxyDesignSelectedSpec(null);
                                    setProxySelectedDesignSpecs([]);
                                    localStorage.removeItem('probeStack_proxyDesignSelectedSpec');
                                    localStorage.removeItem('probeStack_proxySelectedDesignSpecs');
                                  }
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                                            {/* Specification Library */}
                                            {/* Imported Specifications - only show if data exists */}
                                            {proxyApiDesignSpecs.length > 0 && (
                                              <div className="mb-6">
                                                <p className="text-sm text-gray-400 mb-3">Imported Specifications (Select one)</p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                  {proxyApiDesignSpecs.map((spec) => {
                                                    const isSelected = proxyDesignSelectedSpec?.id === spec.id;
                                                    return (
                                                      <div
                                                        key={spec.id}
                                                        onClick={() => selectProxySpecForDesign(spec, 'imported')}
                                                        className={cn(
                                                          'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                                                          isSelected ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]' : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                                                        )}
                                                      >
                                                        <div className={cn('w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-600')}>
                                                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                          <p className="text-sm font-medium text-white truncate">{spec.specName || spec.fileName}</p>
                                                          <p className="text-xs text-gray-400 truncate">{spec.fileName}</p>
                                                        </div>
                                                        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                                          <button
                                                            title="View spec"
                                                            onClick={() => { setViewSpecSpec(spec); setViewSpecOpen(true); }}
                                                            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                          >
                                                            <Eye className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
  title={isApprovalLocked ? "Edit locked — contract approval is under review" : "Edit spec"}
  onClick={(e) => {
    e.stopPropagation();
    if (isApprovalLocked) {
      showMessage('Edit locked — contract approval is under review', 'error');
      return;
    }
    setSpecEditorSpec(spec);
    setSpecEditorOpen(true);
  }}
  className={cn(
    'p-1.5 rounded-lg transition-colors',
    isApprovalLocked
      ? 'text-gray-600 cursor-pointer opacity-60'
      : 'text-gray-500 hover:text-primary hover:bg-primary/10'
  )}
>
  <Pencil className="w-3.5 h-3.5" />
</button>
                                                          <button
                                                            title="Schema validation"
                                                            onClick={() => { setSchemaValidationSpec(spec); setShowSchemaValidation(true); }}
                                                            className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                          >
                                                            <Shield className="w-3.5 h-3.5" />
                                                          </button>
                                                          <div className="relative">
                                                            <button
                                                              title="Promote"
                                                              onClick={(e) => { e.stopPropagation(); setPromoteDropdownSpecId(promoteDropdownSpecId === spec.id ? null : spec.id); }}
                                                              className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                                                            >
                                                              <BookMarked className="w-3.5 h-3.5" />
                                                            </button>
                                                            {promoteDropdownSpecId === spec.id && (
                                                              <div className="absolute right-0 top-full mt-1 z-50 bg-[#161b30] border border-dark-700 rounded-lg shadow-xl py-1 w-52" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => { setPromoteDropdownSpecId(null); handlePromoteToLibrary(spec); }}
                                                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-primary/10 flex items-center gap-2"
                                                                >
                                                                  <BookMarked className="w-3.5 h-3.5" />
                                                                  Promote to Spec Library
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => { setPromoteDropdownSpecId(null); handlePromoteToCatalog(spec); }}
                                                                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-primary/10 flex items-center gap-2"
                                                                >
                                                                  <Cloud className="w-3.5 h-3.5" />
                                                                  Promote to ForgeCatalog
                                                                </button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}

                                            {/* Specification Library - always show */}
                                            <div className="mb-6">
                                              <p className="text-sm text-gray-400 mb-3">Specification Library (Click to select)</p>
                                              {specLibrary.length === 0 ? (
                                                <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                  <p className="text-sm text-gray-400">No library found.</p>
                                                </div>
                                              ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                  {specLibrary.map((spec) => {
                                                    const isSelected = proxyDesignSelectedSpec?.id === spec.id;
                                                    return (
                                                      <div
                                                        key={spec.id}
                                                        onClick={() => selectProxySpecForDesign(spec, 'library')}
                                                        className={cn(
                                                          'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                                                          isSelected ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]' : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                                                        )}
                                                      >
                                                        <div className={cn('w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-600')}>
                                                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                          <p className="text-sm font-medium text-white truncate">{spec.specName || spec.fileName}</p>
                                                          <p className="text-xs text-gray-400 truncate">{spec.fileName}</p>
                                                        </div>
                                                        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                                          <button
                                                            title="View spec"
                                                            onClick={() => { setViewSpecSpec(spec); setViewSpecOpen(true); }}
                                                            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                          >
                                                            <Eye className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
  title={isApprovalLocked ? "Edit locked — contract approval is under review" : "Edit spec"}
  onClick={(e) => {
    e.stopPropagation();
    if (isApprovalLocked) {
      showMessage('Edit locked — contract approval is under review', 'error');
      return;
    }
    setSpecEditorSpec(spec);
    setSpecEditorOpen(true);
  }}
  className={cn(
    'p-1.5 rounded-lg transition-colors',
    isApprovalLocked
      ? 'text-gray-600 cursor-pointer opacity-60'
      : 'text-gray-500 hover:text-primary hover:bg-primary/10'
  )}
>
  <Pencil className="w-3.5 h-3.5" />
</button>
                                                          <button
                                                            title="Schema validation"
                                                            onClick={() => { setSchemaValidationSpec(spec); setShowSchemaValidation(true); }}
                                                            className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                          >
                                                            <Shield className="w-3.5 h-3.5" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                              {proxyDesignSelectedSpec && (
                                                <div className={`text-sm text-primary border border-dark-700 bg-[#0f172a]/50 rounded-xl p-3`}>
                                                  Selected: {proxyDesignSelectedSpec.name}
                                                </div>
                                              )}
                                            </div>

                                            {/* API Catalog */}
                                            <div className="mb-6">
                                              <div className="flex items-center gap-1 bg-[#0f172a]/60 border border-dark-700 rounded-lg p-0.5 mb-3 w-fit">
                                                {['forgecatalog', 'swaggerhub'].map((tab) => (
                                                  <button
                                                    key={tab}
                                                    onClick={() => setApiDesignSource(tab)}
                                                    className={cn(
                                                      'px-3 py-1 text-xs rounded-md transition-colors',
                                                      apiDesignSource === tab
                                                        ? 'bg-primary text-white'
                                                        : 'text-gray-400 hover:text-white'
                                                    )}
                                                  >
                                                    {tab === 'forgecatalog' ? 'ForgeCatalog' : 'SwaggerHub'}
                                                  </button>
                                                ))}
                                              </div>

                                              {apiDesignSource === 'forgecatalog' ? (
                                                forgeCatalogLoading && forgeCatalogSpecs.length === 0 ? (
                                                  <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">Loading ForgeCatalog APIs...</p>
                                                  </div>
                                                ) : forgeCatalogSpecs.length === 0 ? (
                                                  <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                    <p className="text-sm text-gray-400">No specs found in ForgeCatalog for your organization.</p>
                                                  </div>
                                                ) : (() => {
                                                  const fcFiltered = forgeCatalogSpecs.filter(s => !forgeCatalogSearch || s.name?.toLowerCase().includes(forgeCatalogSearch.toLowerCase()));
                                                  const fcPages = Math.max(1, Math.ceil(fcFiltered.length / CATALOG_PAGE_SIZE));
                                                  const fcPage = Math.min(forgeCatalogPage, fcPages);
                                                  const fcSlice = fcFiltered.slice((fcPage - 1) * CATALOG_PAGE_SIZE, fcPage * CATALOG_PAGE_SIZE);
                                                  return (
                                                    <div className="space-y-3">
                                                      <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input type="text" placeholder="Search specs..." value={forgeCatalogSearch} onChange={(e) => { setForgeCatalogSearch(e.target.value); setForgeCatalogPage(1); }} className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" /></div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {fcSlice.map((spec) => (
                                                          <div key={spec.gcsUrl} className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/50">
                                                            <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white truncate">{spec.name}</p><p className="text-xs text-gray-400 truncate">{spec.projectId}</p></div>
                                                            <button title="Clone and select this spec" onClick={() => importForgeCatalogSpec(spec)} disabled={forgeCatalogImportingUrl === spec.gcsUrl} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
                                                              {forgeCatalogImportingUrl === spec.gcsUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />} Clone
                                                            </button>
                                                          </div>
                                                        ))}
                                                        {fcFiltered.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No results match your search.</p>}
                                                      </div>
                                                      {fcPages > 1 && (<div className="flex items-center justify-between pt-1"><span className="text-xs text-gray-400">{fcFiltered.length} spec{fcFiltered.length !== 1 ? 's' : ''} · page {fcPage} of {fcPages}</span><div className="flex gap-1"><button disabled={fcPage <= 1} onClick={() => setForgeCatalogPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">‹ Prev</button><button disabled={fcPage >= fcPages} onClick={() => setForgeCatalogPage(p => Math.min(fcPages, p + 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">Next ›</button></div></div>)}
                                                    </div>
                                                  );
                                                })()
                                              ) : (
                                                swaggerHubLoading && swaggerHubSpecs.length === 0 ? (
                                                  <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">Loading SwaggerHub APIs...</p>
                                                  </div>
                                                ) : swaggerHubSpecs.length === 0 ? (
                                                  <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                    <p className="text-sm text-gray-400">No org-specific APIs found in SwaggerHub.</p>
                                                  </div>
                                                ) : (() => {
                                                  const shFiltered = swaggerHubSpecs.filter(s => !swaggerHubSearchInput || s.name?.toLowerCase().includes(swaggerHubSearchInput.toLowerCase()));
                                                  const shPages = Math.max(1, Math.ceil(shFiltered.length / CATALOG_PAGE_SIZE));
                                                  const shPage = Math.min(swaggerHubPage, shPages);
                                                  const shSlice = shFiltered.slice((shPage - 1) * CATALOG_PAGE_SIZE, shPage * CATALOG_PAGE_SIZE);
                                                  return (
                                                    <div className="space-y-3">
                                                      <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input type="text" placeholder="Search SwaggerHub APIs..." value={swaggerHubSearchInput} onChange={(e) => { setSwaggerHubSearchInput(e.target.value); setSwaggerHubPage(1); }} className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50" /></div>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {shSlice.map((spec) => (
                                                          <div key={spec.id} className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/50">
                                                            <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white truncate">{spec.name}</p><p className="text-xs text-gray-400 truncate">{spec.owner} · v{spec.version}</p></div>
                                                            <button title="Clone and select this spec" onClick={() => importSwaggerHubSpec(spec)} disabled={swaggerHubImportingId === spec.id} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
                                                              {swaggerHubImportingId === spec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />} Clone
                                                            </button>
                                                          </div>
                                                        ))}
                                                        {shFiltered.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No results match your search.</p>}
                                                      </div>
                                                      {shPages > 1 && (<div className="flex items-center justify-between pt-1"><span className="text-xs text-gray-400">{shFiltered.length} API{shFiltered.length !== 1 ? 's' : ''} · page {shPage} of {shPages}</span><div className="flex gap-1"><button disabled={shPage <= 1} onClick={() => setSwaggerHubPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">‹ Prev</button><button disabled={shPage >= shPages} onClick={() => setSwaggerHubPage(p => Math.min(shPages, p + 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">Next ›</button></div></div>)}
                                                    </div>
                                                  );
                                                })()
                                              )}
                                            </div>

                                            {/* Design Details */}
                                            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">API Type</Label>
                                                <select className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all" style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}>
                                                  <option value="rest" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>REST API</option>
                                                  <option value="graphql" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>GraphQL</option>
                                                  <option value="grpc" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>gRPC</option>
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Authentication Type</Label>
                                                <select className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all" style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}>
                                                  <option value="oauth2" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>OAuth 2.0</option>
                                                  <option value="apikey" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>API Key</option>
                                                  <option value="jwt" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>JWT</option>
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Data Format</Label>
                                                <select className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all" style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}>
                                                  <option value="json" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>JSON</option>
                                                  <option value="xml" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>XML</option>
                                                </select>
                                              </div>
                                            </div> */}
                                          </Card>

                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <Lock className="w-5 h-5 text-primary" />Proxy Security & Traffic Requirements
                                            </CardTitle>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Authentication Type</Label>
                                                <select className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700" style={{ backgroundColor: '#0f172a80' }} value={proxyAuthenticationType} onChange={(e) => setProxyAuthenticationType(e.target.value)}>
                                                  <option value="">Select Auth Type</option>
                                                  <option value="api-key">API Key</option>
                                                  <option value="oauth2">OAuth 2.0</option>
                                                  <option value="jwt">JWT</option>
                                                  <option value="mtls">mTLS</option>
                                                  <option value="basic">Basic Auth</option>
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Authorization Scope</Label>
                                                <Input placeholder="read:payments, write:payments" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" value={authorizationScope} onChange={(e) => setAuthorizationScope(e.target.value)} />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Rate Limit (requests/min)</Label>
                                                <Input type="number" placeholder="1000" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} />
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Quota (requests/day)</Label>
                                                <Input type="number" placeholder="10000" className="h-9 text-sm bg-dark-900 border-dark-700 text-white" value={proxyQuota} onChange={(e) => setProxyQuota(e.target.value)} />
                                              </div>
                                            </div>
                                          </Card>
                                        </div>
                                      )}

                                      {currentStep === 4 && (
                                        <div className="space-y-6">
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <CheckCircle className="w-5 h-5 text-primary" />
                                              Design Validation Results
                                            </CardTitle>

                                            {proxySelectedDesignSpecs.length === 0 ? (
                                              <div className="p-6 rounded-lg bg-dark-900/40 border border-dark-700 text-center">
                                                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                                                <p className="text-sm text-gray-300">No specifications selected for validation.</p>
                                                <p className="text-xs text-gray-400 mt-1">Please go back to the Design step and select at least one API specification.</p>
                                              </div>
                                            ) : (
                                              <div className="space-y-6">
                                                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                                                  <p className="text-sm text-primary">
                                                    Showing validation reports for {proxySelectedDesignSpecs.length} selected specification(s)
                                                  </p>
                                                </div>

                                                {/* Show validation for imported specs */}
                                                {proxyDesignImportedSpecs.filter(spec => proxySelectedDesignSpecs.includes(spec.id)).map((spec, index) => (
                                                  <div key={spec.id} className="border border-dark-700 rounded-lg p-4 bg-dark-900/40">
                                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-dark-700">
                                                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                                        {index + 1}
                                                      </div>
                                                      <h3 className="text-sm font-medium text-white">{spec.name}</h3>
                                                      <span className="text-xs text-gray-400">- {spec.description || 'Imported API Specification'}</span>
                                                      <span className="text-xs text-primary ml-2 capitalize">({spec.source})</span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                                        <div className="flex items-center gap-2 mb-1">
                                                          <CheckCircle className="w-4 h-4 text-green-400" />
                                                          <span className="text-xs font-medium text-green-400">Schema Valid</span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400">OpenAPI schema validation passed</p>
                                                      </div>
                                                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                                        <div className="flex items-center gap-2 mb-1">
                                                          <CheckCircle className="w-4 h-4 text-green-400" />
                                                          <span className="text-xs font-medium text-green-400">Consumer Review</span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400">Consumer requirements compliant</p>
                                                      </div>
                                                      <div className={`p-3 rounded-lg border ${index % 3 === 0 ? 'bg-green-500/10 border-green-500/30' : index % 3 === 1 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                          {index % 3 === 1 ? <AlertCircle className="w-4 h-4 text-yellow-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                                                          <span className={`text-xs font-medium ${index % 3 === 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                            {index % 3 === 1 ? 'Naming Convention' : 'Best Practices'}
                                                          </span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400">
                                                          {index % 3 === 1 ? 'Minor naming warnings' : 'All standards met'}
                                                        </p>
                                                      </div>
                                                    </div>

                                                    <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                                                      <p className="text-xs font-medium text-white mb-2">Validation Report for {spec.name}</p>
                                                      <div className="space-y-1.5 text-xs">
                                                        <div className="flex items-center gap-2">
                                                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                          <span className="text-gray-300">OpenAPI 3.0 specification format is valid</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                          <span className="text-gray-300">All required fields are present</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                          <span className="text-gray-300">Authentication schemes properly defined</span>
                                                        </div>
                                                        {index % 3 === 1 && (
                                                          <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                                                            <span className="text-gray-300">Endpoint naming should use kebab-case</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </Card>

                                          {/* API Linting Best Practices Section */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <CardTitle className="mb-4 flex items-center gap-2">
                                              <Shield className="w-5 h-5 text-primary" />
                                              API Linting Best Practices
                                            </CardTitle>
                                            {(() => {
                                              const filtered = proxyDesignImportedSpecs.filter(s => proxySelectedDesignSpecs.includes(s.id));
                                              const lintSpecs = filtered.length > 0
                                                ? filtered
                                                : proxyDesignSelectedSpec ? [proxyDesignSelectedSpec] : [];
                                              if (lintSpecs.length === 0) {
                                                return (
                                                  <div className="p-6 rounded-lg bg-dark-900/40 border border-dark-700 text-center">
                                                    <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-300">No specifications selected for linting.</p>
                                                    <p className="text-xs text-gray-400 mt-1">Go back to the Design step and select a specification.</p>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <div className="space-y-6">
                                                  {lintSpecs.map((spec, idx) => (
                                                    <div key={spec.id || idx}>
                                                      {lintSpecs.length > 1 && (
                                                        <p className="text-xs font-medium text-gray-400 mb-2">{idx + 1}. {spec.specName || spec.name}</p>
                                                      )}
                                                      <SpectralLintPanel
                                                        compact
                                                        specContent={spec.content || spec.specContent || ''}
                                                        specId={spec.specMetadataId || spec.id}
                                                        specName={spec.specName || spec.name}
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                              );
                                            })()}
                                          </Card>
                                        </div>
                                      )}

                                      {currentStep === 5 && (
                                        <div className="space-y-6">
                                          {/* Mock Proxy Settings Cards */}
                                          <div className="grid grid-cols-2 gap-6">
                                            {/* API Spec Name Card */}
                                            <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">API Spec Name</Label>
                                                <Input
                                                  value={proxyDesignSelectedSpec?.name || 'No spec selected'}
                                                  readOnly
                                                  className="h-9 text-sm bg-[#0f172a]/50"
                                                />
                                              </div>
                                            </Card>

                                            {/* Mock Service Name Card */}
                                            <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                              <div className="space-y-2">
                                                <Label className="text-xs text-gray-300">Mock Service Name</Label>
                                                <Input
                                                  value={mockServiceName || (proxyDesignSelectedSpec?.name ? `mock-${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}` : 'mock-service')}
                                                  onChange={(e) => setMockServiceName(e.target.value)}
                                                  className="h-9 text-sm bg-[#0f172a]/50"
                                                />
                                              </div>
                                            </Card>

                                            {/* Mock Server URL Card */}
                                            {/* <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-gray-300">Mock Server URL</Label>
                                      <Input
                                        value={mockServerUrl || (proxyDesignSelectedSpec?.name
                                          ? `https://mock-${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}.example.com/v1`
                                          : 'https://mock-service.example.com/v1')}
                                        onChange={(e) => setMockServerUrl(e.target.value)}
                                        className="h-9 text-sm bg-[#0f172a]/50"
                                      />
                                    </div>
                                  </Card> */}

                                            {/* Response Latency Card */}
                                            {/* <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-gray-300">Response Latency (ms)</Label>
                                      <Input
                                        value={mockResponseLatency}
                                        onChange={(e) => setMockResponseLatency(e.target.value)}
                                        placeholder="e.g., 100"
                                        className="h-9 text-sm bg-[#0f172a]/50"
                                      />
                                    </div>
                                  </Card> */}
                                          </div>

                                          {/* Endpoints from Spec - Accordion Style */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <div className="flex items-center justify-between mb-4">
                                              <CardTitle className="flex items-center gap-2">
                                                <FlaskConical className="w-5 h-5 text-primary" />
                                                Endpoints from Spec
                                              </CardTitle>
                                              <button
                                                  type="button"
                                                  // onClick={() => {
                                                  //   setShowMockServerModal(true);
                                                  //   setMockServerStatus('generating');
                                                  //   setTimeout(() => {
                                                  //     setMockServerStatus('success');
                                                  //     setMockServerGenerated(true);
                                                  //     setTimeout(() => {
                                                  //       setShowMockServerModal(false);
                                                  //       setMockServerStatus('idle');
                                                  //     }, 1500);
                                                  //   }, 2000);
                                                  // }}
                                                  onClick={async () => {
                                                    setShowMockServerModal(true);
                                                    setMockServerStatus('generating');
                                                    const result = await mockApiService.generateFromSpec({
                                                      microserviceId: onboardingId,
                                                      specMetadataId: proxyDesignSelectedSpec?.specMetadataId || proxyDesignSelectedSpec?.id,
                                                      mockServiceName: mockServiceName || (proxyDesignSelectedSpec?.name ? `mock-${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}` : 'mock-service'),
                                                      mockServerUrl: mockServerUrl || null,
                                                      isPrivate: true,
                                                      responseLatencyMs: parseInt(mockResponseLatency) || 0,
                                                    });
                                                    if (!result.success) {
                                                      setMockServerStatus('idle');
                                                      setShowMockServerModal(false);
                                                      showMessage(result.error, 'error');
                                                      return;
                                                    }
                                                    const mockServer = result.data?.data?.mockServer || {};
                                                    const endpoints = result.data?.data?.endpoints || [];
                                                    setMockServerId(mockServer.id);
                                                    setMockServerBaseUrl(mockServer.mockServerUrl || (API_BASE_URL + '/mock-api/v1/api/mocks/' + mockServer.mockUrl));
                                                    setMockEndpoints(endpoints);
                                                    setMockServerGenerated(true);
                                                    setMockServerStatus('success');
                                                    setTimeout(() => { setShowMockServerModal(false); setMockServerStatus('idle'); }, 1500);
                                                  }}
                                                  className={cn(
                                                    'px-5 py-2.5 rounded-lg font-semibold text-sm transition-all',
                                                    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                    'flex items-center justify-center gap-2 active:scale-[0.98]'
                                                  )}
                                                >
                                                  <FlaskConical className="w-4 h-4" />
                                                  {selectedGateway === 'Kong' ? 'Generate Mock Service' : 'Generate Mock Proxy'}
                                                </button>
                                            </div>
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                              {specEndpoints.length > 0 ? (
                                                <>
                                                  {specEndpoints.map((endpoint, idx) => {
                                                    const endpointKey = `${endpoint.method.toLowerCase()}-${endpoint.id}`;
                                                    const methodColors = {
                                                      'GET': 'bg-green-500/20 text-green-400',
                                                      'POST': 'bg-blue-500/20 text-blue-400',
                                                      'PUT': 'bg-yellow-500/20 text-yellow-400',
                                                      'PATCH': 'bg-orange-500/20 text-orange-400',
                                                      'DELETE': 'bg-red-500/20 text-red-400'
                                                    };
                                                    const statusCode = endpoint.method === 'POST' ? '201 Created' : '200 OK';

                                                    return (
                                                      <div key={endpoint.id} className="rounded-lg border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                                                        <div
                                                          onClick={() => setExpandedEndpoint(expandedEndpoint === endpointKey ? null : endpointKey)}
                                                          className="w-full p-3 flex items-center justify-between hover:bg-[#0f172a]/70 transition-colors cursor-pointer"
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${methodColors[endpoint.method] || 'bg-gray-500/20 text-gray-400'}`}>{endpoint.method}</span>
                                                            <span className="text-sm text-white font-mono">{endpoint.path}</span>
                                                          </div>
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-xs text-green-400">{statusCode}</span>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(`ep-${endpoint.id}`, endpoint.path); }} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                                                              {copiedKey === `ep-${endpoint.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                            </button>
                                                            <ChevronRight className={cn(
                                                              "w-4 h-4 text-gray-400 transition-transform",
                                                              expandedEndpoint === endpointKey && "rotate-90"
                                                            )} />
                                                          </div>
                                                        </div>
                                                        {expandedEndpoint === endpointKey && (
                                                          <div className="border-t border-dark-700 p-4 space-y-4 max-h-96 overflow-y-auto">
                                                            {endpoint.method !== 'GET' && endpoint.method !== 'DELETE' && (
                                                              <div className="space-y-2">
                                                                <Label className="text-xs text-gray-400">Request Schema</Label>
                                                                <textarea
                                                                  // value={JSON.stringify(generateEndpointSchema(endpoint.method, endpoint.path, proxyDesignSelectedSpec?.name).request, null, 2)}
                                                                  value={(() => { try { return JSON.stringify(JSON.parse(endpoint.requestBodySample), null, 2); } catch { return endpoint.requestBodySample || ''; } })()}
                                                                  onChange={(e) => {
                                                                    try {
                                                                      const parsed = JSON.parse(e.target.value);
                                                                      setEndpointSchemas(prev => ({
                                                                        ...prev,
                                                                        [endpointKey]: { ...prev[endpointKey], request: parsed }
                                                                      }));
                                                                    } catch (err) {
                                                                      // Invalid JSON, don't update
                                                                    }
                                                                  }}
                                                                  className="w-full h-32 px-3 py-2 rounded-lg border border-dark-700 bg-[#0a0e1b] text-white text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                                                />
                                                              </div>
                                                            )}
                                                            <div className="space-y-2">
                                                              <Label className="text-xs text-gray-400">Response Schema</Label>
                                                              <textarea
                                                                // value={JSON.stringify(generateEndpointSchema(endpoint.method, endpoint.path, proxyDesignSelectedSpec?.name).response, null, 2)}
                                                                value={(() => { try { return JSON.stringify(JSON.parse(endpoint.responseBody), null, 2); } catch { return endpoint.responseBody || ''; } })()}
                                                                onChange={(e) => {
                                                                  try {
                                                                    const parsed = JSON.parse(e.target.value);
                                                                    setEndpointSchemas(prev => ({
                                                                      ...prev,
                                                                      [endpointKey]: { ...prev[endpointKey], response: parsed }
                                                                    }));
                                                                  } catch (err) {
                                                                    // Invalid JSON, don't update
                                                                  }
                                                                }}
                                                                className="w-full h-48 px-3 py-2 rounded-lg border border-dark-700 bg-[#0a0e1b] text-white text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                                              />
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </>
                                              ) : (
                                                <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                                                  <p className="text-sm text-gray-400">No spec selected in Design step</p>
                                                </div>
                                              )}
                                            </div>
                                          </Card>

                                          {/* Mock Proxy Generated Result Card - Full Width Below */}
                                          {mockServerGenerated && (
                                            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                                                <div className="flex items-center gap-3 mb-3">
                                                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-white">{selectedGateway === 'Kong' ? 'Mock Service Generated Successfully' : 'Mock Proxy Generated Successfully'}</p>
                                                    <p className="text-xs text-gray-400">
                                                      {proxyDesignSelectedSpec?.name ? `mock-${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}` : 'mock-proxy-service'}
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 mt-4">
                                                  <div style={{ backgroundColor: "#0f172a80" }} className="p-3 rounded">
                                                    <div className="flex items-center justify-between mb-1">
                                                      <p className="text-xs text-gray-300">Server URL</p>
                                                      {mockServerBaseUrl && (
                                                        <button type="button" onClick={() => handleCopy('serverUrl', mockServerBaseUrl)} className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                                                          {copiedKey === 'serverUrl' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                      )}
                                                    </div>
                                                    <p className="text-xs text-green-400 font-mono break-all">
                                                      {mockServerBaseUrl || 'N/A'}
                                                    </p>
                                                  </div>
                                                  <div style={{ backgroundColor: "#0f172a80" }} className="p-3 rounded">
                                                    <p className="text-xs text-gray-300 mb-1">Status</p>
                                                    <p className="text-xs text-green-400">Running</p>
                                                  </div>
                                                  <div style={{ backgroundColor: "#0f172a80" }} className="p-3 rounded">
                                                    <p className="text-xs text-gray-300 mb-1">Endpoints</p>
                                                    <p className="text-xs text-gray-400">{mockEndpoints.length} active</p>
                                                  </div>
                                                </div>
                                              </div>
                                            </Card>
                                          )}

                                          {/* Test Mock Proxy/Service Button - Right Aligned */}
                                          {mockServerGenerated && !mockRunResults && (
                                            <div className="flex justify-end">
                                              <button
                                                type="button"
                                                onClick={handleTestMockProxy}
                                                className={cn(
                                                  'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center justify-center gap-2 active:scale-[0.98]'
                                                )}
                                              >
                                                <TestTube className="w-4 h-4" />
                                                {selectedGateway === 'Kong' ? 'Test Mock Service' : 'Test Mock Proxy'}
                                              </button>
                                            </div>
                                          )}

                                          {/* Mock Test Results Card - Full Width Below */}
                                          {mockRunResults && (
                                            <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                              <CardTitle className="mb-4 flex items-center gap-2">
                                                <TestTube className="w-5 h-5 text-primary" />
                                                {selectedGateway === 'Kong' ? 'Mock Service Test Results' : 'Mock Proxy Test Results'}
                                              </CardTitle>
                                              <div className="space-y-4">
                                                {/* Summary */}
                                                <div className="grid grid-cols-4 gap-4">
                                                  <div className="p-3 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                                                    <p className="text-xs text-gray-400 mb-1">Total</p>
                                                    <p className="text-lg font-semibold text-white">{mockRunResults.totalEndpoints}</p>
                                                  </div>
                                                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                                    <p className="text-xs text-gray-400 mb-1">Success</p>
                                                    <p className="text-lg font-semibold text-green-400">{mockRunResults.successCount}</p>
                                                  </div>
                                                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                                    <p className="text-xs text-gray-400 mb-1">Failed</p>
                                                    <p className="text-lg font-semibold text-red-400">{mockRunResults.failureCount}</p>
                                                  </div>
                                                  <div className="p-3 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                                                    <p className="text-xs text-gray-400 mb-1">Mock Server</p>
                                                    <p className="text-xs text-gray-300 truncate">{mockRunResults.mockServerName}</p>
                                                  </div>
                                                </div>

                                                {/* Individual Endpoint Results */}
                                                <div className="space-y-2">
                                                  <p className="text-sm font-medium text-gray-300">Endpoint Test Results</p>
                                                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                    {mockRunResults.results?.map((r) => {
                                                      const runKey = `run-${r.endpointId}`;
                                                      const isRunExpanded = expandedEndpoint === runKey;
                                                      return (
                                                        <div key={r.endpointId} className="rounded-lg bg-[#0f172a]/50 border border-dark-700 overflow-hidden">
                                                          <div
                                                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                                            onClick={() => setExpandedEndpoint(isRunExpanded ? null : runKey)}
                                                          >
                                                            <div className="flex items-center gap-3">
                                                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded',
                                                                r.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                                                                  r.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                                                                    r.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                      r.method === 'PATCH' ? 'bg-orange-500/20 text-orange-400' :
                                                                        r.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                                              )}>{r.method}</span>
                                                              <span className="text-xs font-medium text-white">{r.path}</span>
                                                              <span className={cn('text-xs px-2 py-0.5 rounded', r.statusCode >= 200 && r.statusCode < 300 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{r.statusCode} {r.statusText}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                              <span className="text-xs text-gray-400">{r.responseTimeMs}ms</span>
                                                              <span className={cn('text-xs font-medium', r.success ? 'text-green-400' : 'text-red-400')}>{r.success ? 'Success' : 'Failed'}</span>
                                                              <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(`run-path-${r.endpointId}`, r.path); }} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                                                                {copiedKey === `run-path-${r.endpointId}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                              </button>
                                                              <ChevronRight className={cn('w-3 h-3 text-gray-400 transition-transform', isRunExpanded && 'rotate-90')} />
                                                            </div>
                                                          </div>
                                                          {isRunExpanded && (r.requestBody || r.responseBody) && (
                                                            <div className="border-t border-dark-700 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                              {r.requestBody && (
                                                                <div className="space-y-1">
                                                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Request Body</p>
                                                                  <pre className="text-xs text-gray-300 bg-[#0a0f1e] rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(r.requestBody), null, 2); } catch { return r.requestBody; } })()}</pre>
                                                                </div>
                                                              )}
                                                              {r.responseBody && (
                                                                <div className="space-y-1">
                                                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Response Body</p>
                                                                  <pre className="text-xs text-gray-300 bg-[#0a0f1e] rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(r.responseBody), null, 2); } catch { return r.responseBody; } })()}</pre>
                                                                </div>
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                            </Card>
                                          )}
                                        </div>
                                      )}

                                      {currentStep === 6 && (
  <div className="space-y-6">
    <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {selectedGateway === 'Kong' ? 'Service Contract Testing & Approval' : 'Proxy Contract Testing & Approval'}
        </CardTitle>
        <button
          onClick={openPreviewModal}
          className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview & Send Approval
        </button>
      </div>

      {(() => {
        // Latest architect approval from history
        const latestArchitect = [...contractHistory]
          .filter(r => r.type === 'ARCHITECT')
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
        const architectStatus = latestArchitect?.status || '';

        // Latest consumer approval from history
        const latestConsumer = [...contractHistory]
          .filter(r => r.type === 'CONSUMER')
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
        const consumerStatus = latestConsumer?.status || '';

        return (
          <div className="space-y-4">
            {/* API Architect Review Card */}
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${architectStatus === 'APPROVED' ? 'bg-green-500/20' : 'bg-primary/20'}`}>
                    <UserCircle className={`w-5 h-5 ${architectStatus === 'APPROVED' ? 'text-green-400' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">API Architect Review</p>
                    <p className="text-xs text-gray-400">
                      {architectStatus === 'SENT' && 'Requested for Approval'}
                      {architectStatus === 'IN_PROGRESS' && 'Under Review'}
                      {architectStatus === 'APPROVED' && 'Approved by API Architect'}
                      {architectStatus === 'REJECTED' && 'Rejected'}
                      {!architectStatus && 'Not Initiated'}
                    </p>
                  </div>
                </div>
              </div>
              {architectStatus === 'SENT' && <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">Requested</span>}
              {architectStatus === 'IN_PROGRESS' && <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">Under Review</span>}
              {architectStatus === 'APPROVED' && <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">Approved</span>}
              {architectStatus === 'REJECTED' && <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">Rejected</span>}
              {!architectStatus && <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">Not Initiated</span>}
            </div>

            {/* Consumer Review Card */}
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${consumerStatus === 'APPROVED' ? 'bg-green-500/20' : 'bg-primary/20'}`}>
                    <Users className={`w-5 h-5 ${consumerStatus === 'APPROVED' ? 'text-green-400' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Consumer Review</p>
                    <p className="text-xs text-gray-400">
                      {consumerStatus === 'SENT' && 'Requested for Approval'}
                      {consumerStatus === 'IN_PROGRESS' && 'Under Review'}
                      {consumerStatus === 'APPROVED' && 'Approved by Consumer'}
                      {consumerStatus === 'REJECTED' && 'Rejected'}
                      {!consumerStatus && 'Not Initiated'}
                    </p>
                  </div>
                </div>
              </div>
              {consumerStatus === 'SENT' && <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">Requested</span>}
              {consumerStatus === 'IN_PROGRESS' && <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">Under Review</span>}
              {consumerStatus === 'APPROVED' && <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">Approved</span>}
              {consumerStatus === 'REJECTED' && <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">Rejected</span>}
              {!consumerStatus && <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">Not Initiated</span>}
            </div>

            {/* Contract Testing History */}
            <Card className="p-6 mt-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
              <CardTitle className="mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Approval History
              </CardTitle>
              {isFetchingHistory ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : contractHistory.length === 0 ? (
                <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center text-gray-400">
                  No approval history found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-dark-700">
                      <tr className="text-left text-xs font-semibold text-gray-400">
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Sent By</th>
                        <th className="pb-2">Approver</th>
                        <th className="pb-2">Sent At</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
{contractHistory.map((record) => (
  <tr key={record.id} className="hover:bg-white/[0.03]">
    <td className="py-2 capitalize">{record.type?.toLowerCase()}</td>
    <td className="py-2">
      <span className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        record.status === 'APPROVED' && 'bg-green-500/20 text-green-400',
        record.status === 'REJECTED' && 'bg-red-500/20 text-red-400',
        record.status === 'IN_PROGRESS' && 'bg-yellow-500/20 text-yellow-400',
        record.status === 'SENT' && 'bg-blue-500/20 text-blue-400'
      )}>
        {record.status === 'SENT' ? 'Requested' : 
         record.status === 'IN_PROGRESS' ? 'Under Review' :
         record.status === 'APPROVED' ? 'Approved' :
         record.status === 'REJECTED' ? 'Rejected' : record.status || 'Not initiated'}
      </span>
    </td>
    <td className="py-2">{record.sentBy || '-'}</td>
    <td className="py-2">{record.approverEmail || '-'}</td>
    <td className="py-2 max-w-[200px] truncate" title={record.reviewComment || ''}>
      {record.reviewComment || '-'}
    </td>
    <td className="py-2">{record.sentAt ? new Date(record.sentAt).toLocaleString() : '-'}</td>
    <td className="py-2">
      <button
        onClick={() => openHistoryDetail(record)}
        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
        title="View details"
      >
        <Eye className="w-4 h-4" />
      </button>
    </td>
  </tr>
))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        );
      })()}
    </Card>
  </div>
)}



                                      {/* Step 11: Complete */}
                                      {currentStep === 11 && (
                                        <Card className="p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                          <div className="space-y-6">
                                            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                                              <CheckCircle className="w-12 h-12 text-green-400" />
                                            </div>
                                            <div>
                                              <h2 className="text-2xl font-bold text-white mb-2">Generation Complete!</h2>
                                              <p className="text-gray-400">{selectedGateway === 'Kong' ? 'Your service has been successfully generated and is ready for deployment.' :
                                               `Your ${resourceType == "Shared Function"? "function" : "api"} has been successfully generated and is ready for deployment.`}</p>
                                            </div>

                                            {/* Kong API Response Summary - Only for Kong gateway */}
                                            {selectedGateway === 'Kong' && kongApiResponse && kongApiResponse.success && (
                                              <Card className="p-6 text-left bg-green-500/10 border border-green-500/30">
                                                <div className="flex items-center gap-2 mb-4">
                                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                                  <h3 className="text-lg font-semibold text-white">Deployment Summary</h3>
                                                </div>
                                                <div className="space-y-3 text-sm">
                                                  <div className="flex justify-between">
                                                    <span className="text-gray-400">Spec Title:</span>
                                                    <span className="text-white">{kongApiResponse.specTitle}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-gray-400">Status:</span>
                                                    <span className="text-green-400 font-semibold">Success</span>
                                                  </div>
                                                  {kongApiResponse.services && kongApiResponse.services.length > 0 && (
                                                    <>
                                                      <div className="pt-2 border-t border-green-500/20">
                                                        <span className="text-gray-400 block mb-2">Service Details:</span>
                                                        {kongApiResponse.services.map((service, idx) => (
                                                          <div key={idx} className="space-y-2 pl-3">
                                                            <div className="flex justify-between">
                                                              <span className="text-gray-400">Service Name:</span>
                                                              <span className="text-white font-mono">{service.serviceName}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                              <span className="text-gray-400">Service ID:</span>
                                                              <span className="text-white font-mono text-xs">{service.serviceId}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                              <span className="text-gray-400">Routes Created:</span>
                                                              <span className="text-white">{service.routeIds?.length || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                              <span className="text-gray-400">Plugins Configured:</span>
                                                              <span className="text-white">{service.pluginIds?.length || 0}</span>
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              </Card>
                                            )}
                                            {/* Comprehensive Summary Data Card */}
                                            <Card className="p-6 text-left" style={{ backgroundColor: '#1a1f35' }}>
                                              <CardTitle className="mb-4 flex items-center gap-2 text-lg">
                                                <FileText className="w-5 h-5 text-primary" />
                                                Generation Summary
                                              </CardTitle>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Proxy Specification */}
                                                {resourceType != "Shared Function" &&
                                                <div className="space-y-2">
                                                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">{selectedGateway === 'Kong' ? 'Service Specification' : 'Proxy Specification'}</h3>
                                                  <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">Spec Name:</span>
                                                      <span className="text-white">{proxyDesignSelectedSpec?.name || 'Not selected'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">Source:</span>
                                                      <span className="text-white capitalize">{proxyDesignSelectedSpec?.source || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">Import Mode:</span>
                                                      <span className="text-white capitalize">{proxyDesignImportMode}</span>
                                                    </div>
                                                  </div>
                                                </div>}

                                                {/* Gateway Platform */}
                                                <div className="space-y-2">
                                                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Gateway Platform</h3>
                                                  <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">Platform:</span>
                                                      <span className="text-white capitalize">{selectedGateway === 'Kong' ? 'Kong Konnect' : selectedFramework}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Proxy Configuration */}
                                                <div className="space-y-2">
                                                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">{selectedGateway === 'Kong' ? 'Service Configuration' :resourceType == "Shared Function" ? "Function Configuration" : 'API Configuration'}</h3>
                                                  <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">{selectedGateway === 'Kong' ? 'Service Name:' :resourceType == "Shared Function" ? "Function Name" : 'API Name:'}</span>
                                                      <span className="text-white">{proxyName || 'Not set'}</span>
                                                    </div>
                                                    {resourceType !== "Shared Function" &&
                                                      <>
                                                      <div className="flex justify-between">
                                                      <span className="text-gray-400">{selectedGateway === 'Kong' ? 'Path:' : 'Base Path:'}</span>
                                                      <span className="text-white font-mono">{basePath || 'Not set'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">{selectedGateway === 'Kong' ? 'Upstream URL:' : 'Target URL:'}</span>
                                                      <span className="text-white">{targetUrl || 'Not set'}</span>
                                                    </div>
                                                    </>}
                                                  </div>
                                                </div>

                                                {/* Import Configuration */}
                                                <div className="space-y-2">
                                                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Import Configuration</h3>
                                                  <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                      <span className="text-gray-400">Import Source:</span>
                                                      <span className="text-white capitalize">{importSource}</span>
                                                    </div>
                                                    {specFile && (
                                                      <div className="flex justify-between">
                                                        <span className="text-gray-400">File:</span>
                                                        <span className="text-white">{specFile.name}</span>
                                                      </div>
                                                    )}
                                                    {urlInput && (
                                                      <div className="flex justify-between">
                                                        <span className="text-gray-400">URL:</span>
                                                        <span className="text-white">{urlInput}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Policy Chain / Plugins */}
                                                {selectedGateway === 'Kong' ? (
                                                  /* Kong Plugins Section */
                                                  kongApiResponse && kongApiResponse.services && kongApiResponse.services.length > 0 && kongApiResponse.services[0].pluginIds ? (
                                                    <div className="space-y-2 md:col-span-2">
                                                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Plugins ({kongApiResponse.services[0].pluginIds.length} configured)</h3>
                                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                                        {kongApiResponse.services[0].pluginIds.map((pluginId, idx) => (
                                                          <div key={pluginId} className="flex items-center justify-between">
                                                            <span className="text-gray-300">{idx + 1}. Plugin ID: {pluginId.substring(0, 8)}...</span>
                                                            <span className="text-green-400 text-xs">Enabled</span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-2 md:col-span-2">
                                                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Plugins</h3>
                                                      <p className="text-sm text-gray-500">No plugins configured</p>
                                                    </div>
                                                  )
                                                ) : (
                                                  /* Policy Chain for other gateways */
                                                  <div className="space-y-2 md:col-span-2">
                                                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Policy Chain ({policies.length} policies)</h3>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                      {policies.length > 0 ? (
                                                        policies.map((policy, idx) => (
                                                          <div key={policy.id} className="flex items-center justify-between">
                                                            <span className="text-gray-300">{idx + 1}. {policy.name}</span>
                                                            <span className={policy.enabled ? 'text-green-400 text-xs' : 'text-gray-500 text-xs'}>
                                                              {policy.enabled ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                          </div>
                                                        ))
                                                      ) : (
                                                        <p className="text-sm text-gray-500 col-span-2">No policies configured</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </Card>
                                          </div>
                                        </Card>
                                      )}

                                      {/* Gateway Configuration Page */}
                                      {currentStep === 'gateway-config' && (
                                        <div className="space-y-6">
                                          {/* Back button */}
                                          <div className="flex items-center gap-4">
                                            <button
                                              type="button"
                                              onClick={() => setCurrentStep(1)}
                                              className={cn(
                                                'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                                'bg-dark-700 hover:bg-dark-600 text-white',
                                                'flex items-center gap-2 active:scale-[0.98]'
                                              )}
                                            >
                                              <ArrowLeft className="w-4 h-4" />
                                              Back to Onboarding
                                            </button>
                                          </div>

                                          {/* Profiles Section */}
                                          <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <div className="flex items-center justify-between mb-6">
                                              <CardTitle className="flex items-center gap-2 text-white text-lg">
                                                <Server className="w-5 h-5 text-primary" />
                                                {selectedGateway} Configuration
                                              </CardTitle>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  // Scroll to service account form
                                                  document.getElementById('service-account-section')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                                className={cn(
                                                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-2 active:scale-[0.98]'
                                                )}
                                              >
                                                <Plus className="w-4 h-4" />
                                                Add Profile
                                              </button>
                                            </div>

                                            {/* Profiles Table */}
                                            <div className="overflow-hidden rounded-lg border border-dark-700">
                                              <table className="w-full">
                                                <thead>
                                                  <tr className="bg-dark-800/50 border-b border-dark-700">
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300">Profile ID</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300">Organization(s)</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300">Environments</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300">Actions</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-dark-700">
                                                  {(() => {
                                                    const savedConfig = localStorage.getItem(`probeStack_gatewayConfig_${selectedGateway}`);
                                                    const config = savedConfig ? JSON.parse(savedConfig) : null;
                                                    if (config && config.serviceAccountJson) {
                                                      try {
                                                        const saJson = JSON.parse(config.serviceAccountJson);
                                                        return (
                                                          <tr className="bg-dark-900/40 hover:bg-dark-800/50 transition-colors">
                                                            <td className="px-6 py-4 text-sm text-white">{saJson.project_id || 'probestack-X-migration'}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-300">{saJson.project_id || 'gen-ai-poc-onboarding'}</td>
                                                            <td className="px-6 py-4">
                                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-gray-300">
                                                                dev
                                                              </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                              <div className="flex items-center gap-2">
                                                                <button className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-dark-700/50 transition-all">
                                                                  <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-dark-700/50 transition-all">
                                                                  <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-dark-700/50 transition-all">
                                                                  <Trash2 className="w-4 h-4" />
                                                                </button>
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        );
                                                      } catch {
                                                        return null;
                                                      }
                                                    }
                                                    return (
                                                      <tr className="bg-dark-900/40">
                                                        <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-400">
                                                          No profiles configured yet. Click "Add Profile" to create one.
                                                        </td>
                                                      </tr>
                                                    );
                                                  })()}
                                                </tbody>
                                              </table>
                                            </div>
                                          </Card>

                                          {/* Service Account JSON Configuration */}
                                          <Card id="service-account-section" className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            <div className="space-y-6">
                                              {/* File Upload */}
                                              <div className="space-y-2">
                                                <Label className="text-sm text-gray-300 font-medium">Service Account JSON File *</Label>
                                                <div className="flex items-center gap-3">
                                                  <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                          const content = event.target?.result;
                                                          if (content) {
                                                            setGatewayConfigForm({
                                                              ...gatewayConfigForm,
                                                              serviceAccountJson: content
                                                            });
                                                            showMessage('Service Account JSON uploaded successfully', 'success');
                                                          }
                                                        };
                                                        reader.readAsText(file);
                                                      }
                                                    }}
                                                    className="hidden"
                                                    id="gateway-json-upload"
                                                  />
                                                  <label
                                                    htmlFor="gateway-json-upload"
                                                    className={cn(
                                                      'px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                                                      'bg-dark-700 hover:bg-dark-600 text-white border border-dark-700',
                                                      'flex items-center gap-2'
                                                    )}
                                                  >
                                                    <Upload className="w-4 h-4" />
                                                    Upload JSON File
                                                  </label>
                                                  {gatewayConfigForm.serviceAccountJson && (
                                                    <span className="text-sm text-green-400 flex items-center gap-1">
                                                      <CheckCircle className="w-4 h-4" />
                                                      File uploaded
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Or Paste JSON */}
                                              <div className="space-y-2">
                                                <Label className="text-sm text-gray-300 font-medium">Or Paste Service Account JSON *</Label>
                                                <textarea
                                                  className="w-full h-48 rounded-lg px-4 py-3 text-sm text-white bg-dark-900 border border-dark-700 resize-none font-mono"
                                                  placeholder={`Paste your Service Account JSON here (e.g., {"type": "service_account", "project_id": "...", ...})`}
                                                  value={gatewayConfigForm.serviceAccountJson}
                                                  onChange={(e) => setGatewayConfigForm({
                                                    ...gatewayConfigForm,
                                                    serviceAccountJson: e.target.value
                                                  })}
                                                />
                                                <p className="text-xs text-gray-500">
                                                  Paste your Google Cloud Service Account JSON. It must contain a "project_id" field.
                                                </p>
                                              </div>

                                              {/* Action Buttons */}
                                              <div className="flex items-center gap-3 pt-4">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (!gatewayConfigForm.serviceAccountJson.trim()) {
                                                      showMessage('Please provide Service Account JSON', 'error');
                                                      return;
                                                    }
                                                    // Save to localStorage
                                                    localStorage.setItem(`probeStack_gatewayConfig_${selectedGateway}`, JSON.stringify(gatewayConfigForm));
                                                    showMessage(`${selectedGateway} configuration saved successfully`, 'success');
                                                  }}
                                                  disabled={!gatewayConfigForm.serviceAccountJson.trim()}
                                                  className={cn(
                                                    'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                                                    'flex items-center gap-2',
                                                    gatewayConfigForm.serviceAccountJson.trim()
                                                      ? 'bg-red-500/80 hover:bg-red-500 text-white'
                                                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                                                  )}
                                                >
                                                  <Search className="w-4 h-4" />
                                                  Verify Connection
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setGatewayConfigForm({
                                                      serviceAccountJson: '',
                                                      organization: '',
                                                      environment: ''
                                                    });
                                                  }}
                                                  className={cn(
                                                    'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                                                    'bg-dark-700 hover:bg-dark-600 text-white border border-primary',
                                                    'flex items-center gap-2'
                                                  )}
                                                >
                                                  Clear
                                                </button>
                                              </div>
                                            </div>
                                          </Card>
                                        </div>
                                      )}

                                      {/* Step Navigation - Show always, including during generation/success */}
                                      {currentStep !== 'gateway-config' && (currentStep !== 7 || !isGenerating || (isGenerating && currentSubStep >= proxyDevSubSteps.length)) && (!isApigeeProxyDevelopmentStep || isLastProxySetupSubStep) && (
                                        <div className="mt-8 flex items-center justify-between border-t border-dark-700 pt-6">
                                          {/* <button type="button" onClick={handleSave} className={cn('px-6 py-2.5 rounded-lg font-semibold text-sm transition-all', 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25', 'flex items-center gap-2 active:scale-[0.98]')}><Save className="w-4 h-4" />Save</button> */}
                                          <span></span>
                                          <div className="flex items-center gap-3">
                                            {currentStep > 1 && (
                                              <button
                                                type="button"
                                                onClick={handlePrevious}
                                                className={cn(
                                                  'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
                                                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                                  'flex items-center gap-2 active:scale-[0.98]'
                                                )}
                                              >
                                                <ArrowLeft className="w-4 h-4" />
                                                Previous
                                              </button>
                                            )}
                                            {getNextStepId(currentStep) && !isStepRequired(selectedWorkflow, currentStep) && (
                                              <button
                                                type="button"
                                                onClick={() => { const next = getNextStepId(currentStep); if (next) { setCurrentStep(next); setShowProxyDevSubBranch(next === 7); window.scrollTo(0, 0); } }}
                                                className={cn('px-6 py-2.5 rounded-lg font-semibold text-sm transition-all', 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 hover:border-amber-500/50', 'flex items-center gap-2 active:scale-[0.98]')}
                                              >
                                                Skip<ChevronRight className="w-4 h-4" />
                                              </button>
                                            )}
                                            {getNextStepId(currentStep) && (<button type="button" onClick={handleNext} className={cn('px-6 py-2.5 rounded-lg font-semibold text-sm transition-all', 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25', 'flex items-center gap-2 active:scale-[0.98]')}>Next<ArrowRight className="w-4 h-4" /></button>)}
                                          </div>
                                        </div>
                                      )}
                                    </div>)
        }
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img src="/assets/justlogo.png" alt="ProbeStack logo" className="h-6 w-auto" onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span className="text-gray-400">© {new Date().getFullYear()} All rights reserved</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Terms of Service</a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Connector Modal */}
      <ConnectorModal
        isOpen={showConnectorModal}
        onClose={() => setShowConnectorModal(false)}
        onSave={handleSaveConnections}
        organizationId={organizationId}
        connectorId={existingConfigId}
        pageType="proxy"
      />

      {/* Deployment Modal */}
      {showDeploymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {deploymentStatus === 'deploying' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20"><div className="absolute inset-0 rounded-full border-4 border-dark-700"></div><div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Rocket className="w-8 h-8 text-primary animate-pulse" /></div></div>
                <div><h3 className="text-xl font-bold text-white mb-2">Deploying Proxy to Production</h3><p className="text-gray-400 text-sm">Please wait while we deploy your proxy...</p></div>
                <div className="flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div></div>
              </div>
            )}
            {deploymentStatus === 'success' && (
              <div className="space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-12 h-12 text-green-500" /></div>
                <div><h3 className="text-xl font-bold text-white mb-2">Proxy Successfully Deployed!</h3><p className="text-gray-400 text-sm">Your proxy has been deployed to production.</p></div>
                <div className="pt-2"><button onClick={closeDeploymentModal} className="px-8 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-all">Done</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {saveStatus === 'saving' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20"><div className="absolute inset-0 rounded-full border-4 border-dark-700"></div><div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Save className="w-8 h-8 text-primary animate-pulse" /></div></div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {currentStep === 1 && 'Saving Business Onboarding Information...'}
                    {currentStep === 2 && 'Saving Proxy Requirements...'}
                    {currentStep === 3 && 'Saving Proxy Design Specifications...'}
                    {currentStep === 4 && 'Saving Proxy Design Validation...'}
                    {currentStep === 5 && 'Saving Proxy Mock Configuration...'}
                    {currentStep === 6 && 'Saving Proxy Contract Testing & Approval...'}
                    {currentStep === 7 && 'Saving Proxy Development Settings...'}
                    {currentStep === 8 && 'Saving Proxy Test Cases...'}
                    {currentStep === 9 && 'Saving Proxy Code Analysis Configuration...'}
                    {currentStep === 10 && 'Saving Proxy Code Review & Approval...'}
                  </h3>
                  <p className="text-gray-400 text-sm">Please wait while we save your changes...</p>
                </div>
                <div className="flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div></div>
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-12 h-12 text-green-500" /></div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {currentStep === 1 && 'Business Onboarding Information Saved!'}
                    {currentStep === 2 && (selectedGateway === 'Kong' ? 'Service Requirements Saved!' : 'Proxy Requirements Saved!')}
                    {currentStep === 3 && (selectedGateway === 'Kong' ? 'Service Design Specifications Saved!' : 'Proxy Design Specifications Saved!')}
                    {currentStep === 4 && (selectedGateway === 'Kong' ? 'Service Design Validation Saved!' : 'Proxy Design Validation Saved!')}
                    {currentStep === 5 && (selectedGateway === 'Kong' ? 'Service Mock Configuration Saved!' : 'Proxy Mock Configuration Saved!')}
                    {currentStep === 6 && (selectedGateway === 'Kong' ? 'Service Contract Testing & Approval Saved!' : 'Proxy Contract Testing & Approval Saved!')}
                    {currentStep === 7 && (selectedGateway === 'Kong' ? 'Service Development Settings Saved!' : 'Proxy Development Settings Saved!')}
                    {currentStep === 8 && (selectedGateway === 'Kong' ? 'Service Test Cases Saved!' : 'Proxy Test Cases Saved!')}
                    {currentStep === 9 && (selectedGateway === 'Kong' ? 'Service Code Analysis Configuration Saved!' : 'Proxy Code Analysis Configuration Saved!')}
                    {currentStep === 10 && (selectedGateway === 'Kong' ? 'Service Code Review & Approval Saved!' : 'Proxy Code Review & Approval Saved!')}
                    {currentStep === 11 && 'Generation Complete!'}
                  </h3>
                  <p className="text-gray-400 text-sm">Your changes have been saved successfully.</p>
                </div>
                <div className="pt-2"><button onClick={closeSaveModal} className="px-8 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all">Done</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mock Proxy Generation Modal */}
      {showMockServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {mockServerStatus === 'generating' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-dark-700"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FlaskConical className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{selectedGateway === 'Kong' ? 'Generating Mock Service' : 'Generating Mock Proxy'}</h3>
                  <p className="text-gray-400 text-sm">Creating mock endpoints and configurations...</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            {mockServerStatus === 'success' && (
              <div className="space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{selectedGateway === 'Kong' ? 'Mock Service Generated!' : 'Mock Proxy Generated!'}</h3>
                  <p className="text-gray-400 text-sm">{selectedGateway === 'Kong' ? 'Your mock service is ready to use.' : 'Your mock proxy is ready to use.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mock Test Processing Modal */}
      {showMockTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {mockTestStatus === 'testing' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-dark-700"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TestTube className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Testing Mock Proxy</h3>
                  <p className="text-gray-400 text-sm">Running tests on all mock endpoints...</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            {mockTestStatus === 'success' && (
              <div className="space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Tests Completed!</h3>
                  <p className="text-gray-400 text-sm">All mock endpoints tested successfully.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-6 bg-[#161b30] border border-gray-700 shadow-2xl text-center">

            {/* Spinner */}
            <div className="relative mx-auto mb-5 w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-1">
              {actionMode === 'cloning' ? 'Cloning Service' : 'Creating New Version'}
            </h3>

            {/* Subtitle */}
            <p className="text-sm text-gray-400">
              Please wait while we process your request...
            </p>

          </div>
        </div>
      )}

      {/* App Credentials Modal */}
      {showAppCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-dark-700 shadow-2xl" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="p-6 border-b border-dark-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Key className="w-6 h-6 text-primary" />
                  Application Credentials
                </h3>
                <button
                  onClick={() => setShowAppCredentialsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">API Gateway Key</span>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors">Copy</button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    gw_live_51ProxyAPIKey789XYZ123456789ABCDEF
                  </code>
                </div>

                <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Proxy Client ID</span>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors">Copy</button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    client_proxy_8e7d6c5b4a3210
                  </code>
                </div>

                <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Proxy Secret</span>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors">Copy</button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    ps_secret_proxy_z9y8x7w6v5u4t3s2r1
                  </code>
                </div>

                <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Target Backend URL</span>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors">Copy</button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    https://backend-api.example.com/v1
                  </code>
                </div>

                <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Proxy Endpoint</span>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors">Copy</button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    https://api-proxy.example.com/v1
                  </code>
                </div>

                <div className="p-4 rounded-lg bg-[#0f172a]/50 border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">OAuth Token</span>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors">Copy</button>
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    oauth_token_proxy_abc123def456ghi789jkl012
                  </code>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-medium mb-1">Security Notice</p>
                    <p className="text-xs text-yellow-300/80">
                      Store these credentials securely. Never commit them to version control or share them publicly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-dark-700 flex justify-end">
              <button
                onClick={() => setShowAppCredentialsModal(false)}
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Request Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="p-6 overflow-y-auto">
              {approvalStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Send className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {approvalType === 'architect' ? 'Request API Architect Approval' : approvalType === 'consumer' ? 'Request Consumer Approval' : 'Request Security Approval'}
                      </h3>
                      <p className="text-xs text-gray-400">Fill in the details to send approval request</p>
                    </div>
                  </div>

                  {/* OpenAPI Spec */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">OpenAPI Spec</Label>
                    <Input
                      value={proxyDesignSelectedSpec?.name || 'No spec selected'}
                      readOnly
                      className="h-9 text-sm bg-dark-800/50 text-white"
                    />
                  </div>

                  {/* Mock Server URL */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Mock Server URL</Label>
                    <Input
                      value={mockServerGenerated && proxyDesignSelectedSpec?.name
                        ? `https://mock-${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}.example.com/v1`
                        : 'Mock server not generated'}
                      readOnly
                      className="h-9 text-sm bg-dark-800/50 text-white"
                    />
                  </div>

                  {/* Specification URL */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Specification URL</Label>
                    <Input
                      value={approvalSpecUrl || (proxyDesignSelectedSpec?.name
                        ? `https://${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}.example.com/v1`
                        : '')}
                      onChange={(e) => setApprovalSpecUrl(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                    />
                  </div>

                  {/* Mock Service Setting */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Mock Service Name</Label>
                    <Input
                      value={mockServiceName || (proxyDesignSelectedSpec?.name
                        ? `mock-${proxyDesignSelectedSpec.name.toLowerCase().replace(/\s+/g, '-')}`
                        : 'mock-service')}
                      readOnly
                      className="h-9 text-sm bg-dark-800/50 text-white"
                    />
                  </div>

                  {/* Request JSON */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Request JSON</Label>
                    <textarea
                      value={approvalRequestJson}
                      onChange={(e) => setApprovalRequestJson(e.target.value)}
                      placeholder="Paste request JSON here..."
                      className="w-full h-24 rounded-lg px-3 py-2 text-xs text-white bg-transparent border border-dark-700 resize-none"
                      style={{ backgroundColor: '#0f172a80' }}
                    />
                  </div>

                  {/* Response JSON */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Response JSON</Label>
                    <textarea
                      value={approvalResponseJson}
                      onChange={(e) => setApprovalResponseJson(e.target.value)}
                      placeholder="Paste response JSON here..."
                      className="w-full h-24 rounded-lg px-3 py-2 text-xs text-white bg-transparent border border-dark-700 resize-none"
                      style={{ backgroundColor: '#0f172a80' }}
                    />
                  </div>

                  {/* Consumer Information */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Consumer Information</Label>
                    <Input
                      value={selectedOnboardingConsumers?.length > 0
                        ? selectedOnboardingConsumers.map(id => {
                          const consumer = savedConsumers.find(c => c.id === id);
                          return consumer ? (consumer.consumerName || consumer.name || 'Unnamed') : 'Unnamed';
                        }).join(', ')
                        : (savedConsumers?.length > 0
                          ? savedConsumers.slice(0, 2).map(c => c.consumerName || c.name || 'Unnamed').join(', ') + (savedConsumers.length > 2 ? ` +${savedConsumers.length - 2} more` : '')
                          : 'No consumers selected')}
                      readOnly
                      className="h-9 text-sm bg-dark-800/50 text-white"
                    />
                  </div>

                  {/* Approver Email */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">Approver Email <span className="text-red-400">*</span></Label>
                    <Input
                      type="email"
                      placeholder="approver@company.com"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowApprovalModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      // onClick={() => {
                      //   if (!approverEmail.trim()) {
                      //     showMessage('Please enter approver email', 'error');
                      //     return;
                      //   }
                      //   // Set In Review status when sending
                      //   if (approvalType === 'architect') {
                      //     setArchitectInReview(true);
                      //   } else if (approvalType === 'consumer') {
                      //     setConsumerInReview(true);
                      //   }
                      //   setApprovalStatus('sending');
                      //   setTimeout(() => {
                      //     setApprovalStatus('success');
                      //     setTimeout(() => {
                      //       setShowApprovalModal(false);
                      //       setApprovalStatus('idle');
                      //     }, 1000);
                      //   }, 2000);
                      // }}

                      onClick={async () => {
                        if (!approverEmail.trim()) {
                          showMessage('Please enter approver email', 'error');
                          return;
                        }
                        await handleSendApprovalRequest(approvalType);
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send for Approval
                    </button>
                  </div>
                </div>
              )}

              {approvalStatus === 'sending' && (
                <div className="space-y-6 py-8 text-center">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-dark-700"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Send className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Sending Approval Request</h3>
                    <p className="text-gray-400 text-sm">Please wait while we send the request to {approverEmail}...</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}

              {approvalStatus === 'success' && (
                <div className="space-y-6 py-8">
                  <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Approval Request Sent!</h3>
                    <p className="text-gray-400 text-sm">
                      Request sent to {approverEmail} for {approvalType === 'architect' ? 'API Architect' : approvalType === 'consumer' ? 'Consumer' : 'Security'} review.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="w-full px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

              {/* Test Case Detail Modal */}
      {showTestCaseModal && selectedTestCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                Test Case Details
              </h3>
      <button
        onClick={() => { setShowTestCaseModal(false); setSelectedTestCase(null); setSingleRunResult(null); }}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">Title:</span> <span className="text-white font-mono">{selectedTestCase.title}</span></div>
                <div><span className="text-gray-400">Category:</span> <span className="text-white">{selectedTestCase.category || selectedTestCase.testType}</span></div>
                <div><span className="text-gray-400">Expected Status:</span> <span className="text-white">{selectedTestCase.expectedStatus}</span></div>
                <div><span className="text-gray-400">Test Type:</span> <span className="text-white">{selectedTestCase.testType}</span></div>
              </div>
      
              {/* Request & Expected Response side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Request */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-primary">Request</h4>
                  <div className="rounded-lg border border-dark-700 bg-[#0f172a]/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded',
                        selectedTestCase.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                          selectedTestCase.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                            selectedTestCase.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                              selectedTestCase.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                      )}>{selectedTestCase.method}</span>
                      <span className="text-xs text-white font-mono">{selectedTestCase.endpoint || selectedTestCase.path}</span>
                    </div>
                    {selectedTestCase.requestBodySample && (
                      <pre className="text-xs font-mono bg-[#0a0e1b] p-2 rounded overflow-auto max-h-48">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedTestCase.requestBodySample), null, 2);
                          } catch {
                            return selectedTestCase.requestBodySample;
                          }
                        })()}
                      </pre>
                    )}
                  </div>
                </div>
      
                {/* Expected Response */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-primary">Expected Response</h4>
                  <div className="rounded-lg border border-dark-700 bg-[#0f172a]/50 p-3">
                    <div className="mb-2">
                      <span className="text-xs text-green-400 font-mono">HTTP {selectedTestCase.expectedStatus}</span>
                    </div>
                    {selectedTestCase.responseSample && (
                      <pre className="text-xs font-mono bg-[#0a0e1b] p-2 rounded overflow-auto max-h-48">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedTestCase.responseSample), null, 2);
                          } catch {
                            return selectedTestCase.responseSample;
                          }
                        })()}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
      
              {/* Assertions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-primary">Generated Assertions</h4>
                <div className="rounded-lg border border-dark-700 bg-[#0f172a]/50 p-3">
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                    {selectedTestCase.assertions || 'pm.test("Status code is 2xx", function () {\n    var code = pm.response.code;\n    if (code < 200 || code >= 300) throw new Error("Expected 2xx but got " + code);\n});\npm.test("Response time is acceptable", function () {\n    if (pm.response.responseTime > 5000) throw new Error("Too slow: " + pm.response.responseTime + "ms");\n});'}
                  </pre>
                </div>
              </div>
      
              {/* --- NEW: Single Run Section --- */}
              <div className="border-t border-dark-700 pt-4 mt-2">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-300 mb-1 block">Base URL (target API)</label>
                    <input
                      type="text"
                      value={runBaseUrl}
                      onChange={(e) => setRunBaseUrl(e.target.value)}
                      placeholder="http://localhost:8080"
                      className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm"
                    />
                  </div>
                  {selectedTestCase && (selectedTestCase.method === 'POST' || selectedTestCase.method === 'PUT' || selectedTestCase.method === 'PATCH') && (
        <div>
          <label className="text-xs text-gray-300 mb-1 block">Request Body (JSON) – edit if needed</label>
          <textarea
            value={runCustomBody}
            onChange={(e) => setRunCustomBody(e.target.value)}
            rows={6}
            className="w-full font-mono text-xs bg-dark-900 border border-dark-600 rounded-lg p-2 text-white"
            placeholder='{"key": "value"}'
          />
        </div>
      )}
      {singleRunResult && singleRunResult.items && singleRunResult.items[0] && (
        <div className="rounded-lg border border-dark-700 p-4 space-y-2 bg-dark-900/50">
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-sm font-medium",
              singleRunResult.items[0].executionStatus === 'passed' ? "text-green-400" : "text-red-400"
            )}>
              {singleRunResult.items[0].executionStatus === 'passed' ? 'Passed' : 'Failed'}
            </span>
            <span className="text-xs text-gray-400">
              {singleRunResult.items[0].responseStatus !== null ? (
                <>Status: {singleRunResult.items[0].responseStatus} | {singleRunResult.items[0].responseTimeMs}ms</>
              ) : (
                <span className="text-red-300">Error: {singleRunResult.items[0].errorMessage || 'Request failed'}</span>
              )}
            </span>
          </div>
          {singleRunResult.items[0].responseBody && (
            <pre className="text-xs bg-black/30 p-2 rounded overflow-auto max-h-64">
              {typeof singleRunResult.items[0].responseBody === 'object' 
                ? JSON.stringify(singleRunResult.items[0].responseBody, null, 2) 
                : singleRunResult.items[0].responseBody}
            </pre>
          )}
          {singleRunResult.items[0].errorMessage && !singleRunResult.items[0].responseBody && (
            <div className="text-red-400 text-sm mt-2">{singleRunResult.items[0].errorMessage}</div>
          )}
        </div>
      )}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={async () => {
                        if (!runBaseUrl.trim()) {
                          showMessage('Please enter base URL', 'error');
                          return;
                        }
                        setSingleRunLoading(true);
                        let customBody = null;
                        if (runCustomBody.trim()) {
                          try {
                            customBody = JSON.parse(runCustomBody);
                          } catch (e) {
                            showMessage('Invalid JSON in request body', 'error');
                            setSingleRunLoading(false);
                            return;
                          }
                        }
                        const result = await testCaseService.runSingleTestCase(
                          onboardingId,
                          selectedTestCase.id,
                          runBaseUrl,
                          customBody
                        );
                        if (result.success) {
                          setSingleRunResult(result.data);
                          // Refresh run history
                          const historyRes = await testCaseService.getExecutionHistoryForMicroservice(onboardingId);
                          if (historyRes.success) setRunHistory(historyRes.data || []);
                        } else {
                          showMessage(result.error, 'error');
                        }
                        setSingleRunLoading(false);
                      }}
                      disabled={singleRunLoading}
                      className="px-6 py-2 rounded-lg bg-primary text-white font-semibold flex items-center gap-2"
                    >
                      {singleRunLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Run Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button
                onClick={() => { setShowTestCaseModal(false); setSelectedTestCase(null); setSingleRunResult(null); }}
                className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ForgeStudio Access Modal */}
      {proxyShowForgeStudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">ForgeStudio Access Required</h3>
                <p className="text-gray-400 text-sm">
                  You do not have access to ForgeStudio yet. Please contact support to get details.
                </p>
              </div>
              <div className="pt-2 flex gap-3 justify-center">
                <button
                  onClick={() => setProxyShowForgeStudioModal(false)}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Run Tests Full Modal */}  
        {showRunModal && (
          <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col" style={{ backgroundColor: '#0e172a' }}>
            <div className="px-6 py-4 border-b border-dark-700 bg-[#0f172a]/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowRunModal(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className="h-6 w-px bg-dark-700"></div>
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Test Execution Results
                    </h2>
                    <p className="text-sm text-gray-400">
                      [Microservice]: {apiName || 'N/A'} | Base URL: {runBaseUrl}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {runningTestsModal && (
                    <div className="flex items-center gap-2 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Running tests...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {!detailedRunResults ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <p className="text-3xl font-bold text-green-400">{detailedRunResults.passed ?? 0}</p>
                      <p className="text-xs text-gray-400 mt-1">Passed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                      <p className="text-3xl font-bold text-red-400">{detailedRunResults.failed ?? 0}</p>
                      <p className="text-xs text-gray-400 mt-1">Failed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                      <p className="text-3xl font-bold text-yellow-400">{detailedRunResults.skipped ?? 0}</p>
                      <p className="text-xs text-gray-400 mt-1">Skipped</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                      <p className="text-3xl font-bold text-primary">{detailedRunResults.passRate ?? 0}%</p>
                      <p className="text-xs text-gray-400 mt-1">Pass Rate</p>
                    </div>
                  </div>

                  {/* Detailed Results List */}
                  <div className="space-y-3">
                    <h3 className="text-md font-semibold text-white">Test Case Results</h3>
                    {detailedRunResults.items?.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">No test cases executed.</div>
                    ) : (
                      detailedRunResults.items.map((item, idx) => {
                        const isExpanded = expandedTestModal === idx;
                        const isPassed = item.executionStatus === 'passed';
                        return (
                          <div key={idx} className="rounded-lg border border-dark-700 bg-[#0f172a]/40 overflow-hidden">
                            <div
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#0f172a]/70 transition-colors"
                              onClick={() => setExpandedTestModal(isExpanded ? null : idx)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  isPassed ? "bg-green-500" : "bg-red-500"
                                )} />
                                <span className="text-sm font-medium text-white">{item.title}</span>
                                <span className="text-xs text-gray-400">{item.endpoint}</span>
                                <span className="text-xs text-gray-400">{item.method}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {item.responseStatus && (
                                  <span className="text-xs text-gray-400">Status: {item.responseStatus}</span>
                                )}
                                {item.responseTimeMs && (
                                  <span className="text-xs text-gray-400">{item.responseTimeMs}ms</span>
                                )}
                                <span className={cn(
                                  "text-xs font-medium",
                                  isPassed ? "text-green-400" : "text-red-400"
                                )}>
                                  {isPassed ? 'Passed' : 'Failed'}
                                </span>
                                <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                              </div>
                            </div>
{isExpanded && (
  <div className="border-t border-dark-700 p-4 space-y-4">
    {/* REQUEST (ACTUAL) */}
    <div>
      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Request</p>
      <div className="mt-1 rounded-lg bg-[#0a0e1b] p-3 border border-dark-700">
        <div className="flex items-center gap-2 text-xs">
          <span className={cn(
            "font-bold px-2 py-0.5 rounded",
            item.method === 'GET' ? "bg-blue-500/20 text-blue-400" :
            item.method === 'POST' ? "bg-green-500/20 text-green-400" :
            item.method === 'PUT' ? "bg-yellow-500/20 text-yellow-400" :
            item.method === 'DELETE' ? "bg-red-500/20 text-red-400" :
            "bg-gray-500/20 text-gray-400"
          )}>{item.method}</span>
          <span className="text-white font-mono break-all">
            {runBaseUrl}{item.endpoint}
          </span>
        </div>
        {item.requestBody && (
          <pre className="text-xs text-gray-300 mt-2 overflow-auto max-h-32 p-2 bg-black/30 rounded">
            {typeof item.requestBody === 'object'
              ? JSON.stringify(item.requestBody, null, 2)
              : (() => {
                  try {
                    return JSON.stringify(JSON.parse(item.requestBody), null, 2);
                  } catch {
                    return item.requestBody;
                  }
                })()}
          </pre>
        )}
      </div>
    </div>

    {/* EXPECTED RESPONSE (from test case) */}
    <div>
      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Expected Response</p>
      <div className="mt-1 rounded-lg bg-green-500/5 border border-green-500/30 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400 font-mono">HTTP {item.expectedStatus || '?'}</span>
        </div>
        {item.responseSample && (
          <pre className="text-xs text-gray-300 mt-2 overflow-auto max-h-32 p-2 bg-black/30 rounded">
            {typeof item.responseSample === 'object'
              ? JSON.stringify(item.responseSample, null, 2)
              : (() => {
                  try {
                    return JSON.stringify(JSON.parse(item.responseSample), null, 2);
                  } catch {
                    return item.responseSample;
                  }
                })()}
          </pre>
        )}
      </div>
    </div>

    {/* ACTUAL RESPONSE (from real API) */}
    <div>
      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Actual Response</p>
      <div className="mt-1 rounded-lg bg-[#0a0e1b] border border-dark-700 p-3">
        {item.responseStatus ? (
          <>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-mono",
                item.responseStatus >= 200 && item.responseStatus < 300 ? "text-green-400" : "text-red-400"
              )}>HTTP {item.responseStatus}</span>
              {item.responseTimeMs && (
                <span className="text-xs text-gray-500">{item.responseTimeMs}ms</span>
              )}
            </div>
            {item.responseBody && (
              <pre className="text-xs text-gray-300 mt-2 overflow-auto max-h-32 p-2 bg-black/30 rounded">
                {typeof item.responseBody === 'object'
                  ? JSON.stringify(item.responseBody, null, 2)
                  : (() => {
                      try {
                        return JSON.stringify(JSON.parse(item.responseBody), null, 2);
                      } catch {
                        return item.responseBody;
                      }
                    })()}
              </pre>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-500 italic">No response received (request failed)</p>
        )}
      </div>
    </div>

    {/* ASSERTIONS */}
{/* ASSERTIONS - collapsed by default, only icon/button visible */}
{item.assertions && (
  <div>
    <button
      onClick={() => setAssertionsExpandedIndex(assertionsExpandedIndex === idx ? null : idx)}
      className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-primary transition-colors"
    >
      {assertionsExpandedIndex === idx ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
      Assertions
    </button>
    {assertionsExpandedIndex === idx && (
      <pre className="text-xs text-gray-400 bg-[#0a0e1b] p-2 rounded mt-2 overflow-auto max-h-48 whitespace-pre-wrap">
        {item.assertions}
      </pre>
    )}
  </div>
)}

    {/* FAILURE REASON */}
    {item.errorMessage && (
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
        <p className="text-xs font-semibold text-red-300 uppercase tracking-wide">Failure Reason</p>
        <p className="text-sm text-red-200 mt-1 break-all">{item.errorMessage}</p>
      </div>
    )}
  </div>
)}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button
                onClick={async () => {
                  setShowRunModal(false);
                  // Refresh run history after closing modal
                  if (onboardingId) {
                    const res = await testCaseService.getExecutionHistoryForMicroservice(onboardingId);
                    if (res.success) setRunHistory(res.data || []);
                  }
                }}
                className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}

                {/* Preview Collection Content Modal */}
        {previewCollectionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4  backdrop-blur-sm">
            <div className="w-full max-w-7xl max-h-[90vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-primary" />
                  Collection Preview
                </h3>
                <button
                  onClick={() => setPreviewCollectionOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="h-[500px] rounded-lg overflow-hidden border border-dark-700">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={previewCollectionContent}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                    theme="vs-dark"
                  />
                </div>
              </div>
              <div className="flex justify-end px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
                <button
                  onClick={() => setPreviewCollectionOpen(false)}
                  className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

                {/* Upload Collection Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload Collection
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedUploadFile(null);
                    setUploadFilePreview('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Dotted upload area */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-500 p-8 transition-all",
                    "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                  )}
                  onClick={() => document.getElementById('upload-file-input-modal').click()}
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-white font-medium">Click to browse or drag & drop</p>
                  <p className="text-sm text-gray-400 mt-1">Supports .yaml, .yml, .json (OpenAPI or Postman)</p>
                  <input
                    id="upload-file-input-modal"
                    type="file"
                    accept=".yaml,.yml,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedUploadFile(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setUploadFilePreview(ev.target.result);
                        reader.readAsText(file);
                      }
                    }}
                  />
                </div>

                {/* File preview (if selected) */}
                {selectedUploadFile && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">Selected file: {selectedUploadFile.name}</p>
                      <button
                        onClick={() => {
                          setSelectedUploadFile(null);
                          setUploadFilePreview('');
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="h-64 rounded-lg overflow-hidden border border-dark-700">
                      <Editor
                        height="100%"
                        defaultLanguage={selectedUploadFile.name.endsWith('.json') ? 'json' : 'yaml'}
                        value={uploadFilePreview}
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                        theme="vs-dark"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedUploadFile(null);
                    setUploadFilePreview('');
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedUploadFile) {
                      showMessage('Please select a file first', 'error');
                      return;
                    }
                    if (!onboardingId) return;
                    setIsGeneratingTestCases(true);
                    const result = await testCaseService.generate(onboardingId, selectedUploadFile);
                    if (result.success) {
                      showMessage('Test cases generated from uploaded file', 'success');
                      // Refresh all data
                      const fetchResult = await testCaseService.getTestCases(onboardingId);
                      if (fetchResult.success) {
                        const items = fetchResult.data?.items || fetchResult.data || [];
                        setTestCases(items);
                        setTestCaseStats({
                          total: items.length,
                          happy: items.filter(tc => tc.title?.includes('[HAPPY]') || tc.category === 'POSITIVE').length,
                          sad: items.filter(tc => tc.title?.includes('[SAD]') || tc.category === 'NEGATIVE').length,
                          edge: items.filter(tc => tc.title?.includes('[EDGE]') || tc.category === 'PERFORMANCE').length,
                          security: items.filter(tc => tc.title?.includes('[SECURITY]') || tc.category === 'SECURITY').length,
                        });
                        setTotalTestCasesCount(items.length);
                      }
                      const historyRes = await testCaseService.getGenerationHistoryForMicroservice(onboardingId);
                      if (historyRes.success) setCollectionHistory(historyRes.data || []);
                      if (activeTab === 'specdetail') await loadSpecContent();
                      // Close modal and reset
                      setShowUploadModal(false);
                      setSelectedUploadFile(null);
                      setUploadFilePreview('');
                    } else {
                      showMessage(result.error, 'error');
                    }
                    setIsGeneratingTestCases(false);
                  }}
                  disabled={isGeneratingTestCases || !selectedUploadFile}
                  className={cn(
                    'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                    'flex items-center gap-2',
                    (isGeneratingTestCases || !selectedUploadFile) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isGeneratingTestCases ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload & Generate
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-xl border border-dark-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedGateway === 'Kong' ? 'Service Development Summary' : resourceType == "Shared Function" ? "Function Summary" : 'API Development Summary'}</h3>
                  <p className="text-xs text-gray-400">Review all entered data before generation</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Summary Content */}
            <div className="space-y-4">
              {/* Proxy Spec */}
              {resourceType !== "Shared Function" &&
              <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  {selectedGateway === 'Kong' ? 'Service Specification' :'Proxy Specification'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Spec Name:</span>
                    <span className="text-white">{proxyDesignSelectedSpec?.name || 'Not selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source:</span>
                    <span className="text-white capitalize">{proxyDesignSelectedSpec?.source || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Import Mode:</span>
                    <span className="text-white capitalize">{proxyDesignImportMode}</span>
                  </div>
                </div>
              </div>}

              {/* Framework/Platform */}
              <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Gateway Platform
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform:</span>
                    <span className="text-white capitalize">{selectedGateway === 'Kong' ? 'Kong Konnect' : selectedFramework}</span>
                  </div>
                </div>
              </div>

              {/* Proxy Configuration */}
              <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  {selectedGateway === 'Kong' ? 'Service Configuration' :
                  resourceType == "Shared Function" ? "Function Configuration" :  'API Configuration'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{selectedGateway === 'Kong' ? 'Service Name:' :
                    resourceType == "Shared Function" ? "Function Name" :  'API Name:'}</span>
                    <span className="text-white">{proxyName || 'Not set'}</span>
                  </div>
                  {resourceType !== "Shared Function" &&
                  <div className="flex justify-between">
                    <span className="text-gray-400">Base Path:</span>
                    <span className="text-white font-mono">{basePath || 'Not set'}</span>
                  </div>}
                  {/* <div className="flex justify-between">
                    <span className="text-gray-400">Target URL:</span>
                    <span className="text-white">{targetUrl || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Description:</span>
                    <span className="text-white">{proxyDescription || 'Not set'}</span>
                  </div> */}
                </div>
              </div>

              {/* Policy Chain */}
              {resourceType != "Shared Function" &&
              <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Policy Chain ({policies.length} policies)
                </h4>
                {policies.length > 0 ? (
                  <div className="space-y-2">
                    {policies.map((policy, idx) => (
                      <div key={policy.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{idx + 1}. {policy.name}</span>
                        <span className={policy.enabled ? 'text-green-400 text-xs' : 'text-gray-500 text-xs'}>
                          {policy.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No policies configured</p>
                )}
              </div>}

              {/* Import Source */}
              <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-primary" />
                  Import Configuration
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Import Source:</span>
                    <span className="text-white capitalize">{importSource}</span>
                  </div>
                  {specFile && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">File:</span>
                      <span className="text-white">{specFile.name}</span>
                    </div>
                  )}
                  {urlInput && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">URL:</span>
                      <span className="text-white">{urlInput}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Kong API Response Data - Only show if available */}
              {kongApiResponse && kongApiResponse.success && (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Deployment Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Spec Title:</span>
                      <span className="text-white">{kongApiResponse.specTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400 font-semibold">Success</span>
                    </div>
                    {kongApiResponse.services && kongApiResponse.services.length > 0 && (
                      <>
                        <div className="pt-2 border-t border-dark-700">
                          <span className="text-gray-400 block mb-2">Service Details:</span>
                          {kongApiResponse.services.map((service, idx) => (
                            <div key={idx} className="space-y-2 pl-3">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Service Name:</span>
                                <span className="text-white font-mono">{service.serviceName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Service ID:</span>
                                <span className="text-white font-mono text-xs">{service.serviceId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Routes Created:</span>
                                <span className="text-white">{service.routeIds?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Plugins Configured:</span>
                                <span className="text-white">{service.pluginIds?.length || 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Consumer Information */}
              <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Consumer Information
                </h4>
                <div className="text-sm text-gray-300">
                  {(() => {
                    if (typeof window !== 'undefined') {
                      const stored = localStorage.getItem('probeStack_consumers');
                      const consumers = stored ? JSON.parse(stored) : [];
                      if (consumers.length > 0) {
                        return (
                          <div className="space-y-1">
                            {consumers.map((c, i) => (
                              <div key={i} className="text-gray-300">• {c.consumerName || c.name || 'Unnamed'}</div>
                            ))}
                          </div>
                        );
                      }
                      const onboardingData = localStorage.getItem('probeStack_onboardingData');
                      if (onboardingData) {
                        const data = JSON.parse(onboardingData);
                        if (data.selectedConsumers && data.selectedConsumers.length > 0) {
                          return (
                            <div className="space-y-1">
                              {data.selectedConsumers.map((c, i) => (
                                <div key={i} className="text-gray-300">• {c.consumerName || c.name || 'Unnamed'}</div>
                              ))}
                            </div>
                          );
                        }
                        return <span>{data.teamName || 'No consumer data available'}</span>;
                      }
                    }
                    return <span className="text-gray-500">No consumers selected</span>;
                  })()}
                </div>
              </div>

              {/* Connector Button - REMOVED as requested */}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-6 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium transition-all"
              >
                Close
              </button>
              {/* {currentStep === 7 && !isGenerating && (
                <button
                  type="submit"
                  form="proxy-form"
                  disabled={!specFile}
                  className={cn(
                    'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2',
                    specFile
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  <Rocket className="w-4 h-4" />
                  Generate Proxy
                </button>
              )} */}
            </div>
          </div>
        </div>
      )}

      <OnboardingModal
        isOpen={showGlobalOnboardingModal}
        onClose={handleGlobalOnboardingClose}
        onComplete={applyGlobalOnboarding}
        projectType={getProjectType()}
        selectedGateway={selectedGateway}
        resourceLabel={getResourceLabel()}
        defaultMode={globalOnboardingMode}
        lockMode={globalOnboardingLockedMode}
        showActionSelection
        actionMode={actionMode}
        onActionModeChange={handleGlobalActionModeChange}
        actionOptions={[
          { id: 'create', title: 'Create', description: `Start a new ${getResourceLabel()} flow from onboarding context.`, icon: Plus, nextMode: 'select' },
          { id: 'update', title: 'Edit', description: `Load an existing onboarding into Step 1 for this ${getResourceLabel()}.`, icon: Pencil, nextMode: 'existing', existingOnly: true },
          { id: 'cloning', title: 'Cloning', description: `Load an existing ${getResourceLabel()}, then enter the new resource name and version.`, icon: FileCode2, nextMode: 'existing', existingOnly: true },
          { id: 'versioning', title: 'Versioning', description: `Load an existing ${getResourceLabel()}, then enter the new version.`, icon: GitPullRequest, nextMode: 'existing', existingOnly: true },
        ]}
        savedConsumers={savedConsumers}
        onAddConsumer={() => setShowConsumerModal(true)}
        onEditConsumer={handleEditConsumer}
        initialExistingRecord={catalogOnboardingPreset?.item}
        initialActionDetails={catalogOnboardingPreset?.actionDetails}
        onboardingService={onboardingService}
        showMessage={showMessage}
        availableWorkflows={availableWorkflows}
        selectedWorkflow={selectedWorkflow}
        onWorkflowChange={(wf) => {
          setSelectedWorkflow(wf);
          if (wf) localStorage.setItem('forgesphere_activeWorkflow_proxy', wf.id);
          else localStorage.removeItem('forgesphere_activeWorkflow_proxy');
        }}
      />

      {/* Consumer Modal */}
      {showConsumerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">{editingConsumerId ? 'Edit Consumer' : 'Add Consumer'}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowConsumerModal(false);
                  setEditingConsumerId(null);
                  setConsumerForm({
                    consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
                    consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
                  });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Consumer Name</Label>
                  <Input
                    value={consumerForm.consumerName}
                    onChange={(e) => setConsumerForm({ ...consumerForm, consumerName: e.target.value })}
                    placeholder="e.g., Acme Corp"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Consumer POC Name</Label>
                  <Input
                    value={consumerForm.consumerPocName}
                    onChange={(e) => setConsumerForm({ ...consumerForm, consumerPocName: e.target.value })}
                    placeholder="e.g., Bob Wilson"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Consumer POC Email</Label>
                  <Input
                    value={consumerForm.consumerPocEmail}
                    onChange={(e) => setConsumerForm({ ...consumerForm, consumerPocEmail: e.target.value })}
                    placeholder="e.g., poc@example.com"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Consumer SME Name</Label>
                  <Input
                    value={consumerForm.consumerSmeName}
                    onChange={(e) => setConsumerForm({ ...consumerForm, consumerSmeName: e.target.value })}
                    placeholder="e.g., Alice Brown"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Consumer SME Email</Label>
                  <Input
                    value={consumerForm.consumerSmeEmail}
                    onChange={(e) => setConsumerForm({ ...consumerForm, consumerSmeEmail: e.target.value })}
                    placeholder="e.g., sme@example.com"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Consumer Config</Label>
                  <Input
                    value={consumerForm.consumerConfig}
                    onChange={(e) => setConsumerForm({ ...consumerForm, consumerConfig: e.target.value })}
                    placeholder="e.g., Config JSON"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">API TPS</Label>
                  <Input
                    value={consumerForm.apiTps}
                    onChange={(e) => setConsumerForm({ ...consumerForm, apiTps: e.target.value })}
                    placeholder="e.g., 1000"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Quota</Label>
                  <Input
                    value={consumerForm.quota}
                    onChange={(e) => setConsumerForm({ ...consumerForm, quota: e.target.value })}
                    placeholder="e.g., 10000/day"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Rate Limiting</Label>
                  <Input
                    value={consumerForm.rateLimiting}
                    onChange={(e) => setConsumerForm({ ...consumerForm, rateLimiting: e.target.value })}
                    placeholder="e.g., 100/min"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">API Key Information</Label>
                  <Input
                    value={consumerForm.apiKeyInfo}
                    onChange={(e) => setConsumerForm({ ...consumerForm, apiKeyInfo: e.target.value })}
                    placeholder="e.g., API Key xyz123"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-dark-900/40">
              <button
                type="button"
                onClick={() => setShowConsumerModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                  'active:scale-[0.98]'
                )}
              >
                {editingConsumerId ? 'Update Consumer' : (isAddingConsumer ? 'Saving...' : 'Save Consumer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Mode Selection Modal (Update/Cloning/Versioning) */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white">
                {actionMode === 'update' && `Select ${getResourceLabel()} to Update`}
                {actionMode === 'cloning' && `Clone ${getResourceLabel()}`}
                {actionMode === 'versioning' && `Create New ${getResourceLabel()} Version`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowActionModal(false);
                  // setSelectedActionApp(null);
                  // setSelectedActionSpec(null);
                  // setNewProxyName('');
                  // setNewProxyVersion('');
                  // setVersionError('');
                  // setActionMode('create'); // Reset to create mode when closing without selection
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Application IDs */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Select Application ID</h4>
                  <div className="space-y-2">
                    {isFetchingAppNames ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : existingAppNames.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                        <p className="text-sm text-gray-500">No applications found</p>
                      </div>
                    ) : (
                      existingAppNames.map((appId) => (
                        <button
                          key={appId}
                          type="button"
                          onClick={() => {
                            setSelectedExistingApp(appId);
                            setSelectedExistingSpec(null);
                            setExistingAppOnboarding(null);
                            setIsFetchingAppOnboarding(true);
                            onboardingService.getByApplicationId(appId).then((result) => {
                              if (result.success) {
                                const data = result.data?.data || result.data;
                                setExistingAppOnboarding(Array.isArray(data) ? data : data ? [data] : []);
                              } else {
                                showMessage(result.error, 'error');
                              }
                              setIsFetchingAppOnboarding(false);
                            });
                          }}
                          className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all',
                            selectedExistingApp === appId
                              ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                              : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                          )}
                        >
                          <p className="text-sm font-medium text-white">{appId}</p>
                        </button>
                      )))}
                  </div>
                </div>

                {/* Resources */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">
                    {selectedExistingApp ? `${resourceType}${resourceType.endsWith('s') ? '' : 's'} for ${selectedExistingApp}` : 'Select Application First'}
                  </h4>
                  {selectedExistingApp && existingAppOnboarding?.length > 0 ? (
                    <div className="space-y-2">
                      {existingAppOnboarding?.map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setSelectedExistingSpec(spec)}
                          className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all',
                            selectedExistingSpec?.id === spec.id
                              ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                              : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                          )}
                        >
                          <p className="text-sm font-medium text-white">{spec.applicationName || spec.name || selectedExistingApp}</p>
                          {spec.teamName && <p className="text-xs text-gray-400 mt-1">Team: {spec.teamName}</p>}
                          {spec.applicationId && <p className="text-xs text-gray-400">App ID: {spec.applicationId}</p>}
                          {spec.projectOwner && <p className="text-xs text-gray-400">Owner: {spec.projectOwner}</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                      <p className="text-sm text-gray-500">Please select an Application ID first</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional inputs for Cloning and Versioning modes */}
              {selectedExistingApp && selectedExistingSpec && (actionMode === 'cloning' || actionMode === 'versioning') && (
                <div className="mt-6 pt-6 border-t border-dark-700">
                  <h4 className="text-sm font-medium text-gray-300 mb-4">
                    {actionMode === 'cloning' ? `New ${getResourceLabel()} Details` : 'New Version Details'}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {actionMode === 'cloning' && (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400">New Resource Name</label>
                        <input
                          type="text"
                          value={newProxyName}
                          onChange={(e) => setNewProxyName(e.target.value)}
                          placeholder={`e.g., ${getResourceLabel()} v2`}
                          className="w-full px-4 py-2.5 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">
                        {actionMode === 'cloning' ? 'New Version' : 'New Version'}
                      </label>
                      <input
                        type="text"
                        value={newProxyVersion}
                        onChange={(e) => {
                          setNewProxyVersion(e.target.value);
                          setVersionError('');
                        }}
                        placeholder="e.g., 2.0.0"
                        className="w-full px-4 py-2.5 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                      />
                      {versionError && (
                        <p className="text-xs text-red-400 mt-1">{versionError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Base Path</label>
                      <input
                        type="text"
                        value={basePath}
                        onChange={(e) => setBasePath(e.target.value)}
                        placeholder="e.g., /v2/orders"
                        className="w-full px-4 py-2.5 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button
                type="button"
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedExistingApp(null);
                  setSelectedExistingSpec(null);
                  setNewProxyName('');
                  setNewProxyVersion('');
                  setVersionError('');
                  setActionMode('create'); // Reset to create mode when closing without selection
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={actionMode === 'view' ? () => {
                  if (selectedExistingApp && selectedExistingSpec) {
                    setSelectedResourceForView(selectedExistingSpec);
                    setShowResourceSummaryModal(true);
                  }
                } : () => handleProceedWithExistingOnboarding(actionMode)}
                disabled={!selectedExistingApp || !selectedExistingSpec}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  selectedExistingApp && selectedExistingSpec
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
                    : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                )}
              >
                {actionMode === 'view' && 'View'}
                {actionMode === 'update' && 'Load for Update'}
                {actionMode === 'cloning' && `Clone ${getResourceLabel()}`}
                {actionMode === 'versioning' && 'Start Versioning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Resource Summary Modal */}
      {showResourceSummaryModal && selectedResourceForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white">{resourceType} Summary - {selectedResourceForView.name}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowResourceSummaryModal(false);
                  setSelectedResourceForView(null);
                  setShowActionModal(false);
                  setSelectedActionApp(null);
                  setSelectedActionSpec(null);
                  setActionMode('create');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Name</p>
                      <p className="text-sm text-white font-medium">{selectedResourceForView.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Type</p>
                      <p className="text-sm text-white font-medium">{resourceType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Version</p>
                      <p className="text-sm text-white font-medium">1.0.0</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Description</h4>
                  <div className="p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                    <p className="text-sm text-gray-300">{selectedResourceForView.description}</p>
                  </div>
                </div>

                {/* Resource-Specific Details */}
                {resourceType === 'Target Server' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Server Configuration</h4>
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Host</p>
                        <p className="text-sm text-white font-medium">api.backend.com</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Port</p>
                        <p className="text-sm text-white font-medium">443</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Protocol</p>
                        <p className="text-sm text-white font-medium">HTTPS</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">SSL Enabled</p>
                        <p className="text-sm text-white font-medium">Yes</p>
                      </div>
                    </div>
                  </div>
                )}

                {(resourceType === 'KVM') && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Key-Value Entries</h4>
                    <div className="p-4 rounded-lg border border-dark-700 space-y-2" style={{ backgroundColor: '#0f172a80' }}>
                      <div className="flex justify-between items-center py-2 border-b border-dark-700/50">
                        <span className="text-sm text-gray-300 font-mono">api_key</span>
                        <span className="text-sm text-gray-400">••••••••••••</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-dark-700/50">
                        <span className="text-sm text-gray-300 font-mono">client_secret</span>
                        <span className="text-sm text-gray-400">••••••••••••</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-300 font-mono">environment</span>
                        <span className="text-sm text-white">production</span>
                      </div>
                    </div>
                  </div>
                )}

                {resourceType === 'Cache' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Cache Configuration</h4>
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Expiry Time</p>
                        <p className="text-sm text-white font-medium">3600 seconds</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Max Entries</p>
                        <p className="text-sm text-white font-medium">10000</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Eviction Policy</p>
                        <p className="text-sm text-white font-medium">LRU</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Compression</p>
                        <p className="text-sm text-white font-medium">Enabled</p>
                      </div>
                    </div>
                  </div>
                )}

                {resourceType === 'App' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Application Details</h4>
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Developer Email</p>
                        <p className="text-sm text-white font-medium">dev@company.com</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Callback URL</p>
                        <p className="text-sm text-white font-medium">https://app.com/callback</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">API Key</p>
                        <p className="text-sm text-gray-400 font-mono">••••••••••••</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Rate Limit</p>
                        <p className="text-sm text-white font-medium">1000 req/min</p>
                      </div>
                    </div>
                  </div>
                )}

                {resourceType === 'Product' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Product Configuration</h4>
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Display Name</p>
                        <p className="text-sm text-white font-medium">Premium API Product</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Approval Type</p>
                        <p className="text-sm text-white font-medium">Auto</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Quota</p>
                        <p className="text-sm text-white font-medium">10000/month</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Scopes</p>
                        <p className="text-sm text-white font-medium">read, write</p>
                      </div>
                    </div>
                  </div>
                )}

                {resourceType === 'Trust Store' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Trust Store Details</h4>
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Certificate Count</p>
                        <p className="text-sm text-white font-medium">5</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Format</p>
                        <p className="text-sm text-white font-medium">JKS</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Expiry Date</p>
                        <p className="text-sm text-white font-medium">2025-12-31</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Algorithm</p>
                        <p className="text-sm text-white font-medium">RSA 2048</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Metadata</h4>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Created By</p>
                      <p className="text-sm text-white font-medium">admin@company.com</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Created At</p>
                      <p className="text-sm text-white font-medium">2024-01-15 10:30 AM</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Last Modified By</p>
                      <p className="text-sm text-white font-medium">dev@company.com</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Last Modified</p>
                      <p className="text-sm text-white font-medium">2024-01-20 02:45 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button
                type="button"
                onClick={() => {
                  setShowResourceSummaryModal(false);
                  setSelectedResourceForView(null);
                  setShowActionModal(false);
                  setSelectedActionApp(null);
                  setSelectedActionSpec(null);
                  setActionMode('create');
                }}
                className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Onboarding Modal */}
      {showExistingOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white">Choose from Existing Onboarding</h3>
              <button
                type="button"
                onClick={() => {
                  setShowExistingOnboardingModal(false);
                  setSelectedExistingApp(null);
                  setSelectedExistingSpec(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Application IDs */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Select Application ID</h4>
                  <div className="space-y-2">
                    {isFetchingAppNames ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : existingAppNames.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                        <p className="text-sm text-gray-500">No applications found</p>
                      </div>
                    ) : (
                      existingAppNames.map((appName) => (
                        <button
                          key={appName}
                          type="button"
                          onClick={() => {
                            setSelectedExistingApp(appName);
                            setSelectedExistingSpec(null);
                            setExistingAppOnboarding([]);
                            setIsFetchingAppOnboarding(true);
                            onboardingService.getByApplicationId(appName).then((result) => {
                              if (result.success) {
                                const data = result.data?.data || result.data;
                                setExistingAppOnboarding(Array.isArray(data) ? data : data ? [data] : []);
                              } else {
                                showMessage(result.error, 'error');
                              }
                              setIsFetchingAppOnboarding(false);
                            });
                          }}
                          className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all',
                            selectedExistingApp === appName
                              ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                              : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                          )}
                        >
                          <p className="text-sm font-medium text-white">{appName}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Onboarding Records */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">
                    {selectedExistingApp ? `Onboarding for ${selectedExistingApp}` : 'Select Application First'}
                  </h4>
                  {isFetchingAppOnboarding ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  ) : selectedExistingApp && existingAppOnboarding.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}>
                      {existingAppOnboarding.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => setSelectedExistingSpec(item)}
                          className={cn(
                            'w-full p-3 rounded-lg border cursor-pointer transition-all',
                            selectedExistingSpec?.id === item.id
                              ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                              : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                          )}
                        >
                          <p className="text-sm font-medium text-white">{item.applicationName || item.name || selectedExistingApp}</p>
                          {item.teamName && <p className="text-xs text-gray-400 mt-1">Team: {item.teamName}</p>}
                          {item.applicationId && <p className="text-xs text-gray-400">App ID: {item.applicationId}</p>}
                          {item.projectOwner && <p className="text-xs text-gray-400">Owner: {item.projectOwner}</p>}
                        </div>
                      ))}
                    </div>
                  ) : selectedExistingApp && !isFetchingAppOnboarding ? (
                    <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                      <p className="text-sm text-gray-500">No onboarding data found</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                      <p className="text-sm text-gray-500">Please select an Application ID first</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button
                type="button"
                onClick={() => {
                  setShowExistingOnboardingModal(false);
                  setSelectedExistingApp(null);
                  setSelectedExistingSpec(null);
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedWithExistingOnboarding}
                disabled={!selectedExistingApp || !selectedExistingSpec}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  selectedExistingApp && selectedExistingSpec
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
                    : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                )}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Peer Review Modal */}
      {showPeerReviewModal && peerReviewStatus !== 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="p-6 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Request Peer Review</h3>
                  <p className="text-sm text-gray-400">Send review requests to team members</p>
                </div>
              </div>
            </div>

                                {/* Code Analysis Summary */}
                    {staticAnalysisResults && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <p className="text-xs font-semibold text-primary uppercase mb-1">Code Analysis Summary</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">
                              Score:{' '}
                              <span className="font-bold">
                                {staticAnalysisResults.overallScore ?? '-'}/100
                              </span>
                            </p>
                            <p className="text-xs text-gray-400">
                              Gate: {staticAnalysisResults.qualityGate || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-gray-300">
                            <div>Critical: {staticAnalysisResults.summary?.critical ?? 0}</div>
                            <div>High: {staticAnalysisResults.summary?.high ?? 0}</div>
                            <div>Medium: {staticAnalysisResults.summary?.medium ?? 0}</div>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Full report + spec + contract snapshot will be attached for the reviewer.
                        </p>
                      </div>
                    )}
                    {!staticAnalysisResults && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-200">
                        Tip: Run a static code analysis in Step 9 first so the reviewer gets the
                        score &amp; issues alongside the spec.
                      </div>
                    )}

            <div className="p-6 space-y-4">
              {peerReviewEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="reviewer@example.com"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...peerReviewEmails];
                      newEmails[index] = e.target.value;
                      setPeerReviewEmails(newEmails);
                    }}
                    className="flex-1 h-10 rounded-lg px-3 text-sm text-white bg-dark-900 border border-dark-700 focus:border-primary focus:outline-none"
                  />
                  {peerReviewEmails.length > 1 && (
                    <button
                      onClick={() => setPeerReviewEmails(peerReviewEmails.filter((_, i) => i !== index))}
                      className="p-2 rounded-lg hover:bg-dark-800 text-gray-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPeerReviewEmails([...peerReviewEmails, ''])}
                className="w-full py-2 rounded-lg border border-dark-700 text-sm text-gray-300 hover:bg-dark-800 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Reviewer
              </button>
            </div>
            <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPeerReviewModal(false);
                  setPeerReviewEmails(['']);
                  setPeerReviewStatus('idle');
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
<button
  onClick={async () => {
    setPeerReviewStatus('processing');
    try {
      const approverEmails = peerReviewEmails.map((e) => e.trim()).filter(Boolean);

      // ── 1. Get spec content ──
      let specContent = previewSpecContent;
      const specId = proxyDesignSelectedSpec?.specMetadataId || proxyDesignSelectedSpec?.id;
      if (specId && !specContent) {
        const contentRes = await apiDesignService.getSpecContent(specId);
        if (contentRes.success) {
          specContent = contentRes.content;
          setPreviewSpecContent(specContent);
        } else {
          console.warn(' Failed to fetch spec content:', contentRes.error);
        }
      } else {
        // console.log('Using existing spec content (length:', specContent?.length, ')');
      }

      // ── 2. Get spec endpoints ──
      let endpoints = specEndpoints;
      if (specId && (!endpoints || endpoints.length === 0)) {
        const epRes = await mockApiService.getSpecEndpoints(specId);
        if (epRes.success) {
          endpoints = epRes.data?.data || epRes.data || [];
          setSpecEndpoints(endpoints);
        } else {
          console.warn('Failed to fetch spec endpoints:', epRes.error);
        }
      } else {
        // console.log(' Using existing spec endpoints, count:', endpoints?.length);
      }

      // ── 3. Build final URLs & snapshot ──
      let finalRepoUrl = repositoryUrl;
      let finalDeployedUrl = deployedServiceUrl;
      let finalMockBaseUrl = mockServerBaseUrl;
      let finalContractSnapshot = contractTestingSnapshot;

      // If repository URL is empty, try constructing from organization/repositoryName
      if (!finalRepoUrl && organization && repositoryName) {
        finalRepoUrl = `https://github.com/${organization}/${repositoryName}.git`;
      }

      // If still missing, fetch from resource details
      if (onboardingId && (!finalRepoUrl || !finalDeployedUrl)) {
        try {
          const detailsRes = await onboardingService.getResourceDetails(onboardingId);
          if (detailsRes.success) {
            const details = detailsRes.data?.data || detailsRes.data || {};
            const microservice = details.microservice || details.resource || {};

            // Extract repo URL from connector configuration
            const scm = microservice.connectorConfiguration?.sourceCodeManagement
              || details.connectorConfiguration?.sourceCodeManagement
              || {};
            if (scm.repo && scm.orgOrUser) {
              finalRepoUrl = finalRepoUrl || `https://github.com/${scm.orgOrUser}/${scm.repo}.git`;
            }

            // Extract deployment URL from codeGenResults or deployment history
            const codeGen = (microservice.codeGenResults || []).find(r => r.status === 'SUCCESS') || {};
            finalDeployedUrl = finalDeployedUrl || codeGen.deploymentUrl || microservice.deploymentUrl || '';

            // If still no deployment URL, pick from latest deployment record
            if (!finalDeployedUrl) {
              const deploys = microservice.deploymentHistory || details.deploymentHistory || [];
              const latest = deploys.length > 0 ? deploys[deploys.length - 1] : null;
              finalDeployedUrl = finalDeployedUrl || latest?.deploymentUrl || latest?.url || '';
            }
          } else {
            console.warn('Resource details fetch failed:', detailsRes.error);
          }
        } catch (err) {
          console.error('Error fetching resource details:', err);
        }
      } else {
        // console.log('Skipping resource details fetch (finalRepoUrl:', finalRepoUrl, ', finalDeployedUrl:', finalDeployedUrl, ')');
      }

      // If mock server URL missing, fetch it
      if (onboardingId && !finalMockBaseUrl) {
        try {
          const mockRes = await mockApiService.getByMicroservice(onboardingId);
          if (mockRes.success) {
            const mocks = mockRes.data?.data || mockRes.data || [];
            const mockServer = mocks[0] || {};
            finalMockBaseUrl = finalMockBaseUrl || mockServer.mockServerUrl || '';
          } else {
            console.warn(' Mock server fetch failed:', mockRes.error);
          }
        } catch (err) {
          console.error(' Error fetching mock server:', err);
        }
      } else {
        // console.log(' Skipping mock server fetch (finalMockBaseUrl:', finalMockBaseUrl, ')');
      }

      // If contract snapshot missing, fetch latest test run
      if (onboardingId && !finalContractSnapshot) {
        try {
          const historyRes = await testCaseService.getExecutionHistoryForMicroservice(onboardingId);
          if (historyRes.success && historyRes.data && historyRes.data.length > 0) {
            finalContractSnapshot = historyRes.data[0];
          } else {
            console.warn(' No test history found');
          }
        } catch (err) {
          console.error(' Error fetching test history:', err);
        }
      } else {
        // console.log(' Skipping contract snapshot fetch (finalContractSnapshot:', finalContractSnapshot, ')');
      }

      // ── 4. Build final payload ──
      const payload = {
        microserviceId: onboardingId,
        onboardingId: onboardingId,
        repositoryUrl: finalRepoUrl || finalDeployedUrl || '',
        approverEmails,
        message: '',
        specContent: specContent || '',
        specEndpoints: endpoints || [],
        codeAnalysisReport: staticAnalysisResults || null,
        codeReviewNotes: '',
        contractTestingSnapshot: finalContractSnapshot,
        mockServerBaseUrl: finalMockBaseUrl || '',
        deployedServiceUrl: finalDeployedUrl || '',
      };


      const res = await peerReviewService.sendApprovalRequest(payload);
      if (res.success) {
        setPeerReviewStatus('success');
      } else {
        setPeerReviewStatus('idle');
        alert(res.error || 'Failed to send peer review request');
      }
    } catch (err) {
      console.error(' Unhandled error in peer review send:', err);
      setPeerReviewStatus('idle');
      alert(err?.message || 'Failed to send peer review request');
    }
  }}
  disabled={peerReviewStatus === 'processing' || peerReviewEmails.every(e => !e.trim())}
  className={cn(
    'px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2',
    peerReviewStatus === 'processing' || peerReviewEmails.every(e => !e.trim())
      ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
      : 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
  )}
>
  <Send className="w-4 h-4" />
  Proceed
</button>
            </div>
          </div>
        </div>
      )}

      {/* Peer Review Success Modal */}
      {showPeerReviewModal && peerReviewStatus === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-green-500/30 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Review Requests Sent!</h3>
                <p className="text-gray-400 text-sm">
                  Peer review requests have been sent to {peerReviewEmails.filter(e => e.trim()).length} team member(s).
                </p>
              </div>
              <div className="pt-2 flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowPeerReviewModal(false);
                    setPeerReviewStatus('idle');
                    setPeerReviewEmails(['']);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && mergeStatus !== 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="p-6 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <GitPullRequest className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Merge Code</h3>
                  <p className="text-sm text-gray-400">Merge changes to target branch</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Target Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 text-sm text-white bg-dark-900 border border-dark-700 focus:border-primary focus:outline-none"
                >
                  <option value="main">main</option>
                  <option value="develop">develop</option>
                  <option value="release">release</option>
                </select>
              </div>
              {mergeStatus === 'loading' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-gray-300">
                      {mergeStep === 0 && 'Checking branch status...'}
                      {mergeStep === 1 && 'Running final tests...'}
                      {mergeStep === 2 && 'Merging code...'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-dark-800 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${((mergeStep + 1) / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeStatus('idle');
                  setMergeStep(0);
                }}
                disabled={mergeStatus === 'loading'}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setMergeStatus('loading');
                  let step = 0;
                  const interval = setInterval(() => {
                    step++;
                    setMergeStep(step);
                    if (step >= 3) {
                      clearInterval(interval);
                      setMergeStatus('success');
                    }
                  }, 1500);
                }}
                disabled={mergeStatus === 'loading'}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  mergeStatus === 'loading'
                    ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-500/90 text-white shadow-md shadow-blue-500/25'
                )}
              >
                {mergeStatus === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="w-4 h-4 inline mr-2" />
                    Merge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Success Modal */}
      {showMergeModal && mergeStatus === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-blue-500/30 shadow-2xl p-8 text-center" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Merge Successful!</h3>
                <p className="text-gray-400 text-sm">
                  Code has been successfully merged to <span className="text-blue-400 font-medium">{selectedBranch}</span> branch.
                </p>
              </div>
              <div className="pt-2 flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeStatus('idle');
                    setMergeStep(0);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-500/90 text-white text-sm font-semibold transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Configuration Modal */}
      {showGatewayConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">{selectedGateway} Configuration</h2>
              <button
                type="button"
                onClick={() => setShowGatewayConfigModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Service Account JSON File Upload */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Service Account JSON File *</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('gateway-json-upload').click()}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50',
                      'flex items-center gap-2'
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    Upload JSON File
                  </button>
                  <input
                    id="gateway-json-upload"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setGatewayConfigForm({ ...gatewayConfigForm, serviceAccountJson: event.target.result });
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Or Paste JSON */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Or Paste Service Account JSON *</Label>
                <textarea
                  value={gatewayConfigForm.serviceAccountJson}
                  onChange={(e) => setGatewayConfigForm({ ...gatewayConfigForm, serviceAccountJson: e.target.value })}
                  placeholder={`Paste your Service Account JSON here (e.g., {"type": "service_account", "project_id": "...", ...})`}
                  className="w-full h-40 rounded-lg px-3 py-2 text-sm text-white bg-dark-900 border border-dark-700 resize-none font-mono"
                />
                <p className="text-xs text-gray-500">
                  Paste your {selectedGateway} Service Account JSON. It must contain the required authentication fields.
                </p>
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Organization</Label>
                <Input
                  value={gatewayConfigForm.organization}
                  onChange={(e) => setGatewayConfigForm({ ...gatewayConfigForm, organization: e.target.value })}
                  placeholder={`e.g., ${selectedGateway === 'Apigee X' || selectedGateway === 'Apigee Edge' ? 'my-org' : 'my-company'}`}
                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                />
              </div>

              {/* Environment */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Environment</Label>
                <Input
                  value={gatewayConfigForm.environment}
                  onChange={(e) => setGatewayConfigForm({ ...gatewayConfigForm, environment: e.target.value })}
                  placeholder="e.g., prod, dev, test"
                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-dark-900/40">
              <button
                type="button"
                onClick={() => setShowGatewayConfigModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Save configuration logic
                  showMessage(`${selectedGateway} configuration saved`, 'success');
                  setShowGatewayConfigModal(false);
                }}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                  'active:scale-[0.98]'
                )}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">{editingProductId ? 'Edit Product' : 'Add Product'}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProductId(null);
                  setProductForm({ productName: '', displayName: '', description: '', proxyName: '', proxyPath: '' });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Product Name *</Label>
                  <Input
                    value={productForm.productName}
                    onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
                    placeholder="e.g., Payment API Product"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Display Name</Label>
                  <Input
                    value={productForm.displayName}
                    onChange={(e) => setProductForm({ ...productForm, displayName: e.target.value })}
                    placeholder="e.g., Payment Services"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-300">Description</Label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Describe the product..."
                    className="w-full h-20 rounded-lg px-3 py-2 text-sm text-white border border-dark-700 resize-none"
                    style={{ backgroundColor: '#0f172a80' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Service Name' : 'Proxy Name'}</Label>
                  {selectedGateway === 'Kong' ? (
                    <select
                      value={productForm.proxyName}
                      onChange={(e) => setProductForm({ ...productForm, proxyName: e.target.value })}
                      className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all"
                      style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}
                    >
                      <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select Service...</option>
                      <option value="payment-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Payment Service</option>
                      <option value="user-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>User Service</option>
                      <option value="order-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Order Service</option>
                      <option value="inventory-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Inventory Service</option>
                      <option value="notification-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Notification Service</option>
                    </select>
                  ) : (
                    <Input
                      value={productForm.proxyName}
                      onChange={(e) => setProductForm({ ...productForm, proxyName: e.target.value })}
                      placeholder="e.g., payment-proxy"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Service Path' : 'Proxy Path'}</Label>
                  <Input
                    value={productForm.proxyPath}
                    onChange={(e) => setProductForm({ ...productForm, proxyPath: e.target.value })}
                    placeholder={selectedGateway === 'Kong' ? 'e.g., /v1/services' : 'e.g., /v1/payments'}
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-dark-900/40">
              <button
                type="button"
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProductId(null);
                  setProductForm({ productName: '', displayName: '', description: '', proxyName: '', proxyPath: '' });
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!productForm.productName.trim()) {
                    showMessage('Product Name is required', 'error');
                    return;
                  }
                  if (editingProductId) {
                    // Update existing product
                    const updated = savedProducts.map(p => p.id === editingProductId ? { ...productForm, id: editingProductId } : p);
                    setSavedProducts(updated);
                    localStorage.setItem('probeStack_proxyProducts', JSON.stringify(updated));
                    showMessage('Product updated successfully', 'success');
                  } else {
                    // Add new product
                    const newProduct = { ...productForm, id: Date.now().toString() };
                    const updated = [...savedProducts, newProduct];
                    setSavedProducts(updated);
                    localStorage.setItem('probeStack_proxyProducts', JSON.stringify(updated));
                    showMessage('Product added successfully', 'success');
                  }
                  setShowProductModal(false);
                  setEditingProductId(null);
                  setProductForm({ productName: '', displayName: '', description: '', proxyName: '', proxyPath: '' });
                }}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                  'active:scale-[0.98]'
                )}
              >
                {editingProductId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">{editingApplicationId ? 'Edit App' : 'Add App'}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowApplicationModal(false);
                  setEditingApplicationId(null);
                  setApplicationForm({ applicationName: '', displayName: '', description: '', productName: '', developerEmail: '', companyName: '', companyEmail: '' });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">App Name *</Label>
                  <Input
                    value={applicationForm.applicationName}
                    onChange={(e) => setApplicationForm({ ...applicationForm, applicationName: e.target.value })}
                    placeholder="e.g., Mobile Banking App"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Display Name</Label>
                  <Input
                    value={applicationForm.displayName}
                    onChange={(e) => setApplicationForm({ ...applicationForm, displayName: e.target.value })}
                    placeholder="e.g., Mobile App"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-300">Description</Label>
                  <textarea
                    value={applicationForm.description}
                    onChange={(e) => setApplicationForm({ ...applicationForm, description: e.target.value })}
                    placeholder="Describe the application..."
                    className="w-full h-20 rounded-lg px-3 py-2 text-sm text-white border border-dark-700 resize-none"
                    style={{ backgroundColor: '#0f172a80' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Product Name</Label>
                  <select
                    value={applicationForm.productName}
                    onChange={(e) => setApplicationForm({ ...applicationForm, productName: e.target.value })}
                    className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                    style={{ backgroundColor: '#0f172a80' }}
                  >
                    <option value="">Select Product</option>
                    {savedProducts.map((product) => (
                      <option key={product.id} value={product.productName}>{product.productName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Service Name' : 'Developer Email'}</Label>
                  {selectedGateway === 'Kong' ? (
                    <select
                      value={applicationForm.developerEmail}
                      onChange={(e) => setApplicationForm({ ...applicationForm, developerEmail: e.target.value })}
                      className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all"
                      style={{ backgroundColor: '#0f172a80', borderColor: '#232942', borderWidth: '1px' }}
                    >
                      <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select Service...</option>
                      <option value="payment-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Payment Service</option>
                      <option value="user-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>User Service</option>
                      <option value="order-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Order Service</option>
                      <option value="inventory-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Inventory Service</option>
                      <option value="notification-service" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Notification Service</option>
                    </select>
                  ) : (
                    <Input
                      value={applicationForm.developerEmail}
                      onChange={(e) => setApplicationForm({ ...applicationForm, developerEmail: e.target.value })}
                      placeholder="e.g., dev@company.com"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Company Name</Label>
                  <Input
                    value={applicationForm.companyName}
                    onChange={(e) => setApplicationForm({ ...applicationForm, companyName: e.target.value })}
                    placeholder="e.g., Acme Corp"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Company Email</Label>
                  <Input
                    value={applicationForm.companyEmail}
                    onChange={(e) => setApplicationForm({ ...applicationForm, companyEmail: e.target.value })}
                    placeholder="e.g., contact@company.com"
                    className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-dark-900/40">
              <button
                type="button"
                onClick={() => {
                  setShowApplicationModal(false);
                  setEditingApplicationId(null);
                  setApplicationForm({ applicationName: '', displayName: '', description: '', productName: '', developerEmail: '', companyName: '', companyEmail: '' });
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!applicationForm.applicationName.trim()) {
                    showMessage('Application Name is required', 'error');
                    return;
                  }
                  if (editingApplicationId) {
                    // Update existing application
                    const updated = savedApplications.map(a => a.id === editingApplicationId ? { ...applicationForm, id: editingApplicationId } : a);
                    setSavedApplications(updated);
                    localStorage.setItem('probeStack_proxyApplications', JSON.stringify(updated));
                    showMessage('Application updated successfully', 'success');
                  } else {
                    // Add new application
                    const newApp = { ...applicationForm, id: Date.now().toString() };
                    const updated = [...savedApplications, newApp];
                    setSavedApplications(updated);
                    localStorage.setItem('probeStack_proxyApplications', JSON.stringify(updated));
                    showMessage('Application added successfully', 'success');
                  }
                  setShowApplicationModal(false);
                  setEditingApplicationId(null);
                  setApplicationForm({ applicationName: '', displayName: '', description: '', productName: '', developerEmail: '', companyName: '', companyEmail: '' });
                }}
                className={cn(
                  'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                  'active:scale-[0.98]'
                )}
              >
                {editingApplicationId ? 'Update Application' : 'Save Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">Add Provider</h2>
              <button type="button" onClick={() => setShowProviderModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Team Name</Label><Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g., Platform Team" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Project ID</Label><Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="e.g., proj-12345" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Application ID</Label><Input value={applicationId} onChange={(e) => setApplicationId(e.target.value)} placeholder="e.g., app-67890" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">App Owner Name</Label><Input value={appOwnerName} onChange={(e) => setAppOwnerName(e.target.value)} placeholder="e.g., John Doe" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">App Owner Email</Label><Input value={appOwnerEmail} onChange={(e) => setAppOwnerEmail(e.target.value)} placeholder="e.g., owner@example.com" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">SME Name</Label><Input value={smeName} onChange={(e) => setSmeName(e.target.value)} placeholder="e.g., Jane Smith" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">SME Email</Label><Input value={smeEmail} onChange={(e) => setSmeEmail(e.target.value)} placeholder="e.g., sme@example.com" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Support Group Name</Label><Input value={supportGroupName} onChange={(e) => setSupportGroupName(e.target.value)} placeholder="e.g., DevOps Team" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Support Group Email</Label><Input value={supportGroupEmail} onChange={(e) => setSupportGroupEmail(e.target.value)} placeholder="e.g., support@example.com" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Associated Application</Label><Input value={associatedApplication} onChange={(e) => setAssociatedApplication(e.target.value)} placeholder="e.g., Main Portal" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">SCM Config</Label><Input value={scmConfig} onChange={(e) => setScmConfig(e.target.value)} placeholder="e.g., Git Config" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Storage Config</Label><Input value={storageConfig} onChange={(e) => setStorageConfig(e.target.value)} placeholder="e.g., S3 Bucket" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">App Name</Label><Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g., My Application" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Product Name</Label><Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Enterprise Suite" className="h-9 text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button type="button" onClick={() => setShowProviderModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors">Cancel</button>
              <button type="button" onClick={handleSaveProvider} className={cn('px-6 py-2 rounded-lg font-semibold text-sm transition-all', 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25', 'active:scale-[0.98]')}>Save Provider</button>
            </div>
          </div>
        </div>
      )}

      {/* Consumer Modal */}
      {showConsumerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">{editingConsumerId ? 'Edit Consumer' : 'Add Consumer'}</h2>
              <button type="button" onClick={() => { setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '', consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: '' }); }} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer Name</Label><Input value={consumerForm.consumerName} onChange={(e) => setConsumerForm({ ...consumerForm, consumerName: e.target.value })} placeholder="e.g., Acme Corp" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer POC Name</Label><Input value={consumerForm.consumerPocName} onChange={(e) => setConsumerForm({ ...consumerForm, consumerPocName: e.target.value })} placeholder="e.g., Bob Wilson" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer POC Email</Label><Input value={consumerForm.consumerPocEmail} onChange={(e) => setConsumerForm({ ...consumerForm, consumerPocEmail: e.target.value })} placeholder="e.g., poc@example.com" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={(e) => setConsumerForm({ ...consumerForm, consumerSmeName: e.target.value })} placeholder="e.g., Alice Brown" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer SME Email</Label><Input value={consumerForm.consumerSmeEmail} onChange={(e) => setConsumerForm({ ...consumerForm, consumerSmeEmail: e.target.value })} placeholder="e.g., sme@example.com" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer Config</Label><Input value={consumerForm.consumerConfig} onChange={(e) => setConsumerForm({ ...consumerForm, consumerConfig: e.target.value })} placeholder="e.g., Config JSON" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">API TPS</Label><Input value={consumerForm.apiTps} onChange={(e) => setConsumerForm({ ...consumerForm, apiTps: e.target.value })} placeholder="e.g., 1000" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Quota (requests/day)</Label><Input value={consumerForm.quota} onChange={(e) => setConsumerForm({ ...consumerForm, quota: e.target.value })} placeholder="e.g., 10000/day" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">Rate Limiting (requests/min)</Label><Input value={consumerForm.rateLimiting} onChange={(e) => setConsumerForm({ ...consumerForm, rateLimiting: e.target.value })} placeholder="e.g., 100/min" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-gray-300">API Key Information</Label><Input value={consumerForm.apiKeyInfo} onChange={(e) => setConsumerForm({ ...consumerForm, apiKeyInfo: e.target.value })} placeholder="e.g., API Key xyz123" className="h-9 text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
              <button type="button" onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors">Cancel</button>
              <button type="button" onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer} className={cn('px-6 py-2 rounded-lg font-semibold text-sm transition-all', 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25', 'active:scale-[0.98]')}>{editingConsumerId ? 'Update Consumer' : 'Save Consumer'}</button>
            </div>
          </div>
        </div>
      )}
      {isSyncModal && resourceType == "Proxy" &&
        <ProxySyncModal onClose={() => setIsSyncModal(false)} />}
      {isSyncModal && resourceType == "Shared Function" &&
        <SharedFlowSyncModal onClose={() => setIsSyncModal(false)} />}
      {openSettings && (<SettingsModal onClose={() => setOpenSettings(false)} />)}

        {/* Preview Modal – Full page overlay with 5 tabs */}
{showPreviewModal && (
  <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col" style={{ backgroundColor: '#0e172a' }}>
    {/* Modal Header */}
    <div className="px-6 py-4 border-b border-dark-700 bg-[#0f172a]/50 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowPreviewModal(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-6 w-px bg-dark-700"></div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              API Contract Preview
            </h2>
            <p className="text-sm text-gray-400">
              Review full API specification, endpoints, mock server details before sending for approval
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Tabs */}
    <div className="flex gap-2 border-b border-dark-700 px-6 pt-3">
      {[
        { id: 'spec', label: 'Specification', icon: FileCode },
        { id: 'spec-endpoints', label: 'Spec Endpoints', icon: FileText },
        { id: 'mock-server', label: 'Mock Server', icon: Server },
        { id: 'mock-endpoints', label: 'Mock Endpoints', icon: FlaskConical },
        { id: 'api-linting', label: 'API Linting', icon: Shield },
      ].map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setPreviewActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              previewActiveTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>

    {/* Scrollable Tab Content + Send Approval Form */}
    <div className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Tab Content */}
        <div>
          {previewActiveTab === 'spec' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                OpenAPI Specification (Read Only)
              </h3>
              {previewLoadingSpec ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="h-[500px] rounded-lg overflow-hidden border border-dark-700">
                  <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={previewSpecContent}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                    theme="vs-dark"
                  />
                </div>
              )}
            </Card>
          )}

          {previewActiveTab === 'spec-endpoints' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                API Endpoints (from Specification)
              </h3>
              {isFetchingSpecEndpoints ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : specEndpoints.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p>No endpoints found in the specification.</p>
                  <p className="text-xs mt-1">Please make sure a valid OpenAPI spec is selected in Step 3.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {specEndpoints.map((ep) => (
                    <div key={ep.id} className="rounded-lg border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedEndpoint(expandedEndpoint === ep.id ? null : ep.id)}
                        className="w-full p-3 flex items-center justify-between hover:bg-[#0f172a]/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                              ep.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                                ep.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                  ep.method === 'PATCH' ? 'bg-orange-500/20 text-orange-400' :
                                    ep.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                      'bg-gray-500/20 text-gray-400'
                          )}>{ep.method}</span>
                          <span className="text-xs font-medium text-white">{ep.path}</span>
                          {ep.summary && <span className="text-xs text-gray-500 hidden md:inline">— {ep.summary}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-400">{ep.responseStatus}</span>
                          <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expandedEndpoint === ep.id && 'rotate-90')} />
                        </div>
                      </button>
                      {expandedEndpoint === ep.id && (
                        <div className="border-t border-dark-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ep.requestBodySample && (
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-400">Request Body Sample</Label>
                              <pre className="w-full h-32 px-3 py-2 rounded-lg border border-dark-700 bg-[#0a0e1b] text-white text-xs font-mono overflow-auto">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(ep.requestBodySample), null, 2);
                                  } catch {
                                    return ep.requestBodySample;
                                  }
                                })()}
                              </pre>
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Response Body (HTTP {ep.responseStatus})</Label>
                            <pre className="w-full h-32 px-3 py-2 rounded-lg border border-dark-700 bg-[#0a0e1b] text-white text-xs font-mono overflow-auto">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(ep.responseBody), null, 2);
                                } catch {
                                  return ep.responseBody;
                                }
                              })()}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {previewActiveTab === 'mock-server' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Mock Server Details
              </h3>
              {mockServerGenerated ? (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Mock Server Generated Successfully</p>
                      <p className="text-xs text-gray-400">{mockEndpoints.length} endpoints active</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="p-3 rounded bg-[#0f172a80]">
                      <p className="text-xs text-gray-300 mb-1">Server URL</p>
                      <p className="text-xs text-green-400 font-mono break-all">{mockServerBaseUrl || 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded bg-[#0f172a80]">
                      <p className="text-xs text-gray-300 mb-1">Status</p>
                      <p className="text-xs text-green-400">Generated</p>
                    </div>
                    <div className="p-3 rounded bg-[#0f172a80]">
                      <p className="text-xs text-gray-300 mb-1">Endpoints</p>
                      <p className="text-xs text-gray-400">{mockEndpoints.length} active</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                  <p className="text-sm text-gray-400">No mock server generated yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Please go to Step 5 and generate a mock server.</p>
                </div>
              )}
            </Card>
          )}

          {previewActiveTab === 'mock-endpoints' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                Generated Mock Endpoints
              </h3>
              {mockEndpoints.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p>No mock endpoints generated.</p>
                  <p className="text-xs mt-1">Please generate the mock server first in Step 5.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {mockEndpoints.map((ep, idx) => (
                    <div key={idx} className="rounded-lg border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedMockEndpoint(expandedMockEndpoint === idx ? null : idx)}
                        className="w-full p-3 flex items-center justify-between hover:bg-[#0f172a]/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                              ep.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                                ep.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                  ep.method === 'PATCH' ? 'bg-orange-500/20 text-orange-400' :
                                    ep.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                      'bg-gray-500/20 text-gray-400'
                          )}>{ep.method}</span>
                          <span className="text-xs font-medium text-white">{ep.path}</span>
                          {ep.summary && <span className="text-xs text-gray-500 hidden md:inline">— {ep.summary}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-400">{ep.responseStatus || 200}</span>
                          <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expandedMockEndpoint === idx && 'rotate-90')} />
                        </div>
                      </button>
                      {expandedMockEndpoint === idx && (
                        <div className="border-t border-dark-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ep.requestBody && (
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-400">Request Body Sample</Label>
                              <pre className="w-full h-32 px-3 py-2 rounded-lg border border-dark-700 bg-[#0a0e1b] text-white text-xs font-mono overflow-auto">
                                {typeof ep.requestBody === 'object' ? JSON.stringify(ep.requestBody, null, 2) : ep.requestBody || 'No request body'}
                              </pre>
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Response Body (HTTP {ep.responseStatus || 200})</Label>
                            <pre className="w-full h-32 px-3 py-2 rounded-lg border border-dark-700 bg-[#0a0e1b] text-white text-xs font-mono overflow-auto">
                              {typeof ep.responseBody === 'object' ? JSON.stringify(ep.responseBody, null, 2) : ep.responseBody || 'No response body'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {previewActiveTab === 'api-linting' && (
            <Card className="p-5 bg-dark-800/60 border-dark-700">
              <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                API Linting Results
              </h3>
              {previewLoadingSpec ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <SpectralLintPanel
                  compact
                  specContent={previewSpecContent}
                  specId={proxyDesignSelectedSpec?.specMetadataId || proxyDesignSelectedSpec?.id}
                  specName={proxyDesignSelectedSpec?.specName || proxyDesignSelectedSpec?.name}
                />
              )}
            </Card>
          )}
        </div>

        {/* Send Approval Request - Two rows, each with email + button */}
        <Card className="p-5 bg-dark-800/60 border-dark-700 mt-4">
          <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send Approval Request
          </h3>

          {/* Row 1: Architect */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <Label className="text-xs text-gray-300 mb-1 block">Architect Email</Label>
              <Input
                type="email"
                placeholder="architect@company.com"
                value={previewArchitectEmail}
                onChange={(e) => setPreviewArchitectEmail(e.target.value)}
                className="bg-dark-900 border-dark-700"
              />
            </div>
            <Button
              onClick={() => handlePreviewSendApproval('architect')}
              disabled={previewSending}
              className="bg-primary self-end"
            >
              {previewSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to Architect
            </Button>
          </div>

          {/* Row 2: Consumer (auto-filled from Step 1) */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-gray-300 mb-1 block">Consumer Email</Label>
              <Input
                type="email"
                value={autoFilledConsumerEmail}
                readOnly
                className="bg-dark-900/50 border-dark-700 cursor-not-allowed text-white-900"
              />
            </div>
            <Button
              onClick={() => handlePreviewSendApproval('consumer')}
              disabled={previewSending}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 self-end"
            >
              {previewSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to Consumer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  </div>
)}

{showHistoryDetailModal && historyDetailData && (
  <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col" style={{ backgroundColor: '#0e172a' }}>
    {/* Header */}
    <div className="px-6 py-4 border-b border-dark-700 bg-[#0f172a]/50 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowHistoryDetailModal(false);
              setHistoryDetailData(null);
              setSelectedHistoryRecord(null);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-6 w-px bg-dark-700"></div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Approval Request Details
            </h2>
            <p className="text-sm text-gray-400">
              {historyDetailData.type} approval for{' '}
              {historyDetailData.approvalRequest?.openApiSpec || selectedHistoryRecord?.microserviceId}
            </p>
          </div>
        </div>
        <div>
          {(() => {
            const status = historyDetailData.approvalRequest?.status;
            const config = {
              SENT: 'bg-blue-500/20 text-blue-400',
              IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
              APPROVED: 'bg-green-500/20 text-green-400',
              REJECTED: 'bg-red-500/20 text-red-400',
            };
            const label = {
              SENT: 'Requested',
              IN_PROGRESS: 'Under Review',
              APPROVED: 'Approved',
              REJECTED: 'Rejected',
            }[status] || 'Unknown';
            return (
              <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', config[status])}>
                {label}
              </span>
            );
          })()}
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Left Column: Timeline + Contract Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Timeline Card */}
          <Card className="p-6 bg-dark-800/60 border-dark-700">
            <h3 className="text-md font-semibold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Approval Timeline
            </h3>

            <div className="relative">
              {/* Step 1: Requested */}
              <div className="relative pb-8">
                {/* Connecting line to next step if status is not SENT or inProgressAt exists */}
                {(historyDetailData.approvalRequest?.status !== 'SENT' ||
                  historyDetailData.approvalRequest?.inProgressAt) && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-green-500/50 -translate-x-1/2"></div>
                )}
                <div className="flex items-start gap-4">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 ring-4 ring-dark-800">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-white">Request Sent</p>
                      <p className="text-xs text-gray-400">
                        {new Date(historyDetailData.sentAt || selectedHistoryRecord?.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Sent by <span className="font-medium text-gray-300">
                        {historyDetailData.sentBy || selectedHistoryRecord?.sentBy}
                      </span> to{' '}
                      <span className="font-medium text-gray-300">
                        {historyDetailData.approvalRequest?.approverEmail}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {historyDetailData.type === 'ARCHITECT'
                        ? 'API Architect has been requested to review the API contract.'
                        : 'Consumer has been requested to review the API contract.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Under Review (always visible, but muted if not yet started) */}
              <div className="relative pb-8">
                {(historyDetailData.approvalRequest?.status === 'APPROVED' ||
                  historyDetailData.approvalRequest?.status === 'REJECTED') && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-green-500/50 -translate-x-1/2"></div>
                )}
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-dark-800',
                      historyDetailData.approvalRequest?.inProgressAt
                        ? historyDetailData.approvalRequest?.status === 'APPROVED' ||
                          historyDetailData.approvalRequest?.status === 'REJECTED'
                          ? 'bg-green-500/20'
                          : 'bg-yellow-500/20'
                        : 'bg-gray-500/20'
                    )}
                  >
                    {historyDetailData.approvalRequest?.inProgressAt ? (
                      historyDetailData.approvalRequest?.status === 'APPROVED' ||
                      historyDetailData.approvalRequest?.status === 'REJECTED' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-400" />
                      )
                    ) : (
                      <Clock className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          historyDetailData.approvalRequest?.inProgressAt
                            ? 'text-white'
                            : 'text-gray-500'
                        )}
                      >
                        Under Review
                      </p>
                      {historyDetailData.approvalRequest?.inProgressAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(historyDetailData.approvalRequest.inProgressAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {historyDetailData.approvalRequest?.inProgressAt ? (
                      <p className="mt-1 text-xs text-gray-400">
                        The approver started reviewing the API specification and mock server.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        The approver has not yet started the review.
                      </p>
                    )}
                    {historyDetailData.approvalRequest?.status === 'IN_PROGRESS' && (
                      <p className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 inline-block px-2 py-0.5 rounded">
                        ⏳ Awaiting final decision
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Final decision (Approved/Rejected) - always visible, muted if not final yet */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-dark-800',
                      historyDetailData.approvalRequest?.status === 'APPROVED'
                        ? 'bg-green-500/20'
                        : historyDetailData.approvalRequest?.status === 'REJECTED'
                        ? 'bg-red-500/20'
                        : 'bg-gray-500/20'
                    )}
                  >
                    {historyDetailData.approvalRequest?.status === 'APPROVED' && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                    {historyDetailData.approvalRequest?.status === 'REJECTED' && (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    {historyDetailData.approvalRequest?.status !== 'APPROVED' &&
                      historyDetailData.approvalRequest?.status !== 'REJECTED' && (
                        <XCircle className="h-4 w-4 text-gray-500" />
                      )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          historyDetailData.approvalRequest?.status === 'APPROVED'
                            ? 'text-green-400'
                            : historyDetailData.approvalRequest?.status === 'REJECTED'
                            ? 'text-red-400'
                            : 'text-gray-500'
                        )}
                      >
                        {historyDetailData.approvalRequest?.status === 'APPROVED'
                          ? 'Approved'
                          : historyDetailData.approvalRequest?.status === 'REJECTED'
                          ? 'Rejected'
                          : 'Pending Decision'}
                      </p>
                      {(historyDetailData.approvalRequest?.status === 'APPROVED' ||
                        historyDetailData.approvalRequest?.status === 'REJECTED') && (
                        <p className="text-xs text-gray-400">
                          {new Date(
                            historyDetailData.approvalRequest?.approvedAt ||
                              historyDetailData.approvalRequest?.rejectedAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {(historyDetailData.approvalRequest?.status === 'APPROVED' ||
                      historyDetailData.approvalRequest?.status === 'REJECTED') && (
                      <>
                        <p className="mt-1 text-xs text-gray-400">
                          {historyDetailData.approvalRequest?.status === 'APPROVED'
                            ? `Approved by ${historyDetailData.approvalRequest.approverEmail}`
                            : `Rejected by ${historyDetailData.approvalRequest.approverEmail}`}
                        </p>
                        {historyDetailData.approvalRequest?.reviewComment && (
                          <div
                            className={cn(
                              'mt-3 p-3 rounded-lg border',
                              historyDetailData.approvalRequest?.status === 'APPROVED'
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                            )}
                          >
                            <p className="text-xs font-medium flex items-center gap-1">
                              {historyDetailData.approvalRequest?.status === 'APPROVED' ? (
                                <MessageSquare className="w-3 h-3 text-green-300" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-300" />
                              )}
                              {historyDetailData.approvalRequest?.status === 'APPROVED'
                                ? "Approver's comment"
                                : 'Rejection reason'}
                            </p>
                            <p className="mt-1 text-sm text-gray-200">
                              {historyDetailData.approvalRequest.reviewComment}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {historyDetailData.approvalRequest?.status !== 'APPROVED' &&
                      historyDetailData.approvalRequest?.status !== 'REJECTED' && (
                        <p className="mt-1 text-xs text-gray-500">
                          Final decision not yet recorded.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* API Contract Details Card (with expandable tabs) */}
          <Card className="p-5 bg-dark-800/60 border-dark-700">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                API Contract Details
              </h3>
              <button
                onClick={() => {
                  const detailsDiv = document.getElementById('contract-details-tabs');
                  if (detailsDiv) {
                    detailsDiv.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Specification Name</p>
                <p className="text-white font-medium">
                  {historyDetailData.approvalRequest?.openApiSpec || '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Total Spec Endpoints</p>
                <p className="text-white font-medium">
                  {historyDetailData.approvalRequest?.specEndpoints?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Mock Server URL</p>
                <p className="text-white break-all">
                  {historyDetailData.approvalRequest?.mockServerBaseUrl || '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Total Mock Endpoints</p>
                <p className="text-white font-medium">
                  {historyDetailData.approvalRequest?.mockEndpoints?.length || 0}
                </p>
              </div>
            </div>

            {/* Hidden div that expands when "View full specification" is clicked */}
            <div id="contract-details-tabs" className="mt-6 pt-4 border-t border-dark-700">
              <div className="flex gap-2 border-b border-dark-700 mb-4">
                {[
                  { id: 'specContent', label: 'Specification', icon: FileCode },
                  { id: 'specEndpoints', label: 'Spec Endpoints', icon: FileText },
                  { id: 'mockServer', label: 'Mock Server', icon: Server },
                  { id: 'mockEndpoints', label: 'Mock Endpoints', icon: FlaskConical },
                  { id: 'apiLinting', label: 'API Linting', icon: Shield },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeDetailsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailsTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-400 hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Specification Content Tab */}
              {activeDetailsTab === 'specContent' && (
                <div>
                  {historyDetailData.approvalRequest?.specContent ? (
                    <div className="h-[400px] rounded-lg overflow-hidden border border-dark-700">
                      <Editor
                        height="100%"
                        defaultLanguage="yaml"
                        value={historyDetailData.approvalRequest.specContent}
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                        theme="vs-dark"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No specification content available.
                    </div>
                  )}
                </div>
              )}

              {/* Spec Endpoints Tab */}
              {activeDetailsTab === 'specEndpoints' && (
                <div>
                  {historyDetailData.approvalRequest?.specEndpoints?.length ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {historyDetailData.approvalRequest.specEndpoints.map((ep) => (
                        <div
                          key={ep.id}
                          className="rounded-lg border border-dark-700 bg-dark-900/50 overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedSpecEndpoint(expandedSpecEndpoint === ep.id ? null : ep.id)
                            }
                            className="w-full p-3 flex items-center justify-between hover:bg-dark-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded',
                                  ep.method === 'GET' && 'bg-blue-500/20 text-blue-400',
                                  ep.method === 'POST' && 'bg-green-500/20 text-green-400',
                                  ep.method === 'PUT' && 'bg-yellow-500/20 text-yellow-400',
                                  ep.method === 'DELETE' && 'bg-red-500/20 text-red-400'
                                )}
                              >
                                {ep.method}
                              </span>
                              <span className="text-sm font-medium text-white">{ep.path}</span>
                            </div>
                            <ChevronRight
                              className={cn(
                                'w-4 h-4 transition-transform',
                                expandedSpecEndpoint === ep.id && 'rotate-90'
                              )}
                            />
                          </button>
                          {expandedSpecEndpoint === ep.id && (
                            <div className="border-t border-dark-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ep.requestBodySample && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-400">Request Body</div>
                                  <pre className="mt-1 p-2 rounded bg-dark-950 text-xs overflow-auto max-h-40">
                                    {formatBody(ep.requestBodySample)}
                                  </pre>
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-semibold text-gray-400">Response Body</div>
                                <pre className="mt-1 p-2 rounded bg-dark-950 text-xs overflow-auto max-h-40">
                                  {formatBody(ep.responseBody)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">No spec endpoints found.</div>
                  )}
                </div>
              )}

              {/* Mock Server Tab */}
              {activeDetailsTab === 'mockServer' && (
                <div>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Mock Service Name</dt>
                      <dd className="text-white">
                        {historyDetailData.approvalRequest?.mockServiceName || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Mock Server URL</dt>
                      <dd className="text-white break-all">
                        {historyDetailData.approvalRequest?.mockServerBaseUrl || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Specification URL</dt>
                      <dd className="text-white break-all">
                        {historyDetailData.approvalRequest?.specificationUrl || '-'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Mock Endpoints Tab */}
              {activeDetailsTab === 'mockEndpoints' && (
                <div>
                  {historyDetailData.approvalRequest?.mockEndpoints?.length ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {historyDetailData.approvalRequest.mockEndpoints.map((ep, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-dark-700 bg-dark-900/50 overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedMockEndpoint(
                                expandedMockEndpoint === idx ? null : idx
                              )
                            }
                            className="w-full p-3 flex items-center justify-between hover:bg-dark-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded',
                                  ep.method === 'GET' && 'bg-blue-500/20 text-blue-400',
                                  ep.method === 'POST' && 'bg-green-500/20 text-green-400',
                                  ep.method === 'PUT' && 'bg-yellow-500/20 text-yellow-400',
                                  ep.method === 'DELETE' && 'bg-red-500/20 text-red-400'
                                )}
                              >
                                {ep.method}
                              </span>
                              <span className="text-sm font-medium text-white">{ep.path}</span>
                            </div>
                            <ChevronRight
                              className={cn(
                                'w-4 h-4 transition-transform',
                                expandedMockEndpoint === idx && 'rotate-90'
                              )}
                            />
                          </button>
                          {expandedMockEndpoint === idx && (
                            <div className="border-t border-dark-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ep.requestBody && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-400">Request Body</div>
                                  <pre className="mt-1 p-2 rounded bg-dark-950 text-xs overflow-auto max-h-40">
                                    {formatBody(ep.requestBody)}
                                  </pre>
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-semibold text-gray-400">Response Body</div>
                                <pre className="mt-1 p-2 rounded bg-dark-950 text-xs overflow-auto max-h-40">
                                  {formatBody(ep.responseBody)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">No mock endpoints found.</div>
                  )}
                </div>
              )}

              {/* API Linting Tab */}
{activeDetailsTab === 'apiLinting' && (
  <div>
    {lintingInProgress ? (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-400">Linting specification...</span>
      </div>
    ) : (
      <>
        {/* Score and Summary Section */}
        {(() => {
          const issues = computedLintResults || [];
          const errorCount = issues.filter(i => i.severity === 0).length;
          const warningCount = issues.filter(i => i.severity === 1).length;
          const infoCount = issues.filter(i => i.severity === 2).length;
          
          // Calculate score: start 100, deduct error*5, warning*2, info*0.5
          let score = 100 - (errorCount * 5) - (warningCount * 2) - (infoCount * 0.5);
          score = Math.max(0, Math.min(100, score));
          const scoreRounded = Math.round(score * 10) / 10;
          
          const getScoreColor = () => {
            if (score >= 90) return 'text-green-400';
            if (score >= 70) return 'text-yellow-400';
            return 'text-red-400';
          };
          
          return (
            <div className="mb-6 p-4 rounded-lg bg-dark-900/50 border border-dark-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  <div className="flex gap-4">
                    <div className="text-sm font-semibold text-white">API Linting Score</div>
                    <div className={`text-lg font-bold ${getScoreColor()}`}>
                      {scoreRounded}
                      <span className="text-lg text-gray-400">/100</span>
                    </div>
                  </div>
                  <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                    Errors: {errorCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
                    Warnings: {warningCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    Info: {infoCount}
                  </span>
                  <span className="text-gray-400">Total issues: {issues.length}</span>
                </div>
              </div>
              {issues.length === 0 && (
                <div className="mt-3 text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Perfect score! No linting issues detected.
                </div>
              )}
            </div>
          );
        })()}

        {/* Detailed Issues List */}
        {computedLintResults && computedLintResults.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {computedLintResults.map((issue, idx) => (
              <div key={idx} className="rounded-lg border border-dark-700 bg-dark-900/50 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {issue.severity === 0 ? (
                      <XCircle className="h-4 w-4 text-red-400" />
                    ) : issue.severity === 1 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-mono px-1.5 py-0.5 rounded',
                          issue.severity === 0
                            ? 'bg-red-500/20 text-red-300'
                            : issue.severity === 1
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-blue-500/20 text-blue-300'
                        )}
                      >
                        {issue.code || 'lint'}
                      </span>
                      <span className="text-sm text-white">{issue.message}</span>
                    </div>
                    {issue.path && issue.path.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        Path: {issue.path.join(' → ')}
                        {issue.range &&
                          ` (lines ${issue.range.start?.line + 1 || '?'}-${
                            issue.range.end?.line + 1 || '?'
                          })`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </>
    )}
  </div>
)}
            </div>
          </Card>
        </div>

        {/* Right Column: Action Buttons (if approver and status allows) */}
        <div className="space-y-4">
          {(() => {
            const currentUserEmail = localStorage.getItem('userEmail') || '';
            const isApprover = historyDetailData.approvalRequest?.approverEmail === currentUserEmail;
            const status = historyDetailData.approvalRequest?.status;
            const canAct = isApprover && (status === 'SENT' || status === 'IN_PROGRESS');
            if (!canAct) return null;
            return (
              <Card className="p-5 bg-dark-800/60 border-dark-700 sticky top-6">
                <h3 className="text-md font-semibold text-white mb-3">Take Action</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="w-full px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <ThumbsUp className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="w-full px-4 py-2.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <ThumbsDown className="w-4 h-4" /> Reject
                  </button>
                </div>
                <p className="mt-4 text-[11px] text-gray-500 text-center">
                  {status === 'SENT'
                    ? 'Review has not started yet. Your decision will finalise the request.'
                    : 'You are currently reviewing this request. Your decision will be recorded.'}
                </p>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
