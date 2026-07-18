/**
 * AISynthesizeToolModal — describe an MCP server in plain English, hit
 * the Gemini-backed batch endpoint, and let the user precisely control
 * what gets generated:
 *
 *   ☑ Tools         (qty 0-10)
 *   ☑ Resources    (qty 0-10)
 *   ☑ Prompts      (qty 0-10)
 *
 * Two modes:
 *   • "Single" → original behaviour: one tool from a description.
 *   • "Batch"  → multi-capability brainstorm with quantity controls.
 *
 * Failures (Gemini quota, bad JSON, etc.) are surfaced inline.
 */
import { useState } from 'react';
import { X, Sparkles, Loader2, AlertTriangle, CheckCircle2, Plus, Layers, FileText, MessageSquare } from 'lucide-react';
import { mcpGenerationService } from '../../../../services/mcpGenerationService';

const EXAMPLES = [
  'A tool that fetches the current weather for a given city name and returns temperature in Celsius and conditions.',
  'A tool that searches our internal Confluence wiki by query string and returns the top 5 page titles with URLs.',
  'A tool that creates a new Jira issue with summary, description, and priority, and returns the new issue key.',
  'A tool that reads a CSV file from a URL and returns aggregate stats: row count, columns, and dtype guesses.',
];

const BATCH_EXAMPLES = [
  'GitHub server — manage issues, PRs, and read repo metadata for the Engineering team.',
  'Postgres read-only proxy that exposes schemas, tables, and runs SELECT queries with a row cap.',
  'Slack ops assistant — post messages, search history, fetch user profiles.',
];

