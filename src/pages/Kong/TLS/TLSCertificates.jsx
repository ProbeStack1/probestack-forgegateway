import { useEffect, useState } from "react";
import { Plus, Eye, Search } from "lucide-react";
import CreateTLSModal from "./CreateTLSModal";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTableSkeletonRows from "../components/KongTableSkeletonRows";
import KongSourceBadge from "../components/KongSourceBadge";
import {
  KONG_TRACKING_REQUIRED_MESSAGE,
  getKongResourceOnboardingId,
  matchesKongOnboarding,
} from "../kongTracking";
import "./tls.css";

export default function TLSCertificates({ selectedKongOnboardingId = "" }) {
  const [certs, setCerts] = useState([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [certsError, setCertsError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setCerts([]);
      setCertsError("Save a control plane in Kong settings before loading TLS certificates");
      return;
    }

    setIsLoadingCerts(true);
    setCertsError("");
    try {
      const [certResult, sniResult] = await Promise.all([
        kongFetch(
          KONG_ENDPOINTS.CONTROL_PLANE.CERTIFICATES(controlPlaneId),
          {
            cache: "no-store",
          }
        ),
        kongFetch(
          KONG_ENDPOINTS.CONTROL_PLANE.SNIS(controlPlaneId),
          {
            cache: "no-store",
          }
        ),
      ]);

      const snis = Array.isArray(sniResult?.data) ? sniResult.data : [];
      const certificates = Array.isArray(certResult?.data)
        ? certResult.data.map((certificate) => ({
          ...certificate,
          sni: Array.isArray(certificate.snis)
            ? certificate.snis
            : snis
              .filter((sni) => sni.certificate?.id === certificate.id)
              .map((sni) => sni.name)
              .filter(Boolean),
        }))
        : [];

      setCerts(certificates);
    } catch (err) {
      console.error(err);
      setCerts([]);
      setCertsError(err.message || "Failed to load TLS certificates");
    } finally {
      setIsLoadingCerts(false);
    }
  };

  const createSnis = async (certificateId, sniNames, trackingOnboardingId) => {
    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId || !certificateId) {
      return;
    }

    for (const name of sniNames) {
      await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.SNIS(controlPlaneId),
        {
          method: "POST",
          tracking: { onboardingId: trackingOnboardingId },
          body: {
            name,
            certificate: { id: certificateId },
          },
        }
      ).catch((err) => {
        if (err?.status !== 409) {
          throw err;
        }
      });
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
      c.sni?.join(" ") +
      " " +
      (c.tags?.join(" ") || "") +
      " " +
      c.cert
    )
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">TLS Certificates</h1>

        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search certificates..."
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
            <Plus size={16} /> New Certificate
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="kong-table-wrap">
        <table className="kong-table">
          <thead>
            <tr>
              <th className="text-left">Certificate</th>
              <th className="text-left">SNIs</th>
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
                  No certificates found
                </td>
              </tr>
            )}

            {!isLoadingCerts && !certsError && filtered.map((c) => (
              <tr key={c.id}>
                <td className="text-gray-300">
                  {getCertPreview(c.cert)}
                </td>

                <td>
                  {c.sni?.length ? c.sni.join(", ") : "-"}
                </td>

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

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {openCreate && (
        <CreateTLSModal
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchCertificates}
          onCreateSnis={createSnis}
          editData={editData}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}





