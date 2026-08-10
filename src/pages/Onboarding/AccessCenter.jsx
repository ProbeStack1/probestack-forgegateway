import { useState, useEffect, useMemo } from 'react';
import {
  Search, Mail, Shield, UserCog,
  CheckCircle2, Clock, BadgeCheck, Sparkles, Send,
} from 'lucide-react';
import {
  getBusinessUnits, getApplications,
} from '../../http-service/onboardingApi';
import {
  OnbCard, SectionHead, Badge, Btn, Inp, Sl,
} from '../../components/shared/ui.jsx';
import { Modal } from '../../components/shared/ui.jsx';
import { ProbestackSpinner } from '../../components/shared/probestack-spinner/Spinner';
import { C } from '../../utils/constants';

const ROLES = [
  { v: 'DEVELOPER', l: 'Developer' },
  { v: 'SRE', l: 'SRE' },
  { v: 'TESTER', l: 'Tester' },
  { v: 'ARCHITECT', l: 'Architect' },
  { v: 'PRODUCT_OWNER', l: 'Product Owner' },
  { v: 'PROJECT_MANAGER', l: 'Project Manager' },
  { v: 'BUSINESS_LEADER', l: 'Business Leader (Report Generation)' },
];

const ACCESS_TIERS = [
  { role: 'Developer', access: 'Full read/write', grants: ['api:read', 'api:write', 'proxy:read', 'proxy:write'] },
  { role: 'SRE', access: 'Full read/write + observability', grants: ['api:read', 'api:write', 'observability:read', 'alerts:write'] },
  { role: 'Tester', access: 'Read + test execution', grants: ['api:read', 'tests:execute'] },
  { role: 'Architect', access: 'Read + governance write', grants: ['api:read', 'governance:write', 'proxy:read'] },
  { role: 'Product Owner', access: 'Read + product metadata', grants: ['api:read', 'product:write'] },
  { role: 'Project Manager', access: 'Read + project metadata', grants: ['api:read', 'project:write'] },
  { role: 'Business Leader', access: 'Read + reports', grants: ['api:read', 'reports:read'] },
];

const statusColor = (s) =>
  s === 'ACTIVE' ? C.green : s === 'TRIAL' ? C.amber : s === 'EXPIRED' ? C.red : C.muted;

