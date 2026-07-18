import React, { useState, useEffect } from "react";
import { Building, Users, Network, Plus, X, Eye, UserCircle, Layers, CheckCircle, Loader2 } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import API_BASE_URL from "../../config/apiConfig";
import { cn } from "../../lib/utils";

const generateGatewayId = () => `g-${Math.random().toString(36).slice(2, 9)}`;
const envOptionsByType = { nonprod: ["dev", "test", "qa", "sat", "staging", "sandbox"], prod: ["preprod", "prod", "staging"] };

export default function OnboardingModal({ open, onClose, mode, type, editId, defaultTab, userEmail, showMessage, onSuccess, savedConsumers, refreshConsumers, isOrgApproved }) {
    const [activeTab, setActiveTab] = useState(defaultTab || (type === "bu" ? "businessUnit" : "organization"));
    const [loading, setLoading] = useState(true);
    const [linkedOrgId, setLinkedOrgId] = useState(null);
    const [orgStatus, setOrgStatus] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Organization State
    const [company, setCompany] = useState({ name: "", websiteUrl: "", region: "" });
    const [orgData, setOrgData] = useState({ firstName: "", lastName: "", ownerEmail: "", phoneNumber: "", sme: "", smeEmail: "", dlEmail: "" });
    const [gatewayOrgs, setGatewayOrgs] = useState([{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "", environmentHostnames: {} } }]);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [currentAppId, setCurrentAppId] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isOrgReadOnly, setIsOrgReadOnly] = useState(false);

    // Business Unit State
    const [teamName, setTeamName] = useState("");
    const [appName, setAppName] = useState("");
    const [appId, setAppId] = useState("");
    const [projectOwner, setProjectOwner] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [projectSME, setProjectSME] = useState("");
    const [projectSMEEmail, setProjectSMEEmail] = useState("");
    const [projectDLEmail, setProjectDLEmail] = useState("");
    const [goLiveDate, setGoLiveDate] = useState("");
    const [testerName, setTesterName] = useState("");
    const [testerEmail, setTesterEmail] = useState("");
    const [servicenowGroup, setServicenowGroup] = useState("");
    const [servicenowEmail, setServicenowEmail] = useState("");
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedConsumers, setSelectedConsumers] = useState([]);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [newMember, setNewMember] = useState({ name: "", email: "", role: "" });
    const [submittingBu, setSubmittingBu] = useState(false);
    const [showConsumerModal, setShowConsumerModal] = useState(false);
    const [consumerForm, setConsumerForm] = useState({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" });
    const [isAddingConsumer, setIsAddingConsumer] = useState(false);

    // Load data when modal opens or editId changes
    useEffect(() => {
        if (!open) return;

        const loadData = async () => {
            setLoading(true);
            try {
                if (mode === "edit") {
                    if (type === "org" && editId) {
                        // Fetch organization details
                        const orgRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${editId}`);
                        if (orgRes.ok) {
                            const result = await orgRes.json();
                            const org = result.data || result; // handle both wrapped and unwrapped
                            setCompany(org.company || {});
                            setOrgData({
                                firstName: org.stakeholder?.firstName || "",
                                lastName: org.stakeholder?.lastName || "",
                                ownerEmail: org.stakeholder?.email || "",
                                phoneNumber: org.stakeholder?.phone || "",
                                sme: org.stakeholder?.sme || "",
                                smeEmail: org.stakeholder?.smeEmail || "",
                                dlEmail: org.stakeholder?.dlEmail || "",
                            });
                            setGatewayOrgs((org.gatewayOrganizations || []).map(g => ({
                                ...g,
                                config: {
                                    environmentType: "nonprod",
                                    selectedEnvironments: [],
                                    customEnvironments: "",
                                    expectedTps: "",
                                    expectedApiRange: "",
                                    notes: "",
                                    // environmentHostnames: {},
                                    ...(g.config || {}),
                                    // ensure environmentHostnames exists
                                    environmentHostnames: g.config?.environmentHostnames || {}
                                }
                            })));
                            setCurrentAppId(org.id);
                            setIsOrgReadOnly(false);
                            setOrgStatus(org.status || "DRAFT");
                            setActiveTab(defaultTab || "organization");
                        } else {
                            showMessage("Failed to load organization", "error");
                        }
                    } else if (type === "bu" && editId) {
                        // Fetch business unit details
                        const buRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editId}`);
                        if (buRes.ok) {
                            const result = await buRes.json();
                            const bu = result.data; // ✅ extract actual business unit from 'data' field
                            console.log("Loaded BU data:", bu);

                            setTeamName(bu.teamName || "");
                            setAppName(bu.applicationName || "");
                            setAppId(bu.applicationId || "");
                            setProjectOwner(bu.projectOwner || "");
                            setOwnerEmail(bu.ownerEmail || "");
                            setProjectSME(bu.projectSME || "");
                            setProjectSMEEmail(bu.projectSMEEmail || "");
                            setProjectDLEmail(bu.projectDLEmail || "");
                            setGoLiveDate(bu.expectedGoLiveDate || "");
                            setTesterName(bu.testerName || "");
                            setTesterEmail(bu.testerEmail || "");
                            setServicenowGroup(bu.servicenowGroupName || "");
                            setServicenowEmail(bu.servicenowEmail || "");
                            setTeamMembers(bu.members || []);
                            setSelectedConsumers((bu.consumers || []).map(c => c.id));
                            setLinkedOrgId(bu.onboardingId);

                            // Fetch linked organization details (for read-only display)
                            if (bu.onboardingId) {
                                const orgRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${bu.onboardingId}`);
                                if (orgRes.ok) {
                                    const orgResult = await orgRes.json();
                                    const org = orgResult.data || orgResult;
                                    setCompany(org.company || {});
                                    setOrgData({
                                        firstName: org.stakeholder?.firstName || "",
                                        lastName: org.stakeholder?.lastName || "",
                                        ownerEmail: org.stakeholder?.email || "",
                                        phoneNumber: org.stakeholder?.phone || "",
                                        sme: org.stakeholder?.sme || "",
                                        smeEmail: org.stakeholder?.smeEmail || "",
                                        dlEmail: org.stakeholder?.dlEmail || "",
                                    });
                                    setGatewayOrgs((org.gatewayOrganizations || []).map(g => ({ ...g, config: g.config || { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } })));
                                    setCurrentAppId(org.id);
                                    setOrgStatus(org.status);
                                }
                            }
                            setIsOrgReadOnly(true);
                            setActiveTab("businessUnit");
                        } else {
                            showMessage("Failed to load business unit", "error");
                        }
                    }
                } else if (mode === "create") {
                    // Reset all fields for new creation
                    setCompany({ name: "", websiteUrl: "", region: "" });
                    setOrgData({ firstName: "", lastName: "", ownerEmail: "", phoneNumber: "", sme: "", smeEmail: "", dlEmail: "" });
                    setGatewayOrgs([{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
                    setCurrentAppId(null);
                    setTeamName(""); setAppName(""); setAppId(""); setProjectOwner(""); setOwnerEmail("");
                    setProjectSME(""); setProjectSMEEmail(""); setProjectDLEmail(""); setGoLiveDate("");
                    setTesterName(""); setTesterEmail(""); setServicenowGroup(""); setServicenowEmail("");
                    setTeamMembers([]); setSelectedConsumers([]);
                    setIsOrgReadOnly(false);
                    setOrgStatus(null);
                    setActiveTab("organization");
                }
            } catch (err) {
                console.error("Error loading data:", err);
                showMessage("Failed to load data", "error");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [open, mode, type, editId, defaultTab]);

    // Start polling for approval status
    const startPolling = (appId) => {
        if (pollingInterval) clearInterval(pollingInterval);
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}`);
                if (res.ok) {
                    const result = await res.json();
                    const org = result.data || result;
                    const status = org.status;
                    setOrgStatus(status);
                    if (status !== "PENDING_APPROVAL" && status !== "pending") {
                        clearInterval(interval);
                        setPollingInterval(null);
                        if (status === "APPROVED") {
                            showMessage("Organization approved! You can now create Business Units.", "success");
                        }
                    }
                }
            } catch (err) { console.error(err); }
        }, 10000);
        setPollingInterval(interval);
    };

    const checkStatus = async () => {
        if (!currentAppId) { showMessage("No application ID found", "error"); return; }
        setCheckingStatus(true);
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentAppId}`);
            if (res.ok) {
                const result = await res.json();
                const org = result.data || result;
                const status = org.status || "DRAFT";
                setOrgStatus(status);
                if (status === "APPROVED") showMessage("Organization approved! You can now proceed.", "success");
                else if (status === "REJECTED") showMessage("Organization was rejected. Please update and resend.", "error");
                else if (status === "PENDING_APPROVAL") showMessage("Still pending approval. Please wait.", "info");
                else showMessage(`Current status: ${status}`, "info");
            } else throw new Error();
        } catch (err) { showMessage("Failed to check status", "error"); } finally { setCheckingStatus(false); }
    };

    const buildOrgPayload = () => ({ company, stakeholder: { firstName: orgData.firstName, lastName: orgData.lastName, email: orgData.ownerEmail, phone: orgData.phoneNumber, sme: orgData.sme, smeEmail: orgData.smeEmail, dlEmail: orgData.dlEmail }, gatewayOrganizations: gatewayOrgs });
    const isValidEmail = (email) => /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
    const validateOrg = () => {
        if (isOrgReadOnly) return true;
        if (!company.name) { showMessage("Company name required", "error"); return false; }
        if (!orgData.firstName || !orgData.lastName) { showMessage("First and Last name required", "error"); return false; }
        if (!isValidEmail(orgData.ownerEmail)) { showMessage("Valid Owner Email required", "error"); return false; }
        if (!orgData.phoneNumber) { showMessage("Contact number required", "error"); return false; }
        if (!gatewayOrgs.some(o => o.name.trim())) { showMessage("At least one Gateway Organization name required", "error"); return false; }

        // NEW: Validate hostnames for each selected environment in each gateway org
        for (const org of gatewayOrgs) {
            const selectedEnvs = getAllSelectedEnvs(org);
            for (const env of selectedEnvs) {
                const hostname = org.config.environmentHostnames?.[env];
                if (!hostname || hostname.trim() === "") {
                    showMessage(`Hostname is required for environment "${env}" in gateway organization "${org.name || 'Unnamed'}"`, "error");
                    return false;
                }
            }
        }
        return true;
    };

    const saveDraft = async () => {
        if (!validateOrg() || isOrgReadOnly) return;
        setIsSavingDraft(true);
        try {
            let url = `${API_BASE_URL}/gatewayonboarding/api/v1/applications`, method = "POST";
            if (currentAppId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentAppId}`; method = "PUT"; }
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildOrgPayload()) });
            if (res.ok) { const data = await res.json(); setCurrentAppId(data.id); showMessage("Draft saved", "success"); onSuccess(); }
            else throw new Error();
        } catch (err) { showMessage("Failed to save draft", "error"); } finally { setIsSavingDraft(false); }
    };

    const sendApproval = async () => {
        if (!validateOrg() || isOrgReadOnly) return;
        setIsSending(true);
        try {
            let appId = currentAppId;
            if (!appId) {
                const draftRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildOrgPayload()) });
                if (!draftRes.ok) throw new Error();
                const draftData = await draftRes.json();
                appId = draftData.id;
                setCurrentAppId(appId);
            }
            const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildOrgPayload()) });
            if (submitRes.ok) {
                showMessage("Approval request sent", "success");
                setOrgStatus("pending");
                startPolling(appId);
                onSuccess();
            } else throw new Error();
        } catch (err) { showMessage("Failed to send approval", "error"); } finally { setIsSending(false); }
    };

    const addGatewayOrg = () => setGatewayOrgs(prev => [{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }, ...prev]);
    const removeGatewayOrg = (id) => { if (gatewayOrgs.length === 1) return; setGatewayOrgs(prev => prev.filter(o => o.id !== id)); };
    const updateGatewayOrg = (id, field, value) => setGatewayOrgs(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    const updateGatewayOrgConfig = (id, configField, value) => setGatewayOrgs(prev => prev.map(o => o.id === id ? { ...o, config: { ...o.config, [configField]: value } } : o));
    const handleEnvCheck = (orgId, env) => {
        setGatewayOrgs(prev => prev.map(org => {
            if (org.id !== orgId) return org;
            const isSelected = org.config.selectedEnvironments.includes(env);
            let newSelectedEnvs;
            let newHostnames = { ...org.config.environmentHostnames };
            if (isSelected) {
                // Uncheck: remove env and its hostname
                newSelectedEnvs = org.config.selectedEnvironments.filter(e => e !== env);
                delete newHostnames[env];
            } else {
                // Check: add env and initialize its hostname as empty
                newSelectedEnvs = [...org.config.selectedEnvironments, env];
                newHostnames[env] = "";
            }
            return {
                ...org,
                config: {
                    ...org.config,
                    selectedEnvironments: newSelectedEnvs,
                    environmentHostnames: newHostnames
                }
            };
        }));
    };

    const addTeamMember = () => {
        if (!newMember.name || !newMember.email || !newMember.role) { showMessage("Please fill name, email and role", "error"); return; }
        setTeamMembers(prev => [...prev, { id: Date.now(), name: newMember.name, email: newMember.email, role: newMember.role }]);
        setNewMember({ name: "", email: "", role: "" });
        setShowTeamModal(false);
    };

    const handleSaveConsumer = async () => {
        setIsAddingConsumer(true);
        const consumerData = {
            organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
            consumerName: consumerForm.consumerName,
            consumerPocName: consumerForm.consumerPocName,
            consumerPocEmail: consumerForm.consumerPocEmail,
            consumerSmeName: consumerForm.consumerSmeName,
            consumerSmeEmail: consumerForm.consumerSmeEmail,
            consumerConfig: consumerForm.consumerConfig,
            apiTps: parseInt(consumerForm.apiTps) || 100,
            quota: consumerForm.quota,
            rateLimiting: consumerForm.rateLimiting,
            apiKeyInformation: consumerForm.apiKeyInfo,
        };
        try {
            const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/consumers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(consumerData) });
            if (res.ok) {
                showMessage("Consumer saved", "success");
                refreshConsumers();
                setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" });
                setShowConsumerModal(false);
            } else throw new Error();
        } catch (err) { showMessage("Failed to save consumer", "error"); } finally { setIsAddingConsumer(false); }
    };

    const handleSubmitBu = async () => {
        if (!teamName || !appName) { showMessage("Team Name and Application Name required", "error"); return; }
        setSubmittingBu(true);
        const payload = {
            teamName, applicationName: appName, applicationId: appId,
            projectOwner, ownerEmail, projectSME, projectSMEEmail, projectDLEmail,
            expectedGoLiveDate: goLiveDate, testerName, testerEmail,
            servicenowGroupName: servicenowGroup, servicenowEmail,
            members: teamMembers,
            consumers: selectedConsumers.map(id => {
                const c = savedConsumers.find(c => c.id === id);
                return c ? { id: c.id, consumerId: c.consumerId || c.id, name: c.consumerName } : null;
            }).filter(Boolean),
            onboardingId: currentAppId,
        };
        try {
            let url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units`, method = "POST";
            if (type === "bu" && editId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editId}`; method = "PUT"; }
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error();
            showMessage("Business unit saved", "success");
            onSuccess();
            onClose();
        } catch (err) { showMessage("Failed to save business unit", "error"); } finally { setSubmittingBu(false); }
    };

    // Helper: update hostname for a specific org and environment
    const updateEnvHostname = (orgId, envName, hostname) => {
        setGatewayOrgs(prev => prev.map(org =>
            org.id === orgId
                ? {
                    ...org,
                    config: {
                        ...org.config,
                        environmentHostnames: {
                            ...org.config.environmentHostnames,
                            [envName]: hostname
                        }
                    }
                }
                : org
        ));
    };

    // Helper: get all selected environments (including custom split)
    const getAllSelectedEnvs = (org) => {
        let envs = [...org.config.selectedEnvironments];
        if (envs.includes("custom") && org.config.customEnvironments.trim()) {
            const customList = org.config.customEnvironments.split(',').map(e => e.trim()).filter(e => e);
            envs = envs.filter(e => e !== "custom").concat(customList);
        }
        return envs;
    };
    const PreviewModal = () => {
        // Helper to get all selected environments (including custom split)
        const getAllSelectedEnvs = (org) => {
            let envs = [...org.config.selectedEnvironments];
            if (envs.includes("custom") && org.config.customEnvironments?.trim()) {
                const customList = org.config.customEnvironments.split(',').map(e => e.trim()).filter(e => e);
                envs = envs.filter(e => e !== "custom").concat(customList);
            }
            return envs;
        };

        return (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
                    <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5" /></div>
                            <div><h3 className="text-xl font-semibold text-white">Review & Submit</h3><p className="text-xs text-slate-400">Verify all details before sending for approval</p></div>
                        </div>
                        <button onClick={() => setShowPreviewModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Company Information */}
                        <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                            <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Building className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Company Information</h4></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div><span className="block text-xs text-slate-500">Company Name</span><span className="font-medium text-white">{company.name || "—"}</span></div>
                                <div><span className="block text-xs text-slate-500">Website</span><span className="font-medium text-white">{company.websiteUrl || "—"}</span></div>
                                <div><span className="block text-xs text-slate-500">Region</span><span className="font-medium text-white">{company.region || "—"}</span></div>
                            </div>
                        </div>

                        {/* Stakeholder Details */}
                        <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                            <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Users className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Stakeholder Details</h4></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div><span className="block text-xs text-slate-500">Full Name</span><span className="font-medium text-white">{orgData.firstName} {orgData.lastName}</span></div>
                                <div><span className="block text-xs text-slate-500">Email</span><span className="font-medium text-white">{orgData.ownerEmail}</span></div>
                                <div><span className="block text-xs text-slate-500">Phone</span><span className="font-medium text-white">{orgData.phoneNumber}</span></div>
                                <div><span className="block text-xs text-slate-500">SME</span><span className="font-medium text-white">{orgData.sme || "—"}</span></div>
                                <div><span className="block text-xs text-slate-500">SME Email</span><span className="font-medium text-white">{orgData.smeEmail || "—"}</span></div>
                                <div><span className="block text-xs text-slate-500">DL</span><span className="font-medium text-white">{orgData.dlEmail || "—"}</span></div>
                            </div>
                        </div>

                        {/* Gateway Organizations with Hostnames */}
                        <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                            <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Network className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Gateway Organizations</h4></div>
                            <div className="space-y-4">
                                {gatewayOrgs.map((org, idx) => {
                                    const selectedEnvs = getAllSelectedEnvs(org);
                                    return (
                                        <div key={org.id} className="rounded-lg border border-[#2a3a5a]/50 bg-[#0f172a]/40 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-white">#{idx + 1} {org.name || "Unnamed"}</span>
                                                <span className="rounded-full bg-[#ff5b1f]/20 px-2 py-0.5 text-xs font-medium text-[#ff8a5c]">{org.config.environmentType === "prod" ? "prod" : "non-prod"}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div><span className="block text-xs text-slate-500">Region</span><span className="text-white">{org.region || "—"}</span></div>
                                                <div><span className="block text-xs text-slate-500">Expected TPS</span><span className="text-white">{org.config.expectedTps || "—"}</span></div>
                                                <div><span className="block text-xs text-slate-500">API Count Range</span><span className="text-white">{org.config.expectedApiRange || "—"}</span></div>
                                                {org.config.notes && (
                                                    <div className="md:col-span-2">
                                                        <span className="block text-xs text-slate-500">Notes</span>
                                                        <span className="text-white text-sm">{org.config.notes}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Environments & Hostnames Section */}
                                            {selectedEnvs.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-[#2a3a5a]/50">
                                                    <span className="block text-xs text-slate-500 mb-2">Environments & Hostnames</span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {selectedEnvs.map(env => (
                                                            <div key={env} className="flex justify-between items-center bg-[#0f1117]/70 rounded-md px-3 py-2">
                                                                <span className="text-slate-300 text-sm font-mono">{env}</span>
                                                                <span className="text-white text-sm truncate ml-2">
                                                                    {org.config.environmentHostnames?.[env] || "—"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
                        <button onClick={() => setShowPreviewModal(false)} className="rounded-lg border border-[#2a3a5a] px-5 py-2 text-sm font-medium text-slate-300">Cancel</button>
                        <button onClick={sendApproval} disabled={isSending} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">{isSending ? "Sending..." : "Confirm & Send"}</button>
                    </div>
                </div>
            </div>
        );
    };
    // const PreviewModal = () => (
    //     <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    //         <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
    //             <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
    //                 <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold text-white">Review & Submit</h3><p className="text-xs text-slate-400">Verify all details before sending for approval</p></div></div>
    //                 <button onClick={() => setShowPreviewModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
    //             </div>
    //             <div className="p-6 space-y-6">
    //                 <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Building className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Company Information</h4></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Company Name</span><span className="font-medium text-white">{company.name || "—"}</span></div><div><span className="block text-xs text-slate-500">Website</span><span className="font-medium text-white">{company.websiteUrl || "—"}</span></div><div><span className="block text-xs text-slate-500">Region</span><span className="font-medium text-white">{company.region || "—"}</span></div></div></div>
    //                 <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Users className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Stakeholder Details</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Full Name</span><span className="font-medium text-white">{orgData.firstName} {orgData.lastName}</span></div><div><span className="block text-xs text-slate-500">Email</span><span className="font-medium text-white">{orgData.ownerEmail}</span></div><div><span className="block text-xs text-slate-500">Phone</span><span className="font-medium text-white">{orgData.phoneNumber}</span></div><div><span className="block text-xs text-slate-500">SME</span><span className="font-medium text-white">{orgData.sme || "—"}</span></div><div><span className="block text-xs text-slate-500">SME Email</span><span className="font-medium text-white">{orgData.smeEmail || "—"}</span></div><div><span className="block text-xs text-slate-500">DL</span><span className="font-medium text-white">{orgData.dlEmail || "—"}</span></div></div></div>
    //                 <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Network className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Gateway Organizations</h4></div><div className="space-y-4">{gatewayOrgs.map((org, idx) => (<div key={org.id} className="rounded-lg border border-[#2a3a5a]/50 bg-[#0f172a]/40 p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold text-white">#{idx + 1} {org.name || "Unnamed"}</span><span className="rounded-full bg-[#ff5b1f]/20 px-2 py-0.5 text-xs font-medium text-[#ff8a5c]">{org.config.environmentType === "prod" ? "prod" : "non-prod"}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-slate-500">Region</span><span className="text-white">{org.region || "—"}</span></div><div><span className="block text-xs text-slate-500">Environments</span><div className="flex flex-wrap gap-1 mt-1">{org.config.selectedEnvironments.map(env => (<span key={env} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{env}</span>))}</div></div><div><span className="block text-xs text-slate-500">Expected TPS</span><span className="text-white">{org.config.expectedTps || "—"}</span></div><div><span className="block text-xs text-slate-500">API Count Range</span><span className="text-white">{org.config.expectedApiRange || "—"}</span></div>{org.config.notes && <div className="md:col-span-2"><span className="block text-xs text-slate-500">Notes</span><span className="text-white text-sm">{org.config.notes}</span></div>}</div></div>))}</div></div>
    //             </div>
    //             <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={() => setShowPreviewModal(false)} className="rounded-lg border border-[#2a3a5a] px-5 py-2 text-sm font-medium text-slate-300">Cancel</button><button onClick={sendApproval} disabled={isSending} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">{isSending ? "Sending..." : "Confirm & Send"}</button></div>
    //         </div>
    //     </div>
    // );

    if (!open) return null;
    if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-black/80"><Loader2 className="animate-spin h-8 w-8 text-white" /></div>;

    const isBuEnabled = (mode === "edit" && type === "bu") ||
        (mode === "edit" && type === "org" && orgStatus === "APPROVED") ||
        (mode === "create" && isOrgApproved);
    const showNextButton = mode === "edit" && type === "org" && orgStatus === "approved" && activeTab === "organization";

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" key={editId || "new"}>
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
                <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
                    <h3 className="text-xl font-semibold text-white">{mode === "create" ? "New" : "Edit"} {activeTab === "organization" ? "Organization" : "Business Unit"}</h3>
                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex gap-4 px-6 pt-4 border-b border-[#2a3a5a]">
                    <button onClick={() => setActiveTab("organization")} className={`pb-2 px-1 text-sm font-medium transition ${activeTab === "organization" ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"}`}>Organization</button>
                    <button onClick={() => { if (isBuEnabled) setActiveTab("businessUnit"); else showMessage("Organization approval required first", "error"); }} className={`pb-2 px-1 text-sm font-medium transition ${activeTab === "businessUnit" ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"} ${!isBuEnabled && "opacity-50 cursor-not-allowed"}`} disabled={!isBuEnabled}>Business Unit</button>
                </div>

                <div className="p-6 space-y-6">
                    {activeTab === "organization" && (
                        <>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <h4 className="text-sm font-semibold flex gap-2"><Building className="w-4 h-4" /> Company Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                    <div><Label className="text-xs">Company Name *</Label><Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">Website URL</Label><Input value={company.websiteUrl} onChange={e => setCompany({ ...company, websiteUrl: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">Instance</Label><select value={company.region} onChange={e => setCompany({ ...company, region: e.target.value })} className="h-9 w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 text-white" disabled={isOrgReadOnly}><option value="">Select Region</option><option value="us-central1">US-Central1</option><option value="us-east1">US-East1</option><option value="us-west1">US-West1</option></select></div>
                                </div>
                            </Card>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <h4 className="text-sm font-semibold flex gap-2"><Users className="w-4 h-4" /> Stakeholder Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <div><Label className="text-xs">First Name *</Label><Input value={orgData.firstName} onChange={e => setOrgData({ ...orgData, firstName: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">Last Name *</Label><Input value={orgData.lastName} onChange={e => setOrgData({ ...orgData, lastName: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">Owner Email *</Label><Input type="email" value={orgData.ownerEmail} onChange={e => setOrgData({ ...orgData, ownerEmail: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">Contact Number *</Label><Input value={orgData.phoneNumber} onChange={e => setOrgData({ ...orgData, phoneNumber: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">SME Name</Label><Input value={orgData.sme} onChange={e => setOrgData({ ...orgData, sme: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">SME Email</Label><Input type="email" value={orgData.smeEmail} onChange={e => setOrgData({ ...orgData, smeEmail: e.target.value })} disabled={isOrgReadOnly} /></div>
                                    <div><Label className="text-xs">DL Email</Label><Input type="email" value={orgData.dlEmail} onChange={e => setOrgData({ ...orgData, dlEmail: e.target.value })} disabled={isOrgReadOnly} /></div>
                                </div>
                            </Card>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold flex gap-2"><Network className="w-4 h-4" /> Gateway Configurations</h4>{!isOrgReadOnly && <button onClick={addGatewayOrg} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Organization</button>}</div>
                                <div className="space-y-6">{gatewayOrgs.map((org) => (<div key={org.id} className="relative border border-dark-700 rounded-lg p-4">{gatewayOrgs.length > 1 && !isOrgReadOnly && <button onClick={() => removeGatewayOrg(org.id)} className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-400"><X className="w-4 h-4" /></button>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><Label className="text-xs">Region</Label><select value={org.region} onChange={e => updateGatewayOrg(org.id, "region", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 text-white" disabled={isOrgReadOnly}><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div><div><Label className="text-xs">Gateway Organization Name *</Label><Input value={org.name} onChange={e => updateGatewayOrg(org.id, "name", e.target.value)} disabled={isOrgReadOnly} /></div></div>
                                    <div className="border-t border-dark-700 pt-4 mt-2"><div className="mb-4"><Label className="text-xs">Environment Type</Label><div className="flex gap-4 mt-1"><label className="flex items-center gap-2"><input type="radio" checked={org.config.environmentType === "nonprod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "nonprod")} disabled={isOrgReadOnly} /><span>non-prod</span></label><label className="flex items-center gap-2"><input type="radio" checked={org.config.environmentType === "prod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "prod")} disabled={isOrgReadOnly} /><span>prod</span></label></div></div><div className="mb-4"><Label className="text-xs">Select Environments</Label><div className="flex flex-wrap gap-3 border border-dark-700 rounded-lg p-3 bg-dark-900/50">{envOptionsByType[org.config.environmentType].map(env => (<label key={env} className="flex items-center gap-1.5"><input type="checkbox" checked={org.config.selectedEnvironments.includes(env)} onChange={() => handleEnvCheck(org.id, env)} disabled={isOrgReadOnly} /><span>{env}</span></label>))}
                                        <label className="flex items-center gap-1.5">
                                            <input type="checkbox" checked={org.config.selectedEnvironments.includes("custom")} onChange={() => {
                                                if (org.config.selectedEnvironments.includes("custom")) {
                                                    // Remove custom and clear its hostname
                                                    updateGatewayOrgConfig(org.id, "selectedEnvironments", org.config.selectedEnvironments.filter(e => e !== "custom"));
                                                    updateGatewayOrgConfig(org.id, "customEnvironments", "");
                                                    // Remove hostnames for all custom environments
                                                    const oldCustomEnvs = org.config.customEnvironments.split(',').map(e => e.trim()).filter(e => e);
                                                    const newHostnames = { ...org.config.environmentHostnames };
                                                    oldCustomEnvs.forEach(env => delete newHostnames[env]);
                                                    updateGatewayOrgConfig(org.id, "environmentHostnames", newHostnames);
                                                } else {
                                                    updateGatewayOrgConfig(org.id, "selectedEnvironments", [...org.config.selectedEnvironments, "custom"]);
                                                }
                                            }} disabled={isOrgReadOnly} />
                                            <span>Custom</span>
                                        </label></div>{org.config.selectedEnvironments.includes("custom") && <Input className="mt-3" placeholder="Comma separated environments" value={org.config.customEnvironments} onChange={e => {
                                            const newCustomValue = e.target.value;
                                            const oldCustomEnvs = org.config.customEnvironments.split(',').map(env => env.trim()).filter(env => env);
                                            const newCustomEnvs = newCustomValue.split(',').map(env => env.trim()).filter(env => env);

                                            // Remove hostnames for custom environments that are no longer present
                                            const removedEnvs = oldCustomEnvs.filter(env => !newCustomEnvs.includes(env));
                                            if (removedEnvs.length > 0) {
                                                const newHostnames = { ...org.config.environmentHostnames };
                                                removedEnvs.forEach(env => delete newHostnames[env]);
                                                updateGatewayOrgConfig(org.id, "environmentHostnames", newHostnames);
                                            }

                                            // Add empty hostname entries for new custom environments
                                            const addedEnvs = newCustomEnvs.filter(env => !oldCustomEnvs.includes(env));
                                            if (addedEnvs.length > 0) {
                                                const newHostnames = { ...org.config.environmentHostnames };
                                                addedEnvs.forEach(env => { if (!newHostnames[env]) newHostnames[env] = ""; });
                                                updateGatewayOrgConfig(org.id, "environmentHostnames", newHostnames);
                                            }

                                            updateGatewayOrgConfig(org.id, "customEnvironments", newCustomValue);
                                        }} disabled={isOrgReadOnly} />}</div>
                                        {/* Hostname inputs for each selected environment */}
                                        {getAllSelectedEnvs(org).length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                <Label className="text-xs">Environment Hostnames (required)</Label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {getAllSelectedEnvs(org).map(env => (
                                                        <div key={env}>
                                                            <Label className="text-xs text-slate-400">{env}</Label>
                                                            <Input
                                                                placeholder={`Hostname for ${env}`}
                                                                value={org.config.environmentHostnames?.[env] || ""}
                                                                onChange={e => updateEnvHostname(org.id, env, e.target.value)}
                                                                disabled={isOrgReadOnly}
                                                                required
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs">Expected TPS</Label><Input type="number" value={org.config.expectedTps} onChange={e => updateGatewayOrgConfig(org.id, "expectedTps", e.target.value)} disabled={isOrgReadOnly} /></div><div><Label className="text-xs">Expected No. of APIs</Label><select value={org.config.expectedApiRange} onChange={e => updateGatewayOrgConfig(org.id, "expectedApiRange", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 text-white" disabled={isOrgReadOnly}><option value="">Select range</option><option value="0-100">0-100</option><option value="100-300">100-300</option><option value="300-500">300-500</option><option value="500-1000+">500-1000+</option></select></div><div className="md:col-span-2"><Label className="text-xs">Notes</Label><textarea rows={2} value={org.config.notes} onChange={e => updateGatewayOrgConfig(org.id, "notes", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 resize-none" disabled={isOrgReadOnly} /></div></div></div></div>))}</div>
                            </Card>
                        </>
                    )}

                    {activeTab === "businessUnit" && (
                        <>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <h4 className="text-sm font-semibold flex gap-2"><UserCircle className="w-4 h-4" /> Business Unit Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <div><Label className="text-xs">Team Name *</Label><Input value={teamName} onChange={e => setTeamName(e.target.value)} /></div>
                                    <div><Label className="text-xs">Application Name *</Label><Input value={appName} onChange={e => setAppName(e.target.value)} /></div>
                                    <div><Label className="text-xs">Application Id</Label><Input value={appId} onChange={e => setAppId(e.target.value)} /></div>
                                </div>
                            </Card>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <h4 className="text-sm font-semibold flex gap-2"><Users className="w-4 h-4" /> Stakeholder Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><Label className="text-xs">Project Owner</Label><Input value={projectOwner} onChange={e => setProjectOwner(e.target.value)} /></div>
                                    <div><Label className="text-xs">Owner Email</Label><Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} /></div>
                                    <div><Label className="text-xs">Project SME</Label><Input value={projectSME} onChange={e => setProjectSME(e.target.value)} /></div>
                                    <div><Label className="text-xs">Project SME Email</Label><Input type="email" value={projectSMEEmail} onChange={e => setProjectSMEEmail(e.target.value)} /></div>
                                    <div><Label className="text-xs">Project DL Email</Label><Input type="email" value={projectDLEmail} onChange={e => setProjectDLEmail(e.target.value)} /></div>
                                    <div><Label className="text-xs">Expected Go-Live Date</Label><Input type="date" value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} /></div>
                                    <div><Label className="text-xs">Tester Name</Label><Input value={testerName} onChange={e => setTesterName(e.target.value)} /></div>
                                    <div><Label className="text-xs">Tester Email</Label><Input type="email" value={testerEmail} onChange={e => setTesterEmail(e.target.value)} /></div>
                                    <div><Label className="text-xs">ServiceNow Group</Label><Input value={servicenowGroup} onChange={e => setServicenowGroup(e.target.value)} /></div>
                                    <div><Label className="text-xs">ServiceNow Email</Label><Input type="email" value={servicenowEmail} onChange={e => setServicenowEmail(e.target.value)} /></div>
                                </div>
                            </Card>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-semibold flex gap-2"><Users className="w-4 h-4" /> Team Members</h4>
                                    <button onClick={() => setShowTeamModal(true)} className="px-3 py-1 rounded-lg text-xs bg-primary text-white flex items-center gap-1"><Plus className="w-3 h-3" /> Add Member</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">
                                    {teamMembers.map(m => (
                                        <div key={m.id} className="p-3 rounded-lg border border-dark-700 bg-dark-900/60">
                                            <p className="text-sm font-medium text-white">{m.name}</p>
                                            <p className="text-xs text-gray-400">{m.email}</p>
                                            <p className="text-xs text-gray-500">{m.role || "Member"}</p>
                                        </div>
                                    ))}
                                    {teamMembers.length === 0 && <div className="text-xs text-slate-400 col-span-2 text-center py-2">No team members added yet</div>}
                                </div>
                            </Card>
                            <Card className="p-5 bg-[#0f172a]/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-semibold flex gap-2"><Layers className="w-4 h-4" /> Consumers</h4>
                                    <button onClick={() => setShowConsumerModal(true)} className="px-3 py-1 rounded-lg text-xs bg-primary text-white flex items-center gap-1"><Plus className="w-3 h-3" /> Add Consumer</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                                    {savedConsumers.map(c => {
                                        const isSelected = selectedConsumers.includes(c.id);
                                        return (
                                            <div key={c.id} className={cn("p-2 rounded-lg border cursor-pointer", isSelected ? "border-primary bg-primary/20" : "border-dark-700 bg-dark-900/60")} onClick={() => setSelectedConsumers(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                                                <p className="text-xs text-white truncate">{c.consumerName}</p>
                                                {isSelected && <CheckCircle className="w-3 h-3 text-primary mt-1" />}
                                            </div>
                                        );
                                    })}
                                    {savedConsumers.length === 0 && <div className="text-xs text-slate-400 col-span-3 text-center py-2">No consumers available. Click "Add Consumer" to create one.</div>}
                                </div>
                            </Card>
                        </>
                    )}
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
                    {activeTab === "organization" && !isOrgReadOnly && (
                        <>
                            <button onClick={saveDraft} disabled={isSavingDraft} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">Save Draft</button>
                            <button onClick={() => setShowPreviewModal(true)} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">Preview</button>
                            <button onClick={sendApproval} disabled={isSending} className="px-4 py-2 rounded-lg bg-[#ff5b1f] text-white">Send for Approval</button>
                            {orgStatus === "pending" && <button onClick={checkStatus} disabled={checkingStatus} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">{checkingStatus ? "Checking..." : "Check Status"}</button>}
                        </>
                    )}
                    {activeTab === "organization" && showNextButton && <button onClick={() => setActiveTab("businessUnit")} className="px-4 py-2 rounded-lg bg-[#ff5b1f] text-white">Next →</button>}
                    {activeTab === "businessUnit" && (
                        <>
                            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">Cancel</button>
                            <button onClick={handleSubmitBu} disabled={submittingBu} className="px-4 py-2 rounded-lg bg-[#ff5b1f] text-white">Save Business Unit</button>
                        </>
                    )}
                </div>
            </div>

            {showTeamModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-dark-700 bg-[#161b30] p-6">
                        <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
                        <div className="space-y-3">
                            <div><Label>Name</Label><Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} /></div>
                            <div><Label>Email</Label><Input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} /></div>
                            <div><Label>Role</Label>
                                <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full rounded-lg border border-dark-700 bg-dark-900 p-2 text-white">
                                    <option value="">Select role</option>
                                    <option value="API Engineer">API Engineer</option>
                                    <option value="DevOps Engineer">DevOps Engineer</option>
                                    <option value="Infra Engineer">Infra Engineer</option>
                                    <option value="Support Engineer">Support Engineer</option>
                                    <option value="Project Manager">Project Manager</option>
                                    <option value="Product Manager">Product Manager</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowTeamModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button><button onClick={addTeamMember} className="px-4 py-2 rounded-lg bg-primary text-white">Add</button></div>
                    </div>
                </div>
            )}

            {showConsumerModal && (
                <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl border border-dark-700 bg-[#161b30] p-6">
                        <h3 className="text-lg font-semibold mb-4">Add Consumer</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label>Consumer Name</Label><Input value={consumerForm.consumerName} onChange={e => setConsumerForm({ ...consumerForm, consumerName: e.target.value })} /></div>
                            <div><Label>POC Name</Label><Input value={consumerForm.consumerPocName} onChange={e => setConsumerForm({ ...consumerForm, consumerPocName: e.target.value })} /></div>
                            <div><Label>POC Email</Label><Input type="email" value={consumerForm.consumerPocEmail} onChange={e => setConsumerForm({ ...consumerForm, consumerPocEmail: e.target.value })} /></div>
                            <div><Label>SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={e => setConsumerForm({ ...consumerForm, consumerSmeName: e.target.value })} /></div>
                            <div><Label>SME Email</Label><Input type="email" value={consumerForm.consumerSmeEmail} onChange={e => setConsumerForm({ ...consumerForm, consumerSmeEmail: e.target.value })} /></div>
                            <div><Label>Config</Label><Input value={consumerForm.consumerConfig} onChange={e => setConsumerForm({ ...consumerForm, consumerConfig: e.target.value })} /></div>
                            <div><Label>API TPS</Label><Input value={consumerForm.apiTps} onChange={e => setConsumerForm({ ...consumerForm, apiTps: e.target.value })} /></div>
                            <div><Label>Quota</Label><Input value={consumerForm.quota} onChange={e => setConsumerForm({ ...consumerForm, quota: e.target.value })} /></div>
                            <div><Label>Rate Limiting</Label><Input value={consumerForm.rateLimiting} onChange={e => setConsumerForm({ ...consumerForm, rateLimiting: e.target.value })} /></div>
                            <div><Label>API Key Info</Label><Input value={consumerForm.apiKeyInfo} onChange={e => setConsumerForm({ ...consumerForm, apiKeyInfo: e.target.value })} /></div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button><button onClick={handleSaveConsumer} disabled={isAddingConsumer} className="px-4 py-2 rounded-lg bg-primary text-white">Save Consumer</button></div>
                    </div>
                </div>
            )}

            {showPreviewModal && <PreviewModal />}
        </div>
    );
}