import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import {
  ENVIRONMENTS,
  ORGANIZATIONS,
  PRIMARY_BUTTON,
  RESOURCE_GROUPS,
  SOURCE_PROFILES,
  Field,
  MultiSelectDropdown,
  SectionIntro,
  SelectDropdown,
  StickyFooter,
  stageMotion,
} from './shared';

export default function SourceStep({ profile, org, env, resourceTypes, onResourceTypesChange, setParams, onDiscover, discovering }) {
  const organizations = ORGANIZATIONS[profile] || [];
  const ready = Boolean(profile && org && env && resourceTypes.length);
  const resourceTypeOptions = RESOURCE_GROUPS.map((group) => ({
    value: group.id,
    label: group.label,
    description: group.description,
    meta: group.delivery === 'bundle' ? 'Bundle' : 'DB record',
  }));

  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro
        eyebrow="Step 1 of 6"
        title="Choose source and resource types"
        description="Select the ForgeSphere environment and only the resource types to analyze for import or synchronization."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="ForgeSphere connection">
              <SelectDropdown
                value={profile}
                placeholder="Select a connection"
                options={SOURCE_PROFILES.map((item) => ({ value: item.id, label: item.name, description: item.detail }))}
                onChange={(nextValue) => setParams({ profile: nextValue, org: '', env: '', selected: 'none', draftId: '' })}
              />
            </Field>
          </div>
          <Field label="ForgeSphere organization">
            <SelectDropdown
              value={org}
              options={organizations}
              placeholder="Select organization"
              disabled={!profile}
              onChange={(nextValue) => setParams({ org: nextValue, env: '', selected: 'none', draftId: '' })}
            />
          </Field>
          <Field label="Environment" hint="Deployments and environment-scoped configuration are discovered from this environment.">
            <SelectDropdown
              value={env}
              options={ENVIRONMENTS.map((item) => ({ value: item, label: item.toUpperCase() }))}
              placeholder="Select environment"
              disabled={!org}
              onChange={(nextValue) => setParams({ env: nextValue, selected: 'none', draftId: '' })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Resource types" hint="Only selected types will be requested from ForgeSphere and shown in the Resources step.">
              <MultiSelectDropdown
                values={resourceTypes}
                options={resourceTypeOptions}
                placeholder="Select resource types"
                onChange={onResourceTypesChange}
              />
            </Field>
          </div>
        </div>

        <div className="border-l border-dark-700 pl-0 lg:pl-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-white">Read-only discovery</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                Discovery does not create or update any ForgeSphere resource. Migration data stays isolated until final success.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-xs text-gray-400">
            <div className="flex items-center justify-between border-b border-dark-700 pb-3"><span>Connection</span><span className="font-medium text-gray-200">{profile ? 'Ready' : 'Not selected'}</span></div>
            <div className="flex items-center justify-between border-b border-dark-700 pb-3"><span>Organization</span><span className="max-w-[170px] truncate font-medium text-gray-200">{org || 'Not selected'}</span></div>
            <div className="flex items-center justify-between border-b border-dark-700 pb-3"><span>Environment</span><span className="font-medium uppercase text-gray-200">{env || '—'}</span></div>
            <div className="flex items-center justify-between"><span>Resource types</span><span className="font-medium text-gray-200">{resourceTypes.length ? `${resourceTypes.length} selected` : 'Not selected'}</span></div>
          </div>
        </div>
      </div>

      <StickyFooter className="justify-end">
        <button type="button" className={PRIMARY_BUTTON} disabled={!ready || discovering} onClick={onDiscover}>
          {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {discovering ? 'Analyzing resources' : `Analyze ${resourceTypes.length || 0} resource type${resourceTypes.length === 1 ? '' : 's'}`}
        </button>
      </StickyFooter>
    </motion.div>
  );
}
