import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  HelpCircle,
  Search,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { cn } from '../lib/utils';
import { fetchApigeeToken, fetchApigeeBreakdown } from '../services/apigeeStatsService';
import '../index.css';

let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

const timeRangeOptions = ['1 hour', '3 hours', '6 hours', '12 hours', '1 day', '3 days', '7 days', '14 days'];

const dimensionOptions = [
  'Organization', 'Environment', 'Proxy', 'Request URI', 'Proxy Endpoint',
  'Proxy Base Path', 'Request Verb', 'Response Status Code', 'Developer',
  'Developer App', 'API Product', 'Target Host', 'Target URL', 'Client IP',
  'Response Reason Phrase',
];

// --- Only dimensions the Apigee stats API actually supports as a breakdown path can be queried. ---
const DIMENSION_API_MAP = {
  Proxy: 'apiproxy',
  'Request URI': 'request_uri',
  'Proxy Base Path': 'request_path',
  'Request Verb': 'request_verb',
  'Response Status Code': 'response_status_code',
  Developer: 'developer',
  'Developer App': 'developer_app',
  'API Product': 'api_product',
  'Target Host': 'target_host',
  'Target URL': 'target_url',
  'Client IP': 'client_ip',
  'Response Reason Phrase': 'response_reason_phrase',
};

const metricOptions = [
  'Message Count', 'Total Response Time', 'Target Response Time',
  'Request Processing Latency', 'Response Processing Latency',
  'Error Count', 'Policy Error Count', 'Request Size', 'Response Size',
];

// --- `proxy_processing_time` isn't a real Apigee metric field (confirmed via a live 400:
// "field \"proxy_processing_time\" not present in schema") — Apigee splits it into these two. ---
const METRIC_API_MAP = {
  'Message Count': 'message_count',
  'Total Response Time': 'total_response_time',
  'Target Response Time': 'target_response_time',
  'Request Processing Latency': 'request_processing_latency',
  'Response Processing Latency': 'response_processing_latency',
  'Error Count': 'is_error',
  'Policy Error Count': 'policy_error',
  'Request Size': 'request_size',
  'Response Size': 'response_size',
};

const operatorOptions = [
  'equals', 'does not equal', 'contains',
  'greater than', 'less than',
  'greater than or equal to', 'less than or equal to',
];

// --- Apigee's filter language supports eq/ne/has/gt/lt/ge/le — no starts-with/ends-with/not-contains. ---
const OPERATOR_API_MAP = {
  equals: 'eq',
  'does not equal': 'ne',
  contains: 'has',
  'greater than': 'gt',
  'less than': 'lt',
  'greater than or equal to': 'ge',
  'less than or equal to': 'le',
};

// --- Searchable dropdown — used for Dimension / Filter name selects, matching the reference UI ---
function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full h-10 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors flex items-center justify-between"
      >
        <span className={cn(!value && 'text-gray-500')}>{value || placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full z-30 rounded-md border border-dark-700 bg-[#15192b] shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-dark-700 px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter"
              className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-dark-800/70',
                    value === opt ? 'text-primary' : 'text-gray-300',
                  )}
                >
                  {opt}
                  {value === opt && <Check className="w-3.5 h-3.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FieldLabel = ({ children }) => (
  <label className="mb-1.5 block text-sm font-medium text-gray-300">{children}</label>
);

const TextInput = (props) => (
  <input
    {...props}
    className="w-full h-10 px-3 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary"
  />
);

