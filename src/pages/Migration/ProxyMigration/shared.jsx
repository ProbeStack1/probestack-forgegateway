import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Loader2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const STAGES = [
  { id: 'source', label: 'Source' },
  { id: 'proxies', label: 'Resources' },
  { id: 'destination', label: 'Ownership' },
  { id: 'connector', label: 'Delivery' },
  { id: 'review', label: 'Review' },
  { id: 'progress', label: 'Progress' },
];

export const SOURCE_PROFILES = [
  { id: 'apigee-prod', name: 'ForgeSphere Production', detail: 'Service account connected' },
  { id: 'apigee-nonprod', name: 'ForgeSphere Non-production', detail: 'Service account connected' },
];

export const ORGANIZATIONS = {
  'apigee-prod': ['forgesphere-prod', 'customer-platform-prod'],
  'apigee-nonprod': ['forgesphere-nonprod', 'digital-sandbox'],
};

export const ENVIRONMENTS = ['dev', 'test', 'uat', 'prod'];

export const PREVIEW_ROUTE_DEFAULTS = {
  profile: 'apigee-nonprod',
  org: 'forgesphere-nonprod',
  env: 'dev',
  resourceTypes: 'api-proxies',
  selected: 'payments-api,customer-profile-api',
  bu: 'Retail Banking',
  project: 'Customer Experience',
  application: 'Customer 360',
  applicationId: 'APP-C360-001',
  branch: 'develop',
  visibility: 'PRIVATE',
};

// One sync wizard, scoped per entry point. API proxies and shared flows are
// Apigee's two bundle-deployed (SCM + revision) resource types, so each gets
// its own dedicated, locked-to-one-resource-type sync entry point rather than
// exposing the full multi-type discovery picker every time.
export const SYNC_SCOPES = {
  'api-proxies': {
    pageTitle: 'ForgeSphere API Sync',
    backPath: '/gateway/proxy',
    backLabel: 'Back to APIs',
    defaultSelected: ['payments-api', 'customer-profile-api'],
  },
  'shared-flows': {
    pageTitle: 'ForgeSphere Global Function Sync',
    backPath: '/gateway/shared-flow',
    backLabel: 'Back to Global Functions',
    defaultSelected: ['sf-common-security', 'sf-telemetry'],
  },
  'api-products': {
    pageTitle: 'ForgeSphere Product Sync',
    backPath: '/gateway/products',
    backLabel: 'Back to Products',
    defaultSelected: ['product-payments-gold', 'product-retail-mobile'],
  },
  'developer-apps': {
    pageTitle: 'ForgeSphere Consumer App Sync',
    backPath: '/gateway/consumer',
    backLabel: 'Back to Consumers',
    defaultSelected: ['app-partner-portal'],
  },
  'developers': {
    pageTitle: 'ForgeSphere Developer Sync',
    backPath: '/gateway/developer',
    backLabel: 'Back to Developers',
    defaultSelected: ['developer-partner-team'],
  },
  'kvms': {
    pageTitle: 'ForgeSphere Config Map Sync',
    backPath: '/gateway/environments',
    backLabel: 'Back to Config Maps',
    defaultSelected: ['kvm-payment-routing'],
  },
  'target-servers': {
    pageTitle: 'ForgeSphere Backend Service Sync',
    backPath: '/gateway/environments',
    backLabel: 'Back to Backend Services',
    defaultSelected: ['target-payment-core', 'target-crm-backend'],
  },
  'tls-keystores': {
    pageTitle: 'ForgeSphere Trust Store Sync',
    backPath: '/gateway/environments',
    backLabel: 'Back to Trust Stores',
    defaultSelected: ['tls-outbound-mtls'],
  },
};

