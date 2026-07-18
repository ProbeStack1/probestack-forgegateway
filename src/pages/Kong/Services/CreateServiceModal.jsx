import { useEffect, useState } from "react";
import "./services.css";
import { X } from "lucide-react";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";

const buildServiceUrl = (service = {}) => {
    const protocol = service.protocol || "http";
    const host = service.host || "";
    const path = service.path || "";

    if (!host) {
        return path || "";
    }

    return `${protocol}://${host}${path || ""}`;
};

const parseServiceUrl = (value) => {
    const rawValue = typeof value === "string" ? value.trim() : "";
    if (!rawValue) {
        return { url: "" };
    }

    try {
        const normalizedUrl = /^https?:\/\//i.test(rawValue) ? rawValue : `http://${rawValue}`;
        const parsedUrl = new URL(normalizedUrl);
        return {
            url: `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname || ""}${parsedUrl.search || ""}`,
        };
    } catch {
        return { url: rawValue };
    }
};

export default function CreateServiceModal({ onClose, onSuccess, editData, submitError = "", setSubmitError }) {
    const [form, setForm] = useState({
        name: "",
        path: "",
        routes: "",
        retries: 5,
        connect_timeout: 60000,
        read_timeout: 60000,
        write_timeout: 60000,
        enabled: true,
        tls_verify: "",
        tls_verify_depth: "",
        client_certificate: "",
        ca_certificates: "",
        tags: []
    });

    const [routes, setRoutes] = useState([]);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

    useEffect(() => {
        // fetchRoutes();
        if (editData) {
            setForm({
                ...editData,
                path: buildServiceUrl(editData),
                routes: Array.isArray(editData.routes) ? editData.routes[0] || "" : (editData.routes || ""),
                tags: Array.isArray(editData.tags) ? editData.tags : [],
            });
        }
    }, []);

    // const fetchRoutes = async () => {
    //     const res = await fetch("/api/routes");
    //     const data = await res.json();
    //     setRoutes(data || []);
    // };


    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

    const handleSubmit = async () => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setSubmitError?.("Save a control plane in Kong settings before creating services");
            return;
        }        
        if (!trackingOnboardingId) {
            setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
            return;
        }


        setSubmitError?.("");

        const method = editData ? "PUT" : "POST";
        const parsedServiceUrl = parseServiceUrl(form.path);
        const payload = {
            name: form.name,
            url: parsedServiceUrl.url,
            tags: Array.isArray(form.tags) ? form.tags : [],
            retries: Number(form.retries),
            connect_timeout: Number(form.connect_timeout),
            read_timeout: Number(form.read_timeout),
            write_timeout: Number(form.write_timeout),
            enabled: Boolean(form.enabled),
        };
        const endpoint = editData?.id
            ? KONG_ENDPOINTS.CONTROL_PLANE.SERVICE_BY_ID(controlPlaneId, editData.id)
            : KONG_ENDPOINTS.CONTROL_PLANE.SERVICES(controlPlaneId);
        try {
            await kongFetch(endpoint, {
                method,
                body: payload,
                tracking: { onboardingId: trackingOnboardingId },
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError?.(err.message || "Failed to save service");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

            <div className="w-[800px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {editData ? "Edit Service" : "Create Service"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {!editData && "Create service in a few simple steps."}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-lg"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ maxHeight: "calc(90vh - 9rem)" }}>
                    {submitError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {submitError}
                        </div>
                    )}

                    <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={false}
                    />
                    <div className="grid grid-cols-2 gap-4">

                        {/* Name */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400">Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="input"
                            />
                        </div>

                        {/* Path */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400">Path</label>
                            <input
                                value={form.path}
                                onChange={(e) => setForm({ ...form, path: e.target.value })}
                                className="input"
                            />
                        </div>

                        {/* Routes */}
                        {/* <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-sm text-gray-400">Routes</label>
                            <select
                                value={form.routes}
                                onChange={(e) => setForm({ ...form, routes: e.target.value })}
                                className="input"
                            >
                                <option value="">Select Route</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div> */}

                        {/* Retries */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400">Retries</label>
                            <input
                                type="number"
                                value={form.retries}
                                onChange={(e) => setForm({ ...form, retries: e.target.value })}
                                className="input"
                            />
                        </div>

                        {/* Connect Timeout */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400">Connect Timeout</label>
                            <input
                                type="number"
                                value={form.connect_timeout}
                                onChange={(e) => setForm({ ...form, connect_timeout: e.target.value })}
                                className="input"
                            />
                        </div>

                        {/* Read Timeout */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400">Read Timeout</label>
                            <input
                                type="number"
                                value={form.read_timeout}
                                onChange={(e) => setForm({ ...form, read_timeout: e.target.value })}
                                className="input"
                            />
                        </div>

                        {/* Write Timeout */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400">Write Timeout</label>
                            <input
                                type="number"
                                value={form.write_timeout}
                                onChange={(e) => setForm({ ...form, write_timeout: e.target.value })}
                                className="input"
                            />
                        </div>

                        {/* Enabled Switch */}
                        <div className="flex items-center gap-2 col-span-2 mt-2">
                            <label className="text-sm text-gray-300">Enabled</label>

                            <button
                                onClick={() => setForm({ ...form, enabled: !form.enabled })}
                                className={`w-10 h-5 flex items-center rounded-full p-1 transition ${form.enabled ? "bg-primary" : "bg-gray-600"
                                    }`}
                            >
                                <div
                                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${form.enabled ? "translate-x-5" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-sm text-gray-400">Tags</label>
                            <KongTagInput
                                value={form.tags}
                                onChange={(tags) => setForm({ ...form, tags })}
                            />
                        </div>

                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
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






