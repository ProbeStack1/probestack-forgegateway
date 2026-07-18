import { useEffect, useMemo, useState } from 'react';
import {
  X, Activity, CheckCircle2, AlertCircle, Loader2, SkipForward,
  Settings, Globe, Network, Lock, Send, Clock, Download,
  Plug, Sparkles, ListChecks, Reply, Copy, ChevronDown, ChevronRight,
  Timer, Zap, Server, Hash, FileText, ExternalLink, AlertTriangle,
  Info, Terminal, Eye, EyeOff
} from 'lucide-react';
import { cn } from '../../../lib/utils';

/* ------------------------------------------------------------------ /
/ Step name → icon resolver
/ ------------------------------------------------------------------ */
const STEP_ICONS = {
  REQUEST_PREPARE: Settings,
  DNS_LOOKUP: Globe,
  TCP_CONNECT: Network,
  TLS_HANDSHAKE: Lock,
  REQUEST_SENT: Send,
  WAITING_TTFB: Clock,
  RESPONSE_DOWNLOAD: Download,
  CONNECT: Plug,
  INITIALIZE: Sparkles,
  'TOOLS/LIST': ListChecks,
  'TOOLS/CALL': Send,
  RESPONSE: Reply,
};

const STEP_HUMAN_NAME = {
  REQUEST_PREPARE: 'Prepare Request',
  DNS_LOOKUP: 'DNS Lookup',
  TCP_CONNECT: 'TCP Connect',
  TLS_HANDSHAKE: 'TLS Handshake',
  REQUEST_SENT: 'Send Request',
  WAITING_TTFB: 'Wait for First Byte',
  RESPONSE_DOWNLOAD: 'Download Response',
  CONNECT: 'Connect to MCP Server',
  INITIALIZE: 'Initialize Session',
  'TOOLS/LIST': 'List Tools',
  'TOOLS/CALL': 'Invoke Tool',
  RESPONSE: 'Read Response',
};

/* ------------------------------------------------------------------ /
/ Normalise the two raw shapes into a single row type
/ ------------------------------------------------------------------ */
function normaliseRows({ phases, steps }) {
  if (Array.isArray(phases) && phases.length) {
    const byStep = new Map();
    for (const p of phases) {
      if (!p?.step) continue;
      const key = String(p.step).toUpperCase();
      const prev = byStep.get(key) || { step: key };
      const winsOnEnd = p.status === 'END' || prev.status !== 'END';
      byStep.set(key, {
        step: key,
        status: winsOnEnd ? p.status : prev.status,
        durationMs: winsOnEnd ? (p.durationMs ?? prev.durationMs) : prev.durationMs,
        startOffsetMs: winsOnEnd ? (p.startOffsetMs ?? prev.startOffsetMs) : prev.startOffsetMs,
        details: winsOnEnd ? (p.details ?? prev.details) : prev.details,
      });
    }
    return [...byStep.values()].sort(
      (a, b) => (a.startOffsetMs ?? 0) - (b.startOffsetMs ?? 0),
    );
  }
  if (Array.isArray(steps) && steps.length) {
    return steps.map((s, i) => ({
      step: (s.name || s.step || s.stage || `Step ${i + 1}`).toUpperCase(),
      status: s.status || (s.error ? 'FAILED' : 'OK'),
      durationMs: Number(s.duration_ms ?? s.durationMs ?? 0),
      startOffsetMs: Number(s.start_offset_ms ?? s.startOffsetMs ?? 0),
      details: pickRowDetails(s),
    }));
  }
  return [];
}

/** Whitelist the MCP details fields we want to surface as KV rows */
function pickRowDetails(s) {
  const out = {};
  if (s.message) out.message = s.message;
  if (s.error) out.error = typeof s.error === 'string' ? s.error : (s.error?.message ?? JSON.stringify(s.error));
  if (s.http_status ?? s.httpStatus) out.httpStatus = s.http_status ?? s.httpStatus;
  if (s.tool_count ?? s.toolCount) out.toolCount = s.tool_count ?? s.toolCount;
  if (s.tool_name ?? s.toolName) out.toolName = s.tool_name ?? s.toolName;
  if (s.tool_call_id ?? s.toolCallId) out.toolCallId = s.tool_call_id ?? s.toolCallId;
  if (s.payload_size ?? s.payloadSize) out.payloadSize = s.payload_size ?? s.payloadSize;
  if (s.endpoint) out.endpoint = s.endpoint;
  if (s.transport) out.transport = s.transport;
  if (s.host ?? s.hostname) out.host = s.host ?? s.hostname;
  if (s.port) out.port = s.port;
  if (s.path) out.path = s.path;
  if (s.protocol) out.protocol = s.protocol;
  if (s.ip) out.ip = s.ip;
  if (s.cert_issuer ?? s.certIssuer) out.certIssuer = s.cert_issuer ?? s.certIssuer;
  if (s.cert_valid_until ?? s.certValidUntil) out.certValidUntil = s.cert_valid_until ?? s.certValidUntil;
  if (s.bytes_sent ?? s.bytesSent) out.bytesSent = s.bytes_sent ?? s.bytesSent;
  if (s.bytes_received ?? s.bytesReceived) out.bytesReceived = s.bytes_received ?? s.bytesReceived;
  if (s.redirect_count ?? s.redirectCount) out.redirectCount = s.redirect_count ?? s.redirectCount;
  if (s.retry_count ?? s.retryCount) out.retryCount = s.retry_count ?? s.retryCount;
  if (s.cache_hit ?? s.cacheHit) out.cacheHit = s.cache_hit ?? s.cacheHit;
  if (s.content_type ?? s.contentType) out.contentType = s.content_type ?? s.contentType;
  if (s.content_length ?? s.contentLength) out.contentLength = s.content_length ?? s.contentLength;
  return Object.keys(out).length ? out : null;
}

