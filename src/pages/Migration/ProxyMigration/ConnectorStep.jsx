import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Github, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  FIELD_CLASS,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  Field,
  SectionIntro,
  SelectDropdown,
  StickyFooter,
  getProxyOperation,
  stageMotion,
} from './shared';

export default function ConnectorStep({ params, setParam, setParams, selectedProxies: selectedResources, org, env, onBack, onNext }) {
  const branch = params.get('branch') || 'develop';
  const visibility = params.get('visibility') || 'PRIVATE';
  const validated = params.get('connectorValidated') === 'true';
  const [validating, setValidating] = useState(false);
  const bundleResources = selectedResources.filter((resource) => resource.delivery === 'bundle');
  const bundleImports = bundleResources.filter((resource) => getProxyOperation(resource) === 'import');
  const configurationResources = selectedResources.filter((resource) => resource.delivery !== 'bundle');
  const secureResources = selectedResources.filter((resource) => resource.delivery === 'secure_configuration');

  const validate = () => {
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      setParam('connectorValidated', 'true');
    }, 650);
  };

  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro
        eyebrow="Step 4 of 6"
        title="Review delivery targets"
        description="Only API proxies and shared flows use bundle download and SCM repositories. Every other resource type is synchronized as a record in the existing ForgeSphere configuration database collections."
      />

      {bundleResources.length > 0 && <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="SCM provider"><div className={cn(FIELD_CLASS, 'flex items-center gap-2')}><Github className="h-4 w-4" /> GitHub</div></Field>
        <Field label="GitHub organization"><div className={cn(FIELD_CLASS, 'flex items-center')}>ForgeCrux</div></Field>
        <Field label="New bundle branch"><input className={FIELD_CLASS} disabled={bundleImports.length === 0} value={branch} onChange={(event) => setParams({ branch: event.target.value, connectorValidated: '' })} /></Field>
        <Field label="New repository visibility">
          <SelectDropdown
            value={visibility}
            disabled={bundleImports.length === 0}
            options={[
              { value: 'PRIVATE', label: 'Private', description: 'Visible only to authorized members' },
              { value: 'PUBLIC', label: 'Public', description: 'Visible to everyone' },
            ]}
            placeholder="Select visibility"
            onChange={(nextValue) => setParams({ visibility: nextValue, connectorValidated: '' })}
          />
        </Field>
      </div>}

      {configurationResources.length > 0 && (
        <div className={cn('flex flex-wrap items-center justify-between gap-4 border-y border-dark-700 py-4', bundleResources.length > 0 && 'mt-7')}>
          <div>
            <p className="text-sm font-semibold text-white">ForgeSphere configuration database</p>
            <p className="mt-1 text-xs text-gray-500">Products, apps, developers and environment configuration are stored through the existing type-specific collections.</p>
          </div>
          <div className="text-right"><span className="block text-sm font-semibold text-gray-200">{configurationResources.length} records</span><span className="text-[11px] text-emerald-400">Database mappings ready</span></div>
        </div>
      )}

      <div className="mt-8 border-t border-dark-700 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div><h3 className="text-sm font-semibold text-white">Resource delivery plan</h3><p className="mt-1 text-xs text-gray-500">Only proxy/shared-flow rows receive SCM targets. All remaining rows update database records.</p></div>
          {validated && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Validated</span>}
        </div>
        <div className="divide-y divide-dark-700">
          {selectedResources.map((resource) => {
            const bundle = resource.delivery === 'bundle';
            const operation = getProxyOperation(resource);
            const target = bundle
              ? `ForgeCrux/${resource.repository || `${resource.name}-${resource.groupId === 'shared-flows' ? 'sf' : 'px'}`}`
              : 'ForgeSphere configuration DB';
            const targetDetail = bundle ? (resource.branch || branch) : resource.scope;
            return (
              <div key={resource.id} className="grid items-center gap-2 py-4 sm:grid-cols-[1fr_100px_1.2fr_130px]">
                <div><span className="block text-sm font-medium text-white">{resource.name}</span><span className="mt-0.5 block text-[10px] text-gray-600">{resource.resourceType}</span></div>
                <span className={operation === 'import' ? 'text-xs text-blue-400' : 'text-xs text-violet-300'}>{operation}</span>
                <div><span className={cn('block text-xs text-gray-300', bundle && 'font-mono')}>{target}</span><span className="mt-0.5 block text-[11px] text-gray-500">{targetDetail}</span></div>
                <span className="text-right text-xs text-emerald-400">{bundle ? (operation === 'import' ? 'New repository' : 'Existing target') : 'DB mapping ready'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 pb-5 text-[11px] text-gray-600">Target: {org}/{env} · {bundleResources.length} SCM bundles · {configurationResources.length} database records · {secureResources.length} sensitive records</p>

      <StickyFooter className="justify-between">
        <button type="button" className={SECONDARY_BUTTON} onClick={onBack}>Back</button>
        <div className="flex gap-2">
          <button type="button" className={SECONDARY_BUTTON} onClick={validate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {validating ? 'Validating' : 'Validate delivery'}
          </button>
          <button type="button" className={PRIMARY_BUTTON} onClick={onNext} disabled={!validated || (bundleImports.length > 0 && !branch.trim())}>Continue to review <ArrowRight className="h-4 w-4" /></button>
        </div>
      </StickyFooter>
    </motion.div>
  );
}
