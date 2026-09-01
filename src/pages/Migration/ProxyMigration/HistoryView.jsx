import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  SECONDARY_BUTTON,
  SectionIntro,
  StickyFooter,
  StatusPill,
  stageMotion,
} from './shared';

const JOBS = [
  { id: 'RMJ-20260827-01', source: 'forgesphere-nonprod / dev', operation: 'Mixed', count: 12, status: 'processing', updated: 'Just now' },
  { id: 'RMJ-20260826-03', source: 'forgesphere-nonprod / dev', operation: 'Resync', count: 8, status: 'completed', updated: '26 Aug 2026' },
  { id: 'RMJ-20260824-04', source: 'forgesphere-prod / prod', operation: 'Import', count: 5, status: 'completed', updated: '24 Aug 2026' },
  { id: 'RMJ-20260821-02', source: 'digital-sandbox / test', operation: 'Resync', count: 4, status: 'failed', updated: '21 Aug 2026' },
];

export default function HistoryView({ onBack, onResume }) {
  return (
    <motion.div {...stageMotion} className="flex min-h-full flex-col">
      <SectionIntro eyebrow="Resource operations" title="Import and resync history" description="Return to running jobs, inspect completed operations, or retry failed resource items." />
      <div className="divide-y divide-dark-700 border-y border-dark-700">
        {JOBS.map((job) => (
          <div key={job.id} className="grid items-center gap-4 py-5 lg:grid-cols-[170px_1fr_1fr_120px_110px]">
            <div><p className="text-xs font-semibold text-white">{job.id}</p><p className="mt-1 text-[11px] text-gray-500">{job.updated}</p></div>
            <div><p className="text-xs text-gray-500">Source</p><p className="mt-1 text-sm text-gray-200">{job.source}</p></div>
            <div><p className="text-xs text-gray-500">Operation</p><p className="mt-1 text-sm text-gray-200">{job.operation} · {job.count} resources</p></div>
            <StatusPill status={job.status} />
            <button type="button" onClick={() => onResume(job.id)} className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-primary hover:text-primary/80">{job.status === 'failed' ? 'Retry' : 'Open'} <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <StickyFooter><button type="button" className={SECONDARY_BUTTON} onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back to operations</button></StickyFooter>
    </motion.div>
  );
}
