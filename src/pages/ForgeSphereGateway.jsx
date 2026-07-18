// src/components/ForgeSphereGateway.jsx
import React, { useState } from "react";
import Toast from "../components/ui/toast";
import { GatewayOverview } from "./GatewayOverview";

export default function ForgeSphereGateway({ showHeader = false }) {
  const [toast, setToast] = useState({ message: "", type: "success" });
  const showMessage = (text, type = "success") => setToast({ message: text, type });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0e16] text-white">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
      <GatewayOverview showHeader={showHeader} showMessage={showMessage} />
    </div>
  );
}





// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import Highcharts from "highcharts";
// import "highcharts/highcharts-3d";
// import "highcharts/highcharts-more";
// import "highcharts/modules/solid-gauge";
// import HighchartsReact from "highcharts-react-official";
// import { useLocation, useNavigate } from "react-router-dom";
// import {
//     AlertCircle,
//     Archive,
//     ArrowBigDown,
//     ArrowBigLeft,
//     ArrowLeft,
//     BoxIcon,
//     Building,
//     Check,
//     CheckCircle,
//     Clock,
//     Copy,
//     CpuIcon,
//     Database,
//     Edit,
//     Eye,
//     FileCode,
//     Filter,
//     GitBranch,
//     History,
//     Key,
//     Layers,
//     Loader2,
//     MoreVertical,
//     Network,
//     Plug,
//     Plus,
//     Puzzle,
//     Rocket,
//     Search,
//     Server,
//     Sparkles,
//     TestTube,
//     Trash2,
//     TrendingUp,
//     UserCircle,
//     Users,
//     X, Mail, Phone, Calendar,
//     ArchiveIcon,
//     Combine,
//     Frame,
//     CirclePower
// } from "lucide-react";
// import { Card } from "../components/ui/card";
// import { Button } from "../components/ui/button";
// import { Badge } from "../components/ui/badge";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
// import {
//     DashboardActivitySkeleton,
//     DashboardChartSkeleton,
//     DashboardMetricSkeleton,
//     DashboardResourceSectionSkeleton,
// } from "../components/ui/skeleton";
// import { cn } from "../lib/utils";
// import { onboardingService } from "../services/onboardingService";
// import API_BASE_URL from "../config/apiConfig";
// import { ProxyEditor } from "./ProxyEditor";
// import {
//     ChevronLeft, ChevronRight, ChevronDown,
//     Layout, Share2, Package, AppWindow, BarChart3, LayoutDashboard, FileText
// } from 'lucide-react';
// import APIProductsManager from "./Gateway/APIProductsManager";
// import ApigeeAppsManager from "./Gateway/ApigeeAppsManager";
// import ProxyMonitoring from "./ProxyMonitoring";
// import ApigeeMainPage from "./Apigee/ApigeePage";
// import GatewayHeader from "../components/ui/GatewayHeader";
// import GatewayDashboard from "./GatewayDashboard";
// import Profile from "./Profile";
// import { Label } from "../components/ui/label";
// import { Input } from "../components/ui/input";
// import { consumerService } from "../services/consumerService";
// import Toast from "../components/ui/toast";
// import APIGEE_BASE_URL from "../config/apigeeConfig";
// import { GatewayContextSelector } from "./Gateway/GatewayContextSelector";
// import { ApiProxyTest } from "./Gateway/ApiProxyTest";
// import APITest from "./APITest";
// import JSZip from "jszip";
// import APIDeploy from "./APIDeploy";
// import Governance from "./Governance";
// import { Framework } from "./Framework";
// import { Automation } from "./Automation";

// const GATEWAY_MENU_PATHS = {
//     'gateway-dashboard': 'dashboard',
//     'gateway-onboarding': 'onboarding',
//     'api-proxies': 'proxy',
//     'shared-flows': 'shared-flow',
//     'api-products': 'products',
//     'consumer': 'consumer',
//     'framework': 'framework',
//     'compliance': 'compliance',
//     'automation': 'automation',
//     'api-metrics': 'api-metrics',
//     'environments': 'environments',
//     'gateway-profile': 'profile',
//     'ai-gateway': 'ai-gateway',
//     'mcp-gateway': 'mcp-gateway',
//     'forgehub-apis': 'forgehub-apis',
//     'api-deploy': 'api-deploy',
//     'api-proxy-test': 'proxy-test',
// };

// const GATEWAY_PATH_MENU = Object.fromEntries(
//     Object.entries(GATEWAY_MENU_PATHS).map(([menu, path]) => [path, menu])
// );

// const getGatewayMenuFromPath = (pathname) => {
//     const [section = ''] = pathname.replace(/^\/gateway\/?/, '').split('/');
//     return GATEWAY_PATH_MENU[section] || 'gateway-onboarding';
// };

// const getGatewayPath = (menuItem) => `/gateway/${GATEWAY_MENU_PATHS[menuItem] || GATEWAY_MENU_PATHS['gateway-onboarding']}`;

// // ====================== ForgeSphereGateway - Refactored ======================
// export default function ForgeSphereGateway({ showHeader = false }) {
//     const [activeView, setActiveView] = useState('overview'); // overview, develop, debug, trace, deploy
//     const [selectedProxyId, setSelectedProxyId] = useState(null);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [selectedProxy, setSelectedProxy] = useState('apigee-ai-gateway-v2');
//     const [message, setMessage] = useState({ text: '', type: 'success' });
//     const [toast, setToast] = useState({ message: '', type: 'success' });

//     const showMessage = useCallback((text, type = 'success') => {
//         setMessage({ text, type });
//         setToast({ message: text, type });
//     }, []);

//     // Dummy proxy list for the overview table
//     const proxyList = [
//         { id: 'apigee-migration-tailor-api-v1', name: 'apigee-migration-tailor-api-v1', environment: 'dev (Intermediate)', lastModified: '4 days ago', type: 'REST' },
//         { id: 'apigee-migration-tailor-api-v2', name: 'apigee-migration-tailor-api-v2', environment: 'dev (Intermediate)', lastModified: '4 days ago', type: 'REST' },
//         { id: 'apigee-migration-tailor-api-v3', name: 'apigee-migration-tailor-api-v3', environment: 'dev (Intermediate)', lastModified: '4 days ago', type: 'SOAP' },
//         { id: 'audit-platform-application', name: 'audit-platform-application', environment: '2 Environments', lastModified: '7 days ago', type: 'REST' },
//         { id: 'cache-test-proxy-v1', name: 'cache-test-proxy-v1', environment: 'dev (Intermediate)', lastModified: '5 days ago', type: 'SOAP' },
//         { id: 'graphql-user-api', name: 'graphql-user-api', environment: 'staging', lastModified: '2 days ago', type: 'GraphQL' },
//         { id: 'mcp-gateway-prod', name: 'mcp-gateway-prod', environment: 'prod', lastModified: '1 day ago', type: 'MCP' },
//     ];

//     const handleProxyClick = (proxyId) => {
//         setSelectedProxyId(proxyId);
//         // In a real app, you'd fetch details here
//     };

//     return (
//         <div className="flex h-screen flex-col overflow-hidden bg-[#0b0e16] text-white">
//             {toast.message && (
//                 <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
//             )}
//             {/* Top Bar */}
//             {/* <div className="h-12 bg-[#111520] border-b border-[#1f2840] flex items-center px-4 gap-2">
//                 <div className="flex items-center gap-2 bg-[#181d2a] border border-[#2a3550] rounded-lg px-3 py-1.5">
//                     <div className="w-2 h-2 rounded-full bg-[#c084fc] shadow-md"></div>
//                     <select value={selectedProxy} onChange={(e) => setSelectedProxy(e.target.value)} className="bg-transparent text-sm font-semibold outline-none">
//                         {['apigee-ai-gateway-v2', 'forge-rest-proxy', 'mcp-gateway-prod'].map(p => (
//                             <option key={p} value={p}>{p}</option>
//                         ))}
//                     </select>
//                     <span className="text-[10px] text-[#c084fc] bg-[#c084fc]/10 rounded-full px-2">GATEWAY</span>
//                 </div>
//                 <div className="w-px h-5 bg-[#1f2840]"></div>
//                 <div className="flex gap-1">
//                     {['overview', 'develop', 'debug', 'trace', 'deploy'].map(view => (
//                         <button
//                             key={view}
//                             onClick={() => setActiveView(view)}
//                             className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === view
//                                     ? view === 'overview' ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#4f8ef7] bg-[#4f8ef7]/10'
//                                     : 'text-[#7f8fa8] hover:text-white'
//                                 }`}
//                         >
//                             {view.charAt(0).toUpperCase() + view.slice(1)}
//                         </button>
//                     ))}
//                 </div>
//                 <div className="ml-auto flex gap-2">
//                     <button className="text-xs bg-[#181d2a] border px-3 py-1.5 rounded-md hover:bg-[#1e2436]">Save</button>
//                     <button className="text-xs bg-[#ff5b1f] px-4 py-1.5 rounded-md font-semibold">Deploy</button>
//                 </div>
//             </div> */}

//             {/* Main Content */}
//             <div className="min-h-0 flex-1 overflow-hidden">
//                 {activeView === 'overview' && (
//                     <GatewayOverview
//                         showHeader={showHeader}
//                         searchTerm={searchTerm}
//                         setSearchTerm={setSearchTerm}
//                         proxyList={proxyList}
//                         selectedProxyId={selectedProxyId}
//                         onProxyClick={handleProxyClick}
//                         showMessage={showMessage}
//                     />
//                 )}
//                 {activeView === 'develop' && <DevelopView selectedProxy={selectedProxy} />}
//                 {activeView === 'debug' && <DebugView />}
//                 {activeView === 'trace' && <TraceView />}
//                 {activeView === 'deploy' && <DeployView />}
//             </div>
//         </div>
//     );
// };

// // ====================== Proxy Detail View (with full Debug tab) ======================
// const ProxyDetailView = ({ proxy, onBack, onDeploy, onDuplicate, onDelete, onDevelop, onDebug, showMessage }) => {
//     const [activeTab, setActiveTab] = useState('overview');
//     const [revisionFilter, setRevisionFilter] = useState('');
//     const [proxyDetails, setProxyDetails] = useState(null);
//     const [loadingDetails, setLoadingDetails] = useState(false);
//     const [detailsError, setDetailsError] = useState(null);
//     // New state for real debug sessions
//     const [debugSessions, setDebugSessions] = useState([]);
//     const [loadingDebugSessions, setLoadingDebugSessions] = useState(false);
//     const [organizations, setOrganizations] = useState([]);
//     const [selectedOrg, setSelectedOrg] = useState('');
//     const [loadingOrgs, setLoadingOrgs] = useState(false);
//     const [availableEnvironments, setAvailableEnvironments] = useState([]);
//     const [loadingEnvironments, setLoadingEnvironments] = useState(false);
//     const [startingDebugSession, setStartingDebugSession] = useState(false);
//     const [availableRevisions, setAvailableRevisions] = useState([]);
//     const [selectedRevision, setSelectedRevision] = useState('');
//     const [loadingRevisions, setLoadingRevisions] = useState(false);
//     // Debug session detail view states
//     const [selectedDebugSession, setSelectedDebugSession] = useState(null);
//     const [debugTransactions, setDebugTransactions] = useState([]);
//     const [selectedTransaction, setSelectedTransaction] = useState(null);
//     const [loadingTransactions, setLoadingTransactions] = useState(false);
//     // Deployment modal state
//     const [deployModalOpen, setDeployModalOpen] = useState(false);
//     const [deployMode, setDeployMode] = useState('ci-cd'); // 'ci-cd' or 'direct'
//     const [deployRevision, setDeployRevision] = useState('');
//     const [deployEnv, setDeployEnv] = useState('');
//     const [deploySource, setDeploySource] = useState('github'); // 'github', 'artifactory'
//     const [deploying, setDeploying] = useState(false);
//     // Debug states
//     const [showDebugForm, setShowDebugForm] = useState(false);
//     const [debugEnv, setDebugEnv] = useState('');
//     const [debugFilter, setDebugFilter] = useState('');
//     const [recentSessions, setRecentSessions] = useState([
//         { id: 1, name: 'Session 1', timestamp: '2025-05-10 14:32', status: 'completed' },
//         { id: 2, name: 'Session 2', timestamp: '2025-05-09 09:15', status: 'completed' },
//     ]);

//     const fetchToken = async () => {
//         try {
//             const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
//             if (!res.ok) throw new Error(`Token service error: ${res.status}`);
//             const data = await res.json();
//             return data.access_token;
//         } catch (err) {
//             console.error('Token fetch error:', err);
//             showMessage('Failed to obtain access token', 'error');
//             return null;
//         }
//     };
//     const navigate = useNavigate();
//     const hasNavigated = useRef(false);
//     const [bundleLoading, setBundleLoading] = useState(false);

//     // Add token fetching function
//     const fetchOrganizations = async () => {
//         setLoadingOrgs(true);
//         try {
//             const token = await fetchToken();
//             if (!token) return;
//             const url = 'https://forgesphere.probestack.io/apigee-wrapper/organizations';
//             const response = await fetch(url, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) throw new Error(`Failed to fetch organizations: ${response.status}`);
//             const data = await response.json();

//             // Extract organization names from the response: { organizations: [{ organization, projectIds, projectId }] }
//             let orgs = [];
//             if (data.organizations && Array.isArray(data.organizations)) {
//                 orgs = data.organizations.map(item => item.organization).filter(Boolean);
//             } else if (Array.isArray(data)) {
//                 // Fallback in case response is a plain array
//                 orgs = data.map(item => item.organization || item.name || item).filter(Boolean);
//             }

//             if (orgs.length === 0) {
//                 console.warn('No organizations found, using default');
//                 orgs = ['gen-ai-poc-onboarding'];
//             }

//             setOrganizations(orgs);
//             // Always store a string
//             setSelectedOrg(orgs[0]);
//         } catch (error) {
//             console.error('Error fetching organizations:', error);
//             showMessage('Could not load organizations', 'error');
//             const fallback = ['gen-ai-poc-onboarding'];
//             setOrganizations(fallback);
//             setSelectedOrg(fallback[0]);
//         } finally {
//             setLoadingOrgs(false);
//         }
//     };

//     const fetchEnvironments = async (orgName) => {
//         if (!orgName) return;
//         setLoadingEnvironments(true);
//         try {
//             const token = await fetchToken();
//             if (!token) return;
//             const url = (`https://forgesphere.probestack.io/apigee-wrapper/organizations/${orgName}/environments`);
//             const response = await fetch(url, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) throw new Error(`Failed to fetch environments: ${response.status}`);
//             const data = await response.json();
//             setAvailableEnvironments(data);
//             // if (data.length > 0) {
//             //     setDebugEnv(data[0]);
//             // }
//         } catch (error) {
//             console.error('Error fetching environments:', error);
//             showMessage('Could not load environments', 'error');
//             setAvailableEnvironments([]);
//         } finally {
//             setLoadingEnvironments(false);
//         }
//     };
//     const fetchRevisions = async (orgName) => {
//         if (!proxy?.name || !orgName || !debugEnv || debugEnv === "") return;
//         setLoadingRevisions(true);
//         setAvailableRevisions([]);
//         setSelectedRevision(''); // reset selected revision when environment changes
//         try {
//             const token = await fetchToken();
//             if (!token) return;
//             const parent = `organizations/${orgName}/environments/${debugEnv}/apis/${proxy.name}`;
//             const url = `https://apigee.googleapis.com/v1/${parent}/deployments`;
//             const res = await fetch(url, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (res.ok) {
//                 const data = await res.json();
//                 // Response structure: { deployments: [ { revision: "2", ... } ] }
//                 const revs = data.deployments?.map(dep => dep.revision) || [];
//                 setAvailableRevisions(revs);
//                 // Do NOT auto-select the first revision – user must choose
//             } else {
//                 console.error('Failed to fetch revisions', res.status);
//                 setAvailableRevisions([]);
//             }
//         } catch (err) {
//             console.error(err);
//             setAvailableRevisions([]);
//         } finally {
//             setLoadingRevisions(false);
//         }
//     };
//     // const fetchDeploymentStatus = async (orgName, revision) => {
//     //     if (!proxy?.name || !orgName || !revision) return;
//     //     try {
//     //         const token = await fetchToken();
//     //         if (!token) return;
//     //         const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxy.name}/revisions/${revision}/deployments`;
//     //         const res = await fetch(url, {
//     //             headers: { 'Authorization': `Bearer ${token}` }
//     //         });
//     //         if (res.ok) {
//     //             const data = await res.json();
//     //             console.log('Deployment status for revision', revision, ':', data);
//     //             // You can store this in a separate state if needed
//     //         }
//     //     } catch (err) {
//     //         console.error(err);
//     //     }
//     // };
//     const formatDate = (timestamp) => {
//         if (!timestamp) return '—';
//         const date = new Date(parseInt(timestamp));
//         return date.toLocaleDateString();
//     };

//     const getLatestRevisionData = () => {
//         if (!proxyDetails?.revisionDetails) return null;
//         const latestRev = proxyDetails.proxy?.latestRevisionId;
//         const revDetail = proxyDetails.revisionDetails.find(r => r.revision === latestRev);
//         return revDetail?.data || null;
//     };

//     const getBasePath = () => {
//         const latestData = getLatestRevisionData();
//         return latestData?.basepaths?.[0] || '/';
//     };

//     const getDescription = () => {
//         // If no description in API, show a default or extract from policies
//         const latestData = getLatestRevisionData();
//         const policies = latestData?.policies || [];
//         return policies.length > 0 ? `Policies: ${policies.join(', ')}` : 'No description available';
//     };

//     const getExtensibleStatus = (revisionData) => {
//         return revisionData?.hasExtensiblePolicy ? 'Yes' : 'No';
//     };
//     useEffect(() => {
//         if (proxy?.name) {
//             fetchOrganizations();
//             fetchEnvironments(selectedOrg);
//         }
//     }, [activeTab, proxy?.name, selectedOrg, deployModalOpen]);
//     useEffect(() => {
//         setDeployRevision('');
//         setDeployEnv('');
//     }, [deployMode]);
//     useEffect(() => {
//         const fetchProxyDetails = async () => {
//             if (!proxy?.name) return;

//             setLoadingDetails(true);
//             setDetailsError(null);
//             try {
//                 const token = await fetchToken();
//                 if (!token) throw new Error('Failed to obtain access token');

//                 const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/apis/${proxy.name}/details`;
//                 const response = await fetch(url, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });

//                 if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

//                 const data = await response.json();
//                 setProxyDetails(data);
//             } catch (err) {
//                 console.error('Error fetching proxy details:', err);
//                 setDetailsError(err.message);
//                 showMessage(`Could not load proxy details: ${err.message}`, 'error');
//             } finally {
//                 setLoadingDetails(false);
//             }
//         };

//         fetchProxyDetails();
//     }, [proxy?.name]);
//     // Helper: fetch zip bundle for the latest revision
//     const fetchProxyBundleZip = async () => {
//         if (!proxy?.name) {
//             showMessage('Missing proxy name or organization', 'error');
//             return null;
//         }

//         // Get latest revision from proxy details (already fetched)
//         const latestRev = proxyDetails?.proxy?.latestRevisionId;
//         if (!latestRev) {
//             showMessage('No revision found for this proxy', 'error');
//             return null;
//         }

//         setBundleLoading(true);
//         try {
//             const token = await fetchToken();
//             if (!token) throw new Error('Failed to obtain access token');

//             // Use Apigee API to download bundle as zip
//             const url = `https://apigee.googleapis.com/v1/organizations/gen-ai-poc-onboarding/apis/${proxy.name}/revisions/${latestRev}/?format=bundle`;
//             const response = await fetch(url, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });

//             if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

//             const blob = await response.blob();
//             // Create a local object URL for the zip
//             const zipUrl = URL.createObjectURL(blob);
//             return zipUrl;
//         } catch (err) {
//             console.error('Error fetching proxy bundle:', err);
//             showMessage(`Could not load proxy bundle: ${err.message}`, 'error');
//             return null;
//         } finally {
//             setBundleLoading(false);
//         }
//     };
//     useEffect(() => {
//         if (activeTab === 'develop' && !hasNavigated.current && proxy?.name) {
//             hasNavigated.current = true;
//             handleOpenProxyEditor();
//         }
//     }, [activeTab, proxy?.name]);

//     // Reset navigation flag when the proxy changes
//     useEffect(() => {
//         return () => {
//             hasNavigated.current = false;
//         };
//     }, [proxy?.name]);

//     // Navigate to ProxyEditor with the bundle
//     const handleOpenProxyEditor = async () => {
//         const zipUrl = await fetchProxyBundleZip();
//         if (!zipUrl) return;

//         navigate('/proxy-editor', {
//             state: {
//                 zipUrl,
//                 selectedProxyName: proxy.name,
//                 backTo: `/gateway/proxy`,
//                 backState: { selectedProxyDetail: proxy },
//             }
//         });
//     };

//     // Add function to fetch debug sessions from Apigee
//     const fetchDebugSessions = async (orgName) => {
//         if (!proxy?.name || !orgName) return;
//         setLoadingDebugSessions(true);
//         try {
//             const token = await fetchToken();
//             if (!token) return;
//             const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxy.name}/debugsessions`;
//             const res = await fetch(url, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (res.ok) {
//                 const data = await res.json();
//                 setDebugSessions(data.debugSessions || []);
//             } else {
//                 console.error('Failed to fetch debug sessions', res.status);
//                 setDebugSessions([]);
//             }
//         } catch (err) {
//             console.error(err);
//             setDebugSessions([]);
//         } finally {
//             setLoadingDebugSessions(false);
//         }
//     };
//     const fetchDebugSessionData = async (session) => {
//         if (!selectedOrg || !proxy?.name || !session) return;
//         setLoadingTransactions(true);
//         setDebugTransactions([]);
//         setSelectedTransaction(null);
//         try {
//             const token = await fetchToken();
//             if (!token) return;
//             // session contains: name, environment, revision (from API response)
//             const url = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/environments/${session.environment}/apis/${proxy.name}/revisions/${session.revision}/debugsessions/${session.name}/data`;
//             const response = await fetch(url, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) throw new Error(`Failed to fetch session data: ${response.status}`);
//             const data = await response.json();
//             // data is an array of transaction objects
//             setDebugTransactions(data);
//             if (data.length > 0) setSelectedTransaction(data[0]);
//         } catch (err) {
//             console.error('Error fetching debug session data:', err);
//             showMessage(`Could not load transactions: ${err.message}`, 'error');
//         } finally {
//             setLoadingTransactions(false);
//         }
//     };

//     const startDebugSession = async () => {
//         if (!proxy?.name || !selectedOrg || !selectedRevision) {
//             showMessage('Proxy name or organization missing', 'error');
//             return;
//         }
//         setStartingDebugSession(true);
//         try {
//             const token = await fetchToken();
//             if (!token) return;
//             const payload = {
//                 name: `debug-${Date.now()}`,
//                 environment: debugEnv,
//                 revision: 17, // Consider fetching the actual deployed revision dynamically
//             };
//             const url = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/environments/${debugEnv}/apis/${proxy.name}/revisions/${selectedRevision}/debugsessions`;
//             const res = await fetch(url, {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify(payload),
//             });
//             if (res.ok) {
//                 showMessage('Debug session started successfully', 'success');
//                 setShowDebugForm(false);
//                 await fetchDebugSessions(selectedOrg);
//             } else {
//                 const errText = await res.text();
//                 showMessage(`Failed to start debug session: ${errText}`, 'error');
//             }
//         } catch (err) {
//             console.error(err);
//             showMessage('Error starting debug session', 'error');
//         } finally {
//             setStartingDebugSession(false);
//         }
//     };
//     useEffect(() => {
//         if (activeTab === 'debug' && selectedOrg) {
//             fetchDebugSessions(selectedOrg);
//         }
//     }, [selectedOrg, activeTab]);
//     useEffect(() => {
//         if (activeTab === 'debug' && debugEnv) {
//             fetchRevisions(selectedOrg);
//         }
//     }, [debugEnv, activeTab]);

//     // Fetch when debug tab becomes active
//     useEffect(() => {
//         if (activeTab === 'debug' && proxy?.name) {
//             fetchDebugSessions();
//         }
//     }, [activeTab, proxy?.name]);


//     const handleDeploy = async () => {
//         if (!selectedOrg) {
//             showMessage('No organization selected', 'error');
//             return;
//         }
//         if (!deployEnv) {
//             showMessage('Please select an environment', 'error');
//             return;
//         }
//         let rev = deployRevision;
//         if (deployMode === 'ci-cd' && !rev) {
//             showMessage('Please select or enter an artifact version (revision)', 'error');
//             return;
//         }
//         if (deployMode === 'direct' && !rev) {
//             showMessage('Please select a revision to deploy', 'error');
//             return;
//         }

//         setDeploying(true);
//         try {
//             const token = await fetchToken();
//             if (!token) throw new Error('Failed to get access token');

//             // API endpoint: POST /organizations/{org}/environments/{env}/apis/{api}/revisions/{rev}/deployments
//             const url = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/environments/${deployEnv}/apis/${proxy.name}/revisions/${rev}/deployments?override=true`;

//             const response = await fetch(url, {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                 },
//                 // Optional body: can include additional settings if needed
//                 body: JSON.stringify({ override: true }),
//             });

//             if (response.ok) {
//                 const result = await response.json();
//                 console.log('Deployment successful:', result);
//                 showMessage(`Revision ${rev} deployed to ${deployEnv} successfully!`, 'success');
//                 resetDeployForm();
//                 setDeployModalOpen(false);
//             } else {
//                 const errorText = await response.text();
//                 throw new Error(errorText || `Deployment failed with status ${response.status}`);
//             }
//         } catch (err) {
//             console.error('Deploy error:', err);
//             showMessage(`Deployment failed: ${err.message}`, 'error');
//         } finally {
//             setDeploying(false);
//         }
//     };

//     // Dummy revisions data
//     const revisions = [
//         { revision: 17, extensible: 'Yes', description: 'Added LLM policies', lastModified: 'May 4, 2026', endpointSummary: 'View' },
//         { revision: 16, extensible: 'Yes', description: 'Security updates', lastModified: 'May 3, 2026', endpointSummary: 'View' },
//         { revision: 15, extensible: 'No', description: 'Bug fixes', lastModified: 'May 2, 2026', endpointSummary: 'View' },
//         { revision: 14, extensible: 'Yes', description: 'Initial release', lastModified: 'May 1, 2026', endpointSummary: 'View' },
//     ];

//     const filteredRevisions = revisions.filter(r =>
//         r.revision.toString().includes(revisionFilter) ||
//         r.description.toLowerCase().includes(revisionFilter.toLowerCase())
//     );
//     const resetDeployForm = () => {
//         setDeployRevision('');
//         setDeployEnv('');
//         setDeploySource('github'); // or keep default
//     };

//     // ---- Debug Tab Content ----
//     if (activeTab === 'debug') {
//         const renderDebugContent = () => {
//             // Show session detail view if a session is selected
//             if (selectedDebugSession) {
//                 return (
//                     <div className="flex gap-6">
//                         {/* Back button & header */}
//                         <div className="flex flex-col flex-1">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <button
//                                     onClick={() => {
//                                         setSelectedDebugSession(null);
//                                         setDebugTransactions([]);
//                                         setSelectedTransaction(null);
//                                     }}
//                                     className="text-[#ff5b1f] rounded-md text-sm font-medium flex items-center gap-1"
//                                 >
//                                     <ArrowLeft className="w-4 h-4" /> Back to sessions
//                                 </button>
//                                 <h3 className="text-base font-semibold">
//                                     Debug Session: {selectedDebugSession.name}
//                                 </h3>
//                             </div>

//                             <div className="flex gap-6">
//                                 {/* Left column: Transactions list */}
//                                 <div className="w-1/3 bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
//                                     <div className="p-3 border-b border-[#1f2840] bg-[#1a1f2e]">
//                                         <h4 className="text-sm font-medium">Transactions</h4>
//                                         <p className="text-xs text-[#5a6a8a] mt-1">
//                                             New transactions may take time to appear in this table
//                                         </p>
//                                     </div>
//                                     {loadingTransactions ? (
//                                         <div className="p-6 text-center text-[#7f8fa8]">
//                                             <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
//                                             <p>Loading transactions...</p>
//                                         </div>
//                                     ) : debugTransactions.length === 0 ? (
//                                         <div className="p-6 text-center text-[#7f8fa8]">
//                                             <p>No transactions to display</p>
//                                         </div>
//                                     ) : (
//                                         <div className="divide-y divide-[#1f2840]">
//                                             {debugTransactions.map((tx, idx) => (
//                                                 <div
//                                                     key={idx}
//                                                     className={`p-3 cursor-pointer hover:bg-[#1a1f2e] transition ${selectedTransaction === tx ? 'bg-[#1f2a3a] border-l-2 border-[#ff5b1f]' : ''
//                                                         }`}
//                                                     onClick={() => setSelectedTransaction(tx)}
//                                                 >
//                                                     <div className="flex items-center justify-between text-sm">
//                                                         <span className="font-mono text-white">{tx.request?.verb || 'GET'}</span>
//                                                         <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.response?.statusCode >= 200 && tx.response?.statusCode < 300
//                                                             ? 'bg-green-500/20 text-green-300'
//                                                             : 'bg-red-500/20 text-red-300'
//                                                             }`}>
//                                                             {tx.response?.statusCode || '?'}
//                                                         </span>
//                                                     </div>
//                                                     <div className="text-xs text-[#7f8fa8] truncate mt-1">
//                                                         {tx.request?.url || tx.request?.path || '/'}
//                                                     </div>
//                                                     <div className="text-xs text-[#5a6a8a] mt-1">
//                                                         {tx.elapsed ? `${tx.elapsed} ms` : '—'}
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>

