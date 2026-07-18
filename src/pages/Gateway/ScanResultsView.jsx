/**
 * ScanResultsView — full-page detail view for a single completed scan.
 *
 * Renders:
 *   - back button to the workspace
 *   - scan header (project, scanId, status, counts)
 *   - OWASP coverage strip (A01..A10 with pass/total)
 *   - expandable rule cards with "what it tests", "how it works",
 *     "evidence", "endpoints tested", "recommended fix", duration
 *   - Download HTML + Email actions
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { complianceService } from "../../services/complianceService";
import { owaspService } from "../../services/owaspService";
import { cn } from "../../lib/utils";

/* ─────────────────────────── helpers ──────────────────────────── */

const STAT_TILE_TONES = {
  slate: "text-slate-200 border-[#24304d] bg-[#0b0e16]/60",
  emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  rose: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  orange: "text-orange-300 border-orange-500/30 bg-orange-500/10",
};

const StatTile = ({ label, value, tone = "slate" }) => (
  <div className={cn("rounded-lg border px-3 py-2.5", STAT_TILE_TONES[tone] || STAT_TILE_TONES.slate)} data-testid={`stat-tile-${label.toLowerCase()}`}>
    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-0.5 text-lg font-bold leading-tight">{value}</p>
  </div>
);

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

const SEVERITY_COLOR = {
  HIGH: "text-rose-300 border-rose-500/40 bg-rose-500/15",
  MEDIUM: "text-amber-300 border-amber-500/40 bg-amber-500/15",
  LOW: "text-sky-300 border-sky-500/40 bg-sky-500/15",
  INFO: "text-slate-300 border-slate-500/40 bg-slate-500/15",
  MANDATORY: "text-rose-300 border-rose-500/40 bg-rose-500/15",
  RECOMMENDED: "text-amber-300 border-amber-500/40 bg-amber-500/15",
  OPTIONAL: "text-slate-300 border-slate-500/40 bg-slate-500/15",
};

const STATUS_COLOR = {
  PASSED: "text-emerald-300 border-emerald-500/40 bg-emerald-500/15",
  FAILED: "text-rose-300 border-rose-500/40 bg-rose-500/15",
  SKIPPED: "text-slate-300 border-slate-500/40 bg-slate-500/15",
};

/** Parse the rich probe envelope from `message`. Falls back to plain string. */
const parseProbe = (msg) => {
  if (!msg || typeof msg !== "string") return null;
  const trimmed = msg.trim();
  if (trimmed.startsWith("{")) {
    try { return JSON.parse(trimmed); } catch { return null; }
  }
  // Some upstream archive failures prefix the JSON with a hint — try to peel it off.
  const pipe = trimmed.indexOf(" | {");
  if (pipe > 0) {
    try {
      const parsed = JSON.parse(trimmed.slice(pipe + 3));
      if (parsed && typeof parsed === "object") {
        return { ...parsed, evidencePrefix: trimmed.slice(0, pipe).trim() };
      }
    } catch { /* fall through to plain-text rendering */ }
  }
  return null;
};

const SeverityBadge = ({ severity }) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${SEVERITY_COLOR[severity] || SEVERITY_COLOR.INFO}`}>
    {severity || "—"}
  </span>
);
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_COLOR[status] || STATUS_COLOR.SKIPPED}`}>
    {status === "PASSED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
    {status === "FAILED" && <XCircle className="mr-1 h-3 w-3" />}
    {status || "—"}
  </span>
);

/* ─────────────────────────── OWASP coverage strip ─────────────── */

