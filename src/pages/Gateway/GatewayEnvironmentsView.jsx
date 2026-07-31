// src/components/Gateway/GatewayEnvironmentsView.jsx
import React, { useState, useEffect } from "react";
import {
    Globe,
    Server,
    Cloud,
    MapPin,
    Activity,
    CheckCircle,
    XCircle,
    AlertCircle,
    Layers,
    Building,
    Users,
    BarChart3,
    ArrowRight,
    Cpu,
    Network,
    Database,
    Shield,
    Clock,
    X,
    Info,
    Zap,
    HardDrive,
    Eye
} from "lucide-react";
import API_BASE_URL from "../../config/apiConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useLocation } from "react-router-dom";

const GatewayEnvironmentsView = ({ showMessage }) => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const userEmail = queryParams.get("userEmail") || localStorage.getItem("UserEmail") || "admin@forgecrux.com";
    //   const userEmail = localStorage.getItem("UserEmail") || "admin@forgecrux.com";
    const [loading, setLoading] = useState(true);
    const [approvedOrganizations, setApprovedOrganizations] = useState([]);
    const [gatewayOrgs, setGatewayOrgs] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [summary, setSummary] = useState({
        totalOrgs: 0,
        totalGatewayOrgs: 0,
        totalEnvironments: 0,
        totalBusinessUnits: 0,
    });
    const [selectedGatewayOrg, setSelectedGatewayOrg] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Fetch approved organizations
    const fetchApprovedOrganizations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications?user=${userEmail}`);
            if (!res.ok) throw new Error("Failed to fetch organizations");
            const data = await res.json();
            const approved = data.filter(sub => sub.status === "APPROVED");
            setApprovedOrganizations(approved);

            const allGatewayOrgs = approved.flatMap(sub =>
                (sub.gatewayOrganizations || []).map(gwOrg => ({
                    ...gwOrg,
                    parentOrgName: sub.company?.name,
                    parentOrgId: sub.id,
                    parentOrgEmail: sub.stakeholder?.email,
                    parentOrgOwner: `${sub.stakeholder?.firstName} ${sub.stakeholder?.lastName}`,
                    parentOrgRegion: sub.company?.region || "—",  // NEW
                    status: sub.status,
                }))
            );
            setGatewayOrgs(allGatewayOrgs);

            const totalEnvs = allGatewayOrgs.reduce((sum, gw) =>
                sum + (gw.config?.selectedEnvironments?.length || 0), 0
            );

            setSummary({
                totalOrgs: approved.length,
                totalGatewayOrgs: allGatewayOrgs.length,
                totalEnvironments: totalEnvs,
                totalBusinessUnits: businessUnits.length,
            });
        } catch (err) {
            console.error(err);
            showMessage("Could not load environment data", "error");
        }
    };

    const fetchBusinessUnits = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/user/${userEmail}/business-units`);
            if (res.ok) {
                const result = await res.json();
                const buList = result.data?.businessUnits || [];
                setBusinessUnits(buList);
                setSummary(prev => ({ ...prev, totalBusinessUnits: buList.length }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchApprovedOrganizations(), fetchBusinessUnits()]);
            setLoading(false);
        };
        loadData();
    }, [userEmail]);

    const openDetailModal = (gwOrg) => {
        setSelectedGatewayOrg(gwOrg);
        setDetailModalOpen(true);
    };

    const closeDetailModal = () => {
        setDetailModalOpen(false);
        setSelectedGatewayOrg(null);
    };

    // Helper: get status badge
    const getEnvStatus = (envName) => {
        // Could be extended to call Apigee API for actual deployment status
        return { label: "Available", color: "emerald", icon: CheckCircle };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff5b1f]"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="mb-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Gateway Overview
                </h2>
                <p className="text-slate-400 mt-1">
                    View and manage your provisioned gateway environments across all approved organizations
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-wide">Organizations</p>
              <p className="text-3xl font-bold text-white mt-1">{summary.totalOrgs}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500/10">
              <Building className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Approved gateway organizations</div>
        </div> */}

                <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] p-5 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400 uppercase tracking-wide">Gateway Orgs</p>
                            <p className="text-3xl font-bold text-white mt-1">{summary.totalGatewayOrgs}</p>
                        </div>
                        <div className="p-3 rounded-full bg-emerald-500/10">
                            <Cloud className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Total Gateway organizations</div>
                </div>

                <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] p-5 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400 uppercase tracking-wide">Environments</p>
                            <p className="text-3xl font-bold text-white mt-1">{summary.totalEnvironments}</p>
                        </div>
                        <div className="p-3 rounded-full bg-purple-500/10">
                            <Layers className="h-6 w-6 text-purple-400" />
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Total provisioned environments</div>
                </div>

                {/* <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-wide">Business Units</p>
              <p className="text-3xl font-bold text-white mt-1">{summary.totalBusinessUnits}</p>
            </div>
            <div className="p-3 rounded-full bg-amber-500/10">
              <Users className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Teams consuming gateway resources</div>
        </div> */}
            </div>

            {/* Main Content: Gateway Organizations Grid */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Globe className="h-5 w-5 text-[#ff8a5c]" />
                        Gateway Environment Details
                    </h3>
                    <span className="text-xs text-slate-400 bg-[#1a1f2e] px-2 py-1 rounded-md">
                        {gatewayOrgs.length} total
                    </span>
                </div>

                {gatewayOrgs.length === 0 ? (
                    <div className="text-center py-16 bg-[#111520] rounded-2xl border border-[#2a3550]">
                        <AlertCircle className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">No gateway organizations found.</p>
                        <p className="text-sm text-slate-500 mt-1">Complete the onboarding process to provision environments.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {gatewayOrgs.map((gw, idx) => {
                            const environments = gw.config?.selectedEnvironments || [];
                            const tps = gw.config?.expectedTps || "—";
                            const notes = gw.config?.notes;
                            return (
                                <div key={idx} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] hover:shadow-xl hover:border-[#ff8a5c]/40 transition-all duration-300">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-xl font-bold text-white">{gw.name}</h4>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        <CheckCircle className="h-3 w-3" /> Approved
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 mt-1">
                                                    Owner: {gw.parentOrgName || "—"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <MapPin className="h-3 w-3" />
                                                <span>{gw.region || "Region not set"}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm border-t border-[#1f2840] pt-3">
                                            <div className="flex items-center gap-2">
                                                <Server className="h-4 w-4 text-sky-400" />
                                                <span className="text-slate-300">Environments:</span>
                                                <span className="text-white font-mono">{environments.length}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-emerald-400" />
                                                <span className="text-slate-300">Expected TPS:</span>
                                                <span className="text-white font-mono">{tps}</span>
                                            </div>
                                        </div>

                                        {environments.length > 0 && (
                                            <div className="bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
                                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                                    <Database className="h-3 w-3" />
                                                    <span>Provisioned Environments</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {environments.map((env, i) => {
                                                        const status = getEnvStatus(env);
                                                        const StatusIcon = status.icon;
                                                        return (
                                                            <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#2a3550] text-sm">
                                                                <StatusIcon className={`h-3.5 w-3.5 text-${status.color}-400`} />
                                                                <span className="text-white">{env}</span>
                                                                <span className={`text-${status.color}-400 text-xs ml-1`}>{status.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {notes && (
                                            <div className="text-xs text-slate-400 bg-[#0f1117]/30 p-2 rounded-md border border-[#1f2840]">
                                                <span className="font-medium text-slate-300">Notes:</span> {notes}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-2 border-t border-[#1f2840]">
                                            <button
                                                onClick={() => openDetailModal(gw)}
                                                className="text-sm text-[#4f8ef7] hover:text-[#ff8a5c] flex items-center gap-1 transition-colors"
                                            >
                                                View Details <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Business Units Section */}
            {/* {businessUnits.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Associated Business Units
            </h3>
            <span className="text-xs text-slate-400 bg-[#1a1f2e] px-2 py-1 rounded-md">
              {businessUnits.length} teams
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessUnits.slice(0, 6).map((bu) => (
              <div key={bu.id} className="bg-[#111520] rounded-xl border border-[#2a3550] p-4 hover:border-[#ff8a5c]/30 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{bu.teamName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{bu.applicationName}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <Shield className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Owner: {bu.projectOwner || "—"}</span>
                </div>
              </div>
            ))}
            {businessUnits.length > 6 && (
              <div className="bg-[#111520] rounded-xl border border-[#2a3550] p-4 flex items-center justify-center text-slate-400 text-sm">
                +{businessUnits.length - 6} more
              </div>
            )}
          </div>
        </div>
      )} */}

            {/* Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] overflow-y-auto bg-[#111520] border border-[#2a3550] text-white">
                    {selectedGatewayOrg && (
                        <>
                            <DialogHeader className="border-b border-[#2a3550] pb-4">
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                        {selectedGatewayOrg.name}
                                    </DialogTitle>
                                    {/* <Button variant="ghost" size="icon" onClick={closeDetailModal} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </Button> */}
                                </div>
                                <DialogDescription className="text-slate-400">
                                    Gateway Organization • {selectedGatewayOrg.parentOrgName || "Parent Organization"}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                {/* Overview Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-[#ff8a5c] uppercase tracking-wide flex items-center gap-2">
                                            <Info className="h-4 w-4" /> General Information
                                        </h4>
                                        <div className="bg-[#0f1117]/50 rounded-xl p-4 space-y-2 border border-[#1f2840]">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Region</span>
                                                <span className="text-white">{selectedGatewayOrg.region || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Expected TPS</span>
                                                <span className="text-white">{selectedGatewayOrg.config?.expectedTps || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">API Range</span>
                                                <span className="text-white">{selectedGatewayOrg.config?.expectedApiRange || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">SLA (ms)</span>
                                                <span className="text-white">{selectedGatewayOrg.config?.slaMs || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Availability (%)</span>
                                                <span className="text-white">{selectedGatewayOrg.config?.availabilityPercent || "—"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                                            <Building className="h-4 w-4" /> Parent Organization
                                        </h4>
                                        <div className="bg-[#0f1117]/50 rounded-xl p-4 space-y-2 border border-[#1f2840]">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Name</span>
                                                <span className="text-white">{selectedGatewayOrg.parentOrgName || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Instance</span>
                                                <span className="text-white">{selectedGatewayOrg.parentOrgRegion || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Owner</span>
                                                <span className="text-white">{selectedGatewayOrg.parentOrgOwner || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Email</span>
                                                <span className="text-white">{selectedGatewayOrg.parentOrgEmail || "—"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Status</span>
                                                <span className="inline-flex items-center gap-1 text-emerald-400">
                                                    <CheckCircle className="h-4 w-4" /> Approved
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Environments Section */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-sky-400 uppercase tracking-wide flex items-center gap-2">
                                        <Database className="h-4 w-4" /> Provisioned Environments
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* {(selectedGatewayOrg.config?.selectedEnvironments || []).map((env, idx) => {
                                            const status = getEnvStatus(env);
                                            const StatusIcon = status.icon;
                                            return (
                                                <div key={idx} className="bg-[#0f1117]/50 rounded-xl p-4 border border-[#1f2840] flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-[#1a1f2e]">
                                                            <Server className="h-5 w-5 text-sky-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white">{env}</p>
                                                            <p className="text-xs text-slate-400">Environment</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-emerald-400 text-sm">
                                                        <StatusIcon className="h-4 w-4" />
                                                        <span>{status.label}</span>
                                                    </div>
                                                </div>
                                            );
                                        })} */}
                                        {(selectedGatewayOrg.config?.selectedEnvironments || []).map((env, idx) => {
                                            const status = getEnvStatus(env);
                                            const StatusIcon = status.icon;
                                            const hostname = selectedGatewayOrg.config?.environmentHostnames?.[env] || "—";
                                            return (
                                                <div key={idx} className="bg-[#0f1117]/50 rounded-xl p-4 border border-[#1f2840]">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-[#1a1f2e]">
                                                                <Server className="h-5 w-5 text-sky-400" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-white">{env}</p>
                                                                <p className="text-xs text-slate-400">Environment</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-emerald-400 text-sm">
                                                            <StatusIcon className="h-4 w-4" />
                                                            <span>{status.label}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-[#1f2840] text-xs">
                                                        <span className="text-slate-400">Hostname:</span>
                                                        <span className="text-white ml-2 font-mono">{hostname}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!selectedGatewayOrg.config?.selectedEnvironments || selectedGatewayOrg.config.selectedEnvironments.length === 0) && (
                                            <div className="col-span-2 text-center py-6 text-slate-400 bg-[#0f1117]/30 rounded-xl">
                                                No environments provisioned
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Config Notes */}
                                {selectedGatewayOrg.config?.notes && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Configuration Notes</h4>
                                        <div className="bg-[#0f1117]/50 rounded-xl p-4 border border-[#1f2840] text-sm text-slate-300">
                                            {selectedGatewayOrg.config.notes}
                                        </div>
                                    </div>
                                )}

                                {/* Deployment Actions (placeholder) */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-[#2a3550]">
                                    <Button variant="outline" onClick={closeDetailModal} className="border-[#2a3550] text-slate-300 hover:bg-white/5">
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GatewayEnvironmentsView;