export default function MonitoringReport() {
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [chartType, setChartType] = useState('line');

  const [environment, setEnvironment] = useState('dev');
  const [timeRange, setTimeRange] = useState('7 days');

  const [metrics, setMetrics] = useState([
    { id: nextId(), expanded: true, metric: '', agg: { avg: false, max: false, min: false, sum: false } },
  ]);
  const [dimensions, setDimensions] = useState([
    { id: nextId(), value: '' },
  ]);
  const [filters, setFilters] = useState([]);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportResult, setReportResult] = useState(null); // { dimension, selectExprs, rows }

  const addMetric = () => setMetrics((prev) => [
    ...prev,
    { id: nextId(), expanded: true, metric: '', agg: { avg: false, max: false, min: false, sum: false } },
  ]);
  const removeMetric = (id) => setMetrics((prev) => prev.filter((m) => m.id !== id));
  const updateMetric = (id, patch) => setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const toggleMetricAgg = (id, key) => setMetrics((prev) => prev.map((m) => (
    m.id === id ? { ...m, agg: { ...m.agg, [key]: !m.agg[key] } } : m
  )));

  const addDimension = () => setDimensions((prev) => [...prev, { id: nextId(), value: '' }]);
  const removeDimension = (id) => setDimensions((prev) => prev.filter((d) => d.id !== id));
  const updateDimension = (id, value) => setDimensions((prev) => prev.map((d) => (d.id === id ? { ...d, value } : d)));
  const moveDimension = (id, dir) => setDimensions((prev) => {
    const idx = prev.findIndex((d) => d.id === id);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    return next;
  });

  const addFilter = () => setFilters((prev) => [
    ...prev,
    { id: nextId(), expanded: true, name: '', operator: '', value: '' },
  ]);
  const removeFilter = (id) => setFilters((prev) => prev.filter((f) => f.id !== id));
  const updateFilter = (id, patch) => setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  // --- Run the configured report against the live Apigee Stats API ---
  // The stats endpoint only breaks down by a single dimension per call, so the first
  // configured dimension is used as the grouping key; any additional dimensions are ignored.
  const runReport = async () => {
    setReportError(null);
    setReportResult(null);

    const primaryDimLabel = dimensions.map((d) => d.value).find(Boolean);
    const apiDimension = primaryDimLabel ? DIMENSION_API_MAP[primaryDimLabel] : null;
    if (!apiDimension) {
      setReportError('Select at least one dimension that the Apigee Stats API supports as a breakdown (Organization/Environment/Proxy Endpoint aren’t queryable this way).');
      return;
    }

    const selectExprs = [];
    metrics.forEach((m) => {
      const field = METRIC_API_MAP[m.metric];
      if (!field) return;
      ['sum', 'avg', 'min', 'max'].forEach((agg) => {
        if (m.agg[agg]) selectExprs.push(`${agg}(${field})`);
      });
    });
    if (selectExprs.length === 0) {
      setReportError('Add at least one metric with an aggregation function (avg/max/min/sum) checked.');
      return;
    }

    const filterClauses = filters
      .map((f) => {
        const dim = DIMENSION_API_MAP[f.name];
        const op = OPERATOR_API_MAP[f.operator];
        if (!dim || !op || !f.value) return null;
        return `${dim} ${op} '${f.value}'`;
      })
      .filter(Boolean);
    const filterExpr = filterClauses.length ? filterClauses.join(' and ') : undefined;

    setReportLoading(true);
    try {
      const token = await fetchApigeeToken();
      const rows = await fetchApigeeBreakdown(token, environment, apiDimension, selectExprs, timeRange, filterExpr);
      setReportResult({ dimension: apiDimension, selectExprs, rows });
    } catch (err) {
      console.error('Failed to run report:', err);
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-dark-700/60 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Report</h1>
              <p className="text-sm text-gray-400">Build a custom report from API monitoring metrics and dimensions</p>
            </div>
          </div>

          {/* Basics */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Basics</h2>
            <div className="space-y-4">
              <div>
                <TextInput
                  placeholder="Report name *"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>
              <div>
                <textarea
                  placeholder="Report Description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary resize-y"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[140px]">
                  <FieldLabel>Environment</FieldLabel>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  >
                    <option value="dev">dev</option>
                    <option value="staging">staging</option>
                    <option value="prod">prod</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-[34px] w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative min-w-[140px]">
                  <FieldLabel>Time range</FieldLabel>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  >
                    {timeRangeOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-[34px] w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Chart Type */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Chart Type</h2>
            <div className="flex flex-col gap-2">
              {[{ value: 'line', label: 'Line' }, { value: 'column', label: 'Column' }].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      chartType === opt.value ? 'border-primary' : 'border-dark-600',
                    )}
                  >
                    {chartType === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  <input
                    type="radio"
                    name="chartType"
                    value={opt.value}
                    checked={chartType === opt.value}
                    onChange={() => setChartType(opt.value)}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Metrics */}
          <section className="mb-8">
            <div className="flex items-center gap-1.5 mb-3">
              <h2 className="text-lg font-semibold text-white">Metrics</h2>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </div>

            <div className="space-y-3">
              {metrics.map((m, idx) => (
                <Card key={m.id} className="bg-[#15192b] border-dark-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      onClick={() => updateMetric(m.id, { expanded: !m.expanded })}
                      className="flex items-center gap-2 text-sm font-medium text-white"
                    >
                      {m.expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      {m.metric || `New metric${idx > 0 ? ` ${idx + 1}` : ''}`}
                    </button>
                    <button onClick={() => removeMetric(m.id)} className="p-1 text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {m.expanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <div>
                        <select
                          value={m.metric}
                          onChange={(e) => updateMetric(m.id, { metric: e.target.value })}
                          className="w-full h-10 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                        >
                          <option value="">Select a metric *</option>
                          {metricOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <p className="text-sm text-gray-300 mb-2">Aggregation function</p>
                        <div className="flex flex-wrap gap-4">
                          {['avg', 'max', 'min', 'sum'].map((key) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                              <div
                                className={cn(
                                  'flex h-4 w-4 items-center justify-center rounded border',
                                  m.agg[key] ? 'border-primary bg-primary' : 'border-dark-600 bg-dark-800/70',
                                )}
                              >
                                {m.agg[key] && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={m.agg[key]}
                                onChange={() => toggleMetricAgg(m.id, key)}
                                className="hidden"
                              />
                              <span className="text-sm text-gray-300">{key}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => updateMetric(m.id, { expanded: false })}
                          className="text-sm font-medium text-primary hover:text-primary/80"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <button
              onClick={addMetric}
              className="mt-3 w-full rounded-md border border-dashed border-dark-600 py-2.5 text-sm text-gray-400 hover:border-primary/50 hover:text-primary transition-colors"
            >
              Add a metric
            </button>
          </section>

          {/* Dimensions */}
          <section className="mb-8">
            <div className="flex items-center gap-1.5 mb-3">
              <h2 className="text-lg font-semibold text-white">Dimensions</h2>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </div>

            <div className="space-y-2">
              {dimensions.map((d, idx) => (
                <div key={d.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={d.value}
                      onChange={(val) => updateDimension(d.id, val)}
                      options={dimensionOptions}
                      placeholder={`Dimension ${idx + 1} *`}
                    />
                  </div>
                  <button
                    onClick={() => moveDimension(d.id, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-dark-800/70 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDimension(d.id, 1)}
                    disabled={idx === dimensions.length - 1}
                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-dark-800/70 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeDimension(d.id)}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-dark-800/70"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addDimension}
              className="mt-3 flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add a dimension
            </button>
          </section>

          {/* Filter */}
          <section className="mb-8">
            <div className="flex items-center gap-1.5 mb-3">
              <h2 className="text-lg font-semibold text-white">Filter</h2>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </div>

            <div className="space-y-3">
              {filters.map((f, idx) => (
                <Card key={f.id} className="bg-[#15192b] border-dark-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      onClick={() => updateFilter(f.id, { expanded: !f.expanded })}
                      className="flex items-center gap-2 text-sm font-medium text-white"
                    >
                      {f.expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      {f.name || `New filter${idx > 0 ? ` ${idx + 1}` : ''}`}
                    </button>
                    <button onClick={() => removeFilter(f.id)} className="p-1 text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {f.expanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <SearchableSelect
                        value={f.name}
                        onChange={(val) => updateFilter(f.id, { name: val })}
                        options={dimensionOptions}
                        placeholder="Select a name *"
                      />

                      <select
                        value={f.operator}
                        onChange={(e) => updateFilter(f.id, { operator: e.target.value })}
                        className="w-full h-10 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        <option value="">Select an operator *</option>
                        {operatorOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>

                      <TextInput
                        placeholder="Value *"
                        value={f.value}
                        onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={() => updateFilter(f.id, { expanded: false })}
                          className="text-sm font-medium text-primary hover:text-primary/80"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <button
              onClick={addFilter}
              className="mt-3 w-full rounded-md border border-dashed border-dark-600 py-2.5 text-sm text-gray-400 hover:border-primary/50 hover:text-primary transition-colors"
            >
              Add a filter
            </button>
          </section>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2 pb-6">
            <button
              onClick={runReport}
              disabled={!reportName || metrics.every((m) => !m.metric) || reportLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:hover:bg-primary"
            >
              {reportLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
            <button className="px-5 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>

          {/* Results */}
          {(reportLoading || reportError || reportResult) && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-white mb-3">Results</h2>

              {reportError && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {reportError}
                </div>
              )}

              {reportLoading && !reportError && (
                <div className="flex items-center gap-2 rounded-md border border-dark-700 bg-[#1a1f33] px-3 py-4 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Running report against Apigee…
                </div>
              )}

              {!reportLoading && reportResult && (
                reportResult.rows.length === 0 ? (
                  <div className="rounded-md border border-dark-700 bg-[#1a1f33] px-3 py-4 text-sm text-gray-400">
                    No data returned for the selected metrics, dimension, and filters.
                  </div>
                ) : (
                  <Card className="bg-[#15192b] border-dark-700 overflow-x-auto p-0">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-dark-700 bg-[#1a1f33] text-gray-400">
                          <th className="px-3 py-2 font-medium">{reportResult.dimension}</th>
                          {reportResult.selectExprs.map((expr) => (
                            <th key={expr} className="px-3 py-2 font-medium">{expr}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportResult.rows.map((row) => (
                          <tr key={row.name} className="border-b border-dark-800 text-gray-300">
                            <td className="px-3 py-2 font-medium text-white">{row.name || '(none)'}</td>
                            {reportResult.selectExprs.map((expr) => (
                              <td key={expr} className="px-3 py-2">
                                {Number.isFinite(row[expr]) ? Math.round(row[expr] * 100) / 100 : row[expr]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
