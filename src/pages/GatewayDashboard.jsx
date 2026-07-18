import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertCircle,
    CheckCircle,
    Layers,
    Loader2,
    Network,
    Package,
    Plus,
    RefreshCw,
    Share2,
    AppWindow,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import API_BASE_URL from "../config/apiConfig";

// ====================== Token Helper ======================
const fetchToken = async () => {
    try {
        const res = await fetch('https://forgesphere.probestack.io/apigee-wrapper/auth/apigee/token');
        if (!res.ok) throw new Error(`Token service error: ${res.status}`);
        const data = await res.json();
        return data.access_token;
    } catch (err) {
        console.error('Token fetch error:', err);
        return null;
    }
};

// ====================== Main Gateway Dashboard ======================
export default function GatewayDashboard() {
    const navigate = useNavigate();

    // ========== REAL DATA STATES ==========
    const [proxies, setProxies] = useState([]);
    const [sharedFlows, setSharedFlows] = useState([]);
    const [products, setProducts] = useState([]);
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalRequests: '--',
        avgLatency: '--',
        errorRate: '--',
    });

    const ORG_NAME = 'gen-ai-poc-onboarding';
    const DEVELOPER_EMAIL = 'jagruti.d@krelixir.com';

    // Derived counts
    const activeProxies = proxies.filter(p => p.status === 'active' || !p.status).length;
    const sharedFlowsCount = sharedFlows.length;
    const publishedProducts = products.length;
    const consumerAppsCount = apps.length;

    // ========== DATA FETCHING FUNCTIONS ==========
    const fetchApigeeResources = async () => {
        const token = await fetchToken();
        if (!token) return;
        try {
            const [proxiesRes, sharedFlowsRes] = await Promise.all([
                fetch(`https://forgesphere.probestack.io/apigee-wrapper/organizations/${ORG_NAME}/apis/details`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`https://forgesphere.probestack.io/apigee-wrapper/organizations/${ORG_NAME}/sharedflows/details`, {
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
        const token = await fetchToken();
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
        const token = await fetchToken();
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

    const fetchMetrics = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/gateway/metrics`);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (err) {
            console.error('Metrics fetch error', err);
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        await Promise.all([
            fetchApigeeResources(),
            fetchApiProducts(),
            fetchConsumerApps(),
            fetchMetrics(),
        ]);
        setLoading(false);
    };

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    // ========== UI COMPONENTS ==========
    const gatewaySummaryCards = [
        { label: "APIs", value: activeProxies, helper: "Serving production traffic", icon: Layers, tone: "text-sky-300" },
        { label: "Functions", value: sharedFlowsCount, helper: "Reusable shared flows", icon: Share2, tone: "text-purple-400" },
        { label: "Products", value: publishedProducts, helper: "Published API packages", icon: Package, tone: "text-amber-300" },
        { label: "Consumer Apps", value: consumerAppsCount, helper: "Approved applications", icon: AppWindow, tone: "text-rose-300" },
    ];

    return (
        <div className="min-h-full bg-[#0b0e16] p-6 text-white">
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
                        onClick={loadDashboardData}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
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

            {/* Operational Health */}
            <section className="mt-6">
                <div className="rounded-2xl border border-[#27314e] bg-[#111827]/95 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-sm font-semibold text-white">Operational Health</div>
                            <div className="mt-1 text-xs text-slate-500">Uptime and latency signals across gateway runtime.</div>
                        </div>
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-6">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-5xl font-bold leading-none text-white">98.5%</div>
                                <div className="mt-2 text-sm text-slate-400">Gateway health score</div>
                            </div>
                            <Badge className="border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                                Healthy
                            </Badge>
                        </div>
                        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full w-[98.5%] rounded-full bg-gradient-to-r from-[#ff5b1f] via-[#ff8a5c] to-[#38bdf8]" />
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#27314e] bg-white/[0.035] p-4">
                                <div className="text-xs text-slate-500">Total Requests</div>
                                <div className="mt-2 text-xl font-bold text-white">{metrics.totalRequests}</div>
                            </div>
                            <div className="rounded-xl border border-[#27314e] bg-white/[0.035] p-4">
                                <div className="text-xs text-slate-500">Avg Latency</div>
                                <div className="mt-2 text-xl font-bold text-white">{metrics.avgLatency}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}