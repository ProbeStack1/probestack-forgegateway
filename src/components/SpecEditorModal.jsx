import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { X, RefreshCw, Code, Eye, Save, Columns, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiDesignService } from '../services/apiDesignService';

const generateSwaggerHtml = (specText) => {
  const escaped = specText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Swagger Preview</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.18.3/swagger-ui.css"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { margin: 0; padding: 0; background: #0b0f1e; }
    body { margin: 0; padding: 0 0 24px; background: #0b0f1e; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; }
    .swagger-ui { background: #0b0f1e; }
    .swagger-ui .wrapper { max-width: 100%; padding: 0 18px; }
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .information-container {
      background: linear-gradient(135deg, #161b2e 0%, #0e1525 100%);
      border-bottom: 1px solid #1e293b;
      padding: 24px 22px 20px !important;
    }
    .swagger-ui .info { margin: 0; }
    .swagger-ui .info .title { color: #f8fafc; font-size: 20px; font-weight: 700; }
    .swagger-ui .info .title small {
      background: rgba(249,115,22,0.12); color: #f97316;
      border: 1px solid rgba(249,115,22,0.25); border-radius: 20px;
      padding: 2px 8px; font-size: 10px; font-weight: 600; margin-left: 8px; vertical-align: middle;
    }
    .swagger-ui .info p { color: #94a3b8; font-size: 12px; margin: 4px 0 0; }
    .swagger-ui .info a { color: #f97316; }
    .swagger-ui .info .base-url { color: #475569; font-size: 11px; margin-top: 4px; }
    .swagger-ui .scheme-container {
      background: #0f172a; border-bottom: 1px solid #1e293b; padding: 12px 22px; box-shadow: none;
    }
    .swagger-ui select {
      background: #161b2e; color: #e2e8f0; border: 1px solid #2d3748;
      border-radius: 6px; padding: 5px 10px; font-size: 12px; outline: none;
    }
    .swagger-ui .auth-wrapper .authorize {
      background: transparent; border: 1px solid #2d3748; color: #94a3b8;
      border-radius: 6px; padding: 5px 12px; font-size: 11px; cursor: pointer;
    }
    .swagger-ui .auth-wrapper .authorize:hover { border-color: #10b981; color: #10b981; }
    .swagger-ui .filter .operation-filter-input {
      background: #161b2e; color: #e2e8f0; border: 1px solid #1e293b;
      border-radius: 7px; padding: 6px 12px; font-size: 12px; outline: none; width: 100%;
    }
    .swagger-ui .opblock-tag { border-bottom: 1px solid #1e293b; color: #f1f5f9; padding: 12px 0 8px; }
    .swagger-ui .opblock-tag h4 { font-size: 14px; font-weight: 600; color: #f1f5f9; margin: 0; }
    .swagger-ui .opblock-tag small { color: #64748b; font-size: 12px; }
    .swagger-ui .arrow { fill: #475569 !important; }
    .swagger-ui .expand-methods svg { fill: #475569; }
    .swagger-ui .opblock {
      border-radius: 8px; margin-bottom: 6px; border: 1px solid #1a2035;
      background: #0c1120; box-shadow: 0 2px 6px rgba(0,0,0,0.25); overflow: hidden;
    }
    .swagger-ui .opblock.opblock-get    { border-left: 3px solid #3b82f6; }
    .swagger-ui .opblock.opblock-post   { border-left: 3px solid #10b981; }
    .swagger-ui .opblock.opblock-put    { border-left: 3px solid #f59e0b; }
    .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444; }
    .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #8b5cf6; }
    .swagger-ui .opblock.opblock-get    .opblock-summary { background: rgba(59,130,246,0.05); }
    .swagger-ui .opblock.opblock-post   .opblock-summary { background: rgba(16,185,129,0.05); }
    .swagger-ui .opblock.opblock-put    .opblock-summary { background: rgba(245,158,11,0.05); }
    .swagger-ui .opblock.opblock-delete .opblock-summary { background: rgba(239,68,68,0.05); }
    .swagger-ui .opblock.opblock-patch  .opblock-summary { background: rgba(139,92,246,0.05); }
    .swagger-ui .opblock .opblock-summary { border: none !important; padding: 10px 14px; cursor: pointer; align-items: center; }
    .swagger-ui .opblock-summary-method {
      border-radius: 5px; min-width: 68px; font-weight: 700;
      font-size: 10px; padding: 4px 7px; text-align: center; letter-spacing: 0.07em;
    }
    .swagger-ui .opblock .opblock-summary-path {
      color: #e2e8f0; font-weight: 600; font-size: 13px;
      font-family: 'JetBrains Mono', monospace;
    }
    .swagger-ui .opblock .opblock-summary-description { color: #64748b; font-size: 12px; }
    /* Expanded body */
    .swagger-ui .opblock.is-open .opblock-body { background: #080d19; }
    .swagger-ui .opblock-section-header {
      background: #0e1525; border-top: 1px solid #1a2438; padding: 8px 14px;
    }
    .swagger-ui .opblock-section-header h4 {
      color: #64748b; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em; margin: 0;
    }
    .swagger-ui .opblock-description-wrapper { padding: 10px 14px; }
    .swagger-ui .opblock-description-wrapper p { color: #94a3b8; font-size: 12px; margin: 0; }
    .swagger-ui .try-out__btn {
      background: transparent; border: 1px solid #2d3748; color: #64748b;
      border-radius: 5px; font-size: 11px; padding: 4px 10px; cursor: pointer; transition: all 0.15s;
    }
    .swagger-ui .try-out__btn:hover { border-color: #f97316; color: #f97316; }
    /* Parameters */
    .swagger-ui .parameters-container { padding: 0 14px 12px; background: rgba(16,185,129,0.03); border-bottom: 1px solid #1a2438; }
    .swagger-ui table.parameters { width: 100%; border-collapse: separate; border-spacing: 0; }
    .swagger-ui table thead tr th, .swagger-ui table thead tr td {
      background: #0d1526; border-bottom: 1px solid #1a2438; color: #334155;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 10px;
    }
    .swagger-ui table tbody tr td {
      border-bottom: 1px solid #0f1929; color: #e2e8f0; padding: 10px 10px; vertical-align: top;
    }
    .swagger-ui .parameter__name { font-family: monospace; font-size: 12px; color: #e2e8f0; font-weight: 600; }
    .swagger-ui .parameter__name.required::after { color: #f97316; content: ' *'; font-size: 11px; }
    .swagger-ui .parameter__type {
      font-size: 10px; color: #3b82f6; background: rgba(59,130,246,0.08);
      border: 1px solid rgba(59,130,246,0.18); border-radius: 3px; padding: 1px 5px; display: inline-block; margin-top: 2px;
    }
    .swagger-ui .parameter__in { font-size: 9px; color: #475569; font-style: italic; }
    .swagger-ui .markdown p { color: #94a3b8; font-size: 12px; }
    /* Inputs */
    .swagger-ui input[type=text], .swagger-ui input[type=password],
    .swagger-ui input[type=email], .swagger-ui input[type=search],
    .swagger-ui input[type=number], .swagger-ui input[type=file] {
      background: #111827; color: #e2e8f0; border: 1px solid #2d3748;
      border-radius: 6px; padding: 7px 10px; font-size: 12px; width: 100%; outline: none; transition: border-color 0.2s;
    }
    .swagger-ui input[type=text]:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
    .swagger-ui input::placeholder { color: #334155; }
    .swagger-ui textarea {
      background: #111827; color: #e2e8f0; border: 1px solid #2d3748;
      border-radius: 6px; padding: 7px 10px; font-size: 12px; font-family: monospace;
      min-height: 70px; resize: vertical; width: 100%; outline: none;
    }
    .swagger-ui label { color: #64748b; font-size: 11px; }
    /* Buttons */
    .swagger-ui .btn { border-radius: 6px; font-size: 12px; font-weight: 500; padding: 6px 14px; transition: all 0.15s; cursor: pointer; }
    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #f97316 0%, #ea6c0a 100%);
      border: none; color: #fff; font-weight: 600; box-shadow: 0 2px 8px rgba(249,115,22,0.3);
    }
    .swagger-ui .btn.execute:hover { box-shadow: 0 4px 16px rgba(249,115,22,0.4); transform: translateY(-1px); }
    .swagger-ui .btn.btn-clear { background: transparent; border: 1px solid #2d3748; color: #64748b; }
    .swagger-ui .execute-wrapper { padding: 10px 14px 14px; background: rgba(16,185,129,0.03); border-top: 1px solid #1a2438; display: flex; gap: 8px; }
    /* Responses */
    .swagger-ui .responses-wrapper { padding: 0 14px 14px; background: #080d19; }
    .swagger-ui .responses-inner h4 { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px; }
    .swagger-ui .response-col_status { font-family: monospace; font-size: 13px; font-weight: 700; }
    .swagger-ui .response-col_description { color: #94a3b8; font-size: 12px; }
    .swagger-ui .highlight-code { background: #161b2e; border-radius: 7px; border: 1px solid #1e293b; overflow: hidden; }
    .swagger-ui pre.microlight {
      background: #161b2e !important; color: #e2e8f0 !important;
      border-radius: 7px; padding: 12px 14px;
      font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.6; overflow-x: auto; margin: 0;
    }
    .swagger-ui .curl-command { background: #0f172a; border: 1px solid #1e293b; border-radius: 7px; padding: 10px 12px; color: #94a3b8; font-family: monospace; font-size: 11px; }
    .swagger-ui .request-url pre { color: #f97316; font-size: 11px; }
    /* Models */
    .swagger-ui section.models { background: #0e1525; border: 1px solid #1e293b; border-radius: 8px; margin: 16px; }
    .swagger-ui section.models h4 { color: #f1f5f9; font-size: 13px; font-weight: 600; padding: 12px 16px; margin: 0; }
    .swagger-ui section.models.is-open h4 { border-bottom: 1px solid #1e293b; }
    .swagger-ui section.models .model-container { background: #0b0f1e; border-top: 1px solid #1e293b; padding: 12px 16px; margin: 0; }
    .swagger-ui .model-title { color: #f97316; font-size: 13px; font-weight: 600; }
    .swagger-ui .model { color: #e2e8f0; font-family: monospace; font-size: 12px; }
    .swagger-ui .model-box { background: #161b2e; border-radius: 5px; padding: 7px 10px; }
    .swagger-ui .prop-type { color: #3b82f6; font-style: italic; }
    .swagger-ui .prop-format { color: #475569; }
    /* Tabs */
    .swagger-ui .tab { border-bottom: 1px solid #1e293b; margin-bottom: 10px; display: flex; }
    .swagger-ui .tab li { color: #475569; font-size: 11px; font-weight: 500; padding: 6px 12px; cursor: pointer; border-bottom: 2px solid transparent; }
    .swagger-ui .tab li.active { color: #f97316; border-bottom-color: #f97316; }
    .swagger-ui a { color: #f97316; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #0b0f1e; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.18.3/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/js-yaml@4/dist/js-yaml.min.js"></script>
  <script>
    (function() {
      try {
        const raw = \`${escaped}\`;
        let spec;
        try { spec = JSON.parse(raw); }
        catch(_) { spec = jsyaml.load(raw); }
        SwaggerUIBundle({
          spec,
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
          deepLinking: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
        });
      } catch(e) {
        document.body.innerHTML = '<div style="padding:24px;font-family:monospace;font-size:12px;background:#0b0f1e;color:#ef4444;min-height:100vh;">Render error: ' + e.message + '</div>';
      }
    })();
  </script>
</body>
</html>`;
};

export default function SpecEditorModal({ spec, onClose, onSave }) {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('yaml');
  const [view, setView] = useState('split');
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const blobRef = useRef(null);

  const specId = spec?.id || spec?.specMetadataId;
  const specName = spec?.specName || spec?.name || spec?.fileName || 'Untitled Spec';

  const refreshSwagger = useCallback((text) => {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const html = generateSwaggerHtml(text);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    blobRef.current = url;
    setSwaggerUrl(url);
    setRefreshKey((k) => k + 1);
  }, []);

  // On mount: load content from API (or from embedded prop)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setFetchError('');

      const rawEmbedded = spec?.rawContent || spec?.content || spec?.specContent || '';
      // content may arrive as a parsed object — coerce to string
      let embedded = '';
      if (rawEmbedded && typeof rawEmbedded === 'string') {
        embedded = rawEmbedded;
      } else if (rawEmbedded && typeof rawEmbedded === 'object') {
        try { embedded = JSON.stringify(rawEmbedded, null, 2); } catch { embedded = ''; }
      }
      if (embedded) {
        if (!cancelled) {
          setContent(embedded);
          setLanguage(embedded.trim().startsWith('{') || embedded.trim().startsWith('[') ? 'json' : 'yaml');
          refreshSwagger(embedded);
          setLoading(false);
        }
        return;
      }

      if (specId) {
        const result = await apiDesignService.getSpecContent(specId);
        if (!cancelled) {
          if (result.success && result.content) {
            const c = result.content;
            setContent(c);
            setLanguage(c.trim().startsWith('{') || c.trim().startsWith('[') ? 'json' : 'yaml');
            refreshSwagger(c);
          } else {
            setFetchError(result.error || 'Failed to load spec content.');
          }
          setLoading(false);
        }
      } else {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [spec]);

  const handleRefresh = () => {
    if (content) refreshSwagger(content);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      let saved = false;
      // Try the update API first
      if (specId) {
        const result = await apiDesignService.updateSpec(specId, content);
        saved = result.success;
        if (!result.success) setSaveStatus('error');
      }
      if (saved || !specId) {
        setSaveStatus('success');
        await onSave?.(content);
        setTimeout(() => setSaveStatus(null), 2500);
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0b0f1e]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b2e] border-b border-[#232942] shrink-0">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-[#f97316]" />
          <span className="text-white font-semibold text-sm truncate max-w-[320px]">{specName}</span>
          <span className="text-xs text-gray-500 uppercase bg-[#0f172a] px-2 py-0.5 rounded">{language}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggles */}
          <div className="flex items-center bg-[#0f172a] rounded-lg p-0.5 border border-[#232942]">
            {[
              { id: 'editor', label: 'Editor', icon: Code },
              { id: 'split',  label: 'Split',  icon: Columns },
              { id: 'preview',label: 'Preview',icon: Eye },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setView(id); if (id !== 'editor') refreshSwagger(content); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${view === id ? 'bg-[#f97316] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {(view === 'split' || view === 'preview') && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-[#0f172a] border border-[#232942] rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}

          {/* Save status */}
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> Save failed
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#232942] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0b0f1e]">
          <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
          <p className="text-gray-400 text-sm">Loading spec content…</p>
        </div>
      )}

      {/* Fetch error */}
      {!loading && fetchError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0b0f1e] px-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-200 font-medium">Could not load spec</p>
          <p className="text-sm text-gray-500 max-w-md">{fetchError}</p>
          <p className="text-xs text-gray-600">You can still type or paste spec content below.</p>
          <button
            onClick={() => setFetchError('')}
            className="px-4 py-2 text-sm bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 rounded-lg hover:bg-[#f97316]/30 transition-colors"
          >
            Open empty editor
          </button>
        </div>
      )}

      {/* Editor + Preview */}
      {!loading && !fetchError && (
        <div className="flex flex-1 overflow-hidden">
          {/* Monaco */}
          {(view === 'editor' || view === 'split') && (
            <div className={`flex flex-col ${view === 'split' ? 'w-1/2 border-r border-[#232942]' : 'w-full'} overflow-hidden`}>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border-b border-[#232942] shrink-0">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Editor</span>
                <div className="ml-auto flex gap-1">
                  {['yaml', 'json'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${language === lang ? 'bg-[#f97316]/20 text-[#f97316]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={language}
                  value={content}
                  onChange={(v) => setContent(v || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: 'on',
                    folding: true,
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          )}

          {/* Swagger Preview */}
          {(view === 'preview' || view === 'split') && (
            <div className={`flex flex-col ${view === 'split' ? 'w-1/2' : 'w-full'} overflow-hidden`}>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border-b border-[#232942] shrink-0">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Swagger Preview</span>
                <span className="text-xs text-gray-600 ml-1">— click Refresh after editing</span>
              </div>
              {swaggerUrl ? (
                <iframe
                  key={refreshKey}
                  src={swaggerUrl}
                  className="flex-1 w-full border-0"
                  title="Swagger Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No preview yet</p>
                    <button
                      onClick={handleRefresh}
                      className="mt-3 px-3 py-1.5 text-xs bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 rounded-lg hover:bg-[#f97316]/30 transition-colors"
                    >
                      Generate Preview
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
