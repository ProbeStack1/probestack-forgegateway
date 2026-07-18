import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";

export default function CreateVaultsModal({
    onClose,
    onSuccess,
    editData,
    viewMode,
}) {
    const [form, setForm] = useState({
        prefix: "",
        name: "env",
        description: "",
        configPrefix: "KONG_VAULT_",
        tags: ["vault"],
    });
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

    useEffect(() => {
        if (editData) {
            setForm({
                prefix: editData.prefix || "",
                name: editData.name || "",
                description: editData.description || "",
                configPrefix: editData.config?.prefix || "",
                tags: Array.isArray(editData.tags) ? editData.tags : [],
            });
        }
    }, [editData]);

    
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSubmit = async () => {
        if (!form.prefix.trim()) {
            setSubmitError("Prefix is required");
            return;
        }

        if (!form.name.trim()) {
            setSubmitError("Name is required");
            return;
        }

        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setSubmitError("Save a control plane in Kong settings before creating vaults");
            return;
        }        
        if (!trackingOnboardingId) {
            setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
            return;
        }


        const payload = {
            prefix: form.prefix.trim(),
            name: form.name.trim(),
            description: form.description.trim() || null,
            config: {
                prefix: form.configPrefix.trim(),
            },
            tags: Array.isArray(form.tags) ? form.tags : [],
        };

        setSubmitError("");
        setIsSubmitting(true);
        try {
            await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.VAULTS(controlPlaneId),
                {
                    method: "POST",
                    body: payload,
                tracking: { onboardingId: trackingOnboardingId },
                }
            );

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError(err.message || "Failed to create vault");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-[700px] bg-slate-900 rounded-xl border border-slate-800 p-6 text-white">
                {/* Header */}
                <div className="flex justify-between items-center py-4 border-b border-dark-700 modal-header">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {viewMode ? "View Vault" : editData ? "Edit Vault" : "Create Vault"}
                        </h2>
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-6">
                    <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />
                    {/* Prefix */}
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">
                            Prefix <span className="text-red-400">*</span>
                        </label>
                        <input
                            value={form.prefix}
                            onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                            disabled={viewMode}
                            className="input w-full"
                            placeholder="Enter a unique prefix for this vault"
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">
                            Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            disabled={viewMode}
                            className="input w-full"
                            placeholder="env"
                        />
                    </div>

                    {/* Config Prefix */}
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">
                            Config Prefix
                        </label>
                        <input
                            value={form.configPrefix}
                            onChange={(e) => setForm({ ...form, configPrefix: e.target.value })}
                            disabled={viewMode}
                            className="input w-full"
                            placeholder="KONG_VAULT_"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            disabled={viewMode}
                            className="input w-full h-24"
                            placeholder="Enter some description for this vault"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block mb-1 text-sm text-gray-400">
                            Tags
                        </label>
                        <KongTagInput
                            value={form.tags}
                            onChange={(tags) => setForm({ ...form, tags })}
                            disabled={viewMode}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 mt-6">
                    {submitError && (
                        <p className="mr-auto text-sm text-red-400">{submitError}</p>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate-700 text-gray-300"
                    >
                        {viewMode ? "Close" : "Cancel"}
                    </button>

                    {!viewMode && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30 disabled:opacity-60"
                        >
                            {isSubmitting ? "Creating..." : "Create"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
