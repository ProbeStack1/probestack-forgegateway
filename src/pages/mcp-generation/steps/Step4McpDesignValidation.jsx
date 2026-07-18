import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle, AlertCircle, Shield, FileCode, Loader2,
  XCircle, ChevronDown, ChevronRight, Wrench, Layers, MessageSquare,
  Filter, Download, Info, AlertTriangle, Check
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Spectral } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';
import { parseYaml } from '@stoplight/spectral-parsers';
import { apiDesignService } from '../../../services/apiDesignService';
import { parseOpenApiToMcp } from '../components/mcpSpecParser';

export default function Step4McpDesignValidation({ state, dispatch, setToast }) {
  const [specContent, setSpecContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [lintResults, setLintResults] = useState([]);
  const [linting, setLinting] = useState(false);
  const [validationSummary, setValidationSummary] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'errors' | 'warnings' | 'info'

  const selectedSpec = state?.selectedSpec;
  const specId = selectedSpec?.id || selectedSpec?.specMetadataId;

  // Load spec content and run validation
  useEffect(() => {
    if (!selectedSpec) return;

    const loadAndValidate = async () => {
      setLoading(true);
      setLinting(true);

      let content = selectedSpec?.content || selectedSpec?.specContent;
      if (!content && specId) {
        const result = await apiDesignService.getSpecContent(specId);
        if (result.success && result.content) {
          content = result.content;
        } else {
          setToast?.({ message: 'Failed to load spec content for validation', type: 'error' });
          setLoading(false);
          setLinting(false);
          return;
        }
      }

      if (!content) {
        setToast?.({ message: 'No spec content available', type: 'error' });
        setLoading(false);
        setLinting(false);
        return;
      }

      setSpecContent(content);

      try {
        const parsed = parseOpenApiToMcp(content, selectedSpec.name);
        setCapabilities(parsed);
      } catch (e) {
        // ignore parse errors for now
      }

      try {
        const spectral = new Spectral();
        spectral.setRuleset(oas);
        const results = await spectral.run(content);
        setLintResults(results);

        const errorCount = results.filter(r => r.severity === 0).length;
        const warningCount = results.filter(r => r.severity === 1).length;
        const infoCount = results.filter(r => r.severity === 2).length;
        const passed = errorCount === 0 && warningCount === 0;
        setValidationSummary({
          passed,
          errorCount,
          warningCount,
          infoCount,
          totalIssues: results.length,
        });
      } catch (e) {
        setToast?.({ message: 'Linting failed: ' + e.message, type: 'error' });
      } finally {
        setLinting(false);
        setLoading(false);
      }
    };

    loadAndValidate();
  }, [selectedSpec, specId, setToast]);

  // ── Computed ───────────────────────────────────────────────────────────
  const summary = validationSummary || { passed: false, errorCount: 0, warningCount: 0, infoCount: 0, totalIssues: 0 };

  // Linting Score (0-100) – errors: -10, warnings: -2, info: -0.5
  const lintScore = useMemo(() => {
    const base = 100;
    const deduction = summary.errorCount * 10 + summary.warningCount * 2 + summary.infoCount * 0.5;
    return Math.max(0, Math.round((base - deduction) * 10) / 10);
  }, [summary]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (filterType === 'all') return lintResults;
    if (filterType === 'errors') return lintResults.filter(r => r.severity === 0);
    if (filterType === 'warnings') return lintResults.filter(r => r.severity === 1);
    if (filterType === 'info') return lintResults.filter(r => r.severity === 2);
    return lintResults;
  }, [lintResults, filterType]);

  // Severity badge
  const SeverityBadge = ({ severity }) => {
    const config = {
      0: { label: 'Error', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
      1: { label: 'Warning', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
      2: { label: 'Info', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    };
    const { label, cls } = config[severity] || config[2];
    return <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border', cls)}>{label}</span>;
  };

  // ── Export functions ──────────────────────────────────────────────────
  const exportJSON = () => {
    const data = {
      score: lintScore,
      summary,
      issues: lintResults.map(r => ({
        severity: r.severity === 0 ? 'Error' : r.severity === 1 ? 'Warning' : 'Info',
        code: r.code,
        message: r.message,
        path: r.path?.join(' › ') || '',
        range: r.range ? `lines ${r.range.start?.line + 1}-${r.range.end?.line + 1}` : '',
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-lint-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Severity', 'Rule', 'Message', 'Path'];
    const rows = lintResults.map(r => [
      r.severity === 0 ? 'Error' : r.severity === 1 ? 'Warning' : 'Info',
      r.code || '',
      r.message || '',
      r.path?.join(' › ') || '',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-lint-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (!selectedSpec) {
    return (
      <div className="rounded-xl border border-dark-700 p-8 text-center bg-[#0f172a]/50">
        <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white">No Specification Selected</h3>
        <p className="text-sm text-gray-400 mt-2">
          Please go back to Step 3 (MCP Design) and select an OpenAPI specification.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-dark-700 p-8 text-center bg-[#0f172a]/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading and validating specification…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards + Score */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={cn(
          'p-4 rounded-lg border text-center',
          summary.passed ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
        )}>
          <div className="flex items-center justify-center gap-2 mt-4">
            {summary.passed ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-semibold text-white">
              {summary.passed ? 'Valid' : 'Issues Found'}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
          <div className="text-2xl font-bold text-red-400">{summary.errorCount}</div>
          <div className="text-xs text-gray-400">Errors</div>
        </div>
        <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
          <div className="text-2xl font-bold text-yellow-400">{summary.warningCount}</div>
          <div className="text-xs text-gray-400">Warnings</div>
        </div>
        <div className="p-4 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
          <div className="text-2xl font-bold text-gray-400">{summary.infoCount}</div>
          <div className="text-xs text-gray-400">Info</div>
        </div>
        {/* Linting Score */}
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 text-center">
          <div className="text-2xl font-bold text-primary">{lintScore}</div>
          <div className="text-xs text-gray-400">Linting Score</div>
          <div className="mt-1 h-1 w-full bg-dark-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                lintScore >= 80 ? 'bg-green-500' : lintScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(100, lintScore)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Capabilities Preview */}
      {capabilities && (
        <div className="rounded-xl border border-dark-700 p-4 bg-[#0f172a]/40">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">MCP Capabilities to be Generated</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-300">Tools: <span className="text-white font-semibold">{capabilities.tools?.length || 0}</span></span>
            <span className="text-gray-300">Resources: <span className="text-white font-semibold">{capabilities.resources?.length || 0}</span></span>
            <span className="text-gray-300">Prompts: <span className="text-white font-semibold">{capabilities.prompts?.length || 0}</span></span>
          </div>
        </div>
      )}

      {/* Linting Report */}
      <div className="rounded-xl border border-dark-700 overflow-hidden bg-[#0f172a]/30">
        {/* Header with filters and export */}
        <div className="px-4 py-3 bg-[#0f172a]/60 border-b border-dark-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">Linting Report</span>
            <span className="text-xs text-gray-400 ml-2">({lintResults.length} issues)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-[#0f172a] rounded-lg p-0.5 border border-dark-700">
              {[
                { id: 'all', label: 'All', count: lintResults.length },
                { id: 'errors', label: 'Errors', count: summary.errorCount, icon: XCircle },
                { id: 'warnings', label: 'Warnings', count: summary.warningCount, icon: AlertTriangle },
                { id: 'info', label: 'Info', count: summary.infoCount, icon: Info },
              ].map(({ id, label, count, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFilterType(id)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors',
                    filterType === id
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#0f172a]/80'
                  )}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      'ml-0.5 px-1 rounded text-[9px]',
                      filterType === id ? 'bg-white/20' : 'bg-dark-700/50'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Export buttons */}
            <div className="flex gap-1">
              <button
                onClick={exportJSON}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-dark-700 rounded-lg text-gray-400 hover:text-white hover:border-primary/50 transition-colors"
                title="Export as JSON"
              >
                <Download className="w-3 h-3" /> JSON
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-dark-700 rounded-lg text-gray-400 hover:text-white hover:border-primary/50 transition-colors"
                title="Export as CSV"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
          </div>
        </div>

        {linting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-6 text-center text-green-400">
            <Check className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No issues match the current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-dark-700 bg-[#0f172a]/40">
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Rule</th>
                  <th className="px-4 py-2">Message</th>
                  <th className="px-4 py-2">Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredResults.map((result, idx) => {
                  const pathStr = result.path?.join(' › ') || '';
                  return (
                    <tr key={idx} className="hover:bg-[#0f172a]/30 transition-colors">
                      <td className="px-4 py-3">
                        <SeverityBadge severity={result.severity} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">
                        {result.code || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-200 max-w-md">
                        {result.message}
                        {result.range && (
                          <span className="block text-[10px] text-gray-500 mt-0.5">
                            lines {result.range.start?.line + 1}–{result.range.end?.line + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400 truncate max-w-sm" title={pathStr}>
                        {pathStr || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}