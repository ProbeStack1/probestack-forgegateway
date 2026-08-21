import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertCircle,
    AlertTriangle,
    Activity,
    ArrowDown,
    ArrowUp,
    CheckCircle,
    ChevronDown,
    Gauge,
    Layers,
    Loader2,
    Network,
    Package,
    Plus,
    RefreshCw,
    Search,
    Share2,
    AppWindow,
    XCircle,
    MinusCircle,
} from "lucide-react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from "recharts";
import { Button } from "../components/ui/button";
import { PaginationControls } from "../components/ui/PaginationControls";
import { cn } from "../lib/utils";
import { fetchApigeeToken } from "../services/apigeeToken";
import { fetchApigeeBreakdown, fetchApigeeAggregatedStats } from "../services/apigeeStatsService";
import { formatClockTime, formatFullDateTime } from "../components/monitoring/TrendChart";

// ====================== Constants ======================
const ORG_NAME = "gen-ai-poc-onboarding";

const TIME_RANGE_OPTIONS = [
    { value: "1 day", label: "Last 24 hours" },
    { value: "3 days", label: "Last 3 days" },
    { value: "7 days", label: "Last 7 days" },
    { value: "14 days", label: "Last 14 days" },
];

const HEALTH_SELECTS = ["sum(message_count)", "sum(is_error)", "avg(total_response_time)"];
const ACTIVITY_SELECTS = ["sum(message_count)", "sum(is_error)", "sum(total_response_time)"];

// Status is a fixed, reserved scale — never reused for series identity — so a proxy's
// state always wears the same color regardless of how many other proxies are on screen.
const STATUS_ORDER = ["healthy", "degraded", "critical", "inactive"];
const STATUS_META = {
    healthy: { label: "Healthy", dot: "#22c55e", text: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20", Icon: CheckCircle },
    degraded: { label: "Degraded", dot: "#f59e0b", text: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/20", Icon: AlertTriangle },
    critical: { label: "Critical", dot: "#ef4444", text: "text-rose-300", bg: "bg-rose-400/10", border: "border-rose-400/20", Icon: XCircle },
    inactive: { label: "Inactive", dot: "#64748b", text: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", Icon: MinusCircle },
};

// Fixed-order categorical hues for "by environment" identity (dev/test/prod, ...) —
// assigned in sequence, never re-cycled by rank, and distinct from the status palette above.
const ENV_HUES = ["#38bdf8", "#a78bfa", "#f59e0b", "#34d399", "#f472b6", "#60a5fa"];

const ACTIVITY_TABS = [
    { key: "requests", label: "Requests", color: "#ff5b1f", unit: "" },
    { key: "errors", label: "Errors", color: "#ef4444", unit: "" },
    { key: "latency", label: "Avg Latency", color: "#38bdf8", unit: "ms" },
];

// ====================== Formatting helpers ======================
const formatCompact = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return Math.round(n).toLocaleString();
};
const formatPercent = (n, digits = 1) => (n === null || n === undefined || Number.isNaN(n) ? "—" : `${n.toFixed(digits)}%`);
const formatMs = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : `${Math.round(n).toLocaleString()} ms`);

// A proxy is scored 0-100 from real Apigee traffic: error rate and average latency each
// dock points, capped so one bad dimension can't alone drag it past "critical" territory.
// Proxies with no traffic in the window are "inactive" rather than scored — there's nothing
// to measure. "Uptime" is not an infra heartbeat (Apigee doesn't expose one) — it's the
// window's successful-request rate (100% − error rate), the same substitute the old static
// "98.5% Gateway health score" on this page used, now computed from real traffic.
const classifyHealth = ({ executions, errorRatePct, avgResponseMs, deployed }) => {
    if (!deployed || executions === 0) return { status: "inactive", score: null };
    let score = 100;
    score -= Math.min(errorRatePct * 4, 60);
    score -= Math.min(Math.max(avgResponseMs - 300, 0) / 20, 25);
    score = Math.max(0, Math.min(100, Math.round(score)));
    const status = score < 50 ? "critical" : score < 85 ? "degraded" : "healthy";
    return { status, score };
};

// ====================== Small chart-support pieces ======================
const ChartTooltipShell = ({ children }) => (
    <div className="rounded-lg border border-[#2a3550] bg-[#0e172a]/95 backdrop-blur-sm shadow-xl px-3 py-2 min-w-[150px]">
        {children}
    </div>
);

const DonutTooltip = ({ active, payload, total }) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0]?.payload;
    if (!entry) return null;
    const meta = STATUS_META[entry.key];
    const pct = total > 0 ? (entry.value / total) * 100 : 0;
    return (
        <ChartTooltipShell>
            <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
                <span className="text-[10px] uppercase tracking-wide text-gray-500">{meta.label}</span>
            </div>
            <div className="text-base font-bold text-white leading-none">{entry.value} {entry.value === 1 ? "API" : "APIs"}</div>
            <div className="text-[10px] text-gray-500 mt-1">{formatPercent(pct)} of total</div>
        </ChartTooltipShell>
    );
};

