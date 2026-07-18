import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";

export default function CreateTLSModal({
    onClose,
    onSuccess,
    onCreateSnis,
    editData,
    viewMode,
}) {
    const [cert, setCert] = useState("");
    const [key, setKey] = useState("");
    const [certAlt, setCertAlt] = useState("");
    const [keyAlt, setKeyAlt] = useState("");
    const [snis, setSnis] = useState([""]);
    const [tags, setTags] = useState(["ssl"]);
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

    const normalizeSnis = (value) => {
        if (!value) return [""];
        if (Array.isArray(value)) return value.length ? value : [""];
        if (typeof value === "string") return [value];
        return [""];
    };

    useEffect(() => {
        if (editData) {
            setCert(editData.cert || "");
            setKey(editData.key || "");
            setCertAlt(editData.certAlt || "");
            setKeyAlt(editData.keyAlt || "");

            setSnis(normalizeSnis(editData.sni || editData.snis));

            setTags(Array.isArray(editData.tags) ? editData.tags : []);
        }
    }, [editData]);

    const handleAddSni = () => {
        setSnis((prev) => [...prev, ""]);
    };

    const handleRemoveSni = (index) => {
        const updated = snis.filter((_, i) => i !== index);
        setSnis(updated.length ? updated : []);
    };

    const handleChangeSni = (index, value) => {
        const updated = [...snis];
        updated[index] = value;
        setSnis(updated);
    };

    
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSubmit = async () => {
        if (!cert.trim()) {
            setSubmitError("Certificate is required");
            return;
        }

        if (!key.trim()) {
            setSubmitError("Private key is required");
            return;
        }

        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setSubmitError("Save a control plane in Kong settings before creating TLS certificates");
            return;
        }        
        if (!trackingOnboardingId) {
            setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
            return;
        }


        const sniNames = snis.map((sni) => sni.trim()).filter(Boolean);
        const payload = {
            cert: cert.trim(),
            key: key.trim(),
            snis: sniNames,
            tags,
        };

        if (certAlt.trim()) {
            payload.cert_alt = certAlt.trim();
        }

        if (keyAlt.trim()) {
            payload.key_alt = keyAlt.trim();
        }

        setSubmitError("");
        setIsSubmitting(true);

        try {
            const certificate = await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.CERTIFICATES(controlPlaneId),
                {
                    method: "POST",
                    body: payload,
                tracking: { onboardingId: trackingOnboardingId },
                }
            );

            const certificateId = certificate?.id || certificate?.data?.id;
            if (certificateId && sniNames.length > 0) {
                await onCreateSnis?.(certificateId, sniNames, trackingOnboardingId);
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError(err.message || "Failed to create TLS certificate");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

            <div className="w-[900px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
                    <h2 className="text-lg font-semibold text-white">
                        {viewMode
                            ? "View Certificate"
                            : editData
                                ? "Edit Certificate"
                                : "Create Certificate"}
                    </h2>

                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols gap-6 overflow-y-auto modal-body" style={{ maxHeight: "calc(90vh - 9rem)" }}>

                    <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />

                    {/* SSL Key Pair Section */}
                    <div className="grid grid-cols gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                SSL Key Pair
                            </h3>
                            <p className="text-xs text-gray-400">
                                The PEM-encoded public certificate chain and private key.
                            </p>
                        </div>

                        <div className="col-span-2 space-y-5">

                            {/* Cert */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-400">
                                    Cert <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    className="input w-full h-24"
                                    value={cert}
                                    onChange={(e) => setCert(e.target.value)}
                                    disabled={viewMode}
                                    placeholder="Paste certificate"
                                />
                            </div>

                            {/* Key */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-400">
                                    Key <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    className="input w-full h-24"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    disabled={viewMode}
                                    placeholder="Paste private key"
                                />
                            </div>

                            {/* Cert Alt */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-400">
                                    Cert Alt
                                </label>
                                <textarea
                                    className="input w-full h-24"
                                    value={certAlt}
                                    onChange={(e) => setCertAlt(e.target.value)}
                                    disabled={viewMode}
                                    placeholder="Alternate certificate"
                                />
                            </div>

                            {/* Key Alt */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-400">
                                    Key Alt
                                </label>
                                <textarea
                                    className="input w-full h-24"
                                    value={keyAlt}
                                    onChange={(e) => setKeyAlt(e.target.value)}
                                    disabled={viewMode}
                                    placeholder="Alternate private key"
                                />
                            </div>

                            {/* SNIs */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-400">SNIs</label>

                                {snis.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleAddSni}
                                        className="px-3 py-2 flex items-center gap-1 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                                    >
                                        <Plus size={14} /> Add SNI
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        {Array.isArray(snis) &&
                                            snis.map((value, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <input
                                                        className="input w-full"
                                                        value={value}
                                                        disabled={viewMode}
                                                        onChange={(e) =>
                                                            handleChangeSni(index, e.target.value)
                                                        }
                                                        placeholder="Enter an SNI"
                                                    />

                                                    {!viewMode && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSni(index)}
                                                                className="text-red-400 hover:text-red-300"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>

                                                            {index === snis.length - 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddSni}
                                                                    className="text-primary hover:text-primary/80"
                                                                >
                                                                    <Plus size={16} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* General Info Section */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                General Information
                            </h3>
                            <p className="text-xs text-gray-400">
                                General information will help identify and manage this certificate.
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block mb-1 text-sm text-gray-400">
                                Tags
                            </label>
                            <KongTagInput
                                value={tags}
                                onChange={setTags}
                                disabled={viewMode}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
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
