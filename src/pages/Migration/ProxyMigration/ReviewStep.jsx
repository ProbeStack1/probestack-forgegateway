import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Play, ShieldCheck } from 'lucide-react';
import {
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SectionIntro,
  StickyFooter,
  getProxyOperation,
  getResourceCurrentVersion,
  getResourceSourceVersion,
  stageMotion,
} from './shared';

export default function ReviewStep({ params, selectedProxies: selectedResources, org, env, onBack, onStart, starting }) {
  const imports = selectedResources.filter((resource) => getProxyOperation(resource) === 'import');
  const resyncs = selectedResources.filter((resource) => getProxyOperation(resource) === 'resync');
  const bundleResources = selectedResources.filter((resource) => resource.delivery === 'bundle');
  const configurationResources = selectedResources.filter((resource) => resource.delivery !== 'bundle');
  const branch = params.get('branch') || 'develop';
  const rows = [
    ['Source', `${org} / ${env}`],
    ['Operations', `${imports.length} imports · ${resyncs.length} resyncs`],
    ['Resource types', `${new Set(selectedResources.map((resource) => resource.groupId)).size} types`],
    ['Delivery', `${bundleResources.length} SCM bundles · ${configurationResources.length} database records`],
    ['Dependency handling', 'Referenced resources processed before dependants'],
  ];

  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro
        eyebrow="Step 5 of 6"
        title="Review the resource migration plan"
        description="Confirm ownership, delivery and version changes before ForgeSphere starts the dependency-aware import and resync job."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="divide-y divide-dark-700 border-y border-dark-700">
            {rows.map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]"><span className="text-xs text-gray-500">{label}</span><span className="text-sm font-medium text-gray-200">{value}</span></div>)}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-lg bg-blue-500/10 px-4 py-3.5 text-xs leading-5 text-blue-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>New records are added only after final success. Resync state changes only after its repository commit or managed configuration update succeeds. Sensitive KVM, app credential and TLS values remain masked.</span>
          </div>
        </div>
        <div className="border-l border-dark-700 pl-0 lg:pl-6">
          <p className="mb-4 text-sm font-semibold text-white">{selectedResources.length} resource operations</p>
          <div className="max-h-[390px] space-y-5 overflow-y-auto pr-2">
            {selectedResources.map((resource) => {
              const operation = getProxyOperation(resource);
              const bundle = resource.delivery === 'bundle';
              const target = bundle ? `ForgeCrux/${resource.repository || resource.name}` : `ForgeSphere configuration DB · ${resource.scope}`;
              return (
                <div key={resource.id}>
                  <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-gray-200">{resource.name}</span><span className={operation === 'import' ? 'font-semibold text-blue-400' : 'font-semibold text-violet-300'}>{operation}</span></div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-gray-500"><span className="truncate">{resource.resourceType} · {target}{bundle ? ` · ${resource.branch || branch}` : ''}</span><span className="shrink-0">{operation === 'import' ? getResourceSourceVersion(resource) : `${getResourceCurrentVersion(resource)} → ${getResourceSourceVersion(resource)}`}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <StickyFooter className="justify-between">
        <button type="button" className={SECONDARY_BUTTON} onClick={onBack}>Back</button>
        <button type="button" className={PRIMARY_BUTTON} onClick={onStart} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {starting ? 'Starting operations' : `Start ${selectedResources.length} operation${selectedResources.length === 1 ? '' : 's'}`}
        </button>
      </StickyFooter>
    </motion.div>
  );
}
