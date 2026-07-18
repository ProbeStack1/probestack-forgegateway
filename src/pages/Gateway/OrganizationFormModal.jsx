import React, { useState, useEffect } from "react";
import { Building, Users, Network, Plus, X, Eye } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import API_BASE_URL from "../../config/apiConfig";

const generateGatewayId = () => `g-${Math.random().toString(36).slice(2, 9)}`;
const envOptionsByType = { nonprod: ["dev", "test", "qa", "sat", "staging", "sandbox"], prod: ["preprod", "prod", "staging"] };

export default function OrganizationFormModal({ open, onClose, editingId, userEmail, showMessage, onSuccess }) {
  const [company, setCompany] = useState({ name: "", websiteUrl: "", region: "" });
  const [orgData, setOrgData] = useState({ firstName: "", lastName: "", ownerEmail: "", phoneNumber: "", sme: "", smeEmail: "", dlEmail: "" });
  const [gatewayOrgs, setGatewayOrgs] = useState([{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentAppId, setCurrentAppId] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (editingId && open) {
      fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${editingId}`)
        .then(res => res.json())
        .then(data => {
          setCompany(data.company);
          setOrgData({ firstName: data.stakeholder.firstName, lastName: data.stakeholder.lastName, ownerEmail: data.stakeholder.email, phoneNumber: data.stakeholder.phone, sme: data.stakeholder.sme || "", smeEmail: data.stakeholder.smeEmail || "", dlEmail: data.stakeholder.dlEmail || "" });
          setGatewayOrgs(data.gatewayOrganizations.map(org => ({ ...org, config: org.config || { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } })));
          setCurrentAppId(data.id);
        })
        .catch(console.error);
    } else if (open) {
      setCompany({ name: "", websiteUrl: "", region: "" });
      setOrgData({ firstName: "", lastName: "", ownerEmail: "", phoneNumber: "", sme: "", smeEmail: "", dlEmail: "" });
      setGatewayOrgs([{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }]);
      setCurrentAppId(null);
    }
  }, [editingId, open]);

  const buildPayload = () => ({ company, stakeholder: { firstName: orgData.firstName, lastName: orgData.lastName, email: orgData.ownerEmail, phone: orgData.phoneNumber, sme: orgData.sme, smeEmail: orgData.smeEmail, dlEmail: orgData.dlEmail }, gatewayOrganizations: gatewayOrgs });
  const isValidEmail = (email) => /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
  const validate = () => { if (!company.name) { showMessage("Company name required", "error"); return false; } if (!orgData.firstName || !orgData.lastName) { showMessage("First and Last name required", "error"); return false; } if (!isValidEmail(orgData.ownerEmail)) { showMessage("Valid Owner Email required", "error"); return false; } if (!orgData.phoneNumber) { showMessage("Contact number required", "error"); return false; } if (!gatewayOrgs.some(o => o.name.trim())) { showMessage("At least one Gateway Organization name required", "error"); return false; } return true; };

  const saveDraft = async () => {
    if (!validate()) return;
    setIsSavingDraft(true);
    try {
      let url = `${API_BASE_URL}/gatewayonboarding/api/v1/applications`, method = "POST";
      if (currentAppId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/applications/${currentAppId}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
      if (res.ok) { const data = await res.json(); setCurrentAppId(data.id); showMessage("Draft saved", "success"); onSuccess(); }
      else throw new Error();
    } catch (err) { showMessage("Failed to save draft", "error"); } finally { setIsSavingDraft(false); }
  };

  const sendApproval = async () => {
    if (!validate()) return;
    setIsSending(true);
    try {
      let appId = currentAppId;
      if (!appId) {
        const draftRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
        if (!draftRes.ok) throw new Error();
        const draftData = await draftRes.json();
        appId = draftData.id;
        setCurrentAppId(appId);
      }
      const submitRes = await fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/applications/${appId}/submit-approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
      if (submitRes.ok) { showMessage("Approval request sent", "success"); onSuccess(); onClose(); }
      else throw new Error();
    } catch (err) { showMessage("Failed to send approval", "error"); } finally { setIsSending(false); }
  };

  const addGatewayOrg = () => setGatewayOrgs(prev => [{ id: generateGatewayId(), name: "", region: "", config: { environmentType: "nonprod", selectedEnvironments: [], customEnvironments: "", expectedTps: "", expectedApiRange: "", notes: "" } }, ...prev]);
  const removeGatewayOrg = (id) => { if (gatewayOrgs.length === 1) return; setGatewayOrgs(prev => prev.filter(o => o.id !== id)); };
  const updateGatewayOrg = (id, field, value) => setGatewayOrgs(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  const updateGatewayOrgConfig = (id, configField, value) => setGatewayOrgs(prev => prev.map(o => o.id === id ? { ...o, config: { ...o.config, [configField]: value } } : o));
  const handleEnvCheck = (orgId, env) => setGatewayOrgs(prev => prev.map(org => org.id !== orgId ? org : { ...org, config: { ...org.config, selectedEnvironments: org.config.selectedEnvironments.includes(env) ? org.config.selectedEnvironments.filter(e => e !== env) : [...org.config.selectedEnvironments, env] } }));

  const PreviewModal = () => (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b1f]/20 text-[#ff8a5c]"><Eye className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold text-white">Review & Submit</h3><p className="text-xs text-slate-400">Verify all details before sending for approval</p></div></div>
          <button onClick={() => setShowPreviewModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Company Card */}
          <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Building className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Company Information</h4></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Company Name</span><span className="font-medium text-white">{company.name || "—"}</span></div><div><span className="block text-xs text-slate-500">Website</span><span className="font-medium text-white">{company.websiteUrl || "—"}</span></div><div><span className="block text-xs text-slate-500">Region</span><span className="font-medium text-white">{company.region || "—"}</span></div></div></div>
          {/* Stakeholder Card */}
          <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Users className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Stakeholder Details</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><span className="block text-xs text-slate-500">Full Name</span><span className="font-medium text-white">{orgData.firstName} {orgData.lastName}</span></div><div><span className="block text-xs text-slate-500">Email</span><span className="font-medium text-white">{orgData.ownerEmail}</span></div><div><span className="block text-xs text-slate-500">Phone</span><span className="font-medium text-white">{orgData.phoneNumber}</span></div><div><span className="block text-xs text-slate-500">SME</span><span className="font-medium text-white">{orgData.sme || "—"}</span></div><div><span className="block text-xs text-slate-500">SME Email</span><span className="font-medium text-white">{orgData.smeEmail || "—"}</span></div><div><span className="block text-xs text-slate-500">DL</span><span className="font-medium text-white">{orgData.dlEmail || "—"}</span></div></div></div>
          {/* Gateway Organizations */}
          <div className="rounded-xl border border-[#2a3a5a] bg-[#0f172a]/60 p-5"><div className="flex items-center gap-2 border-b border-[#2a3a5a] pb-3 mb-4"><Network className="h-4 w-4 text-[#ff8a5c]" /><h4 className="text-sm font-semibold uppercase">Gateway Organizations</h4></div><div className="space-y-4">{gatewayOrgs.map((org, idx) => (<div key={org.id} className="rounded-lg border border-[#2a3a5a]/50 bg-[#0f172a]/40 p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold text-white">#{idx+1} {org.name || "Unnamed"}</span><span className="rounded-full bg-[#ff5b1f]/20 px-2 py-0.5 text-xs font-medium text-[#ff8a5c]">{org.config.environmentType === "prod" ? "prod" : "non-prod"}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-slate-500">Region</span><span className="text-white">{org.region || "—"}</span></div><div><span className="block text-xs text-slate-500">Environments</span><div className="flex flex-wrap gap-1 mt-1">{org.config.selectedEnvironments.map(env => (<span key={env} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{env}</span>))}</div></div><div><span className="block text-xs text-slate-500">Expected TPS</span><span className="text-white">{org.config.expectedTps || "—"}</span></div><div><span className="block text-xs text-slate-500">API Count Range</span><span className="text-white">{org.config.expectedApiRange || "—"}</span></div>{org.config.notes && <div className="md:col-span-2"><span className="block text-xs text-slate-500">Notes</span><span className="text-white text-sm">{org.config.notes}</span></div>}</div></div>))}</div></div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={() => setShowPreviewModal(false)} className="rounded-lg border border-[#2a3a5a] px-5 py-2 text-sm font-medium text-slate-300">Cancel</button><button onClick={sendApproval} disabled={isSending} className="rounded-lg bg-[#ff5b1f] px-5 py-2 text-sm font-semibold text-white">{isSending ? "Sending..." : "Confirm & Send"}</button></div>
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><h3 className="text-xl font-semibold text-white">{editingId ? "Edit Organization" : "New Organization"}</h3><button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
        <div className="p-6 space-y-6">
          {/* Company Information */}
          <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold flex gap-2"><Building className="w-4 h-4" /> Company Information</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3"><div><Label className="text-xs">Company Name *</Label><Input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} /></div><div><Label className="text-xs">Website URL</Label><Input value={company.websiteUrl} onChange={e => setCompany({...company, websiteUrl: e.target.value})} /></div><div><Label className="text-xs">Region</Label><select value={company.region} onChange={e => setCompany({...company, region: e.target.value})} className="h-9 w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 text-white"><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div></div></Card>

          {/* Stakeholder Information */}
          <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold flex gap-2"><Users className="w-4 h-4" /> Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"><div><Label className="text-xs">First Name *</Label><Input value={orgData.firstName} onChange={e => setOrgData({...orgData, firstName: e.target.value})} /></div><div><Label className="text-xs">Last Name *</Label><Input value={orgData.lastName} onChange={e => setOrgData({...orgData, lastName: e.target.value})} /></div><div><Label className="text-xs">Owner Email *</Label><Input type="email" value={orgData.ownerEmail} onChange={e => setOrgData({...orgData, ownerEmail: e.target.value})} /></div><div><Label className="text-xs">Contact Number *</Label><Input value={orgData.phoneNumber} onChange={e => setOrgData({...orgData, phoneNumber: e.target.value})} /></div><div><Label className="text-xs">SME Name</Label><Input value={orgData.sme} onChange={e => setOrgData({...orgData, sme: e.target.value})} /></div><div><Label className="text-xs">SME Email</Label><Input type="email" value={orgData.smeEmail} onChange={e => setOrgData({...orgData, smeEmail: e.target.value})} /></div><div><Label className="text-xs">DL Email</Label><Input type="email" value={orgData.dlEmail} onChange={e => setOrgData({...orgData, dlEmail: e.target.value})} /></div></div></Card>

          {/* Gateway Organizations */}
          <Card className="p-5 bg-[#0f172a]/50"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold flex gap-2"><Network className="w-4 h-4" /> Gateway Configurations</h4><button onClick={addGatewayOrg} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Organization</button></div><div className="space-y-6">{gatewayOrgs.map((org) => (<div key={org.id} className="relative border border-dark-700 rounded-lg p-4">{gatewayOrgs.length > 1 && <button onClick={() => removeGatewayOrg(org.id)} className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-red-400"><X className="w-4 h-4" /></button>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><Label className="text-xs">Region</Label><select value={org.region} onChange={e => updateGatewayOrg(org.id, "region", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 text-white"><option value="">Select Region</option><option value="north-america">North America</option><option value="latam">LATAM</option><option value="emea">EMEA</option><option value="apac">APAC</option></select></div><div><Label className="text-xs">Gateway Organization Name *</Label><Input value={org.name} onChange={e => updateGatewayOrg(org.id, "name", e.target.value)} /></div></div><div className="border-t border-dark-700 pt-4 mt-2"><div className="mb-4"><Label className="text-xs">Environment Type</Label><div className="flex gap-4 mt-1"><label className="flex items-center gap-2"><input type="radio" checked={org.config.environmentType === "nonprod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "nonprod")} /><span>non-prod</span></label><label className="flex items-center gap-2"><input type="radio" checked={org.config.environmentType === "prod"} onChange={() => updateGatewayOrgConfig(org.id, "environmentType", "prod")} /><span>prod</span></label></div></div><div className="mb-4"><Label className="text-xs">Select Environments</Label><div className="flex flex-wrap gap-3 border border-dark-700 rounded-lg p-3 bg-dark-900/50">{envOptionsByType[org.config.environmentType].map(env => (<label key={env} className="flex items-center gap-1.5"><input type="checkbox" checked={org.config.selectedEnvironments.includes(env)} onChange={() => handleEnvCheck(org.id, env)} /><span>{env}</span></label>))}<label className="flex items-center gap-1.5"><input type="checkbox" checked={org.config.selectedEnvironments.includes("custom")} onChange={() => { if(org.config.selectedEnvironments.includes("custom")) { updateGatewayOrgConfig(org.id, "selectedEnvironments", org.config.selectedEnvironments.filter(e => e !== "custom")); updateGatewayOrgConfig(org.id, "customEnvironments", ""); } else { updateGatewayOrgConfig(org.id, "selectedEnvironments", [...org.config.selectedEnvironments, "custom"]); } }} /><span>Custom</span></label></div>{org.config.selectedEnvironments.includes("custom") && <Input className="mt-3" placeholder="Comma separated environments" value={org.config.customEnvironments} onChange={e => updateGatewayOrgConfig(org.id, "customEnvironments", e.target.value)} />}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs">Expected TPS</Label><Input type="number" value={org.config.expectedTps} onChange={e => updateGatewayOrgConfig(org.id, "expectedTps", e.target.value)} /></div><div><Label className="text-xs">Expected No. of APIs</Label><select value={org.config.expectedApiRange} onChange={e => updateGatewayOrgConfig(org.id, "expectedApiRange", e.target.value)} className="h-9 w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 text-white"><option value="">Select range</option><option value="0-100">0-100</option><option value="100-300">100-300</option><option value="300-500">300-500</option><option value="500-1000+">500-1000+</option></select></div><div className="md:col-span-2"><Label className="text-xs">Notes</Label><textarea rows={2} value={org.config.notes} onChange={e => updateGatewayOrgConfig(org.id, "notes", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border border-dark-700 bg-dark-900 resize-none" /></div></div></div></div>))}</div></Card>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4">
          <button onClick={saveDraft} disabled={isSavingDraft} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">Save Draft</button>
          <button onClick={() => setShowPreviewModal(true)} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">Preview</button>
          <button onClick={sendApproval} disabled={isSending} className="px-4 py-2 rounded-lg bg-[#ff5b1f] text-white">Send for Approval</button>
        </div>
      </div>
      {showPreviewModal && <PreviewModal />}
    </div>
  );
}