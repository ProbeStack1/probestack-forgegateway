import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../../services/apigeeApiService";
import { getTrackingHeaders } from "../apigeeTracking";
import OnboardingHierarchySelect from "../OnboardingHierarchySelect";
import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";
import { getApplicationDetail } from "../../../../http-service/onboardingApi";

const CERT_TYPES = [
    "Certificate Only",
    "Certificate and Key",
    "PKCS12/PFX",
    "Self-Signed Certificate",
];

export default function CreateKeystore({
    onClose,
    editData,
    onSuccess,
    organization = "",
    environment = "",
    // Gateway specific props — same convention as CreateTargetServerModal.jsx
    isGateway = false,
    application = null,
}) {
    const resolvedOrg = editData?.organization || editData?.projectId || organization || "";
    const resolvedEnv = editData?.environment || editData?.env || environment || "";

    // ------------------------------------------------------------
    // Gateway mode: Business Unit -> Project -> Application.
    // ------------------------------------------------------------
    const [gatewaySelection, setGatewaySelection] = useState({
        businessUnitId: "", projectId: "", applicationId: "",
        businessUnit: null, project: null, application: null,
    });

    useEffect(() => {
        if (!isGateway || editData || !application?.id) return;
        (async () => {
            try {
                const app = await getApplicationDetail(application.id);
                setGatewaySelection({
                    businessUnitId: app?.businessUnitId || "",
                    projectId: app?.projectId || "",
                    applicationId: application.id,
                    businessUnit: null, project: null, application: app || null,
                });
            } catch (err) {
                console.error("Failed to load application detail", err);
            }
        })();
        // Only ever run this prefill once, on mount, for the create flow.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildTrackingContext = () => ({
        applicationId: gatewaySelection.application?.applicationId || gatewaySelection.application?.id,
        applicationName: gatewaySelection.application?.name,
        projectId: gatewaySelection.project?.id || gatewaySelection.projectId,
        projectName: gatewaySelection.project?.name,
    });

    const [form, setForm] = useState({
        organization: resolvedOrg,
        environment: resolvedEnv,
        keystoreName: editData?.name || "",
        aliasName: "",
        certType: "Certificate and Key", // default to match most common use case
        certificateFile: null,
        keyFile: null,
        keyPassword: "",
        allowExpired: false,
        pkcs12File: null,
        pkcs12Password: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [existingKeystores, setExistingKeystores] = useState([]);

    const {
        organizations,
        environments,
        isFetchingOrganizations,
        isFetchingEnvironments,
    } = useApigeeOrgEnvironmentOptions(form.organization);

    // When editing an existing keystore, we may load its aliases etc. (simplified)
    useEffect(() => {
        if (editData) {
            setForm((prev) => ({
                ...prev,
                organization: resolvedOrg,
                environment: resolvedEnv,
                keystoreName: editData?.name || "",
                aliasName: "",
                certType: "Certificate and Key",
            }));
        }
    }, [editData, resolvedOrg, resolvedEnv]);

    // Fetch existing keystores for the dropdown (when creating a new alias without editData)
    useEffect(() => {
        const fetchKss = async () => {
            if (editData) return; // editing an existing keystore, no need to list others
            if (!form.organization || !form.environment) return;
            try {
                const res = await apigeeApiFetch(
                    APIGEE_ENDPOINTS.TLS_KEYSTORES.LIST(form.organization, form.environment)
                );
                const data = await res.json();
                const list = Array.isArray(data) ? data.map((ks) => ks.name) : [];
                setExistingKeystores(list);
            } catch (e) {
                console.error("Failed to fetch keystores", e);
            }
        };
        fetchKss();
    }, [form.organization, form.environment, editData]);

    // Same field styling as the "Create a proxy" dialog (Gateway/CreateProxyModal.jsx)
    // — this modal previously used bg-dark-800/border-dark-700, which read as a
    // different (lighter grey) surface than every other create dialog in the app.
    const inputStyle =
        "w-full bg-[#0f1117] border border-[#2a3550] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#ff5b1f]";

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files?.[0];
        if (file) {
            setForm((prev) => ({ ...prev, [field]: file }));
        }
    };

    const handleSubmit = async () => {
        setSubmitError("");

        if (!form.organization || !form.environment || !form.keystoreName.trim()) {
            setSubmitError("Project Id, Environment, and Keystore Name are required.");
            return;
        }

        if (isGateway && !editData && !gatewaySelection.applicationId) {
            setSubmitError("Please select a Business Unit, Project and Application.");
            return;
        }

        // For new keystore creation, we need to create the keystore first, then optionally add alias
        setIsSubmitting(true);
        try {
            let keystoreName = form.keystoreName.trim();

            // If we are NOT editing an existing keystore, create it first
            if (!editData) {
                const createKsRes = await apigeeApiFetch(
                    APIGEE_ENDPOINTS.TLS_KEYSTORES.CREATE(form.organization, form.environment),
                    {
                        method: "POST",
                        headers: getTrackingHeaders(buildTrackingContext()),
                        body: JSON.stringify({ name: keystoreName }),
                    }
                );
                if (!createKsRes.ok) {
                    const errText = await createKsRes.text();
                    throw new Error(`Failed to create keystore: ${createKsRes.status} ${errText}`);
                }
            } else {
                keystoreName = editData.name; // use existing name
            }

            // If alias details are provided, create the alias inside the keystore
            if (form.aliasName.trim()) {
                const aliasPayload = {
                    alias: form.aliasName.trim(),
                    ...(form.certType === "Certificate and Key" && {
                        certs: form.certificateFile ? await toBase64(form.certificateFile) : undefined,
                        key: form.keyFile ? await toBase64(form.keyFile) : undefined,
                        keyPassword: form.keyPassword,
                    }),
                    ...(form.certType === "Certificate Only" && {
                        certs: form.certificateFile ? await toBase64(form.certificateFile) : undefined,
                    }),
                    ...(form.certType === "PKCS12/PFX" && {
                        pkcs12File: form.pkcs12File ? await toBase64(form.pkcs12File) : undefined,
                        pkcs12Password: form.pkcs12Password,
                    }),
                    ...(form.certType === "Self-Signed Certificate" && {
                        // self-signed specific fields would go here; simplified
                    }),
                    ignoreExpiryValidation: form.allowExpired,
                };

                const aliasRes = await apigeeApiFetch(
                    APIGEE_ENDPOINTS.TLS_KEYSTORES.ALIASES.CREATE(
                        form.organization,
                        form.environment,
                        keystoreName
                    ),
                    {
                        method: "POST",
                        headers: getTrackingHeaders(buildTrackingContext()),
                        body: JSON.stringify(aliasPayload),
                    }
                );
                if (!aliasRes.ok) {
                    const errText = await aliasRes.text();
                    throw new Error(`Alias creation failed: ${aliasRes.status} ${errText}`);
                }
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Keystore/alias creation error", error);
            setSubmitError(error.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to convert file to base64 (required for cert/key upload)
    const toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(",")[1]); // strip data:... prefix
            reader.onerror = (error) => reject(error);
        });

    return (
        <div className="fixed h-full inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

            <div className="h-[90vh] w-[800px] rounded-xl border border-[#27314e] bg-[#111520] shadow-lg">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-[#27314e]">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {editData ? "Edit Keystore / Add Alias" : "Create Keystore"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {editData
                                ? "Manage this keystore and its certificate aliases."
                                : "Create a new keystore and optionally add a certificate alias."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>
                    {isGateway && (
                        // Gateway mode: Business Unit -> Project -> Application, same
                        // convention as CreateTargetServerModal.jsx/CreateKVMModal.jsx.
                        <OnboardingHierarchySelect
                            businessUnitId={gatewaySelection.businessUnitId}
                            projectId={gatewaySelection.projectId}
                            applicationId={gatewaySelection.applicationId}
                            onChange={setGatewaySelection}
                            required
                            selectClassName={inputStyle}
                        />
                    )}
                    {/* Row 1: Environment & Keystore */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-gray-400">Environment*</label>
                            <select
                                value={form.environment}
                                className={inputStyle}
                                disabled={isFetchingEnvironments}
                                onChange={(e) => handleChange("environment", e.target.value)}
                            >
                                <option value="">
                                    {isFetchingEnvironments ? "Loading..." : "Select Environment"}
                                </option>
                                {form.environment && !environments.includes(form.environment) && (
                                    <option value={form.environment}>{form.environment}</option>
                                )}
                                {environments.map((envName) => (
                                    <option key={envName} value={envName}>
                                        {envName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400">Keystore*</label>
                            {editData ? (
                                <input
                                    value={form.keystoreName}
                                    disabled
                                    className={`${inputStyle} opacity-60 cursor-not-allowed`}
                                />
                            ) : (
                                <input
                                    value={form.keystoreName}
                                    onChange={(e) => handleChange("keystoreName", e.target.value)}
                                    placeholder="Enter keystore name"
                                    className={inputStyle}
                                />
                            )}
                        </div>
                    </div>

                    {/* Alias Section (optional on create, required when editing to add alias) */}
                    <div className="space-y-4 pt-4 border-t border-[#27314e]">
                        <h3 className="text-sm font-medium text-gray-300">Alias Details (optional)</h3>
                        <div>
                            <label className="text-sm text-gray-400">Alias Name*</label>
                            <input
                                value={form.aliasName}
                                onChange={(e) => handleChange("aliasName", e.target.value)}
                                placeholder="Enter alias name"
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400">Type*</label>
                            <select
                                value={form.certType}
                                onChange={(e) => handleChange("certType", e.target.value)}
                                className={inputStyle}
                            >
                                {CERT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Conditional fields based on cert type */}
                        {form.certType === "Certificate and Key" && (
                            <>
                                <div>
                                    <label className="text-sm text-gray-400">Certificate file*</label>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileChange(e, "certificateFile")}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Key file*</label>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileChange(e, "keyFile")}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Key password</label>
                                    <input
                                        type="password"
                                        value={form.keyPassword}
                                        onChange={(e) => handleChange("keyPassword", e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                            </>
                        )}

                        {form.certType === "Certificate Only" && (
                            <div>
                                <label className="text-sm text-gray-400">Certificate file*</label>
                                <input
                                    type="file"
                                    onChange={(e) => handleFileChange(e, "certificateFile")}
                                    className={inputStyle}
                                />
                            </div>
                        )}

                        {form.certType === "PKCS12/PFX" && (
                            <>
                                <div>
                                    <label className="text-sm text-gray-400">PKCS12/PFX file*</label>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileChange(e, "pkcs12File")}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Password</label>
                                    <input
                                        type="password"
                                        value={form.pkcs12Password}
                                        onChange={(e) => handleChange("pkcs12Password", e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                            </>
                        )}

                        {form.certType === "Self-Signed Certificate" && (
                            <div className="p-3 bg-[#0f1117]/50 border border-[#2a3550] rounded-lg text-sm text-gray-400">
                                A self-signed certificate will be generated automatically.
                            </div>
                        )}

                        {/* Allow expired certificate */}
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.allowExpired}
                                onChange={(e) => handleChange("allowExpired", e.target.checked)}
                                className="rounded bg-[#0f1117] border-[#2a3550] text-[#ff5b1f] focus:ring-[#ff5b1f]"
                            />
                            Allow expired certificate
                        </label>
                    </div>

                    {submitError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {submitError}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-[#27314e] modal-footer" style={{ height: "4.5rem" }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                    >
                        {isSubmitting ? "Creating..." : editData ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}