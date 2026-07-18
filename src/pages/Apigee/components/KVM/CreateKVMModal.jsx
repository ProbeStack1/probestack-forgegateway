import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
import { apigeeApiFetch } from "../../../../services/apigeeApiService";
import { getTrackingHeaders } from "../apigeeTracking";
import OnboardingCascadeSelect from "../OnboardingCascadeSelect";
import useApigeeOrgEnvironmentOptions from "../useApigeeOrgEnvironmentOptions";

export default function CreateKVMModal({
    onClose,
    editData,
    onSuccess,
    organization = "",
    environment = "",
    onboardingOptions = [],
    isFetchingOnboardings = false,
    defaultOnboardingId = "",
    defaultMicroserviceId = "",
}) {
    const resolvedOrganization = editData?.org || editData?.projectId || editData?.organization || organization || "";
    const resolvedEnvironment = editData?.env || editData?.environment || environment || "";

    const [form, setForm] = useState({
        organization: resolvedOrganization,
        environment: resolvedEnvironment,
        name: editData?.name || "",
        host: editData?.host || "",
        port: editData?.port || "",
        isInternal: editData?.isInternal || "yes",
        onboardingId: editData?.onboardingId || defaultOnboardingId || "",
        microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const {
        organizations,
        environments,
        isFetchingOrganizations,
        isFetchingEnvironments,
    } = useApigeeOrgEnvironmentOptions(form.organization);

    // State for grid
    const [entries, setEntries] = useState([
        { id: Date.now(), key: "", value: "", isEditing: true }
    ]);
    const [search, setSearch] = useState("");

    // Handlers
    const handleAddEntry = () => {
        setEntries(prev => [
            ...prev,
            { id: Date.now(), key: "", value: "", isEditing: true }
        ]);
    };

    const handleEntryChange = (id, field, value) => {
        setEntries(prev =>
            prev.map(e => (e.id === id ? { ...e, [field]: value } : e))
        );
    };

    const handleSaveEntry = (id) => {
        setEntries(prev =>
            prev.map(e => (e.id === id ? { ...e, isEditing: false } : e))
        );
    };

    const handleEditEntry = (id) => {
        setEntries(prev =>
            prev.map(e => (e.id === id ? { ...e, isEditing: true } : e))
        );
    };

    const handleDeleteEntry = (id) => {
        setEntries(prev => prev.filter(e => e.id !== id));
    };

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

    const fetchKVMEntries = async (org, environment, kvmName) => {
        if (!org || !environment || !kvmName) return;

        try {
            const listResponse = await apigeeApiFetch(
                APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.LIST(org, environment, kvmName)
            );

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Failed to fetch KVM entries: ${listResponse.status} ${errorText}`);
            }

            const listData = await listResponse.json();
            const rawEntries = Array.isArray(listData)
                ? listData
                : Array.isArray(listData?.keyValueEntries)
                    ? listData.keyValueEntries
                : Array.isArray(listData?.entry)
                    ? listData.entry
                    : Array.isArray(listData?.entries)
                        ? listData.entries
                        : [];

            const normalizedEntries = await Promise.all(
                rawEntries.map(async (entry, index) => {
                    if (entry && typeof entry === "object" && "name" in entry && "value" in entry) {
                        return {
                            id: Date.now() + index,
                            key: entry.name || "",
                            value: entry.value || "",
                            isEditing: false,
                        };
                    }

                    const entryName =
                        typeof entry === "string"
                            ? entry
                            : entry?.name || entry?.key || "";

                    if (!entryName) {
                        return null;
                    }

                    const entryResponse = await apigeeApiFetch(
                        APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.GET(org, environment, kvmName, entryName)
                    );

                    if (!entryResponse.ok) {
                        const errorText = await entryResponse.text();
                        throw new Error(
                            `Failed to fetch KVM entry "${entryName}": ${entryResponse.status} ${errorText}`
                        );
                    }

                    const entryData = await entryResponse.json();

                    return {
                        id: Date.now() + index,
                        key: entryData?.name || entryName,
                        value: entryData?.value || "",
                        isEditing: false,
                    };
                })
            );

            const nextEntries = normalizedEntries.filter(Boolean);
            setEntries(
                nextEntries.length
                    ? nextEntries
                    : [{ id: Date.now(), key: "", value: "", isEditing: true }]
            );
        } catch (error) {
            console.error("Failed to fetch KVM entries", error);
            setSubmitError(error.message || "Failed to fetch KVM entries");
        }
    };

    useEffect(() => {
        if (!editData?.name) {
            setEntries([{ id: Date.now(), key: "", value: "", isEditing: true }]);
            return;
        }

        setForm({
            organization: editData?.org || editData?.projectId || editData?.organization || organization || "",
            environment: editData?.env || editData?.environment || environment || "",
            name: editData?.name || "",
            host: editData?.host || "",
            port: editData?.port || "",
            isInternal: editData?.isInternal || "yes",
            onboardingId: editData?.onboardingId || defaultOnboardingId || "",
            microserviceId: editData?.microserviceId || defaultMicroserviceId || "",
        });
        setSubmitError("");
        fetchKVMEntries(
            editData?.org || editData?.projectId || editData?.organization || organization,
            editData?.env || editData?.environment || environment,
            editData?.name
        );
    }, [editData]);

    const createKVM = async (org, environment) => {
        const createResponse = await apigeeApiFetch(
            APIGEE_ENDPOINTS.KVM_ENV_LEVEL.CREATE(org, environment),
            {
                method: "POST",
                headers: getTrackingHeaders(form),
                body: JSON.stringify({
                    name: form.name,
                    encrypted: true,
                }),
            }
        );

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create KVM: ${createResponse.status} ${errorText}`);
        }

        const createdKVM = await createResponse.json();
        const kvmName = createdKVM?.name || form.name;

        const validEntries = entries.filter(
            (entry) => entry.key.trim() && entry.value.trim()
        );

        await Promise.all(
            validEntries.map(async (entry) => {
                const entryResponse = await apigeeApiFetch(
                    APIGEE_ENDPOINTS.KVM_ENV_LEVEL_ENTRY.CREATE(org, environment, kvmName),
                    {
                        method: "POST",
                        headers: getTrackingHeaders(form),
                        body: JSON.stringify({
                            name: entry.key.trim(),
                            value: entry.value,
                        }),
                    }
                );

                if (!entryResponse.ok) {
                    const errorText = await entryResponse.text();
                    throw new Error(
                        `Failed to create KVM entry "${entry.key}": ${entryResponse.status} ${errorText}`
                    );
                }

                return entryResponse.json().catch(() => null);
            })
        );

        return createdKVM;
    };

    const handleSubmit = async () => {
        setSubmitError("");

        if (!form.organization || !form.environment || !form.name.trim()) {
            setSubmitError("Project Id, Environment, and Key Value Map Name are required.");
            return;
        }

        if (!form.onboardingId) {
            setSubmitError("Onboarding Id is required.");
            return;
        }

        if (editData) {
            console.log("Update API", form);
            onClose();
            return;
        }

        try {
            setIsSubmitting(true);
            await createKVM(form.organization, form.environment);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Failed to create KVM", error);
            setSubmitError(error.message || "Failed to create Key Value Map");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed h-full inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

            <div className="h-[90vh] w-[800px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700 modal-header" style={{ height: "4.5rem" }}>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {editData ? "Edit Key Value Map" : "Create Key Value Map"}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {!editData && "Create a Key Value Map in a few simple steps."}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto modal-body" style={{ height: "calc(100% - 9rem)" }}>

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

                        {/* Project Id */}
                        <div>
                            <label className="text-sm text-gray-400">
                                Project Id*
                            </label>
                            <select
                                value={form.organization}
                                className={inputStyle}
                                onChange={(e) => handleChange("organization", e.target.value)}
                            >
                                <option value="">
                                    {isFetchingOrganizations ? "Loading project ids..." : "Select Project Id"}
                                </option>
                                {form.organization && !organizations.includes(form.organization) && (
                                    <option value={form.organization}>{form.organization}</option>
                                )}
                                {organizations.map((org) => (
                                    <option key={org} value={org}>{org}</option>
                                ))}
                            </select>
                        </div>

                        {/* Environment */}
                        <div>
                            <label className="text-sm text-gray-400">
                                Environment*
                            </label>
                            <select
                                value={form.environment}
                                className={inputStyle}
                                disabled={isFetchingEnvironments}
                                onChange={(e) => handleChange("environment", e.target.value)}
                            >
                                <option value="">
                                    {isFetchingEnvironments ? "Loading environments..." : "Select Environment"}
                                </option>
                                {form.environment && !environments.includes(form.environment) && (
                                    <option value={form.environment}>{form.environment}</option>
                                )}
                                {environments.map((envName) => (
                                    <option key={envName} value={envName}>{envName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 gap-6">

                        {/* Name */}
                        <div>
                            <label className="text-sm text-gray-400">
                                Key Value Map Name*
                            </label>
                            <input
                                value={form.name}
                                placeholder="Enter Key Value Map Name"
                                className={inputStyle}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        </div>

                    </div>

                    {/* Add New Entries Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-300">
                                Add New Entries
                            </h3>

                            <button
                                onClick={handleAddEntry}
                                className="px-4 py-2 rounded-md bg-primary text-white text-sm hover:opacity-90"
                            >
                                ADD NEW ENTRY
                            </button>
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-2">
                            <input
                                placeholder="Search Key Name/Value"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`${inputStyle} w-full`}
                            />
                        </div>

                        {/* Total */}
                        <p className="text-xs text-gray-400">
                            Total Entries: {entries.length}
                        </p>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 text-xs text-gray-400 px-2">
                            <div className="col-span-4">Key Name</div>
                            <div className="col-span-5">Key Value</div>
                            <div className="col-span-3">Actions</div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {entries
                                .filter(e =>
                                    e.key.toLowerCase().includes(search.toLowerCase()) ||
                                    e.value.toLowerCase().includes(search.toLowerCase())
                                )
                                .map((entry,index,filteredEntries) => (
                                    <div
                                        key={entry.id}
                                        className="grid grid-cols-12 gap-2 items-center bg-dark-800/40 p-2 rounded-md"
                                    >
                                        {/* Key */}
                                        <input
                                            disabled={!entry.isEditing}
                                            value={entry.key}
                                            onChange={(e) =>
                                                handleEntryChange(entry.id, "key", e.target.value)
                                            }
                                            placeholder="Name"
                                            className={`col-span-4 ${inputStyle} ${!entry.isEditing && "opacity-60 cursor-not-allowed"
                                                }`}
                                        />

                                        {/* Value */}
                                        <input
                                            disabled={!entry.isEditing}
                                            value={entry.value}
                                            onChange={(e) =>
                                                handleEntryChange(entry.id, "value", e.target.value)
                                            }
                                            placeholder="Value"
                                            className={`col-span-5 ${inputStyle} ${!entry.isEditing && "opacity-60 cursor-not-allowed"
                                                }`}
                                        />

                                        {/* Actions */}
                                        <div className="col-span-3 flex gap-2">
                                            {entry.isEditing ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSaveEntry(entry.id)}
                                                        className="px-3 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="px-3 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleEditEntry(entry.id)}
                                                        className="px-3 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="px-3 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {/*Add New Entry Row */}
                                            {index === filteredEntries.length - 1 && (
                                                <button
                                                    onClick={handleAddEntry}
                                                        className="px-3 py-1 rounded bg-teal-600/20 text-teal-400 hover:bg-teal-600/30"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                    >
                        {isSubmitting ? "Creating..." : editData ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}
