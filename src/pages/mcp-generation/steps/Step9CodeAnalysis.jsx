import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { staticCodeAnalysisService } from '../../../services/staticCodeAnalysis';
import {
  Shield, CheckCircle, XCircle, AlertCircle, Loader2,
  BarChart, FileText, Code, Activity, TrendingUp, TrendingDown,
  RefreshCw, Download, ChevronRight, ChevronDown, Eye
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function Step9CodeAnalysis({ state, dispatch, setToast }) {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedTools, setExpandedTools] = useState({});
  const [expandedFiles, setExpandedFiles] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Get the microserviceId from the project state (mirrored id)
  const microserviceId = state?.microserviceMirrorId || state?.deployPrep?.microserviceId;

  const fetchAnalysis = useCallback(async () => {
    if (!microserviceId) {
      setError('No microservice mirror found. Please complete Step 7 (MCP Development) first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await staticCodeAnalysisService.getLatestReport('MICROSERVICE', microserviceId);
      if (result.success) {
        setAnalysisResult(result.data);
      } else {
        setError(result.error || 'Failed to fetch analysis results');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch analysis results');
    } finally {
      setLoading(false);
    }
  }, [microserviceId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const runAnalysis = async () => {
    if (!microserviceId) {
      setToast({ message: 'No microservice mirror found.', type: 'error' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await staticCodeAnalysisService.runAnalysis('MICROSERVICE', microserviceId);
      if (result.success) {
        setToast({ message: 'Analysis started. Fetching results...', type: 'success' });
        // Wait a moment then fetch
        setTimeout(() => fetchAnalysis(), 3000);
      } else {
        setToast({ message: result.error || 'Failed to start analysis', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to start analysis', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTool = (toolName) => {
    setExpandedTools(prev => ({ ...prev, [toolName]: !prev[toolName] }));
  };

  const toggleFile = (fileName) => {
    setExpandedFiles(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-400">Loading code analysis results...</span>
      </div>
    );
  }

  if (error && !analysisResult) {
    return (
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">No analysis results yet</p>
            <p className="text-xs text-yellow-300/80 mt-1">{error}</p>
            <Button
              onClick={runAnalysis}
              disabled={isGenerating || !microserviceId}
              className="mt-3 bg-primary hover:bg-primary/90 text-white"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Run Static Analysis
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!analysisResult) {
    return null;
  }

  const { overallScore, qualityGate, summary, toolBreakdowns, fileBreakdowns, featureResults, scoreExplanation } = analysisResult;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Static Code Analysis
          </h3>
          <p className="text-sm text-gray-400">Quality and security analysis of your generated MCP server code</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={runAnalysis}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Overall Score & Quality Gate */}
      <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
          <div>
            <p className="text-sm text-gray-400">Overall Health Score</p>
            <p className="text-4xl font-bold text-white">
              {overallScore}
              <span className="text-lg text-gray-400">/100</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-4 py-2 rounded-full text-xs font-semibold",
              qualityGate === 'PASSED' ? "bg-green-500/20 text-green-400" :
              qualityGate === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              Quality Gate: {qualityGate}
            </span>
            <button
              onClick={() => {
                const reportData = {
                  scanType: 'microservice',
                  results: analysisResult,
                  generatedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `static-analysis-report-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 text-xs"
            >
              <Download className="w-3 h-3" /> Download Report
            </button>
          </div>
        </div>

        {/* Score explanation */}
        {scoreExplanation && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-300 leading-relaxed">{scoreExplanation}</p>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-xs text-gray-400">Critical</p>
            <p className="text-2xl font-bold text-red-400">{summary.critical || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
            <p className="text-xs text-gray-400">High</p>
            <p className="text-2xl font-bold text-orange-400">{summary.high || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
            <p className="text-xs text-gray-400">Medium</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.medium || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
            <p className="text-xs text-gray-400">Low</p>
            <p className="text-2xl font-bold text-blue-400">{summary.low || 0}</p>
          </div>
        </div>
      </Card>

      {/* Tool-wise Breakdown */}
      {toolBreakdowns && toolBreakdowns.length > 0 && (
        <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
          <CardTitle className="mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Tool-wise Breakdown
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {toolBreakdowns.map((tb) => (
              <div
                key={tb.tool}
                className="rounded-lg border border-dark-700 bg-dark-900/30 p-3 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => toggleTool(tb.tool)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-white">{tb.tool}</h5>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    tb.status === 'PASSED' ? "bg-green-500/20 text-green-400" :
                    tb.status === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
                    tb.status === 'SKIPPED' ? "bg-gray-500/20 text-gray-400" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    {tb.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-300">
                  <div>Score: <span className="text-white font-semibold">{tb.score}/100</span></div>
                  <div>Rules: <span className="text-white font-semibold">{tb.rulesEvaluated}</span></div>
                  <div className="text-emerald-300">Passed: {tb.rulesPassed}</div>
                  <div className="text-red-300">Failed: {tb.rulesFailed}</div>
                  <div className="col-span-2 text-yellow-300">Violations: {tb.violationCount}</div>
                </div>
                {tb.rules && tb.rules.length > 0 && (
                  <div className="mt-2 text-xs text-primary flex items-center gap-1">
                    <ChevronRight className={cn("w-3 h-3 transition-transform", expandedTools[tb.tool] && "rotate-90")} />
                    {expandedTools[tb.tool] ? 'Hide' : 'View'} {tb.rules.length} rules
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Expanded rule details */}
          {toolBreakdowns.map((tb) => (
            expandedTools[tb.tool] && tb.rules && tb.rules.length > 0 && (
              <div key={`rules-${tb.tool}`} className="mt-3 space-y-1.5 p-3 rounded-lg border border-dark-700 bg-dark-900/30">
                {tb.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-[11px]",
                      rule.status === 'FAIL'
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-emerald-500/30 bg-emerald-500/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {rule.status === 'FAIL'
                        ? <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        : <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      {rule.ruleId && <span className="font-mono text-[10px] px-1 rounded bg-dark-800 text-gray-400">{rule.ruleId}</span>}
                      <span className={cn(rule.status === 'FAIL' ? "text-red-200" : "text-emerald-200")}>{rule.name}</span>
                      {rule.violationCount > 0 && (
                        <span className="ml-auto text-[10px] font-semibold text-red-300">
                          {rule.violationCount} hit{rule.violationCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    {rule.violations && rule.violations.length > 0 && (
                      <ul className="mt-1 ml-4 list-disc list-inside space-y-0.5">
                        {rule.violations.slice(0, 6).map((v, i) => (
                          <li key={i} className="text-[10px] text-gray-300">
                            <span className="font-mono text-gray-400">{v.file}{v.line ? `:${v.line}` : ''}</span>
                            {' '}— {v.message}
                          </li>
                        ))}
                        {rule.violations.length > 6 && (
                          <li className="text-[10px] italic text-gray-500">
                            … and {rule.violations.length - 6} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )
          ))}
        </Card>
      )}

      {/* File-wise Breakdown */}
      {fileBreakdowns && fileBreakdowns.length > 0 && (
        <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
          <CardTitle className="mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            File-wise Breakdown
          </CardTitle>
          <div className="space-y-2">
            {fileBreakdowns.slice(0, 10).map((fb, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-dark-700 bg-dark-900/30 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => toggleFile(idx)}
              >
                <div className="p-3 flex items-center justify-between">
                  <span className="font-mono text-white truncate">{fb.file}</span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {fb.critical > 0 && <span className="px-1.5 rounded bg-red-500/20 text-red-300">{fb.critical}C</span>}
                    {fb.high > 0 && <span className="px-1.5 rounded bg-orange-500/20 text-orange-300">{fb.high}H</span>}
                    {fb.medium > 0 && <span className="px-1.5 rounded bg-yellow-500/20 text-yellow-300">{fb.medium}M</span>}
                    {fb.low > 0 && <span className="px-1.5 rounded bg-blue-500/20 text-blue-300">{fb.low}L</span>}
                    <ChevronRight className={cn("w-3 h-3 text-gray-400 transition-transform ml-1", expandedFiles[idx] && "rotate-90")} />
                  </span>
                </div>
                {expandedFiles[idx] && fb.issues && fb.issues.length > 0 && (
                  <div className="border-t border-dark-700 p-3 space-y-1">
                    {fb.issues.map((iss, i) => (
                      <div key={i} className="text-[11px] text-gray-300 flex items-start gap-2">
                        <span className={cn(
                          "px-1 rounded font-mono text-[10px] flex-shrink-0",
                          iss.severity === 'CRITICAL' ? "bg-red-500/20 text-red-300" :
                          iss.severity === 'HIGH' ? "bg-orange-500/20 text-orange-300" :
                          iss.severity === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-blue-500/20 text-blue-300"
                        )}>{iss.severity}</span>
                        <span className="text-gray-400 font-mono flex-shrink-0">L{iss.line || '?'}</span>
                        <span className="flex-1">{iss.message}</span>
                        <span className="text-gray-500 flex-shrink-0">{iss.ruleName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feature-wise Breakdown (if available) */}
      {featureResults && Object.keys(featureResults).length > 0 && (
        <Card className="p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
          <CardTitle className="mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-primary" />
            Feature-wise Breakdown
          </CardTitle>
          <div className="space-y-4">
            {Object.entries(featureResults).map(([featureId, result]) => {
              let featureName = featureId
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              const nameMap = {
                'secrets': 'Secrets & Credentials',
                'unittests': 'Unit Tests',
                'codequality': 'Code Quality & Style',
                'duplication': 'Code Duplication',
                'performance': 'Performance Issues'
              };
              if (nameMap[featureId]) featureName = nameMap[featureId];

              return (
                <div key={featureId} className="rounded-xl border border-dark-700 bg-[#0f172a]/50 overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-dark-700">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        result.status === 'PASSED' ? "bg-green-500/10" :
                        result.status === 'WARNING' ? "bg-yellow-500/10" : "bg-red-500/10"
                      )}>
                        {result.status === 'PASSED' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                         result.status === 'WARNING' ? <AlertCircle className="w-5 h-5 text-yellow-400" /> :
                         <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                      <div>
                        <h5 className="font-semibold text-white">{featureName}</h5>
                        <p className="text-xs text-gray-400">Score: {result.score}/100</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      result.status === 'PASSED' ? "bg-green-500/20 text-green-400" :
                      result.status === 'WARNING' ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {result.status}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {result.issues && result.issues.length > 0 ? (
                      result.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-dark-800/50 text-sm">
                          <AlertCircle className={cn(
                            "w-4 h-4 mt-0.5 flex-shrink-0",
                            issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? "text-red-400" :
                            issue.severity === 'MEDIUM' || issue.severity === 'MAJOR' ? "text-yellow-400" :
                            "text-blue-400"
                          )} />
                          <div>
                            <span className="text-white">{issue.message}</span>
                            {issue.file && <div className="text-xs text-gray-400">📄 {issue.file}{issue.line ? `:${issue.line}` : ''}</div>}
                            {issue.dependency && <div className="text-xs text-gray-400">📦 {issue.dependency}</div>}
                            {issue.test && <div className="text-xs text-gray-400">🧪 {issue.test}</div>}
                            {issue.class && <div className="text-xs text-gray-400">🔧 {issue.class}.{issue.method}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> No issues found in this category.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}