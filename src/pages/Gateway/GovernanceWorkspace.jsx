import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Code,
  FileText,
  History as HistoryIcon,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
  XCircle,
} from "lucide-react";
import { complianceService } from "../../services/complianceService";
import { owaspService } from "../../services/owaspService";
import { apigeeProxyService } from "../../services/apigeeProxyService";
import { cn } from "../../lib/utils";
import ScanResultsView from "./ScanResultsView";
import HistoryView from "./HistoryView";
import apigeelintRulesData from "../../data/apigeelintRules.json";

const APIGEE = "APIGEE";

const SEVERITY_STYLES = {
  MANDATORY: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  RECOMMENDED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  OPTIONAL: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};
const STATUS_STYLES = {
  PASSED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  FAILED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  SKIPPED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

// Severity keys returned by the real apigeelint engine (ESLint convention:
// 1 = warning, 2 = error).
const APIGEE_LINT_SEVERITY = {
  2: { label: "Error", text: "text-red-400", pillBg: "bg-red-500/15", dot: "bg-red-400" },
  1: { label: "Warning", text: "text-yellow-400", pillBg: "bg-yellow-500/15", dot: "bg-yellow-400" },
};

// Score tier reused across the compliance/OWASP dashboard and the Apigee bundle lint score.
const scoreTierColors = (score) => {
  if (score >= 80) return { text: "text-green-400", bar: "from-green-500 to-emerald-400" };
  if (score >= 60) return { text: "text-yellow-400", bar: "from-yellow-500 to-amber-400" };
  return { text: "text-red-400", bar: "from-red-500 to-rose-400" };
};

const STAT_TILE_TONES = {
  slate: "text-slate-200 border-[#24304d] bg-[#0b0e16]/60",
  emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  rose: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  orange: "text-orange-300 border-orange-500/30 bg-orange-500/10",
};

/* ─────────────────────────── helpers ─────────────────────────── */

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

// Parse the rich JSON message produced by the backend rule evaluator.
// Falls back to a plain-evidence shape when the message isn't JSON.
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
const formatDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};
const currentUserEmail = () =>
  localStorage.getItem("userEmail") ||
  localStorage.getItem("email") ||
  "tester@forgesphere.local";

// A rule is runnable once it's enabled AND the backend has approved it — pre-defined
// catalog rules (compliance/OWASP) come back as "ACTIVE", while custom rules submitted
// through the Add Custom Rule flow go through REQUESTED → "READY" (or REJECTED).
const isRuleReady = (rule) =>
  !!rule?.enabled && (rule.status === "READY" || rule.status === "ACTIVE");

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

const SeverityBadge = ({ severity }) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.OPTIONAL}`}>
    {severity || "n/a"}
  </span>
);
const ResultBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_STYLES[status] || STATUS_STYLES.SKIPPED}`}>
    {status === "PASSED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
    {status === "FAILED" && <XCircle className="mr-1 h-3 w-3" />}
    {status || "—"}
  </span>
);
const Pill = ({ children, className = "" }) => (
  <span className={`rounded-md border border-[#24304d] bg-[#0b0e16] px-2 py-0.5 text-[10px] text-slate-300 ${className}`}>{children}</span>
);

/* ─────────────────────────── Rule card ────────────────────────── */

