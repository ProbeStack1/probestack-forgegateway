import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { APIGEE_ENDPOINTS } from "../config/apigeeConfig";
import { apigeeApiFetch } from "../services/apigeeApiService";

const labelMap = {
    proxy: "Proxy",
    sharedflow: "Shared Flow",
    targetserver: "Backend Service",
    kvm: "KVM",
    app: "App",
};

const endpointMap = {
    targetserver: APIGEE_ENDPOINTS.TARGET_SERVERS,
    kvm: APIGEE_ENDPOINTS.KVM_ENV_LEVEL,
};

const normalizeNameList = (data, primaryKey) => {
    const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.[primaryKey])
            ? data[primaryKey]
            : [];

    return rawList
        .map((item) => (
            typeof item === "string"
                ? item
                : item?.organization || item?.projectId || item?.email || item?.developerEmail || item?.name || item?.id
        ))
        .filter(Boolean);
};

const normalizeApps = (data) => (
    Array.isArray(data?.app)
        ? data.app.map((item) => item?.name || item?.appId || item).filter(Boolean)
        : normalizeNameList(data, "apps")
);

const readJson = async (response) => {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

const requestJson = async (url, options = {}) => {
    const response = await apigeeApiFetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const data = await readJson(response).catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || data?.error?.message || `Request failed with ${response.status}`);
    }

    return data;
};

