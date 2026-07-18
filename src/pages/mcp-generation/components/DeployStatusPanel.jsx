/**
 * DeployStatusPanel — animated push → GitHub Actions pipeline progress.
 *
 * The stages we animate are taken DIRECTLY from `mcp.yml.template`:
 *
 *   Job: lint-and-test
 *     1. Checkout code
 *     2. Setup runtime (Node 20 / Python 3.11 / Java 17 + cache)
 *     3. Install deps · build · tests
 *
 *   Job: deploy-to-cloud-run
 *     4. Authenticate to Google Cloud (workload identity)
 *     5. Set up Cloud SDK
 *     6. Configure Docker for Artifact Registry
 *     7. Build and Push Docker Image
 *     8. Deploy to Cloud Run
 *     9. Get Service URL
 *    10. Health Check (curl ${SERVICE_URL}/healthz × 5)
 *
 * We poll TWO endpoints (both on the SENIOR team's api-development-svc):
 *
 *   • getLatestGitHubRun(microserviceId)  → run-level status + runId + deploymentId
 *   • getGithubPipelineStatus(microserviceId, deploymentId) → per-job/step matrix
 *
 * If pipeline-status returns useful per-step data we render the real
 * step state; otherwise we degrade gracefully to a coarse status
 * (queued / in_progress / completed) split across the 10 stages.
 *
 * On a green deploy we also fire `onSuccess(deployedServiceUrl)` exactly
 * once so the parent can auto-register the MCP in Test Studio.
 */
import { useEffect, useState } from 'react';
import {
  CheckCircle2, AlertCircle, Loader2, GitBranch, Github, Cloud,
  Activity, ExternalLink, Rocket, ShieldCheck, Box, Server, Container,
  Hammer, FlaskConical, Globe2,
} from 'lucide-react';
import { apiDevelopmentService } from '../../../services/apiDevelopmentService';
import { mcpGenerationService } from '../../../services/mcpGenerationService';

const POLL_INTERVAL_MS  = 5000;
const POLL_MAX_ATTEMPTS = 72;     // 72 × 5 s = 6 minutes

/** The 10 visible stages — Push + the 9 ordered steps from `mcp.yml`.
 *  The legacy `health` stage was removed (workflow no longer probes
 *  /healthz — Cloud Run rollout verification is the authoritative
 *  success signal). The /healthz route is still generated in the
 *  server code for production monitoring. */
const STAGES = [
  { id: 'push',     label: 'Push to GitHub',          icon: Github,       job: 'push'   },
  { id: 'checkout', label: 'Checkout code',           icon: GitBranch,    job: 'test',   keys: ['checkout'] },
  { id: 'setup',    label: 'Setup runtime + cache',   icon: Server,       job: 'test',   keys: ['set up', 'setup', 'cache'] },
  { id: 'test',     label: 'Install · build · tests', icon: FlaskConical, job: 'test',   keys: ['install', 'build', 'test', 'package', 'mvn'] },
  { id: 'auth',     label: 'Authenticate to GCP',     icon: ShieldCheck,  job: 'deploy', keys: ['authenticate', 'workload'] },
  { id: 'gcloud',   label: 'Set up Cloud SDK',        icon: Cloud,        job: 'deploy', keys: ['cloud sdk', 'setup-gcloud', 'gcloud'] },
  { id: 'docker',   label: 'Configure Docker',        icon: Box,          job: 'deploy', keys: ['configure docker'] },
  { id: 'image',    label: 'Build & push image',      icon: Container,    job: 'deploy', keys: ['build and push', 'docker image'] },
  { id: 'deploy',   label: 'Deploy to Cloud Run',     icon: Hammer,       job: 'deploy', keys: ['deploy to cloud run', 'cloud run', 'verify cloud run', 'verify rollout'] },
  { id: 'url',      label: 'Get Service URL',         icon: Globe2,       job: 'deploy', keys: ['service url', 'get url'] },
];