function AccessCenter() {
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invites, setInvites] = useState(() => ([
    { id: 'inv-seed-1', email: 'aisha.kapoor@forgecrux.com', role: 'TESTER', status: 'PENDING', invitedAt: new Date(Date.now() - 3 * 86400000).toISOString(), applicationIds: [] },
    { id: 'inv-seed-2', email: 'rohan.das@forgecrux.com', role: 'DEVELOPER', status: 'ACCEPTED', invitedAt: new Date(Date.now() - 20 * 86400000).toISOString(), applicationIds: [] },
  ]));

  const [bu, setBu] = useState([]);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getBusinessUnits(),
      getApplications({ size: 100 }),
    ])
      .then(([buData, appsData]) => {
        if (cancelled) return;
        setBu(buData);
        setApps(appsData);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load access center data.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const subscriptions = useMemo(() => {
    const totalMonthly = bu.reduce((s, b) => s + (b.monthlyBudget || 0), 0);
    const totalAnnual = bu.reduce((s, b) => s + (b.annualBudget || 0), 0);
    const totalApi = bu.reduce((s, b) => s + (b.apiBudget || 0), 0);
    const totalAi = bu.reduce((s, b) => s + (b.aiBudget || 0), 0);
    const slaTiers = new Set(bu.map((b) => b.slaTier).filter(Boolean));

    return [
      {
        id: 'forge-api',
        name: 'ForgeSphere API Gateway',
        plan: 'Enterprise',
        status: 'ACTIVE',
        seats: totalApi || 1000,
        usedSeats: apps.reduce((s, a) => s + (a.consumerCount || 0), 0),
        renewsAt: '2027-01-01',
        features: ['ApigeeX', 'SharedFlows', 'Deploy', 'Trace'],
        metric: `API budget: ${totalApi.toLocaleString()}`,
      },
      {
        id: 'forge-ai',
        name: 'ForgeSphere AI Gateway',
        plan: 'Enterprise',
        status: 'ACTIVE',
        seats: totalAi || 500,
        usedSeats: apps.filter((a) => a.llmProvider).length,
        renewsAt: '2027-01-01',
        features: ['OpenAI', 'Anthropic', 'Google', 'AWS', 'ModelArmor'],
        metric: `AI budget: ${totalAi.toLocaleString()}`,
      },
      {
        id: 'onboarding',
        name: 'Onboarding Hub',
        plan: 'Standard',
        status: 'ACTIVE',
        seats: bu.length * 5,
        usedSeats: bu.length,
        renewsAt: '2027-01-01',
        features: ['Hierarchy', 'Access Center', 'Reports'],
        metric: `${bu.length} BUs active`,
      },
      {
        id: 'sla',
        name: 'SLA Coverage',
        plan: Array.from(slaTiers).join(', ') || '—',
        status: slaTiers.size > 0 ? 'ACTIVE' : 'PENDING',
        seats: 0,
        usedSeats: 0,
        renewsAt: '—',
        features: Array.from(slaTiers),
        metric: `${slaTiers.size} tiers in use`,
      },
      {
        id: 'budget',
        name: 'Budget',
        plan: 'Monthly',
        status: 'ACTIVE',
        seats: totalMonthly,
        usedSeats: apps.length,
        renewsAt: '—',
        features: ['Monthly', 'Annual', 'API', 'AI'],
        metric: `${totalMonthly.toLocaleString()}/mo · ${totalAnnual.toLocaleString()}/yr`,
      },
    ];
  }, [bu, apps]);

  const allDevs = useMemo(() => {
    const map = new Map();
    apps.forEach((a) => {
      [
        { role: 'Owner', name: a.ownerName, email: a.ownerEmail },
        { role: 'SME', name: a.applicationSme, email: a.smeEmail },
        { role: 'Tester', name: a.testerName, email: a.testerEmail },
        { role: 'ServiceNow', name: a.serviceNowGroupName, email: a.serviceNowEmail },
      ].forEach((p) => {
        if (!p.email) return;
        const key = (p.email || '').toLowerCase();
        if (!map.has(key)) {
          map.set(key, { id: key, name: p.name || p.email, email: p.email, role: p.role, apps: [], lastActive: a.updatedAt || a.createdAt });
        }
        const d = map.get(key);
        if (!d.apps.includes(a.applicationId)) d.apps.push(a.applicationId);
      });
    });
    return Array.from(map.values());
  }, [apps]);

  const filteredDevs = useMemo(() => {
    if (!search) return allDevs;
    const t = search.toLowerCase();
    return allDevs.filter((d) => (d.name || '').toLowerCase().includes(t) || (d.email || '').toLowerCase().includes(t) || (d.role || '').toLowerCase().includes(t));
  }, [allDevs, search]);

  const sendInvite = (payload) => {
    const inv = {
      id: `inv-${Date.now()}`,
      ...payload,
      status: 'PENDING',
      invitedAt: new Date().toISOString(),
    };
    setInvites((prev) => [inv, ...prev]);
  };

  const revokeInvite = (id) => setInvites((prev) => prev.filter((i) => i.id !== id));
  const resendInvite = (id) => setInvites((prev) => prev.map((i) => i.id === id ? { ...i, lastResentAt: new Date().toISOString() } : i));

  const totalSeats = subscriptions.reduce((s, x) => s + (x.seats || 0), 0);
  const usedSeats = subscriptions.reduce((s, x) => s + (x.usedSeats || 0), 0);

  if (isLoading) return <div className="w-full p-6"><ProbestackSpinner text="Loading access center…" /></div>;

  return (
    <div className="w-full space-y-5 p-6">
      <SectionHead
        title="Access Center"
        sub="Subscription info, active team members, and invite new collaborators onto your onboarding-scoped tools."
        action={
          <Btn v="primary" sm onClick={() => setShowInvite(true)}>
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Invite Team Member
          </Btn>
        }
      />

      {error && (
        <OnbCard className="py-6 text-center text-sm text-red-400">
          {error}
          <div className="mt-3">
            <Btn v="ghost" sm onClick={() => setReloadKey((k) => k + 1)}>Retry</Btn>
          </div>
        </OnbCard>
      )}

      <OnbCard>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-white">Active Subscriptions</h3>
          <span className="ml-auto text-xs text-gray-500">{usedSeats}/{totalSeats} seats used</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {subscriptions.map((s) => (
            <div key={s.id} className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{s.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">{s.plan}</div>
                </div>
                <Badge c={statusColor(s.status)}>{s.status}</Badge>
              </div>
              {s.seats ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Seats</span>
                    <span className="text-white">{s.usedSeats} / {s.seats}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-dark-700">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, (s.usedSeats / s.seats) * 100)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-500">{s.metric}</div>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {s.features.filter(Boolean).map((f) => (
                  <span key={f} className="rounded border border-[#2a3550] bg-[#1a1f2e] px-1.5 py-0.5 text-[10px] text-gray-300">{f}</span>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                {s.renewsAt !== '—' ? `Renews ${s.renewsAt}` : s.metric}
              </div>
            </div>
          ))}
        </div>
      </OnbCard>

      <OnbCard>
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-cyan-400" />
          <h3 className="font-heading text-sm font-semibold text-white">Active Developers</h3>
          <span className="ml-auto text-xs text-gray-500">{filteredDevs.length} people</span>
        </div>
        <div className="relative mb-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a6a8a]" />
          <input
            type="text"
            placeholder="Search by name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#2a3550] bg-[#1a1f2e] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#5a6a8a] focus:border-[#ff5b1f] focus:outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#2a3550] text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Role</th>
                <th className="py-2 text-left">Apps</th>
                <th className="py-2 text-left">Last Active</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevs.map((d) => (
                <tr key={d.id} className="border-b border-[#1f2840]">
                  <td className="py-2.5 text-white">{d.name}</td>
                  <td className="py-2.5 text-gray-300">{d.email}</td>
                  <td className="py-2.5"><Badge c={C.cyan}>{d.role}</Badge></td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {d.apps.slice(0, 3).map((a) => (
                        <span key={a} className="rounded border border-[#2a3550] bg-[#1a1f2e] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{a}</span>
                      ))}
                      {d.apps.length > 3 && <span className="text-[10px] text-gray-500">+{d.apps.length - 3} more</span>}
                    </div>
                  </td>
                  <td className="py-2.5 text-gray-500">{d.lastActive ? new Date(d.lastActive).toLocaleDateString() : '—'}</td>
                  <td className="py-2.5 text-right">
                    <Btn v="ghost" sm>
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Resend invite
                    </Btn>
                  </td>
                </tr>
              ))}
              {filteredDevs.length === 0 && (
                <tr><td colSpan="6" className="py-6 text-center text-gray-500">No active developers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </OnbCard>

      <OnbCard>
        <div className="mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-purple-400" />
          <h3 className="font-heading text-sm font-semibold text-white">Invites</h3>
          <span className="ml-auto text-xs text-gray-500">{invites.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#2a3550] text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Role</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Invited</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 && (
                <tr><td colSpan="5" className="py-6 text-center text-gray-500">No invites yet.</td></tr>
              )}
              {invites.map((inv) => (
                <tr key={inv.id} className="border-b border-[#1f2840]">
                  <td className="py-2.5 text-white">{inv.email}</td>
                  <td className="py-2.5"><Badge c={C.cyan}>{inv.role}</Badge></td>
                  <td className="py-2.5">
                    {inv.status === 'ACCEPTED' ? (
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-400"><Clock className="h-3.5 w-3.5" /> Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-500">{new Date(inv.invitedAt).toLocaleDateString()}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {inv.status !== 'ACCEPTED' && (
                        <button onClick={() => resendInvite(inv.id)} className="rounded p-1 text-gray-400 hover:bg-white/5 hover:text-white" title="Resend">
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => revokeInvite(inv.id)} className="rounded p-1 text-gray-400 hover:bg-red-500/10 hover:text-red-400" title="Revoke">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OnbCard>

      <OnbCard>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="font-heading text-sm font-semibold text-white">User Access Tiers</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {ACCESS_TIERS.map((t) => (
            <div key={t.role} className="rounded-lg border border-[#2a3550] bg-dark-700/40 p-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-white">{t.role}</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">{t.access}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.grants.map((g) => (
                  <span key={g} className="rounded border border-[#2a3550] bg-[#1a1f2e] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{g}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </OnbCard>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSubmit={(payload) => {
            sendInvite(payload);
            setShowInvite(false);
          }}
          apps={apps}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSubmit, apps }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [appIds, setAppIds] = useState([]);

  const toggle = (id) => setAppIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal
      title="Invite Team Member"
      onClose={onClose}
      footer={
        <>
          <Btn v="ghost" sm onClick={onClose}>Cancel</Btn>
          <Btn v="primary" sm onClick={() => onSubmit({ email, role, applicationIds: appIds })}>
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Send Invite
          </Btn>
        </>
      }
    >
      <p className="mb-4 text-sm text-gray-400">
        Send an invite to onboard someone as Developer, SRE, Tester, Architect, Product Owner, Project Manager, or Business Leader.
      </p>
      <Inp
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="firstname.lastname@forgecrux.com"
        required
      />
      <Sl label="Role" value={role} onChange={setRole} opts={ROLES} required />
      <div className="mb-2">
        <label className="mb-1.5 block text-white">Applications</label>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-[#2a3550] bg-dark-700/40 p-2">
          {apps.length === 0 && (
            <div className="px-1 py-2 text-xs text-gray-500">No applications available.</div>
          )}
          {apps.map((a) => (
            <label key={a.id} className="flex items-center gap-2 rounded px-1 py-1.5 text-sm text-gray-200 hover:bg-white/5">
              <input
                type="checkbox"
                checked={appIds.includes(a.id)}
                onChange={() => toggle(a.id)}
              />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto font-mono text-[10px] text-gray-500">{a.applicationId}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default AccessCenter;
