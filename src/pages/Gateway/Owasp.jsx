// src/pages/Gateway/Owasp.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Download,
  Play,
  ChevronDown,
  Check,
  Copy,
  Plus,
  Code,
  Database,
  ArrowLeft,
  ShieldAlert,
  Activity,
  TrendingUp,
  Search,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  Server,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { cn } from "../../lib/utils";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { owaspService } from "../../services/owaspService";

/* ─── OWASP Category Mapping (Backend data) ─────────────────── */
const OWASP_CATEGORIES = {
  A01: { rank: "A01:2021", title: "Broken Access Control", emoji: "🔓" },
  A02: { rank: "A02:2021", title: "Cryptographic Failures", emoji: "🔑" },
  A03: { rank: "A03:2021", title: "Injection", emoji: "💉" },
  A04: { rank: "A04:2021", title: "Insecure Design", emoji: "🏗️" },
  A05: { rank: "A05:2021", title: "Security Misconfiguration", emoji: "⚙️" },
  A06: {
    rank: "A06:2021",
    title: "Vulnerable & Outdated Components",
    emoji: "📦",
  },
  A07: {
    rank: "A07:2021",
    title: "Auth & Identification Failures",
    emoji: "🪪",
  },
  A08: {
    rank: "A08:2021",
    title: "Software & Data Integrity Failures",
    emoji: "📋",
  },
  A09: { rank: "A09:2021", title: "Security Logging Failures", emoji: "📝" },
  A10: { rank: "A10:2021", title: "Server-Side Request Forgery", emoji: "🌐" },
};

/* ─── Severity Colors (Dynamic, based on backend data) ──────────── */
const getSeverityStyles = (severity) => {
  const severityMap = {
    CRITICAL: {
      cls: "text-red-400 bg-red-500/10 border-red-500/30",
      dot: "bg-red-400",
    },
    HIGH: {
      cls: "text-orange-400 bg-orange-500/10 border-orange-500/30",
      dot: "bg-orange-400",
    },
    MEDIUM: {
      cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      dot: "bg-yellow-400",
    },
    LOW: {
      cls: "text-green-400 bg-green-500/10 border-green-500/30",
      dot: "bg-green-400",
    },
  };
  return severityMap[severity] || severityMap.MEDIUM;
};

/* ─── Copy button ─────────────────────────────────────────────── */
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#27314e] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-[#ff8a5c]/40 hover:text-white"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

