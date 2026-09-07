import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Code,
  Download,
  FileText,
  GitBranch,
  History as HistoryIcon,
  Info,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Mail,
  Network,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
  XCircle,
} from "lucide-react";
import { complianceService } from "../services/complianceService";
import { owaspService } from "../services/owaspService";
import { onboardingService } from "../services/onboardingService";
import { apigeeProxyService } from "../services/apigeeProxyService";
import { apigeeLintService } from "../services/apigeeLintService";
import { apiDesignService } from "../services/apiDesignService";
import { specScoreService } from "../services/specScoreService";
import { Card } from "../components/ui/card";
import { cn } from "../lib/utils";
import API_BASE_URL from "../config/apiConfig";

// ----------------------------------------------------------------------
// helpers & constants
// ----------------------------------------------------------------------
const POLL_INTERVAL_MS = 2500;

const ASSET_TYPES = [
  { key: "MICROSERVICE", label: "Microservice", icon: "Server" },
  { key: "APIGEE_PROXY", label: "Apigee", icon: "Network" },
  { key: "KONG", label: "Kong", icon: "GitBranch" },
];

const SEVERITY_STYLES = {
  MANDATORY: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  RECOMMENDED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  OPTIONAL: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

// Severity keys as returned by /v1/score (lowercase, spectral-style), distinct
// from the MANDATORY/RECOMMENDED/OPTIONAL rule severities above.
const SCORE_SEVERITY_CONFIG = {
  error: { label: "Error", text: "text-red-400", pillBg: "bg-red-500/15", dot: "bg-red-400", Icon: AlertCircle },
  warn: { label: "Warning", text: "text-yellow-400", pillBg: "bg-yellow-500/15", dot: "bg-yellow-400", Icon: AlertTriangle },
  info: { label: "Info", text: "text-blue-400", pillBg: "bg-blue-500/15", dot: "bg-blue-400", Icon: Info },
  hint: { label: "Hint", text: "text-gray-400", pillBg: "bg-gray-500/15", dot: "bg-gray-500", Icon: Lightbulb },
};

// score tiers reused from SpectralLintPanel's look so both linting surfaces feel
// like one system.
const scoreTierColors = (score) => {
  if (score >= 80) return { text: "text-green-400", bar: "from-green-500 to-emerald-400" };
  if (score >= 60) return { text: "text-yellow-400", bar: "from-yellow-500 to-amber-400" };
  return { text: "text-red-400", bar: "from-red-500 to-rose-400" };
};

const STATUS_STYLES = {
  PASSED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  FAILED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  SKIPPED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const getLoggedInUserEmail = () =>
  localStorage.getItem("userEmail") ||
  localStorage.getItem("email") ||
  "abc@probestack.io";

// Backend rule evaluators now return a JSON envelope in scanResult.message:
//   { status, whatItTests, howItWorks, evidence, recommendation, durationMs }
// parseRuleMessage() turns that into an object the UI can render in the rule
// details drawer. When the message is plain text (older scans), it returns
// { evidence: <the raw text> } so the renderer stays backwards compatible.
const parseRuleMessage = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_e) {
      /* fall through to plain-text rendering */
    }
  }
  // Some upstream archive failures prefix the JSON with a hint — try to peel it off.
  const pipe = trimmed.indexOf(" | {");
  if (pipe > 0) {
    try {
      const parsed = JSON.parse(trimmed.slice(pipe + 3));
      if (parsed && typeof parsed === "object") {
        return { ...parsed, evidencePrefix: trimmed.slice(0, pipe).trim() };
      }
    } catch (_e) {
      /* fall through to plain-text rendering */
    }
  }
  return { evidence: trimmed };
};

// A rule is runnable once it's enabled AND the backend has approved it — pre-defined
// catalog rules (compliance/OWASP) come back as "ACTIVE", while custom rules submitted
// through the Add Custom Rule flow go through REQUESTED → "READY" (or REJECTED).
const isRuleReady = (rule) =>
  !!rule?.enabled && (rule.status === "READY" || rule.status === "ACTIVE");

// Normalises a /lint/v1/rules entry ({ ruleId, name, description, severity: 1|2,
// nodeType, enabled, source, file }) into the shape RuleCard/isRuleReady expect
// ({ ruleId, ruleName, ruleDescription, severity: MANDATORY|RECOMMENDED, status }).
// This API has no separate approval workflow — enabled rules are immediately
// runnable, so status is derived straight from `enabled`.
const mapLintApiRule = (r) => ({
  ruleId: r.ruleId,
  ruleName: r.name,
  ruleDescription: r.description || "",
  severity: r.severity === 2 ? "MANDATORY" : "RECOMMENDED",
  enabled: r.enabled,
  status: r.enabled ? "ACTIVE" : "INACTIVE",
  nodeType: r.nodeType,
  source: r.source,
});

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

// The /v1/score response shape isn't fully pinned down yet, so pull out the
// fields under their most likely names and fall back gracefully — the UI
// renders a raw JSON dump instead of guessing wrong when `score` is missing.
// Real payload looks like:
//   { score, grade, passed, totalIssues, issuesBySeverity: {error,warn,info,hint},
//     issues: [{ code, message, severity, path, line, category, pointsDeducted }],
//     categoryBreakdown: [{ category, issueCount, pointsDeducted }], rulesetUsed }
// `issues` here is the full list of findings (objects), not a count — it must
// never be handed to the "breakdown" renderer, which expects string/number values.
const normalizeScoreResult = (data) => {
  if (!data || typeof data !== "object") return null;
  const score = data.score ?? data.totalScore ?? data.result?.score;
  const grade = data.grade ?? data.letterGrade ?? data.result?.grade;
  const pass = data.pass ?? data.passed ?? data.result?.pass ?? (data.status ? data.status === "PASS" : undefined);

  const topIssues = Array.isArray(data.issues)
    ? data.issues
    : Array.isArray(data.topIssues)
      ? data.topIssues
      : Array.isArray(data.issuesList)
        ? data.issuesList
        : Array.isArray(data.result?.topIssues)
          ? data.result.topIssues
          : [];

  const issuesRaw = data.issuesBySeverity ?? data.issueSummary ?? data.result?.issues;
  let issueTotal = data.totalIssues ?? data.issueTotal;
  let issueBreakdown;
  if (typeof issuesRaw === "number") {
    issueTotal = issueTotal ?? issuesRaw;
    issueBreakdown = data.issueBreakdown ?? data.breakdown ?? null;
  } else if (issuesRaw && typeof issuesRaw === "object" && !Array.isArray(issuesRaw)) {
    issueBreakdown = issuesRaw;
    issueTotal = issueTotal ?? issuesRaw.total ?? issuesRaw.count;
  }

  const categoryBreakdown = data.categoryBreakdown ?? data.categories ?? data.result?.categoryBreakdown ?? [];

  return { score, grade, pass, issueTotal, issueBreakdown, categoryBreakdown, topIssues };
};

// ----------------------------------------------------------------------
// Governance dashboard scoring
// ----------------------------------------------------------------------
// Point values used to turn a rule-level PASS/FAIL scan into a single
// weighted score: MANDATORY rules are worth 5/4/3 points depending on the
// priority the rule was created with (HIGH/MEDIUM/LOW, HIGH by default),
// RECOMMENDED rules are always worth 3, and OPTIONAL rules don't affect
// the score at all (0 points either way).
const MANDATORY_PRIORITY_POINTS = { HIGH: 5, MEDIUM: 4, LOW: 3 };
const RECOMMENDED_POINTS = 3;

const pointsForSeverity = (severity, priority) => {
  const sev = String(severity || "").toUpperCase();
  if (sev === "MANDATORY") {
    const p = String(priority || "HIGH").toUpperCase();
    return MANDATORY_PRIORITY_POINTS[p] ?? MANDATORY_PRIORITY_POINTS.HIGH;
  }
  if (sev === "RECOMMENDED") return RECOMMENDED_POINTS;
  return 0; // OPTIONAL, or an unrecognised severity
};

// ruleMeta: Map<ruleId, { priority }> — resolves the HIGH/MEDIUM/LOW priority
// a MANDATORY rule was created with, since scan results only carry severity.
const computeGovernanceScore = (scanResults, ruleMeta) => {
  if (!Array.isArray(scanResults) || scanResults.length === 0) return null;
  let earned = 0;
  let possible = 0;
  let evaluated = 0;
  scanResults.forEach((r) => {
    const result = String(r.result || "").toUpperCase();
    if (result !== "PASSED" && result !== "FAILED") return; // ignore SKIPPED
    const priority = ruleMeta?.get(r.ruleId)?.priority;
    const pts = pointsForSeverity(r.severity, priority);
    if (pts <= 0) return; // OPTIONAL rules never affect the weighted score
    evaluated += 1;
    possible += pts;
    if (result === "PASSED") earned += pts;
  });
  if (possible === 0) return { earned: 0, possible: 0, percentage: null, evaluated };
  return { earned, possible, percentage: Math.round((earned / possible) * 100), evaluated };
};

const buildRuleMetaMap = (rules) => {
  const map = new Map();
  (rules || []).forEach((r) => {
    if (!r?.ruleId) return;
    map.set(r.ruleId, { priority: r.priority || r.mandatoryPriority || r.rulePriority });
  });
  return map;
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ----------------------------------------------------------------------
// reusable UI components (badges, pills, etc.)
// ----------------------------------------------------------------------
const SeverityBadge = ({ severity }) => (
  <span
    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
      SEVERITY_STYLES[severity] || SEVERITY_STYLES.OPTIONAL
    }`}
  >
    {severity || "n/a"}
  </span>
);

const ResultBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
      STATUS_STYLES[status] || STATUS_STYLES.SKIPPED
    }`}
  >
    {status === "PASSED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
    {status === "FAILED" && <XCircle className="mr-1 h-3 w-3" />}
    {status || "—"}
  </span>
);

const STAT_TILE_TONES = {
  slate: "text-slate-200 border-[#24304d] bg-[#0b0e16]/60",
  emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  rose: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  orange: "text-orange-300 border-orange-500/30 bg-orange-500/10",
};

const StatTile = ({ label, value, tone = "slate" }) => (
  <div className={cn("rounded-lg border px-3 py-2.5", STAT_TILE_TONES[tone] || STAT_TILE_TONES.slate)}>
    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 text-lg font-bold leading-tight">{value}</p>
  </div>
);

const Pill = ({ children, className = "" }) => (
  <span
    className={`rounded-md border border-[#24304d] bg-[#0b0e16] px-2 py-0.5 text-[10px] text-slate-300 ${className}`}
  >
    {children}
  </span>
);

// One-line cell that ellipsizes and exposes the full value via `title` (native
// tooltip) once it's longer than 12 characters — used across the history table
// so long ids/names/emails never wrap or blow out the row height.
const TruncCell = ({ value, className = "" }) => {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <span
      title={text.length > 12 ? text : undefined}
      className={cn("block max-w-[160px] truncate", className)}
    >
      {text}
    </span>
  );
};

