// src/components/Gateway/GatewayOverview.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layout,
  Share2,
  Package,
  AppWindow,
  BarChart3,
  LayoutDashboard,
  FileText,
  Server,
  Users,
  Network,
  CpuIcon,
  Rocket,
  TestTube,
  UserCircle,
  Sparkles,
  CirclePower,
  Combine,
  Frame,
  Aperture,
  Newspaper,
  PersonStanding,
  AppWindowIcon,
  Section,
  Logs,
  Shield,
  AlertCircle,
  Clock,
  Database,
  Target,
  BarChart2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { fetchApigeeToken } from "../services/apigeeToken";

// Import all the extracted view components
import { OnboardingView } from "./Gateway/OnboardingView";
import { ProxiesView } from "./Gateway/ProxiesView";
import { SharedFlowsView } from "./Gateway/SharedFlowsView";
import APIProductsManager from "./Gateway/APIProductsManager";
import ApigeeAppsManager from "./Gateway/ApigeeAppsManager";
import ProxyMonitoring from "./ProxyMonitoring";
import ObservabilityErrorCodeAnalysis from "./Observability/ErrorCodeAnalysis";
import ObservabilityLatencyAnalysis from "./Observability/LatencyAnalysis";
import ObservabilityCachePerformance from "./Observability/CachePerformance";
import ObservabilityTargetPerformance from "./Observability/TargetPerformance";
import ObservabilityMonitoringReport from "./Observability/MonitoringReport";
import ApigeeMainPage from "./Apigee/ApigeePage";
import Profile from "./Profile";
import GatewayDashboard from "./GatewayDashboard";
import Governance from "./Governance";
import { Framework } from "./Framework";
import { Automation } from "./Automation";
import GatewayOnboarding from "./Gateway/GatewayOnboarding";
import NewGatewayOnboarding from "./Gateway/NewGatewayOnboarding";
import GatewayHeader from "../components/ui/GatewayHeader";
import APIDeploy from "./APIDeploy";
import APITest from "./APITest";
import { ProxyDetailView } from "./Gateway/ProxyDetailView";
import GatewayEnvironmentsView from "./Gateway/GatewayEnvironmentsView";
import { AddProxiesView } from "./Gateway/AddProxiesView";
import { DevelopersView } from "./Gateway/DevelopersView";
import {OwaspSecurityFramework} from "./Gateway/Owasp";
import GatewayAuditLogs from "./Gateway/GatewayAuditLogs";
import { SharedFlowDetailView } from "./Gateway/SharedFlowDetailView";
import GovernanceTabsPage from "./Gateway/GovernanceTabsPage";

// ====================== Menu Path Helpers ======================
const GATEWAY_MENU_PATHS = {
  "gateway-dashboard": "dashboard",
  "gateway-onboarding": "onboarding",
  "api-proxies": "proxy",
  "shared-flows": "shared-flow",
  "api-products": "products",
  consumer: "consumer",
  developer: "developer",
  framework: "framework",
  compliance: "compliance",
  owasp: "owasp",
  "api-linting": "api-linting",
  automation: "automation",
  "api-metrics": "api-metrics",
  "observability-error-codes": "observability-error-codes",
  "observability-latency": "observability-latency",
  "observability-cache": "observability-cache",
  "observability-target": "observability-target",
  "observability-report": "observability-report",
  environments: "environments",
  "gateway-env": "gateway-env",
  "gateway-profile": "profile",
  "ai-gateway": "ai-gateway",
  "mcp-gateway": "mcp-gateway",
  "forgehub-apis": "forgehub-apis",
  "api-deploy": "api-deploy",
  "api-proxy-test": "proxy-test",
  "audit-logs": "audit-logs",
  governance: "governance",
};

const GATEWAY_PATH_MENU = Object.fromEntries(
  Object.entries(GATEWAY_MENU_PATHS).map(([menu, path]) => [path, menu])
);

const getGatewayMenuFromPath = (pathname) => {
  const match = pathname.match(/^\/gateway\/([^/]+)/);
  const section = match ? match[1] : "";
  return GATEWAY_PATH_MENU[section] || "gateway-onboarding";
};

const getGatewayPath = (menuItem) =>
  `/gateway/${GATEWAY_MENU_PATHS[menuItem] || GATEWAY_MENU_PATHS["gateway-onboarding"]}`;

