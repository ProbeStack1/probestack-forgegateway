import React from "react";
import { cn } from "../../lib/utils";
import { Card } from "./card";

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
    />
  );
}

export function DashboardMetricSkeleton() {
  return (
    <Card className="rounded-[24px] border-white/10 bg-[linear-gradient(180deg,rgba(26,33,56,0.94)_0%,rgba(15,21,38,0.98)_100%)] p-5 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.95)]">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-9 w-16" />
          <Skeleton className="mt-3 h-4 w-32" />
        </div>
        <Skeleton className="h-12 w-12 flex-shrink-0 rounded-2xl" />
      </div>
    </Card>
  );
}

export function DashboardChartSkeleton({ wide = false }) {
  return (
    <Card
      className={cn(
        "rounded-[30px] border-white/10 bg-[linear-gradient(180deg,rgba(29,34,58,0.94)_0%,rgba(12,18,34,0.98)_100%)] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)]",
        wide && "xl:col-span-2"
      )}
    >
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-4 h-7 w-56" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <div className="mt-8 flex min-h-[260px] items-end justify-center gap-5">
        <Skeleton className="h-44 w-10 rounded-full" />
        <Skeleton className="h-56 w-10 rounded-full" />
        <Skeleton className="h-36 w-10 rounded-full" />
        <Skeleton className="h-48 w-10 rounded-full" />
        <Skeleton className="h-28 w-10 rounded-full" />
      </div>
    </Card>
  );
}

export function DashboardActivitySkeleton() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[30px] border-white/10 bg-[linear-gradient(180deg,rgba(29,34,58,0.94)_0%,rgba(12,18,34,0.98)_100%)] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-3 h-4 w-56" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
              <div className="w-full">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[30px] border-white/10 bg-[linear-gradient(180deg,rgba(29,34,58,0.94)_0%,rgba(12,18,34,0.98)_100%)] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)]">
        <Skeleton className="h-3 w-40" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-full">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-3 h-7 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function DashboardResourceSectionSkeleton({ title = "Resources" }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(29,34,58,0.94)_0%,rgba(12,18,34,0.98)_100%)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)]">
      <div className="flex flex-col gap-5 border-b border-white/8 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <div>
              <div className="text-2xl font-semibold text-white">{title}</div>
              <Skeleton className="mt-3 h-4 w-[min(520px,70vw)]" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-12 w-[260px] rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
          <Skeleton className="h-12 w-24 rounded-xl" />
          <Skeleton className="h-12 w-28 rounded-xl" />
          <Skeleton className="h-12 w-28 rounded-xl" />
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4 overflow-hidden px-0 lg:px-14">
          {[0, 1, 2, 3].map((item) => (
            <article
              key={item}
              className="w-[312px] flex-none rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(27,34,57,0.96)_0%,rgba(16,22,38,0.98)_100%)] p-4 sm:w-[330px] xl:w-[350px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-full">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="mt-3 h-3 w-3/5" />
                </div>
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
              <div className="mt-5 flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                {[0, 1, 2, 3].map((field) => (
                  <div key={field}>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-2 h-4 w-24" />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
