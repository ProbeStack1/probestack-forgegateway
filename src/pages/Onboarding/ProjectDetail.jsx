import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Building2, FolderTree, AppWindow,
  Users, Hash, Mail, Shield, KeyRound, Calendar,
  GitBranch, Code2, Cloud,
} from 'lucide-react';
import { getProjects, getApplications } from '../../http-service/onboardingApi';
import {
  OnbCard, Stat, Badge, Btn, SectionHead,
} from '../../components/shared/ui.jsx';
import { ProbestackSpinner } from '../../components/shared/probestack-spinner/Spinner';
import { C } from '../../utils/constants';

const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (['active', 'approved', 'live', 'ready'].includes(s)) return C.green;
  if (['pending', 'draft', 'in_progress', 'in-progress'].includes(s)) return C.amber;
  if (['inactive', 'deprecated', 'archived', 'rejected'].includes(s)) return C.dim;
  return C.muted;
};

const Flag = ({ children, tone = 'border-[#2a3550] bg-dark-700/40 text-gray-300', icon: Icon }) => (
  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${tone}`}>
    {Icon && <Icon className="h-3 w-3" />}
    {children}
  </span>
);

function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [allProjects, setAllProjects] = useState([]);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getProjects(),
      getApplications({ projectId, size: 100 }),
    ])
      .then(([projectsData, appsData]) => {
        if (cancelled) return;
        setAllProjects(projectsData);
        setApps(appsData);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load project.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const project = useMemo(
    () => allProjects.find((p) => p.id === projectId),
    [allProjects, projectId]
  );

  const totalConsumers = useMemo(
    () => apps.reduce((s, a) => s + (a.consumerCount || 0), 0),
    [apps]
  );

  if (isLoading) return <div className="w-full p-6"><ProbestackSpinner text="Loading project…" /></div>;

  if (error || !project) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <FolderTree className="h-16 w-16 text-gray-500" />
        <p className="mt-4 text-lg text-gray-300">Project not found</p>
        <Btn v="primary" sm onClick={() => navigate('/gateway/onboarding')}>Back to onboarding</Btn>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 p-6 pb-10">
      <button
        onClick={() => navigate(`/gateway/onboarding/business-units/${project.businessUnitId}`)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {project.businessUnitName}
      </button>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/gateway/onboarding" className="hover:text-primary">Onboarding</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/gateway/onboarding/business-units/${project.businessUnitId}`} className="hover:text-primary">
          {project.businessUnitName}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-400">{project.name}</span>
      </div>
      <SectionHead
        title={project.name}
        sub={project.description || 'Project ownership, delivery model, security posture, and the applications beneath it.'}
        action={<Badge c={statusColor(project.status)}>{project.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Applications" val={apps.length} col={C.cyan} icon={<AppWindow className="h-4 w-4" />} />
        <Stat label="Consumers" val={totalConsumers} col={C.orange} icon={<Users className="h-4 w-4" />} />
        <Stat label="Delivery Model" val={project.deliveryModel || '—'} col={C.teal} icon={<FolderTree className="h-4 w-4" />} />
        <Stat label="Go-Live" val={project.expectedGoLiveDate || '—'} col={C.purple} icon={<Calendar className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Identity</h3>
          <dl className="space-y-2.5">
            <Row label="Code" value={project.code} mono icon={Hash} />
            <Row label="BU" value={project.businessUnitName} icon={Building2} />
            <Row label="Project Type" value={project.projectType || '—'} />
            <Row label="Portfolio" value={project.portfolio || '—'} />
            <Row label="Owner" value={project.ownerName || '—'} sub={project.ownerEmail} icon={Mail} />
            <Row label="Project DL" value={project.projectDlEmail || '—'} icon={Mail} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Delivery</h3>
          <dl className="space-y-2.5">
            <Row label="Delivery Model" value={project.deliveryModel || '—'} />
            <Row label="Methodology" value={project.methodology || '—'} />
            <Row label="Sprint Duration" value={project.sprintDuration || '—'} />
            <Row label="Repository" value={project.repository || '—'} icon={GitBranch} />
            <Row label="CI/CD" value={project.cicdTool || '—'} icon={Code2} />
            <Row label="Issue Tracker" value={project.issueTracker || '—'} />
            <Row label="Docs URL" value={project.documentationUrl || '—'} />
            <Row label="Secrets Vault" value={project.secretsVault || '—'} icon={KeyRound} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Security Posture</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {project.pciApplicable && <Flag tone="border-red-500/30 bg-red-500/10 text-red-300">PCI</Flag>}
            {project.owaspTop10Enabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">OWASP Top 10</Flag>}
            {project.lintingEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">Linting</Flag>}
            {project.mtlsEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">mTLS</Flag>}
            {project.jwtEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">JWT</Flag>}
            {project.apiKeyEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">API Key</Flag>}
            {project.oauthProvider && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">OAuth: {project.oauthProvider}</Flag>}
          </div>
          <dl className="space-y-2.5">
            <Row label="Auth Method" value={project.authenticationMethod || '—'} icon={Shield} />
            <Row label="Authz Method" value={project.authorizationMethod || '—'} icon={Shield} />
            <Row label="OAuth Provider" value={project.oauthProvider || '—'} icon={Cloud} />
            <Row label="Standard Rules" value={project.standardRules || '—'} />
            <Row label="Custom Rules" value={project.customRules || '—'} />
          </dl>
        </OnbCard>
      </div>

      {project.environments?.length > 0 && (
        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Environments</h3>
          <div className="flex flex-wrap gap-1.5">
            {project.environments.map((env) => (
              <span key={env} className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">{env}</span>
            ))}
          </div>
        </OnbCard>
      )}

      <h2 className="pt-2 font-heading text-lg font-semibold text-white">Applications</h2>
      <div className="flex flex-col gap-2.5">
        {apps.length === 0 && (
          <OnbCard className="py-8 text-center text-sm text-gray-400">No applications under this project yet.</OnbCard>
        )}
        {apps.map((app) => (
          <Link
            key={app.id}
            to={`/gateway/onboarding/applications/${app.id}`}
            className="block"
          >
            <OnbCard className="p-4 transition-all hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-white">{app.name}</span>
                    <span className="rounded border border-[#2a3550] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">{app.applicationId}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Owner: {app.ownerName || '—'}{app.ownerEmail ? ` · ${app.ownerEmail}` : ''}
                  </div>
                </div>
                <Badge c={statusColor(app.status)}>{app.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <Tile label="Consumers" value={app.consumerCount ?? 0} />
                <Tile label="Criticality" value={app.criticality || '—'} />
                <Tile label="Runtime" value={app.runtime || '—'} />
                <Tile label="Language" value={app.language || '—'} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                {app.llmProvider && <Flag tone="border-purple-500/30 bg-purple-500/10 text-purple-300">LLM: {app.llmProvider}</Flag>}
                {app.aiGateway && <Flag tone="border-purple-500/30 bg-purple-500/10 text-purple-300">AI Gateway: {app.aiGateway}</Flag>}
                {app.mcpEnabled && <Flag tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">MCP</Flag>}
                {app.agentEnabled && <Flag tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Agent</Flag>}
                {app.graphqlEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">GraphQL</Flag>}
                {app.webhooksEnabled && <Flag tone="border-green-500/30 bg-green-500/10 text-green-300">Webhooks</Flag>}
                {app.wafEnabled && <Flag tone="border-yellow-500/30 bg-yellow-500/10 text-yellow-300">WAF</Flag>}
                {app.dlpEnabled && <Flag tone="border-yellow-500/30 bg-yellow-500/10 text-yellow-300">DLP</Flag>}
              </div>
            </OnbCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

const Row = ({ label, value, sub, icon: Icon }) => (
  <div className="flex items-start gap-2">
    {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 text-gray-500" />}
    <div className="min-w-0 flex-1">
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="truncate text-sm text-white">{value || '—'}</dd>
      {sub && <dd className="truncate text-xs text-gray-500">{sub}</dd>}
    </div>
  </div>
);

const Tile = ({ label, value }) => (
  <div className="rounded border border-[#2a3550] bg-dark-700/40 p-2">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-base font-semibold text-white">{value}</div>
  </div>
);

export default ProjectDetail;
