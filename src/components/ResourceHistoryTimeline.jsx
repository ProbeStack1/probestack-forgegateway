import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { apiDevelopmentService } from '../services/apiDevelopmentService';

const PAGE_SIZE = 25;

const STEP_LABELS = {
  REQUIREMENT: 'Requirement',
  API_DESIGN: 'API Design',
  MOCK_SERVER: 'Mock Service',
  CONTRACT_TESTING: 'Contract Testing',
  API_DEVELOPMENT: 'Development',
  ENDPOINT: 'Endpoint',
  PROJECT_METADATA: 'Project Metadata',
  CODEGEN: 'Code Generation',
  DEPLOYMENT: 'Deployment',
  TEST_GENERATION: 'Test Generation',
  COMPLIANCE: 'Compliance',
};

const OPERATION_META = {
  create: { verb: 'created', icon: Plus, dot: 'bg-emerald-500', chip: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  update: { verb: 'updated', icon: Pencil, dot: 'bg-blue-500', chip: 'border-blue-500/25 bg-blue-500/10 text-blue-300' },
  delete: { verb: 'removed', icon: Trash2, dot: 'bg-rose-500', chip: 'border-rose-500/25 bg-rose-500/10 text-rose-300' },
  deploy: { verb: 'deployed', icon: Rocket, dot: 'bg-violet-500', chip: 'border-violet-500/25 bg-violet-500/10 text-violet-300' },
  activity: { verb: 'recorded', icon: Activity, dot: 'bg-slate-500', chip: 'border-white/15 bg-white/[0.04] text-slate-300' },
};

const humanize = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const classifyOperation = (log) => {
  const op = String(log.operation || '').toUpperCase();
  if (/DEPLOY|PUBLISH|RELEASE/.test(op)) return 'deploy';
  if (/CREATE|ADD|REGISTER|ONBOARD|INSERT/.test(op)) return 'create';
  if (/DELETE|REMOVE|ARCHIVE/.test(op)) return 'delete';
  if (/UPDATE|EDIT|MODIFY|PATCH|SAVE/.test(op)) return 'update';
  if (!log.beforeSnapshot && log.afterSnapshot) return 'create';
  if (log.beforeSnapshot && !log.afterSnapshot) return 'delete';
  if (log.beforeSnapshot && log.afterSnapshot) return 'update';
  return 'activity';
};

const eventScope = (log) => (
  STEP_LABELS[log.stepKey]
  || humanize(log.stepKey)
  || humanize(log.targetEntityType)
  || humanize(log.targetCollection)
  || humanize(log.resourceType)
  || humanize(log.service)
  || 'Resource'
);

const dayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, now)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
};

const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const exactTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const initials = (name) => {
  if (!name) return 'SY';
  const clean = name.includes('@') ? name.split('@')[0] : name;
  const parts = clean.replace(/[._-]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SY';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatDiffValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      const text = JSON.stringify(value);
      return text.length > 140 ? `${text.slice(0, 140)}…` : text;
    } catch {
      return String(value);
    }
  }
  const text = String(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};

const diffFields = (log) => {
  const { changes, beforeSnapshot, afterSnapshot } = log;

  if (Array.isArray(changes) && changes.length) {
    return changes.map((entry, index) => ({
      field: entry.field || entry.fieldName || entry.key || entry.name || `Field ${index + 1}`,
      before: entry.oldValue ?? entry.old ?? entry.from ?? entry.previousValue,
      after: entry.newValue ?? entry.new ?? entry.to ?? entry.currentValue,
    }));
  }

  if (changes && typeof changes === 'object' && Object.keys(changes).length) {
    return Object.entries(changes).map(([field, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && ('old' in value || 'oldValue' in value || 'from' in value || 'new' in value || 'newValue' in value || 'to' in value)) {
        return {
          field,
          before: value.old ?? value.oldValue ?? value.from,
          after: value.new ?? value.newValue ?? value.to,
        };
      }
      return { field, before: beforeSnapshot?.[field], after: value };
    });
  }

  if (beforeSnapshot && afterSnapshot && typeof beforeSnapshot === 'object' && typeof afterSnapshot === 'object') {
    const keys = new Set([...Object.keys(beforeSnapshot), ...Object.keys(afterSnapshot)]);
    const diffs = [];
    keys.forEach((key) => {
      if (key === 'steps' || key.startsWith('_')) return;
      const beforeValue = beforeSnapshot[key];
      const afterValue = afterSnapshot[key];
      if (typeof beforeValue === 'object' || typeof afterValue === 'object') return;
      if (beforeValue !== afterValue) diffs.push({ field: key, before: beforeValue, after: afterValue });
    });
    return diffs;
  }

  return [];
};

