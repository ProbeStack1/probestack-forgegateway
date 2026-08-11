// src/components/ApigeeAppsManager.jsx
import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  RotateCcw,
  ArrowUp,
  AlertTriangle,
  Key,
  Eye,
  Smartphone,
  User,
  Calendar,
  X,
} from "lucide-react";
import { apigeeApiFetch } from "../../services/apigeeApiService";
import { APIGEE_ENDPOINTS } from "../../config/apigeeConfig";
import CreateAppModal from "../../pages/Apigee/components/App/CreateAppModal";
import AppCredentialsModal from "../../pages/Apigee/components/App/AppCredentialsModal";
import { AppSyncModal } from "../../components/SyncModal";
import { TableSkeletonRows } from "../../components/ui/SkeletonLoader";
import useApigeeDevelopers from "../../pages/Apigee/components/useApigeeDevelopers";
import { GatewayContextSelector } from "./GatewayContextSelector";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import ResourceAuditDetails from './ResourceAuditDetails';
import { getTrackingHeaders } from '../Apigee/components/apigeeTracking';

export default function ApigeeAppsManager({
  orgId: externalOrgId,
  envId: externalEnvId,
  developerEmail: externalDeveloperEmail,
  showAppIdSec = true,
  // Props for controlled selection from parent
  selectedOrg: externalSelectedOrg,
  onOrgChange,
  selectedBU: externalSelectedBU,
  onBUChange,
  selectedEnv: externalSelectedEnv,
  onEnvChange,
}) {
  // ----- State -----
  const [apps, setApps] = useState([]);
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [appEditData, setAppEditData] = useState(null);
  const [isAppModal, setIsAppModal] = useState(false);
  const [appDetailsData, setAppDetailsData] = useState(null);
  const [selectedAppName, setSelectedAppName] = useState("");
  const [isAppCredentialsModalOpen, setIsAppCredentialsModalOpen] = useState(false);
  const [isFetchingAppDetails, setIsFetchingAppDetails] = useState(false);
  const [appDetailsError, setAppDetailsError] = useState("");
  const [auditDetails, setAuditDetails] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [isAppSyncModal, setIsAppSyncModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Products list for AppCredentialsModal
  const [products, setProducts] = useState([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);

  // Developers (for dropdown)
  const { developers, isFetchingDevelopers } = useApigeeDevelopers(externalOrgId);

  // Internal state for selections (controlled from parent if provided)
  const [selectedOrg, setSelectedOrg] = useState(externalSelectedOrg || externalOrgId);
  const [selectedEnv, setSelectedEnv] = useState(externalSelectedEnv || externalEnvId);
  const [selectedBU, setSelectedBU] = useState(externalSelectedBU || "");
  const [developerEmail, setDeveloperEmail] = useState(externalDeveloperEmail);

  // Pagination
  const [appPage, setAppPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(10);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    itemName: null,
    deleteFunction: null,
  });

  // ----- Helper: fetch products (needed for credentials modal) -----
  const fetchProducts = async (org = selectedOrg) => {
    if (!org) return;
    setIsFetchingProducts(true);
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.LIST(org));
      const data = await res.json();
      const list = Array.isArray(data?.apiProduct)
        ? data.apiProduct
        : Array.isArray(data)
          ? data.map((item) => (typeof item === "string" ? { name: item } : item))
          : [];
      setProducts(list);
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
    setIsFetchingProducts(false);
  };

  // ----- Fetch apps from Apigee -----
  const fetchApps = async (org = selectedOrg, developer_email = developerEmail) => {
    if (!selectedOrg || !developer_email) return;
    setIsFetchingApps(true);
    const effectiveOrg =
            selectedOrg == "Forgesphere"
                ? "gen-ai-poc-onboarding"
                : selectedOrg;
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.LIST(effectiveOrg, developer_email));
      const data = await res.json();
      const list = Array.isArray(data?.app)
        ? data.app.map((item) => ({
            name: item?.appId,
            appId: item?.appId,
            status: item?.status || "",
            source: item?.source,
            onboardingId: item?.onboardingId,
          }))
        : [];
      setApps(list);
    } catch (e) {
      console.error("Failed to fetch apps", e);
      setApps([]);
    }
    setIsFetchingApps(false);
  };

  // ----- Delete app -----
  const deleteApp = async (name) => {
    if (!name || !developerEmail) return;
    const app = apps.find((item) => item.name === name);
    if (!app?.onboardingId) {
      alert("This consumer has no onboarding context and cannot be tracked for deletion.");
      return;
    }
    try {
      await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.DELETE(selectedOrg, developerEmail, name), {
        method: "DELETE",
        headers: getTrackingHeaders({ onboardingId: app.onboardingId }),
      });
      setApps((prev) => prev.filter((a) => a.name !== name));
    } catch (e) {
      console.error("Failed to delete app", e);
      alert("Failed to delete app. Please try again.");
    }
  };

  // ----- Confirmation handlers -----
  const showConfirmDialog = (itemName, deleteFunction) => {
    setConfirmDialog({ isOpen: true, itemName, deleteFunction });
  };

  const handleConfirmDelete = async () => {
    if (confirmDialog.deleteFunction) {
      await confirmDialog.deleteFunction(confirmDialog.itemName);
    }
    setConfirmDialog({ isOpen: false, itemName: null, deleteFunction: null });
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, itemName: null, deleteFunction: null });
  };

  // ----- View app credentials -----
  const handleAppView = async (app) => {
    const appName = app?.name || app?.appId;
    if (!appName || !developerEmail) return;

    setSelectedAppName(appName);
    setAppDetailsData(null);
    setAppDetailsError("");
    setIsAppCredentialsModalOpen(true);
    setIsFetchingAppDetails(true);

    try {
      const res = await apigeeApiFetch(
        APIGEE_ENDPOINTS.APPS.GET(selectedOrg, developerEmail, appName)
      );
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch app details: ${res.status} ${errorText}`);
      }
      const data = await res.json();
      setAppDetailsData(data);
    } catch (error) {
      console.error("Failed to fetch app details", error);
      setAppDetailsError(error?.message || "Failed to fetch app details.");
    } finally {
      setIsFetchingAppDetails(false);
    }
  };

  const handleAuditView = async (app) => {
    const appName = app?.name || app?.appId;
    if (!appName || !selectedOrg || !developerEmail) return;
    setAuditLoading(true);
    setAuditDetails({ name: appName, audit: null, resource: null });
    try {
      const effectiveOrg = selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
      const [auditRes, resourceRes] = await Promise.all([
        apigeeApiFetch(`https://forgesphere.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(effectiveOrg)}/config-audit/DEVELOPER_APP/${encodeURIComponent(appName)}?developer=${encodeURIComponent(developerEmail)}`),
        apigeeApiFetch(APIGEE_ENDPOINTS.APPS.GET(effectiveOrg, developerEmail, appName)),
      ]);
      if (!auditRes.ok) throw new Error(`Audit request failed: ${auditRes.status}`);
      if (!resourceRes.ok) throw new Error(`Consumer detail request failed: ${resourceRes.status}`);
      setAuditDetails({ name: appName, audit: await auditRes.json(), resource: await resourceRes.json() });
    } catch (error) {
      setAuditDetails({ name: appName, audit: { history: [], registry: null }, error: error.message });
    } finally { setAuditLoading(false); }
  };

  // ----- Format date helper -----
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const raw = String(timestamp).trim();
    const date = /^-?\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
  };

  // ----- Edit app -----
  const handleAppEdit = (app) => {
    setAppEditData(app);
    setIsAppModal(true);
  };

  // ----- Filtered & sorted apps -----
  const filteredAndSortedApps = useMemo(() => {
    let filtered = apps;
    if (appSearch) {
      filtered = apps.filter((app) =>
        app.name?.toLowerCase().includes(appSearch.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [apps, appSearch]);

  const paginatedApps = useMemo(() => {
    const start = (appPage - 1) * appPageSize;
    return filteredAndSortedApps.slice(start, start + appPageSize);
  }, [filteredAndSortedApps, appPage, appPageSize]);

  // ----- Side effects: sync with external props -----
  useEffect(() => {
    if (externalSelectedOrg) setSelectedOrg(externalSelectedOrg);
  }, [externalSelectedOrg]);

  useEffect(() => {
    if (externalSelectedEnv) setSelectedEnv(externalSelectedEnv);
  }, [externalSelectedEnv]);

  useEffect(() => {
    if (externalDeveloperEmail) setDeveloperEmail(externalDeveloperEmail);
  }, [externalDeveloperEmail]);

  // Fetch apps & products when org or developer changes
  useEffect(() => {
    if (selectedOrg && developerEmail) {
      fetchApps(selectedOrg, developerEmail);
      fetchProducts(selectedOrg);
    }
  }, [selectedOrg, developerEmail]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setAppPage(1);
  }, [appSearch]);

  // Propagate selection changes to parent
  const handleOrgChange = (org) => {
    setSelectedOrg(org);
    if (onOrgChange) onOrgChange(org);
  };

  const handleBUChange = (bu) => {
    setSelectedBU(bu);
    if (onBUChange) onBUChange(bu);
  };

  const handleEnvChange = (env) => {
    setSelectedEnv(env);
    if (onEnvChange) onEnvChange(env);
  };

  // ----- Confirmation Dialog Component -----
  const ConfirmationDialog = () => {
    if (!confirmDialog.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-full">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
          </div>
          <p className="text-gray-300 mb-2">
            Are you sure you want to delete this <span className="font-semibold text-white">App</span>?
          </p>
          <p className="text-sm text-gray-400 mb-6 break-all">
            "<span className="font-mono text-primary">{confirmDialog.itemName}</span>"
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancelDelete}
              className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ----- Render -----
  return (
    <div className="space-y-4 p-6">
      {/* Optional Application Id Search Section */}
      {showAppIdSec && (
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold">View Apps</h2>
          <p className="text-sm text-gray-400">
            Check out your apps based on a gateway type and Application Id.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Application Id</label>
              <input
                placeholder="APID0000072"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-white shadow-lg shadow-primary/30">
                SEARCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Apps Table Section */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">
        {/* Header with Title and Buttons */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Consumer Apps</h3>
            <p className="text-sm text-gray-400">
              Manage developer applications and credentials
            </p>
          </div>
          {/* Search Box */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center border border-dark-700 rounded-lg overflow-hidden"
          >
            <input
              placeholder="Search by name..."
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
            />
            <button type="submit" className="px-3 text-gray-400 hover:text-white">
              <Search size={16} />
            </button>
          </form>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAppEditData(null);
                setIsAppModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
            >
              <Plus size={16} /> Create
            </button>
            <button
              onClick={() => setIsAppSyncModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
            >
              <RefreshCw size={16} /> Sync
            </button>
          </div>
        </div>

        {/* Secondary Filters: GatewayContextSelector + Developer select + Search */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* GatewayContextSelector replaces the old projectId select */}
            <GatewayContextSelector
              selectedOrg={selectedOrg}
              setSelectedOrg={handleOrgChange}
              selectedBU={selectedBU}
              setSelectedBU={handleBUChange}
              selectedEnv={selectedEnv}
              setSelectedEnv={handleEnvChange}
              showEnv={false}
            />

            {/* Developer selector (kept) */}
            <select
              value={developerEmail}
              onChange={(e) => setDeveloperEmail(e.target.value)}
              disabled={isFetchingDevelopers}
              className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {isFetchingDevelopers ? "Loading developers..." : "Select Developer"}
              </option>
              {developers.map((dev) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </select>
          </div>

          
        </div>

        {/* Apps Table */}
        <div className="overflow-hidden rounded-lg border border-dark-700">
          <table className="w-full text-sm">
            <thead className="bg-dark-800/70">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400">Consumer Name</th>
                <th className="px-4 py-3 text-left text-gray-400">Gateway Org</th>
                <th className="px-4 py-3 text-left text-gray-400">Source</th>
                <th className="px-4 py-3 text-left text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFetchingApps ? (
                <TableSkeletonRows columns={4} rows={5} />
              ) : (
                paginatedApps.map((app) => (
                  <tr
                    key={app.appId || app.name}
                    className="border-t border-dark-700 hover:bg-dark-800/40"
                  >
                    <td className="px-4 py-3 text-white">{app.name}</td>
                    <td className="px-4 py-3 text-gray-300">{selectedOrg}</td>
                    <td className="px-4 py-3">
                      {app.source === "PLATFORM" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                          ForgeSphere
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">
                          Api Hub
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                           onClick={() => handleAuditView(app)}
                           className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                           title="View details and history"
                         >
                           <Eye size={14} />
                         </button>
                         <button
                          onClick={() => handleAppView(app)}
                          className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                          title="View credentials"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => handleAppEdit(app)}
                          className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800"
                        >
                          <Pencil size={14} />
                        </button>
                        {/* <button
                          onClick={() => console.log("Revert", app)}
                          className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-400 hover:bg-dark-800"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => console.log("Promote", app)}
                          className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                        >
                          <ArrowUp size={14} />
                        </button> */}
                        <button
                          onClick={() => showConfirmDialog(app.name, deleteApp)}
                          className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!isFetchingApps && filteredAndSortedApps.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-gray-400">
                    {appSearch ? "No matching apps found" : "No data found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={appPage}
          totalItems={filteredAndSortedApps.length}
          pageSize={appPageSize}
          onPageChange={setAppPage}
          onPageSizeChange={setAppPageSize}
        />
      </div>

      {/* Modals */}
      {isAppModal && (
        <CreateAppModal
          onClose={() => {
            setIsAppModal(false);
            fetchApps();
          }}
          editData={appEditData}
          organization={selectedOrg}
          environment={selectedEnv}
          developerEmail={developerEmail}
          isGateway={true}
        />
      )}

      {isAppCredentialsModalOpen && (
        <AppCredentialsModal
          isOpen={isAppCredentialsModalOpen}
          onClose={() => setIsAppCredentialsModalOpen(false)}
          data={appDetailsData}
          isLoading={isFetchingAppDetails}
          error={appDetailsError}
          onRefresh={fetchApps}
          availableProducts={products.map((p) => p.name)}
          orgName={selectedOrg}
          developerId={developerEmail}
          appName={selectedAppName}
        />
      )}

      <Dialog open={!!auditDetails} onOpenChange={(open) => !open && setAuditDetails(null)}>
        <DialogContent className="w-[70vw] max-w-[70vw] bg-gradient-to-br from-[#111520] to-[#0a0e18] border border-[#2a3550] rounded-2xl shadow-2xl shadow-black/50 p-0 overflow-hidden [&>button[aria-label='Close']]:hidden">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2a3550] bg-gradient-to-r from-[#ff5b1f]/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg shadow-[#ff5b1f]/30">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Consumer Details</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Complete consumer app profile</p>
                </div>
              </div>
              <button
                onClick={() => setAuditDetails(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - scrollable if needed */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {auditLoading ? (
                <div className="text-sm text-gray-400">Loading complete consumer details...</div>
              ) : auditDetails?.error ? (
                <p className="text-sm text-red-400">{auditDetails.error}</p>
              ) : auditDetails && (
                <>
                  {/* Profile header */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#ff5b1f]/10 to-transparent border border-[#ff5b1f]/20">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg">
                      <Smartphone className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{auditDetails.resource?.name || auditDetails.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          auditDetails.resource?.status === "approved" || auditDetails.resource?.status === "active"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${auditDetails.resource?.status === "approved" || auditDetails.resource?.status === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                          {auditDetails.resource?.status || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info fields - stacked for compactness */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <Key className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">App ID</p>
                        <p className="text-sm text-white font-mono break-all">{auditDetails.resource?.appId || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <User className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Developer ID</p>
                        <p className="text-sm text-white break-all">{auditDetails.resource?.developerId || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <Calendar className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Created at</p>
                        <p className="text-sm text-white">{formatDate(auditDetails.resource?.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <Calendar className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Last modified at</p>
                        <p className="text-sm text-white">{formatDate(auditDetails.resource?.lastModifiedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <ResourceAuditDetails
                    audit={auditDetails.audit}
                    showHistory={false}
                    showAuditDates={false}
                    showDeleted={false}
                    showSourceStatus={false}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-[#2a3550] bg-black/20">
              <Button
                onClick={() => setAuditDetails(null)}
                className="bg-gradient-to-r from-[#ff5b1f] to-[#ff7a3f] hover:from-[#ff6b36] hover:to-[#ff8a5c] text-white shadow-lg shadow-[#ff5b1f]/20"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isAppSyncModal && (
        <AppSyncModal
          onClose={() => setIsAppSyncModal(false)}
          defaultOrg={selectedOrg}
          defaultDeveloperEmail={developerEmail}
          onSynced={fetchApps}
          onSuccess={(message) => setToast({ message, type: "success" })}
        />
      )}

      <ConfirmationDialog />

      {toast.message && (
        <div className="fixed bottom-4 right-4 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-white">
          {toast.message}
        </div>
      )}
    </div>
  );
}



// // src/components/ApigeeAppsManager.jsx
// import { useState, useEffect, useMemo } from "react";
// import {
//   Search,
//   Plus,
//   RefreshCw,
//   Pencil,
//   Eye,
//   Trash2,
//   RotateCcw,
//   ArrowUp,
//   AlertTriangle,
//   Key,
// } from "lucide-react";
// import { apigeeApiFetch } from "../../services/apigeeApiService";
// import { APIGEE_ENDPOINTS } from "../../config/apigeeConfig";
// import CreateAppModal from "../../pages/Apigee/components/App/CreateAppModal";
// import AppCredentialsModal from "../../pages/Apigee/components/App/AppCredentialsModal";
// import { AppSyncModal } from "../../components/SyncModal";
// import { TableSkeletonRows } from "../../components/ui/SkeletonLoader";
// import useApigeeDevelopers from "../../pages/Apigee/components/useApigeeDevelopers";

// export default function ApigeeAppsManager({
//   orgId: externalOrgId,
//   envId: externalEnvId,
//   developerEmail: externalDeveloperEmail,
//   showAppIdSec = true, // Whether to show the Application Id search section
// }) {
//   // ----- State -----
//   const [apps, setApps] = useState([]);
//   const [isFetchingApps, setIsFetchingApps] = useState(false);
//   const [appSearch, setAppSearch] = useState("");
//   const [appEditData, setAppEditData] = useState(null);
//   const [isAppModal, setIsAppModal] = useState(false);
//   const [appDetailsData, setAppDetailsData] = useState(null);
//   const [selectedAppName, setSelectedAppName] = useState("");
//   const [isAppCredentialsModalOpen, setIsAppCredentialsModalOpen] = useState(false);
//   const [isFetchingAppDetails, setIsFetchingAppDetails] = useState(false);
//   const [appDetailsError, setAppDetailsError] = useState("");
//   const [isAppSyncModal, setIsAppSyncModal] = useState(false);
//   const [toast, setToast] = useState({ message: "", type: "success" });

//   // Products list for AppCredentialsModal (to show available products)
//   const [products, setProducts] = useState([]);
//   const [isFetchingProducts, setIsFetchingProducts] = useState(false);

//   // Developers (for dropdown)
//   const { developers, isFetchingDevelopers } = useApigeeDevelopers(externalOrgId);

//   // Internal copies to allow local overrides (selectors)
//   const [projectId, setProjectId] = useState(externalOrgId);
//   const [developerEmail, setDeveloperEmail] = useState(externalDeveloperEmail);

//   // Confirmation dialog state
//   const [confirmDialog, setConfirmDialog] = useState({
//     isOpen: false,
//     itemName: null,
//     deleteFunction: null,
//   });

//   // ----- Helper: fetch products (needed for credentials modal) -----
//   const fetchProducts = async (org = projectId) => {
//     if (!org) return;
//     setIsFetchingProducts(true);
//     try {
//       const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.LIST(org));
//       const data = await res.json();
//       const list = Array.isArray(data?.apiProduct)
//         ? data.apiProduct
//         : Array.isArray(data)
//           ? data.map((item) => (typeof item === "string" ? { name: item } : item))
//           : [];
//       setProducts(list);
//     } catch (e) {
//       console.error("Failed to fetch products", e);
//     }
//     setIsFetchingProducts(false);
//   };

//   // ----- Fetch apps from Apigee -----
//   const fetchApps = async (org = projectId, developer_email = developerEmail) => {
//     if (!org || !developer_email) return;
//     setIsFetchingApps(true);
//     try {
//       const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.LIST(org, developer_email));
//       const data = await res.json();
//       const list = Array.isArray(data?.app)
//         ? data.app.map((item) => ({
//           name: item?.appId,
//           appId: item?.appId,
//           status: item?.status || "",
//           source: item?.source,
//           onboardingId: item?.onboardingId
//         }))
//         : [];
//       setApps(list);
//     } catch (e) {
//       console.error("Failed to fetch apps", e);
//     }
//     setIsFetchingApps(false);
//   };

//   // ----- Delete app -----
//   const deleteApp = async (name) => {
//     if (!name || !developerEmail) return;
//     try {
//       await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.DELETE(projectId, developerEmail, name), {
//         method: "DELETE",
//       });
//       setApps((prev) => prev.filter((a) => a.name !== name));
//     } catch (e) {
//       console.error("Failed to delete app", e);
//       alert("Failed to delete app. Please try again.");
//     }
//   };

//   // ----- Show confirmation dialog -----
//   const showConfirmDialog = (itemName, deleteFunction) => {
//     setConfirmDialog({
//       isOpen: true,
//       itemName,
//       deleteFunction,
//     });
//   };

//   const handleConfirmDelete = async () => {
//     if (confirmDialog.deleteFunction) {
//       await confirmDialog.deleteFunction(confirmDialog.itemName);
//     }
//     setConfirmDialog({ isOpen: false, itemName: null, deleteFunction: null });
//   };

//   const handleCancelDelete = () => {
//     setConfirmDialog({ isOpen: false, itemName: null, deleteFunction: null });
//   };

//   // ----- View app credentials -----
//   const handleAppView = async (app) => {
//     const appName = app?.name || app?.appId;
//     if (!appName || !developerEmail) return;

//     setSelectedAppName(appName);
//     setAppDetailsData(null);
//     setAppDetailsError("");
//     setIsAppCredentialsModalOpen(true);
//     setIsFetchingAppDetails(true);

//     try {
//       const res = await apigeeApiFetch(
//         APIGEE_ENDPOINTS.APPS.GET(projectId, developerEmail, appName)
//       );
//       if (!res.ok) {
//         const errorText = await res.text();
//         throw new Error(`Failed to fetch app details: ${res.status} ${errorText}`);
//       }
//       const data = await res.json();
//       setAppDetailsData(data);
//     } catch (error) {
//       console.error("Failed to fetch app details", error);
//       setAppDetailsError(error?.message || "Failed to fetch app details.");
//     } finally {
//       setIsFetchingAppDetails(false);
//     }
//   };

//   // ----- Edit app (opens creation modal in edit mode) -----
//   const handleAppEdit = (app) => {
//     setAppEditData(app);
//     setIsAppModal(true);
//   };

//   // ----- Filtered & sorted apps -----
//   const filteredAndSortedApps = useMemo(() => {
//     let filtered = apps;
//     if (appSearch) {
//       filtered = apps.filter((app) =>
//         app.name?.toLowerCase().includes(appSearch.toLowerCase())
//       );
//     }
//     return [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
//   }, [apps, appSearch]);

//   // ----- Side effects -----
//   useEffect(() => {
//     if (externalOrgId) setProjectId(externalOrgId);
//   }, [externalOrgId]);

//   useEffect(() => {
//     if (externalDeveloperEmail) setDeveloperEmail(externalDeveloperEmail);
//   }, [externalDeveloperEmail]);

//   useEffect(() => {
//     if (projectId && developerEmail) {
//       fetchApps(projectId, developerEmail);
//       fetchProducts(projectId);
//     }
//   }, [projectId, developerEmail]);

//   // ----- Confirmation Dialog Component (local) -----
//   const ConfirmationDialog = () => {
//     if (!confirmDialog.isOpen) return null;
//     return (
//       <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
//         <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 max-w-md w-full mx-4 shadow-xl">
//           <div className="flex items-center gap-3 mb-4">
//             <div className="p-2 bg-red-500/10 rounded-full">
//               <AlertTriangle className="text-red-500" size={24} />
//             </div>
//             <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
//           </div>
//           <p className="text-gray-300 mb-2">
//             Are you sure you want to delete this <span className="font-semibold text-white">App</span>?
//           </p>
//           <p className="text-sm text-gray-400 mb-6 break-all">
//             "<span className="font-mono text-primary">{confirmDialog.itemName}</span>"
//           </p>
//           <div className="flex gap-3 justify-end">
//             <button
//               onClick={handleCancelDelete}
//               className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleConfirmDelete}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
//             >
//               Delete
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ----- Render -----
//   return (
//     <div className="space-y-4">
//       {/* Top Filter Card */}
//       {showAppIdSec &&
//         <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">
//           <h2 className="text-lg font-semibold">View Apps</h2>
//           <p className="text-sm text-gray-400">
//             Check out your apps based on a gateway type and Application Id.
//           </p>

//           <div className="grid grid-cols-3 gap-4">
//             <div className="space-y-1">
//               <label className="text-sm text-gray-400">Application Id</label>
//               <input
//                 placeholder="APID0000072"
//                 className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
//               />
//             </div>
//             <div className="flex items-end">
//               <button className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-white shadow-lg shadow-primary/30">
//                 SEARCH
//               </button>
//             </div>
//           </div>
//         </div>}

//       {/* Table Section */}
//       <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">
//         {/* Header + Actions */}
//         <div className="flex justify-between items-center">
//           <div>
//             <h3 className="text-lg font-semibold">Consumer</h3>
//             <p className="text-sm text-gray-400">
//               Use the filters to focus on the resources you want
//             </p>
//           </div>
//           <div className="flex gap-3">
//             <button
//               onClick={() => {
//                 setAppEditData(null);
//                 setIsAppModal(true);
//               }}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
//             >
//               <Plus size={16} /> Create
//             </button>
//             <button
//               onClick={() => setIsAppSyncModal(true)}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
//             >
//               <RefreshCw size={16} /> Sync
//             </button>
//           </div>
//         </div>

//         {/* Secondary Filters */}
//         <div className="flex justify-between items-center">
//           <div className="flex gap-3">
//             <select
//               value={projectId}
//               onChange={(e) => setProjectId(e.target.value)}
//               className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
//             >
//               <option value={externalOrgId}>{externalOrgId}</option>
//               {/* You can add more orgs if needed, but for simplicity we keep the passed one */}
//             </select>
//             <select
//               value={developerEmail}
//               onChange={(e) => setDeveloperEmail(e.target.value)}
//               disabled={isFetchingDevelopers}
//               className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               <option value="">
//                 {isFetchingDevelopers ? "Loading developers..." : "Select Developer"}
//               </option>
//               {developers.map((dev) => (
//                 <option key={dev} value={dev}>
//                   {dev}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Search Box */}
//           <form
//             onSubmit={(e) => e.preventDefault()}
//             className="flex items-center border border-dark-700 rounded-lg overflow-hidden"
//           >
//             <input
//               placeholder="Search by name..."
//               value={appSearch}
//               onChange={(e) => setAppSearch(e.target.value)}
//               className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
//             />
//             <button type="submit" className="px-3 text-gray-400 hover:text-white">
//               <Search size={16} />
//             </button>
//           </form>
//         </div>

//         {/* Apps Table */}
//         <div className="overflow-hidden rounded-lg border border-dark-700">
//           <table className="w-full text-sm">
//             <thead className="bg-dark-800/70">
//               <tr>
//                 <th className="px-4 py-3 text-left text-gray-400">Consumer Name</th>
//                 <th className="px-4 py-3 text-left text-gray-400">Project Id</th>
//                 <th className="px-4 py-3 text-left text-gray-400">Source</th>
//                 <th className="px-4 py-3 text-left text-gray-400">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {isFetchingApps ? (
//                 <TableSkeletonRows columns={3} rows={5} />
//               ) : (
//                 filteredAndSortedApps.map((app) => (
//                   <tr
//                     key={app.appId || app.name}
//                     className="border-t border-dark-700 hover:bg-dark-800/40"
//                   >
//                     <td className="px-4 py-3 text-white">{app.name}</td>
//                     <td className="px-4 py-3 text-gray-300">{projectId}</td>
//                     <td className="px-4 py-3 text-gray-300">{app.source == "PLATFORM" ? (
//                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300">
//                         Platform
//                       </span>
//                     ) : (
//                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-300">
//                         Direct Management API
//                       </span>
//                     )}</td>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() => handleAppView(app)}
//                           className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
//                           title="View credentials"
//                         >
//                           <Key size={14} />
//                         </button>
//                         <button
//                           onClick={() => handleAppEdit(app)}
//                           className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800"
//                         >
//                           <Pencil size={14} />
//                         </button>
//                         <button
//                           onClick={() => console.log("Revert", app)}
//                           className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-400 hover:bg-dark-800"
//                         >
//                           <RotateCcw size={14} />
//                         </button>
//                         <button
//                           onClick={() => console.log("Promote", app)}
//                           className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
//                         >
//                           <ArrowUp size={14} />
//                         </button>
//                         <button
//                           onClick={() => showConfirmDialog(app.name, deleteApp)}
//                           className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800"
//                         >
//                           <Trash2 size={14} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//               {!isFetchingApps && filteredAndSortedApps.length === 0 && (
//                 <tr>
//                   <td colSpan="3" className="text-center py-6 text-gray-400">
//                     {appSearch ? "No matching apps found" : "No data found"}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Modals */}
//       {isAppModal && (
//         <CreateAppModal
//           onClose={() => {
//             setIsAppModal(false);
//             fetchApps();
//           }}
//           editData={appEditData}
//           organization={projectId}
//           environment={externalEnvId}
//           developerEmail={developerEmail}
//         />
//       )}

//       {isAppCredentialsModalOpen && (
//         <AppCredentialsModal
//           isOpen={isAppCredentialsModalOpen}
//           onClose={() => setIsAppCredentialsModalOpen(false)}
//           data={appDetailsData}
//           isLoading={isFetchingAppDetails}
//           error={appDetailsError}
//           onRefresh={fetchApps}
//           availableProducts={products.map((p) => p.name)}
//           orgName={projectId}
//           developerId={developerEmail}
//           appName={selectedAppName}
//         />
//       )}

//       {isAppSyncModal && (
//         <AppSyncModal
//           onClose={() => setIsAppSyncModal(false)}
//           defaultOrg={projectId}
//           defaultDeveloperEmail={developerEmail}
//           onSynced={fetchApps}
//           onSuccess={(message) => setToast({ message, type: "success" })}
//         />
//       )}

//       <ConfirmationDialog />

//       {/* Optional: Toast (if you want to show success messages) */}
//       {toast.message && (
//         <div className="fixed bottom-4 right-4 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-white">
//           {toast.message}
//         </div>
//       )}
//     </div>
//   );
// }
