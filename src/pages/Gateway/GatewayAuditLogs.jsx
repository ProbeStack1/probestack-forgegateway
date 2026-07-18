import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Eye, Filter, RefreshCw, RotateCcw, Search, Server, ShieldCheck, XCircle,
  Activity, TrendingUp,
} from 'lucide-react';
import { apiDevelopmentService } from '../../services/apiDevelopmentService';
import { cn } from '../../lib/utils';

/* ─── Static config ──────────────────────────────────────────── */
const SERVICE_OPTIONS = [
  { value: '', label: 'All Services' },
  { value: 'api-development', label: 'API Development' },
  { value: 'api-design', label: 'API Design' },
  { value: 'api-mock', label: 'API Mock' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'contract-testing', label: 'Contract Testing' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'provider-api', label: 'Provider API' },
  { value: 'test-generation', label: 'Test Generation' },
  { value: 'requirement-mgmt', label: 'Requirement Management' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'ERROR', label: 'Error' },
];

const DEFAULT_FILTERS = {
  service: '', status: '', operation: '', performedBy: '',
  microserviceId: '', onboardingId: '', entityType: '', fromDate: '', toDate: '',
};

const TABLE_COLS = [
  { label: 'Time',      width: 'w-44'  },
  { label: 'Service',   width: 'w-40'  },
  { label: 'Status',    width: 'w-32'  },
  { label: 'Operation', width: 'w-36'  },
  { label: 'Actor',     width: 'w-48'  },
  { label: 'Entity',    width: 'w-52'  },
  { label: 'Message',   width: ''      },
  { label: 'Details',   width: 'w-20', align: 'text-right' },
];

/* ─── Helpers ────────────────────────────────────────────────── */
const formatDateTime = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const asJson = (v) => {
  if (!v || (typeof v === 'object' && Object.keys(v).length === 0)) return 'No data';
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
};

const toIso = (v) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toISOString(); };

const metaVal = (log, ...keys) => {
  const m = log?.metadata || {};
  for (const k of keys) if (m[k] !== undefined && m[k] !== null && m[k] !== '') return m[k];
  return '';
};