/** stage state values: 'pending' | 'running' | 'success' | 'failure' | 'skipped' */
const allPending = () => STAGES.reduce((acc, s) => ({ ...acc, [s.id]: 'pending' }), {});

/**
 * Build stage-specific "Step output" rows for the detail modal so the
 * user sees the ACTUAL artefact a step produced (not just a "View on
 * GitHub" link). Returns an array of `{ label, value, href? }` or [].
 * Only rendered for stages we can populate meaningfully — silent for
 * the rest so we don't fake data.
 */
function buildStageExtras(stageId, stageStatus, ctx) {
  const { deployedUrl, runMeta, healthPath, imageTag } = ctx || {};
  const repoUrl = runMeta?.repo
    ? (runMeta.repo.startsWith('http') ? runMeta.repo : `https://github.com/${runMeta.repo}`)
    : null;
  const repoName = runMeta?.repoName || runMeta?.repo;

  switch (stageId) {
    case 'push':
      // Where the bits landed.
      return [
        repoName ? { label: 'Repository', value: repoName, href: repoUrl } : null,
        runMeta?.runId ? { label: 'Workflow run', value: `#${runMeta.runId}`, href: runMeta.htmlUrl } : null,
      ].filter(Boolean);
    case 'image':
      // Image registry path the workflow built/pushed.
      return imageTag ? [{ label: 'Image tag', value: imageTag }] : [];
    case 'deploy':
      // Cloud Run revision URL (same as deployedUrl once revision is live).
      return deployedUrl ? [{ label: 'Revision URL', value: deployedUrl, href: deployedUrl }] : [];
    case 'url':
      // The whole point of this step — emit the URL it captured.
      return deployedUrl ? [{ label: 'Service URL', value: deployedUrl, href: deployedUrl }] : [];
    default:
      return [];
  }
}

/* ───────────────────────────────────────────────────────────────────
 * Background poll registry — survives unmount/remount.
 *
 * Plain ES module-level Map keyed by projectId. When the user clicks
 * Push & Deploy on Step 7 we start polling the workflow run + per-step
 * matrix here, and we keep polling even if the user navigates to a
 * different wizard step (which unmounts `DeployStatusPanel`).
 *
 * On re-mount the panel pulls the latest snapshot from the registry
 * and subscribes for further updates — so the user always sees the
 * current state, never a fresh "0%" start.
 * ──────────────────────────────────────────────────────────────── */
const POLL_REGISTRY = new Map();

function getPollSlot(projectId) {
  if (!POLL_REGISTRY.has(projectId)) {
    POLL_REGISTRY.set(projectId, {
      stages: allPending(),
      stepDetails: {},
      runMeta: null,
      deployedUrl: null,
      done: false,
      attempts: 0,
      timerId: null,
      listeners: new Set(),
      lastOnSuccess: null,
    });
  }
  return POLL_REGISTRY.get(projectId);
}

function notify(projectId) {
  const slot = POLL_REGISTRY.get(projectId);
  if (!slot) return;
  // snapshot a plain object so React sees a new reference.
  const snap = {
    stages: { ...slot.stages },
    stepDetails: { ...slot.stepDetails },
    runMeta: slot.runMeta,
    deployedUrl: slot.deployedUrl,
    done: slot.done,
  };
  slot.listeners.forEach(fn => { try { fn(snap); } catch { /* listener errors are non-fatal */ } });
}

