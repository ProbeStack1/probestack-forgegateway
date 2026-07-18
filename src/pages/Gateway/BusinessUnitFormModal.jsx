import React, { useState, useEffect } from "react";
import { UserCircle, Users, Layers, Plus, X, CheckCircle } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import API_BASE_URL from "../../config/apiConfig";
import { cn } from "../../lib/utils";

export default function BusinessUnitFormModal({ open, onClose, editingId, userEmail, showMessage, onSuccess, savedConsumers, refreshConsumers }) {
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
  const [submitting, setSubmitting] = useState(false);
  const [showConsumerModal, setShowConsumerModal] = useState(false);
  const [consumerForm, setConsumerForm] = useState({ consumerName: "", consumerPocName: "", consumerPocEmail: "", consumerSmeName: "", consumerSmeEmail: "", consumerConfig: "", apiTps: "", quota: "", rateLimiting: "", apiKeyInfo: "" });
  const [isAddingConsumer, setIsAddingConsumer] = useState(false);
  const [editingConsumerId, setEditingConsumerId] = useState(null);

  useEffect(() => {
    if (editingId && open) {
      fetch(`${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editingId}`)
        .then(res => res.json())
        .then(data => {
          setTeamName(data.teamName); setAppName(data.applicationName); setAppId(data.applicationId || "");
          setProjectOwner(data.projectOwner || ""); setOwnerEmail(data.ownerEmail || ""); setProjectSME(data.projectSME || ""); setProjectSMEEmail(data.projectSMEEmail || ""); setProjectDLEmail(data.projectDLEmail || "");
          setGoLiveDate(data.expectedGoLiveDate || ""); setTesterName(data.testerName || ""); setTesterEmail(data.testerEmail || ""); setServicenowGroup(data.servicenowGroupName || ""); setServicenowEmail(data.servicenowEmail || "");
          setTeamMembers(data.members || []);
          setSelectedConsumers((data.consumers || []).map(c => c.id));
        })
        .catch(console.error);
    } else if (open) {
      setTeamName(""); setAppName(""); setAppId(""); setProjectOwner(""); setOwnerEmail(""); setProjectSME(""); setProjectSMEEmail(""); setProjectDLEmail(""); setGoLiveDate(""); setTesterName(""); setTesterEmail(""); setServicenowGroup(""); setServicenowEmail("");
      setTeamMembers([]); setSelectedConsumers([]);
    }
  }, [editingId, open]);

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

  const handleSubmit = async () => {
    if (!teamName || !appName) { showMessage("Team Name and Application Name required", "error"); return; }
    setSubmitting(true);
    const payload = {
      teamName, applicationName: appName, applicationId: appId,
      projectOwner, ownerEmail, projectSME, projectSMEEmail, projectDLEmail,
      expectedGoLiveDate: goLiveDate, testerName, testerEmail,
      servicenowGroupName: servicenowGroup, servicenowEmail,
      members: teamMembers,
      consumers: selectedConsumers.map(id => { const c = savedConsumers.find(c => c.id === id); return { id: c.id, consumerId: c.consumerId || c.id, name: c.consumerName }; }),
    };
    try {
      let url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units`, method = "POST";
      if (editingId) { url = `${API_BASE_URL}/gatewayonboarding/api/v1/business-units/${editingId}`; method = "PUT"; }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      showMessage("Business unit saved", "success");
      onSuccess();
      onClose();
    } catch (err) { showMessage("Failed to save business unit", "error"); } finally { setSubmitting(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a3a5a] bg-gradient-to-b from-[#111827] to-[#0f172a] shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-between items-center border-b border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><h3 className="text-xl font-semibold text-white">{editingId ? "Edit Business Unit" : "New Business Unit"}</h3><button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
        <div className="p-6 space-y-6">
          {/* Business Unit Info */}
          <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold flex gap-2"><UserCircle className="w-4 h-4" /> Business Unit Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"><div><Label className="text-xs">Team Name *</Label><Input value={teamName} onChange={e => setTeamName(e.target.value)} /></div><div><Label className="text-xs">Application Name *</Label><Input value={appName} onChange={e => setAppName(e.target.value)} /></div><div><Label className="text-xs">Application Id</Label><Input value={appId} onChange={e => setAppId(e.target.value)} /></div></div></Card>

          {/* Stakeholder Information */}
          <Card className="p-5 bg-[#0f172a]/50"><h4 className="text-sm font-semibold flex gap-2"><Users className="w-4 h-4" /> Stakeholder Information</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-xs">Project Owner</Label><Input value={projectOwner} onChange={e => setProjectOwner(e.target.value)} /></div><div><Label className="text-xs">Owner Email</Label><Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} /></div><div><Label className="text-xs">Project SME</Label><Input value={projectSME} onChange={e => setProjectSME(e.target.value)} /></div><div><Label className="text-xs">Project SME Email</Label><Input type="email" value={projectSMEEmail} onChange={e => setProjectSMEEmail(e.target.value)} /></div><div><Label className="text-xs">Project DL Email</Label><Input type="email" value={projectDLEmail} onChange={e => setProjectDLEmail(e.target.value)} /></div><div><Label className="text-xs">Expected Go-Live Date</Label><Input type="date" value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} /></div><div><Label className="text-xs">Tester Name</Label><Input value={testerName} onChange={e => setTesterName(e.target.value)} /></div><div><Label className="text-xs">Tester Email</Label><Input type="email" value={testerEmail} onChange={e => setTesterEmail(e.target.value)} /></div><div><Label className="text-xs">ServiceNow Group</Label><Input value={servicenowGroup} onChange={e => setServicenowGroup(e.target.value)} /></div><div><Label className="text-xs">ServiceNow Email</Label><Input type="email" value={servicenowEmail} onChange={e => setServicenowEmail(e.target.value)} /></div></div></Card>

          {/* Team Members */}
          <Card className="p-5 bg-[#0f172a]/50"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold flex gap-2"><Users className="w-4 h-4" /> Team Members</h4><button onClick={() => setShowTeamModal(true)} className="px-3 py-1 rounded-lg text-xs bg-primary text-white flex items-center gap-1"><Plus className="w-3 h-3" /> Add Member</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">{teamMembers.map(m => (<div key={m.id} className="p-3 rounded-lg border border-dark-700 bg-dark-900/60"><p className="text-sm font-medium text-white">{m.name}</p><p className="text-xs text-gray-400">{m.email}</p><p className="text-xs text-gray-500">{m.role}</p></div>))}</div></Card>

          {/* Consumers */}
          <Card className="p-5 bg-[#0f172a]/50"><div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold flex gap-2"><Layers className="w-4 h-4" /> Consumers</h4><button onClick={() => setShowConsumerModal(true)} className="px-3 py-1 rounded-lg text-xs bg-primary text-white flex items-center gap-1"><Plus className="w-3 h-3" /> Add Consumer</button></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">{savedConsumers.map(c => { const isSelected = selectedConsumers.includes(c.id); return (<div key={c.id} className={cn("p-2 rounded-lg border cursor-pointer", isSelected ? "border-primary bg-primary/20" : "border-dark-700 bg-dark-900/60")} onClick={() => setSelectedConsumers(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}><p className="text-xs text-white truncate">{c.consumerName}</p>{isSelected && <CheckCircle className="w-3 h-3 text-primary mt-1" />}</div>); })}</div></Card>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#2a3a5a] bg-[#0f172a]/90 px-6 py-4"><button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#27314e] text-slate-300">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#ff5b1f] text-white">Save</button></div>
      </div>

      {/* Team Member Modal with Role dropdown */}
      {showTeamModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-dark-700 bg-[#161b30] p-6">
            <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} /></div>
              <div><Label>Role</Label><select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} className="w-full rounded-lg border border-dark-700 bg-dark-900 p-2 text-white"><option value="">Select role</option><option value="API Engineer">API Engineer</option><option value="DevOps Engineer">DevOps Engineer</option><option value="Infra Engineer">Infra Engineer</option><option value="Support Engineer">Support Engineer</option><option value="Project Manager">Project Manager</option><option value="Product Manager">Product Manager</option></select></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowTeamModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button><button onClick={addTeamMember} className="px-4 py-2 rounded-lg bg-primary text-white">Add</button></div>
          </div>
        </div>
      )}

      {/* Consumer Modal (same as original) */}
      {showConsumerModal && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl border border-dark-700 bg-[#161b30] p-6">
            <h3 className="text-lg font-semibold mb-4">Add Consumer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Consumer Name</Label><Input value={consumerForm.consumerName} onChange={e => setConsumerForm({...consumerForm, consumerName: e.target.value})} /></div>
              <div><Label>POC Name</Label><Input value={consumerForm.consumerPocName} onChange={e => setConsumerForm({...consumerForm, consumerPocName: e.target.value})} /></div>
              <div><Label>POC Email</Label><Input type="email" value={consumerForm.consumerPocEmail} onChange={e => setConsumerForm({...consumerForm, consumerPocEmail: e.target.value})} /></div>
              <div><Label>SME Name</Label><Input value={consumerForm.consumerSmeName} onChange={e => setConsumerForm({...consumerForm, consumerSmeName: e.target.value})} /></div>
              <div><Label>SME Email</Label><Input type="email" value={consumerForm.consumerSmeEmail} onChange={e => setConsumerForm({...consumerForm, consumerSmeEmail: e.target.value})} /></div>
              <div><Label>Config</Label><Input value={consumerForm.consumerConfig} onChange={e => setConsumerForm({...consumerForm, consumerConfig: e.target.value})} /></div>
              <div><Label>API TPS</Label><Input value={consumerForm.apiTps} onChange={e => setConsumerForm({...consumerForm, apiTps: e.target.value})} /></div>
              <div><Label>Quota</Label><Input value={consumerForm.quota} onChange={e => setConsumerForm({...consumerForm, quota: e.target.value})} /></div>
              <div><Label>Rate Limiting</Label><Input value={consumerForm.rateLimiting} onChange={e => setConsumerForm({...consumerForm, rateLimiting: e.target.value})} /></div>
              <div><Label>API Key Info</Label><Input value={consumerForm.apiKeyInfo} onChange={e => setConsumerForm({...consumerForm, apiKeyInfo: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowConsumerModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button><button onClick={handleSaveConsumer} disabled={isAddingConsumer} className="px-4 py-2 rounded-lg bg-primary text-white">Save Consumer</button></div>
          </div>
        </div>
      )}
    </div>
  );
}