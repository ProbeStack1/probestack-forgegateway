// src/pages/mcp-generation/steps/Step2MCPRequirement.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import {
  AlertCircle,
  Bot,
  Copy,
  Eye,
  FileCode,
  FileText,
  Loader2,
  Pencil,
  Search,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { apiDesignService } from '../../../services/apiDesignService';
import { swaggerHubService } from '../../../services/swaggerHubService';
import RequirementAiSpecAssistant from '../../../components/RequirementAiSpecAssistant';

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };
const CATALOG_PAGE_SIZE = 6;

const REQUIREMENT_MODES = [
  { id: 'manual', label: 'Manual', icon: FileText },
  { id: 'file', label: 'File Upload', icon: Upload },
  { id: 'link', label: 'Link', icon: Copy },
];

export default function Step2MCPRequirement({ state, dispatch, showErrors, setToast }) {
  const identity = state?.identity || {};
  const selectedSpec = state?.selectedSpec || null;

  // ─── Requirements ──────────────────────────────────────────────────
  const onboarding = state?.onboarding || {};
  const functionalReqs = onboarding?.functionalRequirements || '';
  const nonFunctionalReqs = onboarding?.nonFunctionalRequirements || '';

  // ─── Requirement input mode ──────────────────────────────────────
  const [reqMode, setReqMode] = useState('manual');
  const [reqFile, setReqFile] = useState(null);
  const [reqUrl, setReqUrl] = useState('');
  const fileInputRef = useRef(null);

  // ─── Spec sources ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('library');
  const [specLibrary, setSpecLibrary] = useState([]);
  const [forgeCatalogSpecs, setForgeCatalogSpecs] = useState([]);
  const [swaggerHubSpecs, setSwaggerHubSpecs] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── Pagination ──────────────────────────────────────────────────
  const [forgeCatalogSearch, setForgeCatalogSearch] = useState('');
  const [forgeCatalogPage, setForgeCatalogPage] = useState(1);
  const [swaggerHubSearchInput, setSwaggerHubSearchInput] = useState('');
  const [swaggerHubPage, setSwaggerHubPage] = useState(1);

  // ─── AI Assistant overlay ────────────────────────────────────────
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const organizationId = state?.onboarding?.organizationId || 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c';

  // ─── Updaters ─────────────────────────────────────────────────────
  const updateIdentity = (patch) => dispatch({ type: 'SET_IDENTITY', patch });
  const updateRequirements = (patch) => {
    dispatch({
      type: 'SET_ONBOARDING_PATCH',
      patch: { ...onboarding, ...patch },
    });
  };

  // ─── Fetch specs ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'library') {
          const res = await apiDesignService.getLibrary(organizationId);
          if (res.success) setSpecLibrary(res.data?.data || res.data || []);
        } else if (activeTab === 'forgecatalog') {
          const catalogOrg = localStorage.getItem('companyName') || 'probestack';
          const response = await fetch(`https://forgestudio.probestack.io/api/v1/specs/gcs/org/${catalogOrg}`);
          const data = await response.json();
          setForgeCatalogSpecs(data?.data?.specs || []);
        } else if (activeTab === 'swaggerhub') {
          const catalogOrg = localStorage.getItem('companyName') || 'probestack';
          const result = await swaggerHubService.getApisByOwner(catalogOrg);
          if (result.success) setSwaggerHubSpecs(swaggerHubService.parseApiList(result.data));
        }
      } catch (err) {
        setToast?.({ message: `Failed to load specs: ${err.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, organizationId, setToast]);

  // ─── Select spec ──────────────────────────────────────────────────
  const selectSpec = (spec) => {
    const normalized = {
      id: spec.id || spec.specMetadataId || `spec-${Date.now()}`,
      name: spec.specName || spec.name || spec.fileName || 'Untitled',
      specName: spec.specName || spec.name || spec.fileName || 'Untitled',
      fileName: spec.fileName || `${spec.name || 'spec'}.json`,
      source: activeTab,
      specMetadataId: spec.specMetadataId || spec.id,
    };
    dispatch({ type: 'SET_SELECTED_SPEC', payload: normalized });
    const resourceName = normalized.name.replace(/\.[^.]+$/, '');
    if (!identity.displayName) updateIdentity({ displayName: resourceName });
    setToast?.({ message: `Selected: ${normalized.name}`, type: 'success' });
  };

  const clearSelectedSpec = () => {
    dispatch({ type: 'CLEAR_SELECTED_SPEC' });
  };

  const getResourceName = () => {
    return selectedSpec?.specName || selectedSpec?.name || identity.displayName || '';
  };

  // ─── Check if requirement content exists ─────────────────────────
  const hasRequirementContent = () => {
    if (reqMode === 'manual') return functionalReqs.trim().length > 0;
    if (reqMode === 'file') return !!reqFile;
    if (reqMode === 'link') return reqUrl.trim().length > 0;
    return false;
  };

  // ─── Render spec cards (grid) ────────────────────────────────────
  const renderSpecCards = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-gray-400">Loading specs…</span>
        </div>
      );
    }

    let items = [];
    let total = 0;
    let currentPage = 1;
    let totalPages = 1;
    let setPage = null;
    let searchTerm = '';
    let setSearch = null;

    if (activeTab === 'library') {
      items = specLibrary.map((s) => ({ id: s.id || s.specMetadataId, name: s.specName || s.name || s.fileName || 'Untitled', ...s }));
      total = items.length;
      currentPage = 1;
      totalPages = 1;
    } else if (activeTab === 'forgecatalog') {
      const filtered = forgeCatalogSpecs.filter((s) =>
        !forgeCatalogSearch || s.name?.toLowerCase().includes(forgeCatalogSearch.toLowerCase())
      );
      total = filtered.length;
      totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
      const page = Math.min(forgeCatalogPage, totalPages);
      currentPage = page;
      setPage = (p) => setForgeCatalogPage(p);
      items = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
      searchTerm = forgeCatalogSearch;
      setSearch = setForgeCatalogSearch;
    } else if (activeTab === 'swaggerhub') {
      const filtered = swaggerHubSpecs.filter((s) =>
        !swaggerHubSearchInput || s.name?.toLowerCase().includes(swaggerHubSearchInput.toLowerCase())
      );
      total = filtered.length;
      totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
      const page = Math.min(swaggerHubPage, totalPages);
      currentPage = page;
      setPage = (p) => setSwaggerHubPage(p);
      items = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
      searchTerm = swaggerHubSearchInput;
      setSearch = setSwaggerHubSearchInput;
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-6 text-gray-400">
          {loading ? 'Loading…' : 'No specs found for this source.'}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {searchTerm !== undefined && setSearch && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search specs…"
              value={searchTerm}
              onChange={(e) => {
                setSearch(e.target.value);
                if (setPage) setPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-dark-700 bg-[#0f172a]/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((spec) => {
            const isSelected = selectedSpec?.id === spec.id;
            const name = spec.specName || spec.name || spec.fileName || 'Untitled';
            return (
              <div
                key={spec.id || spec.gcsUrl}
                onClick={() => selectSpec(spec)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                    : 'border-dark-700 bg-[#0f172a]/50 hover:border-primary/50'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center',
                    isSelected ? 'border-primary bg-primary' : 'border-gray-600'
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <FileCode className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{spec.fileName || spec.version || ''}</p>
                </div>
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="View spec"
                    onClick={() => setToast?.({ message: 'View spec coming soon.', type: 'info' })}
                    className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Edit spec"
                    onClick={() => setToast?.({ message: 'Edit spec coming soon.', type: 'info' })}
                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">
              {total} spec{total !== 1 ? 's' : ''} · page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage && setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40"
              >
                ‹ Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage && setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 text-xs rounded border border-dark-700 text-gray-400 hover:text-white disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Requirement input area (Manual / File / Link) ──────────────
  const renderRequirementInput = () => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1 bg-[#0f172a]/60 border border-dark-700 rounded-lg p-0.5 w-fit">
          {REQUIREMENT_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setReqMode(mode.id)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5',
                  reqMode === mode.id ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <Icon className="w-3 h-3" />
                {mode.label}
              </button>
            );
          })}
        </div>

        {reqMode === 'manual' && (
          <textarea
            value={functionalReqs}
            onChange={(e) => updateRequirements({ functionalRequirements: e.target.value })}
            placeholder="Describe the core functionality of your MCP server…"
            rows={6}
            className="w-full rounded-lg border border-dark-700 bg-[#0f172a]/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
          />
        )}

        {reqMode === 'file' && (
          <div className="rounded-lg border border-dashed border-dark-700 bg-[#0f172a]/50 p-4">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <Upload className="h-7 w-7 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {reqFile ? reqFile.name : 'Upload requirement file'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Supported: .md, .txt, .docx, .pdf up to 10 MB</p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15">
                Choose file
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setReqFile(file);
                  }}
                />
              </label>
              {reqFile && (
                <button
                  type="button"
                  onClick={() => { setReqFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove file
                </button>
              )}
            </div>
          </div>
        )}

        {reqMode === 'link' && (
          <Input
            value={reqUrl}
            onChange={(e) => setReqUrl(e.target.value)}
            placeholder="https://example.com/requirements.md"
            className="h-10 text-sm"
          />
        )}
      </div>
    );
  };

  // ─── Validation errors ────────────────────────────────────────────
  const errors = showErrors ? {
    displayName: !identity.displayName && 'Display Name is required',
    slug: !identity.slug && 'Slug is required',
    functionalReqs: !functionalReqs.trim() && 'Functional Requirements are required',
  } : {};

  return (
    <div className="space-y-6 w-full">
      {/* ─── Select MCP Spec Card (cards) ──────────────────────────── */}
      <Card className="p-6" style={cardStyle}>
        <CardTitle className="mb-4 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-primary" />
          Select MCP Spec
        </CardTitle>

        <div className="flex items-center gap-1 bg-[#0f172a]/60 border border-dark-700 rounded-lg p-0.5 mb-4 w-fit">
          {['library', 'forgecatalog', 'swaggerhub'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setForgeCatalogPage(1);
                setSwaggerHubPage(1);
              }}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                activeTab === tab ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab === 'library' ? 'Spec Library' : tab === 'forgecatalog' ? 'ForgeCatalog' : 'SwaggerHub'}
            </button>
          ))}
        </div>

        {renderSpecCards()}

        {/* Selected spec summary */}
        {selectedSpec && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-primary">
                  Selected: <span className="font-semibold">{selectedSpec.name}</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  This spec will be pre‑selected in Step 3, and its name will become the MCP server resource name.
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  title="View spec"
                  onClick={() => setToast?.({ message: 'View spec coming soon.', type: 'info' })}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Edit spec"
                  onClick={() => setToast?.({ message: 'Edit spec coming soon.', type: 'info' })}
                  className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={clearSelectedSpec}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear selected spec"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Business Requirements Card ────────────────────────────── */}
      <Card className="p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Business Requirements
          </CardTitle>
          <Button
            onClick={() => setShowAIAssistant(true)}
            disabled={!hasRequirementContent()}
            className={cn(
              'text-xs flex items-center gap-1.5',
              hasRequirementContent()
                ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
                : 'bg-dark-700 text-gray-400 cursor-not-allowed'
            )}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Enhance & Find Specs
          </Button>
        </div>

        <div className="space-y-4">
          {/* Functional Requirements with tabs */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">
              Functional Requirements <span className="text-[#ff5b1f]">*</span>
            </Label>
            {renderRequirementInput()}
            {errors.functionalReqs && (
              <p className="text-[10px] text-red-400 mt-1">{errors.functionalReqs}</p>
            )}
          </div>

          {/* Non‑Functional Requirements */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Non‑Functional Requirements</Label>
            <textarea
              value={nonFunctionalReqs}
              onChange={(e) => updateRequirements({ nonFunctionalRequirements: e.target.value })}
              placeholder="Performance, security, availability requirements…"
              rows={3}
              className="w-full rounded-lg border border-dark-700 bg-[#0f172a]/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* ─── AI Assistant Overlay (modal) ───────────────────────────── */}
      {showAIAssistant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070b16] text-white">
          <div className="sticky top-0 z-10 border-b border-dark-700 bg-[#0b1020]/95 backdrop-blur">
            <div className="mx-auto flex max-w-[90%] items-center justify-between gap-4 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAIAssistant(false)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-dark-700 px-3 text-xs font-semibold text-slate-300 hover:border-primary/40 hover:text-white"
              >
                <X className="h-4 w-4" />
                Close
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Bot className="h-4 w-4" />
                  SpecForge Agent
                </div>
                <h3 className="mt-1 truncate text-lg font-bold text-white">Spec discovery & generation</h3>
                <p className="text-xs text-slate-400">
                  Requirement already provided on the main page – the assistant will skip that step.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[90%] px-5 py-6">
            <RequirementAiSpecAssistant
              functionalReqs={functionalReqs}
              setFunctionalReqs={(val) => updateRequirements({ functionalRequirements: val })}
              nonFunctionalReqs={nonFunctionalReqs}
              setNonFunctionalReqs={(val) => updateRequirements({ nonFunctionalRequirements: val })}
              setReqGenStatus={() => {}}
              setAiInput={() => {}}
              onSpecSelected={(spec) => {
                const normalized = {
                  id: spec.id || spec.specMetadataId || `assistant-${Date.now()}`,
                  name: spec.specName || spec.name || 'AI‑Generated Spec',
                  specName: spec.specName || spec.name || 'AI‑Generated Spec',
                  fileName: spec.fileName || `${spec.name || 'generated'}.json`,
                  source: 'ai-assistant',
                  specContent: spec.specContent || '',
                  specMetadataId: spec.specMetadataId || spec.id,
                };
                selectSpec(normalized);
                if (spec.description) {
                  updateRequirements({ functionalRequirements: spec.description });
                }
              }}
              onSchemaValidation={(spec) => {
                setToast?.({ message: 'Schema validation is not applicable for MCP capabilities.', type: 'info' });
              }}
              showMessage={setToast}
              apiDesignOptions={{ apiType: 'MCP', authenticationType: 'bearer', dataFormat: 'JSON' }}
              statusKeys={{ functional: 'functionalReqs', nonFunctional: 'nonFunctionalReqs' }}
              functionalPlaceholder=""
              nonFunctionalPlaceholder=""
              metricFields={[]}
              hideRequirement
              initialStage="sources"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Named export for validation ────────────────────────────────────
export const step2Valid = (state) => {
  const identity = state?.identity || {};
  const onboarding = state?.onboarding || {};
  return !!(identity.displayName && identity.slug && onboarding?.functionalRequirements);
};