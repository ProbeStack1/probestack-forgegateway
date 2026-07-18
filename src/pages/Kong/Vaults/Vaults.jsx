import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, Search } from "lucide-react";
import CreateVaultsModal from "./CreateVaultsModal";
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

export default function Vaults({ selectedKongOnboardingId = "" }) {
    const [vaults, setVaults] = useState([]);
    const [isLoadingVaults, setIsLoadingVaults] = useState(false);
    const [vaultsError, setVaultsError] = useState("");
    const [openCreate, setOpenCreate] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [editData, setEditData] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchVaults();
    }, []);

    const fetchVaults = async () => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setVaults([]);
            setVaultsError("Save a control plane in Kong settings before loading vaults");
            return;
        }

        setIsLoadingVaults(true);
        setVaultsError("");
        try {
            const result = await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.VAULTS(controlPlaneId),
                {
                    cache: "no-store",
                }
            );

            const data = Array.isArray(result?.data) ? result.data : [];
            setVaults(data);
        } catch (err) {
            console.error(err);
            setVaults([]);
            setVaultsError(err.message || "Failed to load vaults");
        } finally {
            setIsLoadingVaults(false);
        }
    };

    const handleDelete = async (target) => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setVaultsError("Save a control plane in Kong settings before deleting vaults");
            return;
        }

        
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setVaultsError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
try {
            await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.VAULT_BY_ID(controlPlaneId, target.id),
                {
                    method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
                }
            );

            fetchVaults();
        } catch (err) {
            console.error(err);
            setVaultsError(err.message || "Failed to delete vault");
        }
    };

    const filteredVaults = vaults
        .filter((v) => matchesKongOnboarding(v, selectedKongOnboardingId))
        .filter((v) =>
            [
                v.prefix,
                v.name,
                v.description,
                ...(Array.isArray(v.tags) ? v.tags : []),
            ]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase())
        )
        .sort((a, b) =>
            (a.prefix || "").toLowerCase().localeCompare((b.prefix || "").toLowerCase())
        );

    return (
        <div className="p-6 text-white">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-semibold">Vaults</h1>

                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search vaults..."
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
                        <Plus size={16} /> New Vault
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="kong-table-wrap">
                <table className="kong-table">
                    <thead>
                        <tr>
                            <th className="text-left">Prefix</th>
                            <th className="text-left">Name</th>
                            <th className="text-left">Config Prefix</th>
                            <th className="text-left">Description</th>
                            <th className="text-left">Tags</th>
              <th className="text-left">Source</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {isLoadingVaults && (
                            <KongTableSkeletonRows columns={7} />
                        )}

                        {!isLoadingVaults && vaultsError && (
                            <tr>
                                <td colSpan={7} className="kong-table-error">
                                    {vaultsError}
                                </td>
                            </tr>
                        )}

                        {!isLoadingVaults && !vaultsError && filteredVaults.length === 0 && (
                            <tr>
                                <td colSpan={7} className="kong-table-empty">
                                    No vaults found
                                </td>
                            </tr>
                        )}

                        {!isLoadingVaults && !vaultsError && filteredVaults.map((vault) => (
                            <tr key={vault.id}>
                                <td>{vault.prefix}</td>
                                <td>{vault.name || "-"}</td>
                                <td>{vault.config?.prefix || "-"}</td>
                                <td>{vault.description || "-"}</td>
                                <td>
                                    {vault.tags?.length ? vault.tags.join(", ") : "-"}
                                </td>

                                <td><KongSourceBadge resource={vault} /></td>

                                <td className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setEditData(vault);
                                            setViewMode(true);
                                            setOpenCreate(true);
                                        }}
                                        className="text-teal-400"
                                    >
                                        <Eye size={16} />
                                    </button>

                                    <button
                                        onClick={() => setDeleteTarget(vault)}
                                        className="text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {openCreate && (
                <CreateVaultsModal
                    onClose={() => setOpenCreate(false)}
                    onSuccess={fetchVaults}
                    editData={editData}
                    viewMode={viewMode}
                />
            )}
            {deleteTarget && (
                <KongDeleteConfirmModal
                    resourceName="vault"
                    itemName={deleteTarget.prefix || deleteTarget.name || deleteTarget.id}
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





