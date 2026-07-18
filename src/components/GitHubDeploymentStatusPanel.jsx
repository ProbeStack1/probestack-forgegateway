import React from 'react';
import { AlertCircle, CheckCircle, Clock, ExternalLink, GitBranch, Loader2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const unwrapStatusPayload = (data) => data?.data ?? data ?? {};

const getStatusTone = (status, conclusion) => {
  const normalizedStatus = String(status || '').toLowerCase();
  const normalizedConclusion = String(conclusion || '').toLowerCase();
  if (['skipped', 'neutral'].includes(normalizedConclusion) || normalizedStatus === 'skipped') return 'skipped';
  if (normalizedConclusion === 'success') return 'success';
  if (
    ['failure', 'failed', 'cancelled', 'timed_out', 'action_required', 'startup_failure'].includes(normalizedConclusion)
    || ['failed', 'failure', 'cancelled', 'timed_out'].includes(normalizedStatus)
  ) return 'failed';
  if (['in_progress', 'queued', 'running', 'pending', 'waiting', 'requested'].includes(normalizedStatus)) return 'running';
  return normalizedStatus ? 'neutral' : 'empty';
};

const toneClasses = {
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
  skipped: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
  running: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
  neutral: 'border-slate-700 bg-slate-900/70 text-slate-300',
  empty: 'border-slate-700 bg-slate-900/70 text-slate-400',
};

const dotClasses = {
  success: 'border-emerald-400 bg-emerald-400 text-slate-950',
  failed: 'border-rose-400 bg-rose-400 text-slate-950',
  skipped: 'border-slate-500 bg-slate-700 text-slate-300',
  running: 'border-cyan-400 bg-cyan-400 text-slate-950',
  neutral: 'border-slate-600 bg-slate-800 text-slate-300',
  empty: 'border-slate-700 bg-slate-900 text-slate-500',
};

const StatusIcon = ({ tone }) => {
  if (tone === 'success') return <CheckCircle className="h-3.5 w-3.5" />;
  if (tone === 'failed') return <XCircle className="h-3.5 w-3.5" />;
  if (tone === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  return <Clock className="h-3.5 w-3.5" />;
};

const display = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return display(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDuration = (startedAt, completedAt) => {
  const start = startedAt ? new Date(startedAt).getTime() : 0;
  const end = completedAt ? new Date(completedAt).getTime() : 0;
  if (!start || !end || Number.isNaN(start) || Number.isNaN(end) || end < start) return 'N/A';
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

const titleCase = (value) => (
  display(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

const getStepTone = (step) => getStatusTone(step?.status, step?.conclusion);

const getGroupTone = (steps) => {
  if (!steps.length) return 'empty';
  const tones = steps.map(getStepTone);
  if (tones.some((tone) => tone === 'failed')) return 'failed';
  if (tones.some((tone) => tone === 'running')) return 'running';
  if (tones.every((tone) => tone === 'skipped')) return 'skipped';
  if (tones.every((tone) => tone === 'success' || tone === 'skipped')) return 'success';
  return 'neutral';
};

const groupNameFromMarker = (name) => {
  const startMatch = String(name || '').match(/^Start group:?\s*(.+)$/i) || String(name || '').match(/^Start group\s+(.+)$/i);
  return startMatch?.[1]?.trim() || '';
};

const isEndGroupMarker = (name) => /^End group:?/i.test(String(name || ''));

const getPipelineSteps = (payload, jobs) => {
  if (Array.isArray(payload?.stages) && payload.stages.length) return payload.stages;
  return jobs.flatMap((job) => (
    Array.isArray(job?.steps)
      ? job.steps.map((step) => ({ ...step, jobName: step.jobName || job.name }))
      : []
  ));
};

const groupPipelineSteps = (steps) => {
  const groups = [];
  let currentGroup = null;

  const ensureGroup = (name) => {
    const normalizedName = name || 'Pipeline';
    let group = groups.find((entry) => entry.name === normalizedName);
    if (!group) {
      group = { name: normalizedName, steps: [] };
      groups.push(group);
    }
    currentGroup = group;
    return group;
  };

  [...steps]
    .sort((left, right) => (left?.number || 0) - (right?.number || 0))
    .forEach((step) => {
      const groupName = groupNameFromMarker(step?.name);
      if (groupName) {
        ensureGroup(groupName);
        return;
      }

      if (isEndGroupMarker(step?.name)) {
        currentGroup = null;
        return;
      }

      const fallbackGroup = currentGroup || ensureGroup(/^Post\s+/i.test(String(step?.name || '')) ? 'Post job cleanup' : 'Setup');
      fallbackGroup.steps.push(step);
    });

  return groups.filter((group) => group.steps.length > 0);
};

const summarizeGroups = (groups) => {
  const totalSteps = groups.reduce((count, group) => count + group.steps.length, 0);
  const successfulSteps = groups.reduce(
    (count, group) => count + group.steps.filter((step) => getStepTone(step) === 'success').length,
    0
  );
  return { totalSteps, successfulSteps };
};

const StatusDetail = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1 truncate text-xs font-semibold text-slate-100" title={display(value)}>
      {display(value)}
    </p>
  </div>
);

export default function GitHubDeploymentStatusPanel({
  state,
  title = 'GitHub Pipeline Status',
  description = 'Latest GitHub deployment status for this resource.',
}) {
  const loading = Boolean(state?.loading);
  const error = state?.error || '';
  const payload = unwrapStatusPayload(state?.data);
  const run = payload?.run || payload?.workflowRun || payload?.latestRun || {};
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : Array.isArray(payload?.workflowJobs) ? payload.workflowJobs : [];
  const steps = getPipelineSteps(payload, jobs);
  const stageGroups = groupPipelineSteps(steps);
  const stageSummary = summarizeGroups(stageGroups);
  const deployment = state?.history || payload?.deployment || {};
  const status = payload?.deploymentStatus || run?.status || payload?.status || deployment?.status;
  const conclusion = run?.conclusion || payload?.conclusion || payload?.latestRunConclusion;
  const tone = getStatusTone(status, conclusion);
  const runUrl = run?.html_url || run?.htmlUrl || payload?.runUrl || payload?.workflowRunUrl;
  const currentStageNumber = payload?.currentStage?.number;
  const currentStageName = payload?.currentStage?.name;

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <GitBranch className="h-4 w-4 text-[#ff8a5c]" />
            {title}
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {!loading && !error && (
          <span className={cn('inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', toneClasses[tone])}>
            <StatusIcon tone={tone} />
            {display(conclusion || status)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`github-status-skeleton-${index}`} className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3">
              <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-4 w-28 animate-pulse rounded-full bg-white/[0.08]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !state?.data ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">
          No GitHub pipeline status is available yet.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <StatusDetail label="Deployment ID" value={deployment?.deploymentId || deployment?.id || payload?.deploymentId} />
            <StatusDetail label="Run ID" value={run?.id || payload?.runId} />
            <StatusDetail label="Repository" value={payload?.repo || payload?.repoName} />
            <StatusDetail label="Workflow" value={run?.name || payload?.workflowName || payload?.workflow} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white" title={display(run?.displayTitle || run?.name)}>
                  {display(run?.displayTitle || run?.name)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {stageSummary.successfulSteps} of {stageSummary.totalSteps || steps.length || jobs.length} steps complete
                  {currentStageName ? ` | Current: ${currentStageName}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <StatusDetail label="Started" value={formatDateTime(run?.createdAt || run?.created_at)} />
                <StatusDetail label="Updated" value={formatDateTime(run?.updatedAt || run?.updated_at)} />
                <StatusDetail label="Duration" value={formatDuration(run?.createdAt || run?.created_at, run?.updatedAt || run?.updated_at)} />
              </div>
            </div>
            <div className="h-1.5 bg-slate-900">
              <div
                className={cn(
                  'h-full rounded-r-full transition-all',
                  tone === 'failed'
                    ? 'bg-rose-400'
                    : tone === 'running'
                      ? 'bg-cyan-400'
                      : tone === 'skipped'
                        ? 'bg-slate-500'
                        : 'bg-emerald-400'
                )}
                style={{ width: `${stageSummary.totalSteps ? Math.round((stageSummary.successfulSteps / stageSummary.totalSteps) * 100) : 0}%` }}
              />
            </div>
          </div>

          {runUrl && (
            <a
              href={runUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open GitHub run
            </a>
          )}

          {stageGroups.length > 0 ? (
            <div className="space-y-3">
              {stageGroups.map((group, groupIndex) => {
                const groupTone = getGroupTone(group.steps);
                const groupDuration = formatDuration(group.steps[0]?.startedAt, group.steps[group.steps.length - 1]?.completedAt);
                const openByDefault = groupIndex < 2 || groupTone !== 'success' || group.steps.some((step) => step.number === currentStageNumber);

                return (
                  <details
                    key={`${group.name}-${groupIndex}`}
                    open={openByDefault}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/25"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', dotClasses[groupTone])}>
                          <StatusIcon tone={groupTone} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{group.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {group.steps.length} steps | {groupDuration}
                          </p>
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold', toneClasses[groupTone])}>
                        {titleCase(groupTone)}
                      </span>
                    </summary>

                    <div className="border-t border-white/10 px-4 py-3">
                      <div className="space-y-2">
                        {group.steps.map((step, stepIndex) => {
                          const stepTone = getStepTone(step);
                          const isCurrent = step.number === currentStageNumber;

                          return (
                            <div
                              key={`${group.name}-${step.number || stepIndex}-${step.name}`}
                              className={cn(
                                'grid gap-3 rounded-xl border px-3 py-2 text-xs md:grid-cols-[34px_minmax(0,1fr)_105px_120px]',
                                isCurrent
                                  ? 'border-cyan-400/35 bg-cyan-500/10'
                                  : 'border-white/8 bg-white/[0.02]'
                              )}
                            >
                              <div className="flex items-center">
                                <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px]', dotClasses[stepTone])}>
                                  <StatusIcon tone={stepTone} />
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-100" title={display(step.name)}>
                                  {step.number ? `${step.number}. ` : ''}{display(step.name)}
                                </p>
                                <p className="mt-0.5 truncate text-slate-500" title={display(step.jobName)}>
                                  {display(step.jobName)}
                                </p>
                              </div>
                              <span className={cn('inline-flex h-fit w-fit items-center gap-1 rounded-full border px-2 py-1 font-semibold', toneClasses[stepTone])}>
                                {display(step.conclusion || step.status)}
                              </span>
                              <div className="text-slate-500">
                                <p>{formatDuration(step.startedAt, step.completedAt)}</p>
                                <p className="mt-0.5 truncate" title={formatDateTime(step.completedAt || step.startedAt)}>
                                  {formatDateTime(step.completedAt || step.startedAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : jobs.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] bg-slate-950/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Job</span>
                <span>Status</span>
                <span>Conclusion</span>
              </div>
              <div className="divide-y divide-white/8">
                {jobs.map((job, index) => (
                  <div key={job.id || `${job.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px_120px] px-3 py-2 text-xs text-slate-300">
                    <span className="truncate font-medium text-slate-100" title={display(job.name)}>{display(job.name)}</span>
                    <span>{display(job.status)}</span>
                    <span>{display(job.conclusion)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