//                                 {/* Right column: Transaction details */}
//                                 <div className="flex-1 bg-[#111520] rounded-xl border border-[#1f2840] p-4">
//                                     {!selectedTransaction ? (
//                                         <div className="flex flex-col items-center justify-center h-full text-[#7f8fa8]">
//                                             <p>No transaction selected</p>
//                                             <p className="text-sm mt-2">Select a transaction from the table to view a trace.</p>
//                                         </div>
//                                     ) : (
//                                         <div className="space-y-4">
//                                             {/* Request Section */}
//                                             <div>
//                                                 <h4 className="text-sm font-semibold text-white mb-2">Request</h4>
//                                                 <div className="bg-[#0f1117] rounded-lg p-3 font-mono text-xs text-[#7f8fa8] break-all">
//                                                     <div><span className="text-[#4f8ef7]">{selectedTransaction.request?.verb || 'GET'}</span> {selectedTransaction.request?.url || selectedTransaction.request?.path}</div>
//                                                     <div className="mt-2">
//                                                         <span className="text-[#5a6a8a]">Headers:</span>
//                                                         <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(selectedTransaction.request?.headers, null, 2) || '{}'}</pre>
//                                                     </div>
//                                                     {selectedTransaction.request?.body && (
//                                                         <div className="mt-2">
//                                                             <span className="text-[#5a6a8a]">Body:</span>
//                                                             <pre className="mt-1 whitespace-pre-wrap">{typeof selectedTransaction.request.body === 'string' ? selectedTransaction.request.body : JSON.stringify(selectedTransaction.request.body, null, 2)}</pre>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>

//                                             {/* Response Section */}
//                                             <div>
//                                                 <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
//                                                 <div className="bg-[#0f1117] rounded-lg p-3 font-mono text-xs text-[#7f8fa8] break-all">
//                                                     <div>Status: <span className={selectedTransaction.response?.statusCode >= 200 && selectedTransaction.response?.statusCode < 300 ? 'text-green-400' : 'text-red-400'}>
//                                                         {selectedTransaction.response?.statusCode || '?'}
//                                                     </span></div>
//                                                     <div className="mt-2">
//                                                         <span className="text-[#5a6a8a]">Headers:</span>
//                                                         <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(selectedTransaction.response?.headers, null, 2) || '{}'}</pre>
//                                                     </div>
//                                                     {selectedTransaction.response?.body && (
//                                                         <div className="mt-2">
//                                                             <span className="text-[#5a6a8a]">Body:</span>
//                                                             <pre className="mt-1 whitespace-pre-wrap">{typeof selectedTransaction.response.body === 'string' ? selectedTransaction.response.body : JSON.stringify(selectedTransaction.response.body, null, 2)}</pre>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>

//                                             {/* Optional Trace / Steps (if available) */}
//                                             {selectedTransaction.trace && (
//                                                 <div>
//                                                     <h4 className="text-sm font-semibold text-white mb-2">Trace</h4>
//                                                     <div className="bg-[#0f1117] rounded-lg p-3 text-xs text-[#7f8fa8] overflow-auto max-h-60">
//                                                         <pre className="whitespace-pre-wrap">{JSON.stringify(selectedTransaction.trace, null, 2)}</pre>
//                                                     </div>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 );
//             }

//             // Default: show list of debug sessions and start form (existing layout)
//             return (
//                 <div className="flex gap-6">
//                     {/* Left column: recent sessions */}
//                     <div className="flex-1">
//                         <div className="flex justify-between items-center mb-4">
//                             <h3 className="text-base font-semibold">Recent debug sessions</h3>
//                             <button
//                                 onClick={() => setShowDebugForm(true)}
//                                 className="px-3 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm hover:bg-[#ff6b36]"
//                             >
//                                 + Start debug session
//                             </button>
//                         </div>
//                         {loadingDebugSessions ? (
//                             <div className="bg-[#1a1f2e] rounded-xl p-8 text-center text-[#7f8fa8]">
//                                 <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
//                                 <p>Loading debug sessions...</p>
//                             </div>
//                         ) : debugSessions.length === 0 ? (
//                             <div className="bg-[#1a1f2e] rounded-xl p-8 text-center text-[#7f8fa8]">
//                                 <p>No debug sessions found</p>
//                                 <p className="text-sm mt-2">Start a new debug session to troubleshoot</p>
//                             </div>
//                         ) : (
//                             <div className="space-y-2">
//                                 {debugSessions.map(session => (
//                                     <div key={session.id || session.name} className="bg-[#111520] border border-[#1f2840] rounded-lg p-3 flex justify-between items-center">
//                                         <div>
//                                             <div className="text-sm font-medium text-white">{session.name}</div>
//                                             <div className="text-xs text-[#5a6a8a]">{session.createTime || session.created || 'Unknown date'}</div>
//                                         </div>
//                                         <button
//                                             onClick={() => {
//                                                 setSelectedDebugSession(session);
//                                                 fetchDebugSessionData(session);
//                                             }}
//                                             className="text-[#4f8ef7] text-xs hover:underline"
//                                         >
//                                             View
//                                         </button>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>

//                     {/* Right column: start debug form (unchanged) */}
//                     {showDebugForm && (
//                         <div className="w-80 bg-[#1a1f2e] border border-[#2a3550] rounded-xl p-4">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h4 className="text-sm font-semibold">Start debug session</h4>
//                                 <button onClick={() => setShowDebugForm(false)} className="text-[#7f8fa8] hover:text-white">
//                                     ✕
//                                 </button>
//                             </div>
//                             <div className="space-y-3">
//                                 {/* Organization Dropdown */}
//                                 <div>
//                                     <label className="block text-xs font-medium text-[#5a6a8a] mb-1">
//                                         Organization <span className="text-red-400">*</span>
//                                     </label>
//                                     {loadingOrgs ? (
//                                         <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-[#7f8fa8]">
//                                             Loading organizations...
//                                         </div>
//                                     ) : organizations.length === 0 ? (
//                                         <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-red-400">
//                                             No organizations available
//                                         </div>
//                                     ) : (
//                                         <select
//                                             value={selectedOrg}
//                                             onChange={(e) => setSelectedOrg(e.target.value)}
//                                             className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#4f8ef7]"
//                                         >
//                                             {organizations.map((org) => (
//                                                 <option key={typeof org === 'string' ? org : JSON.stringify(org)} value={typeof org === 'string' ? org : ''}>
//                                                     {typeof org === 'string' ? org : 'Invalid org'}
//                                                 </option>
//                                             ))}
//                                         </select>
//                                     )}
//                                 </div>

//                                 {/* Environment Dropdown */}
//                                 <div>
//                                     <label className="block text-xs font-medium text-[#5a6a8a] mb-1">
//                                         Environment <span className="text-red-400">*</span>
//                                     </label>
//                                     {loadingEnvironments ? (
//                                         <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-[#7f8fa8]">
//                                             Loading environments...
//                                         </div>
//                                     ) : availableEnvironments.length === 0 ? (
//                                         <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-red-400">
//                                             No environments available
//                                         </div>
//                                     ) : (
//                                         <select
//                                             value={debugEnv}
//                                             onChange={(e) => setDebugEnv(e.target.value)}
//                                             className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#4f8ef7]"
//                                         >
//                                             <option value="" disabled>Select environment</option>
//                                             {availableEnvironments.map((env) => (
//                                                 <option key={env} value={env}>{env}</option>
//                                             ))}
//                                         </select>
//                                     )}
//                                 </div>

//                                 {/* Filter input (unchanged) */}
//                                 <div>
//                                     <label className="block text-xs font-medium text-[#5a6a8a] mb-1">
//                                         Revision <span className="text-red-400">*</span>
//                                     </label>
//                                     {loadingRevisions ? (
//                                         <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-[#7f8fa8]">
//                                             Loading revisions...
//                                         </div>
//                                     ) : availableRevisions.length === 0 ? (
//                                         <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-red-400">
//                                             No revisions deployed in this environment
//                                         </div>
//                                     ) : (
//                                         <select
//                                             value={selectedRevision}
//                                             onChange={(e) => setSelectedRevision(e.target.value)}
//                                             className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#4f8ef7]"
//                                         >
//                                             <option value="">Select revision</option>
//                                             {availableRevisions.map((rev) => (
//                                                 <option key={rev} value={rev}>
//                                                     Revision {rev}
//                                                 </option>
//                                             ))}
//                                         </select>
//                                     )}

//                                 </div>

//                                 <div className="flex gap-2 pt-2">
//                                     <button
//                                         onClick={startDebugSession}
//                                         disabled={startingDebugSession}
//                                         className="flex-1 px-3 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36] disabled:opacity-50"
//                                     >
//                                         {startingDebugSession ? 'Starting...' : 'Start'}
//                                     </button>
//                                     <button
//                                         onClick={() => setShowDebugForm(false)}
//                                         className="flex-1 px-3 py-1.5 bg-[#1a1f2e] border border-[#2a3550] text-white rounded-md text-sm hover:bg-[#22273b]"
//                                     >
//                                         Cancel
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             );
//         };

//         return (
//             <div className="p-6">
//                 <div className="flex items-center gap-3 mb-4">
//                     <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium">
//                         <ArrowLeft />
//                     </button>
//                     <h2 className="text-xl font-semibold">{proxy.name}</h2>
//                 </div>
//                 <div className="border-b border-[#1f2840] mb-4">
//                     <div className="flex gap-4">
//                         {['Overview', 'Develop', 'Debug'].map(tab => (
//                             <button
//                                 key={tab}
//                                 onClick={() => setActiveTab(tab.toLowerCase())}
//                                 className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase()
//                                     ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
//                                     : 'text-[#7f8fa8] hover:text-white'
//                                     }`}
//                             >
//                                 {tab}
//                             </button>
//                         ))}
//                     </div>
//                 </div>
//                 {renderDebugContent()}
//             </div>
//         );
//     }

//     // ---- Overview Tab (existing code) ----
//     return (
//         <div className="p-6">
//             {/* Header with back button and proxy name */}
//             <div className="flex items-center justify-between mb-4">
//                 <div className="flex items-center gap-3">
//                     <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium">
//                         <ArrowLeft />
//                     </button>
//                     <h2 className="text-xl font-semibold">{proxy.name}</h2>
//                 </div>
//                 <div className="flex gap-2">
//                     <button onClick={() => setDeployModalOpen(true)} className="px-4 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36]">
//                         Deploy
//                     </button>
//                     <button onClick={onDuplicate} className="px-4 py-1.5 bg-[#1a1f2e] border border-[#2a3550] text-white rounded-md text-sm hover:bg-[#22273b]">Duplicate</button>
//                     <button onClick={onDelete} className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-sm hover:bg-red-500/20">Delete</button>
//                 </div>
//             </div>

//             {/* Tabs */}
//             <div className="border-b border-[#1f2840] mb-4">
//                 <div className="flex gap-4">
//                     {['Overview', 'Develop', 'Debug'].map(tab => (
//                         <button
//                             key={tab}
//                             onClick={() => setActiveTab(tab.toLowerCase())}
//                             className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase()
//                                 ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
//                                 : 'text-[#7f8fa8] hover:text-white'
//                                 }`}
//                         >
//                             {tab}
//                         </button>
//                     ))}
//                 </div>
//             </div>
//             {activeTab === 'overview' && (
//                 <>
//                     {loadingDetails ? (
//                         <div className="flex flex-col items-center justify-center py-16">
//                             <Loader2 className="h-10 w-10 animate-spin text-[#ff5b1f]" />
//                             <p className="mt-3 text-sm text-slate-400">Loading proxy details...</p>
//                         </div>
//                     ) : detailsError ? (
//                         <div className="flex flex-col items-center justify-center py-16 text-center">
//                             <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
//                             <p className="text-red-400 font-medium">Error loading details</p>
//                             <p className="text-sm text-slate-400 mt-1">{detailsError}</p>
//                             <button
//                                 onClick={() => window.location.reload()}
//                                 className="mt-4 px-4 py-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff5b1f] text-sm font-medium hover:bg-[#ff5b1f]/20"
//                             >
//                                 Retry
//                             </button>
//                         </div>
//                     ) : proxyDetails ? (
//                         <div className="space-y-6">
//                             {/* ---- Two enhanced cards ---- */}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 {/* Proxy Summary Card */}
//                                 <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
//                                     <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
//                                         <div className="flex items-center gap-2">
//                                             <Server className="h-4 w-4 text-[#ff8a5c]" />
//                                             <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Proxy Summary</h3>
//                                         </div>
//                                     </div>
//                                     <div className="p-5 space-y-3">
//                                         <div className="flex justify-between items-center">
//                                             <span className="text-xs text-slate-400">API Proxy Type</span>
//                                             <span className="text-sm font-mono text-white bg-[#1a1f2e] px-2 py-0.5 rounded">
//                                                 {proxyDetails.proxy?.apiProxyType || 'PROGRAMMABLE'}
//                                             </span>
//                                         </div>
//                                         <div className="flex justify-between items-center">
//                                             <span className="text-xs text-slate-400">Latest Revision</span>
//                                             <span className="text-sm font-mono text-white bg-[#1a1f2e] px-2 py-0.5 rounded">
//                                                 {proxyDetails.proxy?.latestRevisionId || '—'}
//                                             </span>
//                                         </div>
//                                         <div className="flex justify-between items-center">
//                                             <span className="text-xs text-slate-400">Total Revisions</span>
//                                             <span className="text-sm font-mono text-white">{proxyDetails.revisions?.length || 0}</span>
//                                         </div>
//                                         <div className="flex justify-between items-center">
//                                             <span className="text-xs text-slate-400">Deployed Environments</span>
//                                             <span className="text-sm font-mono text-white">
//                                                 {proxyDetails.deployments?.deployments?.length || 0}
//                                             </span>
//                                         </div>
//                                         <div className="flex justify-between items-center">
//                                             <span className="text-xs text-slate-400">Created</span>
//                                             <span className="text-sm text-slate-300">
//                                                 {formatDate(proxyDetails.proxy?.metaData?.createdAt)}
//                                             </span>
//                                         </div>
//                                         <div className="flex justify-between items-center">
//                                             <span className="text-xs text-slate-400">Last Modified</span>
//                                             <span className="text-sm text-slate-300">
//                                                 {formatDate(proxyDetails.proxy?.metaData?.lastModifiedAt)}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Proxy Details Card */}
//                                 <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
//                                     <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
//                                         <div className="flex items-center gap-2">
//                                             <FileText className="h-4 w-4 text-[#ff8a5c]" />
//                                             <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Proxy Details</h3>
//                                         </div>
//                                     </div>
//                                     <div className="p-5 space-y-3">
//                                         <div className="flex items-center justify-between">
//                                             <span className="text-xs text-slate-400 block mb-1">Base Path(s)</span>
//                                             <div className="flex flex-wrap gap-2">
//                                                 {getLatestRevisionData()?.basepaths?.map((path, idx) => (
//                                                     <code key={idx} className="text-sm bg-[#1a1f2e] px-2 py-1 rounded text-[#4f8ef7]">
//                                                         {path}
//                                                     </code>
//                                                 )) || <span className="text-sm text-slate-500">—</span>}
//                                             </div>
//                                         </div>
//                                         <div className="flex items-center justify-between">
//                                             <span className="text-xs text-slate-400 block mb-1">Configuration Version</span>
//                                             <span className="text-sm text-white">
//                                                 v{getLatestRevisionData()?.configurationVersion?.majorVersion || '?'}
//                                             </span>
//                                         </div>
//                                         <div className="flex items-center justify-between">
//                                             <span className="text-xs text-slate-400 block mb-1">Policies</span>
//                                             <div className="flex flex-wrap gap-1.5">
//                                                 {getLatestRevisionData()?.policies?.map((policy, idx) => (
//                                                     <span key={idx} className="text-xs bg-[#2a3550] text-slate-200 px-2 py-0.5 rounded-full">
//                                                         {policy}
//                                                     </span>
//                                                 )) || <span className="text-sm text-slate-500">No policies defined</span>}
//                                             </div>
//                                         </div>
//                                         <div className="flex justify-between items-center pt-1">
//                                             <span className="text-xs text-slate-400">Extensible Policies</span>
//                                             <span className={`text-sm font-medium ${getLatestRevisionData()?.hasExtensiblePolicy ? 'text-green-400' : 'text-slate-500'}`}>
//                                                 {getLatestRevisionData()?.hasExtensiblePolicy ? 'Yes' : 'No'}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* ---- Deployments Section (Card style) ---- */}
//                             <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
//                                 <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50 flex justify-between items-center">
//                                     <div className="flex items-center gap-2">
//                                         <Rocket className="h-4 w-4 text-[#ff8a5c]" />
//                                         <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Deployments</h3>
//                                     </div>
//                                     <Badge variant="outline" className="text-xs border-[#2a3550] text-slate-400">
//                                         {proxyDetails.deployments?.deployments?.length || 0} active
//                                     </Badge>
//                                 </div>
//                                 <div className="overflow-x-auto">
//                                     <table className="w-full text-sm">
//                                         <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
//                                             <tr>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Environment</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Deployment Type</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Deployed At</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Status</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {proxyDetails.deployments?.deployments?.length > 0 ? (
//                                                 proxyDetails.deployments.deployments.map((dep, idx) => (
//                                                     <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
//                                                         <td className="p-3 font-mono text-white">{dep.environment}</td>
//                                                         <td className="p-3 font-mono text-white">{dep.revision}</td>
//                                                         <td className="p-3">
//                                                             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-300">
//                                                                 <CheckCircle className="h-3 w-3" /> {dep.proxyDeploymentType || 'EXTENSIBLE'}
//                                                             </span>
//                                                         </td>
//                                                         <td className="p-3 text-slate-400">{formatDate(dep.deployStartTime)}</td>
//                                                         <td className="p-3">
//                                                             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-300">
//                                                                 <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
//                                                             </span>
//                                                         </td>
//                                                     </tr>
//                                                 ))
//                                             ) : (
//                                                 <tr>
//                                                     <td colSpan="5" className="p-8 text-center text-slate-400">
//                                                         <Archive className="h-8 w-8 mx-auto mb-2 text-slate-600" />
//                                                         <p>No deployments found</p>
//                                                         <p className="text-xs mt-1">Deploy a revision to see it here</p>
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             </div>

//                             {/* ---- Revisions Section with enhanced table ---- */}
//                             <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
//                                 <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50 flex justify-between items-center flex-wrap gap-3">
//                                     <div className="flex items-center gap-2">
//                                         <History className="h-4 w-4 text-[#ff8a5c]" />
//                                         <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Revisions</h3>
//                                     </div>
//                                     <div className="relative">
//                                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
//                                         <input
//                                             type="text"
//                                             placeholder="Filter revisions or policies..."
//                                             value={revisionFilter}
//                                             onChange={(e) => setRevisionFilter(e.target.value)}
//                                             className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-8 pr-3 py-1.5 text-sm w-56 focus:outline-none focus:border-[#ff5b1f] text-white"
//                                         />
//                                     </div>
//                                 </div>
//                                 <div className="overflow-x-auto">
//                                     <table className="w-full text-sm">
//                                         <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
//                                             <tr>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Extensible</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Policies</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Last Modified</th>
//                                                 <th className="text-left p-3 text-[#5a6a8a] font-medium">Base Path</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {proxyDetails.revisionDetails
//                                                 ?.filter(revDetail => {
//                                                     const rev = revDetail.revision;
//                                                     const policies = revDetail.data?.policies?.join(', ') || '';
//                                                     return rev.toString().includes(revisionFilter) ||
//                                                         policies.toLowerCase().includes(revisionFilter.toLowerCase());
//                                                 })
//                                                 .map((revDetail, idx) => {
//                                                     const rev = revDetail.revision;
//                                                     const data = revDetail.data;
//                                                     const isLatest = rev === proxyDetails.proxy?.latestRevisionId;
//                                                     return (
//                                                         <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
//                                                             <td className="p-3">
//                                                                 <div className="flex items-center gap-2">
//                                                                     <span className="font-mono text-white font-medium">{rev}</span>
//                                                                     {isLatest && (
//                                                                         <span className="text-[10px] bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full font-medium">
//                                                                             Latest
//                                                                         </span>
//                                                                     )}
//                                                                 </div>
//                                                             </td>
//                                                             <td className="p-3">
//                                                                 {data?.hasExtensiblePolicy ? (
//                                                                     <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
//                                                                         <Check className="h-3 w-3" /> Yes
//                                                                     </span>
//                                                                 ) : (
//                                                                     <span className="text-slate-500 text-xs">No</span>
//                                                                 )}
//                                                             </td>
//                                                             <td className="p-3">
//                                                                 <div className="flex flex-wrap gap-1 max-w-xs">
//                                                                     {data?.policies?.length > 0 ? (
//                                                                         data.policies.slice(0, 3).map((p, i) => (
//                                                                             <span key={i} className="text-xs bg-[#2a3550] text-slate-300 px-1.5 py-0.5 rounded-full">
//                                                                                 {p}
//                                                                             </span>
//                                                                         ))
//                                                                     ) : (
//                                                                         <span className="text-slate-500 text-xs">—</span>
//                                                                     )}
//                                                                     {data?.policies?.length > 3 && (
//                                                                         <span className="text-xs text-slate-400">+{data.policies.length - 3}</span>
//                                                                     )}
//                                                                 </div>
//                                                             </td>
//                                                             <td className="p-3 text-slate-400 text-xs">{formatDate(data?.lastModifiedAt)}</td>
//                                                             <td className="p-3">
//                                                                 <code className="text-xs text-[#4f8ef7] bg-[#0f1117] px-2 py-1 rounded">
//                                                                     {data?.basepaths?.[0] || '/'}
//                                                                 </code>
//                                                             </td>
//                                                         </tr>
//                                                     );
//                                                 })}
//                                             {(!proxyDetails.revisionDetails || proxyDetails.revisionDetails.length === 0) && (
//                                                 <tr>
//                                                     <td colSpan="5" className="p-8 text-center text-slate-400">
//                                                         <Layers className="h-8 w-8 mx-auto mb-2 text-slate-600" />
//                                                         <p>No revisions available</p>
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             </div>
//                         </div>
//                     ) : null}
//                 </>
//             )}

//             {/* Deployment Modal */}
//             {deployModalOpen && (
//                 <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
//                     <div className="w-full max-w-md bg-[#111520] border border-[#27314e] rounded-xl shadow-2xl overflow-hidden">
//                         {/* Header */}
//                         <div className="flex justify-between items-center px-6 py-4 border-b border-[#27314e] bg-[#0f172a]">
//                             <h3 className="text-lg font-semibold text-white">Deploy Proxy</h3>
//                             <button
//                                 onClick={() => setDeployModalOpen(false)}
//                                 className="text-slate-400 hover:text-white transition-colors"
//                             >
//                                 <X className="w-5 h-5" />
//                             </button>
//                         </div>

//                         {/* Body */}
//                         <div className="p-6 space-y-4">
//                             {/* Deployment Mode Toggle */}
//                             <div className="flex gap-2 bg-[#1a1f2e] rounded-lg p-1">
//                                 <button
//                                     onClick={() => setDeployMode('ci-cd')}
//                                     className={`flex-1 py-2 text-sm font-medium rounded-md transition ${deployMode === 'ci-cd'
//                                         ? 'bg-[#ff5b1f] text-white'
//                                         : 'text-slate-400 hover:text-white'
//                                         }`}
//                                 >
//                                     CI/CD Pipeline
//                                 </button>
//                                 <button
//                                     onClick={() => setDeployMode('direct')}
//                                     className={`flex-1 py-2 text-sm font-medium rounded-md transition ${deployMode === 'direct'
//                                         ? 'bg-[#ff5b1f] text-white'
//                                         : 'text-slate-400 hover:text-white'
//                                         }`}
//                                 >
//                                     Direct Deploy
//                                 </button>
//                             </div>

//                             {/* Proxy Name (readonly) */}
//                             <div>
//                                 <label className="block text-xs font-medium text-slate-400 mb-1">
//                                     Proxy Name
//                                 </label>
//                                 <input
//                                     type="text"
//                                     value={proxy.name}
//                                     readOnly
//                                     className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white cursor-not-allowed"
//                                 />
//                             </div>

//                             {/* Revision / Artifact Version (different label per mode) */}
//                             <div>
//                                 <label className="block text-xs font-medium text-slate-400 mb-1">
//                                     {deployMode === 'ci-cd' ? 'Artifact Version *' : 'Revision *'}
//                                 </label>
//                                 {deployMode === 'direct' && availableRevisions.length > 0 ? (
//                                     <select
//                                         value={deployRevision}
//                                         onChange={(e) => setDeployRevision(e.target.value)}
//                                         className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
//                                     >
//                                         <option value="">Select revision</option>
//                                         {availableRevisions.map(rev => (
//                                             <option key={rev} value={rev}>Revision {rev}</option>
//                                         ))}
//                                     </select>
//                                 ) : (
//                                     <input
//                                         type="text"
//                                         placeholder="e.g., 17"
//                                         value={deployRevision}
//                                         onChange={(e) => setDeployRevision(e.target.value)}
//                                         className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
//                                     />
//                                 )}
//                             </div>

//                             {/* Environment */}
//                             <div>
//                                 <label className="block text-xs font-medium text-slate-400 mb-1">
//                                     Environment *
//                                 </label>
//                                 <select
//                                     value={deployEnv}
//                                     onChange={(e) => setDeployEnv(e.target.value)}
//                                     className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
//                                 >
//                                     <option value="">Select environment</option>
//                                     {availableEnvironments.map(env => (
//                                         <option key={env} value={env}>{env}</option>
//                                     ))}
//                                 </select>
//                             </div>

//                             {/* Artifact Source (only for CI/CD mode) */}
//                             {deployMode === 'ci-cd' && (
//                                 <div>
//                                     <label className="block text-xs font-medium text-slate-400 mb-1">
//                                         Artifact source *
//                                     </label>
//                                     <select
//                                         value={deploySource}
//                                         onChange={(e) => setDeploySource(e.target.value)}
//                                         className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
//                                     >
//                                         <option value="github">GitHub</option>
//                                         <option value="artifactory">Artifactory</option>
//                                     </select>
//                                 </div>
//                             )}
//                         </div>

//                         {/* Footer */}
//                         <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#0f172a]">
//                             <button
//                                 onClick={() => setDeployModalOpen(false)}
//                                 className="px-4 py-2 rounded-md border border-[#2a3550] text-sm text-slate-300 hover:bg-white/5"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={handleDeploy}
//                                 disabled={deploying}
//                                 className="px-4 py-2 rounded-md bg-[#ff5b1f] text-sm font-medium text-white hover:bg-[#ff6b36] disabled:opacity-50"
//                             >
//                                 {deploying ? 'Deploying...' : 'Deploy'}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// // Add inside GatewayOverview (or at top level)
// // const GatewayContextSelector = ({ selectedOrg, setSelectedOrg, selectedBU, setSelectedBU, selectedEnv, setSelectedEnv, showEnv = true }) => {
// //     const [organizations, setOrganizations] = useState([]);
// //     const [environments, setEnvironments] = useState([]);
// //     const [businessUnits, setBusinessUnits] = useState([]);
// //     const [loadingOrgs, setLoadingOrgs] = useState(false);
// //     const [loadingEnvs, setLoadingEnvs] = useState(false);
// //     const [loadingBUs, setLoadingBUs] = useState(false);

// //     const fetchToken = async () => {
// //         try {
// //             const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
// //             if (!res.ok) throw new Error(`Token service error: ${res.status}`);
// //             const data = await res.json();
// //             return data.access_token;
// //         } catch (err) {
// //             console.error('Token fetch error:', err);
// //             showMessage('Failed to obtain access token', 'error');
// //             return null;
// //         }
// //     };

// //     // Fetch organizations (same as existing fetchOrganizations)
// //     const fetchOrganizations = async () => {
// //         setLoadingOrgs(true);
// //         try {
// //             const token = await fetchToken();
// //             if (!token) return;
// //             const res = await fetch('https://forgesphere.probestack.io/apigee-wrapper/organizations', {
// //                 headers: { Authorization: `Bearer ${token}` }
// //             });
// //             const data = await res.json();
// //             let orgs = data.organizations?.map(o => o.organization).filter(Boolean) || [];
// //             if (orgs.length === 0) orgs = ['gen-ai-poc-onboarding'];
// //             setOrganizations(orgs);
// //             if (!selectedOrg && orgs[0]) setSelectedOrg(orgs[0]);
// //         } catch (err) {
// //             console.error(err);
// //             setOrganizations(['gen-ai-poc-onboarding']);
// //         } finally {
// //             setLoadingOrgs(false);
// //         }
// //     };

// //     // Fetch environments for selectedOrg
// //     const fetchEnvironments = async (org) => {
// //         if (!org) return;
// //         setLoadingEnvs(true);
// //         try {
// //             const token = await fetchToken();
// //             if (!token) return;
// //             const res = await fetch(`https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/environments`, {
// //                 headers: { Authorization: `Bearer ${token}` }
// //             });
// //             const data = await res.json();
// //             setEnvironments(data);
// //             if (!selectedEnv && data[0]) setSelectedEnv(data[0]);
// //         } catch (err) {
// //             console.error(err);
// //             setEnvironments([]);
// //         } finally {
// //             setLoadingEnvs(false);
// //         }
// //     };

