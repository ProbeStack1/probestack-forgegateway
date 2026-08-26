// src/components/Gateway/ProxiesView.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Eye, Copy, GitBranch, ArchiveIcon, Plus, Search, Loader2,
    AlertCircle, X, CheckCircle, Trash2Icon, FileText, ArrowRight, FileCode2, ChevronDown
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { fetchApigeeBreakdown } from "../../services/apigeeStatsService";
import { GatewayContextSelector } from "./GatewayContextSelector";
import JSZip from "jszip";
import { PaginationControls } from "../../components/ui/PaginationControls";
import CreateTargetServerModal from "../Apigee/components/TargetServer/CreateTargetServerModal";
import { getTrackingHeaders, loadApigeeOnboardingOptions, getFallbackOnboardingId } from "../Apigee/components/apigeeTracking";
import API_BASE_URL from "../../config/apiConfig";
import { getProjects, getApplications } from "../../http-service/onboardingApi";
import { POLICY_TYPE_TO_ELEMENT, MINIMAL_POLICY_XML, policyResourceFile, flattenPolicyLibrary } from "../../config/policyLibrary";

// Two "base" shared flows every org ships with — never offered as a "Recommended"
// framework since attaching a framework to itself/the base AI Gateway framework is meaningless.
const EXCLUDED_RECOMMENDED_FRAMEWORKS = ["API-Runtime-Framework-V1", "SF-AIGatewayFramework-V1"];
const POLICY_LIBRARY_FLAT = flattenPolicyLibrary();

// Apigee error responses are a JSON envelope ({ error: { message, details: [{ violations }] } })
// buried inside the fetch response's text body — surface the specific violation (e.g. which
// proxy/revision owns a conflicting base path) instead of dumping the whole JSON blob at the user.
const parseApigeeErrorMessage = (text) => {
    try {
        const parsed = JSON.parse(text);
        const violation = parsed?.error?.details?.flatMap((d) => d.violations || [])?.[0];
        return violation?.description || parsed?.error?.message || text;
    } catch {
        return text;
    }
};

// Mirrors APIDeploy.jsx's DeployPathCard visual language for the "how should this
// be applied" chooser (Management API vs CI/CD Pipeline) shown after Create Proxy.
const DeployModeCard = ({ active, title, description, detail, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "rounded-xl border p-4 text-left transition",
            active
                ? "border-[#ff5b1f]/50 bg-[#ff5b1f]/10 shadow-[0_16px_36px_rgba(255,91,31,0.12)]"
                : "border-[#27314e] bg-[#0f1117]/60 hover:border-[#3a4668] hover:bg-[#151a2b]"
        )}
    >
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-400">{description}</p>
        {detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}
    </button>
);

