// src/components/Gateway/ProxyDetailView.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    ArrowLeft,
    AlertCircle,
    Archive,
    Check,
    CheckCircle,
    ChevronDown, ChevronUp,
    Copy,
    Eye,
    FileText,
    GitBranch,
    History,
    Layers,
    Loader2,
    Network,
    Plus,
    Rocket,
    Search,
    Server,
    Trash2,
    X, Users,
    Info,
    Database, Download,
    CheckCircle2,
    Clock,
    User,
    Mail,
    Globe,
    Shield,
    Code2,
    FileJson,
    Server as ServerIcon,
    BarChart3,
    Target, Sparkles, Activity, Zap, Key, Package
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { useNavigate } from "react-router-dom";
import ViewSpecModal from "../../components/ViewSpecModal";
import API_BASE_URL from "../../config/apiConfig";

export const ProxyDetailView = ({ proxy, onBack, onDeploy, onDuplicate, onDelete, onDevelop, onDebug, showMessage }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [revisionFilter, setRevisionFilter] = useState('');
    const [proxyDetails, setProxyDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState(null);
    // New state for real debug sessions
    const [debugSessions, setDebugSessions] = useState([]);
    const [loadingDebugSessions, setLoadingDebugSessions] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [availableEnvironments, setAvailableEnvironments] = useState([]);
    const [loadingEnvironments, setLoadingEnvironments] = useState(false);
    const [startingDebugSession, setStartingDebugSession] = useState(false);
    const [availableRevisions, setAvailableRevisions] = useState([]);
    const [selectedRevision, setSelectedRevision] = useState('');
    const [loadingRevisions, setLoadingRevisions] = useState(false);
    // Debug session detail view states
    const [selectedDebugSession, setSelectedDebugSession] = useState(null);
    const [debugTransactions, setDebugTransactions] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    // Deployment modal state
    const [deployModalOpen, setDeployModalOpen] = useState(false);
    const [deployMode, setDeployMode] = useState('ci-cd'); // 'ci-cd' or 'direct'
    const [deployRevision, setDeployRevision] = useState('');
    const [deployEnv, setDeployEnv] = useState('');
    const [deploySource, setDeploySource] = useState('github'); // 'github', 'artifactory'
    const [deploying, setDeploying] = useState(false);
    // Debug states
    const [showDebugForm, setShowDebugForm] = useState(false);
    const [debugEnv, setDebugEnv] = useState('');
    const [debugFilter, setDebugFilter] = useState('');
    const [recentSessions, setRecentSessions] = useState([
        { id: 1, name: 'Session 1', timestamp: '2025-05-10 14:32', status: 'completed' },
        { id: 2, name: 'Session 2', timestamp: '2025-05-09 09:15', status: 'completed' },
    ]);
    const [expandedPoliciesRev, setExpandedPoliciesRev] = useState(null);
    const [policySearch, setPolicySearch] = useState('');
    const [forgesphereInfo, setForgesfereInfo] = useState(null);
    const [loadingForgesfere, setLoadingForgesfere] = useState(false);
    const [forgesphereError, setForgesfereError] = useState(null);
    const fetchToken = async () => {
        try {
            const res = await fetch('https://forgesphere.probestack.io/apigee-wrapper/auth/apigee/token');
            if (!res.ok) throw new Error(`Token service error: ${res.status}`);
            const data = await res.json();
            return data.access_token;
        } catch (err) {
            console.error('Token fetch error:', err);
            showMessage('Failed to obtain access token', 'error');
            return null;
        }
    };
    const navigate = useNavigate();
    const hasNavigated = useRef(false);
    const [bundleLoading, setBundleLoading] = useState(false);

    const fetchForgesfereInfo = async (resourceId) => {
        setLoadingForgesfere(true);
        try {
            const token = await fetchToken();
            if (!token) throw new Error('Failed to get token');
            const url = `https://forgesphere.probestack.io/onboarding/v1/api/onboarding/resources/${resourceId}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            // const data = {
            //     "success": true,
            //     "message": "Success",
            //     "data": {
            //         "onboarding": {
            //             "id": "6a0c66f43e843c04624ee8f9",
            //             "organizationId": "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
            //             "businessUnit": "corporate",
            //             "teamName": "Forgesphere",
            //             "applicationName": "Forgesphere",
            //             "applicationId": "",
            //             "projectOwner": "Jagruti",
            //             "ownerEmail": "jagruti.d@gmail.com",
            //             "projectSME": "",
            //             "projectSMEEmail": "jagruti.d@gmail.com",
            //             "projectDLEmail": "",
            //             "expectedGoLiveDate": "",
            //             "testerName": "",
            //             "testerEmail": "",
            //             "serviceNowGroupName": "",
            //             "serviceNowEmail": "",
            //             "consumerIds": [],
            //             "createdBy": null,
            //             "createdAt": "2026-05-19T13:34:44.767498292Z",
            //             "updatedBy": null,
            //             "updatedAt": "2026-05-19T13:34:44.767498292Z"
            //         },
            //         "resource": {
            //             "microservice": {
            //                 "id": "6a0c67643e843c04624ee8fa",
            //                 "organizationId": "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
            //                 "businessUnit": "corporate",
            //                 "teamName": "Forgesphere",
            //                 "applicationName": "User Management API",
            //                 "applicationId": "",
            //                 "projectType": "APIGEE_PROXY",
            //                 "onboardingId": "6a0c66f43e843c04624ee8f9",
            //                 "apiName": "Swagger Petstore",
            //                 "projectOwner": "Jagruti",
            //                 "ownerEmail": "jagruti.d@gmail.com",
            //                 "projectSME": "",
            //                 "projectSMEEmail": "jagruti.d@gmail.com",
            //                 "projectDLEmail": "",
            //                 "expectedGoLiveDate": "",
            //                 "testerName": "",
            //                 "testerEmail": "",
            //                 "serviceNowGroupName": "",
            //                 "serviceNowEmail": "",
            //                 "consumerIds": [],
            //                 "requirementId": "6a0c67682f6380434f252c37",
            //                 "apiDesignId": "6a0c67937ea43d3ad40fb40b",
            //                 "mockApiId": "5a34d772-be2e-4e31-82d3-d42e1429b914",
            //                 "apiDevelopmentId": null,
            //                 "codeGenResultId": null,
            //                 "connectorId": null,
            //                 "createdBy": null,
            //                 "createdAt": "2026-05-19T13:36:36.744708076Z",
            //                 "updatedBy": null,
            //                 "updatedAt": "2026-05-19T13:37:24.645680658Z"
            //             },
            //             "consumerInformation": [],
            //             "connectorConfiguration": null,
            //             "requirement": {
            //                 "id": "6a0c67682f6380434f252c38",
            //                 "microserviceId": "6a0c67643e843c04624ee8fa",
            //                 "functionalRequirements": "Build an API capability for: consumer onbording\nCapture the main resources, user actions, validation rules, response outcomes, and exception paths.\nPrefer RESTful endpoints with clear request and response payload expectations.\nInclude security, observability, performance, and availability expectations where they affect the API contract.",
            //                 "nonFunctionalRequirements": "",
            //                 "expectedTps": 500,
            //                 "slaMs": 200,
            //                 "availabilityPercent": 99.9
            //             },
            //             "apiDesign": {
            //                 "id": "6a0c67937ea43d3ad40fb40b",
            //                 "microserviceId": "6a0c67643e843c04624ee8fa",
            //                 "specMetadataId": "69fdfcd75c802d283f2f744c",
            //                 "apiType": "REST API",
            //                 "authenticationType": "oauth2",
            //                 "dataFormat": "JSON",
            //                 "specMetadata": {
            //                     "id": "69fdfcd75c802d283f2f744c",
            //                     "specName": "Swagger Petstore",
            //                     "fileName": "swagger.json",
            //                     "gcsPath": "gs://forgesphere/imported/d8539e1b-c9e4-4923-8524-244b537f0621_swagger.json",
            //                     "importUrl": null,
            //                     "importMethod": "LOCAL",
            //                     "contentType": "application/json",
            //                     "fileSize": 13843,
            //                     "uploadedAt": "Fri May 08 15:10:15 GMT 2026"
            //                 }
            //             },
            //             "mockApi": {
            //                 "id": "5a34d772-be2e-4e31-82d3-d42e1429b914",
            //                 "microserviceId": "6a0c67643e843c04624ee8fa",
            //                 "specMetadataId": "69fdfcd75c802d283f2f744c",
            //                 "apiSpecName": "Swagger Petstore",
            //                 "name": "mock-swagger-petstore",
            //                 "mockServiceName": "mock-swagger-petstore",
            //                 "mockServerUrl": "https://forgesphere.probestack.io/mock-api/v1/api/mocks/mock-edf36005",
            //                 "mockUrl": "mock-edf36005",
            //                 "responseLatencyMs": 0,
            //                 "delayMs": 0,
            //                 "isPrivate": true,
            //                 "requestCount": 20,
            //                 "createdAt": "Tue May 19 13:37:46 GMT 2026",
            //                 "updatedAt": "Tue May 19 13:37:53 GMT 2026"
            //             },
            //             "contractTesting": null,
            //             "apiDevelopment": null,
            //             "providerInformation": null,
            //             "projectMetadata": null,
            //             "endpoints": [],
            //             "codeGenResults": [],
            //             "testCases": [],
            //             "testExecutions": []
            //         },
            //         "steps": [
            //             {
            //                 "stepKey": "ONBOARDING",
            //                 "label": "Onboarding",
            //                 "completed": true
            //             },
            //             {
            //                 "stepKey": "REQUIREMENT",
            //                 "label": "Requirements",
            //                 "completed": true
            //             },
            //             {
            //                 "stepKey": "API_DESIGN",
            //                 "label": "API Design",
            //                 "completed": true
            //             },
            //             {
            //                 "stepKey": "MOCK_API",
            //                 "label": "Mock API",
            //                 "completed": true
            //             },
            //             {
            //                 "stepKey": "CONTRACT_TESTING",
            //                 "label": "Contract Testing",
            //                 "completed": false
            //             },
            //             {
            //                 "stepKey": "API_DEVELOPMENT",
            //                 "label": "API Development",
            //                 "completed": false
            //             },
            //             {
            //                 "stepKey": "PROVIDER",
            //                 "label": "Provider",
            //                 "completed": false
            //             },
            //             {
            //                 "stepKey": "CODE_GENERATION",
            //                 "label": "Code Generation",
            //                 "completed": false
            //             },
            //             {
            //                 "stepKey": "TESTING",
            //                 "label": "Testing",
            //                 "completed": false
            //             }
            //         ]
            //     },
            //     "timestamp": "2026-05-31T06:11:11.441320909Z"
            // }
            setForgesfereInfo(data.data);
        } catch (err) {
            console.error('Error fetching Forgesphere info:', err);
            setForgesfereError(err.message);
            showMessage(`Failed to load Forgesphere info: ${err.message}`, 'error');
        } finally {
            setLoadingForgesfere(false);
        }
    };
    const fetchSpecFile = async (specMetadataId, fileName) => {
        try {
            const token = await fetchToken();
            if (!token) throw new Error('Failed to get token');
            const url = `${API_BASE_URL}/api-design/v1/api/apidesign/spec-metadata/${specMetadataId}/content`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            return { content, fileName };
        } catch (err) {
            console.error('Error fetching spec file:', err);
            showMessage(`Failed to load spec: ${err.message}`, 'error');
            return null;
        }
    };

    const downloadSpecFile = async (specMetadataId, fileName) => {
        const result = await fetchSpecFile(specMetadataId, fileName);
        if (!result) return;
        const blob = new Blob([result.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(`Downloaded ${fileName}`, 'success');
    };

    const [viewSpecOpen, setViewSpecOpen] = useState(false);
    const [viewSpecData, setViewSpecData] = useState(null);

    const handleViewSpec = async (specMetadataId, fileName, specName) => {
        const result = await fetchSpecFile(specMetadataId, fileName);
        if (result) {
            setViewSpecData({ id: specMetadataId, specName: specName || fileName, content: result.content });
            setViewSpecOpen(true);
        }
    };

    // Add token fetching function
    const fetchOrganizations = async () => {
        setLoadingOrgs(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const url = 'https://forgesphere.probestack.io/apigee-wrapper/organizations';
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch organizations: ${response.status}`);
            const data = await response.json();

            // Extract organization names from the response: { organizations: [{ organization, projectIds, projectId }] }
            let orgs = [];
            if (data.organizations && Array.isArray(data.organizations)) {
                orgs = data.organizations.map(item => item.organization).filter(Boolean);
            } else if (Array.isArray(data)) {
                // Fallback in case response is a plain array
                orgs = data.map(item => item.organization || item.name || item).filter(Boolean);
            }

            if (orgs.length === 0) {
                console.warn('No organizations found, using default');
                orgs = ['gen-ai-poc-onboarding'];
            }

            setOrganizations(orgs);
            // Always store a string
            setSelectedOrg(orgs[0]);
        } catch (error) {
            console.error('Error fetching organizations:', error);
            showMessage('Could not load organizations', 'error');
            const fallback = ['gen-ai-poc-onboarding'];
            setOrganizations(fallback);
            setSelectedOrg(fallback[0]);
        } finally {
            setLoadingOrgs(false);
        }
    };

    const fetchEnvironments = async (orgName) => {
        if (!orgName) return;
        setLoadingEnvironments(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const url = (`https://forgesphere.probestack.io/apigee-wrapper/organizations/${orgName}/environments`);
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch environments: ${response.status}`);
            const data = await response.json();
            setAvailableEnvironments(data);
            // if (data.length > 0) {
            //     setDebugEnv(data[0]);
            // }
        } catch (error) {
            console.error('Error fetching environments:', error);
            showMessage('Could not load environments', 'error');
            setAvailableEnvironments([]);
        } finally {
            setLoadingEnvironments(false);
        }
    };
    const fetchRevisions = async (orgName) => {
        if (!proxy?.name || !orgName || !debugEnv || debugEnv === "") return;
        setLoadingRevisions(true);
        setAvailableRevisions([]);
        setSelectedRevision(''); // reset selected revision when environment changes
        try {
            const token = await fetchToken();
            if (!token) return;
            const parent = `organizations/${orgName}/environments/${debugEnv}/apis/${proxy.name}`;
            const url = `https://apigee.googleapis.com/v1/${parent}/deployments`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Response structure: { deployments: [ { revision: "2", ... } ] }
                const revs = data.deployments?.map(dep => dep.revision) || [];
                setAvailableRevisions(revs);
                // Do NOT auto-select the first revision – user must choose
            } else {
                console.error('Failed to fetch revisions', res.status);
                setAvailableRevisions([]);
            }
        } catch (err) {
            console.error(err);
            setAvailableRevisions([]);
        } finally {
            setLoadingRevisions(false);
        }
    };
    // const fetchDeploymentStatus = async (orgName, revision) => {
    //     if (!proxy?.name || !orgName || !revision) return;
    //     try {
    //         const token = await fetchToken();
    //         if (!token) return;
    //         const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxy.name}/revisions/${revision}/deployments`;
    //         const res = await fetch(url, {
    //             headers: { 'Authorization': `Bearer ${token}` }
    //         });
    //         if (res.ok) {
    //             const data = await res.json();
    //             console.log('Deployment status for revision', revision, ':', data);
    //             // You can store this in a separate state if needed
    //         }
    //     } catch (err) {
    //         console.error(err);
    //     }
    // };
    const formatDate = (timestamp) => {
        if (!timestamp) return '—';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleDateString();
    };

    const getLatestRevisionData = () => {
        if (!proxyDetails?.revisionDetails) return null;
        const latestRev = proxyDetails.proxy?.latestRevisionId;
        const revDetail = proxyDetails.revisionDetails.find(r => r.revision === latestRev);
        return revDetail?.data || null;
    };

    const getBasePath = () => {
        const latestData = getLatestRevisionData();
        return latestData?.basepaths?.[0] || '/';
    };

    const getProxyUrl = () => {
        const latestData = getLatestRevisionData();
        return latestData?.service?.url || '—';
    };

    const getDescription = () => {
        // If no description in API, show a default or extract from policies
        const latestData = getLatestRevisionData();
        const policies = latestData?.policies || [];
        return policies.length > 0 ? `Policies: ${policies.join(', ')}` : 'No description available';
    };

    const getExtensibleStatus = (revisionData) => {
        return revisionData?.hasExtensiblePolicy ? 'Yes' : 'No';
    };
    const renderInfoField = (label, value, icon = null) => {
        if (!value && value !== 0) return null;
        return (
            <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                {icon && <div className="mt-0.5 text-sky-400/70">{icon}</div>}
                <div className="flex-1">
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
                    <dd className="mt-1 text-sm text-white break-words">{value}</dd>
                </div>
            </div>
        );
    };

    const renderSectionHeader = (title, icon) => (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            <div className="text-sky-400">{icon}</div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h4>
        </div>
    );
    const AnimatedValue = ({ value, suffix = "" }) => {
        const [displayValue, setDisplayValue] = React.useState(0);
        useEffect(() => {
            if (typeof value !== "number") return;
            let start = 0;
            const duration = 800;
            const stepTime = 20;
            const steps = duration / stepTime;
            const increment = value / steps;
            let current = 0;
            const timer = setInterval(() => {
                current += increment;
                if (current >= value) {
                    setDisplayValue(value);
                    clearInterval(timer);
                } else {
                    setDisplayValue(Math.floor(current));
                }
            }, stepTime);
            return () => clearInterval(timer);
        }, [value]);
        return <span>{displayValue}{suffix}</span>;
    };

    // Progress bar component for metrics
    const MetricProgress = ({ label, value, unit, max = 1000, color = "sky" }) => {
        const percent = Math.min((value / max) * 100, 100);
        const gradientColor = color === "sky"
            ? "from-sky-500 to-blue-500"
            : "from-emerald-500 to-teal-500";
        return (
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-mono">{value}{unit}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradientColor} transition-all duration-1000 ease-out`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        );
    };
    const openProxyEditor = async (proxyName) => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            // 1. Get proxy details to fetch the latest revision
            const detailsUrl = `https://forgesphere.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/${proxyName}/details`;
            const detailsRes = await fetch(detailsUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (!detailsRes.ok) throw new Error("Failed to fetch proxy details");
            const detailsData = await detailsRes.json();
            const latestRev = detailsData.proxy?.latestRevisionId;
            if (!latestRev) throw new Error("No revision found");
            // 2. Download the bundle zip for the latest revision
            const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis/${proxyName}/revisions/${latestRev}/?format=bundle`;
            const bundleRes = await fetch(bundleUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (!bundleRes.ok) throw new Error("Failed to fetch bundle");
            const blob = await bundleRes.blob();
            const zipUrl = URL.createObjectURL(blob);
            // 3. Navigate to proxy editor
            navigate('/proxy-editor', {
                state: {
                    zipUrl,
                    selectedProxyName: proxyName,
                    backTo: `/gateway/proxy/${proxyName}`,
                    backState: { proxy: { name: proxyName } },
                }
            });
        } catch (err) {
            console.error("Error opening editor:", err);
            showMessage(`Could not open editor: ${err.message}`, "error");
        }
    };

    // ========== UPDATED ForgesfereInfoCard Component ==========
    const ForgesfereInfoCard = ({ loading, error, data }) => {
        const [selectedStepKey, setSelectedStepKey] = useState(null);
        const [showRawData, setShowRawData] = useState(false);

        if (loading) {
            return (
                <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden animate-pulse">
                    <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-sky-500/20" />
                            <div className="h-5 w-32 bg-white/10 rounded" />
                        </div>
                    </div>
                    <div className="p-5 space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="h-4 w-40 bg-white/10 rounded" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(j => (
                                        <div key={j} className="h-12 bg-white/5 rounded-xl" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-amber-500/30 shadow-xl overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-400" />
                            <h3 className="text-sm font-semibold text-amber-200">Forgesfere Info</h3>
                        </div>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-amber-100/80 text-sm">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-3 text-xs text-amber-300 underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (!data) return null;

        const { onboarding, resource, steps } = data;
        const microservice = resource?.microservice;
        const requirement = resource?.requirement;
        const apiDesign = resource?.apiDesign;
        const mockApi = resource?.mockApi;
        const contractTesting = resource?.contractTesting;
        const apiDevelopment = resource?.apiDevelopment;
        const providerInformation = resource?.providerInformation;
        const codeGenResults = resource?.codeGenResults;
        const testCases = resource?.testCases;
        const testExecutions = resource?.testExecutions;
        const endpoints = resource?.endpoints;
        const projectMetadata = resource?.projectMetadata;
        const consumerInformation = resource?.consumerInformation;
        const connectorConfiguration = resource?.connectorConfiguration;

        const totalSteps = steps?.length || 0;
        const completedSteps = steps?.filter(s => s.completed).length || 0;
        const progressPercent = totalSteps ? (completedSteps / totalSteps) * 100 : 0;

        // Helper to render JSON prettily
        const renderJson = (obj, title) => (
            <div className="rounded-xl bg-black/30 p-3 border border-white/10 overflow-auto max-h-80">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(obj, null, 2)}
                </pre>
            </div>
        );

        // Render detail panel based on selected stepKey
        const renderStepDetails = () => {
            switch (selectedStepKey) {
                case 'ONBOARDING':
                    return onboarding ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { icon: Globe, label: "Business Unit", value: onboarding.businessUnit },
                                    { icon: Users, label: "Team Name", value: onboarding.teamName },
                                    { icon: Database, label: "Application", value: onboarding.applicationName },
                                    { icon: User, label: "Owner", value: onboarding.projectOwner },
                                    { icon: Mail, label: "Owner Email", value: onboarding.ownerEmail },
                                    { icon: Clock, label: "Created", value: new Date(onboarding.createdAt).toLocaleDateString() },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
                                        <item.icon className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-slate-400">{item.label}</div>
                                            <div className="text-sm font-medium text-white truncate">{item.value || "—"}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className="text-slate-400 text-sm">No onboarding data available.</p>;

                case 'REQUIREMENT':
                    return requirement ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                                        <p className="text-xs text-slate-400 mb-1">Functional Requirements</p>
                                        <p className="text-sm text-white leading-relaxed">{requirement.functionalRequirements || '—'}</p>
                                    </div>
                                    {requirement.nonFunctionalRequirements && (
                                        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                                            <p className="text-xs text-slate-400 mb-1">Non‑functional Requirements</p>
                                            <p className="text-sm text-white">{requirement.nonFunctionalRequirements}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4 rounded-xl bg-white/5 p-4 border border-white/10">
                                    <MetricProgress label="Expected TPS" value={requirement.expectedTps} unit=" req/s" max={1000} color="sky" />
                                    <MetricProgress label="SLA (ms)" value={requirement.slaMs} unit=" ms" max={500} color="emerald" />
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Availability</span>
                                            <span className="text-white font-mono">{requirement.availabilityPercent}%</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" style={{ width: `${requirement.availabilityPercent}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : <p className="text-slate-400 text-sm">No requirement data available.</p>;

                case 'API_DESIGN':
                    return apiDesign ? (
                        <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">API Design</p>
                                {apiDesign.specMetadata && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewSpec(apiDesign.specMetadata.id, apiDesign.specMetadata.fileName, apiDesign.specMetadata.specName)}
                                            className="px-2 py-1 text-xs rounded-md bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition flex items-center gap-1"
                                        >
                                            <Eye className="h-3 w-3" /> Documentation
                                        </button>
                                        <button
                                            onClick={() => downloadSpecFile(apiDesign.specMetadata.id, apiDesign.specMetadata.fileName)}
                                            className="px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition flex items-center gap-1"
                                        >
                                            <Download className="h-3 w-3" /> Download
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Type</span><span>{apiDesign.apiType}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Auth</span><span>{apiDesign.authenticationType}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Format</span><span>{apiDesign.dataFormat}</span></div>
                                {apiDesign.specMetadata && (
                                    <>
                                        <div className="flex justify-between"><span className="text-slate-400">Spec</span><span className="truncate">{apiDesign.specMetadata.specName}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400">Size</span><span>{(apiDesign.specMetadata.fileSize / 1024).toFixed(2)} KB</span></div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : <p className="text-slate-400 text-sm">No API design data available.</p>;

                case 'MOCK_API':
                    return mockApi ? (
                        <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
                            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Mock API</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Name</span><span>{mockApi.name}</span></div>
                                <div className="flex items-start gap-2"><span className="text-slate-400">URL</span><code className="text-xs text-emerald-300 break-all">{mockApi.mockServerUrl}</code></div>
                                <div className="flex justify-between"><span className="text-slate-400">Private</span><span>{mockApi.isPrivate ? "Yes" : "No"}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Requests</span><span>{mockApi.requestCount}</span></div>
                            </div>
                        </div>
                    ) : <p className="text-slate-400 text-sm">No mock API data available.</p>;

                case 'CONTRACT_TESTING':
                    return contractTesting ? renderJson(contractTesting, "Contract Testing") : <p className="text-slate-400 text-sm">No contract testing data available.</p>;

                case 'API_DEVELOPMENT':
                    return apiDevelopment ? renderJson(apiDevelopment, "API Development") : <p className="text-slate-400 text-sm">No API development data available.</p>;

                case 'PROVIDER':
                    return providerInformation ? renderJson(providerInformation, "Provider Information") : <p className="text-slate-400 text-sm">No provider information available.</p>;

                case 'CODE_GENERATION':
                    return codeGenResults?.length ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {codeGenResults.map((gen, idx) => (
                                <div key={idx} className="rounded-xl bg-white/5 p-4 border border-white/10">
                                    <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                                        {JSON.stringify(gen, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-slate-400 text-sm">No code generation results available.</p>;
                case 'TESTING':
                    return (testCases?.length || testExecutions?.length) ? (
                        <div className="space-y-4">
                            {testCases?.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-2">Test Cases</p>
                                    {renderJson(testCases)}
                                </div>
                            )}
                            {testExecutions?.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-2">Test Executions</p>
                                    {renderJson(testExecutions)}
                                </div>
                            )}
                        </div>
                    ) : <p className="text-slate-400 text-sm">No testing data available.</p>;

                default:
                    // General information when no step is selected
                    return (
                        <div className="space-y-6">
                            {/* Microservice summary */}
                            {microservice && (
                                <div>
                                    <h5 className="text-sm font-semibold text-sky-300 mb-2">API Resource</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { label: "API Name", value: microservice.apiName },
                                            { label: "Project Type", value: microservice.projectType },
                                            { label: "Project Owner", value: microservice.projectOwner },
                                            { label: "Owner Email", value: microservice.ownerEmail },
                                            { label: "Created", value: new Date(microservice.createdAt).toLocaleDateString() },
                                            { label: "Updated", value: new Date(microservice.updatedAt).toLocaleDateString() },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex justify-between border-b border-white/10 pb-1">
                                                <span className="text-xs text-slate-400">{item.label}</span>
                                                <span className="text-sm text-white">{item.value || "—"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Endpoints */}
                            {endpoints?.length > 0 && (
                                <div>
                                    <h5 className="text-sm font-semibold text-sky-300 mb-2">Endpoints</h5>
                                    <div className="space-y-2">
                                        {endpoints.map((ep, i) => (
                                            <div key={i} className="bg-white/5 p-2 rounded text-xs font-mono">
                                                {ep}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Project Metadata */}
                            {projectMetadata && (
                                <div>
                                    <h5 className="text-sm font-semibold text-sky-300 mb-2">Project Metadata</h5>
                                    <div className="text-xs text-slate-300 bg-white/5 p-2 rounded">
                                        {Object.entries(projectMetadata).map(([k, v]) => (
                                            <div key={k} className="flex justify-between gap-2"><span className="text-slate-400">{k}:</span><span>{String(v)}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!microservice && !endpoints?.length && !codeGenResults?.length && !projectMetadata && (
                                <p className="text-slate-400 text-sm">Select a step above to see details, or expand "Additional Metadata" below for the complete response.</p>
                            )}
                        </div>
                    );
            }
        };

        // Collect all extra fields not displayed in steps for the raw data section
        const extraFields = {
            consumerInformation,
            connectorConfiguration,
            ...(contractTesting && { contractTesting }),
            ...(apiDevelopment && { apiDevelopment }),
            ...(providerInformation && { providerInformation }),
            ...(testCases?.length && { testCases }),
            ...(testExecutions?.length && { testExecutions }),
            ...(resource?.providerInformation && { providerInformation: resource.providerInformation }),
            ...(resource?.anyOtherField && { anyOtherField: resource.anyOtherField }) // catch-all
        };
        // Remove undefined
        Object.keys(extraFields).forEach(k => extraFields[k] === undefined && delete extraFields[k]);

        return (
            <div className="group">
                <div className="relative bg-gradient-to-br from-[#111520] via-[#0f1422] to-[#0a0e18] rounded-2xl border border-[#2a3550] shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-sky-500/10 hover:border-sky-500/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/0 to-sky-500/0 group-hover:from-sky-500/5 group-hover:via-sky-500/5 group-hover:to-sky-500/5 transition-all duration-700 pointer-events-none" />

                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4 border-b border-white/10 bg-gradient-to-r from-sky-500/10 via-transparent to-transparent">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent">
                                        Forgesphere Info
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Complete resource metadata & lifecycle</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                                API
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Progress Bar & Steps Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-indigo-500/10 p-1.5">
                                        <Activity className="h-4 w-4 text-indigo-400" />
                                    </div>
                                    <h4 className="text-sm font-semibold text-white tracking-wide">Lifecycle Progress</h4>
                                </div>
                                <div className="text-xs text-slate-300">
                                    {completedSteps} / {totalSteps} completed
                                </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-1000"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Clickable Steps */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                {steps.map((step) => (
                                    <button
                                        key={step.stepKey}
                                        onClick={() => setSelectedStepKey(step.stepKey)}
                                        className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 text-left w-full ${selectedStepKey === step.stepKey
                                            ? "border-sky-500/50 bg-gradient-to-r from-sky-500/20 to-transparent shadow-md"
                                            : step.completed
                                                ? "border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent hover:from-green-500/20"
                                                : "border-white/10 bg-white/5 hover:bg-white/10"
                                            }`}
                                    >
                                        {step.completed ? (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                        ) : (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-slate-400">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-white">{step.label}</span>
                                        {step.completed && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Detail Panel */}
                        <div className="rounded-xl bg-[#0a0e18]/50 border border-white/10 p-5 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                                <div className="rounded-lg bg-sky-500/10 p-1.5">
                                    <Info className="h-4 w-4 text-sky-400" />
                                </div>
                                <h4 className="text-sm font-semibold text-white tracking-wide">
                                    {steps.find(s => s.stepKey === selectedStepKey)?.label || "General Information"}
                                </h4>
                            </div>
                            {renderStepDetails()}
                        </div>

                        {/* Additional Metadata (Collapsible) */}
                        {Object.keys(extraFields).length > 0 && (
                            <div className="rounded-xl bg-[#0a0e18]/50 border border-white/10 overflow-hidden">
                                <button
                                    onClick={() => setShowRawData(!showRawData)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileJson className="h-4 w-4 text-amber-400" />
                                        <span className="text-sm font-semibold text-white">Additional Metadata</span>
                                        <span className="text-xs text-slate-400">(raw response data)</span>
                                    </div>
                                    <div className="text-slate-400">
                                        {showRawData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </button>
                                {showRawData && (
                                    <div className="p-4 pt-0 border-t border-white/10">
                                        {renderJson(extraFields, "")}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/10 bg-black/20 px-6 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Zap className="h-3 w-3" />
                            Powered by Forgesphere
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    // Main component
    // const ForgesfereInfoCard = ({ loading, error, data }) => {
    //     if (loading) {
    //         return (
    //             <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden animate-pulse">
    //                 <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
    //                     <div className="flex items-center gap-2">
    //                         <div className="w-5 h-5 rounded-full bg-sky-500/20" />
    //                         <div className="h-5 w-32 bg-white/10 rounded" />
    //                     </div>
    //                 </div>
    //                 <div className="p-5 space-y-6">
    //                     {[1, 2, 3].map(i => (
    //                         <div key={i} className="space-y-3">
    //                             <div className="h-4 w-40 bg-white/10 rounded" />
    //                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    //                                 {[1, 2, 3, 4].map(j => (
    //                                     <div key={j} className="h-12 bg-white/5 rounded-xl" />
    //                                 ))}
    //                             </div>
    //                         </div>
    //                     ))}
    //                 </div>
    //             </div>
    //         );
    //     }

    //     if (error) {
    //         return (
    //             <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-amber-500/30 shadow-xl overflow-hidden">
    //                 <div className="px-5 pt-5 pb-3 border-b border-amber-500/20 bg-amber-500/5">
    //                     <div className="flex items-center gap-2">
    //                         <AlertCircle className="h-5 w-5 text-amber-400" />
    //                         <h3 className="text-sm font-semibold text-amber-200">Forgesfere Info</h3>
    //                     </div>
    //                 </div>
    //                 <div className="p-6 text-center">
    //                     <p className="text-amber-100/80 text-sm">{error}</p>
    //                     <button
    //                         onClick={() => window.location.reload()}
    //                         className="mt-3 text-xs text-amber-300 underline"
    //                     >
    //                         Retry
    //                     </button>
    //                 </div>
    //             </div>
    //         );
    //     }

    //     if (!data) return null;

    //     const { onboarding, resource, steps } = data;
    //     const microservice = resource?.microservice;
    //     const requirement = resource?.requirement;
    //     const apiDesign = resource?.apiDesign;
    //     const mockApi = resource?.mockApi;

    //     // Calculate steps progress
    //     const totalSteps = steps?.length || 0;
    //     const completedSteps = steps?.filter(s => s.completed).length || 0;
    //     const progressPercent = totalSteps ? (completedSteps / totalSteps) * 100 : 0;

    //     return (
    //         <div className="group">
    //             {/* Main card with glassmorphism and glow effect */}
    //             <div className="relative bg-gradient-to-br from-[#111520] via-[#0f1422] to-[#0a0e18] rounded-2xl border border-[#2a3550] shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-sky-500/10 hover:border-sky-500/30">
    //                 {/* Animated gradient overlay on hover */}
    //                 <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/0 to-sky-500/0 group-hover:from-sky-500/5 group-hover:via-sky-500/5 group-hover:to-sky-500/5 transition-all duration-700 pointer-events-none" />

    //                 {/* Header with brand badge */}
    //                 <div className="relative px-6 pt-6 pb-4 border-b border-white/10 bg-gradient-to-r from-sky-500/10 via-transparent to-transparent">
    //                     <div className="flex items-center justify-between flex-wrap gap-3">
    //                         <div className="flex items-center gap-3">
    //                             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
    //                                 <Sparkles className="h-4 w-4 text-white" />
    //                             </div>
    //                             <div>
    //                                 <h3 className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent">
    //                                     Forgesphere Info
    //                                 </h3>
    //                                 <p className="text-xs text-slate-400 mt-0.5">Complete resource metadata & lifecycle</p>
    //                             </div>
    //                         </div>
    //                         {/* Badge showing source */}
    //                         <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
    //                             <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
    //                             PROXY
    //                         </div>
    //                     </div>
    //                 </div>

    //                 <div className="p-6 space-y-8">
    //                     {/* === Onboarding Section === */}
    //                     {onboarding && (
    //                         <div className="space-y-4 transition-all duration-300 hover:translate-x-1">
    //                             <div className="flex items-center gap-2 border-b border-white/10 pb-2">
    //                                 <div className="rounded-lg bg-sky-500/10 p-1.5">
    //                                     <User className="h-4 w-4 text-sky-400" />
    //                                 </div>
    //                                 <h4 className="text-sm font-semibold text-white tracking-wide">Onboarding Details</h4>
    //                             </div>
    //                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    //                                 {[
    //                                     { icon: Globe, label: "Business Unit", value: onboarding.businessUnit },
    //                                     { icon: Users, label: "Team Name", value: onboarding.teamName },
    //                                     { icon: Database, label: "Application", value: onboarding.applicationName },
    //                                     { icon: User, label: "Owner", value: onboarding.projectOwner },
    //                                     { icon: Mail, label: "Owner Email", value: onboarding.ownerEmail },
    //                                     { icon: Clock, label: "Created", value: new Date(onboarding.createdAt).toLocaleDateString() },
    //                                 ].map((item, idx) => (
    //                                     <div key={idx} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
    //                                         <item.icon className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
    //                                         <div className="min-w-0 flex-1">
    //                                             <div className="text-xs text-slate-400">{item.label}</div>
    //                                             <div className="text-sm font-medium text-white truncate">{item.value || "—"}</div>
    //                                         </div>
    //                                     </div>
    //                                 ))}
    //                             </div>
    //                         </div>
    //                     )}

    //                     {/* === API Resource Section === */}
    //                     {microservice && (
    //                         <div className="space-y-4 transition-all duration-300 hover:translate-x-1">
    //                             <div className="flex items-center gap-2 border-b border-white/10 pb-2">
    //                                 <div className="rounded-lg bg-emerald-500/10 p-1.5">
    //                                     <ServerIcon className="h-4 w-4 text-emerald-400" />
    //                                 </div>
    //                                 <h4 className="text-sm font-semibold text-white tracking-wide">API Resource</h4>
    //                             </div>
    //                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    //                                 {[
    //                                     { icon: Code2, label: "API Name", value: microservice.apiName },
    //                                     { icon: Target, label: "Project Type", value: microservice.projectType },
    //                                     { icon: User, label: "Project Owner", value: microservice.projectOwner },
    //                                     { icon: Mail, label: "Email", value: microservice.ownerEmail },
    //                                     { icon: Clock, label: "Created", value: new Date(microservice.createdAt).toLocaleDateString() },
    //                                 ].map((item, idx) => (
    //                                     <div key={idx} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/5">
    //                                         <item.icon className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
    //                                         <div className="min-w-0 flex-1">
    //                                             <div className="text-xs text-slate-400">{item.label}</div>
    //                                             <div className="text-sm font-medium text-white truncate">{item.value || "—"}</div>
    //                                         </div>
    //                                     </div>
    //                                 ))}
    //                             </div>
    //                         </div>
    //                     )}

    //                     {/* === Requirements with progress bars === */}
    //                     {requirement && (
    //                         <div className="space-y-4 transition-all duration-300 hover:translate-x-1">
    //                             <div className="flex items-center gap-2 border-b border-white/10 pb-2">
    //                                 <div className="rounded-lg bg-purple-500/10 p-1.5">
    //                                     <FileJson className="h-4 w-4 text-purple-400" />
    //                                 </div>
    //                                 <h4 className="text-sm font-semibold text-white tracking-wide">Requirements & SLAs</h4>
    //                             </div>
    //                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    //                                 {/* Left: functional text */}
    //                                 <div className="space-y-3">
    //                                     <div className="rounded-xl bg-white/5 p-4 border border-white/10">
    //                                         <p className="text-xs text-slate-400 mb-1">Functional Requirements</p>
    //                                         <p className="text-sm text-white leading-relaxed">{requirement.functionalRequirements || '—'}</p>
    //                                     </div>
    //                                     {requirement.nonFunctionalRequirements && (
    //                                         <div className="rounded-xl bg-white/5 p-4 border border-white/10">
    //                                             <p className="text-xs text-slate-400 mb-1">Non‑functional Requirements</p>
    //                                             <p className="text-sm text-white">{requirement.nonFunctionalRequirements || '—'}</p>
    //                                         </div>
    //                                     )}
    //                                 </div>
    //                                 {/* Right: metrics with progress bars */}
    //                                 <div className="space-y-4 rounded-xl bg-white/5 p-4 border border-white/10">
    //                                     <MetricProgress
    //                                         label="Expected TPS"
    //                                         value={requirement.expectedTps}
    //                                         unit=" req/s"
    //                                         max={1000}
    //                                         color="sky"
    //                                     />
    //                                     <MetricProgress
    //                                         label="SLA (ms)"
    //                                         value={requirement.slaMs}
    //                                         unit=" ms"
    //                                         max={500}
    //                                         color="emerald"
    //                                     />
    //                                     <div className="space-y-1">
    //                                         <div className="flex justify-between text-xs">
    //                                             <span className="text-slate-400">Availability</span>
    //                                             <span className="text-white font-mono">{requirement.availabilityPercent}%</span>
    //                                         </div>
    //                                         <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
    //                                             <div
    //                                                 className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000"
    //                                                 style={{ width: `${requirement.availabilityPercent}%` }}
    //                                             />
    //                                         </div>
    //                                     </div>
    //                                 </div>
    //                             </div>
    //                         </div>
    //                     )}

    //                     {/* === API Design & Mock API combined row === */}
    //                     {(apiDesign || mockApi) && (
    //                         <div className="space-y-4">
    //                             <div className="flex items-center gap-2 border-b border-white/10 pb-2">
    //                                 <div className="rounded-lg bg-amber-500/10 p-1.5">
    //                                     <FileText className="h-4 w-4 text-amber-400" />
    //                                 </div>
    //                                 <h4 className="text-sm font-semibold text-white tracking-wide">Design & Mocking</h4>
    //                             </div>
    //                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    //                                 {/* {apiDesign && (
    //                                     <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
    //                                         <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">API Design</p>
    //                                         <div className="space-y-2 text-sm">
    //                                             <div className="flex justify-between"><span className="text-slate-400">Type</span><span>{apiDesign.apiType}</span></div>
    //                                             <div className="flex justify-between"><span className="text-slate-400">Auth</span><span>{apiDesign.authenticationType}</span></div>
    //                                             <div className="flex justify-between"><span className="text-slate-400">Format</span><span>{apiDesign.dataFormat}</span></div>
    //                                             {apiDesign.specMetadata && (
    //                                                 <>
    //                                                     <div className="flex justify-between"><span className="text-slate-400">Spec</span><span className="truncate">{apiDesign.specMetadata.specName}</span></div>
    //                                                     <div className="flex justify-between"><span className="text-slate-400">Size</span><span>{(apiDesign.specMetadata.fileSize / 1024).toFixed(2)} KB</span></div>
    //                                                 </>
    //                                             )}
    //                                         </div>
    //                                     </div>
    //                                 )} */}
    //                                 {apiDesign && (
    //                                     <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
    //                                         <div className="flex items-center justify-between flex-wrap gap-2">
    //                                             <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">API Design</p>
    //                                             {apiDesign.specMetadata && (
    //                                                 <div className="flex gap-2">
    //                                                     <button
    //                                                         onClick={() => {
    //                                                             // Preview: open in new tab as formatted JSON
    //                                                             fetchSpecFile(apiDesign.specMetadata.id, apiDesign.specMetadata.fileName).then(res => {
    //                                                                 if (res) {
    //                                                                     const newWindow = window.open();
    //                                                                     newWindow.document.write(`<pre style="background:#0f1117;color:#e2e8f0;padding:1rem;font-family:monospace;">${JSON.stringify(JSON.parse(res.content), null, 2)}</pre>`);
    //                                                                 }
    //                                                             });
    //                                                         }}
    //                                                         className="px-2 py-1 text-xs rounded-md bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition flex items-center gap-1"
    //                                                     >
    //                                                         <Eye className="h-3 w-3" /> Preview
    //                                                     </button>
    //                                                     <button
    //                                                         onClick={() => downloadSpecFile(apiDesign.specMetadata.id, apiDesign.specMetadata.fileName)}
    //                                                         className="px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition flex items-center gap-1"
    //                                                     >
    //                                                         <Download className="h-3 w-3" /> Download
    //                                                     </button>
    //                                                 </div>
    //                                             )}
    //                                         </div>
    //                                         <div className="space-y-2 text-sm">
    //                                             <div className="flex justify-between"><span className="text-slate-400">Type</span><span>{apiDesign.apiType}</span></div>
    //                                             <div className="flex justify-between"><span className="text-slate-400">Auth</span><span>{apiDesign.authenticationType}</span></div>
    //                                             <div className="flex justify-between"><span className="text-slate-400">Format</span><span>{apiDesign.dataFormat}</span></div>
    //                                             {apiDesign.specMetadata && (
    //                                                 <>
    //                                                     <div className="flex justify-between"><span className="text-slate-400">Spec</span><span className="truncate">{apiDesign.specMetadata.specName}</span></div>
    //                                                     <div className="flex justify-between"><span className="text-slate-400">Size</span><span>{(apiDesign.specMetadata.fileSize / 1024).toFixed(2)} KB</span></div>
    //                                                 </>
    //                                             )}
    //                                         </div>
    //                                     </div>
    //                                 )}
    //                                 {mockApi && (
    //                                     <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
    //                                         <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Mock API</p>
    //                                         <div className="space-y-2 text-sm">
    //                                             <div className="flex justify-between"><span className="text-slate-400">Name</span><span>{mockApi.name}</span></div>
    //                                             <div className="flex items-start gap-2"><span className="text-slate-400">URL</span><code className="text-xs text-emerald-300 break-all">{mockApi.mockServerUrl}</code></div>
    //                                             <div className="flex justify-between"><span className="text-slate-400">Private</span><span>{mockApi.isPrivate ? "Yes" : "No"}</span></div>
    //                                             <div className="flex justify-between"><span className="text-slate-400">Requests</span><span>{mockApi.requestCount}</span></div>
    //                                         </div>
    //                                     </div>
    //                                 )}
    //                             </div>
    //                         </div>
    //                     )}

    //                     {/* === Onboarding Progress (steps) with timeline === */}
    //                     {steps && steps.length > 0 && (
    //                         <div className="space-y-4 transition-all duration-300 hover:translate-x-1">
    //                             <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
    //                                 <div className="flex items-center gap-2">
    //                                     <div className="rounded-lg bg-indigo-500/10 p-1.5">
    //                                         <Activity className="h-4 w-4 text-indigo-400" />
    //                                     </div>
    //                                     <h4 className="text-sm font-semibold text-white tracking-wide">Lifecycle Progress</h4>
    //                                 </div>
    //                                 <div className="text-xs text-slate-300">
    //                                     {completedSteps} / {totalSteps} completed
    //                                 </div>
    //                             </div>
    //                             {/* Overall progress bar */}
    //                             <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
    //                                 <div
    //                                     className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-1000"
    //                                     style={{ width: `${progressPercent}%` }}
    //                                 />
    //                             </div>
    //                             {/* Step grid with status icons */}
    //                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
    //                                 {steps.map((step, idx) => (
    //                                     <div
    //                                         key={step.stepKey}
    //                                         className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${step.completed
    //                                             ? "border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent"
    //                                             : "border-white/10 bg-white/5 hover:bg-white/10"
    //                                             }`}
    //                                     >
    //                                         {step.completed ? (
    //                                             <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400">
    //                                                 <CheckCircle2 className="h-4 w-4" />
    //                                             </div>
    //                                         ) : (
    //                                             <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-slate-400">
    //                                                 <Clock className="h-4 w-4" />
    //                                             </div>
    //                                         )}
    //                                         <span className="text-sm font-medium text-white">{step.label}</span>
    //                                         {step.completed && (
    //                                             <div className="absolute right-3 top-1/2 -translate-y-1/2">
    //                                                 <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
    //                                             </div>
    //                                         )}
    //                                     </div>
    //                                 ))}
    //                             </div>
    //                         </div>
    //                     )}
    //                 </div>

    //                 {/* Footer with subtle branding */}
    //                 <div className="border-t border-white/10 bg-black/20 px-6 py-3 text-right">
    //                     <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
    //                         <Zap className="h-3 w-3" />
    //                         Powered by Forgesphere
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // };
    useEffect(() => {
        if (proxy?.source === "LIFECYCLE_TOOL" && proxy?.lifecycle?.microserviceId) {
            fetchForgesfereInfo(proxy.lifecycle.microserviceId);
        } else if (proxy?.source === "LIFECYCLE_TOOL" && !proxy?.lifecycle?.microserviceId) {
            console.warn("Forgesfere source but no resourceId provided");
        }
    }, [proxy?.source, proxy?.lifecycle?.microserviceId]);
    useEffect(() => {
        if (proxy?.name) {
            fetchOrganizations();
            fetchEnvironments(selectedOrg);
        }
    }, [activeTab, proxy?.name, selectedOrg, deployModalOpen]);
    useEffect(() => {
        setDeployRevision('');
        setDeployEnv('');
    }, [deployMode]);
    useEffect(() => {
        const fetchProxyDetails = async () => {
            if (!proxy?.name) return;

            setLoadingDetails(true);
            setDetailsError(null);
            try {
                const token = await fetchToken();
                if (!token) throw new Error('Failed to obtain access token');

                const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/apis/${proxy.name}/details`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const data = await response.json();
                setProxyDetails(data);
            } catch (err) {
                console.error('Error fetching proxy details:', err);
                setDetailsError(err.message);
                showMessage(`Could not load proxy details: ${err.message}`, 'error');
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchProxyDetails();
    }, [proxy?.name]);
    // Helper: fetch zip bundle for the latest revision
    const fetchProxyBundleZip = async () => {
        if (!proxy?.name) {
            showMessage('Missing proxy name or organization', 'error');
            return null;
        }

        // Get latest revision from proxy details (already fetched)
        const latestRev = proxyDetails?.proxy?.latestRevisionId;
        if (!latestRev) {
            showMessage('No revision found for this proxy', 'error');
            return null;
        }

        setBundleLoading(true);
        try {
            const token = await fetchToken();
            if (!token) throw new Error('Failed to obtain access token');

            // Use Apigee API to download bundle as zip
            const url = `https://apigee.googleapis.com/v1/organizations/gen-ai-poc-onboarding/apis/${proxy.name}/revisions/${latestRev}/?format=bundle`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const blob = await response.blob();
            // Create a local object URL for the zip
            const zipUrl = URL.createObjectURL(blob);
            return zipUrl;
        } catch (err) {
            console.error('Error fetching proxy bundle:', err);
            showMessage(`Could not load proxy bundle: ${err.message}`, 'error');
            return null;
        } finally {
            setBundleLoading(false);
        }
    };
    useEffect(() => {
        if (activeTab === 'edit' && !hasNavigated.current && proxy?.name) {
            hasNavigated.current = true;
            handleOpenProxyEditor();
        }
    }, [activeTab, proxy?.name]);

    // Reset navigation flag when the proxy changes
    useEffect(() => {
        return () => {
            hasNavigated.current = false;
        };
    }, [proxy?.name]);

    // Navigate to ProxyEditor with the bundle
    const handleOpenProxyEditor = async () => {
        const zipUrl = await fetchProxyBundleZip();
        if (!zipUrl) return;

        navigate('/proxy-editor', {
            state: {
                zipUrl,
                selectedProxyName: proxy.name,
                // backTo: `/gateway/proxy`,
                // backState: { selectedProxyDetail: proxy },
                returnTo: `/gateway/proxy/${proxy.name}`,
            }
        });
    };

    // Add function to fetch debug sessions from Apigee
    const fetchDebugSessions = async (orgName) => {
        if (!proxy?.name || !orgName) return;
        setLoadingDebugSessions(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxy.name}/debugsessions`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDebugSessions(data.debugSessions || []);
            } else {
                console.error('Failed to fetch debug sessions', res.status);
                setDebugSessions([]);
            }
        } catch (err) {
            console.error(err);
            setDebugSessions([]);
        } finally {
            setLoadingDebugSessions(false);
        }
    };
    const fetchDebugSessionData = async (session) => {
        if (!selectedOrg || !proxy?.name || !session) return;
        setLoadingTransactions(true);
        setDebugTransactions([]);
        setSelectedTransaction(null);
        try {
            const token = await fetchToken();
            if (!token) return;
            // session contains: name, environment, revision (from API response)
            const url = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/environments/${session.environment}/apis/${proxy.name}/revisions/${session.revision}/debugsessions/${session.name}/data`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch session data: ${response.status}`);
            const data = await response.json();
            // data is an array of transaction objects
            setDebugTransactions(data);
            if (data.length > 0) setSelectedTransaction(data[0]);
        } catch (err) {
            console.error('Error fetching debug session data:', err);
            showMessage(`Could not load transactions: ${err.message}`, 'error');
        } finally {
            setLoadingTransactions(false);
        }
    };

    const startDebugSession = async () => {
        if (!proxy?.name || !selectedOrg || !selectedRevision) {
            showMessage('Proxy name or organization missing', 'error');
            return;
        }
        setStartingDebugSession(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const payload = {
                name: `debug-${Date.now()}`,
                environment: debugEnv,
                revision: 17, // Consider fetching the actual deployed revision dynamically
            };
            const url = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/environments/${debugEnv}/apis/${proxy.name}/revisions/${selectedRevision}/debugsessions`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                showMessage('Debug session started successfully', 'success');
                setShowDebugForm(false);
                await fetchDebugSessions(selectedOrg);
            } else {
                const errText = await res.text();
                showMessage(`Failed to start debug session: ${errText}`, 'error');
            }
        } catch (err) {
            console.error(err);
            showMessage('Error starting debug session', 'error');
        } finally {
            setStartingDebugSession(false);
        }
    };
    useEffect(() => {
        if (activeTab === 'debug' && selectedOrg) {
            fetchDebugSessions(selectedOrg);
        }
    }, [selectedOrg, activeTab]);
    useEffect(() => {
        if (activeTab === 'debug' && debugEnv) {
            fetchRevisions(selectedOrg);
        }
    }, [debugEnv, activeTab]);

    // Fetch when debug tab becomes active
    useEffect(() => {
        if (activeTab === 'debug' && proxy?.name) {
            fetchDebugSessions();
        }
    }, [activeTab, proxy?.name]);


    const handleDeploy = async () => {
        if (!selectedOrg) {
            showMessage('No organization selected', 'error');
            return;
        }
        if (!deployEnv) {
            showMessage('Please select an environment', 'error');
            return;
        }
        let rev = deployRevision;
        if (deployMode === 'ci-cd' && !rev) {
            showMessage('Please select or enter an artifact version (revision)', 'error');
            return;
        }
        if (deployMode === 'direct' && !rev) {
            showMessage('Please select a revision to deploy', 'error');
            return;
        }

        setDeploying(true);
        try {
            const token = await fetchToken();
            if (!token) throw new Error('Failed to get access token');

            // API endpoint: POST /organizations/{org}/environments/{env}/apis/{api}/revisions/{rev}/deployments
            const url = `https://apigee.googleapis.com/v1/organizations/${selectedOrg}/environments/${deployEnv}/apis/${proxy.name}/revisions/${rev}/deployments?override=true`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                // Optional body: can include additional settings if needed
                body: JSON.stringify({ override: true }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Deployment successful:', result);
                showMessage(`Revision ${rev} deployed to ${deployEnv} successfully!`, 'success');
                resetDeployForm();
                setDeployModalOpen(false);
            } else {
                const errorText = await response.text();
                throw new Error(errorText || `Deployment failed with status ${response.status}`);
            }
        } catch (err) {
            console.error('Deploy error:', err);
            showMessage(`Deployment failed: ${err.message}`, 'error');
        } finally {
            setDeploying(false);
        }
    };

    // Dummy revisions data
    const revisions = [
        { revision: 17, extensible: 'Yes', description: 'Added LLM policies', lastModified: 'May 4, 2026', endpointSummary: 'View' },
        { revision: 16, extensible: 'Yes', description: 'Security updates', lastModified: 'May 3, 2026', endpointSummary: 'View' },
        { revision: 15, extensible: 'No', description: 'Bug fixes', lastModified: 'May 2, 2026', endpointSummary: 'View' },
        { revision: 14, extensible: 'Yes', description: 'Initial release', lastModified: 'May 1, 2026', endpointSummary: 'View' },
    ];

    const filteredRevisions = revisions.filter(r =>
        r.revision.toString().includes(revisionFilter) ||
        r.description.toLowerCase().includes(revisionFilter.toLowerCase())
    );
    const resetDeployForm = () => {
        setDeployRevision('');
        setDeployEnv('');
        setDeploySource('github'); // or keep default
    };

    const deployedRevisionsForEnv = useMemo(() => {
        if (!proxyDetails?.deployments?.deployments || !deployEnv) return new Set();
        const envDeployments = proxyDetails.deployments.deployments.filter(d => d.environment === deployEnv);
        return new Set(envDeployments.map(d => String(d.revision)));
    }, [proxyDetails?.deployments, deployEnv]);
    // ---- Debug Tab Content ----
    if (activeTab === 'debug') {
        const renderDebugContent = () => {
            // Show session detail view if a session is selected
            if (selectedDebugSession) {
                return (
                    <div className="flex gap-6">
                        {/* Back button & header */}
                        <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => {
                                        setSelectedDebugSession(null);
                                        setDebugTransactions([]);
                                        setSelectedTransaction(null);
                                    }}
                                    className="text-[#ff5b1f] rounded-md text-sm font-medium flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to sessions
                                </button>
                                <h3 className="text-base font-semibold">
                                    Debug Session: {selectedDebugSession.name}
                                </h3>
                            </div>

                            <div className="flex gap-6">
                                {/* Left column: Transactions list */}
                                <div className="w-1/3 bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
                                    <div className="p-3 border-b border-[#1f2840] bg-[#1a1f2e]">
                                        <h4 className="text-sm font-medium">Transactions</h4>
                                        <p className="text-xs text-[#5a6a8a] mt-1">
                                            New transactions may take time to appear in this table
                                        </p>
                                    </div>
                                    {loadingTransactions ? (
                                        <div className="p-6 text-center text-[#7f8fa8]">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            <p>Loading transactions...</p>
                                        </div>
                                    ) : debugTransactions.length === 0 ? (
                                        <div className="p-6 text-center text-[#7f8fa8]">
                                            <p>No transactions to display</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-[#1f2840]">
                                            {debugTransactions.map((tx, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 cursor-pointer hover:bg-[#1a1f2e] transition ${selectedTransaction === tx ? 'bg-[#1f2a3a] border-l-2 border-[#ff5b1f]' : ''
                                                        }`}
                                                    onClick={() => setSelectedTransaction(tx)}
                                                >
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-mono text-white">{tx.request?.verb || 'GET'}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.response?.statusCode >= 200 && tx.response?.statusCode < 300
                                                            ? 'bg-green-500/20 text-green-300'
                                                            : 'bg-red-500/20 text-red-300'
                                                            }`}>
                                                            {tx.response?.statusCode || '?'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-[#7f8fa8] truncate mt-1">
                                                        {tx.request?.url || tx.request?.path || '/'}
                                                    </div>
                                                    <div className="text-xs text-[#5a6a8a] mt-1">
                                                        {tx.elapsed ? `${tx.elapsed} ms` : '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right column: Transaction details */}
                                <div className="flex-1 bg-[#111520] rounded-xl border border-[#1f2840] p-4">
                                    {!selectedTransaction ? (
                                        <div className="flex flex-col items-center justify-center h-full text-[#7f8fa8]">
                                            <p>No transaction selected</p>
                                            <p className="text-sm mt-2">Select a transaction from the table to view a trace.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Request Section */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-2">Request</h4>
                                                <div className="bg-[#0f1117] rounded-lg p-3 font-mono text-xs text-[#7f8fa8] break-all">
                                                    <div><span className="text-[#4f8ef7]">{selectedTransaction.request?.verb || 'GET'}</span> {selectedTransaction.request?.url || selectedTransaction.request?.path}</div>
                                                    <div className="mt-2">
                                                        <span className="text-[#5a6a8a]">Headers:</span>
                                                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(selectedTransaction.request?.headers, null, 2) || '{}'}</pre>
                                                    </div>
                                                    {selectedTransaction.request?.body && (
                                                        <div className="mt-2">
                                                            <span className="text-[#5a6a8a]">Body:</span>
                                                            <pre className="mt-1 whitespace-pre-wrap">{typeof selectedTransaction.request.body === 'string' ? selectedTransaction.request.body : JSON.stringify(selectedTransaction.request.body, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Response Section */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
                                                <div className="bg-[#0f1117] rounded-lg p-3 font-mono text-xs text-[#7f8fa8] break-all">
                                                    <div>Status: <span className={selectedTransaction.response?.statusCode >= 200 && selectedTransaction.response?.statusCode < 300 ? 'text-green-400' : 'text-red-400'}>
                                                        {selectedTransaction.response?.statusCode || '?'}
                                                    </span></div>
                                                    <div className="mt-2">
                                                        <span className="text-[#5a6a8a]">Headers:</span>
                                                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(selectedTransaction.response?.headers, null, 2) || '{}'}</pre>
                                                    </div>
                                                    {selectedTransaction.response?.body && (
                                                        <div className="mt-2">
                                                            <span className="text-[#5a6a8a]">Body:</span>
                                                            <pre className="mt-1 whitespace-pre-wrap">{typeof selectedTransaction.response.body === 'string' ? selectedTransaction.response.body : JSON.stringify(selectedTransaction.response.body, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Optional Trace / Steps (if available) */}
                                            {selectedTransaction.trace && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-white mb-2">Trace</h4>
                                                    <div className="bg-[#0f1117] rounded-lg p-3 text-xs text-[#7f8fa8] overflow-auto max-h-60">
                                                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedTransaction.trace, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            // Default: show list of debug sessions and start form (existing layout)
            return (
                <div className="flex gap-6">
                    {/* Left column: recent sessions */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-semibold">Recent debug sessions</h3>
                            <button
                                onClick={() => setShowDebugForm(true)}
                                className="px-3 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm hover:bg-[#ff6b36]"
                            >
                                + Start debug session
                            </button>
                        </div>
                        {loadingDebugSessions ? (
                            <div className="bg-[#1a1f2e] rounded-xl p-8 text-center text-[#7f8fa8]">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                <p>Loading debug sessions...</p>
                            </div>
                        ) : debugSessions.length === 0 ? (
                            <div className="bg-[#1a1f2e] rounded-xl p-8 text-center text-[#7f8fa8]">
                                <p>No debug sessions found</p>
                                <p className="text-sm mt-2">Start a new debug session to troubleshoot</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {debugSessions.map(session => (
                                    <div key={session.id || session.name} className="bg-[#111520] border border-[#1f2840] rounded-lg p-3 flex justify-between items-center">
                                        <div>
                                            <div className="text-sm font-medium text-white">{session.name}</div>
                                            <div className="text-xs text-[#5a6a8a]">{session.createTime || session.created || 'Unknown date'}</div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedDebugSession(session);
                                                fetchDebugSessionData(session);
                                            }}
                                            className="text-[#4f8ef7] text-xs hover:underline"
                                        >
                                            View
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column: start debug form (unchanged) */}
                    {showDebugForm && (
                        <div className="w-80 bg-[#1a1f2e] border border-[#2a3550] rounded-xl p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-semibold">Start debug session</h4>
                                <button onClick={() => setShowDebugForm(false)} className="text-[#7f8fa8] hover:text-white">
                                    ✕
                                </button>
                            </div>
                            <div className="space-y-3">
                                {/* Organization Dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-[#5a6a8a] mb-1">
                                        Organization <span className="text-red-400">*</span>
                                    </label>
                                    {loadingOrgs ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-[#7f8fa8]">
                                            Loading organizations...
                                        </div>
                                    ) : organizations.length === 0 ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-red-400">
                                            No organizations available
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedOrg}
                                            onChange={(e) => setSelectedOrg(e.target.value)}
                                            className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#4f8ef7]"
                                        >
                                            {organizations.map((org) => (
                                                <option key={typeof org === 'string' ? org : JSON.stringify(org)} value={typeof org === 'string' ? org : ''}>
                                                    {typeof org === 'string' ? org : 'Invalid org'}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Environment Dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-[#5a6a8a] mb-1">
                                        Environment <span className="text-red-400">*</span>
                                    </label>
                                    {loadingEnvironments ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-[#7f8fa8]">
                                            Loading environments...
                                        </div>
                                    ) : availableEnvironments.length === 0 ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-red-400">
                                            No environments available
                                        </div>
                                    ) : (
                                        <select
                                            value={debugEnv}
                                            onChange={(e) => setDebugEnv(e.target.value)}
                                            className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#4f8ef7]"
                                        >
                                            <option value="" disabled>Select environment</option>
                                            {availableEnvironments.map((env) => (
                                                <option key={env} value={env}>{env}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Filter input (unchanged) */}
                                <div>
                                    <label className="block text-xs font-medium text-[#5a6a8a] mb-1">
                                        Revision <span className="text-red-400">*</span>
                                    </label>
                                    {loadingRevisions ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-[#7f8fa8]">
                                            Loading revisions...
                                        </div>
                                    ) : availableRevisions.length === 0 ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-red-400">
                                            No revisions deployed in this environment
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedRevision}
                                            onChange={(e) => setSelectedRevision(e.target.value)}
                                            className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#4f8ef7]"
                                        >
                                            <option value="">Select revision</option>
                                            {availableRevisions.map((rev) => (
                                                <option key={rev} value={rev}>
                                                    Revision {rev}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={startDebugSession}
                                        disabled={startingDebugSession}
                                        className="flex-1 px-3 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36] disabled:opacity-50"
                                    >
                                        {startingDebugSession ? 'Starting...' : 'Start'}
                                    </button>
                                    <button
                                        onClick={() => setShowDebugForm(false)}
                                        className="flex-1 px-3 py-1.5 bg-[#1a1f2e] border border-[#2a3550] text-white rounded-md text-sm hover:bg-[#22273b]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium">
                        <ArrowLeft />
                    </button>
                    <h2 className="text-xl font-semibold">{proxy.name}</h2>
                </div>
                <div className="border-b border-[#1f2840] mb-4">
                    <div className="flex gap-4">
                        {['Overview', 'Edit', 'Debug'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase()
                                    ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
                                    : 'text-[#7f8fa8] hover:text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                {renderDebugContent()}
            </div>
        );
    }

    // ---- Overview Tab (existing code) ----
    return (
        <>
        <div className="p-6">
            {/* Header with back button and proxy name */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium">
                        <ArrowLeft />
                    </button>
                    <h2 className="text-xl font-semibold">{proxy.name}</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setDeployModalOpen(true)} className="px-4 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36]">
                        Deploy
                    </button>
                    {/* <button onClick={onDuplicate} className="px-4 py-1.5 bg-[#1a1f2e] border border-[#2a3550] text-white rounded-md text-sm hover:bg-[#22273b]">Duplicate</button> */}
                    <button onClick={onDelete} className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-sm hover:bg-red-500/20">Undeploy</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#1f2840] mb-4">
                <div className="flex gap-4">
                    {['Overview', 'Edit', 'Debug'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`pb-2 px-1 text-sm font-medium transition ${activeTab === tab.toLowerCase()
                                ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]'
                                : 'text-[#7f8fa8] hover:text-white'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            {activeTab === 'overview' && (
                <>
                    {loadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-10 w-10 animate-spin text-[#ff5b1f]" />
                            <p className="mt-3 text-sm text-slate-400">Loading API details...</p>
                        </div>
                    ) : detailsError ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                            <p className="text-red-400 font-medium">Error loading details</p>
                            <p className="text-sm text-slate-400 mt-1">{detailsError}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff5b1f] text-sm font-medium hover:bg-[#ff5b1f]/20"
                            >
                                Retry
                            </button>
                        </div>
                    ) : proxyDetails ? (
                        <div className="space-y-6">
                            {/* ---- Two enhanced cards ---- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Proxy Summary Card */}
                                <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                                    <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
                                        <div className="flex items-center gap-2">
                                            <Server className="h-4 w-4 text-[#ff8a5c]" />
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">API Summary</h3>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">API Type</span>
                                            <span className="text-sm font-mono text-white bg-[#1a1f2e] px-2 py-0.5 rounded">
                                                {proxyDetails.proxy?.apiProxyType || 'Rest'}
                                            </span>
                                        </div>
                                        {/* <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Latest Revision</span>
                                            <span className="text-sm font-mono text-white bg-[#1a1f2e] px-2 py-0.5 rounded">
                                                {proxyDetails.proxy?.latestRevisionId || '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Total Revisions</span>
                                            <span className="text-sm font-mono text-white">{proxyDetails.revisions?.length || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Deployed Environments</span>
                                            <span className="text-sm font-mono text-white">
                                                {proxyDetails.deployments?.deployments?.length || 0}
                                            </span>
                                        </div> */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Created At</span>
                                            <span className="text-sm text-slate-300">
                                                {formatDate(proxyDetails.proxy?.metaData?.createdAt)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Created By</span>
                                            <span className="text-sm text-slate-300">
                                                {proxyDetails.proxy?.metaData?.createdBy || '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Last Modified At</span>
                                            <span className="text-sm text-slate-300">
                                                {formatDate(proxyDetails.proxy?.metaData?.lastModifiedAt)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Last Modified By</span>
                                            <span className="text-sm text-slate-300">
                                                {proxyDetails.proxy?.metaData?.lastModifiedBy || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Proxy Details Card - Simplified */}
                                <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                                    <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-[#ff8a5c]" />
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">API Details</h3>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">API URL</span>
                                            <span className="text-sm text-white text-right max-w-[60%] break-all">
                                                {getProxyUrl() || '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Base Path</span>
                                            <code className="font-mono text-sm text-[#4f8ef7] bg-[#0f1117] px-2 py-0.5 rounded">
                                                {getBasePath()}
                                            </code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-xs text-slate-400 flex-shrink-0 mt-1">Policies</span>
                                            <div className="flex flex-wrap gap-1.5 justify-end">
                                                {(() => {
                                                    const policies = getLatestRevisionData()?.policies || [];
                                                    if (policies.length === 0) return <span className="text-sm text-slate-500">—</span>;
                                                    return (
                                                        <>
                                                            {policies.slice(0, 3).map((p, i) => (
                                                                <span key={i} className="text-xs bg-[#2a3550] text-slate-300 px-2 py-0.5 rounded-full">{p}</span>
                                                            ))}
                                                            {policies.length > 3 && (
                                                                <button
                                                                    onClick={() => { setExpandedPoliciesRev(proxyDetails?.proxy?.latestRevisionId); setPolicySearch(""); }}
                                                                    className="text-xs bg-[#ff5b1f]/20 text-[#ff8a5c] px-2 py-0.5 rounded-full hover:bg-[#ff5b1f]/40 transition"
                                                                >
                                                                    +{policies.length - 3} more
                                                                </button>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">API Endpoint</span>
                                            <span className="text-sm text-white font-mono">/default</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Target Endpoint</span>
                                            <span className="text-sm text-white font-mono text-right max-w-[60%]">
                                                {getLatestRevisionData()?.targetServer
                                                    ? `Backend Service: ${getLatestRevisionData().targetServer}`
                                                    : (getLatestRevisionData()?.targetUrl || '/default')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Proxy Details Card */}
                                {/* <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                                    <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-[#ff8a5c]" />
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">API Details</h3>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 block mb-1">Base Path(s)</span>
                                            <div className="flex flex-wrap gap-2">
                                                {getLatestRevisionData()?.basepaths?.map((path, idx) => (
                                                    <code key={idx} className="text-sm bg-[#1a1f2e] px-2 py-1 rounded text-[#4f8ef7]">
                                                        {path}
                                                    </code>
                                                )) || <span className="text-sm text-slate-500">—</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 block mb-1">Configuration Version</span>
                                            <span className="text-sm text-white">
                                                v{getLatestRevisionData()?.configurationVersion?.majorVersion || '?'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 block mb-1">Policies</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {getLatestRevisionData()?.policies?.map((policy, idx) => (
                                                    <span key={idx} className="text-xs bg-[#2a3550] text-slate-200 px-2 py-0.5 rounded-full">
                                                        {policy}
                                                    </span>
                                                )) || <span className="text-sm text-slate-500">No policies defined</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div> */}
                            </div>

                            {/* ---- Deployments Section (Card style) ---- */}
                            <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                                <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Rocket className="h-4 w-4 text-[#ff8a5c]" />
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Deployments</h3>
                                    </div>
                                    <Badge variant="outline" className="text-xs border-[#2a3550] text-slate-400">
                                        {proxyDetails.deployments?.deployments?.length || 0} active
                                    </Badge>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
                                            <tr>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Environment</th>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Deployment Type</th>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Deployed At</th>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proxyDetails.deployments?.deployments?.length > 0 ? (
                                                proxyDetails.deployments.deployments.map((dep, idx) => (
                                                    <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
                                                        <td className="p-3 font-mono text-white">{dep.environment}</td>
                                                        <td className="p-3 font-mono text-white">{dep.revision}</td>
                                                        <td className="p-3">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-300">
                                                                <CheckCircle className="h-3 w-3" /> {dep.proxyDeploymentType || 'EXTENSIBLE'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-slate-400">{formatDate(dep.deployStartTime)}</td>
                                                        <td className="p-3">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-300">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                                        <Archive className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                                                        <p>No deployments found</p>
                                                        <p className="text-xs mt-1">Deploy a revision to see it here</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ---- Revisions Section with enhanced table ---- */}
                            <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                                <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50 flex justify-between items-center flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        <History className="h-4 w-4 text-[#ff8a5c]" />
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Revisions</h3>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Filter revisions or policies..."
                                            value={revisionFilter}
                                            onChange={(e) => setRevisionFilter(e.target.value)}
                                            className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-8 pr-3 py-1.5 text-sm w-56 focus:outline-none focus:border-[#ff5b1f] text-white"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
                                            <tr>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
                                                {/* <th className="text-left p-3 text-[#5a6a8a] font-medium">Extensible</th> */}
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Policies</th>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Last Modified</th>
                                                <th className="text-left p-3 text-[#5a6a8a] font-medium">Base Path</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* {proxyDetails.revisionDetails
                                                ?.filter(revDetail => {
                                                    const rev = revDetail.revision;
                                                    const policies = revDetail.data?.policies?.join(', ') || '';
                                                    return rev.toString().includes(revisionFilter) ||
                                                        policies.toLowerCase().includes(revisionFilter.toLowerCase());
                                                })
                                                .map((revDetail, idx) => { */}
                                            {[...proxyDetails.revisionDetails]
                                                ?.filter(revDetail => {
                                                    const rev = revDetail.revision;
                                                    const policies = revDetail.data?.policies?.join(', ') || '';
                                                    return rev.toString().includes(revisionFilter) ||
                                                        policies.toLowerCase().includes(revisionFilter.toLowerCase());
                                                })
                                                .sort((a, b) => b.revision - a.revision)   //sort descending (latest first)
                                                .map((revDetail, idx) => {
                                                    const rev = revDetail.revision;
                                                    const data = revDetail.data;
                                                    const isLatest = rev === proxyDetails.proxy?.latestRevisionId;
                                                    return (
                                                        <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-white font-medium">{rev}</span>
                                                                    {isLatest && (
                                                                        <span className="text-[10px] bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full font-medium">
                                                                            Latest
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {/* <td className="p-3">
                                                                {data?.hasExtensiblePolicy ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                                                        <Check className="h-3 w-3" /> Yes
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-500 text-xs">No</span>
                                                                )}
                                                            </td> */}
                                                            {/* <td className="p-3">
                                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                                    {data?.policies?.length > 0 ? (
                                                                        data.policies.slice(0, 3).map((p, i) => (
                                                                            <span key={i} className="text-xs bg-[#2a3550] text-slate-300 px-1.5 py-0.5 rounded-full">
                                                                                {p}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-slate-500 text-xs">—</span>
                                                                    )}
                                                                    {data?.policies?.length > 3 && (
                                                                        <span className="text-xs text-slate-400">+{data.policies.length - 3}</span>
                                                                    )}
                                                                </div>
                                                            </td> */}
                                                            <td className="p-3">
                                                                <div className="flex flex-wrap gap-1 max-w-xs items-center">
                                                                    {data?.policies?.length > 0 ? (
                                                                        <>
                                                                            {data.policies.slice(0, 3).map((p, i) => (
                                                                                <span key={i} className="text-xs bg-[#2a3550] text-slate-300 px-1.5 py-0.5 rounded-full">
                                                                                    {p}
                                                                                </span>
                                                                            ))}
                                                                            {data.policies.length > 3 && (
                                                                                <button
                                                                                    onClick={() => { setExpandedPoliciesRev(rev); setPolicySearch("") }}
                                                                                    className="text-xs bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full hover:bg-[#ff5b1f]/40 transition"
                                                                                >
                                                                                    +{data.policies.length - 3}
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-slate-500 text-xs">—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-slate-400 text-xs">{formatDate(data?.lastModifiedAt)}</td>
                                                            <td className="p-3">
                                                                <code className="text-xs text-[#4f8ef7] bg-[#0f1117] px-2 py-1 rounded">
                                                                    {data?.basepaths?.[0] || '/'}
                                                                </code>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            {(!proxyDetails.revisionDetails || proxyDetails.revisionDetails.length === 0) && (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                                        <Layers className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                                                        <p>No revisions available</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Attractive Modal – Fixed with top-level state */}
                                {expandedPoliciesRev !== null && (() => {
                                    const revDetail = proxyDetails?.revisionDetails?.find(rd => rd.revision === expandedPoliciesRev);
                                    const allPolicies = revDetail?.data?.policies || [];
                                    const filteredPolicies = allPolicies.filter(p =>
                                        p.toLowerCase().includes(policySearch.toLowerCase())
                                    );

                                    return (
                                        <div
                                            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                                            onClick={(e) => {
                                                if (e.target === e.currentTarget) {
                                                    setExpandedPoliciesRev(null);
                                                    setPolicySearch('');
                                                }
                                            }}
                                        >
                                            <div className="w-full max-w-2xl bg-gradient-to-br from-[#111520] to-[#0a0e18] rounded-2xl border border-[#2a3550] shadow-2xl shadow-black/50 overflow-hidden">
                                                {/* Header */}
                                                <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-[#ff5b1f]/10 via-transparent to-transparent border-b border-[#2a3550]">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg shadow-[#ff5b1f]/30">
                                                                <Layers className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                                                    Policies · Revision {expandedPoliciesRev}
                                                                </h3>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    {allPolicies.length} policy{allPolicies.length !== 1 ? 'ies' : ''} defined
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setExpandedPoliciesRev(null);
                                                                setPolicySearch('');
                                                            }}
                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Search Bar */}
                                                <div className="px-6 pt-4 pb-2">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="text"
                                                            placeholder="Filter policies..."
                                                            value={policySearch}
                                                            onChange={(e) => setPolicySearch(e.target.value)}
                                                            className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff5b1f] focus:ring-1 focus:ring-[#ff5b1f]/50 transition"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Policy List */}
                                                <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                    {filteredPolicies.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                                            <FileText className="h-12 w-12 text-slate-600 mb-3" />
                                                            <p className="text-slate-400 font-medium">No policies found</p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {policySearch ? 'Try a different filter' : 'This revision has no policies'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-3">
                                                            {filteredPolicies.map((policy, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="group flex items-start gap-3 p-3 rounded-xl bg-[#1a1f2e]/50 border border-[#2a3550] hover:bg-[#1f2a3a] hover:border-[#ff5b1f]/30 transition-all duration-200"
                                                                >
                                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff5b1f]/10 text-[#ff8a5c] text-xs font-mono font-bold">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <code className="text-sm font-mono text-slate-200 break-all group-hover:text-white transition">
                                                                            {policy}
                                                                        </code>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => navigator.clipboard.writeText(policy)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                                                                        title="Copy policy name"
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="flex justify-end px-6 py-4 border-t border-[#2a3550] bg-black/20">
                                                    <button
                                                        onClick={() => {
                                                            setExpandedPoliciesRev(null);
                                                            setPolicySearch('');
                                                        }}
                                                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5b1f] to-[#ff7a3f] text-sm font-medium text-white shadow-lg shadow-[#ff5b1f]/20 hover:shadow-[#ff5b1f]/40 transition-all"
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            {/* Configuration Overview Section */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Network className="h-5 w-5 text-[#ff8a5c]" />
                                    <h3 className="text-base font-semibold text-white">Configuration Overview</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Backend Service */}
                                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-xl border border-[#2a3550] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Server className="h-4 w-4 text-emerald-400" />
                                            <h4 className="text-sm font-semibold text-white">Backend Service</h4>
                                        </div>
                                        <p className="text-sm text-slate-300 break-all">
                                            {getLatestRevisionData()?.targetUrl || getLatestRevisionData()?.targetServer || 'Not configured'}
                                        </p>
                                    </div>

                                    {/* KVM */}
                                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-xl border border-[#2a3550] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Key className="h-4 w-4 text-purple-400" />
                                            <h4 className="text-sm font-semibold text-white">KVM</h4>
                                        </div>
                                        <p className="text-sm text-slate-400">Not configured</p>
                                    </div>

                                    {/* Product */}
                                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-xl border border-[#2a3550] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package className="h-4 w-4 text-amber-400" />
                                            <h4 className="text-sm font-semibold text-white">Product</h4>
                                        </div>
                                        <p className="text-sm text-slate-400">Not configured</p>
                                    </div>

                                    {/* App */}
                                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-xl border border-[#2a3550] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Database className="h-4 w-4 text-sky-400" />
                                            <h4 className="text-sm font-semibold text-white">App</h4>
                                        </div>
                                        <p className="text-sm text-slate-400">Not configured</p>
                                    </div>

                                    {/* Developer */}
                                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-xl border border-[#2a3550] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-indigo-400" />
                                            <h4 className="text-sm font-semibold text-white">Developer</h4>
                                        </div>
                                        <p className="text-sm text-slate-300">
                                            {proxyDetails?.proxy?.metaData?.createdBy || proxyDetails?.proxy?.metaData?.lastModifiedBy || '—'}
                                        </p>
                                    </div>

                                    {/* OpenAPI Specification - simplified: only name, preview, download */}
                                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-xl border border-[#2a3550] p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileJson className="h-4 w-4 text-pink-400" />
                                            <h4 className="text-sm font-semibold text-white">OpenAPI Specification</h4>
                                        </div>
                                        {(() => {
                                            const spec = forgesphereInfo?.resource?.apiDesign?.specMetadata;
                                            if (spec) {
                                                return (
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-slate-300 truncate">{spec?.specName}</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleViewSpec(spec.id, spec.fileName, spec.specName)}
                                                                className="px-2 py-1 text-xs rounded-md bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition flex items-center gap-1"
                                                            >
                                                                <Eye className="h-3 w-3" /> Documentation
                                                            </button>
                                                            <button
                                                                onClick={() => downloadSpecFile(spec.id, spec.fileName)}
                                                                className="px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition flex items-center gap-1"
                                                            >
                                                                <Download className="h-3 w-3" /> Download
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return <p className="text-sm text-slate-400">No OpenAPI spec found</p>;
                                        })()}
                                    </div>
                                </div>
                            </div>
                            {proxy?.source === 'LIFECYCLE_TOOL' && <ForgesfereInfoCard
                                loading={loadingForgesfere}
                                error={forgesphereError}
                                data={forgesphereInfo}
                            />}
                        </div>
                    ) : null}
                </>
            )}

            {/* Deployment Modal */}
            {deployModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-[#111520] border border-[#27314e] rounded-xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-[#27314e] bg-[#0f172a]">
                            <h3 className="text-lg font-semibold text-white">Deploy Proxy</h3>
                            <button
                                onClick={() => setDeployModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Deployment Mode Toggle */}
                            <div className="flex gap-2 bg-[#1a1f2e] rounded-lg p-1">
                                <button
                                    onClick={() => setDeployMode('ci-cd')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${deployMode === 'ci-cd'
                                        ? 'bg-[#ff5b1f] text-white'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    CI/CD Pipeline
                                </button>
                                <button
                                    onClick={() => setDeployMode('direct')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${deployMode === 'direct'
                                        ? 'bg-[#ff5b1f] text-white'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Direct Deploy
                                </button>
                            </div>

                            {/* Proxy Name (readonly) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Proxy Name
                                </label>
                                <input
                                    type="text"
                                    value={proxy.name}
                                    readOnly
                                    className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white cursor-not-allowed"
                                />
                            </div>
                            {/* Artifact Source (only for CI/CD mode) */}
                            {deployMode === 'ci-cd' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Artifact source *
                                    </label>
                                    <select
                                        value={deploySource}
                                        onChange={(e) => setDeploySource(e.target.value)}
                                        className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
                                    >
                                        <option value="github">GitHub</option>
                                        <option value="artifactory">Artifact Registry</option>
                                    </select>
                                </div>
                            )}

                            {/* Revision / Artifact Version */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    {deployMode === 'ci-cd' ? 'Artifact Version *' : 'Revision *'}
                                </label>
                                {deployMode === 'ci-cd' ? (
                                    <input
                                        type="text"
                                        placeholder="e.g., 17"
                                        value={deployRevision}
                                        onChange={(e) => setDeployRevision(e.target.value)}
                                        className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
                                    />
                                ) : (
                                    loadingDetails ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-slate-400">
                                            Loading revisions...
                                        </div>
                                    ) : (!proxyDetails?.revisionDetails || proxyDetails.revisionDetails.length === 0) ? (
                                        <div className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-amber-400">
                                            No revisions available
                                        </div>
                                    ) : (
                                        <select
                                            value={deployRevision}
                                            onChange={(e) => setDeployRevision(e.target.value)}
                                            className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
                                        >
                                            <option value="">Select revision</option>
                                            {[...proxyDetails.revisionDetails]
                                                .sort((a, b) => b.revision - a.revision)
                                                .map(revDetail => {
                                                    const rev = revDetail.revision;
                                                    // Active if this revision is deployed to the selected environment
                                                    const isActive = proxyDetails?.deployments?.deployments?.some(
                                                        dep => dep.environment === deployEnv && String(dep.revision) === String(rev)
                                                    ) || false;
                                                    return (
                                                        <option key={rev} value={rev}>
                                                            Revision {rev} {isActive ? '(active)' : '(active)'}
                                                        </option>
                                                    );
                                                })}
                                        </select>
                                    )
                                )}
                            </div>

                            {/* Environment */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Environment *
                                </label>
                                <select
                                    value={deployEnv}
                                    onChange={(e) => setDeployEnv(e.target.value)}
                                    className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
                                >
                                    <option value="">Select environment</option>
                                    {availableEnvironments.map(env => (
                                        <option key={env} value={env}>{env}</option>
                                    ))}
                                </select>
                            </div>


                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#0f172a]">
                            <button
                                onClick={() => setDeployModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-[#2a3550] text-sm text-slate-300 hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeploy}
                                disabled={deploying}
                                className="px-4 py-2 rounded-md bg-[#ff5b1f] text-sm font-medium text-white hover:bg-[#ff6b36] disabled:opacity-50"
                            >
                                {deploying ? 'Deploying...' : 'Deploy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {viewSpecOpen && viewSpecData && (
            <ViewSpecModal
                spec={viewSpecData}
                onClose={() => { setViewSpecOpen(false); setViewSpecData(null); }}
            />
        )}
        </>
    );
};