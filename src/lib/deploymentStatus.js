export const unwrapDeploymentHistoryBulk = (result) => (
  result?.data?.data || result?.data || {}
);

export const getDeploymentHistoryTimestamp = (record) => {
  const value =
    record?.lastUploadedOn ||
    record?.uploadedAt ||
    record?.artifactUploadedAt ||
    record?.completedAt ||
    record?.updatedAt ||
    record?.startedAt ||
    record?.createdAt;
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const pickLatestDeploymentRecord = (records) => {
  if (!Array.isArray(records) || records.length === 0) return null;
  return [...records].sort(
    (first, second) => getDeploymentHistoryTimestamp(second) - getDeploymentHistoryTimestamp(first)
  )[0];
};

export const normalizeDeploymentStatus = (status) => {
  const normalized = String(status || '').trim().toUpperCase();
  if (!normalized) return null;

  if (
    normalized.includes('FAIL') ||
    normalized.includes('ERROR') ||
    normalized.includes('CANCEL') ||
    normalized.includes('TIMEOUT') ||
    normalized.includes('TIMED_OUT')
  ) {
    return { label: 'Failed', tone: 'failed' };
  }

  if (
    normalized.includes('SUCCESS') ||
    normalized === 'DEPLOYED' ||
    normalized === 'COMPLETED' ||
    normalized === 'COMPLETE'
  ) {
    return { label: 'Deployed', tone: 'deployed' };
  }

  if (
    normalized.includes('PENDING') ||
    normalized.includes('PROGRESS') ||
    normalized.includes('RUNNING') ||
    normalized.includes('QUEUED') ||
    normalized.includes('TRIGGER') ||
    normalized.includes('WAITING') ||
    normalized.includes('STARTED') ||
    normalized.includes('JOBS_UPDATED')
  ) {
    return { label: 'In Progress', tone: 'progress' };
  }

  return null;
};

export const deploymentStatusBadgeClass = (tone) => {
  if (tone === 'failed') return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
  if (tone === 'deployed') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
  if (tone === 'progress') return 'border-amber-400/25 bg-amber-400/10 text-amber-200';
  return 'border-sky-400/20 bg-sky-500/10 text-sky-200';
};
