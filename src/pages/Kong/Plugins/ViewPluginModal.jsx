import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function ViewPluginModal({
    onClose,
    pluginData,
}) {
    const [data, setData] = useState({});

    useEffect(() => {
        if (pluginData) {
            setData(pluginData);
        }
    }, [pluginData]);

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        return new Date(timestamp * 1000).toLocaleString();
    };

    const renderValue = (value) => {
        if (value === null || value === undefined || value === "") {
            return (
                <input
                    className="input w-full text-gray-500"
                    value="N/A"
                    disabled
                />
            );
        }

        if (Array.isArray(value)) {
            return (
                <textarea
                    className="input w-full h-24"
                    value={value.join(", ")}
                    disabled
                />
            );
        }

        if (typeof value === "object") {
            return (
                <textarea
                    className="input w-full h-28"
                    value={JSON.stringify(value, null, 2)}
                    disabled
                />
            );
        }

        return (
            <input
                className="input w-full"
                value={value}
                disabled
            />
        );
    };

    return (
        <div className="h-full fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

            <div className="h-full w-[900px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
                    <h2 className="text-lg font-semibold text-white">
                        View Plugin
                    </h2>

                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 grid gap-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>

                    {/* Basic Info */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                Basic Information
                            </h3>
                            <p className="text-xs text-gray-400">
                                General plugin details.
                            </p>
                        </div>

                        <div className="col-span-2 space-y-5">

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Name</label>
                                {renderValue(data.name)}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Plugin ID</label>
                                {renderValue(data.id)}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Enabled</label>
                                {renderValue(data.enabled ? "true" : "false")}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Protocols</label>
                                {renderValue(data.protocols)}
                            </div>

                        </div>
                    </div>

                    {/* Scope Info */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                Scope
                            </h3>
                            <p className="text-xs text-gray-400">
                                Where this plugin is applied.
                            </p>
                        </div>

                        <div className="col-span-2 space-y-5">

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Service ID</label>
                                {renderValue(data.service?.id)}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Route ID</label>
                                {renderValue(data.route?.id)}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Consumer ID</label>
                                {renderValue(data.consumer?.id)}
                            </div>

                        </div>
                    </div>

                    {/* Config Section */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                Configuration
                            </h3>
                            <p className="text-xs text-gray-400">
                                Plugin configuration details.
                            </p>
                        </div>

                        <div className="col-span-2 space-y-5">
                            {data.config &&
                                Object.entries(data.config).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block mb-1 text-sm text-gray-400">
                                            {key}
                                        </label>
                                        {renderValue(value)}
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                Metadata
                            </h3>
                            <p className="text-xs text-gray-400">
                                Audit and tracking details.
                            </p>
                        </div>

                        <div className="col-span-2 space-y-5">

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Created At</label>
                                {renderValue(formatDate(data.created_at))}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm text-gray-400">Updated At</label>
                                {renderValue(formatDate(data.updated_at))}
                            </div>

                            {data.tags && (
                                <div>
                                    <label className="block mb-1 text-sm text-gray-400">Tags</label>
                                    {renderValue(data.tags)}
                                </div>
                            )}

                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate-700 text-gray-300"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}