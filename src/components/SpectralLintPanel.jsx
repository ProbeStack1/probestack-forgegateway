import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle, AlertTriangle, Info, Lightbulb, CheckCircle2,
  Loader2, Play, FileCode2,
} from 'lucide-react';
import { apiDesignService } from '../services/apiDesignService';

/* ── Severity config ─────────────────────────────────────────── */
const SEV = {
  0: { label: 'Error',   text: 'text-red-400',    pillBg: 'bg-red-500/15',    dot: 'bg-red-400',    Icon: AlertCircle },
  1: { label: 'Warning', text: 'text-yellow-400', pillBg: 'bg-yellow-500/15', dot: 'bg-yellow-400', Icon: AlertTriangle },
  2: { label: 'Info',    text: 'text-blue-400',   pillBg: 'bg-blue-500/15',   dot: 'bg-blue-400',   Icon: Info },
  3: { label: 'Hint',    text: 'text-gray-400',   pillBg: 'bg-gray-500/15',   dot: 'bg-gray-500',   Icon: Lightbulb },
};

/* ── Spectral singleton (lazy-initialised) ───────────────────── */
let _instance = null;
let _initPromise = null;

async function getSpectral() {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const { Spectral } = await import('@stoplight/spectral-core');
    const { oas } = await import('@stoplight/spectral-rulesets');
    const s = new Spectral();
    s.setRuleset(oas);
    _instance = s;
    return s;
  })();
  return _initPromise;
}

/* ── Score helpers ───────────────────────────────────────────── */
function calcScore(results) {
  if (!results || results.length === 0) return 100;
  const e = results.filter(r => r.severity === 0).length;
  const w = results.filter(r => r.severity === 1).length;
  const i = results.filter(r => r.severity === 2).length;
  return Math.max(0, 100 - e * 5 - w * 2 - i);
}

function scoreColors(score) {
  if (score >= 80) return { text: 'text-green-400', bar: 'from-green-500 to-emerald-400' };
  if (score >= 60) return { text: 'text-yellow-400', bar: 'from-yellow-500 to-amber-400' };
  return { text: 'text-red-400', bar: 'from-red-500 to-rose-400' };
}

/* ── File download helper ────────────────────────────────────── */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────────── *
 * SpectralLintPanel
 *
 * Props
 *   specContent  – string  – inline spec text (used directly)
 *   specId       – string  – if specContent is empty, fetches from API
 *   specName     – string  – label shown in the score banner
 *   compact      – bool    – hides the textarea input area
 *   autoRun      – bool    – when false, loading specContent/specId only populates
 *                            the input; linting only happens when `runSignal` changes
 *   runSignal    – number  – bump this (e.g. from a "Run scan" button) to trigger a
 *                            lint pass when autoRun is false. Ignored while autoRun.
 * ─────────────────────────────────────────────────────────────── */
