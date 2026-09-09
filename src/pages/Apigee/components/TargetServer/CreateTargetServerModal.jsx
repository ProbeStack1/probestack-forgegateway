import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../../services/apigeeApiService";
import { getTrackingHeaders } from "../apigeeTracking";
import OnboardingCascadeSelect from "../OnboardingCascadeSelect";
import OnboardingHierarchySelect from "../OnboardingHierarchySelect";
import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";
import { getApplicationDetail } from "../../../../http-service/onboardingApi";

export default function CreateTargetServerModal({
    onClose,
    onSuccess,
    onError,
    editData,
    organization = "",
    environment = "",
    onboardingOptions = [],
    isFetchingOnboardings = false,
    defaultOnboardingId = "",
    defaultMicroserviceId = "",
    // Gateway specific props
    isGateway = false,
    businessUnit = "",
    application = null,   // { name, id, onboardingId } — initial hint only; the modal owns its own selection below
}) {
    const [form, setForm] = useState({
        organization: organization,
        environment: environment,
        name: editData?.name || "",
        host: editData?.host || "",
        port: editData?.port || "",
        isInternal: editData?.isInternal || "yes",
        onboardingId: editData?.onboardingId || (application?.onboardingId || defaultOnboardingId),
        microserviceId: editData?.microserviceId || defaultMicroserviceId,
    });
    const [sslConfig, setSslConfig] = useState({
        mode: "none",
        ciphers: "",
        trustStore: "",
        protocols: "HTTP",
    });

    const {
        organizations,
        environments,
        isFetchingOrganizations,
        isFetchingEnvironments,
    } = useApigeeOrgEnvironmentOptions(form.organization);

    // ------------------------------------------------------------
    // Gateway mode: Business Unit -> Project -> Application, sourced from the
    // real onboarding hierarchy via OnboardingHierarchySelect (no Team, no
    // free-text Application ID — that's the legacy OnboardingCascadeSelect
    // shape used below in non-gateway mode).
    // ------------------------------------------------------------
    const [gatewaySelection, setGatewaySelection] = useState({
        businessUnitId: "", projectId: "", applicationId: "",
        businessUnit: null, project: null, application: null,
    });

    const handleGatewaySelectionChange = (next) => {
        setGatewaySelection(next);
        setForm((prev) => ({
            ...prev,
            onboardingId: next.application?.applicationId || next.application?.id || "",
            microserviceId: next.application?.id || "",
        }));
    };

    // Given an Application's Mongo id, resolve its Business Unit/Project +
    // selection — used both to pre-fill from the `application` prop on
    // create, and to restore the BU/Project/Application cascade from tracked
    // audit data on edit.
    const hydrateGatewaySelectionFromApplicationId = async (appMongoId) => {
        if (!appMongoId) return;
        try {
            const app = await getApplicationDetail(appMongoId);
            setGatewaySelection({
                businessUnitId: app?.businessUnitId || "",
                projectId: app?.projectId || "",
                applicationId: appMongoId,
                businessUnit: null, project: null, application: app || null,
            });
            setForm((prev) => ({
                ...prev,
                onboardingId: prev.onboardingId || app?.applicationId || appMongoId,
                microserviceId: appMongoId,
            }));
        } catch (err) {
            console.error("Failed to load application detail", err);
        }
    };

    useEffect(() => {
        if (isGateway && !editData?.name && application?.id) {
            hydrateGatewaySelectionFromApplicationId(application.id);
        }
        // Only ever run this prefill once, on mount, for the create flow.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch existing target server details for edit
    const fetchTargetServerDetails = async (org, env, name) => {
        if (!org || !env || !name) return;
        try {
            const res = await apigeeApiFetch(
                APIGEE_ENDPOINTS.TARGET_SERVERS.GET(org, env, name)
            );
            const data = await res.json();
            const registry = data?.audit?.registry || {};
            setForm(prev => ({
                ...prev,
                organization: org,
                environment: env,
                name: data?.name || "",
                host: data?.host || "",
                port: data?.port || "",
                onboardingId: registry.onboardingId || prev.onboardingId,
                microserviceId: registry.microserviceId || prev.microserviceId,
            }));
            if (isGateway && registry.microserviceId) {
                await hydrateGatewaySelectionFromApplicationId(registry.microserviceId);
            }
        } catch (e) {
            console.error("Failed to fetch target server details", e);
        }
    };

    useEffect(() => {
        if (editData?.name) {
            fetchTargetServerDetails(
                form.organization || organization || editData?.org,
                form.environment || environment || editData?.env,
                editData?.name
            );
        }
    }, [editData]);

    // Same field styling as the "Create a proxy" dialog (Gateway/CreateProxyModal.jsx)
    // — this modal previously used bg-dark-800/border-dark-700, which read as a
    // different (lighter grey) surface than every other create dialog in the app.
    const inputStyle =
        "w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#ff5b1f]";

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleOnboardingChange = (onboardingId, option) => {
        setForm(prev => ({
            ...prev,
            onboardingId,
            microserviceId: option?.microserviceId || "",
        }));
    };

    // Gateway mode tracks the selected Business Unit / Project / Application
    // in the config-tracking registry (via x-project-id / x-application-id
    // headers, see fg-apigee-wrapper-svc's tracking-metadata.service.ts) so
    // Edit can restore the full selection later — not just onboardingId/
    // microserviceId.
    const buildTrackingContext = () => {
        if (!isGateway) return form;
        return {
            ...form,
            applicationId: gatewaySelection.application?.applicationId || gatewaySelection.application?.id,
            applicationName: gatewaySelection.application?.name,
            projectId: gatewaySelection.project?.id || gatewaySelection.projectId,
            projectName: gatewaySelection.project?.name,
        };
    };

    const createTargetServer = async (org, env) => {
        if (!org || !env) return;
        const res = await apigeeApiFetch(APIGEE_ENDPOINTS.TARGET_SERVERS.CREATE(org, env), {
            method: 'POST',
            headers: getTrackingHeaders(buildTrackingContext()),
            body: JSON.stringify({
                name: form.name,
                host: form.host,
                port: form.port,
                isEnabled: true
            }),
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error?.message || `Failed to create backend service (${res.status})`);
        }
        return await res.json();
    };

    const updateTargetServer = async (org, env, name) => {
        if (!org || !env || !name) return;
        const res = await apigeeApiFetch(APIGEE_ENDPOINTS.TARGET_SERVERS.UPDATE(org, env, name), {
            method: 'PUT',
            headers: getTrackingHeaders(buildTrackingContext()),
            body: JSON.stringify({
                name: form.name,
                host: form.host,
                port: form.port,
                isEnabled: true
            }),
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error?.message || `Failed to update backend service (${res.status})`);
        }
        return await res.json();
    };

    const handleSubmit = async () => {
        // Gateway mode validation
        if (isGateway && !gatewaySelection.applicationId) {
            const errMsg = "Please select a Business Unit, Project and Application.";
            if (onError) onError(errMsg);
            return;
        }
        if (isGateway && !form.onboardingId) {
            const errMsg = "Application onboarding ID is missing.";
            if (onError) onError(errMsg);
            return;
        }
        // Non‑gateway mode validation
        if (!isGateway && !form.onboardingId) {
            const errMsg = "Onboarding Id is required.";
            if (onError) onError(errMsg);
            return;
        }

        try {
            if (editData) {
                await updateTargetServer(form.organization, form.environment, form.name);
                if (onSuccess) onSuccess(form.name);
            } else {
                await createTargetServer(form.organization, form.environment);
                if (onSuccess) onSuccess(form.name);
            }
            onClose();
        } catch (err) {
            const friendlyMessage = err.message || "An unexpected error occurred while saving the backend service.";
            if (onError) onError(friendlyMessage);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col max-h-[90vh] w-[800px] rounded-xl border border-[#27314e] bg-[#111520] shadow-lg">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-[#27314e] shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {editData ? "Edit Backend Service" : "Create a Backend Service"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {!editData && "Create a backend service in a few simple steps."}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {!isGateway ? (
                        // =============== NON‑GATEWAY MODE ===============
                        <>
                            <div className="grid grid-cols-2 gap-6">
                                <OnboardingCascadeSelect
                                    value={form.onboardingId}
                                    onChange={handleOnboardingChange}
                                    options={onboardingOptions}
                                    isLoading={isFetchingOnboardings}
                                    required
                                    className="col-span-2"
                                    selectClassName={inputStyle}
                                />
                                <div>
                                    <label className="text-sm text-gray-400">Project Id*</label>
                                    <select
                                        value={form.organization}
                                        className={inputStyle}
                                        onChange={(e) => handleChange("organization", e.target.value)}
                                    >
                                        <option value="">Select Project Id</option>
                                        {form.organization && !organizations.includes(form.organization) && (
                                            <option value={form.organization}>{form.organization}</option>
                                        )}
                                        {organizations.map(org => (
                                            <option key={org} value={org}>{org}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Environment*</label>
                                    <select
                                        value={form.environment}
                                        className={inputStyle}
                                        disabled={isFetchingEnvironments}
                                        onChange={(e) => handleChange("environment", e.target.value)}
                                    >
                                        <option value="">Select Environment</option>
                                        {environments.map(env => (
                                            <option key={env} value={env}>{env}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        // =============== GATEWAY MODE ===============
                        <OnboardingHierarchySelect
                            businessUnitId={gatewaySelection.businessUnitId}
                            projectId={gatewaySelection.projectId}
                            applicationId={gatewaySelection.applicationId}
                            onChange={handleGatewaySelectionChange}
                            required
                            selectClassName={inputStyle}
                        />
                    )}

                    {/* Common fields for both modes */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-gray-400">
                                Backend Service Name*
                            </label>
                            <input
                                value={form.name}
                                placeholder="Enter name"
                                className={inputStyle}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400">Host*</label>
                            <input
                                value={form.host}
                                placeholder="Enter Host Name"
                                className={inputStyle}
                                onChange={(e) => handleChange("host", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-gray-400">Port*</label>
                            <input
                                value={form.port}
                                placeholder="Enter Port"
                                className={inputStyle}
                                onChange={(e) => handleChange("port", e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <button className="px-5 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
                                TEST CONNECTION
                            </button>
                        </div>
                    </div>

                    {/* SSL Section (unchanged) */}
                    <div className="space-y-4 pt-4 border-t border-[#27314e]">
                        <div>
                            <label className="text-sm text-gray-400 block mb-2">Security Configuration</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sslConfig.mode === "ssl"}
                                        onChange={() =>
                                            setSslConfig(prev => ({
                                                ...prev,
                                                mode: prev.mode === "ssl" ? "none" : "ssl",
                                            }))
                                        }
                                    />
                                    Enable SSL
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sslConfig.mode === "two-way"}
                                        onChange={() =>
                                            setSslConfig(prev => ({
                                                ...prev,
                                                mode: prev.mode === "two-way" ? "none" : "two-way",
                                            }))
                                        }
                                    />
                                    Enable Two-way TLS
                                </label>
                            </div>
                        </div>
                        {(sslConfig.mode === "ssl") && (
                            <>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm text-gray-400">Ciphers</label>
                                        <input
                                            placeholder="Enter Ciphers"
                                            className={inputStyle}
                                            value={sslConfig.ciphers}
                                            onChange={(e) =>
                                                setSslConfig({ ...sslConfig, ciphers: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">TrustStore</label>
                                        <select
                                            className={inputStyle}
                                            value={sslConfig.trustStore}
                                            onChange={(e) =>
                                                setSslConfig({ ...sslConfig, trustStore: e.target.value })
                                            }
                                        >
                                            <option value="">Select a TrustStore</option>
                                            <option>default-truststore</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm text-gray-400">Protocols</label>
                                        <input
                                            className={inputStyle}
                                            value={sslConfig.protocols}
                                            onChange={(e) =>
                                                setSslConfig({ ...sslConfig, protocols: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-[#27314e] shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                    >
                        {editData ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}



// import { X } from "lucide-react";
// import { useEffect, useState } from "react";
// import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
// import { apigeeApiFetch } from "../../../../services/apigeeApiService";
// import { getTrackingHeaders } from "../apigeeTracking";
// import OnboardingCascadeSelect from "../OnboardingCascadeSelect";
// import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";

// export default function CreateTargetServerModal({
//     onClose,
//     onSuccess,
//     onError, // new: called with error message string
//     editData,
//     organization = "",
//     environment = "",
//     onboardingOptions = [],
//     isFetchingOnboardings = false,
//     defaultOnboardingId = "",
//     defaultMicroserviceId = "",
//     isGateway = false,
//     application = null
// }) {
//     const [form, setForm] = useState({
//         organization: editData?.org || editData?.organization || organization || "",
//         environment: editData?.env || editData?.environment || environment || "",
//         name: editData?.name || "",
//         host: editData?.host || "",
//         port: editData?.port || "",
//         isInternal: editData?.isInternal || "yes",
//         onboardingId: editData?.onboardingId || (application?.onboardingId || defaultOnboardingId) || "",
//         microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
//     });
//     const [sslConfig, setSslConfig] = useState({
//         mode: "none",
//         ciphers: "",
//         trustStore: "",
//         protocols: "HTTP",
//     });
//     const {
//         organizations,
//         environments,
//         isFetchingOrganizations,
//         isFetchingEnvironments,
//     } = useApigeeOrgEnvironmentOptions(form.organization);

//     const fetchTargetServerDetails = async (org, env, name) => {
//         if (!org || !env || !name) return;
//         try {
//             const res = await apigeeApiFetch(
//                 APIGEE_ENDPOINTS.TARGET_SERVERS.GET(org, env, name)
//             );
//             const data = await res.json();
//             setForm(prev => ({
//                 ...prev,
//                 organization: org,
//                 environment: env,
//                 name: data?.name || "",
//                 host: data?.host || "",
//                 port: data?.port || "",
//             }));
//         } catch (e) {
//             console.error("Failed to fetch target server details", e);
//         }
//     };

//     useEffect(() => {
//         if (editData?.name) {
//             fetchTargetServerDetails(
//                 form.organization || organization || editData?.org,
//                 form.environment || environment || editData?.env,
//                 editData?.name
//             );
//         }
//     }, [editData]);

//     const inputStyle =
//         "w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary";

//     const handleChange = (key, value) => {
//         setForm(prev => ({ ...prev, [key]: value }));
//     };

//     const handleOnboardingChange = (onboardingId, option) => {
//         setForm(prev => ({
//             ...prev,
//             onboardingId,
//             microserviceId: option?.microserviceId || "",
//         }));
//     };

//     const createTargetServer = async (org, env) => {
//         if (!org || !env) return;
//         const res = await apigeeApiFetch(APIGEE_ENDPOINTS.TARGET_SERVERS.CREATE(org, env), {
//             method: 'POST',
//             headers: getTrackingHeaders(form),
//             body: JSON.stringify({
//                 name: form.name,
//                 host: form.host,
//                 port: form.port,
//                 isEnabled: true
//             }),
//         });
//         if (!res.ok) {
//             const errorData = await res.json();
//             throw new Error(errorData.error?.message || `Failed to create target server (${res.status})`);
//         }
//         return await res.json();
//     };

//     const updateTargetServer = async (org, env, name) => {
//         if (!org || !env || !name) return;
//         const res = await apigeeApiFetch(APIGEE_ENDPOINTS.TARGET_SERVERS.UPDATE(org, env, name), {
//             method: 'PUT',
//             headers: getTrackingHeaders(form),
//             body: JSON.stringify({
//                 name: form.name,
//                 host: form.host,
//                 port: form.port,
//                 isEnabled: true
//             }),
//         });
//         if (!res.ok) {
//             const errorData = await res.json();
//             throw new Error(errorData.error?.message || `Failed to update target server (${res.status})`);
//         }
//         return await res.json();
//     };

//     const handleSubmit = async () => {
//         if (!form.onboardingId) {
//             const errMsg = "Onboarding Id is required.";
//             if (onError) onError(errMsg);
//             return;
//         }

//         try {
//             if (editData) {
//                 await updateTargetServer(form.organization, form.environment, form.name);
//                 if (onSuccess) onSuccess(form.name);
//             } else {
//                 await createTargetServer(form.organization, form.environment);
//                 if (onSuccess) onSuccess(form.name);
//             }
//             onClose(); // close only on success
//         } catch (err) {
//             const friendlyMessage = err.message || "An unexpected error occurred while saving the target server.";
//             if (onError) onError(friendlyMessage);
//             // do NOT close modal on error
//         }
//     };

//     return (
//         <div className="h-full fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
//             <div className="h-[90vh] w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">
//                 {/* Header */}
//                 <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
//                     <div>
//                         <h2 className="text-lg font-semibold text-white">
//                             {editData ? !isGateway ?"Edit Target Server":"Edit Backend Service" : !isGateway ? "Create a Target Server": "Create a Backend Service"}
//                         </h2>
//                         <p className="text-sm text-gray-400">
//                             {!editData && "Create a target server in a few simple steps."}
//                         </p>
//                     </div>
//                     <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
//                         <X size={16} />
//                     </button>
//                 </div>

//                 {/* Body */}
//                 <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>
//                     <div className="grid grid-cols-2 gap-6">
//                         <OnboardingCascadeSelect
//                             value={form.onboardingId}
//                             onChange={handleOnboardingChange}
//                             options={onboardingOptions}
//                             isLoading={isFetchingOnboardings}
//                             required
//                             className="col-span-2"
//                             selectClassName={inputStyle}
//                         />
//                         <div>
//                             <label className="text-sm text-gray-400">Project Id*</label>
//                             <select
//                                 value={form.organization}
//                                 className={inputStyle}
//                                 onChange={(e) => handleChange("organization", e.target.value)}
//                             >
//                                 <option value="">
//                                     {isFetchingOrganizations ? "Loading project ids..." : "Select Project Id"}
//                                 </option>
//                                 {form.organization && !organizations.includes(form.organization) && (
//                                     <option value={form.organization}>{form.organization}</option>
//                                 )}
//                                 {organizations.map((org) => (
//                                     <option key={org} value={org}>{org}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div>
//                             <label className="text-sm text-gray-400">Environment*</label>
//                             <select
//                                 value={form.environment}
//                                 className={inputStyle}
//                                 disabled={isFetchingEnvironments}
//                                 onChange={(e) => handleChange("environment", e.target.value)}
//                             >
//                                 <option value="">
//                                     {isFetchingEnvironments ? "Loading environments..." : "Select Environment"}
//                                 </option>
//                                 {form.environment && !environments.includes(form.environment) && (
//                                     <option value={form.environment}>{form.environment}</option>
//                                 )}
//                                 {environments.map((envName) => (
//                                     <option key={envName} value={envName}>{envName}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="text-sm text-gray-400">Target Server Name*</label>
//                             <input
//                                 value={form.name}
//                                 placeholder="Enter Target Server Name"
//                                 className={inputStyle}
//                                 onChange={(e) => handleChange("name", e.target.value)}
//                             />
//                         </div>
//                         <div>
//                             <label className="text-sm text-gray-400">Host*</label>
//                             <input
//                                 value={form.host}
//                                 placeholder="Enter Host Name"
//                                 className={inputStyle}
//                                 onChange={(e) => handleChange("host", e.target.value)}
//                             />
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="text-sm text-gray-400">Port*</label>
//                             <input
//                                 value={form.port}
//                                 placeholder="Enter Port"
//                                 className={inputStyle}
//                                 onChange={(e) => handleChange("port", e.target.value)}
//                             />
//                         </div>
//                         <div className="flex items-end">
//                             <button className="px-5 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
//                                 TEST CONNECTION
//                             </button>
//                         </div>
//                     </div>

//                     {/* SSL Section (unchanged) */}
//                     <div className="space-y-4 pt-4 border-t border-dark-700">
//                         <div>
//                             <label className="text-sm text-gray-400 block mb-2">Security Configuration</label>
//                             <div className="flex gap-6">
//                                 <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
//                                     <input
//                                         type="checkbox"
//                                         checked={sslConfig.mode === "ssl"}
//                                         onChange={() =>
//                                             setSslConfig(prev => ({
//                                                 ...prev,
//                                                 mode: prev.mode === "ssl" ? "none" : "ssl",
//                                             }))
//                                         }
//                                     />
//                                     Enable SSL
//                                 </label>
//                                 <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
//                                     <input
//                                         type="checkbox"
//                                         checked={sslConfig.mode === "two-way"}
//                                         onChange={() =>
//                                             setSslConfig(prev => ({
//                                                 ...prev,
//                                                 mode: prev.mode === "two-way" ? "none" : "two-way",
//                                             }))
//                                         }
//                                     />
//                                     Enable Two-way TLS
//                                 </label>
//                             </div>
//                         </div>
//                         {(sslConfig.mode === "ssl") && (
//                             <>
//                                 <div className="grid grid-cols-2 gap-6">
//                                     <div>
//                                         <label className="text-sm text-gray-400">Ciphers</label>
//                                         <input
//                                             placeholder="Enter Ciphers"
//                                             className={inputStyle}
//                                             value={sslConfig.ciphers}
//                                             onChange={(e) =>
//                                                 setSslConfig({ ...sslConfig, ciphers: e.target.value })
//                                             }
//                                         />
//                                     </div>
//                                     <div>
//                                         <label className="text-sm text-gray-400">TrustStore</label>
//                                         <select
//                                             className={inputStyle}
//                                             value={sslConfig.trustStore}
//                                             onChange={(e) =>
//                                                 setSslConfig({ ...sslConfig, trustStore: e.target.value })
//                                             }
//                                         >
//                                             <option value="">Select a TrustStore</option>
//                                             <option>default-truststore</option>
//                                         </select>
//                                     </div>
//                                 </div>
//                                 <div className="grid grid-cols-2 gap-6">
//                                     <div>
//                                         <label className="text-sm text-gray-400">Protocols</label>
//                                         <input
//                                             className={inputStyle}
//                                             value={sslConfig.protocols}
//                                             onChange={(e) =>
//                                                 setSslConfig({ ...sslConfig, protocols: e.target.value })
//                                             }
//                                         />
//                                     </div>
//                                 </div>
//                             </>
//                         )}
//                     </div>
//                 </div>

//                 {/* Footer */}
//                 <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
//                     <button onClick={onClose} className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
//                         Cancel
//                     </button>
//                     <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
//                         {editData ? "Update" : "Create"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

