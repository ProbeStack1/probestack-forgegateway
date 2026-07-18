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
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { cn } from '../lib/utils';
import {
  fetchApigeeToken,
  fetchApigeeProxies,
  fetchApigeeStats as fetchApigeeStatsShared,
  getTimeUnitForRange,
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

// --- Mini Sparkline Chart Component (unchanged) ---
const MiniChart = ({
  data,
  color = '#ff5b1f',
  showLabels = true,
  emptyMessage = 'No traffic recorded for this proxy in the selected window',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center text-gray-500 text-xs px-4">
        {emptyMessage}
      </div>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const normalized = data.map((v) => ((v - min) / range) * 100);

  const points = normalized
    .map((v, i) => {
      const x = (i / (normalized.length - 1)) * 100;
      const y = 100 - v;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color})`} opacity="0.8" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {normalized.map((v, i) => (
        <circle
          key={i}
          cx={(i / (normalized.length - 1)) * 100}
          cy={100 - v}
          r="2"
          fill={color}
          className="transition-opacity hover:opacity-100"
        />
      ))}
      {showLabels && (
        <>
          <text x="5" y="15" fontSize="8" fill="#888" className="font-mono">
            Max: {Math.round(max)}
          </text>
          <text x="5" y="95" fontSize="8" fill="#888" className="font-mono">
            Min: {Math.round(min)}
          </text>
        </>
      )}
    </svg>
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

  const graphOptions = ['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size', 'Bandwidth'];
  const [selectedGraphs, setSelectedGraphs] = useState(['Traffic', 'Error Rate', 'Latency', 'Throughput', 'Cache Hit', 'Request Size']);

  const [dimension, setDimension] = useState('apiproxy');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [metricData, setMetricData] = useState({});

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
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await fetchToken();
      if (!token) throw new Error('Unable to get access token');

      const [graphResults, metricSeriesArr] = await Promise.all([
        Promise.all(
          selectedGraphs.map(async (graphTitle) => {
            const dataPoints = await fetchApigeeMetric(token, environment, proxy, graphTitle, timeRange, dimension);
            return { title: graphTitle, data: dataPoints };
          })
        ),
        // All selected metrics are requested in a single combined `select=m1,m2,...` call,
        // matching the Apigee Stats API's multi-metric query pattern (one call, comma-joined select).
        selectedMetrics.length > 0
          ? fetchApigeeStats(token, environment, dimension, proxy, selectedMetrics, timeRange)
          : Promise.resolve([]),
      ]);

      const newLiveData = {};
      graphResults.forEach(({ title, data }) => {
        newLiveData[title] = data;
      });
      setLiveData(newLiveData);

      const newMetricData = {};
      selectedMetrics.forEach((metricExpr, idx) => {
        newMetricData[metricExpr] = metricSeriesArr[idx] || [];
      });
      setMetricData(newMetricData);

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
    const currentValue = data.length > 0 ? data[data.length - 1] : 0;
    const emptyMessage = emptyMessageByGraph[title] || 'No data recorded for this proxy in the selected window';

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
            <button className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
              <BarChart2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleExpandToggle(id)} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
              <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
            </button>
            <button className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={cn('w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
          <div className="absolute inset-0 flex flex-col justify-between px-2 py-3 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full border-t border-dark-700/40 border-dashed h-0" />
            ))}
          </div>
          <div className={cn('absolute inset-4', isExpanded && 'inset-8')}>
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
              <MiniChart data={data} color={color} showLabels={isExpanded} emptyMessage={emptyMessage} />
            )}
          </div>
          <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-[10px] text-gray-500">
            <span>{timeRange === '1 hour' ? '00:00' : timeRange === '6 hours' ? '06:00' : '12:00'}</span>
            <span>Now</span>
          </div>
          <div className="absolute top-2 right-3 text-xs text-gray-300 bg-[#1a1f33]/80 px-2 py-0.5 rounded">
            {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue} {unit}
          </div>
          {isExpanded && !isLoading && !hasError && data.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1f33]/90 px-3 py-1 rounded text-xs text-gray-400 border border-dark-600">
              Showing {data.length} data points • Updated {new Date(refreshTimestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
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
    const data = metricData[metricExpr] || [];
    const isLoading = loading && !metricData[metricExpr];
    const hasError = error && !metricData[metricExpr];
    const meta = metricMeta[metricExpr] || { label: metricExpr, unit: '', color: '#ff5b1f' };

    const isExpanded = expandedWidget === id;
    const currentValue = data.length > 0 ? data[data.length - 1] : 0;
    const emptyMessage = `No ${meta.label.toLowerCase()} data recorded for this proxy (grouped by ${dimension}) in the selected window`;

    return (
      <Card
        className={cn(
          'bg-[#15192b] border-dark-700 p-4 shadow-sm hover:border-primary/30 transition-all',
          isExpanded && 'col-span-1 md:col-span-2 border-primary/50'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium text-white">{meta.label}</h3>
            <p className="text-[11px] text-gray-500 font-mono">{metricExpr}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleExpandToggle(id)} className="p-1.5 rounded hover:bg-dark-800/80 text-gray-400 hover:text-white">
              <Maximize2 className={cn('w-4 h-4', isExpanded && 'text-primary')} />
            </button>
          </div>
        </div>

        <div className={cn('w-full rounded-lg border border-dark-600 bg-[#1a1f33] relative p-2 transition-all', isExpanded ? 'h-80' : 'h-44')}>
          <div className="absolute inset-0 flex flex-col justify-between px-2 py-3 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full border-t border-dark-700/40 border-dashed h-0" />
            ))}
          </div>
          <div className={cn('absolute inset-4', isExpanded && 'inset-8')}>
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
              <MiniChart data={data} color={meta.color} showLabels={isExpanded} emptyMessage={emptyMessage} />
            )}
          </div>
          <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-[10px] text-gray-500">
            <span>{timeRange === '1 hour' ? '00:00' : timeRange === '6 hours' ? '06:00' : '12:00'}</span>
            <span>Now</span>
          </div>
          <div className="absolute top-2 right-3 text-xs text-gray-300 bg-[#1a1f33]/80 px-2 py-0.5 rounded">
            {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue} {meta.unit}
          </div>
        </div>
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