const OwaspCoverageStrip = ({ results }) => {
  // Group by owasp id (extracted from ruleId like OR_APIGEE_A01)
  const coverage = useMemo(() => {
    const map = {};
    for (const r of results) {
      const m = (r.ruleId || "").match(/_A(\d{1,2})$/i);
      if (!m) continue;
      const key = `API${parseInt(m[1], 10)}:2023`;
      const slot = map[key] || (map[key] = { pass: 0, total: 0 });
      slot.total += 1;
      if (r.result === "PASSED") slot.pass += 1;
    }
    return Object.entries(map).sort((a, b) => {
      const na = parseInt(a[0].match(/(\d+)/)[1], 10);
      const nb = parseInt(b[0].match(/(\d+)/)[1], 10);
      return na - nb;
    });
  }, [results]);
  if (coverage.length === 0) return null;
  return (
    <div className="rounded-lg border border-[#24304d] bg-[#0c1224] p-4 mb-4" data-testid="owasp-coverage-strip">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">OWASP coverage</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {coverage.map(([key, c]) => {
          const allPass = c.pass === c.total && c.total > 0;
          return (
            <div key={key}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${allPass ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-rose-500/40 bg-rose-500/10 text-rose-300"}`}
              data-testid={`coverage-${key}`}>
              <span className="font-mono">{key}</span>
              <span className="font-semibold">{c.pass}/{c.total} pass</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────── Rule result card (expandable) ───── */

const RuleResultCard = ({ result }) => {
  const [open, setOpen] = useState(false);
  const probe = parseProbe(result.message);

  return (
    <div className="rounded-lg border border-[#24304d] bg-[#0c1224]" data-testid={`result-card-${result.ruleId}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02]"
        data-testid={`result-toggle-${result.ruleId}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">
                {(probe && probe.name) || result.ruleName}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{result.ruleId}</p>
              {probe?.evidence && (
                <p className="mt-2 text-xs text-slate-300 italic line-clamp-2">{probe.evidence}</p>
              )}
              {!probe && result.message && (
                <p className="mt-2 text-xs text-slate-400 line-clamp-2">{result.message}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SeverityBadge severity={(probe && probe.severity) || result.severity} />
          <StatusBadge status={result.result} />
          {probe?.durationMs != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <Clock className="h-3 w-3" /> {probe.durationMs}ms
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-[#24304d] px-5 py-4 space-y-4 text-xs" data-testid={`result-detail-${result.ruleId}`}>
          {probe?.whatItTests && (
            <Section label="What it tests">{probe.whatItTests}</Section>
          )}
          {probe?.howItWorks && (
            <Section label="How it works">{probe.howItWorks}</Section>
          )}
          {Array.isArray(probe?.endpoints) && probe.endpoints.length > 0 && (
            <Section label={`Endpoints tested (${probe.endpoints.length})`}>
              <ul className="space-y-1">
                {probe.endpoints.map((e, i) => (
                  <li key={i} className="font-mono text-amber-200 break-all flex items-center gap-2">
                    <ExternalLink className="h-3 w-3 shrink-0" /> {e}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {probe?.evidence && (
            <Section label="Evidence">
              <pre className="whitespace-pre-wrap rounded bg-[#080c14] p-3 text-[11px] text-slate-200">{probe.evidence}</pre>
            </Section>
          )}
          {(probe?.recommendation || probe?.recommended) && result.result === "FAILED" && (
            <Section label="Recommended fix" tint="emerald">
              {probe.recommendation || probe.recommended}
            </Section>
          )}
          {probe?.evidencePrefix && (
            <p className="text-slate-500">{probe.evidencePrefix}</p>
          )}
          {!probe && result.message && (
            <Section label="Scanner output">
              <pre className="whitespace-pre-wrap rounded bg-[#080c14] p-3 text-[11px] text-slate-200">{result.message}</pre>
            </Section>
          )}
          {!probe && !result.message && (
            <p className="text-slate-500">No additional details captured by the scanner for this rule.</p>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ label, children, tint }) => (
  <div>
    <h4 className={`text-[10px] uppercase tracking-wide mb-1 ${tint === "emerald" ? "text-emerald-400" : "text-slate-400"}`}>{label}</h4>
    <div className="text-xs text-slate-200">{children}</div>
  </div>
);

/* ─────────────────────────── Scan header + main view ─────────── */

const ScanResultsView = ({ scanId, family, source = "rules", onBack }) => {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(
    localStorage.getItem("userEmail") || localStorage.getItem("email") || "tester@forgesphere.local"
  );
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBody, setPreviewBody] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Initial load + poll until terminal status
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const fetchSvc = family === "owasp" ? owaspService.getOwaspScan : complianceService.getComplianceScan;
    const poll = async () => {
      attempts += 1;
      const res = await fetchSvc(scanId);
      if (cancelled) return;
      if (!res.success) {
        setError(res.error); setLoading(false); return;
      }
      setScan(res.data); setLoading(false); setError(null);
      const status = (res.data?.status || "").toLowerCase();
      const done = ["completed", "complete", "success", "error", "failed", "finished"].includes(status);
      if (!done && attempts < 30) setTimeout(poll, 1500);
    };
    poll();
    return () => { cancelled = true; };
  }, [scanId, family]);

  const results = scan?.scanResults || [];
  const passed = results.filter((r) => r.result === "PASSED").length;
  const failed = results.filter((r) => r.result === "FAILED").length;
  const skipped = results.filter((r) => r.result === "SKIPPED").length;
  const running = !scan || !["completed", "complete", "success", "error", "failed", "finished"].includes((scan?.status || "").toLowerCase());

  const onDownload = async () => {
    const svc = family === "owasp" ? owaspService.downloadOwaspReport : complianceService.downloadComplianceReport;
    const res = await svc(scanId, "html");
    if (res.success) downloadBlob(res.data, `${family}-report-${scanId}.html`);
    else alert(res.error || "Download failed");
  };

  const onDownloadPdf = async () => {
    setDownloadingPdf(true);
    const svc = family === "owasp" ? owaspService.downloadOwaspReport : complianceService.downloadComplianceReport;
    const res = await svc(scanId, "pdf");
    setDownloadingPdf(false);
    if (res.success) downloadBlob(res.data, `${family}-report-${scanId}.pdf`);
    else alert(res.error || "Download failed");
  };

  const onEmail = async () => {
    setEmailSending(true); setEmailMsg(null);
    const reportType = family === "owasp" ? "OWASP" : "COMPLIANCE";
    const payload = {
      to: emailTo,
      subject: `${reportType} scan report — ${scanId}`,
      reportType,
      scanId,
      projectName: scan?.projectName,
      assetType: scan?.assetType,
    };
    const svc = family === "owasp" ? owaspService.sendReportEmail : complianceService.sendReportEmail;
    const res = await svc(payload);
    setEmailSending(false);
    if (res.success) {
      // Backend returns { status: SENT | EMAIL_DISABLED | FAILED, message }.
      const status = res.data?.status || "SENT";
      const message = res.data?.message;
      if (status === "EMAIL_DISABLED") {
        setEmailMsg({ kind: "warn", text: message || "Email transport is disabled (no SendGrid API key configured)." });
      } else if (status === "FAILED") {
        setEmailMsg({ kind: "err", text: message || "SendGrid failed to deliver the email." });
      } else {
        setEmailMsg({ kind: "ok", text: message || "Queued for SendGrid." });
      }
    } else {
      setEmailMsg({ kind: "err", text: res.error });
    }
  };

  const onPreviewEmail = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewBody(null);
    const reportType = family === "owasp" ? "OWASP" : "COMPLIANCE";
    const res = await complianceService.previewReportBody(scanId, reportType);
    setPreviewLoading(false);
    if (res.success) setPreviewBody(res.data);
    else setPreviewBody(`Could not load preview: ${res.error || "unknown error"}`);
  };

  const isOwasp = family === "owasp";
  const backLabel =
    source === "history" ? "Back to history" : source === "dashboard" ? "Back to dashboard" : `Back to ${isOwasp ? "OWASP" : "Compliance"} rules`;

  return (
    <div className="flex h-full flex-col" data-testid="scan-results-view">
      {/* ── Header ── */}
      <div className="relative overflow-hidden border-b border-[#24304d]">
        {/* ambient family-tinted glow */}
        <div
          className={cn(
            "pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full blur-3xl opacity-20",
            isOwasp ? "bg-violet-500" : "bg-emerald-500",
          )}
        />
        <div className="relative flex items-start justify-between gap-3 px-6 py-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2"
            data-testid="back-to-workspace"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </button>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            {isOwasp ? <ShieldAlert className="h-5 w-5 text-violet-300" /> : <FileText className="h-5 w-5 text-emerald-300" />}
            Scan results
            {running && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
          </h1>
          {scan && (
            <>
              <p className="mt-1 font-mono text-xs text-slate-400">{scan.scanId}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                <span><span className="text-slate-500">Project:</span> <span className="text-white font-mono">{scan.projectName}</span></span>
                <span><span className="text-slate-500">Asset:</span> <span className="text-white">{scan.assetName} ({scan.assetType})</span></span>
              </div>
            </>
          )}
        </div>
        {scan?.scanId && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-200 hover:border-orange-500/70 hover:bg-orange-500/15 disabled:opacity-50"
                data-testid="download-pdf-btn"
              >
                {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
              </button>
              <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white hover:border-orange-500/60" data-testid="download-report-btn">
                <Download className="h-3.5 w-3.5" /> Download HTML
              </button>
              <button onClick={() => setEmailOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-white hover:border-orange-500/60" data-testid="email-report-btn">
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
            </div>
            {emailOpen && (
              <div className="flex items-center gap-2" data-testid="email-row">
                <input
                  type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                  className="rounded-md border border-[#24304d] bg-[#0b0e16] px-2 py-1 text-xs text-white min-w-[220px]"
                  data-testid="email-input"
                />
                <button onClick={onPreviewEmail} className="inline-flex items-center gap-1 rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs font-medium text-slate-200 hover:border-orange-500/60 hover:text-white" data-testid="preview-email-btn">
                  <FileText className="h-3 w-3" /> Preview
                </button>
                <button onClick={onEmail} disabled={emailSending} className="inline-flex items-center gap-1 rounded-md bg-orange-500/90 px-3 py-1 text-xs font-medium text-white disabled:opacity-50" data-testid="send-email-btn">
                  {emailSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />} Send
                </button>
                {emailMsg && (
                  <span className={
                    emailMsg.kind === "ok" ? "text-[11px] text-emerald-300"
                      : emailMsg.kind === "warn" ? "text-[11px] text-amber-300"
                      : "text-[11px] text-rose-300"
                  }>
                    {emailMsg.text}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        </div>
        {scan && (
          <div className="relative grid grid-cols-2 gap-2.5 px-6 pb-4 sm:grid-cols-5">
            <StatTile label="Status" value={scan.status || "—"} />
            <StatTile label="Compliance" value={scan.compliance ?? "—"} />
            <StatTile label="Passed" value={passed} tone="emerald" />
            <StatTile label="Failed" value={failed} tone="rose" />
            <StatTile label="Skipped" value={skipped} tone="slate" />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto px-6 py-6 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading scan…</div>
        )}
        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>
        )}
        {scan && family === "owasp" && <OwaspCoverageStrip results={results} />}
        {scan && results.length === 0 && !running && (
          <div className="rounded-md border border-dashed border-[#24304d] bg-[#0c1224] p-8 text-center text-sm text-slate-400">
            No results captured for this scan.
          </div>
        )}
        {scan && results.map((r, i) => (
          <RuleResultCard key={r.ruleId || i} result={r} />
        ))}
      </div>

      {/* Email body preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" data-testid="email-preview-modal">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg border border-[#24304d] bg-[#0b0e16]">
            <div className="flex items-center justify-between border-b border-[#24304d] px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Email preview</h3>
                <p className="mt-0.5 text-xs text-slate-400">Exact body that SendGrid will deliver to {emailTo}</p>
              </div>
              <button onClick={() => setPreviewOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" data-testid="preview-close">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading preview…</div>
              ) : (
                <pre className="whitespace-pre-wrap rounded bg-[#080c14] p-4 text-[12px] text-slate-200 font-mono" data-testid="email-preview-body">{previewBody}</pre>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#24304d] px-5 py-3">
              <button onClick={() => setPreviewOpen(false)} className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1.5 text-xs text-slate-300 hover:text-white">Close</button>
              <button onClick={async () => { setPreviewOpen(false); await onEmail(); }} className="inline-flex items-center gap-1 rounded-md bg-orange-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500" data-testid="send-from-preview">
                <Mail className="h-3.5 w-3.5" /> Send this body
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanResultsView;
