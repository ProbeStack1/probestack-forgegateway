import { useEffect, useState } from "react";
import { X } from "lucide-react";
import "./upstream.css";
import SummaryPanel from "./SummaryPanel";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";

export default function CreateUpstreamModal({ onClose, onSuccess, editData, viewMode }) {
    const [form, setForm] = useState({
        name: "",
        hostHeader: "",
        slots: 10000,
        algorithm: "round-robin",
        tags: [],
        activeHC: false,
        passiveHC: false
    });
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTargets, setIsLoadingTargets] = useState(false);
    const [initialTargets, setInitialTargets] = useState([]);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

    const [targets, setTargets] = useState([
        { id: "", host: "10.0.0.1", port: "8080", weight: "100", tags: ["primary"] }
    ]);

    // Target handlers
    const addTarget = () => {
        setTargets([...targets, { id: "", host: "", port: "8080", weight: "100", tags: ["primary"] }]);
    };

    const removeTarget = (i) => {
        if (targets.length === 1) return;
        setTargets(targets.filter((_, idx) => idx !== i));
    };

    const updateTarget = (i, key, value) => {
        const updated = [...targets];
        updated[i][key] = value;
        setTargets(updated);
    };

    const buildHealthChecks = () => ({
        threshold: 0,
        active: form.activeHC
            ? {
                type: "http",
                timeout: 1,
                concurrency: 10,
                http_path: "/health",
                healthy: {
                    interval: 5,
                    successes: 3,
                    http_statuses: [200, 302],
                },
                unhealthy: {
                    interval: 5,
                    http_failures: 3,
                    tcp_failures: 3,
                    timeouts: 3,
                    http_statuses: [429, 500, 502, 503, 504],
                },
            }
            : null,
        passive: form.passiveHC
            ? {
                type: "http",
                healthy: {
                    successes: 5,
                    http_statuses: [200, 201, 202, 204],
                },
                unhealthy: {
                    http_failures: 5,
                    tcp_failures: 5,
                    timeouts: 5,
                    http_statuses: [429, 500, 503],
                },
            }
            : null,
    });

    
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSubmit = async () => {
        if (!form.name.trim()) {
            setSubmitError("Upstream name is required");
            return;
        }

        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setSubmitError("Save a control plane in Kong settings before creating upstreams");
            return;
        }        
        if (!trackingOnboardingId) {
            setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
            return;
        }


        const upstreamPayload = {
            name: form.name.trim(),
            algorithm: form.algorithm || "round-robin",
            hash_on: "none",
            hash_fallback: "none",
            slots: Number(form.slots) || 10000,
            healthchecks: buildHealthChecks(),
            tags: Array.isArray(form.tags) ? form.tags : [],
        };

        setSubmitError("");
        setIsSubmitting(true);

        try {
            const upstreamEndpoint = editData?.id
                ? KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAM_BY_ID(controlPlaneId, editData.id)
                : KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAMS(controlPlaneId);
            const upstreamMethod = editData?.id ? "PUT" : "POST";

            const upstreamResult = await kongFetch(upstreamEndpoint, {
                method: upstreamMethod,
                body: upstreamPayload,
                tracking: { onboardingId: trackingOnboardingId },
            });

            const upstreamId = upstreamResult?.id || editData?.id;
            if (!upstreamId) {
                throw new Error("Upstream API did not return an upstream id");
            }

            const validTargets = targets.filter(
                (target) => target.host?.trim() && target.port?.trim()
            );

            const removedTargets = initialTargets.filter(
                (initialTarget) =>
                    initialTarget.id &&
                    !validTargets.some((target) => target.id === initialTarget.id)
            );

            for (const removedTarget of removedTargets) {
                await kongFetch(
                    KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAM_TARGET_BY_ID(
                        controlPlaneId,
                        upstreamId,
                        removedTarget.id
                    ),
                    {
                        method: "DELETE",
                        tracking: { onboardingId: trackingOnboardingId },
                    }
                );
            }

            for (const target of validTargets) {
                if (!target.host?.trim() || !target.port?.trim()) {
                    continue;
                }

                const targetPayload = {
                    target: `${target.host.trim()}:${target.port.trim()}`,
                    weight: Number(target.weight) || 100,
                    tags: Array.isArray(target.tags) && target.tags.length > 0 ? target.tags : ["primary"],
                };

                const targetEndpoint = target.id
                    ? KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAM_TARGET_BY_ID(
                        controlPlaneId,
                        upstreamId,
                        target.id
                    )
                    : KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAM_TARGETS(controlPlaneId, upstreamId);
                const targetMethod = target.id ? "PUT" : "POST";

                await kongFetch(
                    targetEndpoint,
                    {
                        method: targetMethod,
                        body: targetPayload,
                tracking: { onboardingId: trackingOnboardingId },
                    }
                );
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError(err.message || "Failed to save upstream");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const loadTargets = async () => {
            if (!editData?.id) {
                setInitialTargets([]);
                return;
            }

            const controlPlaneId = getKongControlPlaneId();
            if (!controlPlaneId) {
                return;
            }

setIsLoadingTargets(true);
            try {
                const targetResult = await kongFetch(
                    KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAM_TARGETS(controlPlaneId, editData.id),
                    {
                        cache: "no-store",
                    }
                );

                const fetchedTargets = Array.isArray(targetResult?.data)
                    ? targetResult.data.map((target) => {
                        const [host = "", port = ""] = String(target.target || "").split(":");
                        return {
                            id: target.id || "",
                            host,
                            port,
                            weight: target.weight || 100,
                            tags: Array.isArray(target.tags) ? target.tags : ["primary"],
                        };
                    })
                    : [];

                setInitialTargets(fetchedTargets);
                setTargets(
                    fetchedTargets.length > 0
                        ? fetchedTargets
                        : [{ id: "", host: "", port: "8080", weight: "100", tags: ["primary"] }]
                );
            } catch (err) {
                console.error(err);
                setSubmitError(err.message || "Failed to load upstream targets");
            } finally {
                setIsLoadingTargets(false);
            }
        };

        if (editData) {
            setForm({
                name: editData.name || "",
                hostHeader: editData.host_header || editData.hostHeader || "",
                algorithm: editData.algorithm || "round-robin",
                slots: editData.slots || 10000,
                tags: editData.tags || [],
                activeHC: Boolean(editData.healthchecks?.active),
                passiveHC: Boolean(editData.healthchecks?.passive),
            });
            loadTargets();
        } else {
            setForm({
                name: "",
                hostHeader: "",
                slots: 10000,
                algorithm: "round-robin",
                tags: [],
                activeHC: false,
                passiveHC: false,
            });
            setInitialTargets([]);
            setTargets([{ id: "", host: "10.0.0.1", port: "8080", weight: "100", tags: ["primary"] }]);
        }
    }, [editData]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

            <div className="w-[900px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {viewMode
                                ? "View Upstream"
                                : editData
                                    ? "Edit Upstream"
                                    : "Create Upstream"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            Configure upstream service and targets
                        </p>
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 grid grid-cols-3 gap-6 overflow-y-auto modal-body" style={{ maxHeight: "calc(90vh - 9rem)" }}>

                    {/* LEFT - FORM */}
                    <div className="col-span-2 space-y-6">

                        <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />
                        {/* Basic Config */}
                        <div className="grid grid-cols-2 gap-4">

                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-gray-400">Name *</label>
                                <input
                                    disabled={viewMode}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-gray-400">Host Header</label>
                                <input
                                    disabled={viewMode}
                                    value={form.hostHeader}
                                    onChange={(e) => setForm({ ...form, hostHeader: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-gray-400">Slots</label>
                                <input
                                    disabled={viewMode}
                                    type="number"
                                    value={form.slots}
                                    onChange={(e) => setForm({ ...form, slots: e.target.value })}
                                    className="input"
                                />
                            </div>

                            {/* Algorithm */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-gray-400">Algorithm</label>
                                <select
                                    disabled={viewMode}
                                    value={form.algorithm}
                                    onChange={(e) => setForm({ ...form, algorithm: e.target.value })}
                                    className="input"
                                >
                                    <option value="round-robin">round-robin</option>
                                    <option value="least-connections">least-connections</option>
                                    <option value="consistent-hashing">consistent-hashing</option>
                                    <option value="latency">latency</option>
                                </select>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-col gap-1 col-span-2">
                                <label className="text-sm text-gray-400">Tags</label>
                                <KongTagInput
                                    value={form.tags}
                                    onChange={(tags) => setForm({ ...form, tags })}
                                    disabled={viewMode}
                                />
                            </div>
                        </div>

                        {/* Targets */}
                        <div>
                            <h3 className="text-sm text-gray-300 mb-2">Targets</h3>
                            {isLoadingTargets && (
                                <p className="mb-2 text-xs text-gray-400">Loading existing targets...</p>
                            )}

                            <div className="space-y-2">
                                {targets.map((t, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-2 items-center">
                                        <input
                                            disabled={viewMode}
                                            value={t.host}
                                            onChange={(e) => updateTarget(i, "host", e.target.value)}
                                            placeholder="Host"
                                            className="input"
                                        />
                                        <input
                                            disabled={viewMode}
                                            value={t.port}
                                            onChange={(e) => updateTarget(i, "port", e.target.value)}
                                            placeholder="Port"
                                            className="input"
                                        />
                                        <input
                                            disabled={viewMode}
                                            value={t.weight}
                                            onChange={(e) => updateTarget(i, "weight", e.target.value)}
                                            placeholder="Weight"
                                            className="input"
                                        />
                                        <button disabled={viewMode} onClick={() => removeTarget(i)}>
                                            <X size={16} className="text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                disabled={viewMode}
                                onClick={addTarget}
                                className="mt-2 text-xs text-primary"
                            >
                                + Add Target
                            </button>
                        </div>

                        {/* Health Checks */}
                        <div className="flex flex-col gap-3">

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Active Health Checks</span>
                                <button
                                    disabled={viewMode}
                                    onClick={() => setForm({ ...form, activeHC: !form.activeHC })}
                                    className={`w-10 h-5 flex items-center rounded-full p-1 transition ${form.activeHC ? "bg-primary" : "bg-gray-600"
                                        }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition ${form.activeHC ? "translate-x-5" : ""}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Passive Health Checks</span>
                                <button
                                    disabled={viewMode}
                                    onClick={() => setForm({ ...form, passiveHC: !form.passiveHC })}
                                    className={`w-10 h-5 flex items-center rounded-full p-1 transition ${form.passiveHC ? "bg-primary" : "bg-gray-600"
                                        }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition ${form.passiveHC ? "translate-x-5" : ""}`} />
                                </button>
                            </div>

                        </div>
                    </div>
                    <div className="col-span-1">
                        <SummaryPanel form={form} targets={targets} />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        {viewMode ? "Close" : "Cancel"}
                    </button>

                    {!viewMode && (
                        <>
                            {submitError && (
                                <p className="mr-auto text-sm text-red-400">{submitError}</p>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30 disabled:opacity-60"
                            >
                                {isSubmitting ? "Saving..." : editData ? "Update" : "Create"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
