import React, { useState, useEffect, useRef } from 'react';
import {
  TestTube, Send, Server, List, Loader2, Clock, Copy, Check,
  Trash2, PlusCircle, Shield, FileText, Code, Edit3,
  ChevronUp, GripHorizontal, X, HardDrive, ChevronDown, ChevronRight,
  Play, BarChart3, History as HistoryIcon, GripVertical, AlertCircle, CheckCircle,
  ArrowLeft, Settings, Search, Activity,Sparkles ,
  // Additional icons for API Advance Features
  Globe, Zap, FileCode, Terminal, Cloud, Layers, Boxes
} from 'lucide-react';
import MonacoBox from '../components/ui/MonacoBox';
import { Card } from '../components/ui/card';
import Toast from '../components/ui/toast';
import { testingService } from '../services/testingService';
import { testCaseService } from '../services/testCaseService';
import { onboardingService } from '../services/onboardingService';
import { SOURCE_TABS } from '../services/apiTestSourcesService';
import { cn } from '../lib/utils';
import RequestTraceDrawer from './mcp-generation/components/RequestTraceDrawer';

// ---------- Constants ----------
const API_TABS = ['Request', 'Functional Suite', 'Performance', 'History', 'Advance Features'];

const METHOD_COLORS = {
  GET: 'text-green-400 bg-green-500/10 border-green-500/20',
  POST: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  PUT: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
};

// ---------- API‑specific Pro Features ----------
const PRO_FEATURES = [
  { id: 'collections',   icon: Layers,   title: 'Collections',          desc: 'Save, organize, and replay frequently used requests across folders, tags and shared workspaces.' },
  { id: 'environments',  icon: Globe,    title: 'Environments',         desc: 'Manage variables and secrets across dev / staging / prod with one-click switching.' },
  { id: 'mock',          icon: Boxes,    title: 'Mock API Server',      desc: 'Spin up synthetic mock servers from any collection — perfect for parallel front/back development.' },
  { id: 'scripts',       icon: FileCode, title: 'Test Scripts',         desc: 'Pre/post-request scripts with assertions, JSON-schema checks and chained variable extraction.' },
  { id: 'snippets',      icon: Terminal, title: 'Code Snippets',        desc: 'Auto-generate ready-to-paste curl, axios, fetch, Python and Java snippets for every request.' },
  { id: 'monitor',       icon: Activity, title: 'Monitor & Schedule',   desc: 'Cron-based health checks with email / Slack alerts and historical SLO dashboards.' },
  { id: 'load',          icon: Zap,      title: 'Load Testing',         desc: 'Run JMeter / k6 imports, set thresholds, and stress-test endpoints from the same UI.' },
  { id: 'workspaces',    icon: Cloud,    title: 'Team Workspaces',      desc: 'Share collections and environments with role-based access and an immutable audit trail.' },
];

// ---------- Helpers ----------
function substituteVariables(text, env) {
  if (!text) return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => env[key] !== undefined ? env[key] : `{{${key}}}`);
}

// Flatten Postman collection items - ensures unique IDs
function flattenItems(items, parent = '', counter = { value: 0 }) {
  let list = [];
  (items || []).forEach(item => {
    if (item.request) {
      let id = item.id;
      if (!id) {
        id = `req-${counter.value++}`;
      }
      list.push({
        id: id,
        name: item.name || `${item.request.method} ${item.request.url?.raw || ''}`,
        parent: parent,
        request: item.request
      });
    } else if (item.item) {
      list.push(...flattenItems(item.item, parent ? `${parent} / ${item.name}` : item.name, counter));
    }
  });
  return list;
}

// Convert Postman request to our endpoint shape
function postmanToEndpoint(item) {
  const req = item.request;
  const method = req?.method || 'GET';
  const url = req?.url || {};
  const raw = typeof url === 'string' ? url : url.raw || '';
  const path = raw.replace(/^(https?:\/\/[^/]+)/, '');
  const headers = Array.isArray(req?.header) ? req.header.map(h => ({ key: h.key, value: h.value, enabled: h.enabled !== false })) : [];
  const authType = req?.auth?.type || 'none';
  let defaultBody = null;
  if (req?.body) {
    if (req.body.mode === 'raw') defaultBody = req.body.raw || '';
    else if (req.body.mode === 'urlencoded') defaultBody = JSON.stringify(req.body.urlencoded, null, 2);
    else if (req.body.mode === 'formdata') defaultBody = JSON.stringify(req.body.formdata, null, 2);
  }
  return {
    id: item.id,
    method,
    path: path || '/',
    name: item.name,
    description: req?.description || '',
    defaultParams: [],
    defaultHeaders: headers,
    authType,
    defaultBody,
    _request: req
  };
}

