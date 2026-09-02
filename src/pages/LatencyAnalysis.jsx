import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchApigeeToken, fetchApigeeProxies } from '../services/apigeeStatsService';
import ApigeeMetricsExplorer, { ApigeeMetricsControls } from '../components/monitoring/ApigeeMetricsExplorer';
import { MultiSelectFilterDropdown, FilterTabs, MAX_SELECTED_OPTIONS } from '../components/monitoring/MultiSelectFilterTabs';
import '../index.css';

const timeRangeOptions = ['1 hour', '3 hours', '6 hours', '12 hours', '1 day', '3 days', '7 days', '14 days'];

const regionOptions = [
  { value: 'north-america', label: 'North America' },
  { value: 'latam', label: 'LATAM' },
  { value: 'emea', label: 'EMEA' },
  { value: 'apac', label: 'APAC' },
];

export default function LatencyAnalysis() {
  const [environment, setEnvironment] = useState('dev');
  const [selectedProxies, setSelectedProxies] = useState([]);
  const [activeProxyTab, setActiveProxyTab] = useState(null);
  const [region, setRegion] = useState('north-america');
  const [timeRange, setTimeRange] = useState('1 day');

  const [apiProxies, setApiProxies] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(false);
  const [proxiesError, setProxiesError] = useState(null);

  const toggleProxy = (proxyName) => {
    setSelectedProxies((prev) => {
      if (prev.includes(proxyName)) return prev.filter((p) => p !== proxyName);
      if (prev.length >= MAX_SELECTED_OPTIONS) return prev;
      return [...prev, proxyName];
    });
  };

  const [dimension, setDimension] = useState('apiproxy');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const toggleMetric = (metricExpr) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricExpr) ? prev.filter((m) => m !== metricExpr) : [...prev, metricExpr],
    );
  };

  // --- Fetch real proxies from Apigee, same source as API Monitoring ---
  const fetchProxies = useCallback(async () => {
    setLoadingProxies(true);
    setProxiesError(null);
    try {
      const token = await fetchApigeeToken();
      const proxiesList = await fetchApigeeProxies(token);
      setApiProxies(proxiesList);
    } catch (err) {
      console.error('Error fetching proxies:', err);
      setProxiesError(err.message);
    } finally {
      setLoadingProxies(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  // --- Keep the active proxy tab valid as the proxy selection changes ---
  useEffect(() => {
    setActiveProxyTab((prev) => {
      if (selectedProxies.length === 0) return null;
      return prev && selectedProxies.includes(prev) ? prev : selectedProxies[0];
    });
  }, [selectedProxies]);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] flex flex-col gap-2 p-6">
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-dark-700/60 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Latency Analysis</h1>
              <p className="text-sm text-gray-400">Response time trends and outliers across API traffic</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative min-w-[140px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="dev">dev</option>
                <option value="staging">staging</option>
                <option value="prod">prod</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Proxy Multi-select — real-time list, same source as API Monitoring; up to MAX_SELECTED_OPTIONS */}
            <MultiSelectFilterDropdown
              label="Proxy"
              items={apiProxies}
              getItemLabel={(p) => p.name}
              getItemKey={(p) => p.name}
              selected={selectedProxies}
              onToggle={toggleProxy}
              loading={loadingProxies}
              error={proxiesError}
              onRetry={fetchProxies}
              placeholderLabel="Select proxies"
            />

            {/* Dimension + Metric — moved up right after Proxy */}
            <ApigeeMetricsControls
              dimension={dimension}
              onDimensionChange={setDimension}
              selectedMetrics={selectedMetrics}
              onToggleMetric={toggleMetric}
            />

            <div className="relative min-w-[140px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                {regionOptions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Time range */}
          <div className="flex flex-wrap items-center gap-1.5 mb-6">
            {timeRangeOptions.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                  timeRange === range
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'border-dark-700 bg-[#1a1f33] text-gray-400 hover:text-white hover:border-gray-500',
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Proxy Tabs — each selected proxy gets its own tab; the explorer below renders that proxy's graphs only */}
          {selectedProxies.length > 0 && (
            <FilterTabs
              items={selectedProxies}
              activeItem={activeProxyTab}
              onSelect={setActiveProxyTab}
              icon={Clock}
              badgeCount={selectedMetrics.length}
            />
          )}

          {/* Dimension/Metric-driven explorer — same mechanic as API Monitoring */}
          <ApigeeMetricsExplorer
            environment={environment}
            timeRange={timeRange}
            filterExpr={activeProxyTab ? `apiproxy eq '${activeProxyTab}'` : undefined}
            filterReady={Boolean(activeProxyTab)}
            emptyFilterMessage="Select a proxy to view latency data"
            dimension={dimension}
            selectedMetrics={selectedMetrics}
          />
          </div>
        </div>
      </main>
    </div>
  );
}
