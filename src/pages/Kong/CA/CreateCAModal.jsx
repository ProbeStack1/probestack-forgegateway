import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";

export default function CreateCAModal({
  onClose,
  onSuccess,
  editData,
  viewMode,
}) {
  const [cert, setCert] = useState("");
  const [certDigest, setCertDigest] = useState("");
  const [tags, setTags] = useState(["ca"]);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

  useEffect(() => {
    if (editData) {
      setCert(editData.cert || "");
      setCertDigest(editData.cert_digest || editData.certDigest || "");
      setTags(Array.isArray(editData.tags) ? editData.tags : []);
    }
  }, [editData]);

  
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSubmit = async () => {
    if (!cert.trim()) {
      setSubmitError("Certificate is required");
      return;
    }

    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setSubmitError("Save a control plane in Kong settings before creating CA certificates");
      return;
    }    
    if (!trackingOnboardingId) {
        setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
        return;
    }


    const payload = {
      cert: cert.trim(),
      cert_digest: certDigest.trim() || null,
      tags,
    };

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await kongFetch(
        KONG_ENDPOINTS.CONTROL_PLANE.CA_CERTIFICATES(controlPlaneId),
        {
          method: "POST",
          body: payload,
                tracking: { onboardingId: trackingOnboardingId },
        }
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Failed to create CA certificate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      <div className="w-[900px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
          <h2 className="text-lg font-semibold text-white">
            {viewMode
              ? "View CA Certificate"
              : editData
              ? "Edit CA Certificate"
              : "Create CA Certificate"}
          </h2>

          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols gap-6 overflow-y-auto modal-body" style={{ maxHeight: "calc(90vh - 9rem)" }}>

          <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />

          {/* Public Cert Section */}
          <div className="grid grid-cols gap-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Public Certificate
              </h3>
              <p className="text-xs text-gray-400">
                The PEM-encoded public certificate of the CA and its SHA256 digest.
              </p>
            </div>

            <div className="col-span-2 space-y-5">

              {/* Cert */}
              <div>
                <label className="block mb-1 text-sm text-gray-400">
                  Cert <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="input w-full h-28"
                  value={cert}
                  onChange={(e) => setCert(e.target.value)}
                  disabled={viewMode}
                  placeholder="Paste CA certificate"
                />
              </div>

              {/* Cert Digest */}
              <div>
                <label className="block mb-1 text-sm text-gray-400">
                  Cert Digest
                </label>
              <input
                className="input w-full"
                value={certDigest}
                  onChange={(e) => setCertDigest(e.target.value)}
                  disabled={viewMode}
                  placeholder="Enter SHA256 digest"
                />
              </div>
            </div>
          </div>

          {/* General Info */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                General Information
              </h3>
              <p className="text-xs text-gray-400">
                General information will help identify and manage this key.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block mb-1 text-sm text-gray-400">
                Tags
              </label>
              <KongTagInput
                value={tags}
                onChange={setTags}
                disabled={viewMode}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
          {submitError && (
            <p className="mr-auto text-sm text-red-400">{submitError}</p>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-gray-300"
          >
            {viewMode ? "Close" : "Cancel"}
          </button>

          {!viewMode && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30 disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