const PROXY_RESOURCES = [
  { id: 'payments-api', name: 'payments-api', revision: '18', deployedAt: '27 Aug 2026, 10:42', status: 'missing' },
  { id: 'customer-profile-api', name: 'customer-profile-api', revision: '7', deployedAt: '26 Aug 2026, 18:15', status: 'missing' },
  { id: 'account-verification-api', name: 'account-verification-api', revision: '12', deployedAt: '25 Aug 2026, 12:08', status: 'missing' },
  {
    id: 'orders-api',
    name: 'orders-api',
    revision: '31',
    currentRevision: '29',
    deployedAt: '27 Aug 2026, 09:10',
    status: 'update_available',
    repository: 'orders-api-px',
    branch: 'release/dev',
    application: 'Order Management',
    applicationId: 'APP-ORDER-008',
  },
  {
    id: 'catalog-api',
    name: 'catalog-api',
    revision: '14',
    currentRevision: '14',
    deployedAt: '26 Aug 2026, 15:30',
    status: 'synced',
    repository: 'catalog-api-px',
    branch: 'develop',
    application: 'Product Catalog',
    applicationId: 'APP-CATALOG-011',
  },
  {
    id: 'loyalty-api',
    name: 'loyalty-api',
    revision: '9',
    currentRevision: '8',
    deployedAt: '24 Aug 2026, 16:30',
    status: 'migrating',
    repository: 'loyalty-api-px',
    branch: 'develop',
    application: 'Loyalty Platform',
    applicationId: 'APP-LOYALTY-017',
  },
];

const withResourceMetadata = (group, items) => items.map((item) => ({
  ...item,
  groupId: group.id,
  resourceType: group.label,
  scope: group.scope,
  delivery: group.delivery,
}));