const RuleCard = ({ rule, selected, onToggle, onShowDetail, family, isStandard }) => {
  const icon = family === "owasp" ? <ShieldAlert className="h-4 w-4 text-violet-300" /> : <ShieldCheck className="h-4 w-4 text-emerald-300" />;
  // Anything not enabled+approved is shown as "Pending approval" and locked so the
  // user can't select it. Standard linting rules always run, so they never carry a
  // checkbox — there's nothing for the user to toggle.
  const isReady = isRuleReady(rule);
  const cardContent = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-white truncate">{rule.ruleName}</h3>
      </div>
      <p className="mt-1 text-xs text-slate-400 line-clamp-3">{rule.ruleDescription}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={isStandard ? "MANDATORY" : rule.severity} />
        <Pill className="font-mono">{rule.ruleId}</Pill>
        {rule.owaspId ? <Pill className="border-violet-500/30 bg-violet-500/10 text-violet-300">{rule.owaspId}</Pill> : null}
        {rule.category ? <Pill>{rule.category}</Pill> : null}
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
      data-testid={`rule-card-${rule.ruleId}`}
    >
      {isReady ? (
        <span
          title="Ready"
          data-testid={`rule-status-${rule.ruleId}`}
          className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.7)] animate-pulse"
        />
      ) : (
        <span
          title="Pending approval"
          data-testid={`rule-status-${rule.ruleId}`}
          className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-amber-400"
        />
      )}
      {isStandard ? (
        <div className="flex flex-1 items-start gap-3">{cardContent}</div>
      ) : (
        <label className={`flex flex-1 items-start gap-3 ${isReady ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}>
          <input
            type="checkbox"
            checked={isReady && selected}
            disabled={!isReady}
            onChange={() => isReady && onToggle(rule.ruleId)}
            className="mt-1 h-4 w-4 rounded border-[#3a4870] bg-[#0b0e16] text-orange-500 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid={`rule-checkbox-${rule.ruleId}`}
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
              data-testid={`rule-details-btn-${rule.ruleId}`}
            >
              Details <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────── Rule detail drawer (with multiple test scenarios) */

const DrawerSection = ({ title, icon, children }) => (
  <section className="rounded-lg border border-[#24304d] bg-[#0c1224] p-4">
    <h4 className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">{icon}{title}</h4>
    {children}
  </section>
);

const RuleDetailDrawer = ({ open, onClose, family, ruleSummary }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!open || !ruleSummary) { setDetail(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    const svc = family === "owasp" ? owaspService.getOwaspRuleDetail : complianceService.getComplianceRuleDetail;
    svc(ruleSummary.ruleId).then((res) => {
      if (cancelled) return;
      if (res.success) setDetail(res.data); else setError(res.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, family, ruleSummary]);

  if (!open) return null;
  const scenarios = detail?.implementation?.testScenarios || [];
  return (
    <div className="fixed inset-0 z-40 flex" data-testid="rule-detail-drawer">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-2xl overflow-y-auto bg-[#0b0e16] border-l border-[#24304d] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#24304d] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">{ruleSummary?.ruleName}</h3>
            <p className="mt-1 font-mono text-xs text-slate-400">{ruleSummary?.ruleId}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" data-testid="drawer-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading rule details…</div>}
          {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
          {detail && (
            <>
              <p className="text-sm text-slate-200">{detail.ruleDescription}</p>
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={detail.severity} />
                <Pill>{detail.assetType}</Pill>
                <Pill>{detail.category}</Pill>
                <Pill>{detail.status}</Pill>
                {detail.owaspId && <Pill className="border-violet-500/30 bg-violet-500/10 text-violet-300">{detail.owaspId}</Pill>}
              </div>
              <DrawerSection title="Description" icon={<FileText className="h-3.5 w-3.5" />}>
                <p className="text-xs text-slate-300">{detail.implementation?.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <div><span className="text-slate-500">Scanner</span><br /><code className="text-amber-200 break-all">{detail.implementation?.scannerClass}</code></div>
                  <div><span className="text-slate-500">Implementation key</span><br /><code className="text-amber-200">{detail.implementation?.implementationKey}</code></div>
                  <div><span className="text-slate-500">Language</span><br /><code className="text-amber-200">{detail.implementation?.language}</code></div>
                  <div><span className="text-slate-500">Created</span><br />{formatDate(detail.createDate)}</div>
                </div>
              </DrawerSection>
              <DrawerSection title="Scanner snippet" icon={<Code className="h-3.5 w-3.5" />}>
                <pre className="overflow-auto rounded bg-[#080c14] p-3 text-[11px] text-emerald-300 whitespace-pre">{detail.implementation?.javaSnippet}</pre>
              </DrawerSection>
              <DrawerSection title="MongoDB schema" icon={<Code className="h-3.5 w-3.5" />}>
                <pre className="overflow-auto rounded bg-[#080c14] p-3 text-[11px] text-sky-300 whitespace-pre">{detail.implementation?.mongoSchema}</pre>
              </DrawerSection>
              <DrawerSection title={`Test scenarios (${scenarios.length})`} icon={<TerminalSquare className="h-3.5 w-3.5" />}>
                <div className="space-y-3">
                  {scenarios.length === 0 ? (
                    <p className="text-xs text-slate-500">No test scenarios returned by the backend for this rule.</p>
                  ) : scenarios.map((s, i) => (
                    <div key={i} className="rounded border border-[#24304d] bg-[#080c14] p-3" data-testid={`rule-scenario-${i}`}>
                      <p className="text-[12px] font-semibold text-purple-300">{i + 1}. {s.name}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{s.description}</p>
                      <pre className="mt-2 overflow-auto text-[11px] text-purple-200 whitespace-pre">{s.code}</pre>
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

/* ─────────────────────────── Add rule modal (rich) ─────────────── */

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

const AddRuleModal = ({ open, family, ruleType, onClose, onCreated }) => {
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [severity, setSeverity] = useState("warn");
  // Used only to weight this rule in the Governance Dashboard score if the rule is
  // later classified as Mandatory (HIGH=5pts, MEDIUM=4pts, LOW=3pts). Independent
  // of `severity` above.
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
    const payload = {
      ruleType: ruleType || "COMPLIANCE",
      assetType: APIGEE,
      ruleName,
      ruleDescription,
      scope: DEFAULT_RULE_SCOPE,
      severity: severity.toUpperCase(),
      field,
      condition: buildConditionValue(),
      createdBy: currentUserEmail(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="add-rule-modal">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-lg border border-[#24304d] bg-[#0b0e16]">
        <div className="flex items-center justify-between border-b border-[#24304d] px-5 py-3 shrink-0">
          <h3 className="text-base font-semibold text-white">Add Custom Rule</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5 text-sm">
          {err && <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">{err}</div>}
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Rule name</span>
            <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-name" />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Description</span>
            <textarea rows={3} value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-desc" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Severity</span>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-severity">
                <option value="hint">Hint</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
                <option value="info">Info</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Field</span>
              <input value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. spring.datasource.url" className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-field" />
            </label>
            <label className="col-span-2 block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Mandatory Priority (Dashboard score)</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-priority">
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <span className="mt-1 block text-[11px] text-slate-500">Only applied if this rule is classified as Mandatory once approved.</span>
            </label>
            <label className="col-span-2 block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Condition</span>
              <select value={conditionType} onChange={(e) => setConditionType(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-condition-type">
                {CONDITION_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            {conditionType === "PATTERN" && (
              <label className="col-span-2 block">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Regex</span>
                <input value={conditionRegex} onChange={(e) => setConditionRegex(e.target.value)} placeholder="e.g. ^[A-Z][a-zA-Z0-9]*$" className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 font-mono text-white" data-testid="new-rule-condition-regex" />
              </label>
            )}
            {conditionType === "ENUM" && (
              <label className="col-span-2 block">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Enum list (comma-separated)</span>
                <input value={conditionEnum} onChange={(e) => setConditionEnum(e.target.value)} placeholder="e.g. active, inactive, pending" className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-condition-enum" />
              </label>
            )}
            {conditionType === "LENGTH" && (
              <>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Min length</span>
                  <input type="number" value={conditionMin} onChange={(e) => setConditionMin(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-condition-min" />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Max length</span>
                  <input type="number" value={conditionMax} onChange={(e) => setConditionMax(e.target.value)} className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-condition-max" />
                </label>
              </>
            )}
            {conditionType === "SCHEMA" && (
              <label className="col-span-2 block">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Schema</span>
                <textarea rows={3} value={conditionSchema} onChange={(e) => setConditionSchema(e.target.value)} placeholder='e.g. { "type": "string" }' className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 font-mono text-xs text-white" data-testid="new-rule-condition-schema" />
              </label>
            )}
            {family === "owasp" && (
              <label className="col-span-2 block">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">OWASP ID</span>
                <input value={owaspId} onChange={(e) => setOwaspId(e.target.value)} placeholder="A01" className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-owasp-id" />
              </label>
            )}
            <label className="col-span-2 block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Approver email</span>
              <input type="email" value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} placeholder="approver@company.com" className="w-full rounded-md border border-[#24304d] bg-[#0c1224] px-3 py-2 text-white" data-testid="new-rule-approver-email" />
              {approverEmail && !approverEmailValid && (
                <span className="mt-1 block text-[11px] text-rose-300">Enter a valid email address.</span>
              )}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#24304d] px-5 py-3 shrink-0">
          <button onClick={onClose} className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-sm text-slate-300 hover:text-white">Cancel</button>
          <button onClick={submit} disabled={saving || !ruleName || !approverEmailValid || !conditionValid} className="inline-flex items-center gap-2 rounded-md bg-orange-500/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50" data-testid="submit-new-rule">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── Apigee org + proxy picker hook ───── */

const useApigeeOrgsAndProxies = () => {
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState(null);

  const [proxies, setProxies] = useState([]);
  const [selectedProxy, setSelectedProxy] = useState("");
  const [loadingProxies, setLoadingProxies] = useState(false);
  const [proxiesError, setProxiesError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOrgs(true);
      const res = await apigeeProxyService.listOrganizations();
      if (cancelled) return;
      if (res.success) {
        setOrgs(res.data);
        if (res.data.length > 0) setSelectedOrg(res.data[0]);
      } else {
        setOrgsError(res.error);
      }
      setLoadingOrgs(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedOrg) { setProxies([]); setSelectedProxy(""); return; }
    let cancelled = false;
    (async () => {
      setLoadingProxies(true);
      setProxiesError(null);
      setProxies([]);
      setSelectedProxy("");
      const res = await apigeeProxyService.listProxies(selectedOrg);
      if (cancelled) return;
      if (res.success) {
        setProxies(res.data);
        if (res.data.length > 0) setSelectedProxy(res.data[0]);
      } else {
        setProxiesError(res.error);
      }
      setLoadingProxies(false);
    })();
    return () => { cancelled = true; };
  }, [selectedOrg]);

  return { orgs, selectedOrg, setSelectedOrg, loadingOrgs, orgsError,
           proxies, selectedProxy, setSelectedProxy, loadingProxies, proxiesError };
};

/* ─────────────────────────── Family tab body ──────────────────── */

const FamilyBody = ({ family, selectedProxy, selectedOrg, onShowDetail, externalRunRequest, externalSelectAllRequest, externalClearRequest, onRunState, onSelectedCountChange, onScanSubmitted }) => {
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    setError(null);
    const svc = family === "owasp" ? owaspService.getOwaspRules : complianceService.getComplianceRules;
    const res = await svc({ assetType: APIGEE });
    setLoadingRules(false);
    if (res.success) {
      const list = res.data?.rules || [];
      setRules(list);
      // Only pre-select rules that are actually runnable — enabled AND approved.
      setSelected(new Set(list.filter(isRuleReady).map((r) => r.ruleId)));
    } else setError(res.error);
  }, [family]);

  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => { onSelectedCountChange?.(selected.size); }, [selected, onSelectedCountChange]);
  useEffect(() => { onRunState?.(running); }, [running, onRunState]);

  const toggleRule = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = useCallback(() => setSelected(new Set(rules.filter(isRuleReady).map((r) => r.ruleId))), [rules]);
  const clearAll = useCallback(() => setSelected(new Set()), []);

  // externalSelectAllRequest/externalClearRequest/externalRunRequest live in the parent
  // and never reset, so they arrive already non-zero whenever this body remounts (e.g.
  // navigating back from the results/history page) — only an actual *change* from the
  // value seen at mount should re-trigger the action, otherwise it fires immediately on
  // mount against not-yet-loaded state (empty `rules`/`selected`).
  const prevSelectAllRef = useRef(externalSelectAllRequest);
  useEffect(() => {
    if (externalSelectAllRequest === prevSelectAllRef.current) return;
    prevSelectAllRef.current = externalSelectAllRequest;
    selectAll();
  }, [externalSelectAllRequest, selectAll]);

  const prevClearRef = useRef(externalClearRequest);
  useEffect(() => {
    if (externalClearRequest === prevClearRef.current) return;
    prevClearRef.current = externalClearRequest;
    clearAll();
  }, [externalClearRequest, clearAll]);

  const runScan = useCallback(async () => {
    if (!selectedProxy) { setError("Pick an API from the dropdown before running."); return; }
    if (selected.size === 0) { setError("Select at least one rule."); return; }
    setRunning(true); setError(null);
    const payload = {
      assetType: APIGEE,
      projectName: selectedProxy,
      resourceIds: [selectedProxy],
      rules: { ruleTypes: ["PRE_DEFINED"], ruleIds: Array.from(selected) },
      requestedBy: currentUserEmail(),
      scanOptions: {
        ...(selectedOrg ? { organization: selectedOrg } : {}),
        includeInactiveRules: false,
        scanMode: "FULL",
        saveResult: true,
      },
    };
    const svc = family === "owasp" ? owaspService.runOwaspCheck : complianceService.runComplianceCheck;
    const res = await svc(payload);
    setRunning(false);
    if (!res.success) { setError(res.error); return; }
    const scanId = res.data?.scans?.[0]?.scanId;
    if (!scanId) { setError("Backend did not return a scanId."); return; }
    // Switch to the dedicated results page (handled by parent workspace).
    onScanSubmitted?.(scanId, family);
  }, [family, selectedOrg, selectedProxy, selected, onScanSubmitted]);

  const runScanRef = useRef(runScan);
  useEffect(() => {
    runScanRef.current = runScan;
  }, [runScan]);

  const prevRunRequestRef = useRef(externalRunRequest);
  useEffect(() => {
    if (externalRunRequest === prevRunRequestRef.current) return;
    prevRunRequestRef.current = externalRunRequest;
    if (externalRunRequest > 0) runScanRef.current();
  }, [externalRunRequest]);

  return (
    <div className="flex flex-col h-full" data-testid={`family-${family}`}>
      <div className="flex-1 overflow-auto">
        {error && <div className="m-6 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
        <div className="grid gap-3 px-6 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {loadingRules && rules.length === 0 ? (
            <div className="col-span-full flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading rules…</div>
          ) : rules.length === 0 ? (
            <div className="col-span-full rounded-md border border-dashed border-[#24304d] bg-[#0c1224] p-6 text-center text-sm text-slate-400">No rules defined for APIGEE yet. Use "+ Add rule" to create one.</div>
          ) : (
            rules.map((r) => (
              <RuleCard key={r.ruleId} rule={r} family={family} selected={selected.has(r.ruleId)} onToggle={toggleRule} onShowDetail={onShowDetail} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── Apigee Linting tab body (bundle lint) ── */

// Flattens apigeelint's own per-file report (one entry per XML file, each with
// a `messages` array) into a single list of rows for the table below. This is
// the exact shape the real apigeelint engine returns (same as `-f json.js`) —
// see /apigee-wrapper/organizations/{org}/apis/{api}/lint on the backend.
const flattenApigeelintReport = (report) =>
  (report || []).flatMap((fileResult) =>
    (fileResult.messages || []).map((m) => ({
      severity: m.severity, // 1 = warning, 2 = error (ESLint convention, reused by apigeelint)
      code: m.ruleId || "—",
      message: m.message,
      path: fileResult.filePath,
      line: m.line,
    }))
  );

const ApigeeBundleLintBody = ({ selectedOrg, selectedProxy, showMessage, runToken, onRunningChange }) => {
  const [phase, setPhase] = useState("idle"); // idle | running | done | error
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null); // { fileCount, errorCount, warningCount, revision }
  const [error, setError] = useState("");

  const showMessageRef = useRef(showMessage);
  showMessageRef.current = showMessage;

  useEffect(() => {
    setPhase("idle");
    setResults(null);
    setSummary(null);
    setError("");
  }, [selectedOrg, selectedProxy]);

  // Guards against a mount-time auto-run: if this body unmounts (tab switch) and
  // remounts, `runToken` arrives already non-zero from a prior click — only an
  // actual *change* from the value seen at mount should trigger a fresh scan.
  const prevRunTokenRef = useRef(runToken);
  useEffect(() => {
    if (runToken === prevRunTokenRef.current) return;
    prevRunTokenRef.current = runToken;
    if (!runToken || !selectedOrg || !selectedProxy) return;
    let cancelled = false;
    const run = async () => {
      setPhase("running");
      onRunningChange?.(true);
      setError("");
      setResults(null);
      setSummary(null);
      const res = await apigeeProxyService.lintProxyBundle(selectedOrg, selectedProxy);
      if (cancelled) return;
      if (res.success) {
        const { report, fileCount, errorCount, warningCount, revision } = res.data;
        setResults(flattenApigeelintReport(report));
        setSummary({ fileCount, errorCount, warningCount, revision });
        setPhase("done");
      } else {
        setError(res.error || "Failed to lint proxy bundle");
        showMessageRef.current?.(res.error || "Failed to lint proxy bundle", "error");
        setPhase("error");
      }
      onRunningChange?.(false);
    };
    run();
    return () => { cancelled = true; };
  }, [runToken, selectedOrg, selectedProxy, onRunningChange]);

  if (!selectedOrg || !selectedProxy) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6" data-testid="linting-body">
        <Code className="h-8 w-8 text-orange-400/40 mb-3" />
        <p className="text-sm text-slate-400">Select an organisation and API above to lint its Apigee proxy bundle.</p>
      </div>
    );
  }
  if (phase === "running") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16" data-testid="linting-body">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400 mb-3" />
        <p className="text-sm text-slate-400">Downloading &amp; linting the proxy bundle with apigeelint…</p>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6" data-testid="linting-body">
        <AlertCircle className="h-8 w-8 text-yellow-400 mb-3" />
        <p className="text-sm text-slate-300 max-w-md">{error}</p>
      </div>
    );
  }
  if (phase !== "done") {
    return null;
  }

  const score = summary.errorCount === 0 && summary.warningCount === 0
    ? 100
    : Math.max(0, 100 - summary.errorCount * 8 - summary.warningCount * 4);

  return (
    <div data-testid="linting-body">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#24304d] bg-[#0f172a]/60">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-gray-300">Linting Score:</span>
              <span className={`text-xl font-bold ${scoreTierColors(score).text}`}>{score}</span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {summary.fileCount} XML files scanned{summary.revision ? ` · revision ${summary.revision}` : ""}
            </span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-[#24304d] overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${scoreTierColors(score).bar} rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        {results.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm text-green-400">No issues found — bundle passes all Apigee lint checks!</span>
          </div>
        ) : (
          <div className="rounded-lg border border-[#24304d] overflow-hidden" data-testid="lint-issues-table">
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

/* ─────────────────────────── Linting rule catalog (Standard/Custom) */

// Standard Rules shown on the Apigee Linting tab — generated directly from the
// installed `apigeelint` package's plugin metadata (ruleId/name/description/
// severity read off each plugin file), not hand-transcribed from the README.
// Regenerate with: node scripts/generate-apigeelint-rules.mjs
const standardRules = apigeelintRulesData.rules;

const PAGE_SIZE = 6;

// Standard/Custom pill toggle + paginated rule grid for the Apigee Linting tab.
// Selection here is informational only — it doesn't gate whether linting runs;
// "Run scan" is gated solely by having an org + API selected.
const LintingRuleCatalog = ({
  ruleTab,
  standardVisible, standardHasMore, onLoadMoreStandard,
  loadingLintingRules, lintingRulesError, lintingRules, customPaginated, customHasMore, onLoadMoreCustom,
  selectedLintingRules, onToggle, onShowDetail,
}) => (
  <div className="space-y-4" data-testid="linting-rule-catalog">
    {ruleTab === "standard" ? (
      <div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {standardVisible.map((rule) => (
            <RuleCard key={rule.ruleId} rule={rule} family="linting" isStandard selected={selectedLintingRules.has(rule.ruleId)} onToggle={onToggle} onShowDetail={onShowDetail} />
          ))}
        </div>
        {standardHasMore && (
          <div className="mt-4 text-center">
            <button onClick={onLoadMoreStandard} className="inline-flex items-center gap-2 rounded-md border border-[#24304d] bg-[#0b0e16] px-4 py-2 text-xs text-white hover:border-orange-500/60" data-testid="linting-standard-load-more">
              Load More <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    ) : (
      <div>
        {loadingLintingRules && lintingRules.length === 0 && (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-orange-400" /> Loading custom rules…</div>
        )}
        {!loadingLintingRules && lintingRulesError && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{lintingRulesError}</div>
        )}
        {!loadingLintingRules && lintingRules.length === 0 && !lintingRulesError && (
          <div className="rounded-md border border-dashed border-[#24304d] bg-[#0c1224] p-6 text-center text-sm text-slate-400">No custom linting rules found for APIGEE.</div>
        )}
        {lintingRules.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {customPaginated.map((rule) => (
                <RuleCard key={rule.ruleId} rule={rule} family="linting" selected={selectedLintingRules.has(rule.ruleId)} onToggle={onToggle} onShowDetail={onShowDetail} />
              ))}
            </div>
            {customHasMore && (
              <div className="mt-4 text-center">
                <button onClick={onLoadMoreCustom} className="inline-flex items-center gap-2 rounded-md border border-[#24304d] bg-[#0b0e16] px-4 py-2 text-xs text-white hover:border-orange-500/60" data-testid="linting-custom-load-more">
                  Load More <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )}
  </div>
);

/* ─────────────────────────── Governance dashboard (Apigee-only) ── */

const loadApigeeDashboardResources = async (preferredOrg) => {
  const orgsRes = await apigeeProxyService.listOrganizations();
  let orgs = orgsRes.success ? orgsRes.data : [];
  // Keep the workspace's currently-selected org in the fan-out even if it wouldn't
  // otherwise make the top-5 cut.
  if (preferredOrg && orgs.includes(preferredOrg)) {
    orgs = [preferredOrg, ...orgs.filter((o) => o !== preferredOrg)];
  }
  orgs = orgs.slice(0, 5);
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
};

// Latest compliance/OWASP scan for one resource, reduced to a weighted score.
// status: "ok" (scored) | "none" (never scanned) | "error" (fetch failed).
const fetchLatestScore = async (family, projectName, ruleMeta) => {
  const historyFn = family === "owasp" ? owaspService.getOwaspScanHistory : complianceService.getComplianceScanHistory;
  const detailFn = family === "owasp" ? owaspService.getOwaspScan : complianceService.getComplianceScan;
  const histRes = await historyFn({ projectName, assetType: APIGEE, page: 0, size: 1 });
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

const DashScoreBlock = ({ label, icon, entry, onOpen }) => {
  if (!entry || entry.status === "none") {
    return (
      <div className="flex-1 rounded-lg border border-dashed border-[#2a3556] bg-[#0b0e16]/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{icon} {label}</p>
        <p className="mt-1.5 text-xs text-slate-500">No scan</p>
      </div>
    );
  }
  if (entry.status === "error") {
    return (
      <div className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-rose-300">{icon} {label}</p>
        <p className="mt-1.5 text-xs text-rose-300/80">Failed to load</p>
      </div>
    );
  }
  const pct = entry.score?.percentage;
  if (pct == null) {
    return (
      <div className="flex-1 rounded-lg border border-[#24304d] bg-[#0b0e16]/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{icon} {label}</p>
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
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{icon} {label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("text-lg font-bold", tier.text)}>{pct}%</span>
        <span className="text-[10px] text-slate-500">{entry.score.earned}/{entry.score.possible} pts</span>
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
        <p className="truncate text-sm font-semibold text-white" title={resource.name}>{resource.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{resource.raw?.orgName || " "}</p>
      </div>
      <div className="flex gap-2.5">
        <DashScoreBlock label="Compliance" icon={<ShieldCheck className="h-3 w-3" />} entry={compliance} onOpen={() => compliance?.scanId && onOpenScan(compliance.scanId, "compliance")} />
        <DashScoreBlock label="OWASP" icon={<ShieldAlert className="h-3 w-3" />} entry={owasp} onOpen={() => owasp?.scanId && onOpenScan(owasp.scanId, "owasp")} />
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

const GovernanceDashboardPage = ({ defaultOrg, onBack, onOpenScan }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resources, complianceRulesRes, owaspRulesRes] = await Promise.all([
        loadApigeeDashboardResources(defaultOrg),
        complianceService.getComplianceRules({ assetType: APIGEE }),
        owaspService.getOwaspRules({ assetType: APIGEE }),
      ]);
      const complianceMeta = buildRuleMetaMap(complianceRulesRes.success ? (complianceRulesRes.data?.rules || complianceRulesRes.data) : []);
      const owaspMeta = buildRuleMetaMap(owaspRulesRes.success ? (owaspRulesRes.data?.rules || owaspRulesRes.data) : []);
      const computedRows = await Promise.all(
        resources.map(async (resource) => {
          const [compliance, owasp] = await Promise.all([
            fetchLatestScore("compliance", resource.name, complianceMeta),
            fetchLatestScore("owasp", resource.name, owaspMeta),
          ]);
          return { resource, compliance, owasp };
        })
      );
      setRows(computedRows);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white" data-testid="governance-dashboard-back-btn">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to rules
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Governance Dashboard</h1>
              <p className="mt-0.5 text-xs text-slate-400">Weighted compliance &amp; OWASP scores across your Apigee proxies</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white transition-colors hover:border-orange-500/60 disabled:opacity-50"
            data-testid="governance-dashboard-refresh-btn"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
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

        {error && <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading resources &amp; scan history…</div>
        ) : rows.length === 0 && !error ? (
          <div className="py-16 text-center text-sm text-slate-400">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 opacity-50" />
            No Apigee proxies found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <ResourceScoreCard key={row.resource.id} row={row} onOpenScan={(scanId, fam) => onOpenScan(scanId, fam)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────── Top header + workspace shell ─────── */

const FAMILY_HEADINGS = {
  compliance: { title: "Compliance Rules", subtitle: "Governance + quality rules for your Apigee proxies. Pick rules, hit Run, download or email the report." },
  owasp: { title: "OWASP 2021 Top 10", subtitle: "OWASP API Security Top 10 controls evaluated against the selected Apigee proxy." },
  linting: { title: "Apigee Linting", subtitle: "Static analysis of Apigee proxy bundles (apigeelint) — policies, endpoints, targets & flows." },
};

const GovernanceWorkspace = ({ showMessage }) => {
  const [activeTab, setActiveTab] = useState("compliance");
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [drawerRule, setDrawerRule] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState({ kind: "workspace" });

  // Org + Proxy pickers (real Apigee data via apigeeProxyService)
  const {
    orgs, selectedOrg, setSelectedOrg, loadingOrgs, orgsError,
    proxies, selectedProxy, setSelectedProxy, loadingProxies, proxiesError,
  } = useApigeeOrgsAndProxies();

  // Family body bus (for triggering Run/SelectAll/Clear from the header)
  const [runReq, setRunReq] = useState(0);
  const [selectAllReq, setSelectAllReq] = useState(0);
  const [clearReq, setClearReq] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Apigee Linting tab — "Run scan" bumps this token, which triggers a bundle
  // download + lint of the selected proxy.
  const [lintRunToken, setLintRunToken] = useState(0);

  // Standard/Custom rule catalog shown on the linting tab.
  const [lintingRules, setLintingRules] = useState([]);
  const [selectedLintingRules, setSelectedLintingRules] = useState(() => new Set());
  const [standardInitialized, setStandardInitialized] = useState(false);
  const [loadingLintingRules, setLoadingLintingRules] = useState(false);
  const [lintingRulesError, setLintingRulesError] = useState("");
  const [standardVisibleCount, setStandardVisibleCount] = useState(6);
  const [customPage, setCustomPage] = useState(0);
  // Custom comes first so it lines up with the "Add Custom Rule" action next to it.
  const [lintingRuleTab, setLintingRuleTab] = useState("custom");

  const headings = FAMILY_HEADINGS[activeTab];
  const family = activeTab === "owasp" ? "owasp" : "compliance";
  const isLinting = activeTab === "linting";
  const isLintingTab = isLinting;

  const fetchLintingRules = useCallback(async () => {
    setLoadingLintingRules(true);
    setLintingRulesError("");
    try {
      const res = await complianceService.getLintingRules({ assetType: APIGEE, status: "all" });
      if (!res.success) throw new Error(res.error);
      const list = res.data?.rules || [];
      setLintingRules(list);
      setCustomPage(0);
      const readyIds = list.filter(isRuleReady).map((r) => r.ruleId);
      setSelectedLintingRules((prev) => new Set([...prev, ...readyIds]));
    } catch (err) {
      setLintingRulesError(err.message);
      setLintingRules([]);
    } finally {
      setLoadingLintingRules(false);
    }
  }, []);

  useEffect(() => {
    if (isLintingTab) fetchLintingRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLintingTab, refreshKey]);

  useEffect(() => {
    if (!standardInitialized && standardRules.length > 0) {
      setSelectedLintingRules((prev) => new Set([...prev, ...standardRules.map((r) => r.ruleId)]));
      setStandardInitialized(true);
    }
  }, [standardInitialized]);

  const toggleLintingRule = (id) => {
    setSelectedLintingRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const standardVisible = useMemo(() => standardRules.slice(0, standardVisibleCount), [standardVisibleCount]);
  const standardHasMore = standardVisibleCount < standardRules.length;
  const customPaginated = useMemo(
    () => lintingRules.slice(customPage * PAGE_SIZE, customPage * PAGE_SIZE + PAGE_SIZE),
    [lintingRules, customPage]
  );
  const customHasMore = customPage * PAGE_SIZE + PAGE_SIZE < lintingRules.length;

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

  // ── Subview rendering ─────────────────────────────────────────────
  // History page
  if (view.kind === "history") {
    return (
      <HistoryView
        defaultFamily={family}
        projectName={selectedProxy}
        onBack={() => setView({ kind: "workspace" })}
        onOpenScan={(scanId, fam) => setView({ kind: "results", scanId, family: fam, source: "history" })}
      />
    );
  }
  // Dashboard page
  if (view.kind === "dashboard") {
    return (
      <GovernanceDashboardPage
        defaultOrg={selectedOrg}
        onBack={() => setView({ kind: "workspace" })}
        onOpenScan={(scanId, fam) => setView({ kind: "results", scanId, family: fam, source: "dashboard" })}
      />
    );
  }
  // Results page
  if (view.kind === "results") {
    return (
      <ScanResultsView
        scanId={view.scanId}
        family={view.family}
        source={view.source}
        onBack={() => {
          if (view.source === "history") setView({ kind: "history" });
          else if (view.source === "dashboard") setView({ kind: "dashboard" });
          else setView({ kind: "workspace" });
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="governance-workspace">
      {/* ── Row 1: tabs left ─────── ORG + API pickers + Add rule right ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24304d] px-6 pt-4 pb-3">
        <div className="flex gap-2">
          {[
            { id: "compliance", label: "Compliance", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
            { id: "owasp", label: "OWASP", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
            { id: "linting", label: "Apigee Linting", icon: <Code className="h-3.5 w-3.5" /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === t.id ? "bg-orange-500/20 text-white border border-orange-500/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              data-testid={`tab-${t.id}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2" data-testid="api-picker">
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              disabled={loadingOrgs || orgs.length === 0}
              className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-2 text-xs text-white outline-none focus:border-orange-500/60 min-w-[200px] disabled:opacity-60"
              data-testid="org-select"
            >
              <option value="">{loadingOrgs ? "Loading orgs…" : "Choose org…"}</option>
              {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select
              value={selectedProxy}
              onChange={(e) => setSelectedProxy(e.target.value)}
              disabled={loadingProxies || proxies.length === 0 || !selectedOrg}
              className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-2 text-xs text-white outline-none focus:border-orange-500/60 min-w-[240px] disabled:opacity-60"
              data-testid="proxy-select"
            >
              <option value="">{
                !selectedOrg ? "Pick org first…"
                : loadingProxies ? "Loading APIs…"
                : proxies.length === 0 ? "No APIs in this org" : "Choose API…"
              }</option>
              {proxies.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {/* Standard/Custom rule-catalog toggle — sits next to Add rule, matching Governance.jsx's layout */}
          {isLinting && (
            <div className="relative inline-flex items-center rounded-lg border border-[#24304d] bg-[#0b0e16] p-1">
              <span
                className={`absolute inset-y-1 w-[110px] rounded-md bg-orange-500/20 border border-orange-500/40 transition-transform duration-300 ease-out ${lintingRuleTab === "custom" ? "translate-x-0" : "translate-x-[110px]"}`}
              />
              <button
                onClick={() => setLintingRuleTab("custom")}
                className={`relative z-10 w-[110px] rounded-md py-1.5 text-center text-xs font-semibold transition-colors ${lintingRuleTab === "custom" ? "text-orange-200" : "text-slate-400 hover:text-slate-200"}`}
                data-testid="linting-rule-tab-custom"
              >
                Custom Rule
              </button>
              <button
                onClick={() => setLintingRuleTab("standard")}
                className={`relative z-10 w-[110px] rounded-md py-1.5 text-center text-xs font-semibold transition-colors ${lintingRuleTab === "standard" ? "text-orange-200" : "text-slate-400 hover:text-slate-200"}`}
                data-testid="linting-rule-tab-standard"
              >
                Standard Rule
              </button>
            </div>
          )}
          {/* Add Custom Rule — available on every tab except OWASP Top 10 */}
          {activeTab !== "owasp" && (
            <button
              onClick={handleAddCustomRuleClick}
              className="inline-flex items-center gap-2 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-2 text-xs text-slate-200 hover:border-orange-500/60 hover:text-white"
              data-testid="add-rule-btn"
            >
              <Plus className="h-3.5 w-3.5" /> Add rule
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: heading left ─────── action buttons right ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24304d] px-6 py-3 bg-[#0c1224]/40">
        <div>
          <h2 className="text-lg font-semibold text-white">{headings.title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{headings.subtitle}</p>
          {(selectedOrg || selectedProxy) && (
            <p className="mt-1 text-xs text-orange-300">
              <span className="text-slate-500">Org:</span> <span className="font-mono text-white">{selectedOrg || "—"}</span>
              {" · "}
              <span className="text-slate-500">API:</span> <span className="font-mono text-white">{selectedProxy || "—"}</span>
            </p>
          )}
          {(orgsError || proxiesError) && (
            <p className="mt-1 text-xs text-rose-300">{orgsError || proxiesError}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLintingTab && (
            <>
              <button onClick={() => setSelectAllReq((n) => n + 1)} className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-slate-200 hover:border-orange-500/60" data-testid="select-all-btn">Select all</button>
              <button onClick={() => setClearReq((n) => n + 1)} className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-slate-200 hover:border-orange-500/60" data-testid="clear-btn">Clear</button>
            </>
          )}
          <button onClick={() => setView({ kind: "history" })} className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-slate-200 hover:border-orange-500/60" data-testid="history-btn">
            <HistoryIcon className="h-3.5 w-3.5" /> History
          </button>
          <button onClick={() => setView({ kind: "dashboard" })} className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-slate-200 hover:border-orange-500/60" data-testid="dashboard-btn">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <button
            onClick={() => {
              if (isLinting) setLintRunToken((n) => n + 1);
              else setRunReq((n) => n + 1);
            }}
            disabled={
              isLinting ? (isRunning || !selectedOrg || !selectedProxy)
              : (isRunning || selectedCount === 0 || !selectedProxy)
            }
            className="inline-flex items-center gap-2 rounded-md bg-orange-500/90 px-4 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            data-testid="run-scan-btn"
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isLintingTab ? "Run scan" : `Run scan (${selectedCount})`}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden">
        {isLinting ? (
          <div className="h-full overflow-y-auto p-6" data-testid="linting-tab-body">
            <div className="max-w-5xl mx-auto space-y-6">
              <ApigeeBundleLintBody selectedOrg={selectedOrg} selectedProxy={selectedProxy} showMessage={showMessage} runToken={lintRunToken} onRunningChange={setIsRunning} />
              <LintingRuleCatalog
                ruleTab={lintingRuleTab}
                standardVisible={standardVisible}
                standardHasMore={standardHasMore}
                onLoadMoreStandard={() => setStandardVisibleCount((n) => Math.min(n + 3, standardRules.length))}
                loadingLintingRules={loadingLintingRules}
                lintingRulesError={lintingRulesError}
                lintingRules={lintingRules}
                customPaginated={customPaginated}
                customHasMore={customHasMore}
                onLoadMoreCustom={() => setCustomPage((p) => p + 1)}
                selectedLintingRules={selectedLintingRules}
                onToggle={toggleLintingRule}
                onShowDetail={setDrawerRule}
              />
            </div>
          </div>
        ) : (
          <FamilyBody
            key={`${family}-${refreshKey}`}
            family={family}
            selectedProxy={selectedProxy}
            selectedOrg={selectedOrg}
            onShowDetail={setDrawerRule}
            externalRunRequest={runReq}
            externalSelectAllRequest={selectAllReq}
            externalClearRequest={clearReq}
            onRunState={setIsRunning}
            onSelectedCountChange={setSelectedCount}
            onScanSubmitted={(scanId, fam) => setView({ kind: "results", scanId, family: fam, source: "rules" })}
          />
        )}
      </div>

      {/* ── Drawers + modals ── */}
      <RuleDetailDrawer open={!!drawerRule} ruleSummary={drawerRule} family={family} onClose={() => setDrawerRule(null)} />
      <AddRuleModal
        open={addRuleOpen}
        family={family}
        ruleType={isLintingTab ? "LINTING" : "COMPLIANCE"}
        onClose={() => setAddRuleOpen(false)}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          if (isLintingTab) fetchLintingRules();
          showMessage?.("Rule created.", "success");
        }}
      />
    </div>
  );
};

export default GovernanceWorkspace;