async function pollTick(projectId, microserviceId) {
  const slot = POLL_REGISTRY.get(projectId);
  if (!slot) return;
  slot.attempts += 1;

  let runData = {};
  try {
    const r = await mcpGenerationService.getLatestWorkflowRun(projectId);
    if (r?.success) runData = r?.data?.data || r?.data || {};
  } catch { runData = {}; }
  if (!runData?.runFound) {
    try {
      const r2 = await apiDevelopmentService.getLatestGitHubRun(microserviceId);
      if (r2?.success) runData = r2?.data?.data || r2?.data || runData;
    } catch { /* keep what we had */ }
  }

  // ── New-run detection ────────────────────────────────────────────
  // The slot may already hold a `done=true` snapshot from a PREVIOUS
  // workflow run (e.g. user pushed once, that run completed, now they
  // pushed again). When GitHub returns a different runId we MUST
  // reset stages to pending so the UI stops showing stale green ticks
  // while the new run is actually still in flight.
  const incomingRunId = runData?.runId || runData?.run?.id;
  const previousRunId = slot.runMeta?.runId;
  if (incomingRunId && previousRunId && String(incomingRunId) !== String(previousRunId)) {
    slot.stages      = allPending();
    slot.stages.push = 'success';   // we know push happened to trigger the run
    slot.stepDetails = {};
    slot.deployedUrl = null;
    slot.done        = false;
    slot.attempts    = 1;
  }
  // If the slot was previously marked done but no new run exists yet,
  // we simply re-broadcast the last known snapshot and bail.
  if (slot.done && (!incomingRunId || String(incomingRunId) === String(previousRunId))) {
    notify(projectId);
    return;
  }

  let pipelineData = null;
  const runId = incomingRunId;
  if (runId) {
    try {
      const ps = await mcpGenerationService.getWorkflowRunSteps(projectId, runId);
      if (ps?.success) pipelineData = ps?.data?.data || ps?.data || null;
    } catch { pipelineData = null; }
  }
  if (!pipelineData && runData?.deploymentId) {
    try {
      const ps = await apiDevelopmentService.getGithubPipelineStatus(microserviceId, runData.deploymentId);
      if (ps?.success) pipelineData = ps?.data?.data || ps?.data || null;
    } catch { pipelineData = null; }
  }

  const fromSteps = mapPipelineSteps(pipelineData, true);
  const computed  = fromSteps ? fromSteps.next : mapCoarse(true, runData?.run, runData?.deploymentStatus);
  slot.stages = computed;
  if (fromSteps?.rawByStage) slot.stepDetails = fromSteps.rawByStage;

  const run = runData?.run || {};
  slot.runMeta = {
    runId:            runData?.runId,
    htmlUrl:          run?.htmlUrl,
    repo:             runData?.repo,
    repoName:         runData?.repoName,
    deploymentStatus: runData?.deploymentStatus,
    conclusion:       run?.conclusion,
    status:           run?.status,
  };

  const isFinal = run?.status === 'completed'
    || ['SUCCESS', 'FAILED', 'CANCELLED'].includes((runData?.deploymentStatus || '').toUpperCase());

  if (isFinal) {
    try {
      const proj = await mcpGenerationService.getProject(projectId);
      const p = proj?.data?.data || proj?.data || {};
      slot.deployedUrl = p?.deployedServiceUrl || p?.pushedActionsUrl || null;
    } catch { /* leave deployedUrl null */ }
    slot.done = true;
    notify(projectId);
    const allGreen = STAGES.every(s => ['success', 'skipped'].includes(computed[s.id]));
    if (allGreen && typeof slot.lastOnSuccess === 'function') {
      try { slot.lastOnSuccess(slot.deployedUrl); } catch { /* user callback failures are non-fatal */ }
      slot.lastOnSuccess = null;
    }
    return;
  }
  notify(projectId);
  if (slot.attempts >= POLL_MAX_ATTEMPTS) { slot.done = true; notify(projectId); return; }
  slot.timerId = setTimeout(() => pollTick(projectId, microserviceId), POLL_INTERVAL_MS);
}

/** Starts polling for `projectId`. Safe to call repeatedly — if a
 *  previous run completed (slot.done=true) we still kick off a fresh
 *  poll tick so the next GitHub run is picked up immediately. */
function startBackgroundPoll(projectId, microserviceId, onSuccess) {
  if (!projectId) return;
  const slot = getPollSlot(projectId);
  slot.lastOnSuccess = onSuccess || slot.lastOnSuccess;
  if (slot.timerId) return;     // already polling
  // Reset `done` flag — pollTick itself will decide whether the new
  // GitHub run differs from the previous one and reset stages.
  slot.done = false;
  slot.attempts = 0;
  if (slot.stages.push !== 'success') slot.stages.push = 'success';
  pollTick(projectId, microserviceId);
}

