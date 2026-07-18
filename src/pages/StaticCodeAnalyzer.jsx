// src/pages/StaticCodeAnalyzer.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield, TestTube, Code, AlertTriangle, Activity,
  CheckCircle, Loader2, ChevronRight, Eye, X, Plus, Pencil, Trash2, History,
  Download, FileText, XCircle, AlertCircle, Folder,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { staticCodeAnalysisService } from '../services/staticCodeAnalysis';
import Toast from '../components/ui/toast';

/* ─────────────────── Static catalog of pipeline steps ─────────────────── */
/* Defined statically so the accordion can render placeholders *before* the
 * first SSE event arrives — gives the user instant feedback that the scan
 * actually started. The backend SSE events update each card by stepKey.    */
const PIPELINE_STEPS = [
  { key: 'BUNDLE_DOWNLOAD',  label: 'Bundle Download',    icon: Download, phase: 'DOWNLOAD' },
  { key: 'BUNDLE_EXTRACT',   label: 'Bundle Extract',     icon: Folder,   phase: 'DOWNLOAD' },
  { key: 'RULES_LOAD',       label: 'Rules Load',         icon: Shield,   phase: 'ANALYSIS' },
  { key: 'CHECKSTYLE_RUN',   label: 'Checkstyle Scan',    icon: Code,     phase: 'ANALYSIS', tool: 'CHECKSTYLE' },
  { key: 'PMD_RUN',          label: 'PMD Scan',           icon: TestTube, phase: 'ANALYSIS', tool: 'PMD' },
  { key: 'CUSTOM_RULES_RUN', label: 'Custom Rules Scan',  icon: Shield,   phase: 'ANALYSIS', tool: 'CUSTOM' },
  { key: 'SCORE_CALC',       label: 'Score Calculation',  icon: Activity, phase: 'SCORING' },
  { key: 'REPORT_SAVE',      label: 'Report Save',        icon: FileText, phase: 'PERSIST' },
];

const severityClass = (sev) =>
  ({
    CRITICAL: 'bg-red-500/20 text-red-400',
    HIGH:     'bg-orange-500/20 text-orange-400',
    MEDIUM:   'bg-yellow-500/20 text-yellow-400',
    LOW:      'bg-blue-500/20 text-blue-400',
  }[String(sev || '').toUpperCase()] || 'bg-gray-500/20 text-gray-400');

