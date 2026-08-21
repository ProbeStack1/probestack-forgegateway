// src/components/Gateway/SharedFlowDetailView.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, AlertCircle, Archive, Check, History, Layers, Loader2,
  Rocket, Search, Share2, X, Eye, Copy, GitBranch, Trash2
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { getTrackingHeaders } from "../Apigee/components/apigeeTracking";
import ResourceAuditDetails from './ResourceAuditDetails';

export const SharedFlowDetailView = ({ sharedFlow, onBack, showMessage }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [revisionFilter, setRevisionFilter] = useState("");
  const [sharedFlowDetails, setSharedFlowDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [availableEnvironments, setAvailableEnvironments] = useState([]);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployRevision, setDeployRevision] = useState("");
  const [deployEnv, setDeployEnv] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deletingSharedFlow, setDeletingSharedFlow] = useState(false);
  const [expandedPoliciesRev, setExpandedPoliciesRev] = useState(null);
  const [policySearch, setPolicySearch] = useState("");

  // Fetch detailed info (including deployments) from the details endpoint
  const fetchSharedFlowDetails = async () => {
    if (!sharedFlow?.name) return;
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const token = await fetchApigeeToken();
      const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/sharedflows/${sharedFlow.name}/details`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSharedFlowDetails(data);
    } catch (err) {
      setDetailsError(err.message);
      showMessage(`Could not load shared flow details: ${err.message}`, "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchSharedFlowDetails();
  }, [sharedFlow?.name]);

  const fetchEnvironments = async () => {
    try {
      const token = await fetchApigeeToken();
      const url = "https://forgegateway.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/environments";
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setAvailableEnvironments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeploy = async () => {
    if (!deployRevision || !deployEnv) {
      showMessage("Please select revision and environment", "error");
      return;
    }
    setDeploying(true);
    try {
      const token = await fetchApigeeToken();
      const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/environments/${deployEnv}/sharedflows/${sharedFlow.name}/revisions/${deployRevision}/deployments?override=true`;
      const trackingHeaders = getTrackingHeaders({ onboardingId: "gen-ai-poc-onboarding" });
      const response = await fetch(url, {
        method: "POST",
        headers: { ...trackingHeaders, Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        showMessage(`Revision ${deployRevision} deployed to ${deployEnv}`, "success");
        setDeployModalOpen(false);
        fetchSharedFlowDetails(); // refresh details
      } else {
        const err = await response.text();
        throw new Error(err);
      }
    } catch (err) {
      showMessage(`Deployment failed: ${err.message}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const handleDeleteSharedFlow = async () => {
    if (!window.confirm(`Delete function "${sharedFlow.name}"? This cannot be undone.`)) return;
    setDeletingSharedFlow(true);
    try {
      const token = await fetchApigeeToken();
      const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/gen-ai-poc-onboarding/sharedflows/${sharedFlow.name}`;
      const trackingHeaders = getTrackingHeaders({ onboardingId: "gen-ai-poc-onboarding" });
      delete trackingHeaders["Content-Type"];
      const response = await fetch(url, {
        method: "DELETE",
        headers: { ...trackingHeaders, Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await response.text());
      showMessage(`Function "${sharedFlow.name}" deleted.`, "success");
      onBack();
    } catch (err) {
      showMessage(`Delete failed: ${err.message}`, "error");
    } finally {
      setDeletingSharedFlow(false);
    }
  };

  // Helper: safely extract data from fetched details or fallback to list data
  const getMeta = () => sharedFlowDetails?.sharedFlowDetails?.metaData || {};
  const getLatestRevision = () => sharedFlowDetails?.sharedFlowDetails?.latestRevisionId || sharedFlow.latestRevision;
  const getRevisionsList = () => sharedFlowDetails?.revisions || sharedFlow.revisions || [];
  const getRevisionDetails = () => sharedFlowDetails?.revisionDetails || [];
  const getDeployments = () => sharedFlowDetails?.deployments?.deployments || [];
  const getBasePath = () => {
    const latestRevDetail = getRevisionDetails().find((rd) => rd.revision === getLatestRevision());
    return latestRevDetail?.data?.basepaths?.[0] || "/";
  };
  // Apigee's eval/trial default runtime hostname pattern — same convention used on the APIs page.
  const getDeploymentUrl = (dep) => {
    if (!dep?.environment) return null;
    const basePath = getBasePath();
    return `https://gen-ai-poc-onboarding-${dep.environment}.apigee.net${basePath === "/" ? "" : basePath}`;
  };
  const getFunctionUrls = () => {
    return getDeployments()
      .map((dep) => ({ environment: dep.environment, url: getDeploymentUrl(dep) }))
      .filter((entry) => entry.url);
  };
  const getDeployedEnvironments = () => {
    return [...new Set(getDeployments().map((dep) => dep.environment).filter(Boolean))].sort();
  };
  const formatDate = (ts) => {
    const raw = ts ?? sharedFlow.lastModifiedAt;
    if (!raw) return "—";
    const value = String(raw).trim();
    const date = /^-?\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  const [editorLoading, setEditorLoading] = useState(false);
  const hasNavigated = useRef(false);

  const handleOpenSharedFlowEditor = async () => {
    const org = "gen-ai-poc-onboarding";
    const latestRev = getLatestRevision();
    if (!latestRev) {
      showMessage("No revision available to open in editor.", "error");
      setActiveTab("overview");
      return;
    }
    setEditorLoading(true);
    try {
      const token = await fetchApigeeToken();
      const bundleRes = await fetch(
        `https://apigee.googleapis.com/v1/organizations/${org}/sharedflows/${sharedFlow.name}/revisions/${latestRev}/?format=bundle`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!bundleRes.ok) throw new Error("Failed to fetch bundle");
      const zipUrl = URL.createObjectURL(await bundleRes.blob());
      navigate("/proxy-editor", {
        state: { zipUrl, selectedProxyName: sharedFlow.name, returnTo: "/gateway/shared-flow" },
      });
    } catch (err) {
      showMessage(`Could not open editor: ${err.message}`, "error");
      setActiveTab("overview");
    } finally {
      setEditorLoading(false);
    }
  };

  // Auto-navigate to editor as soon as the Edit tab is selected (no intermediate screen)
  useEffect(() => {
    if (activeTab === "edit" && !hasNavigated.current && sharedFlow?.name) {
      hasNavigated.current = true;
      handleOpenSharedFlowEditor();
    }
  }, [activeTab, sharedFlow?.name]);

  // Reset the navigation guard when the shared flow changes
  useEffect(() => {
    return () => {
      hasNavigated.current = false;
    };
  }, [sharedFlow?.name]);

  // ========== RENDER OVERVIEW TAB ==========
  if (activeTab === "overview") {
    return (
      <div className="p-6">
        {/* Header with back button and action buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-[#ff5b1f] rounded-md text-sm font-medium">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold">{sharedFlow.name}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { fetchEnvironments(); setDeployModalOpen(true); }}
              className="px-4 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36]"
            >
              Deploy
            </button>
            <button
              onClick={() => showMessage("Duplicate feature coming soon", "info")}
              className="px-4 py-1.5 bg-[#1a1f2e] border border-[#2a3550] text-white rounded-md text-sm hover:bg-[#22273b]"
            >
              Duplicate
            </button>
            <button
              onClick={handleDeleteSharedFlow}
              disabled={deletingSharedFlow}
              className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-sm hover:bg-red-500/20 disabled:opacity-50"
            >
              {deletingSharedFlow ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#1f2840] mb-4">
          <div className="flex gap-4">
            {["Overview", "Edit"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`pb-2 px-1 text-sm font-medium transition ${
                  activeTab === tab.toLowerCase()
                    ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]"
                    : "text-[#7f8fa8] hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-[#ff5b1f]" />
            <p className="mt-3 text-sm text-slate-400">Loading function details...</p>
          </div>
        ) : detailsError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-red-400 font-medium">Error loading details</p>
            <p className="text-sm text-slate-400 mt-1">{detailsError}</p>
            <button onClick={fetchSharedFlowDetails} className="mt-4 px-4 py-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff5b1f] text-sm font-medium hover:bg-[#ff5b1f]/20">
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary + Deployments cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shared Function Summary Card */}
              <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-[#ff8a5c]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Function Summary</h3>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Source</span>
                    <span className="text-sm font-mono text-white bg-[#1a1f2e] px-2 py-0.5 rounded">
                      {(sharedFlowDetails?.source || sharedFlow.source) === "DIRECT_MANAGEMENT_API" ? "API Hub" : "ForgeSphere"}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-1">Environments</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {getDeployedEnvironments().length > 0 ? (
                        getDeployedEnvironments().map((env) => (
                          <span key={env} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            {env}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Not deployed</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-1">Function URL</span>
                    <div className="flex flex-col items-end gap-1.5 max-w-[65%]">
                      {getFunctionUrls().length > 0 ? (
                        getFunctionUrls().map(({ environment, url }) => (
                          <div key={environment} className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] uppercase tracking-wide bg-[#2a3550] text-slate-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              {environment}
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#4f8ef7] hover:text-[#6ca9ff] hover:underline break-all"
                            >
                              {url}
                            </a>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Not deployed</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Created At</span>
                    <span className="text-sm text-slate-300">{formatDate(sharedFlowDetails?.audit?.registry?.createdAt || getMeta().createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Created By</span>
                    <span className="text-sm text-slate-300">{sharedFlowDetails?.audit?.registry?.createdBy || getMeta().createdBy || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Last Modified At</span>
                    <span className="text-sm text-slate-300">{formatDate(sharedFlowDetails?.audit?.registry?.updatedAt || getMeta().lastModifiedAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Last Modified By</span>
                    <span className="text-sm text-slate-300">{sharedFlowDetails?.audit?.registry?.updatedBy || getMeta().lastModifiedBy || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Deployments Card */}
              <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-[#ff8a5c]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Deployments</h3>
                  </div>
                  <Badge variant="outline" className="text-xs border-[#2a3550] text-slate-400">
                    {getDeployments().length} active
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
                      <tr>
                        <th className="text-left p-3 text-[#5a6a8a] font-medium">Environment</th>
                        <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
                        <th className="text-left p-3 text-[#5a6a8a] font-medium">Deployment Type</th>
                        <th className="text-left p-3 text-[#5a6a8a] font-medium">Deployed At</th>
                        <th className="text-left p-3 text-[#5a6a8a] font-medium">Status</th>
                        <th className="text-left p-3 text-[#5a6a8a] font-medium">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDeployments().length > 0 ? (
                        getDeployments().map((dep, idx) => (
                          <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
                            <td className="p-3 font-mono text-white">{dep.environment}</td>
                            <td className="p-3 font-mono text-white">{dep.revision}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-300">
                                <Check className="h-3 w-3" /> {dep.proxyDeploymentType || "EXTENSIBLE"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">{formatDate(dep.deployStartTime)}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
                              </span>
                            </td>
                            <td className="p-3">
                              {getDeploymentUrl(dep) ? (
                                <a
                                  href={getDeploymentUrl(dep)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#4f8ef7] hover:text-[#6ca9ff] hover:underline break-all"
                                >
                                  {getDeploymentUrl(dep)}
                                </a>
                              ) : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400">
                            <Archive className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                            <p>No deployments found</p>
                            <p className="text-xs mt-1">Deploy a revision to see it here</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <ResourceAuditDetails
              audit={sharedFlowDetails?.audit}
              revisions={getRevisionsList()}
              latestRevision={getLatestRevision()}
              showSourceStatus={false}
              showCreatorModifier={false}
              showAuditDates={false}
            />

            {/* Revisions Section – matches ProxyDetailView exactly */}
            <div className="bg-gradient-to-br from-[#111520] to-[#0e121c] rounded-2xl border border-[#2a3550] shadow-xl overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-[#2a3550] bg-[#0f172a]/50 flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#ff8a5c]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Revisions</h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter revisions or policies..."
                    value={revisionFilter}
                    onChange={(e) => setRevisionFilter(e.target.value)}
                    className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-8 pr-3 py-1.5 text-sm w-56 focus:outline-none focus:border-[#ff5b1f] text-white"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1a1f2e] border-b border-[#2a3550]">
                    <tr>
                      <th className="text-left p-3 text-[#5a6a8a] font-medium">Revision</th>
                      <th className="text-left p-3 text-[#5a6a8a] font-medium">Policies</th>
                       <th className="text-left p-3 text-[#5a6a8a] font-medium">Created by / at</th>
                       <th className="text-left p-3 text-[#5a6a8a] font-medium">Modified by / at</th>
                       <th className="text-left p-3 text-[#5a6a8a] font-medium">What changed</th>
                      <th className="text-left p-3 text-[#5a6a8a] font-medium">Base Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...getRevisionDetails()]
                      .filter(revDetail => {
                        const rev = revDetail.revision;
                        const policies = revDetail.data?.policies?.join(', ') || '';
                        return rev.toString().includes(revisionFilter) ||
                          policies.toLowerCase().includes(revisionFilter.toLowerCase());
                      })
                      .sort((a, b) => b.revision - a.revision)
                      .map((revDetail, idx) => {
                        const rev = revDetail.revision;
                        const data = revDetail.data;
                        const isLatest = rev === getLatestRevision();
                        return (
                          <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-white font-medium">{rev}</span>
                                {isLatest && (
                                  <span className="text-[10px] bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full font-medium">Latest</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs items-center">
                                {data?.policies?.length > 0 ? (
                                  <>
                                    {data.policies.slice(0, 3).map((p, i) => (
                                      <span key={i} className="text-xs bg-[#2a3550] text-slate-300 px-1.5 py-0.5 rounded-full">{p}</span>
                                    ))}
                                    {data.policies.length > 3 && (
                                      <button
                                        onClick={() => { setExpandedPoliciesRev(rev); setPolicySearch(""); }}
                                        className="text-xs bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full hover:bg-[#ff5b1f]/40 transition"
                                      >
                                        +{data.policies.length - 3}
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-500 text-xs">—</span>
                                )}
                              </div>
                            </td>
                             <td className="p-3 text-slate-400 text-xs">{data?.metaData?.createdBy || data?.metadata?.createdBy || '—'}<br />{formatDate(data?.metaData?.createdAt || data?.metadata?.createdAt)}</td>
                             <td className="p-3 text-slate-400 text-xs">{data?.metaData?.lastModifiedBy || data?.metadata?.lastModifiedBy || '—'}<br />{formatDate(data?.metaData?.lastModifiedAt || data?.metadata?.lastModifiedAt || data?.lastModifiedAt)}</td>
                             <td className="p-3 text-xs text-slate-400"><details><summary className="cursor-pointer text-[#4f8ef7]">View payload</summary><pre className="mt-2 max-w-sm max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre></details></td>
                            <td className="p-3">
                              <code className="text-xs text-[#4f8ef7] bg-[#0f1117] px-2 py-1 rounded">
                                {data?.basepaths?.[0] || '/'}
                              </code>
                            </td>
                          </tr>
                        );
                      })}
                    {getRevisionDetails().length === 0 && getRevisionsList().length > 0 &&
                      [...getRevisionsList()].sort((a, b) => b - a).map((rev, idx) => {
                        const isLatest = rev === getLatestRevision();
                        return (
                          <tr key={idx} className="border-b border-[#1f2840] hover:bg-[#1a1f2e]/50 transition">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-white font-medium">{rev}</span>
                                {isLatest && (
                                  <span className="text-[10px] bg-[#ff5b1f]/20 text-[#ff8a5c] px-1.5 py-0.5 rounded-full font-medium">Latest</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3"><span className="text-slate-500 text-xs">—</span></td>
                           <td className="p-3 text-slate-400 text-xs">—</td>
                           <td className="p-3 text-slate-400 text-xs">{formatDate(sharedFlow.lastModifiedAt)}</td>
                           <td className="p-3 text-xs text-slate-400">Revision payload unavailable</td>
                            <td className="p-3"><code className="text-xs text-[#4f8ef7] bg-[#0f1117] px-2 py-1 rounded">/</code></td>
                          </tr>
                        );
                      })
                    }
                    {getRevisionsList().length === 0 && (
                      <tr>
                         <td colSpan="7" className="p-8 text-center text-slate-400">
                          <Layers className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                          <p>No revisions available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Policy expansion modal */}
              {expandedPoliciesRev !== null && (() => {
                const revDetail = getRevisionDetails().find(rd => rd.revision === expandedPoliciesRev);
                const allPolicies = revDetail?.data?.policies || [];
                const filteredPolicies = allPolicies.filter(p =>
                  p.toLowerCase().includes(policySearch.toLowerCase())
                );
                return (
                  <div
                    className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    onClick={(e) => { if (e.target === e.currentTarget) { setExpandedPoliciesRev(null); setPolicySearch(''); } }}
                  >
                    <div className="w-full max-w-2xl bg-gradient-to-br from-[#111520] to-[#0a0e18] rounded-2xl border border-[#2a3550] shadow-2xl shadow-black/50 overflow-hidden">
                      <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-[#ff5b1f]/10 via-transparent to-transparent border-b border-[#2a3550]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg shadow-[#ff5b1f]/30">
                              <Layers className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold tracking-tight text-white">
                                Policies · Revision {expandedPoliciesRev}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">{allPolicies.length} policies defined</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setExpandedPoliciesRev(null); setPolicySearch(''); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-4 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Search policies..."
                            value={policySearch}
                            onChange={(e) => setPolicySearch(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2a3550] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="p-6 max-h-80 overflow-y-auto">
                        {filteredPolicies.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {filteredPolicies.map((p, i) => (
                              <div key={i} className="flex items-center gap-2 bg-[#1a1f2e] rounded-lg px-3 py-2 border border-[#2a3550]">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#ff8a5c] flex-shrink-0" />
                                <span className="text-sm text-slate-300 truncate">{p}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-slate-500 text-sm py-8">No policies match your search</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Deployment Modal – same as original */}
        {deployModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-[#111520] border border-[#27314e] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Deploy Function</h3>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">Revision *</label>
                <select
                  value={deployRevision}
                  onChange={e => setDeployRevision(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md p-2 text-white"
                >
                  <option value="">Select Revision</option>
                  {getRevisionsList().map(rev => (
                    <option key={rev} value={rev}>Revision {rev}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Environment *</label>
                <select
                  value={deployEnv}
                  onChange={e => setDeployEnv(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a3550] rounded-md p-2 text-white"
                >
                  <option value="">Select Environment</option>
                  {availableEnvironments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeployModalOpen(false)} className="px-4 py-2 border border-[#2a3550] rounded-md text-sm">Cancel</button>
                <button onClick={handleDeploy} disabled={deploying} className="px-4 py-2 bg-[#ff5b1f] rounded-md text-sm disabled:opacity-50">
                  {deploying ? "Deploying..." : "Deploy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== DEVELOP TAB ==========
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTab("overview")} className="text-[#ff5b1f] rounded-md text-sm font-medium">
          <ArrowLeft />
        </button>
        <h2 className="text-xl font-semibold">{sharedFlow.name}</h2>
      </div>
      <div className="border-b border-[#1f2840] mb-4">
        <div className="flex gap-4">
          {["Overview", "Edit"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`pb-2 px-1 text-sm font-medium transition ${
                activeTab === tab.toLowerCase()
                  ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]"
                  : "text-[#7f8fa8] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff5b1f] mb-3" />
        <p className="text-sm text-slate-400">Opening editor…</p>
      </div>
    </div>
  );
};