/**
 * Public hook for callers that just pushed a fresh commit and want
 * the panel to forget any stale "done/all-green" state immediately —
 * before the first poll round has even completed. Used by Step 7's
 * Deploy button and Step 10's Push CTA so the user never sees the
 * previous run's ticks while the new run is queued.
 */
export function resetPollSlot(projectId) {
  if (!projectId) return;
  const slot = POLL_REGISTRY.get(projectId);
  if (!slot) return;
  if (slot.timerId) { try { clearTimeout(slot.timerId); } catch { /* noop */ } slot.timerId = null; }
  slot.stages      = (() => { const i = allPending(); i.push = 'success'; return i; })();
  slot.stepDetails = {};
  slot.runMeta     = null;
  slot.deployedUrl = null;
  slot.done        = false;
  slot.attempts    = 0;
  notify(projectId);
}

/**
 * Project the senior team's per-step pipeline-status response onto our
 * canonical 11-row stage list. The response shape is normalised by
 * api-development-svc — we look for `jobs[].steps[]` with `name`,
 * `status` (queued|in_progress|completed) and `conclusion` (success|failure|...).
 *
 * Returns two parallel maps: `next` keyed by stage id → status string,
 * and `rawByStage` keyed by stage id → the underlying step object
 * (used by the click-to-inspect modal so the user sees the actual step
 * name / conclusion / timestamps / failure log).
 */
const mapPipelineSteps = (pipelineData, pushedOk) => {
  if (!pipelineData) return null;
  const jobs = Array.isArray(pipelineData?.jobs) ? pipelineData.jobs : [];
  if (jobs.length === 0) return null;
  const allSteps = [];
  for (const job of jobs) {
    for (const step of (job?.steps || [])) {
      allSteps.push({
        name:       String(step?.name || ''),
        status:     (step?.status || '').toLowerCase(),
        conclusion: (step?.conclusion || '').toLowerCase(),
        startedAt:  step?.started_at || step?.startedAt,
        completedAt: step?.completed_at || step?.completedAt,
        number:     step?.number,
        jobName:    job?.name,
        jobHtmlUrl: job?.html_url || job?.htmlUrl,
      });
    }
  }
  const next = allPending();
  const rawByStage = {};
  if (pushedOk) next.push = 'success';
  for (const stage of STAGES) {
    if (stage.id === 'push') continue;
    const keys = stage.keys || [];
    const matched = allSteps.find(s => keys.some(k => s.name.toLowerCase().includes(k)));
    if (!matched) continue;
    rawByStage[stage.id] = matched;
    if (matched.status === 'queued')      next[stage.id] = 'pending';
    else if (matched.status === 'in_progress') next[stage.id] = 'running';
    else if (matched.status === 'completed') {
      if (matched.conclusion === 'success')      next[stage.id] = 'success';
      else if (matched.conclusion === 'skipped') next[stage.id] = 'skipped';
      else if (matched.conclusion === 'failure' || matched.conclusion === 'cancelled' || matched.conclusion === 'timed_out')
        next[stage.id] = 'failure';
      else next[stage.id] = 'success';
    }
  }
  return { next, rawByStage };
};

/**
 * Coarse fallback when per-step data isn't available. We only have
 * the workflow-level status, so we mark stages progressively:
 *  - queued/requested → only `push` is green
 *  - in_progress → push + first half of stages green, current running
 *  - completed/success → all green
 *  - completed/failure → progressively green up to the suspected failing job
 */