// //     // Fetch business units from backend, filter by selectedOrg
// //     const fetchBusinessUnits = async (org) => {
// //         if (!org) return;
// //         setLoadingBUs(true);
// //         try {
// //             const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
// //             const result = await res.json();
// //             const allBUs = result.data || [];
// //             // Filter BUs by the selected organization (assumes each BU has a gatewayOrganizations field or similar)
// //             // Here we assume BUs have a 'gatewayOrgName' or we use the BU's associated organization.
// //             // If not, we show all BUs. You can adjust the filtering logic.
// //             const filtered = allBUs.filter(bu => bu.gatewayOrgName === org || !org);
// //             setBusinessUnits(filtered);
// //             if (!selectedBU && filtered[0]) setSelectedBU(filtered[0].id);
// //         } catch (err) {
// //             console.error(err);
// //             setBusinessUnits([]);
// //         } finally {
// //             setLoadingBUs(false);
// //         }
// //     };

// //     useEffect(() => {
// //         fetchOrganizations();
// //     }, []);

// //     useEffect(() => {
// //         if (selectedOrg) {
// //             fetchEnvironments(selectedOrg);
// //             fetchBusinessUnits(selectedOrg);
// //         }
// //     }, [selectedOrg]);

// //     return (
// //         <div className="flex items-center gap-3 flex-wrap">
// //             <div className="relative">
// //                 <select
// //                     value={selectedOrg || ''}
// //                     onChange={(e) => setSelectedOrg(e.target.value)}
// //                     className="bg-[#1a1f2e] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
// //                     disabled={loadingOrgs}
// //                 >
// //                     <option value="">Gateway Org</option>
// //                     {organizations.map(org => (
// //                         <option key={org} value={org}>{org}</option>
// //                     ))}
// //                 </select>
// //                 {loadingOrgs && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
// //             </div>

// //             <div className="relative">
// //                 <select
// //                     value={selectedBU || ''}
// //                     onChange={(e) => setSelectedBU(e.target.value)}
// //                     className="bg-[#1a1f2e] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
// //                     disabled={loadingBUs}
// //                 >
// //                     <option value="">BU Name</option>
// //                     {businessUnits.map(bu => (
// //                         <option key={bu.id} value={bu.id}>{bu.teamName}</option>
// //                     ))}
// //                 </select>
// //                 {loadingBUs && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
// //             </div>

// //             {showEnv && (
// //                 <div className="relative">
// //                     <select
// //                         value={selectedEnv || ''}
// //                         onChange={(e) => setSelectedEnv(e.target.value)}
// //                         className="bg-[#1a1f2e] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
// //                         disabled={loadingEnvs}
// //                     >
// //                         <option value="">Gateway Env</option>
// //                         {environments.map(env => (
// //                             <option key={env} value={env}>{env}</option>
// //                         ))}
// //                     </select>
// //                     {loadingEnvs && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
// //                 </div>
// //             )}
// //         </div>
// //     );
// // };

// const GatewayOverview = ({ showHeader = false, searchTerm, setSearchTerm, proxyList, selectedProxyId, onProxyClick, showMessage }) => {
//     const navigate = useNavigate();
//     const location = useLocation();
//     const [dashboardBuCount, setDashboardBuCount] = useState(0);
//     const [dashboardTeamMemberCount, setDashboardTeamMemberCount] = useState(0);
//     const [dashboardConsumerCount, setDashboardConsumerCount] = useState(0);
//     const [apiProxies, setApiProxies] = useState([]);
//     const [editingBuId, setEditingBuId] = useState(null);
//     const [submittingBu, setSubmittingBu] = useState(false);
//     const [loadingProxies, setLoadingProxies] = useState(false);
//     const [proxiesError, setProxiesError] = useState(null);
//     const [currentApplicationId, setCurrentApplicationId] = useState(null);
//     const [isCreateNewOnboarding, setIsCreateNewOnboarding] = useState(false);
//     const [sharedFlows, setSharedFlows] = useState([]);
//     const [loadingSharedFlows, setLoadingSharedFlows] = useState(false);
//     const [sharedFlowsError, setSharedFlowsError] = useState(null);
//     const [selectedMenuItem, setSelectedMenuItem] = useState('gateway-onboarding');
//     const [selectedProxyDetail, setSelectedProxyDetail] = useState(null);
//     const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
//     const [selectedOrg, setSelectedOrg] = useState('');
//     const [selectedBU, setSelectedBU] = useState('');
//     const [selectedEnv, setSelectedEnv] = useState('');
//     const [apiTypeFilter, setApiTypeFilter] = useState('ALL'); // 'ALL', 'REST', 'SOAP'
//     const [sectionsExpanded, setSectionsExpanded] = useState({
//         proxyDev: true,
//         distribution: true,
//         analytics: true,
//         management: true,
//         deployment: true,
//         intelligentGateways: true,
//         forgeHub: true,
//     });
//     // Onboarding view mode: 'form' or 'history'
//     const [onboardingView, setOnboardingView] = useState('form');

//     // Additional history data
//     const [buSubmissions, setBuSubmissions] = useState([]);
//     const [teamSubmissions, setTeamSubmissions] = useState([]);
//     const [historyActiveTab, setHistoryActiveTab] = useState('organization'); // 'organization', 'bu', 'team'
//     // Create Proxy Modal state (single object)
//     const [createProxyModal, setCreateProxyModal] = useState({
//         open: false,
//         step: 1, // 1 = details, 2 = deploy
//         template: 'reverse', // 'reverse', 'no-target', 'upload'
//         name: '',
//         basePath: '/',
//         description: '',
//         targetUrl: '',
//         zipFile: null,
//         deploymentEnvs: [], // array of strings
//         serviceAccount: '',
//         type: 'REST',
//         openApiSpecFile: null,
//         specParsed: false,
//         specError: null,
//     });

//     // ========== ONBOARDING STATE ==========
//     const [gatewayOnboardingStep, setGatewayOnboardingStep] = useState('organization');
//     const [orgApprovalStatus, setOrgApprovalStatus] = useState(null);
//     const [isSendingApproval, setIsSendingApproval] = useState(false);
//     const [approvalMessage, setApprovalMessage] = useState(null);
//     const [businessUnitCompleted, setBusinessUnitCompleted] = useState(() => {
//         return localStorage.getItem('buCompleted') === 'true';
//     });
//     const [isSavingDraft, setIsSavingDraft] = useState(false);

//     // Company & Stakeholder (split name + phone)
//     const [company, setCompany] = useState({ name: '', websiteUrl: '', region: '' });
//     const [orgOnboardingData, setOrgOnboardingData] = useState({
//         firstName: '',
//         lastName: '',
//         ownerEmail: '',
//         phoneNumber: '',
//         sme: '',
//         smeEmail: '',
//         dlEmail: '',
//         goLiveDate: '',
//     });

//     // Gateway Organizations
//     const generateGatewayId = (prefix = 'g') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

//     const [gatewayOrgs, setGatewayOrgs] = useState([
//         { id: generateGatewayId(), name: '', region: '', config: { environmentType: 'nonprod', selectedEnvironments: [], customEnvironments: '', expectedTps: '', expectedApiRange: '', notes: '' } }
//     ]);

//     // ========== PREVIEW & HISTORY ==========
//     const [showPreviewModal, setShowPreviewModal] = useState(false);
//     const [showHistoryModal, setShowHistoryModal] = useState(false);
//     const [organizationSubmissions, setOrganizationSubmissions] = useState([]);
//     const [isCheckingStatus, setIsCheckingStatus] = useState(false);

//     const [availableCreateEnvs, setAvailableCreateEnvs] = useState([]);
//     const [loadingCreateEnvs, setLoadingCreateEnvs] = useState(false);

//     // Load history from localStorage
//     useEffect(() => {
//         fetchAllApplications();
//     }, []);
//     useEffect(() => {
//         if (createProxyModal.open && selectedOrg) {
//             fetchCreateEnvironments();
//         }
//     }, [createProxyModal.open, selectedOrg]);

//     const fetchToken = async () => {
//         try {
//             const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
//             if (!res.ok) throw new Error(`Token service error: ${res.status}`);
//             const data = await res.json();
//             return data.access_token;
//         } catch (err) {
//             console.error('Token fetch error:', err);
//             showMessage('Failed to obtain access token', 'error');
//             return null;
//         }
//     };
//     const fetchCreateEnvironments = async () => {
//         setLoadingCreateEnvs(true);
//         try {
//             const token = await fetchToken();
//             const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/${selectedOrg}/environments`;
//             const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//             if (response.ok) {
//                 const data = await response.json();
//                 setAvailableCreateEnvs(data);
//             }
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoadingCreateEnvs(false);
//         }
//     };

//     const generateProxyZip = async (template, { name, basePath, targetUrl }) => {
//         const zip = new JSZip();
//         const apiproxyFolder = zip.folder('apiproxy');

//         // Common APIProxy XML (with name and basePath)
//         const apiProxyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <APIProxy revision="1" name="${name}">
//   <DisplayName/>
//   <Description/>
//   <CreatedAt>${Date.now()}</CreatedAt>
//   <LastModifiedAt>${Date.now()}</LastModifiedAt>
//   <BasePaths>${basePath}</BasePaths>
//   <ProxyEndpoints>
//     <ProxyEndpoint>default</ProxyEndpoint>
//   </ProxyEndpoints>
//   ${template === 'reverse' ? '<TargetEndpoints><TargetEndpoint>default</TargetEndpoint></TargetEndpoints>' : ''}
// </APIProxy>`;
//         apiproxyFolder.file(`${name}.xml`, apiProxyXml);

//         // Proxies folder with default.xml
//         const proxiesFolder = apiproxyFolder.folder('proxies');
//         const proxyEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <ProxyEndpoint name="default">
//   <Description/>
//   <FaultRules/>
//   <PreFlow name="PreFlow"><Request/><Response/></PreFlow>
//   <PostFlow name="PostFlow"><Request/><Response/></PostFlow>
//   <Flows/>
//   <HTTPProxyConnection>
//     <BasePath>${basePath}</BasePath>
//     <Properties/>
//   </HTTPProxyConnection>
//   <RouteRule name="default"/>
// </ProxyEndpoint>`;
//         proxiesFolder.file('default.xml', proxyEndpointXml);

//         if (template === 'reverse') {
//             // Targets folder with default.xml containing target URL
//             const targetsFolder = apiproxyFolder.folder('targets');
//             const targetEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <TargetEndpoint name="default">
//   <Description/>
//   <FaultRules/>
//   <PreFlow name="PreFlow"><Request/><Response/></PreFlow>
//   <PostFlow name="PostFlow"><Request/><Response/></PostFlow>
//   <Flows/>
//   <HTTPTargetConnection>
//     <Properties/>
//     <URL>${targetUrl}</URL>
//   </HTTPTargetConnection>
// </TargetEndpoint>`;
//             targetsFolder.file('default.xml', targetEndpointXml);
//         }

//         const content = await zip.generateAsync({ type: 'blob' });
//         return new File([content], `${name}.zip`, { type: 'application/zip' });
//     };

//     const updateProxyForm = (updates) => {
//         setCreateProxyModal(prev => ({ ...prev, ...updates }));
//     };
//     const handleProxySelect = (proxy) => {
//         onProxyClick(proxy.id);
//         setSelectedProxyDetail(proxy);
//     };
//     const resetProxyForm = () => {
//         setCreateProxyModal({
//             open: false,
//             // step: 1,
//             template: 'reverse',
//             name: '',
//             basePath: '/',
//             description: '',
//             targetUrl: '',
//             zipFile: null,
//             deploymentEnvs: [],
//             serviceAccount: '',
//             apiType: 'REST',
//             openApiSpecFile: null,
//             specParsed: false,
//             specError: null,
//         });
//     };

//     const refreshProxies = async () => {
//         setLoadingProxies(true);
//         try {
//             const token = await fetchToken();
//             const response = await fetch('https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/apis/details', {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             const data = await response.json();
//             setApiProxies(data.proxies || []);
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoadingProxies(false);
//         }
//     };
//     // Create Shared Flow Modal state
//     const [createSharedFlowModal, setCreateSharedFlowModal] = useState({
//         open: false,
//         name: '',
//         description: ''
//     });

//     const updateSharedFlowForm = (updates) => {
//         setCreateSharedFlowModal(prev => ({ ...prev, ...updates }));
//     };

//     const resetSharedFlowForm = () => {
//         setCreateSharedFlowModal({
//             open: false,
//             name: '',
//             description: ''
//         });
//     };

//     const buildPayload = () => ({
//         company: {
//             name: company.name,
//             websiteUrl: company.websiteUrl,
//             region: company.region,
//         },
//         stakeholder: {
//             firstName: orgOnboardingData.firstName,
//             lastName: orgOnboardingData.lastName,
//             email: orgOnboardingData.ownerEmail,
//             phone: orgOnboardingData.phoneNumber,
//             sme: orgOnboardingData.sme,
//             smeEmail: orgOnboardingData.smeEmail,
//             dlEmail: orgOnboardingData.dlEmail,
//         },
//         gatewayOrganizations: gatewayOrgs.map(org => ({
//             id: org.id,
//             name: org.name,
//             region: org.region,
//             config: {
//                 environmentType: org.config.environmentType,
//                 selectedEnvironments: org.config.selectedEnvironments,
//                 customEnvironments: org.config.customEnvironments,
//                 expectedTps: org.config.expectedTps,
//                 expectedApiRange: org.config.expectedApiRange,
//                 notes: org.config.notes,
//             }
//         })),
//     });

//     const validateSharedFlow = () => {
//         if (!createSharedFlowModal.name.trim()) {
//             showMessage('Shared Flow name is required.', 'error');
//             return false;
//         }
//         return true;
//     };
//     // Helper: store a submission with given status
//     const storeSubmission = (status, additionalData = {}) => {
//         const submission = {
//             id: Date.now(),
//             company,
//             stakeholder: {
//                 firstName: orgOnboardingData.firstName,
//                 lastName: orgOnboardingData.lastName,
//                 email: orgOnboardingData.ownerEmail,
//                 phone: orgOnboardingData.phoneNumber,
//                 sme: orgOnboardingData.sme,
//                 smeEmail: orgOnboardingData.smeEmail,
//                 dlEmail: orgOnboardingData.dlEmail,
//             },
//             gatewayOrganizations: gatewayOrgs,
//             status,
//             timestamp: new Date().toISOString(),
//             ...additionalData,
//         };
//         const updated = [submission, ...organizationSubmissions];
//         setOrganizationSubmissions(updated);
//         localStorage.setItem('orgSubmissions', JSON.stringify(updated));
//         return submission.id;
//     };

//     // Update status of a stored submission (e.g., when polled from backend)
//     const updateSubmissionStatus = (submissionId, newStatus) => {
//         const updated = organizationSubmissions.map(sub =>
//             sub.id === submissionId ? { ...sub, status: newStatus } : sub
//         );
//         setOrganizationSubmissions(updated);
//         localStorage.setItem('orgSubmissions', JSON.stringify(updated));
//     };

//     const mapStatus = (status) => {
//         if (status === 'PENDING_APPROVAL') return 'pending';
//         if (status === 'DRAFT') return 'draft';
//         if (status === 'APPROVED') return 'approved';
//         if (status === 'REJECTED') return 'rejected';
//         return status.toLowerCase();
//     };
//     const checkApprovalStatus = async () => {
//         if (!currentApplicationId) {
//             showMessage('No application ID found. Please submit for approval first.', 'error');
//             return;
//         }
//         setIsCheckingStatus(true);
//         try {
//             const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentApplicationId}`);
//             if (!response.ok) throw new Error('Failed to fetch status');
//             const data = await response.json();
//             const frontendStatus = mapStatus(data.status);
//             setOrgApprovalStatus(frontendStatus);
//             if (frontendStatus === 'approved') {
//                 showMessage('Organization approved! You can now proceed to Business Unit onboarding.', 'success');
//                 setGatewayOnboardingStep('businessUnit');
//             } else if (frontendStatus === 'rejected') {
//                 showMessage('Organization request was rejected. Please update and resend.', 'error');
//                 // keep step as organization
//             } else if (frontendStatus === 'pending') {
//                 showMessage('Still pending approval. Please wait.', 'info');
//             }
//         } catch (err) {
//             console.error(err);
//             showMessage('Failed to check status. Please try again.', 'error');
//         } finally {
//             setIsCheckingStatus(false);
//         }
//     };
//     // Load an approved submission into current form
//     const loadSubmission = async (id) => {
//         try {
//             const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${id}`);
//             if (!response.ok) {
//                 throw new Error('Failed to fetch submission details');
//             }
//             const data = await response.json();

//             // Populate company
//             setCompany(data.company);

//             // Populate stakeholder
//             setOrgOnboardingData({
//                 firstName: data.stakeholder.firstName,
//                 lastName: data.stakeholder.lastName,
//                 ownerEmail: data.stakeholder.email,
//                 phoneNumber: data.stakeholder.phone,
//                 sme: data.stakeholder.sme || '',
//                 smeEmail: data.stakeholder.smeEmail || '',
//                 dlEmail: data.stakeholder.dlEmail || '',
//                 goLiveDate: '',
//             });

//             // Populate gateway organizations
//             setGatewayOrgs(data.gatewayOrganizations.map(org => ({
//                 id: org.id,
//                 name: org.name,
//                 region: org.region,
//                 config: {
//                     environmentType: org.config.environmentType,
//                     selectedEnvironments: org.config.selectedEnvironments,
//                     customEnvironments: org.config.customEnvironments || '',
//                     expectedTps: org.config.expectedTps,
//                     expectedApiRange: org.config.expectedApiRange,
//                     notes: org.config.notes || '',
//                 }
//             })));

//             const frontendStatus = mapStatus(data.status);
//             setOrgApprovalStatus(frontendStatus);
//             setCurrentApplicationId(data.id);

//             // If already approved, allow business unit step
//             if (frontendStatus === 'approved') {
//                 setGatewayOnboardingStep('businessUnit');
//             } else {
//                 setGatewayOnboardingStep('organization');
//             }

//             setShowHistoryModal(false);
//             showMessage(`${frontendStatus.toUpperCase()} organization loaded.`, 'success');
//         } catch (err) {
//             console.error('Error loading submission:', err);
//             showMessage('Failed to load submission details.', 'error');
//         }
//     };

//     // ========== VALIDATION ==========
//     const isValidEmail = (email) => /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);

//     const validateOrgForm = () => {
//         if (!company.name) { showMessage('Company name is required', 'error'); return false; }
//         if (!orgOnboardingData.firstName || !orgOnboardingData.lastName) { showMessage('First and Last name are required', 'error'); return false; }
//         if (!isValidEmail(orgOnboardingData.ownerEmail)) { showMessage('Valid Owner Email is required', 'error'); return false; }
//         if (!orgOnboardingData.phoneNumber) { showMessage('Contact number is required', 'error'); return false; }
//         const hasValidGatewayOrg = gatewayOrgs.some(org => org.name.trim() !== '');
//         if (!hasValidGatewayOrg) { showMessage('At least one Gateway Organization name is required', 'error'); return false; }
//         return true;
//     };
//     const fetchBuHistory = async () => {
//         try {
//             const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
//             if (!response.ok) throw new Error('Failed to fetch business units');
//             const result = await response.json();
//             // API returns { status, data: [...] }
//             setBuSubmissions(result.data || []);
//         } catch (err) {
//             console.error('Error fetching BU history:', err);
//             setBuSubmissions([]);
//         }
//     };
//     const resetBuForm = () => {
//         setOnboardingTeamName('');
//         setOnboardingApplicationName('');
//         setOnboardingApplicationId('');
//         setOnboardingProjectOwner('');
//         setOnboardingOwnerEmail('');
//         setOnboardingProjectSME('');
//         setOnboardingProjectSMEEmail('');
//         setOnboardingProjectDLEmail('');
//         setOnboardingGoLiveDate('');
//         setOnboardingTesterName('');
//         setOnboardingTesterEmail('');
//         setOnboardingServiceNowGroup('');
//         setOnboardingServiceNowEmail('');
//         setTeamMembers([]);        // Clear team members
//         setSelectedOnboardingConsumers([]);
//         setEditingBuId(null);
//     };
//     const loadBusinessUnit = (bu) => {
//         setOnboardingTeamName(bu.teamName);
//         setOnboardingApplicationName(bu.applicationName);
//         setOnboardingApplicationId(bu.applicationId || '');
//         setOnboardingProjectOwner(bu.projectOwner || '');
//         setOnboardingOwnerEmail(bu.ownerEmail || '');
//         setOnboardingProjectSME(bu.projectSME || '');
//         setOnboardingProjectSMEEmail(bu.projectSMEEmail || '');
//         setOnboardingProjectDLEmail(bu.projectDLEmail || '');
//         setOnboardingGoLiveDate(bu.expectedGoLiveDate || '');
//         setOnboardingTesterName(bu.testerName || '');
//         setOnboardingTesterEmail(bu.testerEmail || '');
//         setOnboardingServiceNowGroup(bu.servicenowGroupName || '');
//         setOnboardingServiceNowEmail(bu.servicenowEmail || '');

//         // Load team members (ensure each has id, name, email, role)
//         if (bu.members && Array.isArray(bu.members)) {
//             setTeamMembers(bu.members);
//         } else {
//             setTeamMembers([]);
//         }

//         // Load selected consumers: map from bu.consumers to savedConsumers IDs
//         if (bu.consumers && Array.isArray(bu.consumers)) {
//             const selectedIds = bu.consumers.map(c => c.id);
//             setSelectedOnboardingConsumers(selectedIds);
//         } else {
//             setSelectedOnboardingConsumers([]);
//         }

//         setEditingBuId(bu.id);
//         showMessage(`Loaded business unit "${bu.teamName}" for editing`, 'success');
//     };

//     const fetchTeamHistory = async () => {
//         try {
//             if(buSubmissions){
//                 const allMembers = buSubmissions.flatMap(unit => unit.members || []);

//                     const uniqueMembersMap = new Map();
//                     allMembers.forEach(member => {
//                         if (member.email && !uniqueMembersMap.has(member.email)) {
//                             uniqueMembersMap.set(member.email, member);
//                         }
//                     });
//                     const uniqueMembers = Array.from(uniqueMembersMap.values());

//                     setTeamSubmissions(uniqueMembers);
//             }else {
//             const stored = localStorage.getItem('teamSubmissions');
//             if (stored) {
//                 setTeamSubmissions(JSON.parse(stored));
//             } else {
//                 setTeamSubmissions([]);
//             }}
//         } catch (err) {
//             console.error('Failed to load Team history', err);
//         }
//     };
//     useEffect(() => {
//         const fetchProxies = async () => {
//             setLoadingProxies(true);
//             setProxiesError(null);
//             try {
//                 const token = await fetchToken();
//                 if (!token) {
//                     throw new Error('Failed to obtain access token');
//                 }
//                 const response = await fetch('https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/apis/details', {
//                     headers: {
//                         'Authorization': `Bearer ${token}`
//                     }
//                 });
//                 if (!response.ok) {
//                     throw new Error(`Failed to fetch proxies: ${response.statusText}`);
//                 }
//                 const data = await response.json();
//                 // Assuming the API returns an array of proxy objects.
//                 // Adjust based on the actual API response structure.
//                 setApiProxies(data.proxies || []);
//             } catch (err) {
//                 console.error('Error fetching proxies:', err);
//                 setProxiesError(err.message);
//                 showMessage(`Could not load proxies: ${err.message}`, 'error');
//             } finally {
//                 setLoadingProxies(false);
//             }
//         };
//         const fetchSharedFlows = async () => {
//             setLoadingSharedFlows(true);
//             setSharedFlowsError(null);
//             try {
//                 const token = await fetchToken();
//                 if (!token) throw new Error('Failed to obtain access token');
//                 const response = await fetch('https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/sharedflows/details', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) throw new Error(`Failed to fetch shared flows: ${response.statusText}`);
//                 const data = await response.json();

//                 // Safely extract array from possible response structures
//                 let flowsArray = [];
//                 if (data.sharedflows && Array.isArray(data.sharedflows)) {
//                     flowsArray = data.sharedflows;
//                 } else if (Array.isArray(data)) {
//                     flowsArray = data;
//                 } else if (data.sharedFlows && Array.isArray(data.sharedFlows)) {
//                     flowsArray = data.sharedFlows;
//                 } else {
//                     flowsArray = [];
//                 }

//                 setSharedFlows(flowsArray);
//             } catch (err) {
//                 console.error('Error fetching shared flows:', err);
//                 setSharedFlowsError(err.message);
//                 showMessage(`Could not load shared flows: ${err.message}`, 'error');
//             } finally {
//                 setLoadingSharedFlows(false);
//             }
//         };

//         fetchProxies();
//         fetchSharedFlows();
//     }, []); // Empty dependency array ensures this runs once when the component mounts.

//     // When history view becomes active, load the appropriate data
//     useEffect(() => {
//         if (onboardingView === 'history') {
//             fetchAllApplications(); // organization submissions
//             fetchBuHistory();
//             fetchTeamHistory();
//         }
//     }, [onboardingView]);
//     const submitBusinessUnit = async () => {
//         if (!onboardingTeamName || !onboardingApplicationName) {
//             showMessage('Team Name and Application Name are required', 'error');
//             return;
//         }

//         // Build members array (exactly as stored)
//         const membersPayload = teamMembers.map(m => ({
//             id: m.id,
//             name: m.name,
//             email: m.email,
//             role: m.role || null,
//         }));

//         // Build consumers array from selected consumer IDs
//         const consumersPayload = selectedOnboardingConsumers.map(consumerId => {
//             const consumer = savedConsumers.find(c => c.id === consumerId);
//             return {
//                 id: consumer.id,
//                 consumerId: consumer.consumerId || consumer.id, // fallback to id if consumerId missing
//                 name: consumer.consumerName || 'Unnamed',
//             };
//         });

//         const payload = {
//             onboardingId: currentApplicationId || null,
//             teamName: onboardingTeamName,
//             applicationName: onboardingApplicationName,
//             applicationId: onboardingApplicationId,
//             projectOwner: onboardingProjectOwner,
//             ownerEmail: onboardingOwnerEmail,
//             projectSME: onboardingProjectSME,
//             projectSMEEmail: onboardingProjectSMEEmail,
//             projectDLEmail: onboardingProjectDLEmail,
//             expectedGoLiveDate: onboardingGoLiveDate, // YYYY-MM-DD
//             testerName: onboardingTesterName,
//             testerEmail: onboardingTesterEmail,
//             servicenowGroupName: onboardingServiceNowGroup,
//             servicenowEmail: onboardingServiceNowEmail,
//             members: membersPayload,
//             consumers: consumersPayload,
//         };

//         setSubmittingBu(true);
//         try {
//             let url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units`;
//             let method = 'POST';
//             if (editingBuId) {
//                 url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editingBuId}`;
//                 method = 'PUT';
//             }

//             const response = await fetch(url, {
//                 method,
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(payload),
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.message || 'Submission failed');
//             }

//             const result = await response.json();
//             showMessage(result.message || 'Business unit submitted successfully', 'success');

//             // Reset editing state and clear form
//             setEditingBuId(null);
//             resetBuForm();       // optional: clear all BU fields
//             // Refresh BU history list
//             fetchBuHistory();
//             // Optionally mark onboarding completed (if required)
//             localStorage.setItem('buCompleted', 'true');
//             setBusinessUnitCompleted(true);
//         } catch (err) {
//             console.error(err);
//             showMessage(err.message, 'error');
//         } finally {
//             setSubmittingBu(false);
//         }
//     };


//     const fetchAllApplications = async () => {
//         try {
//             const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`);
//             if (response.ok) {
//                 const data = await response.json();
//                 setOrganizationSubmissions(data);
//             } else {
//                 console.error('Failed to fetch applications');
//             }
//         } catch (err) {
//             console.error('Error fetching applications:', err);
//         }
//     };

//     // ========== SAVE AS DRAFT ==========
//     const saveAsDraft = async () => {
//         if (!validateOrgForm()) return;
//         setIsSavingDraft(true);
//         setApprovalMessage(null);

//         try {
//             const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(buildPayload()),
//             });

//             if (response.ok) {
//                 await fetchAllApplications();
//                 const data = await response.json();
//                 setCurrentApplicationId(data.id);
//                 setOrgApprovalStatus('draft');
//                 setApprovalMessage('Draft saved successfully.');
//                 showMessage('Organization data saved as draft.', 'success');
//             } else {
//                 throw new Error('Failed to save draft');
//             }
//         } catch (err) {
//             console.error(err);
//             setApprovalMessage('Failed to save draft. Please try again.');
//             showMessage('Failed to save draft.', 'error');
//         } finally {
//             setIsSavingDraft(false);
//         }
//     };
//     const sendApprovalRequest = async () => {
//         if (!validateOrgForm()) return;
//         setIsCreateNewOnboarding(false);
//         setIsSendingApproval(true);
//         setApprovalMessage(null);

//         try {
//             let appId = currentApplicationId;

//             // Step 1: If no application ID exists, create a draft first
//             if (!appId) {
//                 const draftRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/draft`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify(buildPayload()),
//                 });
//                 if (!draftRes.ok) throw new Error('Failed to create draft');
//                 const draftData = await draftRes.json();
//                 appId = draftData.id;
//                 setCurrentApplicationId(appId);
//             }

//             // Step 2: Submit for approval using the application ID
//             const submitPayload = {
//                 ...buildPayload(),
//                 targetEmail: 'info@probestack.io',
//             };

//             const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(submitPayload),
//             });

//             if (submitRes.ok) {
//                 await fetchAllApplications();
//                 setOrgApprovalStatus('pending');
//                 setApprovalMessage('Approval request sent. Waiting for admin to review.');
//                 startPolling(appId);
//             } else {
//                 const errorText = await submitRes.text();
//                 throw new Error(errorText || 'Failed to submit for approval');
//             }
//         } catch (err) {
//             console.error(err);
//             setApprovalMessage(err.message || 'Network error. Could not send approval.');
//             showMessage('Failed to send approval request.', 'error');
//         } finally {
//             setIsSendingApproval(false);
//         }
//     };
//     // const submitBusinessUnit = () => {
//     //     if (!onboardingTeamName || !onboardingApplicationName) {
//     //         showMessage('Team Name and Application Name are required', 'error');
//     //         return;
//     //     }
//     //     localStorage.setItem('buCompleted', 'true');
//     //     setBusinessUnitCompleted(true);
//     //     showMessage('Business Unit onboarding completed successfully!', 'success');
//     // };

