import { useEffect, useState } from "react";
import "./services.css";
import { X } from "lucide-react";
import {
    DEFAULT_KONG_REGION,
    KONG_ENDPOINTS,
    getKongControlPlaneId,
    getKongRegion,
    getStoredKongSettings,
    saveKongSettings,
    setKongControlPlaneId,
    setKongRegion,
} from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";

export default function SettingsModal({ onClose }) {
    const [settings, setSettings] = useState({
        control_plane_id: "",
        konnect_pat: "",
        region: DEFAULT_KONG_REGION,
    });
    const [controlPlanes, setControlPlanes] = useState([]);
    const [isFetchingControlPlanes, setIsFetchingControlPlanes] = useState(false);
    const [controlPlaneError, setControlPlaneError] = useState("");

    useEffect(() => {
        const storedSettings = getStoredKongSettings();
        const initialSettings = {
            control_plane_id: getKongControlPlaneId() || "",
            konnect_pat: storedSettings.konnect_pat || "",
            region: getKongRegion(),
        };

        setSettings(initialSettings);

        fetchControlPlanes(initialSettings.region);
        // Initial hydration only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchControlPlanes = async (region = settings.region) => {
        const normalizedRegion = setKongRegion(region);
        setSettings((previous) => ({
            ...previous,
            region: normalizedRegion,
        }));
        setIsFetchingControlPlanes(true);
        setControlPlaneError("");

        try {
            const result = await kongFetch(KONG_ENDPOINTS.CONTROL_PLANE.LIST, {
                cache: "no-store",
                region: normalizedRegion,
            });

            const nextControlPlanes = Array.isArray(result?.data) ? result.data : [];
            setControlPlanes(nextControlPlanes);

            setSettings((previous) => {
                const matchingControlPlane = nextControlPlanes.find(
                    (controlPlane) => controlPlane.id === previous.control_plane_id
                );
                const nextControlPlaneId =
                    matchingControlPlane?.id || nextControlPlanes[0]?.id || "";

                if (nextControlPlaneId !== previous.control_plane_id) {
                    const nextSettings = { ...previous, control_plane_id: nextControlPlaneId };
                    saveKongSettings(nextSettings);
                    return nextSettings;
                }

                return previous;
            });
        } catch (error) {
            setControlPlanes([]);
            setControlPlaneError(error.message || "Failed to fetch control planes");
        } finally {
            setIsFetchingControlPlanes(false);
        }
    };

    const handleSave = async () => {
        const normalizedControlPlaneId = setKongControlPlaneId(settings.control_plane_id);
        const normalizedRegion = setKongRegion(settings.region);
        const nextSettings = {
            ...settings,
            control_plane_id: normalizedControlPlaneId,
            region: normalizedRegion,
        };

        setSettings(nextSettings);
        saveKongSettings(nextSettings);
        // await fetch("/api/settings", {
        //     method: "POST",
        //     body: JSON.stringify(nextSettings),
        //     headers: { "Content-Type": "application/json" }
        // });
        onClose();
    };

    return (
        <div className="h-full fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

            <div className="h-[400px] w-[500px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700" style={{ height: "4.5rem" }}>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Configuration</h2>
                        <p className="text-sm text-gray-400">
                            Configure your Konnect connection details.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Region</label>
                        <select
                            value={settings.region}
                            onChange={async (e) => {
                                const nextRegion = e.target.value;
                                setSettings({ ...settings, region: nextRegion });
                                await fetchControlPlanes(nextRegion);
                            }}
                            className="input"
                        >
                            <option value="in">in</option>
                            <option value="us">us</option>
                        </select>
                    </div>

                    {/* Control Plane ID */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Control Plane ID</label>
                        <select
                            value={settings.control_plane_id}
                            onChange={(e) =>
                                setSettings({ ...settings, control_plane_id: e.target.value })
                            }
                            className="input"
                            disabled={isFetchingControlPlanes || controlPlanes.length === 0}
                        >
                            <option value="">
                                {isFetchingControlPlanes
                                    ? "Loading control planes..."
                                    : controlPlanes.length > 0
                                        ? "Select Control Plane"
                                        : "No control planes found"}
                            </option>
                            {controlPlanes.map((controlPlane) => (
                                <option key={controlPlane.id} value={controlPlane.id}>
                                    {controlPlane.name} ({controlPlane.id})
                                </option>
                            ))}
                        </select>
                        {controlPlaneError && (
                            <p className="text-xs text-red-400">{controlPlaneError}</p>
                        )}
                    </div>

                    {/* Konnect PAT */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Konnect PAT</label>
                        <input
                            type="password"
                            value={settings.konnect_pat}
                            onChange={(e) =>
                                setSettings({ ...settings, konnect_pat: e.target.value })
                            }
                            className="input"
                            placeholder="Not required for wrapper API"
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                    >
                        Save
                    </button>
                </div>

            </div>
        </div>
    );
}