const mapCoarse = (pushedOk, run, deploymentStatus) => {
  const next = allPending();
  if (pushedOk) next.push = 'success';
  if (!run) return next;

  const status     = (run.status || '').toLowerCase();
  const conclusion = (run.conclusion || '').toLowerCase();
  const deployFailed = String(deploymentStatus || '').toUpperCase() === 'FAILED';

  const TEST_STAGES   = STAGES.filter(s => s.job === 'test').map(s => s.id);
  const DEPLOY_STAGES = STAGES.filter(s => s.job === 'deploy').map(s => s.id);

  if (status === 'queued' || status === 'requested') {
    next.checkout = 'running';
  } else if (status === 'in_progress') {
    TEST_STAGES.forEach(id => { next[id] = 'success'; });
    next.auth = 'running';
  } else if (status === 'completed') {
    if (conclusion === 'success') {
      [...TEST_STAGES, ...DEPLOY_STAGES].forEach(id => { next[id] = 'success'; });
    } else {
      // Some step failed. If senior surfaced a deploy-level failure
      // mark the deploy step itself as red, otherwise the build/test job.
      TEST_STAGES.forEach(id => { next[id] = deployFailed ? 'success' : 'failure'; });
      if (deployFailed) {
        DEPLOY_STAGES.forEach((id, i) => { next[id] = i < 4 ? 'success' : (i === 4 ? 'failure' : 'pending'); });
      }
    }
  }
  return next;
};

