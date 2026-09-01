import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Layers3, LockKeyhole, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  PRIMARY_BUTTON,
  RESOURCE_GROUPS,
  SECONDARY_BUTTON,
  SectionIntro,
  StickyFooter,
  StatusPill,
  getProxyOperation,
  getResourceCurrentVersion,
  getResourceSourceVersion,
  isProxySelectable,
  stageMotion,
} from './shared';

const FILTERS = [
  { id: 'attention', label: 'Action required', matches: (resource) => ['missing', 'update_available'].includes(resource.status) },
  { id: 'missing', label: 'Import required', matches: (resource) => resource.status === 'missing' },
  { id: 'update_available', label: 'Sync required', matches: (resource) => resource.status === 'update_available' },
  { id: 'synced', label: 'In sync', matches: (resource) => resource.status === 'synced' },
  { id: 'migrating', label: 'Processing', matches: (resource) => resource.status === 'migrating' },
  { id: 'all', label: 'All', matches: () => true },
];

const readOpenGroups = (params, groupIds) => {
  const value = params.get('groups');
  if (value === null) {
    const firstGroupId = [...groupIds][0];
    return new Set(firstGroupId ? [firstGroupId] : []);
  }
  return new Set(value.split(',').filter((id) => id && id !== 'none' && groupIds.has(id)));
};

