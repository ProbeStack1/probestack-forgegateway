import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { getKongControlPlaneId, KONG_ENDPOINTS } from "../../../config/kongConfig";
import { kongFetch } from "../../../utils/kongFetch";
import KongOnboardingContextSection from "../components/KongOnboardingContextSection";
import { KONG_TRACKING_REQUIRED_MESSAGE, getKongResourceOnboardingId } from "../kongTracking";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const mergeDeep = (base, override) => {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? [...override] : [...base];
  }

  if (!isPlainObject(base)) {
    return override !== undefined ? override : base;
  }

  const result = { ...base };
  Object.keys(override || {}).forEach((key) => {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (Array.isArray(baseValue)) {
      result[key] = Array.isArray(overrideValue) ? [...overrideValue] : [...baseValue];
      return;
    }

    if (isPlainObject(baseValue)) {
      result[key] = mergeDeep(baseValue, isPlainObject(overrideValue) ? overrideValue : {});
      return;
    }

    result[key] = overrideValue !== undefined ? overrideValue : baseValue;
  });

  return result;
};

const getValueByPath = (source, path) =>
  path.split(".").reduce((value, segment) => (value == null ? value : value[segment]), source);

const setValueByPath = (source, path, nextValue) => {
  const segments = path.split(".");
  const nextSource = Array.isArray(source) ? [...source] : { ...source };
  let cursor = nextSource;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      cursor[segment] = nextValue;
      return;
    }

    const currentValue = cursor[segment];
    cursor[segment] = Array.isArray(currentValue)
      ? [...currentValue]
      : isPlainObject(currentValue)
      ? { ...currentValue }
      : {};
    cursor = cursor[segment];
  });

  return nextSource;
};

const normalizeArrayInput = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getInitialScope = (plugin, editData, isEditingCurrentPlugin) => {
  if (isEditingCurrentPlugin && editData?.route?.id && plugin.scopes.includes("route")) {
    return "route";
  }

  if (isEditingCurrentPlugin && editData?.service?.id && plugin.scopes.includes("service")) {
    return "service";
  }

  if (plugin.scopes.includes("global")) {
    return "global";
  }

  return plugin.scopes[0] || "global";
};

const buildInitialFormState = (plugin, editData, isEditingCurrentPlugin, scope) => {
  const defaults = cloneValue(plugin.defaults || {});
  const mergedForm = isEditingCurrentPlugin
    ? mergeDeep(defaults, {
        enabled: editData?.enabled,
        protocols: editData?.protocols,
        tags: editData?.tags,
        config: editData?.config || {},
      })
    : defaults;

  return {
    ...mergedForm,
    serviceId: scope === "service" ? editData?.service?.id || "" : "",
    routeId: scope === "route" ? editData?.route?.id || "" : "",
  };
};

const scopeLabelMap = {
  global: "Global",
  service: "Service",
  route: "Route",
};