export default function DeployStatusPanel({
  projectId,
  microserviceId,
  pushedOk,
  // pushedRepoUrl is intentionally not surfaced in the compact layout —
  // the repo link lives on the left "Pushed" card instead so the two
  // panels don't duplicate the same link.
  initialActionsUrl,
  onSuccess,
  // healthPath / imageTag let the parent surface stage-specific outputs
  // (e.g. user's custom /health URL, the GCR image tag) inside the
  // per-step click-to-inspect modal. Both are optional.
  healthPath,
  imageTag,
}) {
  // Subscribe to the module-level background poll so progress is
  // preserved across step navigation. Initial state seeds from whatever
  // snapshot the slot already holds (i.e. progress made while the panel
  // was unmounted) so the user never sees a fresh "0%" on re-entry.
  const [snap, setSnap] = useState(() => {
    if (!projectId) {
      return {
        stages: (() => { const i = allPending(); if (pushedOk) i.push = 'success'; return i; })(),
        stepDetails: {},
        runMeta: null,
        deployedUrl: null,
        done: false,
      };
    }
    const slot = getPollSlot(projectId);
    if (pushedOk && slot.stages.push !== 'success') slot.stages.push = 'success';
    return {
      stages: { ...slot.stages },
      stepDetails: { ...slot.stepDetails },
      runMeta: slot.runMeta,
      deployedUrl: slot.deployedUrl,
      done: slot.done,
    };
  });
  const [openStageId, setOpenStageId] = useState(null);

  const stages       = snap.stages;
  const stepDetails  = snap.stepDetails;
  const runMeta      = snap.runMeta;
  const deployedUrl  = snap.deployedUrl;
  const done         = snap.done;

  // Subscribe + kick off polling whenever we have a push.
  useEffect(() => {
    if (!projectId || !pushedOk) return undefined;
    const slot = getPollSlot(projectId);
    const listener = (next) => setSnap(next);
    slot.listeners.add(listener);
    // (Re-)start polling if nothing is in flight yet.
    startBackgroundPoll(projectId, microserviceId, onSuccess);
    return () => { slot.listeners.delete(listener); };
  }, [projectId, microserviceId, pushedOk, onSuccess]);

  if (!pushedOk) return null;

  const actionsHref = runMeta?.htmlUrl || initialActionsUrl;

  return (
    <div data-testid="deploy-status-panel"
         className="text-left p-4 rounded-xl border border-dark-700 bg-dark-900/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Rocket className="w-4 h-4 text-[#ff5b1f] shrink-0" />
          <h3 className="text-[13px] font-semibold text-white">Live deployment status</h3>
          <span className="text-[9px] uppercase tracking-wider text-gray-500 ml-1 hidden sm:inline">mirrors mcp.yml</span>
        </div>
        {!done && (
          <span className="text-[10px] text-gray-400 inline-flex items-center gap-1 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" /> 5 s
          </span>
        )}
      </div>

      <ol className="space-y-1">
        {STAGES.map(({ id, label, icon: Icon }) => {
          const s = stages[id] || 'pending';
          const colour = {
            pending: 'border-dark-700/60 bg-dark-800/30 text-gray-500',
            running: 'border-blue-500/30 bg-blue-500/5 text-blue-200',
            success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
            failure: 'border-red-500/30 bg-red-500/5 text-red-200',
            skipped: 'border-gray-600/30 bg-gray-600/5 text-gray-400 italic',
          }[s];
          const iconNode = s === 'running'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : s === 'success'
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : s === 'failure'
                ? <AlertCircle className="w-3.5 h-3.5" />
                : <Icon className="w-3.5 h-3.5" />;
          return (
            <li key={id}
                data-testid={`deploy-stage-${id}-${s}`}
                onClick={() => setOpenStageId(id)}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer hover:brightness-125 ${colour}`}>
              <div className="shrink-0">{iconNode}</div>
              <div className="flex-1 min-w-0 text-[12px] font-medium truncate">{label}</div>
              <div className="text-[9px] uppercase tracking-wider opacity-70 shrink-0">{s}</div>
            </li>
          );
        })}
      </ol>

      {/* Step-detail modal — click any pipeline row to drill in. Renders
          the raw step name, conclusion, timing, AND stage-specific
          output (deployed URL, health endpoint, image tag, repo URL).
          Falls back to a workflow-run deep link when no extras exist. */}
      <StepDetailModal
        isOpen={!!openStageId}
        stage={STAGES.find(s => s.id === openStageId)}
        status={openStageId ? (stages[openStageId] || 'pending') : null}
        detail={openStageId ? stepDetails[openStageId] : null}
        actionsHref={runMeta?.htmlUrl || initialActionsUrl}
        extras={openStageId ? buildStageExtras(openStageId, stages[openStageId], {
          deployedUrl,
          runMeta,
          healthPath,
          imageTag,
        }) : []}
        onClose={() => setOpenStageId(null)}
      />

      {(runMeta?.runId || deployedUrl) && (
        <div className="mt-3 space-y-1.5 text-[11px]">
          {runMeta?.runId && actionsHref && (
            <a href={actionsHref} target="_blank" rel="noreferrer"
               data-testid="deploy-run-link"
               className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-dark-800/40 border border-dark-700 hover:border-emerald-500/40 transition-colors">
              <span className="text-gray-400">workflow run</span>
              <span className="font-mono text-emerald-300 inline-flex items-center gap-1">
                #{runMeta.runId} <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          )}
          {deployedUrl && (
            <a href={deployedUrl} target="_blank" rel="noreferrer"
               data-testid="deployed-url-link"
               className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/40 hover:border-emerald-400">
              <span className="text-gray-300 shrink-0">deployed</span>
              <span className="font-mono text-emerald-200 inline-flex items-center gap-1 truncate">
                {deployedUrl.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 shrink-0" />
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight detail modal — anchored centre, dismiss-on-overlay-click,
 * showing the raw step metadata for the clicked pipeline row + a
 * stage-specific "Step output" block so e.g. the `Get Service URL` row
 * actually shows the deployed URL it emitted, the Health Check row
 * shows the URL it curled, and the Build & Push row shows the image
 * tag. Falls back to the workflow-run deep link when no extras exist.
 */
function StepDetailModal({ isOpen, stage, status, detail, actionsHref, extras, onClose }) {
  if (!isOpen || !stage) return null;

  const tone = {
    pending: { txt: 'text-gray-300',     ring: 'border-dark-700',          label: 'Queued'      },
    running: { txt: 'text-blue-200',     ring: 'border-blue-500/40',       label: 'Running'     },
    success: { txt: 'text-emerald-200',  ring: 'border-emerald-500/40',    label: 'Succeeded'   },
    failure: { txt: 'text-red-200',      ring: 'border-red-500/40',        label: 'Failed'      },
    skipped: { txt: 'text-gray-400',     ring: 'border-gray-600/40',       label: 'Skipped'     },
  }[status] || { txt: 'text-gray-200', ring: 'border-dark-700', label: status || 'unknown' };

  const fmt = (iso) => { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' }); } catch (_) { return iso; } };
  const durationMs = (detail?.startedAt && detail?.completedAt)
    ? Math.max(0, new Date(detail.completedAt).getTime() - new Date(detail.startedAt).getTime())
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
         onClick={onClose}
         data-testid="step-detail-modal-backdrop">
      <div className={`w-full max-w-lg rounded-xl border-2 shadow-2xl overflow-hidden ${tone.ring}`}
           style={{ backgroundColor: 'rgb(22 27 48)' }}
           onClick={(e) => e.stopPropagation()}
           data-testid="step-detail-modal">
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="w-4 h-4 text-[#ff5b1f] shrink-0" />
            <h3 className="text-sm font-semibold text-white truncate">{stage.label}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${tone.txt} ${tone.ring} border`}>
              {tone.label}
            </span>
          </div>
          <button onClick={onClose}
                  data-testid="step-detail-modal-close"
                  className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="p-5 space-y-2 text-xs">
          {detail ? (
            <>
              <Kv label="Step name">{detail.name || '—'}</Kv>
              {detail.jobName && <Kv label="Job">{detail.jobName}</Kv>}
              <Kv label="Status">{detail.status || '—'}</Kv>
              <Kv label="Conclusion">
                <span className={tone.txt}>{detail.conclusion || '—'}</span>
              </Kv>
              {detail.startedAt   && <Kv label="Started">{fmt(detail.startedAt)}</Kv>}
              {detail.completedAt && <Kv label="Finished">{fmt(detail.completedAt)}</Kv>}
              {durationMs != null && <Kv label="Duration">{(durationMs / 1000).toFixed(1)}s</Kv>}
              {detail.conclusion === 'failure' && (
                <div className="p-3 rounded border border-red-500/30 bg-red-500/5 text-red-300 text-[11px] mt-2">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> This step failed
                  </div>
                  <div className="text-red-200/80">
                    GitHub Actions reported a failure for this step. Open the workflow run link below
                    to see the full byte-by-byte logs and the exact error message.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-3 rounded border border-dark-700 bg-dark-800/30 text-gray-400 text-[11px]">
              Per-step details are not available yet — only workflow-level status was returned.
              Open the workflow run link below to inspect this step on the GitHub Actions page.
            </div>
          )}

          {/* Stage-specific extras — render real outputs (not just a
              "View on GitHub" link). E.g. the `Get Service URL` row
              should show the deployed URL it produced; the health step
              should show the URL that was curled, etc. Each extras
              block is rendered ONLY when the underlying value exists,
              so we never spam empty placeholders. */}
          {extras && extras.length > 0 && (
            <div className="mt-3 p-3 rounded border border-emerald-500/20 bg-emerald-500/[0.03] space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold mb-1">
                Step output
              </div>
              {extras.map((row, i) => (
                <Kv key={i} label={row.label}>
                  {row.href ? (
                    <a href={row.href} target="_blank" rel="noopener noreferrer"
                       className="text-emerald-300 hover:underline break-all inline-flex items-center gap-1">
                      {row.value} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-200 break-all font-mono text-[11px]">{row.value}</span>
                  )}
                </Kv>
              ))}
            </div>
          )}

          {actionsHref && (
            <a href={actionsHref} target="_blank" rel="noreferrer"
               data-testid="step-detail-modal-actions-link"
               className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-dark-800/60 border border-dark-700 hover:border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
              View on GitHub Actions <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Kv({ label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-24 shrink-0 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="flex-1 min-w-0 text-gray-200 break-words">{children}</div>
    </div>
  );
}
