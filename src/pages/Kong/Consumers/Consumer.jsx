import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import CreateConsumerModal from "./CreateConsumerModal";
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

export default function Consumer({ selectedKongOnboardingId = "" }) {
    const [consumers, setConsumers] = useState([]);
    const [isLoadingConsumers, setIsLoadingConsumers] = useState(false);
    const [consumersError, setConsumersError] = useState("");
    const [openCreate, setOpenCreate] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewMode, setViewMode] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchConsumers();
    }, []);

    const fetchConsumers = async () => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setConsumers([]);
            setConsumersError("Save a control plane in Kong settings before loading consumers");
            return;
        }

        setIsLoadingConsumers(true);
        setConsumersError("");
        try {
            const result = await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.CONSUMERS(controlPlaneId),
                {
                    cache: "no-store",
                }
            );

            const data = Array.isArray(result?.data) ? result.data : [];
            const consumersWithAcls = await Promise.all(
                data.map(async (consumer) => {
                    try {
                        const aclResult = await kongFetch(
                            KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_ACLS(
                                controlPlaneId,
                                consumer.id
                            ),
                            {
                                cache: "no-store",
                            }
                        );
                        const groups = Array.isArray(aclResult?.data)
                            ? aclResult.data
                                .map((item) => item?.group)
                                .filter(Boolean)
                            : [];

                        return {
                            ...consumer,
                            groups,
                        };
                    } catch (aclError) {
                        console.error(aclError);
                        return {
                            ...consumer,
                            groups: [],
                        };
                    }
                })
            );

            setConsumers(consumersWithAcls);
        } catch (err) {
            console.error(err);
            setConsumers([]);
            setConsumersError(err.message || "Failed to load consumers");
        } finally {
            setIsLoadingConsumers(false);
        }
    };

    const handleDelete = async (target) => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setConsumersError("Save a control plane in Kong settings before deleting consumers");
            return;
        }

        
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setConsumersError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
try {
            await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.CONSUMER_BY_ID(controlPlaneId, target.id),
                {
                    method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
                }
            );

            fetchConsumers();
        } catch (err) {
            console.error(err);
            setConsumersError(err.message || "Failed to delete consumer");
        }
    };

    const filtered = consumers
        .filter((c) => matchesKongOnboarding(c, selectedKongOnboardingId))
        .filter((c) =>
            (c.username || "").toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) =>
            (a.username || "").localeCompare(b.username || "")
        );

    return (
        <div className="p-6 text-white">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-semibold">Consumers</h1>

                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search consumers..."
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
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-white"
                    >
                        <Plus size={16} /> New Consumer
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="kong-table-wrap">
                <table className="kong-table">
                    <thead>
                        <tr>
                            <th className="text-left">Username</th>
                            <th className="text-left">Credential</th>
                            <th className="text-left">Groups</th>
                            <th className="text-left">Tags</th>
              <th className="text-left">Source</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {isLoadingConsumers && (
                            <KongTableSkeletonRows columns={6} />
                        )}

                        {!isLoadingConsumers && consumersError && (
                            <tr>
                                <td colSpan="6" className="kong-table-error">
                                    {consumersError}
                                </td>
                            </tr>
                        )}

                        {!isLoadingConsumers && !consumersError && filtered.map((c) => (
                            <tr key={c.id}>
                                <td className="font-medium">{c.username}</td>
                                <td className="capitalize">{c.credential || c.custom_id || "-"}</td>

                                <td>
                                    {c.groups?.length ? c.groups.map((g, i) => (
                                        <span key={i} className="text-xs bg-slate-700 px-2 py-1 rounded mr-1">
                                            {g}
                                        </span>
                                    )) : "-"}
                                </td>

                                <td>
                                    {c.tags?.length ? c.tags.map((t, i) => (
                                        <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded mr-1">
                                            {t}
                                        </span>
                                    )) : "-"}
                                </td>

                                <td><KongSourceBadge resource={c} /></td>

                                <td className="flex justify-end gap-3">
                                    <button className="py-1 text-teal-400"
                                        onClick={() => {
                                            setEditData(c);
                                            setViewMode(true);
                                            setOpenCreate(true);
                                        }}>
                                        <Eye size={16} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            setEditData(c);
                                            setViewMode(false);
                                            setOpenCreate(true);
                                        }}
                                        className="py-1 text-blue-400"
                                    >
                                        <Pencil size={16} />
                                    </button>

                                    <button
                                        onClick={() => setDeleteTarget(c)}
                                        className="py-1 text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!isLoadingConsumers && !consumersError && filtered.length === 0 && (
                            <tr>
                                <td colSpan="6" className="kong-table-empty">
                                    No consumers found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {openCreate && (
                <CreateConsumerModal
                    onClose={() => setOpenCreate(false)}
                    onSuccess={fetchConsumers}
                    editData={editData}
                    viewMode={viewMode}
                />
            )}
            {deleteTarget && (
                <KongDeleteConfirmModal
                    resourceName="consumer"
                    itemName={deleteTarget.username || deleteTarget.id}
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





