import React from 'react';
import { AlertCircle, Loader2, Maximize2, Minus, TrendingUp, TrendingDown, Sigma, Gauge, Hash } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { TrendChart, formatClockTime, formatFullDateTime, formatMetricValue } from './TrendChart';
import { getTimeUnitForRange } from '../../services/apigeeStatsService';

/**
 * Ad-hoc metric card — the exact same treatment API Monitoring uses for its "Metrics by
 * {dimension}" section (smooth TrendChart with hover tooltip, a trend badge in the header,
 * Total/Average/Peak/Data-Points stat tiles, and an expandable full per-timestamp table).
 * Kept here so every page driven by `ApigeeMetricsExplorer` renders identically to API
 * Monitoring instead of a separate, simpler chart.
 *
 * `points` must be `[{ timestamp, value }, ...]` (from `fetchApigeeStatsDetailed`), not the
 * bare-number arrays `fetchApigeeStats` returns.
 */
export default function MetricChartWidget({
  metricExpr,
  meta,
  points,
  notices = [],
  dimension,
  timeRange,
  isExpanded,
  onToggleExpand,
  loading = false,
  error = null,
}) {
  const data = points.map((p) => p.value);
  const isLoading = loading && points.length === 0;
  const hasError = Boolean(error) && points.length === 0;
  const currentValue = data.length > 0 ? data[data.length - 1] : 0;
  const emptyMessage = `No ${meta.label.toLowerCase()} data recorded (grouped by ${dimension}) in the selected window`;

  // --- Summary stats derived from the raw timestamp/value points ---
  const total = data.reduce((a, b) => a + b, 0);
  const avg = data.length ? total / data.length : 0;
  const peakPoint = points.length ? points.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const firstTs = points[0]?.timestamp;
  const lastTs = points[points.length - 1]?.timestamp;
  const peakShare = total > 0 && peakPoint ? (peakPoint.value / total) * 100 : 0;

  // Trend: average of the second half of the window vs. the first half — a quick read
  // on whether this metric is climbing, easing, or holding steady right now.
  let trendPct = null;
  if (points.length >= 2) {
    const mid = Math.floor(points.length / 2);
    const firstHalf = points.slice(0, mid);
    const secondHalf = points.slice(mid);
    const firstAvg = firstHalf.reduce((a, p) => a + p.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, p) => a + p.value, 0) / secondHalf.length;
    trendPct = firstAvg === 0 ? (secondAvg === 0 ? 0 : 100) : ((secondAvg - firstAvg) / firstAvg) * 100;
  }
  const TrendIcon = trendPct === null || Math.abs(trendPct) < 1 ? Minus : trendPct > 0 ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn(
        'min-w-0 bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all',
        isExpanded && 'col-span-1 md:col-span-2 xl:col-span-3 border-primary/50'
      )}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-white truncate">{meta.label}</h3>
          <p className="text-[11px] text-gray-500 font-mono truncate">{metricExpr} • grouped by {dimension}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isLoading && !hasError && points.length > 0 && (
            <div
              className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1"
              style={{ borderColor: `${meta.color}40`, background: `linear-gradient(135deg, ${meta.color}1f, transparent)` }}
              title="Latest value and trend across this window"
            >
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full"
                style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
              >
                <TrendIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-white leading-none">
                {formatMetricValue(currentValue, meta.unit)}
              </span>
              {trendPct !== null && (
                <span className={cn('text-[10px] font-medium leading-none', Math.abs(trendPct) < 1 ? 'text-gray-500' : trendPct > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {trendPct > 0 ? '+' : ''}{trendPct.toFixed(0)}%
                </span>
              )}
            </div>
          )}
          <button onClick={onToggleExpand} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white" title={isExpanded ? 'Collapse' : 'Show full details'}>
            <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
          </button>
        </div>
      </div>

      <div className={cn('w-full min-w-0 rounded-lg border border-dark-600 bg-[#1a1f33] relative overflow-hidden p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-xs">
            <AlertCircle className="w-5 h-5 mb-1" />
            <span>Failed to load</span>
          </div>
        ) : (
          <TrendChart points={points} color={meta.color} unit={meta.unit} label={meta.label} emptyMessage={emptyMessage} isExpanded={isExpanded} />
        )}
      </div>
      {points.length > 0 && (
        <p className="text-[10px] text-gray-500 mt-1">
          Hover the chart to inspect any point • range {formatClockTime(firstTs)} – {formatClockTime(lastTs)}
        </p>
      )}

      {/* --- Stat analytics: premium at-a-glance tiles for total / average / peak / coverage --- */}
      {!isLoading && !hasError && points.length > 0 && (
        <div className={cn('grid gap-3 mt-3', isExpanded ? 'grid-cols-4' : 'grid-cols-2')}>
          {[
            {
              key: 'total',
              icon: Sigma,
              label: 'Total',
              value: formatMetricValue(total, meta.unit),
              sub: `across ${points.length} point${points.length === 1 ? '' : 's'}`,
            },
            {
              key: 'average',
              icon: Gauge,
              label: 'Average',
              value: formatMetricValue(avg, meta.unit),
              sub: `per ${getTimeUnitForRange(timeRange)}`,
            },
            {
              key: 'peak',
              icon: TrendingUp,
              label: 'Peak',
              value: formatMetricValue(peakPoint?.value, meta.unit),
              sub: peakPoint ? `${formatClockTime(peakPoint.timestamp)} • ${peakShare.toFixed(0)}% of total` : '—',
            },
            {
              key: 'points',
              icon: Hash,
              label: 'Data Points',
              value: points.length.toLocaleString(),
              sub: `${formatClockTime(firstTs)} – ${formatClockTime(lastTs)}`,
            },
          ].map(({ key, icon: Icon, label, value, sub }) => (
            <div
              key={key}
              className="relative overflow-hidden rounded-xl border border-dark-700/80 bg-gradient-to-br from-[#1a1f33] to-[#15192b] px-3 pt-3 pb-2.5 shadow-sm hover:border-dark-600 transition-colors"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: meta.color, opacity: 0.7 }} />
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                  style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</span>
              </div>
              <div className="text-lg font-bold text-white leading-tight truncate">{value}</div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* --- Expanded view: full per-timestamp breakdown table + data source notice --- */}
      {isExpanded && !isLoading && !hasError && points.length > 0 && (
        <div className="mt-4 border-t border-dark-700/60 pt-3">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">All data points ({points.length})</h4>
          <div className="max-h-64 overflow-y-auto rounded-md border border-dark-700">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1a1f33] text-gray-500">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Timestamp</th>
                  <th className="text-right font-medium px-3 py-2">{meta.label}</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.timestamp} className="border-t border-dark-700/60 text-gray-300 hover:bg-dark-800/40">
                    <td className="px-3 py-1.5 font-mono">{formatFullDateTime(p.timestamp)}</td>
                    <td className="px-3 py-1.5 text-right">{formatMetricValue(p.value, meta.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {notices.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
              {notices.map((notice, i) => (
                <span key={i}>{notice}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
