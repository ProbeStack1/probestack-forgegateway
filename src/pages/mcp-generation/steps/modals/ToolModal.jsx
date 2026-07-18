/**
 * Tool modal — create or edit a Tool. Uses Monaco JSON editor for the
 * inputSchema. Matches the McpProject.Tool backend shape verbatim.
 */
import { useState, useEffect } from 'react';
import { X, Wrench } from 'lucide-react';
import MonacoBox from '../../../../components/ui/MonacoBox';

const EMPTY = {
  name: '',
  description: '',
  inputSchemaText: JSON.stringify({ type: 'object', properties: {}, required: [] }, null, 2),
  outputType: 'structured-json',
  sideEffects: 'read-only',
  implementationHint: '',
};

const OUTPUT_TYPES  = ['structured-json', 'text', 'markdown', 'image'];
const SIDE_EFFECTS  = ['read-only', 'writes', 'destructive'];

export default function ToolModal({ state, dispatch }) {
  const editingIndex = state.ui.editingToolIndex;
  const editing = editingIndex != null ? state.capabilities.tools[editingIndex] : null;

  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState({});

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        description: editing.description || '',
        inputSchemaText: JSON.stringify(editing.inputSchema || { type: 'object', properties: {}, required: [] }, null, 2),
        outputType: editing.outputType || 'structured-json',
        sideEffects: editing.sideEffects || 'read-only',
        implementationHint: editing.implementationHint || '',
      });
    } else setForm(EMPTY);
  }, [editingIndex]);

  const close = () => dispatch({ type: 'CLOSE_TOOL_MODAL' });

  const save = () => {
    const e = {};
    if (!/^[a-z_][a-z0-9_]{1,60}$/.test(form.name)) e.name = 'snake_case, 2–60 chars';
    if (!form.description?.trim()) e.description = 'description is required';
    let schema = null;
    try { schema = JSON.parse(form.inputSchemaText); }
    catch { e.schema = 'must be valid JSON'; }
    setErr(e);
    if (Object.keys(e).length) return;

    const payload = {
      name: form.name,
      description: form.description,
      inputSchema: schema,
      outputType: form.outputType,
      sideEffects: form.sideEffects,
      implementationHint: form.implementationHint,
    };
    if (editingIndex != null) dispatch({ type: 'UPDATE_TOOL', index: editingIndex, patch: payload });
    else dispatch({ type: 'ADD_TOOL', tool: payload });
    close();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div className="w-full max-w-2xl rounded-xl border border-dark-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
           style={{ backgroundColor: 'rgb(22 27 48)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#ff5b1f]" />
            <h3 className="text-sm font-semibold text-white">{editing ? 'Edit tool' : 'Add tool'}</h3>
          </div>
          <button onClick={close} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-4">
          <Row label="Name" required err={err.name} hint="snake_case">
            <input data-testid="tool-modal-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="get_issue" className={cls} />
          </Row>
          <Row label="Description" required err={err.description}
            hint="LLM reads this to decide when to call the tool">
            <textarea data-testid="tool-modal-desc" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Fetch a single issue by number" className={cls + ' resize-y'} />
          </Row>
          <Row label="Input schema (JSON Schema)" required err={err.schema}>
            <div className="h-44 rounded-lg border border-dark-700 overflow-hidden bg-[#0e172a]">
              <MonacoBox height="100%" language="json" value={form.inputSchemaText}
                onChange={(v) => setForm({ ...form, inputSchemaText: v ?? '' })}
                label={`Input schema — ${form.name || 'tool'}`} />
            </div>
          </Row>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Row label="Output type">
              <select data-testid="tool-modal-output" value={form.outputType}
                onChange={(e) => setForm({ ...form, outputType: e.target.value })} className={cls}>
                {OUTPUT_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
            </Row>
            <Row label="Side effects" hint="warns the LLM">
              <select data-testid="tool-modal-sideeffects" value={form.sideEffects}
                onChange={(e) => setForm({ ...form, sideEffects: e.target.value })} className={cls}>
                {SIDE_EFFECTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </Row>
          </div>
          <Row label="Implementation hint" hint="pseudo-code for yourself, optional">
            <textarea rows={3} value={form.implementationHint}
              onChange={(e) => setForm({ ...form, implementationHint: e.target.value })}
              placeholder="// 1. call GitHub REST / issues / :n..." className={cls + ' resize-y font-mono text-xs'} />
          </Row>
        </div>

        <div className="px-5 py-3 border-t border-dark-700 flex items-center justify-end gap-2 shrink-0">
          <button onClick={close} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">Cancel</button>
          <button onClick={save} data-testid="tool-modal-save" className="px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold">
            {editing ? 'Save changes' : 'Add tool'}
          </button>
        </div>
      </div>
    </div>
  );
}

const cls = 'w-full px-3 py-2 rounded-lg border border-dark-700 bg-[rgba(15,23,42,0.5)] text-white text-sm outline-none focus:border-[#ff5b1f] transition-colors placeholder:text-gray-600';

function Row({ label, required, hint, err, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
        {label} {required && <span className="text-[#ff5b1f]">*</span>}
        {hint && <span className="ml-2 text-gray-600 font-normal normal-case text-[10px]">{hint}</span>}
      </label>
      {children}
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}