export const ProxiesView = ({ showMessage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const proxyBasePath = location.pathname.startsWith('/fs-gateway') ? '/fs-gateway' : '/gateway';
    const [searchTerm, setSearchTerm] = useState("");
    const [apiTypeFilter, setApiTypeFilter] = useState("ALL");
    const [apiProxies, setApiProxies] = useState([]);
    const [loadingProxies, setLoadingProxies] = useState(false);
    const [proxiesError, setProxiesError] = useState(null);
    const [selectedOrg, setSelectedOrg] = useState("");
    const [selectedBU, setSelectedBU] = useState("");
    const [selectedEnv, setSelectedEnv] = useState("ALL");
    const [version, setVersion] = useState("");

    // Environment / Project / Application selection — entirely local to the Create
    // Proxy dialog. Deliberately independent of the page-level GatewayContextSelector
    // (BU/Project/Env there are for filtering the list, not for driving what gets created).
    const [createProxyEnv, setCreateProxyEnv] = useState("");
    const [createProxyProjects, setCreateProxyProjects] = useState([]);
    const [loadingCreateProxyProjects, setLoadingCreateProxyProjects] = useState(false);
    const [selectedCreateProxyProjectId, setSelectedCreateProxyProjectId] = useState("");
    const [createProxyApplications, setCreateProxyApplications] = useState([]);
    const [loadingCreateProxyApplications, setLoadingCreateProxyApplications] = useState(false);
    const [selectedCreateProxyApplicationId, setSelectedCreateProxyApplicationId] = useState("");

    const selectedCreateProxyProject = createProxyProjects.find((p) => p.id === selectedCreateProxyProjectId) || null;
    const selectedCreateProxyApplication = createProxyApplications.find((a) => a.id === selectedCreateProxyApplicationId) || null;
    // Derive first-4-char prefix from the selected application's name
    const appPrefix = selectedCreateProxyApplication?.name
        ? selectedCreateProxyApplication.name.slice(0, 4).toLowerCase().replace(/[^a-z0-9]/g, "") + "-"
        : "";

    // Pagination
    const [proxyPage, setProxyPage] = useState(1);
    const [proxyPageSize, setProxyPageSize] = useState(10);

    // Traffic column (per-proxy request count over a selectable time range)
    const [trafficRange, setTrafficRange] = useState("1 day");
    const [trafficByProxy, setTrafficByProxy] = useState({});
    // When no single environment is selected, traffic is broken down per-env instead:
    // { [proxyName]: [{ env, count }, ...] } sorted by count descending.
    const [trafficByProxyPerEnv, setTrafficByProxyPerEnv] = useState({});
    const [trafficLoading, setTrafficLoading] = useState(false);

    // Create Proxy Modal State
    const defaultCreateProxyModal = {
        open: false,
        template: "reverse",
        name: "",
        basePath: "/",
        description: "",
        targetUrl: "",
        zipFile: null,
        deploymentEnvs: [],
        resources: [{ method: "GET", path: "" }],
        // Attach Frameworks: "recommended" (curated framework shared flows) / "custom"
        // (any global function) / "policy" (hand-picked policies) — mutually exclusive.
        // frameworkAttachment resolves onto the ProxyEndpoint's PreFlow (client-facing
        // side); backendFrameworkAttachment resolves onto the TargetEndpoint's PreFlow
        // (backend-facing side) — same shape, different Apigee flow lane.
        frameworkAttachment: { mode: "recommended", framework: "", policies: [] },
        backendFrameworkAttachment: { mode: "recommended", framework: "", policies: [] },
        apiType: "REST",
        openApiSpecFile: null,
        specParsed: false,
        specError: null,
    };
    const [createProxyModal, setCreateProxyModal] = useState(defaultCreateProxyModal);
    const resetCreateProxyModal = () => setCreateProxyModal({ ...defaultCreateProxyModal });
    // Deployment-mode chooser ("Management API" vs "CI/CD Pipeline") shown after the
    // Create Proxy form, Apigee X context only — mirrors APIDeploy.jsx's promote/rollback chooser.
    const [deployModeStep, setDeployModeStep] = useState(false);
    const [deployMode, setDeployMode] = useState("cicd"); // "direct" | "cicd"
    const [availableCreateEnvs, setAvailableCreateEnvs] = useState([]);
    const [loadingCreateEnvs, setLoadingCreateEnvs] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({ name: "", basePath: "", version: "" });
    const [editorModalOpen, setEditorModalOpen] = useState(false);
    const [editorProxyName, setEditorProxyName] = useState("");
    const [editorError, setEditorError] = useState("");
    const [editorSubmitting, setEditorSubmitting] = useState(false);

    // NEW: Backend selection (Existing / New)
    const [backendOption, setBackendOption] = useState("existing"); // "existing" or "new"
    const [showTargetServerModal, setShowTargetServerModal] = useState(false);
    const [onboardingOptions, setOnboardingOptions] = useState([]);
    const [isFetchingOnboardings, setIsFetchingOnboardings] = useState(false);
    const [defaultOnboardingId, setDefaultOnboardingId] = useState("");
    const [defaultMicroserviceId, setDefaultMicroserviceId] = useState("");
    // Product selection
    const [productOption, setProductOption] = useState("existing"); // "existing" or "new"
    const [selectedProducts, setSelectedProducts] = useState([]);   // array of product names
    const [availableProducts, setAvailableProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [newProductData, setNewProductData] = useState({
        name: "", displayName: "", description: "", environment: "",
        accessType: "private", autoApprove: false,
    });

    // Existing target servers list & selected one
    const [targetServers, setTargetServers] = useState([]);
    const [selectedTargetServer, setSelectedTargetServer] = useState("");
    const [loadingTargetServers, setLoadingTargetServers] = useState(false);
    const [targetServerApp, setTargetServerApp] = useState(null); // { name, id, onboardingId }

    // Global Functions (Apigee shared flows) — source list for the "Attach Frameworks"
    // Recommended/Custom Framework dropdowns.
    const [globalFunctions, setGlobalFunctions] = useState([]);
    const [loadingGlobalFunctions, setLoadingGlobalFunctions] = useState(false);

    const fetchGlobalFunctions = async () => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        if (!effectiveOrg) return;
        setLoadingGlobalFunctions(true);
        try {
            const token = await fetchApigeeToken();
            const res = await fetch(
                `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/sharedflows/details`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error(`Failed to fetch global functions: ${res.statusText}`);
            const data = await res.json();
            setGlobalFunctions(data.sharedFlows || []);
        } catch (err) {
            console.error("Failed to fetch global functions", err);
            setGlobalFunctions([]);
        } finally {
            setLoadingGlobalFunctions(false);
        }
    };

    // Recommended frameworks: any global function whose name identifies it as a
    // framework, excluding the two base frameworks every org already ships with.
    const recommendedFrameworks = useMemo(
        () => globalFunctions.filter((sf) =>
            sf.name?.toLowerCase().includes("framework") && !EXCLUDED_RECOMMENDED_FRAMEWORKS.includes(sf.name)
        ),
        [globalFunctions]
    );

    const fetchProductsList = async () => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        if (!effectiveOrg) return;
        setLoadingProducts(true);
        try {
            const token = await fetchApigeeToken();
            const url = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            const productNames = data.apiProduct?.map(p => p.name) || [];
            setAvailableProducts(productNames);
        } catch (err) {
            console.error("Failed to fetch products", err);
            setAvailableProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Fetch when modal opens and org changes
    useEffect(() => {
        if (createProxyModal.open && productOption === "existing" && selectedOrg) {
            fetchProductsList();
        }
    }, [createProxyModal.open, productOption, selectedOrg]);

    // Fetch global functions (shared flows) whenever the Create API dialog is open and
    // an org is selected — feeds both the Recommended and Custom Framework dropdowns.
    useEffect(() => {
        if (createProxyModal.open && selectedOrg) {
            fetchGlobalFunctions();
        }
    }, [createProxyModal.open, selectedOrg]);

    // const createNewProduct = async () => {
    //     const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
    //     const payload = {
    //         name: newProductData.name,
    //         displayName: newProductData.displayName || newProductData.name,
    //         description: newProductData.description,
    //         accessType: newProductData.accessType,
    //         approvalType: newProductData.autoApprove ? "auto" : "manual",
    //         scopes: [],
    //     };
    //     try {
    //         const token = await fetchApigeeToken();
    //         const url = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts`;
    //         const res = await fetch(url, {
    //             method: "POST",
    //             headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    //             body: JSON.stringify(payload),
    //         });
    //         if (!res.ok) {
    //             const error = await res.json();
    //             throw new Error(error.error?.message || `HTTP ${res.status}`);
    //         }
    //         const product = await res.json();
    //         // Add to available list
    //         setAvailableProducts(prev => [...prev, product.name]);
    //         // Auto‑select this new product (check the checkbox)
    //         setSelectedProducts(prev => [...prev, product.name]);
    //         // Switch back to "Existing" radio but keep the product selected
    //         setProductOption("existing");
    //         setProductModalOpen(false);
    //         showMessage(`Product "${product.name}" created successfully`, "success");
    //     } catch (err) {
    //         showMessage(`Product creation failed: ${err.message}`, "error");
    //     }
    // };
    const createNewProduct = async () => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        const payload = {
            name: newProductData.name,
            displayName: newProductData.displayName || newProductData.name,
            description: newProductData.description,
            approvalType: newProductData.autoApprove ? "auto" : "manual",
            scopes: [],
        };
        try {
            const token = await fetchApigeeToken();
            const url = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts`;
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error?.message || `HTTP ${res.status}`);
            }
            const product = await res.json();
            setAvailableProducts(prev => [...prev, product.name]);
            setSelectedProducts(prev => [...prev, product.name]);
            setProductOption("existing");
            setProductModalOpen(false);
            showMessage(`Product "${product.name}" created successfully`, "success");
        } catch (err) {
            showMessage(`Product creation failed: ${err.message}`, "error");
        }
    };
    const addProxyToProduct = async (productName, proxyName, basePath) => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            // 1. Fetch existing product
            const getUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts/${productName}`;
            const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (!getRes.ok) throw new Error(`Cannot fetch product ${productName}`);
            const product = await getRes.json();

            // 2. Remove the "proxies" field (read‑only, not allowed in PUT)
            delete product.proxies;

            // 3. Append new operation
            const newOperation = {
                apiSource: proxyName,
                operations: [{ resource: basePath, methods: ["GET", "POST", "PUT", "DELETE"] }]
            };
            if (!product.operationGroup) product.operationGroup = { operationConfigs: [] };
            const existing = product.operationGroup.operationConfigs.find(c => c.apiSource === proxyName);
            if (!existing) {
                product.operationGroup.operationConfigs.push(newOperation);
            }

            // 4. Update product
            const putUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts/${productName}`;
            const putRes = await fetch(putUrl, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(product),
            });
            if (!putRes.ok) throw new Error(`Failed to update product ${productName}`);
            return true;
        } catch (err) {
            console.error(`Error adding proxy to product ${productName}:`, err);
            throw err;
        }
    };
    // const addProxyToProduct = async (productName, proxyName, basePath) => {
    //     const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
    //     try {
    //         const token = await fetchApigeeToken();
    //         // 1. Fetch existing product
    //         const getUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts/${productName}`;
    //         const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
    //         if (!getRes.ok) throw new Error(`Cannot fetch product ${productName}`);
    //         const product = await getRes.json();
    //         // 2. Append new operation (if not already present)
    //         const newOperation = {
    //             apiSource: proxyName,
    //             operations: [{ resource: basePath,path: "/", methods: ["GET", "POST", "PUT", "DELETE"] }] // or just ["*"]
    //         };
    //         if (!product.operationGroup) product.operationGroup = { operationConfigs: [] };
    //         const existing = product.operationGroup.operationConfigs.find(c => c.apiSource === proxyName);
    //         if (!existing) {
    //             product.operationGroup.operationConfigs.push(newOperation);
    //         }
    //         // 3. Update product
    //         const putUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apiproducts/${productName}`;
    //         const putRes = await fetch(putUrl, {
    //             method: "PUT",
    //             headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    //             body: JSON.stringify(product),
    //         });
    //         if (!putRes.ok) throw new Error(`Failed to update product ${productName}`);
    //         return true;
    //     } catch (err) {
    //         console.error(`Error adding proxy to product ${productName}:`, err);
    //         throw err;
    //     }
    // };

    // Application for the "New Backend" flow — always the Application chosen inside
    // the Create Proxy dialog itself (no page-level fallback).
    const fetchBusinessUnitApplication = async () => {
        if (!selectedCreateProxyApplication) return null;
        return {
            name: selectedCreateProxyApplication.name,
            id: selectedCreateProxyApplication.id,
            onboardingId: defaultOnboardingId || getFallbackOnboardingId(),
        };
    };

    // When "New" radio is selected, fetch and open modal
    const handleNewBackendClick = async () => {
        setBackendOption("new");
        const app = await fetchBusinessUnitApplication();
        if (!app) {
            showMessage("Please select a Project and Application above first.", "error");
            setBackendOption("existing");
            return;
        }
        setTargetServerApp(app);
        setShowTargetServerModal(true);
    };

    // Helper: generate a base path from the proxy name + version, e.g. "my-api" + "v1" -> "/my-api/v1"
    const generateBasePathFromNameAndVersion = (name, ver) => {
        const clean = (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!clean) return "/";
        const cleanVer = (ver || "").trim().toLowerCase().replace(/[^a-z0-9.]+/g, "");
        return cleanVer ? `/${clean}/${cleanVer}` : `/${clean}`;
    };

    const handleProxyNameChange = (e) => {
        let value = e.target.value;
        if (/\s/.test(value)) {
            showMessage("API name cannot contain spaces.", "error");
            return;
        }
        // Enforce the application prefix — user cannot remove it
        if (appPrefix && !value.startsWith(appPrefix)) {
            value = appPrefix;
        }
        setCreateProxyModal(prev => ({ ...prev, name: value }));
    };

    const handleProxyNameBlur = () => {
        const nameVal = createProxyModal.name.trim();
        const nameError = (!nameVal || nameVal === appPrefix) ? "API name is required." : "";
        setFieldErrors(prev => ({ ...prev, name: nameError }));
    };

    // Auto-fill Base Path from the API name + version the moment the user focuses it,
    // so there's no need to type the full path by hand.
    const handleBasePathFocus = () => {
        const current = createProxyModal.basePath;
        if (!current || current === "/") {
            const generated = generateBasePathFromNameAndVersion(createProxyModal.name, version);
            if (generated !== "/") {
                setCreateProxyModal(prev => ({ ...prev, basePath: generated }));
            }
        }
    };

    const handleBasePathBlur = () => {
        const err = !createProxyModal.basePath.trim() ? "Base path is required." : "";
        setFieldErrors(prev => ({ ...prev, basePath: err }));
    };

    const handleVersionBlur = () => {
        let err = "";
        if (!version.trim()) err = "Version is required.";
        else if (!/v/i.test(version.trim())) err = "Version must contain the letter 'v' (e.g., v1, v2).";
        setFieldErrors(prev => ({ ...prev, version: err }));
    };

    // Fetch environments for create modal
    const fetchCreateEnvironments = async () => {
        if (!selectedOrg) return;
        setLoadingCreateEnvs(true);
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/environments`;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                setAvailableCreateEnvs(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCreateEnvs(false);
        }
    };

    // Reset page when filters change
    useEffect(() => {
        setProxyPage(1);
    }, [searchTerm, apiTypeFilter, selectedEnv]);

    // Fetch proxies
    const fetchProxies = async () => {
        setLoadingProxies(true);
        setProxiesError(null);
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            const response = await fetch(
                `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/details`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error(`Failed to fetch proxies: ${response.statusText}`);
            const data = await response.json();
            setApiProxies(data.proxies || []);
        } catch (err) {
            showMessage(`Could not load proxies: ${err.message}`, "error");
            setApiProxies([]);
        } finally {
            setLoadingProxies(false);
        }
    };

    useEffect(() => {
        if (selectedOrg) fetchProxies();
    }, [selectedOrg]);

    // Fetch traffic (request counts) per proxy for the selected time range.
    // With a concrete environment picked, this is a single breakdown query. With
    // "All Environments" selected, analytics can't be aggregated server-side across
    // envs, so query every env in parallel and keep the per-env split for display.
    const fetchProxyTraffic = async () => {
        if (!selectedEnv || selectedEnv === "NOT_DEPLOYED") {
            setTrafficByProxy({});
            setTrafficByProxyPerEnv({});
            return;
        }
        setTrafficLoading(true);
        try {
            const token = await fetchApigeeToken();
            if (selectedEnv === "ALL") {
                if (availableCreateEnvs.length === 0) {
                    setTrafficByProxyPerEnv({});
                    return;
                }
                const perEnvResults = await Promise.all(
                    availableCreateEnvs.map((env) =>
                        fetchApigeeBreakdown(token, env, "apiproxy", ["sum(message_count)"], trafficRange)
                            .then((rows) => ({ env, rows }))
                            .catch(() => ({ env, rows: [] }))
                    )
                );
                const perProxy = {};
                perEnvResults.forEach(({ env, rows }) => {
                    rows.forEach((row) => {
                        const count = row["sum(message_count)"] || 0;
                        if (!count) return;
                        if (!perProxy[row.name]) perProxy[row.name] = [];
                        perProxy[row.name].push({ env, count });
                    });
                });
                Object.values(perProxy).forEach((list) => list.sort((a, b) => b.count - a.count));
                setTrafficByProxyPerEnv(perProxy);
                setTrafficByProxy({});
            } else {
                const rows = await fetchApigeeBreakdown(token, selectedEnv, "apiproxy", ["sum(message_count)"], trafficRange);
                const map = {};
                rows.forEach((row) => { map[row.name] = row["sum(message_count)"] || 0; });
                setTrafficByProxy(map);
                setTrafficByProxyPerEnv({});
            }
        } catch (err) {
            console.error("Failed to fetch proxy traffic:", err);
            setTrafficByProxy({});
            setTrafficByProxyPerEnv({});
        } finally {
            setTrafficLoading(false);
        }
    };

    useEffect(() => {
        fetchProxyTraffic();
    }, [selectedEnv, trafficRange, availableCreateEnvs]);

    // Load Projects for the Create Proxy dialog whenever it's open — independent of
    // any page-level selection
    useEffect(() => {
        if (!createProxyModal.open) return;
        let cancelled = false;
        setLoadingCreateProxyProjects(true);
        getProjects(0, 200)
            .then((data) => { if (!cancelled) setCreateProxyProjects(data || []); })
            .catch((err) => {
                console.error("Failed to load projects", err);
                if (!cancelled) setCreateProxyProjects([]);
            })
            .finally(() => { if (!cancelled) setLoadingCreateProxyProjects(false); });
        return () => { cancelled = true; };
    }, [createProxyModal.open]);

    // Load Applications for the dialog's own selected Project
    useEffect(() => {
        if (!selectedCreateProxyProjectId) { setCreateProxyApplications([]); return; }
        let cancelled = false;
        setLoadingCreateProxyApplications(true);
        getApplications({ projectId: selectedCreateProxyProjectId, size: 100 })
            .then((data) => { if (!cancelled) setCreateProxyApplications(data || []); })
            .catch((err) => {
                console.error("Failed to load applications", err);
                if (!cancelled) setCreateProxyApplications([]);
            })
            .finally(() => { if (!cancelled) setLoadingCreateProxyApplications(false); });
        return () => { cancelled = true; };
    }, [selectedCreateProxyProjectId]);

    // Re-seed the API name with the new prefix whenever the selected application changes
    useEffect(() => {
        if (!createProxyModal.open) return;
        setCreateProxyModal(prev => ({ ...prev, name: appPrefix }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appPrefix]);

    // Fetched page-wide (not just while the Create dialog is open) — the Traffic
    // column's per-environment breakdown needs the env list too.
    useEffect(() => {
        if (selectedOrg) fetchCreateEnvironments();
    }, [selectedOrg]);

    // NEW: Load onboarding options for target server creation
    useEffect(() => {
        const loadOptions = async () => {
            setIsFetchingOnboardings(true);
            const fallbackOnboardingId = getFallbackOnboardingId();
            try {
                const options = await loadApigeeOnboardingOptions();
                setOnboardingOptions(options);
                if (options.length > 0) {
                    setDefaultOnboardingId(options[0].onboardingId);
                    setDefaultMicroserviceId(options[0].microserviceId || "");
                } else if (fallbackOnboardingId) {
                    // No formal onboarding registered yet — fall back to the
                    // current user's identity so creation isn't blocked.
                    setDefaultOnboardingId(fallbackOnboardingId);
                    setDefaultMicroserviceId("");
                }
            } catch (error) {
                console.error("Failed to load onboarding options", error);
                if (fallbackOnboardingId) {
                    setDefaultOnboardingId(fallbackOnboardingId);
                    setDefaultMicroserviceId("");
                }
            } finally {
                setIsFetchingOnboardings(false);
            }
        };
        loadOptions();
    }, []);

    // Fetch target servers when "Existing" is selected and the dialog's own environment changes
    const fetchTargetServersForModal = async () => {
        if (backendOption !== "existing") return;
        const orgForTarget = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        if (!orgForTarget || !createProxyEnv) {
            setTargetServers([]);
            setSelectedTargetServer("");
            return;
        }
        setLoadingTargetServers(true);
        try {
            const token = await fetchApigeeToken();
            const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${orgForTarget}/environments/${createProxyEnv}/targetservers`;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                const list = Array.isArray(data)
                    ? data.map(item => (typeof item === 'string' ? { name: item } : item))
                    : [];
                setTargetServers(list);
                // Auto-select first if none selected
                if (list.length > 0 && !selectedTargetServer) {
                    setSelectedTargetServer(list[0].name);
                }
            } else {
                setTargetServers([]);
            }
        } catch (err) {
            console.error("Failed to fetch target servers:", err);
            setTargetServers([]);
        } finally {
            setLoadingTargetServers(false);
        }
    };

    useEffect(() => {
        fetchTargetServersForModal();
    }, [backendOption, selectedOrg, createProxyEnv, createProxyModal.open]);

    // Filtering logic (unchanged)
    const filteredBySearchAndEnv = useMemo(() => {
        return apiProxies.filter((proxy) => {
            const matchesSearch = proxy.name?.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesEnv = true;
            if (selectedEnv === "NOT_DEPLOYED") {
                const hasEnvSummary = proxy.environmentSummary && proxy.environmentSummary !== "Not deployed";
                const hasEnvironments = proxy.environments && proxy.environments.length > 0;
                matchesEnv = !hasEnvSummary && !hasEnvironments;
            } else if (selectedEnv && selectedEnv !== "ALL") {
                matchesEnv = proxy.environmentSummary === selectedEnv || (proxy.environments?.includes(selectedEnv));
            }
            return matchesSearch && matchesEnv;
        });
    }, [apiProxies, searchTerm, selectedEnv]);

    const typeCounts = useMemo(() => {
        const counts = { ALL: filteredBySearchAndEnv.length };
        filteredBySearchAndEnv.forEach((proxy) => {
            const t = proxy.type || "REST";
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    }, [filteredBySearchAndEnv]);

    const filteredProxies = useMemo(() => {
        return filteredBySearchAndEnv.filter((proxy) => {
            const matchesType = apiTypeFilter === "ALL" || (proxy.type || "REST") === apiTypeFilter;
            return matchesType;
        });
    }, [filteredBySearchAndEnv, apiTypeFilter]);

    const paginatedProxies = useMemo(() => {
        const start = (proxyPage - 1) * proxyPageSize;
        return filteredProxies.slice(start, start + proxyPageSize);
    }, [filteredProxies, proxyPage, proxyPageSize]);

    const typeTabs = [
        { label: "ALL", value: "ALL" },
        { label: "Rest", value: "REST" },
        { label: "SOAP", value: "SOAP" },
        { label: "GraphQL", value: "GraphQL" },
        { label: "MCP", value: "MCP" },
    ];

    const formatTypeLabel = (type) => {
        if (!type) return "Rest";
        if (type === "REST") return "Rest";
        return type;
    };

    // "3 days ago" style label alongside the full last-modified timestamp
    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return "";
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    };

    // Deterministic color per environment name, so e.g. "prod" always renders the
    // same badge color across rows/re-renders without needing a fixed env->color map.
    const ENV_BADGE_COLORS = [
        { bg: "bg-blue-500/15", text: "text-blue-300", ring: "ring-blue-500/30" },
        { bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-500/30" },
        { bg: "bg-amber-500/15", text: "text-amber-300", ring: "ring-amber-500/30" },
        { bg: "bg-purple-500/15", text: "text-purple-300", ring: "ring-purple-500/30" },
        { bg: "bg-pink-500/15", text: "text-pink-300", ring: "ring-pink-500/30" },
        { bg: "bg-cyan-500/15", text: "text-cyan-300", ring: "ring-cyan-500/30" },
    ];
    const getEnvBadgeColor = (envName) => {
        let hash = 0;
        for (let i = 0; i < envName.length; i++) hash = (hash * 31 + envName.charCodeAt(i)) >>> 0;
        return ENV_BADGE_COLORS[hash % ENV_BADGE_COLORS.length];
    };

    // Compact number formatting for traffic badges: 1,234 -> "1.2k", 2,500,000 -> "2.5M"
    const formatCompactCount = (n) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
        return String(n);
    };

    // Generate proxy zip (unchanged)
    // Escape text/attribute content dropped into the generated proxy bundle XML
    const escapeXml = (str) => String(str ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    // Downloads a shared flow's (framework's) latest revision bundle and pulls its
    // individual policy XML files back out, so a "Recommended"/"Custom Framework"
    // selection results in real, editable policies attached to the new API — the
    // same policies Proxy Editor's listPolicyNames() will show when reopened later.
    // Also carries over anything under .../resources/ (e.g. the .js a Javascript
    // policy's <ResourceURL> resolves to) so extracted policies stay deployable
    // instead of referencing a resource that no longer exists in the new bundle.
    const extractFrameworkPolicies = async (effectiveOrg, token, sfName) => {
        const detailsRes = await fetch(
            `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/sharedflows/${sfName}/details`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!detailsRes.ok) throw new Error(`Failed to fetch details for framework "${sfName}"`);
        const details = await detailsRes.json();
        const latestRev = details?.sharedFlowDetails?.latestRevisionId;
        if (!latestRev) throw new Error(`No revision found for framework "${sfName}"`);

        const bundleRes = await fetch(
            `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/sharedflows/${sfName}/revisions/${latestRev}/?format=bundle`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!bundleRes.ok) throw new Error(`Failed to fetch bundle for framework "${sfName}"`);
        const bundleZip = await JSZip.loadAsync(await bundleRes.blob());

        const policyFiles = Object.values(bundleZip.files).filter(
            (f) => !f.dir && f.name.includes("/policies/") && f.name.endsWith(".xml")
        );
        const policies = [];
        for (const f of policyFiles) {
            const xml = await f.async("string");
            const policyName = f.name.split("/").pop().replace(/\.xml$/, "");
            policies.push({ name: policyName, xml });
        }

        const resourceEntries = Object.values(bundleZip.files).filter(
            (f) => !f.dir && f.name.includes("/resources/")
        );
        const resourceFiles = [];
        for (const f of resourceEntries) {
            const relPath = f.name.slice(f.name.indexOf("/resources/") + 1); // "resources/jsc/Name.js"
            const isText = /\.(js|py|xsl|xslt|json|xml|properties|wsdl)$/i.test(relPath);
            const content = await f.async(isText ? "string" : "base64");
            resourceFiles.push({ path: relPath, content, binary: !isText });
        }

        return { policies, resourceFiles };
    };

    // Resolves the "Attach Frameworks" selection into { policies, resourceFiles } to
    // bake into the generated bundle. "Policy" mode generates minimal policy definitions
    // straight from the shared POLICY_LIBRARY catalog (plus a stub resource for any
    // Javascript-backed ones); "Recommended"/"Custom Framework" mode extracts the real
    // policies (and their resources) out of the selected framework.
    const resolveAttachedPolicies = async (frameworkAttachment, effectiveOrg, token) => {
        const mode = frameworkAttachment?.mode;
        if (mode === "policy") {
            const policies = [];
            const resourceFiles = [];
            (frameworkAttachment.policies || []).forEach((policyName) => {
                const item = POLICY_LIBRARY_FLAT.find((p) => p.name === policyName);
                const actualType = item ? (POLICY_TYPE_TO_ELEMENT[item.typeKey] || item.typeKey) : "Policy";
                policies.push({ name: policyName, xml: MINIMAL_POLICY_XML(actualType, policyName) });
                const resourceFile = policyResourceFile(actualType, policyName);
                if (resourceFile) resourceFiles.push(resourceFile);
            });
            return { policies, resourceFiles };
        }
        if ((mode === "recommended" || mode === "custom") && frameworkAttachment.framework) {
            return extractFrameworkPolicies(effectiveOrg, token, frameworkAttachment.framework);
        }
        return { policies: [], resourceFiles: [] };
    };

    const generateProxyZip = async (template, {
        name, basePath, targetUrl, targetServer, resources = [],
        // Attached to the ProxyEndpoint's PreFlow — the client-facing side of the proxy.
        attachedPolicies = [], attachedResourceFiles = [],
        // Attached to the TargetEndpoint's PreFlow — the backend-facing side, evaluated
        // right before Apigee calls out to the actual backend service.
        targetAttachedPolicies = [], targetAttachedResourceFiles = [],
    }) => {
        const zip = new JSZip();
        const apiproxyFolder = zip.folder("apiproxy");

        // De-dupe each lane by policy name in case a framework bundle repeats a name.
        const uniqueProxyPolicies = Array.from(new Map(attachedPolicies.map((p) => [p.name, p])).values());
        const uniqueTargetPolicies = Array.from(new Map(targetAttachedPolicies.map((p) => [p.name, p])).values());
        const proxyPolicyNames = uniqueProxyPolicies.map((p) => p.name);
        const targetPolicyNames = uniqueTargetPolicies.map((p) => p.name);

        // apiproxy/policies/ is a single bundle-wide folder — merge both lanes into one
        // manifest/file set (a name picked in both lanes only needs writing once).
        const allPoliciesByName = new Map();
        uniqueProxyPolicies.forEach((p) => allPoliciesByName.set(p.name, p));
        uniqueTargetPolicies.forEach((p) => { if (!allPoliciesByName.has(p.name)) allPoliciesByName.set(p.name, p); });
        const allPolicies = Array.from(allPoliciesByName.values());
        const policiesXml = allPolicies.length > 0
            ? `<Policies>${allPolicies.map((p) => `<Policy>${escapeXml(p.name)}</Policy>`).join("")}</Policies>`
            : "";

        const apiProxyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<APIProxy revision="1" name="${name}">
  <BasePaths>${basePath}</BasePaths>
  <ProxyEndpoints><ProxyEndpoint>default</ProxyEndpoint></ProxyEndpoints>
  ${template === "reverse" ? "<TargetEndpoints><TargetEndpoint>default</TargetEndpoint></TargetEndpoints>" : ""}
  ${policiesXml}
</APIProxy>`;
        apiproxyFolder.file(`${name}.xml`, apiProxyXml);

        if (allPolicies.length > 0) {
            const policiesFolder = apiproxyFolder.folder("policies");
            allPolicies.forEach((p) => policiesFolder.file(`${p.name}.xml`, p.xml));
        }

        // Resources (e.g. the .js a Javascript policy's <ResourceURL> resolves to)
        // that attached/extracted policies depend on — merged across both lanes and
        // de-duped by path.
        const allResourceFiles = Array.from(
            new Map([...attachedResourceFiles, ...targetAttachedResourceFiles].map((r) => [r.path, r])).values()
        );
        allResourceFiles.forEach((r) => {
            apiproxyFolder.file(r.path, r.content, r.binary ? { base64: true } : undefined);
        });

        const proxiesFolder = apiproxyFolder.folder("proxies");

        // Declared Resources become conditional Flows so the proxy actually recognizes
        // each {method, path} pair (and so the Proxy Details view can read them straight
        // back out of the deployed bundle, the same way it renders any other flow).
        const declaredResources = resources.filter((r) => r?.path && r.path.trim());
        const flowsXml = declaredResources.length > 0
            ? `<Flows>
${declaredResources.map((r, idx) => {
                const method = escapeXml((r.method || "GET").toUpperCase());
                const path = escapeXml(r.path.trim().startsWith("/") ? r.path.trim() : `/${r.path.trim()}`);
                return `    <Flow name="resource-${idx + 1}">
      <Description>${method} ${path}</Description>
      <Condition>(proxy.pathsuffix MatchesPath "${path}") and (request.verb = "${method}")</Condition>
    </Flow>`;
            }).join("\n")}
  </Flows>`
            : "";

        const proxyPreFlowXml = proxyPolicyNames.length > 0
            ? `<PreFlow name="PreFlow">
    <Request>${proxyPolicyNames.map((n) => `<Step><Name>${escapeXml(n)}</Name></Step>`).join("")}</Request>
    <Response/>
  </PreFlow>`
            : "";

        const proxyEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
  <HTTPProxyConnection><BasePath>${basePath}</BasePath></HTTPProxyConnection>
  ${proxyPreFlowXml}
  ${flowsXml}
  <RouteRule name="default"/>
</ProxyEndpoint>`;
        proxiesFolder.file("default.xml", proxyEndpointXml);
        if (template === "reverse") {
            const targetsFolder = apiproxyFolder.folder("targets");

            const targetPreFlowXml = targetPolicyNames.length > 0
                ? `<PreFlow name="PreFlow">
    <Request>${targetPolicyNames.map((n) => `<Step><Name>${escapeXml(n)}</Name></Step>`).join("")}</Request>
    <Response/>
  </PreFlow>`
                : "";
            const httpTargetConnectionXml = targetServer
                ? `<HTTPTargetConnection>
    <LoadBalancer>
      <Server name="${targetServer}"/>
    </LoadBalancer>
  </HTTPTargetConnection>`
                : `<HTTPTargetConnection><URL>${targetUrl}</URL></HTTPTargetConnection>`;
            const targetEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
  ${targetPreFlowXml}
  ${httpTargetConnectionXml}
</TargetEndpoint>`;
            targetsFolder.file("default.xml", targetEndpointXml);
        }
        const content = await zip.generateAsync({ type: "blob" });
        return new File([content], `${name}.zip`, { type: "application/zip" });
    };

    // OpenAPI spec parsing (unchanged)
    const parseOpenApiSpec = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                let spec;
                try {
                    spec = JSON.parse(content);
                } catch (jsonError) {
                    reject(new Error("Only JSON OpenAPI specs are supported in this version"));
                    return;
                }
                if (!spec.info?.title) {
                    reject(new Error("OpenAPI spec missing 'info.title' field."));
                    return;
                }
                if (!spec.servers || spec.servers.length === 0) {
                    reject(new Error("OpenAPI spec missing 'servers' array."));
                    return;
                }
                let proxyName = spec.info.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                let basePath = "/";
                let targetUrl = "";
                const serverUrl = spec.servers[0].url;
                try {
                    const urlObj = new URL(serverUrl);
                    targetUrl = `${urlObj.protocol}//${urlObj.host}`;
                    basePath = urlObj.pathname || "/";
                } catch (e) {
                    targetUrl = serverUrl;
                }
                const description = spec.info.description || "";
                resolve({ name: proxyName, basePath, description, targetUrl });
            };
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsText(file);
        });
    };

    const handleOpenApiUpload = async (file) => {
        setCreateProxyModal((prev) => ({ ...prev, specError: null, openApiSpecFile: file }));
        try {
            const extracted = await parseOpenApiSpec(file);
            setCreateProxyModal((prev) => ({
                ...prev,
                name: extracted.name,
                basePath: extracted.basePath,
                description: extracted.description,
                targetUrl: extracted.targetUrl,
                specParsed: true,
                specError: null,
            }));
        } catch (err) {
            setCreateProxyModal((prev) => ({
                ...prev,
                specError: err.message,
                specParsed: false,
                openApiSpecFile: null,
            }));
        }
    };

    // Updated createProxy function using new backend selection
    // const createProxy = async () => {
    //     const modal = createProxyModal;
    //     if (!modal.name.trim()) {
    //         showMessage("Proxy name is required.", "error");
    //         return;
    //     }
    //     // Validation: must have a backend (either existing target server or URL? but we removed URL)
    //     if (modal.template === "reverse") {
    //         if (backendOption === "existing" && !selectedTargetServer) {
    //             showMessage("Please select a backend service.", "error");
    //             return;
    //         }
    //         // If we ever keep URL, but we removed it, so we just need existing
    //     }
    //     if (modal.template === "upload" && !modal.zipFile) {
    //         showMessage("Please select a ZIP archive.", "error");
    //         return;
    //     }
    //     if ((modal.template === "reverse-openapi" || modal.template === "no-target-openapi") && !modal.specParsed) {
    //         showMessage("Please upload a valid OpenAPI specification file first.", "error");
    //         return;
    //     }

    //     const token = await fetchApigeeToken();
    //     if (!token) {
    //         showMessage("Failed to obtain authentication token.", "error");
    //         return;
    //     }

    //     try {
    //         let zipToUpload = null;
    //         if (modal.template === "reverse" || modal.template === "no-target") {
    //             zipToUpload = await generateProxyZip(modal.template, {
    //                 name: modal.name,
    //                 basePath: modal.basePath,
    //                 targetUrl: modal.targetUrl, // may be empty
    //                 targetServer: backendOption === "existing" ? selectedTargetServer : null,
    //             });
    //         } else if (modal.template === "upload") {
    //             zipToUpload = modal.zipFile;
    //         } else {
    //             showMessage("OpenAPI proxy creation not fully implemented in this version", "info");
    //             return;
    //         }

    //         const formData = new FormData();
    //         formData.append("file", zipToUpload);
    //         const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
    //         const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis?action=import&name=${encodeURIComponent(modal.name)}`;
    //         const response = await fetch(uploadUrl, {
    //             method: "POST",
    //             headers: { Authorization: `Bearer ${token}` },
    //             body: formData,
    //         });
    //         if (!response.ok) {
    //             const errorText = await response.text();
    //             throw new Error(errorText || `Upload failed with status ${response.status}`);
    //         }

    //         showMessage(`Proxy "${modal.name}" created successfully!`, "success");

    //         // Reset modal state
    //         setCreateProxyModal({
    //             open: false,
    //             template: "reverse",
    //             name: "",
    //             basePath: "/",
    //             description: "",
    //             targetUrl: "",
    //             zipFile: null,
    //             deploymentEnvs: [],
    //             apiType: "REST",
    //             openApiSpecFile: null,
    //             specParsed: false,
    //             specError: null,
    //         });
    //         setBackendOption("existing");
    //         setSelectedTargetServer("");

    //         // Refresh the proxies list
    //         await fetchProxies();

    //         // Auto‑redirect to Proxy Editor (unchanged)
    //         try {
    //             const detailsUrl = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/${modal.name}/details`;
    //             const detailsRes = await fetch(detailsUrl, { headers: { Authorization: `Bearer ${token}` } });
    //             if (detailsRes.ok) {
    //                 const detailsData = await detailsRes.json();
    //                 const latestRev = detailsData.proxy?.latestRevisionId;
    //                 if (latestRev) {
    //                     const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis/${modal.name}/revisions/${latestRev}/?format=bundle`;
    //                     const bundleRes = await fetch(bundleUrl, { headers: { Authorization: `Bearer ${token}` } });
    //                     if (bundleRes.ok) {
    //                         const blob = await bundleRes.blob();
    //                         const zipUrl = URL.createObjectURL(blob);
    //                         navigate('/proxy-editor', {
    //                             state: {
    //                                 zipUrl,
    //                                 selectedProxyName: modal.name,
    //                                 backTo: `/gateway/proxy/${modal.name}`,
    //                                 backState: { proxy: { name: modal.name } },
    //                             }
    //                         });
    //                         return;
    //                     }
    //                 }
    //             }
    //             showMessage("Proxy created, but could not open editor automatically. You can edit from the proxy details page.", "warning");
    //         } catch (err) {
    //             console.error("Error while opening editor:", err);
    //             showMessage("Proxy created successfully, but auto‑open of editor failed. Please open it manually.", "warning");
    //         }
    //     } catch (err) {
    //         showMessage(`Creation failed: ${err.message}`, "error");
    //     }
    // };
    const createProxy = async () => {
        const modal = createProxyModal;
        if (!createProxyEnv || !selectedCreateProxyProjectId || !selectedCreateProxyApplicationId) {
            showMessage("Please select an Environment, Project and Application.", "error");
            return;
        }
        const errors = {};
        if (!modal.name.trim() || modal.name.trim() === appPrefix) {
            errors.name = "API name is required.";
        }
        if (modal.template !== "upload") {
            if (!modal.basePath.trim()) errors.basePath = "Base path is required.";
            if (!version.trim()) errors.version = "Version is required.";
            else if (!/v/i.test(version.trim())) errors.version = "Version must contain the letter 'v' (e.g., v1, v2).";
        }
        if (Object.values(errors).some(Boolean)) {
            setFieldErrors(prev => ({ ...prev, ...errors }));
            return;
        }
        if (modal.template === "reverse") {
            if (backendOption === "existing" && !selectedTargetServer) {
                showMessage("Please select a backend service.", "error");
                return;
            }
            // If you keep URL option, adjust accordingly
        }
        if (modal.template === "upload" && !modal.zipFile) {
            showMessage("Please select a ZIP archive.", "error");
            return;
        }
        if ((modal.template === "reverse-openapi" || modal.template === "no-target-openapi") && !modal.specParsed) {
            showMessage("Please upload a valid OpenAPI specification file first.", "error");
            return;
        }
        if ((modal.frameworkAttachment.mode === "recommended" || modal.frameworkAttachment.mode === "custom") && !modal.frameworkAttachment.framework) {
            showMessage("Please select a framework to attach to the proxy.", "error");
            return;
        }
        if (modal.frameworkAttachment.mode === "policy" && modal.frameworkAttachment.policies.length === 0) {
            showMessage("Please select at least one policy to attach to the proxy.", "error");
            return;
        }
        // Backend/target attachment only applies to templates that actually get a
        // TargetEndpoint in the generated bundle (see generateProxyZip's `template === "reverse"` gate).
        if (modal.template === "reverse") {
            if ((modal.backendFrameworkAttachment.mode === "recommended" || modal.backendFrameworkAttachment.mode === "custom") && !modal.backendFrameworkAttachment.framework) {
                showMessage("Please select a framework to attach to the backend service.", "error");
                return;
            }
            if (modal.backendFrameworkAttachment.mode === "policy" && modal.backendFrameworkAttachment.policies.length === 0) {
                showMessage("Please select at least one policy to attach to the backend service.", "error");
                return;
            }
        }

        const token = await fetchApigeeToken();
        if (!token) {
            showMessage("Failed to obtain authentication token.", "error");
            return;
        }
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;

        try {
            let zipToUpload = null;
            if (modal.template === "reverse" || modal.template === "no-target") {
                let attachedPolicies = [];
                let attachedResourceFiles = [];
                let targetAttachedPolicies = [];
                let targetAttachedResourceFiles = [];
                try {
                    const resolved = await resolveAttachedPolicies(modal.frameworkAttachment, effectiveOrg, token);
                    attachedPolicies = resolved.policies;
                    attachedResourceFiles = resolved.resourceFiles;
                    if (modal.template === "reverse") {
                        const targetResolved = await resolveAttachedPolicies(modal.backendFrameworkAttachment, effectiveOrg, token);
                        targetAttachedPolicies = targetResolved.policies;
                        targetAttachedResourceFiles = targetResolved.resourceFiles;
                    }
                } catch (err) {
                    showMessage(`Failed to resolve attached framework: ${err.message}`, "error");
                    return;
                }
                zipToUpload = await generateProxyZip(modal.template, {
                    name: modal.name,
                    basePath: modal.basePath,
                    targetUrl: modal.targetUrl,
                    targetServer: backendOption === "existing" ? selectedTargetServer : null,
                    resources: modal.resources,
                    attachedPolicies,
                    attachedResourceFiles,
                    targetAttachedPolicies,
                    targetAttachedResourceFiles,
                });
            } else if (modal.template === "upload") {
                zipToUpload = modal.zipFile;
            } else {
                showMessage("OpenAPI proxy creation not fully implemented in this version", "info");
                return;
            }

            const formData = new FormData();
            formData.append("file", zipToUpload);
            const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis?action=import&name=${encodeURIComponent(modal.name)}`;
            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Upload failed with status ${response.status}`);
            }

            // Persist the API type the user actually picked (Rest/SOAP/GraphQL/MCP) — Apigee's own
            // "apiProxyType" on a bundle-imported proxy is always "PROGRAMMABLE" and isn't useful here.
            const selectedApiType = { Rest: "REST", SOAP: "SOAP", GraphQL: "GraphQL", MCP: "MCP" }[modal.apiType] || modal.apiType;
            const createdApi = await response.clone().json().catch(() => ({ name: modal.name }));
            await fetch(`https://forgegateway.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(effectiveOrg)}/config-audit/API/${encodeURIComponent(modal.name)}/record`, {
                method: "POST",
                headers: getTrackingHeaders({
                    // defaultOnboardingId is a legacy onboarding-context record, which doesn't
                    // exist for every Project/Application — fall back explicitly to the SSO
                    // identity main.jsx's hydrateAuthContextFromUrl() writes into localStorage
                    // (organizationId, or userEmail if that's unset) rather than substituting
                    // an unrelated Project/Application id here.
                    onboardingId: defaultOnboardingId || getFallbackOnboardingId(),
                    microserviceId: defaultMicroserviceId,
                    projectId: selectedCreateProxyProjectId,
                    projectName: selectedCreateProxyProject?.name,
                    applicationId: selectedCreateProxyApplication?.id,
                    applicationName: selectedCreateProxyApplication?.name,
                }),
                body: JSON.stringify({
                    operation: "CREATE",
                    requestPayload: { name: modal.name, apiType: selectedApiType, resources: modal.resources, frameworkAttachment: modal.frameworkAttachment, backendFrameworkAttachment: modal.backendFrameworkAttachment },
                    afterSnapshot: { ...createdApi, apiType: selectedApiType, resources: modal.resources, frameworkAttachment: modal.frameworkAttachment, backendFrameworkAttachment: modal.backendFrameworkAttachment },
                    responsePayload: createdApi,
                }),
            });

            showMessage(`API "${modal.name}" created successfully!`, "success");

            // Deploy to whatever environments the user checked in "Deployment Environments" —
            // import alone never deploys anything, so without this the proxy would sit
            // revision-only and the Overview page's Deployments/API URL sections would have
            // nothing to show. Apigee assigns the actual revision number on import; a fresh
            // proxy name is always "1", but read it back from the import response to be safe.
            if (modal.deploymentEnvs.length > 0) {
                const revisionToDeploy = createdApi.revision || "1";
                for (const env of modal.deploymentEnvs) {
                    try {
                        const deployUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/environments/${encodeURIComponent(env)}/apis/${encodeURIComponent(modal.name)}/revisions/${revisionToDeploy}/deployments?override=true`;
                        const deployRes = await fetch(deployUrl, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ override: true }),
                        });
                        if (!deployRes.ok) {
                            const errText = await deployRes.text();
                            throw new Error(parseApigeeErrorMessage(errText) || `HTTP ${deployRes.status}`);
                        }
                        showMessage(`Deployed revision ${revisionToDeploy} to "${env}"`, "success");
                    } catch (err) {
                        showMessage(`Deployment to "${env}" failed: ${err.message}`, "error");
                    }
                }
            }

            if (selectedProducts.length > 0) {
                for (const prodName of selectedProducts) {
                    try {
                        await addProxyToProduct(prodName, modal.name, modal.basePath);
                        showMessage(`Proxy added to product "${prodName}"`, "success");
                    } catch (err) {
                        showMessage(`Failed to update product ${prodName}: ${err.message}`, "error");
                    }
                }
            }

            // Reset modal state
            closeCreateProxyModal();

            // Refresh the proxies list
            await fetchProxies();

            // Navigate to proxy overview (not editor)
            navigate(`${proxyBasePath}/proxy/${modal.name}`, { state: { proxy: { name: modal.name } } });
        } catch (err) {
            showMessage(`Creation failed: ${err.message}`, "error");
        }
    };

    const handleProxySelect = (proxy) => {
        navigate(`${proxyBasePath}/proxy/${proxy.name}`, { state: { proxy } });
    };

    // Advances the Create Proxy dialog to the "Management API vs CI/CD Pipeline"
    // chooser (Apigee X only). Only checks the env/project/application selection —
    // the rest of the form is only relevant to the direct Management API path and
    // is validated by createProxy() itself when that path is chosen.
    const handleContinueToDeployMode = () => {
        if (!createProxyEnv || !selectedCreateProxyProjectId || !selectedCreateProxyApplicationId) {
            showMessage("Please select an Environment, Project and Application.", "error");
            return;
        }
        setDeployModeStep(true);
    };

    // "CI/CD Pipeline" chosen: no Apigee call is made here — hand off to the CI/CD
    // Automation page (Management section) to configure/save the pipeline for this
    // application, pre-scoped via ?appId=.
    const handleContinueToCicd = () => {
        const appId = selectedCreateProxyApplicationId;
        closeCreateProxyModal();
        // Stay within the current app shell (this chooser only ever shows for the
        // "/gateway" Apigee X context) rather than jumping to the top-level page.
        navigate(`${proxyBasePath}/cicd-automation${appId ? `?appId=${encodeURIComponent(appId)}` : ""}`);
    };

    // Closes the Create Proxy modal and clears every field it seeded, so a
    // reopen (whether via Cancel, the X icon, or a backdrop click) never
    // shows data left over from a previous session.
    const closeCreateProxyModal = () => {
        resetCreateProxyModal();
        setDeployModeStep(false);
        setDeployMode("cicd");
        setProductOption("existing");
        setSelectedProducts([]);
        setProductModalOpen(false);
        setNewProductData({
            name: "", displayName: "", description: "", environment: "",
            accessType: "private", autoApprove: false,
        });
        setFieldErrors({ name: "", basePath: "", version: "" });
        setVersion("");
        setBackendOption("existing");
        setSelectedTargetServer("");
        setCreateProxyEnv("");
        setSelectedCreateProxyProjectId("");
        setSelectedCreateProxyApplicationId("");
    };

    const handleCreateClick = () => {
        let initialApiType = "Rest";
        if (apiTypeFilter !== "ALL") {
            const typeMap = { "REST": "Rest", "SOAP": "SOAP", "GraphQL": "GraphQL", "MCP": "MCP" };
            initialApiType = typeMap[apiTypeFilter] || "Rest";
        }
        setCreateProxyModal({
            ...defaultCreateProxyModal,
            open: true,
            apiType: initialApiType,
        });
        setProductOption("existing");
        setSelectedProducts([]);
        setFieldErrors({ name: "", basePath: "", version: "" });
        setVersion("");
        setBackendOption("existing");
        setSelectedTargetServer("");
        setCreateProxyEnv("");
        setSelectedCreateProxyProjectId("");
        setSelectedCreateProxyApplicationId("");
    };

    const checkProxyExists = async (proxyName) => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            const response = await fetch(
                `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/${proxyName}/details`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.ok;
        } catch {
            return false;
        }
    };

    // Updated openProxyEditor that works for both existing and new proxies
    const openProxyEditor = async (proxyName) => {
        const trimmed = proxyName.trim();
        if (!trimmed) {
            setEditorError("Proxy name is required");
            return false;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            setEditorError("Only letters, numbers, hyphens and underscores allowed");
            return false;
        }

        setEditorSubmitting(true);
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            // Check if proxy exists
            const exists = await checkProxyExists(trimmed);

            if (exists) {
                // Fetch the latest revision and bundle for existing proxy
                const detailsUrl = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/${trimmed}/details`;
                const detailsRes = await fetch(detailsUrl, { headers: { Authorization: `Bearer ${token}` } });
                if (!detailsRes.ok) throw new Error("Failed to fetch proxy details");
                const detailsData = await detailsRes.json();
                const latestRev = detailsData.proxy?.latestRevisionId;
                if (!latestRev) throw new Error("No revision found for this proxy");

                const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis/${trimmed}/revisions/${latestRev}/?format=bundle`;
                const bundleRes = await fetch(bundleUrl, { headers: { Authorization: `Bearer ${token}` } });
                if (!bundleRes.ok) throw new Error("Failed to fetch bundle");
                const blob = await bundleRes.blob();
                const zipUrl = URL.createObjectURL(blob);

                navigate('/proxy-editor', {
                    state: {
                        zipUrl,
                        selectedProxyName: trimmed,
                        backTo: `${proxyBasePath}/proxy`,
                        // backTo: `${proxyBasePath}/proxy/${trimmed}`,
                        // backState: { proxy: { name: trimmed } },
                    }
                });
            } else {
                // New proxy: open empty editor
                navigate('/proxy-editor', {
                    state: {
                        selectedProxyName: trimmed,
                        newProxy: true,
                        backTo: `${proxyBasePath}/proxy`
                    }
                });
            }
            return true;
        } catch (err) {
            console.error("Error opening editor:", err);
            setEditorError(err.message || "Could not open editor. Please try again.");
            return false;
        } finally {
            setEditorSubmitting(false);
        }
    };

    const handleEditorSubmit = async (e) => {
        e.preventDefault();
        if (editorSubmitting) return;
        const success = await openProxyEditor(editorProxyName);
        if (success) {
            setEditorModalOpen(false);
            setEditorProxyName("");
            setEditorError("");
        }
    };
    // Callback when target server is created successfully
    const handleTargetServerCreated = (newServerName) => {
        // Refetch target servers and select the new one
        fetchTargetServersForModal().then(() => {
            setSelectedTargetServer(newServerName);
            setBackendOption("existing"); // switch to existing and select the new one
        });
        setShowTargetServerModal(false);
    };

    return (
        <div className="flex flex-col gap-2 p-6">
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5 space-y-4">
            {/* ... header and filters (unchanged) ... */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-white mb-1">APIs</h2>
                <GatewayContextSelector
                    selectedOrg={selectedOrg}
                    setSelectedOrg={setSelectedOrg}
                    selectedBU={selectedBU}
                    setSelectedBU={setSelectedBU}
                    selectedEnv={selectedEnv}
                    setSelectedEnv={setSelectedEnv}
                    showEnv={true}
                />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-[#1a1f2e] rounded-lg p-1">
                    {typeTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setApiTypeFilter(tab.value)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${apiTypeFilter === tab.value
                                ? "bg-[#ff5b1f] text-white shadow-sm"
                                : "text-[#7f8fa8] hover:text-white hover:bg-[#2a3550]"
                                }`}
                        >
                            {tab.label}
                            <span className="ml-2 text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                                {typeCounts[tab.value] || 0}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
                        <input
                            type="text"
                            placeholder="Filter APIs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#1a1f2e] focus:outline-none border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64 text-white"
                        />
                    </div>
                    <Button onClick={handleCreateClick} className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white whitespace-nowrap">
                        Create
                    </Button>
                </div>
            </div>

            {/* Proxies table (unchanged) */}
            {loadingProxies ? (
                <div className="p-6 text-center text-[#7f8fa8]">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading APIs...</p>
                </div>
            ) : proxiesError ? (
                <div className="p-6 text-center text-red-400">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p>Error: {proxiesError}</p>
                    <button onClick={fetchProxies} className="mt-2 text-sm text-[#4f8ef7] hover:underline">Retry</button>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-dark-700">
                        <table className="w-full text-sm">
                            <thead className="bg-dark-800/70 border-b border-dark-700">
                                <tr>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium w-[160px]">Name</th>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium">Type</th>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>Traffic</span>
                                            <div className="relative">
                                                <select
                                                    value={trafficRange}
                                                    onChange={(e) => setTrafficRange(e.target.value)}
                                                    className="h-6 pl-1.5 pr-5 text-[10px] font-normal normal-case rounded border border-[#2a3550] bg-[#1a1f2e] text-[#7f8fa8] focus:outline-none focus:border-primary appearance-none cursor-pointer"
                                                >
                                                    <option value="1 hour">1H</option>
                                                    <option value="6 hours">6H</option>
                                                    <option value="1 day">24H</option>
                                                    <option value="7 days">7D</option>
                                                    <option value="14 days">14D</option>
                                                </select>
                                                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-[#5a6a8a] pointer-events-none" />
                                            </div>
                                        </div>
                                    </th>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium">Last Modified</th>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium">Modified By</th>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium whitespace-nowrap">Source</th>
                                    <th className="text-left p-3 text-[#5a6a8a] font-medium whitespace-nowrap w-[190px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProxies.map((proxy) => (
                                    <tr key={proxy.name} className="border-b border-dark-700 hover:bg-dark-800/40 cursor-pointer" onClick={() => handleProxySelect(proxy)}>
                                        <td className="p-3 text-white font-mono text-sm">
                                            <span title={proxy.name}>
                                                {proxy.name && proxy.name.length > 15 ? `${proxy.name.slice(0, 15)}…` : proxy.name}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${(proxy.type || "REST") === "REST" ? "bg-blue-500/20 text-blue-300" :
                                                (proxy.type || "REST") === "SOAP" ? "bg-purple-500/20 text-purple-300" :
                                                    (proxy.type || "REST") === "GraphQL" ? "bg-pink-500/20 text-pink-300" :
                                                        "bg-emerald-500/20 text-emerald-300"
                                                }`}>
                                                {formatTypeLabel(proxy.type)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-[#7f8fa8]">
                                            {trafficLoading ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : selectedEnv === "NOT_DEPLOYED" ? (
                                                <span className="text-xs text-[#5a6a8a]">Not deployed</span>
                                            ) : selectedEnv === "ALL" ? (
                                                (() => {
                                                    const perEnv = trafficByProxyPerEnv[proxy.name] || [];
                                                    if (perEnv.length === 0) {
                                                        return <span className="text-xs text-[#5a6a8a]">No traffic</span>;
                                                    }
                                                    const visible = perEnv.slice(0, 2);
                                                    const extra = perEnv.length - visible.length;
                                                    return (
                                                        <div className="flex items-center gap-1.5">
                                                            {visible.map(({ env, count }) => {
                                                                const color = getEnvBadgeColor(env);
                                                                return (
                                                                    <span
                                                                        key={env}
                                                                        title={`${env}: ${count.toLocaleString()} requests`}
                                                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${color.bg} ${color.text} ${color.ring}`}
                                                                    >
                                                                        <span className="max-w-[64px] truncate uppercase tracking-wide opacity-80">{env}</span>
                                                                        <span className="font-mono">{formatCompactCount(count)}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                            {extra > 0 && (
                                                                <span
                                                                    title={perEnv.slice(2).map(({ env, count }) => `${env}: ${count.toLocaleString()}`).join("\n")}
                                                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-[#7f8fa8] ring-1 ring-inset ring-white/10 cursor-default"
                                                                >
                                                                    +{extra} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                (trafficByProxy[proxy.name] ?? 0).toLocaleString()
                                            )}
                                        </td>
                                        <td className="p-3 text-[#7f8fa8]">
                                            {proxy.lastModifiedAt ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(proxy.lastModifiedAt).toLocaleString()}</span>
                                                    <span className="text-xs text-[#5a6a8a]">{formatRelativeTime(proxy.lastModifiedAt)}</span>
                                                </div>
                                            ) : "—"}
                                        </td>
                                        <td className="p-3 text-[#7f8fa8]">
                                            {proxy.updatedBy || proxy.lastModifiedBy || proxy.audit?.registry?.updatedBy || "—"}
                                        </td>
                                        <td className="p-3 whitespace-nowrap">
                                            {proxy.source === "LIFECYCLE_TOOL" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300 whitespace-nowrap">ForgeSphere</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300 whitespace-nowrap">API Hub</span>
                                            )}
                                        </td>
                                        <td className="p-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleProxySelect(proxy); }} className="text-[#4f8ef7] hover:text-[#6ca9ff]" title="View details"><Eye className="h-4 w-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); openProxyEditor(proxy.name); }} className="text-violet-400 hover:text-violet-300" title="Open in Proxy Editor"><FileCode2 className="h-4 w-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); showMessage(`Clone ${proxy.name} feature coming soon`, "info"); }} className="text-emerald-400 hover:text-emerald-300" title="Clone"><Copy className="h-4 w-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); showMessage(`Version management for ${proxy.name} coming soon`, "info"); }} className="text-amber-400 hover:text-amber-300" title="Versioning"><GitBranch className="h-4 w-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); showMessage(`Deprecate ${proxy.name} feature coming soon`, "info"); }} className="text-orange-400 hover:text-orange-500" title="Deprecate"><ArchiveIcon className="h-4 w-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); showMessage("Admin role is required to delete an API", "info"); }} className="text-red-400 hover:text-red-500" title="Delete"><Trash2Icon className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedProxies.length === 0 && (
                                    <tr><td colSpan="7" className="p-6 text-center text-[#7f8fa8]">No APIs found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls currentPage={proxyPage} totalItems={filteredProxies.length} pageSize={proxyPageSize} onPageChange={setProxyPage} onPageSizeChange={setProxyPageSize} />
                </>
            )}
            </div>

            {/* Create Proxy Modal - modified Backend section */}
            <Dialog open={createProxyModal.open} onOpenChange={(open) => {
                if (!open) {
                    closeCreateProxyModal();
                } else {
                    setCreateProxyModal((prev) => ({ ...prev, open }));
                }
            }}>
                <DialogContent className="max-w-6xl w-[60vw] max-h-[90vh] p-0 flex flex-col bg-[#111520] border border-[#27314e] text-white">
                    <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-[#27314e]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Create an API</DialogTitle>
                            <DialogDescription className="text-slate-400">Configure your API details, deployment environments, and service account.</DialogDescription>
                        </DialogHeader>
                    </div>
                    {!deployModeStep && (
                    <>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                        {/* API Type */}
                        <div>
                            <label className="text-sm font-medium text-white">API Type</label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {["Rest", "SOAP", "GraphQL", "MCP"].map((type) => (
                                    <label key={type} className="flex items-center gap-2">
                                        <input type="radio" name="apiType" value={type} checked={createProxyModal.apiType === type} onChange={() => setCreateProxyModal((prev) => ({ ...prev, apiType: type }))} className="accent-[#ff5b1f]" />
                                        <span className="text-white">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* Environment, Project & Application — all self-contained in this dialog,
                            independent of whatever the page-level filters happen to be set to */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-sm font-medium text-white">
                                    Environment <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={createProxyEnv}
                                    onChange={(e) => setCreateProxyEnv(e.target.value)}
                                    disabled={loadingCreateEnvs}
                                    className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                >
                                    <option value="">{loadingCreateEnvs ? "Loading environments..." : "Select Environment"}</option>
                                    {availableCreateEnvs.map((env) => (
                                        <option key={env} value={env}>{env}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white">
                                    Project <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={selectedCreateProxyProjectId}
                                    onChange={(e) => {
                                        setSelectedCreateProxyProjectId(e.target.value);
                                        setSelectedCreateProxyApplicationId("");
                                    }}
                                    disabled={loadingCreateProxyProjects}
                                    className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                >
                                    <option value="">{loadingCreateProxyProjects ? "Loading projects..." : "Select Project"}</option>
                                    {createProxyProjects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white">
                                    Application <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={selectedCreateProxyApplicationId}
                                    onChange={(e) => setSelectedCreateProxyApplicationId(e.target.value)}
                                    disabled={!selectedCreateProxyProjectId || loadingCreateProxyApplications}
                                    className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                >
                                    <option value="">
                                        {!selectedCreateProxyProjectId
                                            ? "Select a project first"
                                            : loadingCreateProxyApplications ? "Loading applications..." : "Select Application"}
                                    </option>
                                    {createProxyApplications.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Template */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400">API Template</label>
                            <select value={createProxyModal.template} onChange={(e) => { const newTemplate = e.target.value; setCreateProxyModal((prev) => ({ ...prev, template: newTemplate, openApiSpecFile: null, specParsed: false, specError: null, name: "", basePath: "/", description: "", targetUrl: "" })); setVersion(""); setBackendOption("existing"); setSelectedTargetServer(""); setProductOption("existing"); setSelectedProducts([]); }} className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]">
                                <option value="reverse">Reverse Proxy (Most common)</option>
                                <option value="no-target">No Target</option>
                                <option value="upload">Upload Proxy Bundle</option>
                                <option value="reverse-openapi">Reverse Proxy using OpenAPI Spec</option>
                                <option value="no-target-openapi">No Target using OpenAPI Spec</option>
                            </select>
                        </div>
                        {/* OpenAPI Upload (unchanged) */}
                        {(createProxyModal.template === "reverse-openapi" || createProxyModal.template === "no-target-openapi") && (
                            <div className="border border-dashed border-[#2a3550] rounded-lg p-4 bg-[#0f1117]/50">
                                {!createProxyModal.specParsed ? (
                                    <>
                                        <label className="block text-sm font-medium text-white mb-2">Upload OpenAPI Specification (JSON/YAML)</label>
                                        <input type="file" accept=".json,.yaml,.yml" onChange={(e) => { if (e.target.files[0]) handleOpenApiUpload(e.target.files[0]); }} className="w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff6b36]" />
                                        {createProxyModal.specError && <p className="mt-2 text-xs text-red-400">{createProxyModal.specError}</p>}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><span className="text-sm text-white">Spec loaded – fields pre‑filled below</span></div>
                                        <button type="button" onClick={() => setCreateProxyModal((prev) => ({ ...prev, specParsed: false, openApiSpecFile: null, name: "", basePath: "/", description: "", targetUrl: "" }))} className="text-xs text-[#ff8a5c] hover:underline">Change File</button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Proxy details (name, basePath, description) */}
                        {/* {(createProxyModal.template !== "reverse-openapi" && createProxyModal.template !== "no-target-openapi") || createProxyModal.specParsed ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-white">Proxy Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., my-api-proxy"
                                        value={createProxyModal.name}
                                        onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, name: e.target.value }))}
                                        onBlur={handleProxyNameBlur}
                                        className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                    />
                                </div>
                                {createProxyModal.template !== "upload" && (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-white">Base Path</label>
                                            <input
                                                type="text"
                                                value={createProxyModal.basePath}
                                                onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, basePath: e.target.value }))}
                                                className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-white">Description (Optional)</label>
                                            <input
                                                type="text"
                                                value={createProxyModal.description}
                                                onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, description: e.target.value }))}
                                                className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                            />
                                        </div>
                                    </>
                                )} */}
                        {(createProxyModal.template !== "reverse-openapi" && createProxyModal.template !== "no-target-openapi") || createProxyModal.specParsed ? (
                            <div className="space-y-3">
                                {/* Proxy Name */}
                                <div>
                                    <label className="text-sm font-medium text-white">
                                        API Name <span className="text-red-400">*</span>
                                    </label>
                                    <div className={`mt-1 flex overflow-hidden rounded-lg border bg-[#0f1117] focus-within:border-[#ff5b1f] transition-colors ${fieldErrors.name ? "border-red-500" : "border-[#2a3550]"}`}>
                                        {appPrefix && (
                                            <span className="flex items-center select-none whitespace-nowrap border-r border-[#2a3550] bg-[#1a1f2e] px-3 font-mono text-sm text-[#ff8a5c]">
                                                {appPrefix}
                                            </span>
                                        )}
                                        <input
                                            type="text"
                                            placeholder={appPrefix ? "api-name" : "Select a Project and Application first"}
                                            disabled={!appPrefix}
                                            value={appPrefix ? createProxyModal.name.slice(appPrefix.length) : createProxyModal.name}
                                            onChange={(e) => {
                                                const suffix = e.target.value;
                                                if (/\s/.test(suffix)) { showMessage("API name cannot contain spaces.", "error"); return; }
                                                setCreateProxyModal(prev => ({ ...prev, name: appPrefix + suffix }));
                                                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: "" }));
                                            }}
                                            onBlur={handleProxyNameBlur}
                                            className="flex-1 bg-transparent px-3 py-2 text-white focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                    {fieldErrors.name
                                        ? <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>
                                        : appPrefix && <p className="mt-1 text-xs text-slate-500">Prefix <span className="font-mono text-[#ff8a5c]">{appPrefix}</span> is locked to your selected application. Enter the API name after the prefix.</p>
                                    }
                                </div>

                                {createProxyModal.template !== "upload" && (
                                    <>
                                        {/* Version and Base Path side by side — fill Version first so Base Path can auto-fill from name + version */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-sm font-medium text-white">
                                                    Version <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., v1"
                                                    value={version}
                                                    onChange={(e) => {
                                                        setVersion(e.target.value);
                                                        if (fieldErrors.version) setFieldErrors(prev => ({ ...prev, version: "" }));
                                                    }}
                                                    onBlur={handleVersionBlur}
                                                    className={`mt-1 w-full rounded-lg border bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f] ${fieldErrors.version ? "border-red-500" : "border-[#2a3550]"}`}
                                                />
                                                {fieldErrors.version
                                                    ? <p className="mt-1 text-xs text-red-400">{fieldErrors.version}</p>
                                                    : <p className="text-xs text-slate-500 mt-1">Must contain the letter 'v' (e.g., v1, v2.0)</p>
                                                }
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-white">
                                                    Base Path <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={createProxyModal.basePath}
                                                    onFocus={handleBasePathFocus}
                                                    onChange={(e) => {
                                                        setCreateProxyModal(prev => ({ ...prev, basePath: e.target.value }));
                                                        if (fieldErrors.basePath) setFieldErrors(prev => ({ ...prev, basePath: "" }));
                                                    }}
                                                    onBlur={handleBasePathBlur}
                                                    className={`mt-1 w-full rounded-lg border bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f] ${fieldErrors.basePath ? "border-red-500" : "border-[#2a3550]"}`}
                                                />
                                                {fieldErrors.basePath
                                                    ? <p className="mt-1 text-xs text-red-400">{fieldErrors.basePath}</p>
                                                    : <p className="text-xs text-slate-500 mt-1">Auto-filled from API name + version, can be edited</p>
                                                }
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-white">Description (Optional)</label>
                                            <input
                                                type="text"
                                                value={createProxyModal.description}
                                                onChange={(e) => setCreateProxyModal(prev => ({ ...prev, description: e.target.value }))}
                                                className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                            />
                                        </div>
                                        {/* Resources (Method + Endpoint pairs) */}
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium text-white">Resources ({createProxyModal.resources.length})</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setCreateProxyModal(prev => ({
                                                        ...prev,
                                                        resources: [...prev.resources, { method: "GET", path: "" }],
                                                    }))}
                                                    className="flex items-center gap-1 text-xs font-medium text-[#ff8a5c] hover:text-[#ff5b1f]"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Add
                                                </button>
                                            </div>
                                            <div className="mt-2 space-y-2">
                                                {createProxyModal.resources.map((resource, idx) => (
                                                    <div key={idx} className="grid grid-cols-[120px_1fr_auto] gap-2 items-center">
                                                        <select
                                                            value={resource.method}
                                                            onChange={(e) => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                resources: prev.resources.map((r, i) => i === idx ? { ...r, method: e.target.value } : r),
                                                            }))}
                                                            className="rounded-lg border border-[#2a3550] bg-[#0f1117] px-2 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                        >
                                                            {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                                                                <option key={m} value={m}>{m}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="text"
                                                            placeholder="/resource-path"
                                                            value={resource.path}
                                                            onChange={(e) => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                resources: prev.resources.map((r, i) => i === idx ? { ...r, path: e.target.value } : r),
                                                            }))}
                                                            className="rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                resources: prev.resources.filter((_, i) => i !== idx),
                                                            }))}
                                                            disabled={createProxyModal.resources.length <= 1}
                                                            className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Remove"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Attach Frameworks — mutually exclusive source for how policies get
                                            attached to this API: a curated recommended framework, any other
                                            global function (shared flow), or a hand-picked set of policies.
                                            Whatever resolves here is baked into the generated bundle as real
                                            policy files, so Proxy Editor shows them when the API is reopened. */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-white">Attach Frameworks — Proxy</label>
                                            <div className="mt-2 flex flex-wrap gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="create-proxy-framework-attachment"
                                                        checked={createProxyModal.frameworkAttachment.mode === "recommended"}
                                                        onChange={() => setCreateProxyModal(prev => ({
                                                            ...prev,
                                                            frameworkAttachment: { mode: "recommended", framework: "", policies: [] },
                                                        }))}
                                                        className="border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                    />
                                                    <span className="text-white">Recommended</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="create-proxy-framework-attachment"
                                                        checked={createProxyModal.frameworkAttachment.mode === "custom"}
                                                        onChange={() => setCreateProxyModal(prev => ({
                                                            ...prev,
                                                            frameworkAttachment: { mode: "custom", framework: "", policies: [] },
                                                        }))}
                                                        className="border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                    />
                                                    <span className="text-white">Custom Framework</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="create-proxy-framework-attachment"
                                                        checked={createProxyModal.frameworkAttachment.mode === "policy"}
                                                        onChange={() => setCreateProxyModal(prev => ({
                                                            ...prev,
                                                            frameworkAttachment: { mode: "policy", framework: "", policies: [] },
                                                        }))}
                                                        className="border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                    />
                                                    <span className="text-white">Policy</span>
                                                </label>
                                            </div>

                                            {createProxyModal.frameworkAttachment.mode === "recommended" && (
                                                <div>
                                                    {loadingGlobalFunctions ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-2" />
                                                    ) : recommendedFrameworks.length === 0 ? (
                                                        <p className="mt-1 text-sm text-amber-400">No recommended frameworks available.</p>
                                                    ) : (
                                                        <select
                                                            value={createProxyModal.frameworkAttachment.framework}
                                                            onChange={(e) => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                frameworkAttachment: { ...prev.frameworkAttachment, framework: e.target.value },
                                                            }))}
                                                            className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                        >
                                                            <option value="">Select a recommended framework</option>
                                                            {recommendedFrameworks.map((sf) => (
                                                                <option key={sf.name} value={sf.name}>{sf.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}

                                            {createProxyModal.frameworkAttachment.mode === "custom" && (
                                                <div>
                                                    {loadingGlobalFunctions ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-2" />
                                                    ) : globalFunctions.length === 0 ? (
                                                        <p className="mt-1 text-sm text-amber-400">No global functions available.</p>
                                                    ) : (
                                                        <select
                                                            value={createProxyModal.frameworkAttachment.framework}
                                                            onChange={(e) => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                frameworkAttachment: { ...prev.frameworkAttachment, framework: e.target.value },
                                                            }))}
                                                            className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                        >
                                                            <option value="">Select a global function</option>
                                                            {globalFunctions.map((sf) => (
                                                                <option key={sf.name} value={sf.name}>{sf.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}

                                            {createProxyModal.frameworkAttachment.mode === "policy" && (
                                                <div className="bg-[#0f1117] rounded-lg border border-[#2a3550] p-3 max-h-48 overflow-y-auto">
                                                    <div className="space-y-2">
                                                        {POLICY_LIBRARY_FLAT.map((policy) => (
                                                            <label key={policy.name} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value={policy.name}
                                                                    checked={createProxyModal.frameworkAttachment.policies.includes(policy.name)}
                                                                    onChange={(e) => setCreateProxyModal(prev => {
                                                                        const current = prev.frameworkAttachment.policies;
                                                                        const policies = e.target.checked
                                                                            ? [...current, policy.name]
                                                                            : current.filter((p) => p !== policy.name);
                                                                        return { ...prev, frameworkAttachment: { ...prev.frameworkAttachment, policies } };
                                                                    })}
                                                                    className="rounded border-[#2a3550] bg-[#1a1f2e] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                                />
                                                                <policy.icon className="h-4 w-4 text-slate-300 shrink-0" />
                                                                <span className="text-white text-sm">{policy.name}</span>
                                                                <span className="text-xs text-slate-500">({policy.cat})</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                {/* NEW BACKEND SECTION (replaces old Backend Type) */}
                                {(createProxyModal.template === "reverse" || createProxyModal.template === "reverse-openapi") && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-white">Backend</label>
                                        <div className="flex gap-4 mt-1">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="backendOption"
                                                    value="existing"
                                                    checked={backendOption === "existing"}
                                                    onChange={() => setBackendOption("existing")}
                                                    className="accent-[#ff5b1f]"
                                                />
                                                <span className="text-white">Existing</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="backendOption"
                                                    value="new"
                                                    checked={backendOption === "new"}
                                                    onChange={handleNewBackendClick}
                                                    className="accent-[#ff5b1f]"
                                                />
                                                <span className="text-white">New</span>
                                            </label>
                                            {/* <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="backendOption"
                                                    value="new"
                                                    checked={backendOption === "new"}
                                                    onChange={() => {
                                                        setBackendOption("new");
                                                        setShowTargetServerModal(true);
                                                    }}
                                                    className="accent-[#ff5b1f]"
                                                />
                                                <span className="text-white">New</span>
                                            </label> */}
                                        </div>

                                        {backendOption === "existing" && (
                                            <div>
                                                <label className="text-sm font-medium text-white">Backend Service</label>
                                                {loadingTargetServers ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-2" />
                                                ) : !createProxyEnv ? (
                                                    <div className="mt-1 text-sm text-amber-400">Select an environment above first</div>
                                                ) : targetServers.length === 0 ? (
                                                    <div className="mt-1 text-sm text-amber-400">
                                                        No backend services available for {createProxyEnv}
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={selectedTargetServer}
                                                        onChange={(e) => setSelectedTargetServer(e.target.value)}
                                                        className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                    >
                                                        <option value="">Select a backend service</option>
                                                        {targetServers.map(ts => (
                                                            <option key={ts.name} value={ts.name}>{ts.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Using environment: {createProxyEnv || "Not selected"}
                                                </p>
                                            </div>
                                        )}

                                        {/* Attach Frameworks — Backend Service — same three-way source as the proxy's,
                                            but resolves onto the TargetEndpoint's PreFlow instead of the ProxyEndpoint's,
                                            so these policies run right before Apigee calls out to the backend. */}
                                        <div className="space-y-3 border-t border-[#27314e] pt-3">
                                            <label className="text-sm font-medium text-white">Attach Frameworks — Backend Service</label>
                                            <div className="mt-2 flex flex-wrap gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="create-proxy-backend-framework-attachment"
                                                        checked={createProxyModal.backendFrameworkAttachment.mode === "recommended"}
                                                        onChange={() => setCreateProxyModal(prev => ({
                                                            ...prev,
                                                            backendFrameworkAttachment: { mode: "recommended", framework: "", policies: [] },
                                                        }))}
                                                        className="border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                    />
                                                    <span className="text-white">Recommended</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="create-proxy-backend-framework-attachment"
                                                        checked={createProxyModal.backendFrameworkAttachment.mode === "custom"}
                                                        onChange={() => setCreateProxyModal(prev => ({
                                                            ...prev,
                                                            backendFrameworkAttachment: { mode: "custom", framework: "", policies: [] },
                                                        }))}
                                                        className="border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                    />
                                                    <span className="text-white">Custom Framework</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="create-proxy-backend-framework-attachment"
                                                        checked={createProxyModal.backendFrameworkAttachment.mode === "policy"}
                                                        onChange={() => setCreateProxyModal(prev => ({
                                                            ...prev,
                                                            backendFrameworkAttachment: { mode: "policy", framework: "", policies: [] },
                                                        }))}
                                                        className="border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                    />
                                                    <span className="text-white">Policy</span>
                                                </label>
                                            </div>

                                            {createProxyModal.backendFrameworkAttachment.mode === "recommended" && (
                                                <div>
                                                    {loadingGlobalFunctions ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-2" />
                                                    ) : recommendedFrameworks.length === 0 ? (
                                                        <p className="mt-1 text-sm text-amber-400">No recommended frameworks available.</p>
                                                    ) : (
                                                        <select
                                                            value={createProxyModal.backendFrameworkAttachment.framework}
                                                            onChange={(e) => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                backendFrameworkAttachment: { ...prev.backendFrameworkAttachment, framework: e.target.value },
                                                            }))}
                                                            className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                        >
                                                            <option value="">Select a recommended framework</option>
                                                            {recommendedFrameworks.map((sf) => (
                                                                <option key={sf.name} value={sf.name}>{sf.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}

                                            {createProxyModal.backendFrameworkAttachment.mode === "custom" && (
                                                <div>
                                                    {loadingGlobalFunctions ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-2" />
                                                    ) : globalFunctions.length === 0 ? (
                                                        <p className="mt-1 text-sm text-amber-400">No global functions available.</p>
                                                    ) : (
                                                        <select
                                                            value={createProxyModal.backendFrameworkAttachment.framework}
                                                            onChange={(e) => setCreateProxyModal(prev => ({
                                                                ...prev,
                                                                backendFrameworkAttachment: { ...prev.backendFrameworkAttachment, framework: e.target.value },
                                                            }))}
                                                            className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                                        >
                                                            <option value="">Select a global function</option>
                                                            {globalFunctions.map((sf) => (
                                                                <option key={sf.name} value={sf.name}>{sf.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}

                                            {createProxyModal.backendFrameworkAttachment.mode === "policy" && (
                                                <div className="bg-[#0f1117] rounded-lg border border-[#2a3550] p-3 max-h-48 overflow-y-auto">
                                                    <div className="space-y-2">
                                                        {POLICY_LIBRARY_FLAT.map((policy) => (
                                                            <label key={policy.name} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value={policy.name}
                                                                    checked={createProxyModal.backendFrameworkAttachment.policies.includes(policy.name)}
                                                                    onChange={(e) => setCreateProxyModal(prev => {
                                                                        const current = prev.backendFrameworkAttachment.policies;
                                                                        const policies = e.target.checked
                                                                            ? [...current, policy.name]
                                                                            : current.filter((p) => p !== policy.name);
                                                                        return { ...prev, backendFrameworkAttachment: { ...prev.backendFrameworkAttachment, policies } };
                                                                    })}
                                                                    className="rounded border-[#2a3550] bg-[#1a1f2e] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                                />
                                                                <policy.icon className="h-4 w-4 text-slate-300 shrink-0" />
                                                                <span className="text-white text-sm">{policy.name}</span>
                                                                <span className="text-xs text-slate-500">({policy.cat})</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {(createProxyModal.template === "reverse" || createProxyModal.template === "reverse-openapi") && (
                                    <div className="space-y-3 border-t border-[#27314e] pt-4">
                                        <label className="text-sm font-medium text-white">Products</label>
                                        <div className="flex gap-4 mt-1">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="productOption"
                                                    value="existing"
                                                    checked={productOption === "existing"}
                                                    onChange={() => setProductOption("existing")}
                                                    className="accent-[#ff5b1f]"
                                                />
                                                <span className="text-white">Existing</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="productOption"
                                                    value="new"
                                                    checked={productOption === "new"}
                                                    onChange={() => {
                                                        setProductOption("new");
                                                        setProductModalOpen(true); // Open modal immediately
                                                    }}
                                                    className="accent-[#ff5b1f]"
                                                />
                                                <span className="text-white">New</span>
                                            </label>
                                        </div>

                                        {productOption === "existing" && (
                                            <div className="bg-[#0f1117] rounded-lg border border-[#2a3550] p-3 max-h-48 overflow-y-auto">
                                                {loadingProducts ? (
                                                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#ff5b1f]" /></div>
                                                ) : availableProducts.length === 0 ? (
                                                    <p className="text-sm text-slate-400">No products available. Create one via "New".</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {availableProducts.map(product => (
                                                            <label key={product} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value={product}
                                                                    checked={selectedProducts.includes(product)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedProducts(prev => [...prev, product]);
                                                                        } else {
                                                                            setSelectedProducts(prev => prev.filter(p => p !== product));
                                                                        }
                                                                    }}
                                                                    className="rounded border-[#2a3550] bg-[#1a1f2e] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                                                />
                                                                <span className="text-white text-sm">{product}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {createProxyModal.template === "upload" && (
                                    <div>
                                        <label className="text-sm font-medium text-white">Zip Archive</label>
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, zipFile: e.target.files[0] }))}
                                            className="mt-1 w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff6b36]"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : null}
                        {/* Deployment Environments (unchanged) */}
                        <div>
                            <label className="text-sm font-medium text-white">Deployment Environments (Optional)</label>
                            <div className="mt-2 flex flex-wrap gap-3">
                                {loadingCreateEnvs ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : availableCreateEnvs.length === 0 ? (
                                    <span className="text-xs text-slate-500">No environments available</span>
                                ) : (
                                    availableCreateEnvs.map((env) => (
                                        <label key={env} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={createProxyModal.deploymentEnvs.includes(env)}
                                                onChange={(e) => {
                                                    const newEnvs = e.target.checked
                                                        ? [...createProxyModal.deploymentEnvs, env]
                                                        : createProxyModal.deploymentEnvs.filter((e) => e !== env);
                                                    setCreateProxyModal((prev) => ({ ...prev, deploymentEnvs: newEnvs }));
                                                }}
                                                className="rounded border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                            />
                                            <span className="text-white">{env}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
                        <Button variant="outline" onClick={closeCreateProxyModal}>Cancel</Button>
                        <Button
                            onClick={proxyBasePath === "/gateway" ? handleContinueToDeployMode : createProxy}
                            className="bg-[#ff5b1f] hover:bg-[#ff6b36]"
                        >
                            {proxyBasePath === "/gateway" ? "Continue" : "Create"}
                        </Button>
                    </div>
                    </>
                    )}

                    {/* Deployment-mode chooser (Apigee X only) — mirrors the Management API vs
                        CI/CD Pipeline pattern used for promote/rollback in APIDeploy.jsx */}
                    {deployModeStep && (
                    <>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                        <div>
                            <h3 className="text-base font-semibold text-white">How should this proxy be applied?</h3>
                            <p className="mt-1 text-sm text-slate-400">Choose how ForgeGateway pushes "{createProxyModal.name}" to Apigee X.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DeployModeCard
                                active={deployMode === "cicd"}
                                title="CI/CD Pipeline"
                                description="Commit the configuration and let your pipeline deploy it."
                                detail="ForgeGateway hands off to your configured CI/CD pipeline. You'll confirm or configure the pipeline for this application next; every change goes through the usual review and rollback path."
                                onClick={() => setDeployMode("cicd")}
                            />
                            <DeployModeCard
                                active={deployMode === "direct"}
                                title="Management API"
                                description="Apply changes directly to the gateway."
                                detail="ForgeGateway calls the gateway's management API itself. Changes take effect as soon as this finishes, and nothing is written to a configuration repository."
                                onClick={() => setDeployMode("direct")}
                            />
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
                        <Button variant="outline" onClick={() => setDeployModeStep(false)}>Back to Customize</Button>
                        <Button
                            onClick={deployMode === "cicd" ? handleContinueToCicd : createProxy}
                            className="bg-[#ff5b1f] hover:bg-[#ff6b36]"
                        >
                            {deployMode === "cicd" ? "Continue to Pipeline Setup" : "Create Proxy"}
                        </Button>
                    </div>
                    </>
                    )}
                </DialogContent>
            </Dialog>


            {/* Editor Proxy Modal - Styled like AddProxiesView */}
            <Dialog open={editorModalOpen} onOpenChange={(open) => !editorSubmitting && setEditorModalOpen(open)}>
                <DialogContent className="max-w-md p-0 bg-[#111520] border border-[#27314e] text-white overflow-hidden">
                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c]">
                        <div className="px-6 pt-6 pb-4 border-b border-[#2a3550] bg-[#0f172a]/50">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#ff8a5c]" />
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">API Details</h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Enter an API name to open in the editor</p>
                        </div>
                        <form onSubmit={handleEditorSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white mb-1">
                                    API Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., my-new-api"
                                    value={editorProxyName}
                                    onChange={(e) => {
                                        setEditorProxyName(e.target.value);
                                        setEditorError('');
                                    }}
                                    className="w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#ff5b1f] transition-colors"
                                    autoFocus
                                    disabled={editorSubmitting}
                                />
                                {editorError && (
                                    <p className="mt-2 text-sm text-red-400">{editorError}</p>
                                )}
                                <p className="mt-2 text-xs text-slate-500">
                                    Only letters, numbers, hyphens and underscores allowed.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditorModalOpen(false)}
                                    disabled={editorSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white px-6"
                                    disabled={editorSubmitting}
                                >
                                    {editorSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <>
                                            Open in Editor
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Target Server Creation Modal */}
            {showTargetServerModal && (
                <CreateTargetServerModal
                    onClose={() => {
                        setShowTargetServerModal(false);
                        setBackendOption("existing");
                    }}
                    onSuccess={(newServerName) => {
                        showMessage(`Target server "${newServerName}" created successfully!`, "success");
                        // Refetch target servers and select the new one
                        fetchTargetServersForModal().then(() => {
                            setSelectedTargetServer(newServerName);
                            setBackendOption("existing");
                        });
                    }}
                    onError={(errorMsg) => showMessage(errorMsg, "error")}
                    organization={selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg}
                    environment={createProxyEnv}
                    onboardingOptions={onboardingOptions}
                    isFetchingOnboardings={isFetchingOnboardings}
                    defaultOnboardingId={defaultOnboardingId}
                    defaultMicroserviceId={defaultMicroserviceId}
                    isGateway={true}
                    application={targetServerApp}
                />
            )}
            {/* Mini Product Creation Modal (opens on "New" selection) */}
            <Dialog open={productModalOpen} onOpenChange={(open) => {
                setProductModalOpen(open);
                if (!open && productOption === "new") {
                    setProductOption("existing"); // fallback to existing if cancelled
                }
            }}>
                <DialogContent className="max-w-2xl w-[90vw] max-h-[90vh] bg-[#111520] border border-[#27314e] text-white p-0 overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] flex flex-col min-h-0 flex-1">
                        <div className="px-6 pt-6 pb-4 border-b border-[#2a3550] bg-[#0f172a]/50 shrink-0">
                            <h2 className="text-lg font-semibold text-white">Create a new API Product</h2>
                            <p className="text-xs text-slate-400 mt-1">Basic details – you can add quotas, operations, and attributes later.</p>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto min-h-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white">Name *</label>
                                    <input
                                        type="text"
                                        value={newProductData.name}
                                        onChange={e => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                                        className="mt-1 w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                        placeholder="e.g., my-product"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white">Display Name</label>
                                    <input
                                        type="text"
                                        value={newProductData.displayName}
                                        onChange={e => setNewProductData(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="mt-1 w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white">Description</label>
                                <textarea
                                    rows={2}
                                    value={newProductData.description}
                                    onChange={e => setNewProductData(prev => ({ ...prev, description: e.target.value }))}
                                    className="mt-1 w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white">Environment</label>
                                <select
                                    value={newProductData.environment}
                                    onChange={e => setNewProductData(prev => ({ ...prev, environment: e.target.value }))}
                                    className="mt-1 w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="">All environments</option>
                                    {availableCreateEnvs.map(env => <option key={env} value={env}>{env}</option>)}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Leave empty to allow access from any environment.</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white block mb-2">Access *</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="accessType"
                                            value="private"
                                            checked={newProductData.accessType === "private"}
                                            onChange={() => setNewProductData(prev => ({ ...prev, accessType: "private" }))}
                                            className="accent-[#ff5b1f]"
                                        /> Private
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="accessType"
                                            value="public"
                                            checked={newProductData.accessType === "public"}
                                            onChange={() => setNewProductData(prev => ({ ...prev, accessType: "public" }))}
                                            className="accent-[#ff5b1f]"
                                        /> Public
                                    </label>
                                </div>
                            </div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newProductData.autoApprove}
                                    onChange={e => setNewProductData(prev => ({ ...prev, autoApprove: e.target.checked }))}
                                    className="rounded border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                                />
                                <span className="text-sm text-white">Automatically approve access requests</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#2a3550] bg-[#0f172a]/50 shrink-0">
                            <Button variant="outline" onClick={() => { setProductModalOpen(false); setProductOption("existing"); }}>Cancel</Button>
                            <Button onClick={createNewProduct} className="bg-[#ff5b1f] hover:bg-[#ff6b36]">Create Product</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};




// // src/components/Gateway/ProxiesView.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//     Eye,
//     Copy,
//     GitBranch,
//     ArchiveIcon,
//     Plus,
//     Search,
//     Loader2,
//     AlertCircle,
//     X,
//     CheckCircle,
//     Trash2Icon,
// } from "lucide-react";
// import { Button } from "../../components/ui/button";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
// import { fetchApigeeToken } from "../../services/apigeeToken";
// import { GatewayContextSelector } from "./GatewayContextSelector";
// import JSZip from "jszip";
// import { PaginationControls } from "../../components/ui/PaginationControls";

// export const ProxiesView = ({ showMessage }) => {
//     const navigate = useNavigate();
//     const [searchTerm, setSearchTerm] = useState("");
//     const [apiTypeFilter, setApiTypeFilter] = useState("ALL");
//     const [apiProxies, setApiProxies] = useState([]);
//     const [loadingProxies, setLoadingProxies] = useState(false);
//     const [proxiesError, setProxiesError] = useState(null);
//     const [selectedOrg, setSelectedOrg] = useState("");
//     const [selectedBU, setSelectedBU] = useState("");
//     const [selectedEnv, setSelectedEnv] = useState("ALL");

//     // Pagination
//     const [proxyPage, setProxyPage] = useState(1);
//     const [proxyPageSize, setProxyPageSize] = useState(10);

//     // Create Proxy Modal State
//     const [createProxyModal, setCreateProxyModal] = useState({
//         open: false,
//         template: "reverse",
//         name: "",
//         basePath: "/",
//         description: "",
//         targetUrl: "",
//         zipFile: null,
//         deploymentEnvs: [],
//         apiType: "REST",
//         openApiSpecFile: null,
//         specParsed: false,
//         specError: null,
//     });
//     const [availableCreateEnvs, setAvailableCreateEnvs] = useState([]);
//     const [loadingCreateEnvs, setLoadingCreateEnvs] = useState(false);

//     // Backend Service states
//     const [backendType, setBackendType] = useState("url"); // "url" or "service"
//     const [targetServers, setTargetServers] = useState([]);
//     const [selectedTargetServer, setSelectedTargetServer] = useState("");
//     const [loadingTargetServers, setLoadingTargetServers] = useState(false);

//     // Helper: generate base path from proxy name (first word, lowercase, no spaces)
//     const generateBasePathFromName = (name) => {
//         if (!name) return "/";
//         // Take first word before any space
//         const firstWord = name.trim().split(/\s+/)[0];
//         // Convert to lowercase, replace any non-alphanumeric with dash, ensure starts with slash
//         const clean = firstWord.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
//         return `/${clean}`;
//     };

//     // Auto-set base path when proxy name loses focus
//     const handleProxyNameBlur = () => {
//         const newBasePath = generateBasePathFromName(createProxyModal.name);
//         setCreateProxyModal(prev => ({ ...prev, basePath: newBasePath }));
//     };

//     // Fetch environments for create modal
//     const fetchCreateEnvironments = async () => {
//         if (!selectedOrg) return;
//         setLoadingCreateEnvs(true);
//         const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
//         try {
//             const token = await fetchApigeeToken();
//             const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/environments`;
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

//     // Reset page when filters change
//     useEffect(() => {
//         setProxyPage(1);
//     }, [searchTerm, apiTypeFilter, selectedEnv]);

//     // Fetch proxies
//     const fetchProxies = async () => {
//         setLoadingProxies(true);
//         setProxiesError(null);
//         const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
//         try {
//             const token = await fetchApigeeToken();
//             const response = await fetch(
//                 `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/details`,
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );
//             if (!response.ok) throw new Error(`Failed to fetch proxies: ${response.statusText}`);
//             const data = await response.json();
//             setApiProxies(data.proxies || []);
//         } catch (err) {
//             showMessage(`Could not load proxies: ${err.message}`, "error");
//             setApiProxies([]);
//         } finally {
//             setLoadingProxies(false);
//         }
//     };

//     useEffect(() => {
//         if (selectedOrg) fetchProxies();
//     }, [selectedOrg]);

//     useEffect(() => {
//         if (createProxyModal.open && selectedOrg) fetchCreateEnvironments();
//     }, [createProxyModal.open, selectedOrg]);

//     // Fetch target servers when backend type is service and environment is selected
//     useEffect(() => {
//         const fetchTargetServersForModal = async () => {
//             if (backendType !== "service") {
//                 setTargetServers([]);
//                 setSelectedTargetServer("");
//                 return;
//             }
//             const orgForTarget = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
//             if (!orgForTarget || !selectedEnv || selectedEnv === "ALL" || selectedEnv === "NOT_DEPLOYED") {
//                 setTargetServers([]);
//                 setSelectedTargetServer("");
//                 return;
//             }
//             setLoadingTargetServers(true);
//             try {
//                 const token = await fetchApigeeToken();
//                 const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${orgForTarget}/environments/${selectedEnv}/targetservers`;
//                 const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//                 if (response.ok) {
//                     const data = await response.json();
//                     const list = Array.isArray(data)
//                         ? data.map(item => (typeof item === 'string' ? { name: item } : item))
//                         : [];
//                     setTargetServers(list);
//                 } else {
//                     setTargetServers([]);
//                 }
//             } catch (err) {
//                 console.error("Failed to fetch target servers:", err);
//                 setTargetServers([]);
//             } finally {
//                 setLoadingTargetServers(false);
//             }
//         };
//         fetchTargetServersForModal();
//     }, [backendType, selectedOrg, selectedEnv, createProxyModal.open]);

//     // Filtering logic
//     const filteredBySearchAndEnv = useMemo(() => {
//         return apiProxies.filter((proxy) => {
//             const matchesSearch = proxy.name?.toLowerCase().includes(searchTerm.toLowerCase());
//             let matchesEnv = true;
//             if (selectedEnv === "NOT_DEPLOYED") {
//                 const hasEnvSummary = proxy.environmentSummary && proxy.environmentSummary !== "Not deployed";
//                 const hasEnvironments = proxy.environments && proxy.environments.length > 0;
//                 matchesEnv = !hasEnvSummary && !hasEnvironments;
//             } else if (selectedEnv && selectedEnv !== "ALL") {
//                 matchesEnv = proxy.environmentSummary === selectedEnv || (proxy.environments?.includes(selectedEnv));
//             }
//             return matchesSearch && matchesEnv;
//         });
//     }, [apiProxies, searchTerm, selectedEnv]);

//     const typeCounts = useMemo(() => {
//         const counts = { ALL: filteredBySearchAndEnv.length };
//         filteredBySearchAndEnv.forEach((proxy) => {
//             const t = proxy.type || "REST";
//             counts[t] = (counts[t] || 0) + 1;
//         });
//         return counts;
//     }, [filteredBySearchAndEnv]);

//     const filteredProxies = useMemo(() => {
//         return filteredBySearchAndEnv.filter((proxy) => {
//             const matchesType = apiTypeFilter === "ALL" || (proxy.type || "REST") === apiTypeFilter;
//             return matchesType;
//         });
//     }, [filteredBySearchAndEnv, apiTypeFilter]);

//     const paginatedProxies = useMemo(() => {
//         const start = (proxyPage - 1) * proxyPageSize;
//         return filteredProxies.slice(start, start + proxyPageSize);
//     }, [filteredProxies, proxyPage, proxyPageSize]);

//     const typeTabs = [
//         { label: "ALL", value: "ALL" },
//         { label: "Rest", value: "REST" },
//         { label: "SOAP", value: "SOAP" },
//         { label: "GraphQL", value: "GraphQL" },
//         { label: "MCP", value: "MCP" },
//     ];

//     const formatTypeLabel = (type) => {
//         if (!type) return "Rest";
//         if (type === "REST") return "Rest";
//         return type;
//     };

//     // Generate proxy zip (supports target server)
//     const generateProxyZip = async (template, { name, basePath, targetUrl, targetServer }) => {
//         const zip = new JSZip();
//         const apiproxyFolder = zip.folder("apiproxy");
//         const apiProxyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <APIProxy revision="1" name="${name}">
//   <BasePaths>${basePath}</BasePaths>
//   <ProxyEndpoints><ProxyEndpoint>default</ProxyEndpoint></ProxyEndpoints>
//   ${template === "reverse" ? "<TargetEndpoints><TargetEndpoint>default</TargetEndpoint></TargetEndpoints>" : ""}
// </APIProxy>`;
//         apiproxyFolder.file(`${name}.xml`, apiProxyXml);
//         const proxiesFolder = apiproxyFolder.folder("proxies");
//         const proxyEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <ProxyEndpoint name="default">
//   <HTTPProxyConnection><BasePath>${basePath}</BasePath></HTTPProxyConnection>
//   <RouteRule name="default"/>
// </ProxyEndpoint>`;
//         proxiesFolder.file("default.xml", proxyEndpointXml);
//         if (template === "reverse") {
//             const targetsFolder = apiproxyFolder.folder("targets");
//             let targetEndpointXml = "";
//             if (targetServer) {
//                 targetEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <TargetEndpoint name="default">
//   <HTTPTargetConnection>
//     <LoadBalancer>
//       <Server name="${targetServer}"/>
//     </LoadBalancer>
//   </HTTPTargetConnection>
// </TargetEndpoint>`;
//             } else {
//                 targetEndpointXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
// <TargetEndpoint name="default">
//   <HTTPTargetConnection><URL>${targetUrl}</URL></HTTPTargetConnection>
// </TargetEndpoint>`;
//             }
//             targetsFolder.file("default.xml", targetEndpointXml);
//         }
//         const content = await zip.generateAsync({ type: "blob" });
//         return new File([content], `${name}.zip`, { type: "application/zip" });
//     };

//     const parseOpenApiSpec = (file) => {
//         return new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onload = (e) => {
//                 const content = e.target.result;
//                 let spec;
//                 try {
//                     spec = JSON.parse(content);
//                 } catch (jsonError) {
//                     reject(new Error("Only JSON OpenAPI specs are supported in this version"));
//                     return;
//                 }
//                 if (!spec.info?.title) {
//                     reject(new Error("OpenAPI spec missing 'info.title' field."));
//                     return;
//                 }
//                 if (!spec.servers || spec.servers.length === 0) {
//                     reject(new Error("OpenAPI spec missing 'servers' array."));
//                     return;
//                 }
//                 let proxyName = spec.info.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
//                 let basePath = "/";
//                 let targetUrl = "";
//                 const serverUrl = spec.servers[0].url;
//                 try {
//                     const urlObj = new URL(serverUrl);
//                     targetUrl = `${urlObj.protocol}//${urlObj.host}`;
//                     basePath = urlObj.pathname || "/";
//                 } catch (e) {
//                     targetUrl = serverUrl;
//                 }
//                 const description = spec.info.description || "";
//                 resolve({ name: proxyName, basePath, description, targetUrl });
//             };
//             reader.onerror = () => reject(new Error("Failed to read file."));
//             reader.readAsText(file);
//         });
//     };

//     const handleOpenApiUpload = async (file) => {
//         setCreateProxyModal((prev) => ({ ...prev, specError: null, openApiSpecFile: file }));
//         try {
//             const extracted = await parseOpenApiSpec(file);
//             setCreateProxyModal((prev) => ({
//                 ...prev,
//                 name: extracted.name,
//                 basePath: extracted.basePath,
//                 description: extracted.description,
//                 targetUrl: extracted.targetUrl,
//                 specParsed: true,
//                 specError: null,
//             }));
//         } catch (err) {
//             setCreateProxyModal((prev) => ({
//                 ...prev,
//                 specError: err.message,
//                 specParsed: false,
//                 openApiSpecFile: null,
//             }));
//         }
//     };

//     // const createProxy = async () => {
//     //     const modal = createProxyModal;
//     //     if (!modal.name.trim()) {
//     //         showMessage("Proxy name is required.", "error");
//     //         return;
//     //     }
//     //     if (modal.template === "reverse" && backendType === "url" && !modal.targetUrl.trim()) {
//     //         showMessage("Backend URL is required for Reverse proxy.", "error");
//     //         return;
//     //     }
//     //     if (modal.template === "reverse" && backendType === "service" && !selectedTargetServer) {
//     //         showMessage("Please select a backend service.", "error");
//     //         return;
//     //     }
//     //     if (modal.template === "upload" && !modal.zipFile) {
//     //         showMessage("Please select a ZIP archive.", "error");
//     //         return;
//     //     }
//     //     if ((modal.template === "reverse-openapi" || modal.template === "no-target-openapi") && !modal.specParsed) {
//     //         showMessage("Please upload a valid OpenAPI specification file first.", "error");
//     //         return;
//     //     }

//     //     const token = await fetchApigeeToken();
//     //     if (!token) {
//     //         showMessage("Failed to obtain authentication token.", "error");
//     //         return;
//     //     }

//     //     try {
//     //         let zipToUpload = null;
//     //         if (modal.template === "reverse" || modal.template === "no-target") {
//     //             zipToUpload = await generateProxyZip(modal.template, {
//     //                 name: modal.name,
//     //                 basePath: modal.basePath,
//     //                 targetUrl: modal.targetUrl,
//     //                 targetServer: backendType === "service" ? selectedTargetServer : null,
//     //             });
//     //         } else if (modal.template === "upload") {
//     //             zipToUpload = modal.zipFile;
//     //         } else {
//     //             showMessage("OpenAPI proxy creation not fully implemented in this version", "info");
//     //             return;
//     //         }

//     //         const formData = new FormData();
//     //         formData.append("file", zipToUpload);
//     //         const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
//     //         const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis?action=import&name=${encodeURIComponent(modal.name)}`;
//     //         const response = await fetch(uploadUrl, {
//     //             method: "POST",
//     //             headers: { Authorization: `Bearer ${token}` },
//     //             body: formData,
//     //         });
//     //         if (!response.ok) {
//     //             const errorText = await response.text();
//     //             throw new Error(errorText || `Upload failed with status ${response.status}`);
//     //         }
//     //         showMessage(`Proxy "${modal.name}" created successfully!`, "success");
//     //         setCreateProxyModal({
//     //             open: false,
//     //             template: "reverse",
//     //             name: "",
//     //             basePath: "/",
//     //             description: "",
//     //             targetUrl: "",
//     //             zipFile: null,
//     //             deploymentEnvs: [],
//     //             apiType: "REST",
//     //             openApiSpecFile: null,
//     //             specParsed: false,
//     //             specError: null,
//     //         });
//     //         setBackendType("url");
//     //         setSelectedTargetServer("");
//     //         await fetchProxies();
//     //     } catch (err) {
//     //         showMessage(`Creation failed: ${err.message}`, "error");
//     //     }
//     // };

//     const createProxy = async () => {
//     const modal = createProxyModal;
//     if (!modal.name.trim()) {
//         showMessage("Proxy name is required.", "error");
//         return;
//     }
//     if (modal.template === "reverse" && backendType === "url" && !modal.targetUrl.trim()) {
//         showMessage("Backend URL is required for Reverse proxy.", "error");
//         return;
//     }
//     if (modal.template === "reverse" && backendType === "service" && !selectedTargetServer) {
//         showMessage("Please select a Backend service.", "error");
//         return;
//     }
//     if (modal.template === "upload" && !modal.zipFile) {
//         showMessage("Please select a ZIP archive.", "error");
//         return;
//     }
//     if ((modal.template === "reverse-openapi" || modal.template === "no-target-openapi") && !modal.specParsed) {
//         showMessage("Please upload a valid OpenAPI specification file first.", "error");
//         return;
//     }

//     const token = await fetchApigeeToken();
//     if (!token) {
//         showMessage("Failed to obtain authentication token.", "error");
//         return;
//     }

//     try {
//         let zipToUpload = null;
//         if (modal.template === "reverse" || modal.template === "no-target") {
//             zipToUpload = await generateProxyZip(modal.template, {
//                 name: modal.name,
//                 basePath: modal.basePath,
//                 targetUrl: modal.targetUrl,
//                 targetServer: backendType === "service" ? selectedTargetServer : null,
//             });
//         } else if (modal.template === "upload") {
//             zipToUpload = modal.zipFile;
//         } else {
//             showMessage("OpenAPI proxy creation not fully implemented in this version", "info");
//             return;
//         }

//         const formData = new FormData();
//         formData.append("file", zipToUpload);
//         const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
//         const uploadUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis?action=import&name=${encodeURIComponent(modal.name)}`;
//         const response = await fetch(uploadUrl, {
//             method: "POST",
//             headers: { Authorization: `Bearer ${token}` },
//             body: formData,
//         });
//         if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(errorText || `Upload failed with status ${response.status}`);
//         }

//         showMessage(`Proxy "${modal.name}" created successfully!`, "success");

//         // Reset modal state
//         setCreateProxyModal({
//             open: false,
//             template: "reverse",
//             name: "",
//             basePath: "/",
//             description: "",
//             targetUrl: "",
//             zipFile: null,
//             deploymentEnvs: [],
//             apiType: "REST",
//             openApiSpecFile: null,
//             specParsed: false,
//             specError: null,
//         });
//         setBackendType("url");
//         setSelectedTargetServer("");

//         // Refresh the proxies list
//         await fetchProxies();

//         // --- Auto‑redirect to Proxy Editor ---
//         try {
//             // 1. Get proxy details to fetch the latest revision
//             const detailsUrl = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/apis/${modal.name}/details`;
//             const detailsRes = await fetch(detailsUrl, { headers: { Authorization: `Bearer ${token}` } });
//             if (detailsRes.ok) {
//                 const detailsData = await detailsRes.json();
//                 const latestRev = detailsData.proxy?.latestRevisionId;
//                 if (latestRev) {
//                     // 2. Download the bundle zip for the latest revision
//                     const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/apis/${modal.name}/revisions/${latestRev}/?format=bundle`;
//                     const bundleRes = await fetch(bundleUrl, { headers: { Authorization: `Bearer ${token}` } });
//                     if (bundleRes.ok) {
//                         const blob = await bundleRes.blob();
//                         const zipUrl = URL.createObjectURL(blob);
//                         // 3. Navigate to the proxy editor
//                         navigate('/proxy-editor', {
//                             state: {
//                                 zipUrl,
//                                 selectedProxyName: modal.name,
//                                 backTo: `/gateway/proxy/${modal.name}`,
//                                 backState: { proxy: { name: modal.name } },
//                             }
//                         });
//                         return; // Stop further execution (component will unmount)
//                     } else {
//                         console.warn("Failed to fetch bundle for editor", bundleRes.status);
//                     }
//                 } else {
//                     console.warn("No revision found for newly created proxy");
//                 }
//             } else {
//                 console.warn("Failed to fetch proxy details after creation", detailsRes.status);
//             }
//             // If we reach here, redirect failed; stay on page and show a warning
//             showMessage("Proxy created, but could not open editor automatically. You can edit from the proxy details page.", "warning");
//         } catch (err) {
//             console.error("Error while opening editor:", err);
//             showMessage("Proxy created successfully, but auto‑open of editor failed. Please open it manually.", "warning");
//         }
//     } catch (err) {
//         showMessage(`Creation failed: ${err.message}`, "error");
//     }
// };
//     const handleProxySelect = (proxy) => {
//         navigate(`/gateway/proxy/${proxy.name}`, { state: { proxy } });
//     };

//     const handleCreateClick = () => {
//         let initialApiType = "Rest";
//         if (apiTypeFilter !== "ALL") {
//             const typeMap = {
//                 "REST": "Rest",
//                 "SOAP": "SOAP",
//                 "GraphQL": "GraphQL",
//                 "MCP": "MCP"
//             };
//             initialApiType = typeMap[apiTypeFilter] || "Rest";
//         }
//         setCreateProxyModal(prev => ({
//             ...prev,
//             open: true,
//             apiType: initialApiType
//         }));
//         setBackendType("url");
//         setSelectedTargetServer("");
//     };

//     return (
//         <div className="flex flex-col gap-2 p-6">
//             <div className="flex justify-between items-center flex-wrap gap-3">
//                 <h2 className="text-xl font-semibold text-white">Proxy</h2>
//                 <GatewayContextSelector
//                     selectedOrg={selectedOrg}
//                     setSelectedOrg={setSelectedOrg}
//                     selectedBU={selectedBU}
//                     setSelectedBU={setSelectedBU}
//                     selectedEnv={selectedEnv}
//                     setSelectedEnv={setSelectedEnv}
//                     showEnv={true}
//                 />
//             </div>

//             <div className="flex items-center justify-between flex-wrap gap-2">
//                 <div className="flex items-center gap-1 bg-[#1a1f2e] rounded-lg p-1">
//                     {typeTabs.map((tab) => (
//                         <button
//                             key={tab.value}
//                             onClick={() => setApiTypeFilter(tab.value)}
//                             className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
//                                 apiTypeFilter === tab.value
//                                     ? "bg-[#ff5b1f] text-white shadow-sm"
//                                     : "text-[#7f8fa8] hover:text-white hover:bg-[#2a3550]"
//                             }`}
//                         >
//                             {tab.label}
//                             <span className="ml-2 text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
//                                 {typeCounts[tab.value] || 0}
//                             </span>
//                         </button>
//                     ))}
//                 </div>
//                 <div className="flex items-center gap-3">
//                     <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
//                         <input
//                             type="text"
//                             placeholder="Filter APIs..."
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             className="bg-[#1a1f2e] focus:outline-none border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64 text-white"
//                         />
//                     </div>
//                     <Button onClick={handleCreateClick} className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white whitespace-nowrap">
//                         <Plus className="mr-2 h-4 w-4" /> Create
//                     </Button>
//                 </div>
//             </div>

//             {loadingProxies ? (
//                 <div className="p-6 text-center text-[#7f8fa8]">
//                     <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
//                     <p>Loading APIs...</p>
//                 </div>
//             ) : proxiesError ? (
//                 <div className="p-6 text-center text-red-400">
//                     <AlertCircle className="h-6 w-6 mx-auto mb-2" />
//                     <p>Error: {proxiesError}</p>
//                     <button onClick={fetchProxies} className="mt-2 text-sm text-[#4f8ef7] hover:underline">Retry</button>
//                 </div>
//             ) : (
//                 <>
//                     <div className="bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
//                         <table className="w-full text-sm">
//                             <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                                 <tr>
//                                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Name</th>
//                                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Type</th>
//                                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Environment</th>
//                                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Last Modified</th>
//                                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Source</th>
//                                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {paginatedProxies.map((proxy) => (
//                                     <tr key={proxy.name} className="border-b border-[#1f2840] hover:bg-[#1a1f2e] cursor-pointer" onClick={() => handleProxySelect(proxy)}>
//                                         <td className="p-3 text-white font-mono text-sm">{proxy.name}</td>
//                                         <td className="p-3">
//                                             <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
//                                                 (proxy.type || "REST") === "REST" ? "bg-blue-500/20 text-blue-300" :
//                                                 (proxy.type || "REST") === "SOAP" ? "bg-purple-500/20 text-purple-300" :
//                                                 (proxy.type || "REST") === "GraphQL" ? "bg-pink-500/20 text-pink-300" :
//                                                 "bg-emerald-500/20 text-emerald-300"
//                                             }`}>
//                                                 {formatTypeLabel(proxy.type)}
//                                             </span>
//                                         </td>
//                                         <td className="p-3 text-[#7f8fa8]">
//                                             {proxy.environmentSummary || (proxy.environments?.length ? proxy.environments.join(", ") : "Not deployed")}
//                                         </td>
//                                         <td className="p-3 text-[#7f8fa8]">
//                                             {proxy.lastModifiedAt ? new Date(proxy.lastModifiedAt).toLocaleDateString() : "—"}
//                                         </td>
//                                         <td className="p-3">
//                                             {proxy.source === "LIFECYCLE_TOOL" ? (
//                                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">ForgeSphere</span>
//                                             ) : (
//                                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">API Hub</span>
//                                             )}
//                                         </td>
//                                         <td className="p-3">
//                                             <div className="flex items-center gap-2">
//                                                 <button onClick={(e) => { e.stopPropagation(); handleProxySelect(proxy); }} className="text-[#4f8ef7] hover:text-[#6ca9ff]" title="View details"><Eye className="h-4 w-4" /></button>
//                                                 <button onClick={(e) => { e.stopPropagation(); showMessage(`Clone ${proxy.name} feature coming soon`, "info"); }} className="text-emerald-400 hover:text-emerald-300" title="Clone"><Copy className="h-4 w-4" /></button>
//                                                 <button onClick={(e) => { e.stopPropagation(); showMessage(`Version management for ${proxy.name} coming soon`, "info"); }} className="text-amber-400 hover:text-amber-300" title="Versioning"><GitBranch className="h-4 w-4" /></button>
//                                                 <button onClick={(e) => { e.stopPropagation(); showMessage(`Deprecate ${proxy.name} feature coming soon`, "info"); }} className="text-orange-400 hover:text-orange-500" title="Deprecate"><ArchiveIcon className="h-4 w-4" /></button>
//                                                 <button onClick={(e) => { e.stopPropagation(); showMessage("Admin role is required to delete a proxy","info"); }} className="text-red-400 hover:text-red-500" title="Delete"><Trash2Icon className="h-4 w-4" /></button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))}
//                                 {paginatedProxies.length === 0 && (
//                                     <tr><td colSpan="6" className="p-6 text-center text-[#7f8fa8]">No APIs found.</td></tr>
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                     <PaginationControls currentPage={proxyPage} totalItems={filteredProxies.length} pageSize={proxyPageSize} onPageChange={setProxyPage} onPageSizeChange={setProxyPageSize} />
//                 </>
//             )}

//             {/* Create Proxy Modal */}
//             <Dialog open={createProxyModal.open} onOpenChange={(open) => setCreateProxyModal((prev) => ({ ...prev, open }))}>
//                 <DialogContent className="max-w-6xl w-[60vw] max-h-[90vh] p-0 flex flex-col bg-[#111520] border border-[#27314e] text-white">
//                     <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-[#27314e]">
//                         <DialogHeader>
//                             <DialogTitle className="text-xl font-semibold">Create a proxy</DialogTitle>
//                             <DialogDescription className="text-slate-400">Configure your proxy details, deployment environments, and service account.</DialogDescription>
//                         </DialogHeader>
//                     </div>
//                     <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
//                         {/* API Type */}
//                         <div>
//                             <label className="text-sm font-medium text-white">API Type</label>
//                             <div className="flex flex-wrap gap-4 mt-2">
//                                 {["Rest", "SOAP", "GraphQL", "MCP"].map((type) => (
//                                     <label key={type} className="flex items-center gap-2">
//                                         <input type="radio" name="apiType" value={type} checked={createProxyModal.apiType === type} onChange={() => setCreateProxyModal((prev) => ({ ...prev, apiType: type }))} className="accent-[#ff5b1f]" />
//                                         <span className="text-white">{type}</span>
//                                     </label>
//                                 ))}
//                             </div>
//                         </div>
//                         {/* Template */}
//                         <div>
//                             <label className="text-xs font-semibold text-slate-400">API Template</label>
//                             <select value={createProxyModal.template} onChange={(e) => { const newTemplate = e.target.value; setCreateProxyModal((prev) => ({ ...prev, template: newTemplate, openApiSpecFile: null, specParsed: false, specError: null, name: "", basePath: "/", description: "", targetUrl: "" })); setBackendType("url"); setSelectedTargetServer(""); }} className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]">
//                                 <option value="reverse">Reverse Proxy (Most common)</option>
//                                 <option value="no-target">No Target</option>
//                                 <option value="upload">Upload Proxy Bundle</option>
//                                 <option value="reverse-openapi">Reverse Proxy using OpenAPI Spec</option>
//                                 <option value="no-target-openapi">No Target using OpenAPI Spec</option>
//                             </select>
//                         </div>
//                         {/* OpenAPI Upload */}
//                         {(createProxyModal.template === "reverse-openapi" || createProxyModal.template === "no-target-openapi") && (
//                             <div className="border border-dashed border-[#2a3550] rounded-lg p-4 bg-[#0f1117]/50">
//                                 {!createProxyModal.specParsed ? (
//                                     <>
//                                         <label className="block text-sm font-medium text-white mb-2">Upload OpenAPI Specification (JSON/YAML)</label>
//                                         <input type="file" accept=".json,.yaml,.yml" onChange={(e) => { if (e.target.files[0]) handleOpenApiUpload(e.target.files[0]); }} className="w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff6b36]" />
//                                         {createProxyModal.specError && <p className="mt-2 text-xs text-red-400">{createProxyModal.specError}</p>}
//                                     </>
//                                 ) : (
//                                     <div className="flex items-center justify-between">
//                                         <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><span className="text-sm text-white">Spec loaded – fields pre‑filled below</span></div>
//                                         <button type="button" onClick={() => setCreateProxyModal((prev) => ({ ...prev, specParsed: false, openApiSpecFile: null, name: "", basePath: "/", description: "", targetUrl: "" }))} className="text-xs text-[#ff8a5c] hover:underline">Change File</button>
//                                     </div>
//                                 )}
//                             </div>
//                         )}
//                         {/* Proxy details */}
//                         {(createProxyModal.template !== "reverse-openapi" && createProxyModal.template !== "no-target-openapi") || createProxyModal.specParsed ? (
//                             <div className="space-y-3">
//                                 <div>
//                                     <label className="text-sm font-medium text-white">Proxy Name</label>
//                                     <input
//                                         type="text"
//                                         placeholder="e.g., my-api-proxy"
//                                         value={createProxyModal.name}
//                                         onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, name: e.target.value }))}
//                                         onBlur={handleProxyNameBlur}
//                                         className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                     />
//                                 </div>
//                                 {createProxyModal.template !== "upload" && (
//                                     <>
//                                         <div>
//                                             <label className="text-sm font-medium text-white">Base Path</label>
//                                             <input
//                                                 type="text"
//                                                 value={createProxyModal.basePath}
//                                                 onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, basePath: e.target.value }))}
//                                                 className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                             />
//                                         </div>
//                                         <div>
//                                             <label className="text-sm font-medium text-white">Description (Optional)</label>
//                                             <input
//                                                 type="text"
//                                                 value={createProxyModal.description}
//                                                 onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, description: e.target.value }))}
//                                                 className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                             />
//                                         </div>
//                                     </>
//                                 )}
//                                 {(createProxyModal.template === "reverse" || createProxyModal.template === "reverse-openapi") && (
//                                     <div className="space-y-3">
//                                         <div>
//                                             <label className="text-sm font-medium text-white">Backend Type</label>
//                                             <div className="flex gap-4 mt-1">
//                                                 <label className="flex items-center gap-2">
//                                                     <input type="radio" name="backendType" value="url" checked={backendType === "url"} onChange={() => setBackendType("url")} className="accent-[#ff5b1f]" />
//                                                     <span className="text-white">Backend URL</span>
//                                                 </label>
//                                                 <label className="flex items-center gap-2">
//                                                     <input type="radio" name="backendType" value="service" checked={backendType === "service"} onChange={() => setBackendType("service")} className="accent-[#ff5b1f]" />
//                                                     <span className="text-white">Backend Service</span>
//                                                 </label>
//                                             </div>
//                                         </div>
//                                         {backendType === "url" ? (
//                                             <div>
//                                                 <label className="text-sm font-medium text-white">Backend URL</label>
//                                                 <input
//                                                     type="url"
//                                                     placeholder="https://api.example.com"
//                                                     value={createProxyModal.targetUrl}
//                                                     onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, targetUrl: e.target.value }))}
//                                                     className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                                 />
//                                             </div>
//                                         ) : (
//                                             <div>
//                                                 <label className="text-sm font-medium text-white">Backend Service</label>
//                                                 {loadingTargetServers ? (
//                                                     <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-2" />
//                                                 ) : targetServers.length === 0 ? (
//                                                     <div className="mt-1 text-sm text-amber-400">
//                                                         No backend services available for {selectedEnv !== "ALL" && selectedEnv !== "NOT_DEPLOYED" ? selectedEnv : "current environment"}
//                                                     </div>
//                                                 ) : (
//                                                     <select
//                                                         value={selectedTargetServer}
//                                                         onChange={(e) => setSelectedTargetServer(e.target.value)}
//                                                         className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
//                                                     >
//                                                         <option value="">Select a backend service</option>
//                                                         {targetServers.map(ts => (
//                                                             <option key={ts.name} value={ts.name}>{ts.name}</option>
//                                                         ))}
//                                                     </select>
//                                                 )}
//                                                 <p className="text-xs text-slate-500 mt-1">
//                                                     Using environment: {selectedEnv !== "ALL" && selectedEnv !== "NOT_DEPLOYED" ? selectedEnv : "Not selected"}
//                                                 </p>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}
//                                 {createProxyModal.template === "upload" && (
//                                     <div>
//                                         <label className="text-sm font-medium text-white">Zip Archive</label>
//                                         <input
//                                             type="file"
//                                             accept=".zip"
//                                             onChange={(e) => setCreateProxyModal((prev) => ({ ...prev, zipFile: e.target.files[0] }))}
//                                             className="mt-1 w-full text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff5b1f] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff6b36]"
//                                         />
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
//                                     availableCreateEnvs.map((env) => (
//                                         <label key={env} className="flex items-center gap-2">
//                                             <input
//                                                 type="checkbox"
//                                                 checked={createProxyModal.deploymentEnvs.includes(env)}
//                                                 onChange={(e) => {
//                                                     const newEnvs = e.target.checked
//                                                         ? [...createProxyModal.deploymentEnvs, env]
//                                                         : createProxyModal.deploymentEnvs.filter((e) => e !== env);
//                                                     setCreateProxyModal((prev) => ({ ...prev, deploymentEnvs: newEnvs }));
//                                                 }}
//                                                 className="rounded border-[#2a3550] bg-[#0f1117] text-[#ff5b1f] focus:ring-[#ff5b1f]"
//                                             />
//                                             <span className="text-white">{env}</span>
//                                         </label>
//                                     ))
//                                 )}
//                             </div>
//                         </div>
//                     </div>
//                     <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
//                         <Button variant="outline" onClick={() => setCreateProxyModal((prev) => ({ ...prev, open: false }))}>Cancel</Button>
//                         <Button onClick={createProxy} className="bg-[#ff5b1f] hover:bg-[#ff6b36]">Create</Button>
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// };
