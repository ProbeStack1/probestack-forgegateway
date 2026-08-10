import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, ChevronRight, Search, RefreshCw, Globe,
  Layers, Shield, Tag, Sparkles, FolderTree,
  AppWindow, User, Mail, Users, Zap, ChevronDown, KeyRound,
} from 'lucide-react';
import {
  getBusinessUnits, getProjects, getApplications,
} from '../../http-service/onboardingApi';
import { Card, OnbCard, Stat, SectionHead, Badge, Btn } from '../../components/shared/ui.jsx';
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

// Devs surfaced from the application record
const devsOf = (app) => ([
  { role: 'Owner', name: app.ownerName, email: app.ownerEmail },
  { role: 'Application SME', name: app.applicationSme, email: app.smeEmail },
  { role: 'Tester', name: app.testerName, email: app.testerEmail },
  { role: 'ServiceNow Group', name: app.serviceNowGroupName, email: app.serviceNowEmail },
]).filter((t) => t.name || t.email);

function OrganizationsIndex() {
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [buOpen, setBuOpen] = useState({});
  const [projOpen, setProjOpen] = useState({});

  const [bus, setBus] = useState([]);
  const [projects, setProjects] = useState([]);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getBusinessUnits(),
      getProjects(),
      getApplications({ size: 100 }),
    ])
      .then(([busData, projectsData, appsData]) => {
        if (cancelled) return;
        setBus(busData);
        setProjects(projectsData);
        setApps(appsData);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load onboarding data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const projectsByBu = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      (map[p.businessUnitId] = map[p.businessUnitId] || []).push(p);
    });
    return map;
  }, [projects]);

  const appsByProject = useMemo(() => {
    const map = {};
    apps.forEach((a) => {
      (map[a.projectId] = map[a.projectId] || []).push(a);
    });
    return map;
  }, [apps]);

  const stats = useMemo(() => {
    const orgs = new Set(bus.map((b) => b.organizationId)).size;
    const totalConsumers = apps.reduce((s, a) => s + (a.consumerCount || 0), 0);
    const devCount = apps.reduce((s, a) => s + devsOf(a).length, 0);
    return {
      orgs,
      bus: bus.length,
      projects: projects.length,
      apps: apps.length,
      consumers: totalConsumers,
      devs: devCount,
    };
  }, [bus, projects, apps]);

  const matches = (v, t) => (Array.isArray(v) ? v.join(' ').toLowerCase().includes(t) : (v || '').toLowerCase().includes(t));

  const filteredBus = useMemo(() => {
    if (!search) return bus;
    const t = search.toLowerCase();
    return bus.filter((b) => {
      const buHit = [
        b.name, b.displayName, b.code, b.ownerName, b.ownerEmail,
        b.division, b.department, b.lineOfBusiness, b.costCenter,
        b.region, b.slaTier, b.businessCriticality, b.description,
      ].some((v) => matches(v, t));
      if (buHit) return true;
      const buProjects = projectsByBu[b.id] || [];
      const projectHit = buProjects.some((p) => matches(p.name, t) || matches(p.code, t));
      if (projectHit) return true;
      const appHit = buProjects.some((p) =>
        (appsByProject[p.id] || []).some((a) =>
          matches(a.name, t) || matches(a.applicationId, t) || matches(a.ownerName, t)
        )
      );
      return appHit;
    });
  }, [bus, search, projectsByBu, appsByProject]);

  // Group BUs by organization
  const orgs = useMemo(() => {
    const map = new Map();
    bus.forEach((b) => {
      const key = b.organizationId || 'unorg';
      if (!map.has(key)) map.set(key, {
        id: key,
        name: b.organizationId === 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c' ? 'ForgeCrux' : b.organizationId,
        bus: [],
      });
      map.get(key).bus.push(b);
    });
    return Array.from(map.values());
  }, [bus]);

  if (isLoading) return <div className="w-full p-6"><ProbestackSpinner text="Loading onboarding data…" /></div>;

  return (
    <div className="w-full space-y-5 p-6">
      <SectionHead
        title="Onboarding"
        sub="Org → Business Units → Projects → Applications → Developers → Consumers"
        action={
          <Btn v="ghost" sm onClick={() => setReloadKey((k) => k + 1)} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Btn>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <Stat label="Organizations" val={stats.orgs} col={C.cyan} icon={<Globe className="h-4 w-4" />} />
        <Stat label="Business Units" val={stats.bus} col={C.orange} icon={<Building2 className="h-4 w-4" />} />
        <Stat label="Projects" val={stats.projects} col={C.teal} icon={<Layers className="h-4 w-4" />} />
        <Stat label="Applications" val={stats.apps} col={C.purple} icon={<AppWindow className="h-4 w-4" />} />
        <Stat label="Developers" val={stats.devs} col={C.amber} icon={<User className="h-4 w-4" />} />
        <Stat label="Consumers" val={stats.consumers} col={C.red} icon={<Zap className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a6a8a]" />
          <input
            type="text"
            placeholder="Search Org / BU / Project / App / Owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#2a3550] bg-[#1a1f2e] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#5a6a8a] focus:border-[#ff5b1f] focus:outline-none"
          />
        </div>
        <Link to="/gateway/access-center" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary">
          <KeyRound className="h-3.5 w-3.5" /> Access Center
        </Link>
      </div>

      {error && (
        <Card className="py-10 text-center text-sm text-red-400">
          Failed to load. {error}
          <div className="mt-3">
            <Btn v="ghost" sm onClick={() => setReloadKey((k) => k + 1)}>Retry</Btn>
          </div>
        </Card>
      )}

      {!error && (
        <div className="flex flex-col gap-6">
          {orgs.map((org) => {
            const orgBus = filteredBus.filter((b) => (b.organizationId || 'unorg') === org.id);
            if (orgBus.length === 0) return null;
            return (
              <div key={org.id}>
                <div className="mb-3 flex items-center gap-2 border-b border-[#2a3550] pb-3">
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <h2 className="font-heading text-base font-semibold text-white">{org.name}</h2>
                  <span className="text-xs text-gray-500">
                    · {orgBus.length} BUs · {orgBus.reduce((s, b) => s + (b.projectCount || 0), 0)} projects · {orgBus.reduce((s, b) => s + (b.applicationCount || 0), 0)} apps
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {orgBus.map((b) => {
                    const isBuOpen = !!buOpen[b.id];
                    const buProjects = projectsByBu[b.id] || [];
                    const buApps = buProjects.reduce((s, p) => s + (appsByProject[p.id] || []).length, 0);
                    const buConsumers = buProjects.reduce((s, p) =>
                      (appsByProject[p.id] || []).reduce((acc, a) => acc + (a.consumerCount || 0), s), 0);
                    return (
                      <OnbCard key={b.id} className="overflow-hidden p-0">
                        <button
                          onClick={() => setBuOpen((p) => ({ ...p, [b.id]: !p[b.id] }))}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                        >
                          {isBuOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                          <Building2 className="h-4 w-4 text-[#ff8a5c]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold text-white">{b.name}</span>
                              <span className="rounded border border-[#2a3550] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">{b.code}</span>
                              {b.slaTier && <Flag tone={buildTone(C.purple)} icon={Sparkles}>SLA {b.slaTier}</Flag>}
                              {b.businessCriticality && <Flag tone={buildTone(C.red)} icon={Shield}>{b.businessCriticality}</Flag>}
                              {b.region && <Flag tone="border-[#2a3550] bg-dark-700/40 text-gray-300" icon={Tag}>{b.region}</Flag>}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">
                              Owner: {b.ownerName || '—'}{b.ownerEmail ? ` · ${b.ownerEmail}` : ''}
                            </div>
                          </div>
                          <div className="hidden text-xs text-gray-400 sm:flex sm:gap-4">
                            <span>{buProjects.length} projects</span>
                            <span>{buApps} apps</span>
                            <span>{buConsumers} consumers</span>
                          </div>
                          <Badge c={statusColor(b.status)}>{b.status}</Badge>
                        </button>

                        {isBuOpen && (
                          <div className="space-y-2 border-t border-[#2a3550] p-4">
                            {buProjects.length === 0 && (
                              <div className="text-sm text-gray-500">No projects under this business unit.</div>
                            )}
                            {buProjects.map((project) => {
                              const isProjOpen = !!projOpen[project.id];
                              const projApps = appsByProject[project.id] || [];
                              const projConsumers = projApps.reduce((s, a) => s + (a.consumerCount || 0), 0);
                              return (
                                <OnbCard key={project.id} className="overflow-hidden p-0">
                                  <button
                                    onClick={() => setProjOpen((p) => ({ ...p, [project.id]: !p[project.id] }))}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03]"
                                  >
                                    {isProjOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                                    <FolderTree className="h-3.5 w-3.5 text-[#00C9A7]" />
                                    <span className="font-medium text-white">{project.name}</span>
                                    {project.code && (
                                      <span className="rounded border border-[#2a3550] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">{project.code}</span>
                                    )}
                                    <span className="text-xs text-gray-500">· {projApps.length} apps</span>
                                    <span className="text-xs text-gray-500">· {projConsumers} consumers</span>
                                    <Badge c={statusColor(project.status)} className="ml-auto">{project.status}</Badge>
                                  </button>

                                  {isProjOpen && (
                                    <div className="space-y-2 border-t border-[#2a3550] p-3">
                                      {projApps.length === 0 && (
                                        <div className="text-sm text-gray-500">No applications under this project.</div>
                                      )}
                                      {projApps.map((app) => {
                                        const devs = devsOf(app);
                                        return (
                                          <div key={app.id} className="rounded-md border border-[#2a3550] bg-black/20 p-3">
                                            <Link
                                              to={`/gateway/onboarding/applications/${app.id}`}
                                              className="flex flex-wrap items-center gap-2 text-sm text-gray-200"
                                            >
                                              <AppWindow className="h-3.5 w-3.5 text-[#7B5FFF]" />
                                              <span className="font-medium">{app.name}</span>
                                              <span className="font-mono text-[10px] text-gray-500">{app.applicationId}</span>
                                              <span className="text-xs text-gray-500">· {app.consumerCount ?? 0} consumers</span>
                                              <Badge c={statusColor(app.status)} className="ml-auto">{app.status}</Badge>
                                            </Link>

                                            {/* Devs + Consumers in separate boxes */}
                                            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                                              <div className="rounded-md border border-teal-500/30 bg-teal-500/[0.06] p-2.5">
                                                <div className="mb-2 flex items-center justify-between">
                                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                                                    <User className="h-3 w-3" /> Developers
                                                  </div>
                                                  <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                                                    {devs.length}
                                                  </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {devs.length === 0 && <span className="text-xs text-gray-500">None assigned</span>}
                                                  {devs.map((d) => (
                                                    <span key={d.role} className="inline-flex items-center gap-1 rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] text-teal-300">
                                                      <span className="font-medium">{d.role}:</span>
                                                      <span className="text-teal-200">{d.name || '—'}</span>
                                                      {d.email && (
                                                        <a href={`mailto:${d.email}`} className="text-teal-400 hover:text-teal-200">
                                                          <Mail className="h-3 w-3" />
                                                        </a>
                                                      )}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                              <div className="rounded-md border border-orange-500/30 bg-orange-500/[0.06] p-2.5">
                                                <div className="mb-2 flex items-center justify-between">
                                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
                                                    <Zap className="h-3 w-3" /> Consumers
                                                  </div>
                                                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">
                                                    {app.consumerCount || 0}
                                                  </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  {app.consumerIds && app.consumerIds.length > 0 && (
                                                    <span className="text-[10px] text-gray-500">{app.consumerIds.length} IDs</span>
                                                  )}
                                                  {app.consumerIds && app.consumerIds.slice(0, 3).map((id) => (
                                                    <span key={id} className="rounded border border-[#2a3550] bg-[#1a1f2e] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{id}</span>
                                                  ))}
                                                  {app.consumerIds && app.consumerIds.length > 3 && (
                                                    <span className="text-[10px] text-gray-500">+{app.consumerIds.length - 3} more</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </OnbCard>
                              );
                            })}
                          </div>
                        )}
                      </OnbCard>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredBus.length === 0 && (
            <Card className="py-10 text-center text-sm text-gray-400">
              No business units match your search.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default OrganizationsIndex;