export default function AISynthesizeToolModal({ isOpen, onClose, onAdd, onAddBatch }) {
  const [mode, setMode] = useState('single');           // 'single' | 'batch'
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tool, setTool]    = useState(null);            // single-mode result
  const [batch, setBatch]  = useState(null);            // batch-mode result

  // Batch checkboxes + quantity controls.
  const [opts, setOpts] = useState({
    tools:     { enabled: true,  count: 3 },
    resources: { enabled: false, count: 2 },
    prompts:   { enabled: false, count: 2 },
  });

  if (!isOpen) return null;

  const reset = () => {
    setDescription(''); setTool(null); setBatch(null); setError(null);
  };
  const closeAndReset = () => { reset(); onClose(); };

  const synthesize = async () => {
    setError(null); setTool(null); setBatch(null);
    if (!description.trim()) { setError('Describe what to build first.'); return; }
    setLoading(true);
    if (mode === 'single') {
      const res = await mcpGenerationService.synthesizeTool(description.trim());
      setLoading(false);
      if (!res.success) { setError(res.error); return; }
      setTool(res.data);
    } else {
      const res = await mcpGenerationService.synthesizeCapabilities({
        description: description.trim(),
        toolCount:     opts.tools.enabled     ? opts.tools.count     : 0,
        resourceCount: opts.resources.enabled ? opts.resources.count : 0,
        promptCount:   opts.prompts.enabled   ? opts.prompts.count   : 0,
      });
      setLoading(false);
      if (!res.success) { setError(res.error); return; }
      setBatch(res.data);
    }
  };

  const acceptSingle = () => { if (tool) { onAdd(tool); closeAndReset(); } };
  const acceptBatch  = () => {
    if (batch && onAddBatch) { onAddBatch(batch); closeAndReset(); }
  };

  const toggleOpt = (key) =>
    setOpts((o) => ({ ...o, [key]: { ...o[key], enabled: !o[key].enabled } }));
  const setCount  = (key, c) =>
    setOpts((o) => ({ ...o, [key]: { ...o[key], count: Math.max(0, Math.min(10, c)) } }));

  const exList = mode === 'single' ? EXAMPLES : BATCH_EXAMPLES;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeAndReset}>
      <div
        className="w-full max-w-3xl rounded-xl border border-dark-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'rgb(22 27 48)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="ai-synth-modal"
      >
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff5b1f]" />
            <h3 className="text-sm font-semibold text-white">AI Capability Generator</h3>
          </div>
          <button onClick={closeAndReset} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800" data-testid="ai-synth-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="px-5 pt-3 shrink-0">
          <div className="inline-flex rounded-lg border border-dark-700 p-0.5 bg-[#0e172a]" role="tablist">
            <button
              role="tab"
              data-testid="ai-synth-mode-single"
              onClick={() => { setMode('single'); reset(); }}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${mode === 'single' ? 'bg-[#ff5b1f] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Single tool
            </button>
            <button
              role="tab"
              data-testid="ai-synth-mode-batch"
              onClick={() => { setMode('batch'); reset(); }}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${mode === 'batch' ? 'bg-[#ff5b1f] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Full server (batch)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-3">
          <p className="text-xs text-gray-400">
            {mode === 'single'
              ? 'Describe what ONE tool should do. The AI will propose name, description, JSON-schema input, and side-effect classification.'
              : 'Describe the WHOLE server in 1-2 sentences. Pick which capability kinds you want, and how many of each — full control before anything is generated.'}
          </p>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="ai-synth-description"
              rows={4}
              placeholder={mode === 'single'
                ? 'A tool that fetches recent commits from a GitHub repo by owner and name, returning the SHA, author, and message of the last 10.'
                : 'A GitHub assistant — read issues + PRs, comment, and search across all our repos.'}
              className="w-full px-3 py-2 rounded-lg border border-dark-700 bg-[rgba(15,23,42,0.5)] text-white text-sm outline-none focus:border-[#ff5b1f] resize-none"
            />
          </div>

          {/* Batch capability controls */}
          {mode === 'batch' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="ai-synth-batch-controls">
              {[
                { key: 'tools',     label: 'Tools',     icon: Layers,        max: 10 },
                { key: 'resources', label: 'Resources', icon: FileText,      max: 10 },
                { key: 'prompts',   label: 'Prompts',   icon: MessageSquare, max: 10 },
              ].map(({ key, label, icon: Icon, max }) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border transition-colors ${
                    opts[key].enabled ? 'border-[#ff5b1f]/50 bg-[#ff5b1f]/5' : 'border-dark-700 bg-[#0e172a]'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opts[key].enabled}
                      onChange={() => toggleOpt(key)}
                      data-testid={`ai-synth-toggle-${key}`}
                      className="accent-[#ff5b1f]"
                    />
                    <Icon className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-xs font-semibold text-white">{label}</span>
                  </label>
                  <div className={`mt-2 flex items-center gap-2 ${opts[key].enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                    <input
                      type="range" min="0" max={max} step="1"
                      value={opts[key].count}
                      onChange={(e) => setCount(key, Number(e.target.value))}
                      data-testid={`ai-synth-count-${key}`}
                      className="flex-1 accent-[#ff5b1f]"
                    />
                    <span className="w-7 text-center text-xs font-mono text-white">{opts[key].count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="text-[11px] text-gray-500 mb-1.5">Need inspiration?</div>
            <div className="flex flex-wrap gap-1.5">
              {exList.map((e, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(e)}
                  data-testid={`ai-synth-example-${i}`}
                  className="px-2 py-1 rounded border border-dark-700 hover:border-[#ff5b1f]/40 text-[10px] text-gray-300 hover:text-white truncate max-w-[300px]"
                  title={e}
                >
                  {e.slice(0, 60)}…
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={synthesize}
              disabled={loading || !description.trim()}
              data-testid="ai-synth-run"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? 'Synthesising…' : mode === 'single' ? 'Synthesise tool' : 'Synthesise capabilities'}
            </button>
            {(tool || batch) && (
              <button
                onClick={() => { setTool(null); setBatch(null); }}
                className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs"
              >
                Try again
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-300 text-xs flex items-start gap-2" data-testid="ai-synth-error">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><div>{error}</div>
            </div>
          )}

          {/* Single-tool result */}
          {tool && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2" data-testid="ai-synth-result">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4" /> Suggested tool
              </div>
              <div className="space-y-1 text-xs">
                <Row label="Name"><span className="font-mono text-white">{tool.name}</span></Row>
                <Row label="Description"><span className="text-gray-200">{tool.description}</span></Row>
                <Row label="Side effects"><span className="font-mono text-white">{tool.sideEffects}</span></Row>
                <Row label="Output type"><span className="font-mono text-white">{tool.outputType}</span></Row>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Input schema</div>
                <pre className="p-2 rounded bg-[#0e172a] border border-dark-700 text-[11px] font-mono text-gray-300 overflow-x-auto custom-scroll max-h-44">
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </pre>
              </div>
              {tool.implementationHint && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Implementation hint</div>
                  <pre className="p-2 rounded bg-[#0e172a] border border-dark-700 text-[11px] font-mono text-gray-400 overflow-x-auto custom-scroll whitespace-pre-wrap">
                    {tool.implementationHint}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Batch result */}
          {batch && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-3" data-testid="ai-synth-batch-result">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4" /> Generated {(batch.tools || []).length} tools, {(batch.resources || []).length} resources, {(batch.prompts || []).length} prompts
              </div>
              <BatchList title="Tools"     icon={Layers}        items={batch.tools     || []} render={(t) => `${t.name} — ${t.description}`} />
              <BatchList title="Resources" icon={FileText}      items={batch.resources || []} render={(r) => `${r.name} — ${r.uriTemplate}`} />
              <BatchList title="Prompts"   icon={MessageSquare} items={batch.prompts   || []} render={(p) => `${p.name} — ${p.description}`} />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-dark-700 flex justify-end gap-2 shrink-0">
          <button onClick={closeAndReset} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">Cancel</button>
          {mode === 'single' ? (
            <button
              onClick={acceptSingle}
              disabled={!tool}
              data-testid="ai-synth-add"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Add to capabilities
            </button>
          ) : (
            <button
              onClick={acceptBatch}
              disabled={!batch}
              data-testid="ai-synth-add-batch"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Add all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 w-24 mt-0.5 shrink-0">{label}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function BatchList({ title, icon: Icon, items, render }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] uppercase tracking-wider text-gray-400">{title} ({items.length})</span>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-gray-200 pl-4 leading-snug">
            <span className="font-mono text-white">{render(it)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
