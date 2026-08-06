import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Maximize2,
  MoreVertical,
  BarChart2,
  ChevronDown,
  ExternalLink,
  Check,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sigma,
  Gauge,
  Hash,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { cn } from '../lib/utils';
import {
  fetchApigeeToken,
  fetchApigeeProxies,
  fetchApigeeStats as fetchApigeeStatsShared,
  fetchApigeeStatsDetailed,
  getTimeUnitForRange,
  getTimeRangeMs,
} from '../services/apigeeStatsService';
import '../index.css';

// --- Empty-state copy per graph: emptiness means different things per metric ---
const emptyMessageByGraph = {
  Traffic: 'No traffic recorded for this proxy in the selected window',
  'Error Rate': 'No requests recorded for this proxy in the selected window, so an error rate can’t be calculated',
  Latency: 'No response time data recorded for this proxy in the selected window',
  Throughput: 'No traffic recorded for this proxy in the selected window, so throughput can’t be calculated',
  'Cache Hit': 'No cache activity recorded — this proxy may not use response caching, or it wasn’t triggered in the selected window',
  'Request Size': 'No request payload data recorded for this proxy in the selected window',
  Bandwidth: 'No response payload data recorded for this proxy in the selected window',
};

// --- Available Apigee stats dimensions (single-select) ---
const dimensionOptions = [
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

// --- Available Apigee stats metrics (multi-select) with display metadata ---
const metricMeta = {
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
};
const metricOptions = Object.keys(metricMeta);

// --- Helper: Call the Apigee Stats API for a given dimension/select, scoped to one proxy ---
const fetchApigeeStats = (token, environment, dimension, proxyName, selectExprs, timeRange) =>
  fetchApigeeStatsShared(token, environment, dimension, selectExprs, timeRange, `apiproxy eq '${proxyName}'`);

// --- Helper: Build Apigee Stats API URL and fetch data for a single canned graph metric ---
const fetchApigeeMetric = async (token, environment, proxyName, metric, timeRange, dimension) => {
  const timeUnit = getTimeUnitForRange(timeRange);
  const bucketSeconds = timeUnit === 'minute' ? 60 : 3600;

  // Determine Apigee stats select expression(s) based on metric
  let selectExprs = [];
  let transform = (series) => series[0] || [];

  switch (metric) {
    case 'Traffic':
      selectExprs = ['sum(message_count)'];
      break;
    case 'Error Rate':
      selectExprs = ['sum(is_error)', 'sum(message_count)'];
      transform = ([errorSeries, totalSeries]) => {
        const length = Math.max(errorSeries.length, totalSeries.length);
        return Array.from({ length }, (_, i) => {
          const total = totalSeries[i] || 0;
          return total === 0 ? 0 : ((errorSeries[i] || 0) / total) * 100;
        });
      };
      break;
    case 'Latency':
      selectExprs = ['avg(total_response_time)'];
      break;
    case 'Throughput':
      selectExprs = ['sum(message_count)'];
      transform = ([series]) => series.map((v) => v / bucketSeconds);
      break;
    case 'Cache Hit':
      selectExprs = ['sum(cache_hit)', 'sum(ax_cache_executed)'];
      transform = ([hitSeries, totalSeries]) => {
        const length = Math.max(hitSeries.length, totalSeries.length);
        return Array.from({ length }, (_, i) => {
          const total = totalSeries[i] || 0;
          return total === 0 ? 0 : ((hitSeries[i] || 0) / total) * 100;
        });
      };
      break;
    case 'Request Size':
      selectExprs = ['avg(request_size)'];
      break;
    case 'Bandwidth':
      selectExprs = ['sum(response_size)'];
      break;
    default:
      selectExprs = ['sum(message_count)'];
  }

  const seriesPerSelect = await fetchApigeeStats(token, environment, dimension, proxyName, selectExprs, timeRange);

  return transform(seriesPerSelect);
};

// --- Format helpers for turning raw epoch-ms timestamps into readable labels ---
const formatClockTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const formatFullDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
const formatMetricValue = (value, unit) => {
  const n = typeof value === 'number' ? value : parseFloat(value) || 0;
  const rounded = Number.isInteger(n) ? n : Math.round(n * 100) / 100;
  return `${rounded.toLocaleString()}${unit ? ` ${unit}` : ''}`;
};

// --- Catmull-Rom → cubic-Bézier smoothing, so the line reads as a soft curve instead of
// jagged straight segments (the look every modern analytics dashboard — Vercel, Linear,
// Stripe — uses for a time series). Falls back to a straight segment for 2 points.
const buildSmoothPath = (coords) => {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0][0]},${coords[0][1]}`;
  if (coords.length === 2) return `M ${coords[0][0]},${coords[0][1]} L ${coords[1][0]},${coords[1][1]}`;
  let d = `M ${coords[0][0]},${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
};

// --- Trend Chart: a smooth gradient-fill line with a tracking crosshair and a floating
// tooltip card — the current standard for time-series analytics UI (Vercel Analytics,
// Linear Insights, Stripe Dashboard). One point is always direct-labeled (the latest);
// every other point's exact value/time surfaces on hover instead of being printed on the
// chart, so the line stays clean at any density.
const TrendChart = ({ points, color = '#ff5b1f', unit = '', label = '', emptyMessage, isExpanded = false }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(280);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth || 280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!points || points.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center text-gray-500 text-xs px-4">
        {emptyMessage}
      </div>
    );
  }

  const n = points.length;
  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin || Math.max(Math.abs(rawMax), 1) * 0.2;
  const pad = range * 0.15;
  const scaleMin = rawMin >= 0 ? Math.max(0, rawMin - pad) : rawMin - pad;
  const scaleMax = rawMax + pad || 1;
  const span = scaleMax - scaleMin || 1;

  const topMargin = 18;
  const bottomSpace = 20;
  const plotHeight = isExpanded ? 210 : 92;
  const height = topMargin + plotHeight + bottomSpace;

  const xAt = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const yAt = (v) => topMargin + plotHeight * (1 - (v - scaleMin) / span);
  const coords = points.map((p, i) => [xAt(i), yAt(p.value)]);

  const linePath = buildSmoothPath(coords);
  const baselineY = topMargin + plotHeight;
  const areaPath = `${linePath} L ${coords[n - 1][0]},${baselineY} L ${coords[0][0]},${baselineY} Z`;

  const gridLevels = [1, 0.5, 0];
  const gradId = `trend-grad-${color.replace('#', '')}`;

  const handleMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHoverIndex(n === 1 ? 0 : Math.round(fraction * (n - 1)));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;
  const lastCoord = coords[n - 1];

  const tooltipWidthPx = 172;
  const halfTooltip = tooltipWidthPx / 2 + 6;
  const clampedLeft = hoveredCoord
    ? Math.min(Math.max(hoveredCoord[0], halfTooltip), Math.max(width - halfTooltip, halfTooltip))
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-crosshair"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLevels.map((lvl) => {
          const y = topMargin + plotHeight * (1 - lvl);
          const val = scaleMin + span * lvl;
          return (
            <g key={lvl}>
              <line x1={0} x2={width} y1={y} y2={y} stroke="#232a42" strokeWidth="1" />
              <text x={2} y={y - 3} fontSize="9" fill="#5b6478" className="font-mono">
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Direct label: only the latest point is ever labeled on the chart itself */}
        <circle cx={lastCoord[0]} cy={lastCoord[1]} r="4" fill={color} stroke="#1a1f33" strokeWidth="2" />

        <text x={2} y={height - 5} fontSize="9" fill="#5b6478">{formatClockTime(points[0].timestamp)}</text>
        <text x={width - 2} y={height - 5} fontSize="9" fill="#5b6478" textAnchor="end">{formatClockTime(points[n - 1].timestamp)}</text>

        {hoveredCoord && (
          <>
            <line x1={hoveredCoord[0]} x2={hoveredCoord[0]} y1={topMargin} y2={baselineY} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.65" />
            <circle cx={hoveredCoord[0]} cy={hoveredCoord[1]} r="4.5" fill={color} stroke="#1a1f33" strokeWidth="2" />
          </>
        )}
      </svg>

      {/* Floating tooltip card — every value a bare-hover reader needs, in one place */}
      {hovered && (
        <div
          className="absolute top-0 pointer-events-none z-20 rounded-lg border border-dark-600 bg-[#0e172a]/95 backdrop-blur-sm shadow-xl px-3 py-2"
          style={{ left: clampedLeft, width: tooltipWidthPx, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 truncate">{label}</span>
          </div>
          <div className="text-base font-bold text-white leading-none">{formatMetricValue(hovered.value, unit)}</div>
          <div className="text-[10px] text-gray-500 mt-1">{formatFullDateTime(hovered.timestamp)}</div>
        </div>
      )}
    </div>
  );
};

