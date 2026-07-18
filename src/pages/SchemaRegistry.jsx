import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Editor from '@monaco-editor/react';
import { useTheme } from '../hooks/useTheme';
import {
  Braces, Plus, Pencil, Trash2, Loader2, Search, AlertCircle, CheckCircle,
  Clock, User, RefreshCw, Database, X, MoreVertical,
} from 'lucide-react';
import { schemaRegistryService } from '../services/schemaRegistryService';

const NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const DEFAULT_DEFINITION = JSON.stringify({ type: 'object', properties: {} }, null, 2);

const getOrgId = () =>
  localStorage.getItem('userOrganizationId') || 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c';

function formatRelative(iso) {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch { return '—'; }
}

const TYPE_BADGE = {
  object:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  array:   'bg-purple-500/15 text-purple-400 border-purple-500/25',
  string:  'bg-green-500/15 text-green-400 border-green-500/25',
  integer: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  number:  'bg-orange-500/15 text-orange-400 border-orange-500/25',
  boolean: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
};

// ─── Schema Card ──────────────────────────────────────────────────────────────
function SchemaCard({ schema, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const type = schema.definition?.type;
  const propCount = schema.definition?.properties
    ? Object.keys(schema.definition.properties).length
    : null;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-colors"
      style={{ backgroundColor: 'rgb(15, 23, 42)' }}
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {type && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[type] || 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}>
                {type}
              </span>
            )}
            {propCount !== null && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Braces className="h-3 w-3" /> {propCount} prop{propCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-32 border border-border rounded-lg shadow-xl z-20 overflow-hidden py-0.5"
                  style={{ backgroundColor: 'rgb(15, 23, 42)' }}
                >
                  <button
                    onClick={() => { onEdit(schema); setMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-foreground hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { onDelete(schema); setMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-foreground mb-1 truncate font-mono">{schema.name}</h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground flex-1 line-clamp-2 min-h-[32px] mb-3">
          {schema.description || <span className="italic opacity-60">No description</span>}
        </p>

        {/* Meta */}
        <div className="space-y-1 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>Updated {formatRelative(schema.updatedAt)}</span>
          </div>
          {(schema.updatedBy || schema.createdBy) && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{schema.updatedBy || schema.createdBy}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="border border-border rounded-xl p-5 h-44 animate-pulse" style={{ backgroundColor: 'rgb(15, 23, 42)' }}>
      <div className="h-4 w-16 bg-white/10 rounded-full mb-3" />
      <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
      <div className="h-3 w-full bg-white/10 rounded mb-1" />
      <div className="h-3 w-2/3 bg-white/10 rounded" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SchemaRegistry() {
  const { theme } = useTheme();
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  const [schemas, setSchemas]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [toast, setToast]           = useState({ show: false, message: '', type: 'success' });

  // Form modal (create / edit)
  const [formOpen, setFormOpen]           = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [formName, setFormName]           = useState('');
  const [formDesc, setFormDesc]           = useState('');
  const [formDef, setFormDef]             = useState(DEFAULT_DEFINITION);
  const [nameError, setNameError]         = useState('');
  const [defError, setDefError]           = useState('');
  const [formSaving, setFormSaving]       = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleting, setDeleting]           = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  const fetchSchemas = async () => {
    setLoading(true);
    const result = await schemaRegistryService.list(getOrgId());
    if (result.success) {
      setSchemas(result.data);
    } else {
      showToast(result.error, 'error');
      setSchemas([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSchemas(); }, []);

  // ── Open create ──
  const openCreate = () => {
    setEditTarget(null);
    setFormName(''); setFormDesc(''); setFormDef(DEFAULT_DEFINITION);
    setNameError(''); setDefError('');
    setFormOpen(true);
  };

  // ── Open edit ──
  const openEdit = (schema) => {
    setEditTarget(schema);
    setFormName(schema.name);
    setFormDesc(schema.description || '');
    setFormDef(
      typeof schema.definition === 'object'
        ? JSON.stringify(schema.definition, null, 2)
        : schema.definition || DEFAULT_DEFINITION
    );
    setNameError(''); setDefError('');
    setFormOpen(true);
  };

  // ── Client-side validation ──
  const validate = () => {
    let ok = true;

    if (!formName.trim()) {
      setNameError('Name is required'); ok = false;
    } else if (!NAME_REGEX.test(formName.trim())) {
      setNameError('Only letters, numbers, dots, underscores and hyphens allowed'); ok = false;
    } else {
      setNameError('');
    }

    try {
      const parsed = JSON.parse(formDef);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setDefError('Definition must be a JSON object'); ok = false;
      } else if (!editTarget && !parsed.type) {
        setDefError('Definition must include a "type" field (e.g. "object")'); ok = false;
      } else {
        setDefError('');
      }
    } catch {
      setDefError('Invalid JSON — check for syntax errors'); ok = false;
    }

    return ok;
  };

  // ── Submit form ──
  const handleSubmit = async () => {
    if (!validate()) return;
    const definition = JSON.parse(formDef);
    setFormSaving(true);

    const result = editTarget
      ? await schemaRegistryService.update(editTarget.id, {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          definition,
        })
      : await schemaRegistryService.create({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          definition,
          organizationId: getOrgId(),
        });

    if (result.success) {
      setFormOpen(false);
      showToast(editTarget ? 'Schema updated successfully' : 'Schema created successfully');
      await fetchSchemas();
    } else if (result.status === 409) {
      setNameError(result.error || 'A schema with this name already exists in this organization');
    } else {
      showToast(result.error, 'error');
    }
    setFormSaving(false);
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await schemaRegistryService.delete(deleteTarget.id);
    if (result.success) {
      setSchemas(prev => prev.filter(s => s.id !== deleteTarget.id));
      showToast(`Schema "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } else {
      showToast(result.error, 'error');
    }
    setDeleting(false);
  };

  const filtered = schemas.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-auto">

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-sm ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-300'
                : 'bg-green-950/90 border-green-500/40 text-green-300'
            }`}
          >
            {toast.type === 'error'
              ? <AlertCircle className="h-4 w-4 shrink-0" />
              : <CheckCircle className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(t => ({ ...t, show: false }))} className="opacity-60 hover:opacity-100 ml-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-start justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Schema Registry
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage reusable OpenAPI schema definitions for your organization
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!loading && schemas.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <Database className="h-3 w-3" />
                  {schemas.length} schema{schemas.length !== 1 ? 's' : ''}
                </Badge>
              </motion.div>
            )}
            <Button
              onClick={fetchSchemas}
              variant="ghost"
              size="icon"
              disabled={loading}
              className="h-9 w-9"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> New Schema
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 relative max-w-sm"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or description…"
            className="pl-9"
            style={{ backgroundColor: 'rgb(15, 23, 42)' }}
          />
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
              <Database className="mx-auto h-14 w-14 text-muted-foreground mb-4" />
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">
              {search ? `No schemas match "${search}"` : 'No schemas yet'}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Create your first reusable OpenAPI schema definition.'}
            </p>
            {!search && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Create Schema
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((schema, idx) => (
                <motion.div
                  key={schema.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                >
                  <SchemaCard
                    schema={schema}
                    onEdit={openEdit}
                    onDelete={s => setDeleteTarget(s)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={open => !formSaving && setFormOpen(open)}>
        <DialogContent
          className="max-w-2xl w-[90vw]"
          style={{ backgroundColor: 'rgb(15, 23, 42)' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {editTarget ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editTarget ? `Edit — ${editTarget.name}` : 'New Schema'}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? 'Update the schema name, description, or definition.'
                : 'Define a named, reusable OpenAPI schema for your organization.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">

            {/* Name */}
            <div>
              <Label htmlFor="sr-name" className="text-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sr-name"
                value={formName}
                onChange={e => { setFormName(e.target.value); setNameError(''); }}
                placeholder="e.g. Address, UserProfile, ErrorResponse"
                className={`mt-1.5 font-mono ${nameError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                style={{ backgroundColor: 'rgb(15, 23, 42)' }}
                autoFocus
              />
              {nameError ? (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {nameError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Letters, numbers, dots, underscores, hyphens only · case-sensitive
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="sr-desc" className="text-foreground">Description</Label>
              <textarea
                id="sr-desc"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Optional — brief description of this schema"
                rows={2}
                className="mt-1.5 w-full px-3 py-2 text-sm rounded-md border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                style={{ backgroundColor: 'rgb(15, 23, 42)' }}
              />
            </div>

            {/* Definition */}
            <div>
              <Label className="text-foreground">
                Definition (JSON) <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Valid JSON object.{!editTarget && ' Must include a "type" field.'}
              </p>
              <div className={`border rounded-lg overflow-hidden ${defError ? 'border-red-500' : 'border-border'}`}>
                <Editor
                  height="230px"
                  language="json"
                  value={formDef}
                  onChange={v => { setFormDef(v ?? ''); setDefError(''); }}
                  theme={editorTheme}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
              {defError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {defError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={formSaving} className="gap-2 min-w-[120px]">
              {formSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? 'Save Changes' : 'Create Schema'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !deleting && !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md" style={{ backgroundColor: 'rgb(15, 23, 42)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" /> Delete Schema
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground font-mono">"{deleteTarget?.name}"</strong>?
            </p>
            <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Any endpoints referencing this schema via{' '}
              <code className="bg-white/10 px-1 rounded">$ref</code> will break.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                : <><Trash2 className="h-4 w-4" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
