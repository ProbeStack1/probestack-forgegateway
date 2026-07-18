import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import YAML from "js-yaml";
import { DiffEditor } from "@monaco-editor/react";
import {
  Upload, Trash2, Grid3X3, List,
  CheckCircle2, Loader2, Database, Braces, ChevronRight,
  FileJson, Search, AlertTriangle, Copy, Check,
  Shield, Activity, BookOpen, ArrowLeft, GripVertical,
  Save, Tag, GitCompare, X,
} from "lucide-react";
import { useLayout } from "../context/LayoutContext";
import { apiDesignService } from "../services/apiDesignService";
import SchemaRegistryPanel from "../components/SchemaRegistryPanel";
import { getAllSchemaDefs } from "../utils/schemaFieldUtils";

// ─── Type helpers ────────────────────────────────────────────────────────────
const normaliseType = (raw) => {
  if (!raw) return null;
  const t = String(raw).toLowerCase().trim().replace(/\(.*\)/, "").trim();
  if (["varchar","text","char","nvarchar","string","str"].includes(t)) return "string";
  if (["int","int4","int8","bigint","smallint","integer","tinyint","mediumint"].includes(t)) return "integer";
  if (["float","double","decimal","numeric","real","number"].includes(t)) return "number";
  if (["bool","boolean","bit"].includes(t)) return "boolean";
  if (["date","datetime","timestamp","timestamptz"].includes(t)) return "string";
  if (["string","integer","number","boolean","array","object"].includes(t)) return t;
  return t;
};

const normaliseFormat = (raw) => {
  if (!raw) return null;
  const t = String(raw).toLowerCase().trim().replace(/\(.*\)/, "").trim();
  if (t === "date") return "date";
  if (["datetime","timestamp","timestamptz"].includes(t)) return "date-time";
  if (["email","mail"].includes(t)) return "email";
  if (["uri","url"].includes(t)) return "uri";
  if (t === "uuid") return "uuid";
  if (["float","double","decimal","numeric"].includes(t)) return "float";
  return null;
};

const fieldTypeColor = (t) => ({
  string:"#10b981", number:"#3b82f6", integer:"#3b82f6",
  boolean:"#f59e0b", array:"#8b5cf6", object:"#ec4899",
  email:"#06b6d4", phone:"#06b6d4", date:"#f97316",
  datetime:"#f97316", uuid:"#6366f1", uri:"#14b8a6",
}[t] || "#64748b");

// ─── Mismatch detector ───────────────────────────────────────────────────────
const detectFieldMismatches = (schemasList, rules) => {
  if (!rules?.length) return schemasList;
  const ruleMap = {};
  rules.forEach(r => { ruleMap[r.fieldName.toLowerCase()] = r; });

  return schemasList.map(schema => {
    const props = {};
    const mismatches = [];

    Object.entries(schema.properties || {}).forEach(([fn, field]) => {
      const rule = ruleMap[fn.toLowerCase()];
      let isMismatch = false, mismatchReason = null;

      if (rule) {
        if (rule.newFieldName && rule.newFieldName.toLowerCase() !== fn.toLowerCase()) {
          isMismatch = true; mismatchReason = `Rename to "${rule.newFieldName}"`;
        } else if (rule.type && field.type !== rule.type) {
          isMismatch = true; mismatchReason = `Type: "${field.type || "none"}" → "${rule.type}"`;
        } else if (rule.format && field.format !== rule.format) {
          isMismatch = true; mismatchReason = `Format: "${field.format || "none"}" → "${rule.format}"`;
        } else if (rule.required && !schema.required?.includes(fn)) {
          isMismatch = true; mismatchReason = "Should be required";
        }
      }

      props[fn] = { ...field, isMismatch, mismatchReason, rule: rule || null };
      if (isMismatch) mismatches.push({ fieldName: fn, mismatchReason });
    });

    return { ...schema, properties: props, hasMismatches: mismatches.length > 0, mismatches };
  });
};

