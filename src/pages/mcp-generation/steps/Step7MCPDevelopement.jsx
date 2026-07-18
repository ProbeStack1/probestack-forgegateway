import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Cloud, Activity, Shield, Puzzle, Loader2, CheckCircle,
  FileCode, Server, Key, Layers, Wrench, MessageSquare, Zap, GitBranch,
  ChevronRight, ChevronDown, ArrowRight, ArrowLeft, Info, AlertCircle,
  Database, Link, Lock, LogIn, Settings, BarChart, Users, CircleDot, Plug,
  Github, Rocket, Package, GitPullRequest, Play, Check, X
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import ConnectorModal from '../../../components/ui/ConnectorModal';
import EnterpriseOptionCard from '../../../pages/api-development/components/EnterpriseOptionCard';
import {
  API_DEVELOPMENT_PERSISTENCE_OPTIONS,
  API_DEVELOPMENT_DEPLOYMENT_OPTIONS,
  API_DEVELOPMENT_SECURITY_OPTIONS,
  API_DEVELOPMENT_LOGGING_OPTIONS,
  API_DEVELOPMENT_LOG_DESTINATION_OPTIONS,
  API_DEVELOPMENT_VALIDATION_OPTIONS,
  API_DEVELOPMENT_RESILIENCY_OPTIONS,
  API_DEVELOPMENT_EXTERNAL_INTEGRATION_OPTIONS,
} from '../../../pages/api-development/apiDevelopmentOptions';

// ─── Real service ────────────────────────────────────────────────────
import { mcpGenerationService } from '../../../services/mcpGenerationService';

// ─── Language Options ─────────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
  { value: 'typescript', label: 'TypeScript', description: 'Node.js SDK, type‑safe, recommended for most use cases.' },
  { value: 'python', label: 'Python', description: 'Fast development with excellent MCP SDK support.' },
  { value: 'java', label: 'Java', description: 'Spring Boot based MCP server.' },
  { value: 'raw', label: 'Raw', description: 'Minimal scaffold without framework dependencies.' },
];

// ─── Transport Options ──────────────────────────────────────────────
const MCP_TRANSPORT_OPTIONS = [
  {
    value: 'stdio',
    label: 'Stdio',
    description: 'Local only — Claude Desktop / Cursor launch the process. Fastest, but unreachable from the web.',
    icon: FileCode,
  },
  {
    value: 'streamable-http',
    label: 'Streamable HTTP (Recommended)',
    description: 'Remote, modern. Single endpoint with bidirectional SSE. Works from any MCP client including the web.',
    icon: Server,
    recommended: true,
  },
  {
    value: 'http-sse',
    label: 'HTTP + SSE (legacy)',
    description: 'Older MCP clients. Two endpoints (`/sse` + `/messages`). Less efficient; pick if compatibility matters.',
    icon: Link,
  },
];

const SUB_STEPS = [
  { id: 'metadata', title: 'Metadata', icon: FileText, description: 'API specification, server identity, runtime language, and project coordinates.' },
  { id: 'infrastructure', title: 'Infrastructure', icon: Cloud, description: 'Transport, deployment target, persistence, and connector configuration.' },
  { id: 'runtime', title: 'Runtime Quality', icon: Activity, description: 'Resiliency, timeouts, and operations support.' },
  { id: 'securityLogging', title: 'Security & Logging', icon: Shield, description: 'Authentication, logging provider, and log destination.' },
  { id: 'integrationsTesting', title: 'Integrations & Tests', icon: Puzzle, description: 'External client adapters and generated testing assets.' },
];

// ─── Pipeline Steps ──────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id: 'generate', icon: FileCode, label: 'MCP Code Generation' },
  { id: 'push', icon: Github, label: 'Push to GitHub' },
  { id: 'deploy', icon: Rocket, label: 'Deploy' },
  { id: 'complete', icon: Check, label: 'Complete' },
];

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };

export default function Step7MCPDevelopement({ state, dispatch, setToast }) {
  const [activeSubStep, setActiveSubStep] = useState('metadata');
  const [visitedSubSteps, setVisitedSubSteps] = useState(['metadata']);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPipelineStep, setCurrentPipelineStep] = useState(0);
  const [completedPipelineSteps, setCompletedPipelineSteps] = useState([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // ─── NEW: store the test collection URL from generation ──────────
  const [testCollectionUrl, setTestCollectionUrl] = useState(null);
  // ─── NEW: deployment status ──────────────────────────────────────
  const [deployStatus, setDeployStatus] = useState(null);
  const [deployError, setDeployError] = useState(null);

  // ─── Navigation ─────────────────────────────────────────────────────
  const goToSubStep = (id) => {
    if (id === activeSubStep) return;
    setVisitedSubSteps((prev) => [...new Set([...prev, id])]);
    setActiveSubStep(id);
  };

  const goToPreviousSubStep = () => {
    const idx = SUB_STEPS.findIndex((s) => s.id === activeSubStep);
    if (idx > 0) goToSubStep(SUB_STEPS[idx - 1].id);
  };

  const goToNextSubStep = () => {
    const idx = SUB_STEPS.findIndex((s) => s.id === activeSubStep);
    if (idx < SUB_STEPS.length - 1) goToSubStep(SUB_STEPS[idx + 1].id);
  };

  const isLast = activeSubStep === SUB_STEPS[SUB_STEPS.length - 1].id;

  // ─── Generate Pipeline ──────────────────────────────────────────────
  const handleGenerate = async () => {
    const projectId = state?.projectId;
    if (!projectId) {
      setToast?.({ message: 'No project created yet. Please save Step 2 first.', type: 'error' });
      return;
    }

    setIsGenerating(true);
    setCurrentPipelineStep(0);
    setCompletedPipelineSteps([]);
    setTestCollectionUrl(null);
    setDeployStatus(null);
    setDeployError(null);

    try {
      // 1. Generate code
      setCurrentPipelineStep(0);
      const genResult = await mcpGenerationService.generate(projectId);
      if (!genResult.success) {
        throw new Error(genResult.error || 'Generation failed');
      }
      setCompletedPipelineSteps(prev => [...prev, 'generate']);

      // Store the test collection URL if present
      if (genResult.data?.testCollectionUrl) {
        setTestCollectionUrl(genResult.data.testCollectionUrl);
        // Optionally store it in the global state for Step 8
        dispatch?.({ type: 'SET_TEST_COLLECTION_URL', url: genResult.data.testCollectionUrl });
      }

      // 2. Push to GitHub (direct)
      setCurrentPipelineStep(1);
      const pushResult = await mcpGenerationService.pushToGithub(projectId);
      if (!pushResult.success) {
        throw new Error(pushResult.error || 'Push to GitHub failed');
      }
      setCompletedPipelineSteps(prev => [...prev, 'push']);

      // 3. Poll for deployment status
      setCurrentPipelineStep(2);
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await mcpGenerationService.getLatestWorkflowRun(projectId);
          if (statusRes.success && statusRes.data) {
            setDeployStatus(statusRes.data);
            if (statusRes.data.deploymentStatus === 'SUCCESS' || statusRes.data.deploymentStatus === 'FAILED') {
              clearInterval(pollInterval);
              setCurrentPipelineStep(3);
              setCompletedPipelineSteps(prev => [...prev, 'deploy', 'complete']);
              setIsGenerating(false);
              setToast?.({
                message: statusRes.data.deploymentStatus === 'SUCCESS' ? 'Deployment successful!' : 'Deployment failed.',
                type: statusRes.data.deploymentStatus === 'SUCCESS' ? 'success' : 'error',
              });
            }
          }
        } catch (err) {
          // ignore polling errors
        }
      }, 5000);

      // Safety timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGenerating) {
          setIsGenerating(false);
          setToast?.({ message: 'Deployment polling timed out. Check your GitHub Actions.', type: 'error' });
        }
      }, 300000);

    } catch (err) {
      setIsGenerating(false);
      setDeployError(err.message);
      setToast?.({ message: err.message, type: 'error' });
    }
  };

  const handleSaveAll = () => {
    setToast?.({ message: 'All settings saved!', type: 'success' });
  };

  const handleSummary = () => {
    setShowSummaryModal(true);
  };

  // ─── Step Status ──────────────────────────────────────────────────
  const getStepStatus = (stepId) => {
    const idx = SUB_STEPS.findIndex(s => s.id === stepId);
    const activeIdx = SUB_STEPS.findIndex(s => s.id === activeSubStep);
    if (stepId === activeSubStep) return 'active';
    if (visitedSubSteps.includes(stepId) && idx < activeIdx) return 'completed';
    if (visitedSubSteps.includes(stepId) && idx > activeIdx) return 'skipped';
    return 'pending';
  };

  // ─── Render ──────────────────────────────────────────────────────
  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="p-6 max-w-2xl w-full" style={cardStyle}>
            <div className="text-center mb-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-white">Generating MCP Server</h3>
              <p className="text-sm text-gray-400">Please wait while we build your MCP server...</p>
            </div>
            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, index) => {
                const isCompleted = completedPipelineSteps.includes(step.id);
                const isActive = currentPipelineStep === index && !isCompleted;
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border transition-all',
                      isCompleted ? 'border-green-500/30 bg-green-500/10' :
                      isActive ? 'border-primary/50 bg-primary/10 animate-pulse' :
                      'border-dark-700 bg-[#0f172a]/30 opacity-50'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      isCompleted ? 'bg-green-500 text-white' :
                      isActive ? 'bg-primary text-white' : 'bg-dark-700 text-gray-500'
                    )}>
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <Icon className={cn(
                      'w-4 h-4',
                      isCompleted ? 'text-green-400' : isActive ? 'text-primary' : 'text-gray-500'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      isCompleted ? 'text-green-300' : isActive ? 'text-white' : 'text-gray-400'
                    )}>
                      {step.label}
                    </span>
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                    )}
                    {isActive && (
                      <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
            {deployStatus && deployStatus.deploymentStatus && (
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm">
                Status: {deployStatus.deploymentStatus}
                {deployStatus.deployedServiceUrl && (
                  <div className="mt-1 text-xs">
                    URL: <a href={deployStatus.deployedServiceUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">{deployStatus.deployedServiceUrl}</a>
                  </div>
                )}
              </div>
            )}
            {deployError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {deployError}
              </div>
            )}
            {testCollectionUrl && (
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                Test collection generated: <a href={testCollectionUrl} target="_blank" rel="noreferrer" className="text-green-400 underline">View</a>
              </div>
            )}
          </Card>
        </div>
      );
    }

    // If generation finished but we have deployment status, show it
    if (deployStatus || deployError) {
      return (
        <Card className="p-4" style={cardStyle}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-md font-semibold text-white">Deployment Status</h3>
            {deployStatus?.deploymentStatus === 'SUCCESS' && (
              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">Live</span>
            )}
          </div>
          {deployStatus && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-dark-700/50 border border-dark-600">
                <p className="text-sm text-gray-300">Status: <span className="font-semibold text-white">{deployStatus.deploymentStatus}</span></p>
                {deployStatus.deployedServiceUrl && (
                  <p className="text-sm text-gray-300 mt-1">
                    URL: <a href={deployStatus.deployedServiceUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{deployStatus.deployedServiceUrl}</a>
                  </p>
                )}
                {deployStatus.run && (
                  <p className="text-xs text-gray-400 mt-2">
                    Run ID: {deployStatus.run.id} • {deployStatus.run.status}
                  </p>
                )}
              </div>
              {testCollectionUrl && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-300">Test Collection URL:</p>
                  <a href={testCollectionUrl} target="_blank" rel="noreferrer" className="text-sm text-green-400 hover:underline break-all">{testCollectionUrl}</a>
                </div>
              )}
            </div>
          )}
          {deployError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {deployError}
            </div>
          )}
        </Card>
      );
    }

    // Regular sub-step content
    switch (activeSubStep) {
      case 'metadata': return <MetadataSubStep state={state} dispatch={dispatch} setToast={setToast} />;
      case 'infrastructure': return <InfrastructureSubStep state={state} dispatch={dispatch} setToast={setToast} setShowConnectorModal={setShowConnectorModal} />;
      case 'runtime': return <RuntimeQualitySubStep state={state} dispatch={dispatch} />;
      case 'securityLogging': return <SecurityLoggingSubStep state={state} dispatch={dispatch} />;
      case 'integrationsTesting': return <IntegrationsTestingSubStep state={state} dispatch={dispatch} />;
      default: return null;
    }
  };

  const handleSaveConnector = (data) => {
    const root = data?.data || data || {};
    const id = root.id || root.connectorId || root._id || data?.id || null;
    if (!id) {
      setToast?.({ message: 'Connector saved but no id returned.', type: 'error' });
      return;
    }
    dispatch({ type: 'SET_CONNECTOR', id, summary: root });
    setShowConnectorModal(false);
    setToast?.({ message: 'Connector configuration saved.', type: 'success' });
  };

  return (
    <>
      {!isGenerating ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-6">
          <div
            className="h-fit rounded-xl border border-dark-700/80 bg-[#11182b] p-0 shadow-[0_18px_48px_rgba(3,7,18,0.22)] lg:sticky lg:top-4 lg:max-h-[650px] overflow-y-auto"
            style={cardStyle}
          >
            <div className="border-b border-dark-700/80 bg-[#0f172a]/35 px-5 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">MCP Development</p>
              <h3 className="mt-2 text-base font-semibold text-white">Configuration flow</h3>
              <p className="mt-2 text-xs leading-5 text-gray-400">Configure the MCP server in focused, reviewable stages.</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-dark-800">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${((SUB_STEPS.findIndex(s => s.id === activeSubStep) + 1) / SUB_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-1 p-3">
              {SUB_STEPS.map((subStep, index) => {
                const Icon = subStep.icon;
                const status = getStepStatus(subStep.id);
                const isActive = status === 'active';
                const isCompleted = status === 'completed';
                const isSkipped = status === 'skipped';
                return (
                  <button
                    key={subStep.id}
                    onClick={() => goToSubStep(subStep.id)}
                    className={cn(
                      'group relative w-full rounded-xl border px-3 py-3 text-left transition-all',
                      isActive
                        ? 'border-primary/60 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                        : isCompleted
                          ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                          : isSkipped
                            ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
                            : 'border-transparent bg-transparent hover:border-dark-700 hover:bg-[#0f172a]/50'
                    )}
                  >
                    <span className="relative flex items-start gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all',
                          isActive
                            ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                            : isCompleted
                              ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                              : isSkipped
                                ? 'border-amber-500/30 bg-amber-500/20 text-amber-400'
                                : 'border-dark-700 bg-[#0b1220] text-gray-500 group-hover:text-white'
                        )}
                      >
                        {isActive ? index + 1 : isCompleted ? <CheckCircle className="h-4 w-4" /> : isSkipped ? <CircleDot className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn(
                          'flex items-center gap-2 text-sm font-semibold',
                          isActive ? 'text-white' : isCompleted ? 'text-emerald-300' : isSkipped ? 'text-amber-300' : 'text-gray-300'
                        )}>
                          <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : isCompleted ? 'text-emerald-400' : isSkipped ? 'text-amber-400' : 'text-gray-500')} />
                          {subStep.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-gray-500">{subStep.description}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 lg:max-h-[650px] lg:overflow-y-auto lg:pr-2 [scrollbar-color:rgba(71,85,105,0.75)_transparent] [scrollbar-width:thin]">
            <div className="grid grid-cols-1 gap-4 pb-1">
              {renderContent()}
            </div>

            <div className="flex items-center justify-between border-t border-dark-700 pt-4 mt-4">
              <button
                onClick={goToPreviousSubStep}
                disabled={activeSubStep === SUB_STEPS[0].id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 hover:border-[#ff5b1f]/40 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs text-gray-500">
                {SUB_STEPS.findIndex(s => s.id === activeSubStep) + 1} of {SUB_STEPS.length}
              </span>
              {!isLast ? (
                <button
                  onClick={goToNextSubStep}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-sm font-semibold"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSummary}
                    className="px-4 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 hover:border-[#ff5b1f]/40 text-sm font-medium"
                  >
                    <BarChart className="w-4 h-4 inline mr-1" /> Summary
                  </button>
                  <button
                    onClick={handleSaveAll}
                    className="px-4 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 hover:border-[#ff5b1f]/40 text-sm font-medium"
                  >
                    Save All
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-sm font-semibold"
                    disabled={!state?.projectId}
                  >
                    <Play className="w-4 h-4" /> Generate
                  </button>
                </div>
              )}
            </div>

            
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 min-h-[500px]">
          <Card className="p-6 max-w-2xl w-full" style={cardStyle}>
            <div className="text-center mb-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-white">Generating MCP Server</h3>
              <p className="text-sm text-gray-400">Please wait while we build your MCP server...</p>
            </div>
            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, index) => {
                const isCompleted = completedPipelineSteps.includes(step.id);
                const isActive = currentPipelineStep === index && !isCompleted;
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border transition-all',
                      isCompleted ? 'border-green-500/30 bg-green-500/10' :
                      isActive ? 'border-primary/50 bg-primary/10 animate-pulse' :
                      'border-dark-700 bg-[#0f172a]/30 opacity-50'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      isCompleted ? 'bg-green-500 text-white' :
                      isActive ? 'bg-primary text-white' : 'bg-dark-700 text-gray-500'
                    )}>
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <Icon className={cn(
                      'w-4 h-4',
                      isCompleted ? 'text-green-400' : isActive ? 'text-primary' : 'text-gray-500'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      isCompleted ? 'text-green-300' : isActive ? 'text-white' : 'text-gray-400'
                    )}>
                      {step.label}
                    </span>
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                    )}
                    {isActive && (
                      <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
            {deployStatus && deployStatus.deploymentStatus && (
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm">
                Status: {deployStatus.deploymentStatus}
                {deployStatus.deployedServiceUrl && (
                  <div className="mt-1 text-xs">
                    URL: <a href={deployStatus.deployedServiceUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">{deployStatus.deployedServiceUrl}</a>
                  </div>
                )}
              </div>
            )}
            {testCollectionUrl && (
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                Test collection generated: <a href={testCollectionUrl} target="_blank" rel="noreferrer" className="text-green-400 underline">View</a>
              </div>
            )}
          </Card>
        </div>
      )}

      <ConnectorModal
        isOpen={showConnectorModal}
        onClose={() => setShowConnectorModal(false)}
        onSave={handleSaveConnector}
        pageType="mcp_server"
        organizationId={state?.onboarding?.organizationId || 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c'}
        connectorId={state?.connectorContextId}
      />

      {showSummaryModal && (
        <SummaryModal
          state={state}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </>
  );
}

// ─── Metadata Sub-step ────────────────────────────────────────────────
function MetadataSubStep({ state, dispatch, setToast }) {
  const selectedSpec = state?.selectedSpec;
  const identity = state?.identity || {};
  const runtime = state?.runtime || { language: 'typescript', languageVersion: 'node20', sdkVersion: '^1.0.0' };
  const capabilities = state?.capabilities || { tools: [], resources: [], prompts: [] };

  const updateIdentity = (patch) => dispatch({ type: 'SET_IDENTITY', patch });
  const updateRuntime = (patch) => dispatch({ type: 'SET_RUNTIME', patch });

  // ─── Language-specific defaults ────────────────────────────────────
  const getLanguageDefaults = (lang) => {
    switch (lang) {
      case 'typescript': return { version: 'node20', sdk: '^1.0.0' };
      case 'python': return { version: 'py3.12', sdk: '^1.0.0' };
      case 'java': return { version: 'java17', sdk: '3.3.0' };
      default: return { version: '', sdk: '' };
    }
  };

  // ─── When language changes, update version & SDK ──────────────────
  useEffect(() => {
    const defaults = getLanguageDefaults(runtime.language || 'typescript');
    // Only update if the current values are empty or match the old defaults
    // We'll simply set them to defaults on language change.
    updateRuntime({
      languageVersion: defaults.version,
      sdkVersion: defaults.sdk,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.language]);

  return (
    <Card className="p-4" style={cardStyle}>
      <CardTitle className="mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Metadata
      </CardTitle>

      <div className="space-y-4">
        {/* Spec Card */}
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Selected Specification</p>
          {selectedSpec ? (
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-white">{selectedSpec.name}</p>
                <p className="text-xs text-gray-400">Source: {selectedSpec.source || 'imported'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No spec selected. Go back to Step 3.</p>
          )}
        </div>

        {/* Identity Card */}
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Server Identity</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Display Name</Label>
              <Input
                value={identity.displayName || ''}
                onChange={(e) => updateIdentity({ displayName: e.target.value })}
                placeholder="My MCP Server"
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Slug</Label>
              <Input
                value={identity.slug || ''}
                onChange={(e) => updateIdentity({ slug: e.target.value })}
                placeholder="my-mcp-server"
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-gray-300">Description</Label>
              <Input
                value={identity.description || ''}
                onChange={(e) => updateIdentity({ description: e.target.value })}
                placeholder="Describe your MCP server..."
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700"
              />
            </div>
          </div>
        </div>

        {/* Runtime Card */}
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Runtime</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpLanguage"
                checked={runtime.language === opt.value}
                label={opt.label}
                description={opt.description}
                onChange={() => updateRuntime({ language: opt.value })}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Version</Label>
              <Input
                value={runtime.languageVersion || ''}
                onChange={(e) => updateRuntime({ languageVersion: e.target.value })}
                placeholder={getLanguageDefaults(runtime.language).version}
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">SDK Version</Label>
              <Input
                value={runtime.sdkVersion || ''}
                onChange={(e) => updateRuntime({ sdkVersion: e.target.value })}
                placeholder={getLanguageDefaults(runtime.language).sdk}
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700"
              />
            </div>
          </div>
        </div>

        {/* Capabilities Summary */}
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Capabilities</p>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="text-gray-300">Tools: <span className="text-white font-semibold">{capabilities.tools.length}</span></span>
            <span className="text-gray-300">Resources: <span className="text-white font-semibold">{capabilities.resources.length}</span></span>
            <span className="text-gray-300">Prompts: <span className="text-white font-semibold">{capabilities.prompts.length}</span></span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Infrastructure Sub-step ──────────────────────────────────────────
function InfrastructureSubStep({ state, dispatch, setToast, setShowConnectorModal }) {
  const transport = state?.transport || { kind: 'streamable-http', baseUrl: 'http://localhost:3500/mcp' };
  const advanced = state?.advanced || {};
  const connectorSummary = state?.connectorSummary;
  const connectorContextId = state?.connectorContextId;

  const updateTransport = (patch) => dispatch({ type: 'SET_TRANSPORT', patch });
  const updateAdvanced = (patch) => dispatch({ type: 'SET_ADVANCED', patch });

  const getDeploymentTarget = () => advanced.deploymentTarget || 'CLOUD_RUN';
  const getPersistenceTarget = () => advanced.persistenceTarget || 'MONGODB';

  const renderConnectorSummary = () => {
    if (!connectorSummary) return null;
    const cards = [
      {
        key: 'sourceCodeManagement',
        label: 'Source Code Provider',
        icon: GitBranch,
        accent: 'text-violet-300',
        fields: [
          ['Provider', connectorSummary.sourceCodeManagement?.platform || connectorSummary.sourceCodeManagement?.provider],
          ['Organization', connectorSummary.sourceCodeManagement?.orgOrUser],
          ['Repository', connectorSummary.sourceCodeManagement?.repo],
          ['Branch', connectorSummary.sourceCodeManagement?.branch],
          ['Visibility', connectorSummary.sourceCodeManagement?.isPrivate === false ? 'Public' : connectorSummary.sourceCodeManagement?.isPrivate === true ? 'Private' : ''],
          ['Token', connectorSummary.sourceCodeManagement?.token ? 'Configured' : ''],
        ].filter(([, value]) => value !== undefined && value !== null && value !== ''),
      },
      {
        key: 'cloudProvider',
        label: 'Cloud Provider',
        icon: Cloud,
        accent: 'text-blue-300',
        fields: [
          ['Provider', connectorSummary.cloudProvider?.provider || connectorSummary.cloudProvider?.platform],
          ['Deployment', connectorSummary.cloudProvider?.cloudRun ? 'Cloud Run' : connectorSummary.cloudProvider?.gke ? 'GKE' : ''],
          ['GCP Project', connectorSummary.cloudProvider?.gcpProjectId],
          ['GCP Region', connectorSummary.cloudProvider?.gcpRegion],
          ['AWS Access Key', connectorSummary.cloudProvider?.accessKeyId ? 'Configured' : ''],
          ['AWS Region', connectorSummary.cloudProvider?.awsRegion],
          ['Azure Subscription', connectorSummary.cloudProvider?.subscriptionId ? 'Configured' : ''],
          ['Resource Group', connectorSummary.cloudProvider?.resourceGroup],
          ['Azure Region', connectorSummary.cloudProvider?.azureRegion],
        ].filter(([, value]) => value !== undefined && value !== null && value !== ''),
      },
      {
        key: 'databaseConnector',
        label: 'Database',
        icon: Database,
        accent: 'text-emerald-300',
        fields: connectorSummary.databaseConnector?.connectionString
          ? [
              ['Type', connectorSummary.databaseConnector?.databaseType],
              ['Connection String', connectorSummary.databaseConnector?.connectionString],
            ]
          : [
              ['Type', connectorSummary.databaseConnector?.databaseType],
              ['Host', connectorSummary.databaseConnector?.host],
              ['Port', connectorSummary.databaseConnector?.port],
              ['Database', connectorSummary.databaseConnector?.databaseName],
              ['User', connectorSummary.databaseConnector?.username],
              ['SSL Mode', connectorSummary.databaseConnector?.sslMode],
            ].filter(([, value]) => value !== undefined && value !== null && value !== ''),
      },
    ];

    const activeCards = cards.filter(card => card.fields.length > 0);
    if (activeCards.length === 0) return null;

    return (
      <div className="mt-3 grid grid-cols-1 gap-2">
        {activeCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="rounded-lg border border-dark-700 bg-[#0f172a]/60 p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-dark-600 bg-dark-900/60">
                    <Icon className={cn('h-4 w-4', card.accent)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-white">{card.label}</p>
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-300">
                        Active
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {card.fields.slice(0, 4).map(([label, value]) => (
                        <span
                          key={`${card.key}-${label}`}
                          className="break-all rounded-md border border-dark-700 bg-dark-900/50 px-2 py-1 text-[11px] leading-5 text-gray-300"
                          title={`${label}: ${String(value)}`}
                        >
                          <span className="text-gray-500">{label}: </span>
                          <span className="font-medium text-gray-200">{value}</span>
                        </span>
                      ))}
                      {card.fields.length > 4 && (
                        <span className="rounded-md border border-dark-700 bg-dark-900/50 px-2 py-1 text-[11px] text-gray-500">
                          +{card.fields.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="p-4" style={cardStyle}>
      <CardTitle className="mb-3 flex items-center gap-2">
        <Cloud className="w-5 h-5 text-primary" />
        Infrastructure
      </CardTitle>

      <div className="space-y-4">
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Transport</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {MCP_TRANSPORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = transport.kind === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateTransport({ kind: opt.value })}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-all relative',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                      : 'border-dark-700 hover:border-primary/50 bg-[#0f172a]/30'
                  )}
                >
                  {opt.recommended && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-primary text-[8px] font-bold uppercase text-white">Recommended</span>
                  )}
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-primary/20 text-primary' : 'bg-dark-700 text-gray-400'
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {transport.kind !== 'stdio' && (
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs text-gray-300">Base URL</Label>
              <Input
                value={transport.baseUrl || ''}
                onChange={(e) => updateTransport({ baseUrl: e.target.value })}
                placeholder="http://localhost:3500/mcp"
                className="h-9 text-sm bg-[#0f172a]/50 border-dark-700"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Deployment Target</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_DEPLOYMENT_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpDeployment"
                checked={getDeploymentTarget() === opt.value}
                disabled={opt.disabled}
                label={opt.label}
                description={opt.description}
                badge={opt.badge}
                onChange={() => {
                  if (!opt.disabled) updateAdvanced({ deploymentTarget: opt.value });
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Persistence</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_PERSISTENCE_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpPersistence"
                checked={getPersistenceTarget() === opt.value}
                disabled={opt.disabled}
                label={opt.label}
                description={opt.description}
                badge={opt.badge}
                onChange={() => {
                  if (!opt.disabled) updateAdvanced({ persistenceTarget: opt.value });
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Connector Configuration</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConnectorModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-dark-700 hover:border-primary/50 text-gray-300 hover:text-white bg-[#0f172a]/30"
            >
              <Plug className="w-3.5 h-3.5" />
              {connectorContextId ? 'Edit connectors' : 'Configure connectors'}
            </button>
            {connectorContextId && (
              <span className="text-[11px] text-gray-500 font-mono">id: <span className="text-cyan-300">{connectorContextId}</span></span>
            )}
          </div>
          {renderConnectorSummary()}
        </div>
      </div>
    </Card>
  );
}

// ─── Runtime Quality Sub-step ─────────────────────────────────────────
function RuntimeQualitySubStep({ state, dispatch }) {
  return (
    <Card className="p-4" style={cardStyle}>
      <CardTitle className="mb-3 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Runtime Quality
      </CardTitle>
      <p className="mb-3 text-xs text-gray-400">Generate patterns that protect the service from downstream failures.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {API_DEVELOPMENT_RESILIENCY_OPTIONS.map((opt) => (
          <EnterpriseOptionCard
            key={opt.value}
            type="checkbox"
            checked={false}
            disabled
            label={opt.label}
            description={opt.description}
            badge={opt.badge || 'Coming soon'}
          />
        ))}
      </div>
    </Card>
  );
}

// ─── Security & Logging Sub-step ─────────────────────────────────────
function SecurityLoggingSubStep({ state, dispatch }) {
  const auth = state?.auth || { kind: 'bearer', headerName: 'Authorization', generatedToken: '' };
  const advanced = state?.advanced || {};
  const [token, setToken] = useState(auth.generatedToken || '');

  useEffect(() => {
    if (auth.generatedToken) setToken(auth.generatedToken);
  }, [auth.generatedToken]);

  const updateAuth = (patch) => dispatch({ type: 'SET_AUTH', patch });
  const updateAdvanced = (patch) => dispatch({ type: 'SET_ADVANCED', patch });

  const generateToken = async () => {
    try {
      const { mcpGenerationService } = await import('../../../services/mcpGenerationService');
      const res = await mcpGenerationService.generateToken();
      if (res.success) {
        const newToken = res.data?.token || '';
        setToken(newToken);
        updateAuth({ generatedToken: newToken });
      }
    } catch (e) {
      const rand = Array.from({ length: 64 }, () => Math.random().toString(36)[2]).join('');
      setToken(rand);
      updateAuth({ generatedToken: rand });
    }
  };

  const getLoggingProvider = () => advanced.loggingProvider || 'CONSOLE';
  const getLogDestination = () => advanced.logDestination || 'CONSOLE';
  const getValidationMode = () => advanced.validationMode || 'DEVELOPMENT';

  return (
    <Card className="p-4" style={cardStyle}>
      <CardTitle className="mb-3 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Security & Logging
      </CardTitle>

      <div className="space-y-4">
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Authentication</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_SECURITY_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpAuth"
                checked={auth.kind === opt.value}
                disabled={opt.disabled}
                label={opt.label}
                description={opt.description}
                badge={opt.badge}
                onChange={() => !opt.disabled && updateAuth({ kind: opt.value })}
              />
            ))}
          </div>
        </div>

        {auth.kind === 'bearer' && (
          <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Token</p>
                <code className="text-sm font-mono text-cyan-300 break-all">{token || '—'}</code>
              </div>
              <button
                onClick={generateToken}
                className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-medium whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Stored in <span className="font-mono">MCP_AUTH_TOKEN</span> env var. Clients send <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>.</p>
          </div>
        )}

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Logging Provider</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_LOGGING_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpLogging"
                checked={getLoggingProvider() === opt.value}
                disabled={opt.disabled}
                label={opt.label}
                description={opt.description}
                badge={opt.badge}
                onChange={() => {
                  if (!opt.disabled) updateAdvanced({ loggingProvider: opt.value });
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Log Destination</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {API_DEVELOPMENT_LOG_DESTINATION_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpLogDestination"
                checked={getLogDestination() === opt.value}
                label={opt.label}
                description={opt.description}
                onChange={() => updateAdvanced({ logDestination: opt.value })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Validation Mode</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_VALIDATION_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                name="mcpValidation"
                checked={getValidationMode() === opt.value}
                label={opt.label}
                description={opt.description}
                onChange={() => updateAdvanced({ validationMode: opt.value })}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-dark-700 flex gap-2">
          <button
            onClick={() => {
              updateAuth({ kind: 'bearer' });
              updateAdvanced({
                rateLimit: { enabled: true, requestsPerMinute: 60 },
                cors: { enabled: true, allowedOrigins: 'https://forgesphere.probestack.io' },
                logging: { enabled: true },
                healthCheck: { enabled: true, path: '/healthz' },
                metrics: { enabled: true, path: '/metrics' },
                loggingProvider: 'CONSOLE',
                logDestination: 'CONSOLE',
                validationMode: 'PRODUCTION',
              });
            }}
            className="px-3 py-1.5 rounded-lg border border-dark-700 text-xs text-gray-300 hover:border-primary/50 hover:bg-primary/5"
          >
            Production-ready
          </button>
          <button
            onClick={() => {
              updateAuth({ kind: 'bearer' });
              updateAdvanced({
                rateLimit: { enabled: false, requestsPerMinute: 60 },
                cors: { enabled: true, allowedOrigins: '*' },
                logging: { enabled: true },
                healthCheck: { enabled: true, path: '/healthz' },
                metrics: { enabled: false, path: '/metrics' },
                loggingProvider: 'CONSOLE',
                logDestination: 'CONSOLE',
                validationMode: 'DEVELOPMENT',
              });
            }}
            className="px-3 py-1.5 rounded-lg border border-dark-700 text-xs text-gray-300 hover:border-primary/50 hover:bg-primary/5"
          >
            Development
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Integrations & Tests Sub-step ────────────────────────────────────
function IntegrationsTestingSubStep({ state, dispatch }) {
  const [selectedTestCategories, setSelectedTestCategories] = useState([
    'POSITIVE', 'NEGATIVE', 'PERFORMANCE', 'SECURITY'
  ]);
  const [testAssets, setTestAssets] = useState({
    postman: true,
    junit: false,
    integration: false,
    testcontainers: false,
    forgefuzz: false,
  });

  const toggleAsset = (key) => {
    setTestAssets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card className="p-4" style={cardStyle}>
      <CardTitle className="mb-3 flex items-center gap-2">
        <Puzzle className="w-5 h-5 text-primary" />
        Integrations & Tests
      </CardTitle>

      <div className="space-y-4">
        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">External Integrations</p>
          <p className="text-xs text-gray-500 mb-2">Generate client adapters for tools that call external APIs.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_DEVELOPMENT_EXTERNAL_INTEGRATION_OPTIONS.map((opt) => (
              <EnterpriseOptionCard
                key={opt.label}
                type="checkbox"
                checked={false}
                disabled
                label={opt.label}
                description={opt.description}
                badge="Coming soon"
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Test Assets</p>
          <p className="text-xs text-gray-500 mb-2">Choose generated testing assets included with the bundle.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <EnterpriseOptionCard
              type="checkbox"
              checked={testAssets.postman}
              label="MCP Postman Collection"
              description="JSON-RPC collection for tools/list and tools/call. Ready to import into Postman."
              onChange={() => toggleAsset('postman')}
            />
            <EnterpriseOptionCard
              type="checkbox"
              checked={false}
              disabled
              label="MCP Client Test Suite"
              description="Node.js/Python test scripts to call your MCP server."
              badge="Coming soon"
            />
            <EnterpriseOptionCard
              type="checkbox"
              checked={false}
              disabled
              label="ForgeFuzz Collection"
              description="Planned ForgeFuzz test asset support."
              badge="Coming soon"
            />
            <EnterpriseOptionCard
              type="checkbox"
              checked={false}
              disabled
              label="Integration Tests"
              description="Test MCP server with mocked tools/resources."
              badge="Coming soon"
            />
          </div>
        </div>

        <div className="rounded-lg border border-dark-700 bg-[#0f172a]/30 p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Test Case Scenarios</p>
          <p className="text-xs text-gray-500 mb-2">Select which types of test cases to generate for your MCP tools.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { value: 'POSITIVE', label: 'Positive', description: 'Happy-path tool calls.' },
              { value: 'NEGATIVE', label: 'Negative', description: 'Error-handling and validation failures.' },
              { value: 'PERFORMANCE', label: 'Performance', description: 'Latency and threshold tests.' },
              { value: 'SECURITY', label: 'Security', description: 'Auth and authorization tests.' },
              { value: 'SCHEMA_VALIDATION', label: 'Schema Validation', description: 'Verify response structure matches schema.' },
              { value: 'BOUNDARY', label: 'Boundary & Constraint', description: 'Test min/max limits and enums.' },
            ].map((opt) => (
              <EnterpriseOptionCard
                key={opt.value}
                type="checkbox"
                checked={selectedTestCategories.includes(opt.value)}
                label={opt.label}
                description={opt.description}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTestCategories(prev => [...prev, opt.value]);
                  } else {
                    setSelectedTestCategories(prev => prev.filter(c => c !== opt.value));
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Summary Modal ────────────────────────────────────────────────────
function SummaryModal({ state, onClose }) {
  const identity = state?.identity || {};
  const runtime = state?.runtime || {};
  const transport = state?.transport || {};
  const auth = state?.auth || {};
  const advanced = state?.advanced || {};
  const capabilities = state?.capabilities || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col bg-dark-800">
        <div className="px-6 py-4 border-b border-dark-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Configuration Summary</h3>
            <p className="text-sm text-gray-400">Review all settings before generating the MCP server.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Server Identity</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-400">Display Name:</span> <span className="text-white">{identity.displayName || '—'}</span></div>
                <div><span className="text-gray-400">Slug:</span> <span className="text-white">{identity.slug || '—'}</span></div>
                <div><span className="text-gray-400">Description:</span> <span className="text-white">{identity.description || '—'}</span></div>
              </div>
              <h4 className="text-sm font-semibold text-primary mt-4 mb-2">Runtime</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-400">Language:</span> <span className="text-white">{runtime.language || 'typescript'}</span></div>
                <div><span className="text-gray-400">Version:</span> <span className="text-white">{runtime.languageVersion || '—'}</span></div>
                <div><span className="text-gray-400">SDK Version:</span> <span className="text-white">{runtime.sdkVersion || '—'}</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Transport & Auth</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-400">Transport:</span> <span className="text-white">{transport.kind || 'streamable-http'}</span></div>
                <div><span className="text-gray-400">Base URL:</span> <span className="text-white">{transport.baseUrl || '—'}</span></div>
                <div><span className="text-gray-400">Authentication:</span> <span className="text-white">{auth.kind || 'bearer'}</span></div>
              </div>
              <h4 className="text-sm font-semibold text-primary mt-4 mb-2">Deployment & Persistence</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-400">Deployment Target:</span> <span className="text-white">{advanced.deploymentTarget || 'CLOUD_RUN'}</span></div>
                <div><span className="text-gray-400">Persistence:</span> <span className="text-white">{advanced.persistenceTarget || 'MONGODB'}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-dark-700 pt-4">
            <h4 className="text-sm font-semibold text-primary mb-2">Capabilities</h4>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-300">Tools: <span className="text-white font-semibold">{capabilities.tools?.length || 0}</span></span>
              <span className="text-gray-300">Resources: <span className="text-white font-semibold">{capabilities.resources?.length || 0}</span></span>
              <span className="text-gray-300">Prompts: <span className="text-white font-semibold">{capabilities.prompts?.length || 0}</span></span>
            </div>
          </div>

          <div className="mt-4 border-t border-dark-700 pt-4">
            <h4 className="text-sm font-semibold text-primary mb-2">Test Assets</h4>
            <div className="text-sm text-gray-300">
              <span>Postman Collection: ✅</span>
              <span className="ml-4">Test Scenarios: Positive, Negative, Performance, Security</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-dark-700 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}