// ----------------------------------------------------------------------
// Rule card (same as GovernanceWorkspace)
// ----------------------------------------------------------------------
const RuleCard = ({ rule, selected, onToggle, onShowDetail, family, isStandard }) => {
  const icon =
    family === "owasp" ? (
      <ShieldAlert className="h-4 w-4 text-violet-300" />
    ) : (
      <ShieldCheck className="h-4 w-4 text-emerald-300" />
    );
  // Anything not enabled+approved is shown as "Pending approval" and locked so the
  // user can't select it. Standard linting rules always run, so they never carry a
  // checkbox — there's nothing for the user to toggle.
  const isReady = isRuleReady(rule);
  const cardContent = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="truncate text-sm font-semibold text-white">
          {rule.ruleName}
        </h3>
      </div>
      <p className="mt-1 line-clamp-3 text-xs text-slate-400">
        {rule.ruleDescription}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={isStandard ? "MANDATORY" : rule.severity} />
        <Pill className="font-mono">{rule.ruleId}</Pill>
        {rule.owaspId && (
          <Pill className="border-violet-500/30 bg-violet-500/10 text-violet-300">
            {rule.owaspId}
          </Pill>
        )}
        {rule.category && <Pill>{rule.category}</Pill>}
      </div>
    </div>
  );
  return (
    <div
      className={`relative flex flex-col gap-3 rounded-lg border bg-[#0c1224] p-4 transition-all ${
        !isReady
          ? "border-amber-500/50 ring-1 ring-amber-500/20"
          : selected
            ? "border-orange-500/60 ring-1 ring-orange-500/30"
            : "border-[#24304d] hover:border-[#3a4870]"
      }`}
    >
      {isReady ? (
        <span
          title="Ready"
          className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.7)] animate-pulse"
        />
      ) : (
        <span
          title="Pending approval"
          className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-amber-400"
        />
      )}
      {isStandard ? (
        <div className="flex flex-1 items-start gap-3">{cardContent}</div>
      ) : (
        <label
          className={`flex flex-1 items-start gap-3 ${isReady ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
        >
          <input
            type="checkbox"
            checked={isReady && selected}
            disabled={!isReady}
            onChange={() => isReady && onToggle(rule.ruleId)}
            className="mt-1 h-4 w-4 rounded border-[#3a4870] bg-[#0b0e16] text-orange-500 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {cardContent}
        </label>
      )}
      {(family !== "linting" || !isReady) && (
        <div className="flex items-center justify-between gap-2">
          {!isReady ? (
            <span className="inline-flex ml-6 items-center rounded-md border border-amber-500/60 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Pending approval
            </span>
          ) : (
            <span />
          )}
          {family !== "linting" && (
            <button
              onClick={() => onShowDetail(rule)}
              className="inline-flex items-center gap-1 rounded-md border border-[#24304d] bg-[#0b0e16] px-2.5 py-1 text-[11px] text-slate-200 hover:border-orange-500/60 hover:text-white"
            >
              Details <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// Rule detail drawer (reused from GovernanceWorkspace)
// ----------------------------------------------------------------------
const DrawerSection = ({ title, icon, children }) => (
  <section className="rounded-lg border border-[#24304d] bg-[#0c1224] p-4">
    <h4 className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
      {icon}
      {title}
    </h4>
    {children}
  </section>
);

const RuleDetailDrawer = ({ open, onClose, family, ruleSummary }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !ruleSummary) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const svc =
      family === "owasp"
        ? owaspService.getOwaspRuleDetail
        : complianceService.getComplianceRuleDetail;
    svc(ruleSummary.ruleId).then((res) => {
      if (cancelled) return;
      if (res.success) setDetail(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, family, ruleSummary]);

  if (!open) return null;
  const scenarios = detail?.implementation?.testScenarios || [];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="flex w-full max-w-2xl flex-col overflow-y-auto bg-[#0b0e16] border-l border-[#24304d] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#24304d] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {ruleSummary?.ruleName}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-400">
              {ruleSummary?.ruleId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading rule details…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}
          {detail && (
            <>
              <p className="text-sm text-slate-200">{detail.ruleDescription}</p>
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={detail.severity} />
                <Pill>{detail.assetType}</Pill>
                <Pill>{detail.category}</Pill>
                <Pill>{detail.status}</Pill>
                {detail.owaspId && (
                  <Pill className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                    {detail.owaspId}
                  </Pill>
                )}
              </div>
              <DrawerSection
                title="Description"
                icon={<FileText className="h-3.5 w-3.5" />}
              >
                <p className="text-xs text-slate-300">
                  {detail.implementation?.description}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">Scanner</span>
                    <br />
                    <code className="break-all text-amber-200">
                      {detail.implementation?.scannerClass}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-500">Implementation key</span>
                    <br />
                    <code className="text-amber-200">
                      {detail.implementation?.implementationKey}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-500">Language</span>
                    <br />
                    <code className="text-amber-200">
                      {detail.implementation?.language}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-500">Created</span>
                    <br />
                    {formatDate(detail.createDate)}
                  </div>
                </div>
              </DrawerSection>
              <DrawerSection
                title="Scanner snippet"
                icon={<Code className="h-3.5 w-3.5" />}
              >
                <pre className="overflow-auto rounded bg-[#080c14] p-3 text-[11px] whitespace-pre text-emerald-300">
                  {detail.implementation?.javaSnippet}
                </pre>
              </DrawerSection>
              <DrawerSection
                title="MongoDB schema"
                icon={<Code className="h-3.5 w-3.5" />}
              >
                <pre className="overflow-auto rounded bg-[#080c14] p-3 text-[11px] whitespace-pre text-sky-300">
                  {detail.implementation?.mongoSchema}
                </pre>
              </DrawerSection>
              <DrawerSection
                title={`Test scenarios (${scenarios.length})`}
                icon={<TerminalSquare className="h-3.5 w-3.5" />}
              >
                <div className="space-y-3">
                  {scenarios.length === 0 && (
                    <p className="text-xs text-slate-500">
                      No test scenarios returned for this rule.
                    </p>
                  )}
                  {scenarios.map((s, i) => (
                    <div
                      key={i}
                      className="rounded border border-[#24304d] bg-[#080c14] p-3"
                    >
                      <p className="text-[12px] font-semibold text-purple-300">
                        {i + 1}. {s.name}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {s.description}
                      </p>
                      <pre className="mt-2 overflow-auto text-[11px] whitespace-pre text-purple-200">
                        {s.code}
                      </pre>
                    </div>
                  ))}
                </div>
              </DrawerSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Scan results panel (modern)
// ----------------------------------------------------------------------
const ScanResultsPanel = ({ family, scan, onClose, running }) => {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(getLoggedInUserEmail());
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  if (!scan && !running) return null;

  const results = scan?.scanResults || [];
  const passed = results.filter((r) => r.result === "PASSED").length;
  const failed = results.filter((r) => r.result === "FAILED").length;
  const skipped = results.filter((r) => r.result === "SKIPPED").length;

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const onDownload = async () => {
    if (!scan?.scanId) return;
    const svc =
      family === "owasp"
        ? owaspService.downloadOwaspReport
        : complianceService.downloadComplianceReport;
    const res = await svc(scan.scanId, "html");
    if (res.success) downloadBlob(res.data, `${family}-report-${scan.scanId}.html`);
    else alert(res.error || "Download failed");
  };

  const onDownloadPdf = async () => {
    if (!scan?.scanId) return;
    setDownloadingPdf(true);
    const svc =
      family === "owasp"
        ? owaspService.downloadOwaspReport
        : complianceService.downloadComplianceReport;
    const res = await svc(scan.scanId, "pdf");
    setDownloadingPdf(false);
    if (res.success) downloadBlob(res.data, `${family}-report-${scan.scanId}.pdf`);
    else alert(res.error || "Download failed");
  };

  const onEmail = async () => {
    if (!scan?.scanId) return;
    setEmailSending(true);
    setEmailMsg(null);
    const reportType = family === "owasp" ? "OWASP" : "COMPLIANCE";
    const payload = {
      to: emailTo,
      subject: `${reportType} scan report — ${scan.scanId}`,
      reportType,
      scanId: scan.scanId,
      projectName: scan.projectName,
      assetType: scan.assetType,
    };
    const svc =
      family === "owasp"
        ? owaspService.sendReportEmail
        : complianceService.sendReportEmail;
    const res = await svc(payload);
    setEmailSending(false);
    if (res.success) {
      // Backend now returns { status: SENT | EMAIL_DISABLED | FAILED, message }.
      const status = res.data?.status || "SENT";
      const message = res.data?.message;
      if (status === "EMAIL_DISABLED") {
        setEmailMsg({
          kind: "warn",
          text: message || "Email transport is disabled (no SendGrid API key configured).",
        });
      } else if (status === "FAILED") {
        setEmailMsg({ kind: "err", text: message || "SendGrid failed to deliver the email." });
      } else {
        setEmailMsg({ kind: "ok", text: message || "Report queued via SendGrid." });
      }
    } else {
      setEmailMsg({ kind: "err", text: res.error });
    }
  };

  const isOwasp = family === "owasp";

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-[#24304d] bg-[#0c1224] shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      {/* ambient family-tinted glow */}
      <div
        className={cn(
          "pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full blur-3xl opacity-20",
          isOwasp ? "bg-violet-500" : "bg-emerald-500",
        )}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-[#24304d] px-6 py-5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              isOwasp
                ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            )}
          >
            {isOwasp ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              {isOwasp ? "OWASP Scan Results" : "Compliance Scan Results"}
              {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />}
            </h3>
            {scan?.projectName && (
              <p className="mt-0.5 truncate text-sm font-medium text-slate-200">{scan.projectName}</p>
            )}
            {scan?.scanId && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{scan.scanId}</p>
            )}
          </div>
        </div>
        {scan?.scanId && (
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-200 transition-colors hover:border-orange-500/70 hover:bg-orange-500/15 disabled:opacity-50"
            >
              {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Report
            </button>
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white transition-colors hover:border-orange-500/60"
            >
              <Download className="h-3.5 w-3.5" /> HTML
            </button>
            <button
              onClick={() => setEmailOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white transition-colors hover:border-orange-500/60"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {scan && (
        <div className="relative grid grid-cols-2 gap-2.5 border-b border-[#24304d] bg-[#0b0e16]/40 px-6 py-4 sm:grid-cols-5">
          <StatTile label="Status" value={scan.status || "—"} />
          <StatTile label="Compliance" value={scan.compliance ?? "—"} />
          <StatTile label="Passed" value={passed} tone="emerald" />
          <StatTile label="Failed" value={failed} tone="rose" />
          <StatTile label="Skipped" value={skipped} tone="slate" />
        </div>
      )}
      {emailOpen && (
        <div className="border-b border-[#24304d] bg-[#101935] px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="recipient@example.com"
              className="min-w-[280px] flex-1 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/60"
            />
            <button
              onClick={onEmail}
              disabled={emailSending || !emailTo}
              className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {emailSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send
            </button>
            {emailMsg && (
              <span
                className={
                  emailMsg.kind === "ok"
                    ? "text-xs text-emerald-300"
                    : emailMsg.kind === "warn"
                      ? "text-xs text-amber-300"
                      : "text-xs text-rose-300"
                }
              >
                {emailMsg.text}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2.5 p-4">
        {!scan ? (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Running scan…
          </div>
        ) : results.length === 0 ? (
          <div className="px-2 py-6 text-sm text-slate-400">No rule results returned.</div>
        ) : (
          results.map((r, i) => {
            const detail = parseRuleMessage(r.message);
            const passed = String(r.result).toUpperCase() === "PASSED";
            return (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[1fr_120px_120px] gap-3 rounded-lg border-l-2 border border-[#24304d] bg-[#0c1322]/60 px-4 py-3.5 text-sm transition-colors hover:bg-[#101935]/60",
                  passed ? "border-l-emerald-500/60" : "border-l-rose-500/60",
                )}
              >
                <div>
                  <p className="font-medium text-white">{r.ruleName}</p>
                  <p className="font-mono text-[11px] text-slate-500">{r.ruleId}</p>
                  {detail ? (
                    <div className="mt-2 space-y-1.5 rounded-md border border-[#24304d] bg-[#0c1322] p-2.5">
                      {detail.whatItTests && (
                        <p className="text-[11px] leading-snug text-slate-300">
                          <span className="font-semibold text-slate-200">What it tests · </span>
                          {detail.whatItTests}
                        </p>
                      )}
                      {detail.howItWorks && (
                        <p className="text-[11px] leading-snug text-slate-400">
                          <span className="font-semibold text-slate-300">How · </span>
                          {detail.howItWorks}
                        </p>
                      )}
                      {detail.evidence && (
                        <p
                          className={cn(
                            "text-[11px] leading-snug",
                            passed ? "text-emerald-300/90" : "text-rose-300/90"
                          )}
                        >
                          <span className="font-semibold">Evidence · </span>
                          {detail.evidence}
                        </p>
                      )}
                      {detail.recommendation && !passed && (
                        <p className="text-[11px] leading-snug text-amber-300/90">
                          <span className="font-semibold">Recommendation · </span>
                          {detail.recommendation || detail.recommended}
                        </p>
                      )}
                      {!detail.recommendation && detail.recommended && !passed && (
                        <p className="text-[11px] leading-snug text-amber-300/90">
                          <span className="font-semibold">Recommendation · </span>
                          {detail.recommended}
                        </p>
                      )}
                      {detail.evidencePrefix && (
                        <p className="text-[11px] leading-snug text-slate-500">{detail.evidencePrefix}</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center">
                  <SeverityBadge severity={r.severity} />
                </div>
                <div className="flex items-center">
                  <ResultBadge status={r.result} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// History drawer (simplified but functional)
// ----------------------------------------------------------------------
const HistoryDrawer = ({ open, onClose, defaultFamily, projectName, assetType }) => {
  const [family, setFamily] = useState(defaultFamily || "compliance");
  // "current" = scope by the project I'm looking at, "all" = every scan of this asset type.
  const [scope, setScope] = useState("current");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanDetail, setScanDetail] = useState(null);

  // Normalise APIGEE_PROXY → APIGEE for the backend filter.
  const backendAssetType = assetType === "APIGEE_PROXY" ? "APIGEE" : assetType;

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const svc =
      family === "owasp"
        ? owaspService.getOwaspScanHistory
        : complianceService.getComplianceScanHistory;
    const res = await svc({
      // "current" → filter by the currently-selected resource only.
      // "all"     → no projectName filter and no asset filter, so the user sees every
      //             scan across microservices, proxies and Kong services.
      projectName: scope === "current" && projectName ? projectName : undefined,
      assetType: scope === "current" ? (backendAssetType || undefined) : undefined,
      page,
      size,
    });
    setLoading(false);
    if (res.success) {
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } else setError(res.error);
  }, [open, family, projectName, backendAssetType, page, size, scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) {
      setFamily(defaultFamily || "compliance");
      setScope("current");
      setPage(0);
      setScanDetail(null);
    }
  }, [open, defaultFamily]);

  const openDetail = async (item) => {
    setScanDetail({ loading: true, scan: null });
    const svc =
      family === "owasp" ? owaspService.getOwaspScan : complianceService.getComplianceScan;
    const res = await svc(item.scanId);
    if (res.success) setScanDetail({ loading: false, scan: res.data });
    else setScanDetail(null);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="flex w-full max-w-4xl flex-col bg-[#0b0e16] border-l border-[#24304d] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#24304d] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">Scan history</h3>
            <p className="mt-1 text-xs text-slate-400">
              {scope === "current"
                ? (projectName ? `Showing scans for "${projectName}"` : "Showing recent scans")
                : "Showing every scan across microservices, proxies and Kong"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Scope toggle — current resource vs every scan everywhere */}
            <div className="flex items-center rounded-md border border-[#24304d] bg-[#0b0e16] p-0.5">
              <button
                onClick={() => { setScope("current"); setPage(0); setScanDetail(null); }}
                className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                  scope === "current" ? "bg-orange-500/20 text-orange-100" : "text-slate-400 hover:text-white"
                }`}
              >
                Current
              </button>
              <button
                onClick={() => { setScope("all"); setPage(0); setScanDetail(null); }}
                className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                  scope === "all" ? "bg-orange-500/20 text-orange-100" : "text-slate-400 hover:text-white"
                }`}
              >
                All scans
              </button>
            </div>
            {["compliance", "owasp"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFamily(f);
                  setPage(0);
                  setScanDetail(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  family === f
                    ? "border-orange-500/60 bg-orange-500/15 text-white"
                    : "border-[#24304d] bg-[#0b0e16] text-slate-300 hover:border-orange-500/40"
                }`}
              >
                {f === "owasp" ? "OWASP" : "Compliance"}
              </button>
            ))}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-6 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No scans for this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#0c1224] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-2 text-left">Scan id</th>
                  <th className="px-6 py-2 text-left">Project</th>
                  <th className="px-6 py-2 text-left">Status</th>
                  <th className="px-6 py-2 text-left">Results</th>
                  <th className="px-6 py-2 text-left">Run by</th>
                  <th className="px-6 py-2 text-left">Date</th>
                  <th className="px-6 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24304d]">
                {items.map((it) => (
                  <tr key={it.scanId} className="hover:bg-[#101935]/40">
                    <td className="px-6 py-2 font-mono text-[11px] text-slate-300">{it.scanId}</td>
                    <td className="px-6 py-2 text-slate-200">{it.projectName}</td>
                    <td className="px-6 py-2">{it.status}</td>
                    <td className="px-6 py-2 text-xs">
                      <span className="text-emerald-300">{it.passed}P</span> ·{" "}
                      <span className="text-rose-300">{it.failed}F</span> ·{" "}
                      <span className="text-slate-400">{it.totalResults}T</span>
                    </td>
                    <td className="px-6 py-2 text-slate-300">{it.createdBy}</td>
                    <td className="px-6 py-2 text-slate-400">{formatDate(it.createDate)}</td>
                    <td className="px-6 py-2 text-right">
                      <button
                        onClick={() => openDetail(it)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#24304d] bg-[#0b0e16] px-2 py-1 text-[11px] text-slate-200 hover:border-orange-500/60"
                      >
                        Open <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {scanDetail && (
            <div className="px-6 pb-6">
              {scanDetail.loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading scan…
                </div>
              ) : (
                <ScanResultsPanel family={family} scan={scanDetail.scan} onClose={() => setScanDetail(null)} />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[#24304d] bg-[#0c1224]/40 px-6 py-3 text-xs text-slate-400">
          <span>
            Total {total} · page {page + 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => ((p + 1) * size < total ? p + 1 : p))}
              disabled={(page + 1) * size >= total}
              className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Add rule modal (simplified)
// ----------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rule scope isn't user-facing yet — every request is submitted as "internal"
// until the UI to pick internal/public is designed.
const DEFAULT_RULE_SCOPE = "internal";

const CONDITION_TYPES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "NOT_AVAILABLE", label: "Not Available" },
  { value: "PATTERN", label: "Pattern" },
  { value: "ENUM", label: "Enum" },
  { value: "LENGTH", label: "Length" },
  { value: "SCHEMA", label: "Schema" },
];

const AddRuleModal = ({ open, family, assetType, ruleType, onClose, onCreated }) => {
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [severity, setSeverity] = useState("warn");
  // New, additive field — used only to weight this rule in the Governance
  // Dashboard score if the rule is later classified as Mandatory
  // (HIGH=5pts, MEDIUM=4pts, LOW=3pts). Independent of `severity` above.
  const [priority, setPriority] = useState("HIGH");
  const [field, setField] = useState("");
  const [conditionType, setConditionType] = useState("AVAILABLE");
  const [conditionRegex, setConditionRegex] = useState("");
  const [conditionEnum, setConditionEnum] = useState("");
  const [conditionMin, setConditionMin] = useState("");
  const [conditionMax, setConditionMax] = useState("");
  const [conditionSchema, setConditionSchema] = useState("");
  const [owaspId, setOwaspId] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // The modal never unmounts (its parent always renders it, gated by `open`), so
  // without this the previous submission's values would still be sitting in state
  // the next time it's opened — including when reopened for a different tab.
  useEffect(() => {
    if (open) {
      setRuleName("");
      setRuleDescription("");
      setSeverity("warn");
      setPriority("HIGH");
      setField("");
      setConditionType("AVAILABLE");
      setConditionRegex("");
      setConditionEnum("");
      setConditionMin("");
      setConditionMax("");
      setConditionSchema("");
      setOwaspId("");
      setApproverEmail("");
      setSaving(false);
      setErr(null);
    }
  }, [open]);

  if (!open) return null;

  const approverEmailValid = EMAIL_RE.test(approverEmail.trim());

  // Each condition type needs its own supporting value filled in before the
  // rule is meaningful — e.g. "Pattern" with no regex can't be evaluated.
  const conditionValid =
    conditionType === "AVAILABLE" || conditionType === "NOT_AVAILABLE"
      ? true
      : conditionType === "PATTERN"
        ? !!conditionRegex.trim()
        : conditionType === "ENUM"
          ? !!conditionEnum.trim()
          : conditionType === "LENGTH"
            ? conditionMin !== "" && conditionMax !== ""
            : conditionType === "SCHEMA"
              ? !!conditionSchema.trim()
              : false;

  const buildConditionValue = () => {
    switch (conditionType) {
      case "AVAILABLE":
        return "Available";
      case "NOT_AVAILABLE":
        return "Not Available";
      case "PATTERN":
        return `pattern [${conditionRegex.trim()}]`;
      case "ENUM":
        return `enumeration [${conditionEnum.trim()}]`;
      case "LENGTH":
        return `length [${conditionMin}-${conditionMax}]`;
      case "SCHEMA":
        return `schema [${conditionSchema.trim()}]`;
      default:
        return "";
    }
  };

  const submit = async () => {
    if (!approverEmailValid) {
      setErr("Please enter a valid approver email address.");
      return;
    }
    if (!conditionValid) {
      setErr("Please fill in the details required for the selected condition.");
      return;
    }
    setSaving(true);
    setErr(null);
    // Normalise APIGEE_PROXY → APIGEE for the backend rule catalog.
    const backendAssetType = assetType === "APIGEE_PROXY" ? "APIGEE" : (assetType || "MICROSERVICE");
    const createdBy = localStorage.getItem("userEmail") || "admin@forgecrux.com";
    const payload = {
      ruleType: ruleType || "COMPLIANCE",
      assetType: backendAssetType,
      ruleName,
      ruleDescription,
      scope: DEFAULT_RULE_SCOPE,
      severity: severity.toUpperCase(),
      field,
      condition: buildConditionValue(),
      createdBy,
      approverEmail: approverEmail.trim(),
      status: "REQUESTED",
      // Additive — only meaningful if this rule is later classified as
      // Mandatory; weights it in the Governance Dashboard score.
      priority,
      ...(family === "owasp" ? { owaspId } : {}),
    };
    const res = await complianceService.submitRuleRequest(payload);
    setSaving(false);
    if (res.success) {
      onCreated?.();
      onClose?.();
    } else setErr(res.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-lg border border-[#24304d] bg-[#0b0e16]">
        <div className="flex items-center justify-between border-b border-[#24304d] px-5 py-3 shrink-0">
          <h3 className="text-base font-semibold text-white">
            Add Custom Rule
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5 text-sm">
          {err && (
            <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
              {err}
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
              Rule name
            </span>
            <input
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
              Description
            </span>
            <textarea
              rows={3}
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                Severity
              </span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
              >
                <option value="hint">Hint</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
                <option value="info">Info</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                Field
              </span>
              <input
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g. spring.datasource.url"
                className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
              />
            </label>
            {/* New, additive field — doesn't touch Severity above. Only used to
                weight this rule in the Governance Dashboard score if/when it's
                classified as Mandatory (HIGH=5pts, MEDIUM=4pts, LOW=3pts). */}
            <label className="col-span-2 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                Mandatory Priority (Dashboard score)
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <span className="mt-1 block text-[11px] text-slate-500">
                Only applied if this rule is classified as Mandatory once approved.
              </span>
            </label>
            <label className="col-span-2 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                Condition
              </span>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
              >
                {CONDITION_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {conditionType === "PATTERN" && (
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                  Regex
                </span>
                <input
                  value={conditionRegex}
                  onChange={(e) => setConditionRegex(e.target.value)}
                  placeholder="e.g. ^[A-Z][a-zA-Z0-9]*$"
                  className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 font-mono text-white"
                />
              </label>
            )}
            {conditionType === "ENUM" && (
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                  Enum list (comma-separated)
                </span>
                <input
                  value={conditionEnum}
                  onChange={(e) => setConditionEnum(e.target.value)}
                  placeholder="e.g. active, inactive, pending"
                  className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
                />
              </label>
            )}
            {conditionType === "LENGTH" && (
              <>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                    Min length
                  </span>
                  <input
                    type="number"
                    value={conditionMin}
                    onChange={(e) => setConditionMin(e.target.value)}
                    className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                    Max length
                  </span>
                  <input
                    type="number"
                    value={conditionMax}
                    onChange={(e) => setConditionMax(e.target.value)}
                    className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
                  />
                </label>
              </>
            )}
            {conditionType === "SCHEMA" && (
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                  Schema
                </span>
                <textarea
                  rows={3}
                  value={conditionSchema}
                  onChange={(e) => setConditionSchema(e.target.value)}
                  placeholder='e.g. { "type": "string" }'
                  className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 font-mono text-xs text-white"
                />
              </label>
            )}
            {family === "owasp" && (
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                  OWASP ID
                </span>
                <input
                  value={owaspId}
                  onChange={(e) => setOwaspId(e.target.value)}
                  placeholder="A01"
                  className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
                />
              </label>
            )}
            <label className="col-span-2 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                Approver email
              </span>
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
                placeholder="approver@company.com"
                className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white"
              />
              {approverEmail && !approverEmailValid && (
                <span className="mt-1 block text-[11px] text-rose-300">
                  Enter a valid email address.
                </span>
              )}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#24304d] px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-sm text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !ruleName || !approverEmailValid || !conditionValid}
            className="inline-flex items-center gap-2 rounded-md bg-orange-500/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : ""}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Linting tab body — works for ALL asset types (Apigee proxy, Microservice, Kong).
// For Apigee: token → proxy details → spec metadata. For Microservice/Kong: read
// apiDesign.specMetadata.id directly from the selected onboarding row and fetch
// the spec body via /api-design/spec-metadata/{id}/content.
// ----------------------------------------------------------------------
const LintingBody = ({ assetType, selectedResource, resourceObject, showMessage, runToken, onReadyChange }) => {
  const [specContent, setSpecContent] = useState('');
  const [specName, setSpecName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Spec score (POST /v1/score) — fired alongside the Spectral run whenever
  // "Run scan" is clicked (runToken changes).
  const [scorePhase, setScorePhase] = useState('idle'); // idle | running | done | error
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreErr, setScoreErr] = useState('');

  // Read the latest resourceObject/showMessage without making the fetch effect below
  // depend on their identity — both are recreated on every parent render (inline
  // callback / array.find()), so depending on them directly re-fires the fetch on
  // every unrelated re-render and can spiral into a continuous fetch loop.
  const resourceObjectRef = useRef(resourceObject);
  resourceObjectRef.current = resourceObject;
  const showMessageRef = useRef(showMessage);
  showMessageRef.current = showMessage;

  useEffect(() => {
    if (!selectedResource) {
      setSpecContent('');
      setSpecName('');
      setError('');
      setScorePhase('idle');
      setScoreResult(null);
      setScoreErr('');
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      setSpecContent('');
      setSpecName('');
      setScorePhase('idle');
      setScoreResult(null);
      setScoreErr('');
      const resourceObject = resourceObjectRef.current;
      try {
        // ── Apigee proxy: fetch via lifecycle/token flow ──
        if (assetType === 'APIGEE_PROXY') {
          const tokenRes = await fetch('https://forgegateway.probestack.io/apigee-wrapper/auth/apigee/token');
          if (!tokenRes.ok) throw new Error(`Token service error: ${tokenRes.status}`);
          const { access_token: token } = await tokenRes.json();

          // Caller passes the resource object with raw.orgName if known; else fall back to default org.
          const orgName = resourceObject?.raw?.orgName || resourceObject?.orgName || 'gen-ai-poc-onboarding';
          const detailsRes = await fetch(
            `https://forgegateway.probestack.io/apigee-wrapper/organizations/${orgName}/apis/details`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!detailsRes.ok) throw new Error(`Failed to load proxy details: HTTP ${detailsRes.status}`);
          const detailsData = await detailsRes.json();

          const proxyObj = (detailsData.proxies || []).find((p) => p.name === selectedResource);
          if (!proxyObj || proxyObj.source !== 'LIFECYCLE_TOOL' || !proxyObj.lifecycle?.microserviceId) {
            if (!cancelled) setError('No OpenAPI spec attached. Pick an Apigee proxy that is linked to a Lifecycle Tool microservice.');
            return;
          }
          const resourceRes = await fetch(
            `https://forgegateway.probestack.io/onboarding/v1/api/onboarding/resources/${proxyObj.lifecycle.microserviceId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!resourceRes.ok) throw new Error(`Failed to load resource: HTTP ${resourceRes.status}`);
          const resourceData = await resourceRes.json();
          const specMeta = resourceData?.data?.resource?.apiDesign?.specMetadata;
          if (!specMeta?.id) {
            if (!cancelled) setError('No API spec found for this proxy.');
            return;
          }
          const specRes = await fetch(
            `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${specMeta.id}/content`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!specRes.ok) throw new Error(`Failed to fetch spec: HTTP ${specRes.status}`);
          const specText = await specRes.text();
          if (!cancelled) {
            setSpecContent(specText);
            setSpecName(specMeta.specName || specMeta.fileName || selectedResource);
          }
          return;
        }

        // ── Microservice / Kong: spec metadata is directly attached to the onboarding row ──
        const apiDesign = resourceObject?.raw?.apiDesign;
        const specMeta = apiDesign?.specMetadata;
        const specMetaId = apiDesign?.specMetadataId || specMeta?.id;
        if (!specMetaId) {
          if (!cancelled) setError(`No OpenAPI spec attached to this ${assetType.toLowerCase()}. Make sure API design is completed.`);
          return;
        }
        const specRes = await apiDesignService.getSpecContent(specMetaId);
        if (!specRes.success || !specRes.content) {
          if (!cancelled) setError(specRes.error || 'Failed to fetch spec content.');
          return;
        }
        if (!cancelled) {
          setSpecContent(specRes.content);
          setSpecName(specMeta?.specName || specMeta?.fileName || selectedResource);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load spec');
          showMessageRef.current?.(err.message || 'Failed to load spec', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType, selectedResource]);

  // Tell the parent (which owns the "Run scan" button) whether there's a spec ready to lint.
  useEffect(() => {
    onReadyChange?.(!loading && !error && !!specContent);
  }, [loading, error, specContent, onReadyChange]);

  // Score the spec (POST /v1/score) each time "Run scan" is clicked. Guards against a
  // mount-time auto-run the same way ApigeeBundleLintBody does: if this body unmounts
  // (tab switch) and remounts, `runToken` arrives already non-zero from a prior click —
  // only an actual *change* from the value seen at mount should trigger a fresh score.
  const prevScoreRunTokenRef = useRef(runToken);
  useEffect(() => {
    if (runToken === prevScoreRunTokenRef.current) return;
    prevScoreRunTokenRef.current = runToken;
    if (!runToken || !specContent) return;
    let cancelled = false;
    const run = async () => {
      setScorePhase('running');
      setScoreErr('');
      setScoreResult(null);
      const res = await specScoreService.scoreSpec(specContent);
      if (cancelled) return;
      if (res.success) {
        setScoreResult(res.data);
        setScorePhase('done');
      } else {
        setScoreErr(res.error || 'Failed to score API spec');
        setScorePhase('error');
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  const normalizedScore = scoreResult ? normalizeScoreResult(scoreResult) : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400 mb-3" />
        <p className="text-sm text-slate-400">Fetching API specification…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <AlertCircle className="h-8 w-8 text-yellow-400 mb-3" />
        <p className="text-sm text-slate-300 max-w-md">{error}</p>
      </div>
    );
  }
  if (!selectedResource) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        {/* <Sparkles className="h-8 w-8 text-orange-400/40 mb-3" /> */}
        {/* <p className="text-sm text-slate-400">Select a resource above to run Spectral linting on its OpenAPI spec.</p> */}
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-[#24304d] bg-[#0c1224] py-3 pl-4 pr-14 text-sm">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-gray-300 truncate">
            Spec loaded: <span className="font-medium text-white">{specName || "OpenAPI spec"}</span>
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-slate-500">Click "Run scan" above to lint this spec</span>
        </div>
        {scorePhase !== 'idle' && (
          <div className="space-y-3">
            {scorePhase === 'running' && (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Running API lint scan…
              </div>
            )}
            {scorePhase === 'error' && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <strong>Scoring error:</strong> {scoreErr}
              </div>
            )}
            {scorePhase === 'done' && scoreResult && (
              normalizedScore?.score != null ? (
                <div className="space-y-3">
                  {/* Header toolbar: score + severity counts + grade/pass pills */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#24304d] bg-[#0f172a]/60">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-gray-300">Lint Score:</span>
                        <span className={`text-xl font-bold ${scoreTierColors(normalizedScore.score).text}`}>
                          {normalizedScore.score}
                        </span>
                        <span className="text-sm text-gray-500">/ 100</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px]">
                        {Object.entries(normalizedScore.issueBreakdown || {})
                          .filter(([k, v]) => SCORE_SEVERITY_CONFIG[k] && v > 0)
                          .map(([k, v]) => (
                            <span key={k} className={`flex items-center gap-1 ${SCORE_SEVERITY_CONFIG[k].text} font-medium`}>
                              {v} {SCORE_SEVERITY_CONFIG[k].label}{v !== 1 ? "s" : ""}
                            </span>
                          ))}
                        {!normalizedScore.issueTotal && (
                          <span className="text-green-400 font-medium">All clear</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {normalizedScore.grade && (
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-semibold border select-none",
                            normalizedScore.pass
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          )}
                        >
                          Grade {normalizedScore.grade}
                        </span>
                      )}
                      {normalizedScore.pass !== undefined && (
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-semibold border select-none",
                            normalizedScore.pass
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          )}
                        >
                          {normalizedScore.pass ? "PASS" : "FAIL"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="h-1.5 rounded-full bg-[#24304d] overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${scoreTierColors(normalizedScore.score).bar} rounded-full transition-all duration-700`}
                      style={{ width: `${normalizedScore.score}%` }}
                    />
                  </div>

                  {/* Category breakdown chips */}
                  {normalizedScore.categoryBreakdown?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {normalizedScore.categoryBreakdown.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#24304d] bg-[#0c1224] px-2.5 py-1 text-[10px] text-slate-300"
                        >
                          <span className="font-medium text-white capitalize">{c.category}</span>
                          <span className="text-slate-500">
                            {c.issueCount} issue{c.issueCount !== 1 ? "s" : ""} · -{c.pointsDeducted}pts
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Issues: all-clear banner or detailed table */}
                  {normalizedScore.topIssues.length === 0 ? (
                    <div className="flex items-center gap-2 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-sm text-green-400">No issues found — spec passes all governance checks!</span>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#24304d] overflow-hidden">
                      <table className="w-full text-xs table-fixed">
                        <thead>
                          <tr className="bg-[#0c1224] border-b border-[#24304d]">
                            <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-28">Severity</th>
                            <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-52">Rule</th>
                            <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Message</th>
                            <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-56">Path</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#24304d]/50">
                          {normalizedScore.topIssues.map((issue, i) => {
                            // Each entry is either a full finding object from /v1/score
                            // ({ code, message, severity, path, line, category, ... }) or,
                            // for older/other shapes, a plain string — never render the
                            // object itself as a child (React error #31).
                            const isObj = issue && typeof issue === "object";
                            const sevKey = isObj ? String(issue.severity || "").toLowerCase() : "";
                            const sevCfg = SCORE_SEVERITY_CONFIG[sevKey];
                            const message = isObj ? issue.message ?? issue.code ?? "" : String(issue);
                            const code = isObj ? issue.code : undefined;
                            const path = isObj ? issue.path : undefined;
                            const line = isObj ? issue.line : undefined;
                            return (
                              <tr key={i} className="hover:bg-[#1e293b]/40 transition-colors">
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${sevCfg?.pillBg || "bg-gray-500/15"} ${sevCfg?.text || "text-gray-400"}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sevCfg?.dot || "bg-gray-500"}`} />
                                    {sevCfg?.label || issue?.severity || "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <code className={`font-mono text-[10px] break-all ${sevCfg?.text || "text-gray-400"}`}>
                                    {code || "—"}
                                  </code>
                                </td>
                                <td className="px-3 py-2.5 text-gray-300 leading-relaxed">{message}</td>
                                <td className="px-3 py-2.5">
                                  <code className="font-mono text-[10px] text-gray-400 break-all">
                                    {path ? path.split(".").join(" › ") : line != null ? `line ${line}` : "—"}
                                  </code>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <pre className="overflow-auto rounded bg-[#080c14] p-3 text-[11px] whitespace-pre text-slate-300">
                  {JSON.stringify(scoreResult, null, 2)}
                </pre>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Apigee Linting tab — sends the generated apiproxy bundle's download URL
// (from the resource's onboarding codeGenResults, same archive the Microservice
// tab downloads) to POST /lint/v1/validate/url, which runs apigeelint server-side
// against the ProxyEndpoint / TargetEndpoint / Policy XML files. Nothing is
// fetched until the user clicks "Run scan" — download + unzip + lint is
// comparatively heavy compared to the OpenAPI-spec-based "API Linting" tab.
// ----------------------------------------------------------------------
// Severity keys returned by the real apigeelint engine (ESLint convention:
// 1 = warning, 2 = error).
const APIGEE_LINT_SEVERITY = {
  2: { label: "Error", text: "text-red-400", pillBg: "bg-red-500/15", dot: "bg-red-400" },
  1: { label: "Warning", text: "text-yellow-400", pillBg: "bg-yellow-500/15", dot: "bg-yellow-400" },
};

// Flattens apigeelint's own per-file report (one entry per XML file, each with
// a `messages` array) into a single list of rows for the table below. This is
// the exact shape /lint/v1/validate/url returns under `report`.
const flattenApigeelintReport = (report) =>
  (report || []).flatMap((fileResult) =>
    (fileResult.messages || []).map((m) => ({
      severity: m.severity, // 1 = warning, 2 = error
      code: m.ruleId || "—",
      message: m.message,
      path: fileResult.filePath,
      line: m.line,
    }))
  );

const ApigeeBundleLintBody = ({ selectedResource, resourceObject, runToken, onRunningChange, showMessage }) => {
  const [phase, setPhase] = useState("idle"); // idle | running | done | error
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null); // { fileCount, errorCount, warningCount, score, grade }
  const [error, setError] = useState("");
  // Guards against a mount-time auto-run: if this body unmounts (tab switch) and
  // remounts, `runToken` arrives already non-zero from a prior click — only an
  // actual *change* from the value seen at mount should trigger a fresh scan.
  const prevRunTokenRef = useRef(runToken);

  useEffect(() => {
    setPhase("idle");
    setResults(null);
    setSummary(null);
    setError("");
  }, [selectedResource]);

  useEffect(() => {
    if (runToken === prevRunTokenRef.current) return;
    prevRunTokenRef.current = runToken;
    if (!runToken || !selectedResource) return;
    let cancelled = false;
    const run = async () => {
      setPhase("running");
      onRunningChange?.(true);
      setError("");
      setResults(null);
      setSummary(null);
      // The scan runs against the generated code artifact (same archive the
      // Microservice tab downloads), not the live deployed Apigee revision —
      // so the resource must have a completed codegen run.
      const codeGenResults = resourceObject?.raw?.codeGenResults || [];
      const codeGen = codeGenResults.find((r) => r?.status === "SUCCESS") || codeGenResults[0];
      const downloadUrl = codeGen?.archiveDownloadUrl;
      if (!downloadUrl) {
        setError("No generated code artifact found for this proxy. Make sure code generation has completed.");
        showMessage?.("No generated code artifact found for this proxy.", "error");
        setPhase("error");
        onRunningChange?.(false);
        return;
      }
      const res = await apigeeLintService.validateUrl({ downloadUrl, profile: "apigeex", useCustomRules: true });
      if (cancelled) return;
      if (res.success) {
        const { report, summary: apiSummary } = res.data || {};
        setResults(flattenApigeelintReport(report));
        setSummary({
          fileCount: (report || []).length,
          errorCount: apiSummary?.errorCount ?? 0,
          warningCount: apiSummary?.warningCount ?? 0,
          score: apiSummary?.score,
          grade: apiSummary?.grade,
        });
        setPhase("done");
      } else {
        setError(res.error || "Failed to run Apigee lint scan");
        showMessage?.(res.error || "Failed to run Apigee lint scan", "error");
        setPhase("error");
      }
      onRunningChange?.(false);
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  if (!selectedResource) {
    return null;
  }
  if (phase === "running") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400 mb-3" />
        <p className="text-sm text-slate-400">Downloading &amp; linting the proxy bundle with apigeelint…</p>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <AlertCircle className="h-8 w-8 text-yellow-400 mb-3" />
        <p className="text-sm text-slate-300 max-w-md">{error}</p>
      </div>
    );
  }
  if (phase !== "done") {
    return null;
  }

  const score = summary.score ?? (summary.errorCount === 0 && summary.warningCount === 0
    ? 100
    : Math.max(0, 100 - summary.errorCount * 8 - summary.warningCount * 4));
  const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#24304d] bg-[#0f172a]/60">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-gray-300">Linting Score:</span>
              <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {summary.fileCount} XML files scanned{summary.grade ? ` · grade ${summary.grade}` : ""}
            </span>
          </div>
        </div>
        {results.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm text-green-400">No issues found — bundle passes all Apigee lint checks!</span>
          </div>
        ) : (
          <div className="rounded-lg border border-[#24304d] overflow-hidden">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="bg-[#0c1224] border-b border-[#24304d]">
                  <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-24">Severity</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-24">Rule</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Message</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-56">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24304d]/50">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-[#1e293b]/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${APIGEE_LINT_SEVERITY[r.severity]?.pillBg} ${APIGEE_LINT_SEVERITY[r.severity]?.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${APIGEE_LINT_SEVERITY[r.severity]?.dot}`} />
                        {APIGEE_LINT_SEVERITY[r.severity]?.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className={`font-mono text-[10px] break-all ${APIGEE_LINT_SEVERITY[r.severity]?.text}`}>{r.code}</code>
                    </td>
                    <td className="px-3 py-2.5 text-gray-300 leading-relaxed">{r.message}</td>
                    <td className="px-3 py-2.5">
                      <code className="font-mono text-[10px] text-gray-400 break-all">{r.path?.split("/").slice(-2).join("/")}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Helper: Compute runtime URL for OWASP scans
// ----------------------------------------------------------------------
const getDeployedUrlForResource = (resource, assetType) => {
  if (!resource) return "";
  if (assetType === "APIGEE_PROXY") {
    const proxyName = resource.resourceName || resource.apiName || resource.name;
    return proxyName ? `https://forgegateway.probestack.io/${proxyName}` : "";
  }
  if (assetType === "MICROSERVICE") {
    const raw = resource.raw;
    if (!raw) return "";
    const codeGenResults = raw.codeGenResults || [];
    const codeGen = codeGenResults.find(r => r?.status === "SUCCESS") || codeGenResults[0] || {};
    const sourceCodeManagement = raw.connectorConfiguration?.sourceCodeManagement || {};
    const repoName = sourceCodeManagement.repo ||
                     sourceCodeManagement.repository ||
                     sourceCodeManagement.repoName ||
                     codeGen.repoName ||
                     codeGen.repositoryName ||
                     codeGen.repository ||
                     codeGen.repo ||
                     codeGen.gitRepository ||
                     codeGen.pushedRepoFullName ||
                     codeGen.artifactId;
    if (!repoName) return "";
    const normalized = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return normalized ? `https://${normalized}-spipnh6wiq-uc.a.run.app` : "";
  }
  return "";
};

// ----------------------------------------------------------------------
// V16 — Full-screen History page (replaces the old fixed-overlay drawer
// when the user clicks the "History" header button). It mirrors the UX
// shipped in /pages/Gateway/HistoryView.jsx but is dedicated to the
// Microservice/Proxy/Kong asset universe and keeps the existing
// scope ("current resource" vs "all scans") + family (compliance/owasp)
// filters that Governance.jsx already supports.
// ----------------------------------------------------------------------
const GovernanceHistoryPage = ({ defaultFamily, projectName, assetType, resources, onBack, onOpenScan }) => {
  const [family, setFamily] = useState(defaultFamily || "compliance");
  const [scope, setScope] = useState("current");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Scan history rows only carry `projectName` (the resource's API name). Look up the
  // matching resource by name to enrich each row with its team ("Project") and application id.
  const resourceByName = useMemo(() => {
    const map = new Map();
    (resources || []).forEach((r) => { if (r.name) map.set(r.name, r); });
    return map;
  }, [resources]);

  // Normalise APIGEE_PROXY → APIGEE for the backend filter (same as drawer).
  const backendAssetType = assetType === "APIGEE_PROXY" ? "APIGEE" : assetType;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const svc =
      family === "owasp"
        ? owaspService.getOwaspScanHistory
        : complianceService.getComplianceScanHistory;
    const res = await svc({
      projectName: scope === "current" && projectName ? projectName : undefined,
      assetType: scope === "current" ? (backendAssetType || undefined) : undefined,
      page,
      size,
    });
    setLoading(false);
    if (res.success) {
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } else {
      setError(res.error);
    }
  }, [family, projectName, backendAssetType, page, size, scope]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full flex-col" data-testid="governance-history-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#24304d] px-6 py-4">
        <div>
          <button
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            data-testid="governance-history-back-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to rules
          </button>
          <h1 className="text-xl font-semibold text-white">Scan history</h1>
          <p className="mt-1 text-xs text-slate-400">
            {scope === "current"
              ? (projectName ? `Showing scans for "${projectName}"` : "Showing recent scans")
              : "Showing every scan across microservices, proxies and Kong"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Scope toggle — current resource vs everything */}
          <div className="flex items-center rounded-md border border-[#24304d] bg-[#0b0e16] p-0.5">
            <button
              onClick={() => { setScope("current"); setPage(0); }}
              className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                scope === "current" ? "bg-orange-500/20 text-orange-100" : "text-slate-400 hover:text-white"
              }`}
              data-testid="governance-history-scope-current"
            >
              Current
            </button>
            <button
              onClick={() => { setScope("all"); setPage(0); }}
              className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                scope === "all" ? "bg-orange-500/20 text-orange-100" : "text-slate-400 hover:text-white"
              }`}
              data-testid="governance-history-scope-all"
            >
              All scans
            </button>
          </div>
          {["compliance", "owasp"].map((f) => (
            <button
              key={f}
              onClick={() => { setFamily(f); setPage(0); }}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                family === f
                  ? "border-orange-500/60 bg-orange-500/15 text-white"
                  : "border-[#24304d] bg-[#0b0e16] text-slate-300 hover:border-orange-500/40"
              }`}
              data-testid={`governance-history-family-${f}`}
            >
              {f === "owasp" ? "OWASP" : "Compliance"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-6 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No scans for this filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0c1224] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="whitespace-nowrap px-6 py-2 text-left">Scan id</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">API Name</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">Project</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">Application Id</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">Status</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">Results</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">Run by</th>
                <th className="whitespace-nowrap px-6 py-2 text-left">Date</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24304d]">
              {items.map((it) => {
                const matchedResource = resourceByName.get(it.projectName);
                return (
                  <tr key={it.scanId} className="hover:bg-[#101935]/40">
                    <td className="px-6 py-2 font-mono text-[11px] text-slate-300">
                      <TruncCell value={it.scanId} />
                    </td>
                    <td className="px-6 py-2 text-slate-200">
                      <TruncCell value={it.projectName} />
                    </td>
                    <td className="px-6 py-2 text-slate-300">
                      <TruncCell value={matchedResource?.teamName} />
                    </td>
                    <td className="px-6 py-2 text-slate-300">
                      <TruncCell value={matchedResource?.applicationId} />
                    </td>
                    <td className="px-6 py-2">
                      <TruncCell value={it.status} />
                    </td>
                    <td className="px-6 py-2 text-xs whitespace-nowrap">
                      <span className="text-emerald-300">{it.passed}P</span> ·{" "}
                      <span className="text-rose-300">{it.failed}F</span> ·{" "}
                      <span className="text-slate-400">{it.totalResults}T</span>
                    </td>
                    <td className="px-6 py-2 text-slate-300">
                      <TruncCell value={it.createdBy} />
                    </td>
                    <td className="px-6 py-2 text-slate-400">
                      <TruncCell value={formatDate(it.createDate)} />
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button
                        onClick={() => onOpenScan?.(it.scanId, family)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#24304d] bg-[#0b0e16] px-2 py-1 text-[11px] text-slate-200 hover:border-orange-500/60"
                        data-testid={`governance-history-open-${it.scanId}`}
                      >
                        Open <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#24304d] bg-[#0c1224]/40 px-6 py-3 text-xs text-slate-400">
        <span>Total {total} · page {page + 1}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs disabled:opacity-50"
            data-testid="governance-history-prev-btn"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => ((p + 1) * size < total ? p + 1 : p))}
            disabled={(page + 1) * size >= total}
            className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs disabled:opacity-50"
            data-testid="governance-history-next-btn"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// V16 — Full-screen scan-results page that wraps the existing
// ScanResultsPanel. Used when the user opens a scan from the history
// page; the back button respects the source so the user lands back on
// the history list (not the rules grid).
// ----------------------------------------------------------------------
const GovernanceScanResultsPage = ({ scanId, family, source, onBack }) => {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const svc =
        family === "owasp" ? owaspService.getOwaspScan : complianceService.getComplianceScan;
      const res = await svc(scanId);
      if (cancelled) return;
      setLoading(false);
      if (res.success) setScan(res.data);
      else setError(res.error || "Failed to load scan.");
    };
    run();
    return () => { cancelled = true; };
  }, [scanId, family]);

  const backLabel =
    source === "history" ? "Back to history" : source === "dashboard" ? "Back to dashboard" : "Back to rules";
  const isOwasp = family === "owasp";

  return (
    <div className="flex h-full flex-col bg-[#0e172a]" data-testid="governance-scan-results-page">
      <div className="relative overflow-hidden border-b border-[#24304d]">
        <div
          className={cn(
            "pointer-events-none absolute -top-32 left-1/4 h-64 w-64 rounded-full blur-3xl opacity-[0.12]",
            isOwasp ? "bg-violet-500" : "bg-emerald-500",
          )}
        />
        <div
          className="pointer-events-none absolute -top-24 right-10 h-56 w-56 rounded-full bg-orange-500 opacity-[0.06] blur-3xl"
        />
        <div className="relative px-6 py-5">
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white"
            data-testid="governance-results-back-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
          </button>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                isOwasp
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
              )}
            >
              {isOwasp ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">Scan Results</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {scan?.projectName && (
                  <span className="font-medium text-slate-200">{scan.projectName}</span>
                )}
                {scan?.projectName && <span className="text-slate-600">·</span>}
                <span className="font-mono text-[11px] text-slate-500">{scanId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        {loading && !error ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading scan…
          </div>
        ) : scan ? (
          <ScanResultsPanel family={family} scan={scan} />
        ) : null}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Dashboard — one governance score per resource, per asset type
// ----------------------------------------------------------------------
// Normalises MICROSERVICE/KONG onboarding rows into the same
// { id, name, label, teamName, applicationId, raw } shape fetchResources()
// uses on the rules screen, so the Dashboard's resource list lines up with it.
const mapOnboardingItems = (items) => {
  const mapped = (items || []).map((item, idx) => {
    const micro = item?.microservice || {};
    const kong = item?.kong || item?.kongService || {};
    const id = micro?.id || kong?.id || item?.id || `resource-${idx + 1}`;
    const name = micro?.applicationName || micro?.apiName
      || kong?.serviceName || kong?.applicationName
      || item?.applicationName || `Resource ${idx + 1}`;
    const teamName = micro?.teamName || kong?.teamName || item?.teamName || "";
    const applicationId = micro?.applicationId || kong?.applicationId || item?.applicationId || "";
    return { id, name, label: name, teamName, applicationId, raw: item };
  });
  return mapped.filter((r) => r.id && !r.id.startsWith("resource-"));
};

const loadResourcesForAssetType = async (assetType) => {
  if (assetType === "APIGEE_PROXY") {
    const orgsRes = await apigeeProxyService.listOrganizations();
    // Cap fan-out — the dashboard summarises, it doesn't need to enumerate
    // every org a caller happens to have access to.
    const orgs = (orgsRes.success ? orgsRes.data : []).slice(0, 5);
    const perOrg = await Promise.all(orgs.map((org) => apigeeProxyService.listProxies(org)));
    const seen = new Set();
    const resources = [];
    perOrg.forEach((res, i) => {
      if (!res.success) return;
      (res.data || []).forEach((name) => {
        if (seen.has(name)) return;
        seen.add(name);
        resources.push({ id: name, name, label: name, teamName: "", raw: { name, orgName: orgs[i] } });
      });
    });
    return resources;
  }
  const result = await onboardingService.getAllByProjectType(assetType);
  if (!result.success) throw new Error(result.error || "Failed to load resources");
  const items = result.data?.data || result.data || [];
  return mapOnboardingItems(items);
};

// Latest compliance/OWASP scan for one resource, reduced to a weighted score.
// status: "ok" (scored) | "none" (never scanned) | "error" (fetch failed).
const fetchLatestScore = async (family, projectName, backendAssetType, ruleMeta) => {
  const historyFn = family === "owasp" ? owaspService.getOwaspScanHistory : complianceService.getComplianceScanHistory;
  const detailFn = family === "owasp" ? owaspService.getOwaspScan : complianceService.getComplianceScan;
  const histRes = await historyFn({ projectName, assetType: backendAssetType, page: 0, size: 1 });
  if (!histRes.success) return { status: "error", error: histRes.error };
  const item = (histRes.data?.items || [])[0];
  if (!item) return { status: "none" };
  const detailRes = await detailFn(item.scanId);
  if (!detailRes.success) return { status: "error", error: detailRes.error, scanId: item.scanId };
  return {
    status: "ok",
    scanId: item.scanId,
    createDate: item.createDate,
    score: computeGovernanceScore(detailRes.data?.scanResults, ruleMeta),
  };
};

const DASH_TABS = [
  { key: "MICROSERVICE", label: "Microservice", Icon: Server },
  { key: "APIGEE_PROXY", label: "Apigee", Icon: Network },
  { key: "KONG", label: "Kong", Icon: GitBranch },
];

const DashScoreBlock = ({ label, icon, entry, onOpen }) => {
  if (!entry || entry.status === "none") {
    return (
      <div className="flex-1 rounded-lg border border-dashed border-[#2a3556] bg-[#0b0e16]/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {icon} {label}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">No scan</p>
      </div>
    );
  }
  if (entry.status === "error") {
    return (
      <div className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-rose-300">
          {icon} {label}
        </p>
        <p className="mt-1.5 text-xs text-rose-300/80">Failed to load</p>
      </div>
    );
  }
  const pct = entry.score?.percentage;
  if (pct == null) {
    return (
      <div className="flex-1 rounded-lg border border-[#24304d] bg-[#0b0e16]/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {icon} {label}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">No scorable rules</p>
      </div>
    );
  }
  const tier = scoreTierColors(pct);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!entry.scanId}
      className="flex-1 rounded-lg border border-[#24304d] bg-[#0c1224] px-3 py-2.5 text-left transition-colors hover:border-orange-500/50 disabled:cursor-default"
    >
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("text-lg font-bold", tier.text)}>{pct}%</span>
        <span className="text-[10px] text-slate-500">
          {entry.score.earned}/{entry.score.possible} pts
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#24304d]">
        <div className={cn("h-full bg-gradient-to-r", tier.bar)} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
};

const ResourceScoreCard = ({ row, onOpenScan }) => {
  const { resource, compliance, owasp } = row;
  return (
    <div className="rounded-xl border border-[#24304d] bg-[#0c1224] p-4 transition-colors hover:border-[#3a4870]">
      <div className="mb-3 min-w-0">
        <p className="truncate text-sm font-semibold text-white" title={resource.name}>
          {resource.name}
        </p>
        {resource.teamName ? (
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{resource.teamName}</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-slate-600">&nbsp;</p>
        )}
      </div>
      <div className="flex gap-2.5">
        <DashScoreBlock
          label="Compliance"
          icon={<ShieldCheck className="h-3 w-3" />}
          entry={compliance}
          onOpen={() => compliance?.scanId && onOpenScan(compliance.scanId, "compliance")}
        />
        <DashScoreBlock
          label="OWASP"
          icon={<ShieldAlert className="h-3 w-3" />}
          entry={owasp}
          onOpen={() => owasp?.scanId && onOpenScan(owasp.scanId, "owasp")}
        />
      </div>
    </div>
  );
};

const DashStat = ({ label, value, tone = "slate" }) => (
  <div className={cn("rounded-lg border px-4 py-3", STAT_TILE_TONES[tone] || STAT_TILE_TONES.slate)}>
    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 text-xl font-bold leading-tight">{value}</p>
  </div>
);

const GovernanceDashboardPage = ({ onBack, onOpenScan }) => {
  const [dashTab, setDashTab] = useState("MICROSERVICE");
  const [cache, setCache] = useState({});

  const loadDashboardTab = useCallback(async (assetType) => {
    setCache((prev) => ({ ...prev, [assetType]: { ...(prev[assetType] || {}), loading: true, error: null } }));
    try {
      const backendAssetType = assetType === "APIGEE_PROXY" ? "APIGEE" : assetType;
      const [resources, complianceRulesRes, owaspRulesRes] = await Promise.all([
        loadResourcesForAssetType(assetType),
        complianceService.getComplianceRules({ assetType: backendAssetType }),
        owaspService.getOwaspRules({ assetType: backendAssetType }),
      ]);
      const complianceMeta = buildRuleMetaMap(
        complianceRulesRes.success ? (complianceRulesRes.data?.rules || complianceRulesRes.data) : []
      );
      const owaspMeta = buildRuleMetaMap(
        owaspRulesRes.success ? (owaspRulesRes.data?.rules || owaspRulesRes.data) : []
      );

      const rows = await Promise.all(
        resources.map(async (resource) => {
          const [compliance, owasp] = await Promise.all([
            fetchLatestScore("compliance", resource.name, backendAssetType, complianceMeta),
            fetchLatestScore("owasp", resource.name, backendAssetType, owaspMeta),
          ]);
          return { resource, compliance, owasp };
        })
      );

      setCache((prev) => ({ ...prev, [assetType]: { loading: false, error: null, rows } }));
    } catch (err) {
      setCache((prev) => ({
        ...prev,
        [assetType]: { loading: false, error: err.message || "Failed to load dashboard", rows: [] },
      }));
    }
  }, []);

  useEffect(() => {
    if (!cache[dashTab]) loadDashboardTab(dashTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashTab]);

  const tabState = cache[dashTab];
  const rows = tabState?.rows || [];
  const loading = !!tabState?.loading;
  const error = tabState?.error;

  const avgOf = (key) => {
    const vals = rows.map((r) => r[key]?.score?.percentage).filter((v) => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };
  const scannedCount = rows.filter((r) => r.compliance?.status === "ok" || r.owasp?.status === "ok").length;
  const avgCompliance = avgOf("compliance");
  const avgOwasp = avgOf("owasp");

  return (
    <div className="flex h-full flex-col bg-[#0e172a]" data-testid="governance-dashboard-page">
      <div className="border-b border-[#24304d] px-6 py-5">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white"
          data-testid="governance-dashboard-back-btn"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to rules
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Governance Dashboard</h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Weighted compliance &amp; OWASP scores across every onboarded resource
              </p>
            </div>
          </div>
          <button
            onClick={() => loadDashboardTab(dashTab)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white transition-colors hover:border-orange-500/60 disabled:opacity-50"
            data-testid="governance-dashboard-refresh-btn"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {DASH_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setDashTab(key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all",
                dashTab === key
                  ? "border-orange-500/60 bg-orange-500/15 text-white"
                  : "border-[#24304d] bg-[#0b0e16]/50 text-slate-300 hover:border-orange-500/40"
              )}
              data-testid={`governance-dashboard-tab-${key}`}
            >
              <Icon className="h-4 w-4" /> {label}
              {cache[key]?.rows && (
                <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-slate-300">
                  {cache[key].rows.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {!loading && !error && rows.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <DashStat label="Resources" value={rows.length} />
            <DashStat label="Scanned" value={scannedCount} tone={scannedCount > 0 ? "emerald" : "slate"} />
            <DashStat label="Avg Compliance" value={avgCompliance != null ? `${avgCompliance}%` : "—"} />
            <DashStat label="Avg OWASP" value={avgOwasp != null ? `${avgOwasp}%` : "—"} />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading resources &amp; scan history…
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="py-16 text-center text-sm text-slate-400">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 opacity-50" />
            No resources found for this asset type.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <ResourceScoreCard
                key={row.resource.id}
                row={row}
                onOpenScan={(scanId, family) => onOpenScan(scanId, family)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Main Governance component
// ----------------------------------------------------------------------
const Governance = ({ showHeader = true }) => {
  const [activeTab, setActiveTab] = useState("compliance");
  const [assetType, setAssetType] = useState("MICROSERVICE");
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState("");
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceError, setResourceError] = useState("");

  // Apigee org picker (only used when assetType === APIGEE_PROXY)
  const [apigeeOrgs, setApigeeOrgs] = useState([]);
  const [selectedApigeeOrg, setSelectedApigeeOrg] = useState("");
  const [loadingApigeeOrgs, setLoadingApigeeOrgs] = useState(false);

  const [rules, setRules] = useState([]);
  const [selectedRules, setSelectedRules] = useState(new Set());
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState("");

  const [runningScan, setRunningScan] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanError, setScanError] = useState("");
  // Stable reference — an inline arrow here would be recreated on every render and,
  // if passed into a child's effect dependency array, can retrigger that effect on
  // every unrelated parent re-render.
  const handleLintMessage = useCallback((msg) => setScanError(msg), []);

  const [drawerRule, setDrawerRule] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // API Linting tab (Spectral/OpenAPI) — "Run scan" only bumps this token once the
  // spec has loaded; the spec itself is just shown (not linted) on tab switch.
  const [lintRunToken, setLintRunToken] = useState(0);
  const [lintReady, setLintReady] = useState(false);

  // Apigee Linting tab (proxy bundle/policies) — only shown when assetType is Apigee.
  const [apigeeLintRunToken, setApigeeLintRunToken] = useState(0);
  const [apigeeLintRunning, setApigeeLintRunning] = useState(false);
  // V16 — view state machine. `rules` = main rule grid (default).
  //                          `history` = full-screen history page.
  //                          `results` = full-screen scan-result page (with Back-to-history).
  const [view, setView] = useState({ kind: "rules" });

  // Ref for the scan results panel — auto-scrolls into view when a scan starts so users
  // don't have to look for results below the rule grid.
  const resultsPanelRef = useRef(null);
  useEffect(() => {
    if ((runningScan || lastScan) && resultsPanelRef.current) {
      try { resultsPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (_) {}
    }
  }, [runningScan, lastScan]);

  // Clear stale errors whenever the user switches asset type (otherwise a transient
  // "Failed to fetch onboardings" sticks around forever).
  useEffect(() => {
    setResourceError("");
    setScanError("");
    setLastScan(null);
  }, [assetType]);

  // "Apigee Linting" only exists for Apigee proxies — bounce back to Compliance
  // Rules if the asset type changes away from Apigee while that tab is open.
  useEffect(() => {
    if (assetType !== "APIGEE_PROXY" && activeTab === "apigeeLinting") {
      setActiveTab("compliance");
    }
  }, [assetType, activeTab]);

  // --------------------------------------------------------------------
  // Load Apigee orgs once — used only when assetType === APIGEE_PROXY
  // --------------------------------------------------------------------
  useEffect(() => {
    if (assetType !== "APIGEE_PROXY") return;
    let cancelled = false;
    setLoadingApigeeOrgs(true);
    apigeeProxyService.listOrganizations()
      .then((res) => {
        if (cancelled) return;
        const orgs = res?.data || res?.organizations || res || [];
        const list = Array.isArray(orgs) ? orgs : [];
        setApigeeOrgs(list);
        if (list.length > 0 && !selectedApigeeOrg) setSelectedApigeeOrg(list[0]);
      })
      .catch(() => { if (!cancelled) setApigeeOrgs([]); })
      .finally(() => { if (!cancelled) setLoadingApigeeOrgs(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType]);

  // --------------------------------------------------------------------
  // fetch resources based on assetType (and selectedApigeeOrg for Apigee)
  // --------------------------------------------------------------------
  // Apigee Linting sources resources differently from the other tabs (see below) —
  // derived as a boolean so switching between e.g. Compliance/OWASP/API Linting
  // (which share the same live-org-proxy source) doesn't needlessly refetch and
  // reset the selection; only actually crossing into/out of Apigee Linting does.
  const apigeeLintTabActive = assetType === "APIGEE_PROXY" && activeTab === "apigeeLinting";

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    setResourceError("");
    setSelectedResource("");
    try {
      if (assetType === "APIGEE_PROXY" && !apigeeLintTabActive) {
        if (!selectedApigeeOrg) {
          setResources([]);
          return;
        }
        const res = await apigeeProxyService.listProxies(selectedApigeeOrg);
        const proxyNames = Array.isArray(res) ? res : (res?.data || res?.proxies || []);
        setResources(proxyNames.map((name) => ({
          id: name,
          name,
          label: name,
          raw: { name, orgName: selectedApigeeOrg },
        })));
      } else {
        // MICROSERVICE, KONG, or APIGEE_PROXY-on-the-Apigee-Linting-tab — all three
        // are ForgeSphere onboarding records, sourced the same way. Apigee Linting
        // needs the onboarding record (not the live Apigee org proxy list) because
        // the lint scan runs against the generated code artifact's download URL,
        // which only lives on the onboarding record's codeGenResults.
        const result = await onboardingService.getAllByProjectType(assetType);
        if (!result.success) throw new Error(result.error || "Failed to load resources");
        const items = result.data?.data || result.data || [];
        const mapped = items.map((item, idx) => {
          const micro = item?.microservice || item?.apigeeProxy || {};
          const kong = item?.kong || item?.kongService || {};
          // For MICROSERVICE/APIGEE_PROXY the real id + name live inside
          // `item.microservice`. For KONG the analogous container is `item.kong`.
          const id = micro?.id || kong?.id || item?.id || `resource-${idx + 1}`;
          const name = micro?.applicationName || micro?.apiName
            || kong?.serviceName || kong?.applicationName
            || item?.applicationName || `Resource ${idx + 1}`;
          const teamName = micro?.teamName || kong?.teamName || item?.teamName || "";
          const applicationId = micro?.applicationId || kong?.applicationId || item?.applicationId || "";
          return { id, name, label: name, teamName, applicationId, raw: item };
        });
        // Keep only rows that have a real backend id (otherwise scan will 404).
        setResources(mapped.filter((r) => r.id && !r.id.startsWith("resource-")));
      }
    } catch (err) {
      setResourceError(err.message);
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  }, [assetType, apigeeLintTabActive, selectedApigeeOrg]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // --------------------------------------------------------------------
  // fetch rules for current asset type and active tab
  // --------------------------------------------------------------------
  const family = activeTab === "owasp" ? "owasp" : "compliance";
  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    setRulesError("");
    try {
      let backendAssetType = assetType;
      if (assetType === "APIGEE_PROXY") backendAssetType = "APIGEE";
      const svc = family === "owasp" ? owaspService.getOwaspRules : complianceService.getComplianceRules;
      const res = await svc({ assetType: backendAssetType });
      if (!res.success) throw new Error(res.error);
      const ruleList = res.data?.rules || res.data || [];
      setRules(ruleList);
      // Only pre-select rules that are actually runnable — enabled AND approved.
      setSelectedRules(
        new Set(ruleList.filter(isRuleReady).map((r) => r.ruleId))
      );
    } catch (err) {
      setRulesError(err.message);
      setRules([]);
    } finally {
      setLoadingRules(false);
    }
  }, [assetType, family]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // --------------------------------------------------------------------
  // fetch linting rule catalog — shown as rule cards on the API Linting /
  // Apigee Linting tabs. Only fetched once one of those tabs is active.
  // --------------------------------------------------------------------
  const [lintingRules, setLintingRules] = useState([]);
  // Standard Rule catalog for the Apigee Linting tab — from GET /lint/v1/rules'
  // internalRules, fetched alongside customRules in fetchLintingRules below.
  const [apigeeInternalRules, setApigeeInternalRules] = useState([]);
  const [selectedLintingRules, setSelectedLintingRules] = useState(new Set());
  const [apiLintStandardInitialized, setApiLintStandardInitialized] = useState(false);
  const [apigeeLintStandardInitialized, setApigeeLintStandardInitialized] = useState(false);
  const [loadingLintingRules, setLoadingLintingRules] = useState(false);

  const [lintingRulesError, setLintingRulesError] = useState("");
  const [standardVisibleCount, setStandardVisibleCount] = useState(6);
  const [customPage, setCustomPage] = useState(0);
  const PAGE_SIZE = 6;
  // Standard/Custom rule tab for the API Linting & Apigee Linting sections — Custom
  // comes first so it lines up with the "Add Custom Rule" action next to it.
  const [lintingRuleTab, setLintingRuleTab] = useState("custom");


  const fetchLintingRules = useCallback(async () => {
    setLoadingLintingRules(true);
    setLintingRulesError("");
    try {
      if (activeTab === "apigeeLinting") {
        // Apigee Linting sources both rule catalogs live from the lint service
        // itself rather than the compliance-api linting-rules endpoint.
        const res = await apigeeLintService.getRules();
        if (!res.success) throw new Error(res.error);
        const customList = (res.data?.customRules || []).map(mapLintApiRule);
        setLintingRules(customList);
        setApigeeInternalRules((res.data?.internalRules || []).map(mapLintApiRule));
        setCustomPage(0);
        const customReadyIds = customList.filter(isRuleReady).map(r => r.ruleId);
        setSelectedLintingRules(prev => new Set([...prev, ...customReadyIds]));
        return;
      }
      let backendAssetType = assetType;
      if (assetType === "APIGEE_PROXY") backendAssetType = "APIGEE";
      const res = await complianceService.getLintingRules({ assetType: backendAssetType, status: "all" });
      if (!res.success) throw new Error(res.error);
      const ruleList = res.data?.rules || [];
      setLintingRules(ruleList);
      setCustomPage(0);
      // Merge custom ready rules with existing (standard) selections
const customReadyIds = ruleList.filter(isRuleReady).map(r => r.ruleId);
setSelectedLintingRules(prev => new Set([...prev, ...customReadyIds]));
    } catch (err) {
      setLintingRulesError(err.message);
      setLintingRules([]);
    } finally {
      setLoadingLintingRules(false);
    }
  }, [assetType, activeTab]);

  // Toggle function for Linting rules (both Standard and Custom)
const toggleLintingRule = (id) => {
  const newSet = new Set(selectedLintingRules);
  if (newSet.has(id)) newSet.delete(id);
  else newSet.add(id);
  setSelectedLintingRules(newSet);
};

  // Hardcoded Standard Rules for API Linting tab (OpenAPI/Spectral-style checks)
const apiLintStandardRules = useMemo(() => [
  {
    ruleId: "info-contact",
    ruleName: "Info Contact",
    ruleDescription: "The OpenAPI document should provide contact information (email, URL) so users know whom to reach for API support.",
    severity: "OPTIONAL",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "info-description",
    ruleName: "Info Description",
    ruleDescription: "The `info.description` field should give a clear, concise overview of the API's purpose and capabilities.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-valid-schema-example",
    ruleName: "Valid Schema Example",
    ruleDescription: "Every schema-defined property should include an example that matches the defined type and constraints to aid documentation.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-valid-media-example",
    ruleName: "Valid Media Example",
    ruleDescription: "Media type examples must be valid against the schema; invalid examples can mislead API consumers.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "operation-operationId",
    ruleName: "Operation ID Required",
    ruleDescription: "Each operation should have a unique `operationId` to enable client code generation and consistent referencing.",
    severity: "MANDATORY",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "operation-summary",
    ruleName: "Operation Summary",
    ruleDescription: "A brief summary for each operation helps users understand the endpoint's purpose at a glance.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "tag-description",
    ruleName: "Tag Description",
    ruleDescription: "Tags should have a description to provide context for grouped operations.",
    severity: "OPTIONAL",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-parameter-description",
    ruleName: "Parameter Description",
    ruleDescription: "All parameters must include a description explaining their purpose and expected values.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-response-example",
    ruleName: "Response Example",
    ruleDescription: "Each response should include an example payload to illustrate the expected response structure.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-server-variable",
    ruleName: "Server Variable Described",
    ruleDescription: "If server variables are used, they should be clearly described and have default values.",
    severity: "OPTIONAL",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-unused-component",
    ruleName: "Unused Component",
    ruleDescription: "Components that are defined but never referenced should be removed to keep the spec clean.",
    severity: "RECOMMENDED",
    enabled: true,
    status: "ACTIVE"
  },
  {
    ruleId: "oas3-ambiguous-path",
    ruleName: "Ambiguous Path",
    ruleDescription: "Path templates should be unambiguous; avoid overlapping path patterns that may cause routing confusion.",
    severity: "MANDATORY",
    enabled: true,
    status: "ACTIVE"
  }
], []);

  // Standard rule catalog for whichever linting tab is active — API Linting shows
  // the OpenAPI/Spectral-style rules, Apigee Linting shows the live internalRules
  // catalog from GET /lint/v1/rules.
  const activeStandardRules = activeTab === "apigeeLinting" ? apigeeInternalRules : apiLintStandardRules;

  // Initialize both standard rule sets as checked by default (once each, regardless
  // of which tab is currently active — mirrors how custom rules are merged in above).
  useEffect(() => {
    if (!apiLintStandardInitialized && apiLintStandardRules.length > 0) {
      setSelectedLintingRules(prev => new Set([...prev, ...apiLintStandardRules.map(r => r.ruleId)]));
      setApiLintStandardInitialized(true);
    }
  }, [apiLintStandardRules, apiLintStandardInitialized]);

  useEffect(() => {
    if (!apigeeLintStandardInitialized && apigeeInternalRules.length > 0) {
      setSelectedLintingRules(prev => new Set([...prev, ...apigeeInternalRules.map(r => r.ruleId)]));
      setApigeeLintStandardInitialized(true);
    }
  }, [apigeeInternalRules, apigeeLintStandardInitialized]);

  // Reset "Load More" pagination when switching between the two very
  // differently-sized standard rule catalogs.
  useEffect(() => {
    setStandardVisibleCount(6);
  }, [activeTab]);

const standardVisible = useMemo(() => {
  return activeStandardRules.slice(0, standardVisibleCount);
}, [activeStandardRules, standardVisibleCount]);

const standardHasMore = useMemo(() => {
  return standardVisibleCount < activeStandardRules.length;
}, [standardVisibleCount, activeStandardRules]);

// Paginated data for Custom Rules (API based)
const customPaginated = useMemo(() => {
  const start = customPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  return lintingRules.slice(start, end);
}, [lintingRules, customPage]);

const customHasMore = useMemo(() => {
  return customPage * PAGE_SIZE + PAGE_SIZE < lintingRules.length;
}, [lintingRules, customPage]);

  useEffect(() => {
    if (activeTab === "linting" || activeTab === "apigeeLinting") {
      fetchLintingRules();
    }
  }, [activeTab, fetchLintingRules]);

  // --------------------------------------------------------------------
  // run scan (compliance or OWASP)
  // --------------------------------------------------------------------
  const runScan = async () => {
    if (!selectedResource) {
      setScanError("Please select a resource first");
      return;
    }
    if (selectedRules.size === 0) {
      setScanError("Please select at least one rule");
      return;
    }
    setRunningScan(true);
    setScanError("");
    setLastScan(null);

    const selectedResourceObj = resources.find((r) => r.id === selectedResource);
    const friendlyProjectName = selectedResourceObj?.name || selectedResource;

    let deployedUrl = "";
    if (family === "owasp") {
      deployedUrl = getDeployedUrlForResource(selectedResourceObj, assetType);
    }

    let backendAssetType = assetType;
    if (assetType === "APIGEE_PROXY") backendAssetType = "APIGEE";

    const payload = {
      assetType: backendAssetType,
      projectName: friendlyProjectName,
      resourceIds: [selectedResource],
      rules: { ruleTypes: ["PRE_DEFINED"], ruleIds: Array.from(selectedRules) },
      requestedBy: getLoggedInUserEmail(),
      scanOptions: { scanMode: "FULL", includeInactiveRules: false, saveResult: true },
    };
    if (family === "owasp" && deployedUrl) {
      payload.deployedEndpointUrl = deployedUrl;
    }

    const svc = family === "owasp" ? owaspService.runOwaspCheck : complianceService.runComplianceCheck;
    const res = await svc(payload);
    if (!res.success) {
      setRunningScan(false);
      setScanError(res.error);
      return;
    }
    const scanId = res.data?.scans?.[0]?.scanId || res.data?.scanId;
    if (!scanId) {
      setRunningScan(false);
      setScanError("No scanId returned from backend");
      return;
    }

    // Poll for completion. Backend returns LOWERCASE statuses (submitted / completed / error).
    let pollCount = 0;
    const poll = async () => {
      const detailRes = await (family === "owasp"
        ? owaspService.getOwaspScan(scanId)
        : complianceService.getComplianceScan(scanId));
      if (detailRes.success) {
        const scanStatus = String(detailRes.data?.status || "").toLowerCase();
        if (scanStatus === "completed" || scanStatus === "error") {
          setLastScan(detailRes.data);
          setRunningScan(false);
          if (scanStatus === "error") {
            setScanError(detailRes.data?.errorMessage || "Scan failed on backend");
          }
          return;
        }
      } else if (pollCount === 0) {
        // First call failed hard → surface immediately
        setRunningScan(false);
        setScanError(detailRes.error || "Failed to fetch scan status");
        return;
      }
      if (pollCount < 24) {
        pollCount += 1;
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        setRunningScan(false);
        setScanError("Scan timed out — please refresh from History.");
      }
    };
    // First poll immediately so users see results quickly when scan is fast (~1s).
    setTimeout(poll, 800);
  };

  const selectedCount = selectedRules.size;
  const canRun = selectedResource && !runningScan && selectedCount > 0;

  // Currently-selected resource object (needed by LintingBody to read raw onboarding data).
  const selectedResourceObj = resources.find((r) => r.id === selectedResource) || null;

  const isLintingTab = activeTab === "linting" || activeTab === "apigeeLinting";

  // If the user is looking at Standard Rule, slide over to Custom Rule first so the
  // new rule they're about to add is visible once the modal closes.
  const handleAddCustomRuleClick = () => {
    if (isLintingTab && lintingRuleTab !== "custom") {
      setLintingRuleTab("custom");
      setTimeout(() => setAddRuleOpen(true), 300);
    } else {
      setAddRuleOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0e172a]">
      {view.kind === "history" ? (
        <main className="flex-1 overflow-hidden">
          <GovernanceHistoryPage
            defaultFamily={family}
            projectName={selectedResourceObj?.name}
            assetType={assetType}
            resources={resources}
            onBack={() => setView({ kind: "rules" })}
            onOpenScan={(scanId, fam) =>
              setView({ kind: "results", scanId, family: fam, source: "history" })
            }
          />
        </main>
      ) : view.kind === "dashboard" ? (
        <main className="flex-1 overflow-hidden">
          <GovernanceDashboardPage
            onBack={() => setView({ kind: "rules" })}
            onOpenScan={(scanId, fam) =>
              setView({ kind: "results", scanId, family: fam, source: "dashboard" })
            }
          />
        </main>
      ) : view.kind === "results" ? (
        <main className="flex-1 overflow-hidden">
          <GovernanceScanResultsPage
            scanId={view.scanId}
            family={view.family}
            source={view.source}
            onBack={() => {
              if (view.source === "history") setView({ kind: "history" });
              else if (view.source === "dashboard") setView({ kind: "dashboard" });
              else setView({ kind: "rules" });
            }}
          />
        </main>
      ) : (
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Governance & Compliance</h1>
                <p className="text-sm text-gray-400">
                  Manage compliance rules and run security scans on your APIs
                </p>
              </div>
            </div>
          </div>

          {/* Asset type selector + resource dropdown */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Asset type:</span>
              {ASSET_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => {
                    setAssetType(type.key);
                    setSelectedResource("");
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                    assetType === type.key
                      ? "border-primary bg-primary/20 text-white"
                      : "border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/40"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className="w-px h-8 bg-dark-700" />

            {/* Apigee org dropdown — visible only when APIGEE_PROXY is the asset type and
                we're not on Apigee Linting (which sources resources from onboarding records
                instead of live org proxies, so org selection doesn't apply). */}
            {assetType === "APIGEE_PROXY" && !apigeeLintTabActive && (
              <div className="relative min-w-[220px]">
                <select
                  value={selectedApigeeOrg}
                  onChange={(e) => setSelectedApigeeOrg(e.target.value)}
                  disabled={loadingApigeeOrgs || apigeeOrgs.length === 0}
                  className="w-full rounded-lg border border-dark-700 bg-dark-800/50 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50"
                >
                  <option value="">{loadingApigeeOrgs ? "Loading orgs…" : (apigeeOrgs.length === 0 ? "No Apigee orgs" : "Choose org…")}</option>
                  {apigeeOrgs.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Resource:</span>
              <div className="relative min-w-[260px]">
                <select
                  value={selectedResource}
                  onChange={(e) => setSelectedResource(e.target.value)}
                  disabled={loadingResources || resources.length === 0}
                  className="w-full rounded-lg border border-dark-700 bg-dark-800/50 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50"
                >
                  <option value="">{loadingResources ? "Loading..." : "Select a resource"}</option>
                  {resources.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name}
                    </option>
                  ))}
                </select>
                {resourceError && <p className="mt-1 text-xs text-red-400">{resourceError}</p>}
              </div>
              {selectedResourceObj?.teamName && (
                <span className="whitespace-nowrap text-xs text-gray-400">
                  Project: <span className="font-medium text-white">{selectedResourceObj.teamName}</span>
                </span>
              )}
            </div>
            <div className="w-px h-8 bg-dark-700" />
            <button
              onClick={() => {
                if (activeTab === "linting") setLintRunToken((t) => t + 1);
                else if (activeTab === "apigeeLinting") setApigeeLintRunToken((t) => t + 1);
                else runScan();
              }}
              disabled={
                activeTab === "linting"
                  ? !selectedResource || !lintReady
                  : activeTab === "apigeeLinting"
                    ? !selectedResource || apigeeLintRunning
                    : !canRun
              }
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {(runningScan || apigeeLintRunning) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {activeTab === "linting" || activeTab === "apigeeLinting" ? "Run scan" : `Run scan (${selectedCount})`}
            </button>
            <button
              onClick={() => setView({ kind: "history" })}
              className="flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-800/50 px-4 py-2 text-sm font-semibold text-white hover:border-primary/40"
              data-testid="governance-history-btn"
            >
              <HistoryIcon className="h-4 w-4" /> History
            </button>
            <button
              onClick={() => setView({ kind: "dashboard" })}
              className="flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-800/50 px-4 py-2 text-sm font-semibold text-white hover:border-primary/40"
              data-testid="governance-dashboard-btn"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-4 border-b border-dark-700">
            <div className="flex gap-6">
              {[
                { id: "compliance", label: "Compliance Rules", icon: <ShieldCheck className="h-4 w-4" /> },
                { id: "owasp", label: "OWASP Top 10", icon: <ShieldAlert className="h-4 w-4" /> },
                { id: "linting", label: "API Linting", icon: <Sparkles className="h-4 w-4" /> },
                ...(assetType === "APIGEE_PROXY"
                  ? [{ id: "apigeeLinting", label: "Linting", icon: <Code className="h-4 w-4" /> }]
                  : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Custom Rule — available on every tab except OWASP Top 10, regardless of resource selection */}
          {activeTab !== "owasp" && (
            <div className="mb-2 flex items-center justify-between gap-4">
              {isLintingTab ? (
                <div className="relative inline-flex items-center rounded-lg border border-dark-700 bg-dark-800/50 p-1">
                  <span
                    className={cn(
                      "absolute inset-y-1 w-[116px] rounded-md bg-primary/20 border border-primary/40 transition-transform duration-300 ease-out",
                      lintingRuleTab === "custom" ? "translate-x-0" : "translate-x-[116px]"
                    )}
                  />
                  <button
                    onClick={() => setLintingRuleTab("custom")}
                    className={cn(
                      "relative z-10 w-[116px] rounded-md py-1.5 text-center text-sm font-semibold transition-colors",
                      lintingRuleTab === "custom" ? "text-primary" : "text-gray-400 hover:text-gray-300"
                    )}
                  >
                    Custom Rule
                  </button>
                  <button
                    onClick={() => setLintingRuleTab("standard")}
                    className={cn(
                      "relative z-10 w-[116px] rounded-md py-1.5 text-center text-sm font-semibold transition-colors",
                      lintingRuleTab === "standard" ? "text-primary" : "text-gray-400 hover:text-gray-300"
                    )}
                  >
                    Standard Rule
                  </button>
                </div>
              ) : (
                <span />
              )}
              <button
                onClick={handleAddCustomRuleClick}
                data-testid="governance-add-rule-btn"
                className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" /> Add Custom Rule
              </button>
            </div>
          )}

{/* Linting tab */}
{activeTab === "linting" && (
  <div className="relative">
    {selectedResource && (
      <button
        onClick={() => {
          setSelectedResource("");
          setLintRunToken(0);
          setLastScan(null);
        }}
        className="absolute top-2 right-4 z-10 rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
        title="Close and go back to rules"
      >
        <X className="h-5 w-5" />
      </button>
    )}
    <LintingBody
      assetType={assetType}
      selectedResource={selectedResource}
      resourceObject={selectedResourceObj}
      showMessage={handleLintMessage}
      runToken={lintRunToken}
      onReadyChange={setLintReady}
    />
  </div>
)}

{/* Apigee Linting tab */}
{activeTab === "apigeeLinting" && (
  <div className="relative">
    {selectedResource && (
      <button
        onClick={() => {
          setSelectedResource("");
          setApigeeLintRunToken(0);
          setLastScan(null);
        }}
        className="absolute top-4 right-4 z-10 rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
        title="Close and go back to rules"
      >
        <X className="h-5 w-5" />
      </button>
    )}
    <ApigeeBundleLintBody
      selectedResource={selectedResource}
      resourceObject={selectedResourceObj}
      runToken={apigeeLintRunToken}
      onRunningChange={setApigeeLintRunning}
      showMessage={handleLintMessage}
    />
  </div>
)}
{/* Linting Rules Display (for API Linting & Apigee Linting) — driven by the
    Standard/Custom Rule tab above, one panel visible at a time. */}
{isLintingTab && (
  <div className="mt-2">
    {lintingRuleTab === "standard" ? (
      <div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {standardVisible.map((rule) => (
            <RuleCard
              key={rule.ruleId}
              rule={rule}
              family="linting"
              isStandard
              selected={selectedLintingRules.has(rule.ruleId)}
              onToggle={toggleLintingRule}
              onShowDetail={setDrawerRule}
            />
          ))}
        </div>
        {standardHasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setStandardVisibleCount(prev => Math.min(prev + 3, activeStandardRules.length))}
              className="inline-flex items-center gap-2 rounded-md border border-dark-700 bg-dark-800/50 px-4 py-2 text-sm text-white hover:border-primary/40"
            >
              Load More <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    ) : (
      <div>
        {loadingLintingRules && lintingRules.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            Loading custom rules...
          </div>
        )}
        {!loadingLintingRules && lintingRulesError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {lintingRulesError}
          </div>
        )}
        {!loadingLintingRules && lintingRules.length === 0 && !lintingRulesError && (
          <div className="text-center py-8 text-gray-400">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 opacity-50" />
            <p>No custom rules found for {assetType}.</p>
          </div>
        )}
        {!loadingLintingRules && lintingRules.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {customPaginated.map((rule) => (
                <RuleCard
                  key={rule.ruleId}
                  rule={rule}
                  family="linting"
                  selected={selectedLintingRules.has(rule.ruleId)}
                  onToggle={toggleLintingRule}
                  onShowDetail={setDrawerRule}
                />
              ))}
            </div>
            {customHasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setCustomPage(p => p + 1)}
                  className="inline-flex items-center gap-2 rounded-md border border-dark-700 bg-dark-800/50 px-4 py-2 text-sm text-white hover:border-primary/40"
                >
                  Load More <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )}
  </div>
)}

          {/* Scan results panel — render ABOVE rule cards so it's visible without scrolling */}
          {(lastScan || runningScan) && (activeTab === "compliance" || activeTab === "owasp") && (
            <div ref={resultsPanelRef} className="mb-6 scroll-mt-24">
              <ScanResultsPanel
                family={family}
                scan={lastScan}
                running={runningScan}
                onClose={() => setLastScan(null)}
              />
            </div>
          )}
          {scanError && (activeTab === "compliance" || activeTab === "owasp") && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mr-2 inline h-4 w-4" /> {scanError}
            </div>
          )}

          {/* Compliance / OWASP rule cards */}
          {(activeTab === "compliance" || activeTab === "owasp") && (
            <>
              {loadingRules && rules.length === 0 && (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                  Loading rules...
                </div>
              )}
              {!loadingRules && rulesError && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {rulesError}
                </div>
              )}
              {!loadingRules && rules.length === 0 && !rulesError && (
                <div className="text-center py-12 text-gray-400">
                  <ShieldCheck className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No rules found for {assetType}.</p>
                  <button
                    onClick={() => setAddRuleOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/20"
                  >
                    <Plus className="h-3 w-3" /> Add a rule
                  </button>
                </div>
              )}
              {!loadingRules && rules.length > 0 && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {rules.map((rule) => (
                    <RuleCard
                      key={rule.ruleId}
                      rule={rule}
                      family={family}
                      selected={selectedRules.has(rule.ruleId)}
                      onToggle={(id) => {
                        const newSet = new Set(selectedRules);
                        if (newSet.has(id)) newSet.delete(id);
                        else newSet.add(id);
                        setSelectedRules(newSet);
                      }}
                      onShowDetail={setDrawerRule}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      )}

      {/* Drawers & Modals */}
      <RuleDetailDrawer
        open={!!drawerRule}
        ruleSummary={drawerRule}
        family={family}
        onClose={() => setDrawerRule(null)}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        defaultFamily={family}
        projectName={selectedResourceObj?.name}
        assetType={assetType}
      />
      <AddRuleModal
        open={addRuleOpen}
        family={family}
        assetType={assetType}
        ruleType={
          activeTab === "linting" || activeTab === "apigeeLinting" ? "LINTING" : "COMPLIANCE"
        }
        onClose={() => setAddRuleOpen(false)}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          if (activeTab === "linting" || activeTab === "apigeeLinting") fetchLintingRules();
          else fetchRules();
        }}
      />
    </div>
  );
};

export default Governance;