export default function PluginConfigPanel({ plugin, editData, onClose, onSuccess, viewMode = false }) {
  const controlPlaneId = getKongControlPlaneId();
  const isEditingCurrentPlugin = Boolean(editData?.id && editData?.name === plugin.key);

  const [scope, setScope] = useState(getInitialScope(plugin, editData, isEditingCurrentPlugin));
  const [form, setForm] = useState(
    buildInitialFormState(
      plugin,
      editData,
      isEditingCurrentPlugin,
      getInitialScope(plugin, editData, isEditingCurrentPlugin)
    )
  );
  const [services, setServices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [servicesError, setServicesError] = useState("");
  const [routesError, setRoutesError] = useState("");
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [openMultiSelectPath, setOpenMultiSelectPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [openScopeDropdown, setOpenScopeDropdown] = useState(false);
    const [trackingOnboardingId, setTrackingOnboardingId] = useState(() => getKongResourceOnboardingId(editData));

  useEffect(() => {
    const nextScope = getInitialScope(plugin, editData, isEditingCurrentPlugin);
    setScope(nextScope);
    setForm(buildInitialFormState(plugin, editData, isEditingCurrentPlugin, nextScope));
    setSubmitError("");
  }, [plugin, editData, isEditingCurrentPlugin]);

  useEffect(() => {
    if (!plugin.scopes.includes("service") || !controlPlaneId) {
      setServices([]);
      setServicesError("");
      return;
    }

    let isActive = true;

    const fetchServices = async () => {
      setIsLoadingServices(true);
      setServicesError("");

      try {
        const response = await kongFetch(
          KONG_ENDPOINTS.CONTROL_PLANE.SERVICES(controlPlaneId),
          { cache: "no-store" }
        );

        if (!isActive) {
          return;
        }

        setServices(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setServices([]);
        setServicesError(error.message || "Failed to load services");
      } finally {
        if (isActive) {
          setIsLoadingServices(false);
        }
      }
    };

    fetchServices();

    return () => {
      isActive = false;
    };
  }, [controlPlaneId, plugin]);

  useEffect(() => {
    if (!plugin.scopes.includes("route") || !controlPlaneId) {
      setRoutes([]);
      setRoutesError("");
      return;
    }

    let isActive = true;

    const fetchRoutes = async () => {
      setIsLoadingRoutes(true);
      setRoutesError("");

      try {
        const response = await kongFetch(
          KONG_ENDPOINTS.CONTROL_PLANE.ROUTES(controlPlaneId),
          { cache: "no-store" }
        );

        if (!isActive) {
          return;
        }

        setRoutes(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setRoutes([]);
        setRoutesError(error.message || "Failed to load routes");
      } finally {
        if (isActive) {
          setIsLoadingRoutes(false);
        }
      }
    };

    fetchRoutes();

    return () => {
      isActive = false;
    };
  }, [controlPlaneId, plugin]);

  const serviceOptions = useMemo(
    () =>
      services.map((service) => ({
        value: service.id,
        label: service.name || service.host || service.id,
      })),
    [services]
  );

  const routeOptions = useMemo(
    () =>
      routes.map((route) => ({
        value: route.id,
        label:
          route.name ||
          (Array.isArray(route.paths) && route.paths.length ? route.paths.join(", ") : route.id),
      })),
    [routes]
  );

  const updateField = (path, value) => {
    setForm((current) => setValueByPath(current, path, value));
  };

  const renderField = (field) => {
    const fieldValue = getValueByPath(form, field.path);

    if (field.type === "toggle") {
      return (
        <div key={field.path} className="flex items-center justify-between gap-3 px-3 py-2">
          <label className="text-sm text-gray-300">{field.label}</label>
          <button
            type="button"
            onClick={() => updateField(field.path, !fieldValue)}
            className={`w-10 h-5 flex items-center rounded-full p-1 ${
              fieldValue ? "bg-primary" : "bg-gray-600"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transform ${
                fieldValue ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.path} className="flex flex-col gap-1">
          <label className="text-sm text-gray-400">{field.label}</label>
          <select
            className="input"
            value={fieldValue ?? ""}
            onChange={(event) => updateField(field.path, event.target.value)}
          >
            {(field.options || []).map((option) => {
              const normalizedOption =
                typeof option === "string" ? { label: option, value: option } : option;

              return (
                <option key={normalizedOption.value} value={normalizedOption.value}>
                  {normalizedOption.label}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    if (field.type === "multiselect") {
      const options = field.options || [];
      const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
      const isOpen = openMultiSelectPath === field.path;

      return (
        <div key={field.path} className="flex flex-col gap-1 relative">
          <label className="text-sm text-gray-400">{field.label}</label>

          <button
            type="button"
            onClick={() =>
              setOpenMultiSelectPath((current) => (current === field.path ? "" : field.path))
            }
            className="input flex justify-between items-center min-h-[2.75rem]"
          >
            <div className="flex flex-wrap gap-1 text-left">
              {selectedValues.length ? (
                selectedValues.map((value) => (
                  <span
                    key={value}
                    className="flex items-center gap-1 px-2.5 py-1 text-sm bg-orange-700 text-white rounded-sm font-medium"
                  >
                    {value}
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        updateField(
                          field.path,
                          selectedValues.filter((item) => item !== value)
                        );
                      }}
                      className="hover:text-gray-200"
                    >
                      <X size={12} />
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">Select values</span>
              )}
            </div>

            <ChevronDown size={14} className="text-gray-400 shrink-0" />
          </button>

          {isOpen && (
            <div className="absolute top-full mt-1 w-full bg-[#15192b] border border-dark-700 rounded-lg z-20 max-h-48 overflow-y-auto">
              {options.map((option) => {
                const normalizedOption =
                  typeof option === "string" ? { label: option, value: option } : option;
                const selected = selectedValues.includes(normalizedOption.value);

                return (
                  <div
                    key={normalizedOption.value}
                    onClick={() => {
                      updateField(
                        field.path,
                        selected
                          ? selectedValues.filter((item) => item !== normalizedOption.value)
                          : [...selectedValues, normalizedOption.value]
                      );
                    }}
                    className="px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-slate-800"
                  >
                    <span>{normalizedOption.label}</span>
                    {selected && <Check size={14} className="text-primary" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (field.type === "array") {
      return (
        <div key={field.path} className="flex flex-col gap-1">
          <label className="text-sm text-gray-400">{field.label}</label>
          <input
            className="input"
            value={Array.isArray(fieldValue) ? fieldValue.join(", ") : ""}
            onChange={(event) => updateField(field.path, normalizeArrayInput(event.target.value))}
            placeholder="value1, value2"
          />
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div key={field.path} className="flex flex-col gap-1">
          <label className="text-sm text-gray-400">{field.label}</label>
          <input
            type="number"
            className="input"
            value={fieldValue ?? ""}
            onChange={(event) =>
              updateField(
                field.path,
                event.target.value === "" ? "" : Number(event.target.value)
              )
            }
          />
        </div>
      );
    }

    return (
      <div key={field.path} className="flex flex-col gap-1">
        <label className="text-sm text-gray-400">{field.label}</label>
        <input
          className="input"
          value={fieldValue ?? ""}
          onChange={(event) => updateField(field.path, event.target.value)}
          placeholder={field.allowNull ? "Leave empty to send null" : ""}
        />
      </div>
    );
  };

  
    useEffect(() => {
        setTrackingOnboardingId(getKongResourceOnboardingId(editData));
    }, [editData]);

const handleSave = async () => {
    if (!controlPlaneId) {
      setSubmitError("Save a control plane in Kong settings before creating plugins");
      return;
    }    
    if (!trackingOnboardingId) {
        setSubmitError(KONG_TRACKING_REQUIRED_MESSAGE);
        return;
    }


    if (scope === "service" && !form.serviceId) {
      setSubmitError("Select a service before saving a service-scoped plugin");
      return;
    }

    if (scope === "route" && !form.routeId) {
      setSubmitError("Select a route before saving a route-scoped plugin");
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const payload = plugin.buildPayload(form);
      const endpoint = isEditingCurrentPlugin
        ? KONG_ENDPOINTS.CONTROL_PLANE.PLUGIN_BY_ID(controlPlaneId, editData.id)
        : scope === "service"
        ? KONG_ENDPOINTS.CONTROL_PLANE.SERVICE_PLUGINS(controlPlaneId, form.serviceId)
        : scope === "route"
        ? KONG_ENDPOINTS.CONTROL_PLANE.ROUTE_PLUGINS(controlPlaneId, form.routeId)
        : KONG_ENDPOINTS.CONTROL_PLANE.PLUGINS(controlPlaneId);

      await kongFetch(endpoint, {
        method: isEditingCurrentPlugin ? "PUT" : "POST",
        body: payload,
                tracking: { onboardingId: trackingOnboardingId },
      });

      onSuccess?.();
      onClose?.();
    } catch (error) {
      setSubmitError(error.message || "Failed to save plugin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-white">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.25em] text-primary/80">Selected Plugin</div>
        <h3 className="text-xl font-semibold">{plugin.label}</h3>
        <p className="text-sm text-gray-400 max-w-3xl">{plugin.desc}</p>
      </div>

      <KongOnboardingContextSection
                        value={trackingOnboardingId}
                        onChange={(onboardingId) => setTrackingOnboardingId(onboardingId || "")}
                        disabled={viewMode}
                    />

      <div>
        <h3 className="text-lg font-semibold mb-3">Plugin Scope</h3>

        <div className="max-w-md flex flex-col gap-1 relative">
          <label className="text-sm text-gray-400">Plugin Scope</label>
          <button
            type="button"
            onClick={() => !isEditingCurrentPlugin && setOpenScopeDropdown((current) => !current)}
            className={`input flex justify-between items-center ${
              isEditingCurrentPlugin ? "cursor-not-allowed opacity-70" : ""
            }`}
            disabled={isEditingCurrentPlugin}
          >
            <span>{scopeLabelMap[scope] || scope}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {openScopeDropdown && !isEditingCurrentPlugin && (
            <div className="absolute top-full mt-1 w-full bg-[#15192b] border border-dark-700 rounded-lg z-20">
              {plugin.scopes.map((scopeOption) => (
                <div
                  key={scopeOption}
                  onClick={() => {
                    setScope(scopeOption);
                    setOpenScopeDropdown(false);
                  }}
                  className="px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-slate-800"
                >
                  <span>{scopeLabelMap[scopeOption] || scopeOption}</span>
                  {scope === scopeOption && <Check size={14} className="text-primary" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {isEditingCurrentPlugin && (
          <p className="mt-2 text-xs text-gray-500">
            Plugin scope is fixed while editing an existing plugin.
          </p>
        )}

        {scope === "service" && (
          <div className="mt-4 max-w-md flex flex-col gap-1">
            <label className="text-sm text-gray-400">Gateway Service</label>
            <select
              className="input"
              value={form.serviceId || ""}
              onChange={(event) => updateField("serviceId", event.target.value)}
              disabled={isLoadingServices}
            >
              <option value="">
                {isLoadingServices ? "Loading services..." : "Select Service"}
              </option>
              {serviceOptions.map((service) => (
                <option key={service.value} value={service.value}>
                  {service.label}
                </option>
              ))}
            </select>
            {servicesError && <p className="text-xs text-red-400">{servicesError}</p>}
          </div>
        )}

        {scope === "route" && (
          <div className="mt-4 max-w-md flex flex-col gap-1">
            <label className="text-sm text-gray-400">Gateway Route</label>
            <select
              className="input"
              value={form.routeId || ""}
              onChange={(event) => updateField("routeId", event.target.value)}
              disabled={isLoadingRoutes}
            >
              <option value="">
                {isLoadingRoutes ? "Loading routes..." : "Select Route"}
              </option>
              {routeOptions.map((route) => (
                <option key={route.value} value={route.value}>
                  {route.label}
                </option>
              ))}
            </select>
            {routesError && <p className="text-xs text-red-400">{routesError}</p>}
          </div>
        )}
      </div>

      {plugin.fields.map((section) => (
        <div key={section.section}>
          <h3 className="text-lg font-semibold mb-3">{section.section}</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {section.fields.map(renderField)}
          </div>
        </div>
      ))}

      {submitError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-dark-700 pt-4">
        <button
          className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>

        <button
          className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30 disabled:opacity-60"
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? "Saving..." : isEditingCurrentPlugin ? "Update Plugin" : "Save Plugin"}
        </button>
      </div>
    </div>
  );
}

