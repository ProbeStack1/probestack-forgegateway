/**
 * MCPApiDeployDetail — drop-in renderer for the API Deploy page when
 * the selected catalog row is an MCP server.
 *
 * UX mirrors the senior team's microservice detail layout in
 * `APIDeploy.jsx` (back button + summary card + recent activity)
 * but every field is sourced from the MCP project document. This
 * component lives in the MCP folder so it can be removed/edited
 * without touching senior pages.
 *
 * Two sections:
 *  1. MCP Summary    — name, slug, owner, language, repo, deployed url,
 *                       capability counters.
 *  2. Deploy History — audit-trail deploy timeline with per-row drill-in
 *                       + Rollback CTA (inline confirm popover). Reuses
 *                       the same idiom as McpDeploymentDrilldown inside
 *                       the catalog modal so users get one consistent
 *                       rollback flow across the app.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Puzzle, ExternalLink, Copy as CopyIcon, ClipboardCheck,
  AlertCircle, CheckCircle2, Loader2, RotateCcw, History, GitBranch,
  Rocket, Activity, FileCode2, Server, Layers, ShieldCheck,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { mcpGenerationService } from '../../../services/mcpGenerationService';

const LANGUAGE_LABEL = {
  typescript: 'TypeScript',
  python:     'Python',
  java:       'Java',
  raw:        'Raw',
};

const STATUS_FOR_PROJECT = (p) => {
  if (p?.deployedServiceUrl)                      return 'Deployed';
  if (p?.latestRunConclusion === 'failure')       return 'Failed';
  if (p?.latestRunStatus === 'in_progress')       return 'Deploying';
  if (p?.pushedAt)                                return 'Pushed';
  if (Array.isArray(p?.generated?.files) && p.generated.files.length > 0) return 'Ready';
  return 'Draft';
};

const STATUS_STYLES = {
  Deployed:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  Pushed:    'border-sky-500/30    bg-sky-500/10    text-sky-200',
  Ready:     'border-amber-500/30  bg-amber-500/10  text-amber-200',
  Draft:     'border-slate-700     bg-slate-900/70  text-slate-300',
  Deploying: 'border-blue-500/30   bg-blue-500/10   text-blue-200',
  Failed:    'border-rose-500/30   bg-rose-500/10   text-rose-200',
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

export default function MCPApiDeployDetail({ item, navigate }) {
  // The catalog row stores the full project doc under `raw`. We re-fetch
  // on mount so the panel always shows the latest audit trail (a rollback
  // executed from inside the catalog modal could otherwise stay stale).
  const [project, setProject] = useState(item?.raw || null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(null);

  // Re-deploy ("Promote" semantic for MCP) — trigger a fresh GitHub Actions
  // workflow run that builds + ships the current latest commit to Cloud Run.
  // Confirm popover guards an accidental click. Disabled while still
  // deploying (`latestRunStatus === 'in_progress'`) and when the project
  // hasn't been pushed yet (no repo to re-deploy from).
  const [redeploying, setRedeploying]       = useState(false);
  const [showRedeployConfirm, setShowRedeployConfirm] = useState(false);
  const [redeployError, setRedeployError]   = useState('');
  const [redeployOk, setRedeployOk]         = useState('');

  const reload = async () => {
    if (!item?.id) return;
    setLoading(true);
    setError('');
    const res = await mcpGenerationService.getProject(item.id);
    setLoading(false);
    if (res.success && res.data) setProject(res.data);
    else setError(res.error || 'Failed to load MCP project');
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [item?.id]);

  const handleCopy = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch { /* clipboard blocked */ }
  };

  // Trigger fresh GitHub Actions workflow → Cloud Run deploy.
  // `pushToGithub` is idempotent on a no-change push (GitHub auto-skips),
  // but the workflow_dispatch path forces a build either way.
  const handleRedeploy = async () => {
    if (!item?.id) return;
    setRedeploying(true);
    setRedeployError('');
    setRedeployOk('');
    setShowRedeployConfirm(false);
    const res = await mcpGenerationService.pushToGithub(item.id);
    setRedeploying(false);
    if (res.success) {
      setRedeployOk('Re-deploy triggered — GitHub Actions workflow is running.');
      // Refresh project + audit so the new run shows up in the timeline.
      await reload();
      // Drop the success banner after a few seconds so it doesn't linger.
      setTimeout(() => setRedeployOk(''), 6000);
    } else {
      setRedeployError(res.error || 'Re-deploy failed to start');
    }
  };

  const canRedeploy = Boolean(project?.pushedRepoUrl) && !redeploying;

  const p   = project || {};
  const id  = p.identity     || {};
  const ob  = p.onboarding   || {};
  const rt  = p.runtime      || {};
  const tx  = p.transport    || {};
  const cap = p.capabilities || {};
  const a   = p.auth         || {};
  const tools     = Array.isArray(cap.tools)     ? cap.tools.length     : 0;
  const resources = Array.isArray(cap.resources) ? cap.resources.length : 0;
  const prompts   = Array.isArray(cap.prompts)   ? cap.prompts.length   : 0;
  const status    = STATUS_FOR_PROJECT(p);
  const name      = id.displayName || id.slug || item?.name || p.id;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_500px]">
      {/* ─── Left column ───────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Summary panel */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/api-deploy')}
                data-testid="mcp-deploy-back-btn"
                className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back to catalog
              </button>

              {/* Re-deploy CTA — the MCP-side equivalent of "Promote".
                  MCP servers don't ladder through env (no dev → staging →
                  prod), so "promote latest revision" maps to "ship the
                  current GitHub commit to Cloud Run again". */}
              <div className="relative inline-flex items-center gap-2">
                {showRedeployConfirm ? (
                  <div
                    data-testid="mcp-deploy-redeploy-confirm-popover"
                    className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2"
                  >
                    <span className="text-xs text-amber-200">Trigger a fresh GitHub Actions run?</span>
                    <button
                      type="button"
                      onClick={() => setShowRedeployConfirm(false)}
                      data-testid="mcp-deploy-redeploy-cancel"
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRedeploy}
                      disabled={redeploying}
                      data-testid="mcp-deploy-redeploy-confirm"
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      {redeploying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                      {redeploying ? 'Triggering…' : 'Yes, re-deploy'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRedeployConfirm(true)}
                    disabled={!canRedeploy}
                    title={canRedeploy ? 'Trigger a fresh deploy of the current commit' : 'Push to GitHub first to enable re-deploy'}
                    data-testid="mcp-deploy-redeploy-btn"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
                  >
                    <Rocket className="h-4 w-4" /> Re-deploy
                  </button>
                )}
              </div>
            </div>

            {redeployError && (
              <div
                data-testid="mcp-deploy-redeploy-error"
                className="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              >
                <AlertCircle className="h-3.5 w-3.5" /> {redeployError}
              </div>
            )}
            {redeployOk && (
              <div
                data-testid="mcp-deploy-redeploy-ok"
                className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {redeployOk}
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-950/25 p-4">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-[#ff5b1f]/25 bg-[#ff5b1f]/10 p-3 text-[#ffb08c]">
                  <Puzzle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-lg font-semibold text-white"
                    title={name}
                    data-testid="mcp-deploy-title"
                  >
                    {name}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {id.slug || ob.applicationId || '—'}
                  </p>
                  {(id.summary || id.description) && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                      {id.summary || id.description}
                    </p>
                  )}
                </div>
                <span
                  data-testid="mcp-deploy-status-badge"
                  className={cn('inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold', STATUS_STYLES[status] || STATUS_STYLES.Draft)}
                >
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* Capability counters — mirrors microservice ReadinessBoard tiles. */}
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <Tile label="Tools"     value={tools}     icon={Server}     tone="amber"   detail="Callable MCP tools" />
            <Tile label="Resources" value={resources} icon={Layers}     tone="slate"   detail="Exposed resources" />
            <Tile label="Prompts"   value={prompts}   icon={FileCode2}  tone="slate"   detail="Prompt templates" />
            <Tile
              label="Transport"
              value={tx.kind || '—'}
              icon={Activity}
              tone="slate"
              detail={tx.baseUrl ? 'Endpoint live' : 'No endpoint'}
              textValue
            />
            <Tile
              label="Auth"
              value={a.kind || 'none'}
              icon={ShieldCheck}
              tone="slate"
              detail="Server auth mode"
              textValue
            />
            <Tile
              label="Runtime"
              value={LANGUAGE_LABEL[rt.language] || rt.language || '—'}
              icon={FileCode2}
              tone="emerald"
              detail={rt.languageVersion || 'Latest'}
              textValue
            />
          </div>

          {/* Linked URLs / Repo */}
          {(p.pushedRepoUrl || p.deployedServiceUrl || p.latestRunUrl) && (
            <div className="border-t border-slate-800 px-5 py-4 space-y-2.5">
              {p.pushedRepoUrl && (
                <LinkRow
                  icon={GitBranch}
                  label="GitHub repository"
                  href={p.pushedRepoUrl}
                  text={p.pushedRepoFullName || p.pushedRepoUrl}
                  onCopy={() => handleCopy(p.pushedRepoUrl, 'repo')}
                  copied={copied === 'repo'}
                />
              )}
              {p.deployedServiceUrl && (
                <LinkRow
                  icon={Rocket}
                  label="Deployed service URL"
                  href={p.deployedServiceUrl}
                  text={p.deployedServiceUrl}
                  onCopy={() => handleCopy(p.deployedServiceUrl, 'deployed')}
                  copied={copied === 'deployed'}
                  emphasize
                />
              )}
              {p.latestRunUrl && (
                <LinkRow
                  icon={Activity}
                  label="Latest workflow run"
                  href={p.latestRunUrl}
                  text={p.latestRunId ? `Run #${p.latestRunId}` : p.latestRunUrl}
                  onCopy={() => handleCopy(p.latestRunUrl, 'runurl')}
                  copied={copied === 'runurl'}
                />
              )}
            </div>
          )}
        </div>

        {/* Deploy history + rollback */}
        <DeployHistoryPanel
          project={p}
          loading={loading}
          error={error}
          onReload={reload}
        />
      </div>

      {/* ─── Right column: metadata sidebar ─────────────────────────── */}
      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <SidebarPanel title="MCP metadata">
          <KV label="Display name"  value={id.displayName} />
          <KV label="Slug"          value={id.slug} mono />
          <KV label="Version"       value={id.version} mono />
          <KV label="Category"      value={id.category} />
          <KV label="License"       value={id.license} />
          <KV label="Owner email"   value={ob.ownerEmail || p.ownerEmail} />
          <KV label="Application"   value={ob.applicationName} />
          <KV label="Application ID" value={ob.applicationId} mono />
          <KV label="Workspace"     value={p.workspaceId} mono />
        </SidebarPanel>

        <SidebarPanel title="Audit counters">
          <CounterRow label="Total edits"      value={p?.auditTrail?.totalEdits          ?? 0} />
          <CounterRow label="Total pushes"     value={p?.auditTrail?.totalPushes         ?? 0} />
          <CounterRow label="Total deploys"    value={p?.auditTrail?.totalDeploys        ?? 0} />
          <CounterRow label="Deploy success"   value={p?.auditTrail?.totalDeploysSuccess ?? 0} tone="green" />
          <CounterRow label="Deploy failures"  value={p?.auditTrail?.totalDeploysFailed  ?? 0} tone="red"   />
          <KV
            label="Created by"
            value={p?.auditTrail?.createdBy?.email || p?.createdBy}
          />
          <KV
            label="Updated by"
            value={p?.auditTrail?.lastUpdatedBy?.email || p?.updatedBy}
          />
          <KV
            label="Last updated"
            value={fmtDate(p?.auditTrail?.lastUpdatedBy?.timestamp || p?.updatedAt)}
          />
        </SidebarPanel>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * DeployHistoryPanel
 *
 * Same rollback semantics as the catalog modal's McpDeploymentDrilldown
 * (newest = current head, only past successes are rollback-eligible).
 * Kept here as a self-contained piece so APIDeploy.jsx doesn't import
 * MCPCatalog internals — the two views are decoupled.
 * ─────────────────────────────────────────────────────────────────── */
function DeployHistoryPanel({ project, loading, error, onReload }) {
  const a = project?.auditTrail || {};
  const deployHistory = Array.isArray(a.deployHistory) ? a.deployHistory : [];
  const rows = useMemo(() => [...deployHistory].reverse(), [deployHistory]);
  const latest = rows[0] || null;

  const [expandedRunId, setExpandedRunId] = useState(latest?.runId || null);
  const [confirmFor,    setConfirmFor]    = useState(null);
  const [rolling,       setRolling]       = useState(false);
  const [opError,       setOpError]       = useState('');

  // Keep the newest deploy expanded by default whenever the list refreshes.
  useEffect(() => {
    if (rows.length > 0 && !expandedRunId) setExpandedRunId(rows[0].runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const handleRollback = async (runId) => {
    setOpError('');
    setRolling(true);
    const res = await mcpGenerationService.rollback(project.id, { toRunId: runId });
    setRolling(false);
    setConfirmFor(null);
    if (res.success) onReload?.();
    else setOpError(res.error || 'Rollback failed');
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1220]" data-testid="mcp-deploy-history-panel">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            Deployment history
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Complete deploy timeline. Click any past success to roll back to it.
          </p>
        </div>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {/* Counter strip — matches McpDeploymentDrilldown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pt-4">
        <Counter label="Total"     value={a.totalDeploys ?? 0}        tone="orange" />
        <Counter label="Succeeded" value={a.totalDeploysSuccess ?? 0} tone="green"  />
        <Counter label="Failed"    value={a.totalDeploysFailed ?? 0}  tone="red"    />
        <Counter
          label="Latest"
          value={latest ? (latest.conclusion || latest.status || '—') : 'none'}
          tone={latest?.conclusion === 'success' ? 'green' : latest?.conclusion ? 'red' : 'muted'}
          textValue
        />
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      {opError && (
        <div className="mx-5 mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {opError}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          <History className="mx-auto mb-2 h-5 w-5 text-slate-600" />
          No deploy runs recorded for this MCP yet. Trigger one from the wizard&apos;s <b>Push &amp; Deploy</b> step.
        </div>
      ) : (
        <div className="p-5 space-y-2">
          {rows.map((d, i) => {
            const expanded    = expandedRunId === d.runId;
            const isCurrent   = i === 0;
            const canRollback = !isCurrent && d.conclusion === 'success';
            return (
              <div
                key={`${d.runId || 'pending'}-${i}`}
                className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden"
                data-testid={`mcp-deploy-history-row-${d.runId || i}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedRunId(expanded ? null : d.runId)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {d.conclusion === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : d.conclusion ? (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-amber-300 shrink-0 animate-spin" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">
                        {d.rolledBackFrom && <span className="text-amber-300 mr-1">↺</span>}
                        {d.runId ? `Run ${d.runId.slice(0, 12)}` : 'Pending'}
                        <span className="text-slate-500"> · {d.conclusion || d.status || 'queued'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {d.by?.email || '—'} · {fmtDate(d.by?.timestamp || d.startedAt)}
                      </div>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="ml-2 shrink-0 rounded-full bg-[#ff5b1f]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ff8a5c]">
                      current
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="px-3 pb-3 pt-2 border-t border-slate-800 space-y-2 text-xs bg-[#0a1220]">
                    {d.deployedUrl && (
                      <Kv k="Deployed URL">
                        <a href={d.deployedUrl} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline break-all">
                          {d.deployedUrl}
                        </a>
                      </Kv>
                    )}
                    {d.runUrl && (
                      <Kv k="Workflow">
                        <a href={d.runUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline break-all">
                          {d.runUrl}
                        </a>
                      </Kv>
                    )}
                    {d.commitSha && <Kv k="Commit"><span className="font-mono text-slate-200">{d.commitSha.slice(0, 12)}</span></Kv>}
                    {d.failedStep && <Kv k="Failed step"><span className="text-rose-300">{d.failedStep}</span></Kv>}
                    {d.failedReason && (
                      <Kv k="Reason">
                        <pre className="text-rose-200 whitespace-pre-wrap font-mono text-[10px] leading-snug">{d.failedReason}</pre>
                      </Kv>
                    )}
                    {d.durationMs != null && <Kv k="Duration"><span className="text-slate-300">{Math.round(d.durationMs / 1000)}s</span></Kv>}
                    {d.rolledBackFrom && (
                      <>
                        <Kv k="Rollback from"><span className="font-mono text-amber-300">{String(d.rolledBackFrom).slice(0, 12)}</span></Kv>
                        <Kv k="Rollback to"><span className="font-mono text-emerald-300">{d.runId ? String(d.runId).slice(0, 12) : '—'}</span></Kv>
                      </>
                    )}

                    {canRollback && (
                      <div className="pt-2">
                        {confirmFor === d.runId ? (
                          <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/5 p-2.5">
                            <RotateCcw className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold text-white">
                                Rollback MCP to revision <span className="font-mono">{d.runId.slice(0, 7)}</span>?
                              </div>
                              <div className="text-[11px] text-amber-200/80">
                                A new rollback commit will be created on GitHub and the current deploy will be replaced.
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmFor(null); }}
                              data-testid={`mcp-deploy-rollback-cancel-${d.runId}`}
                              className="rounded px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                              disabled={rolling}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRollback(d.runId); }}
                              data-testid={`mcp-deploy-rollback-confirm-${d.runId}`}
                              className="rounded bg-amber-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                              disabled={rolling}
                            >
                              {rolling ? 'Rolling back…' : 'Yes, rollback'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmFor(d.runId); }}
                            data-testid={`mcp-deploy-rollback-${d.runId}`}
                            className="inline-flex items-center gap-1.5 rounded border border-amber-400/40 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/10"
                          >
                            <RotateCcw className="h-3 w-3" /> Rollback to this revision
                          </button>
                        )}
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
  );
}

/* ─────────────────────────── tiny presentational helpers ──────────── */

function Tile({ label, value, detail, tone, icon: Icon, textValue }) {
  const tones = {
    amber:   'bg-orange-500/10 text-orange-200 border-orange-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25',
    rose:    'bg-rose-500/10 text-rose-200 border-rose-500/25',
    slate:   'bg-slate-950/30 text-slate-200 border-slate-800',
  };
  return (
    <div className={cn('rounded-xl border p-4', tones[tone] || tones.slate)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-70">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className={cn('mt-2 tracking-tight', textValue ? 'text-base font-semibold truncate' : 'text-2xl font-semibold')}>
        {value}
      </p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

function LinkRow({ icon: Icon, label, href, text, onCopy, copied, emphasize }) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border px-3 py-2.5',
      emphasize ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40',
    )}>
      <Icon className={cn('h-4 w-4 shrink-0', emphasize ? 'text-emerald-300' : 'text-slate-400')} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <a href={href} target="_blank" rel="noreferrer" className="block truncate text-sm text-slate-200 hover:underline" title={text}>
          {text}
        </a>
      </div>
      <a
        href={href} target="_blank" rel="noreferrer"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
        title="Open"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-300" /> : <CopyIcon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SidebarPanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1220]">
      <div className="border-b border-slate-800 px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      </div>
      <div className="space-y-2.5 p-5">{children}</div>
    </div>
  );
}

function KV({ label, value, mono }) {
  if (value === undefined || value === null || value === '') return null;
  const text = typeof value === 'string' ? value : String(value);
  return (
    <div className="flex items-start gap-3">
      <div className="w-32 shrink-0 text-[10px] uppercase tracking-wider text-slate-500 pt-0.5">{label}</div>
      <div className={cn('flex-1 min-w-0 break-words text-sm text-slate-200', mono && 'font-mono')}>{text}</div>
    </div>
  );
}

function CounterRow({ label, value, tone }) {
  const tones = {
    green: 'text-emerald-300',
    red:   'text-rose-300',
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={cn('text-sm font-semibold', tones[tone] || 'text-white')}>{value}</span>
    </div>
  );
}

function Counter({ label, value, tone, textValue }) {
  const palette = {
    orange: 'border-[#ff5b1f]/30 bg-[#ff5b1f]/5 text-orange-200',
    green:  'border-emerald-400/30 bg-emerald-400/5 text-emerald-200',
    red:    'border-rose-400/30 bg-rose-400/5 text-rose-200',
    muted:  'border-slate-800 bg-slate-950/30 text-slate-300',
  }[tone] || 'border-slate-800 bg-slate-950/30 text-slate-300';
  return (
    <div className={cn('rounded-lg border px-3 py-2', palette)}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className={cn(textValue ? 'text-sm font-semibold truncate' : 'text-xl font-bold', 'text-white')}>
        {value}
      </div>
    </div>
  );
}

function Kv({ k, children }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
