import { X } from "lucide-react";
import { useEffect, useState } from "react";
import KongTagInput from "../components/KongTagInput";

export default function CreateRedisConfigModal({
    onClose,
    onSave,
    editData,
    viewMode,
}) {
    const [redisType, setRedisType] = useState("HostPort (Enterprise)");
    const [name, setName] = useState("");
    const [tags, setTags] = useState([]);

    const [authProvider, setAuthProvider] = useState("");

    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState("6379");
    const [database, setDatabase] = useState("0");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [proxied, setProxied] = useState(false);

    const [ssl, setSsl] = useState(false);
    const [sslVerify, setSslVerify] = useState(true);
    const [serverName, setServerName] = useState("");

    const [keepaliveBacklog, setKeepaliveBacklog] = useState("0");
    const [keepalivePoolSize, setKeepalivePoolSize] = useState("256");

    const [readTimeout, setReadTimeout] = useState("2000");
    const [sendTimeout, setSendTimeout] = useState("2000");
    const [connectTimeout, setConnectTimeout] = useState("2000");

    useEffect(() => {
        if (editData) {
            setRedisType(editData.redisType || "");
            setName(editData.name || "");
            setTags(Array.isArray(editData.tags) ? editData.tags : []);
            setAuthProvider(editData.authProvider || "");
            setHost(editData.host || "");
            setPort(editData.port || "");
            setDatabase(editData.database || "");
            setUsername(editData.username || "");
            setPassword(editData.password || "");
            setProxied(editData.proxied || false);
            setSsl(editData.ssl || false);
            setSslVerify(editData.sslVerify ?? true);
            setServerName(editData.serverName || "");
            setKeepaliveBacklog(editData.keepaliveBacklog || "0");
            setKeepalivePoolSize(editData.keepalivePoolSize || "256");
            setReadTimeout(editData.readTimeout || "2000");
            setSendTimeout(editData.sendTimeout || "2000");
            setConnectTimeout(editData.connectTimeout || "2000");
        }
    }, [editData]);

    const handleSubmit = () => {
        const payload = {
            id: editData?.id,
            redisType,
            name,
            tags: Array.isArray(tags) ? tags : [],
            authProvider,
            host,
            port,
            database,
            username,
            password,
            proxied,
            ssl,
            sslVerify,
            serverName,
            keepaliveBacklog,
            keepalivePoolSize,
            readTimeout,
            sendTimeout,
            connectTimeout,
        };

        onSave(payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-[1000px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700">
                    <h2 className="text-lg font-semibold text-white">
                        {viewMode ? "View Redis" : editData ? "Edit Redis" : "Create Redis"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto" style={{ maxHeight: "calc(90vh - 9rem)" }}>

                    {/* Redis Type */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Redis Type</h3>
                            <p className="text-xs text-gray-400">
                                Configure how Kong connects to Redis.
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm text-gray-400 block mb-1">
                                Redis Type <span className="text-red-400">*</span>
                            </label>
                            <select
                                className="input w-full"
                                value={redisType}
                                onChange={(e) => setRedisType(e.target.value)}
                                disabled={viewMode}
                            >
                                <option>HostPort (Enterprise)</option>
                                <option>Sentinel</option>
                                <option>Cluster</option>
                            </select>
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">General Information</h3>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">
                                    Name <span className="text-red-400">*</span>
                                </label>
                                <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} disabled={viewMode} />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Tags</label>
                                <KongTagInput
                                    value={tags}
                                    onChange={setTags}
                                    disabled={viewMode}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cloud Auth */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Cloud Authentication</h3>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm text-gray-400 block mb-1">
                                Authentication Provider
                            </label>
                            <select
                                className="input w-full"
                                value={authProvider}
                                onChange={(e) => setAuthProvider(e.target.value)}
                                disabled={viewMode}
                            >
                                <option value="">Select...</option>
                                <option>AWS</option>
                                <option>GCP</option>
                                <option>Azure</option>
                            </select>
                        </div>
                    </div>

                    {/* Connection */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Connection Settings</h3>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Host</label>
                                <input className="input w-full" value={host} onChange={(e) => setHost(e.target.value)} disabled={viewMode} />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Port</label>
                                <input className="input w-full" value={port} onChange={(e) => setPort(e.target.value)} disabled={viewMode} />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Database</label>
                                <input className="input w-full" value={database} onChange={(e) => setDatabase(e.target.value)} disabled={viewMode} />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Username</label>
                                <input className="input w-full" value={username} onChange={(e) => setUsername(e.target.value)} disabled={viewMode} />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Password</label>
                                <input type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} disabled={viewMode} />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-400">
                                <input type="checkbox" checked={proxied} onChange={(e) => setProxied(e.target.checked)} disabled={viewMode} />
                                Connection is proxied
                            </label>
                        </div>
                    </div>

                    {/* TLS */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">TLS Settings</h3>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <label className="flex gap-2 text-sm text-gray-400">
                                <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} disabled={viewMode} />
                                SSL
                            </label>

                            <label className="flex gap-2 text-sm text-gray-400">
                                <input type="checkbox" checked={sslVerify} onChange={(e) => setSslVerify(e.target.checked)} disabled={viewMode} />
                                SSL Verify
                            </label>

                            <div>
                                <label className="text-sm text-gray-400">Server Name</label>
                                <input className="input w-full" value={serverName} onChange={(e) => setServerName(e.target.value)} disabled={viewMode} />
                            </div>
                        </div>
                    </div>

                    {/* Keepalive */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Keepalive Configuration</h3>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Keepative Backlog</label>
                                <input className="input w-full" value={keepaliveBacklog} onChange={(e) => setKeepaliveBacklog(e.target.value)} disabled={viewMode} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Keepative Poolsize</label>
                                <input className="input w-full" value={keepalivePoolSize} onChange={(e) => setKeepalivePoolSize(e.target.value)} disabled={viewMode} />
                            </div>
                        </div>
                    </div>

                    {/* Timeouts */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Read/Write Configuration</h3>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Read Timeout</label>
                                <input className="input w-full" value={readTimeout} onChange={(e) => setReadTimeout(e.target.value)} disabled={viewMode} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Send Timeout</label>
                                <input className="input w-full" value={sendTimeout} onChange={(e) => setSendTimeout(e.target.value)} disabled={viewMode} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Connect Timeout</label>
                                <input className="input w-full" value={connectTimeout} onChange={(e) => setConnectTimeout(e.target.value)} disabled={viewMode} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-700 rounded-lg text-gray-300">
                        Cancel
                    </button>

                    {!viewMode && (
                        <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/30">
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
