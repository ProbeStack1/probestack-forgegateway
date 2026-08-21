import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../../services/apigeeApiService";
import { getTrackingHeaders } from "../apigeeTracking";
import useApigeeDevelopers from "../useApigeeDevelopers";
import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";
import { getBusinessUnits, getApplications } from "../../../../http-service/onboardingApi";


// Helper: get unique values from array of objects
const uniqueValues = (items, key) => [
  ...new Set(items.map((item) => item[key]).filter(Boolean)),
].sort((a, b) => a.localeCompare(b));

export default function CreateAppModal({
  onClose,
  editData,
  organization = "",
  environment = "",
  developerEmail = "",
  onboardingOptions = [],      // used only when isGateway = false
  isFetchingOnboardings = false,
  defaultOnboardingId = "",
  defaultMicroserviceId = "",
  isGateway = false,
}) {
  // ------------------------------------------------------------
  // Common form state (shared by both modes)
  // ------------------------------------------------------------
  const [form, setForm] = useState({
    organization: editData?.org || editData?.organization || organization || "gen-ai-poc-onboarding",
    environment: editData?.env || editData?.environment || environment || "dev",
    name: editData?.name || "",
    products: editData?.products || [],
    developer_email: editData?.developer_email || developerEmail || "jagruti.d@krelixir.com",
    isInternal: editData?.isInternal || "yes",
    onboardingId: editData?.onboardingId || defaultOnboardingId || "",
    microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
    displayName: editData?.displayName || "",
    description: editData?.description || "",
    companyName: editData?.companyName || "",
    companyEmail: editData?.companyEmail || "",
  });

  // ------------------------------------------------------------
  // Gateway mode: Business Unit / Application options come from the real
  // onboarding hierarchy (fg-onboarding-svc), not the legacy
  // /gatewayonboarding business-units endpoint.
  // ------------------------------------------------------------
  const [hierarchyBUs, setHierarchyBUs] = useState([]);
  const [isLoadingGatewayBU, setIsLoadingGatewayBU] = useState(false);
  const [gatewayBUError, setGatewayBUError] = useState("");

  const [hierarchyApps, setHierarchyApps] = useState([]);
  const [isLoadingGatewayApps, setIsLoadingGatewayApps] = useState(false);

  const [selectedGatewayBU, setSelectedGatewayBU] = useState("");      // business unit id
  const [selectedGatewayAppName, setSelectedGatewayAppName] = useState(""); // application name

  useEffect(() => {
    if (!isGateway) return;
    let cancelled = false;
    setIsLoadingGatewayBU(true);
    setGatewayBUError("");
    getBusinessUnits(0, 200)
      .then((list) => { if (!cancelled) setHierarchyBUs(list || []); })
      .catch((err) => {
        console.error("Business unit fetch failed:", err);
        if (!cancelled) setGatewayBUError(err.message || "Failed to load business units");
      })
      .finally(() => { if (!cancelled) setIsLoadingGatewayBU(false); });
    return () => { cancelled = true; };
  }, [isGateway]);

  useEffect(() => {
    if (!isGateway || !selectedGatewayBU) { setHierarchyApps([]); return; }
    let cancelled = false;
    setIsLoadingGatewayApps(true);
    getApplications({ businessUnitId: selectedGatewayBU, size: 200 })
      .then((list) => { if (!cancelled) setHierarchyApps(list || []); })
      .catch((err) => {
        console.error("Application fetch failed:", err);
        if (!cancelled) setHierarchyApps([]);
      })
      .finally(() => { if (!cancelled) setIsLoadingGatewayApps(false); });
    return () => { cancelled = true; };
  }, [isGateway, selectedGatewayBU]);

  // Gateway cascade options — {id, name, displayName} business units
  const gatewayBUOptions = hierarchyBUs;

  const gatewayAppNameOptions = useMemo(
    () => uniqueValues(hierarchyApps, "name"),
    [hierarchyApps]
  );

  const gatewayAppIdOptions = useMemo(() => {
    if (!selectedGatewayAppName) return [];
    return hierarchyApps.filter((app) => app.name === selectedGatewayAppName);
  }, [selectedGatewayAppName, hierarchyApps]);

  const handleGatewayAppSelect = (onboardingId, microserviceId = "") => {
    setForm((prev) => ({ ...prev, onboardingId, microserviceId }));
  };

  const handleGatewayBUChange = (nextBU) => {
    setSelectedGatewayBU(nextBU);
    setSelectedGatewayAppName("");
    setForm((prev) => ({ ...prev, onboardingId: "", microserviceId: "" }));
  };

  const handleGatewayAppNameChange = (nextAppName) => {
    setSelectedGatewayAppName(nextAppName);
    setForm((prev) => ({ ...prev, onboardingId: "", microserviceId: "" }));
  };

  // ------------------------------------------------------------
  // Non‑gateway mode: use onboardingOptions prop
  // ------------------------------------------------------------
  const selectedOption = useMemo(
    () => (!isGateway && onboardingOptions.find((opt) => opt.onboardingId === form.onboardingId)) || null,
    [onboardingOptions, form.onboardingId, isGateway]
  );

  const [businessUnit, setBusinessUnit] = useState(selectedOption?.businessUnit || "");
  const [teamName, setTeamName] = useState(selectedOption?.teamName || "");

  useEffect(() => {
    if (!isGateway) {
      setBusinessUnit(selectedOption?.businessUnit || "");
      setTeamName(selectedOption?.teamName || "");
    }
  }, [selectedOption, isGateway]);

  const businessUnitOptions = useMemo(
    () => (!isGateway ? uniqueValues(onboardingOptions, "businessUnit") : []),
    [onboardingOptions, isGateway]
  );
  const teamOptions = useMemo(
    () =>
      !isGateway
        ? uniqueValues(
            onboardingOptions.filter((opt) => opt.businessUnit === businessUnit),
            "teamName"
          )
        : [],
    [businessUnit, onboardingOptions, isGateway]
  );
  const applicationOptions = useMemo(
    () =>
      !isGateway
        ? onboardingOptions.filter(
            (opt) => opt.businessUnit === businessUnit && opt.teamName === teamName && opt.applicationId
          )
        : [],
    [businessUnit, teamName, onboardingOptions, isGateway]
  );

  const handleBusinessUnitChange = (nextBusinessUnit) => {
    setBusinessUnit(nextBusinessUnit);
    setTeamName("");
    handleChange("onboardingId", "");
    handleChange("microserviceId", "");
  };

  const handleTeamChange = (nextTeamName) => {
    setTeamName(nextTeamName);
    handleChange("onboardingId", "");
    handleChange("microserviceId", "");
  };

  const handleApplicationChange = (nextOnboardingId) => {
    const option = onboardingOptions.find((item) => item.onboardingId === nextOnboardingId) || null;
    handleChange("onboardingId", nextOnboardingId);
    handleChange("microserviceId", option?.microserviceId || "");
  };

  // ------------------------------------------------------------
  // Common handlers (products, developers, submit)
  // ------------------------------------------------------------
  const [submitError, setSubmitError] = useState("");
  const [products, setProducts] = useState([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef(null);

  const { organizations, isFetchingOrganizations } = useApigeeOrgEnvironmentOptions(form.organization);
  const { developers, isFetchingDevelopers } = useApigeeDevelopers(form.organization);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleProductToggle = (productName) => {
    setForm((prev) => {
      const currentProducts = Array.isArray(prev.products) ? prev.products : [];
      const nextProducts = currentProducts.includes(productName)
        ? currentProducts.filter((name) => name !== productName)
        : [...currentProducts, productName];
      return { ...prev, products: nextProducts };
    });
  };

  const fetchAppDetails = async (org, developer_email, name) => {
    if (!org || !developer_email) return;
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.GET(org, developer_email, name));
      const data = await res.json();

      // Business Unit, Application, Display Name, Description, Company Name/Email
      // and onboarding/microservice ids all live in Apigee's own `attributes` on
      // the app (see buildAppAttributes below) — Apigee has no native fields for
      // most of these, so this is the only place they're persisted.
      const attrMap = {};
      (data?.attributes || []).forEach((attr) => {
        if (attr?.name) attrMap[attr.name] = attr.value ?? "";
      });

      setForm((prev) => ({
        ...prev,
        organization: org,
        environment: data?.environments?.[0] || prev.environment,
        name: data?.name || "",
        products: (data?.credentials?.[0]?.apiProducts || [])
          .map((product) => product?.apiproduct || product?.name || product)
          .filter(Boolean),
        developer_email: data?.developer_email || prev.developer_email,
        displayName: attrMap.displayName ?? prev.displayName,
        description: attrMap.description ?? prev.description,
        companyName: attrMap.companyName ?? prev.companyName,
        companyEmail: attrMap.companyEmail ?? prev.companyEmail,
        onboardingId: attrMap.onboardingId || prev.onboardingId,
        microserviceId: attrMap.microserviceId || prev.microserviceId,
      }));

      // Gateway mode has no live cascade to derive Business Unit/Application
      // from onboardingId alone (unlike non-gateway mode's selectedOption
      // lookup below), so restore the cascade selections directly.
      if (isGateway) {
        if (attrMap.businessUnitId) setSelectedGatewayBU(attrMap.businessUnitId);
        if (attrMap.applicationName) setSelectedGatewayAppName(attrMap.applicationName);
      }
    } catch (e) {
      console.error("Failed to fetch app details", e);
    }
  };

  const fetchProducts = async (org) => {
    if (!org) return;
    setIsFetchingProducts(true);
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.LIST(org));
      const data = await res.json();
      const list = Array.isArray(data?.apiProduct)
        ? data.apiProduct
        : Array.isArray(data)
        ? data.map((item) => (typeof item === "string" ? { name: item } : item))
        : [];
      setProducts(list);
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
    setIsFetchingProducts(false);
  };

  useEffect(() => {
    fetchProducts(form.organization);
  }, [form.organization]);

  useEffect(() => {
    if (developers.length > 0 && !developers.includes(form.developer_email)) {
      handleChange("developer_email", developers[0]);
    }
  }, [developers, form.developer_email]);

  useEffect(() => {
    if (editData?.name) {
      fetchAppDetails(
        form.organization || organization || "gen-ai-poc-onboarding",
        form.developer_email || developerEmail || "jagruti.d@krelixir.com",
        editData?.name
      );
    }
  }, [editData]);

  useEffect(() => {
    if (!isProductDropdownOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!productDropdownRef.current?.contains(event.target)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isProductDropdownOpen]);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!form.onboardingId && !isGateway) {
      setSubmitError("Application ID is required.");
      return;
    }
    if (editData) {
      await updateApp(form.organization, form.developer_email, editData.name);
    } else {
      await createApp(form.organization, form.developer_email);
    }
    onClose();
  };

  // Apigee apps have no native fields for these — they're persisted as
  // custom attributes so fetchAppDetails can read them straight back on Edit.
  const buildAppAttributes = () => {
    const attrs = [];
    const add = (name, value) => {
      if (value !== undefined && value !== null && value !== "") {
        attrs.push({ name, value: String(value) });
      }
    };
    add("displayName", form.displayName);
    add("description", form.description);
    add("companyName", form.companyName);
    add("companyEmail", form.companyEmail);
    add("onboardingId", form.onboardingId);
    add("microserviceId", form.microserviceId);
    if (isGateway) {
      add("businessUnitId", selectedGatewayBU);
      add("applicationName", selectedGatewayAppName);
    } else {
      add("businessUnit", businessUnit);
      add("applicationName", teamName);
    }
    return attrs;
  };

  const createApp = async (org, developer_email) => {
    if (!org || !developer_email) return;
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.CREATE(org, developer_email), {
        method: "POST",
        headers: getTrackingHeaders(form),
        body: JSON.stringify({
          name: form.name,
          apiProducts: form.products,
          keyExpiresIn: -1,
          attributes: buildAppAttributes(),
        }),
      });
      await res.json();
    } catch (e) {
      console.error("Failed to create app", e);
    }
  };

  const updateApp = async (org, developer_email, name) => {
    if (!org || !name || !developer_email) return;
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.UPDATE(org, developer_email, name), {
        method: "PUT",
        headers: getTrackingHeaders(form),
        body: JSON.stringify({
          name: form.name,
          apiProducts: form.products,
          keyExpiresIn: -1,
          attributes: buildAppAttributes(),
        }),
      });
      await res.json();
    } catch (e) {
      console.error("Failed to update app", e);
    }
  };

  // ------------------------------------------------------------
  // JSX return
  // ------------------------------------------------------------
  return (
    <div className="fixed h-full inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="h-full w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
          <div>
            <h2 className="text-lg font-semibold text-white">{editData ? "Edit App" : "Create App"}</h2>
            <p className="text-sm text-gray-400">{!editData && "Create an App in a few simple steps."}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>
          {/* Row 1: Project Id + Business Unit */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Project Id*</label>
              <select
                value={form.organization}
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleChange("organization", e.target.value)}
              >
                <option value="">{isFetchingOrganizations ? "Loading project ids..." : "Select Project Id"}</option>
                {form.organization && !organizations.includes(form.organization) && (
                  <option value={form.organization}>{form.organization}</option>
                )}
                {organizations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Business Unit*</label>
              {!isGateway ? (
                <select
                  value={businessUnit}
                  disabled={isFetchingOnboardings}
                  className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={(e) => handleBusinessUnitChange(e.target.value)}
                >
                  <option value="">
                    {isFetchingOnboardings ? "Loading business units..." : "Select Business Unit"}
                  </option>
                  {businessUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <select
                    value={selectedGatewayBU}
                    disabled={isLoadingGatewayBU}
                    className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    onChange={(e) => handleGatewayBUChange(e.target.value)}
                  >
                    <option value="">
                      {isLoadingGatewayBU ? "Loading business units..." : "Select Business Unit"}
                    </option>
                    {gatewayBUOptions.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.displayName || unit.name}
                      </option>
                    ))}
                  </select>
                  {gatewayBUError && (
                    <p className="text-xs text-red-400 mt-1">{gatewayBUError}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Row 2: Application Name + Application ID */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Application Name*</label>
              {!isGateway ? (
                <select
                  value={teamName}
                  disabled={isFetchingOnboardings || !businessUnit}
                  className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={(e) => handleTeamChange(e.target.value)}
                >
                  <option value="">
                    {businessUnit ? "Select Application Name" : "Select a business unit first"}
                  </option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedGatewayAppName}
                  disabled={isLoadingGatewayApps || !selectedGatewayBU}
                  className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={(e) => handleGatewayAppNameChange(e.target.value)}
                >
                  <option value="">
                    {selectedGatewayBU ? "Select Application Name" : "Select a business unit first"}
                  </option>
                  {gatewayAppNameOptions.map((appName) => (
                    <option key={appName} value={appName}>
                      {appName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Application ID*</label>
              {!isGateway ? (
                <select
                  value={form.onboardingId || ""}
                  disabled={isFetchingOnboardings || !businessUnit || !teamName}
                  className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={(e) => handleApplicationChange(e.target.value)}
                >
                  <option value="">{teamName ? "Select Application ID" : "Select a team first"}</option>
                  {applicationOptions.map((opt) => (
                    <option key={opt.onboardingId} value={opt.onboardingId}>
                      {opt.applicationId}
                      {opt.applicationName ? ` - ${opt.applicationName}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={form.onboardingId}
                  disabled={isLoadingGatewayApps || !selectedGatewayBU || !selectedGatewayAppName}
                  className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const matched = gatewayAppIdOptions.find(
                      (opt) => (opt.applicationId || opt.id) === selectedId
                    );
                    if (matched) {
                      handleGatewayAppSelect(matched.applicationId || matched.id, matched.id || "");
                    } else {
                      handleGatewayAppSelect(selectedId, "");
                    }
                  }}
                >
                  <option value="">
                    {selectedGatewayAppName ? "Select Application ID" : "Select an application name first"}
                  </option>
                  {gatewayAppIdOptions.map((opt) => (
                    <option key={opt.applicationId || opt.id} value={opt.applicationId || opt.id}>
                      {opt.applicationId || opt.id}
                      {opt.name ? ` - ${opt.name}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Row 3: App Name + Display Name */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">App Name*</label>
              <input
                type="text"
                value={form.name}
                placeholder="e.g., Mobile Banking App"
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                placeholder="e.g., Mobile App"
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleChange("displayName", e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Description</label>
            <textarea
              value={form.description}
              placeholder="Describe the application..."
              className="w-full h-24 px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {/* Row 5: Developer Email + Add Products */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Developer Email*</label>
              <select
                value={form.developer_email}
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isFetchingDevelopers}
                onChange={(e) => handleChange("developer_email", e.target.value)}
              >
                <option value="">{isFetchingDevelopers ? "Loading developers..." : "Select Developer"}</option>
                {form.developer_email && !developers.includes(form.developer_email) && (
                  <option value={form.developer_email}>{form.developer_email}</option>
                )}
                {developers.map((dev) => (
                  <option key={dev} value={dev}>
                    {dev}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Add Products</label>
              <div ref={productDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={isFetchingProducts}
                  onClick={() => setIsProductDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-700 bg-[#0f172a] px-4 py-3 text-left text-gray-200 transition-colors hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="truncate text-sm">
                    {isFetchingProducts
                      ? "Loading products..."
                      : form.products.length > 0
                      ? `${form.products.length} product(s) selected`
                      : "Select products"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-500 transition-transform ${isProductDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isProductDropdownOpen && (
                  <div className="absolute z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-700 bg-[#0f172a] p-2 shadow-2xl">
                    {products.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-gray-500">No products available</div>
                    ) : (
                      products.map((product) => {
                        const productName = product.name;
                        const checked = form.products.includes(productName);
                        return (
                          <label
                            key={productName}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleProductToggle(productName)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>{productName}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {form.products.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.products.map((productName) => (
                    <span
                      key={productName}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                    >
                      {productName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 6: Company Name + Company Email */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Company Name</label>
              <input
                type="text"
                value={form.companyName}
                placeholder="e.g., Acme Corp"
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleChange("companyName", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Company Email</label>
              <input
                type="email"
                value={form.companyEmail}
                placeholder="e.g., contact@company.com"
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleChange("companyEmail", e.target.value)}
              />
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
            {editData ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}




// import { Check, ChevronDown, Pencil, Trash2, X } from "lucide-react";
// import { useEffect, useRef, useState, useMemo } from "react";
// import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
// import { apigeeApiFetch } from "../../../../services/apigeeApiService";
// import { getTrackingHeaders } from "../apigeeTracking";
// import useApigeeDevelopers from "../useApigeeDevelopers";
// import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";
// import API_BASE_URL from "../../../../config/apiConfig";

// // Helper to get unique values from array of objects
// const uniqueValues = (items, key) => [
//     ...new Set(items.map((item) => item[key]).filter(Boolean)),
// ].sort((a, b) => a.localeCompare(b));

// export default function CreateAppModal({
//     onClose,
//     editData,
//     organization = "",
//     environment = "",
//     developerEmail = "",
//     onboardingOptions = [],
//     isFetchingOnboardings = false,
//     defaultOnboardingId = "",
//     defaultMicroserviceId = "",
//     isGateway = false,
// }) {
//     const [form, setForm] = useState({
//         organization: editData?.org || editData?.organization || organization || "gen-ai-poc-onboarding",
//         environment: editData?.env || editData?.environment || environment || "dev",
//         name: editData?.name || "",
//         products: editData?.products || [],
//         developer_email: editData?.developer_email || developerEmail || "jagruti.d@krelixir.com",
//         isInternal: editData?.isInternal || "yes",
//         onboardingId: editData?.onboardingId || defaultOnboardingId || "",
//         microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
//         displayName: editData?.displayName || "",
//         description: editData?.description || "",
//         companyName: editData?.companyName || "",
//         companyEmail: editData?.companyEmail || "",
//     });

//     // Cascade fields state
//     const selectedOption = useMemo(
//         () => onboardingOptions.find((opt) => opt.onboardingId === form.onboardingId) || null,
//         [onboardingOptions, form.onboardingId]
//     );
//     const [businessUnit, setBusinessUnit] = useState(selectedOption?.businessUnit || "");
//     const [teamName, setTeamName] = useState(selectedOption?.teamName || "");

//     // Update cascade fields when selectedOption changes (e.g., after edit load)
//     useEffect(() => {
//         setBusinessUnit(selectedOption?.businessUnit || "");
//         setTeamName(selectedOption?.teamName || "");
//     }, [selectedOption]);

//     const [submitError, setSubmitError] = useState("");
//     const [products, setProducts] = useState([]);
//     const [isFetchingProducts, setIsFetchingProducts] = useState(false);
//     const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
//     const productDropdownRef = useRef(null);

//     const { organizations, isFetchingOrganizations } = useApigeeOrgEnvironmentOptions(form.organization);
//     const { developers, isFetchingDevelopers } = useApigeeDevelopers(form.organization);

//     const [gatewayBusinessUnits, setGatewayBusinessUnits] = useState([]);
//     const [isLoadingGatewayBU, setIsLoadingGatewayBU] = useState(false);
//     const [gatewayBUError, setGatewayBUError] = useState("");

//     const [selectedGatewayBU, setSelectedGatewayBU] = useState("");      // teamName
//     const [selectedGatewayAppName, setSelectedGatewayAppName] = useState("");

//     const userEmail = localStorage.getItem("userEmail") || "admin@forgecrux.com";

//     useEffect(() => {
//         if (!isGateway) return;
//         const fetchGatewayBusinessUnits = async () => {
//             setIsLoadingGatewayBU(true);
//             setGatewayBUError("");
//             try {
//                 const url = `${API_BASE_URL}/gatewayonboarding/api/v1/user/${encodeURIComponent(userEmail)}/business-units`;
//                 const response = await fetch(url);
//                 if (!response.ok) throw new Error(`HTTP ${response.status}`);
//                 const result = await response.json();
//                 if (result.status === "SUCCESS" && Array.isArray(result.data?.businessUnits)) {
//                     setGatewayBusinessUnits(result.data.businessUnits);
//                 } else {
//                     throw new Error("Invalid API response");
//                 }
//             } catch (err) {
//                 console.error("Gateway BU fetch failed:", err);
//                 setGatewayBUError(err.message || "Failed to load business units");
//             } finally {
//                 setIsLoadingGatewayBU(false);
//             }
//         };
//         fetchGatewayBusinessUnits();
//     }, [isGateway, userEmail]);

//     // Gateway cascade options
//     const gatewayBUOptions = useMemo(
//         () => uniqueValues(gatewayBusinessUnits, "teamName"),
//         [gatewayBusinessUnits]
//     );

//     const gatewayAppNameOptions = useMemo(() => {
//         if (!selectedGatewayBU) return [];
//         return uniqueValues(
//             gatewayBusinessUnits.filter((bu) => bu.teamName === selectedGatewayBU),
//             "applicationName"
//         );
//     }, [selectedGatewayBU, gatewayBusinessUnits]);

//     const gatewayAppIdOptions = useMemo(() => {
//         if (!selectedGatewayBU || !selectedGatewayAppName) return [];
//         return gatewayBusinessUnits.filter(
//             (bu) =>
//                 bu.teamName === selectedGatewayBU && bu.applicationName === selectedGatewayAppName
//         );
//     }, [selectedGatewayBU, selectedGatewayAppName, gatewayBusinessUnits]);

//     // When a specific Application ID is chosen (gateway mode)
//     const handleGatewayAppSelect = (onboardingId, microserviceId = "") => {
//         setForm((prev) => ({ ...prev, onboardingId, microserviceId }));
//     };

//     const handleGatewayBUChange = (nextBU) => {
//         setSelectedGatewayBU(nextBU);
//         setSelectedGatewayAppName("");
//         setForm((prev) => ({ ...prev, onboardingId: "", microserviceId: "" }));
//     };

//     const handleGatewayAppNameChange = (nextAppName) => {
//         setSelectedGatewayAppName(nextAppName);
//         setForm((prev) => ({ ...prev, onboardingId: "", microserviceId: "" }));
//     };

//     // Cascade options
//     const businessUnitOptions = useMemo(() => uniqueValues(onboardingOptions, "businessUnit"), [onboardingOptions]);
//     const teamOptions = useMemo(
//         () => uniqueValues(onboardingOptions.filter((opt) => opt.businessUnit === businessUnit), "teamName"),
//         [businessUnit, onboardingOptions]
//     );
//     const applicationOptions = useMemo(
//         () =>
//             onboardingOptions.filter(
//                 (opt) => opt.businessUnit === businessUnit && opt.teamName === teamName && opt.applicationId
//             ),
//         [businessUnit, teamName, onboardingOptions]
//     );

//     const handleChange = (key, value) => {
//         setForm((prev) => ({ ...prev, [key]: value }));
//     };

//     // Cascade change handlers
//     const handleBusinessUnitChange = (nextBusinessUnit) => {
//         setBusinessUnit(nextBusinessUnit);
//         setTeamName("");
//         handleChange("onboardingId", "");
//         handleChange("microserviceId", "");
//     };

//     const handleTeamChange = (nextTeamName) => {
//         setTeamName(nextTeamName);
//         handleChange("onboardingId", "");
//         handleChange("microserviceId", "");
//     };

//     const handleApplicationChange = (nextOnboardingId) => {
//         const option = onboardingOptions.find((item) => item.onboardingId === nextOnboardingId) || null;
//         handleChange("onboardingId", nextOnboardingId);
//         handleChange("microserviceId", option?.microserviceId || "");
//     };

//     const handleProductToggle = (productName) => {
//         setForm((prev) => {
//             const currentProducts = Array.isArray(prev.products) ? prev.products : [];
//             const nextProducts = currentProducts.includes(productName)
//                 ? currentProducts.filter((name) => name !== productName)
//                 : [...currentProducts, productName];
//             return { ...prev, products: nextProducts };
//         });
//     };

//     const fetchAppDetails = async (org, developer_email, name) => {
//         if (!org || !developer_email) return;
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.GET(org, developer_email, name));
//             const data = await res.json();
//             setForm((prev) => ({
//                 ...prev,
//                 organization: org,
//                 environment: data?.environments?.[0] || prev.environment,
//                 name: data?.name || "",
//                 products: (data?.credentials?.[0]?.apiProducts || [])
//                     .map((product) => product?.apiproduct || product?.name || product)
//                     .filter(Boolean),
//                 developer_email: data?.developer_email || prev.developer_email,
//             }));
//         } catch (e) {
//             console.error("Failed to fetch app details", e);
//         }
//     };

//     const fetchProducts = async (org) => {
//         if (!org) return;
//         setIsFetchingProducts(true);
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.LIST(org));
//             const data = await res.json();
//             const list = Array.isArray(data?.apiProduct)
//                 ? data.apiProduct
//                 : Array.isArray(data)
//                     ? data.map((item) => (typeof item === "string" ? { name: item } : item))
//                     : [];
//             setProducts(list);
//         } catch (e) {
//             console.error("Failed to fetch products", e);
//         }
//         setIsFetchingProducts(false);
//     };

//     useEffect(() => {
//         fetchProducts(form.organization);
//     }, [form.organization]);

//     useEffect(() => {
//         if (developers.length > 0 && !developers.includes(form.developer_email)) {
//             handleChange("developer_email", developers[0]);
//         }
//     }, [developers, form.developer_email]);

//     useEffect(() => {
//         if (editData?.name) {
//             fetchAppDetails(
//                 form.organization || organization || "gen-ai-poc-onboarding",
//                 form.developer_email || developerEmail || "jagruti.d@krelixir.com",
//                 editData?.name
//             );
//         }
//     }, [editData]);

//     useEffect(() => {
//         if (!isProductDropdownOpen) return undefined;
//         const handlePointerDown = (event) => {
//             if (!productDropdownRef.current?.contains(event.target)) {
//                 setIsProductDropdownOpen(false);
//             }
//         };
//         document.addEventListener("mousedown", handlePointerDown);
//         return () => document.removeEventListener("mousedown", handlePointerDown);
//     }, [isProductDropdownOpen]);

//     const handleSubmit = async () => {
//         setSubmitError("");
//         if (!form.onboardingId && !isGateway) {
//             setSubmitError("Application ID is required.");
//             return;
//         }
//         if (editData) {
//             await updateApp(form.organization, form.developer_email, editData.name);
//         } else {
//             await createApp(form.organization, form.developer_email);
//         }
//         onClose();
//     };

//     const createApp = async (org, developer_email) => {
//         if (!org || !developer_email) return;
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.CREATE(org, developer_email), {
//                 method: "POST",
//                 headers: getTrackingHeaders(form),
//                 body: JSON.stringify({
//                     name: form.name,
//                     apiProducts: form.products,
//                     keyExpiresIn: -1,
//                     attributes: [],
//                 }),
//             });
//             await res.json();
//         } catch (e) {
//             console.error("Failed to create app", e);
//         }
//     };

//     const updateApp = async (org, developer_email, name) => {
//         if (!org || !name || !developer_email) return;
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.UPDATE(org, developer_email, name), {
//                 method: "PUT",
//                 headers: getTrackingHeaders(form),
//                 body: JSON.stringify({
//                     name: form.name,
//                     apiProducts: form.products,
//                     keyExpiresIn: -1,
//                     attributes: [],
//                 }),
//             });
//             await res.json();
//         } catch (e) {
//             console.error("Failed to update app", e);
//         }
//     };
//     const isLoading = isGateway ? isLoadingGatewayBU : isFetchingOnboardings;
//     return (
//         <div className="fixed h-full inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
//             <div className="h-full w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">
//                 {/* Header */}
//                 <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
//                     <div>
//                         <h2 className="text-lg font-semibold text-white">{editData ? "Edit App" : "Create App"}</h2>
//                         <p className="text-sm text-gray-400">{!editData && "Create an App in a few simple steps."}</p>
//                     </div>
//                     <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
//                         <X size={24} />
//                     </button>
//                 </div>

//                 {/* Body */}
//                 <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>
//                     {/* Row 1: Project Id + Business Unit */}
//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Project Id*</label>
//                             <select
//                                 value={form.organization}
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("organization", e.target.value)}
//                             >
//                                 <option value="">{isFetchingOrganizations ? "Loading project ids..." : "Select Project Id"}</option>
//                                 {form.organization && !organizations.includes(form.organization) && (
//                                     <option value={form.organization}>{form.organization}</option>
//                                 )}
//                                 {organizations.map((org) => (
//                                     <option key={org} value={org}>
//                                         {org}
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Business Unit*</label>
//                             {!isGateway ? (
//                                 <select
//                                     value={businessUnit}
//                                     disabled={isFetchingOnboardings}
//                                     className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                     onChange={(e) => handleBusinessUnitChange(e.target.value)}
//                                 >
//                                     <option value="">
//                                         {isFetchingOnboardings ? "Loading business units..." : "Select Business Unit"}
//                                     </option>
//                                     {businessUnitOptions.map((unit) => (
//                                         <option key={unit} value={unit}>
//                                             {unit}
//                                         </option>
//                                     ))}
//                                 </select>
//                             ) : (
//                                 <>
//                                     <select
//                                         value={selectedGatewayBU}
//                                         disabled={isLoadingGatewayBU}
//                                         className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                         onChange={(e) => handleGatewayBUChange(e.target.value)}
//                                     >
//                                         <option value="">
//                                             {isLoadingGatewayBU ? "Loading business units..." : "Select Business Unit"}
//                                         </option>
//                                         {gatewayBUOptions.map((unit) => (
//                                             <option key={unit} value={unit}>
//                                                 {unit}
//                                             </option>
//                                         ))}
//                                     </select>
//                                     {gatewayBUError && (
//                                         <p className="text-xs text-red-400 mt-1">{gatewayBUError}</p>
//                                     )}
//                                 </>
//                             )}
//                         </div>
//                     </div>

//                     {/* Row 2: Application Name + Application ID */}
//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Application Name*</label>
//                             {!isGateway ? (
//                                 <select
//                                     value={teamName}
//                                     disabled={isFetchingOnboardings || !businessUnit}
//                                     className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                     onChange={(e) => handleTeamChange(e.target.value)}
//                                 >
//                                     <option value="">
//                                         {businessUnit ? "Select Application Name" : "Select a business unit first"}
//                                     </option>
//                                     {teamOptions.map((team) => (
//                                         <option key={team} value={team}>
//                                             {team}
//                                         </option>
//                                     ))}
//                                 </select>
//                             ) : (
//                                 <select
//                                     value={selectedGatewayAppName}
//                                     disabled={isLoadingGatewayBU || !selectedGatewayBU}
//                                     className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                     onChange={(e) => handleGatewayAppNameChange(e.target.value)}
//                                 >
//                                     <option value="">
//                                         {selectedGatewayBU ? "Select Application Name" : "Select a business unit first"}
//                                     </option>
//                                     {gatewayAppNameOptions.map((appName) => (
//                                         <option key={appName} value={appName}>
//                                             {appName}
//                                         </option>
//                                     ))}
//                                 </select>
//                             )}
//                         </div>
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Application ID*</label>
//                             {!isGateway ? (
//                                 <select
//                                     value={form.onboardingId || ""}
//                                     disabled={isFetchingOnboardings || !businessUnit || !teamName}
//                                     className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                     onChange={(e) => handleApplicationChange(e.target.value)}
//                                 >
//                                     <option value="">{teamName ? "Select Application ID" : "Select a team first"}</option>
//                                     {applicationOptions.map((opt) => (
//                                         <option key={opt.onboardingId} value={opt.onboardingId}>
//                                             {opt.applicationId}
//                                             {opt.applicationName ? ` - ${opt.applicationName}` : ""}
//                                         </option>
//                                     ))}
//                                 </select>
//                             ) : (
//                                 <select
//                                     value={form.onboardingId}
//                                     disabled={isLoadingGatewayBU || !selectedGatewayBU || !selectedGatewayAppName}
//                                     className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                     onChange={(e) => {
//                                         const selectedId = e.target.value;
//                                         const matched = gatewayAppIdOptions.find(
//                                             (opt) => opt.onboardingId === selectedId
//                                         );
//                                         if (matched) {
//                                             handleGatewayAppSelect(matched.onboardingId, matched.microserviceId || "");
//                                         } else {
//                                             handleGatewayAppSelect(selectedId, "");
//                                         }
//                                     }}
//                                 >
//                                     <option value="">
//                                         {selectedGatewayAppName ? "Select Application ID" : "Select an application name first"}
//                                     </option>
//                                     {gatewayAppIdOptions.map((opt) => (
//                                         <option key={opt.onboardingId} value={opt.onboardingId}>
//                                             {opt.applicationId}
//                                             {opt.applicationName ? ` - ${opt.applicationName}` : ""}
//                                         </option>
//                                     ))}
//                                 </select>
//                             )}
//                         </div>
//                     </div>

//                     {/* Row 3: App Name + Display Name */}
//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">App Name*</label>
//                             <input
//                                 type="text"
//                                 value={form.name}
//                                 placeholder="e.g., Mobile Banking App"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("name", e.target.value)}
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Display Name</label>
//                             <input
//                                 type="text"
//                                 value={form.displayName}
//                                 placeholder="e.g., Mobile App"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("displayName", e.target.value)}
//                             />
//                         </div>
//                     </div>

//                     {/* Row 4: Description */}
//                     <div>
//                         <label className="block text-sm text-gray-300 mb-2">Description</label>
//                         <textarea
//                             value={form.description}
//                             placeholder="Describe the application..."
//                             className="w-full h-24 px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             onChange={(e) => handleChange("description", e.target.value)}
//                         />
//                     </div>

//                     {/* Row 5: Developer Email + Add Products */}
//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Developer Email*</label>
//                             <select
//                                 value={form.developer_email}
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 disabled={isFetchingDevelopers}
//                                 onChange={(e) => handleChange("developer_email", e.target.value)}
//                             >
//                                 <option value="">{isFetchingDevelopers ? "Loading developers..." : "Select Developer"}</option>
//                                 {form.developer_email && !developers.includes(form.developer_email) && (
//                                     <option value={form.developer_email}>{form.developer_email}</option>
//                                 )}
//                                 {developers.map((dev) => (
//                                     <option key={dev} value={dev}>
//                                         {dev}
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Add Products</label>
//                             <div ref={productDropdownRef} className="relative">
//                                 <button
//                                     type="button"
//                                     disabled={isFetchingProducts}
//                                     onClick={() => setIsProductDropdownOpen((prev) => !prev)}
//                                     className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-700 bg-[#0f172a] px-4 py-3 text-left text-gray-200 transition-colors hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                 >
//                                     <span className="truncate text-sm">
//                                         {isFetchingProducts
//                                             ? "Loading products..."
//                                             : form.products.length > 0
//                                                 ? `${form.products.length} product(s) selected`
//                                                 : "Select products"}
//                                     </span>
//                                     <ChevronDown
//                                         size={16}
//                                         className={`shrink-0 text-gray-500 transition-transform ${isProductDropdownOpen ? "rotate-180" : ""}`}
//                                     />
//                                 </button>
//                                 {isProductDropdownOpen && (
//                                     <div className="absolute z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-700 bg-[#0f172a] p-2 shadow-2xl">
//                                         {products.length === 0 ? (
//                                             <div className="px-2 py-3 text-sm text-gray-500">No products available</div>
//                                         ) : (
//                                             products.map((product) => {
//                                                 const productName = product.name;
//                                                 const checked = form.products.includes(productName);
//                                                 return (
//                                                     <label
//                                                         key={productName}
//                                                         className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
//                                                     >
//                                                         <input
//                                                             type="checkbox"
//                                                             checked={checked}
//                                                             onChange={() => handleProductToggle(productName)}
//                                                             className="h-4 w-4 accent-primary"
//                                                         />
//                                                         <span>{productName}</span>
//                                                     </label>
//                                                 );
//                                             })
//                                         )}
//                                     </div>
//                                 )}
//                             </div>
//                             {form.products.length > 0 && (
//                                 <div className="mt-2 flex flex-wrap gap-1.5">
//                                     {form.products.map((productName) => (
//                                         <span
//                                             key={productName}
//                                             className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
//                                         >
//                                             {productName}
//                                         </span>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Row 6: Company Name + Company Email */}
//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Company Name</label>
//                             <input
//                                 type="text"
//                                 value={form.companyName}
//                                 placeholder="e.g., Acme Corp"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("companyName", e.target.value)}
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">Company Email</label>
//                             <input
//                                 type="email"
//                                 value={form.companyEmail}
//                                 placeholder="e.g., contact@company.com"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("companyEmail", e.target.value)}
//                             />
//                         </div>
//                     </div>

//                     {submitError && (
//                         <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//                             {submitError}
//                         </div>
//                     )}
//                 </div>

//                 {/* Footer */}
//                 <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
//                     <button onClick={onClose} className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
//                         Cancel
//                     </button>
//                     <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
//                         {editData ? "Update" : "Create"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
//     //   return (
//     //     <div className="fixed h-full inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
//     //       <div className="h-full w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">
//     //         {/* Header */}
//     //         <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
//     //           <div>
//     //             <h2 className="text-lg font-semibold text-white">{editData ? "Edit App" : "Create App"}</h2>
//     //             <p className="text-sm text-gray-400">{!editData && "Create an App in a few simple steps."}</p>
//     //           </div>
//     //           <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
//     //             <X size={24} />
//     //           </button>
//     //         </div>

//     //         {/* Body */}
//     //         <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>
//     //           {/* Row 1: Project Id + Business Unit */}
//     //           <div className="grid grid-cols-2 gap-6">
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Project Id*</label>
//     //               <select
//     //                 value={form.organization}
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //                 onChange={(e) => handleChange("organization", e.target.value)}
//     //               >
//     //                 <option value="">{isFetchingOrganizations ? "Loading project ids..." : "Select Project Id"}</option>
//     //                 {form.organization && !organizations.includes(form.organization) && (
//     //                   <option value={form.organization}>{form.organization}</option>
//     //                 )}
//     //                 {organizations.map((org) => (
//     //                   <option key={org} value={org}>
//     //                     {org}
//     //                   </option>
//     //                 ))}
//     //               </select>
//     //             </div>
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Business Unit*</label>
//     //               <select
//     //                 value={businessUnit}
//     //                 disabled={isFetchingOnboardings}
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//     //                 onChange={(e) => handleBusinessUnitChange(e.target.value)}
//     //               >
//     //                 <option value="">
//     //                   {isFetchingOnboardings ? "Loading business units..." : "Select Business Unit"}
//     //                 </option>
//     //                 {businessUnitOptions.map((unit) => (
//     //                   <option key={unit} value={unit}>
//     //                     {unit}
//     //                   </option>
//     //                 ))}
//     //               </select>
//     //             </div>
//     //           </div>

//     //           {/* Row 2: Team Name (Application Name) + Application Id */}
//     //           <div className="grid grid-cols-2 gap-6">
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Application Name*</label>
//     //               <select
//     //                 value={teamName}
//     //                 disabled={isFetchingOnboardings || !businessUnit}
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//     //                 onChange={(e) => handleTeamChange(e.target.value)}
//     //               >
//     //                 <option value="">
//     //                   {businessUnit ? "Select Application Name" : "Select a business unit first"}
//     //                 </option>
//     //                 {teamOptions.map((team) => (
//     //                   <option key={team} value={team}>
//     //                     {team}
//     //                   </option>
//     //                 ))}
//     //               </select>
//     //             </div>
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Application ID*</label>
//     //               <select
//     //                 value={form.onboardingId || ""}
//     //                 disabled={isFetchingOnboardings || !businessUnit || !teamName}
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//     //                 onChange={(e) => handleApplicationChange(e.target.value)}
//     //               >
//     //                 <option value="">{teamName ? "Select Application ID" : "Select a team first"}</option>
//     //                 {applicationOptions.map((opt) => (
//     //                   <option key={opt.onboardingId} value={opt.onboardingId}>
//     //                     {opt.applicationId}
//     //                     {opt.applicationName ? ` - ${opt.applicationName}` : ""}
//     //                   </option>
//     //                 ))}
//     //               </select>
//     //             </div>
//     //           </div>

//     //           {/* Row 3: App Name + Display Name */}
//     //           <div className="grid grid-cols-2 gap-6">
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">App Name*</label>
//     //               <input
//     //                 type="text"
//     //                 value={form.name}
//     //                 placeholder="e.g., Mobile Banking App"
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //                 onChange={(e) => handleChange("name", e.target.value)}
//     //               />
//     //             </div>
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Display Name</label>
//     //               <input
//     //                 type="text"
//     //                 value={form.displayName}
//     //                 placeholder="e.g., Mobile App"
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //                 onChange={(e) => handleChange("displayName", e.target.value)}
//     //               />
//     //             </div>
//     //           </div>

//     //           {/* Row 4: Description */}
//     //           <div>
//     //             <label className="block text-sm text-gray-300 mb-2">Description</label>
//     //             <textarea
//     //               value={form.description}
//     //               placeholder="Describe the application..."
//     //               className="w-full h-24 px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //               onChange={(e) => handleChange("description", e.target.value)}
//     //             />
//     //           </div>

//     //           {/* Row 5: Developer Email + Add Products */}
//     //           <div className="grid grid-cols-2 gap-6">
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Developer Email*</label>
//     //               <select
//     //                 value={form.developer_email}
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //                 disabled={isFetchingDevelopers}
//     //                 onChange={(e) => handleChange("developer_email", e.target.value)}
//     //               >
//     //                 <option value="">{isFetchingDevelopers ? "Loading developers..." : "Select Developer"}</option>
//     //                 {form.developer_email && !developers.includes(form.developer_email) && (
//     //                   <option value={form.developer_email}>{form.developer_email}</option>
//     //                 )}
//     //                 {developers.map((dev) => (
//     //                   <option key={dev} value={dev}>
//     //                     {dev}
//     //                   </option>
//     //                 ))}
//     //               </select>
//     //             </div>
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Add Products</label>
//     //               <div ref={productDropdownRef} className="relative">
//     //                 <button
//     //                   type="button"
//     //                   disabled={isFetchingProducts}
//     //                   onClick={() => setIsProductDropdownOpen((prev) => !prev)}
//     //                   className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-700 bg-[#0f172a] px-4 py-3 text-left text-gray-200 transition-colors hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//     //                 >
//     //                   <span className="truncate text-sm">
//     //                     {isFetchingProducts
//     //                       ? "Loading products..."
//     //                       : form.products.length > 0
//     //                       ? `${form.products.length} product(s) selected`
//     //                       : "Select products"}
//     //                   </span>
//     //                   <ChevronDown
//     //                     size={16}
//     //                     className={`shrink-0 text-gray-500 transition-transform ${isProductDropdownOpen ? "rotate-180" : ""}`}
//     //                   />
//     //                 </button>
//     //                 {isProductDropdownOpen && (
//     //                   <div className="absolute z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-700 bg-[#0f172a] p-2 shadow-2xl">
//     //                     {products.length === 0 ? (
//     //                       <div className="px-2 py-3 text-sm text-gray-500">No products available</div>
//     //                     ) : (
//     //                       products.map((product) => {
//     //                         const productName = product.name;
//     //                         const checked = form.products.includes(productName);
//     //                         return (
//     //                           <label
//     //                             key={productName}
//     //                             className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
//     //                           >
//     //                             <input
//     //                               type="checkbox"
//     //                               checked={checked}
//     //                               onChange={() => handleProductToggle(productName)}
//     //                               className="h-4 w-4 accent-primary"
//     //                             />
//     //                             <span>{productName}</span>
//     //                           </label>
//     //                         );
//     //                       })
//     //                     )}
//     //                   </div>
//     //                 )}
//     //               </div>
//     //               {form.products.length > 0 && (
//     //                 <div className="mt-2 flex flex-wrap gap-1.5">
//     //                   {form.products.map((productName) => (
//     //                     <span
//     //                       key={productName}
//     //                       className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
//     //                     >
//     //                       {productName}
//     //                     </span>
//     //                   ))}
//     //                 </div>
//     //               )}
//     //             </div>
//     //           </div>

//     //           {/* Row 6: Company Name + Company Email */}
//     //           <div className="grid grid-cols-2 gap-6">
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Company Name</label>
//     //               <input
//     //                 type="text"
//     //                 value={form.companyName}
//     //                 placeholder="e.g., Acme Corp"
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //                 onChange={(e) => handleChange("companyName", e.target.value)}
//     //               />
//     //             </div>
//     //             <div>
//     //               <label className="block text-sm text-gray-300 mb-2">Company Email</label>
//     //               <input
//     //                 type="email"
//     //                 value={form.companyEmail}
//     //                 placeholder="e.g., contact@company.com"
//     //                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//     //                 onChange={(e) => handleChange("companyEmail", e.target.value)}
//     //               />
//     //             </div>
//     //           </div>

//     //           {submitError && (
//     //             <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//     //               {submitError}
//     //             </div>
//     //           )}
//     //         </div>

//     //         {/* Footer */}
//     //         <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
//     //           <button onClick={onClose} className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
//     //             Cancel
//     //           </button>
//     //           <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
//     //             {editData ? "Update" : "Create"}
//     //           </button>
//     //         </div>
//     //       </div>
//     //     </div>
//     //   );
// }


// import { Check, ChevronDown, Pencil, Trash2, X } from "lucide-react";
// import { useEffect, useRef, useState } from "react";
// import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
// import { apigeeApiFetch } from "../../../../services/apigeeApiService";
// import { getTrackingHeaders } from "../apigeeTracking";
// import OnboardingCascadeSelect from "../OnboardingCascadeSelect";
// import useApigeeDevelopers from "../useApigeeDevelopers";
// import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";

// export default function CreateAppModal({
//     onClose,
//     editData,
//     organization = "",
//     environment = "",
//     developerEmail = "",
//     onboardingOptions = [],
//     isFetchingOnboardings = false,
//     defaultOnboardingId = "",
//     defaultMicroserviceId = "",
//     isGateway = false,
// }) {
//     const [form, setForm] = useState({
//         organization: editData?.org || editData?.organization || organization || "gen-ai-poc-onboarding",
//         environment: editData?.env || editData?.environment || environment || "dev",
//         name: editData?.name || "",
//         products: editData?.products || [],
//         developer_email: editData?.developer_email || developerEmail || "jagruti.d@krelixir.com",
//         isInternal: editData?.isInternal || "yes",
//         onboardingId: editData?.onboardingId || defaultOnboardingId || "",
//         microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
//     });
//     const [submitError, setSubmitError] = useState("");
//     const [products, setProducts] = useState([]);
//     const [isFetchingProducts, setIsFetchingProducts] = useState(false);
//     const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
//     const productDropdownRef = useRef(null);
//     const {
//         organizations,
//         isFetchingOrganizations,
//     } = useApigeeOrgEnvironmentOptions(form.organization);
//     const { developers, isFetchingDevelopers } = useApigeeDevelopers(form.organization);

//     const handleChange = (key, value) => {
//         setForm(prev => ({ ...prev, [key]: value }));
//     };
//     const handleOnboardingChange = (onboardingId, option) => {
//         setForm(prev => ({
//             ...prev,
//             onboardingId,
//             microserviceId: option?.microserviceId || "",
//         }));
//     };

//     const handleProductToggle = (productName) => {
//         setForm(prev => {
//             const currentProducts = Array.isArray(prev.products) ? prev.products : [];
//             const nextProducts = currentProducts.includes(productName)
//                 ? currentProducts.filter((name) => name !== productName)
//                 : [...currentProducts, productName];

//             return { ...prev, products: nextProducts };
//         });
//     };
//     const fetchAppDetails = async (org, developer_email, name) => {
//         if (!org || !developer_email) return;

//         try {
//             const res = await apigeeApiFetch(
//                 APIGEE_ENDPOINTS.APPS.GET(org, developer_email, name)
//             );

//             const data = await res.json();

//             setForm(prev => ({
//                 ...prev,
//                 organization: org,
//                 environment: data?.environments?.[0] || prev.environment,
//                 name: data?.name || "",
//                 products: (data?.credentials?.[0]?.apiProducts || [])
//                     .map((product) => product?.apiproduct || product?.name || product)
//                     .filter(Boolean),
//                 developer_email: data?.developer_email || prev.developer_email,
//             }));

//         } catch (e) {
//             console.error("Failed to fetch target servers", e);
//         }
//     };

//     const fetchProducts = async (org) => {
//         if (!org) return;
//         setIsFetchingProducts(true);
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.LIST(org));
//             const data = await res.json();
//             const list = Array.isArray(data?.apiProduct)
//                 ? data.apiProduct
//                 : Array.isArray(data)
//                     ? data.map((item) => (typeof item === 'string' ? { name: item } : item))
//                     : [];
//             setProducts(list);
//         } catch (e) {
//             console.error('Failed to fetch products', e);
//         }
//         setIsFetchingProducts(false);
//     };
//     useEffect(() => {
//         fetchProducts(form.organization);
//     }, [form.organization]);

//     useEffect(() => {
//         if (developers.length > 0 && !developers.includes(form.developer_email)) {
//             handleChange("developer_email", developers[0]);
//         }
//     }, [developers, form.developer_email]);

//     useEffect(() => {
//         if(editData?.name){

//             fetchAppDetails(form.organization || organization || 'gen-ai-poc-onboarding', form.developer_email || developerEmail || 'jagruti.d@krelixir.com', editData?.name)
//         }
//     }, [editData])

//     useEffect(() => {
//         if (!isProductDropdownOpen) return undefined;

//         const handlePointerDown = (event) => {
//             if (!productDropdownRef.current?.contains(event.target)) {
//                 setIsProductDropdownOpen(false);
//             }
//         };

//         document.addEventListener("mousedown", handlePointerDown);
//         return () => document.removeEventListener("mousedown", handlePointerDown);
//     }, [isProductDropdownOpen]);

//     const handleSubmit = async () => {
//         setSubmitError("");
//         if (!form.onboardingId && !isGateway) {
//             setSubmitError("Onboarding Id is required.");
//             return;
//         }

//         if (editData) {
//             await updateApp(form.organization, form.developer_email, editData.name);
//             console.log("Update API", form);
//         } else {
//             await createApp(form.organization, form.developer_email);
//         }
//         onClose();
//     };

//     const createApp = async (org, developer_email) => {
//         if (!org || !developer_email) return;
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.CREATE(org, developer_email), {
//                 method: 'POST',
//                 headers: getTrackingHeaders(form),
//                 body: JSON.stringify({
//                     name: form.name,
//                     apiProducts: form.products,
//                     keyExpiresIn: -1,
//                     attributes: []
//                 }),
//             });
//             await res.json();
//         } catch (e) {
//             console.error('Failed to create app', e);
//         }
//     };
//     const updateApp = async (org, developer_email, name) => {
//         if (!org || !name || !developer_email) return;
//         try {
//             const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.UPDATE(org, developer_email, name), {
//                 method: 'PUT',
//                 headers: getTrackingHeaders(form),
//                 body: JSON.stringify({
//                     name: form.name,
//                     apiProducts: form.products,
//                     keyExpiresIn: -1,
//                     attributes: []
//                 }),
//             });
//             await res.json();
//         } catch (e) {
//             console.error('Failed to update app', e);
//         }
//     };

//     return (
//         <div className="fixed h-full inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

//             <div className="h-full w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

//                 {/* Header */}
//                 <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
//                     <div>
//                         <h2 className="text-lg font-semibold text-white">
//                             {editData ? "Edit App" : "Create App"}
//                         </h2>
//                         <p className="text-sm text-gray-400">
//                             {!editData && "Create a App in a few simple steps."}
//                         </p>
//                     </div>

//                     <button
//                         onClick={onClose}
//                         className="text-gray-400 hover:text-white text-lg"
//                     >
//                         <X size={24} />
//                     </button>
//                 </div>

//                 {/* Body */}
//                 <div
//                     className="p-6 space-y-6 overflow-y-auto modal-body"
//                     style={{ height: "calc(100% - 9rem)" }}
//                 >
//                     <div className="grid grid-cols-2 gap-6">
//                         <OnboardingCascadeSelect
//                             value={form.onboardingId}
//                             onChange={handleOnboardingChange}
//                             options={onboardingOptions}
//                             isLoading={isFetchingOnboardings}
//                             required
//                             className="col-span-2"
//                             selectClassName="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                         />

//                         {/* App Name */}
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 App Name*
//                             </label>
//                             <input
//                                 type="text"
//                                 value={form.name}
//                                 placeholder="e.g., Mobile Banking App"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("name", e.target.value)}
//                             />
//                         </div>

//                         {/* Display Name */}
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 Display Name
//                             </label>
//                             <input
//                                 type="text"
//                                 placeholder="e.g., Mobile App"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("displayName", e.target.value)}
//                             />
//                         </div>
//                     </div>
//                     {/* Description */}
//                     <div>
//                         <label className="block text-sm text-gray-300 mb-2">
//                             Description
//                         </label>
//                         <textarea
//                             placeholder="Describe the application..."
//                             className="w-full h-24 px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             onChange={(e) => handleChange("description", e.target.value)}
//                         />
//                     </div>

//                     {/* Row 1 */}
//                     <div className="grid grid-cols-2 gap-6">
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 Project Id
//                             </label>
//                             <select
//                                 value={form.organization}
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("organization", e.target.value)}
//                             >
//                                 <option value="">
//                                     {isFetchingOrganizations ? "Loading project ids..." : "Select Project Id"}
//                                 </option>
//                                 {form.organization && !organizations.includes(form.organization) && (
//                                     <option value={form.organization}>{form.organization}</option>
//                                 )}
//                                 {organizations.map((org) => (
//                                     <option key={org} value={org}>{org}</option>
//                                 ))}
//                             </select>
//                         </div>

//                         {/* Product Names */}
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 Product Names
//                             </label>
//                             <div ref={productDropdownRef} className="relative">
//                                 <button
//                                     type="button"
//                                     disabled={isFetchingProducts}
//                                     onClick={() => setIsProductDropdownOpen((prev) => !prev)}
//                                     className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-700 bg-[#0f172a] px-4 py-3 text-left text-gray-200 transition-colors hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
//                                 >
//                                     <span className="truncate text-sm">
//                                         {isFetchingProducts
//                                             ? "Loading products..."
//                                             : form.products.length > 0
//                                                 ? `${form.products.length} product(s) selected`
//                                                 : "Select products"}
//                                     </span>
//                                     <ChevronDown
//                                         size={16}
//                                         className={`shrink-0 text-gray-500 transition-transform ${isProductDropdownOpen ? "rotate-180" : ""}`}
//                                     />
//                                 </button>

//                                 {isProductDropdownOpen && (
//                                     <div className="absolute z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-700 bg-[#0f172a] p-2 shadow-2xl">
//                                         {products.length === 0 ? (
//                                             <div className="px-2 py-3 text-sm text-gray-500">No products available</div>
//                                         ) : (
//                                             products.map((product) => {
//                                                 const productName = product.name;
//                                                 const checked = form.products.includes(productName);

//                                                 return (
//                                                     <label
//                                                         key={productName}
//                                                         className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
//                                                     >
//                                                         <input
//                                                             type="checkbox"
//                                                             checked={checked}
//                                                             onChange={() => handleProductToggle(productName)}
//                                                             className="h-4 w-4 accent-primary"
//                                                         />
//                                                         <span>{productName}</span>
//                                                     </label>
//                                                 );
//                                             })
//                                         )}
//                                     </div>
//                                 )}
//                             </div>
//                             {form.products.length > 0 && (
//                                 <div className="mt-2 flex flex-wrap gap-1.5">
//                                     {form.products.map((productName) => (
//                                         <span
//                                             key={productName}
//                                             className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
//                                         >
//                                             {productName}
//                                         </span>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>

//                         {/* Developer Email */}
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 Developer Email
//                             </label>
//                             <select
//                                 value={form.developer_email}
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 disabled={isFetchingDevelopers}
//                                 onChange={(e) => handleChange("developer_email", e.target.value)}
//                             >
//                                 <option value="">
//                                     {isFetchingDevelopers ? "Loading developers..." : "Select Developer"}
//                                 </option>
//                                 {form.developer_email && !developers.includes(form.developer_email) && (
//                                     <option value={form.developer_email}>{form.developer_email}</option>
//                                 )}
//                                 {developers.map((developer) => (
//                                     <option key={developer} value={developer}>{developer}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     </div>

//                     {/* Row 2 */}
//                     <div className="grid grid-cols-2 gap-6">
//                         {/* Company Name */}
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 Company Name
//                             </label>
//                             <input
//                                 type="text"
//                                 placeholder="e.g., Acme Corp"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("companyName", e.target.value)}
//                             />
//                         </div>

//                         {/* Company Email */}
//                         <div>
//                             <label className="block text-sm text-gray-300 mb-2">
//                                 Company Email
//                             </label>
//                             <input
//                                 type="email"
//                                 placeholder="e.g., contact@company.com"
//                                 className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 onChange={(e) => handleChange("companyEmail", e.target.value)}
//                             />
//                         </div>
//                     </div>

//                     {submitError && (
//                         <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//                             {submitError}
//                         </div>
//                     )}
//                 </div>

//                 {/* Footer */}
//                 <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
//                     <button
//                         onClick={onClose}
//                         className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
//                     >
//                         Cancel
//                     </button>

//                     <button
//                         onClick={handleSubmit}
//                         className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
//                     >
//                         {editData ? "Update" : "Create"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }
