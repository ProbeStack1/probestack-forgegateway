import { X } from "lucide-react";

export default function ViewServiceModal({ data, onClose }) {
    const formatDate = (timestamp) => {
        if (!timestamp) return "-";
        return new Date(timestamp * 1000).toLocaleString();
    };
    return (
        <div className="h-full fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

            <div className="h-[95%] w-[70%] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700" style={{ height: "4.5rem" }}>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Service Details</h2>
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

                    <div className="p-6 grid grid-cols-2 gap-6 text-sm">

                        <Field label="Name" value={data.name} />
                        <Field label="Path" value={data.protocol + '://' + data.host + data.path} />
                        {/* <Field label="Routes" value={data.routes} /> */}
                        <Field label="Retries" value={data.retries} />

                        <Field label="Connect Timeout" value={data.connect_timeout} />
                        <Field label="Read Timeout" value={data.read_timeout} />
                        <Field label="Write Timeout" value={data.write_timeout} />
                        <Field label="Created At" value={formatDate(data.created_at)} />
                        <Field label="Updated At" value={formatDate(data.updated_at)} />

                        <Field label="Enabled" value={data.enabled ? "Yes" : "No"} />

                        <Field label="TLS Verify" value={data.tls_verify ?? "-"} />
                        <Field label="TLS Verify Depth" value={data.tls_verify_depth ?? "-"} />

                        <Field label="Client Certificate" value={data.client_certificate ?? "-"} />
                        <Field label="CA Certificates" value={data.ca_certificates ?? "-"} />

                        {/* Tags */}
                        <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-1">Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {data.tags?.length ? (
                                    data.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 text-xs bg-slate-700 rounded-md text-white"
                                        >
                                            {tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-500">-</span>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
                    <button onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}

/* Reusable Field */
function Field({ label, value }) {
    return (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-white">{value ?? "-"}</p>
        </div>
    );
}