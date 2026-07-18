import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, History, Loader2, Rocket, RotateCcw, X, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { deploymentService } from '../services/deploymentService';
import GitHubDeploymentStatusPanel from './GitHubDeploymentStatusPanel';

const unwrapApiData = (result) => result?.data?.data ?? result?.data ?? result ?? null;

const recordTime = (record) => {
  const raw = record?.completedAt || record?.startedAt || record?.lastUploadedOn || record?.uploadedAt || record?.artifactUploadedAt || record?.createdAt || record?.updatedAt;
  const time = raw ? Date.parse(raw) : 0;
  return Number.isFinite(time) ? time : 0;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['success', 'succeeded', 'completed'].includes(normalized)) return 'success';
  if (['failed', 'failure', 'error'].includes(normalized)) return 'failed';
  if (['running', 'in_progress', 'queued', 'pending'].includes(normalized)) return 'running';
  return 'neutral';
};

const badgeClass = {
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
  running: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
  neutral: 'border-slate-700 bg-slate-900/70 text-slate-300',
};

const StatusIcon = ({ tone }) => {
  if (tone === 'success') return <CheckCircle className="h-3.5 w-3.5" />;
  if (tone === 'failed') return <XCircle className="h-3.5 w-3.5" />;
  if (tone === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  return <Clock className="h-3.5 w-3.5" />;
};

const formatLabel = (value) => (
  String(value || 'N/A')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

export default function ResourceDeploymentHistoryModal({ open, resourceId, title, resourceLabel = 'Resource', onClose }) {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [historyState, setHistoryState] = useState({ loading: false, error: '' });
  const [githubStatus, setGithubStatus] = useState({ loading: false, error: '', data: null, history: null });

  const selectedRecord = useMemo(
    () => historyRecords.find((record) => (record.deploymentId || record.id) === selectedRecordId) || historyRecords[0] || null,
    [historyRecords, selectedRecordId]
  );

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadHistory = async () => {
      if (!resourceId) {
        setHistoryRecords([]);
        setSelectedRecordId('');
        setHistoryState({ loading: false, error: 'Resource id is not available.' });
        return;
      }

      setHistoryState({ loading: true, error: '' });
      setGithubStatus({ loading: false, error: '', data: null, history: null });
      const result = await deploymentService.getDeploymentHistory(resourceId);
      if (!active) return;

      if (!result.success) {
        setHistoryRecords([]);
        setSelectedRecordId('');
        setHistoryState({ loading: false, error: result.error || 'Unable to load deployment history' });
        return;
      }

      const records = (Array.isArray(unwrapApiData(result)) ? unwrapApiData(result) : [])
        .slice()
        .sort((left, right) => recordTime(right) - recordTime(left));
      setHistoryRecords(records);
      setSelectedRecordId(records[0]?.deploymentId || records[0]?.id || '');
      setHistoryState({ loading: false, error: '' });
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [open, resourceId]);

  useEffect(() => {
    if (!open || !resourceId || !selectedRecord) return;
    let active = true;
    const deploymentId = selectedRecord.deploymentId || selectedRecord.id;

    const loadGithubStatus = async () => {
      if (!deploymentId) {
        setGithubStatus({ loading: false, error: 'Deployment id is not available.', data: null, history: selectedRecord });
        return;
      }

      setGithubStatus({ loading: true, error: '', data: null, history: selectedRecord });
      const result = await deploymentService.getGithubPipelineStatus(resourceId, deploymentId);
      if (!active) return;
      setGithubStatus({
        loading: false,
        error: result.success ? '' : result.error || 'Unable to load GitHub pipeline status',
        data: result.success ? result.data : null,
        history: selectedRecord,
      });
    };

    loadGithubStatus();
    return () => {
      active = false;
    };
  }, [open, resourceId, selectedRecord]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#11182c] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,91,31,0.16),transparent_30%),#151d33] px-7 py-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8a5c]/20 bg-[#ff5b1f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb08c]">
              <History className="h-3.5 w-3.5" />
              Deployment History
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">{title || resourceLabel}</h2>
            <p className="mt-1 text-sm text-slate-400">Deployment history and GitHub CI/CD stages for this {resourceLabel.toLowerCase()}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close deployment history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-slate-950/25">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">History</p>
              <p className="mt-1 text-xs text-slate-500">{historyRecords.length} deployment records</p>
            </div>

            {historyState.loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`history-skeleton-${index}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-3 h-4 w-44 animate-pulse rounded-full bg-white/[0.08]" />
                  </div>
                ))}
              </div>
            ) : historyState.error ? (
              <div className="m-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{historyState.error}</span>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                No deployment history found.
              </div>
            ) : (
              <div className="max-h-[56vh] space-y-2 overflow-y-auto p-3">
                {historyRecords.map((record) => {
                  const deploymentId = record.deploymentId || record.id;
                  const selected = deploymentId === selectedRecordId;
                  const tone = statusTone(record.status);
                  const ActionIcon = String(record.action || '').toLowerCase() === 'rollback' ? RotateCcw : Rocket;

                  return (
                    <button
                      key={deploymentId}
                      type="button"
                      onClick={() => setSelectedRecordId(deploymentId)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition',
                        selected
                          ? 'border-[#ff8a5c]/35 bg-[#ff5b1f]/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{formatLabel(record.action || 'Deployment')}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{deploymentId}</p>
                        </div>
                        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold', badgeClass[tone])}>
                          <StatusIcon tone={tone} />
                          {formatLabel(record.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <ActionIcon className="h-3.5 w-3.5" />
                          {formatLabel(record.deploymentType || record.method)}
                        </span>
                        <span>{formatDateTime(record.completedAt || record.startedAt || record.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="min-w-0">
            <GitHubDeploymentStatusPanel
              state={githubStatus}
              title="GitHub CI/CD Stages"
              description="Pipeline stages fetched for the selected deployment history entry."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