const createOrUpdate = async ({ createUrl, updateUrl, payload }) => {
    try {
        return await requestJson(createUrl, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    } catch (error) {
        const message = String(error?.message || "");
        if (!message.includes("409") && !message.toLowerCase().includes("already")) {
            throw error;
        }

        return requestJson(updateUrl, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    }
};

const SyncBaseModal = ({
    title,
    type,
    onClose,
    defaultOrg = "",
    defaultEnv = "",
    defaultDeveloperEmail = "",
    onSynced,
    onSuccess,
}) => {
    const [sourceOrg, setSourceOrg] = useState(defaultOrg);
    const [sourceEnv, setSourceEnv] = useState(defaultEnv);
    const [sourceDeveloper, setSourceDeveloper] = useState(defaultDeveloperEmail);
    const [resource, setResource] = useState("");
    const [targetOrg, setTargetOrg] = useState(defaultOrg);
    const [targetEnv, setTargetEnv] = useState(defaultEnv);
    const [targetDeveloper, setTargetDeveloper] = useState(defaultDeveloperEmail);

    const [organizations, setOrganizations] = useState([]);
    const [sourceEnvironments, setSourceEnvironments] = useState([]);
    const [targetEnvironments, setTargetEnvironments] = useState([]);
    const [developers, setDevelopers] = useState([]);
    const [targetDevelopers, setTargetDevelopers] = useState([]);
    const [resourceOptions, setResourceOptions] = useState([]);

    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const inputStyle =
        "w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

    const isEnvResource = type === "targetserver" || type === "kvm";
    const isApp = type === "app";
    const isUnsupported = type === "proxy" || type === "sharedflow";

    const canSync = useMemo(() => {
        if (isUnsupported) return false;
        if (isApp) return sourceOrg && targetOrg && sourceDeveloper && targetDeveloper && resource;
        return sourceOrg && sourceEnv && targetOrg && targetEnv && resource;
    }, [isUnsupported, isApp, sourceOrg, sourceEnv, targetOrg, targetEnv, sourceDeveloper, targetDeveloper, resource]);

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
                const data = await requestJson(APIGEE_ENDPOINTS.ORGANIZATIONS.LIST);
                const list = normalizeNameList(data, "organizations");
                setOrganizations(list);
                if (!sourceOrg && list[0]) setSourceOrg(list[0]);
                if (!targetOrg && list[0]) setTargetOrg(list[0]);
            } catch (fetchError) {
                setError(fetchError?.message || "Failed to load organizations.");
            }
        };

        fetchOrganizations();
    }, []);

    useEffect(() => {
        const fetchEnvironments = async (org, setter) => {
            if (!org || !isEnvResource) {
                setter([]);
                return;
            }

            try {
                const data = await requestJson(APIGEE_ENDPOINTS.ENVIRONMENT.LIST(org));
                const list = normalizeNameList(data, "environments");
                setter(list);
            } catch (fetchError) {
                setError(fetchError?.message || "Failed to load environments.");
                setter([]);
            }
        };

        fetchEnvironments(sourceOrg, setSourceEnvironments);
    }, [sourceOrg, isEnvResource]);

    useEffect(() => {
        const fetchEnvironments = async (org) => {
            if (!org || !isEnvResource) {
                setTargetEnvironments([]);
                return;
            }

            try {
                const data = await requestJson(APIGEE_ENDPOINTS.ENVIRONMENT.LIST(org));
                setTargetEnvironments(normalizeNameList(data, "environments"));
            } catch (fetchError) {
                setError(fetchError?.message || "Failed to load target environments.");
                setTargetEnvironments([]);
            }
        };

        fetchEnvironments(targetOrg);
    }, [targetOrg, isEnvResource]);

    useEffect(() => {
        const fetchDevelopers = async (org, setter) => {
            if (!org || !isApp) {
                setter([]);
                return;
            }

            try {
                const data = await requestJson(APIGEE_ENDPOINTS.DEVELOPERS.LIST(org));
                setter(normalizeNameList(data, "developers"));
            } catch (fetchError) {
                setError(fetchError?.message || "Failed to load developers.");
                setter([]);
            }
        };

        fetchDevelopers(sourceOrg, setDevelopers);
    }, [sourceOrg, isApp]);

    useEffect(() => {
        const fetchDevelopers = async () => {
            if (!targetOrg || !isApp) {
                setTargetDevelopers([]);
                return;
            }

            try {
                const data = await requestJson(APIGEE_ENDPOINTS.DEVELOPERS.LIST(targetOrg));
                setTargetDevelopers(normalizeNameList(data, "developers"));
            } catch (fetchError) {
                setError(fetchError?.message || "Failed to load target developers.");
                setTargetDevelopers([]);
            }
        };

        fetchDevelopers();
    }, [targetOrg, isApp]);

    useEffect(() => {
        if (sourceEnvironments.length > 0 && !sourceEnvironments.includes(sourceEnv)) {
            setSourceEnv(sourceEnvironments[0]);
        }
    }, [sourceEnvironments, sourceEnv]);

    useEffect(() => {
        if (targetEnvironments.length > 0 && !targetEnvironments.includes(targetEnv)) {
            setTargetEnv(targetEnvironments[0]);
        }
    }, [targetEnvironments, targetEnv]);

    useEffect(() => {
        if (developers.length > 0 && !developers.includes(sourceDeveloper)) {
            setSourceDeveloper(developers[0]);
        }
    }, [developers, sourceDeveloper]);

    useEffect(() => {
        if (targetDevelopers.length > 0 && !targetDevelopers.includes(targetDeveloper)) {
            setTargetDeveloper(targetDevelopers[0]);
        }
    }, [targetDevelopers, targetDeveloper]);

    useEffect(() => {
        const fetchResources = async () => {
            setResource("");
            setResourceOptions([]);

            if (isUnsupported) return;
            if (isEnvResource && (!sourceOrg || !sourceEnv)) return;
            if (isApp && (!sourceOrg || !sourceDeveloper)) return;

            setIsLoadingResources(true);
            try {
                if (isApp) {
                    const data = await requestJson(APIGEE_ENDPOINTS.APPS.LIST(sourceOrg, sourceDeveloper));
                    setResourceOptions(normalizeApps(data));
                    return;
                }

                const endpoints = endpointMap[type];
                const data = await requestJson(endpoints.LIST(sourceOrg, sourceEnv));
                setResourceOptions(normalizeNameList(data, "items"));
            } catch (fetchError) {
                setError(fetchError?.message || `Failed to load ${labelMap[type]} resources.`);
                setResourceOptions([]);
            } finally {
                setIsLoadingResources(false);
            }
        };

        fetchResources();
    }, [type, isUnsupported, isEnvResource, isApp, sourceOrg, sourceEnv, sourceDeveloper]);

    const handleSyncTargetServer = async () => {
        const source = await requestJson(APIGEE_ENDPOINTS.TARGET_SERVERS.GET(sourceOrg, sourceEnv, resource));
        const payload = {
            name: source.name || resource,
            host: source.host,
            port: source.port,
            isEnabled: source.isEnabled ?? true,
            ...(source.sSLInfo ? { sSLInfo: source.sSLInfo } : {}),
            ...(source.sslInfo ? { sslInfo: source.sslInfo } : {}),
        };

        await createOrUpdate({
            createUrl: APIGEE_ENDPOINTS.TARGET_SERVERS.CREATE(targetOrg, targetEnv),
            updateUrl: APIGEE_ENDPOINTS.TARGET_SERVERS.UPDATE(targetOrg, targetEnv, payload.name),
            payload,
        });
    };

    const handleSyncKVM = async () => {
        await createOrUpdate({
            createUrl: APIGEE_ENDPOINTS.KVM_ENV_LEVEL.CREATE(targetOrg, targetEnv),
            updateUrl: APIGEE_ENDPOINTS.KVM_ENV_LEVEL.GET(targetOrg, targetEnv, resource),
            payload: { name: resource, encrypted: true },
        }).catch((syncError) => {
            const messageText = String(syncError?.message || "").toLowerCase();
            if (!messageText.includes("already") && !messageText.includes("409") && !messageText.includes("405")) {
                throw syncError;
            }
        });

        const entriesData = await requestJson(APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.LIST(sourceOrg, sourceEnv, resource));
        const rawEntries = Array.isArray(entriesData)
            ? entriesData
            : Array.isArray(entriesData?.keyValueEntries)
                ? entriesData.keyValueEntries
                : Array.isArray(entriesData?.entry)
                    ? entriesData.entry
                    : Array.isArray(entriesData?.entries)
                        ? entriesData.entries
                        : [];

        const entries = await Promise.all(rawEntries.map(async (entry) => {
            if (entry && typeof entry === "object" && "name" in entry && "value" in entry) return entry;

            const entryName = typeof entry === "string" ? entry : entry?.name || entry?.key;
            if (!entryName) return null;
            return requestJson(APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.GET(sourceOrg, sourceEnv, resource, entryName));
        }));

        await Promise.all(entries.filter(Boolean).map(async (entry) => {
            const payload = {
                name: entry.name,
                value: entry.value,
            };

            return createOrUpdate({
                createUrl: APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.CREATE(targetOrg, targetEnv, resource),
                updateUrl: APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.UPDATE(targetOrg, targetEnv, resource, entry.name),
                payload,
            });
        }));
    };

    const handleSyncApp = async () => {
        const source = await requestJson(APIGEE_ENDPOINTS.APPS.GET(sourceOrg, sourceDeveloper, resource));
        const products = (source?.credentials?.[0]?.apiProducts || [])
            .map((product) => product?.apiproduct || product?.name || product)
            .filter(Boolean);

        await createOrUpdate({
            createUrl: APIGEE_ENDPOINTS.APPS.CREATE(targetOrg, targetDeveloper),
            updateUrl: APIGEE_ENDPOINTS.APPS.UPDATE(targetOrg, targetDeveloper, source.name || resource),
            payload: {
                name: source.name || resource,
                apiProducts: products,
                keyExpiresIn: -1,
                attributes: source.attributes || [],
            },
        });
    };

    const handleSync = async () => {
        if (!canSync) return;

        setIsSubmitting(true);
        setError("");

        try {
            if (type === "targetserver") await handleSyncTargetServer();
            if (type === "kvm") await handleSyncKVM();
            if (type === "app") await handleSyncApp();
            await onSynced?.();
            onSuccess?.(`${labelMap[type]} synced successfully.`);
            onClose();
        } catch (syncError) {
            setError(syncError?.message || `Failed to sync ${labelMap[type]}.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
                <div className="flex items-center justify-between border-b border-dark-700 px-6 py-4">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="max-h-[72vh] space-y-6 overflow-y-auto p-6">
                    {isUnsupported ? (
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                            Sync for {labelMap[type]} is not configured on this screen yet.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-300">Source</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm text-gray-400">Project ID</label>
                                        <select value={sourceOrg} onChange={(event) => setSourceOrg(event.target.value)} className={inputStyle}>
                                            <option value="">Select Project</option>
                                            {sourceOrg && !organizations.includes(sourceOrg) && <option value={sourceOrg}>{sourceOrg}</option>}
                                            {organizations.map((org) => <option key={org} value={org}>{org}</option>)}
                                        </select>
                                    </div>

                                    {isEnvResource ? (
                                        <div>
                                            <label className="mb-1 block text-sm text-gray-400">Environment</label>
                                            <select value={sourceEnv} onChange={(event) => setSourceEnv(event.target.value)} className={inputStyle}>
                                                <option value="">Select Environment</option>
                                                {sourceEnv && !sourceEnvironments.includes(sourceEnv) && <option value={sourceEnv}>{sourceEnv}</option>}
                                                {sourceEnvironments.map((env) => <option key={env} value={env}>{env}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="mb-1 block text-sm text-gray-400">Developer</label>
                                            <select value={sourceDeveloper} onChange={(event) => setSourceDeveloper(event.target.value)} className={inputStyle}>
                                                <option value="">Select Developer</option>
                                                {sourceDeveloper && !developers.includes(sourceDeveloper) && <option value={sourceDeveloper}>{sourceDeveloper}</option>}
                                                {developers.map((developer) => <option key={developer} value={developer}>{developer}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="col-span-2">
                                        <label className="mb-1 block text-sm text-gray-400">{labelMap[type]}</label>
                                        <select
                                            value={resource}
                                            onChange={(event) => setResource(event.target.value)}
                                            disabled={isLoadingResources}
                                            className={inputStyle}
                                        >
                                            <option value="">
                                                {isLoadingResources ? `Loading ${labelMap[type]}...` : `Select ${labelMap[type]}`}
                                            </option>
                                            {resourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-dark-700 pt-5">
                                <h3 className="text-sm font-semibold text-gray-300">Target</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm text-gray-400">Project ID</label>
                                        <select value={targetOrg} onChange={(event) => setTargetOrg(event.target.value)} className={inputStyle}>
                                            <option value="">Select Project</option>
                                            {targetOrg && !organizations.includes(targetOrg) && <option value={targetOrg}>{targetOrg}</option>}
                                            {organizations.map((org) => <option key={org} value={org}>{org}</option>)}
                                        </select>
                                    </div>

                                    {isEnvResource ? (
                                        <div>
                                            <label className="mb-1 block text-sm text-gray-400">Environment</label>
                                            <select value={targetEnv} onChange={(event) => setTargetEnv(event.target.value)} className={inputStyle}>
                                                <option value="">Select Environment</option>
                                                {targetEnv && !targetEnvironments.includes(targetEnv) && <option value={targetEnv}>{targetEnv}</option>}
                                                {targetEnvironments.map((env) => <option key={env} value={env}>{env}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="mb-1 block text-sm text-gray-400">Developer</label>
                                            <select value={targetDeveloper} onChange={(event) => setTargetDeveloper(event.target.value)} className={inputStyle}>
                                                <option value="">Select Developer</option>
                                                {targetDeveloper && !targetDevelopers.includes(targetDeveloper) && <option value={targetDeveloper}>{targetDeveloper}</option>}
                                                {targetDevelopers.map((developer) => <option key={developer} value={developer}>{developer}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-dark-700 px-6 py-4">
                    <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">
                        Cancel
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={!canSync || isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        Sync
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ProxySyncModal = ({ onClose }) => (
    <SyncBaseModal title="Sync Proxy" type="proxy" onClose={onClose} />
);

export const SharedFlowSyncModal = ({ onClose }) => (
    <SyncBaseModal title="Sync Shared Flow" type="sharedflow" onClose={onClose} />
);

export const TargetServerSyncModal = (props) => (
    <SyncBaseModal title="Sync Backend Service" type="targetserver" {...props} />
);

export const KVMSyncModal = (props) => (
    <SyncBaseModal title="Sync KVM" type="kvm" {...props} />
);

export const AppSyncModal = (props) => (
    <SyncBaseModal title="Sync App" type="app" {...props} />
);