const RESOURCE_GROUP_DEFINITIONS = [
  {
    id: 'api-proxies',
    label: 'API proxies',
    description: 'Environment-deployed proxy bundles and revisions',
    scope: 'Environment deployed',
    delivery: 'bundle',
    items: PROXY_RESOURCES,
  },
  {
    id: 'shared-flows',
    label: 'Shared flows',
    description: 'Reusable policy bundles deployed to the environment',
    scope: 'Environment deployed',
    delivery: 'bundle',
    items: [
      { id: 'sf-common-security', name: 'common-security', revision: '12', currentRevision: '10', deployedAt: '27 Aug 2026, 11:05', status: 'update_available', repository: 'common-security-sf', branch: 'develop', application: 'API Platform', applicationId: 'APP-PLATFORM-001', dependencies: ['payments-api', 'orders-api'] },
      { id: 'sf-telemetry', name: 'telemetry-flow', revision: '6', deployedAt: '26 Aug 2026, 14:20', status: 'missing', dependencies: ['customer-profile-api'] },
      { id: 'sf-error-handler', name: 'standard-error-handler', revision: '8', currentRevision: '8', deployedAt: '24 Aug 2026, 09:40', status: 'synced', repository: 'standard-error-handler-sf', branch: 'main', application: 'API Platform', applicationId: 'APP-PLATFORM-001' },
    ],
  },
  {
    id: 'api-products',
    label: 'API products',
    description: 'Proxy access packages, scopes and environment bindings',
    scope: 'Organization',
    delivery: 'configuration',
    items: [
      { id: 'product-payments-gold', name: 'payments-gold', sourceVersion: 'Updated 27 Aug', currentVersion: 'Updated 22 Aug', deployedAt: '27 Aug 2026, 10:55', status: 'update_available', application: 'Payments Hub', applicationId: 'APP-PAY-006', dependencies: ['payments-api'] },
      { id: 'product-retail-mobile', name: 'retail-mobile', sourceVersion: 'Updated 26 Aug', deployedAt: '26 Aug 2026, 17:10', status: 'missing', dependencies: ['customer-profile-api', 'account-verification-api'] },
    ],
  },
  {
    id: 'developer-apps',
    label: 'Developer apps',
    description: 'App registrations and API product associations',
    scope: 'Organization',
    delivery: 'configuration',
    items: [
      { id: 'app-partner-portal', name: 'partner-portal', sourceVersion: 'Updated 27 Aug', currentVersion: 'Updated 19 Aug', deployedAt: '27 Aug 2026, 08:35', status: 'update_available', application: 'Partner Experience', applicationId: 'APP-PARTNER-003', dependencies: ['payments-gold'], sensitive: true },
      { id: 'app-mobile-banking', name: 'mobile-banking-app', sourceVersion: 'Updated 20 Aug', currentVersion: 'Updated 20 Aug', deployedAt: '20 Aug 2026, 13:15', status: 'synced', application: 'Mobile Banking', applicationId: 'APP-MOBILE-004', dependencies: ['retail-mobile'], sensitive: true },
    ],
  },
  {
    id: 'developers',
    label: 'Developers',
    description: 'Developer identities referenced by application registrations',
    scope: 'Organization',
    delivery: 'configuration',
    items: [
      { id: 'developer-partner-team', name: 'partner-team@forgecrux.com', sourceVersion: 'Updated 25 Aug', deployedAt: '25 Aug 2026, 16:45', status: 'missing' },
      { id: 'developer-mobile-platform', name: 'mobile-platform@forgecrux.com', sourceVersion: 'Updated 18 Aug', currentVersion: 'Updated 18 Aug', deployedAt: '18 Aug 2026, 12:20', status: 'synced' },
    ],
  },
  {
    id: 'kvms',
    label: 'Key value maps',
    description: 'Environment configuration; encrypted values remain masked',
    scope: 'Environment',
    delivery: 'configuration',
    items: [
      { id: 'kvm-payment-routing', name: 'payment-routing', sourceVersion: 'Fingerprint …9c42', currentVersion: 'Fingerprint …31af', deployedAt: '27 Aug 2026, 07:50', status: 'update_available', sensitive: true },
      { id: 'kvm-oauth-config', name: 'oauth-config', sourceVersion: 'Fingerprint …7ab1', currentVersion: 'Fingerprint …7ab1', deployedAt: '22 Aug 2026, 10:05', status: 'synced', sensitive: true },
    ],
  },
  {
    id: 'target-servers',
    label: 'Target servers',
    description: 'Environment endpoint, TLS and load-balancing configuration',
    scope: 'Environment',
    delivery: 'configuration',
    items: [
      { id: 'target-payment-core', name: 'payment-core', sourceVersion: 'Updated 27 Aug', currentVersion: 'Updated 21 Aug', deployedAt: '27 Aug 2026, 09:25', status: 'update_available' },
      { id: 'target-crm-backend', name: 'crm-backend', sourceVersion: 'Updated 23 Aug', deployedAt: '23 Aug 2026, 15:10', status: 'missing' },
    ],
  },
  {
    id: 'flow-hooks',
    label: 'Flow hooks',
    description: 'Shared-flow attachments at environment execution points',
    scope: 'Environment',
    delivery: 'configuration',
    items: [
      { id: 'hook-pre-proxy', name: 'Pre-proxy hook', sourceVersion: 'common-security · Revision 12', currentVersion: 'common-security · Revision 10', deployedAt: '27 Aug 2026, 11:08', status: 'update_available', dependencies: ['common-security'] },
    ],
  },
  {
    id: 'caches',
    label: 'Cache configurations',
    description: 'Environment cache definitions used by proxy policies',
    scope: 'Environment',
    delivery: 'configuration',
    items: [
      { id: 'cache-token', name: 'token-cache', sourceVersion: 'Updated 18 Aug', currentVersion: 'Updated 18 Aug', deployedAt: '18 Aug 2026, 14:15', status: 'synced' },
    ],
  },
  {
    id: 'tls-keystores',
    label: 'TLS and keystores',
    description: 'Aliases and references only; private key material is never displayed',
    scope: 'Environment',
    delivery: 'secure_configuration',
    items: [
      { id: 'tls-outbound-mtls', name: 'outbound-mtls', sourceVersion: 'Certificate …A91F', currentVersion: 'Certificate …702C', deployedAt: '26 Aug 2026, 12:35', status: 'update_available', sensitive: true },
    ],
  },
  {
    id: 'resource-files',
    label: 'Environment resource files',
    description: 'Organization and environment JavaScript, Java and XSL resources',
    scope: 'Environment',
    delivery: 'configuration',
    items: [
      { id: 'resource-common-js', name: 'jsc://common-utils.js', sourceVersion: 'Hash …e451', currentVersion: 'Hash …b920', deployedAt: '25 Aug 2026, 10:30', status: 'update_available' },
    ],
  },
];

export const RESOURCE_GROUPS = RESOURCE_GROUP_DEFINITIONS.map((group) => ({
  ...group,
  items: withResourceMetadata(group, group.items),
}));
export const ALL_DISCOVERED_RESOURCES = RESOURCE_GROUPS.flatMap((group) => group.items);
export const DISCOVERED_PROXIES = RESOURCE_GROUPS.find((group) => group.id === 'api-proxies').items;
export const getProxyOperation = (resource) => (resource.status === 'missing' ? 'import' : 'resync');
export const getResourceSourceVersion = (resource) => resource.sourceVersion || `Revision ${resource.revision}`;
export const getResourceCurrentVersion = (resource) => resource.currentVersion || (resource.currentRevision ? `Revision ${resource.currentRevision}` : 'No ForgeSphere version');
export const isProxySelectable = (resource) => resource.status !== 'migrating';