// ─── Schema extractor ────────────────────────────────────────────────────────
const extractSchemasFromContent = (content) => {
  if (!content?.trim()) return [];
  try {
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = YAML.load(content); }
    if (!parsed || typeof parsed !== "object") return [];

    const schemas = [];
    // components.schemas (OpenAPI 3.x), definitions (Swagger 2.0), and $defs
    // (bare JSON Schema) are all merged — a spec can populate more than one
    // container at once. Every named entry counts as "in the spec",
    // regardless of its shape (object with properties, array, allOf/oneOf
    // composition, enum, or an empty stub) — this list is what "is schema X
    // already in the spec" checks against elsewhere, so gating it on having
    // `properties` would make a perfectly real schema look like it doesn't
    // exist.
    const components = getAllSchemaDefs(parsed);
    Object.entries(components).forEach(([name, schema]) => {
      if (!schema || typeof schema !== "object") return;
      schemas.push({
        name,
        description: schema.description || "",
        properties: schema.properties || {},
        required: schema.required || [],
        hasMismatches: false,
        mismatches: [],
      });
    });
    return schemas;
  } catch {
    return [];
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SchemaModeling({ specContent: propSpecContent, specName: propSpecName, specId, onClose, initialTab = "validation" }) {
  const { setHideNav } = useLayout();
  useLayoutEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  const [specContent, setSpecContent] = useState(propSpecContent || "");
  const [specName, setSpecName] = useState(propSpecName || "");
  const [fetchingContent, setFetchingContent] = useState(false);
  const [schemas, setSchemas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [fieldRules, setFieldRules] = useState([]);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedField, setCopiedField] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  // Last-persisted spec text — the baseline the Compare modal diffs the
  // current (possibly unsaved) specContent against. Updated whenever fresh
  // content is loaded (props/fetch) and after every successful save.
  const [savedSpecContent, setSavedSpecContent] = useState(propSpecContent || "");
  const [compareOpen, setCompareOpen] = useState(false);

  const fileInputRef = useRef(null);

  const showToast = (msg, type = "success") => {
    if (type === "error") setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  };

  // Re-extract schemas when spec content or rules change
  useEffect(() => {
    if (specContent) {
      const extracted = extractSchemasFromContent(specContent);
      setSchemas(detectFieldMismatches(extracted, fieldRules));
    }
  }, [specContent, fieldRules]);

  // Sync props
  useEffect(() => {
    if (propSpecContent) { setSpecContent(propSpecContent); setSavedSpecContent(propSpecContent); }
    if (propSpecName) setSpecName(propSpecName);
  }, [propSpecContent, propSpecName]);

  // Auto-fetch if only specId provided
  useEffect(() => {
    if (specId && !propSpecContent) {
      setFetchingContent(true);
      apiDesignService.getSpecContent(specId).then((result) => {
        if (result.success && result.content) {
          setSpecContent(result.content);
          setSavedSpecContent(result.content);
        } else {
          setError(result.error || "Failed to load spec content.");
        }
        setFetchingContent(false);
      });
    }
  }, [specId]);

  // ─── Rule file upload ─────────────────────────────────────────────────────
  const handleRuleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const text = await file.text();
      let rules = [];
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          rules = data.map(item => ({
            fieldName: item.field || item.fieldName || item.name || "",
            type: normaliseType(item.type),
            format: normaliseFormat(item.format),
            required: !!item.required,
            newFieldName: item.newFieldName || item.newName || null,
          })).filter(r => r.fieldName);
        }
      } catch {
        const lines = text.split("\n").filter(l => l.trim() && !l.startsWith("#"));
        lines.forEach(line => {
          const m = line.match(/^(\w+)\s*:\s*(\w+)/);
          if (m) rules.push({ fieldName: m[1], type: normaliseType(m[2]), format: null, required: false, newFieldName: null });
        });
      }
      if (rules.length > 0) {
        setReferenceFiles(prev => [...prev, { id: Date.now(), name: file.name, rules, expanded: true }]);
        setFieldRules(prev => {
          const merged = [...prev];
          rules.forEach(r => {
            if (!merged.find(x => x.fieldName.toLowerCase() === r.fieldName.toLowerCase())) merged.push(r);
          });
          return merged;
        });
        showToast(`Loaded ${rules.length} rules from ${file.name}`);
      } else {
        showToast("No rules found in file", "error");
      }
    } catch {
      showToast("Failed to parse file", "error");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveRuleFile = (id) => {
    setReferenceFiles(prev => {
      const remaining = prev.filter(f => f.id !== id);
      setFieldRules(remaining.flatMap(f => f.rules));
      return remaining;
    });
  };

  const toggleFileExpanded = (id) => {
    setReferenceFiles(prev => prev.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f));
  };

  // ─── Toggle required ─────────────────────────────────────────────────────
  const handleToggleRequired = (schemaName, fieldName) => {
    try {
      let parsed;
      let isYaml = false;
      try { parsed = JSON.parse(specContent); }
      catch { parsed = YAML.load(specContent); isYaml = true; }

      const schemaDefs = getAllSchemaDefs(parsed);
      const schema = schemaDefs[schemaName];
      if (!schema) return;

      const required = schema.required || [];
      schema.required = required.includes(fieldName)
        ? required.filter(f => f !== fieldName)
        : [...required, fieldName];

      setSpecContent(isYaml ? YAML.dump(parsed) : JSON.stringify(parsed, null, 2));
      setHasChanges(true);
    } catch (err) {
      showToast("Failed to toggle required: " + err.message, "error");
    }
  };

  // ─── Fix application (drag-and-drop) ─────────────────────────────────────
  const applyRuleFix = (schemaName, fieldName, rule) => {
    try {
      let parsed;
      let isYaml = false;
      try {
        parsed = JSON.parse(specContent);
      } catch {
        parsed = YAML.load(specContent);
        isYaml = true;
      }

      const schemaDefs = getAllSchemaDefs(parsed);
      const schema = schemaDefs[schemaName];
      if (!schema?.properties) { showToast("Schema not found", "error"); return; }

      const props = schema.properties;
      if (!props[fieldName]) { showToast("Field not found", "error"); return; }

      let fixed = false;

      if (rule.newFieldName && rule.newFieldName !== fieldName) {
        // Rename: copy property under new key, remove old
        props[rule.newFieldName] = { ...props[fieldName] };
        delete props[fieldName];
        if (Array.isArray(schema.required)) {
          schema.required = schema.required.map(f => f === fieldName ? rule.newFieldName : f);
        }
        fixed = true;
      } else {
        if (rule.type && props[fieldName].type !== rule.type) {
          props[fieldName].type = rule.type;
          fixed = true;
        }
        if (rule.format && props[fieldName].format !== rule.format) {
          props[fieldName].format = rule.format;
          fixed = true;
        }
        if (rule.required && !schema.required?.includes(fieldName)) {
          schema.required = [...(schema.required || []), fieldName];
          fixed = true;
        }
      }

      if (!fixed) { showToast("Rule already matches — nothing to fix", "error"); return; }

      const newContent = isYaml ? YAML.dump(parsed) : JSON.stringify(parsed, null, 2);
      setSpecContent(newContent);
      setHasChanges(true);
      showToast(`✓ Fixed "${fieldName}" in ${schemaName}`);
    } catch (err) {
      showToast("Failed to apply fix: " + err.message, "error");
    }
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!specId) { showToast("No spec ID — cannot save", "error"); return; }
    setSaving(true);
    const result = await apiDesignService.updateSpec(specId, specContent);
    if (result.success) {
      showToast("Spec saved successfully");
      setHasChanges(false);
      setSavedSpecContent(specContent);
    } else {
      showToast(result.error || "Failed to save spec", "error");
    }
    setSaving(false);
  };

  const handleCopyField = (name) => {
    navigator.clipboard?.writeText(name).catch(() => {});
    setCopiedField(name);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const mismatchCount = schemas.reduce((acc, s) => acc + (s.mismatches?.length || 0), 0);
  const totalFields = schemas.reduce((acc, s) => acc + Object.keys(s.properties || {}).length, 0);
  // Field names (lowercased) that currently have a mismatch — used to highlight matching rules
  const mismatchedFieldNames = new Set(
    schemas.flatMap(s => s.mismatches?.map(m => m.fieldName.toLowerCase()) ?? [])
  );
  const filteredSchemas = schemas.filter(s =>
    !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (fetchingContent) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0b0f1e] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
          <p className="text-gray-400 text-sm">Loading spec content…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0b0f1e] overflow-hidden">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161b2e] border-b border-[#232942] shrink-0">
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <Shield className="w-4 h-4 text-[#f97316]" />
        <span className="text-white font-semibold text-sm">Schema Validation</span>
        {specName && (
          <>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300 text-sm truncate max-w-[280px]">{specName}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          {success && <span className="text-xs text-green-400">{success}</span>}
          {hasChanges && (
            <button
              onClick={() => setCompareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#161b2e] hover:bg-[#1e2640] text-gray-300 border border-[#232942] rounded-lg transition-colors font-medium"
            >
              <GitCompare className="w-3.5 h-3.5" /> Compare
            </button>
          )}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-60 text-white rounded-lg transition-colors font-medium"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#232942] bg-[#0f172a] shrink-0">
        <button
          onClick={() => setActiveTab("validation")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
            activeTab === "validation"
              ? "border-[#f97316] text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Schema Validation
        </button>
        <button
          onClick={() => setActiveTab("registry")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
            activeTab === "registry"
              ? "border-[#f97316] text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Schema Modeling
        </button>
      </div>

      {activeTab === "registry" ? (
        <SchemaRegistryPanel
          specSchemas={schemas}
          specId={specId}
          specContent={specContent}
          savedSpecContent={savedSpecContent}
          onSpecContentChange={(next) => { setSpecContent(next); setHasChanges(true); }}
        />
      ) : (
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Rules ──────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-[#232942] bg-[#0f172a] overflow-y-auto">
          {/* Upload */}
          <div className="p-4 border-b border-[#232942]">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Field Standards
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Upload a JSON rule file, then drag rules onto highlighted fields to fix issues.
            </p>
            <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml,.csv,.txt" onChange={handleRuleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-[#f97316]/10 hover:bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 rounded-lg transition-colors"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload Rules File
            </button>
          </div>

          {/* Rules list */}
          {referenceFiles.length > 0 && (
            <div className="p-3 space-y-3 flex-1">
              {referenceFiles.map(file => (
                <div key={file.id} className="rounded-lg border border-[#232942] overflow-hidden">
                  {/* File header */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-2 bg-[#161b2e] cursor-pointer hover:bg-[#1e2640] transition-colors"
                    onClick={() => toggleFileExpanded(file.id)}
                  >
                    <FileJson className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white truncate font-medium">{file.name}</p>
                      <p className="text-[10px] text-gray-500">{file.rules.length} rules</p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform shrink-0 ${file.expanded ? "rotate-90" : ""}`} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveRuleFile(file.id); }}
                      className="text-gray-600 hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Individual rules — draggable */}
                  {file.expanded && (
                    <div className="divide-y divide-[#1a2035]">
                      {file.rules.map((rule, idx) => {
                        const hasIssue = mismatchedFieldNames.has(rule.fieldName.toLowerCase());
                        return (
                          <div
                            key={idx}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("application/json", JSON.stringify(rule));
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            className={`flex items-center gap-2 px-2.5 py-2 cursor-grab active:cursor-grabbing transition-colors group
                              ${hasIssue
                                ? "bg-emerald-500/8 hover:bg-emerald-500/15 border-l-2 border-l-emerald-500"
                                : "hover:bg-[#1a2438]"
                              }`}
                            title={hasIssue ? `This rule fixes an issue — drag onto the highlighted field` : rule.fieldName}
                          >
                            <GripVertical className={`w-3 h-3 shrink-0 ${hasIssue ? "text-emerald-400" : "text-gray-600"}`} />
                            <span className={`font-mono text-xs truncate flex-1 min-w-0 ${hasIssue ? "text-emerald-300 font-semibold" : "text-gray-200"}`}>
                              {rule.fieldName}
                            </span>
                            {hasIssue && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                              {rule.type && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                                  style={{ background: `${fieldTypeColor(rule.type)}18`, color: fieldTypeColor(rule.type) }}
                                >
                                  {rule.type}
                                </span>
                              )}
                              {rule.format && (
                                <span className="text-[9px] text-gray-500 font-mono">{rule.format}</span>
                              )}
                              {rule.required && (
                                <span className="text-[10px] text-[#f97316] font-bold">*</span>
                              )}
                              {rule.newFieldName && (
                                <span className="text-[9px] text-purple-400 font-mono truncate max-w-[60px]" title={`Rename → ${rule.newFieldName}`}>
                                  →{rule.newFieldName}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {schemas.length > 0 && (
            <div className="p-4 border-t border-[#232942] shrink-0 space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Stats
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Schemas", value: schemas.length, color: "text-white" },
                  { label: "Fields", value: totalFields, color: "text-white" },
                  { label: "Valid", value: totalFields - mismatchCount, color: "text-green-400" },
                  { label: "Issues", value: mismatchCount, color: mismatchCount > 0 ? "text-red-400" : "text-green-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-[#161b2e] border border-[#232942] text-center">
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Center: Schema cards ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0f172a] border-b border-[#232942] shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search schemas…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#161b2e] border border-[#232942] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316]/50"
              />
            </div>
            <div className="flex items-center bg-[#0b0f1e] rounded-lg p-0.5 border border-[#232942]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-[#f97316] text-white" : "text-gray-400 hover:text-white"}`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-[#f97316] text-white" : "text-gray-400 hover:text-white"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            {mismatchCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 font-medium">{mismatchCount} issue{mismatchCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            {mismatchCount === 0 && schemas.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400 font-medium">All valid</span>
              </div>
            )}
            {hasChanges && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#f97316]/10 border border-[#f97316]/25 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
                <span className="text-xs text-[#f97316]">Unsaved changes</span>
              </div>
            )}
          </div>

          {/* Hint when rules loaded and issues exist */}
          {fieldRules.length > 0 && mismatchCount > 0 && (
            <div className="px-4 py-2 bg-[#1a2035] border-b border-[#232942] flex items-center gap-2 shrink-0">
              <Tag className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
              <p className="text-xs text-gray-400">
                Drag a rule from the left panel and drop it onto a <span className="text-red-400 font-medium">highlighted field</span> to apply the fix automatically.
              </p>
            </div>
          )}

          {/* Schema grid/list */}
          <div className="flex-1 overflow-y-auto p-4">
            {schemas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Database className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium">No schemas found</p>
                <p className="text-sm text-gray-600 mt-1">
                  {specContent ? "This spec has no component schemas or definitions" : "Select a spec to start validation"}
                </p>
              </div>
            ) : filteredSchemas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search className="w-10 h-10 text-gray-600 mb-3" />
                <p className="text-gray-400">No schemas match "{searchTerm}"</p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
                {filteredSchemas.map((schema) => (
                  <SchemaCard
                    key={schema.name}
                    schema={schema}
                    copiedField={copiedField}
                    onCopyField={handleCopyField}
                    onFieldDrop={(fieldName, rule) => applyRuleFix(schema.name, fieldName, rule)}
                    onToggleRequired={(fieldName) => handleToggleRequired(schema.name, fieldName)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Compare modal: last-saved vs. current (unsaved) spec ────────────── */}
      {compareOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#161b2e] border border-[#232942] rounded-xl w-full h-full max-w-6xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#232942] shrink-0">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-[#f97316]" />
                <h3 className="text-white font-semibold text-sm">Compare Changes</h3>
                <span className="text-xs text-gray-500">Saved (left) vs. Unsaved (right)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500/40 border border-green-500/60" /> Added
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 border border-red-500/60 ml-2" /> Removed
                </span>
                <button onClick={() => setCompareOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DiffEditor
                original={savedSpecContent}
                modified={specContent}
                language={specContent?.trim().startsWith("{") ? "json" : "yaml"}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  fontSize: 12,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  renderSideBySide: true,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schema Card ──────────────────────────────────────────────────────────────
function SchemaCard({ schema, copiedField, onCopyField, onFieldDrop, onToggleRequired, viewMode }) {
  const [expanded, setExpanded] = useState(true);
  const fields = Object.entries(schema.properties || {});

  return (
    <div className={`rounded-xl border ${schema.hasMismatches ? "border-red-500/30" : "border-[#232942]"} bg-[#161b2e] overflow-hidden`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#1a2438] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Braces className="w-4 h-4 text-[#f97316] shrink-0" />
          <span className="text-white font-semibold text-sm truncate">{schema.name}</span>
          <span className="text-xs text-gray-500 shrink-0">{fields.length} fields</span>
          {schema.hasMismatches && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" /> {schema.mismatches.length}
            </span>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} />
      </div>

      {expanded && (
        <div className="border-t border-[#232942] divide-y divide-[#1a2035]">
          {fields.map(([name, field]) => (
            <FieldRow
              key={name}
              name={name}
              field={field}
              isRequired={schema.required?.includes(name)}
              copied={copiedField === name}
              onCopy={() => onCopyField(name)}
              onDrop={(rule) => onFieldDrop(name, rule)}
              onToggleRequired={() => onToggleRequired(name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ name, field, isRequired, copied, onCopy, onDrop, onToggleRequired }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const color = fieldTypeColor(field.type);

  const handleDragOver = (e) => {
    if (!field.isMismatch) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!field.isMismatch || !onDrop) return;
    try {
      const rule = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(rule);
    } catch {}
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 group transition-all
        ${field.isMismatch
          ? isDragOver
            ? "bg-[#f97316]/10 ring-1 ring-inset ring-[#f97316]/40"
            : "bg-red-500/5"
          : ""
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-2 min-w-0 flex-1 pt-0.5">
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 mt-0.5"
          style={{ background: `${color}22`, color }}
        >
          {field.type || "any"}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-sm text-gray-200 font-mono">{name}</span>
          {field.isMismatch && (
            <div className={`flex items-center gap-1.5 mt-0.5 ${isDragOver ? "text-[#f97316]" : "text-red-400"}`}>
              {isDragOver
                ? <span className="text-[10px] font-medium animate-pulse">Drop to fix →</span>
                : (
                  <>
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] truncate max-w-[180px]">{field.mismatchReason}</span>
                  </>
                )
              }
            </div>
          )}
        </div>
      </div>

      {/* REQ / OPT toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleRequired?.(); }}
        title={isRequired ? "Required — click to make optional" : "Optional — click to make required"}
        className={`shrink-0 w-[34px] text-center py-0.5 rounded-full text-[10px] font-semibold tracking-wide border transition-colors ${
          isRequired
            ? "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/35 hover:bg-[#f97316]/25 hover:border-[#f97316]/60"
            : "bg-transparent text-gray-600 border-[#1e2640] hover:text-gray-400 hover:border-[#2a3050]"
        }`}
      >
        {isRequired ? "REQ" : "OPT"}
      </button>

      <button
        onClick={onCopy}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-200 transition-all shrink-0"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
