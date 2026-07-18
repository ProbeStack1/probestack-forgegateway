import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import CreateServiceModal from "./CreateServiceModal";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongDeleteConfirmModal from "../components/KongDeleteConfirmModal";
import KongTableSkeletonRows from "../components/KongTableSkeletonRows";
import KongSourceBadge from "../components/KongSourceBadge";
import {
  KONG_TRACKING_REQUIRED_MESSAGE,
  getKongResourceOnboardingId,
  matchesKongOnboarding,
} from "../kongTracking";

import "./services.css";
import ViewServiceModal from "./ViewServiceModal";

export default function Services({ selectedKongOnboardingId = "" }) {
  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setServices([]);
      setServicesError("Save a control plane in Kong settings before loading services");
      return;
    }

    setIsLoadingServices(true);
    setServicesError("");
    try {
      const result = await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.SERVICES(controlPlaneId),
        {
          cache: "no-store",
        }
      );

      const data = Array.isArray(result?.data) ? result.data : [];
      setServices(data);
    } catch (err) {
      console.error(err);
      setServices([]);
      setServicesError(err.message || "Failed to load services");
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleDelete = async (target) => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setServicesError("Save a control plane in Kong settings before deleting services");
      return;
    }
    
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setServicesError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
try {
      await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.SERVICE_BY_ID(controlPlaneId, target.id),
        {
          method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
        }
      );
      fetchServices();
    } catch (err) {
      console.error(err);
      setServicesError(err.message || "Failed to delete service");
    }
  };

  // ðŸ” Filter + ðŸ”¤ Sort
  const filtered = services
    .filter((srv) => matchesKongOnboarding(srv, selectedKongOnboardingId))
    .filter((srv) =>
      (
        (srv.name || "") +
        " " +
        (srv.path || "") +
        " " +
        (srv.host || "")
      )
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) =>
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
    );

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Services</h1>

        <div className="flex gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-[16rem]"
              style={{ paddingLeft: "2rem" }}
            />
            <span className="absolute left-2 top-3 text-gray-400">
              <Search size={16} />
            </span>
          </div>

          <button
            onClick={() => {
              setEditData(null);
              setOpenCreate(true);
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
          >
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="kong-table-wrap">
        <table className="kong-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Path</th>
              <th className="text-left">Retries</th>
              <th className="text-left">Enabled</th>
              <th className="text-left">Source</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoadingServices && (
              <KongTableSkeletonRows columns={6} />
            )}

            {!isLoadingServices && servicesError && (
              <tr>
                <td className="kong-table-error" colSpan={6}>
                  {servicesError}
                </td>
              </tr>
            )}

            {!isLoadingServices && !servicesError && filtered.length === 0 && (
              <tr>
                <td className="kong-table-empty" colSpan={6}>
                  No services found
                </td>
              </tr>
            )}

            {!isLoadingServices &&
              !servicesError &&
              filtered.map((srv) => (
                <tr key={srv.id}>
                  <td>{srv.name}</td>
                  <td>{srv.path || srv.host || "-"}</td>
                  <td>{srv.retries}</td>
                  <td>{srv.enabled ? "Yes" : "No"}</td>
                  <td><KongSourceBadge resource={srv} /></td>

                  <td className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setViewData(srv);
                      }}
                      className="py-1 rounded text-teal-400"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={() => {
                        setEditData(srv);
                        setOpenCreate(true);
                      }}
                      className="py-1 rounded text-blue-400"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => setDeleteTarget(srv)}
                      className="py-1 rounded text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {openCreate && (
        <CreateServiceModal
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchServices}
          editData={editData}
          submitError={submitError}
          setSubmitError={setSubmitError}
        />
      )}

      {viewData && (
        <ViewServiceModal
          data={viewData}
          onClose={() => setViewData(null)}
        />
      )}

      {deleteTarget && (
        <KongDeleteConfirmModal
          resourceName="service"
          itemName={deleteTarget.name || deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await handleDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}








