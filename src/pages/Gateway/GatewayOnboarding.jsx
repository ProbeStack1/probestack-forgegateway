import React, { useState, useEffect } from "react";
import { Building, Users, UserCircle, Layers, Plus, Edit, Archive, Mail, Phone, Calendar, Loader2, Network, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import API_BASE_URL from "../../config/apiConfig";
import OnboardingModal from "./OnboardingFormModal";

const mapStatus = (status) => {
    if (status === "PENDING_APPROVAL") return "pending";
    if (status === "DRAFT") return "draft";
    if (status === "APPROVED") return "approved";
    if (status === "REJECTED") return "rejected";
    return status?.toLowerCase() || "unknown";
};

export default function GatewayOnboarding({ showMessage }) {
    const userEmail = localStorage.getItem("UserEmail") || "admin@forgecrux.com";
    const [userOrgSubmissions, setUserOrgSubmissions] = useState([]);
    const [userBusinessUnits, setUserBusinessUnits] = useState([]);
    const [userTeamMembers, setUserTeamMembers] = useState([]);
    const [dashboardBuCount, setDashboardBuCount] = useState(0);
    const [dashboardTeamMemberCount, setDashboardTeamMemberCount] = useState(0);
    const [dashboardConsumerCount, setDashboardConsumerCount] = useState(0);
    const [historyActiveTab, setHistoryActiveTab] = useState("organization");

    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ mode: "create", type: "org", editId: null });

    const [savedConsumers, setSavedConsumers] = useState([]);
    const getConsumers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/consumers`);
            if (res.ok) {
                const data = await res.json();
                setSavedConsumers(data.data || []);
                setDashboardConsumerCount((data.data || []).length);
            }
        } catch (err) { console.error(err); }
    };

    const fetchUserBusinessUnits = async () => {
        if (!userEmail) return;
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/user/${userEmail}/business-units`);
            if (!res.ok) throw new Error("Failed to fetch user business units");
            const result = await res.json();
            const buList = result.data?.businessUnits || [];
            setUserBusinessUnits(buList);
            setDashboardBuCount(buList.length);

            let allMembers = [];
            for (const bu of buList) {
                const membersRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${bu.id}/members`);
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    const membersWithBu = (membersData.data || []).map(m => ({
                        ...m,
                        businessUnitId: bu.id,
                        businessUnitName: bu.teamName,
                        businessUnitAppName: bu.applicationName,
                    }));
                    allMembers.push(...membersWithBu);
                }
            }
            setUserTeamMembers(allMembers);
            setDashboardTeamMemberCount(allMembers.length);
        } catch (err) {
            console.error(err);
            showMessage("Could not load user business units", "error");
        }
    };

    const fetchUserOrgSubmissions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications?user=${userEmail}`);
            if (res.ok) {
                const data = await res.json();
                setUserOrgSubmissions(data);
            } else {
                setUserOrgSubmissions([]);
            }
        } catch (err) {
            console.error(err);
            setUserOrgSubmissions([]);
        }
    };

    useEffect(() => {
        getConsumers();
        fetchUserBusinessUnits();
        fetchUserOrgSubmissions();
    }, [userEmail]);

    const formatDate = (ts) => ts ? new Date(ts).toLocaleString() : "—";
    const statusColors = {
        approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        rejected: "bg-red-500/20 text-red-300 border-red-500/30",
        draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    };

    const isAnyOrgApproved = userOrgSubmissions.some(s => mapStatus(s.status) === "approved");

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-semibold text-white">Gateway Onboarding</h2>
                    <p className="mt-2 text-sm text-[#7f8fa8]">View your organization, business units and team members</p>
                </div>
                <button
                    onClick={() => { setModalConfig({ mode: "create", type: "org", editId: null }); setModalOpen(true); }}
                    className="px-4 py-2 rounded-lg bg-[#ff5b1f] text-white text-sm font-medium flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4">
                    <div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Organization</p><p className="text-2xl font-bold text-white">{userOrgSubmissions.length}</p></div><Building className="h-5 w-5 text-[#ff8a5c]" /></div>
                </div>
                <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4">
                    <div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Business Units</p><p className="text-2xl font-bold text-white">{dashboardBuCount}</p></div><Users className="h-5 w-5 text-sky-400" /></div>
                </div>
                <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4">
                    <div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Team Members</p><p className="text-2xl font-bold text-white">{dashboardTeamMemberCount}</p></div><UserCircle className="h-5 w-5 text-emerald-400" /></div>
                </div>
                <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4">
                    <div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Consumers</p><p className="text-2xl font-bold text-white">{dashboardConsumerCount}</p></div><Layers className="h-5 w-5 text-purple-400" /></div>
                </div>
            </div>

            <div className="border-b border-[#1f2840] mb-6">
                <div className="flex gap-4">
                    <button onClick={() => setHistoryActiveTab("organization")} className={`pb-2 px-1 text-sm font-medium transition ${historyActiveTab === "organization" ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"}`}>Organization</button>
                    <button onClick={() => setHistoryActiveTab("bu")} className={`pb-2 px-1 text-sm font-medium transition ${historyActiveTab === "bu" ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"}`}>Business Unit</button>
                    <button onClick={() => setHistoryActiveTab("team")} className={`pb-2 px-1 text-sm font-medium transition ${historyActiveTab === "team" ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"}`}>Team Members</button>
                </div>
            </div>

            <div className="space-y-6">
                {/* ENHANCED ORGANIZATION CARD */}
                {/* {historyActiveTab === "organization" && (
                    userOrgSubmissions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" /><p>No organization submissions yet.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {userOrgSubmissions.map((sub) => {
                                const status = mapStatus(sub.status);
                                return (
                                    <div key={sub.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all hover:shadow-xl hover:border-[#ff8a5c]/40">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100" />
                                        <div className="p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-lg font-semibold text-white">{sub.company?.name}</h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[status]}`}>{status.toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-slate-500">Onboarding ID:</span>
                                                        <code className="text-xs font-mono text-slate-300 bg-[#1a1f2e] px-2 py-0.5 rounded-md">{sub.id}</code>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center items-center gap-2">
                                                    {(status === "pending" || status === "draft") && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${sub.id}`);
                                                                    if (res.ok) {
                                                                        const result = await res.json();
                                                                        const orgData = result.data || result;
                                                                        const newStatus = orgData.status;
                                                                        if (newStatus === "APPROVED") {
                                                                            showMessage("Organization approved! Refresh the page to see updated status.", "success");
                                                                            // Optionally refresh the list
                                                                            fetchUserOrgSubmissions();
                                                                        } else {
                                                                            showMessage(`Current status: ${newStatus}`, "info");
                                                                        }
                                                                    }
                                                                } catch (err) {
                                                                    showMessage("Failed to check status", "error");
                                                                }
                                                            }}
                                                            className="px-2 py-1 whitespace-nowrap rounded-lg text-xs border border-[#4f8ef7] text-[#4f8ef7] hover:bg-[#4f8ef7]/10"
                                                        >
                                                            Check Status
                                                        </button>
                                                    )}
                                                    <button onClick={() => { setModalConfig({ mode: "edit", type: "org", editId: sub.id }); setModalOpen(true); }}
                                                        className="px-2 py-1 rounded-lg border border-[#ff5b1f]/30 bg-[#ff5b1f]/10 text-[#ff8a5c] text-sm font-medium hover:bg-[#ff5b1f]/20">
                                                        Edit
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-[#1f2840] pt-3">
                                                <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Stakeholder:</span><span className="text-white truncate">{sub.stakeholder?.firstName} {sub.stakeholder?.lastName}</span></div>
                                                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Email:</span><span className="text-white truncate">{sub.stakeholder?.email}</span></div>
                                                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Phone:</span><span className="text-white">{sub.stakeholder?.phone}</span></div>
                                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Submitted:</span><span className="text-white text-xs">{formatDate(sub.createdAt)}</span></div>
                                            </div>

                                            
                                            {sub.gatewayOrganizations && sub.gatewayOrganizations.length > 0 && (
                                                <div className="bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                                        <Network className="h-3 w-3" />
                                                        <span>Gateway Organizations ({sub.gatewayOrganizations.length})</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {sub.gatewayOrganizations.slice(0, 2).map((org, idx) => (
                                                            <div key={idx} className="text-xs border-b border-[#1f2840] pb-2 last:border-0">
                                                                <div className="flex justify-between">
                                                                    <span className="text-white font-medium">{org.name}</span>
                                                                    <span className="text-slate-400">{org.region || "No region"}</span>
                                                                </div>
                                                                <div className="flex justify-between text-slate-400 mt-1">
                                                                    <span>Envs: {org.config?.selectedEnvironments?.join(", ") || "none"}</span>
                                                                    <span>TPS: {org.config?.expectedTps || "—"}</span>
                                                                </div>
                                                                {org.config?.notes && <div className="text-slate-500 mt-1">Notes: {org.config.notes}</div>}
                                                            </div>
                                                        ))}
                                                        {sub.gatewayOrganizations.length > 2 && (
                                                            <div className="text-xs text-slate-400">+{sub.gatewayOrganizations.length - 2} more</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            
                                            {(sub.stakeholder?.sme || sub.stakeholder?.dlEmail) && (
                                                <div className="flex flex-wrap gap-3 text-xs border-t border-[#1f2840] pt-3">
                                                    {sub.stakeholder?.sme && <div className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-500" /><span className="text-slate-400">SME:</span><span className="text-white">{sub.stakeholder.sme}</span></div>}
                                                    {sub.stakeholder?.dlEmail && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-500" /><span className="text-slate-400">DL:</span><span className="text-white">{sub.stakeholder.dlEmail}</span></div>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs">
                                            <span className="text-slate-500">Last updated: {formatDate(sub.updatedAt)}</span>
                                            <span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>{status === "approved" ? "Approved" : status}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )} */}
                {historyActiveTab === "organization" && (
                    userOrgSubmissions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" /><p>No organization submissions yet.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {userOrgSubmissions.map((sub) => {
                                const status = mapStatus(sub.status);
                                const getGatewayEnvs = (org) => {
                                    let envs = [...(org.config?.selectedEnvironments || [])];
                                    if (envs.includes("custom") && org.config?.customEnvironments?.trim()) {
                                        const customList = org.config.customEnvironments.split(',').map(e => e.trim()).filter(e => e);
                                        envs = envs.filter(e => e !== "custom").concat(customList);
                                    }
                                    return envs;
                                };
                                return (
                                    <div key={sub.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all hover:shadow-xl hover:border-[#ff8a5c]/40 flex flex-col">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100" />
                                        <div className="p-5 space-y-4 flex-1">
                                            {/* Header */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-lg font-semibold text-white">{sub.company?.name}</h3>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[status]}`}>{status.toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-slate-500">Onboarding ID:</span>
                                                        <code className="text-xs font-mono text-slate-300 bg-[#1a1f2e] px-2 py-0.5 rounded-md">{sub.id}</code>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center items-center gap-2">
                                                    {(status === "pending" || status === "draft") && (
                                                        <button onClick={async () => {
                                                            try {
                                                                const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${sub.id}`);
                                                                if (res.ok) {
                                                                    const result = await res.json();
                                                                    const orgData = result.data || result;
                                                                    const newStatus = orgData.status;
                                                                    if (newStatus === "APPROVED") {
                                                                        showMessage("Organization approved! Refresh the page to see updated status.", "success");
                                                                        fetchUserOrgSubmissions();
                                                                    } else {
                                                                        showMessage(`Current status: ${newStatus}`, "info");
                                                                    }
                                                                }
                                                            } catch (err) {
                                                                showMessage("Failed to check status", "error");
                                                            }
                                                        }} className="px-2 py-1 whitespace-nowrap rounded-lg text-xs border border-[#4f8ef7] text-[#4f8ef7] hover:bg-[#4f8ef7]/10">Check Status</button>
                                                    )}
                                                    <button onClick={() => { setModalConfig({ mode: "edit", type: "org", editId: sub.id }); setModalOpen(true); }} className="px-2 py-1 rounded-lg border border-[#ff5b1f]/30 bg-[#ff5b1f]/10 text-[#ff8a5c] text-sm font-medium hover:bg-[#ff5b1f]/20">Edit</button>
                                                </div>
                                            </div>

                                            {/* Stakeholder details */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-[#1f2840] pt-3">
                                                <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Stakeholder:</span><span className="text-white truncate">{sub.stakeholder?.firstName} {sub.stakeholder?.lastName}</span></div>
                                                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Email:</span><span className="text-white truncate">{sub.stakeholder?.email}</span></div>
                                                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Phone:</span><span className="text-white">{sub.stakeholder?.phone}</span></div>
                                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Submitted:</span><span className="text-white text-xs">{formatDate(sub.createdAt)}</span></div>
                                            </div>

                                            {/* Gateway Organizations - Scrollable with inline custom scrollbar */}
                                            {sub.gatewayOrganizations && sub.gatewayOrganizations.length > 0 && (
                                                <div className="bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                                        <Network className="h-3 w-3" />
                                                        <span>Gateway Organizations ({sub.gatewayOrganizations.length})</span>
                                                    </div>
                                                    <div
                                                        className="space-y-3 max-h-48 overflow-y-auto pr-1"
                                                        style={{
                                                            scrollbarWidth: 'thin',
                                                            scrollbarColor: '#ff5b1f #1f2840'
                                                        }}
                                                    >
                                                        <style jsx>{`
                                            div::-webkit-scrollbar {
                                                width: 4px;
                                            }
                                            div::-webkit-scrollbar-track {
                                                background: #1f2840;
                                                border-radius: 4px;
                                            }
                                            div::-webkit-scrollbar-thumb {
                                                background: #ff5b1f;
                                                border-radius: 4px;
                                            }
                                            div::-webkit-scrollbar-thumb:hover {
                                                background: #ff8a5c;
                                            }
                                        `}</style>
                                                        {sub.gatewayOrganizations.slice(0, 3).map((org, idx) => {
                                                            const envs = getGatewayEnvs(org);
                                                            return (
                                                                <div key={idx} className="rounded-lg bg-[#0a0e17] p-2 border border-[#1f2840]">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <div className="text-white font-medium text-sm">{org.name}</div>
                                                                            <div className="text-xs text-slate-500">{org.region || "No region"}</div>
                                                                        </div>
                                                                        <div className="text-xs text-slate-400 bg-[#1a1f2e] px-2 py-0.5 rounded-full">
                                                                            TPS: {org.config?.expectedTps || "—"}
                                                                        </div>
                                                                    </div>
                                                                    {envs.length > 0 && (
                                                                        <div className="mt-2">
                                                                            <div className="text-xs text-slate-400 mb-1">Environments</div>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {envs.map(env => {
                                                                                    const hostname = org.config?.environmentHostnames?.[env] || "";
                                                                                    return (
                                                                                        <div key={env} className="flex items-center gap-1 rounded-full bg-[#1e293b] border border-[#334155] px-2 py-0.5">
                                                                                            <span className="text-[10px] font-medium text-cyan-300">{env}</span>
                                                                                            <span className="text-[9px] text-slate-500">→</span>
                                                                                            <span className="text-[10px] text-white truncate max-w-[100px]">{hostname || "—"}</span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {org.config?.notes && (
                                                                        <div className="mt-1 text-[10px] text-slate-500 truncate">Notes: {org.config.notes}</div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {sub.gatewayOrganizations.length > 3 && (
                                                            <div className="text-xs text-slate-400 text-center pt-1">
                                                                +{sub.gatewayOrganizations.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Additional info: SME & DL */}
                                            {(sub.stakeholder?.sme || sub.stakeholder?.dlEmail) && (
                                                <div className="flex flex-wrap gap-3 text-xs border-t border-[#1f2840] pt-3">
                                                    {sub.stakeholder?.sme && <div className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-500" /><span className="text-slate-400">SME:</span><span className="text-white">{sub.stakeholder.sme}</span></div>}
                                                    {sub.stakeholder?.dlEmail && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-500" /><span className="text-slate-400">DL:</span><span className="text-white">{sub.stakeholder.dlEmail}</span></div>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs">
                                            <span className="text-slate-500">Last updated: {formatDate(sub.updatedAt)}</span>
                                            <span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>{status === "approved" ? "Approved" : status}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* BUSINESS UNIT CARD (full details already in previous version) */}
                {historyActiveTab === "bu" && (
                    userBusinessUnits.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                            <p>No business units found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {userBusinessUnits.map((bu) => (
                                <div key={bu.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all hover:shadow-xl hover:border-[#ff8a5c]/40">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100" />
                                    <div className="p-5 space-y-4">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-white">{bu.teamName}</h3>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span>
                                                </div>
                                                <p className="text-sm text-slate-400 mt-1">
                                                    Application: <span className="text-white font-mono">{bu.applicationName}</span>
                                                    {bu.applicationId && <span className="ml-2 text-xs text-slate-500">(ID: {bu.applicationId})</span>}
                                                </p>
                                            </div>
                                            <button onClick={() => { setModalConfig({ mode: "edit", type: "bu", editId: bu.id }); setModalOpen(true); }}
                                                className="p-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff8a5c] hover:bg-[#ff5b1f]/20 transition-colors" title="Edit Business Unit">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Key Metrics Row */}
                                        <div className="flex flex-wrap gap-4 text-sm border-t border-[#1f2840] pt-3">
                                            <div className="flex items-center gap-2">
                                                <UserCircle className="h-4 w-4 text-slate-500" />
                                                <span className="text-slate-300">Owner:</span>
                                                <span className="text-white font-medium">{bu.projectOwner || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-500" />
                                                <span className="text-slate-300">Go‑Live:</span>
                                                <span className="text-white font-mono text-xs">
                                                    {bu.expectedGoLiveDate ? new Date(bu.expectedGoLiveDate).toLocaleDateString() : "—"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-slate-500" />
                                                <span className="text-slate-300">Members:</span>
                                                <span className="text-white font-semibold">{bu.members?.length || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-slate-500" />
                                                <span className="text-slate-300">Consumers:</span>
                                                <span className="text-white font-semibold">{bu.consumers?.length || 0}</span>
                                            </div>
                                        </div>

                                        {/* Detailed Information Grid */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
                                            <div>
                                                <span className="text-slate-500 block">Project SME</span>
                                                <p className="text-white font-mono text-xs">{bu.projectSME || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">SME Email</span>
                                                <p className="text-white truncate text-xs">{bu.projectSMEEmail || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Tester Name</span>
                                                <p className="text-white text-xs">{bu.testerName || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Tester Email</span>
                                                <p className="text-white truncate text-xs">{bu.testerEmail || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">ServiceNow Group</span>
                                                <p className="text-white text-xs">{bu.servicenowGroupName || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">ServiceNow Email</span>
                                                <p className="text-white truncate text-xs">{bu.servicenowEmail || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Project DL Email</span>
                                                <p className="text-white truncate text-xs">{bu.projectDLEmail || "—"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Last Updated</span>
                                                <p className="text-white text-xs">{bu.updatedAt ? new Date(bu.updatedAt).toLocaleString() : (bu.createdAt ? new Date(bu.createdAt).toLocaleString() : "—")}</p>
                                            </div>
                                        </div>

                                        {/* Team Members & Consumers Quick View */}
                                        {(bu.members?.length > 0 || bu.consumers?.length > 0) && (
                                            <div className="flex flex-wrap gap-3 text-xs border-t border-[#1f2840] pt-3">
                                                {bu.members?.slice(0, 2).map(m => (
                                                    <div key={m.id} className="flex items-center gap-1 bg-[#1a1f2e] rounded-full px-2 py-1">
                                                        <UserCircle className="h-3 w-3 text-slate-400" />
                                                        <span className="text-slate-300">{m.name}</span>
                                                        <span className="text-slate-500 text-[10px]">({m.role || "Member"})</span>
                                                    </div>
                                                ))}
                                                {bu.members?.length > 2 && <span className="text-slate-400">+{bu.members.length - 2} more</span>}

                                                {bu.consumers?.slice(0, 2).map(c => (
                                                    <div key={c.id} className="flex items-center gap-1 bg-[#1a1f2e] rounded-full px-2 py-1">
                                                        <Layers className="h-3 w-3 text-amber-400" />
                                                        <span className="text-slate-300">{c.name || c.consumerId}</span>
                                                    </div>
                                                ))}
                                                {bu.consumers?.length > 2 && <span className="text-slate-400">+{bu.consumers.length - 2} more</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs">
                                        <span className="text-slate-500">Created: {bu.createdAt ? new Date(bu.createdAt).toLocaleDateString() : "—"}</span>
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                            Synced
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {historyActiveTab === "team" && (
                    userTeamMembers.length === 0 ? (
                        <div className="text-center py-12 text-slate-400"><Users className="h-12 w-12 mx-auto mb-3 text-slate-600" /><p>No team members found.</p></div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-[#2a3550] bg-[#111520]">
                            <table className="min-w-full divide-y divide-[#1f2840]">
                                <thead className="bg-[#1a1f2e]"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Member</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Business Unit</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Application</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Actions</th></tr></thead>
                                <tbody className="divide-y divide-[#1f2840]">
                                    {userTeamMembers.map((member, idx) => (
                                        <tr key={idx} className="hover:bg-[#1a1f2e]/50">
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff8a5c]/10 flex items-center justify-center text-white font-medium">{member.name?.charAt(0).toUpperCase()}</div><div><div className="text-sm font-medium text-white">{member.name}</div><div className="text-xs text-slate-400">{member.email}</div></div></div></td>
                                            <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300">{member.role || "Member"}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{member.businessUnitName || "—"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{member.businessUnitAppName || "—"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><button onClick={() => { setModalConfig({ mode: "edit", type: "bu", editId: member.businessUnitId }); setModalOpen(true); }} className="text-[#4f8ef7] hover:text-[#ff8a5c] flex items-center gap-1"><Edit className="h-4 w-4" /> Edit BU</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            <OnboardingModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalConfig.mode}
                type={modalConfig.type}
                editId={modalConfig.editId}
                defaultTab={modalConfig.type === "bu" ? "businessUnit" : "organization"}
                userEmail={userEmail}
                showMessage={showMessage}
                onSuccess={() => {
                    fetchUserOrgSubmissions();
                    fetchUserBusinessUnits();
                    getConsumers();
                }}
                savedConsumers={savedConsumers}
                refreshConsumers={getConsumers}
                isOrgApproved={isAnyOrgApproved}
            />
        </div>
    );
}
