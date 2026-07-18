/**
 * Prompt modal — add / edit a Prompt. Supports n argument rows + a
 * Monaco markdown template body.
 */
import { useState, useEffect } from 'react';
import { X, MessageSquare, Plus, Trash2 } from 'lucide-react';
import MonacoBox from '../../../../components/ui/MonacoBox';

const EMPTY = {
  name: '',
  description: '',
  arguments: [{ name: 'topic', description: 'What to summarise', required: true }],
  template: 'Summarize {{topic}} in 3 bullet points.',
};

export default function PromptModal({ state, dispatch }) {
  const editingIndex = state.ui.editingPromptIndex;
  const editing = editingIndex != null ? state.capabilities.prompts[editingIndex] : null;

  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState({});

  useEffect(() => {
    if (editing) setForm({
      name: editing.name || '',
      description: editing.description || '',
      arguments: editing.arguments?.length ? editing.arguments : EMPTY.arguments,
      template: editing.template || '',
    });
    else setForm(EMPTY);
  }, [editingIndex]);

  const close = () => dispatch({ type: 'CLOSE_PROMPT_MODAL' });
  const save = () => {
    const e = {};
    if (!/^[a-z_][a-z0-9_]{1,60}$/.test(form.name)) e.name = 'snake_case required';
    if (!form.description?.trim()) e.description = 'description required';
    if (!form.template?.trim()) e.template = 'template required';
    setErr(e);
    if (Object.keys(e).length) return;

    const payload = {
      name: form.name,
      description: form.description,
      arguments: form.arguments.filter(a => a.name?.trim()),
      template: form.template,
    };
    if (editingIndex != null) dispatch({ type: 'UPDATE_PROMPT', index: editingIndex, patch: payload });
    else dispatch({ type: 'ADD_PROMPT', prompt: payload });
    close();
  };

  const addArg = () => setForm({ ...form, arguments: [...form.arguments, { name: '', description: '', required: false }] });
  const upArg = (i, patch) => setForm({ ...form, arguments: form.arguments.map((a, idx) => idx === i ? { ...a, ...patch } : a) });
  const rmArg = (i) => setForm({ ...form, arguments: form.arguments.filter((_, idx) => idx !== i) });

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div className="w-full max-w-2xl rounded-xl border border-dark-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
           style={{ backgroundColor: 'rgb(22 27 48)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-white">{editing ? 'Edit prompt' : 'Add prompt'}</h3>
          </div>
          <button onClick={close} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-4">
          <Row label="Name" required err={err.name} hint="snake_case">
            <input data-testid="prompt-modal-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="summarize_issue" className={cls} />
          </Row>
          <Row label="Description" required err={err.description}>
            <textarea rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} className={cls + ' resize-y'} />
          </Row>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Arguments</label>
              <button onClick={addArg} data-testid="prompt-modal-add-arg" className="flex items-center gap-1 text-xs text-[#ff5b1f] hover:underline">
                <Plus className="w-3 h-3" /> Add argument
              </button>
            </div>
            {form.arguments.length === 0 && <p className="text-xs text-gray-500">No arguments.</p>}
            {form.arguments.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-2 mb-2 items-center">
                <input value={a.name} onChange={(e) => upArg(i, { name: e.target.value })} placeholder="name" className={cls} />
                <input value={a.description} onChange={(e) => upArg(i, { description: e.target.value })} placeholder="description" className={cls} />
                <label className="flex items-center gap-1 text-xs text-gray-400 px-2">
                  <input type="checkbox" checked={a.required} onChange={(e) => upArg(i, { required: e.target.checked })} />
                  required
                </label>
                <button onClick={() => rmArg(i)} className="p-2 rounded-md text-gray-400 hover:text-red-400 hover:bg-dark-800">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Row label="Template body" required err={err.template} hint="use {{arg}} placeholders">
            <div className="h-40 rounded-lg border border-dark-700 overflow-hidden bg-[#0e172a]">
              <MonacoBox height="100%" language="markdown" value={form.template}
                onChange={(v) => setForm({ ...form, template: v ?? '' })}
                label={`Prompt template — ${form.name || 'prompt'}`} />
            </div>
          </Row>
        </div>

        <div className="px-5 py-3 border-t border-dark-700 flex justify-end gap-2 shrink-0">
          <button onClick={close} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">Cancel</button>
          <button onClick={save} data-testid="prompt-modal-save" className="px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold">
            {editing ? 'Save changes' : 'Add prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}

const cls = 'w-full px-3 py-2 rounded-lg border border-dark-700 bg-[rgba(15,23,42,0.5)] text-white text-sm outline-none focus:border-[#ff5b1f] placeholder:text-gray-600';
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