// ---------- Searchable Select Component ----------
function SearchableSelect({ options, value, onChange, placeholder, renderOption, className }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const filteredOptions = options.filter(opt => {
    const label = opt.label || opt.name || opt.path || '';
    return label.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    onChange(opt);
    setSearch('');
    setIsOpen(false);
  };

  const displayValue = value ? (value.label || value.name || value.path || '') : '';

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="flex items-center border border-dark-700 rounded-lg bg-dark-900/60 focus-within:border-[#ff5b1f] transition-colors">
        <input
          type="text"
          value={isOpen ? search : displayValue}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || 'Search...'}
          className="flex-1 px-3 py-2 bg-transparent text-white text-sm outline-none placeholder-gray-500"
        />
        <button onClick={() => setIsOpen(!isOpen)} className="px-2 text-gray-400 hover:text-white">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-dark-900 border border-dark-700 rounded-lg shadow-lg custom-scroll">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 hover:bg-[#ff5b1f]/10 transition-colors text-sm text-gray-200"
              >
                {renderOption ? renderOption(opt) : (opt.label || opt.name || opt.path)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------- KV Table ----------
function KVRow({ item, idx, onUpdate, onRemove }) {
  return (
    <div className="group grid grid-cols-[36px_1fr_1fr_36px] items-stretch border-b border-dark-700/60 hover:bg-dark-800/40 transition-colors">
      <div className="flex items-center justify-center border-r border-dark-700/60">
        <input type="checkbox" checked={item.enabled} onChange={(e) => onUpdate(idx, 'enabled', e.target.checked)} className="h-3.5 w-3.5 rounded accent-[#ff5b1f] cursor-pointer" />
      </div>
      <input value={item.key} onChange={(e) => onUpdate(idx, 'key', e.target.value)} placeholder="Key" className="px-3 py-2 bg-transparent text-sm text-gray-200 placeholder-gray-600 border-r border-dark-700/60 outline-none focus:bg-[#ff5b1f]/5 focus:ring-1 focus:ring-inset focus:ring-[#ff5b1f]/60 font-mono" />
      <input value={item.value} onChange={(e) => onUpdate(idx, 'value', e.target.value)} placeholder="Value" className="px-3 py-2 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none focus:bg-[#ff5b1f]/5 focus:ring-1 focus:ring-inset focus:ring-[#ff5b1f]/60 font-mono" />
      <button onClick={() => onRemove(idx)} className="flex items-center justify-center text-gray-600 hover:text-red-400 border-l border-dark-700/60 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function KVTable({ items, onUpdate, onRemove, onAdd, keyLabel = 'KEY', valueLabel = 'VALUE', addLabel = 'Add row' }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-xl border border-dark-700 overflow-hidden bg-dark-900/40">
      <div className="grid grid-cols-[36px_1fr_1fr_36px] bg-dark-900/80 border-b border-dark-700 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
        <div className="py-2 text-center border-r border-dark-700/60">✓</div>
        <div className="px-3 py-2 border-r border-dark-700/60">{keyLabel}</div>
        <div className="px-3 py-2 border-r border-dark-700/60">{valueLabel}</div>
        <div></div>
      </div>
      {safeItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-gray-500">No entries yet. Click &quot;{addLabel}&quot; to get started.</div>
      ) : (
        safeItems.map((item, idx) => <KVRow key={idx} item={item} idx={idx} onUpdate={onUpdate} onRemove={onRemove} />)
      )}
      <div className="px-2 py-2 border-t border-dark-700">
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#ff5b1f] hover:bg-[#ff5b1f]/10 rounded-md border border-[#ff5b1f]/40 hover:border-[#ff5b1f] transition-colors"><PlusCircle className="w-3 h-3" /> {addLabel}</button>
      </div>
    </div>
  );
}

// ---------- Step Detail ----------
function StepDetail({ step, idx }) {
  const [expanded, setExpanded] = useState(false);

  // Get the actual value to show for an assertion
  const getActualDisplay = (ar) => {
    if (ar.name === 'STATUS_CODE') {
      // Use the step's HTTP status code, or fallback to ar.actual
      return step.statusCode ?? step.status ?? ar.actual;
    } else if (ar.name === 'RESPONSE_TIME') {
      // Use the step's response time in ms
      return (step.responseTime ?? ar.actual) + 'ms';
    } else {
      return ar.actual;
    }
  };

  // Format the expected value
  const formatExpected = (ar) => {
    if (ar.name === 'RESPONSE_TIME') {
      return `<${ar.expected}ms`;
    }
    return ar.expected;
  };

  return (
    <div className="bg-dark-900/30 border border-dark-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-dark-800/40 transition" onClick={() => setExpanded(!expanded)}>
        <span className="text-xs text-gray-500 font-mono w-8">#{idx+1}</span>
        {step.status === 'passed' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
        <span className="text-sm font-mono text-gray-200 flex-1">{step.name}</span>
        <span className="text-xs font-mono text-gray-400">{step.responseTime}ms</span>
        <span className={cn("text-xs font-mono", step.status === 'passed' ? 'text-green-400' : 'text-red-400')}>{step.status}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-dark-700/60 space-y-3">
          {step.method && step.path && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">Method: <span className="text-gray-300 font-mono">{step.method}</span></div>
              <div className="text-gray-400">Path: <span className="text-gray-300 font-mono">{step.path}</span></div>
            </div>
          )}
          {step.requestBody && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Request Body:</div>
              <pre className="bg-dark-900/60 p-2 rounded border border-dark-700 text-xs text-gray-300 overflow-auto max-h-40 font-mono">
                {typeof step.requestBody === 'string' ? step.requestBody : JSON.stringify(step.requestBody, null, 2)}
              </pre>
            </div>
          )}
          {step.assertionResults && step.assertionResults.length > 0 && (
            <div className="bg-dark-800/40 p-2 rounded border border-dark-700">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Assertions</div>
              {step.assertionResults.map((ar, i) => {
                const actualDisplay = getActualDisplay(ar);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {ar.passed ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-red-400" />}
                    <span className="text-gray-300">{ar.description || ar.name}</span>
                    <span className={ar.passed ? 'text-green-400' : 'text-red-400'}>{ar.passed ? 'PASS' : 'FAIL'}</span>
                    {ar.expected && (
                      <span className="text-gray-500">
                        {ar.name === 'RESPONSE_TIME' ? (
                          `(expected in : ${formatExpected(ar)}, got in : ${actualDisplay})`
                        ) : (
                          `(expected: ${formatExpected(ar)}, got: ${actualDisplay})`
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {step.totalRequests !== undefined && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-gray-400">Total Requests:</span> <span className="text-gray-300">{step.totalRequests}</span></div>
              <div><span className="text-gray-400">Errors:</span> <span className="text-gray-300">{step.errors || 0}</span></div>
              <div><span className="text-gray-400">Error Rate:</span> <span className="text-gray-300">{step.errorRate?.toFixed(1) || 0}%</span></div>
            </div>
          )}
          {step.error && (
            <div className="bg-red-900/20 border border-red-700/50 p-2 rounded text-xs text-red-400">
              Error: {step.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Fullscreen Results ----------
function RunResultsFullscreen({ runHistory, selectedRunId, setSelectedRunId, selectedRunData, onBack }) {
  const selectedRun = selectedRunData || runHistory.find(r => r.id === selectedRunId);

  if (!selectedRun) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e172a] flex flex-col">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-dark-700 shrink-0 bg-dark-900/60">
          <button onClick={onBack} className="p-2 rounded-md hover:bg-dark-800 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">Test Results</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No run selected.
        </div>
      </div>
    );
  }

  const steps = selectedRun.steps || [];
  const totalSteps = steps.length;
  const passedSteps = steps.filter(s => s.status === 'passed').length;
  const passRate = totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 0;

  const getStatusColor = (rate) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBg = (rate) => {
    if (rate >= 80) return 'bg-green-500/20 border-green-500/40';
    if (rate >= 70) return 'bg-yellow-500/20 border-yellow-500/40';
    return 'bg-red-500/20 border-red-500/40';
  };

  const getPassRateColor = (rate) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const isPerformance = selectedRun.type === 'PERFORMANCE';
  const metrics = selectedRun.metrics || {};

  return (
    <div className="fixed inset-0 z-50 bg-[#0e172a] flex flex-col">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-dark-700 shrink-0 bg-dark-900/60">
        <button onClick={onBack} className="p-2 rounded-md hover:bg-dark-800 text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white">Test Results</h2>
      </div>

      <div className="px-6 py-4 border-b border-dark-700/60 bg-dark-900/30">
        <div className="flex items-start justify-between">
          <h3 className="text-2xl font-bold text-white">{selectedRun.collectionName}</h3>
          <span className={cn(
            "text-sm font-semibold px-3 py-1 rounded-full border",
            getStatusBg(passRate),
            getStatusColor(passRate)
          )}>
            {selectedRun.status.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-400">
          <span className="text-gray-300 border px-3 py-0.5 rounded-full bg-gray-600 border-gray-700 ">{selectedRun.type}</span>
          <span>⏱ {selectedRun.totalDuration}s</span>
          <span>{new Date(selectedRun.timestamp).toLocaleString()}</span>
          <span>{totalSteps} steps</span>
          {isPerformance && selectedRun.vus !== undefined && (
            <span>👥 {selectedRun.vus} VUs</span>
          )}
          {totalSteps > 0 && (
            <span className={cn("font-semibold", getPassRateColor(passRate))}>
              Pass Rate: {passRate}%
            </span>
          )}
        </div>

        {isPerformance && metrics && Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
              <div className="text-xs text-gray-400">Total Requests</div>
              <div className="text-xl font-mono text-white">{metrics.totalRequests || 0}</div>
            </div>
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
              <div className="text-xs text-gray-400">Avg Latency</div>
              <div className="text-xl font-mono text-white">{Math.round(metrics.avgLatencyMs || 0)} ms</div>
            </div>
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
              <div className="text-xs text-gray-400">Error Rate</div>
              <div className="text-xl font-mono text-white">{(metrics.errorRate || 0).toFixed(1)}%</div>
            </div>
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
              <div className="text-xs text-gray-400">RPS</div>
              <div className="text-xl font-mono text-white">{Math.round(metrics.rps || 0)}</div>
            </div>
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
              <div className="text-xs text-gray-400">p95 Latency</div>
              <div className="text-xl font-mono text-white">{Math.round(metrics.p95LatencyMs || 0)} ms</div>
            </div>
            <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
              <div className="text-xs text-gray-400">p99 Latency</div>
              <div className="text-xl font-mono text-white">{Math.round(metrics.p99LatencyMs || 0)} ms</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-xl font-bold text-white">{totalSteps}</div>
          </div>
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
            <div className="text-xs text-gray-400">Passed</div>
            <div className="text-xl font-bold text-green-400">{passedSteps}</div>
          </div>
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
            <div className="text-xs text-gray-400">Failed</div>
            <div className="text-xl font-bold text-red-400">{totalSteps - passedSteps}</div>
          </div>
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700 text-center">
            <div className="text-xs text-gray-400">Pass Rate</div>
            <div className={cn("text-xl font-bold", getPassRateColor(passRate))}>
              {totalSteps > 0 ? `${passRate}%` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <StepDetail key={idx} step={step} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Tooltip Components ----------
function WaterfallTooltip({ phases }) {
  if (!phases || phases.length === 0) return null;
  const total = phases.reduce((sum, p) => sum + (p.durationMs || 0), 0) || 1;
  const maxBarWidth = 200;
  return (
    <div className="w-80 max-h-60 overflow-y-auto custom-scroll">
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-2">Trace Request</div>
      <div className="space-y-1.5">
        {phases.map((p, i) => {
          const duration = p.durationMs || 0;
          const width = Math.max((duration / total) * maxBarWidth, 2);
          const label = p.step?.replace(/_/g, ' ') || `Step ${i+1}`;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-24 truncate" title={label}>{label}</span>
              <div className="flex-1 h-3 bg-dark-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500/70 to-orange-400 rounded-sm"
                  style={{ width: `${width}px`, maxWidth: '100%' }}
                />
              </div>
              <span className="text-[10px] font-mono text-gray-300 w-12 text-right">{duration}ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResponseTooltip({ type, response, network }) {
  if (!response) return null;

  if (type === 'status') {
    const status = response.status;
    const statusText = response.statusText || '';
    const statusClass = status >= 200 && status < 300 ? 'text-emerald-400' :
                        status >= 400 ? 'text-rose-400' : 'text-yellow-400';
    const statusLabel = status >= 200 && status < 300 ? 'Success' :
                        status >= 400 ? 'Error' :
                        status >= 300 ? 'Redirect' : 'Informational';
    return (
      <div className="w-48 p-2 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status</span>
          <span className={`font-mono font-bold ${statusClass}`}>{status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Text</span>
          <span className="text-gray-300">{statusText}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Category</span>
          <span className={`font-medium ${statusClass}`}>{statusLabel}</span>
        </div>
      </div>
    );
  }

  if (type === 'size') {
    const net = network || {};
    const reqSize = net.requestSizeTotal || 0;
    const reqHeaders = net.requestSizeHeaders || 0;
    const reqBody = net.requestSizeBody || 0;
    const resSize = net.responseSizeTotal || 0;
    const resHeaders = net.responseSizeHeaders || 0;
    const resBody = net.responseSizeBody || 0;

    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(bytes < 1024 ? 0 : 1)} ${units[i]}`;
    };

    return (
      <div className="w-56 p-2 space-y-1 text-xs">
        <div className="flex items-center justify-between font-medium text-gray-300 mb-1">
          <span>Size Breakdown</span>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-gray-400">
            <span>Request Total</span>
            <span className="font-mono text-gray-300">{formatBytes(reqSize)}</span>
          </div>
          <div className="flex items-center justify-between pl-2 text-[10px] text-gray-500">
            <span>Headers</span>
            <span className="font-mono">{formatBytes(reqHeaders)}</span>
          </div>
          {reqBody > 0 && (
            <div className="flex items-center justify-between pl-2 text-[10px] text-gray-500">
              <span>Body</span>
              <span className="font-mono">{formatBytes(reqBody)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-gray-400 mt-1">
            <span>Response Total</span>
            <span className="font-mono text-gray-300">{formatBytes(resSize)}</span>
          </div>
          <div className="flex items-center justify-between pl-2 text-[10px] text-gray-500">
            <span>Headers</span>
            <span className="font-mono">{formatBytes(resHeaders)}</span>
          </div>
          <div className="flex items-center justify-between pl-2 text-[10px] text-gray-500">
            <span>Body</span>
            <span className="font-mono">{formatBytes(resBody)}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ---------- MAIN APITest ----------
export default function APITest({ embedded = false, showMessage, isGateway = false }) {
  // ---- Source Tab ----
  const [sourceTab, setSourceTab] = useState(isGateway ? 'apigee-proxy' : 'microservice');
  const tabsToShow = isGateway ? SOURCE_TABS.filter(t => t.id === 'apigee-proxy') : SOURCE_TABS;

  // ---- Microservices list (lightweight) ----
  const [microservices, setMicroservices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // ---- Postman Collection Data ----
  const [postmanCollection, setPostmanCollection] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [environment, setEnvironment] = useState({});
  const [endpointsList, setEndpointsList] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showEnvPanel, setShowEnvPanel] = useState(false);

  // ---- Request Builder state ----
  const [requestUrl, setRequestUrl] = useState('');
  const [requestMethod, setRequestMethod] = useState('GET');
  const [queryParams, setQueryParams] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [authType, setAuthType] = useState('none');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [bodyType, setBodyType] = useState('none');
  const [rawLanguage, setRawLanguage] = useState('json');
  const [rawBody, setRawBody] = useState('');
  const [formData, setFormData] = useState([]);
  const [urlEncoded, setUrlEncoded] = useState([]);
  const [activeRequestTab, setActiveRequestTab] = useState('params');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [responseSize, setResponseSize] = useState(null);
  const [activeResponseTab, setActiveResponseTab] = useState('body');
  const [copied, setCopied] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);

  // ---- Response panel resize ----
  const [panelHeight, setPanelHeight] = useState(340);
  const [panelOpen, setPanelOpen] = useState(false);
  const draggingRef = useRef(false);
  const rightColRef = useRef(null);

  // ---- Top-level tab ----
  const [activeTab, setActiveTab] = useState('Request');
  const [toast, setToast] = useState(null);

  // ---- Run history ----
  const [runHistory, setRunHistory] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRunData, setSelectedRunData] = useState(null);
  const [showFullscreenResults, setShowFullscreenResults] = useState(false);
  const selectedCollection = microservices.find(s => s.id === selectedServiceId);

  // ---- Load microservices for selected source tab ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingServices(true);
      try {
        const projectTypeMap = {
          'microservice': 'MICROSERVICE',
          'apigee-proxy': 'APIGEE_PROXY',
          'kong': 'KONG_GATEWAY_SERVICE'
        };
        const projectType = projectTypeMap[sourceTab];
        if (!projectType) {
          setMicroservices([]);
          setLoadingServices(false);
          return;
        }
        const res = await onboardingService.getAllByProjectType(projectType);
        if (res.success) {
          let items = res.data?.data || res.data || [];
          if (items.content) items = items.content;
          if (!Array.isArray(items)) items = [];

          const services = items.map(item => {
            const ms = item.microservice || {};
            return {
              id: ms.id || item.id || '',
              name: ms.apiName || ms.applicationName || item.applicationName || item.name || 'Unnamed',
              baseUrl: ms.deployedUrl || item.deployedUrl || '',
              _raw: item
            };
          }).filter(s => s.id);
          setMicroservices(services);
          if (services.length > 0) {
            setSelectedServiceId(services[0].id);
          } else {
            setSelectedServiceId('');
          }
        } else {
          setMicroservices([]);
          setSelectedServiceId('');
        }
      } catch (err) {
        console.error('Failed to load services:', err);
        setMicroservices([]);
      } finally {
        setLoadingServices(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sourceTab]);

  // ---- Fetch Postman collection ----
  const fetchPostmanCollection = async (service) => {
    if (service?._raw?.codeGenResults && service._raw.codeGenResults.length > 0) {
      const codeGen = service._raw.codeGenResults[0];
      if (codeGen.postmanCollectionUrl) {
        try {
          const response = await fetch(codeGen.postmanCollectionUrl);
          if (response.ok) {
            const collection = await response.json();
            return collection;
          }
        } catch (e) {
          console.warn('Failed to fetch Postman collection from URL, falling back.', e);
        }
      }
    }

    try {
      const historyRes = await testCaseService.getGenerationHistoryForMicroservice(service.id);
      if (historyRes.success && historyRes.data && historyRes.data.length > 0) {
        const latest = historyRes.data[0];
        const contentRes = await testCaseService.getCollectionContent(latest.id);
        if (contentRes.success) {
          const collection = typeof contentRes.content === 'string' ? JSON.parse(contentRes.content) : contentRes.content;
          return collection;
        }
      }
    } catch (e) {
      console.warn('Fallback collection fetch failed:', e);
    }
    return null;
  };

  // ---- When selectedServiceId changes, fetch Postman collection ----
  useEffect(() => {
    if (!selectedServiceId) {
      setPostmanCollection(null);
      setEndpointsList([]);
      setSelectedEndpoint(null);
      setEnvironment({});
      return;
    }
    const service = microservices.find(s => s.id === selectedServiceId);
    if (!service) return;

    setCollectionLoading(true);
    setPostmanCollection(null);
    setEndpointsList([]);
    setSelectedEndpoint(null);

    (async () => {
      try {
        const collection = await fetchPostmanCollection(service);
        if (!collection) {
          setCollectionLoading(false);
          setToast({ message: 'No collection found for this service.', type: 'warning' });
          return;
        }
        setPostmanCollection(collection);

        const env = {};
        if (collection.variable) {
          collection.variable.forEach(v => { env[v.key] = v.value || ''; });
        }
        env.baseUrl = service.baseUrl || env.baseUrl || '';
        setEnvironment(env);

        const counter = { value: 0 };
        const items = flattenItems(collection.item || [], '', counter);
        const endpoints = items.map(item => postmanToEndpoint(item));
        setEndpointsList(endpoints);
        if (endpoints.length > 0) {
          loadEndpointConfig(endpoints[0]);
        }
        setCollectionLoading(false);
      } catch (error) {
        console.error('Error loading Postman collection:', error);
        setCollectionLoading(false);
        setToast({ message: 'Error loading collection: ' + error.message, type: 'error' });
      }
    })();
  }, [selectedServiceId]);

  // ---- Load endpoint config ----
  const loadEndpointConfig = (endpoint) => {
    if (!endpoint) return;
    setSelectedEndpoint(endpoint);
    setRequestMethod(endpoint.method);
    const url = endpoint._request?.url?.raw || endpoint.path;
    setRequestUrl(url);
    const h = Array.isArray(endpoint.defaultHeaders) ? endpoint.defaultHeaders.map(x => ({ ...x, enabled: x.enabled !== false })) : [];
    setHeaders(h);
    setAuthType(endpoint.authType || 'none');
    setBearerToken('');
    setBasicUsername('');
    setBasicPassword('');
    if (endpoint.defaultBody) {
      setBodyType('raw');
      setRawLanguage('json');
      setRawBody(endpoint.defaultBody);
    } else {
      setBodyType('none');
      setRawBody('');
    }
    setFormData([]);
    setUrlEncoded([]);
    setQueryParams([]);
    setResponse(null);
    setResponseTime(null);
    setResponseSize(null);
    setPanelOpen(false);
  };

  // ---- Environment toggle ----
  const toggleEnvPanel = () => setShowEnvPanel(!showEnvPanel);

  const updateEnv = (key, value) => {
    setEnvironment(prev => ({ ...prev, [key]: value }));
  };

  // ---- Build final URL with env substitution ----
  const buildFinalUrl = () => {
    let url = requestUrl;
    url = substituteVariables(url, environment);
    const activeParams = queryParams.filter(p => p.key.trim() && p.enabled);
    if (activeParams.length) {
      const sp = new URLSearchParams();
      activeParams.forEach(p => sp.append(p.key, p.value));
      const qs = sp.toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }
    return url;
  };

  // ---- Send single request ----
  const handleSendRequest = async () => {
    const finalUrl = buildFinalUrl();
    if (!finalUrl?.trim()) return;
    setIsLoading(true);
    setResponse(null);
    setPanelOpen(true);
    const start = performance.now();
    try {
      let authPayload = { type: authType };
      if (authType === 'bearer' && bearerToken) {
        authPayload = { type: 'bearer', token: substituteVariables(bearerToken, environment) };
      } else if (authType === 'basic' && (basicUsername || basicPassword)) {
        authPayload = {
          type: 'basic',
          username: substituteVariables(basicUsername, environment),
          password: substituteVariables(basicPassword, environment)
        };
      }
      let bodyPayload = { type: 'none' };
      if (bodyType === 'raw') {
        bodyPayload = { type: 'raw', value: substituteVariables(rawBody, environment), language: rawLanguage };
      } else if (bodyType === 'form-data') {
        const fields = formData.map(f => ({ ...f, value: substituteVariables(f.value, environment) }));
        bodyPayload = { type: 'form-data', fields };
      } else if (bodyType === 'x-www-form-urlencoded') {
        const fields = urlEncoded.map(f => ({ ...f, value: substituteVariables(f.value, environment) }));
        bodyPayload = { type: 'x-www-form-urlencoded', fields };
      }
      const result = await testingService.executeAdhoc({
        method: requestMethod,
        url: finalUrl,
        headers: headers,
        auth: authPayload,
        body: bodyPayload,
      });
      if (!result.success) throw new Error(result.error);
      const data = result.data;
      const end = performance.now();
      setResponseTime(data.totalMs ? `${data.totalMs}ms` : `${Math.round(end - start)}ms`);
      const bodyStr = typeof data.data === 'string' ? data.data : JSON.stringify(data.data ?? '');
      setResponseSize(`${(new Blob([bodyStr]).size / 1024).toFixed(2)} KB`);
      setResponse({
        status: data.status,
        statusText: data.statusText,
        data: data.data,
        headers: data.headers,
        phases: data.phases || [],
        network: data.network || null,
        finalUrl: data.finalUrl,
        method: data.method,
        runId: data.runId,
        runAt: data.runAt,
        totalMs: data.totalMs,
        error: data.error,
      });
    } catch (error) {
      setResponse({ status: 0, statusText: 'Network Error', data: { error: error.message }, headers: {} });
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponseBody = (data) => {
    if (data === null || data === undefined) return 'No response body';
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    const text = activeResponseTab === 'headers'
      ? Object.entries(response.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
      : formatResponseBody(response.data);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statusColor = !response ? 'bg-yellow-500' : response.status >= 200 && response.status < 300 ? 'bg-green-500' : response.status >= 400 ? 'bg-red-500' : 'bg-yellow-500';
  const statusTextColor = !response ? 'text-yellow-400' : response.status >= 200 && response.status < 300 ? 'text-green-400' : response.status >= 400 ? 'text-red-400' : 'text-yellow-400';

  const BODY_TYPES = [
    { id: 'none', label: 'none' },
    { id: 'form-data', label: 'form-data' },
    { id: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
    { id: 'raw', label: 'raw' }
  ];

  // ---- KV handlers ----
  const addQueryParam = () => setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  const updateQueryParam = (idx, field, val) => { const u = [...queryParams]; u[idx][field] = val; setQueryParams(u); };
  const removeQueryParam = (idx) => setQueryParams(queryParams.filter((_, i) => i !== idx));

  const addHeader = () => setHeaders([...headers, { key: '', value: '', enabled: true }]);
  const updateHeader = (idx, field, val) => { const u = [...headers]; u[idx][field] = val; setHeaders(u); };
  const removeHeader = (idx) => setHeaders(headers.filter((_, i) => i !== idx));

  const addFormRow = () => setFormData([...formData, { key: '', value: '', enabled: true }]);
  const updateFormRow = (idx, field, val) => { const u = [...formData]; u[idx][field] = val; setFormData(u); };
  const removeFormRow = (idx) => setFormData(formData.filter((_, i) => i !== idx));

  const addEncRow = () => setUrlEncoded([...urlEncoded, { key: '', value: '', enabled: true }]);
  const updateEncRow = (idx, field, val) => { const u = [...urlEncoded]; u[idx][field] = val; setUrlEncoded(u); };
  const removeEncRow = (idx) => setUrlEncoded(urlEncoded.filter((_, i) => i !== idx));

  const bodyCount = () => {
    if (bodyType === 'none') return 0;
    if (bodyType === 'raw') return rawBody ? 1 : 0;
    if (bodyType === 'form-data') return formData.filter(r => r.enabled && r.key).length;
    if (bodyType === 'x-www-form-urlencoded') return urlEncoded.filter(r => r.enabled && r.key).length;
    return 0;
  };

  // ---- Functional Suite Runner (backend) ----
  const runFunctionalSuite = async (orderedRequests, assertions) => {
    const payload = {
      name: selectedCollection?.name + ' Suite' || 'Functional Suite',
      requests: orderedRequests.map(req => {
        const assertionDefs = [];
        const a = assertions[req.id] || { status: 200, bodyContains: '', maxResponseTime: 500 };
        if (a.status) assertionDefs.push({ type: 'STATUS_CODE', expected: a.status });
        if (a.bodyContains) assertionDefs.push({ type: 'BODY_CONTAINS', expected: a.bodyContains });
        if (a.maxResponseTime) assertionDefs.push({ type: 'RESPONSE_TIME', expected: a.maxResponseTime });

        return {
          method: req.method,
          url: substituteVariables(req._request?.url?.raw || req.path, environment),
          headers: req.defaultHeaders || [],
          auth: req.authType ? { type: req.authType } : { type: 'none' },
          body: req.defaultBody ? { mode: 'raw', raw: substituteVariables(req.defaultBody, environment) } : null,
          variables: environment,
          assertions: assertionDefs,
          preRequestScript: req._request?.preRequestScript || '',
          testScript: req._request?.testScript || '',
        };
      }),
      delayMs: 0,
      stopOnFailure: false,
    };

    try {
      const result = await testingService.executeFunctionalSuite(payload);
      if (!result.success) throw new Error(result.error);
      const run = result.data;
      return {
        id: run.runId,
        collectionName: selectedCollection?.name || 'Collection',
        type: 'Functional',
        timestamp: run.startedAt,
        status: run.status.toLowerCase(),
        steps: run.steps.map(s => ({
          id: s.requestId || 'step-' + Math.random(),
          name: s.requestName,
          method: s.method,
          path: s.url,
          status: s.passed ? 'passed' : 'failed',
          responseTime: s.responseTimeMs,
          error: s.errorMessage,
          assertionResults: s.assertionResults || [],
          requestBody: null,
        })),
        totalDuration: (run.totalDurationMs / 1000).toFixed(1),
      };
    } catch (error) {
      console.error('Suite execution failed:', error);
      throw error;
    }
  };

  // ---- Performance Runner (backend) ----
  const runPerformanceTest = async (target, config) => {
    const targetType = target === 'single' ? 'single' : 'collection';
    const request = target === 'single' ? selectedEndpoint : endpointsList[0];
    if (!request) throw new Error('No request selected');

    const payload = {
      name: selectedCollection?.name + ' Performance' || 'Performance Test',
      targetType: targetType,
      requests: (target === 'collection' ? endpointsList : [request]).map(req => ({
        method: req.method,
        url: substituteVariables(req._request?.url?.raw || req.path, environment),
        headers: req.defaultHeaders || [],
        auth: req.authType ? { type: req.authType } : { type: 'none' },
        body: req.defaultBody ? { mode: 'raw', raw: substituteVariables(req.defaultBody, environment) } : null,
        variables: environment,
      })),
      vus: config.vus || 10,
      durationSeconds: Math.floor((config.duration || 30000) / 1000),
    };

    try {
      const result = await testingService.executePerformanceTest(payload);
      if (!result.success) throw new Error(result.error);
      const run = result.data;

      const historyEntry = {
        id: run.runId,
        collectionName: selectedCollection?.name || 'Collection',
        type: 'Performance',
        timestamp: run.startedAt,
        status: run.status.toLowerCase(),
        steps: run.steps ? run.steps.map(s => {
          const errorRate = s.errorRate || 0;
          const avgLatency = s.avgLatencyMs || 0;
          const errorRatePass = errorRate < 5;
          const latencyPass = avgLatency < 1000;
          const stepPassed = errorRatePass && latencyPass;

          return {
            id: 'perf-step-' + s.requestName,
            name: s.requestName,
            method: s.requestName.split(' ')[0] || 'GET',
            path: s.requestName.split(' ').slice(1).join(' ') || '',
            status: stepPassed ? 'passed' : 'failed',
            responseTime: Math.round(avgLatency),
            error: stepPassed ? null : 'Performance criteria not met',
            assertionResults: [
              { description: 'Error rate < 5%', passed: errorRatePass, expected: '<5%', actual: errorRate.toFixed(1)+'%' },
              { description: 'Avg latency < 1000ms', passed: latencyPass, expected: '<1000ms', actual: Math.round(avgLatency)+'ms' }
            ],
            totalRequests: s.totalRequests,
            errors: s.errors,
            errorRate: errorRate,
            avgLatencyMs: avgLatency,
          };
        }) : [],
        totalDuration: run.durationSeconds + 's',
        metrics: run.metrics,
        vus: run.vus,
        durationSeconds: run.durationSeconds,
      };
      addRunToHistory(historyEntry);
      return historyEntry;
    } catch (error) {
      console.error('Performance test failed:', error);
      throw error;
    }
  };

  // ---- Add run to history ----
  const addRunToHistory = (run) => {
    setRunHistory(prev => [run, ...prev]);
    setSelectedRunId(run.id);
    setSelectedRunData(null);
    setShowFullscreenResults(true);
  };

  const closeFullscreen = () => {
    setShowFullscreenResults(false);
    setSelectedRunData(null);
  };

  // ---- Quick actions ----
  const runFunctional = () => setActiveTab('Functional Suite');
  const runPerformance = () => setActiveTab('Performance');

  // ---- Handler for history view report ----
  const handleViewReportFromHistory = (run) => {
    setSelectedRunData(run);
    setSelectedRunId(run.id);
    setShowFullscreenResults(true);
  };

  // ---- Drag resize ----
  const onDragStart = (e) => { draggingRef.current = true; e.preventDefault(); document.body.style.cursor = 'ns-resize'; };
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !rightColRef.current) return;
      const rect = rightColRef.current.getBoundingClientRect();
      const h = rect.bottom - e.clientY;
      const max = rect.height - 160;
      const clamped = Math.min(Math.max(h, 160), Math.max(max, 160));
      setPanelHeight(clamped);
    };
    const onUp = () => { if (draggingRef.current) { draggingRef.current = false; document.body.style.cursor = ''; } };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ---- Render ----
  return (
    <>
      {showFullscreenResults ? (
        <RunResultsFullscreen
          runHistory={runHistory}
          selectedRunId={selectedRunId}
          setSelectedRunId={setSelectedRunId}
          setSelectedRunData={setSelectedRunData} 
          selectedRunData={selectedRunData}
          onBack={closeFullscreen}
        />
      ) : (
        <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: '#0e172a' }}>
          <main className="flex-1 overflow-hidden">
            <div className="mx-auto max-w-[1600px] h-full px-6 py-5 flex flex-col">
              <div className="mb-4 flex items-center justify-between shrink-0">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-0.5 flex items-center gap-2">
                    <TestTube className="w-6 h-6 text-[#ff5b1f]" /> ForgeFuzz <span className="text-sm mt-3">API Testing</span>
                  </h1>
                  <p className="text-sm text-gray-400">Inspect endpoints, craft requests, view responses</p>
                </div>
                <div className="flex items-center gap-1 bg-dark-900/60 rounded-lg border border-dark-700 p-1">
                  {tabsToShow.map(t => {
                    const active = sourceTab === t.id;
                    return <button key={t.id} onClick={() => setSourceTab(t.id)} className={cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', active ? 'bg-[#ff5b1f] text-white' : 'text-gray-400 hover:text-white hover:bg-dark-800/60')}>{t.label}</button>;
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1 border-b border-dark-700 shrink-0 mb-4">
                {API_TABS.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px', activeTab === t ? 'border-[#ff5b1f] text-[#ff5b1f]' : 'border-transparent text-gray-400 hover:text-white')}>
                    {t === 'Request' && <TestTube className="inline w-4 h-4 mr-1" />}
                    {t === 'Functional Suite' && <Play className="inline w-4 h-4 mr-1" />}
                    {t === 'Performance' && <BarChart3 className="inline w-4 h-4 mr-1" />}
                    {t === 'History' && <HistoryIcon className="inline w-4 h-4 mr-1" />}
                    {t === 'Advance Features' && <Sparkles className="inline w-4 h-4 mr-1" />}
                    {t}
                  </button>
                ))}
              </div>

              {activeTab === 'Request' && (
                <RequestTabContent
                  sourceTab={sourceTab}
                  microservices={microservices}
                  selectedServiceId={selectedServiceId}
                  setSelectedServiceId={setSelectedServiceId}
                  loadingServices={loadingServices}
                  endpointsList={endpointsList}
                  selectedEndpoint={selectedEndpoint}
                  handleEndpointClick={loadEndpointConfig}
                  environment={environment}
                  updateEnv={updateEnv}
                  showEnvPanel={showEnvPanel}
                  toggleEnvPanel={toggleEnvPanel}
                  requestUrl={requestUrl} setRequestUrl={setRequestUrl}
                  requestMethod={requestMethod} setRequestMethod={setRequestMethod}
                  queryParams={queryParams} setQueryParams={setQueryParams}
                  headers={headers} setHeaders={setHeaders}
                  authType={authType} setAuthType={setAuthType}
                  bearerToken={bearerToken} setBearerToken={setBearerToken}
                  basicUsername={basicUsername} setBasicUsername={setBasicUsername}
                  basicPassword={basicPassword} setBasicPassword={setBasicPassword}
                  bodyType={bodyType} setBodyType={setBodyType}
                  rawLanguage={rawLanguage} setRawLanguage={setRawLanguage}
                  rawBody={rawBody} setRawBody={setRawBody}
                  formData={formData} setFormData={setFormData}
                  urlEncoded={urlEncoded} setUrlEncoded={setUrlEncoded}
                  activeRequestTab={activeRequestTab} setActiveRequestTab={setActiveRequestTab}
                  response={response} isLoading={isLoading}
                  responseTime={responseTime} responseSize={responseSize}
                  activeResponseTab={activeResponseTab} setActiveResponseTab={setActiveResponseTab}
                  copied={copied} setCopied={setCopied}
                  traceOpen={traceOpen} setTraceOpen={setTraceOpen}
                  panelHeight={panelHeight} setPanelHeight={setPanelHeight}
                  panelOpen={panelOpen} setPanelOpen={setPanelOpen}
                  rightColRef={rightColRef} draggingRef={draggingRef}
                  onDragStart={onDragStart}
                  handleSendRequest={handleSendRequest}
                  statusColor={statusColor} statusTextColor={statusTextColor}
                  formatResponseBody={formatResponseBody} handleCopyResponse={handleCopyResponse}
                  BODY_TYPES={BODY_TYPES} KVTable={KVTable} METHOD_COLORS={METHOD_COLORS}
                  addQueryParam={addQueryParam} updateQueryParam={updateQueryParam} removeQueryParam={removeQueryParam}
                  addHeader={addHeader} updateHeader={updateHeader} removeHeader={removeHeader}
                  addFormRow={addFormRow} updateFormRow={updateFormRow} removeFormRow={removeFormRow}
                  addEncRow={addEncRow} updateEncRow={updateEncRow} removeEncRow={removeEncRow}
                  bodyCount={bodyCount}
                  collectionLoading={collectionLoading}
                />
              )}

              {activeTab === 'Functional Suite' && (
                <FunctionalSuiteView
                  endpointsList={endpointsList}
                  environment={environment}
                  selectedCollection={microservices.find(s => s.id === selectedServiceId)}
                  addRunToHistory={addRunToHistory}
                  METHOD_COLORS={METHOD_COLORS}
                  runFunctionalSuite={runFunctionalSuite}
                  collectionLoading={collectionLoading}
                />
              )}

              {activeTab === 'Performance' && (
                <PerformanceView
                  endpointsList={endpointsList}
                  selectedEndpoint={selectedEndpoint}
                  setSelectedEndpoint={setSelectedEndpoint}
                  environment={environment}
                  selectedCollection={microservices.find(s => s.id === selectedServiceId)}
                  addRunToHistory={addRunToHistory}
                  METHOD_COLORS={METHOD_COLORS}
                  runPerformanceTest={runPerformanceTest}
                  collectionLoading={collectionLoading}
                />
              )}

              {activeTab === 'History' && (
                <HistoryView
                  runHistory={runHistory}
                  setSelectedRunId={setSelectedRunId}
                  setShowFullscreenResults={setShowFullscreenResults}
                  onViewReport={handleViewReportFromHistory}
                />
              )}

              {/* ====== ADVANCE FEATURES (API‑specific) ====== */}
              {activeTab === 'Advance Features' && (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scroll mt-4 pr-1 pb-6">
                  <div className="mb-5 p-5 rounded-xl border border-[#ff5b1f]/30 bg-gradient-to-r from-[#ff5b1f]/10 to-transparent flex items-start gap-4">
                    <div className="w-11 h-11 rounded-lg bg-[#ff5b1f]/20 border border-[#ff5b1f]/40 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-[#ff5b1f]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white">Supercharge your API testing</h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        ForgeFuzz gives you enterprise‑grade tooling for mocking, environments, monitoring,
                        load testing and team collaboration – all seamlessly integrated with your existing API workflows.
                      </p>
                    </div>
                    <button
                      onClick={() => setToast({ message: 'Talk to our team to enable these features in your workspace.', type: 'success' })}
                      className="shrink-0 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-sm font-semibold transition-colors"
                    >
                      Request access
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {PRO_FEATURES.map(f => {
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setToast({ message: `${f.title} is part of ForgeFuzz Pro — upgrade to unlock this and more.`, type: 'success' })}
                          className="text-left p-5 rounded-xl border border-dark-700 hover:border-[#ff5b1f]/60 hover:bg-[#ff5b1f]/5 transition-all group"
                          style={{ backgroundColor: 'rgb(22 27 48)' }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-dark-900/60 border border-dark-700 group-hover:border-[#ff5b1f]/40 flex items-center justify-center transition-colors">
                              <Icon className="w-5 h-5 text-[#ff5b1f]" />
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff5b1f]/10 text-[#ff5b1f] border border-[#ff5b1f]/30">
                              ForgeFuzz
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mb-1.5">{f.title}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </main>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          <style>{`.custom-scroll::-webkit-scrollbar { width: 8px; height: 8px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; } .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,91,31,0.4); }`}</style>
          <RequestTraceDrawer open={traceOpen} onClose={() => setTraceOpen(false)} title="API request trace" phases={response?.phases} summary={{ totalMs: response?.totalMs, finalUrl: response?.finalUrl, method: response?.method, status: response?.status, remote: response?.network?.remoteAddress, tls: response?.network?.tlsProtocol }} />
        </div>
      )}
    </>
  );
}


// ======================================================================
// REQUEST TAB CONTENT – Updated with tooltips for status, time, size
// ======================================================================
function RequestTabContent(props) {
  const {
    sourceTab,
    microservices, selectedServiceId, setSelectedServiceId, loadingServices,
    endpointsList, selectedEndpoint, handleEndpointClick,
    environment, updateEnv, showEnvPanel, toggleEnvPanel,
    requestUrl, setRequestUrl, requestMethod, setRequestMethod,
    queryParams, setQueryParams, headers, setHeaders,
    authType, setAuthType, bearerToken, setBearerToken,
    basicUsername, setBasicUsername, basicPassword, setBasicPassword,
    bodyType, setBodyType, rawLanguage, setRawLanguage,
    rawBody, setRawBody, formData, setFormData,
    urlEncoded, setUrlEncoded,
    activeRequestTab, setActiveRequestTab,
    response, isLoading, responseTime, responseSize,
    activeResponseTab, setActiveResponseTab,
    copied, setCopied, traceOpen, setTraceOpen,
    panelHeight, setPanelHeight, panelOpen, setPanelOpen,
    rightColRef, draggingRef, onDragStart,
    handleSendRequest, statusColor, statusTextColor,
    formatResponseBody, handleCopyResponse,
    BODY_TYPES, KVTable, METHOD_COLORS,
    addQueryParam, updateQueryParam, removeQueryParam,
    addHeader, updateHeader, removeHeader,
    addFormRow, updateFormRow, removeFormRow,
    addEncRow, updateEncRow, removeEncRow,
    bodyCount, collectionLoading
  } = props;

  const [searchTerm, setSearchTerm] = useState('');
  const filteredEndpoints = endpointsList.filter(ep => 
    ep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // For service selection
  const handleServiceSelect = (service) => {
    if (service) setSelectedServiceId(service.id);
  };

  const serviceOptions = microservices.map(s => ({
    id: s.id,
    name: s.name,
    label: s.name,
  }));

  // ---- Tooltip refs & state ----
  const statusRef = useRef(null);
  const durationRef = useRef(null);
  const sizeRef = useRef(null);
  const [statusTooltipVisible, setStatusTooltipVisible] = useState(false);
  const [durationTooltipVisible, setDurationTooltipVisible] = useState(false);
  const [sizeTooltipVisible, setSizeTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const showTooltip = (ref, setVisible) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - 120;
    let y = rect.bottom + 8;
    if (x < 16) x = 16;
    if (x + 240 > window.innerWidth - 16) x = window.innerWidth - 256;
    if (y + 180 > window.innerHeight - 16) y = rect.top - 188;
    setTooltipPosition({ x, y });
    setVisible(true);
  };

  const handleStatusHover = () => showTooltip(statusRef, setStatusTooltipVisible);
  const handleStatusLeave = () => setStatusTooltipVisible(false);
  const handleDurationHover = () => showTooltip(durationRef, setDurationTooltipVisible);
  const handleDurationLeave = () => setDurationTooltipVisible(false);
  const handleSizeHover = () => showTooltip(sizeRef, setSizeTooltipVisible);
  const handleSizeLeave = () => setSizeTooltipVisible(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 flex-1 min-h-0">
      <aside className="flex flex-col gap-4 min-h-0">
        <Card className="p-3 shrink-0 border border-dark-700" style={{ backgroundColor: 'rgb(22 27 48)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-semibold text-white uppercase tracking-wider">
              {sourceTab === 'microservice' ? 'Microservice' : sourceTab === 'apigee-proxy' ? 'Proxy' : 'Kong'}
            </h3>
            <button onClick={toggleEnvPanel} className="p-1 rounded-md hover:bg-dark-800 text-gray-400 hover:text-white transition" title="Environment Variables">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          {loadingServices ? (
            <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>
          ) : microservices.length === 0 ? (
            <div className="text-xs text-gray-500">No services found</div>
          ) : (
            <SearchableSelect
              options={serviceOptions}
              value={serviceOptions.find(s => s.id === selectedServiceId)}
              onChange={handleServiceSelect}
              placeholder="Search services..."
              renderOption={(opt) => <span>{opt.name}</span>}
            />
          )}
        </Card>

        <Card className="flex-1 flex flex-col min-h-0 border border-dark-700 overflow-hidden" style={{ backgroundColor: 'rgb(22 27 48)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 shrink-0">
            <div className="flex items-center gap-2"><List className="w-4 h-4 text-[#ff5b1f]" /><h3 className="text-sm font-semibold text-white uppercase tracking-wider">Endpoints</h3></div>
            <span className="text-[11px] text-gray-500 px-2 py-0.5 rounded-full bg-dark-900/60 border border-dark-700">{endpointsList.length}</span>
          </div>
          <div className="px-3 py-2 border-b border-dark-700/60">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-dark-900/60 border border-dark-700 rounded text-white text-sm outline-none focus:border-[#ff5b1f] placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scroll">
            {collectionLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading collection...</div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No matching endpoints</div>
            ) : (
              filteredEndpoints.map((endpoint) => {
                const active = selectedEndpoint?.id === endpoint.id;
                return (
                  <button key={endpoint.id} onClick={() => handleEndpointClick(endpoint)} className={cn("w-full text-left px-4 py-2.5 flex items-center gap-3 border-l-2 transition-all", active ? "border-l-[#ff5b1f] bg-[#ff5b1f]/10" : "border-l-transparent hover:bg-dark-800/40")}>
                    <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 w-[52px] text-center", METHOD_COLORS[endpoint.method] || 'text-gray-400 bg-gray-500/10 border-gray-500/20')}>{endpoint.method}</span>
                    <span className="text-sm font-mono truncate text-gray-300">{endpoint.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </aside>

      <section ref={rightColRef} className="flex flex-col min-h-0 gap-0 relative">
        {showEnvPanel && (
          <div className="bg-dark-900/80 border border-dark-700 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-white">Environment Variables</h4>
              <button onClick={toggleEnvPanel} className="text-xs text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {Object.entries(environment).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono min-w-[80px]">{key}</span>
                  <input type="text" value={value} onChange={(e) => updateEnv(key, e.target.value)} className="flex-1 px-2 py-1 bg-dark-900/60 border border-dark-700 rounded text-white text-xs outline-none focus:border-[#ff5b1f]" />
                </div>
              ))}
            </div>
          </div>
        )}

        <Card className="flex flex-col min-h-0 border border-dark-700 overflow-hidden" style={{ backgroundColor: 'rgb(22 27 48)', flex: panelOpen ? '1 1 auto' : '1 1 auto', height: panelOpen ? `calc(100% - ${panelHeight + 8}px)` : '100%', transition: draggingRef.current ? 'none' : 'height 0.25s ease' }}>
          <div className="p-4 border-b border-dark-700 shrink-0">
            <div className="flex gap-0 items-stretch rounded-lg border border-dark-700 focus-within:border-[#ff5b1f] transition-colors overflow-hidden bg-dark-900/60">
              <select value={requestMethod} onChange={(e) => setRequestMethod(e.target.value)} className={cn("px-3 py-2.5 bg-dark-900/80 text-sm font-mono font-bold outline-none border-r border-dark-700 cursor-pointer", requestMethod === 'GET' && 'text-green-400', requestMethod === 'POST' && 'text-blue-400', requestMethod === 'PUT' && 'text-yellow-400', requestMethod === 'DELETE' && 'text-red-400', requestMethod === 'PATCH' && 'text-purple-400')}>
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
              </select>
              <input value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendRequest(); } }} placeholder="https://api.example.com/endpoint" className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white font-mono outline-none placeholder-gray-600" />
              <button onClick={handleSendRequest} disabled={isLoading || !requestUrl?.trim()} className="px-6 bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
              </button>
            </div>
          </div>

          <div className="px-4 border-b border-dark-700 shrink-0 flex gap-0 overflow-x-auto custom-scroll">
            {[
              { id: 'params', label: 'Params', icon: Edit3, count: queryParams.filter(p => p.enabled && p.key).length },
              { id: 'headers', label: 'Headers', icon: FileText, count: headers.filter(h => h.enabled && h.key).length },
              { id: 'auth', label: 'Authorization', icon: Shield, count: authType !== 'none' ? 1 : 0 },
              { id: 'body', label: 'Body', icon: Code, count: bodyCount() }
            ].map(tab => {
              const Icon = tab.icon; const active = activeRequestTab === tab.id;
              return <button key={tab.id} onClick={() => setActiveRequestTab(tab.id)} className={cn("flex items-center gap-2 px-4 py-1 text-xs font-medium transition-colors border-b-2 whitespace-nowrap", active ? "text-white border-[#ff5b1f]" : "text-gray-400 border-transparent hover:text-gray-200")}>
                <Icon className="w-3.5 h-3.5" /> {tab.label} {tab.count > 0 && <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-mono", active ? "bg-[#ff5b1f]/20 text-[#ff5b1f]" : "bg-dark-700 text-gray-400")}>{tab.count}</span>}
              </button>;
            })}
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-4">
            {activeRequestTab === 'params' && (
              <div className="space-y-3">
                <div><h4 className="text-sm font-semibold text-white">Query Parameters</h4><p className="text-xs text-gray-500 mt-0.5">Key/value pairs appended to the request URL.</p></div>
                <KVTable items={queryParams} onUpdate={updateQueryParam} onRemove={removeQueryParam} onAdd={addQueryParam} keyLabel="Parameter" valueLabel="Value" addLabel="Add parameter" />
              </div>
            )}
            {activeRequestTab === 'headers' && (
              <div className="space-y-3">
                <div><h4 className="text-sm font-semibold text-white">Request Headers</h4><p className="text-xs text-gray-500 mt-0.5">HTTP headers sent with the request.</p></div>
                <KVTable items={headers} onUpdate={updateHeader} onRemove={removeHeader} onAdd={addHeader} keyLabel="Header" valueLabel="Value" addLabel="Add header" />
              </div>
            )}
            {activeRequestTab === 'auth' && (
              <div className="space-y-4 max-w-xl">
                <div><h4 className="text-sm font-semibold text-white">Authorization</h4><p className="text-xs text-gray-500 mt-0.5">Choose how this request authenticates.</p></div>
                <div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Type</label><select value={authType} onChange={(e) => setAuthType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm outline-none focus:border-[#ff5b1f] transition-colors cursor-pointer"><option value="none">No Auth</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option></select></div>
                {authType === 'bearer' && <div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Token</label><input type="password" value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} placeholder="Enter bearer token" className="w-full px-3 py-2.5 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm font-mono outline-none focus:border-[#ff5b1f] transition-colors" /><p className="text-[11px] text-gray-500 mt-1.5">Sent as Authorization: Bearer &lt;token&gt;.</p></div>}
                {authType === 'basic' && <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Username</label><input value={basicUsername} onChange={(e) => setBasicUsername(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm outline-none focus:border-[#ff5b1f] transition-colors" /></div><div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Password</label><input type="password" value={basicPassword} onChange={(e) => setBasicPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm outline-none focus:border-[#ff5b1f] transition-colors" /></div></div>}
                {authType === 'none' && <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-dark-700 bg-dark-900/30 text-center"><div className="w-12 h-12 rounded-full bg-dark-900/80 border border-dark-700 flex items-center justify-center mb-3"><Shield className="w-5 h-5 text-gray-500" /></div><p className="text-sm text-gray-200 font-medium">No authorization configured</p><p className="text-xs text-gray-500 mt-1 max-w-xs">Pick a type above to attach credentials.</p></div>}
              </div>
            )}
            {activeRequestTab === 'body' && (
              <div className="space-y-2 h-full flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  {BODY_TYPES.map(t => { const active = bodyType === t.id; return <button key={t.id} onClick={() => setBodyType(t.id)} className={cn("px-2 py-1 text-xs font-mono rounded-md border transition-colors", active ? "bg-[#ff5b1f]/15 border-[#ff5b1f]/40 text-[#ff5b1f]" : "bg-dark-900/40 border-dark-700 text-gray-400 hover:text-gray-200 hover:border-dark-600")}>{t.label}</button>; })}
                  {bodyType === 'raw' && <><div className="h-5 w-px bg-dark-700 mx-1"></div><select value={rawLanguage} onChange={(e) => setRawLanguage(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-[#ff5b1f]/40 bg-[#ff5b1f]/5 text-[#ff5b1f] font-mono outline-none focus:border-[#ff5b1f] cursor-pointer"><option value="json" className="bg-gray-900">JSON</option><option value="text" className="bg-gray-900">Text</option></select></>}
                </div>
                <div className="flex-1 min-h-[220px]">
                  {bodyType === 'none' && <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-dark-700 bg-dark-900/30"><Code className="w-8 h-8 text-gray-600 mb-2" /><p className="text-sm text-gray-400">This request does not have a body</p><p className="text-xs text-gray-600 mt-1">Select a body type above to add one.</p></div>}
                  {bodyType === 'form-data' && <KVTable items={formData} onUpdate={updateFormRow} onRemove={removeFormRow} onAdd={addFormRow} keyLabel="Field" valueLabel="Value" addLabel="Add field" />}
                  {bodyType === 'x-www-form-urlencoded' && <KVTable items={urlEncoded} onUpdate={updateEncRow} onRemove={removeEncRow} onAdd={addEncRow} keyLabel="Key" valueLabel="Value" addLabel="Add key" />}
                  {bodyType === 'raw' && <div className="h-full flex flex-col gap-2"><div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{rawLanguage} payload</span>{rawLanguage === 'json' && rawBody && <button onClick={() => { try { setRawBody(JSON.stringify(JSON.parse(rawBody), null, 2)); } catch (e) { /* noop */ } }} className="text-xs text-[#ff5b1f] hover:underline">Beautify</button>}</div><div className="flex-1 min-h-[260px] rounded-lg border border-dark-700 overflow-hidden bg-[#0e172a]"><MonacoBox height="100%" language={rawLanguage === 'text' ? 'plaintext' : rawLanguage} value={rawBody} onChange={(v) => setRawBody(v ?? '')} label="Request body" /></div></div>}
                </div>
              </div>
            )}
          </div>
        </Card>

{panelOpen && (
  <>
    <div onMouseDown={onDragStart} className="group h-2 mt-1.5 shrink-0 flex items-center justify-center cursor-ns-resize rounded-md bg-dark-800/60 hover:bg-[#ff5b1f]/20 transition-colors">
      <GripHorizontal className="w-5 h-5 text-gray-600 group-hover:text-[#ff5b1f] transition-colors" />
    </div>
    <Card className="mt-1.5 flex flex-col border border-dark-700 overflow-hidden" style={{ backgroundColor: 'rgb(22 27 48)', height: `${panelHeight}px` }}>
      <div className="px-5 py-3 shrink-0 border-b border-dark-700 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", statusColor)}></span>
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Response</span>
          </div>
          <div className="h-4 w-px bg-dark-700"></div>
          {isLoading ? (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Sending…
            </span>
          ) : response ? (
            <>
              {/* Status with tooltip */}
              <span
                ref={statusRef}
                className={cn("text-xs font-mono font-bold cursor-help", statusTextColor)}
                onMouseEnter={handleStatusHover}
                onMouseLeave={handleStatusLeave}
              >
                {response.status} {response.statusText}
              </span>

              {/* Time with tooltip */}
              {responseTime && (
                <span
                  ref={durationRef}
                  className="text-xs text-gray-400 flex items-center gap-1 font-mono cursor-help"
                  onMouseEnter={handleDurationHover}
                  onMouseLeave={handleDurationLeave}
                >
                  <Clock className="w-3 h-3" /> {responseTime}
                </span>
              )}

              {/* Size with tooltip */}
              {responseSize && (
                <span
                  ref={sizeRef}
                  className="text-xs text-gray-400 flex items-center gap-1 font-mono cursor-help"
                  onMouseEnter={handleSizeHover}
                  onMouseLeave={handleSizeLeave}
                >
                  <HardDrive className="w-3 h-3" /> {responseSize}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500">Hit Send to see response</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {response?.phases && response.phases.length > 0 && (
            <button
              onClick={() => setTraceOpen(true)}
              className="p-1.5 rounded-md text-gray-400 hover:text-[#ff5b1f] hover:bg-dark-800 transition-colors"
              title="View request trace"
            >
              <Activity className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (!rightColRef.current) return;
              const h = rightColRef.current.getBoundingClientRect().height - 160;
              setPanelHeight(p => p >= h ? 340 : h);
            }}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => setPanelOpen(false)}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tooltips */}
      {statusTooltipVisible && (
        <div
          className="fixed z-50 bg-dark-900/95 border border-dark-700/80 rounded-lg shadow-2xl p-3 backdrop-blur-sm"
          style={{ top: tooltipPosition.y, left: tooltipPosition.x }}
          onMouseEnter={() => setStatusTooltipVisible(true)}
          onMouseLeave={handleStatusLeave}
        >
          <ResponseTooltip type="status" response={response} />
        </div>
      )}
      {durationTooltipVisible && (
        <div
          className="fixed z-50 bg-dark-900/95 border border-dark-700/80 rounded-lg shadow-2xl p-3 backdrop-blur-sm"
          style={{ top: tooltipPosition.y, left: tooltipPosition.x }}
          onMouseEnter={() => setDurationTooltipVisible(true)}
          onMouseLeave={handleDurationLeave}
        >
          <WaterfallTooltip phases={response?.phases || []} />
        </div>
      )}
      {sizeTooltipVisible && (
        <div
          className="fixed z-50 bg-dark-900/95 border border-dark-700/80 rounded-lg shadow-2xl p-3 backdrop-blur-sm"
          style={{ top: tooltipPosition.y, left: tooltipPosition.x }}
          onMouseEnter={() => setSizeTooltipVisible(true)}
          onMouseLeave={handleSizeLeave}
        >
          <ResponseTooltip type="size" response={response} network={response?.network} />
        </div>
      )}

      <div className="px-5 border-b border-dark-700 shrink-0 flex items-center justify-between">
        <div className="flex gap-0">
          {[
            { id: 'body', label: 'Body' },
            { id: 'headers', label: 'Headers', count: Object.keys(response?.headers || {}).length }
          ].map(tab => {
            const active = activeResponseTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveResponseTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  active ? "text-white border-[#ff5b1f]" : "text-gray-400 border-transparent hover:text-gray-200"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                    active ? "bg-[#ff5b1f]/20 text-[#ff5b1f]" : "bg-dark-700 text-gray-400"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleCopyResponse}
          disabled={!response}
          className="text-xs text-gray-400 hover:text-[#ff5b1f] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-dark-800 transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-dark-900/40">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff5b1f]" />
            <p className="text-sm text-gray-400">Waiting for response…</p>
          </div>
        ) : response ? (
          activeResponseTab === 'body' ? (
            <div className="h-full bg-[#0e172a]">
              <MonacoBox
                height="100%"
                language={(response.headers?.['content-type'] || response.headers?.['Content-Type'] || '').includes('json') ? 'json' : 'plaintext'}
                value={formatResponseBody(response.data)}
                readOnly
                label="Response body"
              />
            </div>
          ) : (
            <div className="h-full overflow-auto custom-scroll p-5 font-mono text-sm space-y-1.5">
              {Object.entries(response.headers || {}).length === 0 ? (
                <p className="text-gray-500 text-xs">No headers returned.</p>
              ) : (
                Object.entries(response.headers || {}).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[200px_1fr] gap-4 py-1.5 border-b border-dark-700/50">
                    <span className="text-[#ff5b1f]">{k}</span>
                    <span className="text-gray-300 break-all">{String(v)}</span>
                  </div>
                ))
              )}
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">No response yet.</div>
        )}
      </div>
    </Card>
  </>
)}
      </section>
    </div>
  );
}

// ======================================================================
// FUNCTIONAL SUITE VIEW
// ======================================================================
function FunctionalSuiteView({ endpointsList, environment, selectedCollection, addRunToHistory, METHOD_COLORS, runFunctionalSuite, collectionLoading }) {
  const [orderedItems, setOrderedItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [assertions, setAssertions] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [editableBodies, setEditableBodies] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (endpointsList.length > 0) {
      if (orderedItems.length === 0 || orderedItems.length !== endpointsList.length) {
        setOrderedItems(endpointsList.map((item, idx) => ({ ...item, order: idx })));
        const bodies = {};
        endpointsList.forEach(item => {
          if (item.defaultBody) bodies[item.id] = item.defaultBody;
        });
        setEditableBodies(bodies);
      }
    }
  }, [endpointsList]);

  const filteredItems = orderedItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const handleDragStart = (e, index) => e.dataTransfer.setData('text/plain', index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIndex === targetIndex) return;
    const newList = [...orderedItems];
    const [removed] = newList.splice(sourceIndex, 1);
    newList.splice(targetIndex, 0, removed);
    setOrderedItems(newList);
  };

  const updateAssertion = (itemId, key, value) => {
    setAssertions(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { status: 200, bodyContains: '', maxResponseTime: 500 }), [key]: value }
    }));
  };

  const updateEditableBody = (itemId, value) => {
    setEditableBodies(prev => ({ ...prev, [itemId]: value }));
  };

  const runSuite = async () => {
    setIsRunning(true);
    const requests = orderedItems.map(item => {
      const copy = JSON.parse(JSON.stringify(item));
      if (editableBodies[item.id] !== undefined) copy.defaultBody = editableBodies[item.id];
      return copy;
    });
    const run = await runFunctionalSuite(requests, assertions);
    setIsRunning(false);
    addRunToHistory(run);
  };

  if (collectionLoading) {
    return <div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading collection...</div>;
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-2"><Server className="w-4 h-4 text-[#ff5b1f]" /><span className="text-sm font-semibold text-white">Functional Suite – {selectedCollection?.name || 'Collection'}</span></div>
        <button onClick={runSuite} disabled={isRunning || orderedItems.length === 0} className="px-4 py-2 bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 rounded-lg text-white font-semibold disabled:opacity-50 transition flex items-center gap-2">
          {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4" /> Run Suite</>}
        </button>
        <div className="flex-1"></div>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-dark-900/60 border border-dark-700 rounded text-white text-sm outline-none focus:border-[#ff5b1f] placeholder-gray-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2 border border-dark-700 rounded-lg bg-dark-900/30">
        <div className="text-xs text-gray-400 mb-2">Drag to reorder sequence.</div>
        {filteredItems.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx)} className="bg-dark-900/40 border border-dark-700 rounded-lg hover:border-[#ff5b1f]/40 transition cursor-grab">
              <div className="flex items-center gap-2 p-2" onClick={() => toggleExpand(item.id)}>
                <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 w-[52px] text-center", METHOD_COLORS[item.method] || 'text-gray-400')}>{item.method}</span>
                <span className="text-sm font-mono text-gray-200 truncate flex-1">{item.name}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-dark-700/60 space-y-3">
                  <div className="text-xs text-gray-400">URL: <span className="text-gray-300 font-mono break-all">{item._request?.url?.raw || item.path}</span></div>
                  {item.defaultBody && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Body (editable):</div>
                      <div className="h-32 rounded-lg border border-dark-700 overflow-hidden bg-[#0e172a]">
                        <MonacoBox height="100%" language="json" value={editableBodies[item.id] || item.defaultBody} onChange={(v) => updateEditableBody(item.id, v)} label="Body" />
                      </div>
                    </div>
                  )}
                  <div className="bg-dark-800/40 p-2 rounded-md border border-dark-700">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Assertions</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-[10px] text-gray-500 block">Status Code</label><input type="number" value={assertions[item.id]?.status || 200} onChange={(e) => updateAssertion(item.id, 'status', parseInt(e.target.value) || 200)} className="w-full px-2 py-1 bg-dark-900/60 border border-dark-700 rounded text-white text-xs" /></div>
                      <div><label className="text-[10px] text-gray-500 block">Body Contains</label><input value={assertions[item.id]?.bodyContains || ''} onChange={(e) => updateAssertion(item.id, 'bodyContains', e.target.value)} placeholder="text" className="w-full px-2 py-1 bg-dark-900/60 border border-dark-700 rounded text-white text-xs" /></div>
                      <div><label className="text-[10px] text-gray-500 block">Max Time (ms)</label><input type="number" value={assertions[item.id]?.maxResponseTime || 500} onChange={(e) => updateAssertion(item.id, 'maxResponseTime', parseInt(e.target.value) || 500)} className="w-full px-2 py-1 bg-dark-900/60 border border-dark-700 rounded text-white text-xs" /></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!filteredItems.length && !collectionLoading && <div className="text-center py-10 text-gray-500 text-sm">No matching endpoints</div>}
      </div>
    </div>
  );
}

// ======================================================================
// PERFORMANCE VIEW (fields aligned, expandable cards)
// ======================================================================
function PerformanceView({ endpointsList, selectedEndpoint, setSelectedEndpoint, environment, selectedCollection, addRunToHistory, METHOD_COLORS, runPerformanceTest, collectionLoading }) {
  const [targetType, setTargetType] = useState('single');
  const [vus, setVus] = useState(5);
  const [duration, setDuration] = useState('20');
  const [runStatus, setRunStatus] = useState('idle');
  const [metrics, setMetrics] = useState({ avgLatency: 0, errorRate: 0, rps: 0 });
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  if (collectionLoading) {
    return <div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading collection...</div>;
  }

  const handleEndpointSelect = (opt) => {
    setSelectedEndpoint(opt);
  };

  const startLoadTest = async () => {
    if (targetType === 'single' && !selectedEndpoint) return;
    setRunStatus('running');
    setMetrics({ avgLatency: 0, errorRate: 0, rps: 0 });
    const durationMs = parseInt(duration) * 1000 || 30000;
    const run = await runPerformanceTest(targetType === 'single' ? 'single' : 'collection', { vus, duration: durationMs });
    setRunStatus('completed');
    const step = run.steps[0];
    setMetrics({
      avgLatency: step?.responseTime || 0,
      errorRate: parseFloat(step?.assertionResults?.[0]?.actual) || 0,
      rps: 0
    });
    addRunToHistory(run);
  };

  const renderEndpointCard = (ep) => {
    const isExpanded = expandedId === ep.id;
    const url = ep._request?.url?.raw || ep.path;
    const substitutedUrl = substituteVariables(url, environment);
    const headers = Array.isArray(ep.defaultHeaders) ? ep.defaultHeaders : [];
    const body = ep.defaultBody ? substituteVariables(ep.defaultBody, environment) : null;

    return (
      <div key={ep.id} className="bg-dark-900/40 border border-dark-700 rounded-lg hover:border-[#ff5b1f]/40 transition">
        <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => toggleExpand(ep.id)}>
          <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 w-[52px] text-center", METHOD_COLORS[ep.method] || 'text-gray-400')}>{ep.method}</span>
          <span className="text-sm font-mono text-gray-200 truncate flex-1">{ep.name}</span>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-dark-700/60 space-y-3">
            <div className="text-xs text-gray-400">URL: <span className="text-gray-300 font-mono break-all">{substitutedUrl}</span></div>
            {body && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Body:</div>
                <pre className="text-gray-300 font-mono text-xs bg-dark-900/60 p-2 rounded border border-dark-700 overflow-auto max-h-32">
                  {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
                </pre>
              </div>
            )}
            {headers.length > 0 && (
              <div className="text-xs text-gray-400">Headers: <span className="text-gray-300">{headers.map(h => `${h.key}: ${h.value}`).join(', ')}</span></div>
            )}
            <div className="text-xs text-gray-400">Auth: <span className="text-gray-300">{ep.authType || 'none'}</span></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto p-2">
      {/* Config fields in 2 columns with equal widths */}
<div className="space-y-2">
  {/* Row 1: Collection + Target */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 whitespace-nowrap w-24">Collection</span>
      <div className="flex-1 px-3 py-2 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm truncate">
        {selectedCollection?.name || 'None'}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 whitespace-nowrap w-24">Target</span>
      <select
        value={targetType}
        onChange={(e) => setTargetType(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm outline-none focus:border-[#ff5b1f]"
      >
        <option value="single">Single Endpoint</option>
        <option value="collection">Collection Journey</option>
      </select>
    </div>
  </div>

{targetType === 'single' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm text-gray-400 whitespace-nowrap w-24">Request</span>
      <SearchableSelect
        options={endpointsList}
        value={selectedEndpoint}
        onChange={handleEndpointSelect}
        placeholder="Search endpoint..."
        renderOption={(opt) => (
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded", METHOD_COLORS[opt.method] || 'text-gray-400')}>
              {opt.method}
            </span>
            <span className="text-gray-300">{opt.name}</span>
          </div>
        )}
        className="flex-1 min-w-0"   // ensure it doesn't overflow
      />
    </div>
    {/* Hidden placeholder to balance the grid – same structure but invisible */}
    <div className="invisible flex items-center gap-2">
      <span className="w-24">Request</span>
      <div className="flex-1">dummy</div>
    </div>
  </div>
)}

  {/* Row 3: VUs + Duration */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 whitespace-nowrap w-24">Virtual Users</span>
      <input
        type="number"
        value={vus}
        min="1"
        max="10"
        onChange={(e) => setVus(Number(e.target.value))}
        className="flex-1 px-3 py-2 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm outline-none focus:border-[#ff5b1f]"
      />
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 whitespace-nowrap w-24">Duration (s)</span>
      <input
        type="number"
        value={duration}
        min="0"
        max="20"
        onChange={(e) => setDuration(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-dark-700 bg-dark-900/60 text-white text-sm outline-none focus:border-[#ff5b1f]"
      />
    </div>
  </div>
</div>

      <div className="flex justify-end">
        <button onClick={startLoadTest} disabled={runStatus === 'running' || (targetType === 'single' && !selectedEndpoint) || !selectedCollection || endpointsList.length === 0} className="px-4 py-2 bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 rounded-lg text-white font-semibold disabled:opacity-50 transition flex items-center gap-2">
          {runStatus === 'running' ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><BarChart3 className="w-4 h-4" /> Start Load Test</>}
        </button>
      </div>

      {targetType === 'single' && selectedEndpoint && (
        <div className="space-y-2">
          {renderEndpointCard(selectedEndpoint)}
        </div>
      )}

      {targetType === 'collection' && (
        <div className="bg-dark-900/40 border border-dark-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-dark-700/60">
            <span className="text-sm font-semibold text-white">All Endpoints ({endpointsList.length})</span>
            <span className="text-xs text-gray-400">Expand to see details</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
            {endpointsList.map(ep => renderEndpointCard(ep))}
          </div>
        </div>
      )}

      {runStatus === 'running' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700"><div className="text-xs text-gray-400">Avg Latency</div><div className="text-xl font-mono text-white">{Math.round(metrics.avgLatency)} ms</div></div>
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700"><div className="text-xs text-gray-400">Error Rate</div><div className="text-xl font-mono text-white">{metrics.errorRate.toFixed(1)}%</div></div>
          <div className="bg-dark-900/40 p-3 rounded-lg border border-dark-700"><div className="text-xs text-gray-400">RPS</div><div className="text-xl font-mono text-white">{Math.round(metrics.rps)}</div></div>
        </div>
      )}
    </div>
  );
}

// ======================================================================
// HISTORY VIEW – Fixed performance status calculation
// ======================================================================
function HistoryView({ runHistory, setSelectedRunId, setShowFullscreenResults, onViewReport }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      const res = await testingService.getHistory(params);
      if (res.success) {
        const data = res.data.content || res.data;
        const normalized = data.map(item => {
          const isPerformance = item.type === 'PERFORMANCE';

          const steps = (item.details?.steps || []).map(s => {
            let stepStatus = 'failed';
            if (isPerformance) {
              // Calculate based on metrics
              const errorRate = s.errorRate ?? 0;
              const avgLatency = s.avgLatencyMs ?? 0;
              const errorRatePass = errorRate < 5;
              const latencyPass = avgLatency < 1000;
              stepStatus = (errorRatePass && latencyPass) ? 'passed' : 'failed';
            } else {
              stepStatus = s.passed !== undefined ? (s.passed ? 'passed' : 'failed') : 'failed';
            }

            let method = s.method || '';
            let path = s.url || '';
            if (!method && s.requestName) {
              const parts = s.requestName.split(' ');
              if (parts.length > 1 && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(parts[0])) {
                method = parts[0];
                path = parts.slice(1).join(' ');
              }
            }

            return {
              name: s.requestName || s.name || 'Step',
              method: method || 'GET',
              path: path || '/',
              responseTime: s.responseTimeMs || s.avgLatencyMs || 0,
              status: stepStatus,
              requestName: s.requestName,
              url: s.url,
              statusCode: s.status,
              errorMessage: s.errorMessage,
              assertionResults: s.assertionResults || [],
              avgLatencyMs: s.avgLatencyMs,
              totalRequests: s.totalRequests,
              errors: s.errors,
              errorRate: s.errorRate,
            };
          });

          return {
            id: item.id,
            collectionName: item.name,
            type: item.type,
            timestamp: item.timestamp,
            status: item.status.toLowerCase(),
            runBy: item.runByEmail || 'Unknown',
            steps: steps,
            totalDuration: (item.durationMs / 1000).toFixed(1),
            metrics: item.details?.metrics || null,
            vus: item.details?.vus,
            durationSeconds: item.details?.durationSeconds,
          };
        });
        setHistory(normalized);
        setTotal(res.data.totalElements || data.length);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const handleViewReport = (run) => {
    onViewReport(run);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading history...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h2 className="text-xl font-bold text-white mb-4">Test Run History</h2>
      <div className="space-y-2">
        {history.length === 0 && <div className="text-gray-500">No runs yet.</div>}
        {history.map((run) => (
          <div key={run.id} className="flex items-center justify-between p-3 bg-dark-900/40 border border-dark-700 rounded-lg hover:bg-dark-800/40 transition">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{run.collectionName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-gray-300">{run.type}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{new Date(run.timestamp).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className={run.status === 'passed' ? 'text-green-400' : 'text-red-400'}>{run.status}</span>
              <button onClick={() => handleViewReport(run)} className="text-xs text-[#ff5b1f] hover:underline">View Report</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}