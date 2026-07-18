// src/components/GatewayOnboarding.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Building, Users, UserCircle, Mail, Phone, Calendar, Network, Plus, X, History, Eye, Archive, CheckCircle, AlertCircle, Rocket, Server, Loader2, Copy, Edit, Check, Layers, Search, Globe, Briefcase, User, MapPin, Trash2, Save, Activity, Zap, Shield } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import API_BASE_URL from "../../config/apiConfig";
import { consumerService } from "../../services/consumerService";

const generateGatewayId = (prefix = 'g') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const envOptionsByType = { nonprod: ['dev', 'test', 'qa', 'sat', 'staging', 'sandbox'], prod: ['preprod', 'prod', 'staging'] };
const roleOptions = ["API Engineer", "DevOps Engineer", "Infra Engineer", "Support Engineer", "Project Manager", "Product Manager"];

// ====================== PREVIEW MODAL (unchanged) ======================
const PreviewModal = ({ company, orgOnboardingData, gatewayOrgs, onClose, onSendApproval, isSendingApproval }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold text-white">Review & Submit</h3><p className="text-xs text-slate-400">Verify all details before sending for approval</p></div></div>
        <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
          <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Building className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Company Information</h4></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><span className="block text-xs text-slate-500">Company Name</span><span className="font-medium text-white">{company.name || '—'}</span></div>
            <div><span className="block text-xs text-slate-500">Website</span><span className="font-medium text-white">{company.websiteUrl || '—'}</span></div>
            <div><span className="block text-xs text-slate-500">Region</span><span className="font-medium text-white">{company.region || '—'}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
          <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Users className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Stakeholder Details</h4></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="block text-xs text-slate-500">Full Name</span><span className="font-medium text-white">{orgOnboardingData.firstName} {orgOnboardingData.lastName}</span></div>
            <div><span className="block text-xs text-slate-500">Email Address</span><span className="font-medium text-white">{orgOnboardingData.ownerEmail}</span></div>
            <div><span className="block text-xs text-slate-500">Contact Number</span><span className="font-medium text-white">{orgOnboardingData.phoneNumber}</span></div>
            <div><span className="block text-xs text-slate-500">SME Name</span><span className="font-medium text-white">{orgOnboardingData.sme || '—'}</span></div>
            <div><span className="block text-xs text-slate-500">SME Email</span><span className="font-medium text-white">{orgOnboardingData.smeEmail || '—'}</span></div>
            <div><span className="block text-xs text-slate-500">Distribution List</span><span className="font-medium text-white">{orgOnboardingData.dlEmail || '—'}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
          <div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Network className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Gateway Organizations</h4></div>
          <div className="space-y-4">{gatewayOrgs.map((org, idx) => (<div key={org.id} className="rounded-lg border border-[#2a3a5a]/50 bg-[#0f172a]/40 p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold text-white">#{idx + 1} {org.name || 'Unnamed'}</span><span className="rounded-full bg-[#ff5b1f]/20 px-2 py-0.5 text-xs font-medium text-[#ff8a5c]">{org.config.environmentType === 'prod' ? 'prod' : 'non-prod'}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-slate-500">Region</span><span className="text-white">{org.region || '—'}</span></div><div><span className="block text-xs text-slate-500">Environments</span><div className="flex flex-wrap gap-1 mt-1">{org.config.selectedEnvironments.map(env => <span key={env} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{env}</span>)}</div></div><div><span className="block text-xs text-slate-500">Expected TPS</span><span className="text-white">{org.config.expectedTps || '—'}</span></div><div><span className="block text-xs text-slate-500">API Count Range</span><span className="text-white">{org.config.expectedApiRange || '—'}</span></div>{org.config.notes && <div className="md:col-span-2"><span className="block text-xs text-slate-500">Notes</span><span className="text-white text-sm">{org.config.notes}</span></div>}</div></div>))}</div>
        </div>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
        <button onClick={onClose} className="rounded-lg border border-[#2a3a5a] bg-transparent px-5 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">Cancel</button>
        <button onClick={onSendApproval} disabled={isSendingApproval} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ff6b36] disabled:opacity-50">{isSendingApproval ? 'Sending...' : 'Confirm & Send for Approval'}</button>
      </div>
    </div>
  </div>
);

// ====================== MAIN COMPONENT ======================
export default function NewGatewayOnboarding({ showMessage}) {
    const userEmail = localStorage.getItem("useEmail") || "admin@forgecrux.com" ;
  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(false);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [showConsumerModal, setShowConsumerModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({ name: '', email: '', role: '' });
  const [consumerForm, setConsumerForm] = useState({ consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '', consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: '' });
  const [isAddingConsumer, setIsAddingConsumer] = useState(false);
  const [editingConsumerId, setEditingConsumerId] = useState(null);

  // History view/edit modal
  const [historyViewModal, setHistoryViewModal] = useState({ open: false, type: null, data: null, isLoading: false });
  const [editFormData, setEditFormData] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Onboarding state
  const [gatewayOnboardingStep, setGatewayOnboardingStep] = useState('organization');
  const [orgApprovalStatus, setOrgApprovalStatus] = useState(null);
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentApplicationId, setCurrentApplicationId] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [organizationSubmissions, setOrganizationSubmissions] = useState([]);
  const [buSubmissions, setBuSubmissions] = useState([]);
  const [teamSubmissions, setTeamSubmissions] = useState([]);
  const [submittingBu, setSubmittingBu] = useState(false);
  const [editingBuId, setEditingBuId] = useState(null);
  const [savedConsumers, setSavedConsumers] = useState([]);
  
  // User-specific data
  const [userBusinessUnits, setUserBusinessUnits] = useState([]);
  const [userTeamMembers, setUserTeamMembers] = useState([]);
  const [dashboardBuCount, setDashboardBuCount] = useState(0);
  const [dashboardTeamMemberCount, setDashboardTeamMemberCount] = useState(0);
  const [dashboardConsumerCount, setDashboardConsumerCount] = useState(0);

  // Company & Stakeholder (active organization – shown on main page)
  const [company, setCompany] = useState({ name: '', websiteUrl: '', region: '' });
  const [orgOnboardingData, setOrgOnboardingData] = useState({ firstName: '', lastName: '', ownerEmail: '', phoneNumber: '', sme: '', smeEmail: '', dlEmail: '', goLiveDate: '' });
  const [gatewayOrgs, setGatewayOrgs] = useState([{ id: generateGatewayId(), name: '', region: '', config: { environmentType: 'nonprod', selectedEnvironments: [], customEnvironments: '', expectedTps: '', expectedApiRange: '', notes: '' } }]);

  // Business Unit form fields
  const [onboardingTeamName, setOnboardingTeamName] = useState('');
  const [onboardingApplicationName, setOnboardingApplicationName] = useState('');
  const [onboardingApplicationId, setOnboardingApplicationId] = useState('');
  const [onboardingProjectOwner, setOnboardingProjectOwner] = useState('');
  const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState('');
  const [onboardingProjectSME, setOnboardingProjectSME] = useState('');
  const [onboardingProjectSMEEmail, setOnboardingProjectSMEEmail] = useState('');
  const [onboardingProjectDLEmail, setOnboardingProjectDLEmail] = useState('');
  const [onboardingGoLiveDate, setOnboardingGoLiveDate] = useState('');
  const [onboardingTesterName, setOnboardingTesterName] = useState('');
  const [onboardingTesterEmail, setOnboardingTesterEmail] = useState('');
  const [onboardingServiceNowGroup, setOnboardingServiceNowGroup] = useState('');
  const [onboardingServiceNowEmail, setOnboardingServiceNowEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] = useState([]);

  // History tabs state
  const [historyActiveTab, setHistoryActiveTab] = useState('organization');
  const [copiedId, setCopiedId] = useState(null);
  const [teamMemberSearch, setTeamMemberSearch] = useState('');

  // ========== Helper Functions ==========
  const isValidEmail = (email) => /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);

  const fetchUserBusinessUnits = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/user/${userEmail}/business-units`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        setUserBusinessUnits(data.businessUnits || []);
        setDashboardBuCount(data.businessUnits?.length || 0);
        let allMembers = [];
        for (const bu of (data.businessUnits || [])) {
          try {
            const membersRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${bu.id}/members`);
            if (membersRes.ok) {
              const membersData = await membersRes.json();
              const members = membersData.data || [];
              allMembers.push(...members.map(m => ({ ...m, businessUnitName: bu.teamName, businessUnitAppName: bu.applicationName })));
            }
          } catch (err) { console.error(`Failed to fetch members for BU ${bu.id}`, err); }
        }
        setUserTeamMembers(allMembers);
        setDashboardTeamMemberCount(allMembers.length);
      }
    } catch (err) { console.error('Error fetching user business units:', err); }
  }, [userEmail]);

  const fetchAllApplications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`);
      if (response.ok) setOrganizationSubmissions(await response.json());
    } catch (err) { console.error('Error fetching applications:', err); }
  }, []);

  const fetchBuHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units`);
      if (response.ok) {
        const result = await response.json();
        setBuSubmissions(result.data || []);
        const allMembers = result.data?.flatMap(unit => unit.members || []) || [];
        const unique = new Map();
        allMembers.forEach(m => { if (m.email && !unique.has(m.email)) unique.set(m.email, m); });
        setTeamSubmissions(Array.from(unique.values()));
      }
    } catch (err) { console.error('Error fetching BU history:', err); }
  }, []);

  const getConsumers = useCallback(async () => {
    const result = await consumerService.getAllConsumers();
    if (result.success) setSavedConsumers(result.data?.data || result.data || []);
  }, []);

  useEffect(() => {
    fetchUserBusinessUnits();
    fetchAllApplications();
    fetchBuHistory();
    getConsumers();
  }, [fetchUserBusinessUnits, fetchAllApplications, fetchBuHistory, getConsumers]);

  useEffect(() => {
    setDashboardConsumerCount(savedConsumers.length);
  }, [savedConsumers]);

  // ---------- Organization Helpers ----------
  const buildPayload = (companyData, stakeholderData, gatewayOrgsData) => ({
    company: companyData,
    stakeholder: stakeholderData,
    gatewayOrganizations: gatewayOrgsData.map(org => ({ id: org.id, name: org.name, region: org.region, config: { environmentType: org.config.environmentType, selectedEnvironments: org.config.selectedEnvironments, customEnvironments: org.config.customEnvironments, expectedTps: org.config.expectedTps, expectedApiRange: org.config.expectedApiRange, notes: org.config.notes } }))
  });

  const validateOrgForm = (companyData, stakeholderData, gatewayOrgsData) => {
    if (!companyData.name) { showMessage('Company name required', 'error'); return false; }
    if (!companyData.websiteUrl) { showMessage('Website URL required', 'error'); return false; }
    if (!companyData.region) { showMessage('Region required', 'error'); return false; }
    if (!stakeholderData.firstName || !stakeholderData.lastName) { showMessage('First and Last name required', 'error'); return false; }
    if (!isValidEmail(stakeholderData.ownerEmail)) { showMessage('Valid Owner Email required', 'error'); return false; }
    if (!stakeholderData.phoneNumber) { showMessage('Contact number required', 'error'); return false; }
    if (!stakeholderData.sme) { showMessage('SME Name required', 'error'); return false; }
    if (!isValidEmail(stakeholderData.smeEmail)) { showMessage('Valid SME Email required', 'error'); return false; }
    if (!isValidEmail(stakeholderData.dlEmail)) { showMessage('Valid Distribution List Email required', 'error'); return false; }
    const hasValidGatewayOrg = gatewayOrgsData.some(org => org.name.trim() !== '');
    if (!hasValidGatewayOrg) { showMessage('At least one Gateway Organization name required', 'error'); return false; }
    for (const org of gatewayOrgsData) {
      if (!org.region) { showMessage('Region required for all Gateway Organizations', 'error'); return false; }
      if (!org.name.trim()) { showMessage('Gateway Organization name required', 'error'); return false; }
      if (org.config.selectedEnvironments.length === 0 && !org.config.customEnvironments) { showMessage('At least one environment required for each Gateway Organization', 'error'); return false; }
      if (!org.config.expectedTps) { showMessage('Expected TPS required for all Gateway Organizations', 'error'); return false; }
      if (!org.config.expectedApiRange) { showMessage('Expected API range required for all Gateway Organizations', 'error'); return false; }
    }
    return true;
  };

  const saveAsDraft = async (localCompany, localStakeholder, localGatewayOrgs, onSuccess) => {
    if (!validateOrgForm(localCompany, localStakeholder, localGatewayOrgs)) return;
    setIsSavingDraft(true);
    try {
      const payload = buildPayload(localCompany, localStakeholder, localGatewayOrgs);
      let appId = currentApplicationId;
      let response;
      if (appId && !editingOrg) {
        // Update existing draft
        response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        // Create new draft
        response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (response.ok) {
        const data = await response.json();
        const newId = data.id || appId;
        setCurrentApplicationId(newId);
        // Update parent state with the new data
        setCompany(localCompany);
        setOrgOnboardingData(localStakeholder);
        setGatewayOrgs(localGatewayOrgs);
        setOrgApprovalStatus('draft');
        await fetchAllApplications();
        showMessage('Draft saved successfully.', 'success');
        onSuccess();
      } else throw new Error('Failed to save draft');
    } catch (err) { console.error(err); showMessage('Failed to save draft.', 'error'); }
    // finally { setIsSavingDraft(false); }
  };

  const sendApprovalRequest = async (localCompany, localStakeholder, localGatewayOrgs, onSuccess) => {
    if (!validateOrgForm(localCompany, localStakeholder, localGatewayOrgs)) return;
    setIsSendingApproval(true);
    try {
      let appId = currentApplicationId;
      let response;
      if (appId && !editingOrg) {
        // Update existing before submit
        const payload = buildPayload(localCompany, localStakeholder, localGatewayOrgs);
        await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        // Create new draft
        const createRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(localCompany, localStakeholder, localGatewayOrgs)) });
        if (!createRes.ok) throw new Error('Failed to create draft');
        const draftData = await createRes.json();
        appId = draftData.id;
        setCurrentApplicationId(appId);
      }
      const submitPayload = { ...buildPayload(localCompany, localStakeholder, localGatewayOrgs), targetEmail: 'info@probestack.io' };
      const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submitPayload) });
      if (submitRes.ok) {
        // Update parent state after successful submission
        setCompany(localCompany);
        setOrgOnboardingData(localStakeholder);
        setGatewayOrgs(localGatewayOrgs);
        setOrgApprovalStatus('pending');
        await fetchAllApplications();
        showMessage('Approval request sent.', 'success');
        startPolling(appId);
        onSuccess();
      } else throw new Error(await submitRes.text() || 'Failed to submit for approval');
    } catch (err) { console.error(err); showMessage(err.message, 'error'); }
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
          if (data.status !== 'pending') {
            clearInterval(window._approvalInterval);
            if (data.status === 'approved') { setGatewayOnboardingStep('businessUnit'); showMessage('Organization approved!', 'success'); }
            else if (data.status === 'rejected') showMessage('Organization rejected.', 'error');
          }
        }
      } catch (err) { console.error('Polling error', err); }
    }, 10000);
  };

  const checkApprovalStatus = async () => {
    if (!currentApplicationId) { showMessage('No application ID.', 'error'); return; }
    setIsCheckingStatus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentApplicationId}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      const status = data.status === 'PENDING_APPROVAL' ? 'pending' : data.status.toLowerCase();
      setOrgApprovalStatus(status);
      if (status === 'approved') { showMessage('Organization approved!', 'success'); setGatewayOnboardingStep('businessUnit'); }
      else if (status === 'rejected') showMessage('Organization rejected.', 'error');
      else if (status === 'pending') showMessage('Still pending approval.', 'info');
    } catch (err) { console.error(err); showMessage('Failed to check status.', 'error'); }
    finally { setIsCheckingStatus(false); }
  };

  const loadSubmission = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${id}`);
      if (!response.ok) throw new Error('Failed to fetch submission details');
      const data = await response.json();
      setCompany(data.company);
      setOrgOnboardingData({ firstName: data.stakeholder.firstName, lastName: data.stakeholder.lastName, ownerEmail: data.stakeholder.email, phoneNumber: data.stakeholder.phone, sme: data.stakeholder.sme || '', smeEmail: data.stakeholder.smeEmail || '', dlEmail: data.stakeholder.dlEmail || '', goLiveDate: '' });
      setGatewayOrgs(data.gatewayOrganizations.map(org => ({ id: org.id, name: org.name, region: org.region, config: { environmentType: org.config.environmentType, selectedEnvironments: org.config.selectedEnvironments, customEnvironments: org.config.customEnvironments || '', expectedTps: org.config.expectedTps, expectedApiRange: org.config.expectedApiRange, notes: org.config.notes || '' } })));
      const frontendStatus = data.status === 'PENDING_APPROVAL' ? 'pending' : data.status.toLowerCase();
      setOrgApprovalStatus(frontendStatus);
      setCurrentApplicationId(data.id);
      setGatewayOnboardingStep(frontendStatus === 'approved' ? 'businessUnit' : 'organization');
      showMessage(`${frontendStatus.toUpperCase()} organization loaded.`, 'success');
    } catch (err) { console.error(err); showMessage('Failed to load submission details.', 'error'); }
  };

  const resetForm = () => {
    setCompany({ name: '', websiteUrl: '', region: '' });
    setOrgOnboardingData({ firstName: '', lastName: '', ownerEmail: '', phoneNumber: '', sme: '', smeEmail: '', dlEmail: '', goLiveDate: '' });
    setGatewayOrgs([{ id: generateGatewayId(), name: '', region: '', config: { environmentType: 'nonprod', selectedEnvironments: [], customEnvironments: '', expectedTps: '', expectedApiRange: '', notes: '' } }]);
    setApprovalMessage(null);
    setCurrentApplicationId(null);
    setOrgApprovalStatus(null);
    showMessage('Form has been reset.', 'info');
  };

  // Business Unit helpers
  const validateBusinessUnit = () => {
    if (!onboardingTeamName.trim()) { showMessage('Team Name required', 'error'); return false; }
    if (!onboardingApplicationName.trim()) { showMessage('Application Name required', 'error'); return false; }
    if (!onboardingProjectOwner.trim()) { showMessage('Project Owner required', 'error'); return false; }
    if (!isValidEmail(onboardingOwnerEmail)) { showMessage('Valid Owner Email required', 'error'); return false; }
    if (!onboardingProjectSME.trim()) { showMessage('Project SME required', 'error'); return false; }
    if (!isValidEmail(onboardingProjectSMEEmail)) { showMessage('Valid Project SME Email required', 'error'); return false; }
    if (!isValidEmail(onboardingProjectDLEmail)) { showMessage('Valid Project DL Email required', 'error'); return false; }
    if (!onboardingGoLiveDate) { showMessage('Expected Go-Live Date required', 'error'); return false; }
    if (!onboardingTesterName.trim()) { showMessage('Tester Name required', 'error'); return false; }
    if (!isValidEmail(onboardingTesterEmail)) { showMessage('Valid Tester Email required', 'error'); return false; }
    if (teamMembers.length === 0) { showMessage('At least one Team Member required', 'error'); return false; }
    return true;
  };

  const resetBuForm = () => {
    setOnboardingTeamName(''); setOnboardingApplicationName(''); setOnboardingApplicationId(''); setOnboardingProjectOwner(''); setOnboardingOwnerEmail('');
    setOnboardingProjectSME(''); setOnboardingProjectSMEEmail(''); setOnboardingProjectDLEmail(''); setOnboardingGoLiveDate('');
    setOnboardingTesterName(''); setOnboardingTesterEmail(''); setOnboardingServiceNowGroup(''); setOnboardingServiceNowEmail('');
    setTeamMembers([]); setSelectedOnboardingConsumers([]); setEditingBuId(null);
  };

  const loadBusinessUnit = (bu) => {
    setOnboardingTeamName(bu.teamName); setOnboardingApplicationName(bu.applicationName); setOnboardingApplicationId(bu.applicationId || '');
    setOnboardingProjectOwner(bu.projectOwner || ''); setOnboardingOwnerEmail(bu.ownerEmail || '');
    setOnboardingProjectSME(bu.projectSME || ''); setOnboardingProjectSMEEmail(bu.projectSMEEmail || '');
    setOnboardingProjectDLEmail(bu.projectDLEmail || ''); setOnboardingGoLiveDate(bu.expectedGoLiveDate || '');
    setOnboardingTesterName(bu.testerName || ''); setOnboardingTesterEmail(bu.testerEmail || '');
    setOnboardingServiceNowGroup(bu.servicenowGroupName || ''); setOnboardingServiceNowEmail(bu.servicenowEmail || '');
    setTeamMembers(bu.members || []); setSelectedOnboardingConsumers(bu.consumers?.map(c => c.id) || []);
    setEditingBuId(bu.id);
    showMessage(`Loaded business unit "${bu.teamName}" for editing`, 'success');
  };

  const submitBusinessUnit = async () => {
    if (!validateBusinessUnit()) return;
    const membersPayload = teamMembers.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.role || null }));
    const consumersPayload = selectedOnboardingConsumers.map(id => { const c = savedConsumers.find(c => c.id === id); return { id: c.id, consumerId: c.consumerId || c.id, name: c.consumerName || 'Unnamed' }; });
    const payload = { onboardingId: currentApplicationId || null, teamName: onboardingTeamName, applicationName: onboardingApplicationName, applicationId: onboardingApplicationId, projectOwner: onboardingProjectOwner, ownerEmail: onboardingOwnerEmail, projectSME: onboardingProjectSME, projectSMEEmail: onboardingProjectSMEEmail, projectDLEmail: onboardingProjectDLEmail, expectedGoLiveDate: onboardingGoLiveDate, testerName: onboardingTesterName, testerEmail: onboardingTesterEmail, servicenowGroupName: onboardingServiceNowGroup, servicenowEmail: onboardingServiceNowEmail, members: membersPayload, consumers: consumersPayload };
    setSubmittingBu(true);
    try {
      let url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units`;
      let method = 'POST';
      if (editingBuId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editingBuId}`; method = 'PUT'; }
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json()).message || 'Submission failed');
      const result = await response.json();
      showMessage(result.message || 'Business unit submitted successfully', 'success');
      setEditingBuId(null); resetBuForm(); 
      await fetchBuHistory(); 
      await fetchUserBusinessUnits();
      localStorage.setItem('buCompleted', 'true');
    } catch (err) { console.error(err); showMessage(err.message, 'error'); }
    finally { setSubmittingBu(false); }
  };

  const addTeamMember = () => {
    if (!newTeamMember.name.trim() || !newTeamMember.email.trim()) { showMessage('Name and email required', 'error'); return; }
    if (!newTeamMember.role) { showMessage('Role required', 'error'); return; }
    setTeamMembers(prev => [...prev, { id: Date.now(), name: newTeamMember.name, email: newTeamMember.email, role: newTeamMember.role }]);
    setNewTeamMember({ name: '', email: '', role: '' });
    setShowTeamMemberModal(false);
    showMessage('Team member added', 'success');
  };

  const handleSaveConsumer = async () => {
    setIsAddingConsumer(true);
    const consumerData = { organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", consumerName: consumerForm.consumerName, consumerPocName: consumerForm.consumerPocName, consumerPocEmail: consumerForm.consumerPocEmail, consumerSmeName: consumerForm.consumerSmeName, consumerSmeEmail: consumerForm.consumerSmeEmail, consumerConfig: consumerForm.consumerConfig, apiTps: parseInt(consumerForm.apiTps) || 100, quota: consumerForm.quota, rateLimiting: consumerForm.rateLimiting, apiKeyInformation: consumerForm.apiKeyInfo };
    const result = await consumerService.createConsumer(consumerData);
    if (result.success) { await getConsumers(); setConsumerForm({ consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '', consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: '' }); setShowConsumerModal(false); showMessage('Consumer saved', 'success'); }
    else showMessage(result.error, 'error');
    setIsAddingConsumer(false);
  };

  const handleEditConsumer = (consumer) => {
    setEditingConsumerId(consumer.id);
    setConsumerForm({ consumerName: consumer.consumerName || '', consumerPocName: consumer.consumerPocName || '', consumerPocEmail: consumer.consumerPocEmail || '', consumerSmeName: consumer.consumerSmeName || '', consumerSmeEmail: consumer.consumerSmeEmail || '', consumerConfig: consumer.consumerConfig || '', apiTps: consumer.apiTps || '', quota: consumer.quota || '', rateLimiting: consumer.rateLimiting || '', apiKeyInfo: consumer.apiKeyInformation || consumer.apiKeyInfo || '' });
    setShowConsumerModal(true);
  };

  const handleUpdateConsumer = async () => {
    setIsAddingConsumer(true);
    const consumerData = { organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c", consumerName: consumerForm.consumerName, consumerPocName: consumerForm.consumerPocName, consumerPocEmail: consumerForm.consumerPocEmail, consumerSmeName: consumerForm.consumerSmeName, consumerSmeEmail: consumerForm.consumerSmeEmail, consumerConfig: consumerForm.consumerConfig, apiTps: parseInt(consumerForm.apiTps) || 100, quota: consumerForm.quota, rateLimiting: consumerForm.rateLimiting, apiKeyInformation: consumerForm.apiKeyInfo };
    const result = await consumerService.updateConsumer(editingConsumerId, consumerData);
    if (result.success) { await getConsumers(); setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '', consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: '' }); showMessage('Consumer updated', 'success'); }
    else showMessage(result.error, 'error');
    setIsAddingConsumer(false);
  };

  // ========== HISTORY VIEW/EDIT MODAL ==========
  const openHistoryView = (type, data) => {
    setHistoryViewModal({ open: true, type, data, isLoading: false });
    setEditFormData(JSON.parse(JSON.stringify(data)));
  };

  const closeHistoryView = () => {
    setHistoryViewModal({ open: false, type: null, data: null, isLoading: false });
    setEditFormData(null);
    setIsSavingEdit(false);
  };

  const saveOrganizationEdit = async () => {
    setIsSavingEdit(true);
    try {
      const payload = {
        company: editFormData.company,
        stakeholder: editFormData.stakeholder,
        gatewayOrganizations: editFormData.gatewayOrganizations
      };
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        showMessage('Organization updated successfully', 'success');
        await fetchAllApplications();
        if (editFormData.id === currentApplicationId) await loadSubmission(editFormData.id);
        closeHistoryView();
      } else throw new Error('Update failed');
    } catch (err) {
      console.error(err);
      showMessage('Failed to update organization', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const saveBusinessUnitEdit = async () => {
    setIsSavingEdit(true);
    try {
      const payload = {
        teamName: editFormData.teamName,
        applicationName: editFormData.applicationName,
        applicationId: editFormData.applicationId,
        projectOwner: editFormData.projectOwner,
        ownerEmail: editFormData.ownerEmail,
        projectSME: editFormData.projectSME,
        projectSMEEmail: editFormData.projectSMEEmail,
        projectDLEmail: editFormData.projectDLEmail,
        expectedGoLiveDate: editFormData.expectedGoLiveDate,
        testerName: editFormData.testerName,
        testerEmail: editFormData.testerEmail,
        servicenowGroupName: editFormData.servicenowGroupName,
        servicenowEmail: editFormData.servicenowEmail,
        members: editFormData.members || [],
        consumers: editFormData.consumers || []
      };
      const response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        showMessage('Business unit updated successfully', 'success');
        await fetchBuHistory();
        await fetchUserBusinessUnits();
        closeHistoryView();
      } else throw new Error('Update failed');
    } catch (err) {
      console.error(err);
      showMessage('Failed to update business unit', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ========== ORGANIZATION FORM MODAL (with local state) ==========
  const OrganizationFormModal = () => {
    // Local copy of data – only updates parent on explicit save/approval
    const [localCompany, setLocalCompany] = useState(() => ({ ...company }));
    const [localStakeholder, setLocalStakeholder] = useState(() => ({ ...orgOnboardingData }));
    const [localGatewayOrgs, setLocalGatewayOrgs] = useState(() => gatewayOrgs.map(org => ({ ...org, config: { ...org.config } })));
    const [localApprovalMessage, setLocalApprovalMessage] = useState('');
    const [localIsSaving, setLocalIsSaving] = useState(false);
    const [localIsSending, setLocalIsSending] = useState(false);

    // Reset local state when modal opens
    useEffect(() => {
      if (showOrgModal) {
        setLocalCompany({ ...company });
        setLocalStakeholder({ ...orgOnboardingData });
        setLocalGatewayOrgs(gatewayOrgs.map(org => ({ ...org, config: { ...org.config } })));
        setLocalApprovalMessage('');
      }
    }, [showOrgModal, company, orgOnboardingData, gatewayOrgs]);

    // Helper to validate local data
    const isValid = () => {
      if (!localCompany.name) { showMessage('Company name required', 'error'); return false; }
      if (!localCompany.websiteUrl) { showMessage('Website URL required', 'error'); return false; }
      if (!localCompany.region) { showMessage('Region required', 'error'); return false; }
      if (!localStakeholder.firstName || !localStakeholder.lastName) { showMessage('First and Last name required', 'error'); return false; }
      if (!isValidEmail(localStakeholder.ownerEmail)) { showMessage('Valid Owner Email required', 'error'); return false; }
      if (!localStakeholder.phoneNumber) { showMessage('Contact number required', 'error'); return false; }
      if (!localStakeholder.sme) { showMessage('SME Name required', 'error'); return false; }
      if (!isValidEmail(localStakeholder.smeEmail)) { showMessage('Valid SME Email required', 'error'); return false; }
      if (!isValidEmail(localStakeholder.dlEmail)) { showMessage('Valid Distribution List Email required', 'error'); return false; }
      const hasValidGatewayOrg = localGatewayOrgs.some(org => org.name.trim() !== '');
      if (!hasValidGatewayOrg) { showMessage('At least one Gateway Organization name required', 'error'); return false; }
      for (const org of localGatewayOrgs) {
        if (!org.region) { showMessage('Region required for all Gateway Organizations', 'error'); return false; }
        if (!org.name.trim()) { showMessage('Gateway Organization name required', 'error'); return false; }
        if (org.config.selectedEnvironments.length === 0 && !org.config.customEnvironments) { showMessage('At least one environment required for each Gateway Organization', 'error'); return false; }
        if (!org.config.expectedTps) { showMessage('Expected TPS required for all Gateway Organizations', 'error'); return false; }
        if (!org.config.expectedApiRange) { showMessage('Expected API range required for all Gateway Organizations', 'error'); return false; }
      }
      return true;
    };

    const handleSaveDraft = async () => {
      if (!isValid()) return;
      setLocalIsSaving(true);
      setLocalApprovalMessage('');
      try {
        const payload = buildPayload(localCompany, localStakeholder, localGatewayOrgs);
        let appId = currentApplicationId;
        let response;
        if (appId && !editingOrg) {
          // Update existing draft
          response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          // Create new draft
          response = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        if (!response.ok) throw new Error('Failed to save draft');
        const data = await response.json();
        const newId = data.id || appId;
        setCurrentApplicationId(newId);
        // Update parent state with the saved data (so main page reflects draft)
        setCompany(localCompany);
        setOrgOnboardingData(localStakeholder);
        setGatewayOrgs(localGatewayOrgs);
        setOrgApprovalStatus('draft');
        await fetchAllApplications(); // refresh history
        showMessage('Draft saved successfully.', 'success');
        setLocalApprovalMessage('Draft saved.');
        // Do NOT close the modal – stay open for further edits
      } catch (err) {
        console.error(err);
        showMessage('Failed to save draft.', 'error');
        setLocalApprovalMessage('Error saving draft.');
      } finally {
        setLocalIsSaving(false);
      }
    };

    const handleSendApproval = async () => {
      if (!isValid()) return;
      setLocalIsSending(true);
      setLocalApprovalMessage('');
      try {
        let appId = currentApplicationId;
        // If no existing draft, create one first
        if (!appId || editingOrg) {
          const createPayload = buildPayload(localCompany, localStakeholder, localGatewayOrgs);
          const createRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
          });
          if (!createRes.ok) throw new Error('Failed to create draft');
          const draftData = await createRes.json();
          appId = draftData.id;
          setCurrentApplicationId(appId);
        } else {
          // Update existing draft with latest data
          const updatePayload = buildPayload(localCompany, localStakeholder, localGatewayOrgs);
          await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
          });
        }
        // Submit for approval
        const submitPayload = {
          ...buildPayload(localCompany, localStakeholder, localGatewayOrgs),
          targetEmail: 'info@probestack.io'
        };
        const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitPayload)
        });
        if (!submitRes.ok) throw new Error(await submitRes.text() || 'Failed to submit');
        // Update parent state
        setCompany(localCompany);
        setOrgOnboardingData(localStakeholder);
        setGatewayOrgs(localGatewayOrgs);
        setOrgApprovalStatus('pending');
        await fetchAllApplications();
        showMessage('Approval request sent.', 'success');
        startPolling(appId);
        // Close modal after successful submission
        setShowOrgModal(false);
        setEditingOrg(false);
      } catch (err) {
        console.error(err);
        showMessage(err.message, 'error');
        setLocalApprovalMessage('Error sending approval.');
      } finally {
        setLocalIsSending(false);
      }
    };

    // Helper functions for local state updates
    const handleCompanyChange = (field, value) => setLocalCompany(prev => ({ ...prev, [field]: value }));
    const handleStakeholderChange = (field, value) => setLocalStakeholder(prev => ({ ...prev, [field]: value }));
    const addLocalGatewayOrg = () => setLocalGatewayOrgs(prev => [{ id: generateGatewayId(), name: '', region: '', config: { environmentType: 'nonprod', selectedEnvironments: [], customEnvironments: '', expectedTps: '', expectedApiRange: '', notes: '' } }, ...prev]);
    const removeLocalGatewayOrg = (id) => { if (localGatewayOrgs.length > 1) setLocalGatewayOrgs(prev => prev.filter(org => org.id !== id)); };
    const updateLocalGatewayOrg = (id, field, value) => setLocalGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, [field]: value } : org));
    const updateLocalGatewayOrgConfig = (id, configField, value) => setLocalGatewayOrgs(prev => prev.map(org => org.id === id ? { ...org, config: { ...org.config, [configField]: value } } : org));
    const handleLocalEnvironmentCheckbox = (orgId, env) => setLocalGatewayOrgs(prev => prev.map(org => org.id === orgId ? { ...org, config: { ...org.config, selectedEnvironments: org.config.selectedEnvironments.includes(env) ? org.config.selectedEnvironments.filter(e => e !== env) : [...org.config.selectedEnvironments, env] } } : org));

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-[#111520] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
            <div><h3 className="text-xl font-semibold text-white">{editingOrg ? "Edit Organization" : "Create New Organization"}</h3><p className="text-xs text-slate-400">Fill in the details below</p></div>
            <button onClick={() => { setShowOrgModal(false); setEditingOrg(false); }} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            {/* Company Information */}
            <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2"><Building className="w-4 h-4" /> Company Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div><Label className="text-xs text-gray-300">Company Name *</Label><Input value={localCompany.name} onChange={e => handleCompanyChange('name', e.target.value)} className="bg-dark-900" /></div>
                <div><Label className="text-xs text-gray-300">Website URL *</Label><Input value={localCompany.websiteUrl} onChange={e => handleCompanyChange('websiteUrl', e.target.value)} className="bg-dark-900" /></div>
                <div><Label className="text-xs text-gray-300">Region *</Label><select value={localCompany.region} onChange={e => handleCompanyChange('region', e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border bg-dark-900"><option value="">Select</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div>
              </div>
            </Card>
            {/* Stakeholder Information */}
            <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2"><Users className="w-4 h-4" /> Stakeholder Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div><Label className="text-xs text-gray-300">First Name *</Label><Input value={localStakeholder.firstName} onChange={e => handleStakeholderChange('firstName', e.target.value)} /></div>
                <div><Label className="text-xs text-gray-300">Last Name *</Label><Input value={localStakeholder.lastName} onChange={e => handleStakeholderChange('lastName', e.target.value)} /></div>
                <div><Label className="text-xs text-gray-300">Owner Email *</Label><Input type="email" value={localStakeholder.ownerEmail} onChange={e => handleStakeholderChange('ownerEmail', e.target.value)} /></div>
                <div><Label className="text-xs text-gray-300">Contact Number *</Label><Input value={localStakeholder.phoneNumber} onChange={e => handleStakeholderChange('phoneNumber', e.target.value)} /></div>
                <div><Label className="text-xs text-gray-300">SME Name *</Label><Input value={localStakeholder.sme} onChange={e => handleStakeholderChange('sme', e.target.value)} /></div>
                <div><Label className="text-xs text-gray-300">SME Email *</Label><Input type="email" value={localStakeholder.smeEmail} onChange={e => handleStakeholderChange('smeEmail', e.target.value)} /></div>
                <div><Label className="text-xs text-gray-300">Distribution List Email *</Label><Input type="email" value={localStakeholder.dlEmail} onChange={e => handleStakeholderChange('dlEmail', e.target.value)} /></div>
              </div>
            </Card>
            {/* Gateway Configurations */}
            <Card className="p-5" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
              <div className="flex justify-between mb-4"><h4 className="text-sm font-semibold text-primary flex items-center gap-2"><Network className="w-4 h-4" /> Gateway Configurations</h4><button onClick={addLocalGatewayOrg} className="px-3 py-1.5 rounded-lg text-xs bg-primary/20 text-primary"><Plus className="w-3.5 h-3.5" /> Add</button></div>
              <div className="space-y-6">
                {localGatewayOrgs.map(org => (
                  <div key={org.id} className="relative border border-dark-700 rounded-lg p-4">
                    {localGatewayOrgs.length > 1 && <button onClick={() => removeLocalGatewayOrg(org.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400"><X className="w-4 h-4" /></button>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div><Label className="text-xs text-gray-300">Region *</Label><select value={org.region} onChange={e => updateLocalGatewayOrg(org.id, 'region', e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border bg-dark-900"><option value="">Select</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div>
                      <div><Label className="text-xs text-gray-300">Gateway Org Name *</Label><Input value={org.name} onChange={e => updateLocalGatewayOrg(org.id, 'name', e.target.value)} className="bg-dark-900" /></div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="mb-4"><Label className="text-xs mb-2 block">Environment Type *</Label><div className="flex gap-4"><label><input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === 'nonprod'} onChange={() => updateLocalGatewayOrgConfig(org.id, 'environmentType', 'nonprod')} /> non-prod</label><label><input type="radio" name={`envType-${org.id}`} checked={org.config.environmentType === 'prod'} onChange={() => updateLocalGatewayOrgConfig(org.id, 'environmentType', 'prod')} /> prod</label></div></div>
                      <div className="mb-4"><Label className="text-xs mb-2 block">Select Environments *</Label><div className="flex flex-wrap gap-3 border p-3 rounded-lg bg-dark-900/50">{envOptionsByType[org.config.environmentType].map(env => (<label key={env} className="flex items-center gap-1"><input type="checkbox" checked={org.config.selectedEnvironments.includes(env)} onChange={() => handleLocalEnvironmentCheckbox(org.id, env)} />{env}</label>))}<label><input type="checkbox" checked={org.config.selectedEnvironments.includes('custom')} onChange={() => { if (org.config.selectedEnvironments.includes('custom')) { updateLocalGatewayOrgConfig(org.id, 'selectedEnvironments', org.config.selectedEnvironments.filter(e => e !== 'custom')); updateLocalGatewayOrgConfig(org.id, 'customEnvironments', ''); } else { updateLocalGatewayOrgConfig(org.id, 'selectedEnvironments', [...org.config.selectedEnvironments, 'custom']); } }} /> Custom</label></div>{org.config.selectedEnvironments.includes('custom') && <div className="mt-3"><Input placeholder="Comma-separated" value={org.config.customEnvironments} onChange={e => updateLocalGatewayOrgConfig(org.id, 'customEnvironments', e.target.value)} className="bg-dark-900" /></div>}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs">Expected TPS *</Label><Input type="number" placeholder="e.g., 1000" value={org.config.expectedTps} onChange={e => updateLocalGatewayOrgConfig(org.id, 'expectedTps', e.target.value)} className="bg-dark-900" /></div><div><Label className="text-xs">Expected API Range *</Label><select value={org.config.expectedApiRange} onChange={e => updateLocalGatewayOrgConfig(org.id, 'expectedApiRange', e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm border bg-dark-900"><option value="">Select</option><option value="0-100">0 - 100</option><option value="100-300">100 - 300</option><option value="300-500">300 - 500</option><option value="500-1000+">500 - 1000+</option></select></div><div className="md:col-span-2"><Label className="text-xs">Notes</Label><textarea rows={2} value={org.config.notes} onChange={e => updateLocalGatewayOrgConfig(org.id, 'notes', e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border bg-dark-900" /></div></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            {localApprovalMessage && <div className="text-sm text-yellow-300 bg-yellow-500/10 p-3 rounded-lg">{localApprovalMessage}</div>}
          </div>
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-[#0f172a]/90 px-6 py-4">
            <button onClick={() => { setShowOrgModal(false); setEditingOrg(false); }} className="rounded-lg border px-5 py-2 text-sm">Cancel</button>
            <button onClick={handleSaveDraft} disabled={localIsSaving} className="rounded-lg border border-[#ff5b1f]/30 bg-[#ff5b1f]/10 px-5 py-2 text-sm text-[#ff8a5c]">{localIsSaving ? 'Saving...' : 'Save Draft'}</button>
            <button onClick={handleSendApproval} disabled={localIsSending} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm text-white">{localIsSending ? 'Sending...' : 'Send for Approval'}</button>
          </div>
        </div>
      </div>
    );
  };

  // ========== ENTERPRISE ORGANIZATION SUMMARY CARD ==========
  const OrganizationSummary = () => {
    if (!company.name && !orgApprovalStatus) return null;
    return (
      <div className="mt-6 rounded-2xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-gradient-to-r from-[#1a1f2e] to-[#0f172a] border-b border-[#2a3550] flex justify-between items-center">
          <div><h3 className="text-lg font-semibold text-white flex items-center gap-2"><Building className="h-5 w-5 text-[#ff8a5c]" /> Organization Dashboard</h3><p className="text-xs text-slate-400">Complete overview of your organization, stakeholders, gateway configurations, and accessible business units.</p></div>
          <Button onClick={() => { setEditingOrg(true); setShowOrgModal(true); }} variant="outline" className="border-[#ff5b1f]/30 text-[#ff8a5c] hover:bg-[#ff5b1f]/10"><Edit className="h-4 w-4 mr-1" /> Edit</Button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-[#0f172a]/60 border border-[#2a3550] p-5 hover:border-[#ff8a5c]/30 transition-all"><div className="flex items-center gap-2 mb-4"><MapPin className="h-4 w-4 text-emerald-400" /><h4 className="text-sm font-semibold text-white">Company</h4></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">Name:</span><span className="text-white font-medium">{company.name || '—'}</span></div><div className="flex justify-between"><span className="text-slate-400">Website:</span><span className="text-white">{company.websiteUrl || '—'}</span></div><div className="flex justify-between"><span className="text-slate-400">Region:</span><span className="text-white">{company.region || '—'}</span></div></div></div>
            <div className="rounded-xl bg-[#0f172a]/60 border border-[#2a3550] p-5 hover:border-[#ff8a5c]/30 transition-all"><div className="flex items-center gap-2 mb-4"><User className="h-4 w-4 text-blue-400" /><h4 className="text-sm font-semibold text-white">Primary Stakeholder</h4></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">Name:</span><span className="text-white">{orgOnboardingData.firstName} {orgOnboardingData.lastName}</span></div><div className="flex justify-between"><span className="text-slate-400">Email:</span><span className="text-white">{orgOnboardingData.ownerEmail}</span></div><div className="flex justify-between"><span className="text-slate-400">Phone:</span><span className="text-white">{orgOnboardingData.phoneNumber}</span></div><div className="flex justify-between"><span className="text-slate-400">SME:</span><span className="text-white">{orgOnboardingData.sme} ({orgOnboardingData.smeEmail})</span></div><div className="flex justify-between"><span className="text-slate-400">DL Email:</span><span className="text-white">{orgOnboardingData.dlEmail}</span></div></div></div>
          </div>
          <div className="rounded-xl bg-[#0f172a]/60 border border-[#2a3550] p-5"><div className="flex items-center gap-2 mb-4"><Globe className="h-4 w-4 text-purple-400" /><h4 className="text-sm font-semibold text-white">Gateway Organizations ({gatewayOrgs.length})</h4></div><div className="space-y-3">{gatewayOrgs.map((org, idx) => (<div key={org.id} className="border-b border-[#2a3550] pb-3 last:border-0"><div className="flex justify-between items-start"><div><span className="font-mono text-white font-medium">{org.name || 'Unnamed'}</span><span className="ml-2 text-xs bg-[#ff5b1f]/20 text-[#ff8a5c] px-2 rounded-full">{org.region || 'No region'}</span></div><span className="text-xs text-slate-400">{org.config.environmentType === 'prod' ? 'Production' : 'Non-Production'}</span></div><div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs"><div><span className="text-slate-500">Environments:</span> {org.config.selectedEnvironments.length ? org.config.selectedEnvironments.join(', ') : org.config.customEnvironments || '—'}</div><div><span className="text-slate-500">Expected TPS:</span> {org.config.expectedTps || '—'}</div><div><span className="text-slate-500">API Range:</span> {org.config.expectedApiRange || '—'}</div>{org.config.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> {org.config.notes}</div>}</div></div>))}</div></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-[#0f172a]/60 border border-[#2a3550] p-5"><div className="flex items-center gap-2 mb-4"><Briefcase className="h-4 w-4 text-amber-400" /><h4 className="text-sm font-semibold text-white">Accessible Business Units ({userBusinessUnits.length})</h4></div>{userBusinessUnits.length === 0 ? <p className="text-sm text-slate-400">None</p> : <div className="space-y-3 max-h-64 overflow-y-auto">{userBusinessUnits.map(bu => (<div key={bu.id} className="border-b border-[#2a3550] pb-2"><div className="font-medium text-white">{bu.teamName}</div><div className="text-xs text-slate-400">App: {bu.applicationName} | Owner: {bu.projectOwner}</div><div className="text-xs text-slate-400">Go-Live: {bu.expectedGoLiveDate ? new Date(bu.expectedGoLiveDate).toLocaleDateString() : '—'}</div></div>))}</div>}</div>
            <div className="rounded-xl bg-[#0f172a]/60 border border-[#2a3550] p-5"><div className="flex items-center gap-2 mb-4"><Users className="h-4 w-4 text-cyan-400" /><h4 className="text-sm font-semibold text-white">Team Members ({userTeamMembers.length})</h4></div>{userTeamMembers.length === 0 ? <p className="text-sm text-slate-400">None</p> : <div className="space-y-2 max-h-64 overflow-y-auto">{userTeamMembers.map(m => (<div key={m.id} className="flex justify-between items-center border-b border-[#2a3550] pb-2"><div><span className="text-white text-sm">{m.name}</span><div className="text-xs text-slate-400">{m.email}</div></div><span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{m.role || 'Member'}</span></div>))}</div>}</div>
          </div>
          <div className="flex justify-end pt-2 border-t border-[#2a3550]"><div className={cn("px-3 py-1 rounded-full text-xs font-medium", orgApprovalStatus === 'approved' ? "bg-emerald-500/20 text-emerald-300" : orgApprovalStatus === 'pending' ? "bg-yellow-500/20 text-yellow-300" : "bg-slate-500/20 text-slate-300")}>Status: {orgApprovalStatus ? orgApprovalStatus.toUpperCase() : (company.name ? 'DRAFT' : 'INCOMPLETE')}</div></div>
        </div>
      </div>
    );
  };

  // ========== HISTORY SECTION (unchanged, but keep for brevity) ==========
  const HistorySection = () => {
    const aggregatedTeamMembers = useMemo(() => {
      const members = [];
      buSubmissions.forEach(bu => { if (bu.members) bu.members.forEach(m => members.push({ ...m, businessUnitId: bu.id, businessUnitName: bu.teamName, businessUnitAppName: bu.applicationName })); });
      return members;
    }, [buSubmissions]);

    const mapStatus = (status) => {
      if (status === 'PENDING_APPROVAL') return 'pending';
      if (status === 'DRAFT') return 'draft';
      if (status === 'APPROVED') return 'approved';
      if (status === 'REJECTED') return 'rejected';
      return status?.toLowerCase() || 'unknown';
    };

    return (
      <div className="mt-8 rounded-2xl border border-[#2a3550] bg-gradient-to-br from-[#111520] to-[#0e121c] overflow-hidden">
        <div className="px-6 py-4 bg-[#1a1f2e]/50 border-b border-[#2a3550]"><h3 className="text-lg font-semibold text-white flex items-center gap-2"><History className="h-5 w-5 text-[#ff8a5c]" /> Onboarding History</h3><p className="text-xs text-slate-400">View past organization, business unit, and team submissions</p></div>
        <div className="px-6 pt-4 border-b border-[#2a3550] flex gap-4">
          <button onClick={() => setHistoryActiveTab('organization')} className={`pb-2 px-1 text-sm font-medium transition ${historyActiveTab === 'organization' ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}>Organization</button>
          <button onClick={() => setHistoryActiveTab('bu')} className={`pb-2 px-1 text-sm font-medium transition ${historyActiveTab === 'bu' ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}>Business Unit</button>
          <button onClick={() => setHistoryActiveTab('team')} className={`pb-2 px-1 text-sm font-medium transition ${historyActiveTab === 'team' ? 'text-[#4f8ef7] border-b-2 border-[#4f8ef7]' : 'text-[#7f8fa8] hover:text-white'}`}>Team</button>
        </div>
        <div className="p-6">
          {historyActiveTab === 'organization' && (
            organizationSubmissions.length === 0 ? <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" /><p>No organization submissions yet.</p></div> :
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {organizationSubmissions.map(sub => {
                const status = mapStatus(sub.status);
                const statusColors = { approved: 'bg-emerald-500/20 text-emerald-300', pending: 'bg-yellow-500/20 text-yellow-300', rejected: 'bg-red-500/20 text-red-300', draft: 'bg-slate-500/20 text-slate-300' };
                return (
                  <div key={sub.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff5b1f] to-[#ff8a5c] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div><div className="flex items-center gap-2 flex-wrap"><h3 className="text-lg font-semibold text-white">{sub.company?.name || 'N/A'}</h3><span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[status]}`}>{status.toUpperCase()}</span></div><div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-500">Onboarding ID:</span><code className="text-xs font-mono text-slate-300 bg-[#1a1f2e] px-2 py-0.5 rounded-md">{sub.id}</code><button onClick={() => { navigator.clipboard.writeText(sub.id); setCopiedId(sub.id); setTimeout(() => setCopiedId(null), 2000); }} className="p-1 rounded-md hover:bg-[#2a3550]">{copiedId === sub.id ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />}</button></div></div>
                        <Button onClick={() => openHistoryView('organization', sub)} variant="outline" size="sm" className="border-[#ff5b1f]/30 text-[#ff8a5c] hover:bg-[#ff5b1f]/10"><Eye className="h-3 w-3 mr-1" /> View</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-[#1f2840] pt-3">
                        <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Stakeholder:</span><span className="text-white truncate">{sub.stakeholder?.firstName} {sub.stakeholder?.lastName}</span></div>
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Email:</span><span className="text-white truncate">{sub.stakeholder?.email}</span></div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Phone:</span><span className="text-white">{sub.stakeholder?.phone}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /><span className="text-slate-400">Submitted:</span><span className="text-white text-xs">{new Date(sub.timestamp || sub.createdAt).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs"><span className="text-slate-500">Last updated: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : '—'}</span><span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>{status === 'approved' ? 'Approved' : status}</span></div>
                  </div>
                );
              })}
            </div>
          )}
          {historyActiveTab === 'bu' && (
            buSubmissions.length === 0 ? <div className="text-center py-12 text-slate-400"><Archive className="h-12 w-12 mx-auto mb-3 text-slate-600" /><p>No business unit submissions yet.</p></div> :
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {buSubmissions.map(bu => (
                <div key={bu.id} className="group relative overflow-hidden rounded-2xl border border-[#2a3a5a] bg-gradient-to-br from-[#0f172a]/90 to-[#0a0f1c] transition-all hover:shadow-xl hover:shadow-[#ff5b1f]/10 hover:border-[#ff8a5c]/40">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div><h3 className="text-lg font-semibold text-white flex items-center gap-2">{bu.teamName}<span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span></h3><p className="text-sm text-slate-400 mt-1">Application: <span className="text-white font-mono">{bu.applicationName}</span>{bu.applicationId && <span className="ml-2 text-xs text-slate-500">(ID: {bu.applicationId})</span>}</p></div>
                      <div className="flex gap-2"><Button onClick={() => openHistoryView('businessUnit', bu)} variant="outline" size="sm" className="border-[#ff5b1f]/30 text-[#ff8a5c]"><Eye className="h-3 w-3 mr-1" /> View</Button></div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm border-t border-[#1f2840] pt-3">
                      <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-slate-500" /><span className="text-slate-300">Owner:</span><span className="text-white font-medium">{bu.projectOwner || '—'}</span></div>
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /><span className="text-slate-300">Go‑Live:</span><span className="text-white font-mono text-xs">{bu.expectedGoLiveDate ? new Date(bu.expectedGoLiveDate).toLocaleDateString() : '—'}</span></div>
                      <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" /><span className="text-slate-300">Members:</span><span className="text-white font-semibold">{bu.members?.length || 0}</span></div>
                      <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-slate-500" /><span className="text-slate-300">Consumers:</span><span className="text-white font-semibold">{bu.consumers?.length || 0}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-[#0f1117]/50 rounded-lg p-3 border border-[#1f2840]">
                      <div><span className="text-slate-500">Project SME:</span><p className="text-white truncate">{bu.projectSME || '—'}</p></div>
                      <div><span className="text-slate-500">Tester:</span><p className="text-white truncate">{bu.testerName || '—'}</p></div>
                      <div><span className="text-slate-500">ServiceNow Group:</span><p className="text-white truncate">{bu.servicenowGroupName || '—'}</p></div>
                      <div><span className="text-slate-500">Last Updated:</span><p className="text-white font-mono">{bu.updatedAt ? new Date(bu.updatedAt).toLocaleString() : (bu.createdAt ? new Date(bu.createdAt).toLocaleString() : '—')}</p></div>
                    </div>
                  </div>
                  <div className="bg-[#0f172a]/80 px-5 py-2 border-t border-[#1f2840] flex justify-between text-xs"><span className="text-slate-500">Created: {bu.createdAt ? new Date(bu.createdAt).toLocaleDateString() : '—'}</span><span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>Synced</span></div>
                </div>
              ))}
            </div>
          )}
          {historyActiveTab === 'team' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center"><div><p className="text-sm text-slate-400">{aggregatedTeamMembers.length} member(s) across all business units</p></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><input type="text" placeholder="Search by name or email..." value={teamMemberSearch} onChange={e => setTeamMemberSearch(e.target.value)} className="w-64 rounded-lg border border-[#2a3550] bg-[#0f1117] pl-9 pr-4 py-2 text-sm text-white" /></div></div>
              {aggregatedTeamMembers.length === 0 ? <div className="text-center py-12 text-slate-400"><Users className="h-12 w-12 mx-auto mb-3 text-slate-600" /><p>No team members found.</p></div> :
              <div className="overflow-x-auto rounded-xl border border-[#2a3550] bg-[#111520]"><table className="min-w-full divide-y divide-[#1f2840]"><thead className="bg-[#1a1f2e]"><tr><th className="px-6 py-3 text-left text-xs text-slate-400">Member</th><th className="px-6 py-3 text-left text-xs text-slate-400">Role</th><th className="px-6 py-3 text-left text-xs text-slate-400">Business Unit</th><th className="px-6 py-3 text-left text-xs text-slate-400">Application</th><th className="px-6 py-3 text-left text-xs text-slate-400">Actions</th></tr></thead><tbody className="divide-y divide-[#1f2840]">{aggregatedTeamMembers.filter(m => m.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) || m.email?.toLowerCase().includes(teamMemberSearch.toLowerCase())).map(m => (<tr key={m.id} className="hover:bg-[#1a1f2e]/50"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff8a5c]/10 flex items-center justify-center text-white font-medium">{m.name?.charAt(0).toUpperCase()}</div><div><div className="text-sm font-medium text-white">{m.name}</div><div className="text-xs text-slate-400">{m.email}</div></div></div></td><td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300">{m.role || 'Member'}</span></td><td className="px-6 py-4 text-sm text-white">{m.businessUnitName}</td><td className="px-6 py-4 text-sm text-slate-300">{m.businessUnitAppName}</td><td className="px-6 py-4"><Button size="sm" variant="ghost" className="text-[#4f8ef7]" onClick={() => { const bu = buSubmissions.find(b => b.id === m.businessUnitId); if (bu) openHistoryView('businessUnit', bu); }}><Eye className="h-4 w-4" /></Button></td></tr>))}</tbody></table></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ========== HISTORY VIEW/EDIT MODAL (unchanged, keep as is) ==========
  const HistoryViewModal = () => {
    if (!historyViewModal.open) return null;
    const { type, data } = historyViewModal;
    const isOrganization = type === 'organization';
    const isBusinessUnit = type === 'businessUnit';
    const title = isOrganization ? 'Organization Details' : 'Business Unit Details';

    const handleEditField = (path, value) => {
      const newData = { ...editFormData };
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]];
      current[keys[keys.length - 1]] = value;
      setEditFormData(newData);
    };

    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3a5a] bg-[#0f172a]/90 backdrop-blur-md px-6 py-4">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold text-white">{title}</h3><p className="text-xs text-slate-400">View and edit details</p></div></div>
            <button onClick={closeHistoryView} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-6 space-y-6">
            {isOrganization && editFormData && (
              <>
                <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                  <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Building className="h-4 w-4 text-[#ff8a5c]" /> Company Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className="text-xs text-slate-400">Company Name *</Label><Input value={editFormData.company?.name || ''} onChange={e => handleEditField('company.name', e.target.value)} className="bg-dark-900" /></div>
                    <div><Label className="text-xs text-slate-400">Website URL *</Label><Input value={editFormData.company?.websiteUrl || ''} onChange={e => handleEditField('company.websiteUrl', e.target.value)} className="bg-dark-900" /></div>
                    <div><Label className="text-xs text-slate-400">Region *</Label><select value={editFormData.company?.region || ''} onChange={e => handleEditField('company.region', e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border bg-dark-900"><option value="">Select</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                  <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-[#ff8a5c]" /> Stakeholder Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs text-slate-400">First Name *</Label><Input value={editFormData.stakeholder?.firstName || ''} onChange={e => handleEditField('stakeholder.firstName', e.target.value)} /></div>
                    <div><Label className="text-xs text-slate-400">Last Name *</Label><Input value={editFormData.stakeholder?.lastName || ''} onChange={e => handleEditField('stakeholder.lastName', e.target.value)} /></div>
                    <div><Label className="text-xs text-slate-400">Owner Email *</Label><Input type="email" value={editFormData.stakeholder?.email || ''} onChange={e => handleEditField('stakeholder.email', e.target.value)} /></div>
                    <div><Label className="text-xs text-slate-400">Phone Number *</Label><Input value={editFormData.stakeholder?.phone || ''} onChange={e => handleEditField('stakeholder.phone', e.target.value)} /></div>
                    <div><Label className="text-xs text-slate-400">SME Name *</Label><Input value={editFormData.stakeholder?.sme || ''} onChange={e => handleEditField('stakeholder.sme', e.target.value)} /></div>
                    <div><Label className="text-xs text-slate-400">SME Email *</Label><Input type="email" value={editFormData.stakeholder?.smeEmail || ''} onChange={e => handleEditField('stakeholder.smeEmail', e.target.value)} /></div>
                    <div><Label className="text-xs text-slate-400">DL Email *</Label><Input type="email" value={editFormData.stakeholder?.dlEmail || ''} onChange={e => handleEditField('stakeholder.dlEmail', e.target.value)} /></div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                  <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Network className="h-4 w-4 text-[#ff8a5c]" /> Gateway Organizations</h4>
                  <div className="space-y-4">
                    {editFormData.gatewayOrganizations?.map((org, idx) => (
                      <div key={org.id} className="border-b border-[#2a3550] pb-4 last:border-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                          <div><Label className="text-xs text-slate-400">Region</Label><Input value={org.region || ''} onChange={e => { const newOrgs = [...editFormData.gatewayOrganizations]; newOrgs[idx].region = e.target.value; setEditFormData({ ...editFormData, gatewayOrganizations: newOrgs }); }} className="bg-dark-900" /></div>
                          <div><Label className="text-xs text-slate-400">Organization Name</Label><Input value={org.name || ''} onChange={e => { const newOrgs = [...editFormData.gatewayOrganizations]; newOrgs[idx].name = e.target.value; setEditFormData({ ...editFormData, gatewayOrganizations: newOrgs }); }} className="bg-dark-900" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><Label className="text-xs text-slate-400">Environment Type</Label><select value={org.config?.environmentType || 'nonprod'} onChange={e => { const newOrgs = [...editFormData.gatewayOrganizations]; newOrgs[idx].config = { ...newOrgs[idx].config, environmentType: e.target.value }; setEditFormData({ ...editFormData, gatewayOrganizations: newOrgs }); }} className="h-9 w-full rounded-lg px-3 py-2 text-sm border bg-dark-900"><option value="nonprod">non-prod</option><option value="prod">prod</option></select></div>
                          <div><Label className="text-xs text-slate-400">Expected TPS</Label><Input type="number" value={org.config?.expectedTps || ''} onChange={e => { const newOrgs = [...editFormData.gatewayOrganizations]; newOrgs[idx].config = { ...newOrgs[idx].config, expectedTps: e.target.value }; setEditFormData({ ...editFormData, gatewayOrganizations: newOrgs }); }} /></div>
                          <div><Label className="text-xs text-slate-400">API Range</Label><select value={org.config?.expectedApiRange || ''} onChange={e => { const newOrgs = [...editFormData.gatewayOrganizations]; newOrgs[idx].config = { ...newOrgs[idx].config, expectedApiRange: e.target.value }; setEditFormData({ ...editFormData, gatewayOrganizations: newOrgs }); }} className="h-9 w-full rounded-lg px-3 py-2 text-sm border bg-dark-900"><option value="">Select</option><option value="0-100">0-100</option><option value="100-300">100-300</option><option value="300-500">300-500</option><option value="500-1000+">500-1000+</option></select></div>
                          <div className="md:col-span-2"><Label className="text-xs text-slate-400">Notes</Label><textarea rows={2} value={org.config?.notes || ''} onChange={e => { const newOrgs = [...editFormData.gatewayOrganizations]; newOrgs[idx].config = { ...newOrgs[idx].config, notes: e.target.value }; setEditFormData({ ...editFormData, gatewayOrganizations: newOrgs }); }} className="w-full rounded-lg px-3 py-2 text-sm border bg-dark-900" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {isBusinessUnit && editFormData && (
              <div className="space-y-6">
                <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                  <h4 className="text-sm font-semibold text-white mb-4">Business Unit Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs text-slate-400">Team Name *</Label><Input value={editFormData.teamName || ''} onChange={e => setEditFormData({ ...editFormData, teamName: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Application Name *</Label><Input value={editFormData.applicationName || ''} onChange={e => setEditFormData({ ...editFormData, applicationName: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Application ID</Label><Input value={editFormData.applicationId || ''} onChange={e => setEditFormData({ ...editFormData, applicationId: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Project Owner *</Label><Input value={editFormData.projectOwner || ''} onChange={e => setEditFormData({ ...editFormData, projectOwner: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Owner Email *</Label><Input type="email" value={editFormData.ownerEmail || ''} onChange={e => setEditFormData({ ...editFormData, ownerEmail: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Project SME *</Label><Input value={editFormData.projectSME || ''} onChange={e => setEditFormData({ ...editFormData, projectSME: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">SME Email *</Label><Input type="email" value={editFormData.projectSMEEmail || ''} onChange={e => setEditFormData({ ...editFormData, projectSMEEmail: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">DL Email *</Label><Input type="email" value={editFormData.projectDLEmail || ''} onChange={e => setEditFormData({ ...editFormData, projectDLEmail: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Expected Go-Live Date *</Label><Input type="date" value={editFormData.expectedGoLiveDate || ''} onChange={e => setEditFormData({ ...editFormData, expectedGoLiveDate: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Tester Name *</Label><Input value={editFormData.testerName || ''} onChange={e => setEditFormData({ ...editFormData, testerName: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">Tester Email *</Label><Input type="email" value={editFormData.testerEmail || ''} onChange={e => setEditFormData({ ...editFormData, testerEmail: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">ServiceNow Group Name</Label><Input value={editFormData.servicenowGroupName || ''} onChange={e => setEditFormData({ ...editFormData, servicenowGroupName: e.target.value })} /></div>
                    <div><Label className="text-xs text-slate-400">ServiceNow Email</Label><Input type="email" value={editFormData.servicenowEmail || ''} onChange={e => setEditFormData({ ...editFormData, servicenowEmail: e.target.value })} /></div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                  <h4 className="text-sm font-semibold text-white mb-4">Team Members</h4>
                  <div className="space-y-2">
                    {editFormData.members?.map((m, idx) => (
                      <div key={m.id} className="flex gap-2 items-center border-b pb-2">
                        <Input value={m.name} placeholder="Name" className="flex-1" onChange={e => { const newMembers = [...editFormData.members]; newMembers[idx].name = e.target.value; setEditFormData({ ...editFormData, members: newMembers }); }} />
                        <Input value={m.email} placeholder="Email" className="flex-1" onChange={e => { const newMembers = [...editFormData.members]; newMembers[idx].email = e.target.value; setEditFormData({ ...editFormData, members: newMembers }); }} />
                        <select value={m.role || ''} onChange={e => { const newMembers = [...editFormData.members]; newMembers[idx].role = e.target.value; setEditFormData({ ...editFormData, members: newMembers }); }} className="rounded-lg border bg-dark-900 p-2"><option value="">Role</option>{roleOptions.map(r => (<option key={r} value={r}>{r}</option>))}</select>
                        <button onClick={() => { setEditFormData({ ...editFormData, members: editFormData.members.filter((_, i) => i !== idx) }); }} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <Button size="sm" onClick={() => { setEditFormData({ ...editFormData, members: [...(editFormData.members || []), { id: Date.now(), name: '', email: '', role: '' }] }); }}><Plus className="h-3 w-3 mr-1" /> Add Member</Button>
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5">
                  <h4 className="text-sm font-semibold text-white mb-4">Selected Consumers</h4>
                  <div className="flex flex-wrap gap-2">
                    {savedConsumers.map(c => {
                      const selected = editFormData.consumers?.some(sc => sc.id === c.id);
                      return (
                        <div key={c.id} className={cn("px-3 py-1 rounded-full text-sm cursor-pointer transition-all", selected ? "bg-[#ff5b1f]/20 text-[#ff8a5c] border border-[#ff5b1f]/30" : "bg-[#1a1f2e] text-slate-300 hover:bg-[#2a3550]")} onClick={() => { const newConsumers = selected ? editFormData.consumers.filter(sc => sc.id !== c.id) : [...(editFormData.consumers || []), { id: c.id, name: c.consumerName }]; setEditFormData({ ...editFormData, consumers: newConsumers }); }}>{c.consumerName}</div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
            <button onClick={closeHistoryView} className="rounded-lg border border-[#2a3a5a] bg-transparent px-5 py-2 text-sm font-medium text-slate-300">Cancel</button>
            <button onClick={isOrganization ? saveOrganizationEdit : saveBusinessUnitEdit} disabled={isSavingEdit} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ff6b36] disabled:opacity-50 flex items-center gap-2">{isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button>
          </div>
        </div>
      </div>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div><h2 className="text-3xl font-semibold text-white">Gateway Onboarding</h2><p className="mt-2 text-sm text-[#7f8fa8]">Manage your organization, business units, and team members.</p></div>
        <div className="flex gap-3"><Button onClick={() => { setEditingOrg(false); resetForm(); setShowOrgModal(true); }} className="bg-[#ff5b1f] hover:bg-[#ff6b36]"><Plus className="w-4 h-4 mr-1" /> New Organization</Button></div>
      </div>

      {/* Beautiful Counts Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111520] to-[#0e121c] border border-[#2a3550] p-5 transition-all duration-300 hover:shadow-xl hover:border-[#ff8a5c]/40">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium uppercase tracking-wider text-slate-400">Organization</p><p className="mt-2 text-2xl font-bold text-white">{company.name ? 'Active' : 'Not Created'}</p></div>
            <div className="rounded-xl bg-[#ff5b1f]/10 p-3"><Building className="h-6 w-6 text-[#ff8a5c]" /></div>
          </div>
          <div className="mt-3 flex items-center justify-between"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", orgApprovalStatus === 'approved' ? "bg-emerald-500/20 text-emerald-300" : orgApprovalStatus === 'pending' ? "bg-yellow-500/20 text-yellow-300" : "bg-slate-500/20 text-slate-300")}>{orgApprovalStatus ? orgApprovalStatus.toUpperCase() : (company.name ? 'DRAFT' : 'PENDING')}</span>{orgApprovalStatus === 'pending' && <button onClick={checkApprovalStatus} disabled={isCheckingStatus} className="text-xs text-[#4f8ef7] hover:underline">{isCheckingStatus ? 'Checking...' : 'Check'}</button>}</div>
        </div>
        <div className="group rounded-2xl bg-gradient-to-br from-[#111520] to-[#0e121c] border border-[#2a3550] p-5 transition-all hover:shadow-xl hover:border-[#ff5b1f]/40">
          <div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-slate-400">Accessible BUs</p><p className="mt-2 text-3xl font-bold text-white">{dashboardBuCount}</p></div><div className="rounded-xl bg-sky-500/10 p-3"><Briefcase className="h-6 w-6 text-sky-400" /></div></div>
          <p className="mt-3 text-xs text-slate-500">Business units you can access</p>
        </div>
        <div className="group rounded-2xl bg-gradient-to-br from-[#111520] to-[#0e121c] border border-[#2a3550] p-5 transition-all hover:shadow-xl hover:border-[#ff5b1f]/40">
          <div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-slate-400">Team Members</p><p className="mt-2 text-3xl font-bold text-white">{dashboardTeamMemberCount}</p></div><div className="rounded-xl bg-emerald-500/10 p-3"><Users className="h-6 w-6 text-emerald-400" /></div></div>
          <p className="mt-3 text-xs text-slate-500">Across accessible BUs</p>
        </div>
        <div className="group rounded-2xl bg-gradient-to-br from-[#111520] to-[#0e121c] border border-[#2a3550] p-5 transition-all hover:shadow-xl hover:border-[#ff5b1f]/40">
          <div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-slate-400">Consumers</p><p className="mt-2 text-3xl font-bold text-white">{dashboardConsumerCount}</p></div><div className="rounded-xl bg-purple-500/10 p-3"><Layers className="h-6 w-6 text-purple-400" /></div></div>
          <p className="mt-3 text-xs text-slate-500">Registered API consumers</p>
        </div>
      </div>

      {/* Organization Summary */}
      <OrganizationSummary />

      {/* Business Unit Management (if org approved) */}
      {orgApprovalStatus === 'approved' && (
        <div className="mt-6 rounded-2xl border border-[#27314e] bg-[#111520] p-6">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-white">Business Unit Management</h3><Button onClick={() => setGatewayOnboardingStep('businessUnit')} className="bg-[#ff5b1f]"><Plus className="w-4 h-4 mr-1" /> Create Business Unit</Button></div>
          {gatewayOnboardingStep === 'businessUnit' && (
            <div className="mt-4 space-y-4">
              <Card><h4 className="text-sm font-semibold mb-4">Business Unit Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>BU Name *</Label><Input value={onboardingTeamName} onChange={e => setOnboardingTeamName(e.target.value)} /></div><div><Label>Application Name *</Label><Input value={onboardingApplicationName} onChange={e => setOnboardingApplicationName(e.target.value)} /></div><div><Label>Application Id</Label><Input value={onboardingApplicationId} onChange={e => setOnboardingApplicationId(e.target.value)} /></div></div></Card>
              <Card><h4 className="text-sm font-semibold mb-4">Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>Project Owner *</Label><Input value={onboardingProjectOwner} onChange={e => setOnboardingProjectOwner(e.target.value)} /></div><div><Label>Owner Email *</Label><Input type="email" value={onboardingOwnerEmail} onChange={e => setOnboardingOwnerEmail(e.target.value)} /></div><div><Label>Project SME *</Label><Input value={onboardingProjectSME} onChange={e => setOnboardingProjectSME(e.target.value)} /></div><div><Label>SME Email *</Label><Input type="email" value={onboardingProjectSMEEmail} onChange={e => setOnboardingProjectSMEEmail(e.target.value)} /></div><div><Label>DL Email *</Label><Input type="email" value={onboardingProjectDLEmail} onChange={e => setOnboardingProjectDLEmail(e.target.value)} /></div><div><Label>Go-Live Date *</Label><Input type="date" value={onboardingGoLiveDate} onChange={e => setOnboardingGoLiveDate(e.target.value)} /></div><div><Label>Tester Name *</Label><Input value={onboardingTesterName} onChange={e => setOnboardingTesterName(e.target.value)} /></div><div><Label>Tester Email *</Label><Input type="email" value={onboardingTesterEmail} onChange={e => setOnboardingTesterEmail(e.target.value)} /></div><div><Label>ServiceNow Group Name</Label><Input value={onboardingServiceNowGroup} onChange={e => setOnboardingServiceNowGroup(e.target.value)} /></div><div><Label>ServiceNow Email</Label><Input type="email" value={onboardingServiceNowEmail} onChange={e => setOnboardingServiceNowEmail(e.target.value)} /></div></div></Card>
              <Card><div className="flex justify-between mb-4"><h4 className="text-sm font-semibold">Team Members *</h4><Button onClick={() => setShowTeamMemberModal(true)} size="sm"><Plus className="w-3 h-3 mr-1" /> Add Member</Button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{teamMembers.map(m => (<div key={m.id} className="p-3 rounded-lg border"><p className="font-medium">{m.name}</p><p className="text-xs text-gray-400">{m.email}</p><p className="text-xs mt-1">{m.role}</p></div>))}</div></Card>
              <Card><div className="flex justify-between mb-4"><h4 className="text-sm font-semibold">Consumer Information</h4><Button onClick={() => setShowConsumerModal(true)} size="sm"><Plus className="w-3 h-3 mr-1" /> Add Consumer</Button></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{savedConsumers.map(c => { const selected = selectedOnboardingConsumers.includes(c.id); return (<div key={c.id} className={cn("p-2 rounded-lg border cursor-pointer", selected ? "border-primary bg-primary/20" : "border-dark-700")} onClick={() => setSelectedOnboardingConsumers(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}><p className="text-xs truncate">{c.consumerName}</p>{selected && <CheckCircle className="w-3 h-3 text-primary" />}</div>);})}</div></Card>
              <div className="flex justify-end"><Button onClick={submitBusinessUnit} disabled={submittingBu}>{submittingBu ? 'Submitting...' : 'Submit Business Unit'}</Button></div>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      <HistorySection />

      {/* Modals */}
      {showOrgModal && <OrganizationFormModal />}
      {showPreviewModal && <PreviewModal company={company} orgOnboardingData={orgOnboardingData} gatewayOrgs={gatewayOrgs} onClose={() => setShowPreviewModal(false)} onSendApproval={sendApprovalRequest} isSendingApproval={isSendingApproval} />}
      {showTeamMemberModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border bg-[#161b30]"><div className="flex justify-between p-4 border-b"><h2 className="text-lg font-semibold">Add Team Member</h2><button onClick={() => { setShowTeamMemberModal(false); setNewTeamMember({ name: '', email: '', role: '' }); }}><X /></button></div><div className="p-6 space-y-4"><div><Label>Full Name *</Label><Input value={newTeamMember.name} onChange={e => setNewTeamMember({ ...newTeamMember, name: e.target.value })} /></div><div><Label>Email *</Label><Input type="email" value={newTeamMember.email} onChange={e => setNewTeamMember({ ...newTeamMember, email: e.target.value })} /></div><div><Label>Role *</Label><select value={newTeamMember.role} onChange={e => setNewTeamMember({ ...newTeamMember, role: e.target.value })} className="w-full rounded-lg border bg-dark-900 p-2"><option value="">Select Role</option>{roleOptions.map(r => (<option key={r} value={r}>{r}</option>))}</select></div></div><div className="flex justify-end gap-3 p-4 border-t"><Button variant="outline" onClick={() => { setShowTeamMemberModal(false); setNewTeamMember({ name: '', email: '', role: '' }); }}>Cancel</Button><Button onClick={addTeamMember}>Add</Button></div></div>
        </div>
      )}
      {showConsumerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border bg-[#161b30] flex flex-col"><div className="flex justify-between p-4 border-b"><h2>{editingConsumerId ? 'Edit Consumer' : 'Add Consumer'}</h2><button onClick={() => { setShowConsumerModal(false); setEditingConsumerId(null); setConsumerForm({ consumerName: '', consumerPocName: '', consumerPocEmail: '', consumerSmeName: '', consumerSmeEmail: '', consumerConfig: '', apiTps: '', quota: '', rateLimiting: '', apiKeyInfo: '' }); }}><X /></button></div><div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Consumer Name</Label><Input value={consumerForm.consumerName} onChange={e => setConsumerForm({ ...consumerForm, consumerName: e.target.value })} /></div><div><Label>POC Name</Label><Input value={consumerForm.consumerPocName} onChange={e => setConsumerForm({ ...consumerForm, consumerPocName: e.target.value })} /></div><div><Label>POC Email</Label><Input value={consumerForm.consumerPocEmail} onChange={e => setConsumerForm({ ...consumerForm, consumerPocEmail: e.target.value })} /></div><div><Label>SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={e => setConsumerForm({ ...consumerForm, consumerSmeName: e.target.value })} /></div><div><Label>SME Email</Label><Input value={consumerForm.consumerSmeEmail} onChange={e => setConsumerForm({ ...consumerForm, consumerSmeEmail: e.target.value })} /></div><div><Label>Config</Label><Input value={consumerForm.consumerConfig} onChange={e => setConsumerForm({ ...consumerForm, consumerConfig: e.target.value })} /></div><div><Label>API TPS</Label><Input value={consumerForm.apiTps} onChange={e => setConsumerForm({ ...consumerForm, apiTps: e.target.value })} /></div><div><Label>Quota</Label><Input value={consumerForm.quota} onChange={e => setConsumerForm({ ...consumerForm, quota: e.target.value })} /></div><div><Label>Rate Limiting</Label><Input value={consumerForm.rateLimiting} onChange={e => setConsumerForm({ ...consumerForm, rateLimiting: e.target.value })} /></div><div><Label>API Key Info</Label><Input value={consumerForm.apiKeyInfo} onChange={e => setConsumerForm({ ...consumerForm, apiKeyInfo: e.target.value })} /></div></div><div className="flex justify-end gap-3 p-4 border-t"><Button variant="outline" onClick={() => setShowConsumerModal(false)}>Cancel</Button><Button onClick={editingConsumerId ? handleUpdateConsumer : handleSaveConsumer} disabled={isAddingConsumer}>{editingConsumerId ? 'Update' : 'Save'}</Button></div></div>
        </div>
      )}

      {/* History View/Edit Modal */}
      <HistoryViewModal />
    </div>
  );
}