export default function ProxiesStep({ selected, setSelected, search, params, setParam, resourceTypeIds, onBack, onNext }) {
  const activeFilter = FILTERS.some((filter) => filter.id === params.get('filter')) ? params.get('filter') : 'attention';
  const filter = FILTERS.find((item) => item.id === activeFilter);
  const scopedGroups = RESOURCE_GROUPS.filter((group) => resourceTypeIds.has(group.id));
  const scopedGroupIds = new Set(scopedGroups.map((group) => group.id));
  const scopedResources = scopedGroups.flatMap((group) => group.items);
  const openGroups = readOpenGroups(params, scopedGroupIds);
  const normalizedSearch = search.trim().toLowerCase();
  const selectedResources = scopedResources.filter((resource) => selected.has(resource.id));
  const importCount = selectedResources.filter((resource) => getProxyOperation(resource) === 'import').length;
  const resyncCount = selectedResources.length - importCount;

  const visibleItems = (group) => group.items.filter((resource) => (
    filter.matches(resource) && (!normalizedSearch || resource.name.toLowerCase().includes(normalizedSearch))
  ));

  const toggleGroup = (groupId) => {
    const next = new Set(openGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setParam('groups', next.size ? [...next].join(',') : 'none');
  };

  const toggleResource = (resourceId) => {
    const next = new Set(selected);
    if (next.has(resourceId)) next.delete(resourceId);
    else next.add(resourceId);
    setSelected(next);
  };

  const selectGroup = (group) => {
    const next = new Set(selected);
    visibleItems(group).filter(isProxySelectable).forEach((resource) => next.add(resource.id));
    setSelected(next);
  };

  const selectAllActionable = () => {
    setSelected(new Set(scopedResources.filter((resource) => (
      ['missing', 'update_available'].includes(resource.status) && isProxySelectable(resource)
    )).map((resource) => resource.id)));
  };

  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro
        eyebrow="Step 2 of 6"
        title="Choose resources to import or resync"
        description="Review only the resource types selected in Source, then choose the individual resources to import, sync, or resync."
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-dark-700">
        <div className="flex max-w-full flex-wrap gap-x-5 gap-y-2">
          {FILTERS.map((item) => {
            const count = scopedResources.filter(item.matches).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setParam('filter', item.id)}
                className={cn(
                  '-mb-px whitespace-nowrap border-b-2 pb-3 text-xs font-semibold transition',
                  activeFilter === item.id ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300',
                )}
              >
                {item.label} <span className="ml-1 text-[10px] text-gray-500">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative mb-2 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            className="h-9 w-full rounded-lg border border-dark-600 bg-dark-800/60 pl-9 pr-3 text-xs text-white outline-none focus:border-primary/60"
            value={search}
            onChange={(event) => setParam('q', event.target.value)}
            placeholder="Search all resources"
          />
        </div>
      </div>

      <div className="divide-y divide-dark-700 border-y border-dark-700">
        {scopedGroups.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-gray-300">No resource types selected</p>
            <p className="mt-1 text-xs text-gray-500">Return to Source and choose at least one resource type to analyze.</p>
          </div>
        )}
        {scopedGroups.map((group) => {
          const items = visibleItems(group);
          const expanded = openGroups.has(group.id);
          const groupSelected = group.items.filter((resource) => selected.has(resource.id)).length;
          const missing = group.items.filter((resource) => resource.status === 'missing').length;
          const updates = group.items.filter((resource) => resource.status === 'update_available').length;
          const current = group.items.filter((resource) => resource.status === 'synced').length;

          if (items.length === 0 && normalizedSearch) return null;

          return (
            <div key={group.id}>
              <button type="button" onClick={() => toggleGroup(group.id)} className="group flex w-full items-center gap-4 py-4 text-left">
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200', !expanded && '-rotate-90')} />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"><Layers3 className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{group.label}</span>
                    <span className="rounded-full bg-dark-700 px-2 py-0.5 text-[10px] font-medium text-gray-400">{group.scope}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-gray-500">{group.description}</span>
                </span>
                <span className="hidden items-center gap-4 text-[11px] lg:flex">
                  {missing > 0 && <span className="text-blue-400">{missing} to import</span>}
                  {updates > 0 && <span className="text-amber-300">{updates} to sync</span>}
                  {current > 0 && <span className="text-emerald-400">{current} in sync</span>}
                </span>
                <span className={cn('min-w-16 text-right text-xs font-semibold', groupSelected ? 'text-primary' : 'text-gray-600')}>{groupSelected ? `${groupSelected} selected` : `${group.items.length} total`}</span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                    <div className="pb-5 pl-0 sm:pl-12">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] text-gray-600">{items.length} visible · {group.delivery === 'bundle' ? 'Bundle and SCM delivery' : 'Database record synchronization'}</p>
                        {items.some(isProxySelectable) && <button type="button" onClick={() => selectGroup(group)} className="text-[11px] font-semibold text-primary hover:text-primary/80">Select visible in group</button>}
                      </div>
                      {items.length ? (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1080px] text-left">
                            <thead>
                              <tr className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                <th className="w-10 py-2" />
                                <th className="py-2">Resource</th>
                                <th className="py-2">Action</th>
                                <th className="py-2">ForgeSphere version</th>
                                <th className="py-2">Source version</th>
                                <th className="py-2">Last changed</th>
                                <th className="py-2">Target / dependency</th>
                                <th className="py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700/80">
                              {items.map((resource) => {
                                const selectable = isProxySelectable(resource);
                                const checked = selected.has(resource.id);
                                const operation = getProxyOperation(resource);
                                const actionLabel = resource.status === 'migrating'
                                  ? 'Running'
                                  : operation === 'import'
                                    ? 'Import new'
                                    : resource.status === 'update_available' ? 'Sync latest' : 'Force resync';
                                return (
                                  <tr key={resource.id} className={cn('transition-colors', selectable && 'hover:bg-dark-800/30')}>
                                    <td className="py-3">
                                      <button type="button" disabled={!selectable} onClick={() => toggleResource(resource.id)} className={cn('flex h-5 w-5 items-center justify-center rounded border transition', checked ? 'border-primary bg-primary text-white' : 'border-dark-500 bg-dark-800', !selectable && 'cursor-not-allowed opacity-30')} aria-label={`Select ${resource.name}`}>
                                        {checked && <Check className="h-3 w-3" />}
                                      </button>
                                    </td>
                                    <td className="py-3">
                                      <span className="block text-xs font-semibold text-white">{resource.name}</span>
                                      <span className="mt-0.5 block text-[10px] text-gray-600">{resource.resourceType}</span>
                                    </td>
                                    <td className={cn('py-3 text-[11px] font-semibold', operation === 'import' ? 'text-blue-400' : 'text-violet-300')}>{actionLabel}</td>
                                    <td className="py-3 text-xs text-gray-400">{getResourceCurrentVersion(resource)}</td>
                                    <td className="py-3 text-xs font-semibold text-gray-200">{getResourceSourceVersion(resource)}</td>
                                    <td className="py-3 text-[11px] text-gray-500">{resource.deployedAt}</td>
                                    <td className="py-3">
                                      {resource.repository ? <><span className="block font-mono text-[11px] text-gray-300">{resource.repository}</span><span className="block text-[10px] text-gray-600">{resource.branch}</span></> : resource.dependencies?.length ? <><span className="block text-[11px] text-gray-400">Depends on {resource.dependencies.length}</span><span className="block max-w-44 truncate text-[10px] text-gray-600">{resource.dependencies.join(', ')}</span></> : <span className="text-[11px] text-gray-600">{resource.delivery === 'bundle' ? 'New SCM repository' : 'ForgeSphere configuration DB'}</span>}
                                      {resource.sensitive && <span className="mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase text-amber-300/80"><LockKeyhole className="h-2.5 w-2.5" /> Sensitive values masked</span>}
                                    </td>
                                    <td className="py-3"><StatusPill status={resource.status} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="py-5 text-xs text-gray-600">No resources match the current filter.</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <StickyFooter className="justify-between">
        <div className="flex items-center gap-4">
          <button type="button" className="text-xs font-semibold text-primary hover:text-primary/80" onClick={selectAllActionable}>Select all action required</button>
          {selected.size > 0 && <button type="button" className="text-xs font-semibold text-gray-500 hover:text-gray-300" onClick={() => setSelected(new Set())}>Clear</button>}
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && <span className="hidden text-xs text-gray-500 sm:inline">{importCount} imports · {resyncCount} resyncs · {new Set(selectedResources.map((resource) => resource.groupId)).size} types</span>}
          <button type="button" className={SECONDARY_BUTTON} onClick={onBack}>Back</button>
          <button type="button" className={PRIMARY_BUTTON} disabled={selected.size === 0} onClick={onNext}>Continue with {selected.size || 0} <ArrowRight className="h-4 w-4" /></button>
        </div>
      </StickyFooter>
    </motion.div>
  );
}
