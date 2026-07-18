import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { apiDevelopmentService } from '../services/apiDevelopmentService';
import { cn } from '../lib/utils';

const serviceOptions = [
  { value: '', label: 'All Services' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'requirement-mgmt', label: 'Requirement Management' },
  { value: 'api-design', label: 'API Design' },
  { value: 'api-mock', label: 'API Mock' },
  { value: 'contract-testing', label: 'Contract Testing' },
  { value: 'api-development', label: 'API Development' },
  { value: 'test-generation', label: 'Test Generation' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'provider-api', label: 'Provider API' },
];

const auditTypeOptions = [
  { value: '', label: 'All Audit Types' },
  { value: 'ENTITY', label: 'Entity History' },
  { value: 'REQUEST', label: 'HTTP Requests' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'ERROR', label: 'Error' },
  { value: 'FAILED', label: 'Failed' },
];

const resourceTypeOptions = [
  { value: '', label: 'All Resource Types' },
  { value: 'MICROSERVICE', label: 'Microservice' },
  { value: 'APIGEE_PROXY', label: 'Apigee Proxy' },
  { value: 'APIGEE_SHARED_FLOW', label: 'Apigee Shared Flow' },
  { value: 'KONG_GATEWAY_SERVICE', label: 'Kong Gateway Service' },
];

const stepKeyOptions = [
  { value: '', label: 'All Steps' },
  { value: 'REQUIREMENT', label: 'Requirement' },
  { value: 'API_DESIGN', label: 'API Design' },
  { value: 'MOCK_SERVER', label: 'Mock Server' },
  { value: 'CONTRACT_TESTING', label: 'Contract Testing' },
  { value: 'API_DEVELOPMENT', label: 'API Development' },
  { value: 'ENDPOINT', label: 'Endpoint' },
  { value: 'PROJECT_METADATA', label: 'Project Metadata' },
  { value: 'CODEGEN', label: 'Codegen' },
  { value: 'DEPLOYMENT', label: 'Deployment' },
  { value: 'TEST_GENERATION', label: 'Test Generation' },
  { value: 'COMPLIANCE', label: 'Compliance' },
];

