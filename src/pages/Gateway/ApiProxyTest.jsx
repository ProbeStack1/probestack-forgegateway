import { useEffect, useState } from "react";

// ====================== API PROXY TEST COMPONENT (Apigee only) ======================
export const ApiProxyTest = ({ showMessage }) => {
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [environments, setEnvironments] = useState([]);
    const [selectedEnv, setSelectedEnv] = useState('');
    const [proxies, setProxies] = useState([]);
    const [selectedProxy, setSelectedProxy] = useState(null);
    const [revisions, setRevisions] = useState([]);
    const [selectedRevision, setSelectedRevision] = useState('');
    const [basePath, setBasePath] = useState('/');
    
    // Request builder state
    const [method, setMethod] = useState('GET');
    const [path, setPath] = useState('');
    const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }]);
    const [body, setBody] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [loadingEnvs, setLoadingEnvs] = useState(false);
    const [loadingProxies, setLoadingProxies] = useState(false);

    // Fetch token (reuse existing logic)
    const fetchToken = async () => {
        try {
            const res = await fetch('https://forgesphere.probestack.io/apigee-wrapper/auth/apigee/token');
            if (!res.ok) throw new Error(`Token service error: ${res.status}`);
            const data = await res.json();
            return data.access_token;
        } catch (err) {
            console.error('Token fetch error:', err);
            showMessage('Failed to obtain access token', 'error');
            return null;
        }
    };

    // Fetch organizations
    const fetchOrganizations = async () => {
        setLoadingOrgs(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const url = 'https://forgesphere.probestack.io/apigee-wrapper/organizations';
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            let orgs = data.organizations?.map(o => o.organization).filter(Boolean) || [];
            if (orgs.length === 0) orgs = ['gen-ai-poc-onboarding'];
            setOrganizations(orgs);
            if (orgs[0]) setSelectedOrg(orgs[0]);
        } catch (err) {
            console.error(err);
            setOrganizations(['gen-ai-poc-onboarding']);
        } finally {
            setLoadingOrgs(false);
        }
    };

    // Fetch environments for selected org
    const fetchEnvironments = async (org) => {
        if (!org) return;
        setLoadingEnvs(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/environments`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setEnvironments(data);
            if (data[0]) setSelectedEnv(data[0]);
        } catch (err) {
            console.error(err);
            setEnvironments([]);
        } finally {
            setLoadingEnvs(false);
        }
    };

    // Fetch proxies for selected org
    const fetchProxies = async (org) => {
        if (!org) return;
        setLoadingProxies(true);
        try {
            const token = await fetchToken();
            if (!token) return;
            const url = `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/apis/details`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setProxies(data.proxies || []);
            setSelectedProxy(null);
            setRevisions([]);
            setSelectedRevision('');
        } catch (err) {
            console.error(err);
            setProxies([]);
            showMessage('Failed to fetch proxies', 'error');
        } finally {
            setLoadingProxies(false);
        }
    };

    // Fetch revisions and basePath for selected proxy
    const fetchProxyDetails = async (proxyName, org, env) => {
        if (!proxyName || !org || !env) return;
        try {
            const token = await fetchToken();
            if (!token) return;
            // Fetch revisions from deployments
            const url = `https://apigee.googleapis.com/v1/organizations/${org}/environments/${env}/apis/${proxyName}/deployments`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const revs = data.deployments?.map(d => d.revision) || [];
                setRevisions(revs);
                if (revs[0]) setSelectedRevision(revs[0]);
            } else {
                setRevisions([]);
            }

            // Fetch proxy details to get basePath
            const detailsUrl = `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/apis/${proxyName}/details`;
            const detailsRes = await fetch(detailsUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (detailsRes.ok) {
                const details = await detailsRes.json();
                const latestRev = details.proxy?.latestRevisionId;
                const revDetail = details.revisionDetails?.find(r => r.revision === latestRev);
                const basePaths = revDetail?.data?.basepaths;
                if (basePaths && basePaths.length > 0) {
                    setBasePath(basePaths[0]);
                } else {
                    setBasePath('/');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    // When org changes
    useEffect(() => {
        if (selectedOrg) {
            fetchEnvironments(selectedOrg);
            fetchProxies(selectedOrg);
        }
    }, [selectedOrg]);

    // When proxy or env changes
    useEffect(() => {
        if (selectedProxy && selectedOrg && selectedEnv) {
            fetchProxyDetails(selectedProxy.name, selectedOrg, selectedEnv);
        }
    }, [selectedProxy, selectedEnv, selectedOrg]);

    // Initial load
    useEffect(() => {
        fetchOrganizations();
    }, []);

    const addHeader = () => {
        setHeaders([...headers, { key: '', value: '' }]);
    };

    const updateHeader = (index, field, value) => {
        const newHeaders = [...headers];
        newHeaders[index][field] = value;
        setHeaders(newHeaders);
    };

    const removeHeader = (index) => {
        setHeaders(headers.filter((_, i) => i !== index));
    };

    const sendRequest = async () => {
        if (!selectedProxy || !selectedEnv || !selectedRevision) {
            showMessage('Please select proxy, environment, and revision', 'error');
            return;
        }

        setLoading(true);
        setResponse(null);

        try {
            // Build target URL using Apigee runtime host pattern
            const runtimeHost = `https://${selectedOrg}-${selectedEnv}.apigee.net`;
            const fullPath = `${basePath}${path.startsWith('/') ? path : '/' + path}`;
            const url = `${runtimeHost}${fullPath}`;

            const requestHeaders = {};
            headers.forEach(h => {
                if (h.key && h.value) requestHeaders[h.key] = h.value;
            });

            const fetchOptions = {
                method,
                headers: requestHeaders,
            };
            if (method !== 'GET' && method !== 'HEAD' && body) {
                fetchOptions.body = body;
            }

            const startTime = Date.now();
            const res = await fetch(url, fetchOptions);
            const endTime = Date.now();

            const responseText = await res.text();
            let responseJson = null;
            let contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    responseJson = JSON.parse(responseText);
                } catch (e) { /* keep as text */ }
            }

            setResponse({
                status: res.status,
                statusText: res.statusText,
                headers: Object.fromEntries(res.headers.entries()),
                body: responseJson || responseText,
                duration: endTime - startTime,
                url,
            });
            showMessage(`Request completed with status ${res.status}`, res.ok ? 'success' : 'error');
        } catch (err) {
            console.error(err);
            setResponse({
                error: err.message,
                status: 0,
                statusText: 'Network Error',
            });
            showMessage(`Request failed: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Apigee Proxy Test</h2>
                <p className="text-sm text-slate-400">Send test requests to your deployed Apigee proxies</p>
            </div>

            {/* Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-[#111520] rounded-xl border border-[#1f2840] p-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Organization</label>
                    <select
                        value={selectedOrg}
                        onChange={(e) => setSelectedOrg(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white"
                        disabled={loadingOrgs}
                    >
                        {organizations.map(org => (
                            <option key={org} value={org}>{org}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Environment</label>
                    <select
                        value={selectedEnv}
                        onChange={(e) => setSelectedEnv(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white"
                        disabled={loadingEnvs}
                    >
                        {environments.map(env => (
                            <option key={env} value={env}>{env}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Proxy</label>
                    <select
                        value={selectedProxy?.name || ''}
                        onChange={(e) => {
                            const proxy = proxies.find(p => p.name === e.target.value);
                            setSelectedProxy(proxy);
                        }}
                        className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white"
                        disabled={loadingProxies}
                    >
                        <option value="">Select proxy</option>
                        {proxies.map(proxy => (
                            <option key={proxy.name} value={proxy.name}>{proxy.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Revision</label>
                    <select
                        value={selectedRevision}
                        onChange={(e) => setSelectedRevision(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white"
                        disabled={revisions.length === 0}
                    >
                        <option value="">Select revision</option>
                        {revisions.map(rev => (
                            <option key={rev} value={rev}>Revision {rev}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Request Builder */}
            <div className="bg-[#111520] rounded-xl border border-[#1f2840] p-4 mb-6">
                <h3 className="text-md font-semibold text-white mb-3">Request</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white"
                    >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                        <option>PATCH</option>
                        <option>HEAD</option>
                        <option>OPTIONS</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Path (e.g., /v1/users)"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        className="flex-1 bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white"
                    />
                </div>

                {/* Headers */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-white">Headers</label>
                        <button onClick={addHeader} className="text-xs text-[#4f8ef7] hover:underline">+ Add header</button>
                    </div>
                    {headers.map((h, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Header name"
                                value={h.key}
                                onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                                className="flex-1 bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white"
                            />
                            <input
                                type="text"
                                placeholder="Value"
                                value={h.value}
                                onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                                className="flex-1 bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-1.5 text-sm text-white"
                            />
                            <button onClick={() => removeHeader(idx)} className="text-red-400 hover:text-red-300">✕</button>
                        </div>
                    ))}
                </div>

                {/* Body */}
                {method !== 'GET' && method !== 'HEAD' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-white mb-2">Request Body</label>
                        <textarea
                            rows={6}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md px-3 py-2 text-sm text-white font-mono"
                            placeholder='{"key": "value"}'
                        />
                    </div>
                )}

                <button
                    onClick={sendRequest}
                    disabled={loading || !selectedProxy}
                    className="px-5 py-2 bg-[#ff5b1f] hover:bg-[#ff6b36] rounded-lg text-white font-medium disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin inline mr-2 h-4 w-4" /> : null}
                    Send Request
                </button>
            </div>

            {/* Response */}
            {response && (
                <div className="bg-[#111520] rounded-xl border border-[#1f2840] p-4">
                    <h3 className="text-md font-semibold text-white mb-3">Response</h3>
                    <div className="mb-3">
                        <span className={`inline-block px-2 py-1 rounded-md text-sm font-mono ${response.status >= 200 && response.status < 300 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {response.status} {response.statusText}
                        </span>
                        {response.duration && <span className="ml-3 text-xs text-slate-400">⏱️ {response.duration} ms</span>}
                    </div>
                    <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-400 mb-1">URL</div>
                        <div className="text-sm text-white break-all bg-[#0f1117] p-2 rounded-md">{response.url}</div>
                    </div>
                    <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-400 mb-1">Headers</div>
                        <pre className="text-xs text-slate-300 bg-[#0f1117] p-2 rounded-md overflow-auto max-h-40">
                            {JSON.stringify(response.headers, null, 2)}
                        </pre>
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 mb-1">Body</div>
                        <pre className="text-xs text-slate-300 bg-[#0f1117] p-2 rounded-md overflow-auto max-h-96">
                            {typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};