//     const startPolling = (appId) => {
//         if (window._approvalInterval) clearInterval(window._approvalInterval);
//         window._approvalInterval = setInterval(async () => {
//             try {
//                 const res = await fetch(`/gatewayonboarding/api/v1/applications/${appId}/status`);
//                 if (res.ok) {
//                     const data = await res.json();
//                     setOrgApprovalStatus(data.status);
//                     if (data.status !== 'pending') {
//                         clearInterval(window._approvalInterval);
//                         if (data.status === 'approved') {
//                             setGatewayOnboardingStep('businessUnit');
//                             showMessage('Organization approved! You can now proceed to Business Unit onboarding.', 'success');
//                         } else if (data.status === 'rejected') {
//                             showMessage('Organization request was rejected. Please update and resend.', 'error');
//                         }
//                     }
//                 }
//             } catch (err) {
//                 console.error('Polling error', err);
//             }
//         }, 10000);
//     };
//     // ========== ONBOARDING GUARD ==========
//     const isFullyOnboarded = () => {
//         return orgApprovalStatus === 'approved' && businessUnitCompleted;
//     };
//     const handleAIGatewayClick = () => {
//         window.open('https://forgeai.probestack.io', '_blank', 'noopener,noreferrer');
//         // Optionally you can also set selectedMenuItem for highlighting if desired
//         // setSelectedMenuItem('ai-gateway');
//     };

//     const handleMCPGatewayClick = () => {
//         // Replace with actual URL when available, or show a message
//         // window.open('https://mcp-gateway.probestack.io', '_blank');
//         showMessage('MCP Gateway is coming soon!', 'info');
//         setSelectedMenuItem('mcp-gateway');
//     };

//     const checkAccessAndNavigate = (menuItem) => {
//         if (menuItem === 'gateway-onboarding') {
//             selectSidebarMenu(menuItem);
//             return true;
//         }
//         // if (!isFullyOnboarded()) {
//         //     showMessage('Business Unit or Team Onboarding is required to access this section.', 'error');
//         //     return false;
//         // }
//         selectSidebarMenu(menuItem);
//         return true;
//     };

//     const parseOpenApiSpec = async (file) => {
//         return new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onload = (e) => {
//                 const content = e.target.result;
//                 let spec;
//                 try {
//                     // Try JSON first
//                     spec = JSON.parse(content);
//                 } catch (jsonError) {
//                     try {
//                         // Then try YAML (supports .yml and .yaml)
//                         spec = yaml.load(content);
//                     } catch (yamlError) {
//                         // Provide detailed error from YAML parser
//                         reject(new Error(`Failed to parse OpenAPI file: ${yamlError.message}`));
//                         return;
//                     }
//                 }

//                 // Validate required fields
//                 if (!spec.info || !spec.info.title) {
//                     reject(new Error('OpenAPI spec missing "info.title" field.'));
//                     return;
//                 }
//                 if (!spec.servers || spec.servers.length === 0) {
//                     reject(new Error('OpenAPI spec missing "servers" array or it is empty.'));
//                     return;
//                 }

//                 // Extract data (same as before)
//                 let proxyName = spec.info.title
//                     .toLowerCase()
//                     .replace(/[^a-z0-9]+/g, '-')
//                     .replace(/^-|-$/g, '');

//                 let basePath = '/';
//                 let targetUrl = '';
//                 const serverUrl = spec.servers[0].url;
//                 try {
//                     const urlObj = new URL(serverUrl);
//                     targetUrl = `${urlObj.protocol}//${urlObj.host}`;
//                     basePath = urlObj.pathname || '/';
//                     if (!basePath.endsWith('/')) basePath += '/';
//                 } catch (e) {
//                     targetUrl = serverUrl;
//                     basePath = '/';
//                 }

//                 const description = spec.info.description || '';

//                 resolve({
//                     name: proxyName,
//                     basePath: basePath,
//                     description: description,
//                     targetUrl: targetUrl,
//                 });
//             };
//             reader.onerror = () => reject(new Error('Failed to read file.'));
//             reader.readAsText(file);
//         });
//     };

//     const handleOpenApiUpload = async (file) => {
//         setCreateProxyModal(prev => ({ ...prev, specError: null, openApiSpecFile: file }));
//         try {
//             const extracted = await parseOpenApiSpec(file);
//             setCreateProxyModal(prev => ({
//                 ...prev,
//                 name: extracted.name,
//                 basePath: extracted.basePath,
//                 description: extracted.description,
//                 targetUrl: extracted.targetUrl,
//                 specParsed: true,
//                 specError: null,
//             }));
//         } catch (err) {
//             setCreateProxyModal(prev => ({
//                 ...prev,
//                 specError: err.message,
//                 specParsed: false,
//                 openApiSpecFile: null,
//             }));
//         }
//     };
//     // ========== GATEWAY ORG HELPERS ==========
//     const addGatewayOrg = () => {
//         setGatewayOrgs(prev => [...prev, {
//             id: generateGatewayId(),
//             name: '',
//             region: '',
//             config: { environmentType: 'nonprod', selectedEnvironments: [], customEnvironments: '', expectedTps: '', expectedApiRange: '', notes: '' }
//         }]);
//     };
//     const removeGatewayOrg = (id) => {
//         if (gatewayOrgs.length === 1) return;
//         setGatewayOrgs(prev => prev.filter(org => org.id !== id));
//     };
//     const updateGatewayOrg = (id, field, value) => {
//         setGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, [field]: value } : org));
//     };
//     const updateGatewayOrgConfig = (id, configField, value) => {
//         setGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, config: { ...org.config, [configField]: value } } : org));
//     };
//     const handleEnvironmentCheckbox = (orgId, env) => {
//         setGatewayOrgs(prev => prev.map(org => {
//             if (org.id !== orgId) return org;
//             const selected = org.config.selectedEnvironments.includes(env)
//                 ? org.config.selectedEnvironments.filter(e => e !== env)
//                 : [...org.config.selectedEnvironments, env];
//             return { ...org, config: { ...org.config, selectedEnvironments: selected } };
//         }));
//     };
//     const envOptionsByType = { nonprod: ['dev', 'test', 'qa', 'sat', 'staging', 'sandbox'], prod: ['preprod', 'prod', 'staging'] };

//     // ========== BUSINESS UNIT FIELDS STATE ==========
//     const [onboardingTeamName, setOnboardingTeamName] = useState('');
//     const [onboardingApplicationName, setOnboardingApplicationName] = useState('');
//     const [onboardingApplicationId, setOnboardingApplicationId] = useState('');
//     const [onboardingProjectOwner, setOnboardingProjectOwner] = useState('');
//     const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState('');
//     const [onboardingProjectSME, setOnboardingProjectSME] = useState('');
//     const [onboardingProjectSMEEmail, setOnboardingProjectSMEEmail] = useState('');
//     const [onboardingProjectDLEmail, setOnboardingProjectDLEmail] = useState('');
//     const [onboardingGoLiveDate, setOnboardingGoLiveDate] = useState('');
//     const [onboardingTesterName, setOnboardingTesterName] = useState('');
//     const [onboardingTesterEmail, setOnboardingTesterEmail] = useState('');
//     const [onboardingServiceNowGroup, setOnboardingServiceNowGroup] = useState('');
//     const [onboardingServiceNowEmail, setOnboardingServiceNowEmail] = useState('');

//     // Team Members
//     const [teamMembers, setTeamMembers] = useState([]);
//     const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
//     const [newTeamMember, setNewTeamMember] = useState({ name: '', email: '' });
//     const addTeamMember = () => {
//         if (!newTeamMember.name.trim() || !newTeamMember.email.trim()) {
//             showMessage('Please enter name and email', 'error');
//             return;
//         }
//         setTeamMembers(prev => [...prev, { id: Date.now(), name: newTeamMember.name, email: newTeamMember.email, role: 'Member' }]);
//         setNewTeamMember({ name: '', email: '' });
//         setShowTeamMemberModal(false);
//         showMessage('Team member added', 'success');
//     };

//     // Consumers
//     const [savedConsumers, setSavedConsumers] = useState([]);
//     const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] = useState([]);
//     const [showConsumerModal, setShowConsumerModal] = useState(false);
//     const [consumerForm, setConsumerForm] = useState({
//         consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
//         consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
//     });
//     const [isAddingConsumer, setIsAddingConsumer] = useState(false);
//     const [editingConsumerId, setEditingConsumerId] = useState(null);

//     const getConsumers = async () => {
//         const result = await consumerService.getAllConsumers();
//         if (result.success) {
//             setSavedConsumers(result.data?.data || result.data || []);
//         }
//     };
//     useEffect(() => {
//         if (selectedMenuItem === 'gateway-onboarding') {
//             // Fetch business units count
//             const fetchDashboardBu = async () => {
//                 try {
//                     const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
//                     if (res.ok) {
//                         const data = await res.json();
//                         const buList = data.data || [];
//                         setDashboardBuCount(buList.length);
//                         // Sum team members across all BUs
//                         const totalMembers = buList.reduce((sum, bu) => sum + (bu.members?.length || 0), 0);
//                         setDashboardTeamMemberCount(totalMembers);
//                     }
//                 } catch (err) {
//                     console.error(err);
//                 }
//             };
//             fetchDashboardBu();
//             // Consumer count from savedConsumers (already fetched via getConsumers())
//             setDashboardConsumerCount(savedConsumers.length);
//         }
//     }, [selectedMenuItem, savedConsumers]);
//     useEffect(() => {
//         return () => {
//             if (window._approvalInterval) clearInterval(window._approvalInterval);
//         };
//     }, []);
//     useEffect(() => {
//         getConsumers();
//     }, []);
//     useEffect(() => {
//         const menuFromPath = getGatewayMenuFromPath(location.pathname);
//         if (selectedMenuItem !== menuFromPath) {
//             setSelectedProxyDetail(null);
//             setSelectedMenuItem(menuFromPath);
//         }
//     }, [location.pathname, selectedMenuItem]);

//     const handleSaveConsumer = async () => {
//         setIsAddingConsumer(true);
//         const consumerData = {
//             organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
//             consumerName: consumerForm.consumerName,
//             consumerPocName: consumerForm.consumerPocName,
//             consumerPocEmail: consumerForm.consumerPocEmail,
//             consumerSmeName: consumerForm.consumerSmeName,
//             consumerSmeEmail: consumerForm.consumerSmeEmail,
//             consumerConfig: consumerForm.consumerConfig,
//             apiTps: parseInt(consumerForm.apiTps) || 100,
//             quota: consumerForm.quota,
//             rateLimiting: consumerForm.rateLimiting,
//             apiKeyInformation: consumerForm.apiKeyInfo,
//         };
//         const result = await consumerService.createConsumer(consumerData);
//         if (result.success) {
//             await getConsumers();
//             setConsumerForm({
//                 consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
//                 consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
//             });
//             setShowConsumerModal(false);
//             showMessage('Consumer saved successfully', 'success');
//         } else {
//             showMessage(result.error, 'error');
//         }
//         setIsAddingConsumer(false);
//     };

//     const handleEditConsumer = (consumer) => {
//         setEditingConsumerId(consumer.id);
//         setConsumerForm({
//             consumerName: consumer.consumerName || '',
//             consumerPocName: consumer.consumerPocName || '',
//             consumerPocEmail: consumer.consumerPocEmail || '',
//             consumerSmeName: consumer.consumerSmeName || '',
//             consumerSmeEmail: consumer.consumerSmeEmail || '',
//             consumerConfig: consumer.consumerConfig || '',
//             apiTps: consumer.apiTps || '',
//             quota: consumer.quota || '',
//             rateLimiting: consumer.rateLimiting || '',
//             apiKeyInfo: consumer.apiKeyInformation || consumer.apiKeyInfo || ''
//         });
//         setShowConsumerModal(true);
//     };

//     const handleUpdateConsumer = async () => {
//         setIsAddingConsumer(true);
//         const consumerData = {
//             organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
//             consumerName: consumerForm.consumerName,
//             consumerPocName: consumerForm.consumerPocName,
//             consumerPocEmail: consumerForm.consumerPocEmail,
//             consumerSmeName: consumerForm.consumerSmeName,
//             consumerSmeEmail: consumerForm.consumerSmeEmail,
//             consumerConfig: consumerForm.consumerConfig,
//             apiTps: parseInt(consumerForm.apiTps) || 100,
//             quota: consumerForm.quota,
//             rateLimiting: consumerForm.rateLimiting,
//             apiKeyInformation: consumerForm.apiKeyInfo,
//         };
//         const result = await consumerService.updateConsumer(editingConsumerId, consumerData);
//         if (result.success) {
//             await getConsumers();
//             setShowConsumerModal(false);
//             setEditingConsumerId(null);
//             setConsumerForm({
//                 consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '',
//                 consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: ''
//             });
//             showMessage('Consumer updated successfully', 'success');
//         } else {
//             showMessage(result.error, 'error');
//         }
//         setIsAddingConsumer(false);
//     };

//     const validateProxyDetails = () => {
//         if (!createProxyModal.name.trim()) {
//             showMessage('Proxy name is required.', 'error');
//             return false;
//         }
//         if (createProxyModal.template === 'reverse' && !createProxyModal.targetUrl.trim()) {
//             showMessage('Target URL is required for Reverse proxy.', 'error');
//             return false;
//         }
//         if (createProxyModal.template === 'reverse-openapi' && !createProxyModal.targetUrl.trim()) {
//             showMessage('Target URL is required for Reverse proxy using OpenAPI Spec.', 'error');
//             return false;
//         }
//         if (createProxyModal.template === 'upload' && !createProxyModal.zipFile) {
//             showMessage('Please select a ZIP archive for Upload proxy bundle.', 'error');
//             return false;
//         }
//         // For OpenAPI templates, ensure spec has been parsed
//         if ((createProxyModal.template === 'reverse-openapi' || createProxyModal.template === 'no-target-openapi') && !createProxyModal.specParsed) {
//             showMessage('Please upload a valid OpenAPI specification file first.', 'error');
//             return false;
//         }
//         return true;
//     };

//     // ========== SIDEBAR LOGIC ==========
//     const toggleSection = (section) => {
//         setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
//     };

//     const selectSidebarMenu = (menuItem) => {
//         setSelectedProxyDetail(null);
//         setSelectedMenuItem(menuItem);
//         const nextPath = getGatewayPath(menuItem);
//         if (location.pathname !== nextPath) navigate(nextPath);
//     };

//     const sidebarItemClass = (active) => cn(
//         'group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
//         active
//             ? 'border-[#ff5b1f]/35 bg-[#ff5b1f]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
//             : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.045] hover:text-white'
//     );

//     const sidebarIconClass = (active, idleTone = 'text-slate-500') => cn(
//         'h-4 w-4 flex-shrink-0 transition-colors',
//         active ? 'text-[#ff8a5c]' : idleTone
//     );

//     const sectionHeaderClass = 'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-300';
//     const OnboardingHistoryView = ({ orgSubmissions, buSubmissions, teamSubmissions, activeTab, setActiveTab, onBackToForm }) => {
//         const mapStatus = (status) => {
//             if (status === 'PENDING_APPROVAL') return 'pending';
//             if (status === 'DRAFT') return 'draft';
//             if (status === 'APPROVED') return 'approved';
//             if (status === 'REJECTED') return 'rejected';
//             return status?.toLowerCase() || 'unknown';
//         };

//         return (
//             <div className="p-6">
//                 <div className="flex justify-between items-center mb-6">
//                     <div>
//                         <h2 className="text-3xl font-semibold text-white">Onboarding History</h2>
//                         <p className="mt-2 text-sm text-[#7f8fa8]">View past organization, business unit, and team submissions</p>
//                     </div>
//                     <button
//                         onClick={onBackToForm}
//                         className="px-4 py-2 rounded-lg border border-[#27314e] bg-[#1a1f2e] text-sm font-medium text-white hover:bg-[#ff5b1f]/20 flex items-center gap-2"
//                     >
//                         <ArrowLeft className="w-4 h-4" /> Back to Onboarding
//                     </button>
//                 </div>

//                 {/* Tabs */}
//                 <div className="border-b border-[#1f2840] mb-6">
//                     <div className="flex gap-4">
//                         <button
//                             onClick={() => setActiveTab('organization')}
//                             className={`pb-2 px-1 text-sm font-medium transition ${activeTab === 'organization' ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}
//                         >
//                             Organization
//                         </button>
//                         <button
//                             onClick={() => setActiveTab('bu')}
//                             className={`pb-2 px-1 text-sm font-medium transition ${activeTab === 'bu' ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}
//                         >
//                             Business Unit
//                         </button>
//                         <button
//                             onClick={() => setActiveTab('team')}
//                             className={`pb-2 px-1 text-sm font-medium transition ${activeTab === 'team' ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}
//                         >
//                             Team
//                         </button>
//                     </div>
//                 </div>

//                 {/* Tab Content */}
//                 <div className="space-y-4">
//                     {activeTab === 'organization' && (
//                         orgSubmissions.length === 0 ? (
//                             <div className="text-center py-12 text-[#7f8fa8]">No organization submissions found.</div>
//                         ) : (
//                             orgSubmissions.map(sub => {
//                                 const status = mapStatus(sub.status);
//                                 return (
//                                     <div key={sub.id} className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
//                                         <div className="flex flex-wrap justify-between items-start gap-3">
//                                             <div>
//                                                 <div className="flex items-center gap-2">
//                                                     <Building className="h-4 w-4 text-slate-500" />
//                                                     <span className="font-semibold text-white">{sub.company?.name || 'N/A'}</span>
//                                                     <span className={cn(
//                                                         "rounded-full px-2 py-0.5 text-xs font-medium",
//                                                         status === 'approved' && "bg-emerald-500/20 text-emerald-300",
//                                                         status === 'pending' && "bg-yellow-500/20 text-yellow-300",
//                                                         status === 'rejected' && "bg-red-500/20 text-red-300",
//                                                         status === 'draft' && "bg-slate-500/20 text-slate-300"
//                                                     )}>
//                                                         {status.toUpperCase()}
//                                                     </span>
//                                                 </div>
//                                                 <div className="text-xs text-slate-400 mt-1">
//                                                     {new Date(sub.timestamp).toLocaleString()}
//                                                 </div>
//                                             </div>
//                                             <button
//                                                 onClick={() => {
//                                                     loadSubmission(sub.id);
//                                                     setOnboardingView('form');
//                                                     setIsCreateNewOnboarding(true);
//                                                 }}
//                                                 className="rounded-lg border border-[#2a3a5a] bg-transparent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:border-[#ff8a5c] hover:bg-[#ff5b1f]/10"
//                                             >
//                                                 Load
//                                             </button>
//                                         </div>
//                                     </div>
//                                 );
//                             })
//                         )
//                     )}

//                     {activeTab === 'bu' && (
//                         buSubmissions.length === 0 ? (
//                             <div className="text-center py-12 text-[#7f8fa8]">No business unit submissions found.</div>
//                         ) : (
//                             buSubmissions.map(sub => (
//                                 <div key={sub.id} className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
//                                     <div className="flex justify-between">
//                                         <div>
//                                             <div className="font-semibold text-white">{sub.teamName}</div>
//                                             <div className="text-sm text-slate-300">Application: {sub.applicationName}</div>
//                                             <div className="text-xs text-slate-400 mt-1">{new Date(sub.timestamp).toLocaleString()}</div>
//                                         </div>
//                                         <button className="text-[#4f8ef7] text-sm hover:underline">View Details</button>
//                                     </div>
//                                 </div>
//                             ))
//                         )
//                     )}

//                     {activeTab === 'team' && (
//                         teamSubmissions.length === 0 ? (
//                             <div className="text-center py-12 text-[#7f8fa8]">No team submissions found.</div>
//                         ) : (
//                             teamSubmissions.map(sub => (
//                                 <div key={sub.id} className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
//                                     <div className="flex justify-between">
//                                         <div>
//                                             <div className="font-semibold text-white">{sub.teamName}</div>
//                                             <div className="text-xs text-slate-400 mt-1">{new Date(sub.timestamp).toLocaleString()}</div>
//                                         </div>
//                                         <button className="text-[#4f8ef7] text-sm hover:underline">View</button>
//                                     </div>
//                                 </div>
//                             ))
//                         )
//                     )}
//                 </div>
//             </div>
//         );
//     };
//     const typeCounts = useMemo(() => {
//         const counts = { ALL: apiProxies.length };
//         apiProxies.forEach(proxy => {
//             const t = proxy.type || 'REST';
//             counts[t] = (counts[t] || 0) + 1;
//         });
//         return counts;
//     }, [apiProxies]);
//     const formatTypeLabel = (type) => {
//         if (!type) return 'Rest';
//         if (type === 'REST') return 'Rest';
//         return type; // SOAP, GraphQL, MCP stay as is
//     };
//     const typeTabs = [
//         { label: 'ALL', value: 'ALL' },
//         { label: 'Rest', value: 'REST' },
//         { label: 'SOAP', value: 'SOAP' },
//         { label: 'GraphQL', value: 'GraphQL' },
//         { label: 'MCP', value: 'MCP' }
//     ];

//     // ========== RENDER CONTENT ==========
//     const renderContent = () => {
//         // Fallback: ensure selectedMenuItem matches the URL path
//         const currentPathMenu = getGatewayMenuFromPath(location.pathname);
//         if (selectedMenuItem !== currentPathMenu) {
//             // This will re-render with correct menu after state update
//             setTimeout(() => setSelectedMenuItem(currentPathMenu), 0);
//             return <div className="p-6 text-center">Loading...</div>;
//         }
//         // ----- ONBOARDING -----
//         if (selectedMenuItem === 'gateway-onboarding') {
//             const isOrgApproved = orgApprovalStatus === 'approved';
//             const isOrgPending = orgApprovalStatus === 'pending';
//             if (onboardingView === 'history') {
//                 return <OnboardingHistoryView
//                     orgSubmissions={organizationSubmissions}
//                     buSubmissions={buSubmissions}
//                     teamSubmissions={teamSubmissions}
//                     activeTab={historyActiveTab}
//                     setActiveTab={setHistoryActiveTab}
//                     onBackToForm={() => {
//                         setOnboardingView('form');
//                         resetForm(); // optional: keep or reset
//                     }}
//                 />;
//             }

//             return (
//                 <div className="p-6">
//                     <div className="mb-6 flex justify-between items-start">
//                         <div>
//                             <h2 className="text-3xl font-semibold text-white">{isCreateNewOnboarding == true ? "Organization History" : "Gateway Onboarding"}</h2>
//                             <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f8fa8]">
//                                 Start with Organization Onboarding. After admin approval, proceed to Business Unit setup.
//                             </p>
//                         </div>
//                         <div className="flex gap-3">
//                             {isCreateNewOnboarding === true &&
//                                 <button
//                                     onClick={() => {
//                                         // Reset all onboarding form data
//                                         resetForm();
//                                         setOnboardingView('form');
//                                         setIsCreateNewOnboarding(false);
//                                     }}
//                                     className="px-4 py-2 rounded-lg border border-[#27314e] bg-primary text-sm font-medium text-white hover:bg-[#ff5b1f]/20 flex items-center gap-2"
//                                 >
//                                     <Plus className="w-4 h-4" /> Create New
//                                 </button>}
//                             <button
//                                 onClick={() => setShowHistoryModal(true)}
//                                 // onClick={() => setOnboardingView('history')}
//                                 className="px-4 py-2 rounded-lg border border-[#27314e] bg-primary text-sm font-medium text-white hover:bg-[#ff5b1f]/20 flex items-center gap-2"
//                             >
//                                 <History className="w-4 h-4" /> History
//                             </button>
//                         </div>
//                     </div>
//                     {/* Enterprise Onboarding Dashboard */}
//                     <div className="mb-6">
//                         {/* Stats row - glassmorphic cards */}
//                         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
//                             {/* Organization Status Card */}
//                             <div className="group relative overflow-hidden rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#ff8a5c]/40 hover:shadow-lg hover:shadow-[#ff5b1f]/5">
//                                 <div className="flex items-start justify-between">
//                                     <div>
//                                         <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Organization</p>
//                                         <p className="mt-1 text-base font-semibold text-white">
//                                             {company.name ? (
//                                                 company.name
//                                             ) : (
//                                                 <span className="text-amber-400">Create new or view existing onboarding</span>
//                                             )}
//                                         </p>
//                                     </div>
//                                     <div className="rounded-lg bg-[#ff5b1f]/10 p-2">
//                                         <Building className="h-5 w-5 text-[#ff8a5c]" />
//                                     </div>
//                                 </div>
//                                 <div className="mt-3 flex items-center justify-between">
//                                     <span className={cn(
//                                         "rounded-full px-2 py-0.5 text-[10px] font-medium",
//                                         orgApprovalStatus === 'approved' && "bg-emerald-500/20 text-emerald-300",
//                                         orgApprovalStatus === 'pending' && "bg-yellow-500/20 text-yellow-300",
//                                         orgApprovalStatus === 'rejected' && "bg-red-500/20 text-red-300",
//                                         !orgApprovalStatus && "bg-slate-500/20 text-slate-300"
//                                     )}>
//                                         {orgApprovalStatus ? orgApprovalStatus.toUpperCase() : (company.name ? 'DRAFT' : 'PENDING')}
//                                     </span>
//                                     {orgApprovalStatus === 'pending' && (
//                                         <button
//                                             onClick={checkApprovalStatus}
//                                             disabled={isCheckingStatus}
//                                             className="text-[10px] text-[#4f8ef7] hover:underline"
//                                         >
//                                             {isCheckingStatus ? 'Checking...' : 'Check status'}
//                                         </button>
//                                     )}
//                                 </div>
//                                 {!company.name && (
//                                     <div className="mt-2 text-[10px] text-amber-400/80">
//                                         Start organization onboarding to enable business units
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Business Units Card */}
//                             <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#2a55a0]/40">
//                                 <div className="flex items-start justify-between">
//                                     <div>
//                                         <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Business Units</p>
//                                         <p className="mt-1 text-2xl font-bold text-white">{dashboardBuCount}</p>
//                                     </div>
//                                     <div className="rounded-lg bg-sky-500/10 p-2">
//                                         <Users className="h-5 w-5 text-sky-400" />
//                                     </div>
//                                 </div>
//                                 <p className="mt-2 text-[10px] text-slate-500">
//                                     {dashboardBuCount === 0
//                                         ? "No business units created yet"
//                                         : `${dashboardBuCount} active team(s)`}
//                                 </p>
//                             </div>

//                             {/* Team Members Card */}
//                             <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#2a55a0]/40">
//                                 <div className="flex items-start justify-between">
//                                     <div>
//                                         <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Team Members</p>
//                                         <p className="mt-1 text-2xl font-bold text-white">{dashboardTeamMemberCount}</p>
//                                     </div>
//                                     <div className="rounded-lg bg-emerald-500/10 p-2">
//                                         <UserCircle className="h-5 w-5 text-emerald-400" />
//                                     </div>
//                                 </div>
//                                 <p className="mt-2 text-[10px] text-slate-500">
//                                     Across all business units
//                                 </p>
//                             </div>

//                             {/* Consumers Card */}
//                             <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#2a55a0]/40">
//                                 <div className="flex items-start justify-between">
//                                     <div>
//                                         <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Consumers</p>
//                                         <p className="mt-1 text-2xl font-bold text-white">{dashboardConsumerCount}</p>
//                                     </div>
//                                     <div className="rounded-lg bg-purple-500/10 p-2">
//                                         <Layers className="h-5 w-5 text-purple-400" />
//                                     </div>
//                                 </div>
//                                 <p className="mt-2 text-[10px] text-slate-500">
//                                     Registered API consumers
//                                 </p>
//                             </div>
//                         </div>

//                         {/* Onboarding progress (visual timeline) - only if org exists */}
//                         {company.name && (
//                             <div className="mt-4 rounded-xl border border-[#2a3550] bg-[#0f172a]/40 p-3">
//                                 <div className="flex items-center gap-2">
//                                     <div className="flex-1">
//                                         <div className="flex justify-between text-[10px] text-slate-500 mb-1">
//                                             <span>Organization</span>
//                                             <span>Business Unit</span>
//                                             <span>Consumers</span>
//                                         </div>
//                                         <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#1f2840]">
//                                             <div
//                                                 className={cn(
//                                                     "h-full transition-all duration-500",
//                                                     orgApprovalStatus === 'approved' ? "w-1/3 bg-emerald-500" : "w-0 bg-slate-600"
//                                                 )}
//                                             />
//                                             <div
//                                                 className={cn(
//                                                     "h-full transition-all duration-500",
//                                                     dashboardBuCount > 0 ? "w-1/3 bg-emerald-500" : "w-0 bg-slate-600"
//                                                 )}
//                                             />
//                                             <div
//                                                 className={cn(
//                                                     "h-full transition-all duration-500",
//                                                     dashboardConsumerCount > 0 ? "w-1/3 bg-emerald-500" : "w-0 bg-slate-600"
//                                                 )}
//                                             />
//                                         </div>
//                                     </div>
//                                     {orgApprovalStatus === 'approved' && dashboardBuCount === 0 && (
//                                         <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
//                                             <AlertCircle className="h-3 w-3" />
//                                             Complete Business Unit
//                                         </div>
//                                     )}
//                                     {orgApprovalStatus !== 'approved' && (
//                                         <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">
//                                             <Rocket className="h-3 w-3" />
//                                             Awaiting organization approval
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     {/* Two cards: Organization / Business Unit */}
//                     <div className="grid gap-3 md:grid-cols-2">
//                         {/* Organization Card */}
//                         <button
//                             onClick={() => setGatewayOnboardingStep('organization')}
//                             className={cn(
//                                 "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
//                                 gatewayOnboardingStep === 'organization'
//                                     ? "border-[#ff8a5c]/45 bg-[#ff5b1f]/10 shadow-[0_8px_20px_-10px_rgba(255,91,31,0.6)]"
//                                     : "border-[#27314e] bg-[#111520] hover:border-white/15"
//                             )}
//                         >
//                             <div className="flex items-center gap-3">
//                                 <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 group-hover:bg-[#ff5b1f]/10">
//                                     <Server className="h-4 w-4" />
//                                 </div>
//                                 <div>
//                                     <h3 className="text-sm font-semibold text-white">Organization</h3>
//                                     <p className="text-xs text-slate-400">Register & get approval</p>
//                                 </div>
//                             </div>

