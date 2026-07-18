/**
 * Resource modal — add / edit a Resource. Maps 1:1 to McpProject.Resource.
 */
import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

const EMPTY = {
  uriTemplate: 'repo://{owner}/{name}/item',
  name: '',
  description: '',
  mimeType: 'application/json',
  mode: 'static',
};
const MIME_TYPES = ['application/json', 'text/plain', 'text/markdown', 'image/png'];
const MODES = ['static', 'dynamic'];

export default function ResourceModal({ state, dispatch }) {
  const editingIndex = state.ui.editingResourceIndex;
  const editing = editingIndex != null ? state.capabilities.resources[editingIndex] : null;

  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState({});

  useEffect(() => {
    if (editing) setForm({
      uriTemplate: editing.uriTemplate || EMPTY.uriTemplate,
      name: editing.name || '',
      description: editing.description || '',
      mimeType: editing.mimeType || 'application/json',
      mode: editing.mode || 'static',
    });
    else setForm(EMPTY);
  }, [editingIndex]);

  const close = () => dispatch({ type: 'CLOSE_RESOURCE_MODAL' });
  const save = () => {
    const e = {};
    if (!form.uriTemplate?.trim()) e.uriTemplate = 'uri template is required';
    if (!form.name?.trim()) e.name = 'name is required';
    setErr(e);
    if (Object.keys(e).length) return;

    if (editingIndex != null) dispatch({ type: 'UPDATE_RESOURCE', index: editingIndex, patch: form });
    else dispatch({ type: 'ADD_RESOURCE', resource: form });
    close();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div className="w-full max-w-lg rounded-xl border border-dark-700 shadow-2xl overflow-hidden"
           style={{ backgroundColor: 'rgb(22 27 48)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-300" />
            <h3 className="text-sm font-semibold text-white">{editing ? 'Edit resource' : 'Add resource'}</h3>
          </div>
          <button onClick={close} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Row label="URI template" required err={err.uriTemplate} hint="e.g. repo://{owner}/{name}/issues">
            <input data-testid="resource-modal-uri" value={form.uriTemplate}
              onChange={(e) => setForm({ ...form, uriTemplate: e.target.value })} className={cls} />
          </Row>
          <Row label="Name" required err={err.name}>
            <input data-testid="resource-modal-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} className={cls} />
          </Row>
          <Row label="Description">
            <textarea rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} className={cls + ' resize-y'} />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="MIME type">
              <select data-testid="resource-modal-mime" value={form.mimeType}
                onChange={(e) => setForm({ ...form, mimeType: e.target.value })} className={cls}>
                {MIME_TYPES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Row>
            <Row label="Mode">
              <select data-testid="resource-modal-mode" value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })} className={cls}>
                {MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Row>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-dark-700 flex justify-end gap-2">
          <button onClick={close} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">Cancel</button>
          <button onClick={save} data-testid="resource-modal-save" className="px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold">
            {editing ? 'Save changes' : 'Add resource'}
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
