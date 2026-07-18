import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { complianceService } from "../../services/complianceService";
import { owaspService } from "../../services/owaspService";

const formatDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

// One-line cell that ellipsizes and exposes the full value via `title` (native
// tooltip) once it's longer than 12 characters, so long ids/names/emails never
// wrap or blow out the row height.
const TruncCell = ({ value }) => {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <span title={text.length > 12 ? text : undefined} className="block max-w-[220px] truncate">
      {text}
    </span>
  );
};

const HistoryView = ({ defaultFamily = "compliance", projectName, onBack, onOpenScan }) => {
  const [family, setFamily] = useState(defaultFamily);
  // "current" = scope by the proxy I'm looking at, "all" = every APIGEE scan.
  const [scope, setScope] = useState("current");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const svc = family === "owasp" ? owaspService.getOwaspScanHistory : complianceService.getComplianceScanHistory;
    const res = await svc({
      projectName: scope === "current" && projectName ? projectName : undefined,
      assetType: scope === "current" ? "APIGEE" : undefined,
      page,
      size,
    });
    setLoading(false);
    if (res.success) {
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } else setError(res.error);
  }, [family, projectName, page, size, scope]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-full flex-col" data-testid="history-view">
      <div className="flex items-start justify-between gap-3 border-b border-[#24304d] px-6 py-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2"
            data-testid="back-to-rules-from-history"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to rules
          </button>
          <h1 className="text-xl font-semibold text-white">Scan history</h1>
          <p className="mt-1 text-xs text-slate-400">
            {scope === "current"
              ? (projectName ? `Showing scans for "${projectName}"` : "Showing recent scans")
              : "Showing every Apigee scan across all proxies."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-[#24304d] bg-[#0b0e16] p-0.5">
            <button
              onClick={() => { setScope("current"); setPage(0); }}
              className={`rounded px-2.5 py-1 text-[11px] font-medium ${scope === "current" ? "bg-orange-500/20 text-orange-100" : "text-slate-400 hover:text-white"}`}
              data-testid="history-scope-current"
            >
              Current
            </button>
            <button
              onClick={() => { setScope("all"); setPage(0); }}
              className={`rounded px-2.5 py-1 text-[11px] font-medium ${scope === "all" ? "bg-orange-500/20 text-orange-100" : "text-slate-400 hover:text-white"}`}
              data-testid="history-scope-all"
            >
              All scans
            </button>
          </div>
          {["compliance", "owasp"].map((f) => (
            <button key={f}
              onClick={() => { setFamily(f); setPage(0); }}
              className={`rounded-md border px-3 py-1.5 text-xs ${family === f ? "border-orange-500/60 bg-orange-500/15 text-white" : "border-[#24304d] bg-[#0b0e16] text-slate-300 hover:border-orange-500/40"}`}
              data-testid={`history-family-${f}`}>
              {f === "owasp" ? "OWASP" : "Compliance"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="m-6 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
        {loading ? (
          <div className="p-6 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No scans for this filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0c1224] text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-2 text-left">Scan id</th>
                <th className="px-6 py-2 text-left">Project</th>
                <th className="px-6 py-2 text-left">Status</th>
                <th className="px-6 py-2 text-left">Results</th>
                <th className="px-6 py-2 text-left">Run by</th>
                <th className="px-6 py-2 text-left">Date</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24304d]">
              {items.map((it) => (
                <tr key={it.scanId} className="hover:bg-[#101935]/40">
                  <td className="px-6 py-2 font-mono text-[11px] text-slate-300"><TruncCell value={it.scanId} /></td>
                  <td className="px-6 py-2 text-slate-200"><TruncCell value={it.projectName} /></td>
                  <td className="px-6 py-2"><TruncCell value={it.status} /></td>
                  <td className="px-6 py-2 text-xs whitespace-nowrap">
                    <span className="text-emerald-300">{it.passed}P</span> ·{" "}
                    <span className="text-rose-300">{it.failed}F</span> ·{" "}
                    <span className="text-slate-400">{it.totalResults}T</span>
                  </td>
                  <td className="px-6 py-2 text-slate-300"><TruncCell value={it.createdBy} /></td>
                  <td className="px-6 py-2 text-slate-400"><TruncCell value={formatDate(it.createDate)} /></td>
                  <td className="px-6 py-2 text-right">
                    <button
                      onClick={() => onOpenScan?.(it.scanId, family)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#24304d] bg-[#0b0e16] px-2 py-1 text-[11px] text-slate-200 hover:border-orange-500/60"
                      data-testid={`history-open-${it.scanId}`}
                    >
                      Open <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-[#24304d] bg-[#0c1224]/40 px-6 py-3 text-xs text-slate-400">
        <span>Total {total} · page {page + 1}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs disabled:opacity-50">Prev</button>
          <button onClick={() => setPage((p) => ((p + 1) * size < total ? p + 1 : p))}
            disabled={(page + 1) * size >= total}
            className="rounded-md border border-[#24304d] bg-[#0b0e16] px-3 py-1 text-xs disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