const ActivityTooltip = ({ active, payload, label, tab }) => {
    if (!active || !payload?.length) return null;
    const value = payload[0]?.value ?? 0;
    return (
        <ChartTooltipShell>
            <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tab.color }} />
                <span className="text-[10px] uppercase tracking-wide text-gray-500">{tab.label}</span>
            </div>
            <div className="text-base font-bold text-white leading-none">
                {tab.key === "latency" ? formatMs(value) : Math.round(value).toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{formatFullDateTime(label)}</div>
        </ChartTooltipShell>
    );
};

const HealthBar = ({ score, status }) => {
    const meta = STATUS_META[status];
    if (score === null) {
        return <div className="h-1.5 w-full rounded-full bg-white/5" />;
    }
    return (
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${meta.dot}26` }}>
            <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${score}%`, backgroundColor: meta.dot }}
            />
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status];
    const Icon = meta.Icon;
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", meta.bg, meta.text, meta.border)}>
            <Icon className="h-3 w-3" />
            {meta.label}
        </span>
    );
};

// ====================== Main Gateway Dashboard ======================
export default function GatewayDashboard() {
    const navigate = useNavigate();

    // ========== Base resource states ==========
    const [proxies, setProxies] = useState([]);
    const [sharedFlows, setSharedFlows] = useState([]);
    const [products, setProducts] = useState([]);
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);

    // ========== Filters (the one row every chart below shares) ==========
    const [environment, setEnvironment] = useState("dev");
    const [availableEnvironments, setAvailableEnvironments] = useState([]);
    const [timeRange, setTimeRange] = useState("1 day");

    // ========== Per-proxy health + activity states ==========
    const [proxyStats, setProxyStats] = useState([]);
    const [environmentBreakdown, setEnvironmentBreakdown] = useState([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState(null);

    const [activitySeries, setActivitySeries] = useState({ requests: [], errors: [], latency: [] });
    const [activityTab, setActivityTab] = useState("requests");
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState(null);

    const [sort, setSort] = useState({ key: "executions", dir: "desc" });
    const [hoveredSlice, setHoveredSlice] = useState(null);

    // Table search + status filter + pagination
    const [tableSearch, setTableSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const DEVELOPER_EMAIL = 'jagruti.d@krelixir.com';

    // Derived counts
    const activeProxies = proxies.filter(p => p.status === 'active' || !p.status).length;
    const sharedFlowsCount = sharedFlows.length;
    const publishedProducts = products.length;
    const consumerAppsCount = apps.length;

    // ========== DATA FETCHING FUNCTIONS ==========
    const fetchApigeeResources = async () => {
        const token = await fetchApigeeToken();
        if (!token) return;
        try {
            const [proxiesRes, sharedFlowsRes] = await Promise.all([
                fetch(`https://forgegateway.probestack.io/apigee-wrapper/organizations/${ORG_NAME}/apis/details`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`https://forgegateway.probestack.io/apigee-wrapper/organizations/${ORG_NAME}/sharedflows/details`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            const proxiesData = await proxiesRes.json();
            const sharedFlowsData = await sharedFlowsRes.json();
            setProxies(proxiesData.proxies || []);
            setSharedFlows(sharedFlowsData.sharedflows || sharedFlowsData.sharedFlows || []);
        } catch (err) {
            console.error('Failed to fetch Apigee resources', err);
        }
    };

    const fetchApiProducts = async () => {
        const token = await fetchApigeeToken();
        if (!token) return;
        try {
            const url = `https://apigee.googleapis.com/v1/organizations/${ORG_NAME}/apiproducts`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data.apiProduct || []);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('Products fetch error', err);
            setProducts([]);
        }
    };

    const fetchConsumerApps = async () => {
        const token = await fetchApigeeToken();
        if (!token) return;
        try {
            const url = `https://apigee.googleapis.com/v1/organizations/${ORG_NAME}/developers/${DEVELOPER_EMAIL}/apps`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data?.app) ? data.app.map(item => ({
                    name: item?.appId,
                    appId: item?.appId,
                    status: item?.status || '',
                })) : [];
                setApps(list);
            } else {
                setApps([]);
            }
        } catch (err) {
            console.error('Consumer apps fetch error', err);
            setApps([]);
        }
    };

    const fetchEnvironments = async () => {
        try {
            const token = await fetchApigeeToken();
            if (!token) return;
            const res = await fetch(`https://forgegateway.probestack.io/apigee-wrapper/organizations/${ORG_NAME}/environments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Failed to fetch environments: ${res.status}`);
            const data = await res.json();
            const envs = Array.isArray(data) ? data : (data.environments || []);
            setAvailableEnvironments(envs);
            if (envs.length && !envs.includes(environment)) setEnvironment(envs[0]);
        } catch (err) {
            console.error('Failed to load environments', err);
            setAvailableEnvironments([]);
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        await Promise.all([
            fetchApigeeResources(),
            fetchApiProducts(),
            fetchConsumerApps(),
        ]);
        setLoading(false);
    };

    // Real per-proxy health: one breakdown call per deployed environment (not per proxy —
    // Apigee returns every proxy's totals in a single `dimension=apiproxy` call), merged
    // and scored client-side. Proxies with zero traffic anywhere still get a row (Inactive).
    const loadProxyHealth = async () => {
        setStatsLoading(true);
        setStatsError(null);
        try {
            const token = await fetchApigeeToken();
            if (!token) throw new Error('Could not obtain an Apigee access token');
            const envs = availableEnvironments.length ? availableEnvironments : [environment];

            const perEnv = await Promise.all(
                envs.map((env) =>
                    fetchApigeeBreakdown(token, env, 'apiproxy', HEALTH_SELECTS, timeRange)
                        .then((rows) => ({ env, rows, failed: false }))
                        .catch((err) => { console.error(`Stats fetch failed for ${env}`, err); return { env, rows: [], failed: true }; })
                )
            );

            const byProxy = new Map();
            perEnv.forEach(({ env, rows }) => {
                rows.forEach((row) => {
                    const executions = row['sum(message_count)'] || 0;
                    const errors = row['sum(is_error)'] || 0;
                    const avgResponseMs = row['avg(total_response_time)'] || 0;
                    const prev = byProxy.get(row.name) || { name: row.name, executions: 0, errors: 0, latencySum: 0, latencyWeight: 0, envs: [] };
                    prev.executions += executions;
                    prev.errors += errors;
                    if (executions > 0) {
                        prev.latencySum += avgResponseMs * executions;
                        prev.latencyWeight += executions;
                        if (!prev.envs.includes(env)) prev.envs.push(env);
                    }
                    byProxy.set(row.name, prev);
                });
            });

            proxies.forEach((p) => {
                if (!p?.name) return;
                if (!byProxy.has(p.name)) {
                    byProxy.set(p.name, { name: p.name, executions: 0, errors: 0, latencySum: 0, latencyWeight: 0, envs: [] });
                }
            });

            const rows = Array.from(byProxy.values()).map((p) => {
                const errorRatePct = p.executions > 0 ? (p.errors / p.executions) * 100 : 0;
                const avgResponseMs = p.latencyWeight > 0 ? p.latencySum / p.latencyWeight : 0;
                const { status, score } = classifyHealth({ executions: p.executions, errorRatePct, avgResponseMs, deployed: p.envs.length > 0 });
                const uptime = p.executions > 0 ? Math.max(0, 100 - errorRatePct) : null;
                return { name: p.name, executions: p.executions, errorRatePct, avgResponseMs, status, score, uptime, envs: p.envs };
            });

            setProxyStats(rows);

            const envBreakdown = perEnv.map(({ env, rows: r, failed }) => {
                const executions = r.reduce((sum, row) => sum + (row['sum(message_count)'] || 0), 0);
                const errors = r.reduce((sum, row) => sum + (row['sum(is_error)'] || 0), 0);
                return {
                    name: env,
                    executions,
                    errorRatePct: executions > 0 ? (errors / executions) * 100 : 0,
                    proxyCount: r.filter((row) => (row['sum(message_count)'] || 0) > 0).length,
                    failed,
                };
            });
            setEnvironmentBreakdown(envBreakdown);
        } catch (err) {
            console.error('Failed to load proxy health stats', err);
            setStatsError(err.message);
            setProxyStats([]);
            setEnvironmentBreakdown([]);
        } finally {
            setStatsLoading(false);
        }
    };

    // Org-wide 24-hour activity — requests/errors are real per-bucket sums; latency is a
    // weighted average (sum(total_response_time) / sum(message_count) per bucket) rather
    // than an average-of-averages, so it stays mathematically correct across many proxies.
    const loadActivity = async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            const token = await fetchApigeeToken();
            if (!token) throw new Error('Could not obtain an Apigee access token');
            const { series } = await fetchApigeeAggregatedStats(token, environment, 'apiproxy', ACTIVITY_SELECTS, timeRange);
            const requests = series['sum(message_count)'] || [];
            const errors = series['sum(is_error)'] || [];
            const totalTime = series['sum(total_response_time)'] || [];
            const latency = requests.map((pt, i) => ({
                timestamp: pt.timestamp,
                value: pt.value > 0 ? (totalTime[i]?.value || 0) / pt.value : 0,
            }));
            setActivitySeries({ requests, errors, latency });
        } catch (err) {
            console.error('Failed to load activity series', err);
            setActivityError(err.message);
            setActivitySeries({ requests: [], errors: [], latency: [] });
        } finally {
            setActivityLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
        fetchEnvironments();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (proxies.length) loadProxyHealth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proxies, availableEnvironments, timeRange]);

    useEffect(() => {
        if (environment) loadActivity();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [environment, timeRange]);

    const handleRefreshAll = () => {
        loadDashboardData();
        loadProxyHealth();
        loadActivity();
    };

    // ========== Derived aggregates ==========
    const healthCounts = useMemo(() => {
        const counts = { healthy: 0, degraded: 0, critical: 0, inactive: 0 };
        proxyStats.forEach((p) => { counts[p.status] += 1; });
        return STATUS_ORDER.map((key) => ({ key, name: STATUS_META[key].label, value: counts[key] }));
    }, [proxyStats]);
    const totalScored = proxyStats.length;

    const orgAverages = useMemo(() => {
        const withTraffic = proxyStats.filter((p) => p.executions > 0);
        const totalExecutions = withTraffic.reduce((s, p) => s + p.executions, 0);
        const totalErrors = withTraffic.reduce((s, p) => s + (p.executions * p.errorRatePct) / 100, 0);
        const avgScore = withTraffic.length ? withTraffic.reduce((s, p) => s + p.score, 0) / withTraffic.length : null;
        const errorRatePct = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;
        return {
            totalExecutions,
            errorRatePct,
            uptime: totalExecutions > 0 ? Math.max(0, 100 - errorRatePct) : null,
            avgScore,
        };
    }, [proxyStats]);

    const sortedProxyStats = useMemo(() => {
        const rows = [...proxyStats];
        const { key, dir } = sort;
        rows.sort((a, b) => {
            let av = a[key];
            let bv = b[key];
            if (key === "name") { av = av || ""; bv = bv || ""; return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av); }
            av = av === null || av === undefined ? -1 : av;
            bv = bv === null || bv === undefined ? -1 : bv;
            return dir === "asc" ? av - bv : bv - av;
        });
        return rows;
    }, [proxyStats, sort]);

    const toggleSort = (key) => {
        setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
    };

    const filteredProxyStats = useMemo(() => {
        const term = tableSearch.trim().toLowerCase();
        return sortedProxyStats.filter((p) => {
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (term && !p.name.toLowerCase().includes(term)) return false;
            return true;
        });
    }, [sortedProxyStats, tableSearch, statusFilter]);

    const paginatedProxyStats = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredProxyStats.slice(start, start + pageSize);
    }, [filteredProxyStats, page, pageSize]);

    // Any change to what's included resets to page 1 so the current page can't land past the end
    useEffect(() => { setPage(1); }, [tableSearch, statusFilter, environment, sort]);

    const activeTab = ACTIVITY_TABS.find((t) => t.key === activityTab);
    const activeSeries = activitySeries[activityTab] || [];
    const maxEnvExecutions = Math.max(1, ...environmentBreakdown.map((e) => e.executions));

    // ========== UI COMPONENTS ==========
    const gatewaySummaryCards = [
        { label: "APIs", value: activeProxies, helper: totalScored ? `${healthCounts.find(h => h.key === 'healthy')?.value ?? 0} healthy of ${totalScored}` : "Serving production traffic", icon: Layers, tone: "text-sky-300" },
        { label: "Functions", value: sharedFlowsCount, helper: "Reusable shared flows", icon: Share2, tone: "text-purple-400" },
        { label: "Products", value: publishedProducts, helper: "Published API packages", icon: Package, tone: "text-amber-300" },
        { label: "Consumer Apps", value: consumerAppsCount, helper: "Approved applications", icon: AppWindow, tone: "text-rose-300" },
    ];

    return (
        <div className="min-h-full p-6 text-white">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5b1f]/20 bg-[#ff5b1f]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff8a5c]">
                        <Network className="h-3.5 w-3.5" />
                        Gateway Management
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                        Gateway Dashboard
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        Monitor APIs, functions, products, and consumer apps.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        type="button"
                        className="h-11 rounded-xl bg-[#ff5b1f] px-5 text-sm font-semibold text-white shadow-[0_16px_26px_-18px_rgba(255,91,31,0.9)] hover:bg-[#ff6b36]"
                        onClick={() => navigate("/gateway/onboarding")}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Onboard Resource
                    </Button>
                    <Button
                        variant="outline"
                        className="h-11 rounded-xl border-[#27314e] bg-[#15192b] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]"
                        onClick={handleRefreshAll}
                        disabled={loading || statsLoading || activityLoading}
                    >
                        {(loading || statsLoading || activityLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filter row — scopes every chart and the table below it */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative border border-[#27314e] rounded-lg bg-[#111827] focus-within:ring-1 focus-within:ring-[#ff5b1f]">
                    <label className="absolute -top-2 left-3 px-1 text-[10px] font-medium text-slate-500 bg-[#111827]">Environment</label>
                    <select
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="bg-transparent border-0 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none cursor-pointer min-w-[140px]"
                    >
                        {(availableEnvironments.length ? availableEnvironments : [environment]).map((env) => (
                            <option key={env} value={env} className="bg-[#111827] text-white">{env}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative border border-[#27314e] rounded-lg bg-[#111827] focus-within:ring-1 focus-within:ring-[#ff5b1f]">
                    <label className="absolute -top-2 left-3 px-1 text-[10px] font-medium text-slate-500 bg-[#111827]">Time Range</label>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-transparent border-0 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none cursor-pointer min-w-[160px]"
                    >
                        {TIME_RANGE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-[#111827] text-white">{opt.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {statsError && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-rose-300">
                        <AlertCircle className="h-3.5 w-3.5" /> {statsError}
                    </span>
                )}
            </div>

            {/* Gateway Summary Cards */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {gatewaySummaryCards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="group rounded-2xl border border-[#27314e] bg-gradient-to-br from-[#111827] to-[#0f172a] p-5 transition-all duration-300 hover:border-[#ff8a5c]/40 hover:shadow-xl hover:shadow-[#ff5b1f]/5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {item.label}
                                    </div>
                                    {loading ? (
                                        <div className="mt-3 h-9 w-16 animate-pulse rounded bg-white/5" />
                                    ) : (
                                        <div className="mt-3 text-3xl font-bold leading-none text-white">
                                            {item.value}
                                        </div>
                                    )}
                                    <div className="mt-2 text-xs text-slate-500">{item.helper}</div>
                                </div>
                                <div className={cn("rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-all group-hover:scale-110", item.tone)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Operational Health — real computed numbers from the current environment/time range */}
            <section className="mt-6">
                <div className="rounded-2xl border border-[#27314e] bg-[#111827]/95 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-sm font-semibold text-white">Operational Health</div>
                            <div className="mt-1 text-xs text-slate-500">Success rate and traffic across {environment} · {TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label.toLowerCase()}.</div>
                        </div>
                        <div className={cn("rounded-xl border p-3", orgAverages.uptime === null ? "border-slate-400/20 bg-slate-400/10 text-slate-300" : orgAverages.uptime >= 99 ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300")}>
                            <Gauge className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-6">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-5xl font-bold leading-none text-white">
                                    {orgAverages.uptime === null ? "—" : formatPercent(orgAverages.uptime, 1)}
                                </div>
                                <div className="mt-2 text-sm text-slate-400">Successful request rate (uptime)</div>
                            </div>
                            <StatusBadge status={orgAverages.uptime === null ? "inactive" : orgAverages.uptime >= 99 ? "healthy" : orgAverages.uptime >= 95 ? "degraded" : "critical"} />
                        </div>
                        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/5">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#ff5b1f] via-[#ff8a5c] to-[#38bdf8] transition-all duration-700"
                                style={{ width: `${orgAverages.uptime ?? 0}%` }}
                            />
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-[#27314e] bg-white/[0.035] p-4">
                                <div className="text-xs text-slate-500">Total Requests</div>
                                <div className="mt-2 text-xl font-bold text-white" title={orgAverages.totalExecutions.toLocaleString()}>{formatCompact(orgAverages.totalExecutions)}</div>
                            </div>
                            <div className="rounded-xl border border-[#27314e] bg-white/[0.035] p-4">
                                <div className="text-xs text-slate-500">Error Rate</div>
                                <div className="mt-2 text-xl font-bold text-white">{formatPercent(orgAverages.errorRatePct)}</div>
                            </div>
                            <div className="rounded-xl border border-[#27314e] bg-white/[0.035] p-4">
                                <div className="text-xs text-slate-500">Avg Health Score</div>
                                <div className="mt-2 text-xl font-bold text-white">{orgAverages.avgScore === null ? "—" : Math.round(orgAverages.avgScore)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* API Health · 24-Hour Activity · By Environment */}
            <section className="mt-6 grid gap-4 lg:grid-cols-4">
                {/* API Health donut */}
                <div className="lg:col-span-1 rounded-2xl border border-[#27314e] bg-[#111827]/95 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-emerald-400" />
                        <div className="text-sm font-semibold text-white">API Health</div>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">Current status · Live</div>
                    {statsLoading && !proxyStats.length ? (
                        <div className="flex-1 flex items-center justify-center min-h-[220px]">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                        </div>
                    ) : totalScored === 0 ? (
                        <div className="flex-1 flex items-center justify-center min-h-[220px] text-xs text-slate-500 text-center px-4">
                            No proxies found for this organization.
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={healthCounts}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={62}
                                            outerRadius={88}
                                            paddingAngle={healthCounts.filter(h => h.value > 0).length > 1 ? 3 : 0}
                                            startAngle={90}
                                            endAngle={-270}
                                            isAnimationActive
                                            onMouseEnter={(_, idx) => setHoveredSlice(idx)}
                                            onMouseLeave={() => setHoveredSlice(null)}
                                        >
                                            {healthCounts.map((entry, idx) => (
                                                <Cell
                                                    key={entry.key}
                                                    fill={STATUS_META[entry.key].dot}
                                                    stroke="#111827"
                                                    strokeWidth={2}
                                                    opacity={hoveredSlice === null || hoveredSlice === idx ? 1 : 0.45}
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<DonutTooltip total={totalScored} />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 8 }}>
                                    <div className="text-3xl font-bold text-white leading-none">{totalScored}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">Total</div>
                                </div>
                            </div>
                            <div className="mt-3 space-y-2">
                                {healthCounts.map((entry) => {
                                    const meta = STATUS_META[entry.key];
                                    return (
                                        <div key={entry.key} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-2 text-slate-300">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.dot }} />
                                                {meta.label}
                                            </span>
                                            <span className="font-semibold text-white">{entry.value}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* 24-Hour Activity */}
                <div className="lg:col-span-2 rounded-2xl border border-[#27314e] bg-[#111827]/95 p-6 flex flex-col">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-sky-400" />
                                <div className="text-sm font-semibold text-white">Activity — {environment}</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">API events per {timeRange === '1 day' ? 'hour' : 'day'}</div>
                        </div>
                        <div className="flex gap-1 rounded-lg border border-[#27314e] bg-[#0e1420] p-1">
                            {ACTIVITY_TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActivityTab(tab.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
                                        activityTab === tab.key ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tab.color }} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 min-h-[220px]">
                        {activityLoading && !activeSeries.length ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                            </div>
                        ) : activityError ? (
                            <div className="h-full flex items-center justify-center text-xs text-rose-300 text-center px-6">{activityError}</div>
                        ) : activeSeries.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-6">
                                No {activeTab.label.toLowerCase()} recorded for {environment} in this window.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={activeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={activeTab.color} stopOpacity={0.32} />
                                            <stop offset="100%" stopColor={activeTab.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="#232a42" vertical={false} />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={formatClockTime}
                                        stroke="#5b6478"
                                        tick={{ fontSize: 10, fill: "#5b6478" }}
                                        tickLine={false}
                                        axisLine={{ stroke: "#232a42" }}
                                        interval={Math.max(0, Math.floor(activeSeries.length / 7) - 1)}
                                    />
                                    <YAxis
                                        tickFormatter={formatCompact}
                                        stroke="#5b6478"
                                        tick={{ fontSize: 10, fill: "#5b6478" }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={40}
                                    />
                                    <RechartsTooltip
                                        content={<ActivityTooltip tab={activeTab} />}
                                        cursor={{ stroke: activeTab.color, strokeDasharray: "3 3", strokeOpacity: 0.65 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={activeTab.color}
                                        strokeWidth={2}
                                        fill="url(#activityGrad)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: activeTab.color, stroke: "#111827", strokeWidth: 2 }}
                                        isAnimationActive
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* By Environment */}
                <div className="lg:col-span-1 rounded-2xl border border-[#27314e] bg-[#111827]/95 p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-violet-400" />
                        <div className="text-sm font-semibold text-white">By Environment</div>
                    </div>
                    <div className="text-xs text-slate-500 mb-4">Executions in {TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label.toLowerCase()}</div>
                    {statsLoading && !environmentBreakdown.length ? (
                        <div className="flex items-center justify-center min-h-[220px]">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                        </div>
                    ) : environmentBreakdown.length === 0 ? (
                        <div className="flex items-center justify-center min-h-[220px] text-xs text-slate-500 text-center px-4">
                            No environments deployed yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {environmentBreakdown.map((env, idx) => {
                                const color = ENV_HUES[idx % ENV_HUES.length];
                                const healthy = proxyStats.filter((p) => p.envs.includes(env.name) && p.status === "healthy").length;
                                const issues = proxyStats.filter((p) => p.envs.includes(env.name) && (p.status === "degraded" || p.status === "critical")).length;
                                const widthPct = (env.executions / maxEnvExecutions) * 100;
                                return (
                                    <div key={env.name}>
                                        <div className="flex items-center justify-between text-sm mb-1.5">
                                            <span className="flex items-center gap-2 font-semibold text-white">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                {env.name}
                                            </span>
                                            <span className="text-slate-400 font-mono text-xs" title={`${env.executions.toLocaleString()} requests`}>
                                                {env.executions > 0 ? formatCompact(env.executions) : "–"}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${Math.max(widthPct, env.executions > 0 ? 3 : 0)}%`, backgroundColor: color }}
                                            />
                                        </div>
                                        <div className={cn("mt-1.5 text-[11px]", env.failed ? "text-amber-400" : "text-slate-500")}>
                                            {env.failed
                                                ? "stats unavailable"
                                                : env.proxyCount === 0 ? "no traffic" : `${healthy} healthy · ${issues} issues · ${env.proxyCount} total`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* APIs health table */}
            <section className="mt-6">
                <div className="rounded-2xl border border-[#27314e] bg-[#111827]/95 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
                        <div>
                            <div className="text-sm font-semibold text-white">APIs</div>
                            <div className="text-xs text-slate-500 mt-1">Per-proxy health, traffic, and error rate for {environment}.</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    placeholder="Search APIs…"
                                    className="bg-[#0e1420] border border-[#27314e] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff5b1f] w-56"
                                />
                            </div>
                            <div className="relative border border-[#27314e] rounded-lg bg-[#0e1420]">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-transparent border-0 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="all" className="bg-[#0e1420] text-white">All statuses</option>
                                    {STATUS_ORDER.map((key) => (
                                        <option key={key} value={key} className="bg-[#0e1420] text-white">{STATUS_META[key].label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                            {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0e1420] border-y border-[#27314e]">
                                <tr>
                                    {[
                                        { key: "name", label: "API" },
                                        { key: "score", label: "Health Score" },
                                        { key: "executions", label: "Executions" },
                                        { key: "errorRatePct", label: "Error Rate" },
                                        { key: "uptime", label: "Uptime" },
                                    ].map((col) => (
                                        <th
                                            key={col.key}
                                            onClick={() => toggleSort(col.key)}
                                            className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.label}
                                                {sort.key === col.key && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProxyStats.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-xs text-slate-500">
                                            {statsLoading
                                                ? "Loading proxy health…"
                                                : sortedProxyStats.length === 0
                                                    ? "No proxies found for this organization."
                                                    : "No APIs match the current search/filter."}
                                        </td>
                                    </tr>
                                )}
                                {paginatedProxyStats.map((p) => (
                                    <tr key={p.name} className="border-b border-[#1f2840] last:border-0 hover:bg-[#1a1f2e]/60 transition-colors cursor-pointer" onClick={() => navigate(`/gateway/proxy/${p.name}`, { state: { proxy: { name: p.name } } })}>
                                        <td className="p-3">
                                            <div className="font-mono text-sm text-white">{p.name}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">{p.envs.length ? p.envs.join(", ") : "not deployed"}</div>
                                        </td>
                                        <td className="p-3 w-[200px]">
                                            <div
                                                className="flex items-center gap-2"
                                                title={p.score === null ? "No traffic in window" : `Score ${p.score} — ${formatPercent(p.errorRatePct)} errors, ${formatMs(p.avgResponseMs)} avg latency`}
                                            >
                                                <span className="text-sm font-semibold text-white w-8">{p.score ?? "—"}</span>
                                                <HealthBar score={p.score} status={p.status} />
                                                <StatusBadge status={p.status} />
                                            </div>
                                        </td>
                                        <td className="p-3 text-slate-200 font-mono text-sm" title={p.executions.toLocaleString()}>{formatCompact(p.executions)}</td>
                                        <td className="p-3">
                                            <span className={cn("font-mono text-sm", p.executions === 0 ? "text-slate-500" : p.errorRatePct >= 5 ? "text-rose-300" : p.errorRatePct >= 1 ? "text-amber-300" : "text-emerald-300")}>
                                                {p.executions === 0 ? "—" : formatPercent(p.errorRatePct)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-200 font-mono text-sm">{p.uptime === null ? "—" : formatPercent(p.uptime, 1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 pb-5">
                        <PaginationControls
                            currentPage={page}
                            totalItems={filteredProxyStats.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
