import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import CreateUpstreamModal from "./CreateUpstreamModal";
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

import "./upstream.css";

export default function Upstream({ selectedKongOnboardingId = "" }) {
    const [upstream, setUpstream] = useState([]);
    const [isLoadingUpstreams, setIsLoadingUpstreams] = useState(false);
    const [upstreamError, setUpstreamError] = useState("");
    const [openCreate, setOpenCreate] = useState(false);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        fetchUpstreams();
    }, []);

    const fetchUpstreams = async () => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setUpstream([]);
            setUpstreamError("Save a control plane in Kong settings before loading upstreams");
            return;
        }

        setIsLoadingUpstreams(true);
        setUpstreamError("");
        try {
            const result = await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAMS(controlPlaneId),
                {
                    cache: "no-store",
                }
            );

            const data = Array.isArray(result?.data) ? result.data : [];
            setUpstream(data);
        } catch (err) {
            console.error(err);
            setUpstream([]);
            setUpstreamError(err.message || "Failed to load upstreams");
        } finally {
            setIsLoadingUpstreams(false);
        }
    };

    const filteredUpstream = upstream
    .filter((srv) => matchesKongOnboarding(srv, selectedKongOnboardingId))
    .filter((srv) =>
        (srv.name || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
    );

    const handleDelete = async (target) => {
        const controlPlaneId = getKongControlPlaneId();
        if (!controlPlaneId) {
            setUpstreamError("Save a control plane in Kong settings before deleting upstreams");
            return;
        }

        
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setUpstreamError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
try {
            await kongFetch(
                KONG_ENDPOINTS.CONTROL_PLANE.UPSTREAM_BY_ID(controlPlaneId, target.id),
                {
                    method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
                }
            );
            fetchUpstreams();
        } catch (err) {
            console.error(err);
            setUpstreamError(err.message || "Failed to delete upstream");
        }
    };

    const getHealthChecksLabel = (srv) => {
        if (srv.healthchecks?.active) {
            return "Active";
        }
        if (srv.healthchecks?.passive) {
            return "Passive";
        }
        return "None";
    };

    return (
        <div className="p-6 text-white">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-semibold">Upstream Services</h1>

                <div className="flex gap-3">
                    <div className="relative justify-center">
                        <input
                            type="text"
                            placeholder="Search upstream..."
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
                        <Plus size={16} /> New Upstream
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="kong-table-wrap">
                <table className="kong-table">
                    <thead>
                        <tr>
                            <th className="text-left">Name</th>
                            <th className="text-left">Algorithm</th>
                            <th className="text-left">Targets</th>
                            <th className="text-left">Slots</th>
                            <th className="text-left">Health Checks</th>
              <th className="text-left">Source</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {isLoadingUpstreams && (
                            <KongTableSkeletonRows columns={7} />
                        )}

                        {!isLoadingUpstreams && upstreamError && (
                            <tr>
                                <td
                                    colSpan="7"
                                    className="kong-table-error"
                                >
                                    {upstreamError}
                                </td>
                            </tr>
                        )}

                        {!isLoadingUpstreams && !upstreamError && filteredUpstream.map((srv) => (
                            <tr key={srv.id}>

                                {/* Name */}
                                <td className="font-medium">{srv.name}</td>

                                {/* Algorithm */}
                                <td className="capitalize">{srv.algorithm}</td>

                                {/* Targets */}
                                <td>
                                    <div className="flex flex-col gap-1">
                                        {srv.targets?.slice(0, 2).map((t, i) => (
                                            <span
                                                key={i}
                                                className="text-xs text-gray-300 font-mono"
                                            >
                                                {t.target}
                                            </span>
                                        ))}
                                        {srv.targets?.length > 2 && (
                                            <span className="text-xs text-gray-500">
                                                +{srv.targets.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Slots */}
                                <td>{srv.slots}</td>

                                {/* Health Checks */}
                                <td>
                                    <span
                                        className={`text-xs px-2 py-1 rounded ${getHealthChecksLabel(srv) === "Active"
                                                ? "bg-green-500/20 text-green-400"
                                                : getHealthChecksLabel(srv) === "Passive"
                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                    : "bg-gray-700 text-gray-400"
                                            }`}
                                    >
                                        {getHealthChecksLabel(srv)}
                                    </span>
                                </td>

                                <td><KongSourceBadge resource={srv} /></td>

                                {/* Actions */}
                                <td className="flex justify-end gap-3">
                                    <button className="py-1 text-teal-400"
                                        onClick={() => {
                                            setEditData(srv);
                                            setViewMode(true);
                                            setOpenCreate(true);
                                        }}>
                                        <Eye size={16} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            setEditData(srv);
                                            setViewMode(false);
                                            setOpenCreate(true);
                                        }}
                                        className="py-1 text-blue-400"
                                    >
                                        <Pencil size={16} />
                                    </button>

                                    <button
                                        onClick={() => setDeleteTarget(srv)}
                                        className="py-1 text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!isLoadingUpstreams && !upstreamError && filteredUpstream.length === 0 && (
                            <tr>
                                <td
                                    colSpan="7"
                                    className="kong-table-empty"
                                >
                                    No upstreams found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {openCreate && (
                <CreateUpstreamModal
                    onClose={() => setOpenCreate(false)}
                    onSuccess={fetchUpstreams}
                    editData={editData}
                    viewMode={viewMode}
                />
            )}
            {deleteTarget && (
                <KongDeleteConfirmModal
                    resourceName="upstream"
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





