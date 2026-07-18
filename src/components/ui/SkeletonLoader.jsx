import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonBlock({ className, delay = '0ms' }) {
  return (
    <div
      style={{ '--skeleton-delay': delay }}
      className={cn(
        'relative overflow-hidden rounded-md bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]',
        'before:absolute before:-inset-y-2 before:left-0 before:w-1/2 before:-translate-x-full',
        'before:animate-[shimmer_1.55s_ease-in-out_infinite] before:[animation-delay:var(--skeleton-delay)]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'after:absolute after:inset-0 after:animate-pulse after:bg-white/[0.015]',
        className
      )}
    />
  );
}

export function ListSkeleton({ rows = 5, className }) {
  return (
    <div className={cn('divide-y divide-slate-800', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.8fr)_130px_110px_110px_92px] md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock delay={`${index * 90}ms`} className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock delay={`${index * 90 + 70}ms`} className="h-4 w-56 max-w-full" />
              <SkeletonBlock delay={`${index * 90 + 140}ms`} className="mt-2 h-3 w-72 max-w-[80%]" />
            </div>
          </div>
          <SkeletonBlock delay={`${index * 90 + 40}ms`} className="h-4 w-24" />
          <SkeletonBlock delay={`${index * 90 + 80}ms`} className="h-4 w-16" />
          <SkeletonBlock delay={`${index * 90 + 120}ms`} className="h-4 w-24" />
          <SkeletonBlock delay={`${index * 90 + 160}ms`} className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ cards = 8, className }) {
  return (
    <div className={cn('grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4', className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <article key={index} className="rounded-2xl border border-slate-800 bg-[#111827]/75 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SkeletonBlock delay={`${index * 90}ms`} className="h-5 w-4/5" />
              <SkeletonBlock delay={`${index * 90 + 70}ms`} className="mt-3 h-3 w-3/5" />
            </div>
            <SkeletonBlock delay={`${index * 90 + 120}ms`} className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <SkeletonBlock delay={`${index * 90 + 40}ms`} className="h-14 rounded-xl" />
            <SkeletonBlock delay={`${index * 90 + 80}ms`} className="h-14 rounded-xl" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <SkeletonBlock delay={`${index * 90 + 130}ms`} className="h-7 w-24 rounded-full" />
            <SkeletonBlock delay={`${index * 90 + 170}ms`} className="h-9 w-24 rounded-lg" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function HistorySkeleton({ rows = 5, className }) {
  return (
    <div className={cn('divide-y divide-slate-800', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid gap-3 px-5 py-4 md:grid-cols-[120px_120px_minmax(0,1fr)_150px_90px_160px_40px] md:items-center">
          <SkeletonBlock delay={`${index * 80}ms`} className="h-7 w-24 rounded-full" />
          <SkeletonBlock delay={`${index * 80 + 60}ms`} className="h-7 w-24 rounded-full" />
          <div className="min-w-0">
            <SkeletonBlock delay={`${index * 80 + 110}ms`} className="h-4 w-48 max-w-full" />
            <SkeletonBlock delay={`${index * 80 + 160}ms`} className="mt-2 h-3 w-36 max-w-[70%]" />
          </div>
          <SkeletonBlock delay={`${index * 80 + 50}ms`} className="h-4 w-32" />
          <SkeletonBlock delay={`${index * 80 + 100}ms`} className="h-4 w-14" />
          <SkeletonBlock delay={`${index * 80 + 150}ms`} className="h-4 w-36" />
          <SkeletonBlock delay={`${index * 80 + 200}ms`} className="h-4 w-4 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonRows({ columns = 4, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-dark-700">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3">
              <SkeletonBlock
                delay={`${rowIndex * 80 + columnIndex * 50}ms`}
                className={cn(
                  'h-4',
                  columnIndex === columns - 1 ? 'w-28 rounded-full' : 'w-full max-w-[180px]'
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
