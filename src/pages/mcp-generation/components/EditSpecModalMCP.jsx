import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { X, Save, Loader2, AlertCircle, CheckCircle2, Wrench, Layers, MessageSquare, ChevronRight, ChevronDown, CheckCircle, FileCode, Eye, Columns, Info } from 'lucide-react';
import { apiDesignService } from '../../../services/apiDesignService';
import { parseOpenApiToMcp } from '../components/mcpSpecParser';
import { cn } from '../../../lib/utils';

export default function EditSpecModalMCP({ spec, onClose, onSave, setToast }) {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('yaml');
  const [viewMode, setViewMode] = useState('split'); // 'editor' | 'split' | 'preview'
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [capabilities, setCapabilities] = useState({ tools: [], resources: [], prompts: [], extra: {} });
  const [expandedToolId, setExpandedToolId] = useState(null);
  const [expandedResourceId, setExpandedResourceId] = useState(null);
  const [expandedPromptId, setExpandedPromptId] = useState(null);
  const [showExtra, setShowExtra] = useState(false);

  const debounceRef = useRef(null);
  const specId = spec?.id || spec?.specMetadataId;
  const specName = spec?.specName || spec?.name || spec?.fileName || 'Untitled Spec';

  // Load spec content on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setFetchError('');

      const embedded = spec?.content || spec?.specContent || '';
      if (embedded) {
        if (!cancelled) {
          setContent(embedded);
          setLanguage(embedded.trim().startsWith('{') || embedded.trim().startsWith('[') ? 'json' : 'yaml');
          tryParse(embedded);
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
            tryParse(c);
          } else {
            setFetchError(result.error || 'Failed to load spec content.');
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [spec]);

  // Parse with debounce
  const tryParse = useCallback((text) => {
    try {
      const parsed = parseOpenApiToMcp(text, specName);
      setCapabilities(parsed);
      // Auto-expand first tool/resource/prompt if any
      if (parsed.tools && parsed.tools.length > 0 && !expandedToolId) {
        setExpandedToolId(parsed.tools[0].id);
      } else if (parsed.resources && parsed.resources.length > 0 && !expandedResourceId) {
        setExpandedResourceId(parsed.resources[0].id);
      } else if (parsed.prompts && parsed.prompts.length > 0 && !expandedPromptId) {
        setExpandedPromptId(parsed.prompts[0].id);
      }
    } catch (e) {
      setCapabilities({ tools: [], resources: [], prompts: [], extra: {} });
    }
  }, [specName, expandedToolId, expandedResourceId, expandedPromptId]);

  const handleContentChange = (newContent) => {
    setContent(newContent || '');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      tryParse(newContent || '');
    }, 500);
  };

  const toggleTool = (id) => {
    setExpandedToolId(expandedToolId === id ? null : id);
  };
  const toggleResource = (id) => {
    setExpandedResourceId(expandedResourceId === id ? null : id);
  };
  const togglePrompt = (id) => {
    setExpandedPromptId(expandedPromptId === id ? null : id);
  };

  // Render functions (same as View, but using state setters)
  const renderTool = (tool) => {
    const isExpanded = expandedToolId === tool.id;
    const hasResponses = tool.responses && Object.keys(tool.responses).length > 0;

    return (
      <div key={tool.id} className="border border-dark-700 rounded-lg mb-2 overflow-hidden bg-[#0f172a]/30">
        <button
          onClick={() => toggleTool(tool.id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f172a]/60 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0',
              tool.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
              tool.method === 'POST' ? 'bg-green-500/20 text-green-400' :
              tool.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
              tool.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            )}>{tool.method}</span>
            <span className="text-sm font-mono text-white truncate">{tool.path}</span>
            {tool.summary && <span className="text-xs text-gray-400 truncate hidden md:inline">— {tool.summary}</span>}
            {tool.deprecated && <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded flex-shrink-0">Deprecated</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tool.tags && tool.tags.length > 0 && (
              <span className="text-[10px] text-gray-500 hidden sm:inline">{tool.tags.join(', ')}</span>
            )}
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 py-3 border-t border-dark-700 space-y-3">
            {tool.description && <p className="text-sm text-gray-300">{tool.description}</p>}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Input Schema</div>
              <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-40 text-gray-300">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </div>
            {hasResponses && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Responses</div>
                {Object.entries(tool.responses).map(([status, resp]) => (
                  <div key={status} className="border-l-2 border-green-500/30 pl-3 py-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-green-400">{status}</span>
                      {resp.mediaType && <span className="text-[10px] text-gray-500">{resp.mediaType}</span>}
                      {resp.description && <span className="text-xs text-gray-400">{resp.description}</span>}
                    </div>
                    {resp.schema && (
                      <pre className="text-[11px] font-mono bg-dark-900/50 p-2 rounded overflow-auto max-h-32 text-gray-300 mt-1">
                        {JSON.stringify(resp.schema, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tool.security && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Security</div>
                <pre className="text-[11px] font-mono bg-dark-900/50 p-2 rounded overflow-auto max-h-20 text-gray-300">
                  {JSON.stringify(tool.security, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResource = (resource) => {
    const isExpanded = expandedResourceId === resource.id;
    return (
      <div key={resource.id} className="border border-dark-700 rounded-lg mb-2 overflow-hidden bg-[#0f172a]/30">
        <button
          onClick={() => toggleResource(resource.id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f172a]/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">{resource.name}</span>
            {resource.mimeType && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex-shrink-0">{resource.mimeType}</span>}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {isExpanded && (
          <div className="px-4 py-3 border-t border-dark-700 space-y-3">
            {resource.description && <p className="text-sm text-gray-300">{resource.description}</p>}
            {resource.schema && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Schema</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-40 text-gray-300">
                  {JSON.stringify(resource.schema, null, 2)}
                </pre>
              </div>
            )}
            {resource.example && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Example</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                  {JSON.stringify(resource.example, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPrompt = (prompt) => {
    const isExpanded = expandedPromptId === prompt.id;
    return (
      <div key={prompt.id} className="border border-dark-700 rounded-lg mb-2 overflow-hidden bg-[#0f172a]/30">
        <button
          onClick={() => togglePrompt(prompt.id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f172a]/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">{prompt.name}</span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {isExpanded && (
          <div className="px-4 py-3 border-t border-dark-700 space-y-3">
            {prompt.description && <p className="text-sm text-gray-300">{prompt.description}</p>}
            {prompt.arguments && prompt.arguments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Arguments</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                  {JSON.stringify(prompt.arguments, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderExtra = () => {
    const { extra } = capabilities;
    if (!extra) return null;
    return (
      <div className="border border-dark-700 rounded-lg overflow-hidden bg-[#0f172a]/30 mt-4">
        <button
          onClick={() => setShowExtra(!showExtra)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f172a]/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Additional Metadata</span>
          </div>
          {showExtra ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {showExtra && (
          <div className="px-4 py-3 border-t border-dark-700 space-y-4">
            {extra.info && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Info</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                  {JSON.stringify(extra.info, null, 2)}
                </pre>
              </div>
            )}
            {extra.servers && extra.servers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Servers</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                  {JSON.stringify(extra.servers, null, 2)}
                </pre>
              </div>
            )}
            {extra.securitySchemes && Object.keys(extra.securitySchemes).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Security Schemes</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                  {JSON.stringify(extra.securitySchemes, null, 2)}
                </pre>
              </div>
            )}
            {extra.tags && extra.tags.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tags</div>
                <pre className="text-[11px] font-mono bg-dark-900/70 p-2 rounded overflow-auto max-h-32 text-gray-300">
                  {JSON.stringify(extra.tags, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Save handler: clone
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const result = await apiDesignService.uploadSpec(
        'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c',
        'CREATE',
        null,
        null,
        content,
        null
      );
      if (result.success) {
        const newSpec = result.data?.data || result.data;
        setSaveStatus('success');
        if (onSave) {
          await onSave(newSpec, content);
        }
        setToast?.({ message: 'Spec saved as a new version.', type: 'success' });
        setTimeout(() => {
          setSaveStatus(null);
          onClose();
        }, 800);
      } else {
        setSaveStatus('error');
        setToast?.({ message: result.error || 'Failed to save spec.', type: 'error' });
      }
    } catch (err) {
      setSaveStatus('error');
      setToast?.({ message: err.message || 'Save failed.', type: 'error' });
    }
    setSaving(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0b0f1e]">
          <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
          <p className="text-gray-400 text-sm">Loading spec content…</p>
        </div>
      );
    }
    if (fetchError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0b0f1e] px-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-200 font-medium">Could not load spec</p>
          <p className="text-sm text-gray-500 max-w-md">{fetchError}</p>
          <button
            onClick={() => setFetchError('')}
            className="px-4 py-2 text-sm bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 rounded-lg hover:bg-[#f97316]/30 transition-colors"
          >
            Open empty editor
          </button>
        </div>
      );
    }

    // Three view modes
    const showEditor = viewMode === 'editor' || viewMode === 'split';
    const showPreview = viewMode === 'preview' || viewMode === 'split';

    return (
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        {showEditor && (
          <div className={cn(
            'flex flex-col overflow-hidden',
            viewMode === 'split' ? 'w-1/2 border-r border-[#232942]' : 'w-full'
          )}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border-b border-[#232942] shrink-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Editor</span>
              <span className="text-xs text-gray-600 ml-2">(editable – parsed capabilities update live)</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={language}
                value={content}
                onChange={handleContentChange}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  tabSize: 2,
                }}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div className={cn(
            'flex flex-col overflow-hidden bg-[#0f172a]/20',
            viewMode === 'split' ? 'w-1/2' : 'w-full'
          )}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border-b border-[#232942] shrink-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Live MCP Capabilities</span>
              <span className="text-xs text-gray-600 ml-2">
                {capabilities.tools?.length || 0} tools · {capabilities.resources?.length || 0} resources · {capabilities.prompts?.length || 0} prompts
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Tools */}
              {capabilities.tools && capabilities.tools.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Tools ({capabilities.tools.length})</span>
                  </div>
                  {capabilities.tools.map(renderTool)}
                </div>
              )}
              {/* Resources */}
              {capabilities.resources && capabilities.resources.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-white">Resources ({capabilities.resources.length})</span>
                  </div>
                  {capabilities.resources.map(renderResource)}
                </div>
              )}
              {/* Prompts */}
              {capabilities.prompts && capabilities.prompts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Prompts ({capabilities.prompts.length})</span>
                  </div>
                  {capabilities.prompts.map(renderPrompt)}
                </div>
              )}
              {/* Extra */}
              {capabilities.extra && renderExtra()}
              {/* Empty state */}
              {(!capabilities.tools || capabilities.tools.length === 0) &&
               (!capabilities.resources || capabilities.resources.length === 0) &&
               (!capabilities.prompts || capabilities.prompts.length === 0) && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No capabilities detected. Edit the spec to see them appear.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0b0f1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-[#161b2e] border-b border-[#232942]">
        <div className="flex items-center gap-3 min-w-0">
          <FileCode className="w-5 h-5 text-[#f97316]" />
          <span className="text-white font-semibold text-sm truncate max-w-[420px]">{specName}</span>
          <span className="text-xs text-gray-500">(Edit → clones as new version)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggles */}
          <div className="flex items-center bg-[#0f172a] rounded-lg p-0.5 border border-[#232942]">
            {[
              { id: 'editor', icon: FileCode, label: 'Editor' },
              { id: 'split', icon: Columns, label: 'Split' },
              { id: 'preview', icon: Eye, label: 'Preview' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors',
                  viewMode === id ? 'bg-[#f97316] text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Language toggle */}
          <div className="flex items-center bg-[#0f172a] rounded-lg p-0.5 border border-[#232942]">
            {['yaml', 'json'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded transition-colors',
                  language === lang ? 'bg-[#f97316] text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

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
            {saving ? 'Saving…' : 'Save as New'}
          </button>

          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#232942] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {renderContent()}
    </div>
  );
}