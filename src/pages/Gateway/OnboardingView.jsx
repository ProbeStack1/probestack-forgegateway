import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building, Users, Server, UserCircle, Mail, Phone, Calendar, Network, Plus, X,
  CheckCircle, AlertCircle, Rocket, Layers, History, ArrowLeft, Archive, Edit, Copy,
  Check, Eye, FileText, GitBranch, Trash2, ChevronRight, ChevronDown, Loader2,
  Search  // <-- added missing Search icon
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import API_BASE_URL from "../../config/apiConfig";
import { consumerService } from "../../services/consumerService";

const generateGatewayId = (prefix = "g") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const OnboardingView = ({ showMessage }) => {
  // ========== All original state ==========
  const [onboardingView, setOnboardingView] = useState("form");
  const [gatewayOnboardingStep, setGatewayOnboardingStep] = useState("organization");
  const [orgApprovalStatus, setOrgApprovalStatus] = useState(null);
  const [currentApplicationId, setCurrentApplicationId] = useState(null);
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [businessUnitCompleted, setBusinessUnitCompleted] = useState(() => localStorage.getItem("buCompleted") === "true");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [organizationSubmissions, setOrganizationSubmissions] = useState([]);
  const [buSubmissions, setBuSubmissions] = useState([]);
  const [teamSubmissions, setTeamSubmissions] = useState([]);
  const [historyActiveTab, setHistoryActiveTab] = useState("organization");
  const [isCreateNewOnboarding, setIsCreateNewOnboarding] = useState(false); // <-- controls "Create New" button
  const [copiedId, setCopiedId] = useState(null);

  // Company & Stakeholder
  const [company, setCompany] = useState({ name: "", websiteUrl: "", region: "" });
  const [orgOnboardingData, setOrgOnboardingData] = useState({
    firstName: "", lastName: "", ownerEmail: "", phoneNumber: "",
    sme: "", smeEmail: "", dlEmail: "", goLiveDate: "",
  });
  const [gatewayOrgs, setGatewayOrgs] = useState([
    {
      id: generateGatewayId(), name: "", region: "",
      config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" }
    }
  ]);

  // Business Unit fields
  const [onboardingTeamName, setOnboardingTeamName] = useState("");
  const [onboardingApplicationName, setOnboardingApplicationName] = useState("");
  const [onboardingApplicationId, setOnboardingApplicationId] = useState("");
  const [onboardingProjectOwner, setOnboardingProjectOwner] = useState("");
  const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState("");
  const [onboardingProjectSME, setOnboardingProjectSME] = useState("");
  const [onboardingProjectSMEEmail, setOnboardingProjectSMEEmail] = useState("");
  const [onboardingProjectDLEmail, setOnboardingProjectDLEmail] = useState("");
  const [onboardingGoLiveDate, setOnboardingGoLiveDate] = useState("");
  const [onboardingTesterName, setOnboardingTesterName] = useState("");
  const [onboardingTesterEmail, setOnboardingTesterEmail] = useState("");
  const [onboardingServiceNowGroup, setOnboardingServiceNowGroup] = useState("");
  const [onboardingServiceNowEmail, setOnboardingServiceNowEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [savedConsumers, setSavedConsumers] = useState([]);
  const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] = useState([]);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({ name: "", email: "" });
  const [showConsumerModal, setShowConsumerModal] = useState(false);
  const [consumerForm, setConsumerForm] = useState({
    consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "",
    consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: ""
  });
  const [isAddingConsumer, setIsAddingConsumer] = useState(false);
  const [editingConsumerId, setEditingConsumerId] = useState(null);
  const [submittingBu, setSubmittingBu] = useState(false);
  const [editingBuId, setEditingBuId] = useState(null);

  // Dashboard counts
  const [dashboardBuCount, setDashboardBuCount] = useState(0);
  const [dashboardTeamMemberCount, setDashboardTeamMemberCount] = useState(0);
  const [dashboardConsumerCount, setDashboardConsumerCount] = useState(0);

  // ========== Helper functions ==========
  const isValidEmail = (email) => /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
  const buildPayload = () => ({
    company: { name: company.name, websiteUrl: company.websiteUrl, region: company.region },
    stakeholder: {
      firstName: orgOnboardingData.firstName, lastName: orgOnboardingData.lastName,
      email: orgOnboardingData.ownerEmail, phone: orgOnboardingData.phoneNumber,
      sme: orgOnboardingData.sme, smeEmail: orgOnboardingData.smeEmail, dlEmail: orgOnboardingData.dlEmail,
    },
    gatewayOrganizations: gatewayOrgs.map(org => ({
      id: org.id, name: org.name, region: org.region,
      config: {
        environmentType: org.config.environmentType, selectedEnvironments: org.config.selectedEnvironments,
        customEnvironments: org.config.customEnvironments, expectedTps: org.config.expectedTps,
        expectedApiRange: org.config.expectedApiRange, notes: org.config.notes,
      }
    })),
  });

  const validateOrgForm = () => {
    if (!company.name) { showMessage("Company name is required", "error"); return false; }
    if (!orgOnboardingData.firstName || !orgOnboardingData.lastName) { showMessage("First and Last name are required", "error"); return false; }
    if (!isValidEmail(orgOnboardingData.ownerEmail)) { showMessage("Valid Owner Email is required", "error"); return false; }
    if (!orgOnboardingData.phoneNumber) { showMessage("Contact number is required", "error"); return false; }
    const hasValidGatewayOrg = gatewayOrgs.some(org => org.name.trim() !== "");
    if (!hasValidGatewayOrg) { showMessage("At least one Gateway Organization name is required", "error"); return false; }
    return true;
  };

  const resetForm = () => {
    setIsCreateNewOnboarding(false); // hide "Create New" button after reset
    setCompany({ name: "", websiteUrl: "", region: "" });
    setOrgOnboardingData({ firstName: "", lastName: "", ownerEmail: "", phoneNumber: "", sme: "", smeEmail: "", dlEmail: "", goLiveDate: "" });
    setGatewayOrgs([{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
    setApprovalMessage(null);
    setCurrentApplicationId(null);
    setOrgApprovalStatus(null);
    showMessage("Form has been reset.", "info");
  };

  const resetBuForm = () => {
    setOnboardingTeamName(""); setOnboardingApplicationName(""); setOnboardingApplicationId("");
    setOnboardingProjectOwner(""); setOnboardingOwnerEmail(""); setOnboardingProjectSME("");
    setOnboardingProjectSMEEmail(""); setOnboardingProjectDLEmail(""); setOnboardingGoLiveDate("");
    setOnboardingTesterName(""); setOnboardingTesterEmail(""); setOnboardingServiceNowGroup("");
    setOnboardingServiceNowEmail(""); setTeamMembers([]); setSelectedOnboardingConsumers([]); setEditingBuId(null);
  };

  // ========== API calls ==========
  const fetchAllApplications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`);
      if (response.ok) setOrganizationSubmissions(await response.json());
    } catch (err) { console.error(err); }
  };
  const fetchBuHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
      if (response.ok) {
        const result = await response.json();
        setBuSubmissions(result.data || []);
        const allMembers = result.data?.flatMap(unit => unit.members || []) || [];
        const uniqueMembersMap = new Map();
        allMembers.forEach(member => { if (member.email && !uniqueMembersMap.has(member.email)) uniqueMembersMap.set(member.email, member); });
        setTeamSubmissions(Array.from(uniqueMembersMap.values()));
      }
    } catch (err) { console.error(err); }
  };
  const getConsumers = async () => {
    const result = await consumerService.getAllConsumers();
    if (result.success) {
      setSavedConsumers(result.data?.data || result.data || []);
      setDashboardConsumerCount(result.data?.data?.length || result.data?.length || 0);
    }
  };

  // Load submission - this shows the "Create New" button after loading
  const loadSubmission = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCompany(data.company);
      setOrgOnboardingData({
        firstName: data.stakeholder.firstName, lastName: data.stakeholder.lastName,
        ownerEmail: data.stakeholder.email, phoneNumber: data.stakeholder.phone,
        sme: data.stakeholder.sme || "", smeEmail: data.stakeholder.smeEmail || "",
        dlEmail: data.stakeholder.dlEmail || "", goLiveDate: "",
      });
      setGatewayOrgs(data.gatewayOrganizations.map(org => ({
        id: org.id, name: org.name, region: org.region,
        config: {
          environmentType: org.config.environmentType, selectedEnvironments: org.config.selectedEnvironments,
          customEnvironments: org.config.customEnvironments || "", expectedTps: org.config.expectedTps,
          expectedApiRange: org.config.expectedApiRange, notes: org.config.notes || "",
        }
      })));
      const frontendStatus = mapStatus(data.status);
      setOrgApprovalStatus(frontendStatus);
      setCurrentApplicationId(data.id);
      if (frontendStatus === "approved") setGatewayOnboardingStep("businessUnit");
      else setGatewayOnboardingStep("organization");
      setShowHistoryModal(false);
      setIsCreateNewOnboarding(true); // <-- show "Create New" button after loading
      showMessage(`${frontendStatus.toUpperCase()} organization loaded.`, "success");
    } catch (err) { showMessage("Failed to load submission details.", "error"); }
  };

  const loadBusinessUnit = (bu) => {
    setOnboardingTeamName(bu.teamName); setOnboardingApplicationName(bu.applicationName);
    setOnboardingApplicationId(bu.applicationId || ""); setOnboardingProjectOwner(bu.projectOwner || "");
    setOnboardingOwnerEmail(bu.ownerEmail || ""); setOnboardingProjectSME(bu.projectSME || "");
    setOnboardingProjectSMEEmail(bu.projectSMEEmail || ""); setOnboardingProjectDLEmail(bu.projectDLEmail || "");
    setOnboardingGoLiveDate(bu.expectedGoLiveDate || ""); setOnboardingTesterName(bu.testerName || "");
    setOnboardingTesterEmail(bu.testerEmail || ""); setOnboardingServiceNowGroup(bu.servicenowGroupName || "");
    setOnboardingServiceNowEmail(bu.servicenowEmail || ""); setTeamMembers(bu.members || []);
    setSelectedOnboardingConsumers((bu.consumers || []).map(c => c.id));
    setEditingBuId(bu.id);
    setIsCreateNewOnboarding(true); // also show "Create New" when editing a BU? Original didn't, but consistent.
    showMessage(`Loaded business unit "${bu.teamName}" for editing`, "success");
  };

  const saveAsDraft = async () => {
    if (!validateOrgForm()) return;
    setIsSavingDraft(true);
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
      });
      if (response.ok) {
        await fetchAllApplications();
        const data = await response.json();
        setCurrentApplicationId(data.id);
        setOrgApprovalStatus("draft");
        showMessage("Organization data saved as draft.", "success");
      } else throw new Error("Failed to save draft");
    } catch (err) { showMessage("Failed to save draft.", "error"); }
    finally { setIsSavingDraft(false); }
  };

  const sendApprovalRequest = async () => {
    if (!validateOrgForm()) return;
    setIsSendingApproval(true);
    try {
      let appId = currentApplicationId;
      if (!appId) {
        const draftRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/draft`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
        });
        if (!draftRes.ok) throw new Error("Failed to create draft");
        const draftData = await draftRes.json();
        appId = draftData.id;
        setCurrentApplicationId(appId);
      }
      const submitPayload = { ...buildPayload(), targetEmail: "info@probestack.io" };
      const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submitPayload),
      });
      if (submitRes.ok) {
        await fetchAllApplications();
        setOrgApprovalStatus("pending");
        startPolling(appId);
      } else throw new Error(await submitRes.text());
    } catch (err) { showMessage(err.message || "Failed to send approval request.", "error"); }
    finally { setIsSendingApproval(false); }
  };

  const startPolling = (appId) => {
    if (window._approvalInterval) clearInterval(window._approvalInterval);
    window._approvalInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/status`);
        if (res.ok) {
          const data = await res.json();
          setOrgApprovalStatus(data.status);
          if (data.status !== "pending") {
            clearInterval(window._approvalInterval);
            if (data.status === "approved") { setGatewayOnboardingStep("businessUnit"); showMessage("Organization approved! You can now proceed to Business Unit onboarding.", "success"); }
            else if (data.status === "rejected") showMessage("Organization request was rejected. Please update and resend.", "error");
          }
        }
      } catch (err) { console.error(err); }
    }, 10000);
  };

  const checkApprovalStatus = async () => {
    if (!currentApplicationId) { showMessage("No application ID found. Please submit for approval first.", "error"); return; }
    setIsCheckingStatus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentApplicationId}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const frontendStatus = mapStatus(data.status);
      setOrgApprovalStatus(frontendStatus);
      if (frontendStatus === "approved") { showMessage("Organization approved! You can now proceed to Business Unit onboarding.", "success"); setGatewayOnboardingStep("businessUnit"); }
      else if (frontendStatus === "rejected") showMessage("Organization request was rejected. Please update and resend.", "error");
      else if (frontendStatus === "pending") showMessage("Still pending approval. Please wait.", "info");
    } catch (err) { showMessage("Failed to check status. Please try again.", "error"); }
    finally { setIsCheckingStatus(false); }
  };

  const submitBusinessUnit = async () => {
    if (!onboardingTeamName || !onboardingApplicationName) { showMessage("Team Name and Application Name are required", "error"); return; }
    const membersPayload = teamMembers.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.role || null }));
    const consumersPayload = selectedOnboardingConsumers.map(consumerId => {
      const consumer = savedConsumers.find(c => c.id === consumerId);
      return { id: consumer.id, consumerId: consumer.consumerId || consumer.id, name: consumer.consumerName || "Unnamed" };
    });
    const payload = {
      onboardingId: currentApplicationId || null, teamName: onboardingTeamName, applicationName: onboardingApplicationName,
      applicationId: onboardingApplicationId, projectOwner: onboardingProjectOwner, ownerEmail: onboardingOwnerEmail,
      projectSME: onboardingProjectSME, projectSMEEmail: onboardingProjectSMEEmail, projectDLEmail: onboardingProjectDLEmail,
      expectedGoLiveDate: onboardingGoLiveDate, testerName: onboardingTesterName, testerEmail: onboardingTesterEmail,
      servicenowGroupName: onboardingServiceNowGroup, servicenowEmail: onboardingServiceNowEmail,
      members: membersPayload, consumers: consumersPayload,
    };
    setSubmittingBu(true);
    try {
      let url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units`;
      let method = "POST";
      if (editingBuId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editingBuId}`; method = "PUT"; }
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Submission failed"); }
      const result = await response.json();
      showMessage(result.message || "Business unit submitted successfully", "success");
      setEditingBuId(null); resetBuForm(); fetchBuHistory();
      localStorage.setItem("buCompleted", "true"); setBusinessUnitCompleted(true);
    } catch (err) { showMessage(err.message, "error"); }
    finally { setSubmittingBu(false); }
  };

  const mapStatus = (status) => {
    if (status === "PENDING_APPROVAL") return "pending";
    if (status === "DRAFT") return "draft";
    if (status === "APPROVED") return "approved";
    if (status === "REJECTED") return "rejected";
    return status?.toLowerCase() || "unknown";
  };

  const addGatewayOrg = () => {
    setGatewayOrgs(prev => [...prev, { id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
  };
  const removeGatewayOrg = (id) => { if (gatewayOrgs.length > 1) setGatewayOrgs(prev => prev.filter(org => org.id !== id)); };
  const updateGatewayOrg = (id, field, value) => setGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, [field]: value } : org));
  const updateGatewayOrgConfig = (id, configField, value) => setGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, config: { ...org.config, [configField]: value } } : org));
  const handleEnvironmentCheckbox = (orgId, env) => {
    setGatewayOrgs(prev => prev.map(org => {
      if (org.id !== orgId) return org;
      const selected = org.config.selectedEnvironments.includes(env) ? org.config.selectedEnvironments.filter(e => e !== env) : [...org.config.selectedEnvironments, env];
      return { ...org, config: { ...org.config, selectedEnvironments: selected } };
    }));
  };
  const addTeamMember = () => {
    if (!newTeamMember.name.trim() || !newTeamMember.email.trim()) { showMessage("Please enter name and email", "error"); return; }
    setTeamMembers(prev => [...prev, { id: Date.now(), name: newTeamMember.name, email: newTeamMember.email, role: "Member" }]);
    setNewTeamMember({ name: "", email: "" }); setShowTeamMemberModal(false); showMessage("Team member added", "success");
  };
  const handleSaveConsumer = async () => {
    setIsAddingConsumer(true);
    const consumerData = {
      organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", consumerName: consumerForm.consumerName,
      consumerPocName: consumerForm.consumerPocName, consumerPocEmail: consumerForm.consumerPocEmail,
      consumerSmeName: consumerForm.consumerSmeName, consumerSmeEmail: consumerForm.consumerSmeEmail,
      consumerConfig: consumerForm.consumerConfig, apiTps: parseInt(consumerForm.apiTps) || 100,
      quota: consumerForm.quota, rateLimiting: consumerForm.rateLimiting, apiKeyInformation: consumerForm.apiKeyInfo,
    };
    const result = await consumerService.createConsumer(consumerData);
    if (result.success) { await getConsumers(); setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" }); setShowConsumerModal(false); showMessage("Consumer saved successfully", "success"); }
    else showMessage(result.error, "error");
    setIsAddingConsumer(false);
  };
  const handleUpdateConsumer = async () => {
    setIsAddingConsumer(true);
    const consumerData = {
      organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", consumerName: consumerForm.consumerName,
      consumerPocName: consumerForm.consumerPocName, consumerPocEmail: consumerForm.consumerPocEmail,
      consumerSmeName: consumerForm.consumerSmeName, consumerSmeEmail: consumerForm.consumerSmeEmail,
      consumerConfig: consumerForm.consumerConfig, apiTps: parseInt(consumerForm.apiTps) || 100,
      quota: consumerForm.quota, rateLimiting: consumerForm.rateLimiting, apiKeyInformation: consumerForm.apiKeyInfo,
    };
    const result = await consumerService.updateConsumer(editingConsumerId, consumerData);
    if (result.success) { await getConsumers(); setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" }); showMessage("Consumer updated successfully", "success"); }
    else showMessage(result.error, "error");
    setIsAddingConsumer(false);
  };
  const envOptionsByType = { nonprod: ["dev", "test", "qa", "sat", "staging", "sandbox"], prod: ["preprod", "prod", "staging"] };

  // ========== Effects ==========
  useEffect(() => {
    fetchAllApplications(); fetchBuHistory(); getConsumers();
    return () => { if (window._approvalInterval) clearInterval(window._approvalInterval); };
  }, []);
  useEffect(() => {
    const fetchDashboardBu = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
        if (res.ok) { const data = await res.json(); const buList = data.data || []; setDashboardBuCount(buList.length); const totalMembers = buList.reduce((sum, bu) => sum + (bu.members?.length || 0), 0); setDashboardTeamMemberCount(totalMembers); }
      } catch (err) { console.error(err); }
    };
    fetchDashboardBu();
  }, []);

  // ========== Preview Modal (unchanged) ==========
  const PreviewModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5"/></div><div><h3 className="text-xl font-semibold text-white">Review & Submit</h3><p className="text-xs text-slate-400">Verify all details before sending for approval</p></div></div>
          <button onClick={() => setShowPreviewModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b pb-3 mb-4"><Building className="h-4 w-4 text-[#ff8a5c]"/><h4 className="text-sm font-semibold uppercase">Company Information</h4></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Company Name</span><span className="font-medium text-white">{company.name || "—"}</span></div><div><span className="block text-xs text-slate-500">Website</span><span className="font-medium text-white">{company.websiteUrl || "—"}</span></div><div><span className="block text-xs text-slate-500">Region</span><span className="font-medium text-white">{company.region || "—"}</span></div></div></div>
          <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b pb-3 mb-4"><Users className="h-4 w-4 text-[#ff8a5c]"/><h4 className="text-sm font-semibold uppercase">Stakeholder Details</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Full Name</span><span className="font-medium text-white">{orgOnboardingData.firstName} {orgOnboardingData.lastName}</span></div><div><span className="block text-xs text-slate-500">Email</span><span className="font-medium text-white">{orgOnboardingData.ownerEmail}</span></div><div><span className="block text-xs text-slate-500">Phone</span><span className="font-medium text-white">{orgOnboardingData.phoneNumber}</span></div><div><span className="block text-xs text-slate-500">SME</span><span className="font-medium text-white">{orgOnboardingData.sme || "—"}</span></div></div></div>
          <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b pb-3 mb-4"><Network className="h-4 w-4 text-[#ff8a5c]"/><h4 className="text-sm font-semibold uppercase">Gateway Organizations</h4></div>{gatewayOrgs.map((org, idx) => (<div key={org.id} className="mb-4 last:mb-0"><div className="text-white font-medium">{org.name || `Organization ${idx+1}`}</div><div className="text-xs text-slate-400">Region: {org.region || "—"} | Environments: {org.config.selectedEnvironments.join(", ") || "—"}</div></div>))}</div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={() => setShowPreviewModal(false)} className="rounded-lg border border-[#2a3a5a] bg-transparent px-5 py-2 text-sm font-medium text-slate-300">Cancel</button><button onClick={sendApprovalRequest} disabled={isSendingApproval} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">{isSendingApproval ? "Sending..." : "Confirm & Send"}</button></div>
      </div>
    </div>
  );

  // ========== RICH HISTORY MODAL (exactly like original) ==========
  const HistoryModal = ({ open, onClose, onLoadOrganization, onLoadBusinessUnit }) => {
    if (!open) return null;

    const aggregatedTeamMembers = useMemo(() => {
      const members = [];
      buSubmissions.forEach(bu => {
        if (bu.members && Array.isArray(bu.members)) {
          bu.members.forEach(member => {
            members.push({
              ...member,
              businessUnitId: bu.id,
              businessUnitName: bu.teamName,
              businessUnitAppName: bu.applicationName,
            });
          });
        }
      });
      return members;
    }, [buSubmissions]);

    const [teamMemberSearch, setTeamMemberSearch] = useState("");
    const [localCopiedId, setLocalCopiedId] = useState(null);

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><History className="h-5 w-5"/></div>
              <div><h3 className="text-xl font-semibold text-white">Onboarding History</h3><p className="text-xs text-slate-400">View past submissions</p></div>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5"/></button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 px-6 pt-4 border-b border-[#2a3a5a]">
            {["organization", "bu", "team"].map(tab => (
              <button key={tab} onClick={() => setHistoryActiveTab(tab)} className={`pb-2 px-1 text-sm font-medium transition capitalize ${historyActiveTab === tab ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"}`}>
                {tab === "organization" ? "Organization" : tab === "bu" ? "Business Unit" : "Team"}
              </button>
            ))}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {historyActiveTab === "organization" && (
              organizationSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600"/><p>No organization submissions yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {organizationSubmissions.map(sub => {
                    const status = mapStatus(sub.status);
                    const statusColors = {
                      approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                      rejected: "bg-red-500/20 text-red-300 border-red-500/30",
                      draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                    };
                    const statusColor = statusColors[status] || statusColors.draft;
                    return (
                      <div key={sub.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all duration-300 hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold text-white">{sub.company?.name || "N/A"}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>{status.toUpperCase()}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-slate-500">Onboarding ID:</span>
                                <code className="text-xs font-mono text-slate-300 bg-[#1a1f2e] px-2 py-0.5 rounded-md">{sub.id}</code>
                                <button onClick={() => { navigator.clipboard.writeText(sub.id); setLocalCopiedId(sub.id); setTimeout(() => setLocalCopiedId(null), 2000); }} className="p-1 rounded-md hover:bg-[#2a3550] transition-colors" title="Copy ID">
                                  {localCopiedId === sub.id ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />}
                                </button>
                              </div>
                            </div>
                            <button onClick={() => onLoadOrganization(sub.id)} className="px-4 py-1.5 rounded-lg border border-[#ff5b1f]/30 bg-[#ff5b1f]/10 text-[#ff8a5c] text-sm font-medium hover:bg-[#ff5b1f]/20 transition">View</button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-[#1f2840] pt-3">
                            <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Stakeholder:</span><span className="text-white truncate">{sub.stakeholder?.firstName} {sub.stakeholder?.lastName}</span></div>
                            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Email:</span><span className="text-white truncate">{sub.stakeholder?.email}</span></div>
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Phone:</span><span className="text-white">{sub.stakeholder?.phone}</span></div>
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Submitted:</span><span className="text-white text-xs">{new Date(sub.timestamp || sub.createdAt).toLocaleString()}</span></div>
                          </div>
                          {sub.gatewayOrganizations && sub.gatewayOrganizations.length > 0 && (
                            <div className="bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
                              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><Network className="h-3 w-3"/><span>Gateway Organizations ({sub.gatewayOrganizations.length})</span></div>
                              <div className="flex flex-wrap gap-2">{sub.gatewayOrganizations.slice(0,3).map((org, idx) => (<span key={idx} className="text-xs bg-[#1a1f2e] text-slate-300 px-2 py-1 rounded-md">{org.name || "Unnamed"}</span>))}{sub.gatewayOrganizations.length > 3 && <span className="text-xs text-slate-400">+{sub.gatewayOrganizations.length-3} more</span>}</div>
                            </div>
                          )}
                        </div>
                        <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs"><span className="text-slate-500">Last updated: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : "—"}</span><span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>{status === "approved" ? "Approved" : status === "pending" ? "Pending" : status}</span></div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {historyActiveTab === "bu" && (
              buSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600"/><p>No business unit submissions yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {buSubmissions.map(bu => (
                    <div key={bu.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all duration-300 hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div><h3 className="text-lg font-semibold text-white">{bu.teamName}<span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span></h3><p className="text-sm text-slate-400 mt-1">Application: <span className="text-white font-mono">{bu.applicationName}</span>{bu.applicationId && <span className="ml-2 text-xs text-slate-500">(ID: {bu.applicationId})</span>}</p></div>
                          <div className="flex items-center gap-2"><button onClick={() => onLoadBusinessUnit(bu)} className="p-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff8a5c] hover:bg-[#ff5b1f]/20 transition-colors" title="Edit Business Unit"><Edit className="h-4 w-4"/></button></div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm border-t border-[#1f2840] pt-3">
                          <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Owner:</span><span className="text-white font-medium">{bu.projectOwner || "—"}</span></div>
                          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Go‑Live:</span><span className="text-white font-mono text-xs">{bu.expectedGoLiveDate ? new Date(bu.expectedGoLiveDate).toLocaleDateString() : "—"}</span></div>
                          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Members:</span><span className="text-white font-semibold">{bu.members?.length || 0}</span></div>
                          <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Consumers:</span><span className="text-white font-semibold">{bu.consumers?.length || 0}</span></div>
                        </div>
                      </div>
                      <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs"><span className="text-slate-500">Created: {bu.createdAt ? new Date(bu.createdAt).toLocaleDateString() : "—"}</span><span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>Synced</span></div>
                    </div>
                  ))}
                </div>
              )
            )}

            {historyActiveTab === "team" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-lg font-semibold text-white">Team Members</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/><input type="text" placeholder="Search by name or email..." value={teamMemberSearch} onChange={e => setTeamMemberSearch(e.target.value)} className="w-64 rounded-lg border border-[#2a3550] bg-[#0f1117] pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff5b1f]"/></div></div>
                <div className="overflow-x-auto rounded-xl border border-[#2a3550] bg-[#111520]">
                  <table className="min-w-full divide-y divide-[#1f2840]">
                    <thead className="bg-[#1a1f2e]"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Member</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Business Unit</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Application</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Actions</th></tr></thead>
                    <tbody>
                      {aggregatedTeamMembers.filter(m => m.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) || m.email?.toLowerCase().includes(teamMemberSearch.toLowerCase())).map(member => (
                        <tr key={`${member.businessUnitId}-${member.id}`} className="hover:bg-[#1a1f2e]/50 transition"><td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff8a5c]/10 flex items-center justify-center text-white font-medium">{member.name?.charAt(0).toUpperCase()}</div><div><div className="text-sm font-medium text-white">{member.name}</div><div className="text-xs text-slate-400">{member.email}</div></div></div></td><td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300">{member.role || "Member"}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-white">{member.businessUnitName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{member.businessUnitAppName}</td><td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={() => { const bu = buSubmissions.find(b => b.id === member.businessUnitId); if (bu) onLoadBusinessUnit(bu); }} className="text-[#4f8ef7] hover:text-[#ff8a5c] transition flex items-center gap-1"><Edit className="h-4 w-4"/><span className="hidden sm:inline">Edit BU</span></button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={onClose} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">Close</button></div>
        </div>
      </div>
    );
  };

  // ========== Main Render ==========
  if (onboardingView === "history") {
    return <HistoryModal open={true} onClose={() => setOnboardingView("form")} onLoadOrganization={(id) => { loadSubmission(id); setOnboardingView("form"); }} onLoadBusinessUnit={(bu) => { loadBusinessUnit(bu); setOnboardingView("form"); }} />;
  }

  const isOrgApproved = orgApprovalStatus === "approved";
  const isOrgPending = orgApprovalStatus === "pending";

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div><h2 className="text-3xl font-semibold text-white">Gateway Onboarding</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f8fa8]">Start with Organization Onboarding. After admin approval, proceed to Business Unit setup.</p></div>
        <div className="flex gap-3">
          {isCreateNewOnboarding && (
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-[#27314e] bg-primary text-sm font-medium text-white hover:bg-[#ff5b1f]/20 flex items-center gap-2">
              <Plus className="w-4 h-4"/> Create New
            </button>
          )}
          <button onClick={() => setOnboardingView("history")} className="px-4 py-2 rounded-lg border border-[#27314e] bg-primary text-sm font-medium text-white hover:bg-[#ff5b1f]/20 flex items-center gap-2">
            <History className="w-4 h-4"/> History
          </button>
        </div>
      </div>

      {/* Dashboard Stats (glassmorphic cards with hover animations) */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#ff8a5c]/40 hover:shadow-lg hover:shadow-[#ff5b1f]/5"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Organization</p><p className="mt-1 text-base font-semibold text-white">{company.name || "Not started"}</p></div><Building className="h-5 w-5 text-[#ff8a5c]"/></div><div className="mt-3 flex justify-between"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${orgApprovalStatus === "approved" ? "bg-emerald-500/20 text-emerald-300" : orgApprovalStatus === "pending" ? "bg-yellow-500/20 text-yellow-300" : "bg-slate-500/20 text-slate-300"}`}>{orgApprovalStatus ? orgApprovalStatus.toUpperCase() : (company.name ? "DRAFT" : "PENDING")}</span>{isOrgPending && <button onClick={checkApprovalStatus} className="text-[10px] text-[#4f8ef7] hover:underline">Check status</button>}</div></div>
        <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#2a55a0]/40 hover:shadow-lg"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Business Units</p><p className="mt-1 text-2xl font-bold text-white">{dashboardBuCount}</p></div><Users className="h-5 w-5 text-sky-400"/></div></div>
        <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#2a55a0]/40 hover:shadow-lg"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Team Members</p><p className="mt-1 text-2xl font-bold text-white">{dashboardTeamMemberCount}</p></div><UserCircle className="h-5 w-5 text-emerald-400"/></div></div>
        <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#2a55a0]/40 hover:shadow-lg"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Consumers</p><p className="mt-1 text-2xl font-bold text-white">{dashboardConsumerCount}</p></div><Layers className="h-5 w-5 text-purple-400"/></div></div>
      </div>

      {/* Step Selector Cards with hover animations */}
      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <button onClick={() => setGatewayOnboardingStep("organization")} className={`rounded-xl border p-3 text-left transition-all duration-300 ${gatewayOnboardingStep === "organization" ? "border-[#ff8a5c]/45 bg-[#ff5b1f]/10 shadow-[0_8px_20px_-10px_rgba(255,91,31,0.6)]" : "border-[#27314e] bg-[#111520] hover:border-white/15 hover:bg-white/[0.02]"}`}><div className="flex items-center gap-3"><Server className="h-4 w-4 text-slate-400"/><div><h3 className="text-sm font-semibold text-white">Organization</h3><p className="text-xs text-slate-400">Register & get approval</p></div></div></button>
        <button onClick={() => { if (orgApprovalStatus !== "approved") { showMessage("Organization approval required first.", "error"); return; } setGatewayOnboardingStep("businessUnit"); }} className={`rounded-xl border p-3 text-left transition-all duration-300 ${gatewayOnboardingStep === "businessUnit" ? "border-[#ff8a5c]/45 bg-[#ff5b1f]/10 shadow-[0_8px_20px_-10px_rgba(255,91,31,0.6)]" : "border-[#27314e] bg-[#111520] hover:border-white/15 hover:bg-white/[0.02]"} ${orgApprovalStatus !== "approved" ? "opacity-60 cursor-not-allowed" : ""}`}><div className="flex items-center gap-3"><Users className="h-4 w-4 text-slate-400"/><div><h3 className="text-sm font-semibold text-white">Business Unit</h3><p className="text-xs text-slate-400">Define team & API scope</p></div></div></button>
      </div>

      {/* Organization Form (exact original structure with animations) */}
      {gatewayOnboardingStep === "organization" && (
        <div className="rounded-2xl border border-[#27314e] bg-[#111520] p-6 space-y-4 transition-all duration-300">
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><h4 className="text-sm font-semibold flex items-center gap-2"><Building className="w-4 h-4"/> Company Information</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3"><div><Label className="text-xs text-gray-300">Company Name *</Label><Input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="bg-dark-900 border-dark-700 text-white"/></div><div><Label className="text-xs text-gray-300">Website URL</Label><Input value={company.websiteUrl} onChange={e => setCompany({...company, websiteUrl: e.target.value})} className="bg-dark-900 border-dark-700 text-white"/></div><div><Label className="text-xs text-gray-300">Region</Label><select value={company.region} onChange={e => setCompany({...company, region: e.target.value})} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div></div></Card>
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><h4 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4"/> Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"><div><Label className="text-xs text-gray-300">First Name *</Label><Input value={orgOnboardingData.firstName} onChange={e => setOrgOnboardingData({...orgOnboardingData, firstName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Last Name *</Label><Input value={orgOnboardingData.lastName} onChange={e => setOrgOnboardingData({...orgOnboardingData, lastName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Owner Email *</Label><Input type="email" value={orgOnboardingData.ownerEmail} onChange={e => setOrgOnboardingData({...orgOnboardingData, ownerEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Contact Number *</Label><Input value={orgOnboardingData.phoneNumber} onChange={e => setOrgOnboardingData({...orgOnboardingData, phoneNumber: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Name</Label><Input value={orgOnboardingData.sme} onChange={e => setOrgOnboardingData({...orgOnboardingData, sme: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Email</Label><Input type="email" value={orgOnboardingData.smeEmail} onChange={e => setOrgOnboardingData({...orgOnboardingData, smeEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Distribution List Email</Label><Input type="email" value={orgOnboardingData.dlEmail} onChange={e => setOrgOnboardingData({...orgOnboardingData, dlEmail: e.target.value})}/></div></div></Card>
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold flex items-center gap-2"><Network className="w-4 h-4"/> Gateway Configurations</h4><button onClick={addGatewayOrg} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-all"><Plus className="w-3.5 h-3.5 inline mr-1"/> Add Organization</button></div><div className="space-y-6">{gatewayOrgs.map(org => (<div key={org.id} className="relative border border-dark-700 rounded-lg p-4 transition-all hover:border-[#ff8a5c]/40">{gatewayOrgs.length > 1 && <button onClick={() => removeGatewayOrg(org.id)} className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-400 transition-colors"><X className="w-4 h-4"/></button>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><Label className="text-xs text-gray-300">Region</Label><select value={org.region} onChange={e => updateGatewayOrg(org.id, "region", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div><div><Label className="text-xs text-gray-300">Gateway Organization Name *</Label><Input value={org.name} onChange={e => updateGatewayOrg(org.id, "name", e.target.value)}/></div></div><div className="border-t border-dark-700 pt-4 mt-2"><div className="mb-4"><Label className="text-xs text-gray-300">Environment Type</Label><div className="flex gap-4 mt-1"><label className="flex items-center gap-2"><input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === "nonprod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "nonprod")}/> non-prod</label><label className="flex items-center gap-2"><input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === "prod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "prod")}/> prod</label></div></div><div className="mb-4"><Label className="text-xs text-gray-300">Select Environments</Label><div className="flex flex-wrap gap-3 border border-dark-700 rounded-lg p-3 bg-dark-900/50">{envOptionsByType[org.config.environmentType].map(env => (<label key={env} className="flex items-center gap-1.5 text-sm text-gray-300"><input type="checkbox" checked={org.config.selectedEnvironments.includes(env)} onChange={() => handleEnvironmentCheckbox(org.id, env)}/><span>{env}</span></label>))}<label className="flex items-center gap-1.5 text-sm text-gray-300"><input type="checkbox" checked={org.config.selectedEnvironments.includes("custom")} onChange={() => { if (org.config.selectedEnvironments.includes("custom")) { updateGatewayOrgConfig(org.id, "selectedEnvironments", org.config.selectedEnvironments.filter(e => e !== "custom")); updateGatewayOrgConfig(org.id, "customEnvironments", ""); } else { updateGatewayOrgConfig(org.id, "selectedEnvironments", [...org.config.selectedEnvironments, "custom"]); } }}/><span>Custom</span></label></div>{org.config.selectedEnvironments.includes("custom") && <div className="mt-3"><Input placeholder="Enter comma-separated environments" value={org.config.customEnvironments} onChange={e => updateGatewayOrgConfig(org.id, "customEnvironments", e.target.value)}/></div>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">Expected TPS</Label><Input type="number" value={org.config.expectedTps} onChange={e => updateGatewayOrgConfig(org.id, "expectedTps", e.target.value)}/></div><div><Label className="text-xs text-gray-300">Expected No. of APIs</Label><select value={org.config.expectedApiRange} onChange={e => updateGatewayOrgConfig(org.id, "expectedApiRange", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"><option value="">Select range</option><option value="0-100">0 - 100</option><option value="100-300">100 - 300</option><option value="300-500">300 - 500</option><option value="500-1000+">500 - 1000+</option></select></div><div className="md:col-span-2"><Label className="text-xs text-gray-300">Notes</Label><textarea rows={2} value={org.config.notes} onChange={e => updateGatewayOrgConfig(org.id, "notes", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900 resize-none"/></div></div></div></div>))}</div></Card>
          <div className="flex gap-3 pt-2"><button onClick={resetForm} className="h-10 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20">Reset</button><button onClick={saveAsDraft} disabled={isSavingDraft} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06] disabled:opacity-50">{isSavingDraft ? "Saving..." : "Save Draft"}</button><button onClick={() => setShowPreviewModal(true)} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06]">Preview</button><button onClick={sendApprovalRequest} disabled={isSendingApproval} className="h-10 rounded-xl bg-[#ff5b1f] px-6 text-sm font-semibold text-white transition-all hover:bg-[#ff6b36] disabled:opacity-50">{isSendingApproval ? "Sending..." : "Send for Approval"}</button>{isOrgPending && <button onClick={checkApprovalStatus} disabled={isCheckingStatus} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06] disabled:opacity-50">{isCheckingStatus ? "Checking..." : "Check Status"}</button>}</div>
        </div>
      )}

      {/* Business Unit Form (similar animations) */}
      {gatewayOnboardingStep === "businessUnit" && orgApprovalStatus === "approved" && (
        <div className="rounded-2xl border border-[#27314e] bg-[#111520] p-6 space-y-4 transition-all duration-300">
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><h4 className="text-sm font-semibold mb-4">Business Unit Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">BU Name *</Label><Input value={onboardingTeamName} onChange={e => setOnboardingTeamName(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Application Name *</Label><Input value={onboardingApplicationName} onChange={e => setOnboardingApplicationName(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Application Id</Label><Input value={onboardingApplicationId} onChange={e => setOnboardingApplicationId(e.target.value)}/></div></div></Card>
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><h4 className="text-sm font-semibold mb-4">Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">Project Owner</Label><Input value={onboardingProjectOwner} onChange={e => setOnboardingProjectOwner(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Owner Email</Label><Input type="email" value={onboardingOwnerEmail} onChange={e => setOnboardingOwnerEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Project SME</Label><Input value={onboardingProjectSME} onChange={e => setOnboardingProjectSME(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Project SME Email</Label><Input type="email" value={onboardingProjectSMEEmail} onChange={e => setOnboardingProjectSMEEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Project DL Email</Label><Input type="email" value={onboardingProjectDLEmail} onChange={e => setOnboardingProjectDLEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Expected Go-Live Date</Label><Input type="date" value={onboardingGoLiveDate} onChange={e => setOnboardingGoLiveDate(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Tester Name</Label><Input value={onboardingTesterName} onChange={e => setOnboardingTesterName(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Tester Email</Label><Input type="email" value={onboardingTesterEmail} onChange={e => setOnboardingTesterEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">ServiceNow Group Name</Label><Input value={onboardingServiceNowGroup} onChange={e => setOnboardingServiceNowGroup(e.target.value)}/></div><div><Label className="text-xs text-gray-300">ServiceNow Email</Label><Input type="email" value={onboardingServiceNowEmail} onChange={e => setOnboardingServiceNowEmail(e.target.value)}/></div></div></Card>
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold">Team Members</h4><button onClick={() => setShowTeamMemberModal(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white transition-all hover:bg-primary/90">+ Add Member</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{teamMembers.map(m => (<div key={m.id} className="p-3 rounded-lg border border-dark-700 bg-dark-900/60 transition-all hover:border-primary/50"><p className="text-sm font-medium text-white">{m.name}</p><p className="text-xs text-gray-400">{m.email}</p></div>))}</div></Card>
          <Card className="p-5 bg-[#0f172a]/50 transition-all hover:border-[#ff8a5c]/30"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold">Consumer Information</h4><button onClick={() => setShowConsumerModal(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white transition-all hover:bg-primary/90">+ Add Consumer</button></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{savedConsumers.map(c => (<div key={c.id} onClick={() => setSelectedOnboardingConsumers(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedOnboardingConsumers.includes(c.id) ? "border-primary bg-primary/20" : "border-dark-700 hover:border-primary/50"}`}><p className="text-xs font-medium text-white truncate">{c.consumerName}</p>{selectedOnboardingConsumers.includes(c.id) && <CheckCircle className="w-3 h-3 text-primary mt-1"/>}</div>))}</div></Card>
          <div className="flex justify-end pt-2"><button onClick={submitBusinessUnit} disabled={submittingBu} className="h-10 rounded-xl bg-[#ff5b1f] px-6 text-sm font-semibold text-white transition-all hover:bg-[#ff6b36] disabled:opacity-50">{submittingBu ? "Submitting..." : "Submit Business Unit"}</button></div>
        </div>
      )}

      {/* Modals */}
      {showPreviewModal && <PreviewModal />}
      {showHistoryModal && (
        <HistoryModal
          open={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onLoadOrganization={(id) => { loadSubmission(id); setCurrentApplicationId(id); setGatewayOnboardingStep("organization"); setIsCreateNewOnboarding(false); }}
          onLoadBusinessUnit={(bu) => { loadBusinessUnit(bu); setOnboardingView("form"); setShowHistoryModal(false); }}
        />
      )}
      {showTeamMemberModal && 
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-md rounded-xl border border-dark-700 bg-[#161b30]"><div className="flex justify-between px-6 py-4 border-b border-dark-700"><h2 className="text-lg font-semibold text-white">Add Team Member</h2><button onClick={() => setShowTeamMemberModal(false)} className="text-gray-400 hover:text-white">✕</button></div><div className="p-6 space-y-4"><div><Label className="text-xs text-gray-300">Full Name *</Label><Input value={newTeamMember.name} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Email *</Label><Input type="email" value={newTeamMember.email} onChange={e => setNewTeamMember({...newTeamMember, email: e.target.value})}/></div></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700"><button onClick={() => setShowTeamMemberModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300">Cancel</button><button onClick={addTeamMember} className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary text-white">Add Member</button></div></div></div>}
      {showConsumerModal && 
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-dark-700 bg-[#161b30]"><div className="flex justify-between px-6 py-4 border-b border-dark-700"><h2 className="text-lg font-semibold text-white">{editingConsumerId ? "Edit Consumer" : "Add Consumer"}</h2><button onClick={() => { setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" }); }} className="text-gray-400 hover:text-white">✕</button></div><div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">Consumer Name</Label><Input value={consumerForm.consumerName} onChange={e => setConsumerForm({...consumerForm, consumerName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">POC Name</Label><Input value={consumerForm.consumerPocName} onChange={e => setConsumerForm({...consumerForm, consumerPocName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">POC Email</Label><Input value={consumerForm.consumerPocEmail} onChange={e => setConsumerForm({...consumerForm, consumerPocEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={e => setConsumerForm({...consumerForm, consumerSmeName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Email</Label><Input value={consumerForm.consumerSmeEmail} onChange={e => setConsumerForm({...consumerForm, consumerSmeEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Config</Label><Input value={consumerForm.consumerConfig} onChange={e => setConsumerForm({...consumerForm, consumerConfig: e.target.value})}/></div><div><Label className="text-xs text-gray-300">API TPS</Label><Input value={consumerForm.apiTps} onChange={e => setConsumerForm({...consumerForm, apiTps: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Quota</Label><Input value={consumerForm.quota} onChange={e => setConsumerForm({...consumerForm, quota: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Rate Limiting</Label><Input value={consumerForm.rateLimiting} onChange={e => setConsumerForm({...consumerForm, rateLimiting: e.target.value})}/></div><div><Label className="text-xs text-gray-300">API Key Info</Label><Input value={consumerForm.apiKeyInfo} onChange={e => setConsumerForm({...consumerForm, apiKeyInfo: e.target.value})}/></div></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700"><button onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300">Cancel</button><button onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer} disabled={isAddingConsumer} className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary text-white">{editingConsumerId ? "Update Consumer" : (isAddingConsumer ? "Saving..." : "Save Consumer")}</button></div></div></div>}
    </div>
  );
};




// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import {
//   Building, Users, Server, UserCircle, Mail, Phone, Calendar, Network, Plus, X,
//   CheckCircle, AlertCircle, Rocket, Layers, History, ArrowLeft, Archive, Edit, Copy,
//   Check, Eye, FileText, GitBranch, Trash2, ChevronRight, ChevronDown, Loader2
// } from "lucide-react";
// import { Card } from "../../components/ui/card";
// import { Button } from "../../components/ui/button";
// import { Badge } from "../../components/ui/badge";
// import { Input } from "../../components/ui/input";
// import { Label } from "../../components/ui/label";
// import { cn } from "../../lib/utils";
// import API_BASE_URL from "../../config/apiConfig";
// import { consumerService } from "../../services/consumerService";

// const generateGatewayId = (prefix = "g") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

// export const OnboardingView = ({ showMessage }) => {
//   // ========== All original state ==========
//   const [onboardingView, setOnboardingView] = useState("form");
//   const [gatewayOnboardingStep, setGatewayOnboardingStep] = useState("organization");
//   const [orgApprovalStatus, setOrgApprovalStatus] = useState(null);
//   const [currentApplicationId, setCurrentApplicationId] = useState(null);
//   const [isSendingApproval, setIsSendingApproval] = useState(false);
//   const [isSavingDraft, setIsSavingDraft] = useState(false);
//   const [approvalMessage, setApprovalMessage] = useState(null);
//   const [isCheckingStatus, setIsCheckingStatus] = useState(false);
//   const [businessUnitCompleted, setBusinessUnitCompleted] = useState(() => localStorage.getItem("buCompleted") === "true");
//   const [showPreviewModal, setShowPreviewModal] = useState(false);
//   const [showHistoryModal, setShowHistoryModal] = useState(false);
//   const [organizationSubmissions, setOrganizationSubmissions] = useState([]);
//   const [buSubmissions, setBuSubmissions] = useState([]);
//   const [teamSubmissions, setTeamSubmissions] = useState([]);
//   const [historyActiveTab, setHistoryActiveTab] = useState("organization");
//   const [isCreateNewOnboarding, setIsCreateNewOnboarding] = useState(false);
//   const [copiedId, setCopiedId] = useState(null);

//   // Company & Stakeholder
//   const [company, setCompany] = useState({ name: "", websiteUrl: "", region: "" });
//   const [orgOnboardingData, setOrgOnboardingData] = useState({
//     firstName: "", lastName: "", ownerEmail: "", phoneNumber: "",
//     sme: "", smeEmail: "", dlEmail: "", goLiveDate: "",
//   });
//   const [gatewayOrgs, setGatewayOrgs] = useState([
//     {
//       id: generateGatewayId(), name: "", region: "",
//       config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" }
//     }
//   ]);

//   // Business Unit fields
//   const [onboardingTeamName, setOnboardingTeamName] = useState("");
//   const [onboardingApplicationName, setOnboardingApplicationName] = useState("");
//   const [onboardingApplicationId, setOnboardingApplicationId] = useState("");
//   const [onboardingProjectOwner, setOnboardingProjectOwner] = useState("");
//   const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState("");
//   const [onboardingProjectSME, setOnboardingProjectSME] = useState("");
//   const [onboardingProjectSMEEmail, setOnboardingProjectSMEEmail] = useState("");
//   const [onboardingProjectDLEmail, setOnboardingProjectDLEmail] = useState("");
//   const [onboardingGoLiveDate, setOnboardingGoLiveDate] = useState("");
//   const [onboardingTesterName, setOnboardingTesterName] = useState("");
//   const [onboardingTesterEmail, setOnboardingTesterEmail] = useState("");
//   const [onboardingServiceNowGroup, setOnboardingServiceNowGroup] = useState("");
//   const [onboardingServiceNowEmail, setOnboardingServiceNowEmail] = useState("");
//   const [teamMembers, setTeamMembers] = useState([]);
//   const [savedConsumers, setSavedConsumers] = useState([]);
//   const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] = useState([]);
//   const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
//   const [newTeamMember, setNewTeamMember] = useState({ name: "", email: "" });
//   const [showConsumerModal, setShowConsumerModal] = useState(false);
//   const [consumerForm, setConsumerForm] = useState({
//     consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "",
//     consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: ""
//   });
//   const [isAddingConsumer, setIsAddingConsumer] = useState(false);
//   const [editingConsumerId, setEditingConsumerId] = useState(null);
//   const [submittingBu, setSubmittingBu] = useState(false);
//   const [editingBuId, setEditingBuId] = useState(null);

//   // Dashboard counts
//   const [dashboardBuCount, setDashboardBuCount] = useState(0);
//   const [dashboardTeamMemberCount, setDashboardTeamMemberCount] = useState(0);
//   const [dashboardConsumerCount, setDashboardConsumerCount] = useState(0);

//   // ========== Helper functions ==========
//   const isValidEmail = (email) => /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
//   const buildPayload = () => ({
//     company: { name: company.name, websiteUrl: company.websiteUrl, region: company.region },
//     stakeholder: {
//       firstName: orgOnboardingData.firstName, lastName: orgOnboardingData.lastName,
//       email: orgOnboardingData.ownerEmail, phone: orgOnboardingData.phoneNumber,
//       sme: orgOnboardingData.sme, smeEmail: orgOnboardingData.smeEmail, dlEmail: orgOnboardingData.dlEmail,
//     },
//     gatewayOrganizations: gatewayOrgs.map(org => ({
//       id: org.id, name: org.name, region: org.region,
//       config: {
//         environmentType: org.config.environmentType, selectedEnvironments: org.config.selectedEnvironments,
//         customEnvironments: org.config.customEnvironments, expectedTps: org.config.expectedTps,
//         expectedApiRange: org.config.expectedApiRange, notes: org.config.notes,
//       }
//     })),
//   });

//   const validateOrgForm = () => {
//     if (!company.name) { showMessage("Company name is required", "error"); return false; }
//     if (!orgOnboardingData.firstName || !orgOnboardingData.lastName) { showMessage("First and Last name are required", "error"); return false; }
//     if (!isValidEmail(orgOnboardingData.ownerEmail)) { showMessage("Valid Owner Email is required", "error"); return false; }
//     if (!orgOnboardingData.phoneNumber) { showMessage("Contact number is required", "error"); return false; }
//     const hasValidGatewayOrg = gatewayOrgs.some(org => org.name.trim() !== "");
//     if (!hasValidGatewayOrg) { showMessage("At least one Gateway Organization name is required", "error"); return false; }
//     return true;
//   };

//   const resetForm = () => {
//     setIsCreateNewOnboarding(false);
//     setCompany({ name: "", websiteUrl: "", region: "" });
//     setOrgOnboardingData({ firstName: "", lastName: "", ownerEmail: "", phoneNumber: "", sme: "", smeEmail: "", dlEmail: "", goLiveDate: "" });
//     setGatewayOrgs([{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
//     setApprovalMessage(null);
//     setCurrentApplicationId(null);
//     setOrgApprovalStatus(null);
//     showMessage("Form has been reset.", "info");
//   };

//   const resetBuForm = () => {
//     setOnboardingTeamName(""); setOnboardingApplicationName(""); setOnboardingApplicationId("");
//     setOnboardingProjectOwner(""); setOnboardingOwnerEmail(""); setOnboardingProjectSME("");
//     setOnboardingProjectSMEEmail(""); setOnboardingProjectDLEmail(""); setOnboardingGoLiveDate("");
//     setOnboardingTesterName(""); setOnboardingTesterEmail(""); setOnboardingServiceNowGroup("");
//     setOnboardingServiceNowEmail(""); setTeamMembers([]); setSelectedOnboardingConsumers([]); setEditingBuId(null);
//   };

//   // ========== API calls ==========
//   const fetchAllApplications = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`);
//       if (response.ok) setOrganizationSubmissions(await response.json());
//     } catch (err) { console.error(err); }
//   };
//   const fetchBuHistory = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
//       if (response.ok) {
//         const result = await response.json();
//         setBuSubmissions(result.data || []);
//         const allMembers = result.data?.flatMap(unit => unit.members || []) || [];
//         const uniqueMembersMap = new Map();
//         allMembers.forEach(member => { if (member.email && !uniqueMembersMap.has(member.email)) uniqueMembersMap.set(member.email, member); });
//         setTeamSubmissions(Array.from(uniqueMembersMap.values()));
//       }
//     } catch (err) { console.error(err); }
//   };
//   const getConsumers = async () => {
//     const result = await consumerService.getAllConsumers();
//     if (result.success) {
//       setSavedConsumers(result.data?.data || result.data || []);
//       setDashboardConsumerCount(result.data?.data?.length || result.data?.length || 0);
//     }
//   };

//   const loadSubmission = async (id) => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${id}`);
//       if (!response.ok) throw new Error();
//       const data = await response.json();
//       setCompany(data.company);
//       setOrgOnboardingData({
//         firstName: data.stakeholder.firstName, lastName: data.stakeholder.lastName,
//         ownerEmail: data.stakeholder.email, phoneNumber: data.stakeholder.phone,
//         sme: data.stakeholder.sme || "", smeEmail: data.stakeholder.smeEmail || "",
//         dlEmail: data.stakeholder.dlEmail || "", goLiveDate: "",
//       });
//       setGatewayOrgs(data.gatewayOrganizations.map(org => ({
//         id: org.id, name: org.name, region: org.region,
//         config: {
//           environmentType: org.config.environmentType, selectedEnvironments: org.config.selectedEnvironments,
//           customEnvironments: org.config.customEnvironments || "", expectedTps: org.config.expectedTps,
//           expectedApiRange: org.config.expectedApiRange, notes: org.config.notes || "",
//         }
//       })));
//       const frontendStatus = mapStatus(data.status);
//       setOrgApprovalStatus(frontendStatus);
//       setCurrentApplicationId(data.id);
//       if (frontendStatus === "approved") setGatewayOnboardingStep("businessUnit");
//       else setGatewayOnboardingStep("organization");
//       setShowHistoryModal(false);
//       showMessage(`${frontendStatus.toUpperCase()} organization loaded.`, "success");
//     } catch (err) { showMessage("Failed to load submission details.", "error"); }
//   };

//   const loadBusinessUnit = (bu) => {
//     setOnboardingTeamName(bu.teamName); setOnboardingApplicationName(bu.applicationName);
//     setOnboardingApplicationId(bu.applicationId || ""); setOnboardingProjectOwner(bu.projectOwner || "");
//     setOnboardingOwnerEmail(bu.ownerEmail || ""); setOnboardingProjectSME(bu.projectSME || "");
//     setOnboardingProjectSMEEmail(bu.projectSMEEmail || ""); setOnboardingProjectDLEmail(bu.projectDLEmail || "");
//     setOnboardingGoLiveDate(bu.expectedGoLiveDate || ""); setOnboardingTesterName(bu.testerName || "");
//     setOnboardingTesterEmail(bu.testerEmail || ""); setOnboardingServiceNowGroup(bu.servicenowGroupName || "");
//     setOnboardingServiceNowEmail(bu.servicenowEmail || ""); setTeamMembers(bu.members || []);
//     setSelectedOnboardingConsumers((bu.consumers || []).map(c => c.id));
//     setEditingBuId(bu.id);
//     showMessage(`Loaded business unit "${bu.teamName}" for editing`, "success");
//   };

//   const saveAsDraft = async () => {
//     if (!validateOrgForm()) return;
//     setIsSavingDraft(true);
//     try {
//       const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, {
//         method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
//       });
//       if (response.ok) {
//         await fetchAllApplications();
//         const data = await response.json();
//         setCurrentApplicationId(data.id);
//         setOrgApprovalStatus("draft");
//         showMessage("Organization data saved as draft.", "success");
//       } else throw new Error("Failed to save draft");
//     } catch (err) { showMessage("Failed to save draft.", "error"); }
//     finally { setIsSavingDraft(false); }
//   };

//   const sendApprovalRequest = async () => {
//     if (!validateOrgForm()) return;
//     setIsSendingApproval(true);
//     try {
//       let appId = currentApplicationId;
//       if (!appId) {
//         const draftRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/draft`, {
//           method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
//         });
//         if (!draftRes.ok) throw new Error("Failed to create draft");
//         const draftData = await draftRes.json();
//         appId = draftData.id;
//         setCurrentApplicationId(appId);
//       }
//       const submitPayload = { ...buildPayload(), targetEmail: "info@probestack.io" };
//       const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, {
//         method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submitPayload),
//       });
//       if (submitRes.ok) {
//         await fetchAllApplications();
//         setOrgApprovalStatus("pending");
//         startPolling(appId);
//       } else throw new Error(await submitRes.text());
//     } catch (err) { showMessage(err.message || "Failed to send approval request.", "error"); }
//     finally { setIsSendingApproval(false); }
//   };

//   const startPolling = (appId) => {
//     if (window._approvalInterval) clearInterval(window._approvalInterval);
//     window._approvalInterval = setInterval(async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/status`);
//         if (res.ok) {
//           const data = await res.json();
//           setOrgApprovalStatus(data.status);
//           if (data.status !== "pending") {
//             clearInterval(window._approvalInterval);
//             if (data.status === "approved") { setGatewayOnboardingStep("businessUnit"); showMessage("Organization approved! You can now proceed to Business Unit onboarding.", "success"); }
//             else if (data.status === "rejected") showMessage("Organization request was rejected. Please update and resend.", "error");
//           }
//         }
//       } catch (err) { console.error(err); }
//     }, 10000);
//   };

//   const checkApprovalStatus = async () => {
//     if (!currentApplicationId) { showMessage("No application ID found. Please submit for approval first.", "error"); return; }
//     setIsCheckingStatus(true);
//     try {
//       const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentApplicationId}`);
//       if (!response.ok) throw new Error();
//       const data = await response.json();
//       const frontendStatus = mapStatus(data.status);
//       setOrgApprovalStatus(frontendStatus);
//       if (frontendStatus === "approved") { showMessage("Organization approved! You can now proceed to Business Unit onboarding.", "success"); setGatewayOnboardingStep("businessUnit"); }
//       else if (frontendStatus === "rejected") showMessage("Organization request was rejected. Please update and resend.", "error");
//       else if (frontendStatus === "pending") showMessage("Still pending approval. Please wait.", "info");
//     } catch (err) { showMessage("Failed to check status. Please try again.", "error"); }
//     finally { setIsCheckingStatus(false); }
//   };

//   const submitBusinessUnit = async () => {
//     if (!onboardingTeamName || !onboardingApplicationName) { showMessage("Team Name and Application Name are required", "error"); return; }
//     const membersPayload = teamMembers.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.role || null }));
//     const consumersPayload = selectedOnboardingConsumers.map(consumerId => {
//       const consumer = savedConsumers.find(c => c.id === consumerId);
//       return { id: consumer.id, consumerId: consumer.consumerId || consumer.id, name: consumer.consumerName || "Unnamed" };
//     });
//     const payload = {
//       onboardingId: currentApplicationId || null, teamName: onboardingTeamName, applicationName: onboardingApplicationName,
//       applicationId: onboardingApplicationId, projectOwner: onboardingProjectOwner, ownerEmail: onboardingOwnerEmail,
//       projectSME: onboardingProjectSME, projectSMEEmail: onboardingProjectSMEEmail, projectDLEmail: onboardingProjectDLEmail,
//       expectedGoLiveDate: onboardingGoLiveDate, testerName: onboardingTesterName, testerEmail: onboardingTesterEmail,
//       servicenowGroupName: onboardingServiceNowGroup, servicenowEmail: onboardingServiceNowEmail,
//       members: membersPayload, consumers: consumersPayload,
//     };
//     setSubmittingBu(true);
//     try {
//       let url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units`;
//       let method = "POST";
//       if (editingBuId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editingBuId}`; method = "PUT"; }
//       const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
//       if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Submission failed"); }
//       const result = await response.json();
//       showMessage(result.message || "Business unit submitted successfully", "success");
//       setEditingBuId(null); resetBuForm(); fetchBuHistory();
//       localStorage.setItem("buCompleted", "true"); setBusinessUnitCompleted(true);
//     } catch (err) { showMessage(err.message, "error"); }
//     finally { setSubmittingBu(false); }
//   };

//   const mapStatus = (status) => {
//     if (status === "PENDING_APPROVAL") return "pending";
//     if (status === "DRAFT") return "draft";
//     if (status === "APPROVED") return "approved";
//     if (status === "REJECTED") return "rejected";
//     return status?.toLowerCase() || "unknown";
//   };

//   const addGatewayOrg = () => {
//     setGatewayOrgs(prev => [...prev, { id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
//   };
//   const removeGatewayOrg = (id) => { if (gatewayOrgs.length > 1) setGatewayOrgs(prev => prev.filter(org => org.id !== id)); };
//   const updateGatewayOrg = (id, field, value) => setGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, [field]: value } : org));
//   const updateGatewayOrgConfig = (id, configField, value) => setGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, config: { ...org.config, [configField]: value } } : org));
//   const handleEnvironmentCheckbox = (orgId, env) => {
//     setGatewayOrgs(prev => prev.map(org => {
//       if (org.id !== orgId) return org;
//       const selected = org.config.selectedEnvironments.includes(env) ? org.config.selectedEnvironments.filter(e => e !== env) : [...org.config.selectedEnvironments, env];
//       return { ...org, config: { ...org.config, selectedEnvironments: selected } };
//     }));
//   };
//   const addTeamMember = () => {
//     if (!newTeamMember.name.trim() || !newTeamMember.email.trim()) { showMessage("Please enter name and email", "error"); return; }
//     setTeamMembers(prev => [...prev, { id: Date.now(), name: newTeamMember.name, email: newTeamMember.email, role: "Member" }]);
//     setNewTeamMember({ name: "", email: "" }); setShowTeamMemberModal(false); showMessage("Team member added", "success");
//   };
//   const handleSaveConsumer = async () => {
//     setIsAddingConsumer(true);
//     const consumerData = {
//       organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", consumerName: consumerForm.consumerName,
//       consumerPocName: consumerForm.consumerPocName, consumerPocEmail: consumerForm.consumerPocEmail,
//       consumerSmeName: consumerForm.consumerSmeName, consumerSmeEmail: consumerForm.consumerSmeEmail,
//       consumerConfig: consumerForm.consumerConfig, apiTps: parseInt(consumerForm.apiTps) || 100,
//       quota: consumerForm.quota, rateLimiting: consumerForm.rateLimiting, apiKeyInformation: consumerForm.apiKeyInfo,
//     };
//     const result = await consumerService.createConsumer(consumerData);
//     if (result.success) { await getConsumers(); setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" }); setShowConsumerModal(false); showMessage("Consumer saved successfully", "success"); }
//     else showMessage(result.error, "error");
//     setIsAddingConsumer(false);
//   };
//   const handleUpdateConsumer = async () => {
//     setIsAddingConsumer(true);
//     const consumerData = {
//       organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", consumerName: consumerForm.consumerName,
//       consumerPocName: consumerForm.consumerPocName, consumerPocEmail: consumerForm.consumerPocEmail,
//       consumerSmeName: consumerForm.consumerSmeName, consumerSmeEmail: consumerForm.consumerSmeEmail,
//       consumerConfig: consumerForm.consumerConfig, apiTps: parseInt(consumerForm.apiTps) || 100,
//       quota: consumerForm.quota, rateLimiting: consumerForm.rateLimiting, apiKeyInformation: consumerForm.apiKeyInfo,
//     };
//     const result = await consumerService.updateConsumer(editingConsumerId, consumerData);
//     if (result.success) { await getConsumers(); setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" }); showMessage("Consumer updated successfully", "success"); }
//     else showMessage(result.error, "error");
//     setIsAddingConsumer(false);
//   };
//   const envOptionsByType = { nonprod: ["dev", "test", "qa", "sat", "staging", "sandbox"], prod: ["preprod", "prod", "staging"] };

//   // ========== Effects ==========
//   useEffect(() => {
//     fetchAllApplications(); fetchBuHistory(); getConsumers();
//     return () => { if (window._approvalInterval) clearInterval(window._approvalInterval); };
//   }, []);
//   useEffect(() => {
//     const fetchDashboardBu = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
//         if (res.ok) { const data = await res.json(); const buList = data.data || []; setDashboardBuCount(buList.length); const totalMembers = buList.reduce((sum, bu) => sum + (bu.members?.length || 0), 0); setDashboardTeamMemberCount(totalMembers); }
//       } catch (err) { console.error(err); }
//     };
//     fetchDashboardBu();
//   }, []);

//   // ========== Preview Modal (unchanged, attractive) ==========
//   const PreviewModal = () => (
//     <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
//       <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
//         <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
//           <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5"/></div><div><h3 className="text-xl font-semibold text-white">Review & Submit</h3><p className="text-xs text-slate-400">Verify all details before sending for approval</p></div></div>
//           <button onClick={() => setShowPreviewModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5"/></button>
//         </div>
//         <div className="p-6 space-y-6">
//           <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b pb-3 mb-4"><Building className="h-4 w-4 text-[#ff8a5c]"/><h4 className="text-sm font-semibold uppercase">Company Information</h4></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Company Name</span><span className="font-medium text-white">{company.name || "—"}</span></div><div><span className="block text-xs text-slate-500">Website</span><span className="font-medium text-white">{company.websiteUrl || "—"}</span></div><div><span className="block text-xs text-slate-500">Region</span><span className="font-medium text-white">{company.region || "—"}</span></div></div></div>
//           <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b pb-3 mb-4"><Users className="h-4 w-4 text-[#ff8a5c]"/><h4 className="text-sm font-semibold uppercase">Stakeholder Details</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Full Name</span><span className="font-medium text-white">{orgOnboardingData.firstName} {orgOnboardingData.lastName}</span></div><div><span className="block text-xs text-slate-500">Email</span><span className="font-medium text-white">{orgOnboardingData.ownerEmail}</span></div><div><span className="block text-xs text-slate-500">Phone</span><span className="font-medium text-white">{orgOnboardingData.phoneNumber}</span></div><div><span className="block text-xs text-slate-500">SME</span><span className="font-medium text-white">{orgOnboardingData.sme || "—"}</span></div></div></div>
//           <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b pb-3 mb-4"><Network className="h-4 w-4 text-[#ff8a5c]"/><h4 className="text-sm font-semibold uppercase">Gateway Organizations</h4></div>{gatewayOrgs.map((org, idx) => (<div key={org.id} className="mb-4 last:mb-0"><div className="text-white font-medium">{org.name || `Organization ${idx+1}`}</div><div className="text-xs text-slate-400">Region: {org.region || "—"} | Environments: {org.config.selectedEnvironments.join(", ") || "—"}</div></div>))}</div>
//         </div>
//         <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={() => setShowPreviewModal(false)} className="rounded-lg border border-[#2a3a5a] bg-transparent px-5 py-2 text-sm font-medium text-slate-300">Cancel</button><button onClick={sendApprovalRequest} disabled={isSendingApproval} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">{isSendingApproval ? "Sending..." : "Confirm & Send"}</button></div>
//       </div>
//     </div>
//   );

//   // ========== RICH HISTORY MODAL (enhanced, attractive, exactly like original) ==========
//   const HistoryModal = ({ open, onClose, onLoadOrganization, onLoadBusinessUnit }) => {
//     if (!open) return null;

//     const aggregatedTeamMembers = useMemo(() => {
//       const members = [];
//       buSubmissions.forEach(bu => {
//         if (bu.members && Array.isArray(bu.members)) {
//           bu.members.forEach(member => {
//             members.push({
//               ...member,
//               businessUnitId: bu.id,
//               businessUnitName: bu.teamName,
//               businessUnitAppName: bu.applicationName,
//             });
//           });
//         }
//       });
//       return members;
//     }, [buSubmissions]);

//     const [teamMemberSearch, setTeamMemberSearch] = useState("");
//     const [localCopiedId, setLocalCopiedId] = useState(null);

//     return (
//       <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
//         <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl flex flex-col">
//           {/* Header */}
//           <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
//             <div className="flex items-center gap-3">
//               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><History className="h-5 w-5"/></div>
//               <div><h3 className="text-xl font-semibold text-white">Onboarding History</h3><p className="text-xs text-slate-400">View past submissions</p></div>
//             </div>
//             <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5"/></button>
//           </div>

//           {/* Tabs */}
//           <div className="flex gap-4 px-6 pt-4 border-b border-[#2a3a5a]">
//             {["organization", "bu", "team"].map(tab => (
//               <button key={tab} onClick={() => setHistoryActiveTab(tab)} className={`pb-2 px-1 text-sm font-medium transition capitalize ${historyActiveTab === tab ? "text-[#4f8ef7] border-b-2 border-[#4f8ef7]" : "text-[#7f8fa8] hover:text-white"}`}>
//                 {tab === "organization" ? "Organization" : tab === "bu" ? "Business Unit" : "Team"}
//               </button>
//             ))}
//           </div>

//           {/* Scrollable Content */}
//           <div className="flex-1 overflow-y-auto p-6 space-y-4">
//             {historyActiveTab === "organization" && (
//               organizationSubmissions.length === 0 ? (
//                 <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600"/><p>No organization submissions yet.</p></div>
//               ) : (
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                   {organizationSubmissions.map(sub => {
//                     const status = mapStatus(sub.status);
//                     const statusColors = {
//                       approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
//                       pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
//                       rejected: "bg-red-500/20 text-red-300 border-red-500/30",
//                       draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
//                     };
//                     const statusColor = statusColors[status] || statusColors.draft;
//                     return (
//                       <div key={sub.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all duration-300 hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40">
//                         <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
//                         <div className="p-5 space-y-4">
//                           <div className="flex justify-between items-start">
//                             <div>
//                               <div className="flex items-center gap-2 flex-wrap">
//                                 <h3 className="text-lg font-semibold text-white">{sub.company?.name || "N/A"}</h3>
//                                 <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>{status.toUpperCase()}</span>
//                               </div>
//                               <div className="flex items-center gap-2 mt-2">
//                                 <span className="text-xs text-slate-500">Onboarding ID:</span>
//                                 <code className="text-xs font-mono text-slate-300 bg-[#1a1f2e] px-2 py-0.5 rounded-md">{sub.id}</code>
//                                 <button onClick={() => { navigator.clipboard.writeText(sub.id); setLocalCopiedId(sub.id); setTimeout(() => setLocalCopiedId(null), 2000); }} className="p-1 rounded-md hover:bg-[#2a3550] transition-colors" title="Copy ID">
//                                   {localCopiedId === sub.id ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />}
//                                 </button>
//                               </div>
//                             </div>
//                             <button onClick={() => onLoadOrganization(sub.id)} className="px-4 py-1.5 rounded-lg border border-[#ff5b1f]/30 bg-[#ff5b1f]/10 text-[#ff8a5c] text-sm font-medium hover:bg-[#ff5b1f]/20 transition">View</button>
//                           </div>
//                           <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-[#1f2840] pt-3">
//                             <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Stakeholder:</span><span className="text-white truncate">{sub.stakeholder?.firstName} {sub.stakeholder?.lastName}</span></div>
//                             <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Email:</span><span className="text-white truncate">{sub.stakeholder?.email}</span></div>
//                             <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Phone:</span><span className="text-white">{sub.stakeholder?.phone}</span></div>
//                             <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500"/><span className="text-slate-400">Submitted:</span><span className="text-white text-xs">{new Date(sub.timestamp || sub.createdAt).toLocaleString()}</span></div>
//                           </div>
//                           {sub.gatewayOrganizations && sub.gatewayOrganizations.length > 0 && (
//                             <div className="bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
//                               <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><Network className="h-3 w-3"/><span>Gateway Organizations ({sub.gatewayOrganizations.length})</span></div>
//                               <div className="flex flex-wrap gap-2">{sub.gatewayOrganizations.slice(0,3).map((org, idx) => (<span key={idx} className="text-xs bg-[#1a1f2e] text-slate-300 px-2 py-1 rounded-md">{org.name || "Unnamed"}</span>))}{sub.gatewayOrganizations.length > 3 && <span className="text-xs text-slate-400">+{sub.gatewayOrganizations.length-3} more</span>}</div>
//                             </div>
//                           )}
//                         </div>
//                         <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs"><span className="text-slate-500">Last updated: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : "—"}</span><span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>{status === "approved" ? "Approved" : status === "pending" ? "Pending" : status}</span></div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )
//             )}

//             {historyActiveTab === "bu" && (
//               buSubmissions.length === 0 ? (
//                 <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600"/><p>No business unit submissions yet.</p></div>
//               ) : (
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                   {buSubmissions.map(bu => (
//                     <div key={bu.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all duration-300 hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40">
//                       <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
//                       <div className="p-5 space-y-4">
//                         <div className="flex justify-between items-start">
//                           <div><h3 className="text-lg font-semibold text-white">{bu.teamName}<span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span></h3><p className="text-sm text-slate-400 mt-1">Application: <span className="text-white font-mono">{bu.applicationName}</span>{bu.applicationId && <span className="ml-2 text-xs text-slate-500">(ID: {bu.applicationId})</span>}</p></div>
//                           <div className="flex items-center gap-2"><button onClick={() => onLoadBusinessUnit(bu)} className="p-2 rounded-lg bg-[#ff5b1f]/10 text-[#ff8a5c] hover:bg-[#ff5b1f]/20 transition-colors" title="Edit Business Unit"><Edit className="h-4 w-4"/></button></div>
//                         </div>
//                         <div className="flex flex-wrap gap-4 text-sm border-t border-[#1f2840] pt-3">
//                           <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Owner:</span><span className="text-white font-medium">{bu.projectOwner || "—"}</span></div>
//                           <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Go‑Live:</span><span className="text-white font-mono text-xs">{bu.expectedGoLiveDate ? new Date(bu.expectedGoLiveDate).toLocaleDateString() : "—"}</span></div>
//                           <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Members:</span><span className="text-white font-semibold">{bu.members?.length || 0}</span></div>
//                           <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-slate-500"/><span className="text-slate-300">Consumers:</span><span className="text-white font-semibold">{bu.consumers?.length || 0}</span></div>
//                         </div>
//                       </div>
//                       <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs"><span className="text-slate-500">Created: {bu.createdAt ? new Date(bu.createdAt).toLocaleDateString() : "—"}</span><span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>Synced</span></div>
//                     </div>
//                   ))}
//                 </div>
//               )
//             )}

//             {historyActiveTab === "team" && (
//               <div className="space-y-4">
//                 <div className="flex justify-between items-center"><h3 className="text-lg font-semibold text-white">Team Members</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/><input type="text" placeholder="Search by name or email..." value={teamMemberSearch} onChange={e => setTeamMemberSearch(e.target.value)} className="w-64 rounded-lg border border-[#2a3550] bg-[#0f1117] pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff5b1f]"/></div></div>
//                 <div className="overflow-x-auto rounded-xl border border-[#2a3550] bg-[#111520]">
//                   <table className="min-w-full divide-y divide-[#1f2840]">
//                     <thead className="bg-[#1a1f2e]"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Member</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Business Unit</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Application</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Actions</th></tr></thead>
//                     <tbody>
//                       {aggregatedTeamMembers.filter(m => m.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) || m.email?.toLowerCase().includes(teamMemberSearch.toLowerCase())).map(member => (
//                         <tr key={`${member.businessUnitId}-${member.id}`} className="hover:bg-[#1a1f2e]/50 transition"><td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff8a5c]/10 flex items-center justify-center text-white font-medium">{member.name?.charAt(0).toUpperCase()}</div><div><div className="text-sm font-medium text-white">{member.name}</div><div className="text-xs text-slate-400">{member.email}</div></div></div></td><td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300">{member.role || "Member"}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-white">{member.businessUnitName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{member.businessUnitAppName}</td><td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={() => { const bu = buSubmissions.find(b => b.id === member.businessUnitId); if (bu) onLoadBusinessUnit(bu); }} className="text-[#4f8ef7] hover:text-[#ff8a5c] transition flex items-center gap-1"><Edit className="h-4 w-4"/><span className="hidden sm:inline">Edit BU</span></button></td></tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="sticky bottom-0 flex justify-end border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={onClose} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">Close</button></div>
//         </div>
//       </div>
//     );
//   };

//   // ========== Main Render ==========
//   if (onboardingView === "history") {
//     return <HistoryModal open={true} onClose={() => setOnboardingView("form")} onLoadOrganization={(id) => { loadSubmission(id); setOnboardingView("form"); }} onLoadBusinessUnit={(bu) => { loadBusinessUnit(bu); setOnboardingView("form"); }} />;
//   }

//   const isOrgApproved = orgApprovalStatus === "approved";
//   const isOrgPending = orgApprovalStatus === "pending";

//   return (
//     <div className="p-6">
//       <div className="mb-6 flex justify-between items-start">
//         <div><h2 className="text-3xl font-semibold text-white">Gateway Onboarding</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f8fa8]">Start with Organization Onboarding. After admin approval, proceed to Business Unit setup.</p></div>
//         <div className="flex gap-3"><button onClick={() => setOnboardingView("history")} className="px-4 py-2 rounded-lg border border-[#27314e] bg-primary text-sm font-medium text-white hover:bg-[#ff5b1f]/20 flex items-center gap-2"><History className="w-4 h-4"/> History</button></div>
//       </div>

//       {/* Dashboard Stats (glassmorphic cards) */}
//       <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
//         <div className="group relative overflow-hidden rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4 transition-all hover:border-[#ff8a5c]/40 hover:shadow-lg hover:shadow-[#ff5b1f]/5"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Organization</p><p className="mt-1 text-base font-semibold text-white">{company.name || "Not started"}</p></div><Building className="h-5 w-5 text-[#ff8a5c]"/></div><div className="mt-3 flex justify-between"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${orgApprovalStatus === "approved" ? "bg-emerald-500/20 text-emerald-300" : orgApprovalStatus === "pending" ? "bg-yellow-500/20 text-yellow-300" : "bg-slate-500/20 text-slate-300"}`}>{orgApprovalStatus ? orgApprovalStatus.toUpperCase() : (company.name ? "DRAFT" : "PENDING")}</span>{isOrgPending && <button onClick={checkApprovalStatus} className="text-[10px] text-[#4f8ef7] hover:underline">Check status</button>}</div></div>
//         <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Business Units</p><p className="mt-1 text-2xl font-bold text-white">{dashboardBuCount}</p></div><Users className="h-5 w-5 text-sky-400"/></div></div>
//         <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Team Members</p><p className="mt-1 text-2xl font-bold text-white">{dashboardTeamMemberCount}</p></div><UserCircle className="h-5 w-5 text-emerald-400"/></div></div>
//         <div className="rounded-xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] p-4"><div className="flex justify-between"><div><p className="text-xs uppercase text-slate-400">Consumers</p><p className="mt-1 text-2xl font-bold text-white">{dashboardConsumerCount}</p></div><Layers className="h-5 w-5 text-purple-400"/></div></div>
//       </div>

//       {/* Step Selector Cards */}
//       <div className="grid gap-3 md:grid-cols-2 mb-6">
//         <button onClick={() => setGatewayOnboardingStep("organization")} className={`rounded-xl border p-3 text-left transition-all ${gatewayOnboardingStep === "organization" ? "border-[#ff8a5c]/45 bg-[#ff5b1f]/10 shadow-[0_8px_20px_-10px_rgba(255,91,31,0.6)]" : "border-[#27314e] bg-[#111520] hover:border-white/15"}`}><div className="flex items-center gap-3"><Server className="h-4 w-4 text-slate-400"/><div><h3 className="text-sm font-semibold text-white">Organization</h3><p className="text-xs text-slate-400">Register & get approval</p></div></div></button>
//         <button onClick={() => { if (orgApprovalStatus !== "approved") { showMessage("Organization approval required first.", "error"); return; } setGatewayOnboardingStep("businessUnit"); }} className={`rounded-xl border p-3 text-left transition-all ${gatewayOnboardingStep === "businessUnit" ? "border-[#ff8a5c]/45 bg-[#ff5b1f]/10 shadow-[0_8px_20px_-10px_rgba(255,91,31,0.6)]" : "border-[#27314e] bg-[#111520] hover:border-white/15"} ${orgApprovalStatus !== "approved" ? "opacity-60 cursor-not-allowed" : ""}`}><div className="flex items-center gap-3"><Users className="h-4 w-4 text-slate-400"/><div><h3 className="text-sm font-semibold text-white">Business Unit</h3><p className="text-xs text-slate-400">Define team & API scope</p></div></div></button>
//       </div>

//       {/* Organization Form (exact original structure) */}
//       {gatewayOnboardingStep === "organization" && (
//         <div className="rounded-2xl border border-[#27314e] bg-[#111520] p-6 space-y-4">
//           <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold flex items-center gap-2"><Building className="w-4 h-4"/> Company Information</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3"><div><Label className="text-xs text-gray-300">Company Name *</Label><Input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="bg-dark-900 border-dark-700 text-white"/></div><div><Label className="text-xs text-gray-300">Website URL</Label><Input value={company.websiteUrl} onChange={e => setCompany({...company, websiteUrl: e.target.value})} className="bg-dark-900 border-dark-700 text-white"/></div><div><Label className="text-xs text-gray-300">Region</Label><select value={company.region} onChange={e => setCompany({...company, region: e.target.value})} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div></div></Card>
//           <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4"/> Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"><div><Label className="text-xs text-gray-300">First Name *</Label><Input value={orgOnboardingData.firstName} onChange={e => setOrgOnboardingData({...orgOnboardingData, firstName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Last Name *</Label><Input value={orgOnboardingData.lastName} onChange={e => setOrgOnboardingData({...orgOnboardingData, lastName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Owner Email *</Label><Input type="email" value={orgOnboardingData.ownerEmail} onChange={e => setOrgOnboardingData({...orgOnboardingData, ownerEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Contact Number *</Label><Input value={orgOnboardingData.phoneNumber} onChange={e => setOrgOnboardingData({...orgOnboardingData, phoneNumber: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Name</Label><Input value={orgOnboardingData.sme} onChange={e => setOrgOnboardingData({...orgOnboardingData, sme: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Email</Label><Input type="email" value={orgOnboardingData.smeEmail} onChange={e => setOrgOnboardingData({...orgOnboardingData, smeEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Distribution List Email</Label><Input type="email" value={orgOnboardingData.dlEmail} onChange={e => setOrgOnboardingData({...orgOnboardingData, dlEmail: e.target.value})}/></div></div></Card>
//           <Card className="p-5 bg-[#0f172a]/50"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold flex items-center gap-2"><Network className="w-4 h-4"/> Gateway Configurations</h4><button onClick={addGatewayOrg} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30"><Plus className="w-3.5 h-3.5 inline mr-1"/> Add Organization</button></div><div className="space-y-6">{gatewayOrgs.map(org => (<div key={org.id} className="relative border border-dark-700 rounded-lg p-4">{gatewayOrgs.length > 1 && <button onClick={() => removeGatewayOrg(org.id)} className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-400"><X className="w-4 h-4"/></button>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><Label className="text-xs text-gray-300">Region</Label><select value={org.region} onChange={e => updateGatewayOrg(org.id, "region", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div><div><Label className="text-xs text-gray-300">Gateway Organization Name *</Label><Input value={org.name} onChange={e => updateGatewayOrg(org.id, "name", e.target.value)}/></div></div><div className="border-t border-dark-700 pt-4 mt-2"><div className="mb-4"><Label className="text-xs text-gray-300">Environment Type</Label><div className="flex gap-4 mt-1"><label className="flex items-center gap-2"><input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === "nonprod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "nonprod")}/> non-prod</label><label className="flex items-center gap-2"><input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === "prod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "prod")}/> prod</label></div></div><div className="mb-4"><Label className="text-xs text-gray-300">Select Environments</Label><div className="flex flex-wrap gap-3 border border-dark-700 rounded-lg p-3 bg-dark-900/50">{envOptionsByType[org.config.environmentType].map(env => (<label key={env} className="flex items-center gap-1.5 text-sm text-gray-300"><input type="checkbox" checked={org.config.selectedEnvironments.includes(env)} onChange={() => handleEnvironmentCheckbox(org.id, env)}/><span>{env}</span></label>))}<label className="flex items-center gap-1.5 text-sm text-gray-300"><input type="checkbox" checked={org.config.selectedEnvironments.includes("custom")} onChange={() => { if (org.config.selectedEnvironments.includes("custom")) { updateGatewayOrgConfig(org.id, "selectedEnvironments", org.config.selectedEnvironments.filter(e => e !== "custom")); updateGatewayOrgConfig(org.id, "customEnvironments", ""); } else { updateGatewayOrgConfig(org.id, "selectedEnvironments", [...org.config.selectedEnvironments, "custom"]); } }}/><span>Custom</span></label></div>{org.config.selectedEnvironments.includes("custom") && <div className="mt-3"><Input placeholder="Enter comma-separated environments" value={org.config.customEnvironments} onChange={e => updateGatewayOrgConfig(org.id, "customEnvironments", e.target.value)}/></div>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">Expected TPS</Label><Input type="number" value={org.config.expectedTps} onChange={e => updateGatewayOrgConfig(org.id, "expectedTps", e.target.value)}/></div><div><Label className="text-xs text-gray-300">Expected No. of APIs</Label><select value={org.config.expectedApiRange} onChange={e => updateGatewayOrgConfig(org.id, "expectedApiRange", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"><option value="">Select range</option><option value="0-100">0 - 100</option><option value="100-300">100 - 300</option><option value="300-500">300 - 500</option><option value="500-1000+">500 - 1000+</option></select></div><div className="md:col-span-2"><Label className="text-xs text-gray-300">Notes</Label><textarea rows={2} value={org.config.notes} onChange={e => updateGatewayOrgConfig(org.id, "notes", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900 resize-none"/></div></div></div></div>))}</div></Card>
//           <div className="flex gap-3 pt-2"><button onClick={resetForm} className="h-10 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-sm font-semibold text-red-400">Reset</button><button onClick={saveAsDraft} disabled={isSavingDraft} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300">{isSavingDraft ? "Saving..." : "Save Draft"}</button><button onClick={() => setShowPreviewModal(true)} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300">Preview</button><button onClick={sendApprovalRequest} disabled={isSendingApproval} className="h-10 rounded-xl bg-[#ff5b1f] px-6 text-sm font-semibold text-white">{isSendingApproval ? "Sending..." : "Send for Approval"}</button>{isOrgPending && <button onClick={checkApprovalStatus} disabled={isCheckingStatus} className="h-10 rounded-xl border border-[#27314e] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300">{isCheckingStatus ? "Checking..." : "Check Status"}</button>}</div>
//         </div>
//       )}

//       {/* Business Unit Form */}
//       {gatewayOnboardingStep === "businessUnit" && orgApprovalStatus === "approved" && (
//         <div className="rounded-2xl border border-[#27314e] bg-[#111520] p-6 space-y-4">
//           <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold mb-4">Business Unit Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">BU Name *</Label><Input value={onboardingTeamName} onChange={e => setOnboardingTeamName(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Application Name *</Label><Input value={onboardingApplicationName} onChange={e => setOnboardingApplicationName(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Application Id</Label><Input value={onboardingApplicationId} onChange={e => setOnboardingApplicationId(e.target.value)}/></div></div></Card>
//           <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold mb-4">Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">Project Owner</Label><Input value={onboardingProjectOwner} onChange={e => setOnboardingProjectOwner(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Owner Email</Label><Input type="email" value={onboardingOwnerEmail} onChange={e => setOnboardingOwnerEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Project SME</Label><Input value={onboardingProjectSME} onChange={e => setOnboardingProjectSME(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Project SME Email</Label><Input type="email" value={onboardingProjectSMEEmail} onChange={e => setOnboardingProjectSMEEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Project DL Email</Label><Input type="email" value={onboardingProjectDLEmail} onChange={e => setOnboardingProjectDLEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Expected Go-Live Date</Label><Input type="date" value={onboardingGoLiveDate} onChange={e => setOnboardingGoLiveDate(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Tester Name</Label><Input value={onboardingTesterName} onChange={e => setOnboardingTesterName(e.target.value)}/></div><div><Label className="text-xs text-gray-300">Tester Email</Label><Input type="email" value={onboardingTesterEmail} onChange={e => setOnboardingTesterEmail(e.target.value)}/></div><div><Label className="text-xs text-gray-300">ServiceNow Group Name</Label><Input value={onboardingServiceNowGroup} onChange={e => setOnboardingServiceNowGroup(e.target.value)}/></div><div><Label className="text-xs text-gray-300">ServiceNow Email</Label><Input type="email" value={onboardingServiceNowEmail} onChange={e => setOnboardingServiceNowEmail(e.target.value)}/></div></div></Card>
//           <Card className="p-5 bg-[#0f172a]/50"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold">Team Members</h4><button onClick={() => setShowTeamMemberModal(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white">+ Add Member</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{teamMembers.map(m => (<div key={m.id} className="p-3 rounded-lg border border-dark-700 bg-dark-900/60"><p className="text-sm font-medium text-white">{m.name}</p><p className="text-xs text-gray-400">{m.email}</p></div>))}</div></Card>
//           <Card className="p-5 bg-[#0f172a]/50"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold">Consumer Information</h4><button onClick={() => setShowConsumerModal(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white">+ Add Consumer</button></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{savedConsumers.map(c => (<div key={c.id} onClick={() => setSelectedOnboardingConsumers(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`p-3 rounded-lg border cursor-pointer ${selectedOnboardingConsumers.includes(c.id) ? "border-primary bg-primary/20" : "border-dark-700 hover:border-primary/50"}`}><p className="text-xs font-medium text-white truncate">{c.consumerName}</p>{selectedOnboardingConsumers.includes(c.id) && <CheckCircle className="w-3 h-3 text-primary mt-1"/>}</div>))}</div></Card>
//           <div className="flex justify-end pt-2"><button onClick={submitBusinessUnit} disabled={submittingBu} className="h-10 rounded-xl bg-[#ff5b1f] px-6 text-sm font-semibold text-white">{submittingBu ? "Submitting..." : "Submit Business Unit"}</button></div>
//         </div>
//       )}

//       {/* Modals */}
//       {showPreviewModal && <PreviewModal />}
//       {showHistoryModal && (
//         <HistoryModal
//           open={showHistoryModal}
//           onClose={() => setShowHistoryModal(false)}
//           onLoadOrganization={(id) => { loadSubmission(id); setCurrentApplicationId(id); setGatewayOnboardingStep("organization"); setIsCreateNewOnboarding(false); }}
//           onLoadBusinessUnit={(bu) => { loadBusinessUnit(bu); setOnboardingView("form"); setShowHistoryModal(false); }}
//         />
//       )}
//       {showTeamMemberModal && (
//         <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-md rounded-xl border border-dark-700 bg-[#161b30]"><div className="flex justify-between px-6 py-4 border-b border-dark-700"><h2 className="text-lg font-semibold text-white">Add Team Member</h2><button onClick={() => setShowTeamMemberModal(false)} className="text-gray-400 hover:text-white">✕</button></div><div className="p-6 space-y-4"><div><Label className="text-xs text-gray-300">Full Name *</Label><Input value={newTeamMember.name} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Email *</Label><Input type="email" value={newTeamMember.email} onChange={e => setNewTeamMember({...newTeamMember, email: e.target.value})}/></div></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700"><button onClick={() => setShowTeamMemberModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300">Cancel</button><button onClick={addTeamMember} className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary text-white">Add Member</button></div></div></div>
//       )}
//       {showConsumerModal && (
//         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-dark-700 bg-[#161b30]"><div className="flex justify-between px-6 py-4 border-b border-dark-700"><h2 className="text-lg font-semibold text-white">{editingConsumerId ? "Edit Consumer" : "Add Consumer"}</h2><button onClick={() => { setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" }); }} className="text-gray-400 hover:text-white">✕</button></div><div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label className="text-xs text-gray-300">Consumer Name</Label><Input value={consumerForm.consumerName} onChange={e => setConsumerForm({...consumerForm, consumerName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">POC Name</Label><Input value={consumerForm.consumerPocName} onChange={e => setConsumerForm({...consumerForm, consumerPocName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">POC Email</Label><Input value={consumerForm.consumerPocEmail} onChange={e => setConsumerForm({...consumerForm, consumerPocEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={e => setConsumerForm({...consumerForm, consumerSmeName: e.target.value})}/></div><div><Label className="text-xs text-gray-300">SME Email</Label><Input value={consumerForm.consumerSmeEmail} onChange={e => setConsumerForm({...consumerForm, consumerSmeEmail: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Config</Label><Input value={consumerForm.consumerConfig} onChange={e => setConsumerForm({...consumerForm, consumerConfig: e.target.value})}/></div><div><Label className="text-xs text-gray-300">API TPS</Label><Input value={consumerForm.apiTps} onChange={e => setConsumerForm({...consumerForm, apiTps: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Quota</Label><Input value={consumerForm.quota} onChange={e => setConsumerForm({...consumerForm, quota: e.target.value})}/></div><div><Label className="text-xs text-gray-300">Rate Limiting</Label><Input value={consumerForm.rateLimiting} onChange={e => setConsumerForm({...consumerForm, rateLimiting: e.target.value})}/></div><div><Label className="text-xs text-gray-300">API Key Info</Label><Input value={consumerForm.apiKeyInfo} onChange={e => setConsumerForm({...consumerForm, apiKeyInfo: e.target.value})}/></div></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700"><button onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300">Cancel</button><button onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer} disabled={isAddingConsumer} className="px-6 py-2 rounded-lg font-semibold text-sm bg-primary text-white">{editingConsumerId ? "Update Consumer" : (isAddingConsumer ? "Saving..." : "Save Consumer")}</button></div></div></div>
//       )}
//     </div>
//   );
// };