// src/components/Gateway/DevelopersView.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Eye, Edit, Trash2, Plus, Search, Loader2, AlertCircle,
  User, Mail, Calendar, Briefcase, Shield, X, Key
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { fetchApigeeToken } from "../../services/apigeeToken";
import { PaginationControls } from "../../components/ui/PaginationControls";

export const DevelopersView = ({ showMessage }) => {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    userName: "",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const org = "gen-ai-poc-onboarding";

  // Helper to fetch full developer details by email
  const fetchDeveloperDetails = async (email) => {
    try {
      const token = await fetchApigeeToken();
      const response = await fetch(
        `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/developers/${email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error(`Failed to fetch details for ${email}:`, err);
      return null;
    }
  };

  // Fetch developer list then enrich with full details
  const fetchDevelopers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await fetchApigeeToken();
      const response = await fetch(
        `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/developers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`Failed to fetch developers: ${response.statusText}`);
      const data = await response.json();

      let devList = [];
      if (data.developer && Array.isArray(data.developer)) {
        devList = data.developer;
      } else if (data.developers && Array.isArray(data.developers)) {
        devList = data.developers;
      } else if (Array.isArray(data)) {
        devList = data;
      }

      if (devList.length === 0) {
        setDevelopers([]);
        setLoading(false);
        return;
      }

      setLoadingDetails(true);
      const enriched = await Promise.all(
        devList.map(async (item) => {
          const email = item.email || item;
          const details = await fetchDeveloperDetails(email);
          if (details) {
            return {
              email: details.email || email,
              name: details.name || (details.firstName && details.lastName ? `${details.firstName} ${details.lastName}`.trim() : email.split('@')[0]),
              userName: details.userName || details.name || email.split('@')[0],
              firstName: details.firstName || "",
              lastName: details.lastName || "",
              status: details.status || "active",
              appsCount: details.apps?.length || 0,
              createdAt: details.createdAt || details.createdAt,
              apps: details.apps || [],
            };
          }
          return {
            email: email,
            name: email.split('@')[0],
            userName: email.split('@')[0],
            firstName: "",
            lastName: "",
            status: "active",
            appsCount: 0,
            createdAt: null,
            apps: [],
          };
        })
      );
      setDevelopers(enriched);
    } catch (err) {
      setError(err.message);
      showMessage(`Could not load developers: ${err.message}`, "error");
    } finally {
      setLoading(false);
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const filteredDevelopers = useMemo(() => {
    return developers.filter(dev =>
      dev.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.userName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [developers, searchTerm]);

  const paginatedDevelopers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevelopers.slice(start, start + pageSize);
  }, [filteredDevelopers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = "Invalid email format";
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.userName.trim()) errors.userName = "User name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      userName: "",
      status: "active",
    });
    setFormErrors({});
    setSelectedDeveloper(null);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = await fetchApigeeToken();
      const payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userName: formData.userName,
        status: formData.status,
      };
      const response = await fetch(
        `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/developers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Creation failed");
      }
      showMessage(`Developer "${formData.firstName} ${formData.lastName}" created successfully`, "success");
      setCreateModalOpen(false);
      resetForm();
      fetchDevelopers();
    } catch (err) {
      showMessage(`Creation failed: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = await fetchApigeeToken();
      const payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userName: formData.userName,
        status: formData.status,
      };
      const response = await fetch(
        `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/developers/${selectedDeveloper.userName}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Update failed");
      }
      showMessage(`Developer updated successfully`, "success");
      setEditModalOpen(false);
      resetForm();
      fetchDevelopers();
    } catch (err) {
      showMessage(`Update failed: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const token = await fetchApigeeToken();
      const response = await fetch(
        `https://forgesphere.probestack.io/apigee-wrapper/organizations/${org}/developers/${selectedDeveloper.userName}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Delete failed");
      }
      showMessage("Developer deleted successfully", "success");
      setDeleteConfirmOpen(false);
      setSelectedDeveloper(null);
      fetchDevelopers();
    } catch (err) {
      showMessage(`Delete failed: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const openViewModal = (dev) => {
    setSelectedDeveloper(dev);
    setViewModalOpen(true);
  };

  const openEditModal = (dev) => {
    setSelectedDeveloper(dev);
    setFormData({
      email: dev.email,
      firstName: dev.firstName,
      lastName: dev.lastName,
      userName: dev.userName,
      status: dev.status,
    });
    setEditModalOpen(true);
  };

  const openDeleteConfirm = (dev) => {
    setSelectedDeveloper(dev);
    setDeleteConfirmOpen(true);
  };

  // ----- Form Components -----
  const FormInput = ({ icon: Icon, label, name, value, onChange, error, placeholder, type = "text", disabled = false }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-[#0f1117] border ${error ? 'border-red-500' : 'border-[#2a3550]'} rounded-lg ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ff5b1f] focus:ring-1 focus:ring-[#ff5b1f]/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );

  const FormSelect = ({ icon: Icon, label, value, onChange, options, error }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />}
        <select
          value={value}
          onChange={onChange}
          className={`w-full bg-[#0f1117] border ${error ? 'border-red-500' : 'border-[#2a3550]'} rounded-lg ${Icon ? 'pl-9' : 'pl-3'} pr-8 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-[#ff5b1f] focus:ring-1 focus:ring-[#ff5b1f]/50 transition-all cursor-pointer`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#111520] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );

  // ----- Modal Header (without duplicate close) -----
  const ModalHeader = ({ title, icon: Icon, onClose }) => (
    <div className="flex items-center justify-between pb-4 border-b border-[#2a3550]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg shadow-[#ff5b1f]/30">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill in the details below</p>
        </div>
      </div>
      {/* <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
      >
        <X className="h-5 w-5" />
      </button> */}
    </div>
  );

  // ----- Modals -----
  const renderCreateEditModal = () => {
    const isEdit = editModalOpen;
    const isOpen = isEdit ? editModalOpen : createModalOpen;
    const closeModal = () => {
      if (isEdit) setEditModalOpen(false);
      else setCreateModalOpen(false);
      resetForm();
    };
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-lg bg-gradient-to-br from-[#111520] to-[#0a0e18] border border-[#2a3550] rounded-2xl shadow-2xl shadow-black/50 p-0 overflow-hidden [&>button[aria-label='Close']]:hidden">
          <div className="p-6">
            <ModalHeader
              title={isEdit ? "Edit Developer" : "Create New Developer"}
              icon={isEdit ? Edit : Plus}
              onClose={closeModal}
            />
            <div className="mt-6 space-y-4">
              <FormInput
                icon={Mail}
                label="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={formErrors.email}
                placeholder="developer@company.com"
                type="email"
                disabled={isEdit}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  icon={User}
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  error={formErrors.firstName}
                  placeholder="John"
                />
                <FormInput
                  icon={User}
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  error={formErrors.lastName}
                  placeholder="Doe"
                />
              </div>
              <FormInput
                icon={Key}
                label="User Name"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                error={formErrors.userName}
                placeholder="johndoe"
              />
              <FormSelect
                icon={Shield}
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ]}
              />
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#2a3550]">
              <Button variant="outline" onClick={closeModal} className="border-[#2a3550] text-slate-300 hover:bg-white/5">
                Cancel
              </Button>
              <Button
                onClick={isEdit ? handleUpdate : handleCreate}
                disabled={submitting}
                className="bg-gradient-to-r from-[#ff5b1f] to-[#ff7a3f] hover:from-[#ff6b36] hover:to-[#ff8a5c] text-white shadow-lg shadow-[#ff5b1f]/20"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Updating..." : "Creating..."}</>
                ) : (
                  <>{isEdit ? "Update Developer" : "Create Developer"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderViewModal = () => (
  <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
    <DialogContent className="w-[70vw] bg-gradient-to-br from-[#111520] to-[#0a0e18] border border-[#2a3550] rounded-2xl shadow-2xl shadow-black/50 p-0 overflow-hidden [&>button[aria-label='Close']]:hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a3550] bg-gradient-to-r from-[#ff5b1f]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg shadow-[#ff5b1f]/30">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Developer Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">Complete developer profile</p>
            </div>
          </div>
        </div>

        {/* Content - scrollable if needed */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {selectedDeveloper && (
            <>
              {/* Profile header */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#ff5b1f]/10 to-transparent border border-[#ff5b1f]/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5b1f] to-[#ff8a5c] shadow-lg">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedDeveloper.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">@{selectedDeveloper.userName}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedDeveloper.status === "active" 
                        ? "bg-green-500/20 text-green-300" 
                        : "bg-red-500/20 text-red-300"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedDeveloper.status === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                      {selectedDeveloper.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info fields - stacked for compactness */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Mail className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                    <p className="text-sm text-white break-all">{selectedDeveloper.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <User className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Full Name</p>
                    <p className="text-sm text-white">{selectedDeveloper.firstName} {selectedDeveloper.lastName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Key className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">User Name</p>
                    <p className="text-sm text-white font-mono">{selectedDeveloper.userName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Briefcase className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Applications</p>
                    <p className="text-sm text-white">{selectedDeveloper.appsCount} app(s) registered</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Calendar className="h-4 w-4 text-[#ff8a5c] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Member since</p>
                    <p className="text-sm text-white">{formatDate(selectedDeveloper.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Apps list if any */}
              {selectedDeveloper.apps && selectedDeveloper.apps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Registered Apps</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDeveloper.apps.map((app, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-md text-xs bg-[#1a1f2e] border border-[#2a3550] text-slate-300">
                        {typeof app === 'string' ? app : app.name || app.appId || `App ${idx + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-[#2a3550] bg-black/20">
          <Button 
            onClick={() => setViewModalOpen(false)} 
            className="bg-gradient-to-r from-[#ff5b1f] to-[#ff7a3f] hover:from-[#ff6b36] hover:to-[#ff8a5c] text-white shadow-lg shadow-[#ff5b1f]/20"
          >
            Close
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

  const renderDeleteConfirm = () => (
    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <DialogContent className="max-w-sm bg-gradient-to-br from-[#111520] to-[#0a0e18] border border-red-500/30 rounded-2xl shadow-2xl shadow-black/50 p-0 overflow-hidden [&>button[aria-label='Close']]:hidden">
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 shadow-lg shadow-red-500/30">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Confirm Delete</h2>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            {/* <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button> */}
          </div>
          <div className="mt-6">
            <p className="text-slate-300">
              Are you sure you want to delete developer{" "}
              <span className="text-white font-semibold">{selectedDeveloper?.name}</span>?
            </p>
            <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              This will remove all associated data.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-red-500/20">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-[#2a3550] text-slate-300 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/20"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                "Delete Developer"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const isLoading = loading || loadingDetails;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Developers</h2>
          <p className="text-sm text-gray-400">Manage and view registered API developers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
            <input
              type="text"
              placeholder="Filter developers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1a1f2e] focus:outline-none border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64 text-white"
            />
          </div>
          <Button onClick={openCreateModal} className="bg-[#ff5b1f] hover:bg-[#ff6b36] text-white whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-[#7f8fa8]">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>{loading ? "Loading developers..." : "Fetching details..."}</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400">
          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
          <p>Error: {error}</p>
          <button onClick={fetchDevelopers} className="mt-2 text-sm text-[#4f8ef7] hover:underline">Retry</button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-dark-700">
            <table className="w-full text-sm">
              <thead className="bg-dark-800/70 border-b border-dark-700">
                <tr>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Name</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Email</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">User Name</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Apps</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Member since</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDevelopers.map((dev) => (
                  <tr key={dev.userName} className="border-b border-dark-700 hover:bg-dark-800/40">
                    <td className="p-3 text-white">{dev.name}</td>
                    <td className="p-3 text-[#7f8fa8]">{dev.email}</td>
                    <td className="p-3 text-[#7f8fa8]">{dev.userName}</td>
                    <td className="p-3 text-[#7f8fa8]">{dev.appsCount}</td>
                    <td className="p-3 text-[#7f8fa8]">{formatDate(dev.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openViewModal(dev)} className="text-[#4f8ef7] hover:text-[#6ca9ff]" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEditModal(dev)} className="text-emerald-400 hover:text-emerald-300" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDeleteConfirm(dev)} className="text-red-400 hover:text-red-500" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedDevelopers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-[#7f8fa8]">No developers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredDevelopers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
      </div>

      {renderCreateEditModal()}
      {renderViewModal()}
      {renderDeleteConfirm()}
    </div>
  );
};