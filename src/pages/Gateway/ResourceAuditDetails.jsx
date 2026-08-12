import React from "react";

const display = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const date = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const raw = String(value).trim();
  const parsed = /^-?\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
};

export default function ResourceAuditDetails({
  audit,
  revisions,
  latestRevision,
  showHistory = true,
  showAuditDates = true,
  showDeleted = false,
  showSourceStatus = true,
  showCreatorModifier = true,
}) {
  const registry = audit?.registry || {};
  const history = audit?.history || [];
  const fields = [
    ...(showSourceStatus ? [["Source", registry.source], ["Status", registry.status]] : []),
    ...(showCreatorModifier ? [["Created by", registry.createdBy]] : []),
    ...(showAuditDates ? [["Created at", date(registry.createdAt)]] : []),
    ...(showCreatorModifier ? [["Last modified by", registry.updatedBy]] : []),
    ...(showAuditDates ? [["Last modified at", date(registry.updatedAt)]] : []),
    ...(showDeleted ? [["Deleted by", registry.deletedBy], ["Deleted at", date(registry.deletedAt)]] : []),
  ];
  const sortedRevisions = Array.isArray(revisions)
    ? [...revisions].sort((a, b) => Number(b) - Number(a))
    : null;

  return (
    <div className="space-y-3">
      {fields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-3">
              <div className="text-[11px] uppercase tracking-wide text-[#5a6a8a]">{label}</div>
              <div className="mt-1 break-words text-sm text-white">{display(value)}</div>
            </div>
          ))}
        </div>
      )}

      {sortedRevisions && (
        <details className="rounded-2xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] shadow-xl overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Revisions</span>
            <span className="rounded-full bg-[#1a1f2e] px-2 py-0.5 text-xs text-slate-400">{sortedRevisions.length}</span>
          </summary>
          <div className="border-t border-[#2a3550] p-3">
            {sortedRevisions.length === 0 ? (
              <p className="text-sm text-slate-500">No revisions found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedRevisions.map((rev) => (
                  <span key={rev} className="rounded-md border border-[#2a3550] bg-[#1a1f2e] px-2.5 py-1 text-xs text-slate-200">
                    Revision {rev}
                    {String(rev) === String(latestRevision) && <span className="ml-1.5 text-[#ff8a5c]">(latest)</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {showHistory && (
        <details className="rounded-2xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] shadow-xl overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Change history</span>
            <span className="rounded-full bg-[#1a1f2e] px-2 py-0.5 text-xs text-slate-400">{history.length}</span>
          </summary>
          <div className="border-t border-[#2a3550] p-3">
            {history.length === 0 ? <p className="text-sm text-slate-500">No tracked changes found.</p> : (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <details key={entry._id || index} className="rounded-lg border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-3">
                    <summary className="cursor-pointer list-none text-sm text-white">
                      <span className="mr-3 rounded bg-[#ff5b1f]/15 px-2 py-1 text-xs text-[#ff8a5c]">{entry.operation}</span>
                      <span className="text-slate-400">{date(entry.performedAt)}</span>
                      <span className="ml-3 text-slate-300">by {display(entry.createdBy)}</span>
                    </summary>
                    <div className="mt-3 grid grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
                      {[["Request", entry.requestPayload], ["Before", entry.beforeSnapshot], ["After", entry.afterSnapshot]].map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-1 text-[#5a6a8a]">{label}</div>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-slate-300">{display(value)}</pre>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
