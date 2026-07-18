import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../config/kongConfig";
import { kongFetch } from "../../utils/kongFetch";
import {
    CheckCircle,
    AlertCircle,
    Pencil,
    FileCode,
    Plug,
    Play,
    XCircle,
    ArrowLeft,
    ArrowRight
} from "lucide-react";

const ServiceOverviewGeneration = ({
    onBack, onNext,
    apiEndpoints,
    // API Spec
    proxyDesignSelectedSpec,
    setCurrentStep,

    // Project
    selectedGateway,
    selectedFramework,
    setSelectedFramework,

    // Proxy Config
    resourceType,
    proxyName,
    setProxyName,
    version,
    setVersion,
    basePath,
    setBasePath,
    setApiEndpoints,

    // Endpoints
    specEndpoints,
    apiMethod,
    setApiMethod,
    apiEndpoint,
    setApiEndpoint,

    // Backend
    backendName,
    setBackendName,
    backendHost,
    setBackendHost,
    backendPort,
    setBackendPort,
    backendPath,
    setBackendPath,
    enableSSL,
    setEnableSSL,
    connectionStatus,
    setConnectionStatus,

    // Connector
    setShowConnectorModal,
    getConnectionSummary,

    // Security
    securityBackendTab,
    setSecurityBackendTab,
    securityOptions,
    securityInboundSelections,
    setSecurityInboundSelections,
    securityOutboundSelections,
    setSecurityOutboundSelections,

    // Consumers / Providers
    providerConsumerTab,
    setProviderConsumerTab,
    savedProviders,
    savedConsumers,
    selectedProvider,
    setSelectedProvider,
    selectedConsumer,
    setSelectedConsumer,
    selectedOnboardingConsumers = [],
    setSelectedOnboardingConsumers,
    handleEditConsumer,
    setMessage,
    setToast
}) => {
    const [isGeneratingService, setIsGeneratingService] = useState(false);
    const [generationError, setGenerationError] = useState("");
    const [kongConsumers, setKongConsumers] = useState([]);
    const [isLoadingKongConsumers, setIsLoadingKongConsumers] = useState(false);
    const [kongConsumersError, setKongConsumersError] = useState("");
    const [isNext, setIsNext] = useState(false);

    const showMessage = useCallback((text, type = "success") => {
        setMessage?.({ text, type });
        setToast?.({ message: text, type });
    }, [setMessage, setToast]);

    const displayedEndpoints = useMemo(
        () => (Array.isArray(apiEndpoints) && apiEndpoints.length > 0 ? apiEndpoints : specEndpoints),
        [apiEndpoints, specEndpoints]
    );

    const displayedConsumers = useMemo(
        () => (Array.isArray(savedConsumers) ? savedConsumers : []),
        [savedConsumers]
    );

    const selectedConsumerIds = Array.isArray(selectedOnboardingConsumers)
        ? selectedOnboardingConsumers
        : [];

    const toggleConsumerSelection = (consumerId) => {
        if (!consumerId) return;

        if (setSelectedOnboardingConsumers) {
            setSelectedOnboardingConsumers((current = []) => {
                const currentIds = Array.isArray(current) ? current : [];
                return currentIds.includes(consumerId)
                    ? currentIds.filter((id) => id !== consumerId)
                    : [...currentIds, consumerId];
            });
            return;
        }

        setSelectedConsumer?.(selectedConsumer === consumerId ? null : consumerId);
    };

    const fetchKongConsumers = useCallback(async () => {
        if (selectedGateway !== "Kong") {
            setKongConsumers([]);
            setKongConsumersError("");
            setIsLoadingKongConsumers(false);
            return;
        }

        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setKongConsumers([]);
            setKongConsumersError("Save a control plane in Kong settings before loading consumers.");
            return;
        }

        setIsLoadingKongConsumers(true);
        setKongConsumersError("");

        try {
            const result = await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.CONSUMERS(controlPlaneId),
                {
                    cache: "no-store",
                }
            );

            const consumers = Array.isArray(result?.data) ? result.data : [];
            const consumersWithAcls = await Promise.all(
                consumers.map(async (consumer) => {
                    try {
                        const aclResult = await kongFetch(
                            KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_ACLS(controlPlaneId, consumer.id),
                            {
                                cache: "no-store",
                            }
                        );

                        const groups = Array.isArray(aclResult?.data)
                            ? aclResult.data.map((item) => item?.group).filter(Boolean)
                            : [];

                        return {
                            ...consumer,
                            groups,
                        };
                    } catch (aclError) {
                        console.error("Failed to load consumer ACLs", aclError);
                        return {
                            ...consumer,
                            groups: [],
                        };
                    }
                })
            );

            setKongConsumers(consumersWithAcls);
        } catch (error) {
            console.error("Failed to load Kong consumers", error);
            setKongConsumers([]);
            setKongConsumersError(error.message || "Failed to load Kong consumers.");
        } finally {
            setIsLoadingKongConsumers(false);
        }
    }, [selectedGateway]);

    useEffect(() => {
        if (!Array.isArray(specEndpoints) || specEndpoints.length === 0 || !setApiEndpoints) {
            return;
        }

        const currentSignature = JSON.stringify(
            (Array.isArray(apiEndpoints) ? apiEndpoints : []).map((endpoint) => ({
                method: endpoint?.method,
                path: endpoint?.path,
                name: endpoint?.name,
            }))
        );

        const nextSignature = JSON.stringify(
            specEndpoints.map((endpoint) => ({
                method: endpoint?.method,
                path: endpoint?.path,
                name: endpoint?.name,
            }))
        );

        if (currentSignature !== nextSignature) {
            setApiEndpoints(
                specEndpoints.map((endpoint, index) => ({
                    ...endpoint,
                    id: endpoint?.id || `spec-endpoint-${index + 1}`,
                }))
            );
        }
    }, [apiEndpoints, setApiEndpoints, specEndpoints]);

    const normalizePath = (value = "") => {
        const trimmedValue = String(value || "").trim();
        if (!trimmedValue) {
            return "";
        }

        return trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
    };

    const buildRoutePath = (routeBasePath = "", endpointPath = "") => {
        const normalizedBasePath = normalizePath(routeBasePath);
        const normalizedEndpointPath = normalizePath(endpointPath);

        if (!normalizedBasePath && !normalizedEndpointPath) {
            return "/";
        }

        if (!normalizedBasePath) {
            return normalizedEndpointPath;
        }

        if (!normalizedEndpointPath || normalizedEndpointPath === "/") {
            return normalizedBasePath;
        }

        if (normalizedEndpointPath.startsWith(`${normalizedBasePath}/`) || normalizedEndpointPath === normalizedBasePath) {
            return normalizedEndpointPath;
        }

        return `${normalizedBasePath}${normalizedEndpointPath}`.replace(/\/{2,}/g, "/");
    };

    const buildBackendUrl = () => {
        const protocol = enableSSL ? "https" : "http";
        const host = String(backendHost || "").trim();
        const port = String(backendPort || "").trim();
        const path = normalizePath(backendPath);
        const portSegment = port ? `:${port}` : "";

        return `${protocol}://${host}${portSegment}${path}`;
    };

    const buildRouteName = (serviceName, endpoint, index) => {
        const methodPart = String(endpoint?.method || "route").toLowerCase();
        const pathPart = String(endpoint?.path || `route-${index + 1}`)
            .replace(/[{}]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();

        return `${serviceName}-${methodPart}-${pathPart || `route-${index + 1}`}`;
    };

    const handleGenerateService = async () => {
        if (selectedGateway !== "Kong") {
            showMessage("Kong service generation is only available when Kong is the selected gateway.", "error");
            return;
        }

        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setGenerationError("Save a control plane in Kong settings before generating services.");
            showMessage("Save a control plane in Kong settings before generating services.", "error");
            return;
        }

        if (!proxyName.trim() || !version.trim()) {
            setGenerationError("Service name and version are required.");
            showMessage("Service name and version are required.", "error");
            return;
        }

        if (!backendName.trim() || !backendHost.trim()) {
            setGenerationError("Upstream service name and host are required.");
            showMessage("Upstream service name and host are required.", "error");
            return;
        }

        const endpointsToCreate = Array.isArray(displayedEndpoints) && displayedEndpoints.length > 0
            ? displayedEndpoints
            : apiMethod && apiEndpoint
                ? [{ id: "current-endpoint", method: apiMethod, path: apiEndpoint }]
                : [];

        if (!endpointsToCreate.length) {
            setGenerationError("At least one endpoint is required to generate Kong routes.");
            showMessage("At least one endpoint is required to generate Kong routes.", "error");
            return;
        }

        setIsGeneratingService(true);
        setGenerationError("");

        try {
            const serviceName = `${proxyName.trim()}-${version.trim()}`;
            const servicePayload = {
                name: serviceName,
                url: buildBackendUrl(),
                tags: [version.trim(), "generated-from-overview"],
                retries: 5,
                connect_timeout: 60000,
                read_timeout: 60000,
                write_timeout: 60000,
                enabled: true,
            };

            const serviceResult = await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.SERVICES(controlPlaneId),
                {
                    method: "POST",
                    body: servicePayload,
                }
            );

            const createdServiceId = serviceResult?.id;
            if (!createdServiceId) {
                throw new Error("Kong service API did not return a service id.");
            }

            for (let index = 0; index < endpointsToCreate.length; index += 1) {
                const endpoint = endpointsToCreate[index];
                const routePayload = {
                    name: buildRouteName(serviceName, endpoint, index),
                    hosts: null,
                    paths: [buildRoutePath(basePath, endpoint?.path)],
                    strip_path: true,
                    protocols: ["http", "https"],
                    methods: [String(endpoint?.method || "GET").toUpperCase()],
                    service: {
                        id: createdServiceId,
                    },
                    tags: [serviceName, "generated-from-overview"],
                };

                await kongFetch(
                    KONG_ENDPOINTS.CONTROL_PLANE.ROUTES(controlPlaneId),
                    {
                        method: "POST",
                        body: routePayload,
                    }
                );
            }

            const upstreamPayload = {
                name: backendName.trim(),
                algorithm: "round-robin",
                hash_on: "none",
                hash_fallback: "none",
                slots: 10000,
                healthchecks: {
                    threshold: 0,
                    active: null,
                    passive: null,
                },
                tags: [serviceName, "generated-from-overview"],
            };

            await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAMS(controlPlaneId),
                {
                    method: "POST",
                    body: upstreamPayload,
                }
            );
            setIsNext(true);
            showMessage(
                `Created Kong service "${serviceName}", ${endpointsToCreate.length} route${endpointsToCreate.length > 1 ? "s" : ""}, and upstream "${backendName.trim()}".`,
                "success"
            );
        } catch (error) {
            console.error("Failed to generate Kong service overview resources", error);
            setGenerationError(error.message || "Failed to generate Kong service resources.");
            showMessage(error.message || "Failed to generate Kong service resources.", "error");
        } finally {
            setIsGeneratingService(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Spec Overview & Service Generation</h1>
            <div className={cn("grid grid-cols-1 gap-5 lg:grid-cols-2 xl:gap-6")}>
                {/* Left column: API spec + Project + Project metadata */}
                <div className="flex flex-col gap-4">
                    {/* API Specification - Auto-populated from Design page */}
                    <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <div className="flex items-center justify-between mb-3">
                            <CardTitle>API specification</CardTitle>
                            {/* <div className="flex items-center gap-2">
                                {proxyDesignSelectedSpec && (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        From Design page
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="Edit in Design page"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div> */}
                        </div>

                        {proxyDesignSelectedSpec ? (
                            <div className="p-3 rounded-lg border border-dark-700" style={{ backgroundColor: '#0f172a80' }}>
                                <div className="flex items-center gap-3">
                                    <FileCode className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium text-white">{proxyDesignSelectedSpec.name}</p>
                                        <p className="text-xs text-gray-400 capitalize">Source: {proxyDesignSelectedSpec.source || 'template'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg border border-dark-700 text-center" style={{ backgroundColor: '#0f172a80' }}>
                                <AlertCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-300">No API spec selected</p>
                                <p className="text-xs text-gray-400 mt-1">Please go to the Design page (Step 3) to select an API specification.</p>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="mt-3 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all"
                                >
                                    Go to Design Page
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* Project Card */}
                    <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-3">Project</CardTitle>

                        <p className="text-xs text-gray-400 mb-2">API TYPE</p>

                        {/* API Type Selection Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {(selectedGateway === 'Kong' ? ['REST'] : ['REST', 'MCP', 'GraphQL', 'SOAP', 'gRPC']).map((apiType) => (
                                <button
                                    key={apiType}
                                    type="button"
                                    onClick={() => setSelectedFramework(apiType.toLowerCase())}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                        selectedFramework === apiType.toLowerCase() || selectedGateway === "Kong"
                                            ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                            : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                    )}
                                >
                                    {apiType}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Proxy Configuration Component */}
                    <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-3">{selectedGateway === 'Kong' ? 'Service Configuration' : resourceType === 'Shared Flow' ? 'Shared Flow Configuration' : 'Proxy Configuration'}</CardTitle>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="proxyName" className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Service Name' : resourceType === 'Shared Flow' ? 'Shared Flow Name' : 'Proxy Name'}</Label>
                                <Input
                                    id="proxyName"
                                    placeholder={selectedGateway === 'Kong' ? 'e.g., Payment Gateway Service' : 'e.g., Payment Gateway Proxy'}
                                    value={proxyName}
                                    onChange={(e) => setProxyName(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="proxyVersion" className="text-xs text-gray-300">Version</Label>
                                <Input
                                    id="proxyVersion"
                                    placeholder="V1"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <span className="text-sm text-gray-300">Service Name is {proxyName + "-" + version}</span>

                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="proxyBasePath" className="text-xs text-gray-300">Base path</Label>
                                <Input
                                    id="proxyBasePath"
                                    placeholder="/api/v1"
                                    value={basePath}
                                    onChange={(e) => setBasePath(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* Endpoints Section with Dropdown */}
                        <div className="mt-4 pt-4 border-t border-dark-700">
                            <div className="flex items-center justify-between mb-3">
                                <Label className="text-xs text-gray-300">Endpoints</Label>
                                {/* <button
                               type="button"
                               onClick={() => {
                                 const safeEndpoints = Array.isArray(displayedEndpoints) ? displayedEndpoints : [];
                                 const numericIds = safeEndpoints
                                     .map((endpoint) => Number(endpoint?.id))
                                     .filter((value) => Number.isFinite(value));
                                 const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : safeEndpoints.length + 1;
                                 const newEndpoint = { id: newId, method: 'GET', path: '/new-endpoint', name: `Endpoint ${newId}` };
                                 setApiEndpoints([...safeEndpoints, newEndpoint]);
                                 setApiMethod(newEndpoint.method);
                                 setApiEndpoint(newEndpoint.path);
                               }}
                               className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                               title="Add endpoint"
                             >
                               <Plus className="w-4 h-4" />
                             </button> */}
                            </div>

                            {displayedEndpoints.length > 0 && (
                                <select
                                    className="w-full h-9 rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all mb-3"
                                    style={{
                                        backgroundColor: '#0f172a80',
                                        borderColor: '#232942',
                                        borderWidth: '1px',
                                    }}
                                    value={displayedEndpoints.find(ep => ep.method === apiMethod && ep.path === apiEndpoint)?.id || ''}
                                    onChange={(e) => {
                                        const selected = displayedEndpoints.find(ep => String(ep.id) === e.target.value);
                                        if (selected) {
                                            setApiMethod(selected.method);
                                            setApiEndpoint(selected.path);
                                        }
                                    }}
                                >
                                    <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select endpoint to edit...</option>
                                    {displayedEndpoints.map((ep) => (
                                        <option key={ep.id} value={ep.id} style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                                            {ep.method} {ep.path}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="apiMethod" className="text-xs text-gray-300">Method</Label>
                                    <select
                                        id="apiMethod"
                                        value={apiMethod}
                                        onChange={(e) => {
                                            setApiMethod(e.target.value);
                                            const currentEndpoint = displayedEndpoints.find((ep) => ep.method === apiMethod && ep.path === apiEndpoint);

                                            if (currentEndpoint) {
                                                setApiEndpoints(
                                                    displayedEndpoints.map((ep) =>
                                                        ep.id === currentEndpoint.id
                                                            ? { ...ep, method: e.target.value }
                                                            : ep
                                                    )
                                                );
                                            }
                                        }}
                                        className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white cursor-pointer transition-all"
                                        style={{
                                            backgroundColor: '#0f172a80',
                                            borderColor: '#232942',
                                            borderWidth: '1px',
                                        }}
                                    >
                                        <option value="" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>Select method</option>
                                        <option value="GET" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>GET</option>
                                        <option value="POST" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>POST</option>
                                        <option value="PUT" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>PUT</option>
                                        <option value="DELETE" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>DELETE</option>
                                        <option value="PATCH" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>PATCH</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="apiEndpoint" className="text-xs text-gray-300">Endpoint</Label>
                                    <Input
                                        id="apiEndpoint"
                                        placeholder="/users"
                                        value={apiEndpoint}
                                        onChange={(e) => {
                                            setApiEndpoint(e.target.value);
                                            const currentEndpoint = displayedEndpoints.find((ep) => ep.method === apiMethod && ep.path === apiEndpoint);

                                            if (currentEndpoint) {
                                                setApiEndpoints(
                                                    displayedEndpoints.map((ep) =>
                                                        ep.id === currentEndpoint.id
                                                            ? { ...ep, path: e.target.value }
                                                            : ep
                                                    )
                                                );
                                            }
                                        }}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        {/* <div className="mt-4 flex justify-end">
                         <button
                           type="button"
                           onClick={() => showMessage('API metadata saved successfully', 'success')}
                           className={cn(
                             'px-5 py-2 rounded-lg font-semibold text-sm transition-all',
                             'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                             'flex items-center gap-2 active:scale-[0.98]'
                           )}
                         >
                           Save
                         </button>
                       </div> */}
                    </Card>


                </div>

                {/* Right column: Connector Configuration + Policy Sections */}
                <div className="flex flex-col gap-4">
                    {/* Target Server Component */}
                    <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-3">{selectedGateway === 'Kong' ? 'Upstream Service' : 'Target Server'}</CardTitle>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="backendName" className="text-xs text-gray-300">{selectedGateway === 'Kong' ? 'Upstream Service Name' : 'Target Server Name'}</Label>
                                <Input
                                    id="backendName"
                                    placeholder="Backend service name"
                                    value={backendName}
                                    onChange={(e) => setBackendName(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="backendHost" className="text-xs text-gray-300">Host</Label>
                                <Input
                                    id="backendHost"
                                    placeholder="api.example.com"
                                    value={backendHost}
                                    onChange={(e) => setBackendHost(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="backendPort" className="text-xs text-gray-300">Port</Label>
                                <Input
                                    id="backendPort"
                                    placeholder="443"
                                    value={backendPort}
                                    onChange={(e) => setBackendPort(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="backendPath" className="text-xs text-gray-300">Path</Label>
                                <Input
                                    id="backendPath"
                                    placeholder="/api"
                                    value={backendPath}
                                    onChange={(e) => setBackendPath(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* SSL Checkbox and Test Connection Button Row */}
                        <div className="mt-4 flex items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="accent-primary rounded"
                                    checked={enableSSL}
                                    onChange={(e) => setEnableSSL(e.target.checked)}
                                />
                                <span className="text-xs text-gray-300">Enable SSL</span>
                            </label>

                            {/* <div className="flex flex-col items-end gap-2">
                                <button
                                    type="button"
                                    disabled={!backendName || !backendHost || !backendPort}
                                    onClick={() => {
                                        // Simulate connection test
                                        setConnectionStatus('testing');
                                        setTimeout(() => {
                                            // Randomly succeed or fail for demo
                                            const success = Math.random() > 0.3;
                                            setConnectionStatus(success ? 'success' : 'error');
                                        }, 1500);
                                    }}
                                    className={cn(
                                        'px-5 py-2 rounded-lg font-semibold text-sm transition-all',
                                        'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                        'flex items-center gap-2 active:scale-[0.98]',
                                        (!backendName || !backendHost || !backendPort) && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    <Play className="w-4 h-4" />
                                    Test Connection
                                </button>

                                {connectionStatus === 'success' && (
                                    <p className="text-xs text-green-400 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Connection successful
                                    </p>
                                )}
                                {connectionStatus === 'error' && (
                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        Connection failed
                                    </p>
                                )}
                            </div> */}
                        </div>
                    </Card>
                    {/* Connector Configuration Card */}
                    {/* <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-3 flex items-center gap-2">
                            <Plug className="w-5 h-5 text-primary" />
                            Connector Configuration
                        </CardTitle>
                        <p className="text-xs text-gray-400 mb-3">Configure GitHub, cloud providers, and database connections.</p>
                        <div className="flex justify-start">
                            <button
                                type="button"
                                onClick={() => setShowConnectorModal(true)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                    'flex items-center gap-2 active:scale-[0.98]'
                                )}
                            >
                                <Plug className="w-4 h-4" />
                                Configure Connectors
                            </button>
                        </div>
                        {getConnectionSummary() && (
                            <p className="mt-2 text-xs text-green-400">{getConnectionSummary()}</p>
                        )}
                    </Card> */}

                    {/* Security Backend Section with Inbound/Outbound Tabs */}
                    {/* <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-3 text-sm">Security Backend</CardTitle>

                       
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setSecurityBackendTab('inbound')}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                    securityBackendTab === 'inbound'
                                        ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                        : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                )}
                            >
                                Inbound
                            </button>
                            <button
                                type="button"
                                onClick={() => setSecurityBackendTab('outbound')}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                    securityBackendTab === 'outbound'
                                        ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                        : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                )}
                            >
                                Outbound
                            </button>
                        </div>

                        
                        {securityBackendTab === 'inbound' && (
                            <div>
                                <p className="mb-2 text-[11px] text-gray-500">Select at least 1, maximum 2 options</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {securityOptions.map((option) => {
                                        const isSelected = securityInboundSelections.includes(option);
                                        const canSelect = isSelected || securityInboundSelections.length < 2;
                                        return (
                                            <label key={option} className={cn(
                                                "flex cursor-pointer items-center gap-2",
                                                !canSelect && "opacity-50 cursor-not-allowed"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-dark-700"
                                                    checked={isSelected}
                                                    disabled={!canSelect}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            setSecurityInboundSelections(prev => prev.filter(item => item !== option));
                                                        } else if (securityInboundSelections.length < 2) {
                                                            setSecurityInboundSelections(prev => [...prev, option]);
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs text-gray-300">{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        
                        {securityBackendTab === 'outbound' && (
                            <div>
                                <p className="mb-2 text-[11px] text-gray-500">Select at least 1, maximum 2 options</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {securityOptions.map((option) => {
                                        const isSelected = securityOutboundSelections.includes(option);
                                        const canSelect = isSelected || securityOutboundSelections.length < 2;
                                        return (
                                            <label key={option} className={cn(
                                                "flex cursor-pointer items-center gap-2",
                                                !canSelect && "opacity-50 cursor-not-allowed"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-dark-700"
                                                    checked={isSelected}
                                                    disabled={!canSelect}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            setSecurityOutboundSelections(prev => prev.filter(item => item !== option));
                                                        } else if (securityOutboundSelections.length < 2) {
                                                            setSecurityOutboundSelections(prev => [...prev, option]);
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs text-gray-300">{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Card> */}

                    {/* Standard Policies Section */}
                    {/* <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-2 text-sm">Standard Policies</CardTitle>
                        <p className="mb-2 text-[11px] text-gray-500">Select as many as needed</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {['Logging', 'Encryption', 'CORS', 'Error handling'].map((option) => (
                                <label key={option} className="flex cursor-pointer items-center gap-2">
                                    <input type="checkbox" className="rounded border-dark-700" />
                                    <span className="text-xs text-gray-300">{option}</span>
                                </label>
                            ))}
                        </div>
                    </Card> */}

                    {/* Custom Policies Section */}
                    {/* <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <CardTitle className="mb-2 text-sm">Custom Policies</CardTitle>
                        <p className="mb-2 text-[11px] text-gray-500">Select as many as needed</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {['XML to JSON', 'JSON to XML', 'Traffic Management', 'AI Policies', 'LuaScript', 'Data Mapping'].map((option) => (
                                <label key={option} className="flex cursor-pointer items-center gap-2">
                                    <input type="checkbox" className="rounded border-dark-700" />
                                    <span className="text-xs text-gray-300">{option}</span>
                                </label>
                            ))}
                        </div>
                    </Card> */}

                    {/* Products & Apps Section */}
                    {/* <Card className="p-4 mt-4 lg:col-span-2" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                       <CardTitle className="mb-3 flex items-center justify-between text-white">
                         <div className="flex items-center gap-2">
                           <Box className="w-5 h-5 text-primary" />
                           Products & Apps
                         </div>
                         {productsAppsTab === 'products' ? (
                           <button
                             type="button"
                             onClick={() => setShowProductModal(true)}
                             className={cn(
                               'px-3 py-1.5 rounded-lg font-semibold text-xs transition-all',
                               'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                               'flex items-center gap-1.5 active:scale-[0.98]'
                             )}
                           >
                             Add Product
                           </button>
                         ) : (
                           <button
                             type="button"
                             onClick={() => setShowApplicationModal(true)}
                             className={cn(
                               'px-3 py-1.5 rounded-lg font-semibold text-xs transition-all',
                               'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                               'flex items-center gap-1.5 active:scale-[0.98]'
                             )}
                           >
                             Add App
                           </button>
                         )}
                       </CardTitle>
                       
       
                       <div className="flex flex-wrap gap-2 mb-4">
                         <button
                           type="button"
                           onClick={() => setProductsAppsTab('products')}
                           className={cn(
                             'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                             productsAppsTab === 'products'
                               ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                               : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                           )}
                         >
                           Products ({savedProducts.length})
                         </button>
                         <button
                           type="button"
                           onClick={() => setProductsAppsTab('applications')}
                           className={cn(
                             'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                             productsAppsTab === 'applications'
                               ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                               : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                           )}
                         >
                           Apps ({savedApplications.length})
                         </button>
                       </div>
       
                       {productsAppsTab === 'products' && (
                         <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                           {savedProducts.length === 0 ? (
                             <p className="text-xs text-gray-500 italic">No products added yet. Click "Add Product" button at the top right to create one.</p>
                           ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                               style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                             >
                               {savedProducts.map((product) => (
                                 <div
                                   key={product.id}
                                   className={cn(
                                     'p-3 rounded-lg border cursor-pointer transition-all relative group',
                                     selectedProducts.includes(product.id)
                                       ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                       : 'border-dark-700 hover:border-primary/50'
                                   )}
                                   style={!selectedProducts.includes(product.id) ? { backgroundColor: '#0f172a80' } : undefined}
                                   onClick={() => {
                                     const isSelected = selectedProducts.includes(product.id);
                                     if (isSelected) {
                                       setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                     } else {
                                       setSelectedProducts([...selectedProducts, product.id]);
                                     }
                                   }}
                                 >
                                   <p className="text-xs font-medium text-white truncate pr-6">{product.productName || 'Unnamed'}</p>
                                   <p className="text-[10px] text-gray-400 truncate">{product.proxyName || 'No Proxy'}</p>
                                   {selectedProducts.includes(product.id) && (
                                     <div className="mt-1 flex items-center gap-1">
                                       <CheckCircle className="w-3 h-3 text-primary" />
                                       <span className="text-[10px] text-primary">Selected</span>
                                     </div>
                                   )}
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingProductId(product.id);
                                       setProductForm({
                                         productName: product.productName || '',
                                         displayName: product.displayName || '',
                                         description: product.description || '',
                                         proxyName: product.proxyName || '',
                                         proxyPath: product.proxyPath || ''
                                       });
                                       setShowProductModal(true);
                                     }}
                                     className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                                     title="Edit Product"
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                       <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                       <path d="m15 5 4 4"/>
                                     </svg>
                                   </button>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       )}
       
                       {productsAppsTab === 'applications' && (
                         <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                           {savedApplications.length === 0 ? (
                             <p className="text-xs text-gray-500 italic">No applications added yet. Click "Add App" button at the top right to create one.</p>
                           ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                               style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                             >
                               {savedApplications.map((app) => (
                                 <div
                                   key={app.id}
                                   className={cn(
                                     'p-3 rounded-lg border cursor-pointer transition-all relative group',
                                     selectedApplications.includes(app.id)
                                       ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                       : 'border-dark-700 hover:border-primary/50'
                                   )}
                                   style={!selectedApplications.includes(app.id) ? { backgroundColor: '#0f172a80' } : undefined}
                                   onClick={() => {
                                     const isSelected = selectedApplications.includes(app.id);
                                     if (isSelected) {
                                       setSelectedApplications(selectedApplications.filter(id => id !== app.id));
                                     } else {
                                       setSelectedApplications([...selectedApplications, app.id]);
                                     }
                                   }}
                                 >
                                   <p className="text-xs font-medium text-white truncate pr-6">{app.applicationName || 'Unnamed'}</p>
                                   <p className="text-[10px] text-gray-400 truncate">{app.productName || 'No Product'}</p>
                                   {selectedApplications.includes(app.id) && (
                                     <div className="mt-1 flex items-center gap-1">
                                       <CheckCircle className="w-3 h-3 text-primary" />
                                       <span className="text-[10px] text-primary">Selected</span>
                                     </div>
                                   )}
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingApplicationId(app.id);
                                       setApplicationForm({
                                         applicationName: app.applicationName || '',
                                         displayName: app.displayName || '',
                                         description: app.description || '',
                                         productName: app.productName || '',
                                         developerEmail: app.developerEmail || '',
                                         companyName: app.companyName || '',
                                         companyEmail: app.companyEmail || ''
                                       });
                                       setShowApplicationModal(true);
                                     }}
                                     className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                                     title="Edit Application"
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                       <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                       <path d="m15 5 4 4"/>
                                     </svg>
                                   </button>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       )}
                     </Card> */}

                    {/* Provider & Consumer Information Card */}
                    <Card className="p-4 mt-4 lg:col-span-2">
                        <CardTitle className="mb-3">Consumers & Providers</CardTitle>

                        {/* Tab Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">

                            <button
                                type="button"
                                onClick={() => setProviderConsumerTab('consumer')}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                    providerConsumerTab === 'consumer'
                                        ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                        : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                )}
                            >
                                Consumer ({displayedConsumers.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setProviderConsumerTab('provider')}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                                    providerConsumerTab === 'provider'
                                        ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                        : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                                )}
                            >
                                Provider ({savedProviders.length})
                            </button>
                        </div>

                        {/* Provider List with Scrollbar */}
                        {providerConsumerTab === 'provider' && (
                            <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                                {savedProviders.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">No providers saved yet. Click "Add Provider" button at the top right to create one.</p>
                                ) : (
                                    <div
                                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                                    >
                                        {savedProviders.map((provider) => (
                                            <div
                                                key={provider.id}
                                                onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
                                                className={cn(
                                                    'p-3 rounded-lg border cursor-pointer transition-all',
                                                    selectedProvider === provider.id
                                                        ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                        : 'border-dark-700 hover:border-primary/50'
                                                )}
                                                style={selectedProvider !== provider.id ? { backgroundColor: '#0f172a80' } : undefined}
                                            >
                                                <p className="text-xs font-medium text-white truncate">{provider.appOwnerName || 'No Owner Name'}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{provider.appOwnerEmail || 'No Owner Email'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Consumer List with Scrollbar */}
                        {providerConsumerTab === 'consumer' && (
                            <div className="rounded-md border border-dark-700 p-3" style={{ backgroundColor: '#0f172a80' }}>
                                {displayedConsumers.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">No consumers saved yet. Click "Add Consumer" button at the top right to create one.</p>
                                ) : (
                                    <div
                                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1"
                                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#232942 #0a0a2e' }}
                                    >
                                        {displayedConsumers.map((consumer) => {
                                            const isSelected = selectedConsumerIds.includes(consumer.id) || selectedConsumer === consumer.id;

                                            return (
                                                <div
                                                    key={consumer.id}
                                                    className={cn(
                                                        'p-3 rounded-lg border cursor-pointer transition-all relative group',
                                                        isSelected
                                                            ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                                                            : 'border-dark-700 hover:border-primary/50'
                                                    )}
                                                    style={isSelected ? undefined : { backgroundColor: '#0f172a80' }}
                                                >
                                                    <div onClick={() => toggleConsumerSelection(consumer.id)}>
                                                        <p className="text-xs font-medium text-white truncate pr-6">{consumer.consumerName || consumer.name || 'Unnamed'}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{consumer.consumerPocName || 'No POC'}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{consumer.consumerPocEmail || 'No POC Email'}</p>
                                                        {isSelected && (
                                                            <div className="mt-1 flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3 text-primary" />
                                                                <span className="text-[10px] text-primary">Selected</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {handleEditConsumer && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleEditConsumer(consumer);
                                                            }}
                                                            className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Edit Consumer"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-4 flex justify-end">
                            {generationError && (
                                <p className="mr-auto self-center text-sm text-red-400">{generationError}</p>
                            )}
                            <button
                                type="button"
                                onClick={handleGenerateService}
                                disabled={isGeneratingService}
                                className={cn(
                                    'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                                    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                    'flex items-center gap-2 active:scale-[0.98] min-w-[140px] justify-center',
                                    isGeneratingService && 'opacity-60 cursor-not-allowed'
                                )}
                            >
                                {isGeneratingService ? 'Generating...' : 'Generate Service'}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-6 border-t border-dark-700">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!isNext}
                    className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2
    ${isNext
                            ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
                            : "bg-slate-700 text-gray-400 cursor-not-allowed shadow-none"
                        }
  `}                >
                    Next
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ServiceOverviewGeneration;