/* ------------------------------------------------------------------ /
/ Status configuration with enhanced styling
/ ------------------------------------------------------------------ */
function statusConfig(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'FAILED' || s === 'ERROR') {
    return {
      icon: AlertCircle,
      iconCls: 'text-rose-400',
      pill: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      dot: 'bg-rose-500',
      text: 'text-rose-400',
      bg: 'bg-rose-500/5',
      label: 'Failed',
      border: 'border-l-rose-500/70',
    };
  }
  if (s === 'SKIPPED') {
    return {
      icon: SkipForward,
      iconCls: 'text-amber-400',
      pill: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      dot: 'bg-amber-500',
      text: 'text-amber-400',
      bg: 'bg-amber-500/5',
      label: 'Skipped',
      border: 'border-l-amber-500/70',
    };
  }
  if (s === 'PENDING' || s === 'RUNNING' || s === 'START') {
    return {
      icon: Loader2,
      iconCls: 'text-cyan-400 animate-spin',
      pill: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      dot: 'bg-cyan-500 animate-pulse',
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/5',
      label: 'Running',
      border: 'border-l-cyan-500/70',
    };
  }
  return {
    icon: CheckCircle2,
    iconCls: 'text-emerald-400',
    pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    label: 'Success',
    border: 'border-l-emerald-500/70',
  };
}

