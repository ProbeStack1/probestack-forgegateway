import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ConsumerSummaryPanel from "./ConsumerSummaryPanel";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";
import "./consumer.css";

export default function CreateConsumerModal({
    onClose,
    onSuccess,
    editData,
    viewMode
}) {
    const [form, setForm] = useState({
        username: "",
        customId: "",
        tags: [],
        credentialType: "none",

        // Key Auth
        apiKey: "",

        // JWT
        jwtKey: "",
        jwtSecret: "",
        jwtAlgo: "HS256",
        jwtRsaPublicKey: "",

        // Basic
        basicUser: "",
        basicPass: "",

        // HMAC
        hmacUser: "",
        hmacSecret: "",

        // ACL
        aclGroups: [],

        // Rate Limit
        rateLimitEnabled: false,
        rlMin: 100,
        rlHour: 2000
    });

    const [groupInput, setGroupInput] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

    const credentialOptions = ["key", "jwt", "basic", "hmac", "none"];

    const submitCredential = async (endpoint, payload, isEditMode, credentialType) => {
        if (!isEditMode) {
            return kongFetch(endpoint, {
                method: "POST",
                body: payload,
                tracking: { onboardingId: trackingOnboardingId },
            });
        }

        try {
            return await kongFetch(endpoint, {
                method: "PUT",
                body: payload,
                tracking: { onboardingId: trackingOnboardingId },
            });
        } catch (error) {
            if (error?.status !== 404) {
                throw error;
            }

            return kongFetch(endpoint, {
                method: "POST",
                body: payload,
                tracking: { onboardingId: trackingOnboardingId },
            });
        }
    };

    const extractCredentialRecord = (payload) => {
        if (Array.isArray(payload?.data)) {
            return payload.data[0] || null;
        }

        if (payload?.data && typeof payload.data === "object") {
            return payload.data;
        }

        if (payload && typeof payload === "object" && Object.keys(payload).length > 0) {
            return payload;
        }

        return null;
    };

    const fetchOptionalCredential = async (endpoint) => {
        try {
            const payload = await kongFetch(endpoint, {
                cache: "no-store",
            });
            return extractCredentialRecord(payload);
        } catch (error) {
            if (error?.status === 404) {
                return null;
            }

            throw error;
        }
    };

    // ================= GROUPS =================
    const addGroup = () => {
        if (!groupInput.trim() || form.aclGroups.includes(groupInput)) return;
        setForm({ ...form, aclGroups: [...form.aclGroups, groupInput] });
        setGroupInput("");
    };

    const removeGroup = (g) => {
        setForm({ ...form, aclGroups: form.aclGroups.filter(x => x !== g) });
    };

    // ================= SUBMIT =================
    
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSubmit = async () => {
        if (!form.username.trim()) {
            setSubmitError("Username is required");
            return;
        }

        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setSubmitError("Save a control plane in Kong settings before creating consumers");
            return;
        }        
        if (!trackingOnboardingId) {
            setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
            return;
        }


        const consumerPayload = {
            username: form.username.trim(),
            custom_id: form.customId.trim() || null,
            tags: Array.isArray(form.tags) ? form.tags : [],
        };

        setSubmitError("");
        setIsSubmitting(true);

        try {
            const consumerEndpoint = editData?.id
                ? KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_BY_ID(controlPlaneId, editData.id)
                : KONG_ENDPOINTS.CONTROL_PLANE.CONSUMERS(controlPlaneId);
            const consumerMethod = editData?.id ? "PUT" : "POST";

            const consumerResult = await kongFetch(consumerEndpoint, {
                method: consumerMethod,
                body: consumerPayload,
                tracking: { onboardingId: trackingOnboardingId },
            });

            const consumerId = consumerResult?.id || editData?.id;
            if (!consumerId) {
                throw new Error("Consumer API did not return a consumer id");
            }

            if (form.credentialType !== "none") {
                let endpoint = "";
                let payload = {};

                if (form.credentialType === "jwt") {
                    endpoint = KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_JWT(controlPlaneId, consumerId);
                    payload = {
                        key: form.jwtKey.trim(),
                        secret: form.jwtSecret.trim(),
                        algorithm: form.jwtAlgo || "HS256",
                        rsa_public_key: form.jwtRsaPublicKey.trim() || null,
                    };
                }

                if (form.credentialType === "key") {
                    endpoint = KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_KEY_AUTH(controlPlaneId, consumerId);
                    payload = {
                        key: form.apiKey.trim(),
                    };
                }

                if (form.credentialType === "basic") {
                    endpoint = KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_BASIC_AUTH(controlPlaneId, consumerId);
                    payload = {
                        username: form.basicUser.trim(),
                        password: form.basicPass,
                    };
                }

                if (form.credentialType === "hmac") {
                    endpoint = KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_HMAC_AUTH(controlPlaneId, consumerId);
                    payload = {
                        username: form.hmacUser.trim(),
                        secret: form.hmacSecret.trim(),
                    };
                }

                await submitCredential(
                    endpoint,
                    payload,
                    Boolean(editData?.id),
                    form.credentialType
                );
            }

            for (const group of form.aclGroups) {
                await kongFetch(
                    KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_ACLS(controlPlaneId, consumerId),
                    {
                        method: "POST",
                        body: { group },
                        tracking: { onboardingId: trackingOnboardingId },
                    }
                );
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError(err.message || "Failed to save consumer");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ================= PREFILL =================
    useEffect(() => {
        if (editData) {
            setForm((prev) => ({
                ...prev,
                ...editData,
                customId: editData.custom_id || editData.customId || "",
                credentialType: editData.credentialType || "none",
                aclGroups: Array.isArray(editData.groups) ? editData.groups : Array.isArray(editData.aclGroups) ? editData.aclGroups : [],
            }));
        }
    }, [editData]);

    useEffect(() => {
        const loadConsumerCredentials = async () => {
            if (!editData?.id) {
                return;
            }

            const controlPlaneId = getKongControlPlaneId();
            if (!controlPlaneId) {
                return;
            }

setIsLoadingCredentials(true);
            try {
                const [keyAuth, jwtAuth, basicAuth, hmacAuth] = await Promise.all([
                    fetchOptionalCredential(
                        KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_KEY_AUTH(controlPlaneId, editData.id)
                    ),
                    fetchOptionalCredential(
                        KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_JWT(controlPlaneId, editData.id)
                    ),
                    fetchOptionalCredential(
                        KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_BASIC_AUTH(controlPlaneId, editData.id)
                    ),
                    fetchOptionalCredential(
                        KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_HMAC_AUTH(controlPlaneId, editData.id)
                    ),
                ]);

                setForm((prev) => {
                    const nextForm = {
                        ...prev,
                        credentialType: "none",
                        apiKey: "",
                        jwtKey: "",
                        jwtSecret: "",
                        jwtAlgo: "HS256",
                        jwtRsaPublicKey: "",
                        basicUser: "",
                        basicPass: "",
                        hmacUser: "",
                        hmacSecret: "",
                    };

                    if (keyAuth) {
                        nextForm.credentialType = "key";
                        nextForm.apiKey = keyAuth.key || "";
                        return nextForm;
                    }

                    if (jwtAuth) {
                        nextForm.credentialType = "jwt";
                        nextForm.jwtKey = jwtAuth.key || "";
                        nextForm.jwtSecret = jwtAuth.secret || "";
                        nextForm.jwtAlgo = jwtAuth.algorithm || "HS256";
                        nextForm.jwtRsaPublicKey = jwtAuth.rsa_public_key || "";
                        return nextForm;
                    }

                    if (basicAuth) {
                        nextForm.credentialType = "basic";
                        nextForm.basicUser = basicAuth.username || "";
                        nextForm.basicPass = basicAuth.password || "";
                        return nextForm;
                    }

                    if (hmacAuth) {
                        nextForm.credentialType = "hmac";
                        nextForm.hmacUser = hmacAuth.username || "";
                        nextForm.hmacSecret = hmacAuth.secret || "";
                        return nextForm;
                    }

                    return nextForm;
                });
            } catch (err) {
                console.error(err);
                setSubmitError(err.message || "Failed to load consumer credentials");
            } finally {
                setIsLoadingCredentials(false);
            }
        };

        loadConsumerCredentials();
    }, [editData]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

            <div className="w-[1000px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {viewMode
                                ? "View Consumer"
                                : editData
                                    ? "Edit Consumer"
                                    : "Create Consumer"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            Configure consumer identity, credentials & access
                        </p>
                    </div>

                    <button onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 grid grid-cols-3 gap-6 overflow-y-auto"
                    style={{ maxHeight: "calc(90vh - 9rem)" }}>

                    {/* LEFT */}
                    <div className="col-span-2 space-y-6">

                        <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />

                        {/* ========== IDENTITY ========== */}
                        <div className="grid grid-cols-2 gap-4">

                            <div>
                                <label className="text-sm text-gray-400">Username *</label>
                                <input
                                    disabled={viewMode}
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Custom ID</label>
                                <input
                                    disabled={viewMode}
                                    value={form.customId}
                                    onChange={(e) => setForm({ ...form, customId: e.target.value })}
                                    className="input"
                                />
                            </div>

                            {/* TAGS */}
                            <div className="col-span-2">
                                <label className="text-sm text-gray-400">Tags</label>
                                <KongTagInput
                                    value={form.tags}
                                    onChange={(tags) => setForm({ ...form, tags })}
                                    disabled={viewMode}
                                />
                            </div>
                        </div>

                        {/* ========== CREDENTIALS ========== */}
                        <div>
                            <label className="text-sm text-gray-400">Credentials</label>
                            {isLoadingCredentials && (
                                <p className="mt-2 text-xs text-gray-400">Loading existing credentials...</p>
                            )}

                            <div className="flex gap-2 mt-2 mb-4">
                                {credentialOptions.map(type => (
                                    <button
                                        key={type}
                                        disabled={viewMode}
                                        onClick={() => setForm({ ...form, credentialType: type })}
                                        className={`px-3 py-1 text-xs rounded 
                                        ${form.credentialType === type ? "bg-orange-700 text-white" : "bg-dark-800 text-gray-400"}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {/* KEY AUTH */}
                            {form.credentialType === "key" && (
                                <input
                                    disabled={viewMode}
                                    placeholder="API Key"
                                    value={form.apiKey}
                                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                    className="input"
                                />
                            )}

                            {/* JWT */}
                            {form.credentialType === "jwt" && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Key"
                                        disabled={viewMode}
                                        value={form.jwtKey}
                                        onChange={(e) => setForm({ ...form, jwtKey: e.target.value })}
                                        className="input" />

                                    <input placeholder="Secret"
                                        disabled={viewMode}
                                        value={form.jwtSecret}
                                        onChange={(e) => setForm({ ...form, jwtSecret: e.target.value })}
                                        className="input" />

                                    <select
                                        disabled={viewMode}
                                        value={form.jwtAlgo}
                                        onChange={(e) => setForm({ ...form, jwtAlgo: e.target.value })}
                                        className="input"
                                    >
                                        <option value="HS256">HS256</option>
                                        <option value="HS384">HS384</option>
                                        <option value="HS512">HS512</option>
                                        <option value="RS256">RS256</option>
                                        <option value="RS384">RS384</option>
                                        <option value="RS512">RS512</option>
                                    </select>

                                    <input
                                        disabled={viewMode}
                                        placeholder="RSA Public Key (optional)"
                                        value={form.jwtRsaPublicKey}
                                        onChange={(e) => setForm({ ...form, jwtRsaPublicKey: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            )}

                            {/* BASIC */}
                            {form.credentialType === "basic" && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Username"
                                        disabled={viewMode}
                                        value={form.basicUser}
                                        onChange={(e) => setForm({ ...form, basicUser: e.target.value })}
                                        className="input" />

                                    <input type="password" placeholder="Password"
                                        disabled={viewMode}
                                        value={form.basicPass}
                                        onChange={(e) => setForm({ ...form, basicPass: e.target.value })}
                                        className="input" />
                                </div>
                            )}

                            {/* HMAC */}
                            {form.credentialType === "hmac" && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        disabled={viewMode}
                                        placeholder="HMAC Username"
                                        value={form.hmacUser}
                                        onChange={(e) => setForm({ ...form, hmacUser: e.target.value })}
                                        className="input"
                                    />

                                    <input
                                        disabled={viewMode}
                                        placeholder="HMAC Secret"
                                        value={form.hmacSecret}
                                        onChange={(e) => setForm({ ...form, hmacSecret: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ========== ACL GROUPS ========== */}
                        <div>
                            <label className="text-sm text-gray-400">ACL Groups</label>

                            <div className="flex gap-2">
                                <input
                                    disabled={viewMode}
                                    value={groupInput}
                                    onChange={(e) => setGroupInput(e.target.value)}
                                    className="input"
                                />
                                <button disabled={viewMode} onClick={addGroup} className="px-3 rounded-xl text-sm bg-orange-600 text-white-600">
                                    Add
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-2">
                                {form.aclGroups.map(g => (
                                    <span key={g} className="px-2 py-1 bg-blue-500/20 text-xs rounded flex items-center gap-1">
                                        {g}
                                        {!viewMode && (
                                            <X size={12} onClick={() => removeGroup(g)} />
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* ========== RATE LIMIT ========== */}
                        <div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">Rate Limiting</span>

                                <button
                                    disabled={viewMode}
                                    onClick={() =>
                                        setForm({ ...form, rateLimitEnabled: !form.rateLimitEnabled })
                                    }
                                    className={`w-10 h-5 flex items-center rounded-full p-1 ${form.rateLimitEnabled ? "bg-primary" : "bg-gray-600"}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full ${form.rateLimitEnabled ? "translate-x-5" : ""}`} />
                                </button>
                            </div>

                            {form.rateLimitEnabled && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <input
                                        type="number"
                                        value={form.rlMin}
                                        onChange={(e) => setForm({ ...form, rlMin: e.target.value })}
                                        className="input"
                                    />
                                    <input
                                        type="number"
                                        value={form.rlHour}
                                        onChange={(e) => setForm({ ...form, rlHour: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT */}
                    <ConsumerSummaryPanel form={form} />
                </div>

                {/* FOOTER */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
                    {submitError && (
                        <p className="mr-auto text-sm text-red-400">{submitError}</p>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        {viewMode ? "Close" : "Cancel"}
                    </button>

                    {!viewMode && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30 disabled:opacity-60"
                        >
                            {isSubmitting ? "Saving..." : editData ? "Update" : "Create"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