// ====================== Wrapper for ProxyDetailView ======================
export const ProxyDetailViewWrapper = ({ showMessage, backPath = '/gateway/proxy' }) => {
  const { proxyName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [proxy, setProxy] = useState(null);

  useEffect(() => {
    const proxyFromState = location.state?.proxy;
    if (proxyFromState && proxyFromState.name === proxyName) {
      setProxy(proxyFromState);
      return;
    }

    const fetchProxy = async () => {
      try {
        const token = await fetchApigeeToken();
        const effectiveOrg = "gen-ai-poc-onboarding"; // or from context if needed
        const response = await fetch(
          `https://forgesphere.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/${proxyName}/details`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Proxy not found");
        const data = await response.json();
        // Build a proxy object that matches the expected shape in ProxyDetailView
        setProxy({ name: proxyName, ...data.proxy });
      } catch (err) {
        console.error(err);
        showMessage(`Could not load proxy: ${err.message}`, "error");
        navigate(backPath);
      }
    };

    fetchProxy();
  }, [proxyName, location.state, navigate, showMessage, backPath]);

  if (!proxy) {
    return <div className="p-6 text-center text-slate-400">Loading proxy details...</div>;
  }

  return (
    <ProxyDetailView
      proxy={proxy}
      onBack={() => navigate(backPath)}
      showMessage={showMessage}
      onDeploy={() => {}}
      onDuplicate={() => {}}
      onDelete={() => {}}
      onDevelop={() => {}}
      onDebug={() => {}}
    />
  );
};

// ====================== Wrapper for SharedFlowDetailView ======================
export const SharedFlowDetailViewWrapper = ({ showMessage, backPath = '/gateway/shared-flow' }) => {
  const { sfName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [sharedFlow, setSharedFlow] = useState(null);

  useEffect(() => {
    const sfFromState = location.state?.sharedFlow;
    if (sfFromState && sfFromState.name === sfName) {
      setSharedFlow(sfFromState);
      return;
    }
    // Minimal object — SharedFlowDetailView fetches its own details internally
    setSharedFlow({ name: sfName });
  }, [sfName, location.state]);

  if (!sharedFlow) {
    return <div className="p-6 text-center text-slate-400">Loading shared flow...</div>;
  }

  return (
    <SharedFlowDetailView
      sharedFlow={sharedFlow}
      onBack={() => navigate(backPath)}
      showMessage={showMessage}
    />
  );
};

// ====================== Main GatewayOverview ======================
export const GatewayOverview = ({ showHeader = false, showMessage }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar state
  const [selectedMenuItem, setSelectedMenuItem] = useState("gateway-onboarding");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    proxyDev: true,
    distribution: true,
    analytics: true,
    observability :true,
    management: true,
    deployment: true,

    intelligentGateways: true,
    forgeHub: true,
    audit: true,
  });

  // Sync selectedMenuItem with URL on mount and navigation
  useEffect(() => {
    const menuFromPath = getGatewayMenuFromPath(location.pathname);
    if (selectedMenuItem !== menuFromPath) {
      setSelectedMenuItem(menuFromPath);
    }
  }, [location.pathname, selectedMenuItem]);

  const selectSidebarMenu = (menuItem) => {
    setSelectedMenuItem(menuItem);
    const nextPath = getGatewayPath(menuItem);
    if (location.pathname !== nextPath) navigate(nextPath);
  };

  const toggleSection = (section) => {
    setSectionsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const sidebarItemClass = (active) =>
    cn(
      "group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
      active
        ? "border-[#ff5b1f]/35 bg-[#ff5b1f]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
    );

  const sidebarIconClass = (active, idleTone = "text-slate-500") =>
    cn("h-4 w-4 flex-shrink-0 transition-colors", active ? "text-[#ff8a5c]" : idleTone);

  const sectionHeaderClass =
    "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-300";

  return (
    <div className="flex h-full min-h-0 bg-[#0b0e16]">
      {/* ==================== SIDEBAR ==================== */}
      <aside
        className={`h-full shrink-0 rounded-r-2xl border-r border-[#24304d] bg-[linear-gradient(180deg,#101827_0%,#0b111d_100%)] flex flex-col shadow-[18px_0_45px_-35px_rgba(0,0,0,0.95)] transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo & Collapse Button */}
        <div
          className={cn(
            "border-b border-[#24304d] px-4 py-4",
            sidebarCollapsed ? "flex flex-col items-center gap-3" : "space-y-4"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              sidebarCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <button
              onClick={() => navigate("/")}
              className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-85"
            >
              <img
                src="/assets/justlogo.png"
                alt="ForgeSphere logo"
                className="h-11 w-auto flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/logo.png";
                }}
              />
              {!sidebarCollapsed && (
                <span className="flex min-w-0 flex-col justify-center">
                  <span className="text-[0.65rem] leading-tight text-gray-400">ProbeStack</span>
                  <span className="truncate text-xl font-extrabold leading-tight gradient-text font-heading">
                    ForgeSphere
                  </span>
                </span>
              )}
            </button>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-[#ff8a5c]/35 hover:bg-[#ff5b1f]/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          {!sidebarCollapsed && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff8a5c]">
                Gateway
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-white">Control Center</div>
            </div>
          )}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-[#ff8a5c]/35 hover:bg-[#ff5b1f]/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {/* Primary Items */}
          <div className="space-y-1">
            <div
              className={sidebarItemClass(selectedMenuItem === "gateway-onboarding")}
              onClick={() => selectSidebarMenu("gateway-onboarding")}
            >
              <FileText
                className={sidebarIconClass(selectedMenuItem === "gateway-onboarding", "text-[#ff8a5c]")}
              />
              {!sidebarCollapsed && <span>Onboarding</span>}
            </div>
            <div
              className={sidebarItemClass(selectedMenuItem === "gateway-dashboard")}
              onClick={() => selectSidebarMenu("gateway-dashboard")}
            >
              <LayoutDashboard
                className={sidebarIconClass(selectedMenuItem === "gateway-dashboard", "text-sky-400")}
              />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </div>
          </div>

          {/* Proxy Development Section */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("proxyDev")}>
              {sectionsExpanded.proxyDev ? (
                <ChevronDown className="h-4 w-4 text-[#38bdf8]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#38bdf8]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">API Development</span>
              )}
            </div>
            {sectionsExpanded.proxyDev && (
              <div className="space-y-1 mt-1">
                <div
                  className={sidebarItemClass(selectedMenuItem === "api-proxies")}
                  onClick={() => selectSidebarMenu("api-proxies")}
                >
                  <Layout className={sidebarIconClass(selectedMenuItem === "api-proxies", "text-sky-400")} />
                  {!sidebarCollapsed && <span>API</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "shared-flows")}
                  onClick={() => selectSidebarMenu("shared-flows")}
                >
                  <Share2 className={sidebarIconClass(selectedMenuItem === "shared-flows", "text-emerald-400")} />
                  {!sidebarCollapsed && <span>Function</span>}
                </div>
              </div>
            )}
          </div>

          {/* Distribution Section */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("distribution")}>
              {sectionsExpanded.distribution ? (
                <ChevronDown className="h-4 w-4 text-[#a78bfa]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#a78bfa]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Distribution</span>
              )}
            </div>
            {sectionsExpanded.distribution && (
              <div className="space-y-1 mt-1">
                <div
                  className={sidebarItemClass(selectedMenuItem === "api-products")}
                  onClick={() => selectSidebarMenu("api-products")}
                >
                  <Package className={sidebarIconClass(selectedMenuItem === "api-products", "text-amber-300")} />
                  {!sidebarCollapsed && <span>Product</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "consumer")}
                  onClick={() => selectSidebarMenu("consumer")}
                >
                  <AppWindow className={sidebarIconClass(selectedMenuItem === "consumer", "text-rose-400")} />
                  {!sidebarCollapsed && <span>Consumer</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "developer")}
                  onClick={() => selectSidebarMenu("developer")}
                >
                  <PersonStanding className={sidebarIconClass(selectedMenuItem === "developer", "text-teal-400")} />
                  {!sidebarCollapsed && <span>Developer</span>}
                </div>
              </div>
            )}
          </div>

          {/* Governance Section (Analytics) */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("analytics")}>
              {sectionsExpanded.analytics ? (
                <ChevronDown className="h-4 w-4 text-[#f472b6]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#f472b6]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Governance</span>
              )}
            </div>
            {sectionsExpanded.analytics && (
              <div className="space-y-1 mt-1">
                {/* <div
                  className={sidebarItemClass(selectedMenuItem === "compliance")}
                  onClick={() => selectSidebarMenu("compliance")}
                >
                  <Combine className={sidebarIconClass(selectedMenuItem === "compliance", "text-red-300")} />
                  {!sidebarCollapsed && <span>Compliance</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "owasp")}
                  onClick={() => selectSidebarMenu("owasp")}
                >
                  <Section className={sidebarIconClass(selectedMenuItem === "owasp", "text-yellow-300")} />
                  {!sidebarCollapsed && <span>OWASP 10</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "api-linting")}
                  onClick={() => selectSidebarMenu("api-linting")}
                >
                  <AppWindowIcon className={sidebarIconClass(selectedMenuItem === "api-linting", "text-red-300")} />
                  {!sidebarCollapsed && <span>API Linting</span>}
                </div> */}
                <div
  className={sidebarItemClass(selectedMenuItem === "governance")}
  onClick={() => selectSidebarMenu("governance")}
>
  <Shield className={sidebarIconClass(selectedMenuItem === "governance", "text-indigo-400")} />
  {!sidebarCollapsed && <span>Governance</span>}
</div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "framework")}
                  onClick={() => selectSidebarMenu("framework")}
                >
                  <Frame className={sidebarIconClass(selectedMenuItem === "framework", "text-blue-300")} />
                  {!sidebarCollapsed && <span>Framework</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "automation")}
                  onClick={() => selectSidebarMenu("automation")}
                >
                  <CirclePower className={sidebarIconClass(selectedMenuItem === "automation", "text-green-300")} />
                  {!sidebarCollapsed && <span>Automation</span>}
                </div>
                {/* <div
                  className={sidebarItemClass(selectedMenuItem === "api-metrics")}
                  onClick={() => selectSidebarMenu("api-metrics")}
                >
                  <BarChart3 className={sidebarIconClass(selectedMenuItem === "api-metrics", "text-violet-300")} />
                  {!sidebarCollapsed && <span>API Metrics</span>}
                </div> */}
              </div>
            )}
          </div>
          {/* Observability Section */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("observability")}>
              {sectionsExpanded.observability ? (
                <ChevronDown className="h-4 w-4 text-[#f472b6]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#f472b6]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Observability</span>
              )}
            </div>
            {sectionsExpanded.observability && (
              <div className="space-y-1 mt-1">
                <div
                  className={sidebarItemClass(selectedMenuItem === "api-metrics")}
                  onClick={() => selectSidebarMenu("api-metrics")}
                >
                  <BarChart3 className={sidebarIconClass(selectedMenuItem === "api-metrics", "text-violet-300")} />
                  {!sidebarCollapsed && <span>API Metrics</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "observability-error-codes")}
                  onClick={() => selectSidebarMenu("observability-error-codes")}
                >
                  <AlertCircle className={sidebarIconClass(selectedMenuItem === "observability-error-codes", "text-red-300")} />
                  {!sidebarCollapsed && <span>Error Code Analysis</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "observability-latency")}
                  onClick={() => selectSidebarMenu("observability-latency")}
                >
                  <Clock className={sidebarIconClass(selectedMenuItem === "observability-latency", "text-sky-300")} />
                  {!sidebarCollapsed && <span>Latency Analysis</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "observability-cache")}
                  onClick={() => selectSidebarMenu("observability-cache")}
                >
                  <Database className={sidebarIconClass(selectedMenuItem === "observability-cache", "text-emerald-300")} />
                  {!sidebarCollapsed && <span>Cache Performance</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "observability-target")}
                  onClick={() => selectSidebarMenu("observability-target")}
                >
                  <Target className={sidebarIconClass(selectedMenuItem === "observability-target", "text-amber-300")} />
                  {!sidebarCollapsed && <span>Target Performance</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "observability-report")}
                  onClick={() => selectSidebarMenu("observability-report")}
                >
                  <BarChart2 className={sidebarIconClass(selectedMenuItem === "observability-report", "text-fuchsia-300")} />
                  {!sidebarCollapsed && <span>Report</span>}
                </div>
              </div>
            )}
          </div>

          {/* Management Section */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("management")}>
              {sectionsExpanded.management ? (
                <ChevronDown className="h-4 w-4 text-[#f472b6]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#f472b6]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Management</span>
              )}
            </div>
            {sectionsExpanded.management && (
              <div className="space-y-1 mt-1">
                <div
                  className={sidebarItemClass(selectedMenuItem === "environments")}
                  onClick={() => selectSidebarMenu("environments")}
                >
                  <CpuIcon className={sidebarIconClass(selectedMenuItem === "environments", "text-amber-500")} />
                  {!sidebarCollapsed && <span>Environments</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "gateway-env")}
                  onClick={() => selectSidebarMenu("gateway-env")}
                >
                  <Aperture className={sidebarIconClass(selectedMenuItem === "gateway-env", "text-lime-500")} />
                  {!sidebarCollapsed && <span>Gateway Information</span>}
                </div>
              </div>
            )}
          </div>

          {/* Deployment Section */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("deployment")}>
              {sectionsExpanded.deployment ? (
                <ChevronDown className="h-4 w-4 text-[#34d399]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#34d399]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Deployment</span>
              )}
            </div>
            {sectionsExpanded.deployment && (
              <div className="space-y-1 mt-1">
                <div
                  className={sidebarItemClass(selectedMenuItem === "api-deploy")}
                  onClick={() => selectSidebarMenu("api-deploy")}
                >
                  <Rocket className={sidebarIconClass(selectedMenuItem === "api-deploy", "text-blue-400")} />
                  {!sidebarCollapsed && <span>API Deploy</span>}
                </div>
                <div
                  className={sidebarItemClass(selectedMenuItem === "api-proxy-test")}
                  onClick={() => selectSidebarMenu("api-proxy-test")}
                >
                  <TestTube className={sidebarIconClass(selectedMenuItem === "api-proxy-test", "text-emerald-400")} />
                  {!sidebarCollapsed && <span>API Test</span>}
                </div>
              </div>
            )}
          </div>
          {/* Audit Section */}
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("audit")}>
              {sectionsExpanded.audit ? (
                <ChevronDown className="h-4 w-4 text-[#34d399]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#34d399]" />
              )}
              {!sidebarCollapsed && (
                <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Audit</span>
              )}
            </div>
            {sectionsExpanded.audit && (
              <div className="space-y-1 mt-1">
                <div
                  className={sidebarItemClass(selectedMenuItem === "audit-logs")}
                  onClick={() => selectSidebarMenu("audit-logs")}
                >
                  <Logs className={sidebarIconClass(selectedMenuItem === "audit-logs", "text-green-400")} />
                  {!sidebarCollapsed && <span>Audit Logs</span>}
                </div>
                
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* ==================== MAIN CONTENT AREA (NESTED ROUTES) ==================== */}
      <div className="min-w-0 flex-1 flex flex-col">
        {showHeader && <GatewayHeader />}
        <div className="min-h-0 flex-1 overflow-auto">
          <Routes>
            <Route path="dashboard" element={<GatewayDashboard />} />
            <Route path="onboarding" element={<GatewayOnboarding showMessage={showMessage} />} />
            <Route path="proxy" element={<ProxiesView showMessage={showMessage} />} />
            <Route path="proxy/:proxyName" element={<ProxyDetailViewWrapper showMessage={showMessage} />} />
            <Route path="shared-flow" element={<SharedFlowsView showMessage={showMessage} />} />
            <Route path="shared-flow/:sfName" element={<SharedFlowDetailViewWrapper showMessage={showMessage} />} />
            <Route
              path="products"
              element={
                <APIProductsManager
                  onBack={() => {}}
                  orgId="gen-ai-poc-onboarding"
                  envId="dev"
                  developerEmail="jagruti.d@krelixir.com"
                  showMessage={showMessage}
                />
              }
            />
            <Route
              path="consumer"
              element={
                <ApigeeAppsManager
                  orgId="gen-ai-poc-onboarding"
                  envId="dev"
                  developerEmail="jagruti.d@krelixir.com"
                  showAppIdSec={false}
                />
              }
            />
            <Route path="developer" element={<DevelopersView showMessage={showMessage} />} />
            <Route path="api-metrics" element={<ProxyMonitoring showHeader={false} />} />
            <Route path="observability-error-codes" element={<ObservabilityErrorCodeAnalysis />} />
            <Route path="observability-latency" element={<ObservabilityLatencyAnalysis />} />
            <Route path="observability-cache" element={<ObservabilityCachePerformance />} />
            <Route path="observability-target" element={<ObservabilityTargetPerformance />} />
            <Route path="observability-report" element={<ObservabilityMonitoringReport />} />
            {/* <Route path="compliance" element={<Governance showHeader={false} />} />
            <Route path="owasp" element={<OwaspSecurityFramework showHeader={false} />} />
            <Route path="api-linting" element={<Governance showHeader={false} />} /> */}
            <Route path="governance" element={<GovernanceTabsPage showMessage={showMessage} />} />
            <Route path="framework" element={<Framework showHeader={false} />} />
            <Route path="automation" element={<Automation showHeader={false} />} />
            <Route path="environments" element={<ApigeeMainPage showHeader={false} />} />
            <Route path="gateway-env" element={<GatewayEnvironmentsView showMessage={showMessage} />} />
            <Route path="api-deploy" element={<APIDeploy showHeader={false} isGateway={true} />} />
            <Route path="proxy-test" element={<APITest showHeader={false} isGateway={true} />} />
            <Route path="profile" element={<Profile showHeader={false} />} />
            <Route path="audit-logs" element={<GatewayAuditLogs />} />
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/gateway/onboarding" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};







// // src/components/Gateway/GatewayOverview.jsx
// import React, { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import {
//   ChevronLeft,
//   ChevronRight,
//   ChevronDown,
//   Layout,
//   Share2,
//   Package,
//   AppWindow,
//   BarChart3,
//   LayoutDashboard,
//   FileText,
//   Server,
//   Users,
//   Network,
//   CpuIcon,
//   Rocket,
//   TestTube,
//   UserCircle,
//   Sparkles,
//   CirclePower,
//   Combine,
//   Frame,
// } from "lucide-react";
// import { cn } from "../lib/utils";

// // Import all the extracted view components
// import { OnboardingView } from "./Gateway/OnboardingView";
// import { ProxiesView } from "./Gateway/ProxiesView";
// import { SharedFlowsView } from "./Gateway/SharedFlowsView";
// import APIProductsManager from "./Gateway/APIProductsManager";
// import ApigeeAppsManager from "./Gateway/ApigeeAppsManager";
// import ProxyMonitoring from "./ProxyMonitoring";
// import ApigeeMainPage from "./Apigee/ApigeePage";
// import Profile from "./Profile";
// import GatewayDashboard from "./GatewayDashboard";
// import Governance from "./Governance";
// import { Framework } from "./Framework";
// import { Automation } from "./Automation";
// import GatewayOnboarding from "./Gateway/GatewayOnboarding";
// import NewGatewayOnboarding from "./Gateway/NewGatewayOnboarding";
// import GatewayHeader from "../components/ui/GatewayHeader";
// import APIDeploy from "./APIDeploy";
// import APITest from "./APITest";

// // ====================== Menu Path Helpers ======================
// const GATEWAY_MENU_PATHS = {
//   "gateway-dashboard": "dashboard",
//   "gateway-onboarding": "onboarding",
//   "api-proxies": "proxy",
//   "shared-flows": "shared-flow",
//   "api-products": "products",
//   consumer: "consumer",
//   framework: "framework",
//   compliance: "compliance",
//   automation: "automation",
//   "api-metrics": "api-metrics",
//   environments: "environments",
//   "gateway-profile": "profile",
//   "ai-gateway": "ai-gateway",
//   "mcp-gateway": "mcp-gateway",
//   "forgehub-apis": "forgehub-apis",
//   "api-deploy": "api-deploy",
//   "api-proxy-test": "proxy-test",
// };

// const GATEWAY_PATH_MENU = Object.fromEntries(
//   Object.entries(GATEWAY_MENU_PATHS).map(([menu, path]) => [path, menu])
// );

// const getGatewayMenuFromPath = (pathname) => {
//   const [section = ""] = pathname.replace(/^\/gateway\/?/, "").split("/");
//   return GATEWAY_PATH_MENU[section] || "gateway-onboarding";
// };

// const getGatewayPath = (menuItem) =>
//   `/gateway/${GATEWAY_MENU_PATHS[menuItem] || GATEWAY_MENU_PATHS["gateway-onboarding"]}`;

// export const GatewayOverview = ({ showHeader = false, showMessage }) => {
//   const navigate = useNavigate();
//   const location = useLocation();

//   // Sidebar state
//   const [selectedMenuItem, setSelectedMenuItem] = useState("gateway-onboarding");
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
//   const [sectionsExpanded, setSectionsExpanded] = useState({
//     proxyDev: true,
//     distribution: true,
//     analytics: true,
//     management: true,
//     deployment: true,
//     intelligentGateways: true,
//     forgeHub: true,
//   });

//   // Sync selectedMenuItem with URL on mount and navigation
//   useEffect(() => {
//     const menuFromPath = getGatewayMenuFromPath(location.pathname);
//     if (selectedMenuItem !== menuFromPath) {
//       setSelectedMenuItem(menuFromPath);
//     }
//   }, [location.pathname]);

//   // Helper to update menu and URL
//   const selectSidebarMenu = (menuItem) => {
//     setSelectedMenuItem(menuItem);
//     const nextPath = getGatewayPath(menuItem);
//     if (location.pathname !== nextPath) navigate(nextPath);
//   };

//   const toggleSection = (section) => {
//     setSectionsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
//   };

//   // Sidebar item classes
//   const sidebarItemClass = (active) =>
//     cn(
//       "group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
//       active
//         ? "border-[#ff5b1f]/35 bg-[#ff5b1f]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
//         : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
//     );

//   const sidebarIconClass = (active, idleTone = "text-slate-500") =>
//     cn("h-4 w-4 flex-shrink-0 transition-colors", active ? "text-[#ff8a5c]" : idleTone);

//   const sectionHeaderClass =
//     "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-300";

//   // Render the main content based on selectedMenuItem
//   const renderContent = () => {
//     switch (selectedMenuItem) {
//       case "gateway-onboarding":
//         return <GatewayOnboarding showMessage={showMessage} />;
//       case "api-proxies":
//         return <ProxiesView showMessage={showMessage} />;
//       case "shared-flows":
//         return <SharedFlowsView showMessage={showMessage} />;
//       case "api-products":
//         return (
//           <div className="p-6">
//             <APIProductsManager
//               onBack={() => selectSidebarMenu("api-proxies")}
//               orgId="gen-ai-poc-onboarding"
//               envId="dev"
//               developerEmail="jagruti.d@krelixir.com"
//             />
//           </div>
//         );
//       case "consumer":
//         return (
//           <div className="p-6">
//             <ApigeeAppsManager
//               orgId="gen-ai-poc-onboarding"
//               envId="dev"
//               developerEmail="jagruti.d@krelixir.com"
//               showAppIdSec={false}
//             />
//           </div>
//         );
//       case "api-metrics":
//         return <ProxyMonitoring showHeader={false} />;
//       case "compliance":
//         return <Governance showHeader={false} />;
//       case "framework":
//         return <Framework showHeader={false} />;
//       case "automation":
//         return <Automation showHeader={false} />;
//       case "environments":
//         return <ApigeeMainPage showHeader={false} />;
//       case "api-deploy":
//         return <APIDeploy showHeader={false} isGateway={true}/>;
//       case "api-proxy-test":
//         return <APITest showHeader={false} isGateway={true}/>;
//       case "gateway-profile":
//         return <Profile showHeader={false} />;
//       case "gateway-dashboard":
//         return <GatewayDashboard />;
//       default:
//         return (
//           <div className="p-6 text-center text-[#7f8fa8]">
//             <h2 className="text-xl font-semibold mb-2">
//               {selectedMenuItem.replace("-", " ").toUpperCase()}
//             </h2>
//             <p>Content for {selectedMenuItem} will be displayed here.</p>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="flex h-full min-h-0 bg-[#0b0e16]">
//       {/* ==================== SIDEBAR ==================== */}
//       <aside
//         className={`h-full shrink-0 rounded-r-2xl border-r border-[#24304d] bg-[linear-gradient(180deg,#101827_0%,#0b111d_100%)] flex flex-col shadow-[18px_0_45px_-35px_rgba(0,0,0,0.95)] transition-all duration-300 ${
//           sidebarCollapsed ? "w-20" : "w-72"
//         }`}
//       >
//         {/* Logo & Collapse Button */}
//         <div
//           className={cn(
//             "border-b border-[#24304d] px-4 py-4",
//             sidebarCollapsed ? "flex flex-col items-center gap-3" : "space-y-4"
//           )}
//         >
//           <div
//             className={cn(
//               "flex items-center gap-3",
//               sidebarCollapsed ? "justify-center" : "justify-between"
//             )}
//           >
//             <button
//               onClick={() => navigate("/")}
//               className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-85"
//             >
//               <img
//                 src="/assets/justlogo.png"
//                 alt="ForgeSphere logo"
//                 className="h-11 w-auto flex-shrink-0"
//                 onError={(e) => {
//                   e.currentTarget.onerror = null;
//                   e.currentTarget.src = "/logo.png";
//                 }}
//               />
//               {!sidebarCollapsed && (
//                 <span className="flex min-w-0 flex-col justify-center">
//                   <span className="text-[0.65rem] leading-tight text-gray-400">ProbeStack</span>
//                   <span className="truncate text-xl font-extrabold leading-tight gradient-text font-heading">
//                     ForgeSphere
//                   </span>
//                 </span>
//               )}
//             </button>
//             {!sidebarCollapsed && (
//               <button
//                 onClick={() => setSidebarCollapsed(true)}
//                 className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-[#ff8a5c]/35 hover:bg-[#ff5b1f]/10 hover:text-white"
//               >
//                 <ChevronLeft className="h-4 w-4" />
//               </button>
//             )}
//           </div>
//           {!sidebarCollapsed && (
//             <div>
//               <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff8a5c]">
//                 Gateway
//               </div>
//               <div className="mt-1 truncate text-sm font-semibold text-white">Control Center</div>
//             </div>
//           )}
//           {sidebarCollapsed && (
//             <button
//               onClick={() => setSidebarCollapsed(false)}
//               className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-[#ff8a5c]/35 hover:bg-[#ff5b1f]/10 hover:text-white"
//             >
//               <ChevronRight className="h-4 w-4" />
//             </button>
//           )}
//         </div>

//         {/* Navigation Menu */}
//         <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
//           {/* Primary Items */}
//           <div className="space-y-1">
//             <div
//               className={sidebarItemClass(selectedMenuItem === "gateway-onboarding")}
//               onClick={() => selectSidebarMenu("gateway-onboarding")}
//             >
//               <FileText
//                 className={sidebarIconClass(selectedMenuItem === "gateway-onboarding", "text-[#ff8a5c]")}
//               />
//               {!sidebarCollapsed && <span>Onboarding</span>}
//             </div>
//             <div
//               className={sidebarItemClass(selectedMenuItem === "gateway-dashboard")}
//               onClick={() => selectSidebarMenu("gateway-dashboard")}
//             >
//               <LayoutDashboard
//                 className={sidebarIconClass(selectedMenuItem === "gateway-dashboard", "text-sky-400")}
//               />
//               {!sidebarCollapsed && <span>Dashboard</span>}
//             </div>
//           </div>

//           {/* Proxy Development Section */}
//           <div>
//             <div className={sectionHeaderClass} onClick={() => toggleSection("proxyDev")}>
//               {sectionsExpanded.proxyDev ? (
//                 <ChevronDown className="h-4 w-4 text-[#38bdf8]" />
//               ) : (
//                 <ChevronRight className="h-4 w-4 text-[#38bdf8]" />
//               )}
//               {!sidebarCollapsed && (
//                 <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Proxy Development</span>
//               )}
//             </div>
//             {sectionsExpanded.proxyDev && (
//               <div className="space-y-1 mt-1">
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "api-proxies")}
//                   onClick={() => selectSidebarMenu("api-proxies")}
//                 >
//                   <Layout className={sidebarIconClass(selectedMenuItem === "api-proxies", "text-sky-400")} />
//                   {!sidebarCollapsed && <span>Proxy</span>}
//                 </div>
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "shared-flows")}
//                   onClick={() => selectSidebarMenu("shared-flows")}
//                 >
//                   <Share2 className={sidebarIconClass(selectedMenuItem === "shared-flows", "text-emerald-400")} />
//                   {!sidebarCollapsed && <span>Shared Function</span>}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Distribution Section */}
//           <div>
//             <div className={sectionHeaderClass} onClick={() => toggleSection("distribution")}>
//               {sectionsExpanded.distribution ? (
//                 <ChevronDown className="h-4 w-4 text-[#a78bfa]" />
//               ) : (
//                 <ChevronRight className="h-4 w-4 text-[#a78bfa]" />
//               )}
//               {!sidebarCollapsed && (
//                 <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Distribution</span>
//               )}
//             </div>
//             {sectionsExpanded.distribution && (
//               <div className="space-y-1 mt-1">
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "api-products")}
//                   onClick={() => selectSidebarMenu("api-products")}
//                 >
//                   <Package className={sidebarIconClass(selectedMenuItem === "api-products", "text-amber-300")} />
//                   {!sidebarCollapsed && <span>Product</span>}
//                 </div>
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "consumer")}
//                   onClick={() => selectSidebarMenu("consumer")}
//                 >
//                   <AppWindow className={sidebarIconClass(selectedMenuItem === "consumer", "text-rose-400")} />
//                   {!sidebarCollapsed && <span>Consumer</span>}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Governance Section (Analytics) */}
//           <div>
//             <div className={sectionHeaderClass} onClick={() => toggleSection("analytics")}>
//               {sectionsExpanded.analytics ? (
//                 <ChevronDown className="h-4 w-4 text-[#f472b6]" />
//               ) : (
//                 <ChevronRight className="h-4 w-4 text-[#f472b6]" />
//               )}
//               {!sidebarCollapsed && (
//                 <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Governance</span>
//               )}
//             </div>
//             {sectionsExpanded.analytics && (
//               <div className="space-y-1 mt-1">
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "compliance")}
//                   onClick={() => selectSidebarMenu("compliance")}
//                 >
//                   <Combine className={sidebarIconClass(selectedMenuItem === "compliance", "text-red-300")} />
//                   {!sidebarCollapsed && <span>Compliance</span>}
//                 </div>
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "framework")}
//                   onClick={() => selectSidebarMenu("framework")}
//                 >
//                   <Frame className={sidebarIconClass(selectedMenuItem === "framework", "text-blue-300")} />
//                   {!sidebarCollapsed && <span>Framework</span>}
//                 </div>
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "automation")}
//                   onClick={() => selectSidebarMenu("automation")}
//                 >
//                   <CirclePower className={sidebarIconClass(selectedMenuItem === "automation", "text-green-300")} />
//                   {!sidebarCollapsed && <span>Automation</span>}
//                 </div>
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "api-metrics")}
//                   onClick={() => selectSidebarMenu("api-metrics")}
//                 >
//                   <BarChart3 className={sidebarIconClass(selectedMenuItem === "api-metrics", "text-violet-300")} />
//                   {!sidebarCollapsed && <span>API Metrics</span>}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Management Section */}
//           <div>
//             <div className={sectionHeaderClass} onClick={() => toggleSection("management")}>
//               {sectionsExpanded.management ? (
//                 <ChevronDown className="h-4 w-4 text-[#f472b6]" />
//               ) : (
//                 <ChevronRight className="h-4 w-4 text-[#f472b6]" />
//               )}
//               {!sidebarCollapsed && (
//                 <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Management</span>
//               )}
//             </div>
//             {sectionsExpanded.management && (
//               <div className="space-y-1 mt-1">
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "environments")}
//                   onClick={() => selectSidebarMenu("environments")}
//                 >
//                   <CpuIcon className={sidebarIconClass(selectedMenuItem === "environments", "text-amber-500")} />
//                   {!sidebarCollapsed && <span>Environments</span>}
//                 </div>
//                 {/* Profile can be added later */}
//               </div>
//             )}
//           </div>