/* ------------------------------------------------------------------ /
/ Format bytes to human readable
/ ------------------------------------------------------------------ */
function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return null;
  const num = Number(bytes);
  if (num === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  return `${(num / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/* ------------------------------------------------------------------ /
/ Pretty key formatter
/ ------------------------------------------------------------------ */
function prettyKey(k) {
  const map = {
    httpStatus: 'HTTP Status',
    http_status: 'HTTP Status',
    toolCount: 'Tool Count',
    tool_count: 'Tool Count',
    toolName: 'Tool Name',
    tool_name: 'Tool Name',
    toolCallId: 'Tool Call ID',
    tool_call_id: 'Tool Call ID',
    payloadSize: 'Payload Size',
    payload_size: 'Payload Size',
    certIssuer: 'Certificate Issuer',
    cert_issuer: 'Certificate Issuer',
    certValidUntil: 'Certificate Expires',
    cert_valid_until: 'Certificate Expires',
    bytesSent: 'Bytes Sent',
    bytes_sent: 'Bytes Sent',
    bytesReceived: 'Bytes Received',
    bytes_received: 'Bytes Received',
    redirectCount: 'Redirects',
    redirect_count: 'Redirects',
    retryCount: 'Retries',
    retry_count: 'Retries',
    cacheHit: 'Cache Hit',
    cache_hit: 'Cache Hit',
    contentType: 'Content Type',
    content_type: 'Content Type',
    contentLength: 'Content Length',
    content_length: 'Content Length',
  };
  return map[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).replace(/Url/g, 'URL').replace(/Tls/g, 'TLS').replace(/Dns/g, 'DNS').replace(/Tcp/g, 'TCP').replace(/Ip/g, 'IP');
}

/* ------------------------------------------------------------------ /
/ Format value for display
/ ------------------------------------------------------------------ */
function formatValue(k, v) {
  if (v === null || v === undefined) return '—';
  if (['bytesSent', 'bytes_sent', 'bytesReceived', 'bytes_received', 'contentLength', 'content_length', 'payloadSize', 'payload_size'].includes(k)) {
    const formatted = formatBytes(v);
    return formatted || String(v);
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (k === 'httpStatus' || k === 'http_status') {
    const code = Number(v);
    if (code >= 500) return `${code} Server Error`;
    if (code >= 400) return `${code} Client Error`;
    if (code >= 300) return `${code} Redirect`;
    if (code >= 200) return `${code} Success`;
    if (code >= 100) return `${code} Informational`;
    return String(v);
  }
  if (typeof v === 'string' && v.length > 200) {
    return v.substring(0, 200) + '...';
  }
  return String(v);
}

/* ================================================================== /
/ DetailValue – compact display for a single key-value
/ ================================================================== */
function DetailValue({ k, v }) {
  const stringValue = String(v);
  const isUrl = /^(https?:\/\/|www\.)/i.test(stringValue);
  const isError = k === 'error' || k === 'Error';
  const isBoolean = typeof v === 'boolean';
  const isNumeric = typeof v === 'number';
  const [expanded, setExpanded] = useState(false);

  const formattedValue = formatValue(k, v);
  const isLong = stringValue.length > 60;

  if (isUrl) {
    return (
      <a
        href={stringValue}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 hover:decoration-cyan-400/60"
      >
        {stringValue}
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
      </a>
    );
  }

  if (isLong) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-gray-400 hover:text-white transition"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
          <span className="text-[10px] text-gray-500">
            ({stringValue.length} chars)
          </span>
        </div>
        {expanded ? (
          <pre className="whitespace-pre-wrap break-all rounded bg-dark-800/60 p-2 text-[11px] font-mono text-gray-300">
            {stringValue}
          </pre>
        ) : (
          <div className="truncate text-sm text-gray-300">{formattedValue}</div>
        )}
      </div>
    );
  }

  return (
    <span
      className={cn(
        'text-sm',
        isError && 'text-rose-400',
        !isError && !isUrl && 'text-gray-300',
        isBoolean && (v ? 'text-emerald-400' : 'text-gray-400'),
        isNumeric && !isError && 'font-mono text-violet-300',
      )}
    >
      {formattedValue}
    </span>
  );
}

/* ================================================================== /
/ Main Drawer Component – Redesigned
/ ================================================================== */
export default function RequestTraceDrawer({
  open,
  onClose,
  title = 'Request Execution Trace',
  phases,
  steps,
  summary = {},
}) {
  const [copied, setCopied] = useState(false);
  const rows = useMemo(() => normaliseRows({ phases, steps }), [phases, steps]);
  const totalMs = summary.totalMs
    ?? rows.reduce((sum, r) => Math.max(sum, (r.startOffsetMs || 0) + (r.durationMs || 0)), 0);
  const failedCount = rows.filter(r => /FAIL|ERROR/.test(String(r.status))).length;
  const okCount = rows.length - failedCount;
  const skippedCount = rows.filter(r => /^SKIPPED$/i.test(String(r.status))).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const copyTrace = async () => {
    const text = [
      `${title}`,
      `${'='.repeat(50)}`,
      `Total: ${totalMs.toFixed(2)} ms | Steps: ${rows.length} | OK: ${okCount} | Failed: ${failedCount}`,
      summary.method && summary.finalUrl ? `\n${summary.method} ${summary.finalUrl}` : null,
      summary.status != null ? `HTTP Status: ${summary.status}` : null,
      '',
      'STEPS:',
      `${'─'.repeat(60)}`,
      ...rows.map((r, i) => {
        const name = STEP_HUMAN_NAME[r.step] || r.step;
        const status = String(r.status || '').padEnd(8);
        const duration = `${(r.durationMs ?? 0).toFixed(2)} ms`.padStart(12);
        const offset = r.startOffsetMs ? `(+${r.startOffsetMs} ms)`.padStart(12) : '';
        return `[${String(i + 1).padStart(2, '0')}] ${name.padEnd(24)} ${status} ${duration} ${offset}`;
      }),
      '',
      'DETAILS:',
      `${'─'.repeat(60)}`,
      ...rows.flatMap(r => {
        if (!r.details) return [];
        return Object.entries(r.details).map(([k, v]) => `  ${prettyKey(k)}: ${formatValue(k, v)}`);
      }),
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close trace drawer"
        onClick={onClose}
        className="flex-1 backdrop-blur-sm transition-opacity"
      />
      <aside className="relative flex w-full flex-col bg-dark-800 backdrop-blur-xl border-l border-dark-700/60 shadow-2xl sm:w-[65vw] sm:min-w-[700px] lg:w-[55vw]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <p className="text-xs text-gray-400">Execution timeline & details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTrace}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-dark-800/60 text-gray-400 border border-dark-700/60 hover:bg-dark-700/70 hover:text-white',
              )}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-dark-700/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <section className="grid grid-cols-2 gap-3 border-b border-dark-700/50 px-6 py-4 sm:grid-cols-4">
          <SummaryStat label="Total Duration" value={`${totalMs.toFixed(0)} ms`} icon={Timer} color="emerald" />
          <SummaryStat
            label="Steps Completed"
            value={`${okCount}/${rows.length}`}
            icon={CheckCircle2}
            color={failedCount ? 'rose' : 'emerald'}
            sub={skippedCount > 0 ? `${skippedCount} skipped` : undefined}
          />
          {summary.status != null && (
            <SummaryStat
              label="HTTP Status"
              value={String(summary.status)}
              icon={Server}
              color={Number(summary.status) >= 400 ? 'rose' : 'cyan'}
            />
          )}
          {summary.method && (
            <SummaryStat label="Method" value={summary.method} icon={Zap} color="violet" />
          )}
          {summary.remote && (
            <SummaryStat label="Remote Host" value={summary.remote} icon={Globe} color="gray" mono />
          )}
          {summary.tls && (
            <SummaryStat label="TLS Version" value={summary.tls} icon={Lock} color="emerald" />
          )}
        </section>

        {/* URL */}
        {summary.finalUrl && (
          <div className="border-b border-dark-700/50 bg-dark-800/20 px-6 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">URL</span>
              <a
                href={summary.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-xs text-cyan-400/90 hover:text-cyan-300 transition"
                title={summary.finalUrl}
              >
                {summary.finalUrl}
              </a>
              <ExternalLink className="h-3 w-3 shrink-0 text-gray-500" />
            </div>
          </div>
        )}

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-700/60 bg-dark-900/30 p-10 text-center">
              <Activity className="h-10 w-10 text-gray-600" />
              <h3 className="mt-3 text-sm font-medium text-gray-400">No Trace Data</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm">
                Execute a request to see a detailed breakdown of each step.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row, i) => (
                <TraceStepCard key={`${row.step}-${i}`} index={i + 1} row={row} />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ================================================================== /
/ TraceStepCard – sleek vertical card
/ ================================================================== */
function TraceStepCard({ index, row }) {
  const tone = statusConfig(row.status);
  const Icon = STEP_ICONS[row.step] || Activity;
  const StatusIcon = tone.icon;
  const human = STEP_HUMAN_NAME[row.step] || row.step;
  const duration = Math.max(0, row.durationMs ?? 0);
  const offset = Math.max(0, row.startOffsetMs ?? 0);
  const detailRows = row.details && Object.entries(row.details);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border hover:bg-dark-800/60 transition-colors',
        'border-dark-700/60',
        tone.border,
      )}
    >
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', 'bg-dark-800/80 ring-1 ring-dark-700 text-gray-300')}>
          {index}
        </div>

        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', tone.bg)}>
          <Icon className={cn('h-4 w-4', tone.text)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{human}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider', tone.pill)}>
              <StatusIcon className={cn('h-3 w-3', tone.iconCls)} />
              {tone.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span>{row.step}</span>
            {duration > 0 && <span>⏱ {duration.toFixed(duration < 10 ? 2 : 0)} ms</span>}
            {offset > 0 && <span>+{offset.toFixed(0)} ms</span>}
          </div>
        </div>

        <button className="shrink-0 p-1 text-gray-500 hover:text-gray-300 transition">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {expanded && detailRows && detailRows.length > 0 && (
        <div className="border-t border-dark-700/60 px-4 py-3">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {detailRows.map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2 rounded-md bg-dark-800/30 p-2">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-gray-400 shrink-0">
                  {prettyKey(k)}
                </dt>
                <dd className="min-w-0 flex-1">
                  <DetailValue k={k} v={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/* ================================================================== /
/ SummaryStat – clean stat block
/ ================================================================== */
const COLOR_CONFIG = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    value: 'text-emerald-300',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: 'text-rose-400',
    value: 'text-rose-300',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    icon: 'text-cyan-400',
    value: 'text-cyan-300',
  },
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    icon: 'text-violet-400',
    value: 'text-violet-300',
  },
  gray: {
    bg: 'bg-dark-800/30',
    border: 'border-dark-700/50',
    icon: 'text-gray-400',
    value: 'text-gray-300',
  },
};

function SummaryStat({ label, value, icon: Icon, color = 'gray', sub, mono }) {
  const config = COLOR_CONFIG[color] || COLOR_CONFIG.gray;
  return (
    <div className={cn('rounded-md border px-3 py-2', config.bg, config.border)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', config.icon)} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[9px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
          <div className={cn('truncate font-bold', config.value, mono && 'font-mono')} title={String(value)}>
            {value}
          </div>
          {sub && <div className="truncate text-[10px] text-gray-500">{sub}</div>}
        </div>
      </div>
    </div>
  );
}