import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, Check, Loader2, Maximize2 } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { fetchApigeeToken, fetchApigeeStats } from '../../services/apigeeStatsService';

// --- Available Apigee stats dimensions (single-select) — same list as API Monitoring ---
export const dimensionOptions = [
  'apiproxy',
  'apiproxy_revision',
  'developer',
  'developer_app',
  'api_product',
  'target_host',
  'target_url',
  'client_ip',
  'request_uri',
  'request_path',
  'request_verb',
  'response_status_code',
  'response_reason_phrase',
];

// --- Available Apigee stats metrics (multi-select) with display metadata — same set as API Monitoring ---
export const metricMeta = {
  'sum(message_count)': { label: 'Message Count', unit: 'reqs', color: '#ff5b1f' },
  'avg(total_response_time)': { label: 'Avg Total Response Time', unit: 'ms', color: '#8b5cf6' },
  'avg(target_response_time)': { label: 'Avg Target Response Time', unit: 'ms', color: '#8b5cf6' },
  'avg(request_processing_latency)': { label: 'Avg Request Processing Latency', unit: 'ms', color: '#8b5cf6' },
  'avg(response_processing_latency)': { label: 'Avg Response Processing Latency', unit: 'ms', color: '#8b5cf6' },
  'sum(is_error)': { label: 'Error Count', unit: 'errors', color: '#ef4444' },
  'sum(policy_error)': { label: 'Policy Error Count', unit: 'errors', color: '#ef4444' },
  'sum(request_size)': { label: 'Request Size', unit: 'bytes', color: '#eab308' },
  'sum(response_size)': { label: 'Response Size', unit: 'bytes', color: '#f472b6' },
  'min(total_response_time)': { label: 'Min Total Response Time', unit: 'ms', color: '#22c55e' },
  'max(total_response_time)': { label: 'Max Total Response Time', unit: 'ms', color: '#22c55e' },
  'sum(cache_hit)': { label: 'Cache Hits', unit: 'hits', color: '#1fbf9a' },
  'sum(ax_cache_executed)': { label: 'Cache Lookups', unit: 'lookups', color: '#06b6d4' },
};
export const metricOptions = Object.keys(metricMeta);

const ChartPlaceholder = ({ emptyMessage }) => (
  <div className="relative h-44 w-full rounded-lg border border-dark-600 bg-[#1a1f33]">
    <div className="absolute inset-0 flex flex-col justify-between px-2 py-3 pointer-events-none">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="w-full border-t border-dark-700/40 border-dashed h-0" />
      ))}
    </div>
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 px-4 text-center">
      <AlertTriangle className="h-5 w-5 opacity-50" />
      <span className="text-xs">{emptyMessage}</span>
    </div>
  </div>
);

// Empty-state for a chart that's already nested inside a bordered card (MetricChartWidget below) —
// fills the parent box rather than drawing another bordered box on top of it.
const MiniChartEmpty = ({ emptyMessage }) => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 px-4 text-center">
    <AlertTriangle className="h-4 w-4 opacity-50" />
    <span className="text-xs">{emptyMessage}</span>
  </div>
);

const MiniChart = ({ data, color = '#ff5b1f', emptyMessage }) => {
  if (!data || data.length === 0) return <MiniChartEmpty emptyMessage={emptyMessage} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const normalized = data.map((v) => ((v - min) / range) * 100);
  const points = normalized
    .map((v, i) => `${(i / (normalized.length - 1 || 1)) * 100},${100 - v}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={`explorer-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#explorer-grad-${color})`} opacity="0.8" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="5" y="15" fontSize="8" fill="#888" className="font-mono">Max: {Math.round(max)}</text>
      <text x="5" y="95" fontSize="8" fill="#888" className="font-mono">Min: {Math.round(min)}</text>
    </svg>
  );
};

/**
 * Dimension + Metric controls — the breakdown-dimension select and multi-select metric
 * dropdown, extracted so callers can place them wherever they like in their filter row
 * (e.g. right after the Proxy dropdown) while `ApigeeMetricsExplorer` renders the charts
 * driven by that same `dimension`/`selectedMetrics` state.
 */