/* ─── Email Report Modal ────────────────────────────────────────── */
const EmailReportModal = ({
  open,
  onClose,
  projectName,
  results,
  owaspRules = [],
}) => {
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);

  const generateReport = () => {
    let r = `OWASP Security Scan Report\n`;
    r += `Generated: ${new Date().toISOString()}\n`;
    r += `Project: ${projectName}\n`;
    r += `Asset Type: APIGEE\n\n`;

    r += `Summary:\n`;
    r += `Total Proxies Scanned: ${Object.keys(results).length}\n`;

    const allResults = Object.values(results).flatMap((pr) =>
      Object.values(pr).flatMap((r) => Object.values(r)),
    );
    const passed = allResults.filter(Boolean).length;
    const total = allResults.length;
    r += `Total Tests: ${total}\n`;
    r += `Passed: ${passed}\n`;
    r += `Failed: ${total - passed}\n\n`;

    r += `Detailed Results:\n`;
    Object.entries(results).forEach(([proxy, categories]) => {
      r += `\n${proxy}:\n`;
      Object.entries(categories).forEach(([cat, tests]) => {
        const info = OWASP_CATEGORIES[cat] || { title: cat };
        const passedTests = Object.values(tests).filter(Boolean).length;
        const totalTests = Object.keys(tests).length;
        r += `  ${info.title}: ${passedTests}/${totalTests} passed\n`;
      });
    });

    r += `\n`;
    return r;
  };

  const report = generateReport();
  const proxyCount = Object.keys(results).length;
  const totalTests = Object.values(results).reduce(
    (s, pr) =>
      s + Object.values(pr).reduce((ss, r) => ss + Object.keys(r).length, 0),
    0,
  );
  const totalPass = Object.values(results).reduce(
    (s, pr) =>
      s +
      Object.values(pr).reduce(
        (ss, r) => ss + Object.values(r).filter(Boolean).length,
        0,
      ),
    0,
  );
  const totalFail = totalTests - totalPass;

  const sendEmail = async () => {
    if (!to.trim()) return;
    const payload = {
      to: to.trim(),
      subject: "OWASP Security Scan Report",
      reportType: "OWASP",
      projectName,
      assetType: "APIGEE",
      from: undefined,
    };
    setSent(true);
    const response = await owaspService.sendReportEmail(payload);
    if (!response.success) {
      window.alert(`Report email failed: ${response.error}`);
      setSent(false);
      return;
    }
    window.alert("Report email request submitted successfully.");
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-[#27314e] bg-[#0d1220] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ff5b1f]/25 bg-[#ff5b1f]/10">
              <Mail className="h-4 w-4 text-[#ff8a5c]" />
            </div>
            Email Scan Report
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {proxyCount} {proxyCount === 1 ? "proxy" : "proxies"} scanned ·{" "}
            {totalFail > 0 ? (
              <span className="text-red-400">
                {totalFail} vulnerabilities found
              </span>
            ) : (
              <span className="text-emerald-400">no vulnerabilities</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Recipient Email *",
                key: "to",
                type: "email",
                ph: "owner@company.com",
                val: to,
                set: setTo,
              },
              {
                label: "Owner Name",
                key: "nm",
                type: "text",
                ph: "Jane Smith",
                val: name,
                set: setName,
              },
            ].map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="h-10 w-full rounded-xl border border-[#27314e] bg-[#080c14] px-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#ff5b1f]/60"
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Report Preview
              </label>
              <CopyBtn text={report} />
            </div>
            <pre className="max-h-60 overflow-auto rounded-xl border border-[#27314e] bg-[#060a10] p-4 font-mono text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
              {report}
            </pre>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[#27314e] bg-transparent px-4 text-sm text-slate-400 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendEmail}
            disabled={!to.trim()}
            className="h-10 rounded-xl bg-[#ff5b1f] px-5 text-sm font-semibold text-white shadow-[0_16px_26px_-18px_rgba(255,91,31,0.9)] transition hover:bg-[#ff6b36] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mail className="mr-2 inline h-4 w-4" />
            {sent ? "Opening mail client…" : "Send Report"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Main component ──────────────────────────────────────────── */
export const OwaspSecurityFramework = () => {
  // Proxy data
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("gen-ai-poc-onboarding");
  const [proxies, setProxies] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(false);

  // OWASP Rules from backend
  const [owaspRules, setOwaspRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // View
  const [view, setView] = useState("grid");
  const [selectedProxy, setSelectedProxy] = useState(null);
  const [selectedOwaspId, setSelectedOwaspId] = useState("A01");

  // Results: { [proxyName]: { [owaspId]: { [testName]: bool } } }
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(new Set()); // Set of proxy names
  const [scanError, setScanError] = useState("");

  // Selection & filter
  const [selectedApis, setSelectedApis] = useState(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [loadingProxyDetail, setLoadingProxyDetail] = useState(false);
  const dropdownRef = useRef(null);

  /* ── Fetch OWASP Rules on mount ─────────────────────────────── */
  useEffect(() => {
    const fetchOwaspRules = async () => {
      setLoadingRules(true);
      try {
        const response = await owaspService.getOwaspRules({
          assetType: "APIGEE",
        });
        if (response.success && response.data?.rules) {
          setOwaspRules(response.data.rules);
        }
      } catch (err) {
        console.error("Failed to fetch OWASP rules:", err);
      } finally {
        setLoadingRules(false);
      }
    };
    fetchOwaspRules();
  }, []);

  /* ── Fetch orgs ─────────────────────────────────────────────── */
  const fetchOrgs = useCallback(async () => {
    try {
      const userEmail =
        localStorage.getItem("userEmail") || "admin@forgecrux.com";
      const res = await fetch(
        `https://forgegateway.probestack.io/gatewayonboarding/api/v1/user/${encodeURIComponent(userEmail)}/gateway-organizations`,
      );
      if (!res.ok) return;
      const result = await res.json();
      if (result.status === "SUCCESS" && result.data?.gatewayOrganizations) {
        const names = result.data.gatewayOrganizations.map((o) => o.name);
        setOrganizations(names);
        if (names.length > 0 && !names.includes(selectedOrg))
          setSelectedOrg(names[0]);
      }
    } catch (err) {
      console.error("Failed to fetch orgs:", err);
    }
  }, []);

  /* ── Fetch proxies ──────────────────────────────────────────── */
  const fetchProxies = useCallback(async () => {
    if (!selectedOrg) return;
    setLoadingProxies(true);
    try {
      const token = await fetchApigeeToken();
      const effectiveOrg =
        selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
      const res = await fetch(
        `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/details`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setProxies(data.proxies || []);
    } catch (err) {
      console.error("Failed to fetch proxies:", err);
      setProxies([]);
    } finally {
      setLoadingProxies(false);
    }
  }, [selectedOrg]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);
  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const buildOwaspRuleIds = (assetType) =>
    Object.keys(OWASP_CATEGORIES).map((id) => `OR_${assetType}_${id}`);

  const getCurrentUserEmail = () =>
    localStorage.getItem("userEmail") ||
    localStorage.getItem("email") ||
    "admin@forgecrux.com";

  /* ── Run OWASP tests for a proxy ────────────────────────────── */
  const runTests = useCallback(
    async (proxyName) => {
      setRunning((prev) => new Set([...prev, proxyName]));
      setScanError("");

      const assetType = "APIGEE";
      const payload = {
        assetType,
        projectName: selectedOrg,
        resourceIds: [proxyName],
        rules: {
          ruleTypes: ["PRE_DEFINED"],
          ruleIds: buildOwaspRuleIds(assetType),
        },
        requestedBy: getCurrentUserEmail(),
      };

      try {
        const response = await owaspService.runOwaspCheck(payload);
        if (!response.success) {
          throw new Error(response.error);
        }
        // Create result structure from backend rules
        const proxyResults = {};
        Object.keys(OWASP_CATEGORIES).forEach((owaspId) => {
          proxyResults[owaspId] = {};
          // Since this is async, we show "pending" until results are fetched
        });
        setResults((prev) => ({ ...prev, [proxyName]: proxyResults }));
      } catch (err) {
        console.error("OWASP run failed:", err);
        setScanError(err?.message || "Failed to submit OWASP scan");
      } finally {
        setRunning((prev) => {
          const n = new Set(prev);
          n.delete(proxyName);
          return n;
        });
      }
    },
    [selectedOrg],
  );

  const runSelectedTests = useCallback(() => {
    [...selectedApis].forEach((proxyName, i) =>
      setTimeout(() => runTests(proxyName), i * 500),
    );
  }, [selectedApis, runTests]);

  const toggleSelect = (proxyName, e) => {
    e?.stopPropagation();
    setSelectedApis((prev) => {
      const n = new Set(prev);
      n.has(proxyName) ? n.delete(proxyName) : n.add(proxyName);
      return n;
    });
  };

  const saveResults = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      framework: "ProbeStack OWASP Top 10",
      proxies: Object.entries(results).map(([proxyName, proxyResults]) => ({
        proxy: proxyName,
        categories: Object.entries(proxyResults).map(([owaspId, tests]) => {
          const ruleInfo = OWASP_CATEGORIES[owaspId] || { title: owaspId };
          const passed = Object.values(tests).filter(Boolean).length;
          return {
            owaspId,
            title: ruleInfo.title,
            total: Object.keys(tests).length,
            passed,
            failed: Object.keys(tests).length - passed,
          };
        }),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owasp-scan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Aggregated stats ───────────────────────────────────────── */
  const allRan = Object.values(results).reduce(
    (s, pr) =>
      s + Object.values(pr).reduce((ss, r) => ss + Object.keys(r).length, 0),
    0,
  );
  const allPass = Object.values(results).reduce(
    (s, pr) =>
      s +
      Object.values(pr).reduce(
        (ss, r) => ss + Object.values(r).filter(Boolean).length,
        0,
      ),
    0,
  );
  const allFail = allRan - allPass;
  const passRate = allRan ? Math.round((allPass / allRan) * 100) : 0;
  const hasResults = Object.keys(results).length > 0;

  /* ── Filtered proxies for grid ──────────────────────────────── */
  const filtered = proxies.filter((proxy) => {
    const matchType = typeFilter === "ALL" || proxy.type === typeFilter;
    const matchSrch =
      !search || proxy.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSrch;
  });

  /* ══════════════════════════════════════════════════════════════
     GRID VIEW
  ══════════════════════════════════════════════════════════════ */
  if (view === "grid" || !selectedProxy) {
    return (
      <div className="min-h-full bg-[#0b0e16] p-6 text-white">
        {/* ── Page header ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/20 bg-[#ff5b1f]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff8a5c]">
              <ShieldAlert className="h-3.5 w-3.5" />
              Security Framework
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              OWASP Top 10 Security
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Run automated OWASP Top 10 security tests against your Apigee API
              proxies. All data is fetched from the security backend.
            </p>
          </div>
          <div className="flex gap-2">
            {hasResults && (
              <>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-xl border border-[#27314e] bg-[#15192b] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                >
                  <Mail className="mr-2 h-4 w-4 flex-shrink-0" /> Email Report
                </button>
                <button
                  type="button"
                  onClick={saveResults}
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-xl border border-[#27314e] bg-[#15192b] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                >
                  <Download className="mr-2 h-4 w-4 flex-shrink-0" /> Save JSON
                </button>
              </>
            )}
          </div>
        </div>
        {scanError && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-200">
            {scanError}
          </div>
        )}

        {/* ── Summary cards ───────────────────────────────────── */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "APIs Loaded",
              value: proxies.length,
              icon: Server,
              color: "text-blue-400",
            },
            {
              label: "OWASP Rules",
              value: Object.keys(OWASP_CATEGORIES).length,
              icon: Shield,
              color: "text-amber-400",
            },
            {
              label: "Scans Run",
              value: Object.keys(results).length,
              icon: Activity,
              color: "text-emerald-400",
            },
            {
              label: "Tests Passed",
              value: allPass,
              icon: CheckCircle2,
              color: "text-green-400",
            },
            {
              label: "Tests Failed",
              value: allFail,
              icon: XCircle,
              color: "text-red-400",
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-[#27314e] bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {card.value}
                  </p>
                </div>
                <card.icon className={cn("h-8 w-8 opacity-40", card.color)} />
              </div>
            </motion.div>
          ))}
        </section>

        {/* ── Proxies ─────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Apigee Proxies
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select and run security tests
              </p>
            </div>
            {selectedApis.size > 0 && (
              <button
                type="button"
                onClick={runSelectedTests}
                disabled={running.size > 0 || loadingRules}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ff5b1f] px-4 text-sm font-semibold text-white transition hover:bg-[#ff6b36] disabled:opacity-50"
              >
                {running.size > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run {selectedApis.size}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[#27314e]">
            <div className="border-b border-[#27314e] px-4 py-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search proxies…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {loadingProxies ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No proxies found
              </div>
            ) : (
              <div className="divide-y divide-[#27314e]">
                {filtered.map((proxy) => (
                  <motion.div
                    key={proxy.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex cursor-pointer items-center gap-3 border-l-4 border-l-transparent px-4 py-3 transition hover:border-l-[#ff5b1f] hover:bg-white/[0.02]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedApis.has(proxy.name)}
                      onChange={(e) => toggleSelect(proxy.name, e)}
                      className="h-4 w-4 rounded border-[#27314e] bg-[#080c14]"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{proxy.name}</p>
                      <p className="text-xs text-slate-400">
                        {proxy.type || "REST"}
                      </p>
                    </div>
                    {running.has(proxy.name) && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#ff5b1f]" />
                    )}
                    {results[proxy.name] && !running.has(proxy.name) && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Email Modal ─────────────────────────────────────── */}
        <EmailReportModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          projectName={selectedOrg}
          results={results}
          owaspRules={owaspRules}
        />
      </div>
    );
  }

  return null;
};
