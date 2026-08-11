import React from "react";

const display = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const date = (value) => (value ? new Date(value).toLocaleString() : "-");

export default function ResourceAuditDetails({ audit }) {
  const registry = audit?.registry || {};
  const history = audit?.history || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["Created by", registry.createdBy],
          ["Created at", date(registry.createdAt)],
          ["Last modified by", registry.updatedBy],
          ["Last modified at", date(registry.updatedAt)],
          ["Deleted by", registry.deletedBy],
          ["Deleted at", date(registry.deletedAt)],
          ["Source", registry.source],
          ["Status", registry.status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#2a3550] bg-[#0f1117] p-3">
            <div className="text-[11px] uppercase tracking-wide text-[#5a6a8a]">{label}</div>
            <div className="mt-1 break-words text-sm text-white">{display(value)}</div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Revision / change history</h3>
        {history.length === 0 ? <p className="text-sm text-slate-500">No tracked changes found.</p> : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <details key={entry._id || index} className="rounded-lg border border-[#2a3550] bg-[#0f1117] p-3">
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
    </div>
  );
}
