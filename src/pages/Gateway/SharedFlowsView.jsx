// src/components/Gateway/SharedFlowsView.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import JSZip from "jszip";
import { Eye, Copy, GitBranch, ArchiveIcon, Plus, Search, Loader2, AlertCircle, Trash2Icon, FileCode2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { GatewayContextSelector } from "./GatewayContextSelector";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { getTrackingHeaders } from "../Apigee/components/apigeeTracking";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";

export const SharedFlowsView = ({ showMessage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const sfBasePath = location.pathname.startsWith('/fs-gateway') ? '/fs-gateway' : '/gateway';
    const [searchTerm, setSearchTerm] = useState("");
    const [sharedFlows, setSharedFlows] = useState([]);
    const [loadingSharedFlows, setLoadingSharedFlows] = useState(false);
    const [sharedFlowsError, setSharedFlowsError] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState({ open: false, name: "", description: "" });
    const [creatingSharedFlow, setCreatingSharedFlow] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState("");
    const [selectedBU, setSelectedBU] = useState("");
    const [selectedEnv, setSelectedEnv] = useState("");
    const [sharedFlowPage, setSharedFlowPage] = useState(1);
    const [sharedFlowPageSize, setSharedFlowPageSize] = useState(10);

    const openSharedFlowDetail = (sf) => {
        navigate(`${sfBasePath}/shared-flow/${sf.name}`, { state: { sharedFlow: sf } });
    };

    // "3 days ago" style label alongside the full last-modified timestamp — matches the APIs page
    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return "";
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    };

    useEffect(() => {
        setSharedFlowPage(1);
    }, [searchTerm]);

    const fetchSharedFlows = async () => {
        setLoadingSharedFlows(true);
        setSharedFlowsError(null);
        const effectiveOrg =
            selectedOrg == "Forgesphere"
                ? "gen-ai-poc-onboarding"
                : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            const response = await fetch(
                `https://forgesphere.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/sharedflows/details`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error(`Failed to fetch shared flows: ${response.statusText}`);
            const data = await response.json();
            setSharedFlows(data.sharedFlows || []);
        } catch (err) {
            // setSharedFlowsError(err.message);
            showMessage(`Could not load shared flows: ${err.message}`, "error");
            setSharedFlows([]);
        } finally {
            setLoadingSharedFlows(false);
        }
    };

    useEffect(() => {
        if(selectedOrg){

            fetchSharedFlows();
        }
    }, [selectedOrg]);

    const filteredSharedFlows = useMemo(() => {
        return sharedFlows.filter((sf) => sf.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [sharedFlows, searchTerm]);

    const paginatedSharedFlows = useMemo(() => {
        const start = (sharedFlowPage - 1) * sharedFlowPageSize;
        return filteredSharedFlows.slice(start, start + sharedFlowPageSize);
    }, [filteredSharedFlows, sharedFlowPage, sharedFlowPageSize]);

    const openSharedFlowEditor = async (sfName) => {
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        try {
            const token = await fetchApigeeToken();
            const detailsRes = await fetch(
                `https://forgesphere.probestack.io/apigee-wrapper/organizations/${effectiveOrg}/sharedflows/${sfName}/details`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!detailsRes.ok) throw new Error("Failed to fetch shared flow details");
            const data = await detailsRes.json();
            const latestRev = data?.sharedFlowDetails?.latestRevisionId;
            if (!latestRev) throw new Error("No revision found for this shared flow");

            const bundleRes = await fetch(
                `https://apigee.googleapis.com/v1/organizations/${effectiveOrg}/sharedflows/${sfName}/revisions/${latestRev}/?format=bundle`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!bundleRes.ok) throw new Error("Failed to fetch bundle");
            const zipUrl = URL.createObjectURL(await bundleRes.blob());

            navigate("/proxy-editor", {
                state: { zipUrl, selectedProxyName: sfName, backTo: `${sfBasePath}/shared-flow` },
            });
        } catch (err) {
            showMessage(`Could not open editor: ${err.message}`, "error");
        }
    };

    const generateSharedFlowZip = async (name, description) => {
        const zip = new JSZip();
        const bundleRoot = zip.folder("sharedflowbundle");
        bundleRoot.file(
            `${name}.xml`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SharedFlowBundle revision="1" name="${name}">
  <ConfigurationVersion majorVersion="4" minorVersion="0"/>
  <CreatedAt>${Date.now()}</CreatedAt>
  <Description>${description || ""}</Description>
  <SharedFlows>
    <SharedFlow>default</SharedFlow>
  </SharedFlows>
</SharedFlowBundle>`
        );
        bundleRoot.folder("sharedflows").file(
            "default.xml",
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SharedFlow name="default">
  <Description>${description || ""}</Description>
</SharedFlow>`
        );
        const content = await zip.generateAsync({ type: "blob" });
        return new File([content], `${name}.zip`, { type: "application/zip" });
    };

    const handleCreateSharedFlow = async () => {
        const name = createModalOpen.name.trim();
        if (!name) {
            showMessage("Function name is required.", "error");
            return;
        }
        const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
        if (!effectiveOrg) {
            showMessage("Select an organization before creating a function.", "error");
            return;
        }
        setCreatingSharedFlow(true);
        try {
            const token = await fetchApigeeToken();
            const zipFile = await generateSharedFlowZip(name, createModalOpen.description);
            const formData = new FormData();
            formData.append("file", zipFile);
            const trackingHeaders = getTrackingHeaders({ onboardingId: selectedOrg });
            delete trackingHeaders["Content-Type"];
            const response = await fetch(
                `https://forgesphere.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(effectiveOrg)}/sharedflows?action=import&name=${encodeURIComponent(name)}`,
                {
                    method: "POST",
                    headers: { ...trackingHeaders, Authorization: `Bearer ${token}` },
                    body: formData,
                }
            );
            if (!response.ok) throw new Error(await response.text());
            showMessage(`Function "${name}" created successfully!`, "success");
            setCreateModalOpen({ open: false, name: "", description: "" });
            fetchSharedFlows(); // refresh list
        } catch (err) {
            showMessage(`Could not create function: ${err.message}`, "error");
        } finally {
            setCreatingSharedFlow(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5 space-y-4">
            <h2 className="text-2xl font-bold text-white mb-1">Global Functions</h2>
            <div className="flex justify-between items-center">
                <GatewayContextSelector
                    selectedOrg={selectedOrg}
                    setSelectedOrg={setSelectedOrg}
                    selectedBU={selectedBU}
                    setSelectedBU={setSelectedBU}
                    selectedEnv={selectedEnv}
                    setSelectedEnv={setSelectedEnv}
                    showEnv
                />
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
                        <input
                            type="text"
                            placeholder="Filter functions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-50"
                        />
                    </div>
                    <Button onClick={() => setCreateModalOpen({ open: true, name: "", description: "" })}>
                        <Plus className="mr-1 h-4 w-4" /> Create
                    </Button>
                </div>
            </div>

            {loadingSharedFlows ? (
                <div className="p-6 text-center text-[#7f8fa8]">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading functions...</p>
                </div>
            ) : sharedFlowsError ? (
                <div className="p-6 text-center text-red-400">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p>Error: {sharedFlowsError}</p>
                    <button onClick={fetchSharedFlows} className="mt-2 text-sm text-[#4f8ef7] hover:underline">
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-lg border border-dark-700">
                        <table className="w-full text-sm">
                            <thead className="bg-dark-800/70 border-b border-dark-700">
                                <tr>
                                    <th className="text-left p-3 text-[#5a6a8a]">Name</th>
                                    <th className="text-left p-3 text-[#5a6a8a]">Last Modified</th>
                                    <th className="text-left p-3 text-[#5a6a8a]">Modified By</th>
                                    <th className="text-left p-3 text-[#5a6a8a]">Source</th>
                                    <th className="text-left p-3 text-[#5a6a8a]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSharedFlows.map((sf) => (
                                    <tr
                                        key={sf.id || sf.name}
                                        className="border-b border-dark-700 hover:bg-dark-800/40 cursor-pointer"
                                        onClick={() => openSharedFlowDetail(sf)}
                                    >
                                        <td className="p-3 text-white font-mono text-sm">{sf.name}</td>
                                        <td className="p-3 text-[#7f8fa8]">
                                            {sf.lastModifiedAt ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(sf.lastModifiedAt).toLocaleString()}</span>
                                                    <span className="text-xs text-[#5a6a8a]">{formatRelativeTime(sf.lastModifiedAt)}</span>
                                                </div>
                                            ) : "—"}
                                        </td>
                                        <td className="p-3 text-[#7f8fa8]">
                                            {sf.updatedBy || sf.lastModifiedBy || "—"}
                                        </td>
                                        <td className="p-3">
                                            {sf.source === "LIFECYCLE_TOOL" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                                                    ForgeSphere
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">
                                                    API Hub
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openSharedFlowDetail(sf);
                                                    }}
                                                    className="text-[#4f8ef7] hover:text-[#6ca9ff]"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                 <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openSharedFlowEditor(sf.name);
                                                    }}
                                                    className="text-violet-400 hover:text-violet-300"
                                                    title="Open in Editor"
                                                >
                                                    <FileCode2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showMessage(`Clone ${sf.name} feature coming soon`, "info");
                                                    }}
                                                    className="text-emerald-400 hover:text-emerald-300"
                                                    title="Clone"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showMessage(`Version management for ${sf.name} coming soon`, "info");
                                                    }}
                                                    className="text-amber-400 hover:text-amber-300"
                                                    title="Versioning"
                                                >
                                                    <GitBranch className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showMessage(`Deprecate ${sf.name} feature coming soon`, "info");
                                                    }}
                                                    className="text-orange-400 hover:text-orange-500"
                                                    title="Deprecate"
                                                >
                                                    <ArchiveIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showMessage("Admin role is required to delete a function", "info");
                                                    }}
                                                    className="text-red-400 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2Icon className="h-4 w-4" />
                                                </button>
                                               
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedSharedFlows.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-6 text-center text-[#7f8fa8]">
                                            No functions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        currentPage={sharedFlowPage}
                        totalItems={filteredSharedFlows.length}
                        pageSize={sharedFlowPageSize}
                        onPageChange={setSharedFlowPage}
                        onPageSizeChange={setSharedFlowPageSize}
                    />
                </>
            )}
            </div>
            {/* Create Shared Flow Modal */}
            {/* Create Shared Flow Modal */}
            <Dialog open={createModalOpen.open} onOpenChange={(open) => setCreateModalOpen(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-2xl w-[50vw] max-h-[80vh] p-0 flex flex-col bg-[#111520] border border-[#27314e] text-white">
                    <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-[#27314e]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Create Function</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Create a reusable function that can be used across multiple APIs.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-white">Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g., auth-shared-function"
                                value={createModalOpen.name}
                                onChange={e => setCreateModalOpen(prev => ({ ...prev, name: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f]"
                            />
                            <p className="mt-1 text-xs text-slate-500">Alphanumeric, dash (-) or underscore (_)</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-white">Description (Optional)</label>
                            <textarea
                                rows={3}
                                placeholder="Describe the purpose of this shared function"
                                value={createModalOpen.description}
                                onChange={e => setCreateModalOpen(prev => ({ ...prev, description: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-[#2a3550] bg-[#0f1117] px-3 py-2 text-white focus:outline-none focus:border-[#ff5b1f] resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[#27314e] bg-[#111520]">
                        <Button variant="outline" onClick={() => setCreateModalOpen({ open: false, name: "", description: "" })} disabled={creatingSharedFlow}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateSharedFlow} className="bg-[#ff5b1f] hover:bg-[#ff6b36]" disabled={creatingSharedFlow}>
                            {creatingSharedFlow ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
