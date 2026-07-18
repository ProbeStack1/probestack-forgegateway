import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import CreateRoutesModal from "./CreateRoutesModal";
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

import "./routes.css";

export default function Routes({ selectedKongOnboardingId = "" }) {
  const [routes, setRoutes] = useState([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routesError, setRoutesError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setRoutes([]);
      setRoutesError("Save a control plane in Kong settings before loading routes");
      return;
    }

    setIsLoadingRoutes(true);
    setRoutesError("");
    try {
      const result = await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.ROUTES(controlPlaneId),
        {
          cache: "no-store",
        }
      );

      const data = Array.isArray(result?.data) ? result.data : [];
      setRoutes(data);
    } catch (err) {
      console.error(err);
      setRoutes([]);
      setRoutesError(err.message || "Failed to load routes");
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const filteredRoutes = routes
  .filter((srv) => matchesKongOnboarding(srv, selectedKongOnboardingId))
  .filter((srv) =>
    (srv.name || "").toLowerCase().includes(search.toLowerCase())
  )
  .sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  const handleDelete = async (target) => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setRoutesError("Save a control plane in Kong settings before deleting routes");
      return;
    }

    
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setRoutesError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
setRoutesError("");

    try {
      await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.ROUTE_BY_ID(controlPlaneId, target.id),
        {
          method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
        }
      );

      fetchRoutes();
    } catch (err) {
      console.error(err);
      setRoutesError(err.message || "Failed to delete route");
    }
  };

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Routes</h1>

        <div className="flex gap-3">
          <div className="relative justify-center">
            <input
              type="text"
              placeholder="Search routes..."
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
              setViewMode(false);
              setOpenCreate(true);
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
          >
            <Plus size={16} /> New Route
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="kong-table-wrap">
        <table className="kong-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Methods</th>
              <th className="text-left">Paths</th>
              <th className="text-left">Source</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoadingRoutes && (
              <KongTableSkeletonRows columns={5} />
            )}
            {!isLoadingRoutes && routesError && (
              <tr>
                <td className="kong-table-error" colSpan={5}>
                  {routesError}
                </td>
              </tr>
            )}
            {!isLoadingRoutes && !routesError && filteredRoutes.length === 0 && (
              <tr>
                <td className="kong-table-empty" colSpan={5}>
                  No routes found
                </td>
              </tr>
            )}
            {!isLoadingRoutes && !routesError && filteredRoutes.map((srv) => (
              <tr key={srv.id}>
                <td>{srv.name}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {srv.methods?.length ? (
                      srv.methods.map((method, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-slate-700 rounded text-white"
                        >
                          {method}
                        </span>
                      ))
                    ) : (
                      "-"
                    )}
                  </div>
                </td>
                <td>
                  {Array.isArray(srv.paths) && srv.paths.length > 0
                    ? srv.paths.join(", ")
                    : "-"}
                </td>
                <td><KongSourceBadge resource={srv} /></td>
                <td className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditData(srv);
                      setViewMode(true);
                      setOpenCreate(true);
                    }}
                    className="py-1 rounded text-teal-400"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditData(srv);
                      setViewMode(false);
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
        <CreateRoutesModal
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchRoutes}
          editData={editData}
          viewMode={viewMode}
        />
      )}
      {deleteTarget && (
        <KongDeleteConfirmModal
          resourceName="route"
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