export const BUSINESS_UNITS = ['Retail Banking', 'Payments', 'Digital Channels'];
export const PROJECTS = {
  'Retail Banking': ['Customer Experience', 'Account Services'],
  Payments: ['Payments Modernization', 'Merchant Services'],
  'Digital Channels': ['Mobile Platform', 'Web Experience'],
};
export const APPLICATIONS = {
  'Customer Experience': [
    { name: 'Customer 360', id: 'APP-C360-001' },
    { name: 'Profile Management', id: 'APP-PROFILE-002' },
  ],
  'Account Services': [{ name: 'Account Platform', id: 'APP-ACCOUNT-014' }],
  'Payments Modernization': [{ name: 'Payments Hub', id: 'APP-PAY-006' }],
  'Merchant Services': [{ name: 'Merchant Gateway', id: 'APP-MERCHANT-009' }],
  'Mobile Platform': [{ name: 'Mobile Banking', id: 'APP-MOBILE-004' }],
  'Web Experience': [{ name: 'Online Banking', id: 'APP-WEB-003' }],
};

export const FIELD_CLASS =
  'h-11 w-full rounded-lg border border-dark-600 bg-dark-800/70 px-3 text-sm text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50';
export const PRIMARY_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40';
export const SECONDARY_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dark-600 px-4 text-sm font-semibold text-gray-300 transition hover:border-dark-500 hover:bg-dark-800/60 hover:text-white disabled:pointer-events-none disabled:opacity-40';
export const stageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

export function SectionIntro({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="block">
      <span className="mb-2 block text-xs font-semibold text-gray-300">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-gray-500">{hint}</span>}
    </div>
  );
}

