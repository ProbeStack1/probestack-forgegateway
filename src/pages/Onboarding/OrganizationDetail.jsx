import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, ChevronDown, Building2, FolderTree,
  AppWindow, Users, Hash, Mail, Shield, Tag, Sparkles,
  Server, Cloud, KeyRound, ScrollText,
} from 'lucide-react';
import {
  getBusinessUnits, getProjects, getApplications,
} from '../../http-service/onboardingApi';
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

const buildTone = (color) => {
  if (color === C.red) return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (color === C.amber) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
  if (color === C.green) return 'border-green-500/30 bg-green-500/10 text-green-300';
  if (color === C.purple) return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
  if (color === C.cyan) return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  return 'border-[#2a3550] bg-dark-700/40 text-gray-300';
};

function BusinessUnitDetail() {
  const { buId } = useParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const [bus, setBus] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getBusinessUnits(),
      getProjects(),
      getApplications({ businessUnitId: buId, size: 100 }),
    ])
      .then(([busData, projectsData, appsData]) => {
        if (cancelled) return;
        setBus(busData);
        setAllProjects(projectsData);
        setAllApps(appsData);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load business unit.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [buId]);

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const bu = useMemo(() => bus.find((b) => b.id === buId), [bus, buId]);

  const projects = useMemo(
    () => allProjects.filter((p) => p.businessUnitId === buId),
    [allProjects, buId]
  );

  const appsByProject = useMemo(() => {
    const map = {};
    allApps.forEach((a) => {
      (map[a.projectId] = map[a.projectId] || []).push(a);
    });
    return map;
  }, [allApps]);

  const totalConsumers = useMemo(
    () => allApps.reduce((s, a) => s + (a.consumerCount || 0), 0),
    [allApps]
  );

  if (isLoading) return <div className="w-full p-6"><ProbestackSpinner text="Loading business unit…" /></div>;

  if (error || !bu) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Building2 className="h-16 w-16 text-gray-500" />
        <p className="mt-4 text-lg text-gray-300">Business unit not found</p>
        <Btn v="primary" sm onClick={() => navigate('/gateway/onboarding')}>Back to onboarding</Btn>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 p-6 pb-10">
      <button
        onClick={() => navigate('/gateway/onboarding')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to onboarding
      </button>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/gateway/onboarding" className="hover:text-primary">Onboarding</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-400">{bu.name}</span>
      </div>
      <SectionHead
        title={bu.displayName || bu.name}
        sub={bu.description || 'Business unit ownership, classification, and the project tree with applications nested under each project.'}
        action={<Badge c={statusColor(bu.status)}>{bu.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Projects" val={projects.length} col={C.cyan} icon={<FolderTree className="h-4 w-4" />} />
        <Stat label="Applications" val={allApps.length} col={C.purple} icon={<AppWindow className="h-4 w-4" />} />
        <Stat label="Consumers" val={totalConsumers} col={C.orange} icon={<Users className="h-4 w-4" />} />
        <Stat label="SLA Tier" val={bu.slaTier || '—'} col={C.amber} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Identity</h3>
          <dl className="space-y-2.5">
            <Row label="Code" value={bu.code} mono icon={Hash} />
            <Row label="Division" value={bu.division || '—'} />
            <Row label="Department" value={bu.department || '—'} />
            <Row label="Line of Business" value={bu.lineOfBusiness || '—'} />
            <Row label="Cost Center" value={bu.costCenter || '—'} />
            <Row label="Billing Account" value={bu.billingAccount || '—'} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Ownership</h3>
          <dl className="space-y-2.5">
            <Row label="Owner" value={bu.ownerName || '—'} sub={bu.ownerEmail} icon={Mail} />
            <Row label="Business Executive" value={bu.businessExecutiveId || '—'} icon={Building2} />
            <Row label="Business Owner" value={bu.businessOwnerId || '—'} icon={Building2} />
            <Row label="Product Owner" value={bu.productOwnerId || '—'} icon={Building2} />
            <Row label="Technical Owner" value={bu.technicalOwnerId || '—'} icon={Building2} />
            <Row label="Enterprise Architect" value={bu.enterpriseArchitectId || '—'} icon={Building2} />
            <Row label="Platform Owner" value={bu.platformOwnerId || '—'} icon={Building2} />
            <Row label="Security Owner" value={bu.securityOwnerId || '—'} icon={Shield} />
            <Row label="Compliance Officer" value={bu.complianceOfficerId || '—'} icon={Shield} />
            <Row label="Support Team" value={bu.supportTeam || '—'} />
            <Row label="Operations Team" value={bu.operationsTeam || '—'} />
          </dl>
        </OnbCard>

        <OnbCard>
          <h3 className="mb-3 font-heading text-sm font-semibold text-white">Risk & Infra</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {bu.slaTier && <Flag tone={buildTone(C.purple)} icon={Sparkles}>SLA {bu.slaTier}</Flag>}
            {bu.businessCriticality && <Flag tone={buildTone(C.red)} icon={Shield}>{bu.businessCriticality}</Flag>}
            {bu.riskClassification && <Flag tone={buildTone(C.amber)} icon={Shield}>{bu.riskClassification}</Flag>}
            {bu.dataClassification && <Flag tone={buildTone(C.cyan)} icon={KeyRound}>{bu.dataClassification}</Flag>}
            {bu.drEnabled && <Flag tone={buildTone(C.green)}>DR-Enabled</Flag>}
          </div>
          <dl className="space-y-2.5">
            <Row label="Cloud" value={bu.cloudProvider || '—'} icon={Cloud} />
            <Row label="Region" value={bu.region || '—'} icon={Tag} />
            <Row label="Cluster" value={bu.kubernetesCluster || '—'} icon={Server} />
            <Row label="Namespace" value={bu.namespace || '—'} />
            <Row label="API Gateway" value={bu.apiGateway || '—'} />
            <Row label="AI Gateway" value={bu.aiGateway || '—'} />
            <Row label="Logs" value={bu.loggingPlatform || '—'} icon={ScrollText} />
            <Row label="Monitoring" value={bu.monitoringPlatform || '—'} />
            <Row label="Secrets" value={bu.secretManager || '—'} icon={KeyRound} />
            <Row label="Approval" value={bu.approvalWorkflow || '—'} />
          </dl>
        </OnbCard>
      </div>

      <OnbCard>
        <h3 className="mb-3 font-heading text-sm font-semibold text-white">Budget & Compliance</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Budget label="Monthly" value={bu.monthlyBudget} />
          <Budget label="Annual" value={bu.annualBudget} />
          <Budget label="API" value={bu.apiBudget} />
          <Budget label="AI" value={bu.aiBudget} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Detail label="Retention" value={bu.retentionPolicy || '—'} />
          <Detail label="Backup" value={bu.backupPolicy || '—'} />
          <Detail label="Chargeback" value={bu.chargebackModel || '—'} />
        </div>
        {bu.regulatoryStandards?.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Regulatory Standards</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {bu.regulatoryStandards.map((r) => (
                <span key={r} className="rounded border border-[#2a3550] bg-dark-700/40 px-1.5 py-0.5 text-xs text-gray-300">{r}</span>
              ))}
            </div>
          </div>
        )}
      </OnbCard>

      <div className="flex items-center justify-between pt-2">
        <h2 className="font-heading text-lg font-semibold text-white">Projects</h2>
        <span className="text-xs text-gray-500">{projects.length} projects · {allApps.length} apps</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {projects.length === 0 && (
          <OnbCard className="py-8 text-center text-sm text-gray-400">No projects under this business unit yet.</OnbCard>
        )}
        {projects.map((project) => {
          const isOpen = !!expanded[project.id];
          const projApps = appsByProject[project.id] || [];
          return (
            <OnbCard key={project.id} className="overflow-hidden p-0">
              <button
                onClick={() => toggle(project.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                <FolderTree className="h-4 w-4 text-[#00C9A7]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-white">{project.name}</span>
                    {project.code && (
                      <span className="rounded border border-[#2a3550] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">{project.code}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    <span>Owner: {project.ownerName || '—'}</span>
                    {project.expectedGoLiveDate && <span>Go-live: {project.expectedGoLiveDate}</span>}
                    <span>Delivery: {project.deliveryModel || '—'}</span>
                  </div>
                </div>
                <div className="hidden text-xs text-gray-400 sm:flex sm:gap-4">
                  <span>{projApps.length} apps</span>
                  <span>{project.applicationCount ?? 0}</span>
                </div>
                <Badge c={statusColor(project.status)}>{project.status}</Badge>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-[#1f2840] p-4">
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {project.repository && <Flag tone={buildTone(C.cyan)}>Repo: {project.repository}</Flag>}
                    {project.cicdTool && <Flag tone={buildTone(C.cyan)}>CI/CD: {project.cicdTool}</Flag>}
                    {project.issueTracker && <Flag tone={buildTone(C.cyan)}>Tracker: {project.issueTracker}</Flag>}
                    {project.projectType && <Flag tone={buildTone(C.purple)}>{project.projectType}</Flag>}
                    {project.portfolio && <Flag tone={buildTone(C.purple)}>{project.portfolio}</Flag>}
                    {project.methodology && <Flag tone={buildTone(C.purple)}>{project.methodology}</Flag>}
                    {project.pciApplicable && <Flag tone={buildTone(C.red)}>PCI</Flag>}
                    {project.owaspTop10Enabled && <Flag tone={buildTone(C.green)}>OWASP</Flag>}
                    {project.lintingEnabled && <Flag tone={buildTone(C.green)}>Linting</Flag>}
                    {project.mtlsEnabled && <Flag tone={buildTone(C.green)}>mTLS</Flag>}
                    {project.jwtEnabled && <Flag tone={buildTone(C.green)}>JWT</Flag>}
                    {project.apiKeyEnabled && <Flag tone={buildTone(C.green)}>API Key</Flag>}
                  </div>

                  <div className="flex flex-col gap-1.5 border-l border-[#1f2840] pl-3">
                    {projApps.map((app) => (
                      <Link
                        key={app.id}
                        to={`/gateway/onboarding/applications/${app.id}`}
                        className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-200 hover:bg-white/[0.05]"
                      >
                        <AppWindow className="h-3.5 w-3.5 text-[#7B5FFF]" />
                        <span className="font-medium">{app.name}</span>
                        <span className="font-mono text-[10px] text-gray-500">{app.applicationId}</span>
                        <span className="text-xs text-gray-500">· {app.consumerCount ?? 0} consumers</span>
                        <Badge c={statusColor(app.status)} className="ml-auto">{app.status}</Badge>
                      </Link>
                    ))}
                    {projApps.length === 0 && (
                      <div className="text-sm text-gray-500">No applications under this project.</div>
                    )}
                  </div>
                </div>
              )}
            </OnbCard>
          );
        })}
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

const Budget = ({ label, value }) => (
  <div className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label} Budget</div>
    <div className="text-base font-semibold text-white">{value != null ? value.toLocaleString() : '—'}</div>
  </div>
);

const Detail = ({ label, value }) => (
  <div className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-sm text-white">{value}</div>
  </div>
);

export default BusinessUnitDetail;