const defaultFilters = {
  auditType: '',
  service: '',
  status: '',
  operation: '',
  performedBy: '',
  onboardingContextId: '',
  resourceId: '',
  resourceType: '',
  stepKey: '',
  stepCollection: '',
  stepObjectId: '',
  targetCollection: '',
  targetObjectId: '',
  targetEntityType: '',
  microserviceId: '',
  onboardingId: '',
  entityType: '',
  fromDate: '',
  toDate: '',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const asJson = (value) => {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return 'No data';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const toIsoDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const getMetadataValue = (log, ...keys) => {
  const metadata = log?.metadata || {};
  for (const key of keys) {
    if (metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '') {
      return metadata[key];
    }
  }
  return '';
};

const compactId = (value) => {
  if (!value) return '';
  const text = String(value);
  return text.length > 18 ? `${text.slice(0, 8)}...${text.slice(-6)}` : text;
};

const getAuditTypeLabel = (auditType) => auditType || 'LEGACY';

const getTargetLabel = (log) => {
  const collection = log.targetCollection || log.entityType;
  const id = log.targetObjectId || log.entityId;
  return [collection, compactId(id)].filter(Boolean).join(' / ') || '-';
};

const getScopeLabel = (log) => {
  if (log.resourceId) {
    return `Resource ${compactId(log.resourceId)}`;
  }
  if (log.onboardingContextId) {
    return `Onboarding ${compactId(log.onboardingContextId)}`;
  }
  if (log.microserviceId) {
    return `Microservice ${compactId(log.microserviceId)}`;
  }
  if (log.onboardingId) {
    return `Onboarding ${compactId(log.onboardingId)}`;
  }
  return '-';
};

export default function AuditLogs() {
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [logs, setLogs] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [lastRefresh, setLastRefresh] = useState('');

  const page = pageInfo.number || 0;
  const size = pageInfo.size || 20;

  const currentPageStats = useMemo(() => {
    const success = logs.filter((log) => log.status === 'SUCCESS').length;
    const failed = logs.filter((log) => ['ERROR', 'FAILED'].includes(log.status)).length;
    const entity = logs.filter((log) => log.auditType === 'ENTITY').length;
    const request = logs.filter((log) => log.auditType === 'REQUEST' || !log.auditType).length;
    return { success, failed, entity, request };
  }, [logs]);

  const fetchLogs = async (nextPage = page, nextSize = size, filterSource = appliedFilters) => {
    setIsLoading(true);
    setError('');

    const result = await apiDevelopmentService.getAuditLogs({
      ...filterSource,
      fromDate: toIsoDateTime(filterSource.fromDate),
      toDate: toIsoDateTime(filterSource.toDate),
      page: nextPage,
      size: nextSize,
    });

    if (result.success) {
      const payload = result.data?.data || {};
      const content = Array.isArray(payload.content) ? payload.content : Array.isArray(payload) ? payload : [];
      setLogs(content);
      setPageInfo({
        number: payload.number ?? nextPage,
        size: payload.size ?? nextSize,
        totalElements: payload.totalElements ?? content.length,
        totalPages: payload.totalPages ?? (content.length ? 1 : 0),
      });
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    } else {
      setLogs([]);
      setError(result.error || 'Failed to fetch audit logs');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs(0, pageInfo.size, appliedFilters);
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setExpandedId('');
    fetchLogs(0, pageInfo.size, filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setExpandedId('');
    fetchLogs(0, pageInfo.size, defaultFilters);
  };

  const changePage = (nextPage) => {
    if (nextPage < 0 || (pageInfo.totalPages && nextPage >= pageInfo.totalPages)) return;
    setExpandedId('');
    fetchLogs(nextPage, pageInfo.size, appliedFilters);
  };

  const changeSize = (nextSize) => {
    const parsedSize = Number(nextSize);
    setPageInfo((current) => ({ ...current, size: parsedSize }));
    fetchLogs(0, parsedSize, appliedFilters);
  };

  const renderStatusBadge = (status) => {
    const isSuccess = status === 'SUCCESS';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
          isSuccess
            ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300'
            : 'border-red-400/35 bg-red-500/10 text-red-300'
        )}
      >
        {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {status || 'UNKNOWN'}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0e172a] text-white">

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Platform Audit
              </div>
              <h1 className="text-3xl font-bold tracking-normal text-white">Audit Logs</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-400">
                Review HTTP request audits and resource-level entity history across onboarding, resources, steps, and exact changed documents.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchLogs(page, size, appliedFilters)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-dark-700 bg-dark-800/70 px-4 text-sm font-semibold text-white transition hover:border-primary/50 hover:bg-dark-800"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>

          <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-dark-700 bg-[#15192b] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Total Matching</p>
                <Server className="h-4 w-4 text-gray-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{pageInfo.totalElements}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-[#15192b] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Entity On Page</p>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-bold text-primary">{currentPageStats.entity}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-[#15192b] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Request On Page</p>
                <Server className="h-4 w-4 text-blue-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-blue-300">{currentPageStats.request}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-[#15192b] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Success On Page</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-emerald-300">{currentPageStats.success}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-[#15192b] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Errors On Page</p>
                <AlertCircle className="h-4 w-4 text-red-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-red-300">{currentPageStats.failed}</p>
            </div>
          </section>

          <section className="mb-5 rounded-lg border border-dark-700 bg-[#15192b]">
            <div className="border-b border-dark-700 px-5 py-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Filters</h2>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Audit Type</span>
                <select
                  value={filters.auditType}
                  onChange={(event) => updateFilter('auditType', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                >
                  {auditTypeOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Service</span>
                <select
                  value={filters.service}
                  onChange={(event) => updateFilter('service', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                >
                  {serviceOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Resource Type</span>
                <select
                  value={filters.resourceType}
                  onChange={(event) => updateFilter('resourceType', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                >
                  {resourceTypeOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Step</span>
                <select
                  value={filters.stepKey}
                  onChange={(event) => updateFilter('stepKey', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                >
                  {stepKeyOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Status</span>
                <select
                  value={filters.status}
                  onChange={(event) => updateFilter('status', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Operation</span>
                <input
                  value={filters.operation}
                  onChange={(event) => updateFilter('operation', event.target.value)}
                  placeholder="GET, POST, CREATE..."
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Performed By</span>
                <input
                  value={filters.performedBy}
                  onChange={(event) => updateFilter('performedBy', event.target.value)}
                  placeholder="user@company.com"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Onboarding Context ID</span>
                <input
                  value={filters.onboardingContextId}
                  onChange={(event) => updateFilter('onboardingContextId', event.target.value)}
                  placeholder="Parent onboarding_context id"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Resource ID</span>
                <input
                  value={filters.resourceId}
                  onChange={(event) => updateFilter('resourceId', event.target.value)}
                  placeholder="microservice._id"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Step Collection</span>
                <input
                  value={filters.stepCollection}
                  onChange={(event) => updateFilter('stepCollection', event.target.value)}
                  placeholder="requirement, mock_servers..."
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Step Object ID</span>
                <input
                  value={filters.stepObjectId}
                  onChange={(event) => updateFilter('stepObjectId', event.target.value)}
                  placeholder="Main step document id"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Target Collection</span>
                <input
                  value={filters.targetCollection}
                  onChange={(event) => updateFilter('targetCollection', event.target.value)}
                  placeholder="microservice, endpoint..."
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Target Object ID</span>
                <input
                  value={filters.targetObjectId}
                  onChange={(event) => updateFilter('targetObjectId', event.target.value)}
                  placeholder="Exact changed document id"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Target Entity Type</span>
                <input
                  value={filters.targetEntityType}
                  onChange={(event) => updateFilter('targetEntityType', event.target.value)}
                  placeholder="REQUIREMENT, APIGEE_PROXY..."
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Legacy Microservice ID</span>
                <input
                  value={filters.microserviceId}
                  onChange={(event) => updateFilter('microserviceId', event.target.value)}
                  placeholder="Old request audit field"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Legacy Onboarding ID</span>
                <input
                  value={filters.onboardingId}
                  onChange={(event) => updateFilter('onboardingId', event.target.value)}
                  placeholder="Old request audit field"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Entity Type</span>
                <input
                  value={filters.entityType}
                  onChange={(event) => updateFilter('entityType', event.target.value)}
                  placeholder="Legacy entity type"
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">Page Size</span>
                <select
                  value={pageInfo.size}
                  onChange={(event) => changeSize(event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                >
                  {[10, 20, 50, 100].map((option) => (
                    <option key={option} value={option}>
                      {option} records
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">From</span>
                <input
                  type="datetime-local"
                  value={filters.fromDate}
                  onChange={(event) => updateFilter('fromDate', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-300">To</span>
                <input
                  type="datetime-local"
                  value={filters.toDate}
                  onChange={(event) => updateFilter('toDate', event.target.value)}
                  className="h-11 w-full rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-white outline-none transition focus:border-primary/70"
                />
              </label>

              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-dark-700 bg-dark-900 px-4 text-sm font-semibold text-gray-300 transition hover:border-primary/50 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-dark-700 bg-[#15192b]">
            <div className="flex flex-col gap-3 border-b border-dark-700 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Activity</h2>
                <p className="mt-1 text-sm text-gray-400">Expand a row to inspect request/response payloads, snapshots, field changes, and metadata.</p>
              </div>
              <div className="text-sm text-gray-400">
                Page {pageInfo.totalPages ? page + 1 : 0} of {pageInfo.totalPages || 0}
                {lastRefresh ? ` - Refreshed ${lastRefresh}` : ''}
              </div>
            </div>

            {error && (
              <div className="m-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-dark-700">
                <thead className="bg-dark-900/60">
                  <tr>
                    <th className="w-[190px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Time</th>
                    <th className="w-[125px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Type</th>
                    <th className="w-[160px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Service</th>
                    <th className="w-[130px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Status</th>
                    <th className="w-[150px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Operation</th>
                    <th className="w-[190px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Actor</th>
                    <th className="w-[240px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Scope</th>
                    <th className="w-[210px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Step</th>
                    <th className="w-[260px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Target</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Message</th>
                    <th className="w-[90px] px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan="10" className="px-5 py-16 text-center text-sm text-gray-400">
                        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-5 py-16 text-center text-sm text-gray-400">
                        <AlertCircle className="mx-auto mb-3 h-6 w-6 text-gray-500" />
                        No audit logs found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const method = getMetadataValue(log, 'method', 'httpMethod');
                      const path = getMetadataValue(log, 'path', 'requestUri');
                      const isExpanded = expandedId === log.id;

                      return (
                        <React.Fragment key={log.id || `${log.createdAt}-${log.operation}`}>
                          <tr className="align-top transition hover:bg-dark-900/35">
                            <td className="px-5 py-4 text-sm text-gray-300">{formatDateTime(log.createdAt)}</td>
                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-full border border-dark-600 bg-dark-900 px-2.5 py-1 text-xs font-semibold text-gray-300">
                                {getAuditTypeLabel(log.auditType)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-sm font-semibold text-white">{log.service || '-'}</div>
                              {path && <div className="mt-1 truncate text-xs text-gray-500">{path}</div>}
                            </td>
                            <td className="px-5 py-4">{renderStatusBadge(log.status)}</td>
                            <td className="px-5 py-4">
                              <div className="text-sm font-semibold text-white">{log.operation || method || '-'}</div>
                              {method && method !== log.operation && <div className="mt-1 text-xs text-gray-500">{method}</div>}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-300">
                              <div className="truncate">{log.performedBy || 'system'}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="truncate text-sm text-gray-300">{getScopeLabel(log)}</div>
                              {(log.resourceType || log.resourceCollection) && (
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                  {log.resourceType && <div className="truncate">{log.resourceType}</div>}
                                  {log.resourceCollection && <div className="truncate">{log.resourceCollection}</div>}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="truncate text-sm font-semibold text-white">{log.stepKey || '-'}</div>
                              {(log.stepCollection || log.stepObjectId) && (
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                  {log.stepCollection && <div className="truncate">{log.stepCollection}</div>}
                                  {log.stepObjectId && <div className="truncate">{compactId(log.stepObjectId)}</div>}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="truncate text-sm text-gray-300">{getTargetLabel(log)}</div>
                              {(log.targetEntityType || log.entityType || log.microserviceId || log.onboardingId) && (
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                  {(log.targetEntityType || log.entityType) && <div className="truncate">{log.targetEntityType || log.entityType}</div>}
                                  {log.microserviceId && <div className="truncate">Legacy microservice: {compactId(log.microserviceId)}</div>}
                                  {log.onboardingId && <div className="truncate">Legacy onboarding: {compactId(log.onboardingId)}</div>}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="line-clamp-2 text-sm text-gray-300">{log.errorMessage || log.message || '-'}</div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? '' : log.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dark-700 bg-dark-900 text-gray-300 transition hover:border-primary/50 hover:text-white"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan="10" className="bg-dark-900/35 px-5 py-5">
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <DetailBlock title="Before Snapshot" value={log.beforeSnapshot} />
                                  <DetailBlock title="After Snapshot" value={log.afterSnapshot} />
                                  <DetailBlock title="Field Changes" value={log.changes} />
                                  <DetailBlock title="Request Payload" value={log.requestPayload} />
                                  <DetailBlock title="Response Payload" value={log.responsePayload} />
                                  <DetailBlock title="Metadata" value={log.metadata} />
                                  <DetailBlock title="Error" value={log.errorMessage || 'No error recorded'} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-dark-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-400">
                Showing {logs.length} of {pageInfo.totalElements} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(page - 1)}
                  disabled={isLoading || page <= 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-gray-300 transition hover:border-primary/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  disabled={isLoading || !pageInfo.totalPages || page + 1 >= pageInfo.totalPages}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-dark-700 bg-dark-900 px-3 text-sm text-gray-300 transition hover:border-primary/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function DetailBlock({ title, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-dark-700 bg-[#101827]">
      <div className="border-b border-dark-700 px-4 py-3 text-sm font-semibold text-white">{title}</div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-xs leading-5 text-gray-300">
        {asJson(value)}
      </pre>
    </div>
  );
}
