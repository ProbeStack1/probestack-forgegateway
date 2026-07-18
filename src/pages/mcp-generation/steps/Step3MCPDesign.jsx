/**
 * Step3MCPDesign – MCP Design (exact mirror of microservice API Design)
 *
 * The user imports/selects an OpenAPI spec. The spec is parsed and transformed
 * into MCP capabilities (tools, resources, prompts) which are dispatched to
 * the global state.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileCode, Download, Plus, Cloud, Search, Loader2, Copy, Check,
  Pencil, Eye, Trash2, AlertCircle, BookMarked, Shield, X, ChevronRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { apiDesignService } from '../../../services/apiDesignService';
import { swaggerHubService } from '../../../services/swaggerHubService';
import Toast from '../../../components/ui/toast';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import SpecEditorModal from '../../../components/SpecEditorModal';
import ViewSpecModal from '../../../components/ViewSpecModal';
import SchemaModeling from '../../SchemaModeling';
import { parseOpenApiToMcp } from '../components/mcpSpecParser';
import ViewSpecModalMCP from '../components/ViewSpecModalMCP';
import EditSpecModalMCP from '../components/EditSpecModalMCP';

const CATALOG_PAGE_SIZE = 6;

export default function Step3MCPDesign({ state, dispatch, setToast }) {
  const globalSelectedSpec = state.selectedSpec;

  // ── UI state (mirrors microservice step 3) ───────────────────────────
  const [designImportMode, setDesignImportMode] = useState('local');
  const [designUrlInput, setDesignUrlInput] = useState('');
  const [designCreateInput, setDesignCreateInput] = useState('');
  const [designSelectedSpec, setDesignSelectedSpec] = useState(globalSelectedSpec);
  const [designImportedSpecs, setDesignImportedSpecs] = useState([]);
  const [specLibrary, setSpecLibrary] = useState([]);
  const [forgeCatalogSpecs, setForgeCatalogSpecs] = useState([]);
  const [forgeCatalogLoading, setForgeCatalogLoading] = useState(false);
  const [forgeCatalogSearch, setForgeCatalogSearch] = useState('');
  const [forgeCatalogPage, setForgeCatalogPage] = useState(1);
  const [swaggerHubSpecs, setSwaggerHubSpecs] = useState([]);
  const [swaggerHubLoading, setSwaggerHubLoading] = useState(false);
  const [swaggerHubSearchInput, setSwaggerHubSearchInput] = useState('');
  const [swaggerHubPage, setSwaggerHubPage] = useState(1);
  const [apiDesignSource, setApiDesignSource] = useState('forgecatalog');
  const [forgeCatalogImportingUrl, setForgeCatalogImportingUrl] = useState(null);
  const [swaggerHubImportingId, setSwaggerHubImportingId] = useState(null);
  const [cloneSpecModal, setCloneSpecModal] = useState(null);
  const [cloneSpecName, setCloneSpecName] = useState('');
  const [cloningSpec, setCloningSpec] = useState(false);
  const [specEditorOpen, setSpecEditorOpen] = useState(false);
  const [specEditorSpec, setSpecEditorSpec] = useState(null);
  const [viewSpecOpen, setViewSpecOpen] = useState(false);
  const [viewSpecSpec, setViewSpecSpec] = useState(null);
  const [showSchemaValidation, setShowSchemaValidation] = useState(false);
  const [schemaValidationSpec, setSchemaValidationSpec] = useState(null);
  const [promoteDropdownSpecId, setPromoteDropdownSpecId] = useState(null);

  const designFileInputRef = useRef(null);
  const organizationId = 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c'; // same as microservice

  // ── Keep local state in sync with global state ──────────────────────
  useEffect(() => {
    setDesignSelectedSpec(globalSelectedSpec);
  }, [globalSelectedSpec]);

  // ── Load library and catalogs on mount ──────────────────────────────
  useEffect(() => {
    const loadLibrary = async () => {
      const res = await apiDesignService.getLibrary(organizationId);
      if (res.success) setSpecLibrary(res.data?.data || res.data || []);
    };
    loadLibrary();

    // ForgeCatalog
    const catalogOrg = localStorage.getItem('companyName') || 'probestack';
    setForgeCatalogLoading(true);
    fetch(`https://forgestudio.probestack.io/api/v1/specs/gcs/org/${catalogOrg}`)
      .then(r => r.json())
      .then(data => setForgeCatalogSpecs(data?.data?.specs || []))
      .catch(() => {})
      .finally(() => setForgeCatalogLoading(false));

    // SwaggerHub
    setSwaggerHubLoading(true);
    swaggerHubService.getApisByOwner(catalogOrg).then((result) => {
      if (result.success) setSwaggerHubSpecs(swaggerHubService.parseApiList(result.data));
      setSwaggerHubLoading(false);
    });
  }, [organizationId]);

  // ── When a spec is selected → parse → dispatch capabilities ──────
  const handleSpecSelection = useCallback(async (spec, source = 'library') => {
    if (!spec) return;

    // Build a uniform spec object (the same as microservice)
    const selectedSpec = {
      ...spec,
      id: spec.id,
      name: spec.specName || spec.name || spec.fileName || 'Untitled spec',
      specName: spec.specName || spec.name || spec.fileName || '',
      fileName: spec.fileName,
      source,
      specMetadataId: spec.specMetadataId || spec.id,
    };

    // Update local UI
    setDesignSelectedSpec(selectedSpec);
    // Update global state
    dispatch({ type: 'SET_SELECTED_SPEC', spec: selectedSpec });

    // Fetch spec content if not already present
    let content = spec.content || spec.specContent;
    if (!content && selectedSpec.specMetadataId) {
      try {
        const contentRes = await apiDesignService.getSpecContent(selectedSpec.specMetadataId);
        if (contentRes.success && contentRes.content) {
          content = contentRes.content;
        }
      } catch (e) {
        setToast?.({ message: 'Failed to fetch spec content', type: 'error' });
        return;
      }
    }

    if (!content) {
      setToast?.({ message: 'No spec content available to parse', type: 'error' });
      return;
    }

    // Parse the spec and generate MCP capabilities
    try {
      const { tools, resources, prompts } = parseOpenApiToMcp(content, selectedSpec.name);
      // Dispatch to reducer
      dispatch({ type: 'SET_CAPABILITIES_FROM_SPEC', tools, resources, prompts });
      setToast?.({ message: `Parsed spec → ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts`, type: 'success' });
    } catch (parseError) {
      setToast?.({ message: `Failed to parse spec: ${parseError.message}`, type: 'error' });
    }
  }, [dispatch, setToast]);

  // ── Upload / Import handlers ─────────────────────────────────────────
  const handleUploadFile = async (file) => {
    if (!file) return;
    const result = await apiDesignService.uploadSpec(organizationId, 'LOCAL', file, null, null, null);
    if (result.success) {
      setToast?.({ message: `Uploaded: ${file.name}`, type: 'success' });
      const newSpec = result.data?.data || result.data;
      if (newSpec) {
        setDesignImportedSpecs(prev => [...prev, { ...newSpec, source: 'imported' }]);
        handleSpecSelection(newSpec, 'imported');
      }
    } else {
      setToast?.({ message: result.error || 'Failed to upload spec', type: 'error' });
    }
  };

  const handleImportFromUrl = async (url) => {
    if (!url) return;
    const result = await apiDesignService.uploadSpec(organizationId, 'URL', null, url, null, null);
    if (result.success) {
      setToast?.({ message: `Imported from URL: ${url}`, type: 'success' });
      const newSpec = result.data?.data || result.data;
      if (newSpec) {
        setDesignImportedSpecs(prev => [...prev, { ...newSpec, source: 'imported' }]);
        handleSpecSelection(newSpec, 'imported');
      }
      setDesignUrlInput('');
    } else {
      setToast?.({ message: result.error || 'Failed to import from URL', type: 'error' });
    }
  };

  const handleCreateSpec = async (content) => {
    if (!content) return;
    const result = await apiDesignService.uploadSpec(organizationId, 'CREATE', null, null, content, null);
    if (result.success) {
      setToast?.({ message: 'Spec created successfully', type: 'success' });
      const newSpec = result.data?.data || result.data;
      if (newSpec) {
        setDesignImportedSpecs(prev => [...prev, { ...newSpec, source: 'imported' }]);
        handleSpecSelection(newSpec, 'imported');
      }
      setDesignCreateInput('');
    } else {
      setToast?.({ message: result.error || 'Failed to create spec', type: 'error' });
    }
  };

  // ── Clone from catalog / SwaggerHub ──────────────────────────────────
  const importForgeCatalogSpec = async (spec) => {
    setForgeCatalogImportingUrl(spec.gcsUrl);
    try {
      const res = await fetch(`https://forgestudio.probestack.io/api/v1/specs/gcs/content?gcsUrl=${encodeURIComponent(spec.gcsUrl)}`);
      if (!res.ok) throw new Error(`ForgeCatalog returned ${res.status}`);
      const json = await res.json();
      const specContent = json?.data?.content;
      if (!specContent) throw new Error('No content returned');
      setCloneSpecModal({ spec, source: 'forgecatalog', specContent });
      setCloneSpecName(`Copy of ${spec.name}`);
    } catch (err) {
      setToast?.({ message: err.message || 'Failed to fetch spec from ForgeCatalog', type: 'error' });
    }
    setForgeCatalogImportingUrl(null);
  };

  const importSwaggerHubSpec = async (spec) => {
    setSwaggerHubImportingId(spec.id);
    try {
      const fetchRes = await fetch(spec.specUrl, { headers: { Accept: 'application/json' } });
      if (!fetchRes.ok) throw new Error(`SwaggerHub returned ${fetchRes.status}`);
      const specContent = await fetchRes.text();
      setCloneSpecModal({ spec, source: 'swaggerhub', specContent });
      setCloneSpecName(`Copy of ${spec.name}`);
    } catch (err) {
      setToast?.({ message: err.message || 'Failed to fetch spec from SwaggerHub', type: 'error' });
    }
    setSwaggerHubImportingId(null);
  };

  const confirmSpecClone = async () => {
    if (!cloneSpecModal) return;
    setCloningSpec(true);
    const { specContent, spec } = cloneSpecModal;
    // Optionally rename title in spec (basic replace)
    let clonedContent = specContent;
    try {
      const parsed = JSON.parse(specContent);
      if (parsed.info) parsed.info.title = cloneSpecName;
      clonedContent = JSON.stringify(parsed, null, 2);
    } catch {
      clonedContent = specContent.replace(/^(\s*title:\s*).*$/m, `$1${cloneSpecName}`);
    }
    const result = await apiDesignService.uploadSpec(organizationId, 'CREATE', null, null, clonedContent, null);
    if (result.success) {
      setToast?.({ message: `${cloneSpecName} cloned and selected successfully`, type: 'success' });
      const newSpec = result.data?.data || result.data;
      if (newSpec) {
        setDesignImportedSpecs(prev => [...prev, { ...newSpec, source: 'imported' }]);
        handleSpecSelection(newSpec, 'imported');
      }
      setCloneSpecModal(null);
    } else {
      setToast?.({ message: result.error || 'Failed to clone spec', type: 'error' });
    }
    setCloningSpec(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const renderSpecList = (specs, title, source) => (
    <div className="mb-6">
      <p className="text-sm text-gray-400 mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {specs.map((spec) => {
          const isSelected = designSelectedSpec?.id === spec.id;
          return (
            <div
              key={spec.id}
              onClick={() => handleSpecSelection(spec, source)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                isSelected ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]' : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
              )}
            >
              <div className={cn('w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center', isSelected ? 'border-primary bg-primary' : 'border-gray-600')}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{spec.specName || spec.fileName}</p>
                <p className="text-xs text-gray-400 truncate">{spec.fileName}</p>
              </div>
              <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <button
                  title="View spec"
                  onClick={() => { setViewSpecSpec(spec); setViewSpecOpen(true); }}
                  className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Edit spec"
                  onClick={() => { setSpecEditorSpec(spec); setSpecEditorOpen(true); }}
                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Schema validation"
                  onClick={() => { setSchemaValidationSpec(spec); setShowSchemaValidation(true); }}
                  className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <div className="relative">
                  <button
                    title="Promote"
                    onClick={(e) => { e.stopPropagation(); setPromoteDropdownSpecId(promoteDropdownSpecId === spec.id ? null : spec.id); }}
                    className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                  </button>
                  {promoteDropdownSpecId === spec.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#161b30] border border-dark-700 rounded-lg shadow-xl py-1 w-52" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setPromoteDropdownSpecId(null); apiDesignService.promoteToLibrary(spec.id).then(() => setToast?.({ message: 'Promoted to library', type: 'success' })); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-primary/10 flex items-center gap-2"
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        Promote to Spec Library
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPromoteDropdownSpecId(null); apiDesignService.promoteToCatalog({ ...spec, orgId: 'probestack' }).then(() => setToast?.({ message: 'Promoted to ForgeCatalog', type: 'success' })); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-primary/10 flex items-center gap-2"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        Promote to ForgeCatalog
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Modals */}
      {viewSpecOpen && viewSpecSpec && (
        <ViewSpecModalMCP spec={viewSpecSpec} onClose={() => { setViewSpecOpen(false); setViewSpecSpec(null); }} />
      )}
      {specEditorOpen && specEditorSpec && (
         <EditSpecModalMCP
    spec={specEditorSpec}
    onClose={() => { setSpecEditorOpen(false); setSpecEditorSpec(null); }}
    onSave={async (newSpec, newContent) => {
      // This is called after the spec is cloned and saved.
      // We need to add the new spec to the imported list and select it.
      setDesignImportedSpecs(prev => [...prev, { ...newSpec, source: 'imported' }]);
      // Parse and dispatch capabilities
      await handleSpecSelection(newSpec, 'imported');
      // Optionally refresh the library list if needed
    }}
    setToast={setToast}
  />
      )}
      {showSchemaValidation && schemaValidationSpec && (
        <SchemaModeling
          specId={schemaValidationSpec?.id || schemaValidationSpec?.specMetadataId}
          specContent={schemaValidationSpec?.content || schemaValidationSpec?.specContent || ''}
          specName={schemaValidationSpec?.specName || schemaValidationSpec?.name || ''}
          onClose={() => setShowSchemaValidation(false)}
        />
      )}
      {cloneSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Copy className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Clone Spec</h3>
                <p className="text-xs text-gray-400">A new copy will be created in your workspace from <span className="text-white">{cloneSpecModal.spec.name}</span></p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300">Clone name</label>
                <input
                  type="text"
                  value={cloneSpecName}
                  onChange={(e) => setCloneSpecName(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white focus:outline-none focus:border-primary/50"
                  placeholder="Enter a name for the cloned spec"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setCloneSpecModal(null); setCloneSpecName(''); }}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-dark-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSpecClone}
                  disabled={cloningSpec || !cloneSpecName.trim()}
                  className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cloningSpec ? <><Loader2 className="w-4 h-4 animate-spin" /> Cloning...</> : <><Copy className="w-4 h-4" /> Clone & Select</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="rounded-xl border border-dark-700 p-6" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
        <div className="flex items-center gap-2 mb-4">
          <FileCode className="w-5 h-5 text-primary" />
          <h3 className="text-md font-semibold text-white">MCP Design Specifications</h3>
        </div>

        {/* Import Options Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => setDesignImportMode('local')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
              designImportMode === 'local'
                ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                : 'border-dark-700 bg-[#0f172a]/50 text-gray-300 hover:border-primary/50'
            )}
          >
            <FileCode className="w-4 h-4" />
            Import from Local
          </button>
          <button
            type="button"
            onClick={() => setDesignImportMode('url')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
              designImportMode === 'url'
                ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                : 'border-dark-700 bg-[#0f172a]/50 text-gray-300 hover:border-primary/50'
            )}
          >
            <Download className="w-4 h-4" />
            Import from URL
          </button>
          <button
            type="button"
            onClick={() => setDesignImportMode('create')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5',
              designImportMode === 'create'
                ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/25'
                : 'border-dark-700 bg-[#0f172a]/50 text-gray-300 hover:border-primary/50'
            )}
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>

        {/* Local Import */}
        {designImportMode === 'local' && (
          <div className="mb-6">
            <input
              ref={designFileInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
              }}
            />
            <div
              onClick={() => designFileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-dark-700 py-8 px-4 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5'
              )}
              style={{ backgroundColor: '#0f172a80' }}
            >
              <FileCode className="mb-2 h-10 w-10 text-gray-500" />
              <p className="text-sm font-medium text-white">Drop spec file or click to browse</p>
              <p className="mt-1 text-xs text-gray-500">YAML or JSON, max 10MB</p>
            </div>
          </div>
        )}

        {/* URL Import */}
        {designImportMode === 'url' && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://api.example.com/openapi.json"
                value={designUrlInput}
                onChange={(e) => setDesignUrlInput(e.target.value)}
                className="h-10 text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => handleImportFromUrl(designUrlInput.trim())}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        )}

        {/* Create Spec */}
        {designImportMode === 'create' && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-2">
              <textarea
                placeholder="Paste your OpenAPI spec here (YAML or JSON)"
                value={designCreateInput}
                rows={10}
                onChange={(e) => setDesignCreateInput(e.target.value)}
                className="text-sm flex-1 bg-slate-900/50 border border-[#232942] rounded-[10px] p-[10px] text-white"
              />
              <button
                type="button"
                onClick={() => handleCreateSpec(designCreateInput.trim())}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all flex w-[10%] items-center justify-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Import
              </button>
            </div>
          </div>
        )}

        {/* Imported Specs List (if any) */}
        {designImportedSpecs.length > 0 && renderSpecList(designImportedSpecs, 'Imported Specifications (Select one)', 'imported')}

        {/* Specification Library */}
        {specLibrary.length > 0 && renderSpecList(specLibrary, 'Specification Library (Click to select)', 'library')}

        {/* Selected Spec Banner */}
        {designSelectedSpec && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-primary">
                  Selected: <span className="font-semibold">{designSelectedSpec.name}</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  This spec will be parsed into MCP capabilities (Tools, Resources, Prompts).
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  title="View spec"
                  onClick={() => { setViewSpecSpec(designSelectedSpec); setViewSpecOpen(true); }}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Edit spec"
                  onClick={() => { setSpecEditorSpec(designSelectedSpec); setSpecEditorOpen(true); }}
                  className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDesignSelectedSpec(null);
                    dispatch({ type: 'SET_SELECTED_SPEC', spec: null });
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear selected spec"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Catalog Section (ForgeCatalog + SwaggerHub) */}
        <div className="mt-6">
          <div className="flex items-center gap-1 bg-[#0f172a]/60 border border-dark-700 rounded-lg p-0.5 mb-3 w-fit">
            <button
              type="button"
              onClick={() => setApiDesignSource('forgecatalog')}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                apiDesignSource === 'forgecatalog' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              ForgeCatalog
            </button>
            <button
              type="button"
              onClick={() => setApiDesignSource('swaggerhub')}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                apiDesignSource === 'swaggerhub' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              SwaggerHub
            </button>
          </div>

          {apiDesignSource === 'forgecatalog' && (
            forgeCatalogLoading && forgeCatalogSpecs.length === 0 ? (
              <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-400">Loading ForgeCatalog APIs...</p>
              </div>
            ) : forgeCatalogSpecs.length === 0 ? (
              <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                <p className="text-sm text-gray-400">No specs found in ForgeCatalog for your organization.</p>
              </div>
            ) : (() => {
              const fcFiltered = forgeCatalogSpecs.filter(s => !forgeCatalogSearch || s.name?.toLowerCase().includes(forgeCatalogSearch.toLowerCase()));
              const fcPages = Math.max(1, Math.ceil(fcFiltered.length / CATALOG_PAGE_SIZE));
              const fcPage = Math.min(forgeCatalogPage, fcPages);
              const fcSlice = fcFiltered.slice((fcPage - 1) * CATALOG_PAGE_SIZE, fcPage * CATALOG_PAGE_SIZE);
              return (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search specs..."
                      value={forgeCatalogSearch}
                      onChange={(e) => { setForgeCatalogSearch(e.target.value); setForgeCatalogPage(1); }}
                      className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {fcSlice.map((spec) => (
                      <div key={spec.gcsUrl} className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/50">
                        <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{spec.name}</p>
                          <p className="text-xs text-gray-400 truncate">{spec.projectId}</p>
                        </div>
                        <button
                          title="Clone and select this spec"
                          onClick={() => importForgeCatalogSpec(spec)}
                          disabled={forgeCatalogImportingUrl === spec.gcsUrl}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {forgeCatalogImportingUrl === spec.gcsUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                          Clone
                        </button>
                      </div>
                    ))}
                    {fcFiltered.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No results match your search.</p>}
                  </div>
                  {fcPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">{fcFiltered.length} spec{fcFiltered.length !== 1 ? 's' : ''} · page {fcPage} of {fcPages}</span>
                      <div className="flex gap-1">
                        <button disabled={fcPage <= 1} onClick={() => setForgeCatalogPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">‹ Prev</button>
                        <button disabled={fcPage >= fcPages} onClick={() => setForgeCatalogPage(p => Math.min(fcPages, p + 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">Next ›</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {apiDesignSource === 'swaggerhub' && (
            swaggerHubLoading && swaggerHubSpecs.length === 0 ? (
              <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-400">Loading SwaggerHub APIs...</p>
              </div>
            ) : swaggerHubSpecs.length === 0 ? (
              <div className="p-6 rounded-lg border border-dark-700 bg-[#0f172a]/50 text-center">
                <p className="text-sm text-gray-400">No org-specific APIs found in SwaggerHub.</p>
              </div>
            ) : (() => {
              const shFiltered = swaggerHubSpecs.filter(s => !swaggerHubSearchInput || s.name?.toLowerCase().includes(swaggerHubSearchInput.toLowerCase()));
              const shPages = Math.max(1, Math.ceil(shFiltered.length / CATALOG_PAGE_SIZE));
              const shPage = Math.min(swaggerHubPage, shPages);
              const shSlice = shFiltered.slice((shPage - 1) * CATALOG_PAGE_SIZE, shPage * CATALOG_PAGE_SIZE);
              return (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search SwaggerHub APIs..."
                      value={swaggerHubSearchInput}
                      onChange={(e) => { setSwaggerHubSearchInput(e.target.value); setSwaggerHubPage(1); }}
                      className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {shSlice.map((spec) => (
                      <div key={spec.id} className="flex items-center gap-2 p-3 rounded-lg border border-dark-700 bg-[#0f172a]/50">
                        <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{spec.name}</p>
                          <p className="text-xs text-gray-400 truncate">{spec.owner} · v{spec.version}</p>
                        </div>
                        <button
                          title="Clone and select this spec"
                          onClick={() => importSwaggerHubSpec(spec)}
                          disabled={swaggerHubImportingId === spec.id}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {swaggerHubImportingId === spec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                          Clone
                        </button>
                      </div>
                    ))}
                    {shFiltered.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No results match your search.</p>}
                  </div>
                  {shPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">{shFiltered.length} API{shFiltered.length !== 1 ? 's' : ''} · page {shPage} of {shPages}</span>
                      <div className="flex gap-1">
                        <button disabled={shPage <= 1} onClick={() => setSwaggerHubPage(p => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">‹ Prev</button>
                        <button disabled={shPage >= shPages} onClick={() => setSwaggerHubPage(p => Math.min(shPages, p + 1))} className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40">Next ›</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}