const StaticCodeAnalyzer = ({
  isGenerationDone,
  scanType = 'microservice',
  targetId,
  onResultsChange,
  initialResults = null,
}) => {
  // ─── UI States ───
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedRules, setSelectedRules] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(initialResults);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // ─── Rule Management States ───
  const [predefinedRules, setPredefinedRules] = useState([]);
  const [customRules, setCustomRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showCustomRuleModal, setShowCustomRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [customRuleForm, setCustomRuleForm] = useState({
    ruleName: '',
    description: '',
    filePattern: '',
    contentRegex: '',
    severity: 'MEDIUM',
    isActive: true,
  });
  const [submittingRule, setSubmittingRule] = useState(false);

  // ─── Streaming States ───
  /* progressMap: stepKey → progress event payload  */
  const [progressMap, setProgressMap] = useState({});
  const [expandedProgressKey, setExpandedProgressKey] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStartedAt, setProgressStartedAt] = useState(null);
  const [elapsedSec, setElapsedSec] = useState('0.0');
  const currentControllerRef = useRef(null);
  /* Once the operator clicks on a step the auto-tracker stops overriding. */
  const userPickedProgressStepRef = useRef(false);

  const onProgressStepClick = (key) => {
    userPickedProgressStepRef.current = true;
    setExpandedProgressKey((prev) => (prev === key ? null : key));
  };

  // ─── Toast helper ───
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  }, []);

  const allRules = useMemo(
    () => [
      ...predefinedRules.map((r) => ({ ...r, type: 'predefined' })),
      ...customRules.map((r) => ({ ...r, type: 'custom' })),
    ],
    [predefinedRules, customRules]
  );

  const fetchRules = useCallback(async () => {
    if (!targetId) return;
    setLoadingRules(true);
    try {
      const [predefRes, customRes] = await Promise.all([
        staticCodeAnalysisService.getPredefinedRules(scanType.toUpperCase()),
        staticCodeAnalysisService.getCustomRules(scanType.toUpperCase(), targetId),
      ]);
      const predef = predefRes.success ? (predefRes.data?.data || predefRes.data || []) : [];
      const custom = customRes.success ? (customRes.data?.data || customRes.data || []) : [];
      setPredefinedRules(predef);
      setCustomRules(custom);
      setSelectedRules((prev) => {
        if (prev.length > 0) return prev;
        return [...predef.map((r) => r.id), ...custom.map((r) => r.id)];
      });
    } catch (error) {
      console.error('Failed to fetch rules', error);
      showToast('Failed to load rules. Please try again.', 'error');
    } finally {
      setLoadingRules(false);
    }
  }, [scanType, targetId, showToast]);

  const fetchHistory = useCallback(async () => {
    if (!targetId) return;
    setLoadingHistory(true);
    try {
      const res = await staticCodeAnalysisService.getReportHistory(scanType.toUpperCase(), targetId);
      if (res.success) setHistory(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [scanType, targetId]);

  useEffect(() => {
    fetchRules();
    fetchHistory();
  }, [fetchRules, fetchHistory]);

  useEffect(() => {
    return () => {
      if (currentControllerRef.current) currentControllerRef.current.abort();
    };
  }, []);

  // Tick the elapsed-seconds counter for the streaming accordion (every 200ms).
  useEffect(() => {
    if (!showProgress || !progressStartedAt) {
      setElapsedSec('0.0');
      return undefined;
    }
    const tick = () => {
      setElapsedSec(((Date.now() - progressStartedAt) / 1000).toFixed(1));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [showProgress, progressStartedAt]);

  const selectAllRules = () => {
    const allIds = allRules.map((r) => r.id);
    setSelectedRules(selectedRules.length === allIds.length ? [] : allIds);
  };

  const toggleRuleSelection = (ruleId) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  // ─── RUN ANALYSIS (Streaming) ───
  const handleStartScan = () => {
    if (!isGenerationDone) {
      showToast(`Generate the ${scanType} first.`, 'error');
      return;
    }
    if (selectedRules.length === 0) {
      showToast('Select at least one rule to scan.', 'error');
      return;
    }
    if (!targetId) {
      showToast('Target ID (microservice) is missing.', 'error');
      return;
    }

    if (currentControllerRef.current) {
      currentControllerRef.current.abort();
      currentControllerRef.current = null;
    }

    setIsAnalyzing(true);
    // Pre-populate the accordion with PENDING placeholders so the panel
    // appears instantly. Each SSE event will then upgrade a card.
    const seed = {};
    PIPELINE_STEPS.forEach((s) => {
      seed[s.key] = {
        stepKey: s.key,
        step: s.label,
        phase: s.phase,
        tool: s.tool || null,
        status: 'PENDING',
        progress: 0,
        message: 'Waiting…',
        description: '',
      };
    });
    setProgressMap(seed);
    setExpandedProgressKey(null);
    userPickedProgressStepRef.current = false;
    setProgressStartedAt(Date.now());
    setShowProgress(true);

    const controller = staticCodeAnalysisService.streamAnalysis(
      scanType.toUpperCase(),
      targetId,
      selectedRules,
      (event) => {
        if (!event || !event.stepKey) return;
        setProgressMap((prev) => {
          const existing = prev[event.stepKey] || {};
          return { ...prev, [event.stepKey]: { ...existing, ...event } };
        });
        // Auto-track to the currently in-progress step until the user
        // manually clicks on a step (we then stop overriding).
        if (event.status === 'IN_PROGRESS' && !userPickedProgressStepRef.current) {
          setExpandedProgressKey(event.stepKey);
        }
      },
      (report) => {
        setAnalysisResults(report);
        if (onResultsChange) onResultsChange(report);
        setShowResultsModal(true);
        fetchHistory();
        showToast('Analysis completed successfully!', 'success');
        setIsAnalyzing(false);
        // Keep the progress accordion visible for ~1s so users see the
        // "all complete" tick state before the modal pops up.
        setTimeout(() => setShowProgress(false), 1500);
        currentControllerRef.current = null;
      },
      (error) => {
        showToast(error || 'Analysis failed', 'error');
        setIsAnalyzing(false);
        currentControllerRef.current = null;
      }
    );

    currentControllerRef.current = controller;
  };

  // ─── Custom Rule CRUD ───
  const resetForm = () => {
    setCustomRuleForm({
      ruleName: '',
      description: '',
      filePattern: '',
      contentRegex: '',
      severity: 'MEDIUM',
      isActive: true,
    });
    setEditingRule(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowCustomRuleModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setCustomRuleForm({
      ruleName: rule.ruleName,
      description: rule.description || '',
      filePattern: rule.filePattern,
      contentRegex: rule.contentRegex,
      severity: rule.severity,
      isActive: rule.isActive,
    });
    setShowCustomRuleModal(true);
  };

  const handleCustomRuleSubmit = async () => {
    if (
      !customRuleForm.ruleName.trim() ||
      !customRuleForm.filePattern.trim() ||
      !customRuleForm.contentRegex.trim()
    ) {
      showToast('Please fill in Rule Name, Scan Location and Regex pattern.', 'error');
      return;
    }
    setSubmittingRule(true);
    try {
      const payload = {
        targetType: scanType.toUpperCase(),
        targetId,
        ruleName: customRuleForm.ruleName.trim(),
        description: customRuleForm.description.trim(),
        filePattern: customRuleForm.filePattern.trim(),
        contentRegex: customRuleForm.contentRegex.trim(),
        severity: customRuleForm.severity,
        isActive: customRuleForm.isActive,
      };
      const result = editingRule
        ? await staticCodeAnalysisService.updateCustomRule(editingRule.id, payload)
        : await staticCodeAnalysisService.addCustomRule(payload);
      if (result.success) {
        showToast(`Custom rule ${editingRule ? 'updated' : 'added'} successfully!`, 'success');
        setShowCustomRuleModal(false);
        resetForm();
        fetchRules();
      } else {
        showToast(result.error || 'Failed to save custom rule.', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Unexpected error.', 'error');
    } finally {
      setSubmittingRule(false);
    }
  };

  const handleDeleteCustomRule = async (ruleId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to delete this custom rule?')) return;
    try {
      const result = await staticCodeAnalysisService.deleteCustomRule(ruleId);
      if (result.success) {
        showToast('Custom rule deleted.', 'success');
        fetchRules();
      } else {
        showToast(result.error || 'Failed to delete rule.', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Unexpected error.', 'error');
    }
  };

  /* ─────────── Per-rule card ─────────── */
  const renderRuleCard = (rule) => {
    const isExpanded = expandedCard === rule.id;
    const isSelected = selectedRules.includes(rule.id);
    const isCustom = rule.type === 'custom';
    const ToolIcon =
      rule.tool === 'CHECKSTYLE' ? Code : rule.tool === 'PMD' ? TestTube : Shield;
    const displayName = rule.name || rule.ruleName;

    return (
      <div
        key={rule.id}
        data-testid={`scan-rule-${rule.id}`}
        className={cn(
          'rounded-xl border transition-all cursor-pointer',
          isExpanded
            ? 'border-primary bg-primary/5'
            : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/30',
          isSelected && 'ring-1 ring-primary/50'
        )}
        onClick={() => setExpandedCard(isExpanded ? null : rule.id)}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="checkbox"
                data-testid={`scan-rule-checkbox-${rule.id}`}
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleRuleSelection(rule.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary focus:ring-primary"
              />
              <div className={cn('p-2 rounded-lg', isCustom ? 'bg-purple-500/10' : 'bg-primary/10')}>
                <ToolIcon className={cn('w-5 h-5', isCustom ? 'text-purple-400' : 'text-primary')} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-dark-800 text-gray-400">
                  {rule.id}
                </span>
                <h4 className="font-semibold text-white truncate">{displayName}</h4>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', severityClass(rule.severity))}>
                  {rule.severity}
                </span>
                {isCustom ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                    Custom
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    {rule.type}
                  </span>
                )}
              </div>
              {rule.description && (
                <p className="text-sm text-gray-400 mt-1">{rule.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Code className="w-3 h-3" /> {rule.tool || 'CUSTOM'}
                </span>
                {isCustom && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(rule); }}
                      className="p-1 rounded hover:bg-purple-500/10 text-purple-400"
                      title="Edit custom rule"
                      data-testid={`scan-rule-edit-${rule.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustomRule(rule.id); }}
                      className="p-1 rounded hover:bg-red-500/10 text-red-400"
                      title="Delete custom rule"
                      data-testid={`scan-rule-delete-${rule.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Click for details</span>
                  <ChevronRight className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-dark-700 p-4 space-y-3 bg-[#0f172a]/30 rounded-b-xl">
            {isCustom ? (
              <>
                <DetailRow label="Description"
                            value={rule.description || 'No description provided.'} />
                <DetailRow label="Scan Location (File Pattern)" mono value={rule.filePattern} />
                <DetailRow label="Regex Pattern" mono value={rule.contentRegex} />
                <DetailRow label="Severity" value={rule.severity} />
                <DetailRow label="Status" value={rule.isActive ? 'Active' : 'Inactive'} />
              </>
            ) : (
              <>
                <DetailRow label="Description"
                            value={rule.description || '—'} />
                <div>
                  <p className="text-xs font-semibold text-primary uppercase mb-1">Scan Locations</p>
                  <ul className="list-disc list-inside text-xs text-gray-300 space-y-0.5">
                    {rule.scanLocations?.length
                      ? rule.scanLocations.map((loc, i) => <li key={i} className="font-mono">{loc}</li>)
                      : <li className="text-gray-500">N/A</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase mb-1">What it checks</p>
                  <ul className="list-disc list-inside text-xs text-gray-300 space-y-0.5">
                    {rule.checks?.length
                      ? rule.checks.map((c, i) => <li key={i}>{c}</li>)
                      : <li className="text-gray-500">N/A</li>}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-x-4 mt-1 text-xs">
                  <div><span className="text-gray-500">Tool:</span> <span className="text-gray-200">{rule.tool}</span></div>
                  <div><span className="text-gray-500">Type:</span> <span className="text-gray-200">{rule.type || 'N/A'}</span></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ─────────── Animated Progress Accordion ─────────── */
  const renderProgressAccordion = () => {
    if (!showProgress) return null;
    const overallProgress = Math.max(0, ...Object.values(progressMap).map((p) => p?.progress || 0));

    return (
      <div
        data-testid="scan-progress-accordion"
        className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-dark-900/50 to-transparent shadow-lg shadow-primary/5 animate-fadeInUp"
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div className="relative w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">Live Analysis Pipeline</h4>
            <p className="text-xs text-gray-400">
              Click any step to expand its details — {elapsedSec}s elapsed
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">{overallProgress}<span className="text-sm text-gray-400">%</span></p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">overall</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mx-4 mt-3 h-1 bg-dark-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Step cards */}
        <div className="p-4 space-y-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const evt = progressMap[step.key] || {};
            const status = evt.status || 'PENDING';
            const isExpanded = expandedProgressKey === step.key;
            const Icon = step.icon;
            const isActive = status === 'IN_PROGRESS';
            const isDone = status === 'COMPLETED';
            const isFailed = status === 'FAILED';

            const statusIcon = isDone
              ? <CheckCircle className="w-4 h-4 text-emerald-400" />
              : isFailed
                ? <XCircle className="w-4 h-4 text-red-400" />
                : isActive
                  ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  : <div className="w-4 h-4 rounded-full border-2 border-dark-600" />;

            return (
              <div
                key={step.key}
                data-testid={`progress-step-${step.key}`}
                className={cn(
                  'rounded-lg border transition-all duration-300',
                  isActive
                    ? 'border-primary/50 bg-primary/10 shadow-md shadow-primary/10 scale-[1.01]'
                    : isDone
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isFailed
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-dark-700/50 bg-dark-900/30 opacity-70'
                )}
              >
                <button
                  type="button"
                  onClick={() => onProgressStepClick(step.key)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                  data-testid={`progress-step-toggle-${step.key}`}
                >
                  {/* Step number circle */}
                  <div className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold',
                    isDone ? 'bg-emerald-500/20 text-emerald-300'
                      : isActive ? 'bg-primary/20 text-primary'
                      : isFailed ? 'bg-red-500/20 text-red-300'
                      : 'bg-dark-800 text-gray-500'
                  )}>
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 p-1.5 rounded-md',
                    isDone ? 'bg-emerald-500/10' : isActive ? 'bg-primary/10' : 'bg-dark-800/50'
                  )}>
                    <Icon className={cn(
                      'w-4 h-4',
                      isDone ? 'text-emerald-400' : isActive ? 'text-primary' : isFailed ? 'text-red-400' : 'text-gray-500'
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-medium',
                        isDone ? 'text-emerald-200' : isActive ? 'text-white' : isFailed ? 'text-red-200' : 'text-gray-400'
                      )}>
                        {step.label}
                      </span>
                      {evt.tool && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-800 text-gray-400">
                          {evt.tool}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {evt.message || (status === 'PENDING' ? 'Waiting…' : '')}
                    </p>
                  </div>

                  {/* Right-side meta */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {typeof evt.progress === 'number' && (
                      <span className="text-[10px] font-mono text-gray-400">{evt.progress}%</span>
                    )}
                    {statusIcon}
                    <ChevronRight className={cn(
                      'w-3.5 h-3.5 text-gray-500 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div
                    className="border-t border-dark-700/50 p-3 space-y-3 bg-[#0b1224]/50 rounded-b-lg animate-fadeIn"
                    data-testid={`progress-step-detail-${step.key}`}
                  >
                    {evt.description && (
                      <p className="text-xs text-gray-300 leading-relaxed">{evt.description}</p>
                    )}

                    {/* Details key/value chips */}
                    {evt.details && Object.keys(evt.details).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(evt.details).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-mono px-2 py-1 rounded-md bg-dark-800 border border-dark-700 text-gray-300">
                            <span className="text-gray-500">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rule outcomes — only on tool-scan steps */}
                    {(evt.rulesPassed?.length > 0 || evt.rulesFailed?.length > 0) && (
                      <div className="space-y-2">
                        {evt.rulesFailed?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-red-400 mb-1">
                              Failed ({evt.rulesFailed.length})
                            </p>
                            <div className="space-y-1.5">
                              {evt.rulesFailed.map((r, i) => (
                                <RuleOutcomeRow key={i} outcome={r} expanded />
                              ))}
                            </div>
                          </div>
                        )}
                        {evt.rulesPassed?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-emerald-400 mb-1">
                              Passed ({evt.rulesPassed.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {evt.rulesPassed.map((r, i) => (
                                <RuleOutcomeRow key={i} outcome={r} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {status === 'PENDING' && (
                      <p className="text-[11px] italic text-gray-500">This step has not started yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ─────────── Results modal ─────────── */
  const [resultsTab, setResultsTab] = useState('overview');

  const renderResultsModal = (report, onClose) => {
    if (!report) return null;
    const toolBreakdowns = report.toolBreakdowns || [];
    const fileBreakdowns = report.fileBreakdowns || [];
    const summary = report.summary || {};

    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col" data-testid="scan-results-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/80">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-dark-700"
            data-testid="scan-results-back-btn"
          >
            <ChevronRight className="w-5 h-5 rotate-180" /> Back
          </button>
          <h2 className="text-xl font-bold text-white">Scan Results</h2>
          <div className="w-20" />
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Score card */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-primary/20 to-transparent border border-primary/30">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="text-gray-400">Overall Health Score</p>
                <p className="text-5xl font-bold text-white">
                  {report.overallScore}
                  <span className="text-xl text-gray-400">/100</span>
                </p>
                {report.scoreExplanation && (
                  <p className="text-xs text-gray-400 mt-2 max-w-xl">{report.scoreExplanation}</p>
                )}
              </div>
              <div>
                <span className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold',
                  report.qualityGate === 'PASSED' ? 'bg-green-500/20 text-green-400' :
                  report.qualityGate === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                )}>
                  Quality Gate: {report.qualityGate}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-4">
              <Metric label="Critical" value={summary.critical || 0} color="text-red-400" />
              <Metric label="High"     value={summary.high || 0}     color="text-orange-400" />
              <Metric label="Medium"   value={summary.medium || 0}   color="text-yellow-400" />
              <Metric label="Low"      value={summary.low || 0}      color="text-blue-400" />
              <Metric label="Evaluated" value={summary.rulesEvaluated || 0} color="text-gray-200" />
              <Metric label="Passed"    value={summary.rulesPassed || 0}    color="text-emerald-400" />
              <Metric label="Failed"    value={summary.rulesFailed || 0}    color="text-red-300" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-dark-700">
            {['overview', 'tools', 'files', 'allissues'].map((t) => (
              <button
                key={t}
                onClick={() => setResultsTab(t)}
                data-testid={`results-tab-${t}`}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px',
                  resultsTab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white'
                )}
              >
                {t === 'allissues' ? 'All Issues' : t}
              </button>
            ))}
          </div>

          {/* Tab bodies */}
          {resultsTab === 'overview' && (
            <ToolBreakdownGrid toolBreakdowns={toolBreakdowns} />
          )}
          {resultsTab === 'tools' && (
            <ToolBreakdownDetailed toolBreakdowns={toolBreakdowns} />
          )}
          {resultsTab === 'files' && (
            <FileBreakdownList fileBreakdowns={fileBreakdowns} />
          )}
          {resultsTab === 'allissues' && (
            <AllIssuesList issues={report.allIssues || []} />
          )}
        </div>
      </div>
    );
  };

  /* ─────────── History modal ─────────── */
  const renderHistoryModal = () => {
    if (!showHistoryModal) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col bg-dark-900">
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Scan History
            </h3>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="text-gray-400 hover:text-white"
              data-testid="scan-history-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No scans yet. Run your first analysis!
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((report, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-dark-700 bg-dark-800/50">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {new Date(report.executedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Score: {report.overallScore}/100 • {report.qualityGate}
                        {report.summary?.rulesEvaluated != null && (
                          <> • {report.summary.rulesPassed}/{report.summary.rulesEvaluated} rules passed</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        report.qualityGate === 'PASSED' ? 'bg-green-500/20 text-green-400' :
                        report.qualityGate === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {report.qualityGate}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReportModal(true);
                          setShowHistoryModal(false);
                        }}
                        className="px-3 py-1.5 text-xs bg-primary/20 hover:bg-primary/30 text-primary rounded-lg"
                        data-testid={`scan-history-view-${idx}`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ─────────── Custom rule modal ─────────── */
  const renderCustomRuleModal = () => {
    if (!showCustomRuleModal) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col bg-dark-900">
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {editingRule ? 'Edit Custom Rule' : 'Add Custom Rule'}
            </h3>
            <button
              onClick={() => { setShowCustomRuleModal(false); resetForm(); }}
              className="text-gray-400 hover:text-white"
              data-testid="custom-rule-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6 space-y-4">
            <FormField label="Rule Name" required>
              <input
                type="text"
                value={customRuleForm.ruleName}
                onChange={(e) => setCustomRuleForm({ ...customRuleForm, ruleName: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
                placeholder="e.g., No Hardcoded Secrets"
                data-testid="custom-rule-name-input"
              />
              <p className="text-[11px] text-gray-500 mt-1">Short, descriptive name shown in the scan report.</p>
            </FormField>

            <FormField label="Description">
              <textarea
                rows={2}
                value={customRuleForm.description}
                onChange={(e) => setCustomRuleForm({ ...customRuleForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50 resize-none"
                placeholder="What does this rule check and why does it matter?"
                data-testid="custom-rule-description-input"
              />
              <p className="text-[11px] text-gray-500 mt-1">Shown in the rule details accordion to explain the intent.</p>
            </FormField>

            <FormField label="Scan Location (File Pattern)" required>
              <input
                type="text"
                value={customRuleForm.filePattern}
                onChange={(e) => setCustomRuleForm({ ...customRuleForm, filePattern: e.target.value })}
                className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
                placeholder="e.g., **/*.properties"
                data-testid="custom-rule-file-pattern-input"
              />
              <p className="text-[11px] text-gray-500 mt-1">Glob pattern relative to the bundle root. Supports * and ?.</p>
            </FormField>

            <FormField label="Regex Pattern" required>
              <input
                type="text"
                value={customRuleForm.contentRegex}
                onChange={(e) => setCustomRuleForm({ ...customRuleForm, contentRegex: e.target.value })}
                className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
                placeholder="e.g., password\\s*=\\s*\\S+"
                data-testid="custom-rule-regex-input"
              />
              <p className="text-[11px] text-gray-500 mt-1">Java regex evaluated line-by-line.</p>
            </FormField>

            <FormField label="Severity">
              <select
                value={customRuleForm.severity}
                onChange={(e) => setCustomRuleForm({ ...customRuleForm, severity: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
                data-testid="custom-rule-severity-select"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </FormField>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customRuleForm.isActive}
                onChange={(e) => setCustomRuleForm({ ...customRuleForm, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary"
                data-testid="custom-rule-active-toggle"
              />
              <label className="text-xs text-gray-300">Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-dark-700 bg-[#0f172a]/50">
            <button
              onClick={() => { setShowCustomRuleModal(false); resetForm(); }}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-800 rounded-lg"
              data-testid="custom-rule-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomRuleSubmit}
              disabled={submittingRule}
              className="px-6 py-2 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              data-testid="custom-rule-submit-btn"
            >
              {submittingRule
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (editingRule ? 'Update' : 'Add Rule')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────── Main render ─────────── */
  return (
    <div className="space-y-6">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-400">
            Select rules to include in the scan. Custom rules are marked with a purple badge.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={selectAllRules}
            className="px-3 py-1.5 text-xs font-medium border border-dark-600 rounded-lg text-gray-300 hover:text-white hover:border-primary/50"
            data-testid="scan-select-all-btn"
          >
            {selectedRules.length === allRules.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={openAddModal}
            className="px-3 py-1.5 text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary rounded-lg flex items-center gap-1"
            data-testid="scan-add-custom-rule-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Add Custom Rule
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 text-xs font-medium border border-dark-600 rounded-lg text-gray-300 hover:text-white hover:border-primary/50 flex items-center gap-1"
            data-testid="scan-history-btn"
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
          <button
            onClick={handleStartScan}
            disabled={isAnalyzing || selectedRules.length === 0 || loadingRules}
            data-testid="scan-start-btn"
            className={cn(
              'px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2',
              isAnalyzing || selectedRules.length === 0 || loadingRules
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-primary hover:bg-primary/90 text-white shadow-md'
            )}
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {isAnalyzing ? 'Scanning…' : 'Start Scanning'}
          </button>
        </div>
      </div>

      {/* Animated streaming accordion */}
      {renderProgressAccordion()}

      {/* Rules list */}
      {loadingRules ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : allRules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-dark-700 rounded-xl">
          <Shield className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">No rules found. Add a custom rule or check your backend configuration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allRules.map((rule) => renderRuleCard(rule))}
        </div>
      )}

      {/* Modals */}
      {showReportModal && selectedReport && renderResultsModal(selectedReport, () => {
        setShowReportModal(false);
        setSelectedReport(null);
      })}
      {showResultsModal && !selectedReport && renderResultsModal(analysisResults, () => setShowResultsModal(false))}
      {renderHistoryModal()}
      {renderCustomRuleModal()}
    </div>
  );
};

/* ─────────────────── Sub-components ─────────────────── */

const DetailRow = ({ label, value, mono = false }) => (
  <div className="text-xs">
    <span className="text-gray-500">{label}:</span>{' '}
    {mono
      ? <code className="text-gray-200 bg-dark-900 px-1.5 py-0.5 rounded">{value}</code>
      : <span className="text-gray-200">{value}</span>}
  </div>
);

const FormField = ({ label, required, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-300 font-medium block">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const Metric = ({ label, value, color }) => (
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={cn('text-2xl font-bold', color)}>{value}</p>
  </div>
);

const RuleOutcomeRow = ({ outcome, expanded = false }) => {
  const [open, setOpen] = useState(false);
  const failed = outcome.status === 'FAIL';
  const hasViolations = outcome.violations && outcome.violations.length > 0;
  return (
    <div
      className={cn(
        'rounded-md border px-2 py-1.5 text-[11px] flex flex-col gap-1',
        failed ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
      )}
    >
      <button
        type="button"
        disabled={!hasViolations}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        {failed
          ? <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
          : <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
        {outcome.ruleId && (
          <span className="font-mono text-[10px] px-1 rounded bg-dark-800 text-gray-400">{outcome.ruleId}</span>
        )}
        <span className={cn('truncate', failed ? 'text-red-200' : 'text-emerald-200')}>{outcome.name}</span>
        {failed && (
          <span className="ml-auto text-[10px] font-semibold text-red-300">
            {outcome.violationCount} hit{outcome.violationCount === 1 ? '' : 's'}
          </span>
        )}
        {hasViolations && (
          <ChevronRight className={cn('w-3 h-3 text-gray-400 transition-transform', (open || expanded) && 'rotate-90')} />
        )}
      </button>
      {hasViolations && (open || expanded) && (
        <ul className="mt-1 space-y-1 border-l border-red-500/20 pl-2">
          {outcome.violations.slice(0, 10).map((v, i) => (
            <li key={i} className="text-[10px] text-gray-300">
              <span className={cn('px-1 rounded font-mono', severityClass(v.severity))}>
                {v.severity}
              </span>{' '}
              <span className="text-gray-400">{v.file}{v.line ? `:${v.line}` : ''}</span>{' '}
              — {v.message}
            </li>
          ))}
          {outcome.violations.length > 10 && (
            <li className="text-[10px] italic text-gray-500">
              … and {outcome.violations.length - 10} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

const ToolBreakdownGrid = ({ toolBreakdowns }) => {
  if (!toolBreakdowns || toolBreakdowns.length === 0) {
    return <p className="text-sm text-gray-400">No tool breakdown available.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {toolBreakdowns.map((t) => (
        <div key={t.tool} className="rounded-xl border border-dark-700 bg-dark-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-white">{t.tool}</h4>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              t.status === 'PASSED'  ? 'bg-green-500/20 text-green-400' :
              t.status === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
              t.status === 'SKIPPED' ? 'bg-gray-500/20 text-gray-400' :
              'bg-red-500/20 text-red-400'
            )}>
              {t.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div>Rules: <span className="text-white font-semibold">{t.rulesEvaluated}</span></div>
            <div>Score: <span className="text-white font-semibold">{t.score}/100</span></div>
            <div className="text-emerald-300">Passed: {t.rulesPassed}</div>
            <div className="text-red-300">Failed: {t.rulesFailed}</div>
            <div className="col-span-2 text-yellow-300">Violations: {t.violationCount}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ToolBreakdownDetailed = ({ toolBreakdowns }) => {
  if (!toolBreakdowns || toolBreakdowns.length === 0) {
    return <p className="text-sm text-gray-400">No tool breakdown available.</p>;
  }
  return (
    <div className="space-y-6">
      {toolBreakdowns.map((t) => (
        <div key={t.tool} className="rounded-xl border border-dark-700 bg-dark-900/30 overflow-hidden">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h4 className="font-semibold text-white text-base">{t.tool}</h4>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400">{t.rulesPassed} passed</span>
              <span className="text-red-400">{t.rulesFailed} failed</span>
              <span className="text-yellow-400">{t.violationCount} violations</span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {(!t.rules || t.rules.length === 0) && (
              <p className="text-xs text-gray-500 italic">No rules evaluated for this tool.</p>
            )}
            {t.rules?.map((r, i) => <RuleOutcomeRow key={i} outcome={r} expanded />)}
          </div>
        </div>
      ))}
    </div>
  );
};

const FileBreakdownList = ({ fileBreakdowns }) => {
  const [openFile, setOpenFile] = useState(null);
  if (!fileBreakdowns || fileBreakdowns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
        <p>No issues found in any file.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {fileBreakdowns.map((f, idx) => {
        const isOpen = openFile === idx;
        return (
          <div key={idx} className="rounded-lg border border-dark-700 bg-dark-900/30">
            <button
              type="button"
              onClick={() => setOpenFile(isOpen ? null : idx)}
              className="w-full p-3 flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-white truncate font-mono">{f.file}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                {f.critical > 0 && <span className="px-1.5 rounded bg-red-500/20 text-red-300">{f.critical} C</span>}
                {f.high > 0     && <span className="px-1.5 rounded bg-orange-500/20 text-orange-300">{f.high} H</span>}
                {f.medium > 0   && <span className="px-1.5 rounded bg-yellow-500/20 text-yellow-300">{f.medium} M</span>}
                {f.low > 0      && <span className="px-1.5 rounded bg-blue-500/20 text-blue-300">{f.low} L</span>}
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-90')} />
              </div>
            </button>
            {isOpen && (
              <ul className="border-t border-dark-700 p-3 space-y-1.5">
                {f.issues.map((iss, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5',
                      ['CRITICAL', 'HIGH'].includes(String(iss.severity).toUpperCase()) ? 'text-red-400' : 'text-yellow-400'
                    )} />
                    <span className={cn('px-1 rounded font-mono', severityClass(iss.severity))}>
                      {iss.severity}
                    </span>
                    <span className="text-gray-400">L{iss.line || '?'}</span>
                    <span className="text-gray-300">{iss.message}</span>
                    <span className="ml-auto text-gray-500">{iss.ruleName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AllIssuesList = ({ issues }) => {
  if (!issues || issues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
        <p>No issues found! Code looks clean.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {issues.map((issue, idx) => (
        <div key={idx} className="flex gap-2 p-2 rounded bg-dark-900/50 border border-dark-700">
          <AlertTriangle className={cn('w-4 h-4 flex-shrink-0 mt-0.5',
            ['CRITICAL', 'HIGH'].includes(String(issue.severity).toUpperCase()) ? 'text-red-400' : 'text-yellow-400'
          )} />
          <div className="flex-1">
            <p className="text-sm text-white">{issue.message}</p>
            <p className="text-xs text-gray-400">
              <span className={cn('px-1 rounded font-mono mr-1', severityClass(issue.severity))}>
                {issue.severity}
              </span>
              <span className="font-mono">{issue.tool}</span> • {issue.ruleName} • {issue.file}{issue.line ? `:${issue.line}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaticCodeAnalyzer;