//           {/* Deployment Section */}
//           <div>
//             <div className={sectionHeaderClass} onClick={() => toggleSection("deployment")}>
//               {sectionsExpanded.deployment ? (
//                 <ChevronDown className="h-4 w-4 text-[#34d399]" />
//               ) : (
//                 <ChevronRight className="h-4 w-4 text-[#34d399]" />
//               )}
//               {!sidebarCollapsed && (
//                 <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Deployment</span>
//               )}
//             </div>
//             {sectionsExpanded.deployment && (
//               <div className="space-y-1 mt-1">
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "api-deploy")}
//                   onClick={() => selectSidebarMenu("api-deploy")}
//                 >
//                   <Rocket className={sidebarIconClass(selectedMenuItem === "api-deploy", "text-blue-400")} />
//                   {!sidebarCollapsed && <span>API Deploy</span>}
//                 </div>
//                 <div
//                   className={sidebarItemClass(selectedMenuItem === "api-proxy-test")}
//                   onClick={() => selectSidebarMenu("api-proxy-test")}
//                 >
//                   <TestTube className={sidebarIconClass(selectedMenuItem === "api-proxy-test", "text-emerald-400")} />
//                   {!sidebarCollapsed && <span>API Test</span>}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Intelligent Gateways Section (Optional) */}
//           {/* You can uncomment and adapt if needed */}
//           {/* <div>
//             <div className={sectionHeaderClass} onClick={() => toggleSection("intelligentGateways")}>
//               {sectionsExpanded.intelligentGateways ? <ChevronDown className="h-4 w-4 text-[#a78bfa]" /> : <ChevronRight className="h-4 w-4 text-[#a78bfa]" />}
//               {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Intelligent Gateways</span>}
//             </div>
//             {sectionsExpanded.intelligentGateways && (
//               <div className="space-y-1 mt-1">
//                 <div className={sidebarItemClass(selectedMenuItem === "ai-gateway")} onClick={() => window.open('https://forgeai.probestack.io', '_blank')}>
//                   <Sparkles className={sidebarIconClass(selectedMenuItem === "ai-gateway", "text-indigo-400")} />
//                   {!sidebarCollapsed && <span>AI Gateway</span>}
//                 </div>
//               </div>
//             )}
//           </div> */}
//         </nav>
//       </aside>

//       {/* ==================== MAIN CONTENT AREA ==================== */}
//       <div className="min-w-0 flex flex-1 flex-col">
//         {showHeader && <GatewayHeader />}
//         <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
//       </div>
//     </div>
//   );
// };