export function SelectDropdown({ value, options, placeholder, disabled = false, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const normalizedOptions = options.map((option) => (
    typeof option === 'string' ? { value: option, label: option } : option
  ));
  const selectedOption = normalizedOptions.find((option) => option.value === value);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-dark-800/70 px-3 text-left text-sm outline-none transition',
          open ? 'border-primary/70 ring-2 ring-primary/10' : 'border-dark-600 hover:border-dark-500',
          disabled && 'cursor-not-allowed opacity-45',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', selectedOption ? 'text-white' : 'text-gray-500')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200', open && 'rotate-180 text-primary')} />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -5, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 z-[70] mt-2 max-h-60 overflow-y-auto rounded-xl border border-dark-600 bg-[#182238] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-500">No options available</div>
            ) : normalizedOptions.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    selected ? 'bg-primary/12 text-white' : 'text-gray-300 hover:bg-white/[0.055] hover:text-white',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    {option.description && <span className="mt-0.5 block truncate text-[11px] text-gray-500">{option.description}</span>}
                  </span>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', selected ? 'bg-primary text-white' : 'text-transparent')}>
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MultiSelectDropdown({ values, options, placeholder, disabled = false, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedValues = new Set(values);
  const selectedOptions = options.filter((option) => selectedValues.has(option.value));

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const toggleValue = (value) => {
    const next = new Set(selectedValues);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(options.filter((option) => next.has(option.value)).map((option) => option.value));
  };

  const summary = selectedOptions.length === 0
    ? placeholder
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} resource types selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-dark-800/70 px-3 text-left text-sm outline-none transition',
          open ? 'border-primary/70 ring-2 ring-primary/10' : 'border-dark-600 hover:border-dark-500',
          disabled && 'cursor-not-allowed opacity-45',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', selectedOptions.length ? 'text-white' : 'text-gray-500')}>{summary}</span>
        {selectedOptions.length > 1 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{selectedOptions.length}</span>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200', open && 'rotate-180 text-primary')} />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            role="listbox"
            aria-multiselectable="true"
            initial={{ opacity: 0, y: 5, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-0 right-0 z-[70] mb-2 origin-bottom overflow-hidden rounded-xl border border-dark-600 bg-[#182238] shadow-[0_-18px_45px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between border-b border-dark-600 px-3 py-2">
              <span className="text-[11px] text-gray-500">Choose what discovery should analyze</span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <button type="button" onClick={() => onChange(options.map((option) => option.value))} className="text-primary hover:text-primary/80">Select all</button>
                {selectedOptions.length > 0 && <button type="button" onClick={() => onChange([])} className="text-gray-500 hover:text-gray-300">Clear</button>}
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5">
              {options.map((option) => {
                const selected = selectedValues.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleValue(option.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      selected ? 'bg-primary/10 text-white' : 'text-gray-300 hover:bg-white/[0.055] hover:text-white',
                    )}
                  >
                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', selected ? 'border-primary bg-primary text-white' : 'border-dark-500 bg-dark-800')}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{option.label}</span>
                      {option.description && <span className="mt-0.5 block truncate text-[10px] text-gray-500">{option.description}</span>}
                    </span>
                    {option.meta && <span className="shrink-0 text-[10px] text-gray-600">{option.meta}</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StepBar({ stage, onStageChange }) {
  const activeIndex = Math.max(0, STAGES.findIndex((item) => item.id === stage));
  return (
    <nav aria-label="Migration steps" className="mb-5 pb-1 lg:mb-0 lg:pb-0">
      <p className="mb-4 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600 lg:block">Migration steps</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:flex lg:flex-col lg:items-stretch lg:gap-0">
        {STAGES.map((item, index) => {
          const active = item.id === stage;
          const done = index < activeIndex;
          return (
            <React.Fragment key={item.id}>
              <button
                type="button"
                onClick={() => onStageChange(item.id)}
                className={cn(
                  'group flex min-w-0 items-center gap-2 py-2 text-xs font-semibold transition lg:w-full',
                  active ? 'text-white' : done ? 'text-emerald-300' : 'text-gray-600',
                  !active && 'hover:text-white',
                )}
              >
                <span className={cn(
                  'relative flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                  active && 'border-primary bg-primary text-white',
                  done && 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400',
                  !active && !done && 'border-dark-600 bg-dark-800 text-gray-600',
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  {active && <motion.span layoutId="active-step-ring" className="absolute -inset-1 rounded-full border border-primary/25" />}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
              {index < STAGES.length - 1 && <div className={cn('hidden lg:my-0.5 lg:ml-[13px] lg:block lg:h-5 lg:w-px lg:flex-none', index < activeIndex ? 'bg-emerald-500/35' : 'bg-dark-600')} />}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

export function StatusPill({ status }) {
  const config = {
    missing: { label: 'Import required', className: 'bg-blue-500/10 text-blue-300', icon: CircleDot },
    update_available: { label: 'Sync required', className: 'bg-amber-500/10 text-amber-300', icon: Clock3 },
    synced: { label: 'In sync', className: 'bg-emerald-500/10 text-emerald-300', icon: CheckCircle2 },
    migrating: { label: 'Processing', className: 'bg-amber-500/10 text-amber-300', icon: Loader2 },
    completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-300', icon: CheckCircle2 },
    processing: { label: 'In progress', className: 'bg-blue-500/10 text-blue-300', icon: Loader2 },
    queued: { label: 'Waiting', className: 'bg-dark-600/60 text-gray-300', icon: Clock3 },
    failed: { label: 'Failed', className: 'bg-red-500/10 text-red-300', icon: XCircle },
  }[status] || { label: status, className: 'bg-dark-600/60 text-gray-300', icon: CircleDot };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', config.className)}>
      <Icon className={cn('h-3 w-3', ['processing', 'migrating'].includes(status) && 'animate-spin')} />
      {config.label}
    </span>
  );
}

export function StepActions({ onBack, onNext, nextDisabled, nextLabel }) {
  return (
    <StickyFooter className="justify-between">
      <button type="button" className={SECONDARY_BUTTON} onClick={onBack}>Back</button>
      <button type="button" className={PRIMARY_BUTTON} disabled={nextDisabled} onClick={onNext}>
        {nextLabel}<ArrowRight className="h-4 w-4" />
      </button>
    </StickyFooter>
  );
}

export function StickyFooter({ children, className }) {
  return (
    <div className={cn(
      'sticky bottom-[-27px] z-20 -mx-5 -mb-6 mt-auto flex flex-wrap items-center gap-3 border-t border-dark-700 bg-[#121c32]/95 px-5 py-4 shadow-[0_-12px_28px_rgba(6,12,24,0.22)] backdrop-blur-sm sm:-mx-8 sm:px-8 lg:-mx-9 lg:px-9',
      className,
    )}>
      {children}
    </div>
  );
}
