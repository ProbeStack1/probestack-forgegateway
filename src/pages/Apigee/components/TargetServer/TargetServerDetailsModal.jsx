import { Loader2, X } from "lucide-react";

export default function TargetServerDetailsModal({
    isOpen,
    onClose,
    data,
    isLoading,
    error,
}) {
    if (!isOpen) return null;

    const sslInfo = data?.sSLInfo || data?.sslInfo;
    const rows = [
        ["Name", data?.name],
        ["Project Id", data?.projectId],
        ["Environment", data?.env],
        ["Host", data?.host],
        ["Port", data?.port],
        ["Enabled", typeof data?.isEnabled === "boolean" ? (data.isEnabled ? "Yes" : "No") : data?.isEnabled],
        ["Protocol", data?.protocol],
    ].filter(([, value]) => value !== undefined && value !== null && value !== "");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
                <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-white">Target Server Details</h3>
                        <p className="text-xs text-gray-400">Fetched from Apigee</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="max-h-[68vh] overflow-y-auto p-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                            <Loader2 size={18} className="animate-spin" />
                            Loading details...
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="divide-y divide-dark-700 rounded-lg border border-dark-700">
                                {rows.map(([label, value]) => (
                                    <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
                                        <span className="text-sm text-gray-400">{label}</span>
                                        <span className="col-span-2 break-all text-sm font-medium text-white">
                                            {String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {sslInfo && Object.keys(sslInfo).length > 0 && (
                                <details className="rounded-lg border border-dark-700 bg-dark-800/40 p-4">
                                    <summary className="cursor-pointer text-sm font-medium text-gray-200">
                                        SSL Info
                                    </summary>
                                    <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-[#0f172a] p-3 text-xs text-gray-300">
                                        {JSON.stringify(sslInfo, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end border-t border-dark-700 px-5 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
