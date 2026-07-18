import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongTagInput from "../components/KongTagInput";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";
import "./routes.css";

export default function CreateRoutesModal({
  onClose,
  onSuccess,
  editData,
  viewMode
}) {
  const [form, setForm] = useState({
    name: "",
    service: "",
    tags: [],
    paths: "",
    methods: [],
    host: "",
    strip_path: true,
    mode: "basic" // basic | advanced
  });

  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

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

  // ================= METHODS =================
  const toggleMethod = (method) => {
    if (form.methods.includes(method)) {
      setForm({
        ...form,
        methods: form.methods.filter(m => m !== method)
      });
    } else {
      setForm({
        ...form,
        methods: [...form.methods, method]
      });
    }
  };

  const toList = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  // ================= SUBMIT =================
  
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSubmit = async () => {
    if (!form.name || !form.service) {
      setSubmitError("Route name and service are required");
      return;
    }

    const controlPlaneId = getKongControlPlaneId();
    if (!controlPlaneId) {
      setSubmitError("Save a control plane in Kong settings before creating routes");
      return;
    }    
    if (!trackingOnboardingId) {
        setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
        return;
    }


    const payload = {
      name: form.name.trim(),
      hosts: toList(form.host).length ? toList(form.host) : null,
      paths: toList(form.paths),
      strip_path: Boolean(form.strip_path),
      protocols: ["http", "https"],
      methods: Array.isArray(form.methods) ? form.methods : [],
      service: {
        id: form.service,
      },
      tags: Array.isArray(form.tags) ? form.tags : [],
    };

    const endpoint = editData?.id
      ? KONG_ENDPOINTS.CONTROL_PLANE.ROUTE_BY_ID(controlPlaneId, editData.id)
      : KONG_ENDPOINTS.CONTROL_PLANE.ROUTES(controlPlaneId);
    const method = editData?.id ? "PUT" : "POST";

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await kongFetch(endpoint, {
        method,
        body: payload,
        tracking: { onboardingId: trackingOnboardingId },
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Failed to save route");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= PREFILL =================
  useEffect(() => {
    if (editData) {
      setForm((prev) => ({
        ...prev,
        ...editData,
        tags: Array.isArray(editData.tags) ? editData.tags : [],
        methods: Array.isArray(editData.methods) ? editData.methods : [],
        paths: Array.isArray(editData.paths) ? editData.paths.join(", ") : editData.paths || "",
        host: Array.isArray(editData.hosts) ? editData.hosts.join(", ") : editData.host || "",
        service:
          editData.service?.id ||
          editData.service?.name ||
          editData.service ||
          "",
      }));
    }
  }, [editData]);

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      <div className="w-[950px] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 shadow-lg">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {viewMode
                ? "View Route"
                : editData
                  ? "Edit Route"
                  : "Create Route"}
            </h2>
            <p className="text-sm text-gray-400">
              Configure routing rules for incoming requests
            </p>
          </div>

          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div
          className="p-6 space-y-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 9rem)" }}
        >

          <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />
          {/* ================= GENERAL INFO ================= */}
          <div className="bg-dark-800 p-4 rounded-lg border border-dark-700">
            <p className="text-sm text-gray-300 mb-4">General Information</p>

            <div className="grid grid-cols-2 gap-4">

              {/* Name */}
              <div>
                <label className="text-sm text-gray-400">Name *</label>
                <input
                  disabled={viewMode}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="input"
                />
              </div>

              {/* Service */}
              <div>
                <label className="text-sm text-gray-400">Service</label>
                <select
                  disabled={viewMode}
                  value={form.service}
                  onChange={(e) =>
                    setForm({ ...form, service: e.target.value })
                  }
                  className="input"
                >
                  <option value="">
                    {isLoadingServices ? "Loading services..." : "Select a service"}
                  </option>
                  {services.map((service) => (
                    <option key={service.id || service.name} value={service.id || service.name}>
                      {service.name || service.id}
                    </option>
                  ))}
                </select>
                {servicesError && (
                  <p className="mt-1 text-xs text-red-400">{servicesError}</p>
                )}
              </div>

              {/* Tags */}
              <div className="col-span-2">
                <label className="text-sm text-gray-400">Tags</label>
                <KongTagInput
                  value={form.tags}
                  onChange={(tags) => setForm({ ...form, tags })}
                  disabled={viewMode}
                />
              </div>
            </div>
          </div>

          {/* ================= CONFIG ================= */}
          <div className="bg-dark-800 p-4 rounded-lg border border-dark-700">
            <p className="text-sm text-gray-300 mb-4">Route Configuration</p>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-4 mb-4">

              <div
                onClick={() =>
                  !viewMode && setForm({ ...form, mode: "basic" })
                }
                className={`p-3 border rounded-lg cursor-pointer 
                  ${form.mode === "basic"
                    ? "border-primary bg-primary/10"
                    : "border-dark-700"
                  }`}
              >
                <p className="text-sm text-white">Basic</p>
                <p className="text-xs text-gray-400">
                  Path, method and host
                </p>
              </div>

              <div
                onClick={() =>
                  !viewMode && setForm({ ...form, mode: "advanced" })
                }
                className={`p-3 border rounded-lg cursor-pointer 
                  ${form.mode === "advanced"
                    ? "border-primary bg-primary/10"
                    : "border-dark-700"
                  }`}
              >
                <p className="text-sm text-white">Advanced</p>
                <p className="text-xs text-gray-400">
                  Complex routing rules
                </p>
              </div>
            </div>

            {/* BASIC FORM */}
            {form.mode === "basic" && (
              <div className="space-y-4">

                {/* Path */}
                <div>
                  <label className="text-sm text-gray-400">Path</label>
                  <input
                    disabled={viewMode}
                    placeholder="/api/v1"
                    value={form.paths}
                    onChange={(e) =>
                      setForm({ ...form, paths: e.target.value })
                    }
                    className="input"
                  />
                </div>

                {/* Strip Path */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Strip Path</span>

                  <button
                    disabled={viewMode}
                    onClick={() =>
                      setForm({
                        ...form,
                        strip_path: !form.strip_path
                      })
                    }
                    className={`w-10 h-5 flex items-center rounded-full p-1 
                      ${form.strip_path ? "bg-primary" : "bg-gray-600"}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition 
                        ${form.strip_path ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>

                {/* Methods */}
                <div>
                  <label className="text-sm text-gray-400">Methods</label>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => (
                      <button
                        key={m}
                        disabled={viewMode}
                        onClick={() => toggleMethod(m)}
                        className={`px-2 py-1 text-xs rounded 
                          ${form.methods.includes(m)
                            ? "bg-primary text-white"
                            : "bg-dark-700 text-gray-400"
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Host */}
                <div>
                  <label className="text-sm text-gray-400">Host</label>
                  <input
                    disabled={viewMode}
                    placeholder="example.com"
                    value={form.host}
                    onChange={(e) =>
                      setForm({ ...form, host: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>
            )}

            {/* ADVANCED */}
            {form.mode === "advanced" && (
              <div className="text-xs text-gray-400">
                Advanced configuration (headers, multiple paths, etc.)
                can be added here later.
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700">
          {submitError && (
            <p className="mr-auto self-center text-sm text-red-400">{submitError}</p>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-700 text-gray-300 rounded"
          >
            {viewMode ? "Close" : "Cancel"}
          </button>

          {!viewMode && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary text-white rounded"
            >
              {isSubmitting ? "Saving..." : editData ? "Update" : "Create"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