const summaryFields = (snapshot, limit = 6) => (
  Object.entries(snapshot || {})
    .filter(([key, value]) => (
      value !== null && value !== undefined && value !== ''
      && typeof value !== 'object'
      && key !== 'steps' && !key.startsWith('_')
    ))
    .slice(0, limit)
);

function TimelineEntry({ log, isExpanded, onToggle, isLast }) {
  const [copied, setCopied] = useState(false);
  const opKey = classifyOperation(log);
  const meta = OPERATION_META[opKey];
  const Icon = meta.icon;
  const diffs = useMemo(() => diffFields(log), [log]);
  const isCreate = opKey === 'create';
  const isDelete = opKey === 'delete';
  const summary = isCreate ? summaryFields(log.afterSnapshot) : isDelete ? summaryFields(log.beforeSnapshot) : [];
  const hasDetail = diffs.length > 0 || summary.length > 0;
  const failed = log.status && !['SUCCESS', ''].includes(log.status);

  const handleCopy = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore
    }
  };

  return (
    <div className={cn('relative pl-9', isLast ? 'pb-0' : 'pb-5')}>
      {!isLast && <span className="absolute left-0 top-0.5 h-full w-px bg-white/10" aria-hidden="true" />}
      <span className={cn('absolute left-0 top-0.5 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full ring-4 ring-[#11182c]', meta.dot)}>
        <Icon className="h-3 w-3 text-white" />
      </span>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-white/[0.14]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{eventScope(log)}</span>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', meta.chip)}>
                {meta.verb}
              </span>
              {failed && (
                <span className="inline-flex items-center rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                  {log.status}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff5b1f]/15 text-[9px] font-bold text-[#ffb08c]">
                  {initials(log.performedBy)}
                </span>
                {log.performedBy || 'system'}
              </span>
              <span title={exactTime(log.createdAt)}>{relativeTime(log.createdAt)}</span>
              {log.operation && <span className="text-slate-600">{log.operation}</span>}
            </div>
            {(log.errorMessage || log.message) && (
              <p className="mt-2 truncate text-xs text-slate-400" title={log.errorMessage || log.message}>{log.errorMessage || log.message}</p>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy raw event JSON"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
            {hasDetail && (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {diffs.length > 0 ? `${diffs.length} field${diffs.length === 1 ? '' : 's'}` : 'Details'}
                <ChevronDown className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')} />
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasDetail && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0d1526]/70">
            {diffs.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0d1526]">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Field</th>
                    <th className="px-3 py-2 font-semibold">Before</th>
                    <th className="px-3 py-2 font-semibold">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {diffs.map((diff, index) => (
                    <tr key={`${diff.field}-${index}`}>
                      <td className="px-3 py-2 align-top font-medium text-slate-300">{humanize(diff.field)}</td>
                      <td className="max-w-[180px] px-3 py-2 align-top text-red-300/80 line-through decoration-red-400/40">{formatDiffValue(diff.before)}</td>
                      <td className="max-w-[180px] px-3 py-2 align-top text-emerald-300">{formatDiffValue(diff.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-wrap gap-2 p-3">
                {summary.map(([key, value]) => (
                  <span key={key} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300">
                    <span className="text-slate-500">{humanize(key)}:</span> {formatDiffValue(value)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResourceHistoryTimeline({ resourceId, active = true, resourceLabel = 'resource' }) {
  const [logs, setLogs] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [stepFilter, setStepFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState('');
  const loadedRef = useRef('');

  const fetchHistory = async (nextPage, append) => {
    if (!resourceId) return;
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');

    const result = await apiDevelopmentService.getAuditLogs({
      resourceId,
      auditType: 'ENTITY',
      page: nextPage,
      size: PAGE_SIZE,
    });

    if (!result.success) {
      setError(result.error || 'Failed to load activity history');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const payload = result.data?.data || {};
    const content = Array.isArray(payload.content) ? payload.content : Array.isArray(payload) ? payload : [];
    setLogs((prev) => (append ? [...prev, ...content] : content));
    setPageInfo({
      number: payload.number ?? nextPage,
      totalElements: payload.totalElements ?? content.length,
      totalPages: payload.totalPages ?? (content.length ? 1 : 0),
    });
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!active || !resourceId) return;
    if (loadedRef.current === resourceId) return;
    loadedRef.current = resourceId;
    setLogs([]);
    setStepFilter('ALL');
    setExpandedId('');
    fetchHistory(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, resourceId]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [logs]
  );

  const steps = useMemo(
    () => Array.from(new Set(logs.map((log) => log.stepKey).filter(Boolean))),
    [logs]
  );

  const filteredLogs = stepFilter === 'ALL' ? sortedLogs : sortedLogs.filter((log) => log.stepKey === stepFilter);

  const groups = useMemo(() => {
    const map = new Map();
    filteredLogs.forEach((log) => {
      const label = dayLabel(log.createdAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(log);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [filteredLogs]);

  const stats = useMemo(() => {
    const created = logs.filter((log) => classifyOperation(log) === 'create').length;
    const updated = logs.filter((log) => classifyOperation(log) === 'update').length;
    const contributors = new Set(logs.map((log) => log.performedBy).filter(Boolean)).size;
    return { created, updated, contributors };
  }, [logs]);

  const hasMore = pageInfo.totalElements > logs.length;

  if (!resourceId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
        <History className="mb-3 h-5 w-5 text-slate-600" />
        <div className="text-sm font-medium text-slate-500">Resource not identified yet</div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`history-skeleton-${index}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-56 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="text-lg font-bold text-white">{pageInfo.totalElements}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Total Events</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="text-lg font-bold text-emerald-300">{stats.created}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Created</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="text-lg font-bold text-blue-300">{stats.updated}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Updated</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchHistory(0, false)}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {stats.contributors > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" />
          {stats.contributors} contributor{stats.contributors === 1 ? '' : 's'} on this {resourceLabel}
        </div>
      )}

      {steps.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStepFilter('ALL')}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-medium transition',
              stepFilter === 'ALL' ? 'border-[#ff8a5c]/40 bg-[#ff5b1f]/15 text-[#ffb08c]' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
            )}
          >
            All Steps
          </button>
          {steps.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setStepFilter(step)}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                stepFilter === step ? 'border-[#ff8a5c]/40 bg-[#ff5b1f]/15 text-[#ffb08c]' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
              )}
            >
              {STEP_LABELS[step] || humanize(step)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
            <History className="h-5 w-5 text-slate-600" />
          </div>
          <div className="text-sm font-medium text-slate-500">No changes recorded yet for this {resourceLabel}</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{group.label}</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div>
                {group.items.map((log, index) => {
                  const id = log.id || `${log.createdAt}-${log.operation}`;
                  return (
                    <TimelineEntry
                      key={id}
                      log={log}
                      isExpanded={expandedId === id}
                      onToggle={() => setExpandedId((current) => (current === id ? '' : id))}
                      isLast={index === group.items.length - 1}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !error && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => fetchHistory(pageInfo.number + 1, true)}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load earlier events
          </button>
        </div>
      )}
    </div>
  );
}
