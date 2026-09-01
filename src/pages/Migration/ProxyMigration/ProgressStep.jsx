import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Layers3, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  SECONDARY_BUTTON,
  SectionIntro,
  StickyFooter,
  StatusPill,
  getProxyOperation,
  getResourceCurrentVersion,
  getResourceSourceVersion,
  stageMotion,
} from './shared';

const bundleImportStages = ['Dependencies verified', 'Bundle downloaded', 'CI/CD workflow added', 'Repository created', 'ForgeSphere resource finalized'];
const bundleResyncStages = ['Latest source version verified', 'Existing repository and branch resolved', 'Bundle downloaded', 'Bundle content replaced', 'Existing branch updated', 'ForgeSphere version synchronized'];
const configImportStages = ['Dependencies verified', 'Configuration fetched', 'Sensitive values protected', 'Database record created', 'Relationships linked', 'State finalized'];
const configResyncStages = ['Latest source state verified', 'Existing database record resolved', 'Configuration fetched', 'Record differences applied', 'Relationships revalidated', 'State synchronized'];

const getStages = (item) => {
  if (item.delivery === 'bundle') return item.operation === 'import' ? bundleImportStages : bundleResyncStages;
  return item.operation === 'import' ? configImportStages : configResyncStages;
};

export default function ProgressStep({ selectedProxies: selectedResources, params, onNewMigration, openProxyId, onOpenProxy, onCloseProxy }) {
  const items = selectedResources.map((resource, index) => {
    const operation = getProxyOperation(resource);
    const bundle = resource.delivery === 'bundle';
    const status = index === 0 ? 'completed' : index === 1 ? 'processing' : 'queued';
    return {
      ...resource,
      operation,
      bundle,
      target: bundle ? `ForgeCrux/${resource.repository || resource.name}` : `ForgeSphere configuration DB · ${resource.scope}`,
      targetBranch: bundle ? (resource.branch || params.get('branch') || 'develop') : null,
      status,
      stage: status === 'completed'
        ? (bundle ? 'Repository and state finalized' : 'Database record finalized')
        : status === 'processing'
          ? (bundle ? 'Updating repository content' : 'Updating database record')
          : 'Waiting for dependencies',
      progress: status === 'completed' ? 100 : status === 'processing' ? 64 : 8,
    };
  });
  const completed = items.filter((item) => item.status === 'completed').length;
  const overall = items.length ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length) : 0;
  const openItem = items.find((item) => item.id === openProxyId);

  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro eyebrow={`Job ${params.get('jobId') || 'RMJ-20260827-01'}`} title="Resource operations are running" description="ForgeSphere processes dependencies before dependants. You can leave safely and reopen this job from migration history." />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-dark-700 pb-6">
        <div><div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-white">{overall}%</span><span className="text-xs text-gray-500">overall progress</span></div><div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-dark-700"><motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${overall}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div></div>
        <div className="flex gap-6 text-xs"><div><span className="block text-lg font-bold text-white">{items.length}</span><span className="text-gray-500">Total</span></div><div><span className="block text-lg font-bold text-emerald-400">{completed}</span><span className="text-gray-500">Completed</span></div><div><span className="block text-lg font-bold text-blue-400">{items.filter((item) => item.status === 'processing').length}</span><span className="text-gray-500">In progress</span></div></div>
      </div>

      <div className="divide-y divide-dark-700">
        {items.map((item) => (
          <div key={item.id} className="grid items-center gap-4 py-5 lg:grid-cols-[1.3fr_1fr_170px_100px]">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 shrink-0 text-blue-400" /><span className="truncate text-sm font-semibold text-white">{item.name}</span><span className={item.operation === 'import' ? 'text-[9px] font-semibold uppercase text-blue-400' : 'text-[9px] font-semibold uppercase text-violet-300'}>{item.operation}</span></div>
              <p className="mt-1 truncate pl-6 text-[11px] text-gray-500">{item.resourceType} · {item.target}{item.targetBranch ? ` · ${item.targetBranch}` : ''} · {item.operation === 'import' ? getResourceSourceVersion(item) : `${getResourceCurrentVersion(item)} → ${getResourceSourceVersion(item)}`}</p>
            </div>
            <div><div className="mb-2 flex justify-between text-[11px]"><span className="text-gray-400">{item.stage}</span><span className="text-gray-600">{item.progress}%</span></div><div className="h-1 overflow-hidden rounded-full bg-dark-700"><motion.div className={cn('h-full rounded-full', item.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500')} initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ duration: 0.65 }} /></div></div>
            <StatusPill status={item.status} />
            <button type="button" onClick={() => onOpenProxy(item.id)} className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-white">Details <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <StickyFooter className="justify-between"><button type="button" className={SECONDARY_BUTTON}><RefreshCw className="h-4 w-4" /> Refresh</button><button type="button" className={SECONDARY_BUTTON} onClick={onNewMigration}>Start another operation</button></StickyFooter>

      <AnimatePresence>
        {openItem && (
          <>
            <motion.button type="button" aria-label="Close operation details" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCloseProxy} />
            <motion.aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-dark-600 bg-[#111b30] px-6 py-7 shadow-2xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400">{openItem.operation} progress</p><h2 className="mt-2 text-lg font-bold text-white">{openItem.name}</h2><p className="mt-1 text-xs text-gray-500">{openItem.resourceType} · {openItem.target}</p></div><button type="button" onClick={onCloseProxy} className="text-gray-500 transition hover:text-white" aria-label="Close details"><XCircle className="h-5 w-5" /></button></div>
              <div className="mt-8"><StatusPill status={openItem.status} /><p className="mt-3 text-sm text-gray-300">{openItem.stage}</p></div>
              <div className="mt-8 space-y-0">
                {getStages(openItem).map((label, index, all) => {
                  const done = openItem.progress >= ((index + 1) / all.length) * 100;
                  return <div key={label} className="flex gap-3"><div className="flex flex-col items-center"><span className={cn('flex h-6 w-6 items-center justify-center rounded-full border', done ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-dark-600 text-gray-600')}>{done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>{index < all.length - 1 && <span className={cn('h-9 w-px', done ? 'bg-emerald-500/25' : 'bg-dark-600')} />}</div><p className={cn('pt-1 text-xs font-medium', done ? 'text-gray-200' : 'text-gray-500')}>{label}</p></div>;
                })}
              </div>
              <div className="mt-8 border-t border-dark-700 pt-5 text-xs">
                <div className="flex justify-between py-2"><span className="text-gray-500">Operation</span><span className="capitalize text-gray-300">{openItem.operation}</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-500">Version</span><span className="text-gray-300">{openItem.operation === 'import' ? getResourceSourceVersion(openItem) : `${getResourceCurrentVersion(openItem)} → ${getResourceSourceVersion(openItem)}`}</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-500">Target</span><span className="max-w-56 truncate text-gray-300">{openItem.target}</span></div>
                {openItem.targetBranch && <div className="flex justify-between py-2"><span className="text-gray-500">Branch</span><span className="text-gray-300">{openItem.targetBranch}</span></div>}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
