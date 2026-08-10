import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, User, Building2, FolderOpen,
  Calendar, Users, Zap, Code2, AppWindow,
  AlertCircle, Globe, KeyRound, GitBranch, Server,
  Cpu, Database, Hash, Activity, BookOpen,
} from 'lucide-react';
import { getApplicationDetail, getApplications } from '../../http-service/onboardingApi';
import {
  OnbCard, Stat, Badge, Btn, SectionHead,
} from '../../components/shared/ui.jsx';
import { ProbestackSpinner } from '../../components/shared/probestack-spinner/Spinner';
import { C } from '../../utils/constants';

const statusColor = (s) => (s === 'ACTIVE' ? C.green : s === 'PENDING' ? C.amber : C.muted);

const Flag = ({ children, tone = 'border-[#2a3550] bg-dark-700/40 text-gray-300', icon: Icon }) => (
  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${tone}`}>
    {Icon && <Icon className="h-3 w-3" />}
    {children}
  </span>
);

function ApplicationDetail() {
  const { appId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [allApps, setAllApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getApplicationDetail(appId),
      getApplications({ size: 100 }),
    ])
      .then(([appData, appsData]) => {
        if (cancelled) return;
        setApp(appData);
        setAllApps(appsData);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load application.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [appId]);

  if (isLoading) return <div className="w-full p-6"><ProbestackSpinner text="Loading application…" /></div>;

  if (error || !app) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Code2 className="h-16 w-16 text-gray-500" />
        <p className="mt-4 text-lg text-gray-300">Application not found</p>
        <Btn v="primary" sm onClick={() => navigate('/gateway/onboarding')}>Back to onboarding</Btn>
      </div>
    );
  }

  // Devs surfaced from the application record
  const devs = [
    { role: 'Owner', name: app.ownerName, email: app.ownerEmail },
    { role: 'SME', name: app.applicationSme, email: app.smeEmail },
    { role: 'Tester', name: app.testerName, email: app.testerEmail },
    { role: 'ServiceNow', name: app.serviceNowGroupName, email: app.serviceNowEmail },
  ].filter((t) => t.name || t.email);

  // Other apps in the same project (drawn from the applications list)
  const siblings = allApps.filter((a) => a.projectId === app.projectId && a.id !== app.id);

  return (
    <div className="w-full space-y-5 p-6 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/gateway/onboarding" className="hover:text-primary">Onboarding</Link>
        <ChevronRight className="h-3 w-3" />
        {app.businessUnitId && (
          <Link to={`/gateway/onboarding/business-units/${app.businessUnitId}`} className="hover:text-primary">
            {app.businessUnitName}
          </Link>
        )}
        <ChevronRight className="h-3 w-3" />
        {app.projectId && (
          <Link to={`/gateway/onboarding/projects/${app.projectId}`} className="hover:text-primary">
            {app.projectName}
          </Link>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-400">{app.name}</span>
      </div>
      <SectionHead
        title={app.displayName || app.name}
        sub={app.description || 'Application ownership, AI/LLM runtime, governance, and consumer access.'}
        action={<Badge c={statusColor(app.status)}>{app.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Consumers" val={app.consumerCount || 0} col={C.cyan} icon={<Users className="h-4 w-4" />} />
        <Stat label="APIs" val={app.apiCount ?? 0} col={C.teal} icon={<Code2 className="h-4 w-4" />} />
        <Stat label="Criticality" val={app.criticality || '—'} col={C.red} icon={<AlertCircle className="h-4 w-4" />} />
        <Stat label="Runtime" val={app.runtime || '—'} col={C.amber} icon={<Cpu className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Identity</h3>
          <dl className="space-y-2.5">
            <Row label="Application ID" value={app.applicationId} mono icon={Code2} />
            <Row label="Display Name" value={app.displayName || '—'} />
            <Row label="Business Unit" value={app.businessUnitName} icon={Building2} />
            <Row label="Project" value={app.projectName} icon={FolderOpen} />
            <Row label="Capability" value={app.businessCapability || '—'} />
            <Row label="Domain" value={app.domain || '—'} icon={Globe} />
            <Row label="Application Type" value={app.applicationType || '—'} />
            <Row label="Version" value={app.version || '—'} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Runtime</h3>
          <dl className="space-y-2.5">
            <Row label="Runtime" value={app.runtime || '—'} icon={Cpu} />
            <Row label="Language" value={app.language || '—'} icon={Code2} />
            <Row label="Framework" value={app.framework || '—'} />
            <Row label="Container Image" value={app.containerImage || '—'} mono />
            <Row label="Cluster" value={app.cluster || '—'} icon={Server} />
            <Row label="Namespace" value={app.kubernetesNamespace || '—'} />
            <Row label="API Gateway" value={app.apiGateway || '—'} />
            <Row label="Base URL" value={app.baseUrl || '—'} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">AI / Agent</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {app.llmProvider && <Flag tone="border-purple-500/30 bg-purple-500/10 text-purple-300">LLM: {app.llmProvider}</Flag>}
            {app.aiGateway && <Flag tone="border-purple-500/30 bg-purple-500/10 text-purple-300">AI Gateway: {app.aiGateway}</Flag>}
            {app.mcpEnabled && <Flag tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">MCP</Flag>}
            {app.agentEnabled && <Flag tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Agent</Flag>}
            {app.multiAgentEnabled && <Flag tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Multi-Agent</Flag>}
            {app.graphqlEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">GraphQL</Flag>}
            {app.webhooksEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">Webhooks</Flag>}
          </div>
          <dl className="space-y-2.5">
            <Row label="Default Model" value={app.defaultModel || '—'} />
            <Row label="Embedding Model" value={app.embeddingModel || '—'} />
            <Row label="Vector DB" value={app.vectorDatabase || '—'} icon={Database} />
            <Row label="Prompt Registry" value={app.promptRegistry || '—'} />
            <Row label="Planner" value={app.planner || '—'} />
            <Row label="Executor" value={app.executor || '—'} />
            <Row label="Memory" value={app.memory || '—'} />
            <Row label="Workflow" value={app.workflow || '—'} icon={GitBranch} />
          </dl>
        </OnbCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Security</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {app.oauthEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">OAuth</Flag>}
            {app.jwtEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">JWT</Flag>}
            {app.apiKeyEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">API Key</Flag>}
            {app.mtlsEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">mTLS</Flag>}
            {app.dlpEnabled && <Flag tone="border-yellow-500/30 bg-yellow-500/10 text-yellow-300">DLP</Flag>}
            {app.wafEnabled && <Flag tone="border-yellow-500/30 bg-yellow-500/10 text-yellow-300">WAF</Flag>}
          </div>
          <dl className="space-y-2.5">
            <Row label="Encryption" value={app.encryptionStandard || '—'} icon={KeyRound} />
            <Row label="OpenAPI Spec" value={app.openapiSpecUrl || '—'} mono />
            <Row label="AsyncAPI Spec" value={app.asyncapiSpecUrl || '—'} mono />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Observability</h3>
          <dl className="space-y-2.5">
            <Row label="Logging" value={app.logging || '—'} icon={BookOpen} />
            <Row label="Metrics" value={app.metrics || '—'} icon={Activity} />
            <Row label="Tracing" value={app.tracing || '—'} />
            <Row label="Alerts" value={app.alerts || '—'} />
            <Row label="Dashboards" value={app.dashboards || '—'} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Cost & Org</h3>
          <dl className="space-y-2.5">
            <Row label="Cost Center" value={app.costCenter || '—'} icon={Hash} />
            <Row label="Monthly Budget" value={app.monthlyBudget?.toLocaleString() || '—'} />
            <Row label="Token Budget" value={app.tokenBudget?.toLocaleString() || '—'} />
            <Row label="API Budget" value={app.apiBudget?.toLocaleString() || '—'} />
            <Row label="Organization" value={app.organizationId} mono />
            <Row label="Created" value={app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'} icon={Calendar} />
          </dl>
        </OnbCard>
      </div>

      {app.mcpEnabled && (
        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">MCP</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Tile label="Server" value={app.mcpServer || '—'} />
            <Tile label="Resources" value={app.mcpResources || '—'} />
            <Tile label="Tools" value={app.mcpTools || '—'} />
            <Tile label="Prompts" value={app.mcpPrompts || '—'} />
          </div>
        </OnbCard>
      )}

      {/* Devs + Consumers in two distinct boxes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-teal-400" />
            <h3 className="font-heading text-sm font-semibold text-white">Devs</h3>
            <span className="ml-auto rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
              {devs.length} {devs.length === 1 ? 'person' : 'people'}
            </span>
          </div>
          <div className="space-y-2">
            {devs.map((t) => (
              <div key={t.role} className="flex items-center gap-3 rounded-md border border-[#2a3550] bg-dark-700/40 p-2">
                <User className="h-4 w-4 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">{t.role}</div>
                  <div className="truncate text-sm font-medium text-white">{t.name || '—'}</div>
                  {t.email && <div className="truncate text-xs text-gray-500">{t.email}</div>}
                </div>
              </div>
            ))}
            {devs.length === 0 && <div className="text-sm text-gray-500">No team members assigned.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            <h3 className="font-heading text-sm font-semibold text-white">Consumers</h3>
            <span className="ml-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
              {app.consumerIds?.length || 0} attached
            </span>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Consumer Count</div>
              <div className="text-2xl font-semibold text-white">{app.consumerCount || 0}</div>
            </div>
            {app.consumerIds && app.consumerIds.length > 0 && (
              <div className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Consumer IDs</div>
                <div className="flex flex-wrap gap-1.5">
                  {app.consumerIds.map((id) => (
                    <span key={id} className="rounded border border-[#2a3550] bg-[#1a1f2e] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {siblings.length > 0 && (
        <OnbCard>
          <div className="mb-3 flex items-center gap-2">
            <AppWindow className="h-4 w-4 text-purple-400" />
            <h3 className="font-heading text-sm font-semibold text-white">Other Apps in {app.projectName}</h3>
            <span className="ml-auto text-xs text-gray-500">{siblings.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {siblings.map((s) => (
              <Link
                key={s.id}
                to={`/gateway/onboarding/applications/${s.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-200 hover:bg-white/[0.05]"
              >
                <AppWindow className="h-3.5 w-3.5 text-[#7B5FFF]" />
                <span className="font-medium">{s.name}</span>
                <span className="font-mono text-[10px] text-gray-500">{s.applicationId}</span>
                <span className="text-xs text-gray-500">· {s.consumerCount ?? 0} consumers</span>
                <Badge c={statusColor(s.status)} className="ml-auto">{s.status}</Badge>
              </Link>
            ))}
          </div>
        </OnbCard>
      )}
    </div>
  );
}

const Row = ({ label, value, sub, icon: Icon, mono }) => (
  <div className="flex items-start gap-2">
    {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 text-gray-500" />}
    <div className="min-w-0 flex-1">
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className={`truncate text-sm text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
      {sub && <dd className="truncate text-xs text-gray-500">{sub}</dd>}
    </div>
  </div>
);

const Tile = ({ label, value }) => (
  <div className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-sm text-white">{value}</div>
  </div>
);

export default ApplicationDetail;
