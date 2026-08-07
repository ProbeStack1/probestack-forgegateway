import React, { useState, useEffect, useCallback } from 'react';
import { Target, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchApigeeToken, fetchApigeeBreakdown } from '../../services/apigeeStatsService';
import ApigeeMetricsExplorer, { ApigeeMetricsControls } from '../../components/monitoring/ApigeeMetricsExplorer';
import { MultiSelectFilterDropdown, FilterTabs, MAX_SELECTED_OPTIONS } from '../../components/monitoring/MultiSelectFilterTabs';
import '../../index.css';

const timeRangeOptions = ['1 hour', '3 hours', '6 hours', '12 hours', '1 day', '3 days', '7 days', '14 days'];

export default function TargetPerformance() {
  const [environment, setEnvironment] = useState('dev');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [activeTargetTab, setActiveTargetTab] = useState(null);
  const [timeRange, setTimeRange] = useState('1 day');

  const [targetHosts, setTargetHosts] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetsError, setTargetsError] = useState(null);

  const toggleTarget = (host) => {
    setSelectedTargets((prev) => {
      if (prev.includes(host)) return prev.filter((h) => h !== host);
      if (prev.length >= MAX_SELECTED_OPTIONS) return prev;
      return [...prev, host];
    });
  };

  const [dimension, setDimension] = useState('target_host');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const toggleMetric = (metricExpr) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricExpr) ? prev.filter((m) => m !== metricExpr) : [...prev, metricExpr],
    );
  };

  // --- Populate the Target Host dropdown from real traffic, not a static config list ---
  const fetchTargetHosts = useCallback(async () => {
    setLoadingTargets(true);
    setTargetsError(null);
    try {
      const token = await fetchApigeeToken();
      const rows = await fetchApigeeBreakdown(token, environment, 'target_host', ['sum(message_count)'], timeRange);
      setTargetHosts(rows.map((r) => r.name).filter(Boolean));
    } catch (err) {
      console.error('Error fetching target hosts:', err);
      setTargetsError(err.message);
    } finally {
      setLoadingTargets(false);
    }
  }, [environment, timeRange]);

  useEffect(() => {
    fetchTargetHosts();
  }, [fetchTargetHosts]);

  // --- Keep the active target-host tab valid as the selection changes ---
  useEffect(() => {
    setActiveTargetTab((prev) => {
      if (selectedTargets.length === 0) return null;
      return prev && selectedTargets.includes(prev) ? prev : selectedTargets[0];
    });
  }, [selectedTargets]);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#0e172a' }}>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-dark-700/60 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Target Performance</h1>
              <p className="text-sm text-gray-400">Backend/target server response performance across API traffic</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative min-w-[160px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
                Environment or Hostname
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

            {/* Target Host Multi-select — populated from traffic actually seen; up to MAX_SELECTED_OPTIONS */}
            <MultiSelectFilterDropdown
              label="Target Host"
              items={targetHosts}
              getItemLabel={(host) => host}
              getItemKey={(host) => host}
              selected={selectedTargets}
              onToggle={toggleTarget}
              loading={loadingTargets}
              error={targetsError}
              onRetry={fetchTargetHosts}
              placeholderLabel="Select targets"
              errorLabel="Error loading targets"
              minWidthClass="min-w-[200px]"
            />

            {/* Dimension + Metric — moved up right after Target Host */}
            <ApigeeMetricsControls
              dimension={dimension}
              onDimensionChange={setDimension}
              selectedMetrics={selectedMetrics}
              onToggleMetric={toggleMetric}
            />
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

          {/* Target Host Tabs — each selected host gets its own tab; the explorer below renders that host's graphs only */}
          {selectedTargets.length > 0 && (
            <FilterTabs
              items={selectedTargets}
              activeItem={activeTargetTab}
              onSelect={setActiveTargetTab}
              icon={Target}
              badgeCount={selectedMetrics.length}
            />
          )}

          {/* Dimension/Metric-driven explorer — same mechanic as API Monitoring */}
          <ApigeeMetricsExplorer
            environment={environment}
            timeRange={timeRange}
            filterExpr={activeTargetTab ? `target_host eq '${activeTargetTab}'` : undefined}
            filterReady={Boolean(activeTargetTab)}
            emptyFilterMessage="Select a target host to view its performance metrics"
            dimension={dimension}
            selectedMetrics={selectedMetrics}
          />
        </div>
      </main>
    </div>
  );
}