export default function SpectralLintPanel({ specContent, specId, specName, compact = false, autoRun = true, runSignal }) {
  const [input, setInput] = useState(specContent || '');
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [initError, setInitError] = useState('');
  const debounceRef = useRef(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  const lint = useCallback(async (content) => {
    const txt = (content || '').trim();
    if (!txt) { setResults(null); return; }
    setRunning(true);
    setInitError('');
    try {
      const s = await getSpectral();
      const res = await s.run(txt);
      setResults(res);
    } catch (e) {
      setInitError(e?.message || 'Spectral linting failed');
      setResults(null);
    } finally {
      setRunning(false);
    }
  }, []);

  /* When inline specContent is provided, use it directly */
  useEffect(() => {
    if (specContent) {
      setInput(specContent);
      if (autoRun) lint(specContent);
    }
  }, [specContent, autoRun, lint]);

  /* When only specId is provided (no inline content), fetch then lint */
  useEffect(() => {
    if (!specContent && specId) {
      setFetching(true);
      setInitError('');
      apiDesignService.getSpecContent(specId).then((result) => {
        setFetching(false);
        if (result.success && result.content) {
          setInput(result.content);
          if (autoRun) lint(result.content);
        } else {
          setInitError(result.error || 'Failed to load spec content.');
        }
      });
    }
  }, [specId, specContent, autoRun, lint]);

  /* External trigger (e.g. a "Run scan" button) — only wired up when autoRun is false.
   * Guard against firing on mount: if this panel unmounts (tab switch) and remounts,
   * `runSignal` arrives already non-zero from a prior click, but that's not a new
   * click — only an actual *change* from the value seen at mount should lint. */
  const prevRunSignalRef = useRef(runSignal);
  useEffect(() => {
    if (autoRun) return;
    if (runSignal === prevRunSignalRef.current) return;
    prevRunSignalRef.current = runSignal;
    if (!runSignal) return;
    lint(inputRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal, autoRun]);

  /* Debounced lint for manual textarea input */
  const onInputChange = (val) => {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lint(val), 600);
  };

  /* Export helpers */
  const exportJson = () => {
    if (!results) return;
    const data = results.map(r => ({
      severity: SEV[r.severity]?.label || r.severity,
      code: r.code,
      message: r.message,
      path: r.path?.join(' / ') || '',
      line: r.range?.start?.line != null ? r.range.start.line + 1 : null,
    }));
    const fname = `${(specName || 'spec').replace(/\s+/g, '-')}-lint.json`;
    downloadFile(fname, JSON.stringify(data, null, 2), 'application/json');
  };

  const exportCsv = () => {
    if (!results) return;
    const header = 'Severity,Rule,Message,Path,Line';
    const rows = results.map(r => [
      SEV[r.severity]?.label || r.severity,
      r.code,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${(r.path?.join(' / ') || '').replace(/"/g, '""')}"`,
      r.range?.start?.line != null ? r.range.start.line + 1 : '',
    ].join(','));
    const fname = `${(specName || 'spec').replace(/\s+/g, '-')}-lint.csv`;
    downloadFile(fname, [header, ...rows].join('\n'), 'text/csv');
  };

  const score = results !== null ? calcScore(results) : null;
  const colors = score !== null ? scoreColors(score) : null;
  const isLoading = fetching || running;

  return (
    <div className="space-y-4">

      {/* ── Manual input (full mode only) ──────────────────────── */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-primary" />
              Paste an OpenAPI spec (JSON or YAML)
            </span>
          </div>
          <textarea
            value={input}
            onChange={e => onInputChange(e.target.value)}
            placeholder={'openapi: "3.0.0"\ninfo:\n  title: My API\n  version: "1.0.0"\npaths: {}'}
            spellCheck={false}
            className="w-full h-52 rounded-lg p-3 text-xs font-mono text-gray-300 bg-[#0c1224] border border-[#24304d] focus:outline-none focus:border-primary/50 resize-none placeholder-gray-600"
          />
          <p className="text-[10px] text-gray-500">
            Linting runs in your browser via{' '}
            <span className="text-gray-400">@stoplight/spectral</span> — no data leaves your machine.
          </p>
        </div>
      )}

      {/* ── Loading spinner ─────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          {fetching ? 'Loading spec content…' : 'Running Spectral OAS linting…'}
        </div>
      )}

      {/* ── Init / fetch / parse error ───────────────────────────── */}
      {initError && !isLoading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          <strong>Linting error:</strong> {initError}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────── */}
      {results !== null && !isLoading && (
        <div className="space-y-3">

          {/* Header toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#24304d] bg-[#0f172a]/60">
            {/* Left: score + counts */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-gray-300">Linting Score:</span>
                <span className={`text-xl font-bold ${colors.text}`}>{score}</span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px]">
                {[0, 1, 2, 3].map(sev => {
                  const count = results.filter(r => r.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <span key={sev} className={`${SEV[sev].text} font-medium`}>
                      {count} {SEV[sev].label}{count !== 1 ? 's' : ''}
                    </span>
                  );
                })}
                {results.length === 0 && (
                  <span className="text-green-400 font-medium">All clear</span>
                )}
              </div>
            </div>

            {/* Right: badges + action buttons */}
            <div className="flex items-center gap-2">
              {/* <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 select-none">
                Auto Lint: ON
              </span>
              <button
                onClick={() => lint(input)}
                disabled={isLoading || !input.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-3 h-3" />
                Run Linting
              </button> */}
              {results.length > 0 && (
                <>
                  <button
                    onClick={exportJson}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#24304d] text-gray-300 hover:border-primary/40 hover:text-white transition-colors"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={exportCsv}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#24304d] text-gray-300 hover:border-primary/40 hover:text-white transition-colors"
                  >
                    Export CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Score bar */}
          <div className="h-1.5 rounded-full bg-[#24304d] overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-700`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Results: all-pass or table */}
          {results.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-sm text-green-400">No violations found — spec passes all OAS rules!</span>
            </div>
          ) : (
            <div className="rounded-lg border border-[#24304d] overflow-hidden">
              <table className="w-full text-xs table-fixed">
                <thead>
                  <tr className="bg-[#0c1224] border-b border-[#24304d]">
                    <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-28">Severity</th>
                    <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-52">Rule</th>
                    <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Message</th>
                    <th className="text-left px-3 py-2.5 text-gray-400 font-medium w-44">Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24304d]/50">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-[#1e293b]/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${SEV[r.severity]?.pillBg || 'bg-gray-500/15'} ${SEV[r.severity]?.text || 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV[r.severity]?.dot || 'bg-gray-500'}`} />
                          {SEV[r.severity]?.label || `Sev${r.severity}`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <code className={`font-mono text-[10px] break-all ${SEV[r.severity]?.text || 'text-gray-400'}`}>
                          {r.code}
                        </code>
                      </td>
                      <td className="px-3 py-2.5 text-gray-300 leading-relaxed">
                        {r.message}
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="font-mono text-[10px] text-gray-400 break-all">
                          {r.path?.length > 0
                            ? r.path.join(' › ')
                            : r.range?.start?.line != null
                              ? `line ${r.range.start.line + 1}`
                              : '—'}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (full mode only) ────────────────────────── */}
      {results === null && !isLoading && !initError && !compact && (
        <div className="flex items-center justify-center py-10 text-sm text-slate-500">
          Paste an OpenAPI spec above — linting runs automatically as you type.
        </div>
      )}
    </div>
  );
}
