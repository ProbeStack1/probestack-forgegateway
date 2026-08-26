// src/pages/CicdAutomationPage.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Layers, Shield, ShieldCheck, Lock, Search,
  Code2, FileCode, CheckCircle, Save, ChevronRight,
  Zap, Key, MoreHorizontal, X, GitMerge,
  Loader2, AlertCircle, Sparkles, Wrench,
  GitBranch, Globe, Settings, FolderTree, Eye, Plus, Trash2,
  Cog, ChevronDown, ChevronUp, ArrowRight, EyeOff,
  RefreshCw, Edit, Check,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import Toast from '../components/ui/toast';
import { getApplications } from '../http-service/onboardingApi';
import { cicdProfileService } from '../services/cicdProfileService';

// ─── Constants ──────────────────────────────────────────────────────────────
const PROJECT_TYPES = [
  { id: 'APIGEE_PROXY', label: 'Pipeline', icon: Layers },
];

// Maps a raw onboarding-api application object into the shape the rest of
// this page expects (ctx.onboarding?.xxx / ctx.id / ctx.resources).
// The /api/v1/onboarding/applications payload (see ApplicationDetail.jsx,
// which reads the same objects directly) names these fields `ownerName`,
// `businessUnitName` and `projectName` — this app's onboarding model has no
// separate "team" concept, so `projectName` is what actually identifies the
// owning group beneath the business unit.
const toContextLikeApplication = (app = {}) => ({
  id: app.id,
  onboarding: {
    id: app.id,
    applicationId: app.applicationId || app.id,
    applicationName: app.name || app.applicationName || 'Unnamed',
    projectOwner: app.ownerName || app.projectOwner || app.owner || '',
    ownerEmail: app.ownerEmail || '',
    businessUnit: app.businessUnitName || app.businessUnit || '',
    projectName: app.projectName || '',
    createdAt: app.createdAt || app.created_at || '',
    ...app,
  },
  resources: app.resources || [],
});

