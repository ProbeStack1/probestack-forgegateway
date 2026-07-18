import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, Search } from "lucide-react";
import CreateCAModal from "./CreateCAModal";
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
import "./ca.css";

export default function CACertificates({ selectedKongOnboardingId = "" }) {
  const [certs, setCerts] = useState([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [certsError, setCertsError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setCerts([]);
      setCertsError("Save a control plane in Kong settings before loading CA certificates");
      return;
    }

    setIsLoadingCerts(true);
    setCertsError("");
    try {
      const result = await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.CA_CERTIFICATES(controlPlaneId),
        {
          cache: "no-store",
        }
      );

      const data = Array.isArray(result?.data) ? result.data : [];
      setCerts(data);
    } catch (err) {
      console.error(err);
      setCerts([]);
      setCertsError(err.message || "Failed to load CA certificates");
    } finally {
      setIsLoadingCerts(false);
    }
  };

  const handleDelete = async (target) => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setCertsError("Save a control plane in Kong settings before deleting CA certificates");
      return;
    }

    
    const trackingOnboardingId = selectedKongOnboardingId || getKongResourceOnboardingId(target);
    if (!trackingOnboardingId) {
      setCertsError(KONG_TRACKING_REQUIRED_MESSAGE);
      return;
    }
try {
      await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.CA_CERTIFICATE_BY_ID(controlPlaneId, target.id),
        {
          method: "DELETE",
          tracking: { onboardingId: trackingOnboardingId },
        }
      );

      fetchCertificates();
    } catch (err) {
      console.error(err);
      setCertsError(err.message || "Failed to delete CA certificate");
    }
  };

  const getCertPreview = (cert) => {
    if (!cert) return "-";
    return cert.substring(0, 35) + "...";
  };

  const filtered = certs
    .filter((c) => matchesKongOnboarding(c, selectedKongOnboardingId))
    .filter((c) =>
    (
      c.cert +
      " " +
      (c.cert_digest || c.certDigest || "") +
      " " +
      (c.tags?.join(" ") || "")
    )
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">CA Certificates</h1>

        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search CA certificates..."
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
            <Plus size={16} /> New CA Certificate
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="kong-table-wrap">
        <table className="kong-table">
          <thead>
            <tr>
              <th className="text-left">Certificate</th>
              <th className="text-left">Cert Digest</th>
              <th className="text-left">Tags</th>
              <th className="text-left">Source</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoadingCerts && (
              <KongTableSkeletonRows columns={5} />
            )}

            {!isLoadingCerts && certsError && (
              <tr>
                <td colSpan={5} className="kong-table-error">
                  {certsError}
                </td>
              </tr>
            )}

            {!isLoadingCerts && !certsError && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="kong-table-empty">
                  No CA certificates found
                </td>
              </tr>
            )}

            {!isLoadingCerts && !certsError && filtered.map((c) => (
              <tr key={c.id}>
                <td className="text-gray-300">
                  {getCertPreview(c.cert)}
                </td>

                <td>{c.cert_digest || c.certDigest || "-"}</td>

                <td>
                  <div className="flex flex-wrap gap-1">
                    {c.tags?.length ? (
                      c.tags.map((tag, i) => (
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
                  </div>
                </td>

                <td><KongSourceBadge resource={c} /></td>

                <td className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditData(c);
                      setViewMode(true);
                      setOpenCreate(true);
                    }}
                    className="text-teal-400"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => setDeleteTarget(c)}
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
        <CreateCAModal
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchCertificates}
          editData={editData}
          viewMode={viewMode}
        />
      )}
      {deleteTarget && (
        <KongDeleteConfirmModal
          resourceName="CA certificate"
          itemName={deleteTarget.cert_digest || deleteTarget.certDigest || deleteTarget.id}
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