/* ─── Sub-components ─────────────────────────────────────────── */
function StatCard({ label, value, Icon, iconCls, valueClass }) {
  return (
    <div className="group rounded-2xl border border-[#27314e] bg-gradient-to-br from-[#111827] to-[#0f172a] p-5 transition-all duration-300 hover:border-[#ff8a5c]/40 hover:shadow-xl hover:shadow-[#ff5b1f]/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-500">{label}</div>
          <div className={cn('mt-3 text-xl font-bold leading-none', valueClass)}>{value}</div>
        </div>
        <div className={cn('rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-all group-hover:scale-110', iconCls)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{children}</div>;
}

const inputCls = 'h-10 w-full rounded-xl border border-[#27314e] bg-[#080c14] px-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#ff5b1f]/60';

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function StatusBadge({ status }) {
  const ok = status === 'SUCCESS';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold',
      ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-red-400/30 bg-red-500/10 text-red-300'
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3 flex-shrink-0" /> : <XCircle className="h-3 w-3 flex-shrink-0" />}
      {status || 'UNKNOWN'}
    </span>
  );
}

function DetailBlock({ title, value }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[#27314e] bg-[#080c14]">
      <div className="border-b border-[#27314e] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-xs leading-5 text-slate-400">{asJson(value)}</pre>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function GatewayAuditLogs() {
  const [filters, setFilters]             = useState(DEFAULT_FILTERS);
  const [appliedFilters, setApplied]      = useState(DEFAULT_FILTERS);
  const [logs, setLogs]                   = useState([]);
  const [pageInfo, setPageInfo]           = useState({ number: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState('');
  const [expandedId, setExpandedId]       = useState('');
  const [lastRefresh, setLastRefresh]     = useState('');

  const page = pageInfo.number || 0;
  const size = pageInfo.size   || 20;

  const stats = useMemo(() => ({
    success: logs.filter(l => l.status === 'SUCCESS').length,
    failed:  logs.filter(l => l.status === 'ERROR').length,
  }), [logs]);

  const fetchLogs = async (nextPage = page, nextSize = size, src = appliedFilters) => {
    setIsLoading(true);
    setError('');
    const result = await apiDevelopmentService.getAuditLogs({
      ...src, fromDate: toIso(src.fromDate), toDate: toIso(src.toDate), page: nextPage, size: nextSize,
    });
    if (result.success) {
      const payload = result.data?.data || {};
      const content = Array.isArray(payload.content) ? payload.content : Array.isArray(payload) ? payload : [];
      setLogs(content);
      setPageInfo({
        number: payload.number ?? nextPage, size: payload.size ?? nextSize,
        totalElements: payload.totalElements ?? content.length,
        totalPages: payload.totalPages ?? (content.length ? 1 : 0),
      });
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    } else {
      setLogs([]);
      setError(result.error || 'Failed to fetch audit logs');
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(0, size, appliedFilters); }, []);

  const upd = (k, v) => setFilters(c => ({ ...c, [k]: v }));

  const applyFilters = () => { setApplied(filters); setExpandedId(''); fetchLogs(0, size, filters); };
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); setExpandedId(''); fetchLogs(0, size, DEFAULT_FILTERS); };
  const changePage   = (n)  => { if (n < 0 || (pageInfo.totalPages && n >= pageInfo.totalPages)) return; setExpandedId(''); fetchLogs(n, size, appliedFilters); };
  const changeSize   = (n)  => { const p = Number(n); setPageInfo(c => ({ ...c, size: p })); fetchLogs(0, p, appliedFilters); };

  return (
    <div className="min-h-full bg-[#0b0e16] p-6 text-white">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/20 bg-[#ff5b1f]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff8a5c]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Gateway Audit
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Audit Logs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Track all gateway activity — proxy deployments, configuration changes, and service operations.
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => fetchLogs(page, size, appliedFilters)}
            className="inline-flex h-11 items-center whitespace-nowrap rounded-xl border border-[#27314e] bg-[#15192b] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4 flex-shrink-0', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Matching"  value={pageInfo.totalElements}    Icon={Server}       iconCls="text-[#ff8a5c]"    valueClass="text-white"        />
        <StatCard label="Success on Page" value={stats.success}             Icon={CheckCircle2} iconCls="text-emerald-400"  valueClass="text-emerald-400"  />
        <StatCard label="Errors on Page"  value={stats.failed}              Icon={AlertCircle}  iconCls="text-red-400"      valueClass={stats.failed > 0 ? 'text-red-400' : 'text-slate-400'} />
        <StatCard label="Last Refresh"    value={lastRefresh || '—'}        Icon={Clock}        iconCls="text-slate-400"    valueClass="text-white"        />
      </section>

      {/* ── Filters ─────────────────────────────────────────── */}
      <section className="mt-4">
        <div className="rounded-2xl border border-[#27314e] bg-[#111827]/95">
          <div className="flex items-center gap-2.5 border-b border-[#27314e] px-5 py-4">
            <Filter className="h-4 w-4 text-[#ff8a5c]" />
            <span className="text-sm font-semibold text-white">Filters</span>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="Service"    value={filters.service}        onChange={v => upd('service', v)}        options={SERVICE_OPTIONS} />
            <FilterSelect label="Status"     value={filters.status}         onChange={v => upd('status', v)}         options={STATUS_OPTIONS}  />
            <FilterInput  label="Operation"  value={filters.operation}      onChange={v => upd('operation', v)}      placeholder="GET, POST, CREATE…" />
            <FilterInput  label="Performed By" value={filters.performedBy}  onChange={v => upd('performedBy', v)}    placeholder="user@company.com" />
            <FilterInput  label="Microservice ID" value={filters.microserviceId} onChange={v => upd('microserviceId', v)} placeholder="Filter by microservice" />
            <FilterInput  label="Onboarding ID"   value={filters.onboardingId}   onChange={v => upd('onboardingId', v)}   placeholder="Filter by onboarding" />
            <FilterInput  label="Entity Type"     value={filters.entityType}     onChange={v => upd('entityType', v)}     placeholder="proxy, product, consumer…" />
            <FilterSelect label="Page Size"  value={pageInfo.size}          onChange={v => changeSize(v)}
              options={[10, 20, 50, 100].map(n => ({ value: n, label: `${n} records` }))} />
            <FilterInput  label="From"       value={filters.fromDate}       onChange={v => upd('fromDate', v)}       type="datetime-local" />
            <FilterInput  label="To"         value={filters.toDate}         onChange={v => upd('toDate', v)}         type="datetime-local" />

            <div className="flex items-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-[#ff5b1f] px-5 text-sm font-semibold text-white shadow-[0_16px_26px_-18px_rgba(255,91,31,0.9)] transition hover:bg-[#ff6b36]"
              >
                <Search className="mr-2 h-4 w-4 flex-shrink-0" />
                Search
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center whitespace-nowrap rounded-xl border border-[#27314e] bg-[#15192b] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                <RotateCcw className="mr-2 h-4 w-4 flex-shrink-0" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Activity table ──────────────────────────────────── */}
      <section className="mt-4">
        <div className="overflow-hidden rounded-2xl border border-[#27314e] bg-[#111827]/95">

          {/* Table header bar */}
          <div className="flex items-center justify-between gap-4 border-b border-[#27314e] px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-white">Activity</div>
              <div className="mt-0.5 text-xs text-slate-500">Expand a row to inspect request, response, error, and metadata details.</div>
            </div>
            <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Page {pageInfo.totalPages ? page + 1 : 0} / {pageInfo.totalPages || 0}
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-[#27314e]">
              <thead className="bg-[#0b0e16]/50">
                <tr>
                  {TABLE_COLS.map(({ label, width, align }) => (
                    <th key={label} className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500',
                      align || 'text-left', width
                    )}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#27314e]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#ff8a5c]" />
                      <p className="text-sm text-slate-500">Loading audit logs…</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <AlertCircle className="mx-auto mb-3 h-6 w-6 text-slate-600" />
                      <p className="text-sm text-slate-500">No audit logs found for the selected filters.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const entityLabel = [log.entityType, log.entityId].filter(Boolean).join(' / ') || '-';
                    const method      = metaVal(log, 'method', 'httpMethod');
                    const path        = metaVal(log, 'path', 'requestUri');
                    const isExpanded  = expandedId === log.id;

                    return (
                      <React.Fragment key={log.id || `${log.createdAt}-${log.operation}`}>
                        <tr className="group align-middle transition-colors hover:bg-white/[0.02]">

                          {/* Time */}
                          <td className="px-4 py-3">
                            <span className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                          </td>

                          {/* Service */}
                          <td className="px-4 py-3">
                            <div className="truncate text-sm font-medium text-white">{log.service || '-'}</div>
                            {path && <div className="mt-0.5 truncate text-xs text-slate-500">{path}</div>}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={log.status} />
                          </td>

                          {/* Operation */}
                          <td className="px-4 py-3">
                            <span className="whitespace-nowrap text-sm text-white">{log.operation || method || '-'}</span>
                            {method && method !== log.operation && (
                              <div className="mt-0.5 whitespace-nowrap text-xs text-slate-500">{method}</div>
                            )}
                          </td>

                          {/* Actor */}
                          <td className="px-4 py-3">
                            <span className="block truncate text-sm text-slate-400">{log.performedBy || 'system'}</span>
                          </td>

                          {/* Entity */}
                          <td className="px-4 py-3">
                            <div className="truncate text-sm text-slate-300">{entityLabel}</div>
                            {(log.microserviceId || log.onboardingId) && (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {log.microserviceId && <div className="truncate">MS: {log.microserviceId}</div>}
                                {log.onboardingId   && <div className="truncate">OB: {log.onboardingId}</div>}
                              </div>
                            )}
                          </td>

                          {/* Message */}
                          <td className="px-4 py-3">
                            <span className="line-clamp-2 text-sm text-slate-400">{log.errorMessage || log.message || '-'}</span>
                          </td>

                          {/* Details */}
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? '' : log.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#27314e] bg-[#080c14] text-slate-400 transition hover:border-[#ff5b1f]/50 hover:text-white"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-[#080c14]/60 px-5 py-5">
                              <div className="grid gap-4 lg:grid-cols-2">
                                <DetailBlock title="Request Payload"  value={log.requestPayload} />
                                <DetailBlock title="Response Payload" value={log.responsePayload} />
                                <DetailBlock title="Metadata"         value={log.metadata} />
                                <DetailBlock title="Error"            value={log.errorMessage || 'No error recorded'} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between gap-4 border-t border-[#27314e] px-5 py-4">
            <p className="whitespace-nowrap text-xs text-slate-500">
              Showing <span className="font-semibold text-white">{logs.length}</span> of <span className="font-semibold text-white">{pageInfo.totalElements}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={isLoading || page <= 0}
                className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-[#27314e] bg-[#15192b] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4 flex-shrink-0" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={isLoading || !pageInfo.totalPages || page + 1 >= pageInfo.totalPages}
                className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-[#27314e] bg-[#15192b] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="ml-1.5 h-4 w-4 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
