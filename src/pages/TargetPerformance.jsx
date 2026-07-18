import React, { useState, useEffect, useCallback } from 'react';
import { Target, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchApigeeToken, fetchApigeeBreakdown } from '../services/apigeeStatsService';
import ApigeeMetricsExplorer, { ApigeeMetricsControls } from '../components/monitoring/ApigeeMetricsExplorer';
import '../index.css';

const timeRangeOptions = ['1 hour', '3 hours', '6 hours', '12 hours', '1 day', '3 days', '7 days', '14 days'];

export default function TargetPerformance() {
  const [environment, setEnvironment] = useState('dev');
  const [targetIp, setTargetIp] = useState('');
  const [timeRange, setTimeRange] = useState('1 day');

  const [targetHosts, setTargetHosts] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetsError, setTargetsError] = useState(null);

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

            {/* Target host — populated from traffic actually seen */}
            <div className="relative min-w-[200px]">
              <label className="absolute -top-2.5 left-2.5 px-1 text-[10px] font-medium text-gray-500 bg-[#0e172a] z-10">
                Target Host
              </label>
              {loadingTargets ? (
                <div className="w-full h-9 flex items-center justify-center rounded-md border border-dark-700 bg-[#1a1f33] text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : targetsError ? (
                <div className="w-full h-9 flex items-center justify-between px-3 rounded-md border border-red-500/50 bg-[#1a1f33] text-red-400 text-xs">
                  <span>Error loading targets</span>
                  <button onClick={fetchTargetHosts} className="ml-2 underline">Retry</button>
                </div>
              ) : (
                <>
                  <select
                    value={targetIp}
                    onChange={(e) => setTargetIp(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 text-sm rounded-md border border-dark-700 bg-[#1a1f33] text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  >
                    <option value="">Select a target</option>
                    {targetHosts.map((host) => (
                      <option key={host} value={host}>{host}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </>
              )}
            </div>

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

          {/* Dimension/Metric-driven explorer — same mechanic as API Monitoring */}
          <ApigeeMetricsExplorer
            environment={environment}
            timeRange={timeRange}
            filterExpr={targetIp ? `target_host eq '${targetIp}'` : undefined}
            filterReady={Boolean(targetIp)}
            emptyFilterMessage="Select a target host to view its performance metrics"
            dimension={dimension}
            selectedMetrics={selectedMetrics}
          />
        </div>
      </main>
    </div>
  );
}
