/**
 * Universal Import modal — paste ANY supported collection blob (OpenAPI 3,
 * Postman v2, Insomnia v4, or a raw `[{method, path}]` array) and
 * the backend auto-detects + converts every endpoint into an MCP tool.
 *
 * Replaces the old OpenAPI-only modal. Format detection happens
 * server-side (see CollectionParserService.java) so the UI stays small.
 */
import { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Download, Loader2, Sparkles } from 'lucide-react';
import MonacoBox from '../../../../components/ui/MonacoBox';
import { mcpGenerationService } from '../../../../services/mcpGenerationService';

const SAMPLES = {
  openapi: `{
  "openapi": "3.0.0",
  "info": { "title": "Sample API", "version": "1.0.0" },
  "paths": {
    "/users/{id}": {
      "get": {
        "operationId": "get_user",
        "summary": "Fetch a user",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }]
      }
    }
  }
}`,
  postman: `{
  "info": {
    "name": "Sample Postman Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "List Users",
      "request": { "method": "GET", "url": { "raw": "https://api.example.com/users", "path": ["users"] } }
    },
    {
      "name": "Create User",
      "request": {
        "method": "POST",
        "url": { "raw": "https://api.example.com/users", "path": ["users"] },
        "body": { "raw": "{\\"name\\":\\"Ada\\"}" }
      }
    }
  ]
}`,
  insomnia: `{
  "_type": "export",
  "__export_format": 4,
  "resources": [
    { "_type": "request", "name": "List Users", "method": "GET", "url": "https://api.example.com/users" },
    { "_type": "request", "name": "Get User",  "method": "GET", "url": "https://api.example.com/users/{id}" }
  ]
}`,
  list: `[
  { "method": "GET",  "path": "/users",        "name": "List users" },
  { "method": "POST", "path": "/users",        "name": "Create user" },
  { "method": "GET",  "path": "/users/{id}",   "name": "Get user" }
]`,
};

const FORMAT_LABEL = {
  openapi: 'OpenAPI 3.x',
  postman: 'Postman v2',
  insomnia: 'Insomnia v4',
  'endpoint-list': 'Raw endpoint list',
};

export default function UniversalImportModal({ isOpen, onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const onParse = async () => {
    setError(null); setResult(null);
    if (!raw || !raw.trim()) { setError('Paste a collection first.'); return; }
    setParsing(true);
    const res = await mcpGenerationService.parseCollection(raw);
    setParsing(false);
    if (!res.success) { setError(res.error); return; }
    setResult(res.data);
  };

  const doImport = () => {
    if (result?.tools?.length) {
      onImport(result.tools);
      onClose();
    }
  };

  const loadSample = (key) => { setRaw(SAMPLES[key]); setResult(null); setError(null); };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-xl border border-dark-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'rgb(22 27 48)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="universal-import-modal"
      >
        <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#ff5b1f]" />
            <h3 className="text-sm font-semibold text-white">Import tools from any collection</h3>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 ml-2">universal parser</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-dark-800" data-testid="universal-import-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-3">
          <p className="text-xs text-gray-400">
            Paste an <span className="text-white">OpenAPI 3</span>, <span className="text-white">Postman v2</span>,{' '}
            <span className="font-mono text-white">[&#123;method, path&#125;]</span> array. Format is auto-detected on the server.
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-500 mr-1">Try a sample:</span>
            {Object.entries(SAMPLES).map(([k]) => (
              <button
                key={k}
                onClick={() => loadSample(k)}
                data-testid={`sample-${k}`}
                className="px-2 py-1 rounded border border-dark-700 hover:border-[#ff5b1f]/40 text-[11px] text-gray-300 hover:text-white"
              >
                {FORMAT_LABEL[k] || k}
              </button>
            ))}
          </div>

          <div className="h-72 rounded-lg border border-dark-700 overflow-hidden bg-[#0e172a]">
            <MonacoBox
              height="100%"
              language="json"
              value={raw}
              onChange={(v) => { setRaw(v ?? ''); setResult(null); setError(null); }}
              label="Collection JSON"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onParse}
              disabled={parsing}
              data-testid="universal-parse"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Parse
            </button>
            <button onClick={() => { setRaw(''); setResult(null); setError(null); }} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">
              Clear
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-300 text-xs flex items-start gap-2" data-testid="universal-error">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><div>{error}</div>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5" data-testid="universal-result">
              <div className="flex items-center gap-2 mb-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Detected: <span className="font-mono text-white">{FORMAT_LABEL[result.detectedFormat] || result.detectedFormat}</span>
                · Found <span className="text-white">{result.totalEndpoints}</span> endpoint{result.totalEndpoints === 1 ? '' : 's'}
              </div>
              <p className="text-[11px] text-gray-400 mb-2">{result.description}</p>
              <ul className="space-y-1 max-h-44 overflow-y-auto custom-scroll">
                {result.tools.map((t, i) => (
                  <li key={i} className="text-xs text-gray-300 font-mono flex items-center justify-between gap-2 px-2 py-1 rounded bg-dark-900/40">
                    <span className="text-white truncate">{t.name}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{t.sideEffects}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-dark-700 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-dark-700 text-gray-300 hover:bg-dark-800 text-xs">Cancel</button>
          <button
            onClick={doImport}
            disabled={!result || result.tools.length === 0}
            data-testid="universal-import-confirm"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5b1f] hover:bg-[#ff5b1f]/90 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" /> Import {result ? `${result.tools.length} tool${result.tools.length === 1 ? '' : 's'}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
