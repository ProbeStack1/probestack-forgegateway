import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Save, Copy, Check, Database,
  Search, Download, Upload, X, AlertCircle, CheckCircle2,
  Package, Braces, ChevronRight, ArrowRightLeft, RefreshCw, FileCode2, MapPin, Tag, Network,
} from 'lucide-react';
import { useSchemaRegistry } from '../hooks/useSchemaRegistry';
import SchemaFieldTree from './SchemaFieldTree';
import SchemaSpecPanel from './SchemaSpecPanel';
import MapToEndpointModal from './MapToEndpointModal';
import SchemaMapView from './SchemaMapView';
import {
  emptyField, emptyForm, buildDefinition, definitionToFields, generateYamlPreview,
  updateFieldAtPath, removeFieldAtPath, addFieldAtPath, deepCloneWithNewIds,
  dedupeFieldName, parseUploadedSchemaFile, upsertSchemaIntoSpec, removeSchemaFromSpec,
  getSchemaDomain, withDomain, getDistinctDomains, typeColor, getSchemaRefPath,
} from '../utils/schemaFieldUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyComposeForm = (name) => ({ name, description: '', domain: '', fields: [] });

// Builds the {onChange, onRemove, onAddField} trio a <SchemaFieldTree> needs,
// bound to a given setState — shared by the manual builder form and both
// compose drop-target panels so the recursive edit logic isn't duplicated.
const makeFieldHandlers = (setState) => ({
  onChange: (path, key, value) => setState(prev => ({
    ...prev,
    fields: updateFieldAtPath(prev.fields, path, f => {
      const updated = { ...f, [key]: value };
      if (key === 'type') {
        updated.format = '';
        if (value === 'object') {
          if (!f.children?.length) updated.children = [emptyField()];
          updated.isPrimaryKey = false;
          updated.foreignKey = null;
        }
      }
      if (key === 'itemType' && value === 'object' && !(f.itemChildren?.length)) {
        updated.itemChildren = [emptyField()];
      }
      return updated;
    }),
  })),
  onRemove: (path) => setState(prev => ({ ...prev, fields: removeFieldAtPath(prev.fields, path) })),
  onAddField: (path) => setState(prev => ({ ...prev, fields: addFieldAtPath(prev.fields, path, emptyField()) })),
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SchemaRegistryPanel({ specSchemas = [], specId, specContent = '', savedSpecContent = '', onSpecContentChange }) {
  const { schemas, loading, orgId, createSchema, updateSchema, deleteSchema, orgSchemas, loadOrgSchemas, searchByDomain, getAllDomains } = useSchemaRegistry(specId);

  const [search, setSearch]           = useState('');
  const [selectedId, setSelectedId]   = useState(null);
  const [isCreating, setIsCreating]   = useState(false);
  const [form, setForm]               = useState(emptyForm());
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [copiedRef, setCopiedRef]     = useState(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [nameError, setNameError]     = useState('');
  const [domainError, setDomainError] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [uploadedCandidates, setUploadedCandidates] = useState([]);
  const [selectedImportKeys, setSelectedImportKeys] = useState(new Set());
  const [crossSpecDomain, setCrossSpecDomain] = useState('');
  // Results of the cross-organization domain search (see `searchByDomain` in
  // useSchemaRegistry) — fetched fresh per domain since it's not org-scoped
  // and there's nothing sensible to cache it against.
  const [crossSpecResults, setCrossSpecResults] = useState([]);
  const [crossSpecLoading, setCrossSpecLoading] = useState(false);
  // Full, system-wide domain list (GET /v1/api/schemas/domains) — populates
  // both the sidebar domain filter and the "Find by domain" search's
  // suggestions. Fetched once on mount; not org-scoped, same as
  // searchByDomain above.
  const [allDomains, setAllDomains] = useState([]);
  const [allDomainsLoading, setAllDomainsLoading] = useState(false);
  const [allDomainsError, setAllDomainsError] = useState('');
  // Imported (spec/upload-sourced) schemas are staged here first — nothing is
  // written to the backend until the user reviews it in Data Modelling and
  // explicitly clicks Save, same as the "New Schema" flow. Avoids surprising
  // DB writes on import, and avoids blocking staging on a name conflict that
  // only actually matters at save time.
  const [draftSchemas, setDraftSchemas] = useState([]);
  const [editingDraftId, setEditingDraftId] = useState(null);

  const [builderMode, setBuilderMode] = useState('builder'); // 'builder' | 'compose'
  const [composeExpanded, setComposeExpanded] = useState({});
  const [composeRequest, setComposeRequest]   = useState(() => emptyComposeForm('RequestSchema'));
  const [composeResponse, setComposeResponse] = useState(() => emptyComposeForm('ResponseSchema'));
  const [requestDragOver, setRequestDragOver]   = useState(false);
  const [responseDragOver, setResponseDragOver] = useState(false);
  const [composeSaving, setComposeSaving] = useState({ request: false, response: false });
  const [specPanelOpen, setSpecPanelOpen] = useState(false);
  const [mapModalSchema, setMapModalSchema] = useState(null);

  const schemaFileInputRef = useRef(null);

  // Load the org-wide list eagerly (not just when the Import modal opens):
  // schema names are unique per ORGANIZATION on the backend, not per spec, so
  // this is needed to warn about name collisions with schemas that live in a
  // different spec — otherwise they're invisible in this spec-scoped panel
  // until a create/save round-trips a confusing 409.
  useEffect(() => { loadOrgSchemas(); }, [loadOrgSchemas]);

  // Load the full domain list once eagerly — the sidebar filter needs it
  // immediately, not just when the Import modal opens.
  useEffect(() => {
    let cancelled = false;
    setAllDomainsLoading(true);
    getAllDomains().then(result => {
      if (cancelled) return;
      if (result.success) { setAllDomains(result.data); setAllDomainsError(''); }
      else setAllDomainsError(result.error || 'Failed to load domains');
      setAllDomainsLoading(false);
    });
    return () => { cancelled = true; };
  }, [getAllDomains]);

  // Cross-organization domain search — fires as soon as a domain is picked
  // from the dropdown (a discrete selection, not typing, so no debounce needed).
  useEffect(() => {
    if (!crossSpecDomain.trim()) { setCrossSpecResults([]); setCrossSpecLoading(false); return; }
    let cancelled = false;
    setCrossSpecLoading(true);
    searchByDomain(crossSpecDomain).then(result => {
      if (cancelled) return;
      setCrossSpecResults(result.data);
      setCrossSpecLoading(false);
    });
    return () => { cancelled = true; };
  }, [crossSpecDomain, searchByDomain]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formHandlers    = makeFieldHandlers(setForm);
  const requestHandlers = makeFieldHandlers(setComposeRequest);
  const responseHandlers = makeFieldHandlers(setComposeResponse);
  const isInSpec = (name) => specSchemas.some(s => s.name === name);

  // A name that exists somewhere in the org but not in this spec's own list —
  // creating it here will 409, since the backend enforces org-wide uniqueness.
  const nameUsedInOtherSpec = (name) => {
    const n = name?.trim().toLowerCase();
    if (!n) return false;
    return orgSchemas.some(s => s.name.toLowerCase() === n) && !schemas.some(s => s.name.toLowerCase() === n);
  };

  const nameConflictHint = (name) =>
    `A schema named "${name}" already exists in this organization (schema names must be unique org-wide, not just per spec) — pick a different name, or use Import → "Find in other specs" to reuse the existing one.`;

  // ── Select a schema for editing ──────────────────────────────────────────
  const handleSelect = (schema) => {
    setSelectedId(schema.id);
    setIsCreating(false);
    setEditingDraftId(null);
    setNameError('');
    setDomainError('');
    setForm({
      name: schema.name,
      description: schema.description || '',
      domain: getSchemaDomain(schema),
      fields: definitionToFields(schema.definition),
    });
  };

  // ── Select an imported-but-unsaved draft for review ──────────────────────
  const handleSelectDraft = (draft) => {
    setSelectedId(draft.id);
    setIsCreating(true); // saving a draft always creates a fresh registry record
    setEditingDraftId(draft.id);
    setNameError('');
    setDomainError('');
    setForm({
      name: draft.name,
      description: draft.description || '',
      domain: getSchemaDomain(draft),
      fields: definitionToFields(draft.definition),
    });
  };

  const handleDiscardDraft = (draftId) => {
    setDraftSchemas(prev => prev.filter(d => d.id !== draftId));
    if (selectedId === draftId) {
      setSelectedId(null);
      setIsCreating(false);
      setEditingDraftId(null);
      setForm(emptyForm());
    }
  };

  // ── Start creating a new schema ──────────────────────────────────────────
  const handleNew = () => {
    setSelectedId(null);
    setIsCreating(true);
    setEditingDraftId(null);
    setNameError('');
    setDomainError('');
    setForm(emptyForm());
  };

  // ── Save (create or update) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setNameError('Schema name is required'); return; }
    if (isCreating && !form.domain.trim()) { setDomainError('Domain is required'); return; }
    if (!form.fields.some(f => f.name.trim())) { showToast('Add at least one field', 'error'); return; }

    const definition = buildDefinition(form.fields);
    const domain = form.domain.trim();
    setNameError('');
    setDomainError('');
    setSaving(true);

    if (isCreating) {
      const result = await createSchema(form.name.trim(), definition, form.description, domain);
      if (result.success) {
        setSelectedId(result.data.id);
        setIsCreating(false);
        if (editingDraftId) {
          setDraftSchemas(prev => prev.filter(d => d.id !== editingDraftId));
          setEditingDraftId(null);
        }
        showToast(
          isInSpec(result.data.name)
            ? `Schema "${result.data.name}" created`
            : `Schema "${result.data.name}" created — not in the spec yet, click "Not in spec" below to add it`
        );
      } else if (result.status === 409) {
        setNameError(nameConflictHint(form.name.trim()));
      } else {
        showToast(result.error || 'Failed to create schema', 'error');
      }
    } else if (selectedId) {
      const result = await updateSchema(selectedId, {
        name: form.name.trim(),
        description: form.description,
        definition,
        domain,
      });
      if (result.success) {
        showToast(`Schema "${result.data.name}" updated`);
      } else if (result.status === 409) {
        setNameError(nameConflictHint(form.name.trim()));
      } else if (result.status === 404) {
        // Someone else deleted it — don't discard the user's edits, just
        // switch to "create" so clicking Save again registers it as new.
        setIsCreating(true);
        setEditingDraftId(null);
        showToast(result.error || 'Schema no longer exists — click Save again to re-create it', 'error');
      } else {
        showToast(result.error || 'Failed to update schema', 'error');
      }
    }
    setSaving(false);
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (schemaId) => {
    await deleteSchema(schemaId);
    if (selectedId === schemaId) {
      setSelectedId(null);
      setIsCreating(false);
      setForm(emptyForm());
    }
    setDeleteConfirm(null);
    showToast('Schema deleted');
  };

  // ── Copy $ref ────────────────────────────────────────────────────────────
  const handleCopyRef = (name) => {
    const ref = `$ref: '${getSchemaRefPath(specContent, name)}'`;
    navigator.clipboard?.writeText(ref).catch(() => {});
    setCopiedRef(name);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  // ── Checkbox-driven batch import (from current spec and/or uploaded file) ─
  const candidateKey = (c) => `${c.source}-${c.name}`;

  const toggleImportSelection = (key) => {
    setSelectedImportKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Same top-level field names => treat as "the same schema" for import
  // purposes, so re-importing something already in the org registry links
  // it instead of colliding on the name.
  const sameFieldShape = (definition, properties) => {
    const a = Object.keys(definition?.properties || {}).sort().join(',');
    const b = Object.keys(properties || {}).sort().join(',');
    return !!a && a === b;
  };

  // The org schema (if any) that a spec/upload candidate would collide with.
  const orgMatchFor = (candidate) => orgSchemas.find(os => os.name === candidate.name);

  const handleImportSelected = () => {
    const toImport = importCandidates.filter(c => !c.alreadyInRegistry && selectedImportKeys.has(candidateKey(c)));
    if (!toImport.length) return;
    let linkedCount = 0;
    let stagedCount = 0;
    const failures = [];

    toImport.forEach(candidate => {
      if (candidate.source === 'domain') {
        // Already a registered schema owned by another spec — reuse by syncing
        // its definition into THIS spec's components.schemas. No DB write.
        if (!onSpecContentChange) { failures.push(`${candidate.name}: no spec open to add it to`); return; }
        syncSchemaToSpecContent(candidate.name, candidate.definition);
        linkedCount++;
        return;
      }

      // Spec/upload candidate whose name already exists org-wide with the
      // same fields — this is a re-import of something already registered
      // (e.g. the same spec/file imported before, or into another spec).
      // Link the existing schema instead of creating a duplicate or forcing
      // a rename.
      const orgMatch = orgMatchFor(candidate);
      if (orgMatch && sameFieldShape(orgMatch.definition, candidate.properties)) {
        syncSchemaToSpecContent(candidate.name, orgMatch.definition);
        linkedCount++;
        return;
      }

      // Otherwise: stage for review. Nothing is written to the backend until
      // the user opens it in Data Modelling and explicitly clicks Save —
      // that's also where a genuine name conflict (409) surfaces the
      // "rename to save" hint, same as the manual "New Schema" flow.
      const fields = definitionToFields({ properties: candidate.properties, required: candidate.required });
      const definition = buildDefinition(fields);
      setDraftSchemas(prev => prev.some(d => d.name === candidate.name)
        ? prev
        : [...prev, {
            id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: candidate.name,
            description: candidate.description || '',
            definition,
            draft: true,
          }]);
      stagedCount++;
    });

    setUploadedCandidates(prev => prev.filter(c => !toImport.find(t => t.source === 'upload' && t.name === c.name)));
    setSelectedImportKeys(new Set());
    setImportOpen(false);

    const parts = [];
    if (linkedCount) parts.push(`${linkedCount} linked to existing schema(s)`);
    if (stagedCount) parts.push(`${stagedCount} staged for review in Data Modelling — click Save to register`);
    if (failures.length) parts.push(`failed: ${failures.join('; ')}`);
    showToast(parts.join(' · ') || 'Nothing to import', failures.length ? 'error' : 'success');
  };

  // ── Open the Import modal, lazily loading the org-wide list it needs for
  // cross-spec domain search (no-ops if already loaded).
  const openImportModal = () => {
    setImportOpen(true);
    loadOrgSchemas();
  };

  // ── Upload a schema file (OpenAPI/Swagger, bare JSON Schema, SQL, MD, HTML) ─
  const handleSchemaFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseUploadedSchemaFile(text, file.name);
      if (parsed.length === 0) {
        showToast(
          `No importable schemas found in ${file.name}. Expected OpenAPI "components.schemas", Swagger "definitions"/"$defs", a single JSON Schema, a flat map of named schemas, SQL CREATE TABLE statements, a Markdown table/code block, or an HTML table.`,
          'error'
        );
      } else {
        setUploadedCandidates(prev => {
          const merged = [...prev];
          parsed.forEach(s => {
            if (!merged.find(m => m.name === s.name)) merged.push({ ...s, source: 'upload' });
          });
          return merged;
        });
        openImportModal();
        showToast(`Found ${parsed.length} schema(s) in ${file.name}`);
      }
    } catch {
      showToast('Failed to parse file', 'error');
    } finally {
      if (schemaFileInputRef.current) schemaFileInputRef.current.value = '';
    }
  };

  // ── Compose mode: drag a field out of a library schema ───────────────────
  const handleLibraryDragStart = (e, schemaName, field) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-schema-field', JSON.stringify({ sourceSchema: schemaName, field }));
  };

  const makeDropHandlers = (setState, setDragOver) => ({
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragOver(false);
      try {
        const payload = JSON.parse(e.dataTransfer.getData('application/x-schema-field'));
        const cloned = deepCloneWithNewIds(payload.field);
        setState(prev => {
          cloned.name = dedupeFieldName(prev.fields, cloned.name);
          return { ...prev, fields: [...prev.fields, cloned] };
        });
      } catch {}
    },
  });
  const requestDropHandlers  = makeDropHandlers(setComposeRequest, setRequestDragOver);
  const responseDropHandlers = makeDropHandlers(setComposeResponse, setResponseDragOver);

  const handleComposeSave = async (target) => {
    const isRequest = target === 'request';
    const state = isRequest ? composeRequest : composeResponse;
    if (!state.name.trim()) { showToast('Schema name is required', 'error'); return; }
    const existing = schemas.find(s => s.name === state.name.trim());
    if (!existing && !state.domain.trim()) { showToast('Domain is required', 'error'); return; }
    if (!state.fields.some(f => f.name.trim())) { showToast('Drag or add at least one field', 'error'); return; }

    setComposeSaving(prev => ({ ...prev, [target]: true }));
    const definition = buildDefinition(state.fields);
    const domain = state.domain.trim();
    const result = existing
      ? await updateSchema(existing.id, { name: state.name.trim(), description: state.description, definition, domain })
      : await createSchema(state.name.trim(), definition, state.description, domain);

    if (result.success) showToast(`Schema "${result.data.name}" saved`);
    else if (result.status === 409) showToast(nameConflictHint(state.name.trim()), 'error');
    else if (result.status === 404) showToast(result.error || 'Schema no longer exists — click Save again to re-create it', 'error');
    else showToast(result.error || 'Failed to save schema', 'error');
    setComposeSaving(prev => ({ ...prev, [target]: false }));
  };

  const toggleComposeExpanded = (id) => setComposeExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Push a schema into the current spec's components.schemas ────────────
  // `previousName`, when given and different from `name`, removes that old
  // entry first — otherwise renaming a schema would leave the old name
  // behind as an orphaned component alongside the new one.
  const syncSchemaToSpecContent = (name, definition, previousName) => {
    if (!onSpecContentChange || !specContent || !name.trim()) return false;
    let working = specContent;
    let removed = false;
    if (previousName?.trim() && previousName.trim() !== name.trim()) {
      const removal = removeSchemaFromSpec(working, previousName.trim());
      if (removal.changed) { working = removal.content; removed = true; }
    }
    const { content, changed } = upsertSchemaIntoSpec(working, name.trim(), definition);
    if (changed || removed) { onSpecContentChange(content); return true; }
    return false;
  };

  const handleSyncToSpec = (name, definition) => {
    if (!onSpecContentChange || !specContent) {
      showToast('No spec content available to sync to', 'error');
      return;
    }
    const changed = syncSchemaToSpecContent(name, definition);
    showToast(changed ? `"${name}" synced to spec components` : `"${name}" already in sync with spec`);
  };

  // ── Live sync for schemas already present in the spec ────────────────────
  // A schema NOT yet in the spec never auto-writes — it only reaches
  // components.schemas via an explicit action (Sync to spec, drag-a-$ref,
  // Map to Endpoint, or Import). But once a schema's name already exists in
  // the spec's components.schemas, editing it here is just keeping that
  // already-present copy current, not introducing something new — so that
  // case is kept live, lightly debounced (400ms) so a whole spec
  // re-serialize doesn't happen on every keystroke. No guard is needed for
  // "just selected it, don't sync yet": upsertSchemaIntoSpec (called inside
  // syncSchemaToSpecContent) already no-ops when the recomputed definition
  // is identical to what's already in the spec, which is exactly the case
  // right after loading an existing schema with no edits yet — so it's a
  // real no-write, not just a suppressed one. This mirrors the compose
  // panels' effects below exactly, so the two behave identically.
  useEffect(() => {
    const name = form.name.trim();
    if (!name || !isInSpec(name) || !form.fields.some(f => f.name.trim())) return;
    const timer = setTimeout(() => {
      syncSchemaToSpecContent(name, withDomain(buildDefinition(form.fields), form.domain));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fields, form.name, form.domain]);

  useEffect(() => {
    const name = composeRequest.name.trim();
    if (!name || !isInSpec(name) || !composeRequest.fields.some(f => f.name.trim())) return;
    const timer = setTimeout(() => {
      syncSchemaToSpecContent(name, withDomain(buildDefinition(composeRequest.fields), composeRequest.domain));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeRequest.fields, composeRequest.name, composeRequest.domain]);

  useEffect(() => {
    const name = composeResponse.name.trim();
    if (!name || !isInSpec(name) || !composeResponse.fields.some(f => f.name.trim())) return;
    const timer = setTimeout(() => {
      syncSchemaToSpecContent(name, withDomain(buildDefinition(composeResponse.fields), composeResponse.domain));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeResponse.fields, composeResponse.name, composeResponse.domain]);

  // ── Drag a whole schema (its $ref) onto the Spec Editor panel ───────────
  const handleSchemaRefDragStart = (e, name) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-schema-ref', JSON.stringify({ name }));
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  // Schemas this spec owns (created/imported here) plus schemas "linked" into
  // it — already synced into this spec's components.schemas but registered
  // under a different spec (reused via cross-spec domain search). Both need
  // to show up here, or a linked schema is invisible in the one place users
  // actually look — the left panel — even though it's usable via $ref.
  const linkedSchemas = orgSchemas
    .filter(os => specSchemas.some(ss => ss.name === os.name) && !schemas.some(s => s.name === os.name))
    .map(os => ({ ...os, linked: true }));
  const allVisibleSchemas = [...schemas, ...linkedSchemas, ...draftSchemas];
  const selectedSchema = allVisibleSchemas.find(s => s.id === selectedId);
  // Every visible schema (owned + linked), pre-converted to fields — powers the FK target picker.
  const otherSchemas = allVisibleSchemas.map(s => ({ name: s.name, fields: definitionToFields(s.definition) }));
  const distinctDomains = getDistinctDomains(allVisibleSchemas);
  const filtered = allVisibleSchemas.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase())) &&
    (!domainFilter || getSchemaDomain(s) === domainFilter)
  );
  // Cross-organization results (see the debounced `searchByDomain` effect
  // above) — deliberately not filtered to this org, since the whole point is
  // discovering reusable schemas other organizations tagged with this domain.
  const crossSpecCandidates = crossSpecDomain
    ? crossSpecResults
        .map(os => ({
          name: os.name,
          description: os.description || '',
          properties: os.definition?.properties || {},
          required: os.definition?.required || [],
          definition: os.definition, // full definition — reused as-is, not rebuilt
          source: 'domain',
          otherOrg: os.organizationId !== orgId,
          // "Already in registry" here means this spec's own registry list
          // (what the left panel actually shows) already has this name —
          // NOT whether the spec's raw text happens to define a same-named
          // schema, which is a separate, easily-diverging thing.
          alreadyInRegistry: !!schemas.find(rs => rs.name === os.name),
        }))
    : [];
  // A spec/upload candidate whose name collides with an org schema that has
  // the same fields isn't a real conflict — it'll be linked to that existing
  // schema on import rather than staged for a rename.
  const candidateWillLink = (candidate) => {
    const orgMatch = orgMatchFor(candidate);
    return !!orgMatch && sameFieldShape(orgMatch.definition, candidate.properties);
  };

  const importCandidates = [
    ...specSchemas.filter(ss => !schemas.find(rs => rs.name === ss.name)).map(ss => ({
      ...ss, source: 'spec', willLink: candidateWillLink(ss), conflict: nameUsedInOtherSpec(ss.name) && !candidateWillLink(ss),
    })),
    ...uploadedCandidates.map(us => ({
      ...us,
      alreadyInRegistry: !!schemas.find(rs => rs.name === us.name),
      willLink: candidateWillLink(us),
      conflict: nameUsedInOtherSpec(us.name) && !candidateWillLink(us),
    })),
    ...crossSpecCandidates,
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Hidden file input for schema upload (always mounted so the ref works) */}
      <input
        ref={schemaFileInputRef}
        type="file"
        accept=".json,.yaml,.yml,.sql,.md,.markdown,.html,.htm"
        onChange={handleSchemaFileUpload}
        className="hidden"
      />

      {/* Shared domain autocomplete suggestions for the Data Modelling / Schema Modelling domain inputs */}
      <datalist id="schema-domain-options">
        {distinctDomains.map(d => <option key={d} value={d} />)}
      </datalist>

      {/* ── Left: schema list ──────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-[#232942] bg-[#0f172a]">

        {/* Toolbar */}
        <div className="p-3 border-b border-[#232942] space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search schemas…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#161b2e] border border-[#232942] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316]/50"
            />
          </div>
          {(allDomains.length > 0 || allDomainsLoading) && (
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                disabled={allDomainsLoading}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#161b2e] border border-[#232942] rounded-lg text-gray-300 focus:outline-none focus:border-[#f97316]/50 appearance-none disabled:opacity-50"
              >
                <option value="" style={{ background: '#161b2e' }}>
                  {allDomainsLoading ? 'Loading domains…' : 'All domains'}
                </option>
                {allDomains.map(d => (
                  <option key={d} value={d} style={{ background: '#161b2e' }}>{d}</option>
                ))}
              </select>
              {allDomainsError && (
                <p className="mt-1 text-[10px] text-red-400">{allDomainsError}</p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleNew}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> New Schema
            </button>
            <button
              onClick={openImportModal}
              title={importCandidates.length ? `Import ${importCandidates.length} schema(s)` : 'Import from spec or upload a file'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#161b2e] hover:bg-[#1e2640] text-gray-300 border border-[#232942] rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {importCandidates.length > 0 && (
                <span className="text-[#f97316] font-semibold">{importCandidates.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Schema list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-8 text-gray-500 text-sm">Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Database className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">
                {search ? `No schemas match "${search}"` : 'No schemas yet'}
              </p>
              {!search && (
                <p className="text-gray-600 text-xs mt-1">Create one, import from a spec, or upload a file</p>
              )}
            </div>
          )}

          {!loading && filtered.map(schema => {
            const fieldCount = Object.keys(schema.definition?.properties || {}).length;
            const isSelected = builderMode === 'builder' && selectedId === schema.id;
            const isExpanded = !!composeExpanded[schema.id];
            const domain = getSchemaDomain(schema);
            return (
              <div key={schema.id} className="border-b border-[#1a2035]">
                <div
                  draggable={!schema.draft}
                  onDragStart={(e) => handleSchemaRefDragStart(e, schema.name)}
                  onClick={() => {
                    if (builderMode === 'compose') { toggleComposeExpanded(schema.id); return; }
                    if (schema.draft) handleSelectDraft(schema); else handleSelect(schema);
                  }}
                  title={schema.draft ? 'Unsaved — click to review and save' : "Drag onto the Spec Editor to insert a $ref"}
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-[#f97316]/10 border-l-2 border-l-[#f97316] pl-[10px]'
                      : 'hover:bg-[#161b2e]'
                    }`}
                >
                  {builderMode === 'compose' && (
                    <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                  )}
                  <Braces className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#f97316]' : 'text-gray-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {schema.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-gray-500">{fieldCount} field{fieldCount !== 1 ? 's' : ''}</p>
                      {domain && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 truncate max-w-[110px]">
                          {domain}
                        </span>
                      )}
                      {schema.linked && (
                        <span
                          title="Reused from another spec via its domain — owned there, not here"
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 shrink-0"
                        >
                          linked
                        </span>
                      )}
                      {schema.draft && (
                        <span
                          title="Imported but not saved yet — open it to review and click Save"
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 shrink-0"
                        >
                          unsaved
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!schema.draft && (
                      <button
                        onClick={e => { e.stopPropagation(); handleCopyRef(schema.name); }}
                        title="Copy $ref"
                        className="p-1 rounded text-gray-500 hover:text-gray-200 transition-colors"
                      >
                        {copiedRef === schema.name
                          ? <Check className="w-3 h-3 text-green-400" />
                          : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                    {!schema.linked && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (schema.draft) handleDiscardDraft(schema.id); else setDeleteConfirm(schema.id);
                        }}
                        title={schema.draft ? 'Discard draft (not saved yet, nothing to delete on the backend)' : 'Delete schema'}
                        className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {builderMode === 'compose' && isExpanded && (
                  <div className="px-3 pb-2 bg-[#0d1220]">
                    {fieldCount === 0 ? (
                      <p className="text-[11px] text-gray-600 py-2">No fields defined</p>
                    ) : (
                      <SchemaFieldTree
                        fields={definitionToFields(schema.definition)}
                        mode="readonly"
                        draggable
                        onDragStart={(e, field) => handleLibraryDragStart(e, schema.name, field)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats footer */}
        {schemas.length > 0 && (
          <div className="p-3 border-t border-[#232942] shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {schemas.length} schema{schemas.length !== 1 ? 's' : ''}
              </span>
              <span>
                {schemas.reduce((acc, s) => acc + Object.keys(s.definition?.properties || {}).length, 0)} total fields
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: schema builder / compose ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0f1e]">

        {/* Mode toggle — always visible */}
        <div className="flex items-center gap-3 px-6 pt-4 pb-2 shrink-0">
          <div className="inline-flex items-center bg-[#0f172a] border border-[#232942] rounded-lg p-0.5">
            <button
              onClick={() => setBuilderMode('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                builderMode === 'builder' ? 'bg-[#f97316] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Braces className="w-3.5 h-3.5" /> Data Modelling
            </button>
            <button
              onClick={() => setBuilderMode('compose')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                builderMode === 'compose' ? 'bg-[#f97316] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Schema Modelling
            </button>
            <button
              onClick={() => setBuilderMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                builderMode === 'map' ? 'bg-[#f97316] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" /> Schema Map
            </button>
          </div>
          {builderMode === 'compose' && (
            <p className="text-xs text-gray-500">
              Expand a schema on the left, then drag fields into Request / Response below
            </p>
          )}
          <button
            onClick={() => setSpecPanelOpen(o => !o)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${
              specPanelOpen
                ? 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30'
                : 'bg-[#0f172a] text-gray-400 border-[#232942] hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" /> Spec Editor
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
        {builderMode === 'builder' ? (
          !isCreating && !selectedId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#161b2e] border border-[#232942] flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-[#f97316]/60" />
              </div>
              <p className="text-white font-semibold text-base mb-1">Schema Registry</p>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                Define reusable schemas once and reference them across all your API endpoints
                using <code className="text-[#f97316] font-mono text-xs bg-[#f97316]/10 px-1 py-0.5 rounded">$ref</code>.
              </p>
              <div className="mt-6 p-4 bg-[#0f172a] border border-[#232942] rounded-xl text-left max-w-sm w-full">
                <p className="text-[10px] text-gray-500 font-mono mb-1">Example — single source of truth</p>
                <pre className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre">{`requestBody:
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/Patient'`}</pre>
              </div>
              <button
                onClick={handleNew}
                className="mt-6 flex items-center gap-2 px-4 py-2 text-sm bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> Create First Schema
              </button>
            </div>
          ) : (
            /* Schema builder */
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 max-w-3xl">

                {/* Builder header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-white font-semibold text-base">
                      {editingDraftId ? `Review Import: ${form.name || ''}` : isCreating ? 'New Schema' : `Edit: ${selectedSchema?.name || ''}`}
                    </h2>
                    {!isCreating && selectedSchema && (
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        {'$ref: \''}{getSchemaRefPath(specContent, selectedSchema.name)}{'\''}
                      </p>
                    )}
                    {!isCreating && selectedSchema?.linked && (
                      <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 shrink-0" />
                        Linked from another spec — saving changes here updates the shared schema everywhere it's used.
                      </p>
                    )}
                    {editingDraftId && (
                      <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Imported but not saved yet — nothing is in the registry until you click Save.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-60 text-white rounded-lg transition-colors font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving…' : isCreating ? 'Create Schema' : 'Save Changes'}
                  </button>
                </div>

                {/* Name + Domain + Description */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Schema Name *</label>
                    <input
                      value={form.name}
                      onChange={e => { setNameError(''); setForm(prev => ({ ...prev, name: e.target.value })); }}
                      placeholder="e.g. Patient, OrderRequest"
                      className={`w-full px-3 py-2 text-sm bg-[#161b2e] border rounded-lg text-white placeholder-gray-600 focus:outline-none ${
                        nameError ? 'border-red-500/70 focus:border-red-500' : 'border-[#232942] focus:border-[#f97316]/50'
                      }`}
                    />
                    {nameError && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />{nameError}
                      </p>
                    )}
                    {!nameError && isCreating && nameUsedInOtherSpec(form.name) && (
                      <p className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Already used by another spec — saving will fail. Use Import → "Find in other specs" to reuse it instead.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Domain *</label>
                    <input
                      value={form.domain}
                      onChange={e => { setDomainError(''); setForm(prev => ({ ...prev, domain: e.target.value })); }}
                      placeholder="e.g. Healthcare, Billing"
                      list="schema-domain-options"
                      className={`w-full px-3 py-2 text-sm bg-[#161b2e] border rounded-lg text-white placeholder-gray-600 focus:outline-none ${
                        domainError ? 'border-red-500/70 focus:border-red-500' : 'border-[#232942] focus:border-[#f97316]/50'
                      }`}
                    />
                    {domainError && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />{domainError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Description</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 text-sm bg-[#161b2e] border border-[#232942] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
                    />
                  </div>
                </div>

                {/* $ref badge */}
                {form.name.trim() && (
                  <div
                    draggable
                    onDragStart={(e) => handleSchemaRefDragStart(e, form.name.trim())}
                    title="Drag onto the Spec Editor to insert a $ref"
                    className="mb-5 px-4 py-2.5 bg-[#161b2e] border border-[#232942] rounded-lg flex items-center justify-between cursor-grab active:cursor-grabbing"
                  >
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">OpenAPI Reference</p>
                      <code className="text-xs text-[#f97316] font-mono">
                        {'$ref: \''}{getSchemaRefPath(specContent, form.name.trim())}{'\''}
                      </code>
                      {isInSpec(form.name.trim()) ? (
                        <p className="text-[9px] mt-0.5 text-green-400">In spec — edits update it live</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSyncToSpec(form.name.trim(), withDomain(buildDefinition(form.fields), form.domain))}
                          title="Add this schema to the spec now — after that, edits here update it live"
                          className="text-[9px] mt-0.5 text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                        >
                          Not in spec — click to add (then edits go live)
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyRef(form.name.trim())}
                        title="Copy $ref"
                        className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                      >
                        {copiedRef === form.name.trim()
                          ? <Check className="w-3.5 h-3.5 text-green-400" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleSyncToSpec(form.name.trim(), withDomain(buildDefinition(form.fields), form.domain))}
                        title="Sync to spec components"
                        className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMapModalSchema({ name: form.name.trim(), definition: withDomain(buildDefinition(form.fields), form.domain) })}
                        title="Map to an endpoint's request/response"
                        className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Fields tree */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Fields</label>
                    <span className="text-xs text-gray-600">
                      {form.fields.filter(f => f.name.trim()).length} defined
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#232942] overflow-hidden">
                    {/* Column headers */}
                    <div className="grid grid-cols-[20px_1fr_100px_88px_44px_28px_28px_28px] bg-[#0f172a] border-b border-[#232942] px-3 py-2 gap-1.5">
                      {['', 'Field Name', 'Type', 'Format', 'Req.', 'PK', 'FK', ''].map((h, i) => (
                        <span key={i} className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{h}</span>
                      ))}
                    </div>

                    <SchemaFieldTree
                      fields={form.fields}
                      onChange={formHandlers.onChange}
                      onRemove={formHandlers.onRemove}
                      onAddField={formHandlers.onAddField}
                      mode="edit"
                      otherSchemas={otherSchemas}
                    />

                    {/* Add field row */}
                    <button
                      onClick={() => formHandlers.onAddField([])}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-[#161b2e] transition-colors border-t border-[#232942]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>
                </div>

                {/* YAML preview */}
                {form.fields.some(f => f.name.trim()) && (
                  <div>
                    <label className="block text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                      OpenAPI Output Preview
                    </label>
                    <pre className="text-xs font-mono text-gray-300 bg-[#0f172a] border border-[#232942] rounded-xl p-4 overflow-x-auto leading-relaxed">
                      {generateYamlPreview(form.name.trim() || 'SchemaName', form.fields)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )
        ) : builderMode === 'compose' ? (
          /* ── Compose mode ─────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <ComposePanel
              title="Request Schema"
              state={composeRequest}
              setState={setComposeRequest}
              handlers={requestHandlers}
              dropHandlers={requestDropHandlers}
              isDragOver={requestDragOver}
              onSave={() => handleComposeSave('request')}
              saving={composeSaving.request}
              otherSchemas={otherSchemas}
              copiedRef={copiedRef}
              onCopyRef={handleCopyRef}
              isInSpec={isInSpec(composeRequest.name.trim())}
              specContent={specContent}
              onSyncToSpec={handleSyncToSpec}
              onDragStartRef={handleSchemaRefDragStart}
              onMapToEndpoint={setMapModalSchema}
              nameConflict={nameUsedInOtherSpec(composeRequest.name)}
            />
            <ComposePanel
              title="Response Schema"
              state={composeResponse}
              setState={setComposeResponse}
              handlers={responseHandlers}
              dropHandlers={responseDropHandlers}
              isDragOver={responseDragOver}
              onSave={() => handleComposeSave('response')}
              saving={composeSaving.response}
              otherSchemas={otherSchemas}
              copiedRef={copiedRef}
              onCopyRef={handleCopyRef}
              isInSpec={isInSpec(composeResponse.name.trim())}
              specContent={specContent}
              onSyncToSpec={handleSyncToSpec}
              onDragStartRef={handleSchemaRefDragStart}
              onMapToEndpoint={setMapModalSchema}
              nameConflict={nameUsedInOtherSpec(composeResponse.name)}
            />
          </div>
        ) : (
          /* ── Schema Map (ER diagram) ─────────────────────────────────── */
          <SchemaMapView
            schemas={schemas}
            onSelectSchema={(schema) => { handleSelect(schema); setBuilderMode('builder'); }}
          />
        )}
        </div>
        {specPanelOpen && (
          <SchemaSpecPanel specContent={specContent} savedSpecContent={savedSpecContent} onSpecContentChange={onSpecContentChange} />
        )}
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium z-50
            ${toast.type === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* ── Delete confirm modal ────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b2e] border border-[#232942] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Schema?</h3>
            <p className="text-gray-400 text-sm mb-4">
              This removes <span className="text-white font-mono">"{schemas.find(s => s.id === deleteConfirm)?.name}"</span> from
              the registry. Existing <code className="text-[#f97316] font-mono text-xs">$ref</code> references in specs
              will not be automatically updated.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-[#0b0f1e] border border-[#232942] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Schemas modal (from spec or uploaded file) ────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b2e] border border-[#232942] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Import Schemas</h3>
              <button onClick={() => setImportOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              From the current spec's <code className="text-[#f97316] font-mono text-xs">components.schemas</code>, upload a
              file (OpenAPI/Swagger, JSON Schema, SQL, Markdown, or HTML), or find a schema already used in another spec.
            </p>
            <button
              onClick={() => schemaFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 text-xs bg-[#f97316]/10 hover:bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>

            <div className="mb-4 p-3 bg-[#0b0f1e] border border-[#232942] rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Find by domain (searches across all organizations)
              </p>
              <select
                value={crossSpecDomain}
                onChange={e => setCrossSpecDomain(e.target.value)}
                disabled={allDomainsLoading}
                className="w-full px-2.5 py-1.5 text-sm bg-[#161b2e] border border-[#232942] rounded-lg text-gray-300 focus:outline-none focus:border-[#f97316]/50 disabled:opacity-50"
              >
                <option value="" style={{ background: '#161b2e' }}>
                  {allDomainsLoading ? 'Loading domains…' : 'Select a domain…'}
                </option>
                {allDomains.map(d => (
                  <option key={d} value={d} style={{ background: '#161b2e' }}>{d}</option>
                ))}
              </select>
              {allDomainsError && <p className="mt-1.5 text-[10px] text-red-400">{allDomainsError}</p>}
              {crossSpecLoading && <p className="mt-1.5 text-[10px] text-gray-500">Searching…</p>}
              {!crossSpecLoading && crossSpecDomain.trim() && crossSpecResults.length === 0 && (
                <p className="mt-1.5 text-[10px] text-gray-600">No schemas found for this domain.</p>
              )}
            </div>

            {importCandidates.length > 0 && (() => {
              const importable = importCandidates.filter(c => !c.alreadyInRegistry);
              const allSelected = importable.length > 0 && importable.every(c => selectedImportKeys.has(candidateKey(c)));
              return (
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={importable.length === 0}
                      onChange={() => setSelectedImportKeys(
                        allSelected ? new Set() : new Set(importable.map(candidateKey))
                      )}
                      className="accent-[#f97316]"
                    />
                    Select all
                  </label>
                  <span className="text-xs text-gray-600">{selectedImportKeys.size} selected</span>
                </div>
              );
            })()}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {importCandidates.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No schemas available to import</p>
              ) : (
                importCandidates.map(candidate => {
                  const key = candidateKey(candidate);
                  const fieldEntries = Object.entries(candidate.properties || {});
                  return (
                    <div
                      key={key}
                      className="px-3 py-2.5 bg-[#0b0f1e] border border-[#232942] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedImportKeys.has(key)}
                          disabled={candidate.alreadyInRegistry}
                          onChange={() => toggleImportSelection(key)}
                          className="shrink-0 accent-[#f97316] disabled:opacity-30"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-white text-sm font-medium truncate">{candidate.name}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${
                              candidate.source === 'upload'
                                ? 'bg-purple-500/15 text-purple-300'
                                : candidate.source === 'domain'
                                ? 'bg-teal-500/15 text-teal-300'
                                : 'bg-blue-500/15 text-blue-300'
                            }`}>
                              {candidate.source === 'upload' ? 'uploaded' : candidate.source === 'domain' ? (candidate.otherOrg ? 'other organization' : 'other spec') : 'from spec'}
                            </span>
                          </div>
                          {candidate.description && (
                            <p className="text-gray-500 text-xs mt-0.5">{candidate.description}</p>
                          )}
                        </div>
                        {candidate.alreadyInRegistry && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-1">
                              <Check className="w-3 h-3" /> {candidate.source === 'domain' ? 'Already in this spec' : 'Already imported'}
                            </span>
                            {candidate.source !== 'domain' && (
                              <button
                                onClick={() => {
                                  const existing = schemas.find(s => s.name === candidate.name);
                                  if (existing) setDeleteConfirm(existing.id);
                                }}
                                title="Delete this schema from the registry"
                                className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        {!candidate.alreadyInRegistry && candidate.willLink && (
                          <span
                            title="An identical schema already exists in another spec (same name, same fields) — importing will link to it instead of creating a duplicate."
                            className="px-2 py-1 text-[10px] text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center gap-1 shrink-0"
                          >
                            <Check className="w-3 h-3" /> Will link to existing
                          </span>
                        )}
                        {!candidate.alreadyInRegistry && candidate.conflict && (
                          <span
                            title="A different schema with this name already exists in another spec — it'll be staged for review, but saving will need a different name (or use 'Find in other specs' to reuse the existing one instead)."
                            className="px-2 py-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1 shrink-0"
                          >
                            <AlertCircle className="w-3 h-3" /> Will need renaming
                          </span>
                        )}
                      </div>
                      {fieldEntries.length > 0 && (
                        <div className="mt-2 ml-6 flex flex-wrap gap-1">
                          {fieldEntries.map(([fname, fdef]) => (
                            <span
                              key={fname}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#161b2e] border border-[#1a2438]"
                            >
                              <span className="text-gray-300 font-mono">{fname}</span>
                              {fdef.type && (
                                <span className="font-semibold" style={{ color: typeColor(fdef.type) }}>
                                  {fdef.type}
                                </span>
                              )}
                              {(candidate.required || []).includes(fname) && (
                                <span className="text-[#f97316] font-bold leading-none">*</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setImportOpen(false); setSelectedImportKeys(new Set()); }}
                className="flex-1 py-2 text-sm text-gray-400 hover:text-white bg-[#0b0f1e] border border-[#232942] rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleImportSelected}
                disabled={selectedImportKeys.size === 0}
                className="flex-1 py-2 text-sm text-white bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-40 rounded-lg transition-colors font-medium"
              >
                Import Selected {selectedImportKeys.size > 0 ? `(${selectedImportKeys.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map to Endpoint modal ────────────────────────────────────────────── */}
      {mapModalSchema && (
        <MapToEndpointModal
          schemaName={mapModalSchema.name}
          definition={mapModalSchema.definition}
          schemaInSpec={isInSpec(mapModalSchema.name)}
          specContent={specContent}
          onSpecContentChange={onSpecContentChange}
          onClose={() => setMapModalSchema(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Compose drop-target panel ─────────────────────────────────────────────────

function ComposePanel({
  title, state, setState, handlers, dropHandlers, isDragOver, onSave, saving,
  otherSchemas, copiedRef, onCopyRef, isInSpec, specContent, onSyncToSpec, onDragStartRef, onMapToEndpoint, nameConflict,
}) {
  const name = state.name.trim();
  return (
    <div className={`rounded-xl border transition-colors bg-[#0f172a] ${
      isDragOver ? 'border-[#f97316]/60 ring-1 ring-[#f97316]/30' : 'border-[#232942]'
    }`}>
      <div className="px-4 py-3 border-b border-[#232942]">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{title}</p>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-60 text-white rounded-lg transition-colors font-medium shrink-0"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Name</label>
            <input
              value={state.name}
              onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Schema name"
              className="w-full px-2.5 py-1.5 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
            />
            {nameConflict && (
              <p className="mt-1 text-[10px] text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> Already used by another spec — saving will fail.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Domain</label>
            <input
              value={state.domain}
              onChange={e => setState(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="e.g. Healthcare"
              list="schema-domain-options"
              className="w-full px-2.5 py-1.5 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Description</label>
            <input
              value={state.description}
              onChange={e => setState(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full px-2.5 py-1.5 text-sm bg-[#0b0f1e] border border-[#232942] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#f97316]/50"
            />
          </div>
        </div>
      </div>

      {name && (
        <div
          draggable
          onDragStart={(e) => onDragStartRef(e, name)}
          title="Drag onto the Spec Editor to insert a $ref"
          className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#232942] bg-[#0b0f1e]/40 cursor-grab active:cursor-grabbing"
        >
          <div className="min-w-0 flex-1">
            <code className="text-xs text-[#f97316] font-mono truncate block">{`$ref: '${getSchemaRefPath(specContent, name)}'`}</code>
            <span className={`text-[9px] ${isInSpec ? 'text-green-400' : 'text-amber-400'}`}>
              {isInSpec ? 'In spec' : 'Not in spec'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onCopyRef(name)}
              title="Copy $ref"
              className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
            >
              {copiedRef === name
                ? <Check className="w-3.5 h-3.5 text-green-400" />
                : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onSyncToSpec(name, withDomain(buildDefinition(state.fields), state.domain))}
              title="Sync to spec components"
              className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMapToEndpoint({ name, definition: withDomain(buildDefinition(state.fields), state.domain) })}
              title="Map to an endpoint's request/response"
              className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div
        onDragOver={dropHandlers.onDragOver}
        onDragLeave={dropHandlers.onDragLeave}
        onDrop={dropHandlers.onDrop}
        className="p-3"
      >
        {state.fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-600 text-xs border-2 border-dashed border-[#232942] rounded-lg">
            Drag fields here from the schema library on the left
          </div>
        ) : (
          <div className="rounded-lg border border-[#232942] overflow-hidden mb-2">
            <div className="grid grid-cols-[20px_1fr_100px_88px_44px_28px_28px_28px] bg-[#0f172a] border-b border-[#232942] px-3 py-2 gap-1.5">
              {['', 'Field Name', 'Type', 'Format', 'Req.', 'PK', 'FK', ''].map((h, i) => (
                <span key={i} className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{h}</span>
              ))}
            </div>
            <SchemaFieldTree
              fields={state.fields}
              onChange={handlers.onChange}
              onRemove={handlers.onRemove}
              onAddField={handlers.onAddField}
              mode="edit"
              otherSchemas={otherSchemas}
            />
          </div>
        )}
        <button
          onClick={() => handlers.onAddField([])}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-[#161b2e] transition-colors border border-dashed border-[#232942] rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" /> Add Field Manually
        </button>

        {state.fields.some(f => f.name.trim()) && (
          <pre className="mt-3 text-[11px] font-mono text-gray-400 bg-[#0b0f1e] border border-[#232942] rounded-lg p-3 overflow-x-auto leading-relaxed">
            {generateYamlPreview(state.name.trim() || 'SchemaName', state.fields)}
          </pre>
        )}
      </div>
    </div>
  );
}