//                             <div className="mt-2 flex items-center justify-between text-xs">
//                                 <span className={cn(
//                                     "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
//                                     orgApprovalStatus === 'approved' && "bg-emerald-500/20 text-emerald-300",
//                                     orgApprovalStatus === 'pending' && "bg-yellow-500/20 text-yellow-300",
//                                     orgApprovalStatus === 'rejected' && "bg-red-500/20 text-red-300",
//                                     !orgApprovalStatus && "bg-slate-500/20 text-slate-300"
//                                 )}>
//                                     {orgApprovalStatus ? orgApprovalStatus.toUpperCase() : (company.name ? 'DRAFT' : 'NOT STARTED')}
//                                 </span>
//                                 {orgApprovalStatus === 'pending' && (
//                                     <button
//                                         onClick={(e) => { e.stopPropagation(); checkApprovalStatus(); }}
//                                         disabled={isCheckingStatus}
//                                         className="text-[10px] text-[#4f8ef7] hover:underline"
//                                     >
//                                         {isCheckingStatus ? 'Checking...' : 'Check Status'}
//                                     </button>
//                                 )}
//                             </div>
//                         </button>

//                         {/* Business Unit Card */}
//                         <button
//                             onClick={() => {
//                                 if (orgApprovalStatus !== 'approved') {
//                                     showMessage("Organization approval required first.", "error");
//                                     return;
//                                 }
//                                 setGatewayOnboardingStep('businessUnit');
//                             }}
//                             className={cn(
//                                 "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
//                                 gatewayOnboardingStep === 'businessUnit'
//                                     ? "border-[#ff8a5c]/45 bg-[#ff5b1f]/10 shadow-[0_8px_20px_-10px_rgba(255,91,31,0.6)]"
//                                     : "border-[#27314e] bg-[#111520] hover:border-white/15",
//                                 orgApprovalStatus !== 'approved' && "opacity-60 cursor-not-allowed"
//                             )}
//                         >
//                             <div className="flex items-center gap-3">
//                                 <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 group-hover:bg-[#ff5b1f]/10">
//                                     <Users className="h-4 w-4" />
//                                 </div>
//                                 <div>
//                                     <h3 className="text-sm font-semibold text-white">Business Unit</h3>
//                                     <p className="text-xs text-slate-400">Define team & API scope</p>
//                                 </div>
//                             </div>
//                             {orgApprovalStatus !== 'approved' && (
//                                 <p className="mt-2 text-[10px] text-yellow-400">🔒 Organization approval required</p>
//                             )}
//                             {orgApprovalStatus === 'approved' && dashboardBuCount > 0 && (
//                                 <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
//                                     <CheckCircle className="h-3 w-3" />
//                                     {dashboardBuCount} unit(s) configured
//                                 </div>
//                             )}
//                         </button>
//                     </div>


//                     {/* Organization Form */}
//                     {gatewayOnboardingStep === 'organization' && (
//                         <div className="mt-6 rounded-2xl border border-[#27314e] bg-[#111520] p-6 space-y-4">
//                             {/* Company Information */}
//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
//                                     <Building className="w-4 h-4" /> Company Information
//                                 </h4>
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Company Name *</Label>
//                                         <Input
//                                             placeholder="e.g., ProbeStack Digital"
//                                             value={company.name}
//                                             onChange={e => setCompany({ ...company, name: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Website URL</Label>
//                                         <Input
//                                             placeholder="https://example.com"
//                                             value={company.websiteUrl}
//                                             onChange={e => setCompany({ ...company, websiteUrl: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Region</Label>
//                                         <select
//                                             value={company.region}
//                                             onChange={e => setCompany({ ...company, region: e.target.value })}
//                                             className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
//                                         >
//                                             <option value="">Select Region</option>
//                                             <option value="north-america">North America</option>
//                                             <option value="latam">LATAM</option>
//                                             <option value="emea">EMEA</option>
//                                             <option value="apac">APAC</option>
//                                         </select>
//                                     </div>
//                                 </div>
//                             </Card>

//                             {/* Stakeholder Information */}
//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
//                                     <Users className="w-4 h-4" /> Stakeholder Information
//                                 </h4>
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">First Name *</Label>
//                                         <Input
//                                             placeholder="First name"
//                                             value={orgOnboardingData.firstName}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, firstName: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Last Name *</Label>
//                                         <Input
//                                             placeholder="Last name"
//                                             value={orgOnboardingData.lastName}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, lastName: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Owner Email *</Label>
//                                         <Input
//                                             type="email"
//                                             placeholder="owner@company.com"
//                                             value={orgOnboardingData.ownerEmail}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, ownerEmail: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Contact Number *</Label>
//                                         <Input
//                                             placeholder="+1 234 567 8900"
//                                             value={orgOnboardingData.phoneNumber}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, phoneNumber: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">SME Name</Label>
//                                         <Input
//                                             placeholder="Subject Matter Expert"
//                                             value={orgOnboardingData.sme}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, sme: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">SME Email</Label>
//                                         <Input
//                                             type="email"
//                                             placeholder="sme@company.com"
//                                             value={orgOnboardingData.smeEmail}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, smeEmail: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Distribution List Email</Label>
//                                         <Input
//                                             type="email"
//                                             placeholder="dl@company.com"
//                                             value={orgOnboardingData.dlEmail}
//                                             onChange={e => setOrgOnboardingData({ ...orgOnboardingData, dlEmail: e.target.value })}
//                                             className="bg-dark-900 border-dark-700 text-white"
//                                         />
//                                     </div>
//                                 </div>
//                             </Card>

//                             {/* Gateway Configurations - Region first then Organization Name */}
//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <div className="flex items-center justify-between mb-4">
//                                     <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
//                                         <Network className="w-4 h-4" /> Gateway Configurations
//                                     </h4>
//                                     <button
//                                         type="button"
//                                         onClick={addGatewayOrg}
//                                         className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-all flex items-center gap-1"
//                                     >
//                                         <Plus className="w-3.5 h-3.5" /> Add Organization
//                                     </button>
//                                 </div>
//                                 <div className="space-y-6">
//                                     {gatewayOrgs.map((org) => (
//                                         <div key={org.id} className="relative border border-dark-700 rounded-lg p-4">
//                                             {gatewayOrgs.length > 1 && (
//                                                 <button
//                                                     type="button"
//                                                     onClick={() => removeGatewayOrg(org.id)}
//                                                     className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
//                                                 >
//                                                     <X className="w-4 h-4" />
//                                                 </button>
//                                             )}
//                                             {/* Region first, then Organization Name */}
//                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//                                                 <div className="space-y-1.5">
//                                                     <Label className="text-xs text-gray-300">Region</Label>
//                                                     <select
//                                                         value={org.region}
//                                                         onChange={e => updateGatewayOrg(org.id, 'region', e.target.value)}
//                                                         className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
//                                                     >
//                                                         <option value="">Select Region</option>
//                                                         <option value="north-america">North America</option>
//                                                         <option value="latam">LATAM</option>
//                                                         <option value="emea">EMEA</option>
//                                                         <option value="apac">APAC</option>
//                                                     </select>
//                                                 </div>
//                                                 <div className="space-y-1.5">
//                                                     <Label className="text-xs text-gray-300">Gateway Organization Name *</Label>
//                                                     <Input
//                                                         placeholder="e.g., MyGatewayOrg"
//                                                         value={org.name}
//                                                         onChange={e => updateGatewayOrg(org.id, 'name', e.target.value)}
//                                                         className="bg-dark-900 border-dark-700 text-white"
//                                                     />
//                                                 </div>
//                                             </div>

//                                             <div className="border-t border-dark-700 pt-4 mt-2">
//                                                 <div className="mb-4">
//                                                     <Label className="text-xs text-gray-300 mb-2 block">Environment Type</Label>
//                                                     <div className="flex gap-4">
//                                                         <label className="flex items-center gap-2">
//                                                             <input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === 'nonprod'} onChange={() => updateGatewayOrgConfig(org.id, 'environmentType', 'nonprod')} />
//                                                             <span className="text-sm text-white">non-prod</span>
//                                                         </label>
//                                                         <label className="flex items-center gap-2">
//                                                             <input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === 'prod'} onChange={() => updateGatewayOrgConfig(org.id, 'environmentType', 'prod')} />
//                                                             <span className="text-sm text-white">prod</span>
//                                                         </label>
//                                                     </div>
//                                                 </div>

//                                                 <div className="mb-4">
//                                                     <Label className="text-xs text-gray-300 mb-2 block">Select Environments</Label>
//                                                     <div className="flex flex-wrap gap-3 border border-dark-700 rounded-lg p-3 bg-dark-900/50">
//                                                         {envOptionsByType[org.config.environmentType].map(env => (
//                                                             <label key={env} className="flex items-center gap-1.5 text-sm text-gray-300">
//                                                                 <input type="checkbox" checked={org.config.selectedEnvironments.includes(env)} onChange={() => handleEnvironmentCheckbox(org.id, env)} />
//                                                                 <span>{env}</span>
//                                                             </label>
//                                                         ))}
//                                                         <label className="flex items-center gap-1.5 text-sm text-gray-300">
//                                                             <input type="checkbox" checked={org.config.selectedEnvironments.includes('custom')} onChange={() => {
//                                                                 if (org.config.selectedEnvironments.includes('custom')) {
//                                                                     updateGatewayOrgConfig(org.id, 'selectedEnvironments', org.config.selectedEnvironments.filter(e => e !== 'custom'));
//                                                                     updateGatewayOrgConfig(org.id, 'customEnvironments', '');
//                                                                 } else {
//                                                                     updateGatewayOrgConfig(org.id, 'selectedEnvironments', [...org.config.selectedEnvironments, 'custom']);
//                                                                 }
//                                                             }} />
//                                                             <span>Custom</span>
//                                                         </label>
//                                                     </div>
//                                                     {org.config.selectedEnvironments.includes('custom') && (
//                                                         <div className="mt-3">
//                                                             <Input placeholder="Enter comma-separated environments (e.g., staging, preprod)" value={org.config.customEnvironments} onChange={e => updateGatewayOrgConfig(org.id, 'customEnvironments', e.target.value)} className="bg-dark-900 border-dark-700 text-white" />
//                                                         </div>
//                                                     )}
//                                                 </div>

//                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                                     <div className="space-y-1.5">
//                                                         <Label className="text-xs text-gray-300">Expected TPS</Label>
//                                                         <Input type="number" placeholder="e.g., 1000" value={org.config.expectedTps} onChange={e => updateGatewayOrgConfig(org.id, 'expectedTps', e.target.value)} className="bg-dark-900 border-dark-700 text-white" />
//                                                     </div>
//                                                     <div className="space-y-1.5">
//                                                         <Label className="text-xs text-gray-300">Expected No. of APIs</Label>
//                                                         <select value={org.config.expectedApiRange} onChange={e => updateGatewayOrgConfig(org.id, 'expectedApiRange', e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900">
//                                                             <option value="">Select range</option>
//                                                             <option value="0-100">0 - 100</option>
//                                                             <option value="100-300">100 - 300</option>
//                                                             <option value="300-500">300 - 500</option>
//                                                             <option value="500-1000+">500 - 1000+</option>
//                                                         </select>
//                                                     </div>
//                                                     <div className="md:col-span-2 space-y-1.5">
//                                                         <Label className="text-xs text-gray-300">Notes</Label>
//                                                         <textarea rows={2} placeholder="Any additional information for this Gateway Organization..." value={org.config.notes} onChange={e => updateGatewayOrgConfig(org.id, 'notes', e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900 resize-none" />
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Card>

//                             {approvalMessage && (
//                                 <div className="text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
//                                     {approvalMessage}
//                                 </div>
//                             )}

//                             <div className="flex flex-wrap items-center gap-3 pt-2">
//                                 <button onClick={resetForm} className="h-10 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-sm font-semibold text-red-400 hover:bg-red-500/20">
//                                     Reset
//                                 </button>
//                                 <button onClick={saveAsDraft} disabled={isSavingDraft} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-50">
//                                     {isSavingDraft ? 'Saving...' : 'Save'}
//                                 </button>
//                                 <button onClick={() => setShowPreviewModal(true)} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.06]">
//                                     Preview
//                                 </button>
//                                 <button onClick={sendApprovalRequest} disabled={isSendingApproval} className="h-10 rounded-xl bg-[#ff5b1f] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#ff6b36] disabled:opacity-50">
//                                     {isSendingApproval ? 'Sending...' : 'Send for Approval'}
//                                 </button>
//                                 {isOrgPending && (
//                                     <button
//                                         onClick={checkApprovalStatus}
//                                         disabled={isCheckingStatus}
//                                         className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
//                                     >
//                                         {isCheckingStatus ? 'Checking...' : 'Check Status'}
//                                     </button>
//                                 )}
//                             </div>
//                         </div>
//                     )}

//                     {/* Business Unit Form */}
//                     {gatewayOnboardingStep === 'businessUnit' && orgApprovalStatus === 'approved' && (
//                         <div className="mt-6 rounded-2xl border border-[#27314e] bg-[#111520] p-6 space-y-4">
//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
//                                     <UserCircle className="w-4 h-4" /> Business Unit Information
//                                 </h4>
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">BU Name *</Label>
//                                         <Input value={onboardingTeamName} onChange={e => setOnboardingTeamName(e.target.value)} className="bg-dark-900 border-dark-700 text-white" />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Application Name *</Label>
//                                         <Input value={onboardingApplicationName} onChange={e => setOnboardingApplicationName(e.target.value)} className="bg-dark-900 border-dark-700 text-white" />
//                                     </div>
//                                     <div className="space-y-1.5">
//                                         <Label className="text-xs text-gray-300">Application Id</Label>
//                                         <Input value={onboardingApplicationId} onChange={e => setOnboardingApplicationId(e.target.value)} className="bg-dark-900 border-dark-700 text-white" />
//                                     </div>
//                                 </div>
//                             </Card>