export default function ProxyMonitoring({ showHeader = true }) {
  const navigate = useNavigate();

  const [view, setView] = useState('timeline');
  const [timeRange, setTimeRange] = useState('1 hour');
  const [environment, setEnvironment] = useState('dev');
  const [region, setRegion] = useState('us-central1');
  const [proxy, setProxy] = useState('');
  const [apiProxies, setApiProxies] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(false);
  const [proxiesError, setProxiesError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isGraphsOpen, setIsGraphsOpen] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [expandedWidget, setExpandedWidget] = useState(null);
  // Which canned-graph card currently has its Total/Average/Peak/Min breakdown open —
  // toggled by the BarChart2 ("stats") button beside that card's Maximize button.
  const [statsWidget, setStatsWidget] = useState(null);

  const graphOptions =['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size', 'Bandwidth'];
  const [selectedGraphs, setSelectedGraphs] = useState(['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size']);

  const [dimension, setDimension] = useState('apiproxy');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  // metricData[expr] = [{ timestamp, value }, ...] sorted oldest → newest
  const [metricData, setMetricData] = useState({});
  const [metricNotices, setMetricNotices] = useState([]);

  const [liveData, setLiveData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const graphsDropdownRef = useRef(null);
  const metricsDropdownRef = useRef(null);

  // --- Token fetch ---
  const fetchToken = async () => {
    try {
      return await fetchApigeeToken();
    } catch (err) {
      console.error('Token fetch error:', err);
      setProxiesError('Failed to obtain access token');
      return null;
    }
  };

  // --- Fetch proxies from API ---
  const fetchProxies = async () => {
    setLoadingProxies(true);
    setProxiesError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Failed to obtain access token');
      const proxiesList = await fetchApigeeProxies(token);
      setApiProxies(proxiesList);
      if (proxiesList.length > 0 && !proxy) {
        setProxy(proxiesList[0].name);
      }
    } catch (err) {
      console.error('Error fetching proxies:', err);
      setProxiesError(err.message);
    } finally {
      setLoadingProxies(false);
    }
  };

  useEffect(() => {
    fetchProxies();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (graphsDropdownRef.current && !graphsDropdownRef.current.contains(event.target)) {
        setIsGraphsOpen(false);
      }
      if (metricsDropdownRef.current && !metricsDropdownRef.current.contains(event.target)) {
        setIsMetricsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Main data refresh: call Apigee Stats API for each selected graph and ad-hoc metric ---
  const refreshData = async () => {
    if ((selectedGraphs.length === 0 && selectedMetrics.length === 0) || !proxy) {
      setLiveData({});
      setMetricData({});
      setMetricNotices([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await fetchToken();
      if (!token) throw new Error('Unable to get access token');

      const [graphResults, metricResult] = await Promise.all([
        Promise.all(
          selectedGraphs.map(async (graphTitle) => {
            const dataPoints = await fetchApigeeMetric(token, environment, proxy, graphTitle, timeRange, dimension);
            return { title: graphTitle, data: dataPoints };
          })
        ),
        // All selected metrics are requested in a single combined `select=m1,m2,...` call,
        // matching the Apigee Stats API's multi-metric query pattern (one call, comma-joined select).
        selectedMetrics.length > 0
          ? fetchApigeeStatsDetailed(token, environment, dimension, selectedMetrics, timeRange, `apiproxy eq '${proxy}'`)
          : Promise.resolve({ series: {}, notices: [] }),
      ]);

      const newLiveData = {};
      graphResults.forEach(({ title, data }) => {
        newLiveData[title] = data;
      });
      setLiveData(newLiveData);

      setMetricData(metricResult.series || {});
      setMetricNotices(metricResult.notices || []);

      setRefreshTimestamp(Date.now());
    } catch (err) {
      console.error('Failed to fetch Apigee metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proxy) {
      refreshData();
    }
  }, [environment, proxy, selectedGraphs, selectedMetrics, timeRange, dimension]);

  useEffect(() => {
    let interval = null;
    if (autoRefresh && proxy) {
      interval = setInterval(() => refreshData(), 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, environment, proxy, selectedGraphs, selectedMetrics, timeRange, dimension]);

  const toggleGraph = (graphName) => {
    setSelectedGraphs((prev) =>
      prev.includes(graphName) ? prev.filter((g) => g !== graphName) : [...prev, graphName]
    );
  };

  const toggleMetric = (metricExpr) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricExpr) ? prev.filter((m) => m !== metricExpr) : [...prev, metricExpr]
    );
  };

  const handleExpandToggle = (widgetId) => {
    setExpandedWidget((prev) => (prev === widgetId ? null : widgetId));
  };

  const handleStatsToggle = (widgetId) => {
    setStatsWidget((prev) => (prev === widgetId ? null : widgetId));
  };

  const handleOpenAlert = () => {
    alert('🔔 Alerts view\nAPI Error Rate > 5% detected\nTraffic spike detected on Proxy A');
  };

  const handleOpenDashboard = () => {
    navigate('/api-dashboard');
  };

  // --- Chart Widget Component (UI unchanged) ---
  const ChartWidget = ({ title, id }) => {
    const data = liveData[title] || [];
    const isLoading = loading && !liveData[title];
    const hasError = error && !liveData[title];

    let color = '#ff5b1f';
    let unit = 'req/s';
    if (title.toLowerCase().includes('error')) {
      color = '#ef4444';
      unit = '%';
    } else if (title.toLowerCase().includes('latency')) {
      color = '#8b5cf6';
      unit = 'ms';
    } else if (title.toLowerCase().includes('throughput')) {
      color = '#22c55e';
      unit = 'tps';
    } else if (title.toLowerCase().includes('cache')) {
      color = '#06b6d4';
      unit = '%';
    } else if (title.toLowerCase().includes('size')) {
      color = '#eab308';
      unit = 'KB';
    } else if (title.toLowerCase().includes('bandwidth')) {
      color = '#f472b6';
      unit = 'bytes';
    }

    const isExpanded = expandedWidget === id;
    const showStats = statsWidget === id;
    const currentValue = data.length > 0 ? data[data.length - 1] : 0;
    const emptyMessage = emptyMessageByGraph[title] || 'No data recorded for this proxy in the selected window';

    const total = data.reduce((a, b) => a + b, 0);
    const avg = data.length ? total / data.length : 0;
    const peak = data.length ? Math.max(...data) : 0;
    const minVal = data.length ? Math.min(...data) : 0;

    // Canned/derived graphs (Error Rate, Cache Hit, Throughput, ...) combine multiple
    // Apigee selects client-side and only carry bare values — reconstruct each bucket's
    // approximate timestamp by spreading them evenly across the selected time window so
    // the chart's hover tooltip can still show a real time, not just an index.
    const { startMs, endMs } = getTimeRangeMs(timeRange);
    const points = data.map((value, i) => ({
      timestamp: data.length === 1 ? endMs : startMs + (i / (data.length - 1)) * (endMs - startMs),
      value,
    }));

    return (
      <Card
        className={cn(
          'bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all',
          isExpanded && 'col-span-1 md:col-span-2 border-primary/50'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium text-white">{title}</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleStatsToggle(id)}
              className={cn('p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white', showStats && 'bg-dark-800/80 text-primary')}
              title={showStats ? 'Hide stats' : 'Show stats'}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleExpandToggle(id)} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white" title={isExpanded ? 'Collapse' : 'Expand'}>
              <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
            </button>
            <button className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={cn('w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
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
            <TrendChart points={points} color={color} unit={unit} label={title} emptyMessage={emptyMessage} isExpanded={isExpanded} />
          )}
          {!isLoading && !hasError && data.length > 0 && (
            <div className="absolute top-2 right-3 text-xs text-gray-300 bg-[#1a1f33]/80 px-2 py-0.5 rounded pointer-events-none">
              {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue} {unit}
            </div>
          )}
          {isExpanded && !isLoading && !hasError && data.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1f33]/90 px-3 py-1 rounded text-xs text-gray-400 border border-dark-600">
              Showing {data.length} data points • Updated {new Date(refreshTimestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* --- Stats panel: toggled by the BarChart2 button beside Maximize --- */}
        {showStats && !isLoading && !hasError && data.length > 0 && (
          <div className={cn('grid gap-3 mt-3', isExpanded ? 'grid-cols-4' : 'grid-cols-2')}>
            {[
              { key: 'total', icon: Sigma, label: 'Total', value: total },
              { key: 'average', icon: Gauge, label: 'Average', value: avg },
              { key: 'peak', icon: TrendingUp, label: 'Peak', value: peak },
              { key: 'min', icon: TrendingDown, label: 'Min', value: minVal },
            ].map(({ key, icon: Icon, label, value }) => (
              <div
                key={key}
                className="relative overflow-hidden rounded-xl border border-dark-700/80 bg-gradient-to-br from-[#1a1f33] to-[#15192b] px-3 pt-3 pb-2.5 shadow-sm hover:border-dark-600 transition-colors"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color, opacity: 0.7 }} />
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md shrink-0" style={{ backgroundColor: `${color}22`, color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</span>
                </div>
                <div className="text-lg font-bold text-white leading-tight truncate">{formatMetricValue(value, unit)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  const renderTimelineView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {selectedGraphs.map((graphTitle) => (
        <ChartWidget key={graphTitle} title={graphTitle} id={graphTitle} />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {selectedGraphs.map((graphTitle) => (
        <ChartWidget key={graphTitle} title={graphTitle} id={graphTitle} />
      ))}
    </div>
  );

  // --- Ad-hoc Metric Widget: driven by the Dimension/Metric filters, independent of the canned Graphs ---
  const MetricChartWidget = ({ metricExpr, id }) => {
    const points = metricData[metricExpr] || [];
    const data = points.map((p) => p.value);
    const isLoading = loading && !metricData[metricExpr];
    const hasError = error && !metricData[metricExpr];
    const meta = metricMeta[metricExpr] || { label: metricExpr, unit: '', color: '#ff5b1f' };

    const isExpanded = expandedWidget === id;
    const currentValue = data.length > 0 ? data[data.length - 1] : 0;
    const emptyMessage = `No ${meta.label.toLowerCase()} data recorded for this proxy (grouped by ${dimension}) in the selected window`;

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
          'bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all',
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
            <button onClick={() => handleExpandToggle(id)} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white" title={isExpanded ? 'Collapse' : 'Show full details'}>
              <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
            </button>
          </div>
        </div>

        <div className={cn('w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
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
            {metricNotices.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                {metricNotices.map((notice, i) => (
                  <span key={i}>{notice}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  const renderMetricsSection = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">
          Metrics by <span className="text-primary">{dimension}</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {selectedMetrics.map((metricExpr) => (
          <MetricChartWidget key={metricExpr} metricExpr={metricExpr} id={metricExpr} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          {/* Header Section */}
          <div className="flex items-center justify-between pb-4 border-b border-dark-700/60 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">API Monitoring</h1>
                <p className="text-sm text-gray-400">
                  {view === 'timeline' ? 'Time-series view' : 'List view'} • {selectedGraphs.length} graphs
                  {selectedMetrics.length > 0 && ` • ${selectedMetrics.length} metrics`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={handleOpenAlert} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                Alert <ExternalLink className="w-3 h-3" />
              </button>
              <button onClick={handleOpenDashboard} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                Dashboard <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Filters & Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* View Dropdown */}
            <div className="relative min-w-[100px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">View</label>
              <select value={view} onChange={(e) => setView(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
                <option value="timeline">timeline</option>
                <option value="list">list</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Graphs Dropdown */}
            <div className="relative min-w-[160px]" ref={graphsDropdownRef}>
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Graphs</label>
              <button onClick={() => setIsGraphsOpen(!isGraphsOpen)} className="w-full h-9 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors flex justify-between items-center">
                <span className="truncate">{selectedGraphs.length} graphs selected</span>
                <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', isGraphsOpen && 'rotate-180')} />
              </button>
              {isGraphsOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 z-30 rounded-md border border-dark-700 bg-[#15192b] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                  <div className="p-1.5">
                    {graphOptions.map((graph) => (
                      <label key={graph} className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-300 hover:bg-dark-800/60 cursor-pointer">
                        <div className={cn('w-4 h-4 rounded border flex items-center justify-center', selectedGraphs.includes(graph) ? 'border-primary bg-primary' : 'border-dark-600 bg-dark-800/70')}>
                          {selectedGraphs.includes(graph) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input type="checkbox" checked={selectedGraphs.includes(graph)} onChange={() => toggleGraph(graph)} className="hidden" />
                        {graph}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Environment */}
            <div className="relative min-w-[100px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Env</label>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
                <option value="dev">dev</option>
                <option value="staging">staging</option>
                <option value="prod">prod</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Region (UI only) */}
            <div className="relative min-w-[120px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
                <option value="north-america">North America</option>
                <option value="latam">LATAM</option>
                <option value="emea">EMEA</option>
                <option value="apac">APAC</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Proxy Dropdown - Dynamically populated */}
            <div className="relative min-w-[140px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Proxy</label>
              {loadingProxies ? (
                <div className="w-full h-9 flex items-center justify-center rounded-md border border-dark-700 bg-[#1a1f33] text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : proxiesError ? (
                <div className="w-full h-9 flex items-center justify-between px-3 rounded-md border border-red-500/50 bg-[#1a1f33] text-red-400 text-xs">
                  <span>Error loading proxies</span>
                  <button onClick={fetchProxies} className="ml-2 underline">Retry</button>
                </div>
              ) : (
                <select
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  disabled={apiProxies.length === 0}
                >
                  {apiProxies.length === 0 && <option value="" disabled>No proxies available</option>}
                  {apiProxies.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              )}
              {!loadingProxies && !proxiesError && (
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              )}
            </div>

            {/* Dimension Dropdown — moved up right after Proxy */}
            <div className="relative min-w-[160px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Dimension</label>
              <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
                {dimensionOptions.map((dim) => (
                  <option key={dim} value={dim}>{dim}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Metric Multi-select Dropdown — moved up right after Proxy */}
            <div className="relative min-w-[170px]" ref={metricsDropdownRef}>
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Metric</label>
              <button onClick={() => setIsMetricsOpen(!isMetricsOpen)} className="w-full h-9 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors flex justify-between items-center">
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
                        <input type="checkbox" checked={selectedMetrics.includes(metricExpr)} onChange={() => toggleMetric(metricExpr)} className="hidden" />
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

            {/* Auto Refresh + Time Range */}
            <div className="flex items-center gap-2">
              <button onClick={() => setAutoRefresh(!autoRefresh)} className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors', autoRefresh ? 'bg-primary' : 'bg-dark-700')}>
                <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200', autoRefresh ? 'translate-x-[1.125rem]' : 'translate-x-1')} />
              </button>
              <span className="text-xs text-gray-300 select-none">Auto Refresh</span>
              <div className="relative min-w-[80px]">
                <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Range</label>
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="w-full h-8 pl-2 pr-6 text-xs rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
                  <option value="1 hour">1 hour</option>
                  <option value="6 hours">6 hours</option>
                  <option value="24 hours">24 hours</option>
                  <option value="7 days">7 days</option>
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between mb-4 px-4 py-2 bg-dark-900/50 border border-dark-700 rounded-lg text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Last refresh: {new Date(refreshTimestamp).toLocaleTimeString()}</span>
              {autoRefresh && <span className="text-green-400 ml-1">Auto-refresh every 5s</span>}
            </div>
            <div className="flex items-center gap-4">
              <span>Environment: <span className="text-white">{environment}</span></span>
              <span>Proxy: <span className="text-white">{proxy}</span></span>
            </div>
          </div>

          {/* Content */}
          {!proxy ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-dark-900/20 rounded-lg border border-dashed border-dark-700">
              <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
              <p className="text-lg font-medium">Loading proxies...</p>
              <p className="text-sm">Please wait while we fetch available API proxies.</p>
            </div>
          ) : (
            <>
              {selectedGraphs.length === 0 ? (
                selectedMetrics.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-dark-900/20 rounded-lg border border-dashed border-dark-700">
                    <BarChart2 className="w-12 h-12 mb-4 opacity-40" />
                    <p className="text-lg font-medium">No graphs or metrics selected</p>
                    <p className="text-sm">Select at least one graph or metric from the dropdowns above</p>
                  </div>
                )
              ) : view === 'timeline' ? renderTimelineView() : renderListView()}

              {selectedMetrics.length > 0 && renderMetricsSection()}
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img src="/assets/justlogo.png" alt="ProbeStack logo" className="h-6 w-auto" onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span className="text-gray-400">© {new Date().getFullYear()} All rights reserved</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Terms of Service</a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}







// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Activity,
//   AlertCircle,
//   Maximize2,
//   MoreVertical,
//   BarChart2,
//   ChevronDown,
//   ExternalLink,
//   Check,
//   Clock,
//   Loader2,
// } from 'lucide-react';
// import { Card } from '../components/ui/card';
// import Header from '../components/ui/header';
// import { cn } from '../lib/utils';
// import { fetchApigeeMetrics } from '../services/apigeeApiService'; // ✅ changed import
// import '../index.css';

// // --- Mini Sparkline Chart Component (unchanged) ---
// const MiniChart = ({ data, color = '#ff5b1f', showLabels = true }) => {
//   if (!data || data.length === 0) {
//     return (
//       <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
//         No data
//       </div>
//     );
//   }
//   const max = Math.max(...data);
//   const min = Math.min(...data);
//   const range = max - min || 1;
//   const normalized = data.map((v) => ((v - min) / range) * 100);

//   const points = normalized
//     .map((v, i) => {
//       const x = (i / (normalized.length - 1)) * 100;
//       const y = 100 - v;
//       return `${x},${y}`;
//     })
//     .join(' ');

//   return (
//     <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
//       <defs>
//         <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
//           <stop offset="0%" stopColor={color} stopOpacity="0.4" />
//           <stop offset="100%" stopColor={color} stopOpacity="0.05" />
//         </linearGradient>
//       </defs>
//       <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color})`} opacity="0.8" />
//       <polyline
//         points={points}
//         fill="none"
//         stroke={color}
//         strokeWidth="2.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       {normalized.map((v, i) => (
//         <circle
//           key={i}
//           cx={(i / (normalized.length - 1)) * 100}
//           cy={100 - v}
//           r="2"
//           fill={color}
//           className="transition-opacity hover:opacity-100"
//         />
//       ))}
//       {showLabels && (
//         <>
//           <text x="5" y="15" fontSize="8" fill="#888" className="font-mono">
//             Max: {Math.round(max)}
//           </text>
//           <text x="5" y="95" fontSize="8" fill="#888" className="font-mono">
//             Min: {Math.round(min)}
//           </text>
//         </>
//       )}
//     </svg>
//   );
// };

// export default function ProxyMonitoring({ showHeader = true }) {
//   const navigate = useNavigate();

//   const [view, setView] = useState('timeline');
//   const [timeRange, setTimeRange] = useState('1 hour');
//   const [environment, setEnvironment] = useState('dev');
//   const [region, setRegion] = useState('us-central1');
//   const [proxy, setProxy] = useState(''); // was 'api-gateway-prod'
// const [apiProxies, setApiProxies] = useState([]);
// const [loadingProxies, setLoadingProxies] = useState(false);
// const [proxiesError, setProxiesError] = useState(null);
//   const [autoRefresh, setAutoRefresh] = useState(false);
//   const [isGraphsOpen, setIsGraphsOpen] = useState(false);
//   const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
//   const [expandedWidget, setExpandedWidget] = useState(null);

//   const graphOptions = ['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size', 'Bandwidth'];
//   const [selectedGraphs, setSelectedGraphs] = useState(['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size']);

//   const [liveData, setLiveData] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const graphsDropdownRef = useRef(null);

//   const fetchToken = async () => {
//     try {
//       const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
//       if (!res.ok) throw new Error(`Token service error: ${res.status}`);
//       const data = await res.json();
//       return data.access_token;
//     } catch (err) {
//       console.error('Token fetch error:', err);
//       setProxiesError('Failed to obtain access token');
//       return null;
//     }
//   };

//   // --- Fetch proxies from API ---
//   const fetchProxies = async () => {
//     setLoadingProxies(true);
//     setProxiesError(null);
//     try {
//       const token = await fetchToken();
//       if (!token) {
//         throw new Error('Failed to obtain access token');
//       }
//       const response = await fetch('https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/apis/details', {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });
//       if (!response.ok) {
//         throw new Error(`Failed to fetch proxies: ${response.statusText}`);
//       }
//       const data = await response.json();
//       // Expecting an array of proxy objects under 'proxies' key
//       const proxiesList = data.proxies || [];
//       setApiProxies(proxiesList);
//       // Set default proxy to the first one if available and none selected
//       if (proxiesList.length > 0 && !proxy) {
//         setProxy(proxiesList[0].name);
//       }
//     } catch (err) {
//       console.error('Error fetching proxies:', err);
//       setProxiesError(err.message);
//     } finally {
//       setLoadingProxies(false);
//     }
//   };

//   // Load proxies on component mount
//   useEffect(() => {
//     fetchProxies();
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (graphsDropdownRef.current && !graphsDropdownRef.current.contains(event.target)) {
//         setIsGraphsOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const refreshData = async () => {
//     if (selectedGraphs.length === 0 || !proxy) {
//       setLiveData({});
//       setError(null);
//       return;
//     }
//     setLoading(true);
//     setError(null);
//     try {
//       const metrics = await fetchApigeeMetrics(environment, proxy, selectedGraphs, timeRange);
//       setLiveData(metrics);
//       setRefreshTimestamp(Date.now());
//     } catch (err) {
//       console.error('Failed to fetch Apigee metrics:', err);
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (proxy) {   
//     refreshData();
//   }
//   }, [environment, proxy, selectedGraphs, timeRange]);

//   useEffect(() => {
//     let interval = null;
//     if (autoRefresh && proxy) {
//       interval = setInterval(() => refreshData(), 5000);
//     }
//     return () => { if (interval) clearInterval(interval); };
//   }, [autoRefresh, environment, proxy, selectedGraphs, timeRange]);

//   const toggleGraph = (graphName) => {
//     setSelectedGraphs((prev) =>
//       prev.includes(graphName) ? prev.filter((g) => g !== graphName) : [...prev, graphName]
//     );
//   };

//   const handleExpandToggle = (widgetId) => {
//     setExpandedWidget((prev) => (prev === widgetId ? null : widgetId));
//   };

//   const handleOpenAlert = () => {
//     alert('🔔 Alerts view\nAPI Error Rate > 5% detected\nTraffic spike detected on Proxy A');
//   };

//   const handleOpenDashboard = () => {
//     navigate('/api-dashboard');
//   };

//   const ChartWidget = ({ title, id }) => {
//     const data = liveData[title] || [];
//     const isLoading = loading && !liveData[title];
//     const hasError = error && !liveData[title];

//     let color = '#ff5b1f';
//     let unit = 'req/s';
//     if (title.toLowerCase().includes('error')) {
//       color = '#ef4444';
//       unit = '%';
//     } else if (title.toLowerCase().includes('latency')) {
//       color = '#8b5cf6';
//       unit = 'ms';
//     } else if (title.toLowerCase().includes('throughput')) {
//       color = '#22c55e';
//       unit = 'tps';
//     } else if (title.toLowerCase().includes('cache')) {
//       color = '#06b6d4';
//       unit = '%';
//     } else if (title.toLowerCase().includes('size')) {
//       color = '#eab308';
//       unit = 'KB';
//     } else if (title.toLowerCase().includes('bandwidth')) {
//       color = '#f472b6';
//       unit = 'bytes';
//     }

//     const isExpanded = expandedWidget === id;
//     const currentValue = data.length > 0 ? data[data.length - 1] : 0;

//     return (
//       <Card
//         className={cn(
//           'bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all',
//           isExpanded && 'col-span-1 md:col-span-2 border-primary/50'
//         )}
//       >
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-base font-medium text-white">{title}</h3>
//           <div className="flex items-center gap-1.5">
//             <button className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
//               <BarChart2 className="w-4 h-4" />
//             </button>
//             <button onClick={() => handleExpandToggle(id)} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
//               <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
//             </button>
//             <button className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
//               <MoreVertical className="w-4 h-4" />
//             </button>
//           </div>
//         </div>

//         <div className={cn('w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
//           <div className="absolute inset-0 flex flex-col justify-between px-2 py-3 pointer-events-none">
//             {[0, 1, 2, 3, 4].map((i) => (
//               <div key={i} className="w-full border-t border-dark-700/40 border-dashed h-0" />
//             ))}
//           </div>
//           <div className={cn('absolute inset-4', isExpanded && 'inset-8')}>
//             {isLoading ? (
//               <div className="w-full h-full flex items-center justify-center">
//                 <Loader2 className="w-6 h-6 text-primary animate-spin" />
//               </div>
//             ) : hasError ? (
//               <div className="w-full h-full flex flex-col items-center justify-center text-red-400 text-xs">
//                 <AlertCircle className="w-5 h-5 mb-1" />
//                 <span>Failed to load</span>
//               </div>
//             ) : (
//               <MiniChart data={data} color={color} showLabels={isExpanded} />
//             )}
//           </div>
//           <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-[10px] text-gray-500">
//             <span>{timeRange === '1 hour' ? '00:00' : timeRange === '6 hours' ? '06:00' : '12:00'}</span>
//             <span>Now</span>
//           </div>
//           <div className="absolute top-2 right-3 text-xs text-gray-300 bg-[#1a1f33]/80 px-2 py-0.5 rounded">
//             {currentValue.toFixed(1)} {unit}
//           </div>
//           {isExpanded && !isLoading && !hasError && data.length > 0 && (
//             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1f33]/90 px-3 py-1 rounded text-xs text-gray-400 border border-dark-600">
//               Showing {data.length} data points • Updated {new Date(refreshTimestamp).toLocaleTimeString()}
//             </div>
//           )}
//         </div>
//       </Card>
//     );
//   };

//   const renderTimelineView = () => (
//     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
//       {selectedGraphs.map((graphTitle) => (
//         <ChartWidget key={graphTitle} title={graphTitle} id={graphTitle} />
//       ))}
//     </div>
//   );

//   const renderListView = () => (
//     <div className="space-y-4">
//       {selectedGraphs.map((graphTitle) => (
//         <ChartWidget key={graphTitle} title={graphTitle} id={graphTitle} />
//       ))}
//     </div>
//   );

//   return (
//     <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
//       {showHeader && <Header activePage="proxy-monitoring" />}
//       <main className="flex-1 overflow-auto">
//         <div className="mx-auto max-w-[1600px] px-6 py-6">
//           {/* Header Section */}
//           <div className="flex items-center justify-between pb-4 border-b border-dark-700/60 mb-4">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
//                 <Activity className="w-5 h-5 text-primary" />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold text-white">API Monitoring</h1>
//                 <p className="text-sm text-gray-400">
//                   {view === 'timeline' ? 'Time-series view' : 'List view'} • {selectedGraphs.length} metrics
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-center gap-6">
//               <button onClick={handleOpenAlert} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
//                 Alert <ExternalLink className="w-3 h-3" />
//               </button>
//               <button onClick={handleOpenDashboard} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
//                 Dashboard <ExternalLink className="w-3 h-3" />
//               </button>
//             </div>
//           </div>

//           {/* Filters & Controls */}
//           <div className="flex flex-wrap items-center gap-3 mb-6">
//             {/* View Dropdown */}
//             <div className="relative min-w-[100px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">View</label>
//               <select value={view} onChange={(e) => setView(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
//                 <option value="timeline">timeline</option>
//                 <option value="list">list</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Graphs Dropdown */}
//             <div className="relative min-w-[160px]" ref={graphsDropdownRef}>
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Graphs</label>
//               <button onClick={() => setIsGraphsOpen(!isGraphsOpen)} className="w-full h-9 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors flex justify-between items-center">
//                 <span className="truncate">{selectedGraphs.length} graphs selected</span>
//                 <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', isGraphsOpen && 'rotate-180')} />
//               </button>
//               {isGraphsOpen && (
//                 <div className="absolute top-full left-0 mt-1 w-56 z-30 rounded-md border border-dark-700 bg-[#15192b] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
//                   <div className="p-1.5">
//                     {graphOptions.map((graph) => (
//                       <label key={graph} className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-300 hover:bg-dark-800/60 cursor-pointer">
//                         <div className={cn('w-4 h-4 rounded border flex items-center justify-center', selectedGraphs.includes(graph) ? 'border-primary bg-primary' : 'border-dark-600 bg-dark-800/70')}>
//                           {selectedGraphs.includes(graph) && <Check className="w-3 h-3 text-white" />}
//                         </div>
//                         <input type="checkbox" checked={selectedGraphs.includes(graph)} onChange={() => toggleGraph(graph)} className="hidden" />
//                         {graph}
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Environment */}
//             <div className="relative min-w-[100px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Env</label>
//               <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
//                 <option value="dev">dev</option>
//                 <option value="staging">staging</option>
//                 <option value="prod">prod</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Region (UI only) */}
//             <div className="relative min-w-[120px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Region</label>
//               <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
//                 <option value="north-america">North America</option>
//                 <option value="latam">LATAM</option>
//                 <option value="emea">EMEA</option>
//                 <option value="apac">APAC</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Proxy */}
//             {/* Proxy Dropdown - Dynamically populated */}
// <div className="relative min-w-[140px]">
//   <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Proxy</label>
//   {loadingProxies ? (
//     <div className="w-full h-9 flex items-center justify-center rounded-md border border-dark-700 bg-[#1a1f33] text-gray-400">
//       <Loader2 className="w-4 h-4 animate-spin mr-1" />
//       <span className="text-xs">Loading...</span>
//     </div>
//   ) : proxiesError ? (
//     <div className="w-full h-9 flex items-center justify-between px-3 rounded-md border border-red-500/50 bg-[#1a1f33] text-red-400 text-xs">
//       <span>Error loading proxies</span>
//       <button onClick={fetchProxies} className="ml-2 underline">Retry</button>
//     </div>
//   ) : (
//     <select
//       value={proxy}
//       onChange={(e) => setProxy(e.target.value)}
//       className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
//       disabled={apiProxies.length === 0}
//     >
//       {apiProxies.length === 0 && (
//         <option value="" disabled>No proxies available</option>
//       )}
//       {apiProxies.map((p) => (
//         <option key={p.name} value={p.name}>
//           {p.name}
//         </option>
//       ))}
//     </select>
//   )}
//   {!loadingProxies && !proxiesError && (
//     <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//   )}
// </div>

//             {/* Auto Refresh + Time Range */}
//             <div className="flex items-center gap-2">
//               <button onClick={() => setAutoRefresh(!autoRefresh)} className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors', autoRefresh ? 'bg-primary/40' : 'bg-dark-700')}>
//                 <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200', autoRefresh ? 'translate-x-4.5' : 'translate-x-1')} />
//               </button>
//               <span className="text-xs text-gray-300 select-none">Auto Refresh</span>
//               <div className="relative min-w-[80px]">
//                 <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">Range</label>
//                 <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="w-full h-8 pl-2 pr-6 text-xs rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer">
//                   <option value="1 hour">1 hour</option>
//                   <option value="6 hours">6 hours</option>
//                   <option value="24 hours">24 hours</option>
//                   <option value="7 days">7 days</option>
//                 </select>
//                 <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
//               </div>
//             </div>
//           </div>

//           {/* Status Bar */}
//           <div className="flex items-center justify-between mb-4 px-4 py-2 bg-dark-900/50 border border-dark-700 rounded-lg text-xs text-gray-400">
//             <div className="flex items-center gap-2">
//               <Clock className="w-3 h-3" />
//               <span>Last refresh: {new Date(refreshTimestamp).toLocaleTimeString()}</span>
//               {autoRefresh && <span className="text-green-400 ml-1">Auto-refresh every 5s</span>}
//             </div>
//             <div className="flex items-center gap-4">
//               <span>Environment: <span className="text-white">{environment}</span></span>
//               <span>Proxy: <span className="text-white">{proxy}</span></span>
//             </div>
//           </div>

//           {/* Content */}
//           {/* {selectedGraphs.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-dark-900/20 rounded-lg border border-dashed border-dark-700">
//               <BarChart2 className="w-12 h-12 mb-4 opacity-40" />
//               <p className="text-lg font-medium">No graphs selected</p>
//               <p className="text-sm">Select at least one graph from the dropdown above</p>
//             </div>
//           ) : view === 'timeline' ? renderTimelineView() : renderListView()} */}
//           {selectedGraphs.length === 0 ? (
//   <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-dark-900/20 rounded-lg border border-dashed border-dark-700">
//     <BarChart2 className="w-12 h-12 mb-4 opacity-40" />
//     <p className="text-lg font-medium">No graphs selected</p>
//     <p className="text-sm">Select at least one graph from the dropdown above</p>
//   </div>
// ) : !proxy ? (
//   <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-dark-900/20 rounded-lg border border-dashed border-dark-700">
//     <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
//     <p className="text-lg font-medium">Loading proxies...</p>
//     <p className="text-sm">Please wait while we fetch available API proxies.</p>
//   </div>
// ) : view === 'timeline' ? renderTimelineView() : renderListView()}
//         </div>
//       </main>

//       <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
//             <div className="flex items-center gap-2">
//               <img src="/assets/justlogo.png" alt="ProbeStack logo" className="h-6 w-auto" onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
//               <span className="font-semibold gradient-text font-heading">ProbeStack</span>
//               <span className="text-gray-400">© {new Date().getFullYear()} All rights reserved</span>
//             </div>
//             <div className="flex items-center gap-6">
//               <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Privacy Policy</a>
//               <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Terms of Service</a>
//               <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Security</a>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }



// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Activity, AlertCircle, Maximize2, MoreVertical, BarChart2,
//   ChevronDown, ExternalLink, Check, X, Clock, Filter, LayoutList
// } from 'lucide-react';
// import { Card } from '../components/ui/card';
// import Header from '../components/ui/header';
// import { cn } from '../lib/utils';
// import "../index.css";

// // --- Data Generation Utilities ---
// const generateTrendData = (seed = 0, volatility = 15, length = 30) => {
//   const data = [];
//   let value = 40 + seed * 15;
//   for (let i = 0; i < length; i++) {
//     value += (Math.random() - 0.5) * volatility;
//     value = Math.max(5, Math.min(95, value));
//     data.push(Math.round(value * 10) / 10);
//   }
//   return data;
// };

// // --- Mini Chart Component ---
// const MiniChart = ({ data, color = '#ff5b1f', showLabels = true }) => {
//   const max = Math.max(...data);
//   const min = Math.min(...data);
//   const range = max - min || 1;
//   const normalized = data.map(v => ((v - min) / range) * 100);

//   const points = normalized.map((v, i) => {
//     const x = (i / (normalized.length - 1)) * 100;
//     const y = 100 - v;
//     return `${x},${y}`;
//   }).join(' ');

//   return (
//     <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
//       <defs>
//         <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
//           <stop offset="0%" stopColor={color} stopOpacity="0.4" />
//           <stop offset="100%" stopColor={color} stopOpacity="0.05" />
//         </linearGradient>
//       </defs>
//       <polygon
//         points={`0,100 ${points} 100,100`}
//         fill={`url(#grad-${color})`}
//         opacity="0.8"
//       />
//       <polyline
//         points={points}
//         fill="none"
//         stroke={color}
//         strokeWidth="2.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       {normalized.map((v, i) => (
//         <circle
//           key={i}
//           cx={(i / (normalized.length - 1)) * 100}
//           cy={100 - v}
//           r="2"
//           fill={color}
//           className="transition-opacity hover:opacity-100"
//         />
//       ))}
//       {showLabels && (
//         <>
//           <text x="5" y="15" fontSize="8" fill="#888" className="font-mono">Max: {Math.round(max)}</text>
//           <text x="5" y="95" fontSize="8" fill="#888" className="font-mono">Min: {Math.round(min)}</text>
//         </>
//       )}
//     </svg>
//   );
// };

// export default function ProxyMonitoring({showHeader = true}) {
//   const navigate = useNavigate();

//   // --- State Management ---
//   const [view, setView] = useState('timeline');
//   const [timeRange, setTimeRange] = useState('1 hour');
//   const [environment, setEnvironment] = useState('dev');
//   const [region, setRegion] = useState('us-central1');
//   const [proxy, setProxy] = useState('api-gateway-prod');
//   const [autoRefresh, setAutoRefresh] = useState(false);
//   const [isGraphsOpen, setIsGraphsOpen] = useState(false);
//   const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
//   const [expandedWidget, setExpandedWidget] = useState(null);
  
//   // Graph options and selections
//   const graphOptions = ['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size', 'Bandwidth'];
//   const [selectedGraphs, setSelectedGraphs] = useState(['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size']);
  
//   // Real-time data state
//   const [liveData, setLiveData] = useState({});

//   // --- Refs ---
//   const graphsDropdownRef = useRef(null);

//   // --- Click Outside Handler ---
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (graphsDropdownRef.current && !graphsDropdownRef.current.contains(event.target)) {
//         setIsGraphsOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // --- Generate Live Data based on filters ---
//   const refreshData = () => {
//     // Use environment & region to seed data differently
//     const envSeed = environment === 'prod' ? 10 : environment === 'staging' ? 5 : 0;
//     const regionSeed = region.includes('us') ? 3 : region.includes('europe') ? 6 : 9;
//     const totalSeed = envSeed + regionSeed;
    
//     // Generate new data for each metric
//     const newData = {};
//     graphOptions.forEach(metric => {
//       const seed = totalSeed + graphOptions.indexOf(metric) * 2;
//       const volatility = metric === 'Error Rate' ? 8 : 15;
//       newData[metric] = generateTrendData(seed, volatility, 30);
//     });
//     setLiveData(newData);
//     setRefreshTimestamp(Date.now());
//   };

//   // --- Initial data load & auto-refresh ---
//   useEffect(() => {
//     refreshData();
//   }, [environment, region, proxy]);

//   useEffect(() => {
//     let interval = null;
//     if (autoRefresh) {
//       interval = setInterval(() => {
//         refreshData();
//       }, 5000); // Refresh every 5 seconds
//     }
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [autoRefresh, environment, region, proxy]);

//   // --- Handlers ---
//   const toggleGraph = (graphName) => {
//     setSelectedGraphs(prev => 
//       prev.includes(graphName) 
//         ? prev.filter(g => g !== graphName) 
//         : [...prev, graphName]
//     );
//   };

//   const handleExpandToggle = (widgetId) => {
//     setExpandedWidget(prev => prev === widgetId ? null : widgetId);
//   };

//   const handleOpenAlert = () => {
//     // In a real app this would open a alerts manager or drawer
//     alert("🔔 Alerts view\nAPI Error Rate > 5% detected\nTraffic spike detected on Proxy A");
//   };

//   const handleOpenDashboard = () => {
//     navigate('/api-dashboard'); // Assumes you have a dashboard route
//   };

//   // --- Widget Component ---
//   const ChartWidget = ({ title, id }) => {
//     const data = liveData[title] || generateTrendData(0);
//     let color = '#ff5b1f';
//     let unit = 'req/s';
    
//     if (title.toLowerCase().includes('error')) {
//       color = '#ef4444'; // Red
//       unit = '%';
//     } else if (title.toLowerCase().includes('latency')) {
//       color = '#8b5cf6'; // Purple
//       unit = 'ms';
//     } else if (title.toLowerCase().includes('throughput')) {
//       color = '#22c55e'; // Green
//       unit = 'Mbps';
//     } else if (title.toLowerCase().includes('cache')) {
//       color = '#06b6d4'; // Cyan
//       unit = '%';
//     } else if (title.toLowerCase().includes('size')) {
//       color = '#eab308'; // Yellow
//       unit = 'KB';
//     } else if (title.toLowerCase().includes('bandwidth')) {
//       color = '#f472b6'; // Pink
//       unit = 'Gbps';
//     }

//     const isExpanded = expandedWidget === id;
//     const currentValue = data[data.length - 1];

//     return (
//       <Card className={cn(
//         "bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all",
//         isExpanded && "col-span-1 md:col-span-2 border-primary/50"
//       )}>
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-base font-medium text-white">{title}</h3>
//           <div className="flex items-center gap-1.5">
//             <button 
//               className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white transition-colors"
//               title="Show details"
//             >
//               <BarChart2 className="w-4 h-4" />
//             </button>
//             <button 
//               onClick={() => handleExpandToggle(id)}
//               className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white transition-colors"
//               title={isExpanded ? "Collapse" : "Expand"}
//             >
//               <Maximize2 className={cn("w-4 h-4", isExpanded && "text-primary")} />
//             </button>
//             <button className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white transition-colors">
//               <MoreVertical className="w-4 h-4" />
//             </button>
//           </div>
//         </div>
        
//         <div className={cn(
//           "w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all",
//           isExpanded ? "h-80" : "h-44"
//         )}>
//           {/* Grid lines */}
//           <div className="absolute inset-0 flex flex-col justify-between px-2 py-3 pointer-events-none">
//             {[0, 1, 2, 3, 4].map(i => (
//               <div key={i} className="w-full border-t border-dark-700/40 border-dashed h-0" />
//             ))}
//           </div>
          
//           <div className={cn("absolute inset-4", isExpanded && "inset-8")}>
//             <MiniChart data={data} color={color} showLabels={isExpanded} />
//           </div>

//           {/* X-axis Labels */}
//           <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-[10px] text-gray-500">
//             <span>{timeRange === '1 hour' ? '00:00' : timeRange === '6 hours' ? '06:00' : '12:00'}</span>
//             <span>Now</span>
//           </div>
          
//           <div className="absolute top-2 right-3 text-xs text-gray-300 bg-[#1a1f33]/80 px-2 py-0.5 rounded">
//             {currentValue} {unit}
//           </div>
          
//           {isExpanded && (
//             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1f33]/90 px-3 py-1 rounded text-xs text-gray-400 border border-dark-600">
//               Showing {data.length} data points • Updated {new Date(refreshTimestamp).toLocaleTimeString()}
//             </div>
//           )}
//         </div>
//       </Card>
//     );
//   };

//   // --- Tab / View Switching ---
//   const renderTimelineView = () => (
//     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
//       {selectedGraphs.map((graphTitle) => (
//         <ChartWidget key={graphTitle} title={graphTitle} id={graphTitle} />
//       ))}
//     </div>
//   );

//   const renderListView = () => (
//     <div className="space-y-4">
//       {selectedGraphs.map((graphTitle) => (
//         <ChartWidget key={graphTitle} title={graphTitle} id={graphTitle} />
//       ))}
//     </div>
//   );

//   return (
//     <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
//       {showHeader && <Header activePage="proxy-monitoring" />}

//       <main className="flex-1 overflow-auto">
//         <div className="mx-auto max-w-[1600px] px-6 py-6">
          
//           {/* --- Header Section --- */}
//           <div className="flex items-center justify-between pb-4 border-b border-dark-700/60 mb-4">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
//                 <Activity className="w-5 h-5 text-primary" />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold text-white">API Monitoring</h1>
//                 <p className="text-sm text-gray-400">
//                   {view === 'timeline' ? 'Time-series view' : 'List view'} • {selectedGraphs.length} metrics
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-center gap-6">
//               <button 
//                 onClick={handleOpenAlert}
//                 className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
//               >
//                 Alert <ExternalLink className="w-3 h-3" />
//               </button>
//               <button 
//                 onClick={handleOpenDashboard}
//                 className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
//               >
//                 Dashboard <ExternalLink className="w-3 h-3" />
//               </button>
//             </div>
//           </div>

//           {/* --- Filters & Controls (Single Row) --- */}
//           <div className="flex flex-wrap items-center gap-3 mb-6">
            
//             {/* View Dropdown */}
//             <div className="relative min-w-[100px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
//                 View
//               </label>
//               <select 
//                 value={view} 
//                 onChange={(e) => setView(e.target.value)}
//                 className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
//               >
//                 <option value="timeline">timeline</option>
//                 <option value="list">list</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Graphs Dropdown */}
//             <div className="relative min-w-[160px]" ref={graphsDropdownRef}>
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
//                 Graphs
//               </label>
//               <button 
//                 onClick={() => setIsGraphsOpen(!isGraphsOpen)}
//                 className="w-full h-9 pl-3 pr-8 text-left text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 hover:border-gray-500 transition-colors focus:outline-none flex justify-between items-center"
//               >
//                 <span className="truncate">{selectedGraphs.length} graphs selected</span>
//                 <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isGraphsOpen && "rotate-180")} />
//               </button>
              
//               {isGraphsOpen && (
//                 <div className="absolute top-full left-0 mt-1 w-56 z-30 rounded-md border border-dark-700 bg-[#15192b] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
//                   <div className="p-1.5">
//                     {graphOptions.map((graph) => (
//                       <label key={graph} className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-300 hover:bg-dark-800/60 cursor-pointer transition-colors">
//                         <div className={cn(
//                           'w-4 h-4 rounded border flex items-center justify-center transition-colors',
//                           selectedGraphs.includes(graph) 
//                             ? 'border-primary bg-primary' 
//                             : 'border-dark-600 bg-dark-800/70'
//                         )}>
//                           {selectedGraphs.includes(graph) && <Check className="w-3 h-3 text-white" />}
//                         </div>
//                         <input 
//                           type="checkbox" 
//                           checked={selectedGraphs.includes(graph)}
//                           onChange={() => toggleGraph(graph)}
//                           className="hidden"
//                         />
//                         {graph}
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Environment */}
//             <div className="relative min-w-[100px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
//                 Env
//               </label>
//               <select 
//                 value={environment} 
//                 onChange={(e) => setEnvironment(e.target.value)}
//                 className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
//               >
//                 <option value="dev">dev</option>
//                 <option value="staging">staging</option>
//                 <option value="prod">prod</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Region */}
//             <div className="relative min-w-[120px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
//                 Region
//               </label>
//               <select 
//                 value={region} 
//                 onChange={(e) => setRegion(e.target.value)}
//                 className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
//               >
//                 <option value="us-central1">us-central1</option>
//                 <option value="us-east1">us-east1</option>
//                 <option value="europe-west2">europe-west2</option>
//                 <option value="asia-southeast1">asia-southeast1</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Proxy */}
//             <div className="relative min-w-[140px]">
//               <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
//                 Proxy
//               </label>
//               <select 
//                 value={proxy} 
//                 onChange={(e) => setProxy(e.target.value)}
//                 className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
//               >
//                 <option value="api-gateway-prod">API Gateway (Prod)</option>
//                 <option value="api-gateway-staging">API Gateway (Staging)</option>
//                 <option value="app-proxy-us">App Proxy (US)</option>
//                 <option value="service-proxy-eu">Service Proxy (EU)</option>
//               </select>
//               <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
//             </div>

//             {/* Auto Refresh Toggle */}
//             <div className="flex items-center gap-2">
//                <button 
//                  onClick={() => setAutoRefresh(!autoRefresh)}
//                  className={cn(
//                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none",
//                    autoRefresh ? "bg-primary/40" : "bg-dark-700"
//                  )}
//                >
//                  <span
//                    className={cn(
//                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200",
//                      autoRefresh ? "translate-x-4.5" : "translate-x-1"
//                    )}
//                  />
//                </button>
//                <span className="text-xs text-gray-300 select-none">Auto Refresh</span>
               
//                {/* Time Range Dropdown */}
//                <div className="relative min-w-[80px]">
//                  <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
//                    Range
//                  </label>
//                  <select 
//                    value={timeRange} 
//                    onChange={(e) => setTimeRange(e.target.value)}
//                    className="w-full h-8 pl-2 pr-6 text-xs rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
//                  >
//                    <option value="1 hour">1 hour</option>
//                    <option value="6 hours">6 hours</option>
//                    <option value="24 hours">24 hours</option>
//                    <option value="7 days">7 days</option>
//                  </select>
//                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
//                </div>
//             </div>
//           </div>

//           {/* --- Real-time Status Bar --- */}
//           <div className="flex items-center justify-between mb-4 px-4 py-2 bg-dark-900/50 border border-dark-700 rounded-lg text-xs text-gray-400">
//             <div className="flex items-center gap-2">
//               <Clock className="w-3 h-3" />
//               <span>Last refresh: {new Date(refreshTimestamp).toLocaleTimeString()}</span>
//               {autoRefresh && <span className="text-green-400 ml-1">Auto-refresh every 5s</span>}
//             </div>
//             <div className="flex items-center gap-4">
//               <span>Environment: <span className="text-white">{environment}</span></span>
//               <span>Region: <span className="text-white">{region}</span></span>
//               <span>Proxy: <span className="text-white">{proxy}</span></span>
//             </div>
//           </div>

//           {/* --- Content Area --- */}
//           {view === 'timeline' ? renderTimelineView() : renderListView()}

//           {/* Fallback */}
//           {selectedGraphs.length === 0 && (
//             <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-dark-900/20 rounded-lg border border-dashed border-dark-700">
//               <BarChart2 className="w-12 h-12 mb-4 opacity-40" />
//               <p className="text-lg font-medium">No graphs selected</p>
//               <p className="text-sm">Select at least one graph from the dropdown above</p>
//             </div>
//           )}

//         </div>
//       </main>

//       {/* --- Footer --- */}
//       <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
//             <div className="flex items-center gap-2">
//               <img
//                 src="/assets/justlogo.png"
//                 alt="ProbeStack logo"
//                 className="h-6 w-auto"
//                 onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
//               />
//               <span className="font-semibold gradient-text font-heading">ProbeStack</span>
//               <span className="text-gray-400">© {new Date().getFullYear()} All rights reserved</span>
//             </div>
//             <div className="flex items-center gap-6">
//               <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Privacy Policy</a>
//               <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Terms of Service</a>
//               <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">Security</a>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
