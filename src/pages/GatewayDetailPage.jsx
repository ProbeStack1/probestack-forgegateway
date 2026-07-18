import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Eye, UserCircle, FileText, PenTool, Code, Users, Shield, Server,
  ArrowLeft, ChevronRight, ClipboardCheck, CheckCircle, FlaskConical,
  GitBranch, Network, History, FileCode, TestTube, FileCode2,
} from 'lucide-react';
import { onboardingService } from '../services/onboardingService';
import { contractTestingService } from '../services/contractTestingService';

export default function GatewayDetailPage({ isKong = false, backPath = '/proxy-generate' }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Resource Details');
  const [details, setDetails] = useState(null);
  const [contractHistory, setContractHistory] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    onboardingService.getResourceDetails(id).then(async (result) => {
      if (!result.success) {
        setError(result.error || 'Failed to load resource details');
        setLoading(false);
        return;
      }
      const unwrapped = result?.data?.data || result?.data || result || {};
      const ms = unwrapped?.resource?.microservice || unwrapped?.microservice || unwrapped?.resource || {};
      setTitle(ms.apiName || ms.applicationName || 'Resource Details');
      setDetails(unwrapped);

      const onboardingId = unwrapped?.resource?.microservice?.id || unwrapped?.microservice?.id || id;
      const contractResult = await contractTestingService.getHistory(onboardingId, 0, 50);
      if (contractResult.success) {
        setContractHistory(contractResult.data?.data?.content || contractResult.data?.data || []);
      }
      setLoading(false);
    });
  }, [id]);

  const allViewSteps = [
    { id: 1,  name: 'Onboarding',                                              icon: UserCircle,   description: 'Application & team info' },
    { id: 2,  name: 'Requirement',                                             icon: FileText,     description: 'Functional requirements' },
    { id: 3,  name: isKong ? 'Service Design' : 'Proxy Design',               icon: PenTool,      description: 'Spec & design details' },
    { id: 4,  name: isKong ? 'Service Design Validation' : 'Proxy Design Validation', icon: CheckCircle, description: 'Design validation' },
    { id: 5,  name: 'Mock Service',                                            icon: FlaskConical, description: 'Mock service data' },
    { id: 6,  name: 'Contract Testing & Approval',                             icon: Shield,       description: 'Consumers & contracts' },
    { id: 7,  name: isKong ? 'Service Development' : 'Proxy Development',     icon: Network,      description: 'Generated artifacts' },
    { id: 8,  name: 'Test Cases',                                              icon: FileCode,     description: 'Test case results' },
    { id: 9,  name: 'Code Analysis',                                           icon: TestTube,     description: 'Code analysis results' },
    { id: 10, name: 'Code Review',                                             icon: GitBranch,    description: 'Review results' },
    { id: 11, name: 'Complete',                                                icon: CheckCircle,  description: 'Deployment status' },
  ];
  const viewSteps = allViewSteps;

  const data = details || {};
  const microserviceData = data?.resource?.microservice || data?.microservice || data?.resource || {};
  const requirementData  = data?.requirement || data?.resource?.requirement || {};
  const apiDesignData    = data?.apiDesign || data?.resource?.apiDesign || data?.designData || {};
  const consumerData     = data?.consumerInformation || data?.resource?.consumerInformation || [];
  const projectMetadata  = data?.projectMetadata || data?.resource?.projectMetadata || {};
  const rawCodegen       = data?.codegenResults || data?.resource?.codegenResults;
  const codegenData = Array.isArray(rawCodegen)
    ? rawCodegen.map((cg) => ({
        ...cg,
        archiveDownloadUrl: cg?.archiveDownloadUrl || cg?.archivePath || cg?.sourceArchivePath || 'N/A',
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
                ([k, v]) => !shouldHide(k) && typeof v !== 'object' && !Array.isArray(v)
              );
              return (
                <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">Consumer {idx + 1}</div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                    {fields.map(([key, value]) => fieldBlock(formatLabel(key), value))}
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
    return (
      <div className="space-y-4">
        {specFields.length > 0 && sectionCard('Spec Metadata', PenTool, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">{specFields.map(([l, v]) => fieldBlock(l, v))}</div>
        ))}
        {designFields.length > 0 && sectionCard('Design Details', Code, (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">{designFields.map(([l, v]) => fieldBlock(l, v))}</div>
        ))}
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

    const statusMap = {
      SENT: 'bg-amber-500/15 text-amber-300',
      IN_PROGRESS: 'bg-yellow-500/15 text-yellow-300',
      APPROVED: 'bg-green-500/15 text-green-300',
      REJECTED: 'bg-red-500/15 text-red-300',
    };
    const statusLabel = { SENT: 'Requested', IN_PROGRESS: 'Under Review', APPROVED: 'Approved', REJECTED: 'Rejected' };
    const statusBadge = (status) => {
      if (!status) return <span className="inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">Not Initiated</span>;
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[status] || 'bg-white/[0.06] text-slate-400'}`}>{statusLabel[status] || status}</span>;
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
                ([k, v]) => !shouldHide(k) && typeof v !== 'object' && !Array.isArray(v)
              );
              return (
                <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#0f172a]/40 px-4 py-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ffb08c]">Consumer {idx + 1}</div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                    {fields.map(([key, value]) => fieldBlock(formatLabel(key), value))}
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
            ([k, v]) => !shouldHide(k) && typeof v !== 'object' && !Array.isArray(v)
          );
          return sectionCard(`Generation Run ${idx + 1}`, Network, (
            <div key={`cg-${idx}`} className="grid grid-cols-2 gap-x-8 gap-y-0">
              {fields.map(([key, value]) => fieldBlock(formatLabel(key), value))}
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
    const stepId = viewSteps[activeStep]?.id;
    switch (stepId) {
      case 1:  return renderOnboardingContent();
      case 2:  return renderRequirementContent();
      case 3:  return renderDesignContent();
      case 4:  return emptyState('No design validation data available');
      case 5:  return emptyState('No mock service data available');
      case 6:  return renderContractTestingContent();
      case 7:  return renderDevelopmentContent();
      case 8:  return emptyState('No test case data available');
      case 9:  return emptyState('No code analysis data available');
      case 10: return emptyState('No code review data available');
      case 11: return renderCompleteContent();
      default: return null;
    }
  };

  const getCodeGenResults = () => {
    const sources = [
      data?.codeGenResults,
      data?.resource?.codeGenResults,
      data?.resource?.microservice?.codeGenResults,
      microserviceData?.codeGenResults,
    ];
    return sources.find(Array.isArray) || [];
  };

  const getRepoCloneUrl = () => {
    const scm = data?.connectorConfiguration?.sourceCodeManagement
      || data?.resource?.connectorConfiguration?.sourceCodeManagement
      || data?.resource?.microservice?.connectorConfiguration?.sourceCodeManagement
      || microserviceData?.connectorConfiguration?.sourceCodeManagement
      || microserviceData?.sourceCodeManagement
      || {};
    const scmRepo = String(scm?.repo || scm?.repository || scm?.repoName || '').trim().replace(/\.git$/i, '');
    const scmOwner = String(scm?.orgOrUser || scm?.organization || scm?.owner || '').trim();
    const scmProvider = String(scm?.type || scm?.provider || '').toUpperCase();
    const connectorCloneUrl = scmRepo
      ? scmRepo.startsWith('http')
        ? `${scmRepo}.git`
        : scmProvider === 'GITHUB' && scmOwner
          ? `https://github.com/${scmOwner}/${scmRepo}.git`
          : scmProvider === 'GITLAB' && scmOwner
            ? `https://gitlab.com/${scmOwner}/${scmRepo}.git`
            : ''
      : '';

    const codeGenArr = getCodeGenResults();
    const codeGen = codeGenArr.find((r) => r?.status === 'SUCCESS') || codeGenArr[0] || {};

    return (
      data?.repoCloneUrl || data?.repositoryCloneUrl || data?.cloneUrl || data?.clone_url
      || data?.gitCloneUrl || data?.pushedRepoUrl || data?.repoUrl
      || microserviceData?.repoCloneUrl || microserviceData?.repositoryCloneUrl || microserviceData?.cloneUrl
      || microserviceData?.clone_url || microserviceData?.gitCloneUrl || microserviceData?.pushedRepoUrl
      || microserviceData?.repoUrl
      || scm?.repoCloneUrl || scm?.repositoryCloneUrl || scm?.cloneUrl || scm?.clone_url
      || scm?.gitCloneUrl || scm?.repoUrl
      || connectorCloneUrl
      || codeGen?.repoCloneUrl || codeGen?.repositoryCloneUrl || codeGen?.cloneUrl
      || codeGen?.clone_url || codeGen?.gitCloneUrl || codeGen?.pushedRepoUrl || codeGen?.repoUrl
      || ''
    );
  };

  const getEditorZipUrl = () => {
    const codeGenArr = getCodeGenResults();
    const codeGen = codeGenArr.find((r) => r?.status === 'SUCCESS') || codeGenArr[0] || {};
    return (
      data?.archiveDownloadUrl || data?.archivePath || data?.sourceArchivePath || data?.zipUrl || data?.bundleUrl
      || microserviceData?.archiveDownloadUrl || microserviceData?.archivePath
      || microserviceData?.sourceArchivePath || microserviceData?.zipUrl || microserviceData?.bundleUrl
      || codeGen?.archiveDownloadUrl || codeGen?.archivePath || codeGen?.sourceArchivePath
      || codeGen?.zipUrl || codeGen?.bundleUrl || ''
    );
  };

  const openInVSCode = () => {
    const url = getRepoCloneUrl();
    if (url) window.location.href = `vscode://vscode.git/clone?url=${encodeURIComponent(url)}`;
  };

  const openInProxyEditor = () => {
    const zipUrl = getEditorZipUrl();
    if (!zipUrl) return;
    navigate('/proxy-editor', {
      state: {
        zipUrl,
        selectedProxyName: title,
        backTo: `${backPath}/${id}`,
        backState: {},
      },
    });
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b1121] overflow-x-hidden">
      <div className="flex min-h-0 flex-1 flex-col">

        {/* Page Header */}
        <div className="flex items-center gap-4 border-b border-white/[0.08] bg-[radial-gradient(ellipse_at_top_left,rgba(255,91,31,0.14),transparent_40%),#141d35] px-7 py-5">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/25 bg-[#ff5b1f]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffb08c]">
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
                {viewSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeStep === index;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(index)}
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

            {/* Progress strip */}
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
          {!isKong && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openInVSCode}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ff5b1f] bg-transparent px-4 py-2 text-sm font-semibold text-[#ff8a5c] transition hover:bg-[#ff5b1f]/10 hover:text-[#ffb08c]"
              >
                <Code className="h-4 w-4" />
                Open in VS Code
              </button>
              <button
                type="button"
                onClick={openInProxyEditor}
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
}
