import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Layers3 } from 'lucide-react';
import {
  APPLICATIONS,
  BUSINESS_UNITS,
  FIELD_CLASS,
  PREVIEW_ROUTE_DEFAULTS,
  PROJECTS,
  Field,
  SectionIntro,
  SelectDropdown,
  StepActions,
  getProxyOperation,
  stageMotion,
} from './shared';

const APPLICATION_OWNED_TYPES = new Set(['api-proxies', 'shared-flows']);

export default function DestinationStep({ params, setParams, selectedProxies: selectedResources, onBack, onNext }) {
  const businessUnit = params.get('bu') || PREVIEW_ROUTE_DEFAULTS.bu;
  const project = params.get('project') || PREVIEW_ROUTE_DEFAULTS.project;
  const application = params.get('application') || PREVIEW_ROUTE_DEFAULTS.application;
  const applicationId = params.get('applicationId') || PREVIEW_ROUTE_DEFAULTS.applicationId;
  const projects = PROJECTS[businessUnit] || [];
  const applications = APPLICATIONS[project] || [];
  const imports = selectedResources.filter((resource) => getProxyOperation(resource) === 'import');
  const resyncs = selectedResources.filter((resource) => getProxyOperation(resource) === 'resync');
  const ownershipImports = imports.filter((resource) => APPLICATION_OWNED_TYPES.has(resource.groupId));
  const inheritedTargets = selectedResources.filter((resource) => !ownershipImports.includes(resource));
  const requiresMapping = ownershipImports.length > 0;

  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro
        eyebrow="Step 3 of 6"
        title="Confirm ownership and resource scope"
        description="Assign new proxy and shared-flow bundles to a ForgeSphere application. Every other resource type remains a database-backed ForgeSphere configuration record with its existing organization or environment scope."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          {requiresMapping && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business unit"><SelectDropdown value={businessUnit} options={BUSINESS_UNITS} placeholder="Select business unit" onChange={(nextValue) => setParams({ bu: nextValue, project: '', application: '', applicationId: '' })} /></Field>
              <Field label="Project"><SelectDropdown value={project} disabled={!businessUnit} options={projects} placeholder="Select project" onChange={(nextValue) => setParams({ project: nextValue, application: '', applicationId: '' })} /></Field>
              <Field label="Application">
                <SelectDropdown
                  value={application}
                  disabled={!project}
                  options={applications.map((item) => ({ value: item.name, label: item.name, description: item.id }))}
                  placeholder="Select application"
                  onChange={(nextValue) => {
                    const next = applications.find((item) => item.name === nextValue);
                    setParams({ application: nextValue, applicationId: next?.id || '' });
                  }}
                />
              </Field>
              <Field label="Application ID" hint={`Applied to ${ownershipImports.length} new catalog resource${ownershipImports.length === 1 ? '' : 's'}.`}><input className={FIELD_CLASS} value={applicationId} readOnly /></Field>
            </div>
          )}

          <div className={requiresMapping ? 'mt-7 border-t border-dark-700 pt-5' : 'border-y border-dark-700 py-1'}>
            <div className="mb-2 flex items-center gap-2"><Layers3 className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">Preserved and inherited targets</h3></div>
            <p className="mb-3 text-xs leading-5 text-gray-500">Resync ownership is locked. Operational configuration remains scoped to the selected ForgeSphere organization or environment.</p>
            <div className="divide-y divide-dark-700">
              {inheritedTargets.map((resource) => (
                <div key={resource.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_150px_1fr] sm:items-center">
                  <span className="truncate text-xs font-medium text-gray-200">{resource.name}</span>
                  <span className="text-[11px] text-gray-500">{resource.resourceType}</span>
                  <span className="text-right text-[11px] text-gray-400">{resource.application || resource.scope}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-l border-dark-700 pl-0 lg:pl-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Building2 className="h-4 w-4 text-primary" /> Ownership summary</div>
          <dl className="space-y-3 text-xs">
            {requiresMapping && <div><dt className="text-gray-500">New catalog destination</dt><dd className="mt-1 font-medium text-gray-200">{application || 'Not selected'}</dd></div>}
            {requiresMapping && <div><dt className="text-gray-500">Application ID</dt><dd className="mt-1 font-medium text-gray-200">{applicationId || '—'}</dd></div>}
            <div><dt className="text-gray-500">Imports</dt><dd className="mt-1 font-medium text-gray-200">{imports.length}</dd></div>
            <div><dt className="text-gray-500">Resyncs</dt><dd className="mt-1 font-medium text-gray-200">{resyncs.length}</dd></div>
            <div><dt className="text-gray-500">Resource types</dt><dd className="mt-1 font-medium text-gray-200">{new Set(selectedResources.map((resource) => resource.groupId)).size}</dd></div>
          </dl>
          <div className="mt-5 space-y-2 border-t border-dark-700 pt-4">
            {selectedResources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-gray-300">{resource.name}</span><span className={getProxyOperation(resource) === 'import' ? 'text-blue-400' : 'text-violet-300'}>{getProxyOperation(resource)}</span></div>
            ))}
          </div>
        </div>
      </div>
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={requiresMapping && !applicationId} nextLabel="Continue to delivery" />
    </motion.div>
  );
}
