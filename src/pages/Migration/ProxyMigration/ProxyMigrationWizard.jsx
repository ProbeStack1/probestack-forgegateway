import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, History, Layers3 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConnectorStep from './ConnectorStep';
import DestinationStep from './DestinationStep';
import HistoryView from './HistoryView';
import ProgressStep from './ProgressStep';
import ProxiesStep from './ProxiesStep';
import ReviewStep from './ReviewStep';
import SourceStep from './SourceStep';
import {
  ALL_DISCOVERED_RESOURCES,
  PREVIEW_ROUTE_DEFAULTS,
  STAGES,
  StepBar,
} from './shared';

export default function ProxyMigrationWizard() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const [discovering, setDiscovering] = useState(false);
  const [starting, setStarting] = useState(false);
  const stageParam = params.get('stage') || 'source';
  const stage = STAGES.some((item) => item.id === stageParam) ? stageParam : 'source';
  const view = params.get('view');

  const profile = params.get('profile') || PREVIEW_ROUTE_DEFAULTS.profile;
  const org = params.get('org') || PREVIEW_ROUTE_DEFAULTS.org;
  const env = params.get('env') || PREVIEW_ROUTE_DEFAULTS.env;
  const search = params.get('q') || '';
  const resourceTypes = useMemo(() => {
    const routeValue = params.get('resourceTypes');
    const value = routeValue === null ? PREVIEW_ROUTE_DEFAULTS.resourceTypes : routeValue;
    return new Set(value.split(',').filter((id) => id && id !== 'none'));
  }, [params]);
  const selected = useMemo(() => {
    const routeValue = params.get('selected');
    const value = routeValue === null ? PREVIEW_ROUTE_DEFAULTS.selected : routeValue;
    return new Set(value.split(',').filter((id) => id && id !== 'none'));
  }, [params]);
  const scopedResources = useMemo(
    () => ALL_DISCOVERED_RESOURCES.filter((resource) => resourceTypes.has(resource.groupId)),
    [resourceTypes],
  );
  const selectedResources = useMemo(
    () => scopedResources.filter((resource) => selected.has(resource.id)),
    [scopedResources, selected],
  );

  const setParam = (key, value, replace = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, String(value));
      return next;
    }, { replace });
  };

  const setParams = (updates, replace = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, { replace });
  };

  const setSelected = (nextSelected) => setParams({
    selected: nextSelected.size ? [...nextSelected].join(',') : 'none',
    connectorValidated: '',
  });

  const setResourceTypes = (nextResourceTypes) => {
    const nextTypeSet = new Set(nextResourceTypes);
    const retainedSelection = ALL_DISCOVERED_RESOURCES
      .filter((resource) => nextTypeSet.has(resource.groupId) && selected.has(resource.id))
      .map((resource) => resource.id);
    setParams({
      resourceTypes: nextResourceTypes.length ? nextResourceTypes.join(',') : 'none',
      selected: retainedSelection.length ? retainedSelection.join(',') : 'none',
      groups: nextResourceTypes[0] || 'none',
      filter: 'attention',
      q: '',
      connectorValidated: '',
      draftId: '',
    });
  };

  const goStage = (nextStage, extra = {}) => {
    const next = new URLSearchParams(params);
    next.delete('view');
    next.set('stage', nextStage);
    Object.entries(PREVIEW_ROUTE_DEFAULTS).forEach(([key, value]) => {
      if (!next.has(key)) next.set(key, value);
    });
    Object.entries(extra).forEach(([key, value]) => {
      if (value) next.set(key, String(value));
      else next.delete(key);
    });
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startDiscovery = () => {
    setDiscovering(true);
    window.setTimeout(() => {
      setDiscovering(false);
      goStage('proxies', { draftId: 'RMD-20260827-01' });
    }, 750);
  };

  const startMigration = () => {
    setStarting(true);
    window.setTimeout(() => {
      setStarting(false);
      goStage('progress', { jobId: 'RMJ-20260827-01' });
    }, 800);
  };

  const showHistory = () => {
    const next = new URLSearchParams(params);
    next.set('view', 'history');
    setSearchParams(next);
  };

  const startAnotherMigration = () => {
    setSearchParams({ stage: 'source' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStage = () => {
    if (view === 'history') {
      return (
        <HistoryView
          onBack={() => setParam('view', '')}
          onResume={(jobId) => goStage('progress', { jobId })}
        />
      );
    }

    switch (stage) {
      case 'source':
        return (
          <SourceStep
            profile={profile}
            org={org}
            env={env}
            resourceTypes={[...resourceTypes]}
            onResourceTypesChange={setResourceTypes}
            setParams={setParams}
            onDiscover={startDiscovery}
            discovering={discovering}
          />
        );
      case 'proxies':
        return (
          <ProxiesStep
            selected={selected}
            setSelected={setSelected}
            search={search}
            params={params}
            setParam={setParam}
            resourceTypeIds={resourceTypes}
            onBack={() => goStage('source')}
            onNext={() => goStage('destination')}
          />
        );
      case 'destination':
        return (
          <DestinationStep
            params={params}
            setParams={setParams}
            selectedProxies={selectedResources}
            onBack={() => goStage('proxies')}
            onNext={() => goStage('connector')}
          />
        );
      case 'connector':
        return (
          <ConnectorStep
            params={params}
            setParam={setParam}
            setParams={setParams}
            selectedProxies={selectedResources}
            org={org}
            env={env}
            onBack={() => goStage('destination')}
            onNext={() => goStage('review')}
          />
        );
      case 'review':
        return (
          <ReviewStep
            params={params}
            selectedProxies={selectedResources}
            org={org}
            env={env}
            onBack={() => goStage('connector')}
            onStart={startMigration}
            starting={starting}
          />
        );
      case 'progress':
        return (
          <ProgressStep
            selectedProxies={selectedResources.length ? selectedResources : scopedResources.slice(0, 3)}
            params={params}
            onNewMigration={startAnotherMigration}
            openProxyId={params.get('resource') || params.get('proxy') || ''}
            onOpenProxy={(resourceId) => setParam('resource', resourceId, false)}
            onCloseProxy={() => setParam('resource', '')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#0e172a]">
      <main className="mx-auto flex h-full max-w-[1500px] flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 -mt-4 flex h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-dark-700 bg-[#0e172a] px-1">
          <button
            type="button"
            onClick={() => navigate('/gateway/proxy')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to APIs
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showHistory}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-gray-400 transition hover:bg-dark-800/60 hover:text-white"
            >
              <History className="h-4 w-4" /> History
            </button>
            <div className="mx-1 h-5 w-px bg-dark-600" />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Layers3 className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-white">ForgeSphere Resource Migration</span>
            </div>
          </div>
        </header>

        <div className={view ? 'flex min-h-0 flex-1' : 'flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[170px_minmax(0,1fr)] lg:items-start lg:gap-6'}>
          {!view && <aside className="self-start overflow-visible lg:h-fit"><StepBar stage={stage} onStageChange={goStage} /></aside>}
          <section className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl border border-dark-700 bg-dark-700/25 px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:px-8 lg:px-9">
            <AnimatePresence mode="wait" initial={false}>
              <React.Fragment key={view || stage}>{renderStage()}</React.Fragment>
            </AnimatePresence>
          </section>
        </div>
      </main>
    </div>
  );
}