//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
//                                     <Users className="w-4 h-4" /> Stakeholder Information
//                                 </h4>
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Project Owner</Label><Input value={onboardingProjectOwner} onChange={e => setOnboardingProjectOwner(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Owner Email</Label><Input type="email" value={onboardingOwnerEmail} onChange={e => setOnboardingOwnerEmail(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Project SME</Label><Input value={onboardingProjectSME} onChange={e => setOnboardingProjectSME(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Project SME Email</Label><Input type="email" value={onboardingProjectSMEEmail} onChange={e => setOnboardingProjectSMEEmail(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Project DL Email</Label><Input type="email" value={onboardingProjectDLEmail} onChange={e => setOnboardingProjectDLEmail(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Expected Go-Live Date</Label><Input type="date" value={onboardingGoLiveDate} onChange={e => setOnboardingGoLiveDate(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Tester Name</Label><Input value={onboardingTesterName} onChange={e => setOnboardingTesterName(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">Tester Email</Label><Input type="email" value={onboardingTesterEmail} onChange={e => setOnboardingTesterEmail(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">ServiceNow Group Name</Label><Input value={onboardingServiceNowGroup} onChange={e => setOnboardingServiceNowGroup(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                     <div className="space-y-1.5"><Label className="text-xs text-gray-300">ServiceNow Email</Label><Input type="email" value={onboardingServiceNowEmail} onChange={e => setOnboardingServiceNowEmail(e.target.value)} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 </div>
//                             </Card>

//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <div className="flex items-center justify-between mb-4">
//                                     <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
//                                         <Users className="w-4 h-4" /> Team Members
//                                     </h4>
//                                     <button onClick={() => setShowTeamMemberModal(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-1.5">
//                                         <Plus className="w-3.5 h-3.5" /> Add Member
//                                     </button>
//                                 </div>
//                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto">
//                                     {teamMembers.map(member => (
//                                         <div key={member.id} className="p-3 rounded-lg border border-dark-700 bg-dark-900/60">
//                                             <p className="text-sm font-medium text-white">{member.name}</p>
//                                             <p className="text-xs text-gray-400">{member.email}</p>
//                                             <p className="text-xs text-gray-500 mt-1">{member.role}</p>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </Card>

//                             <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
//                                 <div className="flex items-center justify-between mb-4">
//                                     <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
//                                         <Users className="w-4 h-4" /> Consumer Information
//                                     </h4>
//                                     <button onClick={() => setShowConsumerModal(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-1.5">
//                                         <Plus className="w-3.5 h-3.5" /> Add Consumer
//                                     </button>
//                                 </div>
//                                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
//                                     {savedConsumers.map(consumer => {
//                                         const isSelected = selectedOnboardingConsumers.includes(consumer.id);
//                                         return (
//                                             <div key={consumer.id} className={cn("p-3 rounded-lg border cursor-pointer relative group", isSelected ? "border-primary bg-primary/20" : "border-dark-700 hover:border-primary/50 bg-dark-900/60")}>
//                                                 <div onClick={() => {
//                                                     if (isSelected) setSelectedOnboardingConsumers(prev => prev.filter(id => id !== consumer.id));
//                                                     else setSelectedOnboardingConsumers(prev => [...prev, consumer.id]);
//                                                 }}>
//                                                     <p className="text-xs font-medium text-white truncate pr-6">{consumer.consumerName || 'Unnamed'}</p>
//                                                     <p className="text-[10px] text-gray-400 truncate">{consumer.consumerPocName || 'No POC'}</p>
//                                                     {isSelected && <div className="mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-primary" /><span className="text-[10px] text-primary">Selected</span></div>}
//                                                 </div>
//                                                 <button onClick={(e) => { e.stopPropagation(); handleEditConsumer(consumer); }} className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100">
//                                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
//                                                 </button>
//                                             </div>
//                                         );
//                                     })}
//                                 </div>
//                             </Card>

//                             <div className="flex justify-end pt-2">
//                                 <button onClick={submitBusinessUnit} disabled={submittingBu} className="h-10 rounded-xl bg-[#ff5b1f] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#ff6b36]">
//                                     {submittingBu ? 'Submitting...' : 'Submit Business Unit'}
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             );
//         }

//         // ----- OTHER MENU ITEMS -----
//         if (selectedMenuItem === 'api-deploy') {
//             return <APIDeploy showMessage={showMessage} isGateway={true} />;
//         }
//         if (selectedMenuItem === 'api-proxy-test') {
//             return <APITest showMessage={showMessage} isGateway={true} />;
//         }

//         if (selectedMenuItem === 'api-proxies') {
//             if (selectedProxyDetail) {
//                 return (
//                     <ProxyDetailView
//                         proxy={selectedProxyDetail}
//                         onBack={() => setSelectedProxyDetail(null)}
//                         onDeploy={() => console.log('Deploy', selectedProxyDetail)}
//                         onDuplicate={() => console.log('Duplicate', selectedProxyDetail)}
//                         onDelete={() => console.log('Delete', selectedProxyDetail)}
//                         onDevelop={() => setActiveView('develop')}
//                         onDebug={() => setActiveView('debug')}
//                         showMessage={showMessage}
//                     />
//                 );
//             }

//             const filteredProxies = apiProxies.filter(proxy => {
//                 const matchesSearch = proxy.name?.toLowerCase().includes(searchTerm.toLowerCase());
//                 const matchesType = apiTypeFilter === 'ALL' || (proxy.type || 'REST') === apiTypeFilter;
//                 return matchesSearch && matchesType;
//             });

//             return (
//                 <div className="flex flex-col gap-2 p-6">
//                     {/* Heading - first line */}
//                     <div className="flex justify-between items-center flex-wrap gap-3">
//                         <h2 className="text-xl font-semibold text-white">Proxy</h2>
//                         <GatewayContextSelector
//                             selectedOrg={selectedOrg}
//                             setSelectedOrg={setSelectedOrg}
//                             selectedBU={selectedBU}
//                             setSelectedBU={setSelectedBU}
//                             selectedEnv={selectedEnv}
//                             setSelectedEnv={setSelectedEnv}
//                             showEnv={true}
//                         />
//                     </div>

//                     {/* Second line: Tabs on left, Search+Create on right */}
//                     <div className="flex items-center justify-between flex-wrap gap-2   ">
//                         {/* Tabs group */}
//                         <div className="flex items-center gap-1 bg-[#1a1f2e] rounded-lg p-1">
//                             {typeTabs.map(tab => (
//                                 <button
//                                     key={tab.value}
//                                     onClick={() => setApiTypeFilter(tab.value)}
//                                     className={`
//         px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap
//         ${apiTypeFilter === tab.value
//                                             ? 'bg-[#ff5b1f] text-white shadow-sm'
//                                             : 'text-[#7f8fa8] hover:text-white hover:bg-[#2a3550]'
//                                         }
//       `}
//                                 >
//                                     {tab.label}
//                                     {/* {tab.value !== 'ALL' && ( */}
//                                     <span className="ml-2 text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
//                                         {typeCounts[tab.value] || 0}
//                                     </span>
//                                     {/* )} */}
//                                 </button>
//                             ))}
//                         </div>

//                         {/* Search + Create Button */}
//                         <div className="flex items-center gap-3">
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
//                                 <input
//                                     type="text"
//                                     placeholder="Filter proxies..."
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                     className="bg-[#1a1f2e] focus:outline-none border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64"
//                                 />
//                             </div>
//                             <Button
//                                 onClick={() => setCreateProxyModal(prev => ({ ...prev, open: true }))}
//                                 className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white whitespace-nowrap"
//                             >
//                                 <Plus className="mr-2 h-4 w-4" /> Create
//                             </Button>
//                         </div>
//                     </div>
//                     {loadingProxies ? (
//                         <div className="p-6 text-center text-[#7f8fa8]">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
//                             <p>Loading proxies...</p>
//                         </div>
//                     ) : proxiesError ? (
//                         <div className="p-6 text-center text-red-400">
//                             <AlertCircle className="h-6 w-6 mx-auto mb-2" />
//                             <p>Error: {proxiesError}</p>
//                             <button
//                                 onClick={() => window.location.reload()}
//                                 className="mt-2 text-sm text-[#4f8ef7] hover:underline"
//                             >
//                                 Retry
//                             </button>
//                         </div>
//                     ) : (
//                         <div className="bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
//                             <table className="w-full text-sm">
//                                 <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                                     <tr>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Name</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Type</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Environment</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Last Modified</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Source</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {filteredProxies.map(proxy => (
//                                         <tr
//                                             key={proxy.name}
//                                             className="border-b border-[#1f2840] hover:bg-[#1a1f2e] cursor-pointer"
//                                         >
//                                             <td className="p-3 text-white font-mono text-sm">{proxy.name}</td>
//                                             <td className="p-3">
//                                                 <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${(proxy.type || 'REST') === 'REST' ? 'bg-blue-500/20 text-blue-300' :
//                                                     (proxy.type || 'REST') === 'SOAP' ? 'bg-purple-500/20 text-purple-300' :
//                                                         (proxy.type || 'REST') === 'GraphQL' ? 'bg-pink-500/20 text-pink-300' :
//                                                             'bg-emerald-500/20 text-emerald-300'
//                                                     }`}>
//                                                     {formatTypeLabel(proxy.type)}
//                                                 </span>
//                                             </td>
//                                             <td className="p-3 text-[#7f8fa8]">
//                                                 {proxy.environmentSummary || (proxy.environments?.length ? proxy.environments.join(', ') : 'Not deployed')}
//                                             </td>
//                                             <td className="p-3 text-[#7f8fa8]">
//                                                 {proxy.lastModifiedAt ? new Date(proxy.lastModifiedAt).toLocaleDateString() : '—'}
//                                             </td>
//                                             <td className="p-3">
//                                                 {proxy.source == "LIFECYCLE_TOOL" ? (
//                                                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
//                                                         ForgeSphere
//                                                     </span>
//                                                 ) : (
//                                                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">
//                                                         Api Hub
//                                                     </span>
//                                                 )}
//                                             </td>
//                                             <td className="p-3">
//                                                 <div className="flex items-center gap-2">
//                                                     {/* View */}
//                                                     <button
//                                                         onClick={(e) => { e.stopPropagation(); handleProxySelect(proxy); }}
//                                                         className="text-[#4f8ef7] hover:text-[#6ca9ff]"
//                                                         title="View details"
//                                                     >
//                                                         <Eye className="h-4 w-4" />
//                                                     </button>
//                                                     {/* Clone */}
//                                                     <button
//                                                         onClick={(e) => { e.stopPropagation(); showMessage(`Clone ${proxy.name} feature coming soon`, 'info'); }}
//                                                         className="text-emerald-400 hover:text-emerald-300"
//                                                         title="Clone"
//                                                     >
//                                                         <Copy className="h-4 w-4" />
//                                                     </button>
//                                                     {/* Versioning */}
//                                                     <button
//                                                         onClick={(e) => { e.stopPropagation(); showMessage(`Version management for ${proxy.name} coming soon`, 'info'); }}
//                                                         className="text-amber-400 hover:text-amber-300"
//                                                         title="Versioning"
//                                                     >
//                                                         <GitBranch className="h-4 w-4" />
//                                                     </button>
//                                                     {/* Deprecate */}
//                                                     <button
//                                                         onClick={(e) => { e.stopPropagation(); showMessage(`Deprecate ${proxy.name} feature coming soon`, 'info'); }}
//                                                         className="text-red-400 hover:text-red-500"
//                                                         title="Deprecate"
//                                                     >
//                                                         <ArchiveIcon className="h-4 w-4" />
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                     {filteredProxies.length === 0 && (
//                                         <tr>
//                                             <td colSpan="5" className="p-6 text-center text-[#7f8fa8]">
//                                                 No proxies found.
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                     )}

//                 </div>
//             );
//         }


//         if (selectedMenuItem === 'shared-flows') {
//             if (selectedProxyDetail) {
//                 return (
//                     <SharedFlowDetailView
//                         sharedFlow={selectedProxyDetail}
//                         onBack={() => setSelectedProxyDetail(null)}
//                         onDeploy={() => console.log('Deploy Shared Flow', selectedProxyDetail)}
//                         onDuplicate={() => console.log('Duplicate Shared Flow', selectedProxyDetail)}
//                         onDelete={() => console.log('Delete Shared Flow', selectedProxyDetail)}
//                         onDevelop={() => setActiveView('develop')}
//                         showMessage={showMessage}
//                     />
//                 );
//             }

//             const filteredSharedFlows = (sharedFlows || []).filter(sf =>
//                 sf.name?.toLowerCase().includes(searchTerm.toLowerCase())
//             );

//             return (
//                 <div className="flex flex-col gap-4 p-6">
//                     <h2 className="text-xl font-semibold">Shared Function</h2>
//                     <div className="flex justify-between items-center">
//                         <GatewayContextSelector
//                             selectedOrg={selectedOrg} setSelectedOrg={setSelectedOrg}
//                             selectedBU={selectedBU} setSelectedBU={setSelectedBU}
//                             selectedEnv={selectedEnv} setSelectedEnv={setSelectedEnv}
//                             showEnv={true}
//                         />
//                         <div className="flex items-center gap-2">
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
//                                 <input
//                                     type="text"
//                                     placeholder="Filter shared function..."
//                                     value={searchTerm}
//                                     onChange={e => setSearchTerm(e.target.value)}
//                                     className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-50"
//                                 />
//                             </div>
//                             <Button
//                                 onClick={() => setCreateSharedFlowModal({ open: true, name: '', description: '' })}
//                                 className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white"
//                             >
//                                 <Plus className="mr-1 h-4 w-4" /> Create
//                             </Button>
//                         </div>
//                     </div>

//                     {loadingSharedFlows ? (
//                         <div className="p-6 text-center text-[#7f8fa8]">
//                             <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
//                             <p>Loading shared flows...</p>
//                         </div>
//                     ) : sharedFlowsError ? (
//                         <div className="p-6 text-center text-red-400">
//                             <AlertCircle className="h-6 w-6 mx-auto mb-2" />
//                             <p>Error: {sharedFlowsError}</p>
//                             <button onClick={fetchSharedFlows} className="mt-2 text-sm text-[#4f8ef7] hover:underline">
//                                 Retry
//                             </button>
//                         </div>
//                     ) : (
//                         <div className="bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
//                             <table className="w-full text-sm">
//                                 <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                                     <tr>
//                                         <th className="text-left p-3 text-[#5a6a8a]">Name</th>
//                                         <th className="text-left p-3 text-[#5a6a8a]">Environment</th>
//                                         <th className="text-left p-3 text-[#5a6a8a]">Last Modified</th>
//                                         <th className="text-left p-3 text-[#5a6a8a]">Source</th>
//                                         <th className="text-left p-3 text-[#5a6a8a]">Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {filteredSharedFlows.map(sf => (
//                                         <tr
//                                             key={sf.id || sf.name}
//                                             className="border-b border-[#1f2840] hover:bg-[#1a1f2e] cursor-pointer"
//                                             onClick={() => setSelectedProxyDetail(sf)}
//                                         >
//                                             <td className="p-3 text-white font-mono text-sm">{sf.name}</td>
//                                             <td className="p-3 text-[#7f8fa8]">
//                                                 {sf.environmentSummary || (sf.environments?.length ? sf.environments.join(', ') : 'Not deployed')}
//                                             </td>
//                                             <td className="p-3 text-[#7f8fa8]">
//                                                 {sf.lastModifiedAt ? new Date(sf.lastModifiedAt).toLocaleDateString() : '—'}
//                                             </td>
//                                             <td className="p-3">
//                                                 {sf.source === "LIFECYCLE_TOOL" ? (
//                                                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
//                                                         ForgeSphere
//                                                     </span>
//                                                 ) : (
//                                                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">
//                                                         Api Hub
//                                                     </span>
//                                                 )}
//                                             </td>
//                                             <td className="p-3">
//                                                 <div className="flex items-center gap-2">
//                                                     <button
//                                                         onClick={(e) => {
//                                                             e.stopPropagation();
//                                                             setSelectedProxyDetail(sf);
//                                                         }}
//                                                         className="text-[#4f8ef7] hover:text-[#6ca9ff]"
//                                                         title="View details"
//                                                     >
//                                                         <Eye className="h-4 w-4" />
//                                                     </button>
//                                                     <button
//                                                         onClick={(e) => {
//                                                             e.stopPropagation();
//                                                             showMessage(`Clone ${sf.name} feature coming soon`, 'info');
//                                                         }}
//                                                         className="text-emerald-400 hover:text-emerald-300"
//                                                         title="Clone"
//                                                     >
//                                                         <Copy className="h-4 w-4" />
//                                                     </button>
//                                                     <button
//                                                         onClick={(e) => {
//                                                             e.stopPropagation();
//                                                             showMessage(`Version management for ${sf.name} coming soon`, 'info');
//                                                         }}
//                                                         className="text-amber-400 hover:text-amber-300"
//                                                         title="Versioning"
//                                                     >
//                                                         <GitBranch className="h-4 w-4" />
//                                                     </button>
//                                                     <button
//                                                         onClick={(e) => {
//                                                             e.stopPropagation();
//                                                             showMessage(`Deprecate ${sf.name} feature coming soon`, 'info');
//                                                         }}
//                                                         className="text-red-400 hover:text-red-500"
//                                                         title="Deprecate"
//                                                     >
//                                                         <ArchiveIcon className="h-4 w-4" />
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                     {filteredSharedFlows.length === 0 && (
//                                         <tr>
//                                             <td colSpan="5" className="p-6 text-center text-[#7f8fa8]">
//                                                 No shared flows found.
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                     )}
//                 </div>
//             );
//         }
//         // if (selectedMenuItem === 'shared-flows') {
//         //     const sharedFlowsList = [
//         //         { id: 'shared-flow-1', name: 'auth-shared-flow', environment: 'dev (Intermediate)', lastModified: '3 days ago' },
//         //         { id: 'shared-flow-2', name: 'logging-shared-flow', environment: 'staging', lastModified: '2 days ago' },
//         //     ];
//         //     if (selectedProxyDetail) {
//         //         return (
//         //             <SharedFlowDetailView
//         //                 sharedFlow={selectedProxyDetail}
//         //                 onBack={() => setSelectedProxyDetail(null)}
//         //                 onDeploy={() => console.log('Deploy Shared Flow', selectedProxyDetail)}
//         //                 onDuplicate={() => console.log('Duplicate Shared Flow', selectedProxyDetail)}
//         //                 onDelete={() => console.log('Delete Shared Flow', selectedProxyDetail)}
//         //                 onDevelop={() => setActiveView('develop')}
//         //             />
//         //         );
//         //     }
//         //     return (
//         //         <div className="flex flex-col gap-4 p-6">
//         //             <h2 className="text-xl font-semibold">Shared Function</h2>
//         //             <div className="flex justify-between items-center">
//         //                 <GatewayContextSelector
//         //                     selectedOrg={selectedOrg} setSelectedOrg={setSelectedOrg}
//         //                     selectedBU={selectedBU} setSelectedBU={setSelectedBU}
//         //                     selectedEnv={selectedEnv} setSelectedEnv={setSelectedEnv}
//         //                     showEnv={true}
//         //                 />

//         //                 <div className="flex items-center gap-2">
//         //                     <div className="relative">
//         //                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
//         //                         <input type="text" placeholder="Filter shared function..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64" />
//         //                     </div>
//         //                     <Button
//         //                         onClick={() => setCreateSharedFlowModal({ open: true, name: '', description: '' })}
//         //                         className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white"
//         //                     >
//         //                         <Plus className="mr-1 h-4 w-4" /> Create Shared Function
//         //                     </Button>
//         //                 </div>
//         //             </div>
//         //             <div className="bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
//         //                 <table className="w-full text-sm">
//         //                     <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//         //                         <tr><th className="text-left p-3 text-[#5a6a8a]">Name</th>
//         //                             <th className="text-left p-3 text-[#5a6a8a]">Environment</th>
//         //                             <th className="text-left p-3 text-[#5a6a8a]">Last Modified</th>
//         //                             <th className="text-left p-3 text-[#5a6a8a]">Actions</th>
//         //                         </tr>
//         //                     </thead>
//         //                     <tbody>{sharedFlowsList.filter(sf => sf.name.toLowerCase().includes(searchTerm.toLowerCase())).map(sf => (
//         //                         <tr key={sf.id} className="border-b border-[#1f2840] hover:bg-[#1a1f2e] cursor-pointer" onClick={() => handleProxySelect(sf)}>
//         //                             <td className="p-3 text-white">{sf.name}</td>
//         //                             <td className="p-3 text-[#7f8fa8]">{sf.environment}</td>
//         //                             <td className="p-3 text-[#7f8fa8]">{sf.lastModified}</td>
//         //                             <td className="p-3"><button className="text-[#4f8ef7] hover:underline">View</button></td>
//         //                         </tr>))}</tbody></table>
//         //             </div>
//         //         </div>
//         //     );
//         // }

//         if (selectedMenuItem === 'api-products') return <div className="p-6">
//             <APIProductsManager
//                 onBack={() => selectSidebarMenu('api-proxies')}
//                 selectedOrg={selectedOrg}
//                 onOrgChange={setSelectedOrg}
//                 selectedBU={selectedBU}
//                 onBUChange={setSelectedBU}
//                 selectedEnv={selectedEnv}
//                 onEnvChange={setSelectedEnv}
//                 orgId="gen-ai-poc-onboarding"   // fallback
//                 envId="dev"
//                 developerEmail="jagruti.d@krelixir.com"
//             />
//         </div>;
//         if (selectedMenuItem === 'consumer') {
//             return (
//                 <div className="p-6">
//                     <ApigeeAppsManager
//                         orgId="gen-ai-poc-onboarding"
//                         envId="dev"
//                         developerEmail="jagruti.d@krelixir.com"
//                         showAppIdSec={false}
//                         selectedOrg={selectedOrg}
//                         onOrgChange={setSelectedOrg}
//                         selectedBU={selectedBU}
//                         onBUChange={setSelectedBU}
//                         selectedEnv={selectedEnv}
//                         onEnvChange={setSelectedEnv}
//                     />
//                 </div>
//             );
//         }
//         if (selectedMenuItem === 'api-metrics') return <ProxyMonitoring showHeader={false} />;
//         if (selectedMenuItem === 'compliance') return <Governance showHeader={false} />;
//         if (selectedMenuItem === 'framework') return <Framework showHeader={false} />;
//         if (selectedMenuItem === 'automation') return <Automation showHeader={false} />;
//         if (selectedMenuItem === 'environments') return <ApigeeMainPage showHeader={false} />;
//         if (selectedMenuItem === 'gateway-profile') return <Profile showHeader={false} />;
//         if (selectedMenuItem === 'gateway-dashboard') return <GatewayDashboard />;
//         return <div className="p-6 text-center text-[#7f8fa8]"><h2 className="text-xl font-semibold mb-2">{selectedMenuItem.replace('-', ' ').toUpperCase()}</h2><p>Content for {selectedMenuItem} will be displayed here.</p></div>;
//     };

//     // ========== PREVIEW MODAL ==========
//     const PreviewModal = () => (
//         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
//             <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
//                 {/* Header */}
//                 <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
//                     <div className="flex items-center gap-3">
//                         <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]">
//                             <Eye className="h-5 w-5" />
//                         </div>
//                         <div>
//                             <h3 className="text-xl font-semibold text-white">Review & Submit</h3>
//                             <p className="text-xs text-slate-400">Verify all details before sending for approval</p>
//                         </div>
//                     </div>
//                     <button
//                         onClick={() => setShowPreviewModal(false)}
//                         className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
//                     >
//                         <X className="h-5 w-5" />
//                     </button>
//                 </div>

//                 {/* Content */}
//                 <div className="p-6 space-y-6">
//                     {/* Company Card */}
//                     <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
//                         <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4">
//                             <Building className="h-4 w-4 text-[#ff8a5c]" />
//                             <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Company Information</h4>
//                         </div>
//                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
//                             <div>
//                                 <span className="block text-xs text-slate-500">Company Name</span>
//                                 <span className="font-medium text-white">{company.name || '—'}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">Website</span>
//                                 <span className="font-medium text-white">{company.websiteUrl || '—'}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">Region</span>
//                                 <span className="font-medium text-white">{company.region || '—'}</span>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Stakeholder Card */}
//                     <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
//                         <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4">
//                             <Users className="h-4 w-4 text-[#ff8a5c]" />
//                             <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Stakeholder Details</h4>
//                         </div>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
//                             <div>
//                                 <span className="block text-xs text-slate-500">Full Name</span>
//                                 <span className="font-medium text-white">{orgOnboardingData.firstName} {orgOnboardingData.lastName}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">Email Address</span>
//                                 <span className="font-medium text-white">{orgOnboardingData.ownerEmail}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">Contact Number</span>
//                                 <span className="font-medium text-white">{orgOnboardingData.phoneNumber}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">SME Name</span>
//                                 <span className="font-medium text-white">{orgOnboardingData.sme || '—'}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">SME Email</span>
//                                 <span className="font-medium text-white">{orgOnboardingData.smeEmail || '—'}</span>
//                             </div>
//                             <div>
//                                 <span className="block text-xs text-slate-500">Distribution List</span>
//                                 <span className="font-medium text-white">{orgOnboardingData.dlEmail || '—'}</span>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Gateway Organizations Card */}
//                     <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
//                         <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4">
//                             <Network className="h-4 w-4 text-[#ff8a5c]" />
//                             <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Gateway Organizations</h4>
//                         </div>
//                         <div className="space-y-4">
//                             {gatewayOrgs.map((org, idx) => (
//                                 <div key={org.id} className="rounded-lg border border-[#2a3a5a]/50 bg-[#0f172a]/40 p-4">
//                                     <div className="flex items-center justify-between mb-3">
//                                         <span className="text-sm font-semibold text-white">#{idx + 1} {org.name || 'Unnamed'}</span>
//                                         <span className="rounded-full bg-[#ff5b1f]/20 px-2 py-0.5 text-xs font-medium text-[#ff8a5c]">
//                                             {org.config.environmentType === 'prod' ? 'prod' : 'non-prod'}
//                                         </span>
//                                     </div>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                                         <div>
//                                             <span className="block text-xs text-slate-500">Region</span>
//                                             <span className="text-white">{org.region || '—'}</span>
//                                         </div>
//                                         <div>
//                                             <span className="block text-xs text-slate-500">Environments</span>
//                                             <div className="flex flex-wrap gap-1 mt-1">
//                                                 {org.config.selectedEnvironments.length > 0 ? (
//                                                     org.config.selectedEnvironments.map(env => (
//                                                         <span key={env} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{env}</span>
//                                                     ))
//                                                 ) : (
//                                                     <span className="text-white">—</span>
//                                                 )}
//                                             </div>
//                                         </div>
//                                         <div>
//                                             <span className="block text-xs text-slate-500">Expected TPS</span>
//                                             <span className="text-white">{org.config.expectedTps || '—'}</span>
//                                         </div>
//                                         <div>
//                                             <span className="block text-xs text-slate-500">API Count Range</span>
//                                             <span className="text-white">{org.config.expectedApiRange || '—'}</span>
//                                         </div>
//                                         {org.config.notes && (
//                                             <div className="md:col-span-2">
//                                                 <span className="block text-xs text-slate-500">Notes</span>
//                                                 <span className="text-white text-sm">{org.config.notes}</span>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             ))}
//                             {gatewayOrgs.length === 0 && <p className="text-sm text-slate-400">No gateway organizations added.</p>}
//                         </div>
//                     </div>
//                 </div>

//                 {/* Footer Actions */}
//                 <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
//                     <button
//                         onClick={() => setShowPreviewModal(false)}
//                         className="rounded-lg border border-[#2a3a5a] bg-transparent px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={sendApprovalRequest}
//                         disabled={isSendingApproval}
//                         className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff6b36] disabled:opacity-50"
//                     >
//                         {isSendingApproval ? 'Sending...' : 'Confirm & Send for Approval'}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );

//     // ========== HISTORY MODAL ==========
//     // ========== ENHANCED HISTORY MODAL (Three Tabs) ==========
//     const HistoryModal = ({ open, onClose, onLoadOrganization, onLoadBusinessUnit }) => {
//         const [activeTab, setActiveTab] = useState('organization'); // organization, bu, team
//         const [orgSubmissions, setOrgSubmissions] = useState([]);
//         const [buSubmissions, setBuSubmissions] = useState([]);
//         const [teamSubmissions, setTeamSubmissions] = useState([]);
//         const [loading, setLoading] = useState(false);
//         const [teamMemberSearch, setTeamMemberSearch] = useState('');
//         const [copiedId, setCopiedId] = useState(null);
//         const aggregatedTeamMembers = useMemo(() => {
//             const members = [];
//             buSubmissions.forEach(bu => {
//                 if (bu.members && Array.isArray(bu.members)) {
//                     bu.members.forEach(member => {
//                         members.push({
//                             ...member,
//                             businessUnitId: bu.id,
//                             businessUnitName: bu.teamName,
//                             businessUnitAppName: bu.applicationName,
//                         });
//                     });
//                 }
//             });
//             return members;
//         }, [buSubmissions]);

//         const loadAllHistory = async () => {
//             setLoading(true);
//             try {
//                 // 1. Organization submissions from backend
//                 const orgRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`);
//                 if (orgRes.ok) {
//                     const orgData = await orgRes.json();
//                     setOrgSubmissions(orgData);
//                 } else {
//                     // fallback to localStorage
//                     const stored = localStorage.getItem('orgSubmissions');
//                     if (stored) setOrgSubmissions(JSON.parse(stored));
//                 }

//                 // Fetch BU submissions from API
//                 const buResponse = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
//                 if (buResponse.ok) {
//                     const buResult = await buResponse.json();
//                     setBuSubmissions(buResult.data || []);
//                     const allMembers = buResult?.data?.flatMap(unit => unit.members || []);

//                     // Deduplicate members by email (or by id if you prefer)
//                     const uniqueMembersMap = new Map();
//                     allMembers.forEach(member => {
//                         if (member.email && !uniqueMembersMap.has(member.email)) {
//                             uniqueMembersMap.set(member.email, member);
//                         }
//                     });
//                     const uniqueMembers = Array.from(uniqueMembersMap.values());

//                     setTeamSubmissions(uniqueMembers);
//                 } else {
//                     setBuSubmissions([]);
//                     // 3. Team submissions from localStorage
//                     const teamStored = localStorage.getItem('teamSubmissions');
//                     if (teamStored) setTeamSubmissions(JSON.parse(teamStored));
//                 }

//             } catch (err) {
//                 console.error('Failed to load history', err);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         useEffect(() => {
//             if (open) {
//                 loadAllHistory();
//             }
//         }, [open]);

//         const mapStatus = (status) => {
//             if (status === 'PENDING_APPROVAL') return 'pending';
//             if (status === 'DRAFT') return 'draft';
//             if (status === 'APPROVED') return 'approved';
//             if (status === 'REJECTED') return 'rejected';
//             return status?.toLowerCase() || 'unknown';
//         };

//         if (!open) return null;

//         return (
//             <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
//                 <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl flex flex-col">
//                     {/* Header */}
//                     <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
//                         <div className="flex items-center gap-3">
//                             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]">
//                                 <History className="h-5 w-5" />
//                             </div>
//                             <div>
//                                 <h3 className="text-xl font-semibold text-white">Onboarding History</h3>
//                                 <p className="text-xs text-slate-400">View past submissions</p>
//                             </div>
//                         </div>
//                         <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
//                             <X className="h-5 w-5" />
//                         </button>
//                     </div>

//                     {/* Tabs */}
//                     <div className="flex gap-4 px-6 pt-4 border-b border-[#2a3a5a]">
//                         <button
//                             onClick={() => setActiveTab('organization')}
//                             className={`pb-2 px-1 text-sm font-medium transition capitalize ${activeTab === 'organization'
//                                 ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
//                                 : 'text-[#7f8fa8] hover:text-white'
//                                 }`}
//                         >
//                             Organization
//                         </button>
//                         <button
//                             onClick={() => setActiveTab('bu')}
//                             className={`pb-2 px-1 text-sm font-medium transition capitalize ${activeTab === 'bu'
//                                 ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
//                                 : 'text-[#7f8fa8] hover:text-white'
//                                 }`}
//                         >
//                             Business Unit
//                         </button>
//                         <button
//                             onClick={() => setActiveTab('team')}
//                             className={`pb-2 px-1 text-sm font-medium transition capitalize ${activeTab === 'team'
//                                 ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
//                                 : 'text-[#7f8fa8] hover:text-white'
//                                 }`}
//                         >
//                             Team
//                         </button>
//                     </div>

//                     {/* Scrollable Content */}
//                     <div className="flex-1 overflow-y-auto p-6 space-y-4">
//                         {loading ? (
//                             <div className="text-center py-12">
//                                 <Loader2 className="animate-spin h-8 w-8 text-[#ff5b1f] mx-auto" />
//                                 <p className="mt-2 text-slate-400">Loading history...</p>
//                             </div>
//                         ) : (
//                             <>
//                                 {/* Organization Tab */}
//                                 {activeTab === 'organization' && (
//                                     orgSubmissions.length === 0 ? (
//                                         <div className="text-center py-12 text-slate-400">
//                                             <Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" />
//                                             <p>No organization submissions yet.</p>
//                                             <p className="text-xs mt-1">Start the organization onboarding process to see history.</p>
//                                         </div>
//                                     ) : (
//                                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                                             {orgSubmissions.map((sub) => {
//                                                 const status = mapStatus(sub.status);
//                                                 const statusColors = {
//                                                     approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
//                                                     pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
//                                                     rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
//                                                     draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
//                                                 };
//                                                 const statusColor = statusColors[status] || statusColors.draft;

//                                                 return (
//                                                     <div
//                                                         key={sub.id}
//                                                         className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all duration-300 hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40"
//                                                     >
//                                                         {/* Decorative accent line */}
//                                                         <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

//                                                         <div className="p-5 space-y-4">
//                                                             {/* Header: Company Name + Status */}
//                                                             <div className="flex justify-between items-start">
//                                                                 <div>
//                                                                     <div className="flex items-center gap-2 flex-wrap">
//                                                                         <h3 className="text-lg font-semibold text-white">{sub.company?.name || 'N/A'}</h3>
//                                                                         <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
//                                                                             {status.toUpperCase()}
//                                                                         </span>
//                                                                     </div>
//                                                                     {/* Onboarding ID with inline copy icon */}
//                                                                     <div className="flex items-center gap-2 mt-2">
//                                                                         <span className="text-xs text-slate-500">Onboarding ID:</span>
//                                                                         <code className="text-xs font-mono text-slate-300 bg-[#1a1f2e] px-2 py-0.5 rounded-md">
//                                                                             {sub.id}
//                                                                         </code>
//                                                                         <button
//                                                                             onClick={() => {
//                                                                                 navigator.clipboard.writeText(sub.id);
//                                                                                 setCopiedId(sub.id);
//                                                                                 setTimeout(() => setCopiedId(null), 2000);
//                                                                             }}
//                                                                             className="p-1 rounded-md hover:bg-[#2a3550] transition-colors"
//                                                                             title="Copy ID"
//                                                                         >
//                                                                             {copiedId === sub.id ? (
//                                                                                 <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
//                                                                             ) : (
//                                                                                 <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
//                                                                             )}
//                                                                         </button>
//                                                                     </div>
//                                                                 </div>
//                                                                 <button
//                                                                     onClick={() => {
//                                                                         if (onLoadOrganization) onLoadOrganization(sub.id); setIsCreateNewOnboarding(true);
//                                                                     }}
//                                                                     className="px-4 py-1.5 rounded-lg border border-[#ff5b1f]/30 bg-[#ff5b1f]/10 text-[#ff8a5c] text-sm font-medium hover:bg-[#ff5b1f]/20 transition"
//                                                                 >
//                                                                     View
//                                                                 </button>
//                                                             </div>

//                                                             {/* Stakeholder details (compact) */}
//                                                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-[#1f2840] pt-3">
//                                                                 <div className="flex items-center gap-2">
//                                                                     <UserCircle className="h-4 w-4 text-slate-500" />
//                                                                     <span className="text-slate-400">Stakeholder:</span>
//                                                                     <span className="text-white truncate">
//                                                                         {sub.stakeholder?.firstName} {sub.stakeholder?.lastName}
//                                                                     </span>
//                                                                 </div>
//                                                                 <div className="flex items-center gap-2">
//                                                                     <Mail className="h-4 w-4 text-slate-500" />
//                                                                     <span className="text-slate-400">Email:</span>
//                                                                     <span className="text-white truncate">{sub.stakeholder?.email}</span>
//                                                                 </div>
//                                                                 <div className="flex items-center gap-2">
//                                                                     <Phone className="h-4 w-4 text-slate-500" />
//                                                                     <span className="text-slate-400">Phone:</span>
//                                                                     <span className="text-white">{sub.stakeholder?.phone}</span>
//                                                                 </div>
//                                                                 <div className="flex items-center gap-2">
//                                                                     <Calendar className="h-4 w-4 text-slate-500" />
//                                                                     <span className="text-slate-400">Submitted:</span>
//                                                                     <span className="text-white text-xs">
//                                                                         {new Date(sub.timestamp || sub.createdAt).toLocaleString()}
//                                                                     </span>
//                                                                 </div>
//                                                             </div>

//                                                             {/* Gateway Organizations summary */}
//                                                             {sub.gatewayOrganizations && sub.gatewayOrganizations.length > 0 && (
//                                                                 <div className="bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
//                                                                     <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
//                                                                         <Network className="h-3 w-3" />
//                                                                         <span>Gateway Organizations ({sub.gatewayOrganizations.length})</span>
//                                                                     </div>
//                                                                     <div className="flex flex-wrap gap-2">
//                                                                         {sub.gatewayOrganizations.slice(0, 3).map((org, idx) => (
//                                                                             <span
//                                                                                 key={idx}
//                                                                                 className="text-xs bg-[#1a1f2e] text-slate-300 px-2 py-1 rounded-md"
//                                                                             >
//                                                                                 {org.name || 'Unnamed'}
//                                                                             </span>
//                                                                         ))}
//                                                                         {sub.gatewayOrganizations.length > 3 && (
//                                                                             <span className="text-xs text-slate-400">
//                                                                                 +{sub.gatewayOrganizations.length - 3} more
//                                                                             </span>
//                                                                         )}
//                                                                     </div>
//                                                                 </div>
//                                                             )}

//                                                             {/* SME & DL info (if present) */}
//                                                             {(sub.stakeholder?.sme || sub.stakeholder?.dlEmail) && (
//                                                                 <div className="flex flex-wrap gap-3 text-xs border-t border-[#1f2840] pt-3">
//                                                                     {sub.stakeholder?.sme && (
//                                                                         <div className="flex items-center gap-1">
//                                                                             <Users className="h-3 w-3 text-slate-500" />
//                                                                             <span className="text-slate-400">SME:</span>
//                                                                             <span className="text-white">{sub.stakeholder.sme}</span>
//                                                                         </div>
//                                                                     )}
//                                                                     {sub.stakeholder?.dlEmail && (
//                                                                         <div className="flex items-center gap-1">
//                                                                             <Mail className="h-3 w-3 text-slate-500" />
//                                                                             <span className="text-slate-400">DL:</span>
//                                                                             <span className="text-white">{sub.stakeholder.dlEmail}</span>
//                                                                         </div>
//                                                                     )}
//                                                                 </div>
//                                                             )}
//                                                         </div>

//                                                         {/* Footer with last update */}
//                                                         <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs">
//                                                             <span className="text-slate-500">
//                                                                 Last updated: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : '—'}
//                                                             </span>
//                                                             <span className="text-emerald-400 flex items-center gap-1">
//                                                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
//                                                                 {status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending' : status}
//                                                             </span>
//                                                         </div>
//                                                     </div>
//                                                 );
//                                             })}
//                                         </div>
//                                     )
//                                 )}

//                                 {/* BU History Tab */}
//                                 {activeTab === 'bu' && (
//                                     buSubmissions.length === 0 ? (
//                                         <div className="text-center py-12 text-slate-400">
//                                             <Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" />
//                                             <p>No business unit submissions yet.</p>
//                                             <p className="text-xs mt-1">Create your first business unit from the onboarding form.</p>
//                                         </div>
//                                     ) : (
//                                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                                             {buSubmissions.map((bu) => (
//                                                 <div
//                                                     key={bu.id}
//                                                     className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all duration-300 hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40"
//                                                 >
//                                                     {/* Decorative accent line */}
//                                                     <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

//                                                     <div className="p-5 space-y-4">
//                                                         {/* Header: Team & Application */}
//                                                         <div className="flex justify-between items-start">
//                                                             <div>
//                                                                 <h3 className="text-lg font-semibold text-white flex items-center gap-2">
//                                                                     {bu.teamName}
//                                                                     <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
//                                                                         ACTIVE
//                                                                     </span>
//                                                                 </h3>
//                                                                 <p className="text-sm text-slate-400 mt-1">
//                                                                     Application: <span className="text-white font-mono">{bu.applicationName}</span>
//                                                                     {bu.applicationId && <span className="ml-2 text-xs text-slate-500">(ID: {bu.applicationId})</span>}
//                                                                 </p>
//                                                             </div>
//                                                             <div className="flex items-center gap-2">
//                                                                 {/* Edit button */}
//                                                                 <button
//                                                                     onClick={() => onLoadBusinessUnit && onLoadBusinessUnit(bu)}
//                                                                     className="p-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff8a5c] hover:bg-[#ff5b1f]/20 transition-colors"
//                                                                     title="Edit Business Unit"
//                                                                 >
//                                                                     <Edit className="h-4 w-4" />
//                                                                 </button>
//                                                                 {/* Future: delete or more options */}
//                                                             </div>
//                                                         </div>

//                                                         {/* Key metrics row */}
//                                                         <div className="flex flex-wrap gap-4 text-sm border-t border-[#1f2840] pt-3">
//                                                             <div className="flex items-center gap-2">
//                                                                 <UserCircle className="h-4 w-4 text-slate-500" />
//                                                                 <span className="text-slate-300">Owner:</span>
//                                                                 <span className="text-white font-medium">{bu.projectOwner || '—'}</span>
//                                                             </div>
//                                                             <div className="flex items-center gap-2">
//                                                                 <Calendar className="h-4 w-4 text-slate-500" />
//                                                                 <span className="text-slate-300">Go‑Live:</span>
//                                                                 <span className="text-white font-mono text-xs">
//                                                                     {bu.expectedGoLiveDate ? new Date(bu.expectedGoLiveDate).toLocaleDateString() : '—'}
//                                                                 </span>
//                                                             </div>
//                                                             <div className="flex items-center gap-2">
//                                                                 <Users className="h-4 w-4 text-slate-500" />
//                                                                 <span className="text-slate-300">Members:</span>
//                                                                 <span className="text-white font-semibold">{bu.members?.length || 0}</span>
//                                                             </div>
//                                                             <div className="flex items-center gap-2">
//                                                                 <Layers className="h-4 w-4 text-slate-500" />
//                                                                 <span className="text-slate-300">Consumers:</span>
//                                                                 <span className="text-white font-semibold">{bu.consumers?.length || 0}</span>
//                                                             </div>
//                                                         </div>

//                                                         {/* Additional details grid */}
//                                                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
//                                                             <div>
//                                                                 <span className="text-slate-500">Project SME:</span>
//                                                                 <p className="text-white truncate">{bu.projectSME || '—'}</p>
//                                                             </div>
//                                                             <div>
//                                                                 <span className="text-slate-500">Tester:</span>
//                                                                 <p className="text-white truncate">{bu.testerName || '—'}</p>
//                                                             </div>
//                                                             <div>
//                                                                 <span className="text-slate-500">ServiceNow Group:</span>
//                                                                 <p className="text-white truncate">{bu.servicenowGroupName || '—'}</p>
//                                                             </div>
//                                                             <div>
//                                                                 <span className="text-slate-500">Last Updated:</span>
//                                                                 <p className="text-white font-mono">{bu.updatedAt ? new Date(bu.updatedAt).toLocaleString() : (bu.createdAt ? new Date(bu.createdAt).toLocaleString() : '—')}</p>
//                                                             </div>
//                                                         </div>

//                                                         {/* Optional: Quick view of first two members + consumers */}
//                                                         {(bu.members?.length > 0 || bu.consumers?.length > 0) && (
//                                                             <div className="flex flex-wrap gap-3 text-xs border-t border-[#1f2840] pt-3">
//                                                                 {bu.members?.slice(0, 2).map(m => (
//                                                                     <div key={m.id} className="flex items-center gap-1 bg-[#1a1f2e] rounded-full px-2 py-1">
//                                                                         <UserCircle className="h-3 w-3 text-slate-400" />
//                                                                         <span className="text-slate-300">{m.name}</span>
//                                                                     </div>
//                                                                 ))}
//                                                                 {bu.members?.length > 2 && (
//                                                                     <span className="text-slate-400">+{bu.members.length - 2} more</span>
//                                                                 )}
//                                                                 {bu.consumers?.slice(0, 2).map(c => (
//                                                                     <div key={c.id} className="flex items-center gap-1 bg-[#1a1f2e] rounded-full px-2 py-1">
//                                                                         <Layers className="h-3 w-3 text-amber-400" />
//                                                                         <span className="text-slate-300">{c.name || c.consumerId}</span>
//                                                                     </div>
//                                                                 ))}
//                                                                 {bu.consumers?.length > 2 && (
//                                                                     <span className="text-slate-400">+{bu.consumers.length - 2} more</span>
//                                                                 )}
//                                                             </div>
//                                                         )}
//                                                     </div>

//                                                     {/* Subtle footer bar with status */}
//                                                     <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs">
//                                                         <span className="text-slate-500">Created: {bu.createdAt ? new Date(bu.createdAt).toLocaleDateString() : '—'}</span>
//                                                         <span className="text-emerald-400 flex items-center gap-1">
//                                                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
//                                                             Synced
//                                                         </span>
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     )
//                                 )}

//                                 {/* Team History Tab */}
//                                 {activeTab === 'team' && (
//                                     <div className="space-y-4">
//                                         {/* Header with search and count */}
//                                         <div className="flex justify-between items-center">
//                                             <div>
//                                                 <h3 className="text-lg font-semibold text-white">Team Members</h3>
//                                                 <p className="text-xs text-slate-400">
//                                                     {aggregatedTeamMembers.length} member(s) across all business units
//                                                 </p>
//                                             </div>
//                                             <div className="relative">
//                                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
//                                                 <input
//                                                     type="text"
//                                                     placeholder="Search by name or email..."
//                                                     value={teamMemberSearch}
//                                                     onChange={(e) => setTeamMemberSearch(e.target.value)}
//                                                     className="w-64 rounded-lg border border-[#2a3550] bg-[#0f1117] pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff5b1f]"
//                                                 />
//                                             </div>
//                                         </div>

//                                         {aggregatedTeamMembers.length === 0 ? (
//                                             <div className="text-center py-12 text-slate-400">
//                                                 <Users className="h-12 w-12 mx-auto mb-3 text-slate-600" />
//                                                 <p>No team members found.</p>
//                                                 <p className="text-xs mt-1">Team members are added when you create or edit a business unit.</p>
//                                             </div>
//                                         ) : (
//                                             <div className="overflow-x-auto rounded-xl border border-[#2a3550] bg-[#111520]">
//                                                 <table className="min-w-full divide-y divide-[#1f2840]">
//                                                     <thead className="bg-[#1a1f2e]">
//                                                         <tr>
//                                                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Member</th>
//                                                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
//                                                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Business Unit</th>
//                                                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Application</th>
//                                                             <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
//                                                         </tr>
//                                                     </thead>
//                                                     <tbody className="divide-y divide-[#1f2840]">
//                                                         {aggregatedTeamMembers
//                                                             .filter(member =>
//                                                                 member.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
//                                                                 member.email?.toLowerCase().includes(teamMemberSearch.toLowerCase())
//                                                             )
//                                                             .map((member, idx) => (
//                                                                 <tr key={`${member.businessUnitId}-${member.id}-${idx}`} className="hover:bg-[#1a1f2e]/50 transition">
//                                                                     <td className="px-6 py-4 whitespace-nowrap">
//                                                                         <div className="flex items-center gap-3">
//                                                                             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff8a5c]/10 flex items-center justify-center text-white font-medium">
//                                                                                 {member.name?.charAt(0).toUpperCase() || '?'}
//                                                                             </div>
//                                                                             <div>
//                                                                                 <div className="text-sm font-medium text-white">{member.name}</div>
//                                                                                 <div className="text-xs text-slate-400">{member.email}</div>
//                                                                             </div>
//                                                                         </div>
//                                                                     </td>
//                                                                     <td className="px-6 py-4 whitespace-nowrap">
//                                                                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300">
//                                                                             {member.role || 'Member'}
//                                                                         </span>
//                                                                     </td>
//                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
//                                                                         {member.businessUnitName}
//                                                                     </td>
//                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
//                                                                         {member.businessUnitAppName}
//                                                                     </td>
//                                                                     <td className="px-6 py-4 whitespace-nowrap text-sm">
//                                                                         <button
//                                                                             onClick={() => {
//                                                                                 // Find the full business unit object by ID and load it for editing
//                                                                                 const bu = buSubmissions.find(b => b.id === member.businessUnitId);
//                                                                                 if (bu && onLoadBusinessUnit) {
//                                                                                     onLoadBusinessUnit(bu);
//                                                                                 }
//                                                                             }}
//                                                                             className="text-[#4f8ef7] hover:text-[#ff8a5c] transition flex items-center gap-1"
//                                                                         >
//                                                                             <Edit className="h-4 w-4" />
//                                                                             <span className="hidden sm:inline">Edit BU</span>
//                                                                         </button>
//                                                                     </td>
//                                                                 </tr>
//                                                             ))}
//                                                         {aggregatedTeamMembers.filter(m =>
//                                                             m.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
//                                                             m.email?.toLowerCase().includes(teamMemberSearch.toLowerCase())
//                                                         ).length === 0 && (
//                                                                 <tr>
//                                                                     <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
//                                                                         No matching team members.
//                                                                     </td>
//                                                                 </tr>
//                                                             )}
//                                                     </tbody>
//                                                 </table>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}
//                             </>
//                         )}
//                     </div>

//                     {/* Footer */}
//                     <div className="sticky bottom-0 flex justify-end border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
//                         <button onClick={onClose} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ff6b36]">
//                             Close
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };
//     // const HistoryModal = () => (
//     //     <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
//     //         <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
//     //             {/* Header */}
//     //             <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
//     //                 <div className="flex items-center gap-3">
//     //                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]">
//     //                         <History className="h-5 w-5" />
//     //                     </div>
//     //                     <div>
//     //                         <h3 className="text-xl font-semibold text-white">Organization Submissions</h3>
//     //                         <p className="text-xs text-slate-400">View and load previous drafts or approved organizations</p>
//     //                     </div>
//     //                 </div>
//     //                 <button onClick={() => setShowHistoryModal(false)} className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
//     //                     <X className="h-5 w-5" />
//     //                 </button>
//     //             </div>

//     //             {/* Content */}
//     //             <div className="space-y-4">
//     //                 {organizationSubmissions.length === 0 ? (
//     //                     <div className="flex flex-col items-center justify-center py-12 text-center">
//     //                         <Archive className="h-12 w-12 text-slate-600 mb-3" />
//     //                         <p className="text-slate-400">No submissions yet.</p>
//     //                         <p className="text-xs text-slate-500 mt-1">Save a draft or send for approval to see history.</p>
//     //                     </div>
//     //                 ) : (
//     //                     organizationSubmissions.map((sub) => {
//     //                         const status = mapStatus(sub.status);
//     //                         return (
//     //                             <div key={sub.id} className="group relative overflow-hidden rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 transition-all hover:border-[#ff8a5c]/30 hover:bg-[#0f172a]/80">
//     //                                 <div className="p-5">
//     //                                     <div className="flex flex-wrap items-start justify-between gap-3">
//     //                                         <div className="space-y-2">
//     //                                             <div className="flex items-center gap-2">
//     //                                                 <Building className="h-4 w-4 text-slate-500" />
//     //                                                 <span className="font-semibold text-white">{sub.company.name}</span>
//     //                                                 <span className={cn(
//     //                                                     "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
//     //                                                     status === 'approved' && "bg-emerald-500/20 text-emerald-300",
//     //                                                     status === 'pending' && "bg-yellow-500/20 text-yellow-300",
//     //                                                     status === 'rejected' && "bg-red-500/20 text-red-300",
//     //                                                     status === 'draft' && "bg-slate-500/20 text-slate-300"
//     //                                                 )}>
//     //                                                     {status.toUpperCase()}
//     //                                                 </span>
//     //                                             </div>
//     //                                             <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
//     //                                                 <span className="flex items-center gap-1"><UserCircle className="h-3 w-3" /> {sub.stakeholder.firstName} {sub.stakeholder.lastName}</span>
//     //                                                 <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {sub.stakeholder.email}</span>
//     //                                                 <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {sub.stakeholder.phone}</span>
//     //                                                 <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(sub.createdAt).toLocaleString()}</span>
//     //                                             </div>
//     //                                             <div className="flex flex-wrap gap-1 mt-2">
//     //                                                 {sub.gatewayOrganizations.slice(0, 2).map((org, idx) => (
//     //                                                     <span key={idx} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{org.name}</span>
//     //                                                 ))}
//     //                                                 {sub.gatewayOrganizations.length > 2 && (
//     //                                                     <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">+{sub.gatewayOrganizations.length - 2} more</span>
//     //                                                 )}
//     //                                             </div>
//     //                                         </div>
//     //                                         <button
//     //                                             onClick={() => loadSubmission(sub.id)}
//     //                                             className="rounded-lg border border-[#2a3a5a] bg-transparent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:border-[#ff8a5c] hover:bg-[#ff5b1f]/10"
//     //                                         >
//     //                                             Load
//     //                                         </button>
//     //                                     </div>
//     //                                 </div>
//     //                                 <div className={cn(
//     //                                     "absolute bottom-0 left-0 h-0.5 w-full",
//     //                                     status === 'approved' && "bg-emerald-500",
//     //                                     status === 'pending' && "bg-yellow-500",
//     //                                     status === 'rejected' && "bg-red-500",
//     //                                     status === 'draft' && "bg-slate-500"
//     //                                 )} />
//     //                             </div>
//     //                         );
//     //                     })
//     //                 )}
//     //             </div>
//     //         </div>
//     //     </div>
//     // );

//     // ========== RESET FORM ==========
//     const resetForm = () => {
//         setIsCreateNewOnboarding(false);
//         setCompany({ name: '', websiteUrl: '', region: '' });
//         setOrgOnboardingData({
//             firstName: '',
//             lastName: '',
//             ownerEmail: '',
//             phoneNumber: '',
//             sme: '',
//             smeEmail: '',
//             dlEmail: '',
//             goLiveDate: '',
//         });
//         setGatewayOrgs([{
//             id: generateGatewayId(), name: '', region: '',
//             config: { environmentType: 'nonprod', selectedEnvironments: [], customEnvironments: '', expectedTps: '', expectedApiRange: '', notes: '' }
//         }]);
//         setApprovalMessage(null);
//         setCurrentApplicationId(null);
//         setOrgApprovalStatus(null);
//         showMessage('Form has been reset.', 'info');
//     };

//     // ========== MAIN RENDER ==========
//     return (
//         <div className="flex h-full min-h-0 bg-[#0b0e16]">
//             {/* Sidebar (unchanged except guard calls) */}
//             <aside className={`h-full shrink-0 rounded-r-2xl border-r border-[#24304d] bg-[linear-gradient(180deg,#101827_0%,#0b111d_100%)] flex flex-col shadow-[18px_0_45px_-35px_rgba(0,0,0,0.95)] transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
//                 <div className={cn('border-b border-[#24304d] px-4 py-4', sidebarCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-4')}>
//                     <div className={cn('flex items-center gap-3', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
//                         <button onClick={() => navigate('/')} className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-85">
//                             <img src="/assets/justlogo.png" alt="ForgeSphere logo" className="h-11 w-auto flex-shrink-0" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo.png'; }} />
//                             {!sidebarCollapsed && <span className="flex min-w-0 flex-col justify-center"><span className="text-[0.65rem] leading-tight text-gray-400">ProbeStack</span><span className="truncate text-xl font-extrabold leading-tight gradient-text font-heading">ForgeSphere</span></span>}
//                         </button>
//                         {!sidebarCollapsed && <button onClick={() => setSidebarCollapsed(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-[#ff8a5c]/35 hover:bg-[#ff5b1f]/10 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>}
//                     </div>
//                     {!sidebarCollapsed && <div><div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff8a5c]">Gateway</div><div className="mt-1 truncate text-sm font-semibold text-white">Control Center</div></div>}
//                     {sidebarCollapsed && <button onClick={() => setSidebarCollapsed(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:border-[#ff8a5c]/35 hover:bg-[#ff5b1f]/10 hover:text-white"><ChevronRight className="h-4 w-4" /></button>}
//                 </div>

//                 <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
//                     <div className="space-y-1">
//                         <div className={sidebarItemClass(selectedMenuItem === 'gateway-onboarding')} onClick={() => checkAccessAndNavigate('gateway-onboarding')}>
//                             <FileText className={sidebarIconClass(selectedMenuItem === 'gateway-onboarding', 'text-[#ff8a5c]')} />
//                             {!sidebarCollapsed && <span>Onboarding</span>}
//                         </div>
//                         <div className={sidebarItemClass(selectedMenuItem === 'gateway-dashboard')} onClick={() => checkAccessAndNavigate('gateway-dashboard')}>
//                             <LayoutDashboard className={sidebarIconClass(selectedMenuItem === 'gateway-dashboard', 'text-sky-400')} />
//                             {!sidebarCollapsed && <span>Dashboard</span>}
//                         </div>
//                     </div>

//                     <div>
//                         <div className={sectionHeaderClass} onClick={() => toggleSection('proxyDev')}>
//                             {sectionsExpanded.proxyDev ? <ChevronDown className="h-4 w-4 text-[#38bdf8]" /> : <ChevronRight className="h-4 w-4 text-[#38bdf8]" />}
//                             {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Proxy Development</span>}
//                         </div>
//                         {sectionsExpanded.proxyDev && (
//                             <div className="space-y-1 mt-1">
//                                 <div className={sidebarItemClass(selectedMenuItem === 'api-proxies')} onClick={() => checkAccessAndNavigate('api-proxies')}>
//                                     <Layout className={sidebarIconClass(selectedMenuItem === 'api-proxies', 'text-sky-400')} />
//                                     {!sidebarCollapsed && <span>Proxy</span>}
//                                 </div>
//                                 <div className={sidebarItemClass(selectedMenuItem === 'shared-flows')} onClick={() => checkAccessAndNavigate('shared-flows')}>
//                                     <Share2 className={sidebarIconClass(selectedMenuItem === 'shared-flows', 'text-emerald-400')} />
//                                     {!sidebarCollapsed && <span>Shared Function</span>}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     <div>
//                         <div className={sectionHeaderClass} onClick={() => toggleSection('distribution')}>
//                             {sectionsExpanded.distribution ? <ChevronDown className="h-4 w-4 text-[#a78bfa]" /> : <ChevronRight className="h-4 w-4 text-[#a78bfa]" />}
//                             {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Distribution</span>}
//                         </div>
//                         {sectionsExpanded.distribution && (
//                             <div className="space-y-1 mt-1">
//                                 <div className={sidebarItemClass(selectedMenuItem === 'api-products')} onClick={() => checkAccessAndNavigate('api-products')}>
//                                     <Package className={sidebarIconClass(selectedMenuItem === 'api-products', 'text-amber-300')} />
//                                     {!sidebarCollapsed && <span>Product</span>}
//                                 </div>
//                                 <div className={sidebarItemClass(selectedMenuItem === 'consumer')} onClick={() => checkAccessAndNavigate('consumer')}>
//                                     <AppWindow className={sidebarIconClass(selectedMenuItem === 'consumer', 'text-rose-400')} />
//                                     {!sidebarCollapsed && <span>Consumer</span>}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     <div>
//                         <div className={sectionHeaderClass} onClick={() => toggleSection('analytics')}>
//                             {sectionsExpanded.analytics ? <ChevronDown className="h-4 w-4 text-[#f472b6]" /> : <ChevronRight className="h-4 w-4 text-[#f472b6]" />}
//                             {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Governance</span>}
//                         </div>
//                         {sectionsExpanded.analytics && (
//                             <div className="space-y-1 mt-1">
//                                 <div className={sidebarItemClass(selectedMenuItem === 'compliance')} onClick={() => checkAccessAndNavigate('compliance')}>
//                                     <Combine className={sidebarIconClass(selectedMenuItem === 'compliance', 'text-red-300')} />
//                                     {!sidebarCollapsed && <span>Compliance</span>}
//                                 </div>
//                                 <div className={sidebarItemClass(selectedMenuItem === 'framework')} onClick={() => checkAccessAndNavigate('framework')}>
//                                     <Frame className={sidebarIconClass(selectedMenuItem === 'framework', 'text-blue-300')} />
//                                     {!sidebarCollapsed && <span>Framework</span>}
//                                 </div>
//                                 <div className={sidebarItemClass(selectedMenuItem === 'automation')} onClick={() => checkAccessAndNavigate('automation')}>
//                                     <CirclePower className={sidebarIconClass(selectedMenuItem === 'automation', 'text-green-300')} />
//                                     {!sidebarCollapsed && <span>Automation</span>}
//                                 </div>
//                                 <div className={sidebarItemClass(selectedMenuItem === 'api-metrics')} onClick={() => checkAccessAndNavigate('api-metrics')}>
//                                     <BarChart3 className={sidebarIconClass(selectedMenuItem === 'api-metrics', 'text-violet-300')} />
//                                     {!sidebarCollapsed && <span>API Metrics</span>}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     <div>
//                         <div className={sectionHeaderClass} onClick={() => toggleSection('management')}>
//                             {sectionsExpanded.management ? <ChevronDown className="h-4 w-4 text-[#f472b6]" /> : <ChevronRight className="h-4 w-4 text-[#f472b6]" />}
//                             {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Management</span>}
//                         </div>
//                         {sectionsExpanded.management && (
//                             <div className="space-y-1 mt-1">
//                                 <div className={sidebarItemClass(selectedMenuItem === 'environments')} onClick={() => checkAccessAndNavigate('environments')}>
//                                     <CpuIcon className={sidebarIconClass(selectedMenuItem === 'environments', 'text-amber-500')} />
//                                     {!sidebarCollapsed && <span>Environments</span>}
//                                 </div>
//                                 {/* <div className={sidebarItemClass(selectedMenuItem === 'gateway-profile')} onClick={() => checkAccessAndNavigate('gateway-profile')}>
//                                     <UserCircle className={sidebarIconClass(selectedMenuItem === 'gateway-profile', 'text-slate-400')} />
//                                     {!sidebarCollapsed && <span>Profile</span>}
//                                 </div> */}
//                             </div>
//                         )}
//                     </div>

//                     <div>
//                         <div className={sectionHeaderClass} onClick={() => toggleSection('deployment')}>
//                             {sectionsExpanded.deployment ? <ChevronDown className="h-4 w-4 text-[#34d399]" /> : <ChevronRight className="h-4 w-4 text-[#34d399]" />}
//                             {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Deployment</span>}
//                         </div>
//                         {sectionsExpanded.deployment && (
//                             <div className="space-y-1 mt-1">
//                                 <div
//                                     className={sidebarItemClass(selectedMenuItem === 'api-deploy')}
//                                     onClick={() => checkAccessAndNavigate('api-deploy')}
//                                 >
//                                     <Rocket className={sidebarIconClass(selectedMenuItem === 'api-deploy', 'text-blue-400')} />
//                                     {!sidebarCollapsed && <span>API Deploy</span>}
//                                 </div>
//                                 <div
//                                     className={sidebarItemClass(selectedMenuItem === 'api-proxy-test')}
//                                     onClick={() => checkAccessAndNavigate('api-proxy-test')}
//                                 >
//                                     <TestTube className={sidebarIconClass(selectedMenuItem === 'api-proxy-test', 'text-emerald-400')} />
//                                     {!sidebarCollapsed && <span>API Test</span>}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     {/* Intelligent Gateway Section */}
//                     {/* Intelligent Gateways Section */}
//                     {/* <div>
//                         <div className={sectionHeaderClass} onClick={() => toggleSection('intelligentGateways')}>
//                             {sectionsExpanded.intelligentGateways ?
//                                 <ChevronDown className="h-4 w-4 text-[#a78bfa]" /> :
//                                 <ChevronRight className="h-4 w-4 text-[#a78bfa]" />
//                             }
//                             {!sidebarCollapsed && <span className="text-xs font-semibold uppercase text-[#5a6a8a]">Intelligent Gateways</span>}
//                         </div>
//                         {sectionsExpanded.intelligentGateways && (
//                             <div className="space-y-1 mt-1">
                                
//                                 <div
//                                     className={sidebarItemClass(selectedMenuItem === 'ai-gateway')}
//                                     onClick={handleAIGatewayClick}
//                                     title={sidebarCollapsed ? "AI Gateway" : ""}
//                                 >
//                                     <Sparkles className={sidebarIconClass(selectedMenuItem === 'ai-gateway', 'text-indigo-400')} />
//                                     {!sidebarCollapsed && <span>AI Gateway</span>}
//                                 </div>
                                
//                                 <div
//                                     className={sidebarItemClass(selectedMenuItem === 'mcp-gateway')}
//                                     onClick={handleMCPGatewayClick}
//                                     title={sidebarCollapsed ? "MCP Gateway" : ""}
//                                 >
//                                     <Network className={sidebarIconClass(selectedMenuItem === 'mcp-gateway', 'text-cyan-400')} />
//                                     {!sidebarCollapsed && <span>MCP Gateway</span>}
//                                 </div>
//                             </div>
//                         )}
//                     </div> */}

//                 </nav>
//             </aside>

//             <div className="min-w-0 flex flex-1 flex-col">
//                 {showHeader && <GatewayHeader />}
//                 <div className="min-h-0 flex-1 overflow-auto">{renderContent()}</div>
//             </div>

//             {showPreviewModal && <PreviewModal />}
//             {showHistoryModal && (
//                 <HistoryModal
//                     open={showHistoryModal}
//                     onClose={() => setShowHistoryModal(false)}
//                     onLoadOrganization={(submissionId) => {
//                         loadSubmission(submissionId);
//                         setCurrentApplicationId(submissionId);
//                         setGatewayOnboardingStep('organization');
//                         setIsCreateNewOnboarding(false);
//                     }}
//                     onLoadBusinessUnit={(bu) => {
//                         loadBusinessUnit(bu);
//                         setOnboardingView('form');
//                         setShowHistoryModal(false);
//                     }}
//                 />
//             )}
//             {showTeamMemberModal && (
//                 <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
//                     <div className="w-full max-w-md rounded-xl border border-dark-700 shadow-2xl bg-[#161b30]">
//                         <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
//                             <h2 className="text-lg font-semibold text-white">Add Team Member</h2>
//                             <button onClick={() => { setShowTeamMemberModal(false); setNewTeamMember({ name: '', email: '' }); }} className="text-gray-400 hover:text-white">✕</button>
//                         </div>
//                         <div className="p-6 space-y-4">
//                             <div className="space-y-1.5"><Label className="text-xs text-gray-300">Full Name *</Label><Input placeholder="e.g., John Doe" value={newTeamMember.name} onChange={e => setNewTeamMember({ ...newTeamMember, name: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                             <div className="space-y-1.5"><Label className="text-xs text-gray-300">Email *</Label><Input type="email" placeholder="john@example.com" value={newTeamMember.email} onChange={e => setNewTeamMember({ ...newTeamMember, email: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                         </div>
//                         <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
//                             <button onClick={() => { setShowTeamMemberModal(false); setNewTeamMember({ name: '', email: '' }); }} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800">Cancel</button>
//                             <button onClick={addTeamMember} className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-white">Add Member</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//             {showConsumerModal && (
//                 <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
//                     <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col bg-[#161b30]">
//                         <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
//                             <h2 className="text-lg font-semibold text-white">{editingConsumerId ? 'Edit Consumer' : 'Add Consumer'}</h2>
//                             <button onClick={() => { setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '', consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: '' }); }} className="text-gray-400 hover:text-white">✕</button>
//                         </div>
//                         <div className="flex-1 overflow-y-auto p-6">
//                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">Consumer Name</Label><Input value={consumerForm.consumerName} onChange={e => setConsumerForm({ ...consumerForm, consumerName: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">POC Name</Label><Input value={consumerForm.consumerPocName} onChange={e => setConsumerForm({ ...consumerForm, consumerPocName: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">POC Email</Label><Input value={consumerForm.consumerPocEmail} onChange={e => setConsumerForm({ ...consumerForm, consumerPocEmail: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={e => setConsumerForm({ ...consumerForm, consumerSmeName: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">SME Email</Label><Input value={consumerForm.consumerSmeEmail} onChange={e => setConsumerForm({ ...consumerForm, consumerSmeEmail: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">Config</Label><Input value={consumerForm.consumerConfig} onChange={e => setConsumerForm({ ...consumerForm, consumerConfig: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">API TPS</Label><Input value={consumerForm.apiTps} onChange={e => setConsumerForm({ ...consumerForm, apiTps: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">Quota</Label><Input value={consumerForm.quota} onChange={e => setConsumerForm({ ...consumerForm, quota: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">Rate Limiting</Label><Input value={consumerForm.rateLimiting} onChange={e => setConsumerForm({ ...consumerForm, rateLimiting: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                                 <div className="space-y-1.5"><Label className="text-xs text-gray-300">API Key Info</Label><Input value={consumerForm.apiKeyInfo} onChange={e => setConsumerForm({ ...consumerForm, apiKeyInfo: e.target.value })} className="bg-dark-900 border-dark-700 text-white" /></div>
//                             </div>
//                         </div>
//                         <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-[#0f172a]/50">
//                             <button onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white">Cancel</button>
//                             <button onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer} disabled={isAddingConsumer} className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-white">
//                                 {editingConsumerId ? 'Update Consumer' : (isAddingConsumer ? 'Saving...' : 'Save Consumer')}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Create Proxy Modal - Optimized */}
//             {/* Create Proxy Modal - Single page */}
//             <Dialog open={createProxyModal.open} onOpenChange={(open) => updateProxyForm({ open })}>
//                 <DialogContent className="max-w-6xl w-[60vw] max-h-[90vh] p-0 flex flex-col bg-[#111520] border border-[#27314e] text-white">
//                     {/* Header */}
//                     <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-[#27314e]">
//                         <DialogHeader>
//                             <DialogTitle className="text-xl font-semibold">Create a proxy</DialogTitle>
//                             <DialogDescription className="text-slate-400">
//                                 Configure your proxy details, deployment environments, and service account.
//                             </DialogDescription>
//                         </DialogHeader>
//                     </div>

//                     {/* Scrollable Content - all fields in one column */}
//                     <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
//                         {/* API Type radio group */}
//                         <div>
//                             <label className="text-sm font-medium text-white">API Type</label>
//                             <div className="flex flex-wrap gap-4 mt-2">
//                                 {['Rest', 'SOAP', 'GraphQL', 'MCP'].map(type => (
//                                     <label key={type} className="flex items-center gap-2">
//                                         <input
//                                             type="radio"
//                                             name="apiType"
//                                             value={type}
//                                             checked={createProxyModal.apiType === type}
//                                             onChange={() => updateProxyForm({ apiType: type })}
//                                             className="accent-[#ff5b1f]"
//                                         />
//                                         <span className="text-white">{type}</span>
//                                     </label>
//                                 ))}
//                             </div>
//                         </div>

//                         {/* Proxy template dropdown */}
//                         <div>
//                             <label className="text-xs font-semibold text-slate-400">Proxy Template</label>
//                             <select
//                                 value={createProxyModal.template}
//                                 onChange={(e) => {
//                                     const newTemplate = e.target.value;
//                                     updateProxyForm({
//                                         template: newTemplate,
//                                         openApiSpecFile: null,
//                                         specParsed: false,
//                                         specError: null,
//                                         name: '',
//                                         basePath: '/',
//                                         description: '',
//                                         targetUrl: '',
//                                     });
//                                 }}
//                                 className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                             >
//                                 <option value="reverse">Reverse Proxy (Most common)</option>
//                                 <option value="no-target">No Target</option>
//                                 <option value="upload">Upload Proxy Bundle</option>
//                                 <option value="reverse-openapi">Reverse Proxy using OpenAPI Spec</option>
//                                 <option value="no-target-openapi">No Target using OpenAPI Spec</option>
//                             </select>
//                             <p className="mt-1 text-xs text-slate-500">Changing the proxy template will update and reset the form below</p>
//                         </div>

//                         {/* OpenAPI Spec Upload (for reverse-openapi or no-target-openapi) */}
//                         {(createProxyModal.template === 'reverse-openapi' || createProxyModal.template === 'no-target-openapi') && (
//                             <div className="border border-dashed border-[#2a3550] rounded-lg p-4 bg-[#0f1117]/50">
//                                 {!createProxyModal.specParsed ? (
//                                     <>
//                                         <label className="block text-sm font-medium text-white mb-2">
//                                             Upload OpenAPI Specification (JSON/YAML)
//                                         </label>
//                                         <input
//                                             type="file"
//                                             accept=".json,.yaml,.yml"
//                                             onChange={(e) => {
//                                                 if (e.target.files[0]) handleOpenApiUpload(e.target.files[0]);
//                                             }}
//                                             className="w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff6b36]"
//                                         />
//                                         {createProxyModal.specError && (
//                                             <p className="mt-2 text-xs text-red-400">{createProxyModal.specError}</p>
//                                         )}
//                                         <p className="mt-2 text-xs text-slate-500">
//                                             The spec will be used to pre‑fill proxy name, base path, description, and target URL.
//                                         </p>
//                                     </>
//                                 ) : (
//                                     <div className="flex items-center justify-between">
//                                         <div className="flex items-center gap-2">
//                                             <CheckCircle className="h-5 w-5 text-emerald-400" />
//                                             <span className="text-sm text-white">Spec loaded – fields pre‑filled below</span>
//                                         </div>
//                                         <button
//                                             type="button"
//                                             onClick={() => {
//                                                 updateProxyForm({
//                                                     specParsed: false,
//                                                     openApiSpecFile: null,
//                                                     name: '',
//                                                     basePath: '/',
//                                                     description: '',
//                                                     targetUrl: '',
//                                                 });
//                                             }}
//                                             className="text-xs text-[#ff8a5c] hover:underline"
//                                         >
//                                             Change File
//                                         </button>
//                                     </div>
//                                 )}
//                             </div>
//                         )}

//                         {/* Proxy details fields – shown always except when OpenAPI template is waiting for spec */}
//                         {(
//                             createProxyModal.template !== 'reverse-openapi' &&
//                             createProxyModal.template !== 'no-target-openapi'
//                         ) || createProxyModal.specParsed ? (
//                             <div className="space-y-3">
//                                 {/* Proxy name */}
//                                 <div>
//                                     <label className="text-sm font-medium text-white">Proxy Name</label>
//                                     <input
//                                         type="text"
//                                         placeholder="e.g., my-api-proxy"
//                                         value={createProxyModal.name}
//                                         onChange={(e) => updateProxyForm({ name: e.target.value })}
//                                         className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                     />
//                                     <p className="mt-1 text-xs text-slate-500">Alphanumeric, dash (-) or underscore (_)</p>
//                                 </div>

//                                 {/* Base path and description (not for 'upload' template) */}
//                                 {createProxyModal.template !== 'upload' && (
//                                     <>
//                                         <div>
//                                             <label className="text-sm font-medium text-white">Base Path</label>
//                                             <input
//                                                 type="text"
//                                                 value={createProxyModal.basePath}
//                                                 onChange={(e) => updateProxyForm({ basePath: e.target.value })}
//                                                 className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                             />
//                                             <p className="mt-1 text-xs text-slate-500">
//                                                 This proxy will handle requests on hostname{createProxyModal.basePath}. <a href="#" className="text-[#4f8ef7]">Learn more</a>
//                                             </p>
//                                         </div>
//                                         <div>
//                                             <label className="text-sm font-medium text-white">Description (Optional)</label>
//                                             <input
//                                                 type="text"
//                                                 value={createProxyModal.description}
//                                                 onChange={(e) => updateProxyForm({ description: e.target.value })}
//                                                 className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                             />
//                                         </div>
//                                     </>
//                                 )}

//                                 {/* Target URL – only for reverse and reverse-openapi */}
//                                 {(createProxyModal.template === 'reverse' || createProxyModal.template === 'reverse-openapi') && (
//                                     <div>
//                                         <label className="text-sm font-medium text-white">Target (Existing API)</label>
//                                         <input
//                                             type="url"
//                                             placeholder="https://api.example.com"
//                                             value={createProxyModal.targetUrl}
//                                             onChange={(e) => updateProxyForm({ targetUrl: e.target.value })}
//                                             className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                         />
//                                         <p className="mt-1 text-xs text-slate-500">The URL of the backend service that this proxy invokes</p>
//                                     </div>
//                                 )}

//                                 {/* ZIP archive upload for 'upload' template */}
//                                 {createProxyModal.template === 'upload' && (
//                                     <div>
//                                         <label className="text-sm font-medium text-white">Zip Archive</label>
//                                         <input
//                                             type="file"
//                                             accept=".zip"
//                                             onChange={(e) => updateProxyForm({ zipFile: e.target.files[0] })}
//                                             className="mt-1 w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff6b36]"
//                                         />
//                                         <p className="mt-1 text-xs text-slate-500">You can export proxies by selecting a proxy in the developers tab</p>
//                                     </div>
//                                 )}
//                             </div>
//                         ) : null}

//                         {/* Deployment Environments */}
//                         <div>
//                             <label className="text-sm font-medium text-white">Deployment Environments (Optional)</label>
//                             <div className="mt-2 flex flex-wrap gap-3">
//                                 {loadingCreateEnvs ? (
//                                     <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
//                                 ) : availableCreateEnvs.length === 0 ? (
//                                     <span className="text-xs text-slate-500">No environments available</span>
//                                 ) : (
//                                     availableCreateEnvs.map(env => (
//                                         <label key={env} className="flex items-center gap-2">
//                                             <input
//                                                 type="checkbox"
//                                                 checked={createProxyModal.deploymentEnvs.includes(env)}
//                                                 onChange={(e) => {
//                                                     const newEnvs = e.target.checked
//                                                         ? [...createProxyModal.deploymentEnvs, env]
//                                                         : createProxyModal.deploymentEnvs.filter(e => e !== env);
//                                                     updateProxyForm({ deploymentEnvs: newEnvs });
//                                                 }}
//                                                 className="rounded border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
//                                             />
//                                             <span className="text-white">{env}</span>
//                                         </label>
//                                     ))
//                                 )}
//                             </div>
//                         </div>

//                         {/* Service Account */}
//                         {/* <div>
//                             <label className="text-sm font-medium text-white">Service Account</label>
//                             <input
//                                 type="text"
//                                 placeholder="e.g., my-service-account@project.iam.gserviceaccount.com"
//                                 value={createProxyModal.serviceAccount}
//                                 onChange={(e) => updateProxyForm({ serviceAccount: e.target.value })}
//                                 className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                             />
//                         </div> */}
//                     </div>

//                     {/* Fixed Footer - only Cancel and Create */}
//                     <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
//                         <Button variant="outline" onClick={resetProxyForm}>Cancel</Button>
//                         <Button
//                             onClick={async () => {
//                                 // Validate all fields
//                                 let valid = true;
//                                 if (!createProxyModal.name.trim()) {
//                                     showMessage('Proxy name is required.', 'error');
//                                     valid = false;
//                                 }
//                                 if (createProxyModal.template === 'reverse' && !createProxyModal.targetUrl.trim()) {
//                                     showMessage('Target URL is required for Reverse proxy.', 'error');
//                                     valid = false;
//                                 }
//                                 if (createProxyModal.template === 'upload' && !createProxyModal.zipFile) {
//                                     showMessage('Please select a ZIP archive for Upload proxy bundle.', 'error');
//                                     valid = false;
//                                 }
//                                 if ((createProxyModal.template === 'reverse-openapi' || createProxyModal.template === 'no-target-openapi') && !createProxyModal.specParsed) {
//                                     showMessage('Please upload a valid OpenAPI specification file first.', 'error');
//                                     valid = false;
//                                 }
//                                 if (!valid) return;
//                                 // --- Handle Reverse and No Target by generating ZIP dynamically ---
//                                 if (createProxyModal.template === 'reverse' || createProxyModal.template === 'no-target') {
//                                     const token = await fetchToken();
//                                     if (!token) {
//                                         showMessage('Failed to obtain authentication token.', 'error');
//                                         return;
//                                     }

//                                     try {
//                                         const zipFile = await generateProxyZip(
//                                             createProxyModal.template,
//                                             {
//                                                 name: createProxyModal.name,
//                                                 basePath: createProxyModal.basePath,
//                                                 targetUrl: createProxyModal.template === 'reverse' ? createProxyModal.targetUrl : ''
//                                             }
//                                         );

//                                         const formData = new FormData();
//                                         formData.append('file', zipFile);

//                                         const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/apis?action=import&name=${encodeURIComponent(createProxyModal.name)}`;
//                                         const response = await fetch(uploadUrl, {
//                                             method: 'POST',
//                                             headers: { 'Authorization': `Bearer ${token}` },
//                                             body: formData,
//                                         });

//                                         if (!response.ok) {
//                                             const errorText = await response.text();
//                                             throw new Error(errorText || `Upload failed with status ${response.status}`);
//                                         }

//                                         const result = await response.json();
//                                         console.log('Proxy imported:', result);
//                                         showMessage(`Proxy "${createProxyModal.name}" created successfully!`, 'success');

//                                         // Optionally deploy to selected environments after creation
//                                         if (createProxyModal.deploymentEnvs.length > 0) {
//                                             // You can implement deployment logic here (similar to deploy API call)
//                                             showMessage(`Proxy created. You can deploy it from the proxy details page.`, 'info');
//                                         }

//                                         resetProxyForm();
//                                         // Refresh proxy list (if fetchProxies is defined)
//                                         await refreshProxies();
//                                     } catch (err) {
//                                         console.error(err);
//                                         showMessage(`Creation failed: ${err.message}`, 'error');
//                                     }
//                                 }

//                                 // --- Upload bundle handling ---
//                                 if (createProxyModal.template === 'upload') {
//                                     const token = await fetchToken();
//                                     if (!token) {
//                                         showMessage('Failed to obtain authentication token.', 'error');
//                                         return;
//                                     }

//                                     const formData = new FormData();
//                                     formData.append('file', createProxyModal.zipFile);

//                                     try {
//                                         const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/apis?action=import&name=${encodeURIComponent(createProxyModal.name)}`;
//                                         const response = await fetch(uploadUrl, {
//                                             method: 'POST',
//                                             headers: { 'Authorization': `Bearer ${token}` },
//                                             body: formData, // browser will set Content-Type: multipart/form-data automatically
//                                         });

//                                         if (!response.ok) {
//                                             const errorText = await response.text();
//                                             throw new Error(errorText || `Upload failed with status ${response.status}`);
//                                         }

//                                         const result = await response.json();
//                                         console.log('Proxy imported:', result);
//                                         showMessage(`Proxy "${createProxyModal.name}" created successfully!`, 'success');
//                                         resetProxyForm();
//                                         // Optionally refresh the proxy list
//                                         await refreshProxies();
//                                     } catch (err) {
//                                         console.error(err);
//                                         showMessage(`Creation failed: ${err.message}`, 'error');
//                                     }
//                                 } else {
//                                     // Handle other templates (reverse, no-target, OpenAPI) – currently mock
//                                     console.log('Creating proxy:', {
//                                         template: createProxyModal.template,
//                                         name: createProxyModal.name,
//                                         basePath: createProxyModal.basePath,
//                                         description: createProxyModal.description,
//                                         targetUrl: createProxyModal.template === 'reverse' ? createProxyModal.targetUrl : undefined,
//                                         deploymentEnvs: createProxyModal.deploymentEnvs,
//                                         apiType: createProxyModal.apiType,
//                                     });
//                                     resetProxyForm();
//                                     showMessage('Proxy created successfully!', 'success');
//                                 }
//                             }}
//                             className="bg-[#ff5b1f] hover:bg-[#ff6b36]"
//                         >
//                             Create
//                         </Button>
//                     </div>
//                 </DialogContent>
//             </Dialog>

//             {/* Create Shared Flow Modal */}
//             <Dialog open={createSharedFlowModal.open} onOpenChange={(open) => setCreateSharedFlowModal(prev => ({ ...prev, open }))}>
//                 <DialogContent className="max-w-2xl w-[50vw] max-h-[80vh] p-0 flex flex-col bg-[#111520] border border-[#27314e] text-white">
//                     {/* Fixed Header */}
//                     <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-[#27314e]">
//                         <DialogHeader>
//                             <DialogTitle className="text-xl font-semibold">Create Shared Function</DialogTitle>
//                             <DialogDescription className="text-slate-400">
//                                 Create a reusable shared function that can be used across multiple proxies.
//                             </DialogDescription>
//                         </DialogHeader>
//                     </div>

//                     {/* Scrollable Content */}
//                     <div className="flex-1 overflow-y-auto px-6 py-4">
//                         <div className="space-y-4">
//                             <div>
//                                 <label className="text-sm font-medium text-white">Name <span className="text-red-400">*</span></label>
//                                 <input
//                                     type="text"
//                                     placeholder="e.g., auth-shared-function"
//                                     value={createSharedFlowModal.name}
//                                     onChange={(e) => setCreateSharedFlowModal(prev => ({ ...prev, name: e.target.value }))}
//                                     className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                 />
//                                 <p className="mt-1 text-xs text-slate-500">Alphanumeric, dash (-) or underscore (_)</p>
//                             </div>
//                             <div>
//                                 <label className="text-sm font-medium text-white">Description (Optional)</label>
//                                 <textarea
//                                     rows={3}
//                                     placeholder="Describe the purpose of this shared function"
//                                     value={createSharedFlowModal.description}
//                                     onChange={(e) => setCreateSharedFlowModal(prev => ({ ...prev, description: e.target.value }))}
//                                     className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f] resize-none"
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Fixed Footer */}
//                     <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
//                         <Button variant="outline" onClick={() => setCreateSharedFlowModal({ open: false, name: '', description: '' })}>Cancel</Button>
//                         <Button
//                             onClick={() => {
//                                 if (!createSharedFlowModal.name.trim()) {
//                                     showMessage('Shared Function name is required.', 'error');
//                                     return;
//                                 }
//                                 // Here you would call your API to create the shared function
//                                 console.log('Creating Shared Function:', {
//                                     name: createSharedFlowModal.name,
//                                     description: createSharedFlowModal.description
//                                 });
//                                 showMessage(`Shared Function "${createSharedFlowModal.name}" created successfully!`, 'success');
//                                 setCreateSharedFlowModal({ open: false, name: '', description: '' });
//                                 // Optionally refresh the shared functions list
//                             }}
//                             className="bg-[#ff5b1f] hover:bg-[#ff6b36]"
//                         >
//                             Create
//                         </Button>
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// };
// const ProxyDetailTabs = ({ proxy, onBack }) => {
//     const [activeTab, setActiveTab] = useState('overview');

//     return (
//         <div className="p-6">
//             <div className="flex items-center gap-3 mb-4">
//                 <button onClick={onBack} className="text-[#4f8ef7] hover:underline">← Back</button>
//                 <h2 className="text-xl font-semibold">{proxy.name}</h2>
//             </div>
//             <div className="border-b border-[#1f2840] mb-4">
//                 <div className="flex gap-4">
//                     {['Overview', 'Deployments', 'Revisions', 'Endpoint Summary'].map(tab => (
//                         <button
//                             key={tab}
//                             onClick={() => setActiveTab(tab.toLowerCase())}
//                             className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase() ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'
//                                 }`}
//                         >
//                             {tab}
//                         </button>
//                     ))}
//                 </div>
//             </div>
//             <div className="bg-[#111520] rounded-xl p-4">
//                 {activeTab === 'overview' && (
//                     <div>
//                         <div className="grid grid-cols-2 gap-4 mb-4">
//                             <div><div className="text-xs text-[#5a6a8a]">Proxy Summary</div><div className="text-white">Space: N/A</div></div>
//                             <div><div className="text-xs text-[#5a6a8a]">Proxy Details</div><div className="text-white">Base Path: /v1</div></div>
//                         </div>
//                         <div className="mt-4">
//                             <div className="text-sm font-semibold mb-2">Deployments</div>
//                             <table className="w-full text-sm">
//                                 <thead className="text-left text-[#5a6a8a]"><tr><th>Status</th><th>Revision</th><th>Deployment type</th><th>Environment</th></tr></thead>
//                                 <tbody><tr><td className="text-green-400">✅</td><td>17</td><td>Extensible</td><td>dev (Intermediate)</td></tr></tbody>
//                             </table>
//                         </div>
//                     </div>
//                 )}
//                 {activeTab === 'deployments' && <div>Deployment history table</div>}
//                 {activeTab === 'revisions' && <div>Revisions list with dates</div>}
//                 {activeTab === 'endpoint summary' && <div>Endpoint details</div>}
//             </div>
//         </div>
//     );
// };

// const SharedFlowDetailView = ({ sharedFlow, onBack, onDeploy, onDuplicate, onDelete, onDevelop, showMessage }) => {
//     const [activeTab, setActiveTab] = useState('overview');
//     const [revisionFilter, setRevisionFilter] = useState('');
//     const [sharedFlowDetails, setSharedFlowDetails] = useState(null);
//     const [loadingDetails, setLoadingDetails] = useState(false);
//     const [detailsError, setDetailsError] = useState(null);
//     const [availableEnvironments, setAvailableEnvironments] = useState([]);
//     const [deployModalOpen, setDeployModalOpen] = useState(false);
//     const [deployRevision, setDeployRevision] = useState('');
//     const [deployEnv, setDeployEnv] = useState('');
//     const [deploying, setDeploying] = useState(false);

//     const fetchToken = async () => {
//         const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
//         if (!res.ok) throw new Error('Token service error');
//         const data = await res.json();
//         return data.access_token;
//     };

//     useEffect(() => {
//         const fetchSharedFlowDetails = async () => {
//             if (!sharedFlow?.name) return;
//             setLoadingDetails(true);
//             setDetailsError(null);
//             try {
//                 const token = await fetchToken();
//                 const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/sharedflows/${sharedFlow.name}/details`;
//                 const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//                 if (!response.ok) throw new Error(`HTTP ${response.status}`);
//                 const data = await response.json();
//                 setSharedFlowDetails(data);
//             } catch (err) {
//                 setDetailsError(err.message);
//                 showMessage(`Could not load shared flow details: ${err.message}`, 'error');
//             } finally {
//                 setLoadingDetails(false);
//             }
//         };
//         fetchSharedFlowDetails();
//     }, [sharedFlow?.name]);

//     const fetchEnvironments = async () => {
//         try {
//             const token = await fetchToken();
//             const url = 'https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/environments';
//             const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//             if (response.ok) {
//                 const data = await response.json();
//                 setAvailableEnvironments(data);
//             }
//         } catch (err) {
//             console.error(err);
//         }
//     };

//     const handleDeploy = async () => {
//         if (!deployRevision || !deployEnv) {
//             showMessage('Please select revision and environment', 'error');
//             return;
//         }
//         setDeploying(true);
//         try {
//             const token = await fetchToken();
//             const url = `https://apigee.googleapis.com/v1/organizations/gen-ai-poc-onboarding/environments/${deployEnv}/sharedflows/${sharedFlow.name}/revisions/${deployRevision}/deployments`;
//             const response = await fetch(url, {
//                 method: 'POST',
//                 headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ override: true }),
//             });
//             if (response.ok) {
//                 showMessage(`Revision ${deployRevision} deployed to ${deployEnv}`, 'success');
//                 setDeployModalOpen(false);
//                 // Refresh details to show new deployment
//                 window.location.reload();
//             } else {
//                 const err = await response.text();
//                 throw new Error(err);
//             }
//         } catch (err) {
//             showMessage(`Deployment failed: ${err.message}`, 'error');
//         } finally {
//             setDeploying(false);
//         }
//     };

//     // Helper: extract nested data safely
//     const getMeta = () => sharedFlowDetails?.sharedFlowDetails?.metaData || {};
//     const getLatestRevision = () => sharedFlowDetails?.sharedFlowDetails?.latestRevisionId;
//     const getRevisionsList = () => sharedFlowDetails?.revisions || [];
//     const getRevisionDetails = () => sharedFlowDetails?.revisionDetails || [];
//     const getDeployments = () => sharedFlowDetails?.deployments?.deployments || [];

//     const formatDate = (ts) => ts ? new Date(parseInt(ts)).toLocaleDateString() : '—';

//     if (activeTab !== 'overview') {
//         // Develop tab – placeholder (can integrate shared flow editor later)
//         return (
//             <div className="p-6">
//                 <div className="flex items-center gap-3 mb-4">
//                     <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium"><ArrowLeft /></button>
//                     <h2 className="text-xl font-semibold">{sharedFlow.name}</h2>
//                 </div>
//                 <div className="border-b border-[#1f2840] mb-4">
//                     <div className="flex gap-4">
//                         {['Overview', 'Develop'].map(tab => (
//                             <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
//                                 className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase() ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}>
//                                 {tab}
//                             </button>
//                         ))}
//                     </div>
//                 </div>
//                 <div className="text-center py-12 text-[#7f8fa8]">Shared Flow editor coming soon.</div>
//             </div>
//         );
//     }

//     return (
//         <div className="p-6">
//             {/* Header */}
//             <div className="flex items-center justify-between mb-4">
//                 <div className="flex items-center gap-3">
//                     <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium"><ArrowLeft /></button>
//                     <h2 className="text-xl font-semibold">{sharedFlow.name}</h2>
//                 </div>
//                 <div className="flex gap-2">
//                     <button onClick={() => { fetchEnvironments(); setDeployModalOpen(true); }} className="px-4 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm">Deploy</button>
//                     <button onClick={onDuplicate} className="px-4 py-1.5 bg-[#1a1f2e] border border-[#2a3550] text-white rounded-md text-sm">Duplicate</button>
//                     <button onClick={onDelete} className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-sm">Delete</button>
//                 </div>
//             </div>

//             {/* Tabs */}
//             <div className="border-b border-[#1f2840] mb-4">
//                 <div className="flex gap-4">
//                     {['Overview', 'Develop'].map(tab => (
//                         <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
//                             className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase() ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}>
//                             {tab}
//                         </button>
//                     ))}
//                 </div>
//             </div>

//             {loadingDetails ? (
//                 <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#ff5b1f] h-8 w-8" /></div>
//             ) : detailsError ? (
//                 <div className="text-center text-red-400">Error: {detailsError}</div>
//             ) : sharedFlowDetails ? (
//                 <div className="space-y-6">
//                     {/* Two cards: Summary & Deployments */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                         {/* Shared Flow Summary Card */}
//                         <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] p-5">
//                             <div className="flex items-center gap-2 mb-3">
//                                 <Share2 className="h-4 w-4 text-[#ff8a5c]" />
//                                 <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Shared Function Summary</h3>
//                             </div>
//                             <div className="space-y-2 text-sm">
//                                 <div className="flex justify-between items-center">
//                                     <span className="text-slate-400">Latest Revision</span>
//                                     <span className="text-white font-mono">{getLatestRevision() || '—'}</span>
//                                 </div>
//                                 <div className="flex justify-between items-center">
//                                     <span className="text-slate-400">Total Revisions</span>
//                                     <span className="text-white font-mono">{getRevisionsList().length}</span>
//                                 </div>
//                                 <div className="flex justify-between items-center">
//                                     <span className="text-slate-400">Created</span>
//                                     <span className="text-slate-300">{formatDate(getMeta().createdAt)}</span>
//                                 </div>
//                                 <div className="flex justify-between items-center">
//                                     <span className="text-slate-400">Last Modified</span>
//                                     <span className="text-slate-300">{formatDate(getMeta().lastModifiedAt)}</span>
//                                 </div>
//                                 <div className="flex justify-between items-center">
//                                     <span className="text-slate-400">Source</span>
//                                     <span className="text-slate-300">{sharedFlowDetails.source || sharedFlowDetails.lifecycle?.source || '—'}</span>
//                                 </div>
//                                 {sharedFlowDetails.description && (
//                                     <div className="pt-2 border-t border-[#1f2840] mt-2">
//                                         <span className="text-slate-400 block text-xs">Description</span>
//                                         <p className="text-white text-sm mt-1">{sharedFlowDetails.description}</p>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                         {/* Deployments Card */}
//                         <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] p-5">
//                             <div className="flex items-center gap-2 mb-3">
//                                 <Rocket className="h-4 w-4 text-[#ff8a5c]" />
//                                 <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Deployments</h3>
//                                 <Badge variant="outline" className="ml-auto text-xs border-[#2a3550] text-slate-400">
//                                     {getDeployments().length} active
//                                 </Badge>
//                             </div>
//                             {getDeployments().length === 0 ? (
//                                 <div className="text-center py-6 text-slate-400">
//                                     <Archive className="h-8 w-8 mx-auto mb-2 text-slate-600" />
//                                     <p className="text-sm">No deployments found</p>
//                                     <p className="text-xs mt-1">Deploy a revision to see it here</p>
//                                 </div>
//                             ) : (
//                                 <div className="space-y-2">
//                                     {getDeployments().map((dep, idx) => (
//                                         <div key={idx} className="flex justify-between items-center border-b border-[#1f2840] pb-2 last:border-0">
//                                             <div>
//                                                 <div className="text-white font-mono text-sm">{dep.environment}</div>
//                                                 <div className="text-xs text-slate-400">Revision {dep.revision}</div>
//                                             </div>
//                                             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-300">
//                                                 <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
//                                                 Active
//                                             </span>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Revisions Table */}
//                     <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] overflow-hidden">
//                         <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] flex justify-between items-center flex-wrap gap-3">
//                             <div className="flex items-center gap-2">
//                                 <History className="h-4 w-4 text-[#ff8a5c]" />
//                                 <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Revisions</h3>
//                             </div>
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
//                                 <input
//                                     type="text"
//                                     placeholder="Filter revisions or policies..."
//                                     value={revisionFilter}
//                                     onChange={e => setRevisionFilter(e.target.value)}
//                                     className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-8 pr-3 py-1.5 text-sm w-56 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                 />
//                             </div>
//                         </div>
//                         <div className="overflow-x-auto">
//                             <table className="w-full text-sm">
//                                 <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
//                                     <tr>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Extensible</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Policies</th>
//                                         <th className="text-left p-3 text-[#5a6a8a] font-medium">Last Modified</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {getRevisionDetails()
//                                         .filter(revDetail => {
//                                             const rev = revDetail.revision;
//                                             const policies = revDetail.data?.policies?.join(', ') || '';
//                                             return rev.toString().includes(revisionFilter) ||
//                                                 policies.toLowerCase().includes(revisionFilter.toLowerCase());
//                                         })
//                                         .map((revDetail, idx) => {
//                                             const rev = revDetail.revision;
//                                             const data = revDetail.data;
//                                             const isLatest = rev === getLatestRevision();
//                                             return (
//                                                 <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
//                                                     <td className="p-3">
//                                                         <div className="flex items-center gap-2">
//                                                             <span className="font-mono text-white font-medium">{rev}</span>
//                                                             {isLatest && (
//                                                                 <span className="text-[10px] bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full font-medium">
//                                                                     Latest
//                                                                 </span>
//                                                             )}
//                                                         </div>
//                                                     </td>
//                                                     <td className="p-3">
//                                                         {data?.hasExtensiblePolicy ? (
//                                                             <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
//                                                                 <Check className="h-3 w-3" /> Yes
//                                                             </span>
//                                                         ) : (
//                                                             <span className="text-slate-500 text-xs">No</span>
//                                                         )}
//                                                     </td>
//                                                     <td className="p-3">
//                                                         <div className="flex flex-wrap gap-1 max-w-xs">
//                                                             {data?.policies?.length > 0 ? (
//                                                                 data.policies.slice(0, 3).map((p, i) => (
//                                                                     <span key={i} className="text-xs bg-[#2a3550] text-slate-300 px-1.5 py-0.5 rounded-full">
//                                                                         {p}
//                                                                     </span>
//                                                                 ))
//                                                             ) : (
//                                                                 <span className="text-slate-500 text-xs">—</span>
//                                                             )}
//                                                             {data?.policies?.length > 3 && (
//                                                                 <span className="text-xs text-slate-400">+{data.policies.length - 3}</span>
//                                                             )}
//                                                         </div>
//                                                     </td>
//                                                     <td className="p-3 text-slate-400 text-xs">{formatDate(data?.lastModifiedAt)}</td>
//                                                 </tr>
//                                             );
//                                         })}
//                                     {getRevisionDetails().length === 0 && (
//                                         <tr>
//                                             <td colSpan="4" className="p-8 text-center text-slate-400">
//                                                 <Layers className="h-8 w-8 mx-auto mb-2 text-slate-600" />
//                                                 <p>No revisions available</p>
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>
//                 </div>
//             ) : null}

//             {/* Deployment Modal */}
//             {deployModalOpen && (
//                 <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
//                     <div className="w-full max-w-md bg-[#111520] border border-[#27314e] rounded-xl p-6">
//                         <h3 className="text-lg font-semibold mb-4">Deploy Shared Flow</h3>
//                         <div className="mb-3">
//                             <label className="block text-xs font-medium text-slate-400 mb-1">Revision *</label>
//                             <select
//                                 value={deployRevision}
//                                 onChange={e => setDeployRevision(e.target.value)}
//                                 className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md p-2 text-white"
//                             >
//                                 <option value="">Select Revision</option>
//                                 {getRevisionsList().map(rev => (
//                                     <option key={rev} value={rev}>Revision {rev}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div className="mb-4">
//                             <label className="block text-xs font-medium text-slate-400 mb-1">Environment *</label>
//                             <select
//                                 value={deployEnv}
//                                 onChange={e => setDeployEnv(e.target.value)}
//                                 className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md p-2 text-white"
//                             >
//                                 <option value="">Select Environment</option>
//                                 {availableEnvironments.map(env => (
//                                     <option key={env} value={env}>{env}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div className="flex justify-end gap-3">
//                             <button onClick={() => setDeployModalOpen(false)} className="px-4 py-2 border border-[#2a3550] rounded-md text-sm">Cancel</button>
//                             <button onClick={handleDeploy} disabled={deploying} className="px-4 py-2 bg-[#ff5b1f] rounded-md text-sm disabled:opacity-50">
//                                 {deploying ? 'Deploying...' : 'Deploy'}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// // ====================== Placeholder Components for other views ======================
// // These would contain the existing editor, debug, trace, deploy logic (condensed for brevity)
// const DevelopView = ({ selectedProxy }) => {
//     // Move all the existing develop page JSX & logic here (editor, sidebar with policies, etc.)
//     // For brevity, we show a placeholder.
//     return <div className="p-6">Develop View - Editor goes here (same as before)</div>;
// };
// const DebugView = () => <div className="p-6">Debug View - Request/Response builder</div>;
// const TraceView = () => <div className="p-6">Trace View - Live tracing table</div>;
// const DeployView = () => <div className="p-6">Deploy View - Environment selector</div>;