const SCM_OPTIONS = [
  { value: 'github', label: 'GitHub', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg', invert: true },
  { value: 'gitlab', label: 'GitLab', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg' },
  { value: 'bitbucket', label: 'Bitbucket', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bitbucket/bitbucket-original.svg' },
];

const CLOUD_PROVIDERS = [
  {
    value: 'gcp',
    label: 'GCP',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg',
    fields: [
      { key: 'projectId', label: 'GCP Project ID', type: 'text', placeholder: 'my-project-123' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-central1' },
      { key: 'serviceAccountJson', label: 'Service Account JSON', type: 'textarea', placeholder: 'Paste your service account JSON here...' },
      { key: 'serviceAccountEmail', label: 'Service Account Email', type: 'text', placeholder: '...@...iam.gserviceaccount.com' },
      { key: 'clusterName', label: 'Cluster Name', type: 'text', placeholder: 'my-cluster' },
      { key: 'namespace', label: 'Namespace', type: 'text', placeholder: 'default' },
    ]
  },
  {
    value: 'aws',
    label: 'AWS',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
      { key: 'clusterName', label: 'Cluster Name', type: 'text', placeholder: 'my-eks-cluster' },
      { key: 'namespace', label: 'Namespace', type: 'text', placeholder: 'default' },
      { key: 'serviceAccountEmail', label: 'Service Account Email (optional)', type: 'text', placeholder: 'optional' },
    ]
  },
  {
    value: 'azure',
    label: 'Azure',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg',
    fields: [
      { key: 'subscriptionId', label: 'Subscription ID', type: 'text', placeholder: '12345678-1234-1234-1234-123456789012' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'East US' },
      { key: 'serviceAccountJson', label: 'Service Account JSON (optional)', type: 'textarea', placeholder: 'Paste JSON if using SP' },
      { key: 'serviceAccountEmail', label: 'Service Account Email (optional)', type: 'text', placeholder: 'optional' },
      { key: 'clusterName', label: 'Cluster Name', type: 'text', placeholder: 'my-aks-cluster' },
      { key: 'namespace', label: 'Namespace', type: 'text', placeholder: 'default' },
    ]
  },
  {
    value: 'openshift',
    label: 'Openshift',
    logo: 'https://www.vectorlogo.zone/logos/openshift/openshift-icon.svg',
    fields: [
      { key: 'clusterUrl', label: 'Cluster URL', type: 'text', placeholder: 'https://mycluster.openshift.com' },
      { key: 'serviceAccountEmail', label: 'Service Account Email', type: 'text', placeholder: '...' },
      { key: 'clusterName', label: 'Cluster Name', type: 'text', placeholder: 'my-ocp-cluster' },
      { key: 'namespace', label: 'Namespace', type: 'text', placeholder: 'default' },
      { key: 'serviceAccountJson', label: 'Service Account JSON (optional)', type: 'textarea', placeholder: 'optional' },
      { key: 'region', label: 'Region (optional)', type: 'text', placeholder: 'optional' },
    ]
  },
  {
    value: 'others',
    label: 'Others',
    icon: MoreHorizontal,
    fields: [
      { key: 'cloudDetail', label: 'Cloud Details', type: 'text', placeholder: 'Enter your cloud details...' },
    ]
  },
];

const ALL_SECURITY_TOOLS = [
  { id: 'snyk', label: 'Snyk', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10', hasToken: true, tokenKey: 'snykToken', tokenLabel: 'Snyk API Token', tokenPlaceholder: 'Enter your Snyk API Token', apigeeOnly: false },
  { id: 'apigeelint', label: 'ApigeeLint', icon: Code2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', hasToken: false, tokenKey: null, apigeeOnly: true },
  { id: 'jslint', label: 'JSLint', icon: FileCode, color: 'text-yellow-500', bg: 'bg-yellow-500/10', hasToken: false, tokenKey: null, apigeeOnly: true },
  { id: 'sonarscanner', label: 'SonarQube', icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/10', hasToken: true, tokenKey: 'sonarToken', tokenLabel: 'SonarQube Token', tokenPlaceholder: 'Enter your SonarQube Token', apigeeOnly: false },
  { id: 'aquascan', label: 'Aqua Scan', icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10', hasToken: true, tokenKey: 'aquaToken', tokenLabel: 'Aqua Scan Token', tokenPlaceholder: 'Enter your Aqua Scan Token', apigeeOnly: false },
  { id: 'fortify', label: 'Fortify Scan', icon: Lock, color: 'text-orange-400', bg: 'bg-orange-500/10', hasToken: true, tokenKey: 'fortifyToken', tokenLabel: 'Fortify Scan Token', tokenPlaceholder: 'Enter your Fortify Scan Token', apigeeOnly: false },
];

// Replace the defaultPipeline function with this:
const defaultPipeline = () => ({
  scm: '',
  scmToken: '',
  scmOrgUser: '',
  scmVisibility: 'PUBLIC',
  runnerType: '',
  runnerTag: '',
  gcpSa: '',
  oidc: '',
  securityTools: [],
  snykToken: '',
  sonarToken: '',
  aquaToken: '',
  fortifyToken: '',
  apigeeType: 'X',
  apigeeServiceAccount: '',
  apigeeCompanyId: '',
  apigeeUsername: '',
  apigeePassword: '',
  apigeeOrgName: '',
  apigeeTokenUrl: 'https://login.apigee.com/oauth/token',
  apigeeSsoEnabled: true,
  kongRegion: '',
  kongControlPlaneId: '',
  kongPat: '',
  environmentConfigs: {
    dev: {
      label: 'Development',
      crRequired: false, // Dev – always false, hidden in UI
      instances: [{ name: 'dev-env', enabled: true, provider: '', config: {} }],
      provider: '',
      config: {}
    },
    prod: {
      label: 'Production',
      crRequired: true,  // Prod – always true, may show but locked
      instances: [{ name: 'prod-env', enabled: true, provider: '', config: {} }],
      provider: '',
      config: {}
    },
    qa: {
      label: 'QA Testing',
      crRequired: false,
      instances: [{ name: 'qa-env', enabled: true, provider: '', config: {} }],
      provider: '',
      config: {}
    },
    uat: {
      label: 'User Acceptance Testing',
      crRequired: false,
      instances: [{ name: 'uat-env', enabled: true, provider: '', config: {} }],
      provider: '',
      config: {}
    }
  }
});

// ─── Build nested pipeline (for API) ─────────────────────────────────────
function buildNestedPipeline(flat) {
  const pipeline = {
    scm: flat.scm ? {
      provider: flat.scm,
      token: flat.scmToken || '',
      orgUser: flat.scmOrgUser || '',
      visibility: flat.scmVisibility || 'PUBLIC',
    } : null,
    runnerType: flat.runnerType || '',
    runnerTag: flat.runnerTag || '',
    oidc: flat.oidc || '',
    securityTools: flat.securityTools || [],
    // environmentConfigs: flat.environmentConfigs || [], // OLD: array
    environmentConfigs: flat.environmentConfigs || {},
  };

  // Apigee details (global) - unchanged
  if (flat.apigeeType) {
    const apigeeDetails = {
      type: flat.apigeeType,
      serviceAccountJson: flat.apigeeServiceAccount || '',
    };
    if (flat.apigeeType === 'EDGE') {
      if (flat.apigeeSsoEnabled) {
        apigeeDetails.ssoConfig = {
          enabled: true,
          companyIdentifier: flat.apigeeCompanyId || '',
          tokenUrl: flat.apigeeTokenUrl || '',
          username: flat.apigeeUsername || '',
          password: flat.apigeePassword || '',
        };
        apigeeDetails.standardConfig = null;
      } else {
        apigeeDetails.standardConfig = {
          orgName: flat.apigeeOrgName || '',
          username: flat.apigeeUsername || '',
          tokenUrl: flat.apigeeTokenUrl || '',
          password: flat.apigeePassword || '',
        };
        apigeeDetails.ssoConfig = null;
      }
    } else {
      apigeeDetails.ssoConfig = null;
      apigeeDetails.standardConfig = null;
    }
    pipeline.apigeeDetails = apigeeDetails;
  } else {
    pipeline.apigeeDetails = null;
  }

  if (flat.kongRegion) {
    pipeline.kongDetails = {
      region: flat.kongRegion,
      controlPlaneId: flat.kongControlPlaneId || '',
      pat: flat.kongPat || '',
    };
  } else {
    pipeline.kongDetails = null;
  }

  return pipeline;
}

// ─── Parse nested pipeline from API ──────────────────────────────────────
function parseNestedPipeline(pipeline) {
  const flat = defaultPipeline();
  if (!pipeline) return flat;

  // SCM, runner, security...
  if (pipeline.scm) {
    flat.scm = pipeline.scm.provider || '';
    flat.scmToken = pipeline.scm.token || '';
    flat.scmOrgUser = pipeline.scm.orgUser || '';
    flat.scmVisibility = pipeline.scm.visibility || 'PUBLIC';
  }
  flat.runnerType = pipeline.runnerType || '';
  flat.runnerTag = pipeline.runnerTag || '';
  flat.oidc = pipeline.oidc || '';
  flat.securityTools = pipeline.securityTools || [];

// ─── Environment Configs: handle both array and object ──────────────────
const envData = pipeline.environmentConfigs || {};
if (Array.isArray(envData)) {
  // Old array format (backward compatibility)
  const envObj = {};
  envData.forEach((env) => {
    const tag = env.tag || 'unknown';
    if (!envObj[tag]) {
      envObj[tag] = {
        label: env.label || tag,
        crRequired: env.crRequired || false,
        instances: [],
        provider: env.provider || '',
        config: env.config || {}
      };
    }
    envObj[tag].instances.push({
      name: env.name || `${tag}-env`,
      enabled: env.enabled !== false
    });
  });
  flat.environmentConfigs = envObj;
} else if (typeof envData === 'object' && envData !== null && !Array.isArray(envData)) {
  // New object format (Map) – use directly
  flat.environmentConfigs = envData;
} else {
  // Fallback to default
  flat.environmentConfigs = defaultPipeline().environmentConfigs;
}

  // Apigee (unchanged)
  if (pipeline.apigeeDetails) {
    const a = pipeline.apigeeDetails;
    flat.apigeeType = a.type || 'X';
    flat.apigeeServiceAccount = a.serviceAccountJson || '';
    if (a.type === 'EDGE') {
      if (a.ssoConfig && a.ssoConfig.enabled) {
        flat.apigeeSsoEnabled = true;
        flat.apigeeCompanyId = a.ssoConfig.companyIdentifier || '';
        flat.apigeeTokenUrl = a.ssoConfig.tokenUrl || '';
        flat.apigeeUsername = a.ssoConfig.username || '';
        flat.apigeePassword = a.ssoConfig.password || '';
      } else if (a.standardConfig) {
        flat.apigeeSsoEnabled = false;
        flat.apigeeOrgName = a.standardConfig.orgName || '';
        flat.apigeeTokenUrl = a.standardConfig.tokenUrl || '';
        flat.apigeeUsername = a.standardConfig.username || '';
        flat.apigeePassword = a.standardConfig.password || '';
      }
    }
  }

  if (pipeline.kongDetails) {
    const k = pipeline.kongDetails;
    flat.kongRegion = k.region || '';
    flat.kongControlPlaneId = k.controlPlaneId || '';
    flat.kongPat = k.pat || '';
  }

  return flat;
}

// ─── Environment-group cloud-config status ───────────────────────────────
// An instance inherits its parent group's provider unless it has its own
// override set — this is the single source of truth for "which cloud is
// this instance actually going to deploy to".
function getEffectiveInstanceProvider(tagConfig, instance) {
  return (instance && instance.provider) || (tagConfig && tagConfig.provider) || '';
}

// 'full'    = every enabled instance has an effective provider
// 'partial' = some but not all enabled instances have one
// 'none'    = no enabled instances, or none configured
function getEnvGroupStatus(tagConfig) {
  if (!tagConfig) return 'none';
  const enabledInstances = (tagConfig.instances || []).filter(i => i.enabled !== false);
  if (enabledInstances.length === 0) return 'none';
  const configuredCount = enabledInstances.filter(
    inst => getEffectiveInstanceProvider(tagConfig, inst)
  ).length;
  if (configuredCount === 0) return 'none';
  if (configuredCount === enabledInstances.length) return 'full';
  return 'partial';
}

const ENV_STATUS_META = {
  full:    { label: 'Configured',           dot: 'bg-green-400',  text: 'text-green-400',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  partial: { label: 'Partially configured', dot: 'bg-yellow-400', text: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  none:    { label: 'Not configured',       dot: 'bg-gray-500',   text: 'text-gray-500',   badge: 'bg-dark-700/60 text-gray-500 border-white/[0.05]' },
};

// ─── Initial strategy config (without environments) ─────────────────────
function initialStrategyConfig() {
  return {
    name: '',
    description: '',
    strategyType: 'RECOMMENDED',
    branches: [
      { description: 'Development Branch', tag: 'dev', name: 'feature-*', targetEnvironment: '' },
      { description: 'Merge-To Branch', tag: 'merge', name: 'release', targetEnvironment: '' },
      { description: 'Main', tag: 'main', name: 'main', targetEnvironment: '' },
      { description: 'Hotfix', tag: 'hotfix', name: 'hotfix', targetEnvironment: '' },
    ],
    mergeStrategy: 'SQUASH',
    versionScheme: 'BUILD_NUMBER',
    autoDeleteBranch: false,
    isDefault: false,
  };
}

function serialiseStrategyConfig(c) {
  return {
    name: c.name?.trim() || 'Untitled strategy',
    description: c.description?.trim() || '',
    strategyType: c.strategyType,
    branches: c.branches.map(b => ({
      description: b.description,
      tag: b.tag,
      name: b.name,
      targetEnvironment: b.targetEnvironment || '',
    })),
    mergeStrategy: c.mergeStrategy,
    versionScheme: c.versionScheme,
    autoDeleteBranch: !!c.autoDeleteBranch,
    isDefault: !!c.isDefault,
  };
}

function deserialiseStrategy(s) {
  if (!s) return initialStrategyConfig();
  return {
    name: s.name || '',
    description: s.description || '',
    strategyType: s.strategyType || 'RECOMMENDED',
    branches: (s.branches || []).map(b => ({
      description: b.description || b.tag || '',
      tag: b.tag || '',
      name: b.name || '',
      targetEnvironment: b.targetEnvironment || '',
    })),
    mergeStrategy: s.mergeStrategy || 'SQUASH',
    versionScheme: s.versionScheme || 'BUILD_NUMBER',
    autoDeleteBranch: !!s.autoDeleteBranch,
    isDefault: !!s.isDefault,
  };
}

// ─── Preview builder ──────────────────────────────────────────────────────
const buildVerticalPreview = (strategy, environmentConfigs) => {
  const steps = [];
  const branches = strategy.branches || [];

  const devBranch = branches.find(b => b.tag === 'dev');
  const mergeBranch = branches.find(b => b.tag === 'merge');
  const mainBranch = branches.find(b => b.tag === 'main');
  const hotfixBranch = branches.find(b => b.tag === 'hotfix');

  const mergeBranchName = mergeBranch?.name || 'release';
  const envs = environmentConfigs || {};

  const devEnv = envs['dev'];
  const devLabel = devEnv?.label || 'DEV';
  const devInstances = devEnv?.instances || [];

  const otherTags = Object.keys(envs).filter(k => k !== 'dev');
  const sortedOtherTags = otherTags.sort((a, b) => {
    if (a === 'prod') return 1;
    if (b === 'prod') return -1;
    return a.localeCompare(b);
  });

  // ─── 1. Dev Branch ────────────────────────────────────────────────
  if (devBranch) {
    steps.push({ type: 'branch', label: devBranch.name, tag: devBranch.tag, isDev: true });
    steps.push({ type: 'process', label: 'Initial Commit' });
    steps.push({ type: 'process', label: 'Build Artifact & Deploy' });
    steps.push({
      type: 'env',
      label: 'dev',
      displayLabel: devLabel,
      tag: 'dev',
      instances: devInstances,
      isDev: true,
    });
  }

  // ─── 2. Merge to release ──────────────────────────────────────────
  if (devBranch) {
    steps.push({ type: 'process', label: `Merge to ${mergeBranchName}` });
  }

  if (mergeBranch) {
    steps.push({ type: 'branch', label: mergeBranch.name, tag: mergeBranch.tag });
    steps.push({ type: 'process', label: 'Build & Upload to Artifactry' });
    steps.push({
      type: 'process',
      label: 'Use Deploy',
      isClickable: true,
      url: '/api-deploy',
    });
  }

  // ─── 3. Environment Fork (Use Deploy → All Envs) ──────────────────
  if (sortedOtherTags.length > 0) {
    const envNodes = sortedOtherTags.map(tag => {
      const tagObj = envs[tag];
      return {
        type: 'env',
        label: tag,
        displayLabel: tagObj?.label || tag,
        tag: tag,
        instances: tagObj?.instances || [],
        isProd: tag === 'prod',
        isCenter: tag === 'prod',
        isOther: true,
      };
    });
    // env-fork handles: fork arrow → envs row → prod arrow to next step
    steps.push({ type: 'env-fork', nodes: envNodes });
  }

  // ─── 4. Merge on Success ──────────────────────────────────────────
  if (sortedOtherTags.length > 0) {
    steps.push({ type: 'process', label: 'Merge on Success' });
  }

  // ─── 5. Main & Hotfix (side-by-side) ──────────────────────────────
  const splitNodes = [];
  if (mainBranch) {
    splitNodes.push({ type: 'branch', label: mainBranch.name, tag: mainBranch.tag });
  }
if (hotfixBranch) {
  splitNodes.push({
    type: 'branch',
    label: hotfixBranch.name,
    tag: hotfixBranch.tag,
    isHotfix: true, 
  });
}
  if (splitNodes.length > 0) {
    steps.push({ type: 'split', groups: splitNodes.map(node => [node]) });
  }

  // ─── 6. END ──────────────────────────────────────────────────────
  steps.push({ type: 'end', label: 'END' });

  return steps.filter(s => s);
};

// ─── Dynamic Fork (multiple arrows for env count) ──────────────────────
const DynamicFork = ({ count, prodIndex }) => {
  if (count <= 1) {
    return (
      <div className="flex flex-col items-center my-1">
        <div className="h-5 w-px bg-gradient-to-b from-slate-600/60 to-slate-500/60" />
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 -mt-1" />
      </div>
    );
  }

  const columnWidth = 128;
  const gap = 24;
  const totalWidth = count * columnWidth + (count - 1) * gap;

  return (
    <div className="flex flex-col items-center my-1" style={{ width: totalWidth }}>
      {/* ─── Horizontal dashed line ─── */}
      <div className="w-full border-t-2 border-dashed border-slate-600/60" />
      
      {/* ─── Arrows row ─── */}
      <div className="flex justify-between w-full mt-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col items-center" style={{ width: columnWidth }}>
            <div className="h-3 w-px bg-gradient-to-b from-slate-600/60 to-slate-500/60" />
            <ChevronDown className="h-3 w-3 text-slate-500 -mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Preview component ─────────────────────────────────────────────────────
const VerticalPreview = ({ config, environmentConfigs }) => {
  const [expandedHotfix, setExpandedHotfix] = useState(false);

  const steps = useMemo(
    () => buildVerticalPreview(config, environmentConfigs || {}),
    [config, environmentConfigs]
  );

  if (!steps || steps.length === 0) {
    return (
      <p className="text-xs italic text-slate-400 px-4 py-6">
        No preview available. Configure branches and environments to see the pipeline.
      </p>
    );
  }

  const nodeVisual = (type) => {
    switch (type) {
      case 'branch':
        return {
          wrap: 'bg-gradient-to-br from-orange-500/25 to-orange-600/10 border-2 border-orange-400/60 text-orange-100 rounded-xl px-5 py-2.5 shadow-lg shadow-orange-900/30',
          icon: <GitBranch className="h-4 w-4 text-orange-300" />,
          label: 'Branch',
          dot: 'bg-orange-400',
        };
      case 'env':
        return {
          wrap: 'bg-gradient-to-br from-sky-500/25 to-sky-600/10 border-2 border-sky-400/60 text-sky-100 rounded-lg px-5 py-2.5 shadow-lg shadow-sky-900/30',
          icon: <Globe className="h-4 w-4 text-sky-300" />,
          label: 'Environment',
          dot: 'bg-sky-400',
        };
      case 'process':
        return {
          wrap: 'text-slate-200 px-3 py-1 text-[13px] tracking-wide',
          icon: <Code2 className="h-3.5 w-3.5 text-slate-400" />,
          label: 'Process',
          dot: 'bg-slate-400',
        };
      case 'end':
        return {
          wrap: 'bg-emerald-500/20 border-2 border-emerald-400/60 text-emerald-100 rounded-full px-4 py-2 shadow-lg shadow-emerald-900/30',
          icon: <CheckCircle className="h-4 w-4 text-emerald-300" />,
          label: 'End',
          dot: 'bg-emerald-400',
        };
      default:
        return {
          wrap: 'text-slate-200 px-3 py-1 text-[13px] tracking-wide',
          icon: <Code2 className="h-3.5 w-3.5 text-slate-400" />,
          label: 'Process',
          dot: 'bg-slate-400',
        };
    }
  };

  const Tooltip = ({ node }) => {
    const v = nodeVisual(node.type);
    const instances = node.instances || [];
    const maxShow = 5;
    const showInstances = instances.slice(0, maxShow);
    const remaining = instances.length - maxShow;
    const displayLabel = node.displayLabel || node.label;

    return (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="relative bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px] backdrop-blur-md max-w-xs">
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-700" />
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('h-1.5 w-1.5 rounded-full', v.dot)} />
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              {v.label}
            </span>
          </div>
          <div className="text-sm text-white font-medium truncate max-w-[180px]">{displayLabel}</div>

          {node.type === 'env' && instances.length > 0 && (
            <div className="mt-1 text-xs text-gray-400">
              Instances:
              <ul className="list-disc list-inside text-gray-300">
                {showInstances.map((inst, i) => (
                  <li key={i}>{inst.name}</li>
                ))}
                {remaining > 0 && <li>+{remaining} more</li>}
              </ul>
            </div>
          )}

          {node.isProd && (
            <div className="text-[11px] text-yellow-400 mt-1">🔒 Production</div>
          )}
          {node.isDev && (
            <div className="text-[11px] text-green-400 mt-1">🟢 Development</div>
          )}
          {node.isClickable && (
            <div className="text-[11px] text-blue-400 mt-1">Click to navigate</div>
          )}
          {node.type === 'branch' && (
            <div className="text-[11px] text-slate-400 mt-1">Git branch</div>
          )}
          {node.type === 'process' && !node.isClickable && (
            <div className="text-[11px] text-slate-400 mt-1">Pipeline step</div>
          )}
        </div>
      </div>
    );
  };

  const handleNodeClick = (node) => {
    if (node.isClickable && node.url) {
      window.open(node.url, '_blank');
    }
    // Hotfix click is now handled by separate button, not here
  };

const renderLeaf = (node, key) => {
  const v = nodeVisual(node.type);
  const isClickable = node.isClickable;

    return (
      <div
        key={key}
        className={cn(
          'relative group inline-flex items-center gap-2',
          isClickable && 'cursor-pointer hover:underline'
        )}
        onClick={() => handleNodeClick(node)}
      >
        <div
          className={cn(
            'inline-flex items-center gap-2 font-medium transition-all duration-200',
            'hover:scale-[1.04] hover:brightness-110',
            v.wrap,
            isClickable && 'hover:text-blue-400'
          )}
        >
          {v.icon}
          <span>{node.label}</span>
        </div>
        <Tooltip node={node} />
      </div>
    );
  };

  const VLine = () => (
    <div className="flex flex-col items-center my-1.5" aria-hidden>
      <div className="h-6 w-px bg-gradient-to-b from-slate-600/70 to-slate-500/70" />
      <ChevronDown className="h-3.5 w-3.5 -mt-1.5 text-slate-500" />
    </div>
  );

  const Fork = () => (
    <div className="relative w-full flex justify-center my-1" aria-hidden>
      <div className="w-1/2 border-t-2 border-dashed border-slate-600/60" />
      <div className="absolute top-0 left-1/4 h-4 w-px bg-slate-600/60" />
      <div className="absolute top-0 right-1/4 h-4 w-px bg-slate-600/60" />
    </div>
  );

  // ─── Hotfix expanded flow nodes ───────────────────────────────────
  const hotfixFlowNodes = [
    { type: 'process', label: 'Hotfix Commit' },
    { type: 'process', label: 'Hotfix Build & Deploy' },
    { type: 'env', label: 'prod', displayLabel: 'Production (Hotfix)', tag: 'prod', isProd: true },
    { type: 'process', label: 'Merge back to main' },
  ];

  const renderHotfixFlow = () => {
    if (!expandedHotfix) return null;
    return (
      <div className="mt-2 flex flex-col items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
        {hotfixFlowNodes.map((node, idx) => (
          <div key={idx} className="flex flex-col items-center">
            {renderLeaf(node, `hotfix-flow-${idx}`)}
            {idx < hotfixFlowNodes.length - 1 && <VLine />}
          </div>
        ))}
      </div>
    );
  };

  const renderStep = (step, idx) => {
    const isLast = idx === steps.length - 1;

    // ─── split (Main & Hotfix side-by-side) ──────────────────────────
if (step.type === 'split') {
  return (
    <div key={idx} className="flex flex-col items-center w-full">
      <Fork />
      <div className="flex flex-row items-start justify-center gap-8 w-full max-w-2xl py-2">
        {step.groups.map((group, gi) => {
          const isHotfixGroup = group.some(n => n.isHotfix);
          return (
            <div key={gi} className="flex-1 flex flex-col items-center gap-3">
              {group.map((node, ni) => renderLeaf(node, ni))}
              {isHotfixGroup && (
                <>
                  <button
                    onClick={() => setExpandedHotfix(!expandedHotfix)}
                    className="mt-1 px-3 py-1 rounded-full border border-red-400/40 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                  >
                    {expandedHotfix ? (
                      <>
                        <ChevronDown className="h-3 w-3" /> Hide Hotfix Flow
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3" /> Show Hotfix Flow
                      </>
                    )}
                  </button>
                  {expandedHotfix && renderHotfixFlow()}
                </>
              )}
            </div>
          );
        })}
      </div>
      {!isLast && <VLine />}
    </div>
  );
}

if (step.type === 'env-fork') {
  const nodes = step.nodes || [];
  const prodIdx = nodes.findIndex(n => n.tag === 'prod');
  const n = nodes.length;
  const columnWidth = 128;
  const gap = 24;
  const totalWidth = n * columnWidth + (n - 1) * gap;

  // Build ordered nodes with PROD in center
  let orderedNodes = [...nodes];
  if (prodIdx !== -1) {
    const leftCount = Math.floor((n - 1) / 2);
    const otherNodes = nodes.filter(n => n.tag !== 'prod');
    const left = otherNodes.slice(0, leftCount);
    const right = otherNodes.slice(leftCount);
    orderedNodes = [
      ...left.map(n => ({ ...n, order: 0 })),
      { ...nodes[prodIdx], order: 1 },
      ...right.map(n => ({ ...n, order: 2 })),
    ];
  }

  return (
    <div key={idx} className="flex flex-col items-center w-full">
      <DynamicFork count={n} prodIndex={prodIdx !== -1 ? Math.floor((n - 1) / 2) : undefined} />
      {/* environment row with same width and gap */}
      <div className="flex justify-center w-full" style={{ width: totalWidth }}>
        <div className="flex gap-6">
          {orderedNodes.map((node, ni) => (
            <div key={ni} className="w-32 flex justify-center">
              {renderLeaf(node, ni)}
            </div>
          ))}
        </div>
      </div>
      {/* Arrow from PROD down to Merge on Success */}
      {/* {prodIdx !== -1 && (
        <div className="flex flex-col items-center my-0.5">
          <div className="h-4 w-px bg-gradient-to-b from-yellow-400/60 to-yellow-400/30" />
          <ChevronDown className="h-3 w-3 text-yellow-400" />
        </div>
      )} */}
      {!isLast && <VLine />}
    </div>
  );
}

    // ─── Default step ──────────────────────────────────────────────────
    return (
      <div key={idx} className="flex flex-col items-center w-full">
        <div className="my-1">{renderLeaf(step, idx)}</div>
        {!isLast && <VLine />}
      </div>
    );
  };

  return (
    <div
      className="max-h-[70vh] overflow-y-auto overflow-x-visible py-6 px-6
                  rounded-xl border border-slate-700/50
                  bg-gradient-to-b from-slate-900/60 to-slate-950/60 backdrop-blur-md"
    >
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
        {steps.map((step, idx) => renderStep(step, idx))}
      </div>
    </div>
  );
};

const EnvironmentPreview = ({ environmentConfigs }) => {
  const tagGroups = {};
  Object.entries(environmentConfigs).forEach(([tag, tagObj]) => {
    const instances = tagObj.instances || [];
    const total = instances.length;
    const enabled = instances.filter(inst => inst.enabled !== false).length;
    const disabled = total - enabled;
    tagGroups[tag] = {
      label: tagObj.label || tag,
      total,
      enabled,
      disabled,
      isFixed: tag === 'dev' || tag === 'prod'
    };
  });

  const devTags = tagGroups['dev'] ? { dev: tagGroups['dev'] } : {};
  const prodTags = tagGroups['prod'] ? { prod: tagGroups['prod'] } : {};
  const otherTags = {};
  Object.keys(tagGroups).forEach(tag => {
    if (tag !== 'dev' && tag !== 'prod') {
      otherTags[tag] = tagGroups[tag];
    }
  });

  const renderGroup = (group, groupLabel) => {
    const entries = Object.entries(group);
    if (entries.length === 0) return null;
    return (
      <div className="flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-3 my-2">
          {entries.map(([tag, info]) => (
            <div
              key={tag}
              className={cn(
                'px-4 py-2 rounded-full border font-medium text-sm',
                info.isFixed ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/[0.08] bg-dark-800/60 text-gray-300'
              )}
            >
              {info.label} <span className="text-xs text-gray-400">({info.total})</span>
              {info.disabled > 0 && (
                <span className="ml-1 text-xs text-red-400">[{info.disabled} disabled]</span>
              )}
            </div>
          ))}
        </div>
        {groupLabel && <span className="text-xs text-gray-500 mt-1">{groupLabel}</span>}
      </div>
    );
  };

  const hasDev = Object.keys(devTags).length > 0;
  const hasProd = Object.keys(prodTags).length > 0;
  const hasOther = Object.keys(otherTags).length > 0;

  if (!hasDev && !hasProd && !hasOther) {
    return <p className="text-xs text-gray-400 italic text-center py-4">No environments configured.</p>;
  }

  return (
    <div className="flex flex-col items-center py-4">
      {renderGroup(devTags, 'Development')}
      {hasDev && hasOther && <ChevronDown className="h-5 w-5 text-gray-500 my-1" />}
      {renderGroup(otherTags, 'Custom / Middle')}
      {hasOther && hasProd && <ChevronDown className="h-5 w-5 text-gray-500 my-1" />}
      {renderGroup(prodTags, 'Production')}
    </div>
  );
};

// ─── UI Helpers ────────────────────────────────────────────────────────────
function GlassCard({ children, className }) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.06] bg-dark-800/30 backdrop-blur-sm p-5', className)}>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-dark-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform', value && 'translate-x-5')} />
    </button>
  );
}

function InlineConfirmPopover({ isOpen, onConfirm, onCancel, anchorRef, message = 'Apply this strategy?' }) {
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  const popoverRef = useRef(null);

  useEffect(() => {
    if (isOpen && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      const popoverHeight = 120;
      const gap = 0;

      let left = rect.left + window.scrollX + rect.width / 2 - popoverWidth / 2;
      if (left < 10) left = 10;
      if (left + popoverWidth > window.innerWidth - 10)
        left = window.innerWidth - popoverWidth - 10;

      let top = rect.top + window.scrollY - popoverHeight - gap;

      if (top < 10 + window.scrollY) {
        top = rect.bottom + window.scrollY + gap;
        if (top + popoverHeight > window.innerHeight + window.scrollY - 10) {
          top = 10 + window.scrollY;
        }
      }

      setPosition({
        top: top + 'px',
        left: left + 'px',
        transform: 'none',
      });
    } else if (isOpen) {
      setPosition({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (popoverRef.current && popoverRef.current.contains(event.target)) {
        return;
      }
      if (anchorRef?.current && anchorRef.current.contains(event.target)) {
        return;
      }
      onCancel();
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel, anchorRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popoverRef} 
      className="fixed z-50 min-w-[200px] rounded-lg border border-dark-700 bg-dark-900/95 backdrop-blur-md p-4 shadow-2xl"
      style={position}
    >
      <p className="text-sm text-gray-300 mb-3">{message}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90"
        >
          Apply
        </button>
      </div>
    </div>,
    document.body
  );
}

function SelectedAppsPopover({ apps, isOpen, anchorRef }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, anchorRef]);

  if (!isOpen || apps.length === 0) return null;

  return createPortal(
    <div
      className="fixed z-50 min-w-[200px] max-w-xs rounded-lg border border-dark-700 bg-dark-900/95 backdrop-blur-md p-3 shadow-2xl"
      style={{ top: position.top, left: position.left }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Selected Applications</p>
      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {apps.map((app, idx) => (
          <li key={idx} className="text-sm text-white truncate">
            {app.onboarding?.applicationName || 'Unnamed'}
            <span className="text-xs text-gray-500 ml-1">({app.onboarding?.applicationId || '—'})</span>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CicdAutomationPage() {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  }, []);

  // Steps
  const [activeStep, setActiveStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedApps, setSelectedApps] = useState([]);

  // ── Deep-link pre-selection via ?appId= ──
  const [searchParams] = useSearchParams();
  const deepLinkAppliedRef = useRef(false);

  // Step 1 tabs
  const [step1Tab, setStep1Tab] = useState('applications'); // 'applications' or 'profiles'

// ── Step 2 Modal States ──
const [tagModalOpen, setTagModalOpen] = useState(false);
const [tagModalMode, setTagModalMode] = useState('add'); // 'add' | 'edit'
const [editingTagKey, setEditingTagKey] = useState(null);
const [newTagKey, setNewTagKey] = useState('');
const [newTagLabel, setNewTagLabel] = useState('');
const [modalError, setModalError] = useState('');
const [confirmDelete, setConfirmDelete] = useState({ tagKey: null, idx: null }); // inline confirm
const [editingInstance, setEditingInstance] = useState({ tagKey: null, idx: null });
const [instanceError, setInstanceError] = useState({ tagKey: null, idx: null, message: '' });
const [newTagCrRequired, setNewTagCrRequired] = useState(false);
const [confirmTagDelete, setConfirmTagDelete] = useState(null); // tag key to confirm deletion

  // Popovers
  const [showPopup, setShowPopup] = useState(false);
  const selectedLabelRef = useRef(null);
  const [showStep2Popup, setShowStep2Popup] = useState(false);
  const step2LabelRef = useRef(null);
  const [showSidebarPopup, setShowSidebarPopup] = useState(false);
  const sidebarLabelRef = useRef(null);

  const userEmail = (typeof window !== 'undefined' && localStorage.getItem('userEmail')) || '';
  const userRole = (typeof window !== 'undefined' && localStorage.getItem('userRole')) || 'USER';
  const isManager = ['MANAGER', 'ADMIN'].includes(String(userRole).toUpperCase());

  // ── Applications ──
  const [contexts, setContexts] = useState([]);
  const [contextsLoading, setContextsLoading] = useState(false);
  const [contextSearchTerm, setContextSearchTerm] = useState('');
  const [contextPage, setContextPage] = useState(0);
  const PAGE_SIZE = 12;
  const [totalContexts, setTotalContexts] = useState(0);

  const [appsConfigs, setAppsConfigs] = useState({});
  const [appsConfigsLoading, setAppsConfigsLoading] = useState({});
  const [appsStrategies, setAppsStrategies] = useState({});

  // ── Profile Mode ──
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileStrategies, setProfileStrategies] = useState([]);
  const [profileConfigs, setProfileConfigs] = useState({});
  const [activeProjectType, setActiveProjectType] = useState('APIGEE_PROXY');
  const [saving, setSaving] = useState(false);
  const [existingProfiles, setExistingProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  // for radio selection in profiles tab
  const [selectedProfileRadio, setSelectedProfileRadio] = useState(null);

  const handleProfileSelect = (id) => {
    setSelectedProfileRadio(prev => prev === id ? null : id);
  };

  const isProfileMode = selectedIds.length === 0;
  const hasSelection = selectedIds.length > 0;

  // ── Strategies ──
  const [allStrategies, setAllStrategies] = useState([]);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [strategyWizardStep, setStrategyWizardStep] = useState(0);
  const [showLivePreview, setShowLivePreview] = useState(false); // collapsed by default
  const [newStrategyConfig, setNewStrategyConfig] = useState(initialStrategyConfig());
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const [showNewStrategyForm, setShowNewStrategyForm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [pendingStrategyId, setPendingStrategyId] = useState(null);
  const applyConfirmButtonRef = useRef(null);

  const [cloneAddMode, setCloneAddMode] = useState('projects');
  const [cloneAddSearch, setCloneAddSearch] = useState('');
  const [cloneAddOpen, setCloneAddOpen] = useState(false);
  const [cloningStrategies, setCloningStrategies] = useState(false);
  const dropdownRef = useRef(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedStrategyForPreview, setSelectedStrategyForPreview] = useState(null);
  const [strategyDetailModalOpen, setStrategyDetailModalOpen] = useState(false);
  const [selectedStrategyForDetail, setSelectedStrategyForDetail] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetIndex, setConfirmTargetIndex] = useState(null);
  const confirmButtonRef = useRef(null);

  const [viewMode, setViewMode] = useState('grid');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailApp, setDetailApp] = useState(null);
  const [detailConfigs, setDetailConfigs] = useState({});
  const [detailConfigsLoading, setDetailConfigsLoading] = useState(false);
  const [detailStrategies, setDetailStrategies] = useState([]);
  const [detailStrategiesLoading, setDetailStrategiesLoading] = useState(false);

  const [showTokens, setShowTokens] = useState({});

  const toggleTokenVisibility = (key) => setShowTokens(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Fetch applications ──
  const fetchContexts = useCallback(async (page = 0, search = '') => {
    setContextsLoading(true);
    try {
      const apps = await getApplications({
        search,
        status: 'ACTIVE',
        page: 0,
        size: 500,
      });
      const mapped = (apps || []).map(toContextLikeApplication);
      setContexts(mapped);
      setTotalContexts(mapped.length);

      // Deep-link pre-selection via ?appId= — only applies once per param value.
      const deepLinkAppId = searchParams.get('appId');
      if (deepLinkAppId && !deepLinkAppliedRef.current) {
        const match = mapped.find((c) => String(c.onboarding?.id || c.id) === String(deepLinkAppId));
        if (match) {
          deepLinkAppliedRef.current = true;
          const matchId = match.onboarding?.id || match.id;
          setSelectedIds([matchId]);
          setSelectedApps([match]);
          setActiveStep(3);
        }
      }
    } catch (e) {
      showToast('Failed to load applications: ' + (e.message || 'Unknown error'), 'error');
      setContexts([]);
      setTotalContexts(0);
    } finally {
      setContextsLoading(false);
    }
  }, [showToast, searchParams]);

  useEffect(() => {
    fetchContexts(contextPage, contextSearchTerm);
  }, [contextPage, contextSearchTerm, fetchContexts]);

  // ── Fetch strategies ──
  const fetchStrategies = useCallback(async () => {
    setStrategiesLoading(true);
    try {
      const res = await cicdProfileService.listStrategies({ all: false });
      if (res.success) setAllStrategies(res.data || []);
    } catch (e) {
      showToast('Failed to load strategy templates', 'error');
    }
    setStrategiesLoading(false);
  }, [showToast]);
  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  // ── Fetch profiles ──
  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const res = await cicdProfileService.listProfiles(); 
      if (res.success) setExistingProfiles(res.data || []);
    } catch (e) {
      showToast('Failed to load profiles', 'error');
    }
    setLoadingProfiles(false);
  }, [showToast]);
  useEffect(() => { if (isProfileMode) fetchProfiles(); }, [isProfileMode, fetchProfiles]);

  // ── Load profile ──
  const loadProfile = useCallback(async (profileId) => {
    if (!profileId) return;
    try {
      const res = await cicdProfileService.getProfile(profileId);
      if (res.success && res.data) {
        const profile = res.data;
        setProfileName(profile.profileName || '');
        setProfileDescription(profile.description || '');
        const pc = profile.pipelineConfigs || {};
        const parsed = {};
        PROJECT_TYPES.forEach(pt => {
          const raw = pc[pt.id] || null;
          parsed[pt.id] = raw ? parseNestedPipeline(raw) : defaultPipeline();
        });
        setProfileConfigs(parsed);
        setProfileStrategies(profile.strategies || []);
        setSelectedProfileId(profileId);
        setSelectedProfileRadio(profileId);
        showToast('Profile loaded', 'success');
      }
    } catch (e) {
      showToast('Error loading profile', 'error');
    }
  }, [showToast]);

  // ── Delete profile ──
  const deleteProfile = useCallback(async (profileId) => {
    if (!profileId) return;
    if (!window.confirm('Delete this profile?')) return;
    try {
      const res = await cicdProfileService.deleteProfile(profileId);
      if (res.success) {
        showToast('Profile deleted', 'success');
        fetchProfiles();
        if (selectedProfileId === profileId) {
          setSelectedProfileId(null);
          setSelectedProfileRadio(null);
          setProfileName('');
          setProfileDescription('');
          setProfileConfigs({});
          setProfileStrategies([]);
        }
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }, [showToast, fetchProfiles, selectedProfileId]);

  // ── Fetch app configs ──
  const fetchAppConfigs = useCallback(async (microserviceId) => {
    if (!microserviceId) return;
    setAppsConfigsLoading(prev => ({ ...prev, [microserviceId]: true }));
    try {
      const res = await cicdProfileService.getAllConfigs(microserviceId, { filtered: false });
      if (res.success && res.data) {
        const { strategies = [], pipelineConfigs = {} } = res.data;
        setAppsConfigs(prev => {
          const current = prev[microserviceId] || {};
          const updated = { ...current };
          PROJECT_TYPES.forEach(pt => {
            const pipelineObj = pipelineConfigs[pt.id];
            if (pipelineObj) {
              updated[pt.id] = parseNestedPipeline(pipelineObj);
            }
          });
          return { ...prev, [microserviceId]: updated };
        });
        setAppsStrategies(prev => ({ ...prev, [microserviceId]: strategies }));
      } else {
        setAppsConfigs(prev => ({ ...prev, [microserviceId]: {} }));
        setAppsStrategies(prev => ({ ...prev, [microserviceId]: [] }));
      }
    } catch (e) {
      showToast('Failed to fetch configs', 'error');
    }
    setAppsConfigsLoading(prev => ({ ...prev, [microserviceId]: false }));
  }, [showToast]);

useEffect(() => {
  if (selectedIds.length > 0) {
    selectedIds.forEach(id => {
      const appConfig = appsConfigs[id];
      //  Fetch ONLY IF appConfig is undefined (never fetched before)
      // If it's {} (empty but fetched), or has data, don't fetch again
      if (appConfig === undefined) {
        fetchAppConfigs(id);
      }
    });
  }
}, [selectedIds, appsConfigs, fetchAppConfigs]);

  // ── Getters/Setters for pipeline ──
  const getCurrentPipeline = (microserviceId) => {
    const appConfigs = appsConfigs[microserviceId] || {};
    return appConfigs[activeProjectType] || defaultPipeline();
  };

  const updatePipelineForApp = (microserviceId, key, value) => {
    setAppsConfigs(prev => {
      const current = prev[microserviceId] || {};
      const typeConfig = current[activeProjectType] || defaultPipeline();
      const updated = { ...typeConfig, [key]: value };
      return { ...prev, [microserviceId]: { ...current, [activeProjectType]: updated } };
    });
  };

  // ── Save pipeline for app ──
  const savePipelineForApp = async (microserviceId, projectType) => {
    const flatPipeline = getCurrentPipelineForType(microserviceId, projectType);
    const nestedPipeline = buildNestedPipeline(flatPipeline);
    const app = selectedApps.find(a => (a.onboarding?.id || a.id) === microserviceId);
    const projectName = app?.onboarding?.applicationName || 'my-project';
    const payload = {
      projectName,
      projectType: projectType,
      microserviceId,
      pipeline: nestedPipeline,
    };
    try {
      const res = await cicdProfileService.upsertPipeline(microserviceId, projectType, payload);
      if (res.success) {
        const parsedFlat = parseNestedPipeline(res.data.pipeline);
        setAppsConfigs(prev => {
          const current = prev[microserviceId] || {};
          return { ...prev, [microserviceId]: { ...current, [projectType]: parsedFlat } };
        });
        return true;
      } else {
        showToast(`Failed to save pipeline for ${app?.onboarding?.applicationName}: ${res.error}`, 'error');
        return false;
      }
    } catch (e) {
      showToast(`Error saving pipeline: ${e.message}`, 'error');
      return false;
    }
  };

  const getCurrentPipelineForType = (microserviceId, projectType) => {
    const appConfigs = appsConfigs[microserviceId] || {};
    return appConfigs[projectType] || defaultPipeline();
  };

  // ── Save all pipelines ──
  const handleSavePipeline = async () => {
    if (!hasSelection) {
      showToast('No application selected', 'warning');
      return;
    }
    setSaving(true);
    const results = [];
    for (const appId of selectedIds) {
      for (const pt of PROJECT_TYPES) {
        const pipeline = getCurrentPipelineForType(appId, pt.id);
        const hasData = pipeline.scm || pipeline.runnerType || 
                         pipeline.environmentConfigs?.length > 0 ||
                         pipeline.securityTools.length > 0 ||
                         Object.values(pipeline).some(v => v && v !== '');
        if (hasData) {
          const result = await savePipelineForApp(appId, pt.id);
          results.push(result);
        }
      }
    }
    if (results.every(r => r === true)) {
      showToast('Pipeline config saved for all project types', 'success');
    } else {
      showToast('Some pipelines failed to save', 'error');
    }
    setSaving(false);
  };

const handleSaveProfile = async () => {
  if (!profileName.trim()) {
    showToast('Profile name is required', 'warning');
    return;
  }
  const pipelineConfigs = {};
  PROJECT_TYPES.forEach(pt => {
    const config = profileConfigs[pt.id];
    if (config) {
      const flat = config;
      const hasData = flat.scm || flat.runnerType || 
                       (flat.environmentConfigs && Object.keys(flat.environmentConfigs).length > 0) ||
                       Object.values(flat).some(v => v && v !== '');
      if (hasData) {
        pipelineConfigs[pt.id] = buildNestedPipeline(flat);
      }
    }
  });
  const payload = {
    profileName: profileName.trim(),
    description: profileDescription.trim(),
    pipelineConfigs,
    strategies: profileStrategies.map(s => ({
      strategyId: s.strategyId,
      strategyName: s.strategyName,
      isDefault: s.isDefault,
      appliedBy: s.appliedBy,
      appliedAt: s.appliedAt,
      notes: s.notes,
    })),
  };
  setSaving(true);
  try {
    let res;
    if (selectedProfileId) {
      res = await cicdProfileService.updateProfile(selectedProfileId, payload);
    } else {
      res = await cicdProfileService.createProfile(payload);
    }
    if (res.success) {
      // ✅ Update profileConfigs with saved data
      const savedProfile = res.data;
      const newProfileConfigs = {};
      PROJECT_TYPES.forEach(pt => {
        const raw = savedProfile.pipelineConfigs?.[pt.id] || null;
        newProfileConfigs[pt.id] = raw ? parseNestedPipeline(raw) : defaultPipeline();
      });
      setProfileConfigs(newProfileConfigs);

      // If new profile, set ID and radio selection
      if (!selectedProfileId) {
        setSelectedProfileId(savedProfile.id);
        setSelectedProfileRadio(savedProfile.id);
        // Keep profile name and description as they are
      }

      showToast(selectedProfileId ? 'Profile updated' : 'Profile saved', 'success');
      fetchProfiles();

      // Optional: clear form if you want to reset (but better to keep loaded)
      // if (!selectedProfileId) {
      //   setProfileName('');
      //   setProfileDescription('');
      //   setProfileConfigs({});
      //   setProfileStrategies([]);
      //   setSelectedProfileRadio(null);
      // }
    } else {
      showToast('Failed to save profile: ' + (res.error || 'Unknown error'), 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
  setSaving(false);
};

  // ── Strategy management ──
  const addStrategyToApplication = (strategyId, microserviceId) => {
    return new Promise((resolve, reject) => {
      const strategy = allStrategies.find(s => s.id === strategyId);
      if (!strategy) { showToast('Strategy not found', 'error'); reject(); return; }
      const currentStrategies = appsStrategies[microserviceId] || [];
      if (currentStrategies.some(s => s.strategyId === strategyId)) {
        showToast('Strategy already applied', 'warning');
        reject(); return;
      }
      cicdProfileService.applyStrategy(microserviceId, strategyId, '')
        .then(res => {
          if (res.success) {
            showToast('Strategy applied', 'success');
            fetchAppConfigs(microserviceId);
            resolve();
          } else {
            showToast('Failed: ' + res.error, 'error');
            reject();
          }
        }).catch(reject);
    });
  };

  const addStrategyToProfile = (strategyId) => {
    const strategy = allStrategies.find(s => s.id === strategyId);
    if (!strategy) { showToast('Strategy not found', 'error'); return; }
    if (profileStrategies.some(s => s.strategyId === strategyId)) {
      showToast('Already added', 'warning');
      return;
    }
    const newEntry = {
      strategyId: strategy.id,
      strategyName: strategy.name,
      isDefault: profileStrategies.length === 0,
      appliedAt: new Date().toISOString(),
      appliedBy: userEmail,
      notes: '',
    };
    setProfileStrategies([...profileStrategies, newEntry]);
    showToast('Strategy added to profile. Click "Update Profile" to save.', 'info');
  };

  const removeStrategyFromApplication = (microserviceId, index) => {
    const strategy = (appsStrategies[microserviceId] || [])[index];
    const strategyId = strategy?.id || strategy?.strategyId;
    if (!strategyId) return;
    setConfirmTargetIndex(index);
    setConfirmOpen(true);
    window._removeStrategyApp = microserviceId;
    window._removeStrategyId = strategyId;
  };

  const removeStrategyFromProfile = (index) => {
    setConfirmTargetIndex(index);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = () => {
    if (confirmTargetIndex !== null) {
      if (isProfileMode) {
        setProfileStrategies(profileStrategies.filter((_, i) => i !== confirmTargetIndex));
      } else {
        const microserviceId = window._removeStrategyApp;
        const strategyId = (appsStrategies[microserviceId] || [])[confirmTargetIndex]?.strategyId;
        if (strategyId) {
          cicdProfileService.removeStrategy(microserviceId, strategyId)
            .then(res => {
              if (res.success) { showToast('Strategy removed', 'success'); fetchAppConfigs(microserviceId); }
              else showToast('Failed: ' + res.error, 'error');
            });
        }
        const updated = (appsStrategies[microserviceId] || []).filter((_, i) => i !== confirmTargetIndex);
        setAppsStrategies(prev => ({ ...prev, [microserviceId]: updated }));
      }
    }
    setConfirmOpen(false);
    setConfirmTargetIndex(null);
    delete window._removeStrategyApp;
  };

  const handleCancelRemove = () => {
  setConfirmOpen(false);
  setConfirmTargetIndex(null);
  delete window._removeStrategyApp;
};

  const setDefaultStrategyForApp = (microserviceId, index) => {
    const strategy = (appsStrategies[microserviceId] || [])[index];
    const strategyId = strategy?.id || strategy?.strategyId;
    if (!strategyId) return;
    cicdProfileService.setDefaultStrategy(microserviceId, strategyId)
      .then(res => {
        if (res.success) { showToast('Default updated', 'success'); fetchAppConfigs(microserviceId); }
        else showToast('Failed: ' + res.error, 'error');
      });
  };

  const setDefaultStrategyForProfile = (index) => {
    const updated = profileStrategies.map((s, i) => ({ ...s, isDefault: i === index }));
    setProfileStrategies(updated);
  };

  const handleCloneStrategies = async (sourceContextId, targetMicroserviceId) => {
    if (!sourceContextId || !targetMicroserviceId || sourceContextId === targetMicroserviceId) {
      showToast('Invalid selection', 'warning');
      return;
    }
    setCloningStrategies(true);
    try {
      const sourceRes = await cicdProfileService.getAllConfigs(sourceContextId, { filtered: false });
      if (sourceRes.success && sourceRes.data.strategies) {
        for (const s of sourceRes.data.strategies) {
          await cicdProfileService.applyStrategy(targetMicroserviceId, s.strategyId, 'Cloned from ' + sourceContextId);
        }
        fetchAppConfigs(targetMicroserviceId);
        showToast('Strategies cloned!', 'success');
      } else {
        showToast('Failed to fetch source strategies', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setCloningStrategies(false);
  };

  const handleCreateStrategy = async () => {
    if (!newStrategyConfig.name.trim()) {
      showToast('Strategy name is required', 'warning');
      return;
    }
    const payload = serialiseStrategyConfig(newStrategyConfig);
    try {
      let res;
      if (editingStrategyId) {
        res = await cicdProfileService.updateStrategy(editingStrategyId, payload);
      } else {
        res = await cicdProfileService.createStrategy(payload);
      }
      if (res.success) {
        setShowNewStrategyForm(false);
        setNewStrategyConfig(initialStrategyConfig());
        setEditingStrategyId(null);
        setStrategyWizardStep(0);
        fetchStrategies();
        if (isProfileMode) {
          showToast('Strategy created. Save your profile.', 'success');
        } else if (selectedIds.length > 0) {
          setPendingStrategyId(res.data.id);
          setShowApplyConfirm(true);
        } else {
          showToast('Strategy created', 'success');
        }
      } else {
        showToast('Failed: ' + (res.error || 'Unknown'), 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleConfirmApplyStrategy = async () => {
    if (pendingStrategyId) {
      setSaving(true);
      try {
        await Promise.all(selectedIds.map(id => addStrategyToApplication(pendingStrategyId, id)));
        setShowApplyConfirm(false);
        setPendingStrategyId(null);
      } catch (e) {}
      setSaving(false);
    }
  };

  const handleCancelApplyStrategy = () => {
    setShowApplyConfirm(false);
    setPendingStrategyId(null);
  };

  // ─── openDetailModal (used in Step 1) ──
  const openDetailModal = useCallback(async (app) => {
    const onboardingId = app.onboarding?.id || app.id;
    setDetailApp(app);
    setDetailModalOpen(true);
    setDetailConfigsLoading(true);
    setDetailStrategiesLoading(true);
    try {
      const res = await cicdProfileService.getAllConfigs(onboardingId, { filtered: false });
      if (res.success && res.data) {
        const { strategies = [], pipelineConfigs = {} } = res.data;
        setDetailStrategies(strategies);
        const parsed = {};
        PROJECT_TYPES.forEach(pt => {
          const pipelineObj = pipelineConfigs[pt.id];
          if (pipelineObj) {
            parsed[pt.id] = parseNestedPipeline(pipelineObj);
          } else {
            parsed[pt.id] = null;
          }
        });
        setDetailConfigs(parsed);
      } else {
        setDetailStrategies([]);
        setDetailConfigs({});
      }
    } catch (e) {
      console.error('Detail modal error:', e);
      setDetailStrategies([]);
      setDetailConfigs({});
    }
    setDetailConfigsLoading(false);
    setDetailStrategiesLoading(false);
  }, []);

  // ─── renderStrategyDetailModal (used globally) ──
const renderStrategyDetailModal = () => {
  if (!strategyDetailModalOpen || !selectedStrategyForDetail) return null;
  const { strategy, appliedInfo } = selectedStrategyForDetail;
  const strategyData = strategy || {};

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg" onClick={() => setStrategyDetailModalOpen(false)}>
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-dark-800/80 backdrop-blur-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* ... close button ... */}
        <h3 className="text-xl font-bold text-white mb-1">{strategyData.name || strategyData.strategyName || 'Unnamed Strategy'}</h3>
        <p className="text-sm text-gray-400 mb-4">{strategyData.description || 'No description'}</p>
        <dl className="grid grid-cols-3 gap-2 mb-4 text-sm">
          {/* ... fields ... */}
        </dl>
        <div className="mb-4">
          <p className="text-xs font-medium text-primary mb-2">Flow Preview</p>
          {strategyData.branches ? (
            <VerticalPreview
              config={strategyData}
              environmentConfigs={isProfileMode ? (profileConfigs[activeProjectType]?.environmentConfigs || {}) : (selectedIds.length > 0 ? getCurrentPipeline(selectedIds[0]).environmentConfigs || {} : {})}
            />
          ) : (
            <p className="text-xs italic text-gray-400">Full strategy details not available. Please load the strategy from the template list.</p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStrategyDetailModalOpen(false)} className="border-dark-600 text-gray-300">Close</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

  // ─── Step 1: Application / Profiles tabs ──
  const renderStep1 = () => {
    const filtered = contexts.filter(c => {
      const name = c.onboarding?.applicationName || '';
      const id = c.onboarding?.applicationId || '';
      const search = contextSearchTerm.toLowerCase();
      return name.toLowerCase().includes(search) || id.toLowerCase().includes(search);
    });
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const safePage = Math.min(contextPage, totalPages - 1);
    const currentItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

    const toggleSelection = (ctx) => {
      const onboardingId = ctx.onboarding?.id || ctx.id;
      setSelectedIds(prev => prev.includes(onboardingId) ? prev.filter(id => id !== onboardingId) : [...prev, onboardingId]);
      setSelectedApps(prev => prev.some(a => (a.onboarding?.id || a.id) === onboardingId) ? prev.filter(a => (a.onboarding?.id || a.id) !== onboardingId) : [...prev, ctx]);
    };

    const handleNextStep = () => setActiveStep(2);

    const renderApplications = () => (
      <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search applications..."
              value={contextSearchTerm}
              onChange={(e) => setContextSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-12">
            <div
              className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer relative"
              ref={selectedLabelRef}
              onMouseEnter={() => selectedApps.length > 0 && setShowPopup(true)}
              onMouseLeave={() => setShowPopup(false)}
            >
              <span>Selected:</span>
              {selectedIds.length === 0 ? (
                <span className="text-gray-500">None (Profile Mode)</span>
              ) : (
                <span className="font-medium text-white">
                  {selectedIds.length} application{selectedIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex rounded-lg border border-dark-600 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('rounded-md px-2 py-1 text-xs font-medium transition-colors', viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white')}
              >Grid</button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('rounded-md px-2 py-1 text-xs font-medium transition-colors', viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white')}
              >List</button>
            </div>
          </div>
        </div>

        <SelectedAppsPopover apps={selectedApps} isOpen={showPopup} anchorRef={selectedLabelRef} />

        {contextsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-700 p-12 text-center text-gray-400">
            <FolderTree className="mx-auto mb-2 h-10 w-10 text-gray-600" />
            <p>No applications found.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {currentItems.map((ctx) => {
              const onboardingId = ctx.onboarding?.id || ctx.id;
              const isSelected = selectedIds.includes(onboardingId);
              const resourcesCount = ctx.resources?.length || 0;
              const owner = ctx.onboarding?.projectOwner || ctx.onboarding?.ownerEmail || '—';
              const strategies = appsStrategies[onboardingId] || [];
              const isLoading = appsConfigsLoading[onboardingId];
              let appliedStrategyDisplay = '—';
              if (isLoading) appliedStrategyDisplay = 'Loading...';
              else if (strategies.length > 0) {
                const first = strategies[0]?.name || 'Strategy';
                appliedStrategyDisplay = strategies.length > 1 ? `${first} +${strategies.length - 1} more` : first;
              }
              return (
                <div
                  key={onboardingId}
                  onClick={() => toggleSelection(ctx)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition-all hover:bg-white/[0.03]',
                    isSelected ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(255,91,31,0.1)]' : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(ctx)}
                      className="mt-1 h-4 w-4 rounded border-dark-600 bg-dark-800 text-primary focus:ring-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{ctx.onboarding?.applicationName || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 truncate">{ctx.onboarding?.applicationId || '—'}</p>
                    </div>
                    {isSelected && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-400">
                    <p className="truncate" title={`Owner: ${owner}`}>Owner: {owner}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Resources: {resourcesCount}</span>
                      <span>Strategy: {appliedStrategyDisplay}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetailModal(ctx);
                    }}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.05] bg-dark-800/20">
            <table className="w-full text-sm">
              <thead className="bg-dark-900/60 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={currentItems.length > 0 && currentItems.every(c => selectedIds.includes(c.onboarding?.id || c.id))}
                      onChange={() => {
                        const allIds = currentItems.map(c => c.onboarding?.id || c.id);
                        if (allIds.every(id => selectedIds.includes(id))) {
                          setSelectedIds([]);
                          setSelectedApps([]);
                        } else {
                          setSelectedIds(allIds);
                          setSelectedApps(currentItems);
                        }
                      }}
                      className="h-4 w-4 rounded border-dark-600 bg-dark-800 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Application Name</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Resources</th>
                  <th className="px-4 py-3 text-left">Applied Strategy</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {currentItems.map((ctx) => {
                  const onboardingId = ctx.onboarding?.id || ctx.id;
                  const isSelected = selectedIds.includes(onboardingId);
                  const resourcesCount = ctx.resources?.length || 0;
                  const owner = ctx.onboarding?.projectOwner || ctx.onboarding?.ownerEmail || '—';
                  const strategies = appsStrategies[onboardingId] || [];
                  const isLoading = appsConfigsLoading[onboardingId];
                  let appliedStrategyDisplay = '—';
                  if (isLoading) appliedStrategyDisplay = 'Loading...';
                  else if (strategies.length > 0) {
                    const first = strategies[0]?.name || 'Strategy';
                    appliedStrategyDisplay = strategies.length > 1 ? `${first} +${strategies.length - 1} more` : first;
                  }
                  return (
                    <tr
                      key={onboardingId}
                      className={cn('cursor-pointer transition-colors hover:bg-white/[0.03]', isSelected && 'bg-primary/5')}
                      onClick={() => toggleSelection(ctx)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(ctx)}
                          className="h-4 w-4 rounded border-dark-600 bg-dark-800 text-primary focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{ctx.onboarding?.applicationName || 'Unnamed'}</td>
                      <td className="px-4 py-3 text-gray-300">{ctx.onboarding?.applicationId || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{owner}</td>
                      <td className="px-4 py-3 text-gray-300">{resourcesCount}</td>
                      <td className="px-4 py-3 text-gray-300">{appliedStrategyDisplay}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openDetailModal(ctx); }}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.05]">
          <span className="text-xs text-gray-400">
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} - {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length} applications
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setContextPage(p => Math.max(0, p - 1))} disabled={safePage === 0 || filtered.length === 0} className="border-dark-600 text-gray-300 h-8 px-3">Prev</Button>
              <span className="text-xs text-gray-400 px-2">Page {safePage + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setContextPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1 || filtered.length === 0} className="border-dark-600 text-gray-300 h-8 px-3">Next</Button>
            </div>
            <Button
              onClick={handleNextStep}
              className="gap-2 bg-primary text-white hover:bg-primary/90"
            >
              {selectedIds.length === 0 ? 'Skip to Config →' : 'Next Step →'}
            </Button>
          </div>
        </div>

        {detailModalOpen && detailApp && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg" onClick={() => setDetailModalOpen(false)}>
            {/* Fixed w-5xl / h-[680px] shell — header stays put, only the middle
                section scrolls. */}
            <div
              className="relative flex h-[680px] max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-white/[0.08] bg-dark-800/80 backdrop-blur-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setDetailModalOpen(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>

              {/* Header — fixed */}
              <div className="shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.05]">
                <h3 className="text-xl font-bold text-white mb-1 pr-8">{detailApp.onboarding?.applicationName || 'Unnamed'}</h3>
                <p className="text-sm text-gray-400 mb-4">{detailApp.onboarding?.applicationId || '—'}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Business Unit:</span> <span className="text-white">{detailApp.onboarding?.businessUnit || '—'}</span></div>
                  <div><span className="text-gray-500">Project:</span> <span className="text-white">{detailApp.onboarding?.projectName || '—'}</span></div>
                  <div><span className="text-gray-500">Project Owner:</span> <span className="text-white">{detailApp.onboarding?.projectOwner || '—'}</span></div>
                  <div><span className="text-gray-500">Owner Email:</span> <span className="text-white">{detailApp.onboarding?.ownerEmail || '—'}</span></div>
                  <div><span className="text-gray-500">Resources:</span> <span className="text-white">{detailApp.resources?.length || 0}</span></div>
                  <div><span className="text-gray-500">Created At:</span> <span className="text-white">{detailApp.onboarding?.createdAt ? new Date(detailApp.onboarding.createdAt).toLocaleString() : '—'}</span></div>
                </div>
              </div>

              {/* Body — scrolls internally, header/footer stay put */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Applied Strategies</h4>
                {detailStrategiesLoading ? (
                  <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading strategies…</div>
                ) : detailStrategies.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No strategies applied.</p>
                ) : (
                  <div className="space-y-2 mb-6">
                    {detailStrategies.map((s, idx) => {
                      const strategyObj = allStrategies.find(t => t.id === s.id);
                      return (
                        <div key={idx} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-primary" />
                              <span className="font-medium text-white">{s.name}</span>
                              {s.isDefault && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">Default</span>}
                            </div>
                            <button
                              onClick={() => {
                                if (strategyObj) {
                                  setSelectedStrategyForDetail({ strategy: strategyObj, appliedInfo: s });
                                  setStrategyDetailModalOpen(true);
                                }
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Click for Preview →
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-400">
                            <span>Branches: {s.branches?.map(b => b.name).join(', ')}</span>
                            <span>Merge: {s.mergeStrategy}</span>
                            <span>Version: {s.versionScheme}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Pipeline Configurations</h4>
                {detailConfigsLoading ? (
                  <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading configs…</div>
                ) : (
                  <div className="space-y-3">
                    {PROJECT_TYPES.map(pt => {
                      const pipeline = detailConfigs[pt.id] || {};
                      const envEntries = Object.entries(pipeline.environmentConfigs || {});
                      const hasConfig = pipeline && (pipeline.scm || pipeline.runnerType || envEntries.length > 0);
                      return (
                        <div key={pt.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <pt.icon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-white">Pipeline Configuration</span>
                            {hasConfig ? <span className="ml-auto text-xs text-green-400">Configured</span> : <span className="ml-auto text-xs text-gray-500">Not configured</span>}
                          </div>
                          {hasConfig && (
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                              <div><span className="text-gray-500">SCM:</span> {pipeline.scm || '—'}</div>
                              <div><span className="text-gray-500">Runner:</span> {pipeline.runnerType || '—'}</div>
                              {pipeline.runnerTag && <div><span className="text-gray-500">Runner Tag:</span> {pipeline.runnerTag}</div>}
                              {pipeline.securityTools && pipeline.securityTools.length > 0 && (
                                <div className="col-span-2"><span className="text-gray-500">Security Tools:</span> {pipeline.securityTools.join(', ')}</div>
                              )}
                              {envEntries.length > 0 && (
                                <div className="col-span-2 space-y-1">
                                  <span className="text-gray-500">Environments &amp; cloud config:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {envEntries.map(([tag, tagConfig]) => {
                                      const status = getEnvGroupStatus(tagConfig);
                                      const meta = ENV_STATUS_META[status];
                                      return (
                                        <span
                                          key={tag}
                                          title={meta.label}
                                          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-white"
                                        >
                                          <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                                          {tagConfig.label || tag}
                                          <span className={cn('text-[10px]', meta.text)}>({meta.label})</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer — fixed */}
              <div className="shrink-0 flex justify-end border-t border-white/[0.05] px-6 py-4">
                <Button onClick={() => setDetailModalOpen(false)} className="bg-primary text-white hover:bg-primary/90">Close</Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );

    const renderProfiles = () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Saved Profiles</h3>
          <Button variant="outline" onClick={fetchProfiles} className="border-dark-600 text-gray-300">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
        {loadingProfiles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : existingProfiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-700 p-12 text-center text-gray-400">
            <FolderTree className="mx-auto mb-2 h-10 w-10 text-gray-600" />
            <p>No profiles found. Create a new profile by selecting "Profile Mode" (no apps).</p>
          </div>
        ) : (
          <div className="space-y-3">
            {existingProfiles.map(profile => {
              const isSelected = selectedProfileRadio === profile.id;
              return (
<div
  key={profile.id}
  onClick={() => handleProfileSelect(profile.id)}
  className={cn(
    'cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/40',
    isSelected ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(255,91,31,0.1)]' : 'border-white/[0.05] bg-dark-800/30'
  )}
>
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      <input
        type="radio"
        name="profileRadio"
        checked={isSelected}
        onChange={() => handleProfileSelect(profile.id)}
        className="h-4 w-4 rounded border-dark-600 text-primary focus:ring-primary"
      />
                      <div>
                        <h4 className="font-medium text-white">{profile.profileName}</h4>
                        <p className="text-xs text-gray-400 mt-1">{profile.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-2">Created: {new Date(profile.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  if (selectedProfileRadio) {
                    loadProfile(selectedProfileRadio);
                    setActiveStep(2);
                  } else {
                    showToast('Please select a profile first', 'warning');
                  }
                }}
                disabled={!selectedProfileRadio}
                className="gap-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Load into Wizard
              </Button>
            </div>
          </div>
        )}
        <div className="mt-4 text-xs text-gray-500">
          * Select a profile (radio button) and click "Load into Wizard" to populate all steps.
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex border-b border-white/[0.05]">
          <button
            onClick={() => setStep1Tab('applications')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              step1Tab === 'applications' ? 'border-primary text-white' : 'border-transparent text-gray-400 hover:text-white'
            )}
          >
            Applications
          </button>
          <button
            onClick={() => setStep1Tab('profiles')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              step1Tab === 'profiles' ? 'border-primary text-white' : 'border-transparent text-gray-400 hover:text-white'
            )}
          >
            Profiles
          </button>
        </div>

        {step1Tab === 'applications' ? renderApplications() : renderProfiles()}
      </div>
    );
  };

// ─── Step 2: Environment Configuration ──
const renderStep2 = () => {
  const currentPipeline = isProfileMode
    ? (profileConfigs[activeProjectType] || defaultPipeline())
    : (selectedIds.length > 0 ? getCurrentPipeline(selectedIds[0]) : defaultPipeline());

  const envConfigs = currentPipeline.environmentConfigs || {};

  // ── Helpers to update state ──
  const updateEnvConfigs = (newEnvConfigs) => {
    if (isProfileMode) {
      setProfileConfigs(prev => ({
        ...prev,
        [activeProjectType]: { ...prev[activeProjectType], environmentConfigs: newEnvConfigs }
      }));
    } else {
      selectedIds.forEach(id => {
        setAppsConfigs(prev => {
          const app = prev[id] || {};
          const typeConfig = app[activeProjectType] || defaultPipeline();
          return {
            ...prev,
            [id]: {
              ...app,
              [activeProjectType]: { ...typeConfig, environmentConfigs: newEnvConfigs }
            }
          };
        });
      });
    }
  };

  // ── Tag operations ──
  const addTag = (tagKey, label, crRequired = false) => {
    const newTag = {
      label: label || tagKey,
      crRequired,
      instances: [{ name: `${tagKey}-1`, enabled: true }],
      provider: '',
      config: {}
    };
    const updated = { ...envConfigs, [tagKey]: newTag };
    updateEnvConfigs(updated);
  };

  const removeTag = (tagKey) => {
    if (tagKey === 'dev' || tagKey === 'prod') {
      showToast('Cannot delete Dev or Prod groups', 'error');
      return;
    }
    const updated = { ...envConfigs };
    delete updated[tagKey];
    updateEnvConfigs(updated);
    setConfirmTagDelete(null);
  };

  const updateTagLabel = (tagKey, newLabel) => {
    if (tagKey === 'dev' || tagKey === 'prod') {
      showToast('Cannot change Dev/Prod group label', 'error');
      return;
    }
    const updated = { ...envConfigs };
    if (updated[tagKey]) {
      updated[tagKey].label = newLabel;
      updateEnvConfigs(updated);
    }
  };

  const updateTagKey = (oldKey, newKey) => {
    if (oldKey === 'dev' || oldKey === 'prod') {
      showToast('Cannot change Dev/Prod group key', 'error');
      return;
    }
    if (newKey === 'dev' || newKey === 'prod') {
      showToast('Group key cannot be dev or prod', 'error');
      return;
    }
    if (envConfigs[newKey]) {
      showToast('Group key already exists', 'error');
      return;
    }
    const updated = { ...envConfigs };
    updated[newKey] = { ...updated[oldKey] };
    delete updated[oldKey];
    updateEnvConfigs(updated);
  };

  const updateTagCrRequired = (tagKey, value) => {
    if (tagKey === 'dev' || tagKey === 'prod') {
      showToast('Cannot change CR required for Dev/Prod groups', 'error');
      return;
    }
    const updated = { ...envConfigs };
    if (updated[tagKey]) {
      updated[tagKey].crRequired = value;
      updateEnvConfigs(updated);
    }
  };

  // ── Instance operations with inline validation ──
  const addInstance = (tagKey) => {
    const tag = envConfigs[tagKey];
    if (!tag) return;

    let counter = tag.instances.length + 1;
    let newName = `${tagKey}-${counter}`;
    const existingNames = tag.instances.map(inst => inst.name);
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${tagKey}-${counter}`;
    }

    const newInst = {
      name: newName,
      enabled: true,
      provider: '',
      config: {}
    };
    const updated = { ...envConfigs };
    updated[tagKey].instances = [...updated[tagKey].instances, newInst];
    updateEnvConfigs(updated);
  };

  const removeInstance = (tagKey, idx) => {
    const tag = envConfigs[tagKey];
    if (!tag) return;
    const updated = { ...envConfigs };
    updated[tagKey].instances = updated[tagKey].instances.filter((_, i) => i !== idx);
    updateEnvConfigs(updated);
    setConfirmDelete({ tagKey: null, idx: null });
    // Clear any error for this instance
    if (instanceError.tagKey === tagKey && instanceError.idx === idx) {
      setInstanceError({ tagKey: null, idx: null, message: '' });
    }
  };

  const updateInstanceName = (tagKey, idx, newName) => {
    const tag = envConfigs[tagKey];
    if (!tag) return;

    // Check duplicate
    const isDuplicate = tag.instances.some(
      (inst, i) => i !== idx && inst.name === newName
    );
    if (isDuplicate) {
      setInstanceError({
        tagKey,
        idx,
        message: `"${newName}" already exists in this Environment`
      });
      return; // Do NOT update the name
    }

    // Clear error if any
    setInstanceError({ tagKey: null, idx: null, message: '' });

    // Update the name
    const updated = { ...envConfigs };
    updated[tagKey].instances[idx].name = newName;
    updateEnvConfigs(updated);
  };

  const updateInstanceEnabled = (tagKey, idx, value) => {
    const tag = envConfigs[tagKey];
    if (!tag) return;
    const updated = { ...envConfigs };
    updated[tagKey].instances[idx].enabled = value;
    updateEnvConfigs(updated);
  };

  // ── Modal handlers (includes CR toggle) ──
  const openAddModal = () => {
    setTagModalMode('add');
    setEditingTagKey(null);
    setNewTagKey('');
    setNewTagLabel('');
    setNewTagCrRequired(false);
    setModalError('');
    setTagModalOpen(true);
  };

  const openEditModal = (tagKey) => {
    const tag = envConfigs[tagKey];
    if (!tag) return;
    if (tagKey === 'dev' || tagKey === 'prod') {
      showToast('Cannot edit Dev or Prod groups', 'error');
      return;
    }
    setTagModalMode('edit');
    setEditingTagKey(tagKey);
    setNewTagKey(tagKey);
    setNewTagLabel(tag.label || '');
    setNewTagCrRequired(tag.crRequired || false);
    setModalError('');
    setTagModalOpen(true);
  };

const handleModalSave = () => {
  const key = newTagKey.trim();
  const label = newTagLabel.trim() || key;

  if (tagModalMode === 'add') {
    if (!key) {
      setModalError('Group key is required');
      return;
    }
    if (key === 'dev' || key === 'prod') {
      setModalError('Group key cannot be "dev" or "prod"');
      return;
    }
    if (envConfigs[key]) {
      setModalError('This environment group already exists. Please give another name.');
      return;
    }
    const labelExists = Object.values(envConfigs).some(t => t.label.toLowerCase() === label.toLowerCase());
    if (labelExists) {
      setModalError('Label already used by another environment group.');
      return;
    }
    addTag(key, label, newTagCrRequired);
    setTagModalOpen(false);
    setModalError('');
  } else {
    const oldKey = editingTagKey;
    if (!oldKey) return;
    if (oldKey === 'dev' || oldKey === 'prod') {
      showToast('Cannot edit Dev/Prod groups', 'error');
      return;
    }
    if (key !== oldKey) {
      if (key === 'dev' || key === 'prod') {
        setModalError('Group key cannot be "dev" or "prod"');
        return;
      }
      if (envConfigs[key]) {
        setModalError('This environment group already exists. Please give another name.');
        return;
      }
    }
    const labelExists = Object.entries(envConfigs).some(
      ([k, tag]) => k !== oldKey && tag.label.toLowerCase() === label.toLowerCase()
    );
    if (labelExists) {
      setModalError('Label already used by another environment group.');
      return;
    }
    // Update key/label if changed
    if (key !== oldKey) {
      updateTagKey(oldKey, key);
    }
    if (label !== envConfigs[oldKey]?.label) {
      updateTagLabel(oldKey, label);
    }
    // Update CR required if changed
    const currentCr = envConfigs[oldKey]?.crRequired || false;
    if (newTagCrRequired !== currentCr) {
      updateTagCrRequired(oldKey, newTagCrRequired);
    }
    setTagModalOpen(false);
    setModalError('');
  }
};

  // ── Render ──
  const tagKeys = Object.keys(envConfigs);
  const sortedTagKeys = tagKeys.sort((a, b) => {
    if (a === 'dev') return -1;
    if (b === 'dev') return 1;
    if (a === 'prod') return 1;
    if (b === 'prod') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Environment Configuration</h2>
        <Button onClick={() => setActiveStep(3)} className="gap-2 bg-primary text-white hover:bg-primary/90">
          Next Step →
        </Button>
      </div>

      {/* ─── Environment Groups ─── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Environment Groups</p>
        <Button variant="outline" size="sm" onClick={openAddModal} className="border-dark-600 text-gray-300 hover:border-primary/50 hover:text-white">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Environment Group
        </Button>
      </div>

      {(() => {
        // One group's header + divider + environments list — reused for the
        // Dev card, the Prod card, and each row inside the "other groups" card.
        const renderGroupContent = (tagKey) => {
          const tag = envConfigs[tagKey];
          if (!tag) return null;
          const isFixed = tagKey === 'dev' || tagKey === 'prod';
          const instances = tag.instances || [];
          const crRequired = tag.crRequired ?? false;
          const isConfirmingDelete = confirmTagDelete === tagKey;

          return (
            <>
              {/* Group header: name on top, label + count + CR-status on one line right below it, actions at the far end */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-white font-mono truncate">{tagKey}</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 truncate">{tag.label || tagKey}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-500 shrink-0">{instances.length} env{instances.length !== 1 ? 's' : ''}</span>
                    {crRequired && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="flex items-center gap-1 text-yellow-400 shrink-0"><Lock className="h-3 w-3" /> CR Required</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isFixed && (
                    isConfirmingDelete ? (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <span>Remove?</span>
                        <button onClick={() => removeTag(tagKey)} className="hover:text-red-300 font-medium">Yes</button>
                        <button onClick={() => setConfirmTagDelete(null)} className="text-gray-400 hover:text-white font-medium">No</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setConfirmTagDelete(tagKey)} className="text-red-400 hover:text-red-300" title="Delete group">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEditModal(tagKey)} className="text-gray-400 hover:text-white" title="Edit group">
                          <Edit className="h-4 w-4" />
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="my-3 border-t border-white/[0.06]" />

              {/* Environments within this group */}
              <div className="flex flex-wrap gap-2">
                {instances.map((inst, idx) => {
                  const isConfirming = confirmDelete.tagKey === tagKey && confirmDelete.idx === idx;
                  const isEditing = editingInstance.tagKey === tagKey && editingInstance.idx === idx;
                  const hasError = instanceError.tagKey === tagKey && instanceError.idx === idx;

                  return (
                    <div key={idx} className="flex flex-col items-start">
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all',
                          inst.enabled !== false
                            ? 'border-white/[0.08] bg-white/[0.02] text-gray-300'
                            : 'border-gray-700/50 bg-white/[0.01] text-gray-500 line-through',
                          hasError && 'border-red-500/70 bg-red-500/10'
                        )}
                      >
                        {isConfirming ? (
                          <>
                            <span className="text-xs text-red-400">Remove?</span>
                            <button onClick={() => removeInstance(tagKey, idx)} className="text-xs text-red-400 hover:text-red-300 font-medium">Yes</button>
                            <button onClick={() => setConfirmDelete({ tagKey: null, idx: null })} className="text-xs text-gray-400 hover:text-white font-medium">No</button>
                          </>
                        ) : (
                          <>
                            <input
                              type="checkbox"
                              checked={inst.enabled !== false}
                              onChange={(e) => updateInstanceEnabled(tagKey, idx, e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-dark-600 text-primary focus:ring-primary"
                            />
                            {isEditing ? (
                              <input
                                type="text"
                                value={inst.name || ''}
                                autoFocus
                                onBlur={() => {
                                  if (!hasError) {
                                    setEditingInstance({ tagKey: null, idx: null });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (!hasError) {
                                      setEditingInstance({ tagKey: null, idx: null });
                                    }
                                  }
                                }}
                                onChange={(e) => {
                                  if (hasError) {
                                    setInstanceError({ tagKey: null, idx: null, message: '' });
                                  }
                                  updateInstanceName(tagKey, idx, e.target.value);
                                }}
                                className="bg-transparent text-sm text-white border-b border-primary/50 focus:outline-none min-w-[60px]"
                              />
                            ) : (
                              <span
                                onClick={() => setEditingInstance({ tagKey, idx })}
                                className="text-sm cursor-text hover:text-primary transition-colors"
                              >
                                {inst.name || 'unnamed'}
                              </span>
                            )}
                            <button
                              onClick={() => setConfirmDelete({ tagKey, idx })}
                              className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      {hasError && (
                        <div className="mt-0.5 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {instanceError.message}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => addInstance(tagKey)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 text-sm transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </>
          );
        };

        const customTagKeys = sortedTagKeys.filter(k => k !== 'dev' && k !== 'prod');

        return (
          <>
            {/* Dev — its own card */}
            {envConfigs.dev && (
              <GlassCard>{renderGroupContent('dev')}</GlassCard>
            )}

            {/* Every other (custom) group shares one card, in between Dev and Prod */}
            {customTagKeys.length > 0 && (
              <GlassCard>
                <div className="space-y-8">
                  {customTagKeys.map(tagKey => (
                    <div key={tagKey} className="pb-8 border-b border-white/[0.05] last:border-0 last:pb-0">
                      {renderGroupContent(tagKey)}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Prod — its own card */}
            {envConfigs.prod && (
              <GlassCard>{renderGroupContent('prod')}</GlassCard>
            )}
          </>
        );
      })()}

      {/* ─── Preview ─── */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-3">Environment Flow Preview</p>
        <EnvironmentPreview environmentConfigs={envConfigs} />
      </GlassCard>

      {/* ─── Add/Edit Modal with CR Required Toggle ─── */}
      {tagModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg" onClick={() => setTagModalOpen(false)}>
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-dark-800/80 backdrop-blur-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTagModalOpen(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            <h3 className="text-lg font-bold text-white mb-4">{tagModalMode === 'add' ? 'Add Environment Group' : 'Edit Environment Group'}</h3>
            {modalError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {modalError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Group Key (identifier) *</label>
                <input
                  type="text"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  placeholder="e.g., staging, perf-test"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  // disabled={tagModalMode === 'edit'}
                />
                <p className="mt-1 text-[10px] text-gray-500">Unique identifier. Cannot be 'dev' or 'prod'.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Display Label</label>
                <input
                  type="text"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder="e.g., Staging Environment"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="text-sm font-medium text-gray-300">CR Required</span>
                <Toggle
                  value={newTagCrRequired}
                  onChange={(v) => setNewTagCrRequired(v)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.05]">
              <Button variant="outline" onClick={() => setTagModalOpen(false)} className="border-dark-600 text-gray-300">Cancel</Button>
              <Button onClick={handleModalSave} className="bg-primary text-white hover:bg-primary/90">{tagModalMode === 'add' ? 'Add Group' : 'Update'}</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Step 3: Pipeline Config with tabs and compact cloud modal ──
const renderStep3 = () => {
  const currentPipeline = isProfileMode
    ? (profileConfigs[activeProjectType] || defaultPipeline())
    : (selectedIds.length > 0 ? getCurrentPipeline(selectedIds[0]) : defaultPipeline());

  // ── "Apply to all" — copies a set of flat pipeline fields from the
  //    currently-active project type to the other project types (no-op here
  //    since this deployment only ever has a single Apigee X project type).
  const applyFieldsToOtherTypes = (fields, { label } = {}) => {
    const source = isProfileMode
      ? (profileConfigs[activeProjectType] || defaultPipeline())
      : (selectedIds.length > 0 ? getCurrentPipeline(selectedIds[0]) : defaultPipeline());
    const otherTypes = PROJECT_TYPES.map(pt => pt.id).filter(id => id !== activeProjectType);
    const patchFor = (typeId) => {
      const patch = {};
      fields.forEach(f => { patch[f] = source[f]; });
      // Security tools: drop Apigee-only tools (ApigeeLint/JSLint) when the
      // target tab isn't Apigee X — they don't apply there.
      if (fields.includes('securityTools')) {
        patch.securityTools = (source.securityTools || []).filter(toolId => {
          const tool = ALL_SECURITY_TOOLS.find(t => t.id === toolId);
          return tool && (!tool.apigeeOnly || typeId === 'APIGEE_PROXY');
        });
      }
      return patch;
    };

    if (otherTypes.length === 0) return;

    if (isProfileMode) {
      setProfileConfigs(prev => {
        const updated = { ...prev };
        otherTypes.forEach(typeId => {
          updated[typeId] = { ...(prev[typeId] || defaultPipeline()), ...patchFor(typeId) };
        });
        return updated;
      });
    } else {
      if (!hasSelection) {
        showToast('No application selected', 'warning');
        return;
      }
      selectedIds.forEach(id => {
        setAppsConfigs(prev => {
          const app = prev[id] || {};
          const updatedApp = { ...app };
          otherTypes.forEach(typeId => {
            updatedApp[typeId] = { ...(app[typeId] || defaultPipeline()), ...patchFor(typeId) };
          });
          return { ...prev, [id]: updatedApp };
        });
      });
    }
    const otherLabels = otherTypes.map(id => PROJECT_TYPES.find(pt => pt.id === id)?.label).join(' and ');
    showToast(`${label || 'Settings'} applied to ${otherLabels}`, 'success');
  };

  // ── SCM conditional fields (unchanged) ──
  const renderSCMConditionalFields = () => {
    const scm = currentPipeline.scm || '';
    if (!scm) return null;
    return (
      <div className="mt-4 space-y-3 border-t border-white/[0.05] pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-400">
              {scm === 'github' ? 'Personal Access Token (PAT)' :
               scm === 'gitlab' ? 'GitLab Token' :
               'Bitbucket Token'}
            </label>
            <div className="relative">
              <input
                type="password"
                value={currentPipeline.scmToken || ''}
                onChange={(e) => {
                  if (isProfileMode) {
                    setProfileConfigs(prev => ({
                      ...prev,
                      [activeProjectType]: { ...prev[activeProjectType], scmToken: e.target.value }
                    }));
                  } else {
                    selectedIds.forEach(id => updatePipelineForApp(id, 'scmToken', e.target.value));
                  }
                }}
                placeholder={`Enter ${scm} token`}
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-10 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => toggleTokenVisibility('scmToken')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showTokens['scmToken'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400">
              {scm === 'github' ? 'Organization / Username' :
               scm === 'gitlab' ? 'Group / Username' :
               'Workspace / Username'}
            </label>
            <input
              type="text"
              value={currentPipeline.scmOrgUser || ''}
              onChange={(e) => {
                if (isProfileMode) {
                  setProfileConfigs(prev => ({
                    ...prev,
                    [activeProjectType]: { ...prev[activeProjectType], scmOrgUser: e.target.value }
                  }));
                } else {
                  selectedIds.forEach(id => updatePipelineForApp(id, 'scmOrgUser', e.target.value));
                }
              }}
              placeholder={`Enter ${scm} organization/group/workspace`}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Repository Visibility</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="radio"
                name="scmVisibility"
                value="PUBLIC"
                checked={currentPipeline.scmVisibility === 'PUBLIC'}
                onChange={() => {
                  if (isProfileMode) {
                    setProfileConfigs(prev => ({
                      ...prev,
                      [activeProjectType]: { ...prev[activeProjectType], scmVisibility: 'PUBLIC' }
                    }));
                  } else {
                    selectedIds.forEach(id => updatePipelineForApp(id, 'scmVisibility', 'PUBLIC'));
                  }
                }}
                className="h-4 w-4 border-dark-600 text-primary focus:ring-primary"
              />
              Public
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="radio"
                name="scmVisibility"
                value="PRIVATE"
                checked={currentPipeline.scmVisibility === 'PRIVATE'}
                onChange={() => {
                  if (isProfileMode) {
                    setProfileConfigs(prev => ({
                      ...prev,
                      [activeProjectType]: { ...prev[activeProjectType], scmVisibility: 'PRIVATE' }
                    }));
                  } else {
                    selectedIds.forEach(id => updatePipelineForApp(id, 'scmVisibility', 'PRIVATE'));
                  }
                }}
                className="h-4 w-4 border-dark-600 text-primary focus:ring-primary"
              />
              Private
            </label>
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Pipeline Configuration</h2>
        <Button
          onClick={() => setActiveStep(4)}
          className="gap-2 bg-primary text-white hover:bg-primary/90"
        >
          Next Step →
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* SCM */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Code Management Tool</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFieldsToOtherTypes(['scm', 'scmToken', 'scmOrgUser', 'scmVisibility'], { label: 'SCM settings' })}
              className="text-xs text-primary hover:text-primary/80"
            >
              Apply to all
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SCM_OPTIONS.map((scm) => {
              const isSelected = (currentPipeline.scm || '') === scm.value;
              return (
                <button
                  key={scm.value}
                  onClick={() => {
                    const val = scm.value;
                    if (isProfileMode) {
                      setProfileConfigs(prev => ({
                        ...prev,
                        [activeProjectType]: { ...prev[activeProjectType], scm: val }
                      }));
                    } else {
                      selectedIds.forEach(id => updatePipelineForApp(id, 'scm', val));
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all relative',
                    isSelected ? 'border-primary bg-primary/[0.08] shadow-[0_0_16px_rgba(255,91,31,0.12)]' : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09]'
                  )}
                >
                  {isSelected && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-white">✓</span>}
                  <img src={scm.logo} alt={scm.label} className="h-8 w-8 object-contain" style={scm.invert ? { filter: 'invert(1)' } : undefined} />
                  <span className={cn('text-xs font-semibold', isSelected ? 'text-white' : 'text-gray-400')}>{scm.label}</span>
                </button>
              );
            })}
          </div>
          {renderSCMConditionalFields()}
        </GlassCard>

        {/* Runner */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Runner Type</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFieldsToOtherTypes(['runnerType', 'runnerTag', 'gcpSa', 'oidc'], { label: 'Runner settings' })}
              className="text-xs text-primary hover:text-primary/80"
            >
              Apply to all
            </Button>
          </div>
          <select
            value={currentPipeline.runnerType || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (isProfileMode) {
                setProfileConfigs(prev => ({
                  ...prev,
                  [activeProjectType]: {
                    ...prev[activeProjectType],
                    runnerType: val,
                    runnerTag: '',
                    gcpSa: '',
                    oidc: ''
                  }
                }));
              } else {
                selectedIds.forEach(id => {
                  updatePipelineForApp(id, 'runnerType', val);
                  updatePipelineForApp(id, 'runnerTag', '');
                  updatePipelineForApp(id, 'gcpSa', '');
                  updatePipelineForApp(id, 'oidc', '');
                });
              }
            }}
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="" className="bg-dark-900 text-white">Select Runner</option>
            <option value="probestack" className="bg-dark-900 text-white">Probestack Self-hosted</option>
            <option value="client-self" className="bg-dark-900 text-white">Client Self-hosted</option>
            <option value="custom" className="bg-dark-900 text-white">Custom Runner</option>
          </select>
          {currentPipeline.runnerType && (
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Runner Tag</label>
              <input
                type="text"
                value={currentPipeline.runnerTag || ''}
                onChange={(e) => {
                  if (isProfileMode) {
                    setProfileConfigs(prev => ({
                      ...prev,
                      [activeProjectType]: { ...prev[activeProjectType], runnerTag: e.target.value }
                    }));
                  } else {
                    selectedIds.forEach(id => updatePipelineForApp(id, 'runnerTag', e.target.value));
                  }
                }}
                placeholder="e.g. prod-runner-01"
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          )}
          {currentPipeline.runnerType === 'client-self' && (
            <div className="mt-4 space-y-4 border-t border-white/[0.05] pt-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-400">GCP Service Account Details</label>
                <textarea
                  value={currentPipeline.gcpSa || ''}
                  onChange={(e) => {
                    if (isProfileMode) {
                      setProfileConfigs(prev => ({
                        ...prev,
                        [activeProjectType]: { ...prev[activeProjectType], gcpSa: e.target.value }
                      }));
                    } else {
                      selectedIds.forEach(id => updatePipelineForApp(id, 'gcpSa', e.target.value));
                    }
                  }}
                  placeholder="Paste Service Account JSON..."
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white resize-none focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-400">OIDC Details</label>
                <input
                  type="text"
                  value={currentPipeline.oidc || ''}
                  onChange={(e) => {
                    if (isProfileMode) {
                      setProfileConfigs(prev => ({
                        ...prev,
                        [activeProjectType]: { ...prev[activeProjectType], oidc: e.target.value }
                      }));
                    } else {
                      selectedIds.forEach(id => updatePipelineForApp(id, 'oidc', e.target.value));
                    }
                  }}
                  placeholder="OIDC Provider URL / Audience"
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          )}
        </GlassCard>

        {activeProjectType === 'APIGEE_PROXY' && (
          <GlassCard>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-gray-400">
                Apigee X runs on Google's fully-managed serverless runtime — no separate cloud provider setup is
                needed here. Use the <span className="font-medium text-gray-300">API Gateway Configuration</span> section
                below to provide its GCP service-account credentials.
              </p>
            </div>
          </GlassCard>
        )}

        {/* Security Tools */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Security Tools</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyFieldsToOtherTypes(
                ['securityTools', 'snykToken', 'sonarToken', 'aquaToken', 'fortifyToken'],
                { label: 'Security tool settings' }
              )}
              className="text-xs text-primary hover:text-primary/80"
            >
              Apply to all
            </Button>
          </div>
          {activeProjectType === 'APIGEE_PROXY' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-3 py-2">
              <Code2 className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-300/80"><span className="font-semibold text-yellow-300">ApigeeLint</span> and <span className="font-semibold text-yellow-300">JSLint</span> are only available for Apigee X.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {ALL_SECURITY_TOOLS.filter(t => !t.apigeeOnly || activeProjectType === 'APIGEE_PROXY').map((tool) => {
              const Icon = tool.icon;
              const isSelected = (currentPipeline.securityTools || []).includes(tool.id);
              const toggle = () => {
                const current = currentPipeline.securityTools || [];
                const updated = current.includes(tool.id) ? current.filter(t => t !== tool.id) : [...current, tool.id];
                if (isProfileMode) {
                  setProfileConfigs(prev => ({
                    ...prev,
                    [activeProjectType]: { ...prev[activeProjectType], securityTools: updated }
                  }));
                } else {
                  selectedIds.forEach(id => updatePipelineForApp(id, 'securityTools', updated));
                }
              };
              return (
                <button
                  key={tool.id}
                  onClick={toggle}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                    isSelected ? 'border-primary/40 bg-primary/[0.07] shadow-[0_0_12px_rgba(255,91,31,0.08)]' : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09]'
                  )}
                >
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', isSelected ? 'bg-primary/15' : tool.bg)}>
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : tool.color)} />
                  </div>
                  <span className={cn('text-sm font-medium flex-1 min-w-0', isSelected ? 'text-white' : 'text-gray-300')}>{tool.label}</span>
                  {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          {ALL_SECURITY_TOOLS.some(t => t.hasToken && (currentPipeline.securityTools || []).includes(t.id)) && (
            <div className="mt-5 space-y-3 border-t border-white/[0.05] pt-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500"><Key className="h-3 w-3" /> API Tokens</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ALL_SECURITY_TOOLS.filter(t => t.hasToken && (currentPipeline.securityTools || []).includes(t.id)).map((tool) => {
                  const tokenKey = tool.tokenKey;
                  const isVisible = showTokens[tokenKey] || false;
                  const value = currentPipeline[tokenKey] || '';
                  const handleChange = (newVal) => {
                    if (isProfileMode) {
                      setProfileConfigs(prev => ({
                        ...prev,
                        [activeProjectType]: { ...prev[activeProjectType], [tokenKey]: newVal }
                      }));
                    } else {
                      selectedIds.forEach(id => updatePipelineForApp(id, tokenKey, newVal));
                    }
                  };
                  return (
                    <div key={tool.id} className="space-y-1.5 relative">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <tool.icon className={cn('h-3 w-3', tool.color)} />
                        {tool.tokenLabel}
                      </label>
                      <div className="relative">
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={value}
                          onChange={(e) => handleChange(e.target.value)}
                          placeholder={tool.tokenPlaceholder}
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-10 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() => toggleTokenVisibility(tokenKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Apigee */}
        {activeProjectType === 'APIGEE_PROXY' && (
          <GlassCard>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-3">API Gateway Configuration</p>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Service Account JSON</label>
              <textarea
                value={currentPipeline.apigeeServiceAccount || ''}
                onChange={(e) => {
                  if (isProfileMode) {
                    setProfileConfigs(prev => ({
                      ...prev,
                      [activeProjectType]: { ...prev[activeProjectType], apigeeServiceAccount: e.target.value }
                    }));
                  } else {
                    selectedIds.forEach(id => updatePipelineForApp(id, 'apigeeServiceAccount', e.target.value));
                  }
                }}
                placeholder="Paste Service Account JSON..."
                rows={5}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white resize-none focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  const payload = {
                    type: currentPipeline.apigeeType,
                    serviceAccountJson: currentPipeline.apigeeServiceAccount || '',
                  };
                  const res = await cicdProfileService.testApigeeConnection(payload);
                  if (res.success && res.data?.valid) {
                    showToast('✅ Connection valid!', 'success');
                  } else {
                    showToast('❌ Connection failed. Check your credentials.', 'error');
                  }
                }}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                Verify Connection
              </Button>
            </div>
          </GlassCard>
        )}

      </div>
    </div>
  );
};

// ─── Step 4: Strategies ──
const renderStep4 = () => {
  const strategies = isProfileMode ? profileStrategies : (selectedIds.length > 0 ? (appsStrategies[selectedIds[0]] || []) : []);
  const isProfile = isProfileMode;

  // ── Get environment configs for preview ──
  let envConfigsForPreview = {};
  if (isProfileMode) {
    // Profile mode: use profileConfigs if available, else fallback to defaultPipeline
    envConfigsForPreview = profileConfigs[activeProjectType]?.environmentConfigs || defaultPipeline().environmentConfigs;
  } else if (selectedIds.length > 0) {
    // App mode: use selected app's config, fallback to defaultPipeline
    envConfigsForPreview = getCurrentPipeline(selectedIds[0])?.environmentConfigs || defaultPipeline().environmentConfigs;
  } else {
    // No selection: fallback to defaultPipeline
    envConfigsForPreview = defaultPipeline().environmentConfigs;
  }

  const getDropdownItems = () => {
    if (cloneAddMode === 'projects') {
      const otherContexts = contexts.filter(c => {
        const cId = c.onboarding?.id || c.id;
        return cId !== selectedIds[0];
      });
      return otherContexts
        .filter(c => {
          const name = c.onboarding?.applicationName || '';
          const id = c.onboarding?.applicationId || '';
          const search = cloneAddSearch.toLowerCase();
          return name.toLowerCase().includes(search) || id.toLowerCase().includes(search);
        })
        .map(c => ({
          label: c.onboarding?.applicationName || 'Unnamed',
          sublabel: c.onboarding?.applicationId || '—',
          value: c.onboarding?.id || c.id,
          type: 'project',
          contextId: c.onboarding?.id || c.id,
        }));
    } else {
      return allStrategies
        .filter(s => s.name.toLowerCase().includes(cloneAddSearch.toLowerCase()))
        .map(s => {
          const isAdded = strategies.some(st => st.strategyId === s.id);
          return {
            label: s.name,
            value: s.id,
            type: 'strategy',
            strategy: s,
            isAdded: isAdded,
          };
        });
    }
  };

  const dropdownItems = getDropdownItems();

  const handleItemClick = (item) => {
    if (item.type === 'project') {
      if (selectedIds.length > 0) {
        handleCloneStrategies(item.contextId, selectedIds[0]);
      } else {
        showToast('Select an app first', 'warning');
      }
      setCloneAddOpen(false);
      setCloneAddSearch('');
    } else {
      if (item.isAdded) {
        showToast('Strategy already added', 'warning');
        return;
      }
      const strategy = allStrategies.find(s => s.id === item.value);
      if (strategy) {
        setSelectedStrategyForPreview(strategy);
        setPreviewModalOpen(true);
      }
      setCloneAddOpen(false);
      setCloneAddSearch('');
    }
  };

  const handleApplyStrategyFromPreview = () => {
    if (selectedStrategyForPreview) {
      if (isProfile) {
        addStrategyToProfile(selectedStrategyForPreview.id);
      } else {
        selectedIds.forEach(id => {
          addStrategyToApplication(selectedStrategyForPreview.id, id);
        });
      }
      setPreviewModalOpen(false);
      setSelectedStrategyForPreview(null);
    }
  };

  // Wizard steps (no environments tab)
  const wizardSteps = [
    { id: 'general', label: 'General Strategy', icon: Settings },
    { id: 'branches', label: 'Branches', icon: GitBranch },
    { id: 'merge', label: 'Merge & Versioning', icon: GitMerge },
    { id: 'advanced', label: 'Advanced Settings', icon: Cog },
  ];

  const renderWizardStepContent = () => {
    // Environment dropdown hata diya, isliye empty arrays
    const envNames = [];
    const envConfigs = [];
    const getAvailableEnvs = () => [];

    switch (strategyWizardStep) {
      case 0: return <GeneralStrategyEditor config={newStrategyConfig} setConfig={setNewStrategyConfig} />;
      case 1: return <BranchesEditor 
        config={newStrategyConfig} 
        setConfig={setNewStrategyConfig} 
        envNames={envNames}
        getAvailableEnvs={getAvailableEnvs}
        environmentConfigs={envConfigs}
      />;
      case 2: return <MergeVersioningEditor config={newStrategyConfig} setConfig={setNewStrategyConfig} />;
      case 3: return <AdvancedEditor config={newStrategyConfig} setConfig={setNewStrategyConfig} />;
      default: return null;
    }
  };

  const renderStrategyWizard = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto py-2">
        {wizardSteps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => setStrategyWizardStep(idx)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                idx === strategyWizardStep ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </button>
            {idx < wizardSteps.length - 1 && <ChevronRight className="h-3 w-3 text-gray-600" />}
          </React.Fragment>
        ))}
      </div>
      <GlassCard>
        {renderWizardStepContent()}
        <div className="mt-6 pt-4 border-t border-white/[0.05]">
          <button
            type="button"
            onClick={() => setShowLivePreview((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
          >
            <span className="text-xs font-medium text-primary">Live Preview</span>
            <div className="flex items-center gap-1.5">
              {showLivePreview ? (
                <ChevronUp className="h-4 w-4 text-primary transition-transform duration-200" />
              ) : (
                <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200" />
              )}
            </div>
          </button>
          {showLivePreview && (
            <div className="mt-2">
              <VerticalPreview
                config={newStrategyConfig}
                environmentConfigs={envConfigsForPreview}
              />
            </div>
          )}
        </div>
        <div className="flex justify-between mt-6 pt-4 border-t border-white/[0.05]">
          <Button variant="outline" onClick={() => setStrategyWizardStep(Math.max(0, strategyWizardStep - 1))} disabled={strategyWizardStep === 0} className="border-dark-600 text-gray-300">Back</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowNewStrategyForm(false); setEditingStrategyId(null); setStrategyWizardStep(0); setNewStrategyConfig(initialStrategyConfig()); }} className="border-dark-600 text-gray-300">Cancel</Button>
            {strategyWizardStep === wizardSteps.length - 1 ? (
              <Button onClick={handleCreateStrategy} className="bg-primary text-white hover:bg-primary/90">
                {editingStrategyId ? 'Update Strategy' : 'Create Strategy'}
              </Button>
            ) : (
              <Button onClick={() => setStrategyWizardStep(Math.min(wizardSteps.length - 1, strategyWizardStep + 1))} className="bg-primary text-white hover:bg-primary/90">Next</Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Branching Strategies</h2>
        <p className="text-sm text-gray-400">{isProfile ? 'Add strategies to this profile (application-wide).' : 'Manage strategies applied to the selected applications (all share the same strategies).'}</p>
      </div>

      {showNewStrategyForm ? (
        renderStrategyWizard()
      ) : (
        <GlassCard>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Applied Strategies ({strategies.length})</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setCloneAddOpen(!cloneAddOpen)} className="flex items-center gap-2 h-8 rounded-lg border border-dark-600 bg-dark-900/60 px-3 text-xs text-white hover:border-primary/50 transition-colors">
                  <span>{cloneAddMode === 'projects' ? 'Clone from app' : 'Add template'}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {cloneAddOpen && (
                  <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-dark-700 bg-dark-900 shadow-xl z-20 p-2">
                    <div className="flex gap-1 mb-2">
                      <button onClick={() => { setCloneAddMode('projects'); setCloneAddSearch(''); }} className={cn('flex-1 rounded px-2 py-1 text-xs font-medium transition-colors', cloneAddMode === 'projects' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]')}>Apps</button>
                      <button onClick={() => { setCloneAddMode('strategies'); setCloneAddSearch(''); }} className={cn('flex-1 rounded px-2 py-1 text-xs font-medium transition-colors', cloneAddMode === 'strategies' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]')}>Templates</button>
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                      <input type="text" placeholder={`Search ${cloneAddMode}...`} value={cloneAddSearch} onChange={(e) => setCloneAddSearch(e.target.value)} className="w-full h-8 rounded border border-white/[0.08] bg-white/[0.04] pl-7 pr-2 text-xs text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {dropdownItems.length === 0 ? <p className="text-xs text-gray-500 py-2 text-center">No items found</p> : dropdownItems.map((item) => {
                        const isAdded = item.isAdded || false;
                        return (
                          <button
                            key={item.value}
                            onClick={() => handleItemClick(item)}
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate flex items-center justify-between',
                              isAdded ? 'text-gray-500 cursor-not-allowed hover:bg-transparent' : 'text-gray-200 hover:bg-white/[0.04]'
                            )}
                            disabled={isAdded}
                          >
                            <span>{item.label}</span>
                            {isAdded && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Added</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingStrategyId(null);
                  const defaultBranches = initialStrategyConfig().branches.map((branch) => ({
                    ...branch,
                    targetEnvironment: ''
                  }));
                  setNewStrategyConfig({ ...initialStrategyConfig(), branches: defaultBranches });
                  setStrategyWizardStep(0);
                  setShowNewStrategyForm(true);
                }}
                className="border-dark-600 text-gray-300 hover:border-primary/50 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
              {cloningStrategies && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          </div>

          {isProfile ? (
            <>
              {strategies.length === 0 ? <p className="text-xs text-gray-500 italic">No strategies added to this profile.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-900/60 text-xs uppercase tracking-wider text-gray-400">
                      <tr><th className="px-4 py-3 text-left">Strategy</th><th className="px-4 py-3 text-left">Default</th><th className="px-4 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {strategies.map((entry, idx) => {
                        return (
                          <tr key={entry.id || entry.strategyId || idx}>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  const fullStrategy = allStrategies.find(s => s.id === entry.strategyId);
                                  setSelectedStrategyForDetail({ 
                                    strategy: fullStrategy || entry, 
                                    appliedInfo: entry 
                                  });
                                  setStrategyDetailModalOpen(true);
                                }}
                                className="text-left font-medium text-white hover:text-primary transition-colors"
                              >
                                {entry.strategyName || entry.name || 'Unnamed'}
                              </button>
                            </td>
                            <td className="px-4 py-3">{entry.isDefault ? <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">Default</span> : <button onClick={() => setDefaultStrategyForProfile(idx)} className="text-xs text-gray-400 hover:text-primary">Set default</button>}</td>
                            <td className="px-4 py-3 text-right"><button ref={idx === confirmTargetIndex ? confirmButtonRef : null} onClick={(e) => { e.stopPropagation(); removeStrategyFromProfile(idx); }} className="rounded p-1 hover:bg-white/5"><Trash2 className="h-4 w-4 text-red-400" /></button>{confirmOpen && confirmTargetIndex === idx && <InlineConfirmPopover isOpen={true} onConfirm={handleConfirmRemove} onCancel={handleCancelRemove} anchorRef={confirmButtonRef} />}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {selectedIds.length === 0 ? <p className="text-xs text-gray-500 italic">No application selected.</p> :
                strategies.length === 0 ? <p className="text-xs text-gray-500 italic">No strategies applied to these applications.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-dark-900/60 text-xs uppercase tracking-wider text-gray-400">
                        <tr><th className="px-4 py-3 text-left">Strategy</th><th className="px-4 py-3 text-left">Default</th><th className="px-4 py-3 text-left">Applied At</th><th className="px-4 py-3 text-left">Applied By</th><th className="px-4 py-3 text-left">Notes</th><th className="px-4 py-3 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {strategies.map((entry, idx) => {
                          return (
                            <tr key={entry.id || entry.strategyId || idx}>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => {
                                    setSelectedStrategyForDetail({ strategy: entry, appliedInfo: entry });
                                    setStrategyDetailModalOpen(true);
                                  }}
                                  className="text-left font-medium text-white hover:text-primary transition-colors"
                                >
                                  {entry.strategyName || entry.name}
                                </button>
                              </td>
                              <td className="px-4 py-3">{entry.isDefault ? <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">Default</span> : <button onClick={() => setDefaultStrategyForApp(selectedIds[0], idx)} className="text-xs text-gray-400 hover:text-primary">Set default</button>}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{entry.appliedAt ? new Date(entry.appliedAt).toLocaleString() : '—'}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{entry.appliedBy || '—'}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{entry.notes || '—'}</td>
                              <td className="px-4 py-3 text-right"><button ref={idx === confirmTargetIndex ? confirmButtonRef : null} onClick={(e) => { e.stopPropagation(); removeStrategyFromApplication(selectedIds[0], idx); }} className="rounded p-1 hover:bg-white/5"><Trash2 className="h-4 w-4 text-red-400" /></button>{confirmOpen && confirmTargetIndex === idx && <InlineConfirmPopover isOpen={true} onConfirm={handleConfirmRemove} onCancel={handleCancelRemove} anchorRef={confirmButtonRef} />}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </>
          )}
        </GlassCard>
      )}

      {previewModalOpen && selectedStrategyForPreview && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg" onClick={() => setPreviewModalOpen(false)}>
          <div className="relative w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-dark-800/80 backdrop-blur-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewModalOpen(false)} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            <h3 className="text-lg font-bold text-white mb-1">{selectedStrategyForPreview.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{selectedStrategyForPreview.description || 'No description'}</p>
            <div className="mb-4">
              <p className="text-xs font-medium text-primary mb-2">Flow Preview</p>
              <VerticalPreview
                config={selectedStrategyForPreview}
                environmentConfigs={envConfigsForPreview}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewModalOpen(false)} className="border-dark-600 text-gray-300">Cancel</Button>
              <Button onClick={handleApplyStrategyFromPreview} className="bg-primary text-white hover:bg-primary/90">Apply Strategy</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

  // ─── Main render ──
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {toast.visible && (
        <div className="fixed top-4 right-4 z-[9999] w-80">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-white/[0.05] bg-dark-800/20 backdrop-blur-xl p-5 flex flex-col overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center"><Zap className="h-3.5 w-3.5 text-primary" /></div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-400">SCM Automation</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500 pl-9">Select application (optional)</p>
          </div>

          <div className="space-y-2 flex-1">
            {[
              { step: 1, label: 'Application' },
              { step: 2, label: 'Environment Config' },
              { step: 3, label: 'Pipeline Config' },
              { step: 4, label: 'Strategies' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-all',
                  activeStep === item.step ? 'border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_rgba(255,91,31,0.1)]' : 'border-transparent bg-dark-600/20 hover:border-dark-600 hover:bg-dark-800/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', activeStep === item.step ? 'bg-primary text-white' : 'bg-dark-700 text-gray-400')}>{item.step}</span>
                  <div className="flex-1 min-w-0">
                    <span className={cn('block text-sm font-medium', activeStep === item.step ? 'text-white' : 'text-gray-300')}>{item.label}</span>
                    <span className="block text-[10px] text-gray-500 truncate">{item.step === 1 ? 'Select application (optional)' : item.step === 2 ? 'Define environments' : item.step === 3 ? 'Global + per-env config' : 'Branch strategies'}</span>
                  </div>
                  {activeStep === item.step && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/[0.05] pt-4 mt-4">
            {isProfileMode && (activeStep === 2 || activeStep === 3 || activeStep === 4) && (
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Profile Name *"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            )}
            <div className="mb-3 text-xs text-gray-400 cursor-pointer relative" ref={sidebarLabelRef} onMouseEnter={() => selectedApps.length > 0 && setShowSidebarPopup(true)} onMouseLeave={() => setShowSidebarPopup(false)}>
              {selectedApps.length === 0 ? <p className="text-gray-500">No application selected</p> : <p>Selected: <span className="text-white font-medium">{selectedApps.length} application{selectedApps.length > 1 ? 's' : ''}</span></p>}
            </div>
            <SelectedAppsPopover apps={selectedApps} isOpen={showSidebarPopup} anchorRef={sidebarLabelRef} />

            <Button
              onClick={isProfileMode ? handleSaveProfile : handleSavePipeline}
              disabled={saving || (isProfileMode ? !profileName.trim() : (!hasSelection && !isProfileMode))}
              className="w-full gap-2 bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : (isProfileMode ? (selectedProfileId ? 'Update Profile' : 'Save Profile') : 'Save Pipeline')}
            </Button>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
          {activeStep === 4 && renderStep4()}
          {strategyDetailModalOpen && renderStrategyDetailModal()}
        </div>
      </div>

      <InlineConfirmPopover
        isOpen={showApplyConfirm}
        onConfirm={handleConfirmApplyStrategy}
        onCancel={handleCancelApplyStrategy}
        message="Apply this strategy to all selected applications?"
      />
    </div>
  );
}

// ─── RadioCard (used in strategy wizard) ──────────────────────────────
const RadioCard = ({ active, onClick, icon: Icon, title, description }) => (
  <label
    onClick={onClick}
    className={cn(
      'flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-all',
      active ? 'border-primary/60 bg-primary/10 shadow-[0_0_15px_rgba(255,91,31,0.12)]' : 'border-dark-700 bg-dark-900/40 hover:border-primary/30 hover:bg-primary/5'
    )}
  >
    {Icon && <Icon className={cn('mt-1 h-5 w-5 shrink-0', active ? 'text-primary' : 'text-gray-400')} />}
    <div>
      <p className={cn('font-medium', active ? 'text-white' : 'text-gray-200')}>{title}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
    <span className={cn('ml-auto mt-1 h-3 w-3 shrink-0 rounded-full border-2', active ? 'border-primary bg-primary' : 'border-dark-500')} />
  </label>
);

const GeneralStrategyEditor = ({ config, setConfig }) => {
  const handleStrategyTypeChange = (type) => {
    if (type === 'RECOMMENDED') {
      setConfig({
        ...config,
        strategyType: type,
        branches: [
          { description: 'Development Branch', tag: 'dev', name: 'feature-*', targetEnvironment: '' },
          { description: 'Merge-To Branch', tag: 'merge', name: 'release', targetEnvironment: '' },
          { description: 'Main', tag: 'main', name: 'main', targetEnvironment: '' },
          { description: 'Hotfix', tag: 'hotfix', name: 'hotfix', targetEnvironment: '' },
        ],
      });
    } else {
      setConfig({ ...config, strategyType: type });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="block text-xs font-medium text-gray-300 mb-1">Strategy Name *</label><input type="text" value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} placeholder="e.g., Standard Flow" className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" /></div>
        <div><label className="block text-xs font-medium text-gray-300 mb-1">Description</label><input type="text" value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} placeholder="Optional description" className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" /></div>
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-dark-700 bg-dark-600/20 p-5 md:grid-cols-2">
        <RadioCard active={config.strategyType === 'RECOMMENDED'} onClick={() => handleStrategyTypeChange('RECOMMENDED')} icon={Sparkles} title="Recommended" description="Fixed 4 branches with standard names." />
        <RadioCard active={config.strategyType === 'CUSTOM'} onClick={() => handleStrategyTypeChange('CUSTOM')} icon={Wrench} title="Custom" description="Edit branch names (exactly 4 branches)." />
      </div>
    </div>
  );
};

const BranchesEditor = ({ config, setConfig, envNames, getAvailableEnvs, environmentConfigs }) => {
  const branches = config.branches || [];
  const isRecommended = config.strategyType === 'RECOMMENDED';
  const [error, setError] = useState('');

  const updateBranch = (index, field, value) => {
    if (isRecommended) return;
    const branch = branches[index];
    if (branch.tag === 'dev' && field === 'name') {
      if (!value.includes('*')) {
        setError('Dev branch must contain "*" wildcard.');
        return;
      }
      setError(null);
      const updated = branches.map((b, i) => i === index ? { ...b, [field]: value } : b);
      setConfig({ ...config, branches: updated });
    } else {
      const updated = branches.map((b, i) => i === index ? { ...b, [field]: value } : b);
      setConfig({ ...config, branches: updated });
    }
  };

  const getDevPrefix = (branchName) => {
    if (!branchName) return 'feature-';
    const idx = branchName.lastIndexOf('*');
    if (idx === -1) return branchName;
    return branchName.substring(0, idx);
  };

  const updateDevPrefix = (index, prefixValue) => {
    if (isRecommended) return;
    const fullName = prefixValue + '*';
    updateBranch(index, 'name', fullName);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-gray-400">
        {isRecommended ? 'Read‑only branch names (Recommended flow)' : 'Edit branch names (Custom)'}
      </p>

      {branches.map((branch, idx) => {
        const isDev = branch.tag === 'dev';
        const displayValue = isDev ? getDevPrefix(branch.name) : branch.name;

        return (
          <div key={idx} className="grid grid-cols-2 gap-4 items-start">
            {/* Description */}
            <div className="text-xs text-gray-500 truncate self-center">
              {branch.description}
            </div>

            {/* Branch Name Input */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={displayValue}
                  onChange={(e) => {
                    if (isRecommended) return;
                    if (isDev) {
                      const val = e.target.value;
                      if (val.includes('*')) {
                        setError('You cannot change the "*" wildcard. Edit only the prefix.');
                        return;
                      }
                      setError(null);
                      updateDevPrefix(idx, val);
                    } else {
                      updateBranch(idx, 'name', e.target.value);
                    }
                  }}
                  disabled={isRecommended}
                  className={cn(
                    'w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white',
                    isRecommended ? 'cursor-not-allowed opacity-60' : 'focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30',
                    error && 'border-red-500'
                  )}
                  placeholder={isDev ? 'e.g., feature-' : 'Branch name'}
                />
                {isDev && !isRecommended && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-bold text-sm pointer-events-none">*</span>
                )}
              </div>
              {error && isDev && <p className="mt-1 text-xs text-red-400">{error}</p>}
              {isDev && !isRecommended && !error && (
                <p className="mt-1 text-[10px] text-gray-500">Prefix editable · <span className="text-primary">*</span> wildcard is fixed</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MergeVersioningEditor = ({ config, setConfig }) => (
  <div className="space-y-6">
    <div><label className="mb-2 block text-sm font-medium text-white">Merge Strategy</label><div className="space-y-2">{[{ v: 'SQUASH', title: 'Squash and Merge', hint: 'Clean history' }, { v: 'MERGE_COMMIT', title: 'Create Merge Commit', hint: 'Preserve history' }, { v: 'REBASE', title: 'Rebase and Merge', hint: 'Linear history' }].map((opt) => (
      <label key={opt.v} className="flex cursor-pointer items-center gap-3 rounded-lg border border-dark-700 bg-dark-800/40 p-3 transition-all hover:border-primary/30">
        <input type="radio" name="mergeStrategy" value={opt.v} checked={config.mergeStrategy === opt.v} onChange={() => setConfig({ ...config, mergeStrategy: opt.v })} className="h-4 w-4 border-dark-600 text-primary" />
        <span className="text-sm text-white">{opt.title}</span><span className="ml-auto text-xs text-gray-500">{opt.hint}</span>
      </label>
    ))}</div></div>
    <div><label className="mb-2 block text-sm font-medium text-white">Versioning Scheme</label><select value={config.versionScheme} onChange={(e) => setConfig({ ...config, versionScheme: e.target.value })} className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"><option value="BUILD_NUMBER" className="bg-dark-900 text-white">Build Number (Auto)</option><option value="COMMIT_SHA" className="bg-dark-900 text-white">Git Commit SHA</option><option value="SEMANTIC" className="bg-dark-900 text-white">Semantic Version (v1.2.3)</option></select></div>
  </div>
);

const AdvancedEditor = ({ config, setConfig }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between"><div><p className="font-medium text-white">Auto-delete branch after merge</p><p className="text-xs text-gray-400">Remove remote branch automatically once merged into <code className="text-primary">main</code>.</p></div><Toggle value={config.autoDeleteBranch} onChange={(v) => setConfig({ ...config, autoDeleteBranch: v })} /></div>
    <div className="border-t border-dark-700 pt-4"><label className="flex cursor-pointer items-center gap-2 text-sm text-white"><input type="checkbox" checked={config.isDefault} onChange={(e) => setConfig({ ...config, isDefault: e.target.checked })} className="h-4 w-4 rounded border-dark-600 text-primary" /> Mark as default strategy</label><p className="ml-6 mt-1 text-[11px] text-gray-500">Used as the suggested choice when applying a strategy to a new project.</p></div>
  </div>
);