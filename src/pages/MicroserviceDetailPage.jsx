import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Eye, UserCircle, FileText, PenTool, Code, Users, Shield, Server,
  ArrowLeft, ChevronRight, ClipboardCheck,
} from 'lucide-react';
import { onboardingService } from '../services/onboardingService';

export default function MicroserviceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Microservice Details');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    onboardingService.getResourceDetails(id).then((result) => {
      if (!result.success) {
        setError(result.error || 'Failed to load resource details');
        setLoading(false);
        return;
      }
      const data = result?.data?.data || result?.data || result || {};
      const ms = data?.resource?.microservice || data?.microservice || data?.resource || {};
      setTitle(ms.apiName || ms.applicationName || 'Microservice Details');
      setDetails(data);
      setLoading(false);
    });
  }, [id]);

  const viewSteps = [
    { id: 0, name: 'Onboarding',   icon: UserCircle, description: 'Application & team info' },
    { id: 1, name: 'Requirements', icon: FileText,    description: 'Functional requirements' },
    { id: 2, name: 'API Design',   icon: PenTool,     description: 'Spec & design details' },
    { id: 3, name: 'Consumers',    icon: Users,        description: 'Consumer information' },
    { id: 4, name: 'Development',  icon: Code,         description: 'Code generation results' },
    { id: 5, name: 'Deployment',   icon: Server,       description: 'Deployment history' },
  ];

  const data = details || {};
  const microserviceData = data?.resource?.microservice || data?.microservice || data?.resource || {};
  const requirementData  = data?.requirement || data?.resource?.requirement || {};
  const apiDesignData    = data?.apiDesign || data?.resource?.apiDesign || data?.designData || {};
  const consumerData     = data?.consumerInformation || data?.resource?.consumerInformation || [];
  const projectMetadata  = data?.projectMetadata || data?.resource?.projectMetadata || {};
  const rawCodegen       = data?.codegenResults || data?.resource?.codegenResults;
  const codegenData = Array.isArray(rawCodegen)
    ? rawCodegen.map((cg) => ({
        archiveDownloadUrl: cg?.archiveDownloadUrl || cg?.archivePath || cg?.sourceArchivePath || 'N/A',
        status: cg?.status,
        createdAt: cg?.createdAt,
      }))
    : [];
  const deploymentData = data?.deploymentHistory || data?.resource?.deploymentHistory || data?.deployments || [];

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  const isLong = (value) => {
    const str = formatValue(value);
    return str.length > 80 || /^https?:\/\//i.test(str);
  };

  const formatLabel = (key) =>
    String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const shouldHide = (key) => String(key).toLowerCase() === 'steps';

  const copyValue = async (value) => {
    await navigator.clipboard.writeText(formatValue(value));
  };

  const fieldBlock = (label, value) => {
    if (value === null || value === undefined || value === '') return null;
    const strVal = formatValue(value);
    if (strVal === 'N/A') return null;
    const long = isLong(value);
    return (
      <div key={label} className="min-w-0 border-b border-white/[0.06] pb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        {long ? (
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100" title={strVal}>{strVal}</div>
            <button
              type="button"
              onClick={() => copyValue(value)}
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

  const sectionCard = (cardTitle, Icon, children) => (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2.5">
        {Icon && (
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ff5b1f]/15">
            <Icon className="h-3.5 w-3.5 text-[#ffb08c]" />
          </div>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">{cardTitle}</span>
      </div>
      {children}
    </div>
  );

  const emptyState = (msg) => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
        <Eye className="h-5 w-5 text-slate-600" />
      </div>
      <div className="text-sm font-medium text-slate-500">{msg}</div>
    </div>
  );

  const renderOnboardingStep = () => {
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

    if (basicFields.length === 0 && ownerFields.length === 0 && supportFields.length === 0 && !loading) {
      return emptyState('No onboarding information available');
    }
    return (
      <div className="space-y-4">
        {basicFields.length > 0 && sectionCard('Basic Info', Server, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            {basicFields.map(([label, value]) => fieldBlock(label, value))}
          </div>
        ))}
        {ownerFields.length > 0 && sectionCard('Ownership', UserCircle, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            {ownerFields.map(([label, value]) => fieldBlock(label, value))}
          </div>
        ))}
        {supportFields.length > 0 && sectionCard('Timelines & Support', FileText, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            {supportFields.map(([label, value]) => fieldBlock(label, value))}
          </div>
        ))}
      </div>
    );
  };

  const renderRequirementStep = () => {
    const r = requirementData;
    if (!r.functionalRequirements && !r.nonFunctionalRequirements && !loading) {
      return emptyState('No requirements defined yet');
    }
    return (
      <div className="space-y-4">
        {r.functionalRequirements && sectionCard('Functional Requirements', FileText, (
          <div className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#0f172a]/60 p-4 text-sm leading-relaxed text-slate-200">
            {r.functionalRequirements}
          </div>
        ))}
        {r.nonFunctionalRequirements && sectionCard('Non-Functional Requirements', Shield, (
          <div className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#0f172a]/60 p-4 text-sm leading-relaxed text-slate-200">
            {r.nonFunctionalRequirements}
          </div>
        ))}
      </div>
    );
  };

  const renderApiDesignStep = () => {
    const d = apiDesignData;
    const specMeta = d?.specMetadata || {};
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

    if (specFields.length === 0 && designFields.length === 0 && !loading) {
      return emptyState('No API design linked yet');
    }
    return (
      <div className="space-y-4">
        {specFields.length > 0 && sectionCard('Spec Metadata', PenTool, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            {specFields.map(([label, value]) => fieldBlock(label, value))}
          </div>
        ))}
        {designFields.length > 0 && sectionCard('Design Details', Code, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            {designFields.map(([label, value]) => fieldBlock(label, value))}
          </div>
        ))}
      </div>
    );
  };

  const renderConsumersStep = () => {
    const list = Array.isArray(consumerData) ? consumerData : [];
    if (list.length === 0 && !loading) return emptyState('No consumers registered');
    return (
      <div className="space-y-3">
        {list.map((consumer, idx) => {
          const fields = Object.entries(consumer).filter(
            ([k, v]) => !shouldHide(k) && typeof v !== 'object' && !Array.isArray(v)
          );
          return sectionCard(`Consumer ${idx + 1}`, Users, (
            <div key={`consumer-${idx}`} className="grid grid-cols-2 gap-x-8 gap-y-0">
              {fields.map(([key, value]) => fieldBlock(formatLabel(key), value))}
            </div>
          ));
        })}
      </div>
    );
  };

  const renderDevelopmentStep = () => {
    if (codegenData.length === 0 && !loading) return emptyState('No code generation results available');
    return (
      <div className="space-y-3">
        {codegenData.map((cg, idx) => sectionCard(`Run ${idx + 1}`, Code, (
          <div key={`cg-${idx}`} className="space-y-0">
            {fieldBlock('Archive URL', cg.archiveDownloadUrl)}
            {fieldBlock('Status', cg.status)}
            {fieldBlock('Created At', cg.createdAt)}
          </div>
        )))}
      </div>
    );
  };

  const renderDeploymentStep = () => {
    const list = Array.isArray(deploymentData) ? deploymentData : [];
    if (list.length === 0 && !loading) return emptyState('No deployment records found');
    return (
      <div className="space-y-3">
        {list.map((dep, idx) => {
          const fields = Object.entries(dep).filter(
            ([k, v]) => !shouldHide(k) && typeof v !== 'object' && !Array.isArray(v)
          );
          return sectionCard(`Deployment ${idx + 1}`, Server, (
            <div key={`dep-${idx}`} className="grid grid-cols-2 gap-x-8 gap-y-0">
              {fields.map(([key, value]) => fieldBlock(formatLabel(key), value))}
            </div>
          ));
        })}
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
    if (loading) return loadingSkeleton;
    switch (activeStep) {
      case 0: return renderOnboardingStep();
      case 1: return renderRequirementStep();
      case 2: return renderApiDesignStep();
      case 3: return renderConsumersStep();
      case 4: return renderDevelopmentStep();
      case 5: return renderDeploymentStep();
      default: return null;
    }
  };

  const getRepoCloneUrl = () => {
    const codeGenResults = Array.isArray(data?.codeGenResults) ? data.codeGenResults
      : Array.isArray(microserviceData?.codeGenResults) ? microserviceData.codeGenResults : [];
    const codeGen = codeGenResults.find((r) => r?.status === 'SUCCESS') || codeGenResults[0] || {};
    return (
      data?.repoCloneUrl || data?.repositoryCloneUrl || data?.cloneUrl
      || microserviceData?.repoCloneUrl || microserviceData?.repositoryCloneUrl || microserviceData?.cloneUrl
      || codeGen?.repositoryCloneUrl || codeGen?.cloneUrl || codeGen?.pushedRepoUrl || ''
    );
  };

  const openInVSCode = () => {
    const url = getRepoCloneUrl();
    if (url) window.location.href = `vscode://vscode.git/clone?url=${encodeURIComponent(url)}`;
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b1121] overflow-x-hidden">
      <div className="flex min-h-0 flex-1 flex-col">

        {/* Page Header */}
        <div className="flex items-center gap-4 border-b border-white/[0.08] bg-[radial-gradient(ellipse_at_top_left,rgba(255,91,31,0.18),transparent_40%),#141d35] px-7 py-5">
          <button
            type="button"
            onClick={() => navigate('/generate')}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8a5c]/25 bg-[#ff5b1f]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffb08c]">
              <Eye className="h-3 w-3" />
              Resource Details
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Step {activeStep + 1} of {viewSteps.length} — {viewSteps[activeStep]?.name}
            </p>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex min-h-0 flex-1">

          {/* Left step sidebar */}
          <div className="flex w-52 flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#0e1628]/60">
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 px-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-600">Lifecycle</p>
              <div className="space-y-0.5">
                {viewSteps.map((step) => {
                  const Icon = step.icon;
                  const isActive = activeStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                        isActive ? 'bg-[#ff5b1f]/12 ring-1 ring-[#ff5b1f]/20' : 'hover:bg-white/[0.03]'
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

            {/* Progress strip */}
            <div className="flex-shrink-0 border-t border-white/[0.06] px-5 py-4">
              <div className="mb-1.5 flex items-center justify-between text-[9px] text-slate-600">
                <span>Progress</span>
                <span>{activeStep + 1}/{viewSteps.length}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff5b1f] to-[#ff8a5c] transition-all duration-300"
                  style={{ width: `${((activeStep + 1) / viewSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {error}. Showing available data.
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
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={activeStep === viewSteps.length - 1}
              onClick={() => setActiveStep((s) => Math.min(viewSteps.length - 1, s + 1))}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={openInVSCode}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/20 transition hover:bg-[#ff6b36]"
          >
            <Code className="h-4 w-4" />
            Open in VS Code
          </button>
        </div>
      </div>
    </div>
  );
}
