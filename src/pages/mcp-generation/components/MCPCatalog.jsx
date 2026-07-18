// src/pages/mcp-generation/components/MCPCatalog.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  Eye,
  FileCode2,
  GitPullRequest,
  History,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Server,
  AlertTriangle,
  ExternalLink,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { mcpGenerationService } from '../../../services/mcpGenerationService';
import { Button } from '../../../components/ui/button';
import Toast from '../../../components/ui/toast';
import { useNavigate } from 'react-router-dom';

const STATUS_TABS = [
  { label: 'Active', value: 'ACTIVE', emptyTitle: 'No active MCP servers found' },
  { label: 'Archived', value: 'ARCHIVED', emptyTitle: 'No archived MCP servers found' },
];

const PAGE_SIZE = 15;

export default function MCPCatalog({ onCreate, onAction, refreshSignal }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [toast, setToast] = useState(null);

  // ─── Detail Modal state ──────────────────────────────────────────
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDeployHistoryModal, setShowDeployHistoryModal] = useState(false);
  const [deployHistoryProject, setDeployHistoryProject] = useState(null);
  const navigate = useNavigate(); 

  // ─── Confirmation Modal state ────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    item: null,
    action: null,
  });

  // ─── Load projects ────────────────────────────────────────────────
const loadProjects = useCallback(async () => {
  setLoading(true);
  setError('');
  try {
    const res = await mcpGenerationService.listProjects({ includeDeleted: true });
    if (!res.success) {
      setError(res.error || 'Failed to load MCP servers');
      setItems([]);
      setTotalElements(0);
      setTotalPages(0);
      return;
    }
    let projects = res.data || [];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      projects = projects.filter(p =>
        (p.identity?.displayName || '').toLowerCase().includes(q) ||
        (p.onboarding?.applicationName || '').toLowerCase().includes(q)
      );
    }

    // ─── FIXED: Status filter ─────────────────────────────────────
    if (statusFilter === 'ACTIVE') {
      // Show all projects that are NOT soft-deleted (including deprecated)
      projects = projects.filter(p => !p.softDeleted);
    } else if (statusFilter === 'ARCHIVED') {
      projects = projects.filter(p => p.softDeleted);
    }

    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    setTotalElements(projects.length);
    setTotalPages(Math.ceil(projects.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const paginated = projects.slice(start, start + PAGE_SIZE);
    setItems(paginated);
  } catch (err) {
    setError(err.message || 'Network error');
    setItems([]);
  } finally {
    setLoading(false);
  }
}, [search, statusFilter, page, refreshSignal]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ─── Helpers ──────────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return isNaN(d) ? 'N/A' : d.toLocaleString();
  };

  const getStatusBadge = (item) => {
    if (item.softDeleted) {
      return <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">Archived</span>;
    }
    if (item.deprecated) {
      return <span className="inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">Deprecated</span>;
    }
    return <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">Active</span>;
  };

  // ─── Action handlers ─────────────────────────────────────────────
  const handleAction = (action, payload) => {
    setOpenMenuKey(null);
    onAction?.(action, payload);
  };

  const handleView = (item) => {
    navigate(`/mcp-detail/${item.id}`)
  };

  const handleEdit = (item) => handleAction('edit', item);

  const handleClone = async (item) => {
    try {
      const actorEmail = localStorage.getItem('userEmail') || undefined;
      const res = await mcpGenerationService.cloneProject(item.id, { createdBy: actorEmail });
      if (res.success) {
        setToast({ message: `Cloned "${item.identity?.displayName || item.id}" successfully.`, type: 'success' });
        loadProjects();
      } else {
        setToast({ message: res.error || 'Clone failed.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Clone failed.', type: 'error' });
    }
  };

  const handleVersion = async (item) => {
    try {
      const actorEmail = localStorage.getItem('userEmail') || undefined;
      const res = await mcpGenerationService.versionProject(item.id, { createdBy: actorEmail });
      if (res.success) {
        setToast({ message: `Versioned "${item.identity?.displayName || item.id}" successfully.`, type: 'success' });
        loadProjects();
      } else {
        setToast({ message: res.error || 'Versioning failed.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Versioning failed.', type: 'error' });
    }
  };

  const handleDeprecate = async (item) => {
    setConfirmModal({
      open: true,
      item: item,
      action: 'deprecate',
    });
  };

  const handleArchiveClick = (item) => {
    const action = item.softDeleted ? 'unarchive' : 'archive';
    setConfirmModal({
      open: true,
      item: item,
      action: action,
    });
  };

  // ─── Confirm action execution ────────────────────────────────────
  const executeConfirmedAction = async () => {
    const { item, action } = confirmModal;
    if (!item) return;

    try {
      const actorEmail = localStorage.getItem('userEmail') || undefined;
      let res;

      if (action === 'archive') {
        res = await mcpGenerationService.deleteProject(item.id, { actorEmail, reason: 'Archived from catalog' });
      } else if (action === 'unarchive') {
        res = await mcpGenerationService.restoreProject(item.id, { updatedBy: actorEmail });
      } else if (action === 'deprecate') {
        res = await mcpGenerationService.deprecateProject(item.id, { updatedBy: actorEmail, reason: 'Deprecated via catalog' });
      }

      if (res && res.success) {
        const verb = action === 'archive' ? 'Archived' : action === 'unarchive' ? 'Unarchived' : 'Deprecated';
        setToast({ message: `${verb} "${item.identity?.displayName || item.id}".`, type: 'success' });
        // Force refresh – increment the parent refreshSignal if possible, or just reload
        loadProjects();
      } else {
        setToast({ message: res?.error || `${action} failed.`, type: 'error' });
      }
    } catch (err) {
      setToast({ message: err.message || `${action} failed.`, type: 'error' });
    } finally {
      setConfirmModal({ open: false, item: null, action: null });
    }
  };

  const handleDeploymentHistory = (item) => {
    setDeployHistoryProject(item);
    setShowDeployHistoryModal(true);
  };

  // ─── Render action dropdown ──────────────────────────────────────
  const renderActionMenu = (item) => {
    const key = item.id;
    const isOpen = openMenuKey === key;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuKey(isOpen ? null : key);
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:border-[#ff8a5c]/30 hover:bg-[#ff5b1f]/10 hover:text-white"
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuKey(null)} />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-[#111827] py-1 shadow-2xl shadow-black/40">
              {[
                { label: 'View', icon: Eye, action: () => handleView(item) },
                { label: 'Edit', icon: Pencil, action: () => handleEdit(item) },
                { label: 'Clone', icon: FileCode2, action: () => handleClone(item) },
                { label: 'Version', icon: GitPullRequest, action: () => handleVersion(item) },
                { label: 'Deprecate', icon: AlertTriangle, action: () => handleDeprecate(item) },
                // { label: 'Deployment History', icon: History, action: () => handleDeploymentHistory(item) },
                { label: item.softDeleted ? 'Unarchive' : 'Archive', icon: Archive, action: () => handleArchiveClick(item) },
              ].map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition-colors hover:bg-[#ff5b1f]/10 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── Detail Modal ─────────────────────────────────────────────────
  const DetailModal = () => {
    if (!showDetailModal || !selectedProject) return null;
    const p = selectedProject;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-4xl max-h-[80vh] overflow-auto rounded-xl border border-dark-700 bg-[#0e172a] shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {p.identity?.displayName || 'MCP Server'} <span className="text-sm font-normal text-gray-400">({p.id})</span>
            </h2>
            <button
              onClick={() => { setShowDetailModal(false); setSelectedProject(null); }}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p><span className="text-gray-400">Slug:</span> {p.identity?.slug || '—'}</p>
              <p><span className="text-gray-400">Category:</span> {p.identity?.category || '—'}</p>
              <p><span className="text-gray-400">Description:</span> {p.identity?.description || '—'}</p>
              <p><span className="text-gray-400">Language:</span> {p.runtime?.language || '—'}</p>
              <p><span className="text-gray-400">Transport:</span> {p.transport?.kind || '—'}</p>
              <p><span className="text-gray-400">Base URL:</span> {p.transport?.baseUrl || '—'}</p>
              <p><span className="text-gray-400">Auth:</span> {p.auth?.kind || 'none'}</p>
            </div>
            <div className="space-y-2">
              <p><span className="text-gray-400">Onboarding App:</span> {p.onboarding?.applicationName || '—'}</p>
              <p><span className="text-gray-400">Team:</span> {p.onboarding?.teamName || '—'}</p>
              <p><span className="text-gray-400">Created By:</span> {p.createdBy || '—'}</p>
              <p><span className="text-gray-400">Updated By:</span> {p.updatedBy || '—'}</p>
              <p><span className="text-gray-400">Created At:</span> {formatDate(p.createdAt)}</p>
              <p><span className="text-gray-400">Updated At:</span> {formatDate(p.updatedAt)}</p>
              <p><span className="text-gray-400">Deployed URL:</span> {p.deployedServiceUrl ? <a href={p.deployedServiceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{p.deployedServiceUrl}</a> : 'N/A'}</p>
              <p><span className="text-gray-400">Status:</span> {p.softDeleted ? 'Archived' : p.deprecated ? 'Deprecated' : 'Active'}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dark-700">
            <h3 className="text-sm font-semibold text-white mb-2">Capabilities</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-gray-400">Tools:</span> {p.capabilities?.tools?.length || 0}</div>
              <div><span className="text-gray-400">Resources:</span> {p.capabilities?.resources?.length || 0}</div>
              <div><span className="text-gray-400">Prompts:</span> {p.capabilities?.prompts?.length || 0}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => { setShowDetailModal(false); setSelectedProject(null); }} className="bg-primary hover:bg-primary/90 text-white">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Deployment History Modal ────────────────────────────────────
  const DeployHistoryModal = () => {
    if (!showDeployHistoryModal || !deployHistoryProject) return null;
    const history = deployHistoryProject.auditTrail?.deployHistory || [];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-3xl max-h-[80vh] overflow-auto rounded-xl border border-dark-700 bg-[#0e172a] shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Deployment History for {deployHistoryProject.identity?.displayName || 'MCP Server'}
            </h2>
            <button
              onClick={() => { setShowDeployHistoryModal(false); setDeployHistoryProject(null); }}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-400">No deployments recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-dark-700">
                <tr className="text-left text-xs text-gray-400">
                  <th className="pb-2">Run ID</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Conclusion</th>
                  <th className="pb-2">Deployed URL</th>
                  <th className="pb-2">At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {history.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.03]">
                    <td className="py-2">{entry.runId || '—'}</td>
                    <td className="py-2">
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        entry.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        entry.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {entry.status || '—'}
                      </span>
                    </td>
                    <td className="py-2">{entry.conclusion || '—'}</td>
                    <td className="py-2">
                      {entry.deployedUrl ? (
                        <a href={entry.deployedUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {entry.deployedUrl}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-2">{entry.by?.timestamp ? formatDate(entry.by.timestamp) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => { setShowDeployHistoryModal(false); setDeployHistoryProject(null); }} className="bg-primary hover:bg-primary/90 text-white">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Confirmation Modal ──────────────────────────────────────────
  const ConfirmationModal = () => {
    if (!confirmModal.open) return null;
    const { item, action } = confirmModal;
    const name = item?.identity?.displayName || item?.id || 'this server';

    let title, message, confirmLabel, confirmColor;
    if (action === 'archive') {
      title = 'Archive MCP Server';
      message = `Are you sure you want to archive "${name}"? It will be moved to the archived list.`;
      confirmLabel = 'Archive';
      confirmColor = 'bg-red-600 hover:bg-red-700';
    } else if (action === 'unarchive') {
      title = 'Unarchive MCP Server';
      message = `Are you sure you want to unarchive "${name}"? It will become active again.`;
      confirmLabel = 'Unarchive';
      confirmColor = 'bg-green-600 hover:bg-green-700';
    } else if (action === 'deprecate') {
      title = 'Deprecate MCP Server';
      message = `Are you sure you want to deprecate "${name}"? It will be marked as deprecated but remains accessible.`;
      confirmLabel = 'Deprecate';
      confirmColor = 'bg-yellow-600 hover:bg-yellow-700';
    } else {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-dark-700 bg-[#0e172a] shadow-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#ff5b1f]/10 text-[#ff5b1f]">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-gray-300">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              onClick={() => setConfirmModal({ open: false, item: null, action: null })}
              className="border border-dark-700 bg-transparent text-gray-300 hover:bg-dark-800"
            >
              Cancel
            </Button>
            <Button
              onClick={executeConfirmedAction}
              className={cn('text-white shadow-lg', confirmColor)}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#0e172a]">
      <main className="flex-1 p-2">
        <div className="mx-auto max-w-[1400px]">
          <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,34,58,0.96)_0%,rgba(12,18,34,0.98)_100%)] shadow-[0_28px_70px_-38px_rgba(0,0,0,0.95)]">
            <div className="flex flex-col gap-5 border-b border-white/10 px-7 py-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/20 bg-[#ff5b1f]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08c]">
                  <Server className="h-4 w-4" />
                  MCP Server Catalog
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-white">Existing MCP Servers</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Review the current MCP server portfolio. Start a new onboarding, edit, clone, or version an existing server when you are ready.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCreate?.()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff5b1f] px-6 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/20 transition-colors hover:bg-[#ff6b36]"
              >
                <Plus className="h-4 w-4" />
                Onboard MCP Server
              </button>
            </div>

            <div className="p-6">
              <div className="mb-3 inline-flex rounded-full border border-white/10 bg-[#0f172a]/72 p-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(0);
                    }}
                    className={cn(
                      'h-9 rounded-full px-4 text-xs font-semibold transition-colors',
                      tab.value === statusFilter
                        ? 'bg-[#ff5b1f] text-white shadow-lg shadow-[#ff5b1f]/15'
                        : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                <div className="relative md:w-[360px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search MCP servers..."
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0f172a]/70 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-[#ff5b1f]/50"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span>{totalElements} total</span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-600 md:inline-block" />
                  <span>Page {totalPages ? page + 1 : 0} of {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading || page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={loading || page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <div className="min-w-[1480px]">
                    <div className="grid grid-cols-[1.2fr_1fr_0.75fr_0.9fr_0.9fr_1fr_1fr_1.2fr_120px_88px] bg-[#11182c] px-5 py-3 text-left">
                      {['Service', 'Application', 'Project', 'Created By', 'Updated By', 'Created At', 'Updated At', 'URL', 'Status', 'Action'].map((label) => (
                        <div key={label} className={cn(
                          'text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500',
                          (label === 'URL' || label === 'Action') && 'text-center'
                        )}>
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="divide-y divide-white/8">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="grid grid-cols-[1.2fr_1fr_0.75fr_0.9fr_0.9fr_1fr_1fr_1.2fr_120px_88px] items-center gap-4 bg-[#0f172a]/72 px-5 py-4 text-left">
                          <div className="space-y-2"><div className="h-4 w-44 animate-pulse rounded-full bg-white/10" /></div>
                          <div className="space-y-2"><div className="h-4 w-36 animate-pulse rounded-full bg-white/10" /></div>
                          <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                          <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                          <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                          <div className="h-4 w-48 animate-pulse rounded-full bg-white/10" />
                          <div className="h-7 w-24 animate-pulse rounded-full bg-emerald-500/10" />
                          <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-5 text-sm text-rose-100">
                  {error}
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
                  <div className="text-lg font-semibold text-white">
                    {STATUS_TABS.find((t) => t.value === statusFilter)?.emptyTitle || 'No MCP servers found'}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {statusFilter === 'ARCHIVED'
                      ? 'Archived MCP servers will appear here when available.'
                      : 'Create the first MCP server from the onboarding action.'}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <div className="min-w-[1480px]">
                    <div className="grid grid-cols-[1.2fr_1fr_0.75fr_0.9fr_0.9fr_1fr_1fr_1.2fr_120px_88px] bg-[#11182c] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <div>Service</div>
                      <div>Application</div>
                      <div>Project</div>
                      <div>Created By</div>
                      <div>Updated By</div>
                      <div>Created At</div>
                      <div>Updated At</div>
                      <div className="text-center">URL</div>
                      <div>Status</div>
                      <div className="text-center">Action</div>
                    </div>
                    <div className="divide-y divide-white/8">
                      {items.map((item) => {
                        const ident = item.identity || {};
                        const onboarding = item.onboarding || {};
                        const deploymentUrl = item.deployedServiceUrl;
                        return (
                          <div
                            key={item.id}
                            className="grid grid-cols-[1.2fr_1fr_0.75fr_0.9fr_0.9fr_1fr_1fr_1.2fr_120px_88px] items-center gap-4 bg-[#0f172a]/72 px-5 py-4 text-left text-sm text-slate-300 transition-colors hover:bg-[#151d33]"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-white" title={ident.displayName || 'Untitled'}>
                                {ident.displayName || 'Untitled'}
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-500" title={item.id}>{item.id}</div>
                            </div>
                            <div className="min-w-0 truncate" title={onboarding.applicationName || '—'}>
                              {onboarding.applicationName || '—'}
                            </div>
                            <div className="min-w-0 truncate" title={onboarding.teamName || '—'}>
                              {onboarding.teamName || '—'}
                            </div>
                            <div className="truncate" title={item.createdBy || '—'}>{item.createdBy || '—'}</div>
                            <div className="truncate" title={item.updatedBy || '—'}>{item.updatedBy || '—'}</div>
                            <div className="truncate">{formatDate(item.createdAt)}</div>
                            <div className="truncate">{formatDate(item.updatedAt)}</div>
                            <div className="flex min-w-0 justify-center">
                              {deploymentUrl ? (
                                <a
                                  href={deploymentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                                  title={deploymentUrl}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate max-w-[100px]">Open</span>
                                </a>
                              ) : (
                                <span className="text-xs text-slate-500">N/A</span>
                              )}
                            </div>
                            <div>{getStatusBadge(item)}</div>
                            <div className="flex justify-center">{renderActionMenu(item)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <DetailModal />
      <DeployHistoryModal />
      <ConfirmationModal />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}