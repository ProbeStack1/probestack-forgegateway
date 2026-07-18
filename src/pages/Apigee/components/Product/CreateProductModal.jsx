import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../../services/apigeeApiService";
import { getTrackingHeaders } from "../apigeeTracking";
import OnboardingCascadeSelect from "../OnboardingCascadeSelect";
import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";

export default function CreateProductModal({
    onClose,
    editData,
    organization = "",
    environment = "",
    onboardingOptions = [],
    isFetchingOnboardings = false,
    defaultOnboardingId = "",
    defaultMicroserviceId = "",
}) {
    const [form, setForm] = useState({
        organization: editData?.org || editData?.organization || organization || "gen-ai-poc-onboarding",
        environment: editData?.env || editData?.environment || environment || "dev",
        name: editData?.name || "",
        displayName: editData?.displayName || "",
        port: editData?.port || "",
        proxies: editData?.proxies || editData?.apiResources || [],
        isInternal: editData?.isInternal || "yes",
        onboardingId: editData?.onboardingId || defaultOnboardingId || "",
        microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
    });

    const [monetization, setMonetization] = useState(false);
    const [proxies, setProxies] = useState([]);
    const [isFetchingProxies, setIsFetchingProxies] = useState(false);
    const [isProxyDropdownOpen, setIsProxyDropdownOpen] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const proxyDropdownRef = useRef(null);
    const {
        organizations,
        environments,
        isFetchingOrganizations,
        isFetchingEnvironments,
    } = useApigeeOrgEnvironmentOptions(form.organization);

    const inputStyle =
        "w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary";

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };
    const handleOnboardingChange = (onboardingId, option) => {
        setForm(prev => ({
            ...prev,
            onboardingId,
            microserviceId: option?.microserviceId || "",
        }));
    };

    const handleProxyToggle = (proxyName) => {
        setForm(prev => {
            const currentProxies = Array.isArray(prev.proxies) ? prev.proxies : [];
            const nextProxies = currentProxies.includes(proxyName)
                ? currentProxies.filter((name) => name !== proxyName)
                : [...currentProxies, proxyName];

            return { ...prev, proxies: nextProxies };
        });
    };

    const normalizeProxyList = (data) => {
        const rawList = Array.isArray(data)
            ? data
            : Array.isArray(data?.proxies)
                ? data.proxies
                : Array.isArray(data?.apiProxy)
                    ? data.apiProxy
                    : Array.isArray(data?.apiProxies)
                        ? data.apiProxies
                        : Array.isArray(data?.apis)
                            ? data.apis
                            : [];

        return rawList
            .map((item) => (typeof item === "string" ? item : item?.name || item?.displayName || item?.id))
            .filter(Boolean);
    };

    const fetchProxies = async (org = form.organization) => {
        if (!org) return;
        setIsFetchingProxies(true);
        try {
            const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APIS.LIST(org));
            const data = await res.json();
            setProxies(normalizeProxyList(data));
        } catch (e) {
            console.error("Failed to fetch proxies", e);
            setProxies([]);
        }
        setIsFetchingProxies(false);
    };

    const fetchProductDetails = async (org, name) => {
        if (!org || !name) return;

        try {
            const res = await apigeeApiFetch(
                APIGEE_ENDPOINTS.PRODUCTS.GET(org, name)
            );

            const data = await res.json();

            setForm(prev => ({
                ...prev,
                organization: org,
                environment: data?.environments?.[0] || prev.environment,
                name: data?.name || "",
                displayName: data?.displayName || "",
                proxies: Array.isArray(data?.proxies)
                    ? data.proxies
                    : Array.isArray(data?.apiResources)
                        ? data.apiResources
                        : [],
            }));

        } catch (e) {
            console.error("Failed to fetch product details", e);
        }
    };

    useEffect(() => {
        if(editData?.name){

            fetchProductDetails(form.organization || organization || 'gen-ai-poc-onboarding', editData?.name)
        }
    }, [editData])

    useEffect(() => {
        if (form.organization) fetchProxies(form.organization);
    }, [form.organization]);

    useEffect(() => {
        if (!isProxyDropdownOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!proxyDropdownRef.current?.contains(event.target)) {
                setIsProxyDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isProxyDropdownOpen]);

    const handleSubmit = async () => {
        setSubmitError("");
        if (!form.onboardingId) {
            setSubmitError("Onboarding Id is required.");
            return;
        }

        if (editData) {
            await updateProduct(form.organization, form.name);
            console.log("Update API", form);
        } else {
            await createProduct(form.organization);
        }
        onClose();
    };

    const createProduct = async (org) => {
        if (!org) return;
        try {
            const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.CREATE(org), {
                method: 'POST',
                headers: getTrackingHeaders(form),
                body: JSON.stringify({
                    name: form.name,
                    displayName: form.displayName,
                    approvalType: "auto",
                    environments: [form.environment],
                    proxies: form.proxies
                }),
            });
            await res.json();
        } catch (e) {
            console.error('Failed to create product', e);
        }
    };
    const updateProduct = async (org, name) => {
        if (!org || !name) return;
        try {
            const res = await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.UPDATE(org, name), {
                method: 'PUT',
                headers: getTrackingHeaders(form),
                body: JSON.stringify({
                    name: form.name,
                    displayName: form.displayName,
                    approvalType: "auto",
                    environments: [form.environment],
                    proxies: form.proxies
                }),
            });
            await res.json();
        } catch (e) {
            console.error('Failed to update product', e);
        }
    };

    return (
        <div className="h-full fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

            <div className="h-[90vh] w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {editData ? "Edit Product" : "Create Product"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {!editData && "Create a product in a few simple steps."}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-lg"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto" style={{ height: "calc(100% - 9rem)" }}>

                    {/* Section Title */}
                    <h2 className="text-lg font-semibold text-gray-200">Product Details</h2>

                    {/* Row 1 */}
                    <div className="grid grid-cols-2 gap-6">
                        <OnboardingCascadeSelect
                            value={form.onboardingId}
                            onChange={handleOnboardingChange}
                            options={onboardingOptions}
                            isLoading={isFetchingOnboardings}
                            required
                            className="col-span-2"
                            selectClassName={inputStyle}
                        />

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Project Id*</label>
                            <select
                                value={form.organization}
                                className={inputStyle}
                                onChange={(e) => handleChange("organization", e.target.value)}
                            >
                                <option value="">Select Project Id</option>
                                {isFetchingOrganizations && (
                                    <option value={form.organization}>Loading project ids...</option>
                                )}
                                {form.organization && !organizations.includes(form.organization) && (
                                    <option value={form.organization}>{form.organization}</option>
                                )}
                                {organizations.map((org) => (
                                    <option key={org} value={org}>{org}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                A organization is the top-level container in the platform
                            </p>
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Environment *</label>
                            <select
                                value={form.environment}
                                className={inputStyle}
                                disabled={isFetchingEnvironments}
                                onChange={(e) => handleChange("environment", e.target.value)}
                            >
                                <option value="">Select Environments</option>
                                {isFetchingEnvironments && (
                                    <option value={form.environment}>Loading environments...</option>
                                )}
                                {form.environment && !environments.includes(form.environment) && (
                                    <option value={form.environment}>{form.environment}</option>
                                )}
                                {environments.map((envName) => (
                                    <option key={envName} value={envName}>{envName}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Environment where APIs are deployed
                            </p>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Product Name *</label>
                            <input
                                value={form.name}
                                placeholder="Enter Product Name"
                                className={inputStyle}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Display Name *</label>
                            <input
                                value={form.displayName}
                                placeholder="Enter Display Name"
                                className={inputStyle}
                                onChange={(e) => handleChange("displayName", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Description *</label>
                            <input
                                placeholder="Enter Description"
                                className={inputStyle}
                                onChange={(e) => handleChange("description", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Access *</label>
                            <select
                                className={inputStyle}
                                onChange={(e) => handleChange("access", e.target.value)}
                            >
                                <option value="">Select Access</option>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="internal">Internal</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 mb-1 block">Proxies</label>
                        <div ref={proxyDropdownRef} className="relative">
                            <button
                                type="button"
                                disabled={isFetchingProxies || !form.organization}
                                onClick={() => setIsProxyDropdownOpen((prev) => !prev)}
                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-left text-sm text-white transition-colors hover:border-dark-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="truncate">
                                    {isFetchingProxies
                                        ? "Loading proxies..."
                                        : form.proxies.length > 0
                                            ? `${form.proxies.length} proxy/proxies selected`
                                            : "Select proxies"}
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={`shrink-0 text-gray-500 transition-transform ${isProxyDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isProxyDropdownOpen && (
                                <div className="absolute z-50 mt-2 max-h-52 w-full overflow-y-auto rounded-lg border border-dark-700 bg-[#0f172a] p-2 shadow-2xl">
                                    {proxies.length === 0 ? (
                                        <div className="px-2 py-3 text-sm text-gray-500">No proxies available</div>
                                    ) : (
                                        proxies.map((proxyName) => {
                                            const checked = form.proxies.includes(proxyName);

                                            return (
                                                <label
                                                    key={proxyName}
                                                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => handleProxyToggle(proxyName)}
                                                        className="h-4 w-4 accent-primary"
                                                    />
                                                    <span>{proxyName}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                        {form.proxies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {form.proxies.map((proxyName) => (
                                    <span
                                        key={proxyName}
                                        className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                                    >
                                        {proxyName}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Selected proxies are sent in the product payload under the proxies key.
                        </p>
                    </div>

                    {submitError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {submitError}
                        </div>
                    )}

                    {/* Monetization */}
                    <div className="flex items-center justify-between border border-gray-700 rounded-lg p-4 bg-[#0f172a]">
                        <div>
                            <p className="text-sm text-gray-200 font-medium">Monetization *</p>
                            <p className="text-xs text-gray-500">
                                Monetize your APIs to generate revenue
                            </p>
                        </div>

                        <button
                            onClick={() => setMonetization(!monetization)}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition ${monetization ? "bg-blue-600" : "bg-gray-600"
                                }`}
                        >
                            <div
                                className={`w-4 h-4 bg-white rounded-full transform transition ${monetization ? "translate-x-6" : ""
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Quota Section */}
                    {/* {monetization && ( */}
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Quota</label>
                            <input
                                placeholder="100000"
                                className={inputStyle}
                                onChange={(e) => handleChange("quota", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Requests every *</label>
                            <input
                                placeholder="1"
                                className={inputStyle}
                                onChange={(e) => handleChange("interval", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-300 mb-1 block">Unit</label>
                            <select
                                className={inputStyle}
                                onChange={(e) => handleChange("unit", e.target.value)}
                            >
                                <option>Day</option>
                                <option>Hour</option>
                                <option>Minute</option>
                            </select>
                        </div>
                    </div>
                    {/* )} */}
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-dark-700 modal-footer" style={{ height: "4.5rem" }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                    >
                        {editData ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}
