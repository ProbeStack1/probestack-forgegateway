/**
 * Step 7 — Push & Deploy.
 *
 * 3-state CTA contract:
 *
 *   STATE A — never pushed (or no commit recorded)
 *       └─ CTA: "Push & Deploy"  (orange, primary)
 *
 *   STATE B — pushed but NOT deployed (no successful deploy entry yet)
 *       └─ CTA: "Deploy"  (teal, primary)
 *
 *   STATE C — already deployed AND user has edited something
 *       └─ CTA: "Redeploy (changes detected)"  (amber, primary)
 *
 *   STATE D — already deployed AND no code changes since last push
 *       └─ CTA: disabled, message "No changes since last deploy — latest
 *               code is already live"
 *
 * On click we:
 *   1. POST `/projects/{id}/push-to-github` (which always regenerates
 *      first server-side so the latest template fixes ship).
 *   2. Mount <DeployStatusPanel/> immediately so the per-step pipeline
 *      animation is the visible feedback (no toast-only flow).
 *   3. Refetch audit + auto-expand the latest deploy entry so the user
 *      sees its conclusion / failure step the moment the polling ticks.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Rocket, GitPullRequest, Loader2, RefreshCw, CheckCircle2,
  AlertCircle, History, ChevronDown, ChevronRight, ExternalLink, RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { mcpGenerationService } from '../../../services/mcpGenerationService';
import DeployStatusPanel, { resetPollSlot } from '../components/DeployStatusPanel';
import { cn } from '../../../lib/utils';

export default function PushDeployStep({ state, dispatch, setToast }) {
  const projectId = state.projectId;
  const [pushing, setPushing]   = useState(false);
  const [pushFired, setPushFired] = useState(false);   // shown the pipeline this session?
  const [audit, setAudit]       = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const refreshAudit = async () => {
    if (!projectId) return;
    setLoadingAudit(true);
    // First call the BACKEND reconcile — this forces the server to
    // poll GitHub directly and write the latest run's terminal status
    // to the audit trail. Without this step a counter that was missed
    // (browser tab closed mid-deploy) stays at 0 until the periodic
    // 30-second scheduler eventually catches up.
    try { await mcpGenerationService.reconcileAudit(projectId); } catch { /* best-effort */ }
    const res = await mcpGenerationService.getAudit(projectId);
    setLoadingAudit(false);
    if (res.success) {
      setAudit(res.data);
      // Auto-expand the latest deploy entry so failure reasons are visible
      // without the user having to click into the row.
      const lastDeploy = (res.data?.deployHistory || []).slice(-1)[0];
      if (lastDeploy?.runId) setExpandedRunId(lastDeploy.runId);
    }
  };

  useEffect(() => { refreshAudit(); /* eslint-disable-line */ }, [projectId]);

  // Derive the state machine. `lastDeploy` is the most recent deploy
  // attempt (any status). `lastSuccessfulDeploy` is the most recent
  // success — what we contrast "no changes" against.
  const pushHistory   = audit?.pushHistory   || [];
  const deployHistory = audit?.deployHistory || [];
  const lastPush      = pushHistory.slice(-1)[0]   || null;
  const lastDeploy    = deployHistory.slice(-1)[0] || null;
  const lastSuccessfulDeploy = [...deployHistory].reverse().find(d => d.conclusion === 'success');
  const hasBeenPushed   = !!(lastPush || state.pushedCommitSha);
  const hasBeenDeployed = !!lastSuccessfulDeploy;
  const hasChanges      = !!state.touchedSinceDeploy;

  // Single source of truth for the 3-state CTA.
  const cta = useMemo(() => {
    if (!hasBeenPushed) {
      return { label: 'Push & Deploy', tone: 'orange', disabled: false };
    }
    if (hasBeenPushed && !hasBeenDeployed) {
      return { label: 'Deploy', tone: 'teal', disabled: false };
    }
    if (hasBeenDeployed && hasChanges) {
      return { label: 'Redeploy (changes detected)', tone: 'amber', disabled: false };
    }
    return {
      label: 'No changes — already deployed',
      tone: 'muted',
      disabled: true,
    };
  }, [hasBeenPushed, hasBeenDeployed, hasChanges]);

  const onCtaClick = async () => {
    if (cta.disabled || !projectId) return;
    // Clear any stale "all-green" snapshot from a previous run BEFORE
    // we kick off the new push — otherwise the user sees the old run's
    // ticks while the new run is still queued on GitHub.
    resetPollSlot(projectId);
    setPushing(true);
    setPushFired(true);
    const res = await mcpGenerationService.pushToGithub(projectId);
    setPushing(false);
    if (!res.success) {
      setToast?.({ message: `Push failed: ${res.error}`, type: 'error' });
      // Still refresh the audit so the failure entry shows.
      refreshAudit();
      return;
    }
    // Capture the fresh push metadata into state so downstream steps
    // (Step 10 Complete) know a push happened even after navigation.
    const pushed = res.data?.data || res.data || {};
    if (pushed.commitSha) {
      dispatch?.({ type: 'PATCH', payload: {
        pushedCommitSha: pushed.commitSha,
        pushedRepoUrl:   pushed.repoUrl || pushed.pushedRepoUrl,
        pushedBranch:    pushed.branch  || pushed.pushedBranch,
        touchedSinceDeploy: false,
      } });
    }
    setToast?.({ message: 'Pushed — pipeline started', type: 'success' });
    refreshAudit();
  };

  const onRollback = async (runId) => {
    if (!projectId) return;
    const res = await mcpGenerationService.rollback(projectId, { toRunId: runId });
    if (res.success) {
      setToast?.({ message: `Rolled back to ${runId.slice(0, 7)}`, type: 'success' });
      refreshAudit();
    } else {
      setToast?.({ message: `Rollback failed: ${res.error}`, type: 'error' });
    }
  };

  return (
    <div className="space-y-5">
      <StatusBanner
        cta={cta}
        hasBeenPushed={hasBeenPushed}
        hasBeenDeployed={hasBeenDeployed}
        hasChanges={hasChanges}
        lastSuccessfulDeploy={lastSuccessfulDeploy}
        lastPushSha={lastPush?.commitSha || state.pushedCommitSha}
        audit={audit}
      />

      {/* Counters strip — clarity at a glance. */}
      {audit && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Counter label="Pushes"          value={audit.totalPushes || 0}         tone="blue"/>
          <Counter label="Deploys"          value={audit.totalDeploys || 0}        tone="orange"/>
          <Counter label="Deploy Success"  value={audit.totalDeploysSuccess || 0} tone="green"/>
          <Counter label="Deploy Failed"   value={audit.totalDeploysFailed || 0}  tone="red"/>
        </div>
      )}

      {/* Primary action row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCtaClick}
          disabled={pushing || cta.disabled || !projectId}
          data-testid="push-deploy-cta"
          className={cn(
            'flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-semibold text-sm shadow-md transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            cta.tone === 'orange' && 'bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] text-white hover:shadow-lg',
            cta.tone === 'teal'   && 'bg-gradient-to-r from-[#1fbf9a] to-[#34d6b5] text-white hover:shadow-lg',
            cta.tone === 'amber'  && 'bg-gradient-to-r from-amber-500 to-orange-400 text-white hover:shadow-lg',
            cta.tone === 'muted'  && 'bg-dark-700 text-gray-400 border border-dark-600',
          )}
        >
          {pushing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : cta.tone === 'teal'  ? <ShieldCheck className="w-4 h-4" />
            : cta.tone === 'amber' ? <GitPullRequest className="w-4 h-4" />
            : <Rocket className="w-4 h-4" />}
          {pushing ? 'Working…' : cta.label}
        </button>

        {hasBeenDeployed && lastSuccessfulDeploy?.deployedUrl && (
          <a
            href={lastSuccessfulDeploy.deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="push-deploy-open-url"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#1fbf9a]/40 text-[#1fbf9a] hover:bg-[#1fbf9a]/10 text-xs font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open deployed URL
          </a>
        )}

        <button
          onClick={refreshAudit}
          disabled={loadingAudit}
          data-testid="push-deploy-refresh"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loadingAudit && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Live pipeline panel — visible WHENEVER a workflow run exists for
          this project, not only after a fresh in-session push. Mounting
          early gives the user immediate visual feedback on click. Polling
          continues at the module level so navigating to another wizard
          step does NOT cancel the deploy progress — when the user
          returns to this step the panel picks up exactly where it
          left off. */}
      {projectId && (pushFired || state.latestRunId || lastDeploy?.runId) && (
        <DeployStatusPanel
          projectId={projectId}
          microserviceId={state.microserviceMirrorId}
          pushedOk={true}
          healthPath={state.advanced?.healthCheck?.path}
          showMessage={(m, t) => setToast?.({ message: m, type: t })}
        />
      )}

      {/* History */}
      <div className="rounded-lg border border-dark-700 bg-[#0e172a]">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          data-testid="push-deploy-history-toggle"
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-dark-800/60"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#ff5b1f]" />
            <span className="text-sm font-semibold text-white">Activity timeline</span>
            {audit && (
              <span className="text-xs text-gray-400">
                · {audit.totalPushes || 0} push{(audit.totalPushes || 0) === 1 ? '' : 'es'} · {audit.totalDeploys || 0} deploy{(audit.totalDeploys || 0) === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {historyOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>

        {historyOpen && (
          <div className="border-t border-dark-700 p-3 space-y-2">
            {pushHistory.length === 0 && deployHistory.length === 0 && (
              <p className="text-xs text-gray-500 italic">No activity yet — push & deploy to see entries here.</p>
            )}
            {pushHistory.slice().reverse().map((entry, i) => (
              <Row
                key={`push-${i}`}
                icon={<GitPullRequest className={cn('w-3.5 h-3.5', entry.status === 'failed' ? 'text-red-400' : 'text-blue-400')} />}
                title={entry.status === 'failed'
                  ? `Push failed for ${entry.repoFullName || '—'}`
                  : `Pushed ${entry.fileCount ?? '—'} files to ${entry.repoFullName || '—'}`}
                meta={[
                  entry.by?.email,
                  entry.by?.timestamp ? formatTs(entry.by.timestamp) : null,
                  entry.commitSha ? `commit ${entry.commitSha.slice(0, 7)}` : null,
                  entry.status === 'failed' ? `error: ${entry.errorMessage}` : null,
                ].filter(Boolean).join(' · ')}
                tone={entry.status === 'failed' ? 'red' : 'blue'}
                linkUrl={entry.repoUrl}
                linkLabel="Repo"
              />
            ))}
            {deployHistory.slice().reverse().map((d, i) => {
              const expanded = expandedRunId === d.runId;
              const isCurrent = d.runId && state.latestRunId === d.runId;
              const isRollback = !!d.rolledBackFrom;
              return (
                <div key={`deploy-${i}`} className="rounded border border-dark-700 bg-[#0b1424] overflow-hidden">
                  <button
                    onClick={() => setExpandedRunId(expanded ? null : d.runId)}
                    data-testid={`deploy-row-${d.runId || i}`}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-dark-800/60"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {d.conclusion === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : d.conclusion ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-spin" />
                      )}
                      <span className="text-xs text-white truncate">
                        {isRollback && <span className="text-amber-300 mr-1">↺</span>}
                        {d.runId ? `Deploy ${d.runId.slice(0, 12)}` : 'Deploy pending'}
                        <span className="text-gray-500"> · {d.status}{d.conclusion ? ` / ${d.conclusion}` : ''}</span>
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-[#ff5b1f]/20 text-[#ff5b1f] font-semibold">current</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 ml-2">
                      {d.by?.email} · {d.by?.timestamp ? formatTs(d.by.timestamp) : '—'}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-dark-700/60 space-y-1.5 text-[11px]">
                      {d.deployedUrl && <Kv k="Deployed URL"><a href={d.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-[#1fbf9a] hover:underline break-all">{d.deployedUrl}</a></Kv>}
                      {d.runUrl      && <Kv k="Workflow"><a href={d.runUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{d.runUrl}</a></Kv>}
                      {d.commitSha   && <Kv k="Commit"><span className="font-mono text-gray-200">{d.commitSha.slice(0, 12)}</span></Kv>}
                      {d.failedStep  && <Kv k="Failed step"><span className="text-red-300">{d.failedStep}</span></Kv>}
                      {d.failedReason && <Kv k="Reason"><pre className="text-red-200 whitespace-pre-wrap font-mono text-[10px]">{d.failedReason}</pre></Kv>}
                      {d.durationMs   && <Kv k="Duration"><span className="text-gray-300">{Math.round(d.durationMs / 1000)}s</span></Kv>}
                      {!isCurrent && d.conclusion === 'success' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRollback(d.runId); }}
                          data-testid={`rollback-${d.runId}`}
                          className="mt-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 text-[10px] font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" /> Rollback to this revision
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────── small private primitives ─────────────────────────────

function StatusBanner({ cta, hasBeenPushed, hasBeenDeployed, hasChanges, lastSuccessfulDeploy, lastPushSha, audit }) {
  const palette = {
    orange: 'border-dark-700 bg-[#0e172a]',
    teal:   'border-[#1fbf9a]/30 bg-[#1fbf9a]/5',
    amber:  'border-amber-400/30 bg-amber-400/5',
    muted:  'border-emerald-400/30 bg-emerald-400/5',
  }[cta.tone];

  let icon = Rocket;
  let title, body;

  if (!hasBeenPushed) {
    title = 'Ready to deploy.';
    body  = 'Push the generated MCP server to GitHub and watch the Cloud Run pipeline below.';
  } else if (hasBeenPushed && !hasBeenDeployed) {
    icon  = GitPullRequest;
    title = 'Pushed — waiting on first deploy.';
    body  = `Latest commit: ${(lastPushSha || '').slice(0, 7) || '—'}. Hit "Deploy" to trigger the Cloud Run pipeline.`;
  } else if (hasBeenDeployed && hasChanges) {
    icon  = GitPullRequest;
    title = 'Changes detected since last deploy.';
    body  = (
      <>
        Local code differs from <code className="font-mono text-amber-300">{(lastPushSha || '').slice(0, 7) || 'last push'}</code>. Redeploy to ship the diff.
      </>
    );
  } else {
    icon  = CheckCircle2;
    title = 'Already deployed — nothing to do.';
    body  = (
      <>
        Current code matches the live revision (commit <code className="font-mono text-emerald-300">{(lastPushSha || '').slice(0, 7) || '—'}</code>). The CTA is disabled until you make a code change.
        {lastSuccessfulDeploy?.deployedUrl && (
          <div className="mt-2 text-[11px]">
            <a href={lastSuccessfulDeploy.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-[#1fbf9a] hover:underline break-all">{lastSuccessfulDeploy.deployedUrl}</a>
          </div>
        )}
      </>
    );
  }

  const Icon = icon;
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border', palette)} data-testid="push-deploy-banner">
      <Icon className="w-4 h-4 mt-0.5 text-[#ff5b1f] shrink-0" />
      <div className="text-xs leading-relaxed flex-1">
        <div className="text-white font-semibold mb-0.5">{title}</div>
        <div className="text-gray-300">{body}</div>
        {audit && audit.totalDeploysFailed > 0 && (
          <div className="mt-2 text-[11px] text-red-300">
            ⚠ {audit.totalDeploysFailed} failed deploy{audit.totalDeploysFailed === 1 ? '' : 's'} in history — expand below to see why.
          </div>
        )}
      </div>
    </div>
  );
}

function Counter({ label, value, tone }) {
  const palette = {
    blue:   'border-blue-400/30 bg-blue-400/5    text-blue-200',
    orange: 'border-[#ff5b1f]/30 bg-[#ff5b1f]/5  text-orange-200',
    green:  'border-emerald-400/30 bg-emerald-400/5 text-emerald-200',
    red:    'border-red-400/30 bg-red-400/5      text-red-200',
  }[tone];
  return (
    <div className={cn('rounded-lg border px-3 py-2', palette)} data-testid={`counter-${tone}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function Row({ icon, title, meta, tone, linkUrl, linkLabel }) {
  const borderTone = tone === 'red' ? 'border-red-500/30' : 'border-dark-700';
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded border', borderTone, 'bg-[#0b1424]')}>
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white truncate">{title}</div>
        {meta && <div className="text-[10px] text-gray-500 mt-0.5">{meta}</div>}
      </div>
      {linkUrl && (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
          {linkLabel} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function Kv({ k, children }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-24 shrink-0 text-[10px] uppercase tracking-wider text-gray-500">{k}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function formatTs(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch (_) { return iso; }
}