export function ApigeeMetricsControls({
  dimension,
  onDimensionChange,
  selectedMetrics,
  onToggleMetric,
}) {
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const metricsDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (metricsDropdownRef.current && !metricsDropdownRef.current.contains(event.target)) {
        setIsMetricsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative min-w-[170px]">
        <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
          Dimension
        </label>
        <select
          value={dimension}
          onChange={(e) => onDimensionChange(e.target.value)}
          className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
        >
          {dimensionOptions.map((dim) => (
            <option key={dim} value={dim}>{dim}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>

      <div className="relative min-w-[190px]" ref={metricsDropdownRef}>
        <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
          Metric
        </label>
        <button
          onClick={() => setIsMetricsOpen((p) => !p)}
          className="w-full h-9 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors flex justify-between items-center"
        >
          <span className="truncate">
            {selectedMetrics.length === 0 ? 'Select metrics' : `${selectedMetrics.length} metric${selectedMetrics.length > 1 ? 's' : ''} selected`}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', isMetricsOpen && 'rotate-180')} />
        </button>
        {isMetricsOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 z-30 rounded-md border border-dark-700 bg-[#15192b] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
            <div className="p-1.5">
              {metricOptions.map((metricExpr) => (
                <label key={metricExpr} className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-300 hover:bg-dark-800/60 cursor-pointer">
                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', selectedMetrics.includes(metricExpr) ? 'border-primary bg-primary' : 'border-dark-600 bg-dark-800/70')}>
                    {selectedMetrics.includes(metricExpr) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input type="checkbox" checked={selectedMetrics.includes(metricExpr)} onChange={() => onToggleMetric(metricExpr)} className="hidden" />
                  <div className="min-w-0">
                    <div className="truncate">{metricMeta[metricExpr].label}</div>
                    <div className="text-[10px] text-gray-500 font-mono truncate">{metricExpr}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Dimension + Metric explorer — same mechanic as API Monitoring's ad-hoc "Metrics by {dimension}"
 * section: renders one time-series sparkline per metric expression in `selectedMetrics`, grouped
 * by `dimension` and scoped by `filterExpr` (e.g. `apiproxy eq '<proxy>'`).
 *
 * `dimension` and `selectedMetrics` are controlled by the caller (see `ApigeeMetricsControls`
 * above) so the dropdowns can live elsewhere in the page's filter row.
 */
export default function ApigeeMetricsExplorer({
  environment,
  timeRange,
  filterExpr,
  filterReady = true,
  emptyFilterMessage = 'Select a filter above to view metrics',
  dimension,
  selectedMetrics,
}) {
  const [metricData, setMetricData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedWidget, setExpandedWidget] = useState(null);

  const refresh = useCallback(async () => {
    if (!filterReady || selectedMetrics.length === 0) {
      setMetricData({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await fetchApigeeToken();
      const seriesArr = await fetchApigeeStats(token, environment, dimension, selectedMetrics, timeRange, filterExpr);
      const next = {};
      selectedMetrics.forEach((metricExpr, idx) => {
        next[metricExpr] = seriesArr[idx] || [];
      });
      setMetricData(next);
    } catch (err) {
      console.error('Failed to fetch Apigee metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [environment, dimension, selectedMetrics, timeRange, filterExpr, filterReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleExpand = (id) => setExpandedWidget((prev) => (prev === id ? null : id));

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {!filterReady ? (
        <ChartPlaceholder emptyMessage={emptyFilterMessage} />
      ) : selectedMetrics.length === 0 ? (
        <ChartPlaceholder emptyMessage="Select at least one metric to see data" />
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Metrics by <span className="text-primary">{dimension}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selectedMetrics.map((metricExpr) => {
              const meta = metricMeta[metricExpr];
              const data = metricData[metricExpr] || [];
              const isLoading = loading && !metricData[metricExpr];
              const isExpanded = expandedWidget === metricExpr;
              const currentValue = data.length > 0 ? data[data.length - 1] : 0;
              const emptyMessage = `No ${meta.label.toLowerCase()} data recorded (grouped by ${dimension}) in the selected window`;

              return (
                <Card
                  key={metricExpr}
                  className={cn(
                    'bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all',
                    isExpanded && 'col-span-1 md:col-span-2 xl:col-span-3',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-medium text-white">{meta.label}</h3>
                      <p className="text-[11px] text-gray-500 font-mono">{metricExpr}</p>
                    </div>
                    <button onClick={() => toggleExpand(metricExpr)} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
                      <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
                    </button>
                  </div>

                  <div className={cn('w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
                    <div className="absolute inset-4">
                      {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : (
                        <MiniChart data={data} color={meta.color} emptyMessage={emptyMessage} />
                      )}
                    </div>
                    <div className="absolute top-2 right-3 text-xs text-gray-300 bg-[#1a1f33]/80 px-2 py-0.5 rounded">
                      {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue} {meta.unit}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
