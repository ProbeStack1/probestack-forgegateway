/**
 * OpenAPI Import modal — paste an OpenAPI 3 document (JSON), parser
 * extracts each operation → list of MCP tools, user reviews, clicks
 * Import to append them all to the wizard state.
 */
import { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import MonacoBox from '../../../../components/ui/MonacoBox';
import { parseOpenApiToTools } from '../../openApiImport';

const PLACEHOLDER = `{
  "openapi": "3.0.0",
  "info": { "title": "Paste your OpenAPI 3 JSON here", "version": "1.0.0" },
  "paths": {
    "/users/{id}": {
      "get": {
        "operationId": "get_user",
        "summary": "Fetch a user",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }]
      }
    }
  }
}`;

export default function OpenApiImportModal({ isOpen, onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [tools, setTools] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const onParse = () => {
    setError(null); setTools(null);
    try {
      const out = parseOpenApiToTools(raw || PLACEHOLDER);
      setTools(out);
    } catch (e) { setError(e.message); }
  };

  const doImport = () => {
    if (tools && tools.length) {
      onImport(tools);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl border border-dark-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
           style={{ backgroundColor: 'rgb(22 27 48)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#ff5b1f]" />
            <h3 className="text-sm font-semibold text-white">Import tools from OpenAPI 3</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-3">
          <p className="text-xs text-gray-400">
            Paste an OpenAPI 3 JSON document. Each operation becomes one MCP tool. Path/query params + JSON body become the tool&apos;s input schema.
            <span className="ml-2 text-gray-500">(YAML? Convert to JSON first.)</span>
          </p>

          <div className="h-64 rounded-lg border border-dark-700 overflow-hidden bg-[#0e172a]">
            <MonacoBox height="100%" language="json"
              value={raw}
              onChange={(v) => { setRaw(v ?? ''); setTools(null); setError(null); }}
              label="OpenAPI 3 spec (JSON)" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onParse} data-testid="openapi-parse"
              className="px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold">
              Parse
            </button>
            <button onClick={() => setRaw(PLACEHOLDER)} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">
              Load sample
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><div>{error}</div>
            </div>
          )}

          {tools && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4" /> Parsed {tools.length} tool{tools.length === 1 ? '' : 's'}
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto custom-scroll">
                {tools.map((t, i) => (
                  <li key={i} className="text-xs text-gray-300 font-mono flex items-center justify-between gap-2">
                    <span className="text-white">{t.name}</span>
                    <span className="text-[10px] text-gray-500">{t.sideEffects}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-dark-700 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">Cancel</button>
          <button onClick={doImport} disabled={!tools || tools.length === 0} data-testid="openapi-import"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            <Download className="w-3.5 h-3.5" /> Import {tools ? `${tools.length} tool${tools.length === 1 ? '' : 's'}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
