import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import CreatePluginsModal from "./CreatePluginsModal";
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

import "./plugins.css";
import ViewPluginModal from "./ViewPluginModal";

export default function Plugins({ selectedKongOnboardingId = "" }) {
  const [plugins, setPlugins] = useState([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const [pluginsError, setPluginsError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setPlugins([]);
      setPluginsError("Save a control plane in Kong settings before loading plugins");
      return;
    }

    setIsLoadingPlugins(true);
    setPluginsError("");
    try {
      const result = await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.PLUGINS(controlPlaneId),
        {
          cache: "no-store",
        }
      );

      const data = Array.isArray(result?.data) ? result.data : [];
      setPlugins(data);
    } catch (err) {
      console.error(err);
      setPlugins([]);
      setPluginsError(err.message || "Failed to load plugins");
    } finally {
      setIsLoadingPlugins(false);
    }
  };

  const getPluginDisplayName = (plugin) =>
    plugin.instance_name || plugin.name || plugin.id || "-";

  const getAppliedTo = (plugin) => {
    if (plugin.service?.id) return "Service";
    if (plugin.route?.id) return "Route";
    if (plugin.consumer?.id) return "Consumer";
    if (plugin.consumer_group?.id) return "Consumer Group";
    return "Global";
  };

  const filteredPlugins = plugins
  .filter((plugin) => matchesKongOnboarding(plugin, selectedKongOnboardingId))
  .filter((plugin) =>
    getPluginDisplayName(plugin).toLowerCase().includes(search.toLowerCase())
  )
  .sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  const handleDelete = async (target) => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setPluginsError("Save a control plane in Kong settings before deleting plugins");
      return;
    }

    
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setPluginsError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
try {
      await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.PLUGIN_BY_ID(controlPlaneId, target.id),
        {
          method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
        }
      );

      fetchPlugins();
    } catch (err) {
      console.error(err);
      setPluginsError(err.message || "Failed to delete plugin");
    }
  };

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Plugins</h1>

        <div className="flex gap-3">
          <div className="relative justify-center">
            <input
              type="text"
              placeholder="Search plugins..."
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
            <Plus size={16} /> New Plugin
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="kong-table-wrap">
        <table className="kong-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Applied To</th>
              <th className="text-left">Enabled</th>
              <th className="text-left">Tags</th>
              <th className="text-left">Source</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoadingPlugins && (
              <KongTableSkeletonRows columns={6} />
            )}
            {!isLoadingPlugins && pluginsError && (
              <tr>
                <td className="kong-table-error" colSpan={6}>
                  {pluginsError}
                </td>
              </tr>
            )}
            {!isLoadingPlugins && !pluginsError && filteredPlugins.length === 0 && (
              <tr>
                <td className="kong-table-empty" colSpan={6}>
                  No plugins found
                </td>
              </tr>
            )}
            {!isLoadingPlugins && !pluginsError && filteredPlugins.map((plugin) => (
              <tr key={plugin.id}>
                <td>{getPluginDisplayName(plugin)}</td>
                <td>{getAppliedTo(plugin)}</td>
                <td>
                  {plugin.enabled ? "Yes" : "No"}
                </td>
                <td><div className="flex flex-wrap gap-1">
                  {plugin.tags?.length ? (
                    plugin.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-slate-700 rounded text-white"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    "-"
                  )}
                </div></td>
                <td><KongSourceBadge resource={plugin} /></td>

                <td className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditData(plugin);
                      setViewMode(true);
                      // setOpenCreate(true);
                    }}
                    className="py-1 rounded text-teal-400"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditData(plugin);
                      // setViewMode(true);
                      setOpenCreate(true);
                    }}
                    className="py-1 rounded text-blue-400"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => setDeleteTarget(plugin)}
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
        <CreatePluginsModal
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchPlugins}
          editData={editData}
          viewMode={viewMode}

        />
      )}
      {viewMode && (
        <ViewPluginModal
          onClose={() => setViewMode(false)}
          pluginData={editData}

        />
      )}
      {deleteTarget && (
        <KongDeleteConfirmModal
          resourceName="plugin"
          itemName={getPluginDisplayName(deleteTarget)}
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





