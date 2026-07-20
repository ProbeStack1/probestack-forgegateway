import { Eye, EyeOff, Loader2, X, Plus, RotateCw, CheckCircle, XCircle, Trash2, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apigeeApiFetch } from "../../../../services/apigeeApiService";
import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";
import Toast from "../../../../components/ui/toast";

// ---------- Helper functions ----------
const formatValue = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatDate = (value) => {
  if (!value || Number(value) < 0) return "Never";
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? formatValue(value) : date.toLocaleString();
};

const computeDurationExpiry = (value, unit) => {
  const now = Date.now();
  const multipliers = {
    Minutes: 60 * 1000,
    Hours: 60 * 60 * 1000,
    Days: 24 * 60 * 60 * 1000,
    Weeks: 7 * 24 * 60 * 60 * 1000,
    Months: 30 * 24 * 60 * 60 * 1000,
    Years: 365 * 24 * 60 * 60 * 1000,
  };
  const multiplier = multipliers[unit] || multipliers.Minutes;
  return now + value * multiplier;
};

const getExpiresInSeconds = (expiryType, dateValue, durationValue, durationUnit) => {
  if (expiryType === "never") return undefined;
  if (expiryType === "date") {
    const selectedDate = new Date(dateValue);
    const diffSeconds = Math.floor((selectedDate.getTime() - Date.now()) / 1000);
    return diffSeconds > 0 ? diffSeconds.toString() : undefined;
  }
  if (expiryType === "duration") {
    const multipliersSec = {
      Minutes: 60, Hours: 3600, Days: 86400,
      Weeks: 604800, Months: 2592000, Years: 31536000,
    };
    const totalSeconds = durationValue * multipliersSec[durationUnit];
    return totalSeconds.toString();
  }
  return undefined;
};

const getTimeRemaining = (expiresAtMs) => {
  if (!expiresAtMs || expiresAtMs < 0) return { text: "Never", isExpiringSoon: false };
  const diffMs = expiresAtMs - Date.now();
  if (diffMs <= 0) return { text: "Expired", isExpiringSoon: true };
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return { text: `${diffMins} minute${diffMins !== 1 ? "s" : ""} remaining`, isExpiringSoon: diffDays < 30 };
  if (diffHours < 24) return { text: `${diffHours} hour${diffHours !== 1 ? "s" : ""} remaining`, isExpiringSoon: diffDays < 30 };
  return { text: `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining`, isExpiringSoon: diffDays < 30 };
};

// ---------- Dropdown Components ----------
const ExpiryTypeDropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white">
        <span>{selectedOption.label}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-dark-600 bg-dark-800 shadow-lg">
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setIsOpen(false); }} className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-dark-700">
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AddProductsDropdown = ({ availableProducts, existingProductNames, onAddProducts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedProducts([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const available = availableProducts.filter(p => !existingProductNames.includes(p));
  const toggleProduct = (product) => {
    setSelectedProducts(prev => prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]);
  };
  const handleAdd = () => {
    if (selectedProducts.length) {
      onAddProducts(selectedProducts);
      setSelectedProducts([]);
      setIsOpen(false);
    }
  };
  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20">
        <Plus size={14} /> Add Products
      </button>
      {isOpen && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-dark-600 bg-dark-800 shadow-xl">
          <div className="border-b border-dark-700 px-3 py-2 text-xs font-medium text-gray-400">Select products to add</div>
          <div className="max-h-48 overflow-y-auto p-2">
            {available.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-gray-400">No more products available</div>
            ) : (
              available.map(product => (
                <label key={product} className="flex items-center gap-2 px-2 py-1.5 hover:bg-dark-700 rounded">
                  <input type="checkbox" checked={selectedProducts.includes(product)} onChange={() => toggleProduct(product)} className="rounded border-dark-600 bg-dark-800 text-primary" />
                  <span className="text-sm text-white">{product}</span>
                </label>
              ))
            )}
          </div>
          <div className="border-t border-dark-700 p-2">
            <button onClick={handleAdd} disabled={selectedProducts.length === 0} className="w-full rounded bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50">
              Add Selected ({selectedProducts.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Add Credential Modal (single API call) ----------
const AddCredentialModal = ({ isOpen, onClose, onAdd, availableProducts = [], orgName, developerId, appName, setToast }) => {
  const [expiryType, setExpiryType] = useState("never");
  const [dateValue, setDateValue] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("Days");
  const [products, setProducts] = useState([]);
  const [dateError, setDateError] = useState("");
  const [emails, setEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const expiryOptions = [
    { value: "never", label: "Never" },
    { value: "date", label: "Date" },
    { value: "duration", label: "Duration" },
  ];

  if (!isOpen) return null;

  const handleAddProducts = (newProductNames) => {
    const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
    setProducts(prev => [...prev, ...newProducts]);
  };
  const removeProduct = (productName) => setProducts(prev => prev.filter(p => p.name !== productName));
  const existingProductNames = products.map(p => p.name);

  const handleSubmit = async () => {
    if (expiryType === "date" && !dateValue) { setDateError("Date is required"); return; }
    if (expiryType === "date") {
      const selectedDate = new Date(dateValue);
      if (selectedDate <= new Date()) { setDateError("Date must be in the future"); return; }
    }
    if (products.length === 0) { setToast({ message: "Please add at least one product", type: "error" }); return; }

    const expiresInSeconds = getExpiresInSeconds(expiryType, dateValue, durationValue, durationUnit);
    const payload = {
      apiProducts: products.map(p => p.name),
      consumerKey: `ck_${Math.random().toString(36).substring(2, 8)}`,
      consumerSecret: `cs_${Math.random().toString(36).substring(2, 16)}`, 
    };
    if (expiresInSeconds) payload.expiresInSeconds = expiresInSeconds;

    setSubmitting(true);
    try {
      const response = await apigeeApiFetch(
        APIGEE_ENDPOINTS.APP_CREDENTIALS.CREATE_KEY(orgName, developerId, appName),
        { method: "POST", body: JSON.stringify(payload) }
      );
      if (!response.ok) throw new Error(await response.text());
      const keyData = await response.json();
      const newCredential = {
        consumerKey: keyData.consumerKey,
        consumerSecret: keyData.consumerSecret,
        status: keyData.status || "APPROVED",
        issuedAt: keyData.issuedAt ? parseInt(keyData.issuedAt) : Date.now(),
        expiresAt: keyData.expiresAt ? parseInt(keyData.expiresAt) : null,
        apiProducts: (keyData.apiProducts || []).map(p => ({ apiproduct: p.apiproduct, status: p.status })),
        scopes: keyData.scopes || [],
      };
      onAdd(newCredential);
      setToast({ message: "Credential added successfully" + (emails ? " and email notifications sent" : ""), type: "success" });
      onClose();
      // reset form
      setExpiryType("never"); setDateValue(""); setDurationValue(1); setDurationUnit("Days");
      setProducts([]); setEmails(""); setDateError("");
    } catch (err) {
      console.error(err);
      setToast({ message: `Error: ${err.message}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
        <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
          <h3 className="text-base font-semibold text-white">Add Credential</h3>
          <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"><X size={16} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {/* Expiry */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
            <ExpiryTypeDropdown value={expiryType} onChange={setExpiryType} options={expiryOptions} />
            {expiryType === "date" && (
              <div className="mt-3">
                <input type="date" value={dateValue} onChange={(e) => { setDateValue(e.target.value); setDateError(""); }} className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
                {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
                <p className="mt-1 text-xs text-gray-400">Requires a date in the future</p>
              </div>
            )}
            {expiryType === "duration" && (
              <div className="mt-3 flex gap-3">
                <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)} className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
                <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white">
                  <option>Minutes</option><option>Hours</option><option>Days</option><option>Weeks</option><option>Months</option><option>Years</option>
                </select>
              </div>
            )}
          </div>

          {/* Email notification */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Email Notification (comma separated)</label>
            <input type="text" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="user1@example.com, user2@example.com" className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
            <p className="mt-1 text-xs text-gray-400">Notification emails will be sent (integration coming soon)</p>
          </div>

          {/* Products */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Products</label>
              <AddProductsDropdown availableProducts={availableProducts} existingProductNames={existingProductNames} onAddProducts={handleAddProducts} />
            </div>
            <div className="rounded-md border border-dark-700">
              <div className="grid grid-cols-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400"><span>Product Name</span><span>Status</span></div>
              {products.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No products added. Click "+ Add Products" to associate.</div>
              ) : (
                products.map((product) => (
                  <div key={product.name} className="grid grid-cols-2 items-center border-b border-dark-700 px-4 py-2">
                    <div className="flex items-center justify-between"><span className="text-sm text-white">{product.name}</span></div>
                    <div className="flex gap-2"><span className="text-xs text-green-400">Approved</span><button onClick={() => removeProduct(product.name)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
          <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Credential"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Key Rotation Modal (single API call with attributes) ----------
const KeyRotationModal = ({ isOpen, onClose, onRotate, credential, allProducts = [], orgName, developerId, appName, setToast, credentialIndex }) => {
  const [expiryType, setExpiryType] = useState("never");
  const [dateValue, setDateValue] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("Days");
  const [dateError, setDateError] = useState("");
  const [products, setProducts] = useState(() => {
    const current = credential?.apiProducts || [];
    return current.map(p => ({ name: p.apiproduct || p.name, status: (p.status || "APPROVED").toUpperCase() }));
  });
  const [selectedProductNames, setSelectedProductNames] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [emails, setEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const expiryOptions = [
    { value: "never", label: "Never" },
    { value: "date", label: "Date" },
    { value: "duration", label: "Duration" },
  ];

  useEffect(() => {
    if (products.length === 0) setSelectAll(false);
    else setSelectAll(selectedProductNames.length === products.length);
  }, [selectedProductNames, products]);

  if (!isOpen) return null;

  const handleAddProducts = (newProductNames) => {
    const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
    setProducts(prev => [...prev, ...newProducts]);
  };
  const handleStatusChange = (productName, newStatus) => {
    setProducts(prev => prev.map(p => p.name === productName ? { ...p, status: newStatus } : p));
  };
  const handleRemoveProduct = (productName) => {
    setProducts(prev => prev.filter(p => p.name !== productName));
    setSelectedProductNames(prev => prev.filter(name => name !== productName));
  };
  const handleBulkAction = (action) => {
    if (selectedProductNames.length === 0) return;
    if (action === "remove") {
      setProducts(prev => prev.filter(p => !selectedProductNames.includes(p.name)));
      setSelectedProductNames([]);
    } else {
      setProducts(prev => prev.map(p => selectedProductNames.includes(p.name) ? { ...p, status: action === "approve" ? "APPROVED" : "REVOKED" } : p));
    }
  };
  const toggleSelectProduct = (productName) => {
    setSelectedProductNames(prev => prev.includes(productName) ? prev.filter(n => n !== productName) : [...prev, productName]);
  };
  const toggleSelectAll = () => {
    if (selectAll) setSelectedProductNames([]);
    else setSelectedProductNames(products.map(p => p.name));
  };
  const existingProductNames = products.map(p => p.name);

  const handleSubmit = async () => {
    if (expiryType === "date" && !dateValue) { setDateError("Date is required"); return; }
    if (expiryType === "date") {
      const selectedDate = new Date(dateValue);
      if (selectedDate <= new Date()) { setDateError("Date must be in the future"); return; }
    }
    if (products.filter(p => p.status === "APPROVED").length === 0) {
      setToast({ message: "At least one product must be approved", type: "error" });
      return;
    }

    const expiresInSeconds = getExpiresInSeconds(expiryType, dateValue, durationValue, durationUnit);
    const payload = {
      apiProducts: products.filter(p => p.status === "APPROVED").map(p => p.name),
      consumerKey: `ck_${Math.random().toString(36).substring(2, 8)}`,
      consumerSecret: `cs_${Math.random().toString(36).substring(2, 16)}`,
      attributes: [{ name: `Credential ${credentialIndex + 1} rotated`, value: "rotated" }],
    };
    if (expiresInSeconds) payload.expiresInSeconds = expiresInSeconds;

    setSubmitting(true);
    try {
      const response = await apigeeApiFetch(
        APIGEE_ENDPOINTS.APP_CREDENTIALS.CREATE_KEY(orgName, developerId, appName),
        { method: "POST", body: JSON.stringify(payload) }
      );
      if (!response.ok) throw new Error(await response.text());
      const keyData = await response.json();

      // The new credential's apiProducts may not include the status we set; we merge our product list.
      const rotatedCredential = {
        ...credential,
        consumerKey: keyData.consumerKey,
        consumerSecret: keyData.consumerSecret,
        issuedAt: keyData.issuedAt ? parseInt(keyData.issuedAt) : Date.now(),
        expiresAt: keyData.expiresAt ? parseInt(keyData.expiresAt) : null,
        apiProducts: products.map(p => ({ apiproduct: p.name, status: p.status })),
        status: keyData.status,
      };
      onRotate(rotatedCredential);
      setToast({ message: `Key rotated successfully${emails ? " and email notifications sent" : ""}`, type: "success" });
      onClose();
      // reset
      setExpiryType("never"); setDateValue(""); setDurationValue(1); setDurationUnit("Days");
      setSelectedProductNames([]); setEmails("");
    } catch (err) {
      console.error(err);
      setToast({ message: `Rotation failed: ${err.message}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
        <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
          <h3 className="text-base font-semibold text-white">Key Rotation</h3>
          <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"><X size={16} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {/* Expiry */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
            <ExpiryTypeDropdown value={expiryType} onChange={setExpiryType} options={expiryOptions} />
            {expiryType === "date" && (
              <div className="mt-3">
                <input type="date" value={dateValue} onChange={(e) => { setDateValue(e.target.value); setDateError(""); }} className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
                {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
              </div>
            )}
            {expiryType === "duration" && (
              <div className="mt-3 flex gap-3">
                <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)} className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
                <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white">
                  <option>Minutes</option><option>Hours</option><option>Days</option><option>Weeks</option><option>Months</option><option>Years</option>
                </select>
              </div>
            )}
          </div>

          {/* Email notification */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Email Notification (comma separated)</label>
            <input type="text" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="user1@example.com, user2@example.com" className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
          </div>

          {/* Products with bulk actions */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-300">Products</label>
              <div className="flex gap-2">
                <AddProductsDropdown availableProducts={allProducts} existingProductNames={existingProductNames} onAddProducts={handleAddProducts} />
                <button onClick={() => handleBulkAction("approve")} disabled={selectedProductNames.length === 0} className="rounded-md bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-40">Approve</button>
                <button onClick={() => handleBulkAction("revoke")} disabled={selectedProductNames.length === 0} className="rounded-md bg-yellow-600/20 px-3 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-600/30 disabled:opacity-40">Revoke</button>
                <button onClick={() => handleBulkAction("remove")} disabled={selectedProductNames.length === 0} className="rounded-md bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-40">Remove</button>
              </div>
            </div>
            <div className="rounded-md border border-dark-700">
              <div className="grid grid-cols-12 gap-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400">
                <div className="col-span-1 flex items-center gap-1"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded border-dark-600 bg-dark-800 text-primary" /></div>
                <div className="col-span-6">Product</div><div className="col-span-3">Status</div><div className="col-span-2">Actions</div>
              </div>
              {products.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No products associated. Click "+ Add Products" to add.</div>
              ) : (
                products.map((product) => (
                  <div key={product.name} className="grid grid-cols-12 items-center gap-2 border-b border-dark-700 px-4 py-2">
                    <div className="col-span-1"><input type="checkbox" checked={selectedProductNames.includes(product.name)} onChange={() => toggleSelectProduct(product.name)} className="rounded border-dark-600 bg-dark-800 text-primary" /></div>
                    <div className="col-span-6 text-sm text-white">{product.name}</div>
                    <div className="col-span-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.status === "APPROVED" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{product.status === "APPROVED" ? "Approved" : "Revoked"}</span></div>
                    <div className="col-span-2 flex gap-2">
                      {product.status !== "APPROVED" && <button onClick={() => handleStatusChange(product.name, "APPROVED")} className="text-green-400 hover:text-green-300"><CheckCircle size={16} /></button>}
                      {product.status !== "REVOKED" && <button onClick={() => handleStatusChange(product.name, "REVOKED")} className="text-yellow-400 hover:text-yellow-300"><XCircle size={16} /></button>}
                      <button onClick={() => handleRemoveProduct(product.name)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
          <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : "Rotate Keys"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export default function AppCredentialsModal({
  isOpen, onClose, data, isLoading, error, onRefresh, availableProducts = [],
  orgName, developerId, appName
}) {
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });

  if (!isOpen) return null;
  const credentials = Array.isArray(data?.credentials) ? data.credentials : [];

  const toggleVisibleSecret = (key) => setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  const renderMaskedValue = (key, value) => {
    const isVisible = visibleSecrets[key];
    const displayValue = isVisible ? formatValue(value) : "••••••••••••••••";
    return (
      <span className="col-span-2 flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 break-all text-sm font-medium text-white">{displayValue}</span>
        <button type="button" onClick={() => toggleVisibleSecret(key)} className="shrink-0 rounded-md border border-dark-600 p-1.5 text-gray-400 hover:border-primary hover:text-primary">
          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </span>
    );
  };

  const handleAddCredential = async (newCredential) => {
    if (onRefresh) await onRefresh();
  };
  const handleRotateCredential = async (rotatedCredential) => {
    if (onRefresh) await onRefresh();
  };

  return (
    <>
    <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: "", type: "success" })}
          />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
          <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">App Credentials</h3>
                {data?.status && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${data.status.toLowerCase() === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {formatValue(data.status)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{data?.name || "Fetched from Apigee"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddModal(true)} className="rounded-lg flex items-center gap-2 bg-orange-600 px-2 py-2 text-sm text-white hover:bg-orange-700"><Plus size={14} /> Add Credential</button>
              <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"><X size={16} /></button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400"><Loader2 size={18} className="animate-spin" /> Loading credentials...</div>
            ) : error ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            ) : credentials.length === 0 ? (
              <div className="rounded-lg border border-dark-700 px-4 py-8 text-center text-sm text-gray-400">No credentials found for this app.</div>
            ) : (
              <div className="space-y-4">
                {credentials.map((credential, index) => {
                  const expiryInfo = getTimeRemaining(credential.expiresAt);
                  return (
                    <div key={credential.consumerKey || index} className="rounded-lg border border-dark-700 bg-dark-800/30">
                      <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
                        <span className="text-sm font-semibold text-white">Credential {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{formatValue(credential.status)}</span>
                          <button onClick={() => { setSelectedCredential(credential); setSelectedIndex(index); setShowRotationModal(true); }} className="flex items-center gap-1 rounded-md border border-dark-600 bg-dark-700 px-2 py-1 text-xs text-gray-300 hover:border-primary hover:text-primary"><RotateCw size={12} /> Key Rotation</button>
                        </div>
                      </div>
                      <div className="divide-y divide-dark-700">
                        {[
                          ["Consumer Key", credential.consumerKey, true],
                          ["Consumer Secret", credential.consumerSecret, true],
                          ["Expires", formatDate(credential.expiresAt), false],
                          ["Issued", formatDate(credential.issuedAt), false],
                          ["Scopes", credential.scopes, false],
                        ].map(([label, value, shouldMask]) => (
                          <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
                            <span className="text-sm text-gray-400">{label}</span>
                            {shouldMask ? renderMaskedValue(`${index}-${label}`, value) : (
                              <div className="col-span-2 flex items-center justify-between">
                                <span className="break-all text-sm font-medium text-white">{formatValue(value)}</span>
                                {label === "Expires" && credential.expiresAt && (
                                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${expiryInfo.isExpiringSoon ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {expiryInfo.text}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {Array.isArray(credential.apiProducts) && credential.apiProducts.length > 0 && (
                        <div className="border-t border-dark-700 px-4 py-3">
                          <p className="mb-2 text-sm text-gray-400">API Products</p>
                          <div className="flex flex-wrap gap-2">
                            {credential.apiProducts.map((product, productIndex) => {
                              const productName = formatValue(product?.apiproduct || product?.name || product);
                              const productStatus = product?.status;
                              return (
                                <span key={`${productName}-${productIndex}`} className="inline-flex items-center gap-1.5 rounded-full border border-dark-600 bg-[#0f172a] px-2 py-1 text-xs text-gray-200">
                                  {productName}
                                  {productStatus && (
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${productStatus.toLowerCase() === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                      {formatValue(productStatus)}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end border-t border-dark-700 px-5 py-4">
            <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">Close</button>
          </div>
        </div>
      </div>

      <AddCredentialModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddCredential} availableProducts={availableProducts} orgName={orgName} developerId={developerId} appName={appName} setToast={setToast} />
      {selectedCredential && (
        <KeyRotationModal isOpen={showRotationModal} onClose={() => { setShowRotationModal(false); setSelectedCredential(null); }} onRotate={handleRotateCredential} credential={selectedCredential} allProducts={availableProducts} orgName={orgName} developerId={developerId} appName={appName} setToast={setToast} credentialIndex={selectedIndex} />
      )}
    </>
  );
}



// import { Eye, EyeOff, Loader2, X, Plus, RotateCw, CheckCircle, XCircle, Trash2, ChevronDown } from "lucide-react";
// import { useState, useRef, useEffect } from "react";
// import { apigeeApiFetch } from "../../services/apigeeApiService";
// import { APIGEE_ENDPOINTS } from "../../config/apigeeConfig";

// // ---------- Helper functions ----------
// const formatValue = (value) => {
//   if (value === undefined || value === null || value === "") return "-";
//   if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
//   if (typeof value === "object") return JSON.stringify(value);
//   return String(value);
// };

// const formatDate = (value) => {
//   if (!value || Number(value) < 0) return "Never";
//   const date = new Date(Number(value));
//   return Number.isNaN(date.getTime()) ? formatValue(value) : date.toLocaleString();
// };

// const computeDurationExpiry = (value, unit) => {
//   const now = Date.now();
//   const multipliers = {
//     Minutes: 60 * 1000,
//     Hours: 60 * 60 * 1000,
//     Days: 24 * 60 * 60 * 1000,
//     Weeks: 7 * 24 * 60 * 60 * 1000,
//     Months: 30 * 24 * 60 * 60 * 1000,
//     Years: 365 * 24 * 60 * 60 * 1000,
//   };
//   const multiplier = multipliers[unit] || multipliers.Minutes;
//   return now + value * multiplier;
// };

// const getExpiresInSeconds = (expiryType, dateValue, durationValue, durationUnit) => {
//   if (expiryType === "never") return undefined;
//   if (expiryType === "date") {
//     const selectedDate = new Date(dateValue);
//     const diffSeconds = Math.floor((selectedDate.getTime() - Date.now()) / 1000);
//     return diffSeconds > 0 ? diffSeconds.toString() : undefined;
//   }
//   if (expiryType === "duration") {
//     const multipliersSec = {
//       Minutes: 60, Hours: 3600, Days: 86400,
//       Weeks: 604800, Months: 2592000, Years: 31536000,
//     };
//     const totalSeconds = durationValue * multipliersSec[durationUnit];
//     return totalSeconds.toString();
//   }
//   return undefined;
// };

// const getTimeRemaining = (expiresAtMs) => {
//   if (!expiresAtMs || expiresAtMs < 0) return { text: "Never", isExpiringSoon: false };
//   const diffMs = expiresAtMs - Date.now();
//   if (diffMs <= 0) return { text: "Expired", isExpiringSoon: true };
//   const diffMins = Math.floor(diffMs / 60000);
//   const diffHours = Math.floor(diffMs / 3600000);
//   const diffDays = Math.floor(diffMs / 86400000);
//   if (diffMins < 60) return { text: `${diffMins} minute${diffMins !== 1 ? "s" : ""} remaining`, isExpiringSoon: diffDays < 30 };
//   if (diffHours < 24) return { text: `${diffHours} hour${diffHours !== 1 ? "s" : ""} remaining`, isExpiringSoon: diffDays < 30 };
//   return { text: `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining`, isExpiringSoon: diffDays < 30 };
// };

// // ---------- Dropdown Components (unchanged) ----------
// const ExpiryTypeDropdown = ({ value, onChange, options }) => { /* same as before */ };
// const AddProductsDropdown = ({ availableProducts, existingProductNames, onAddProducts }) => { /* same as before */ };

// // ---------- Add Credential Modal ----------
// const AddCredentialModal = ({ isOpen, onClose, onAdd, availableProducts = [], orgName, developerId, appName, setToast }) => {
//   const [expiryType, setExpiryType] = useState("never");
//   const [dateValue, setDateValue] = useState("");
//   const [durationValue, setDurationValue] = useState(1);
//   const [durationUnit, setDurationUnit] = useState("Days");
//   const [products, setProducts] = useState([]);
//   const [dateError, setDateError] = useState("");
//   const [emails, setEmails] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const expiryOptions = [
//     { value: "never", label: "Never" },
//     { value: "date", label: "Date" },
//     { value: "duration", label: "Duration" },
//   ];

//   if (!isOpen) return null;

//   const handleAddProducts = (newProductNames) => {
//     const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
//     setProducts(prev => [...prev, ...newProducts]);
//   };
//   const removeProduct = (productName) => setProducts(prev => prev.filter(p => p.name !== productName));
//   const existingProductNames = products.map(p => p.name);

//   const handleSubmit = async () => {
//     if (expiryType === "date" && !dateValue) { setDateError("Date is required"); return; }
//     if (expiryType === "date") {
//       const selectedDate = new Date(dateValue);
//       if (selectedDate <= new Date()) { setDateError("Date must be in the future"); return; }
//     }
//     if (products.length === 0) { setToast({ message: "Please add at least one product", type: "error" }); return; }

//     let expiresInSeconds = getExpiresInSeconds(expiryType, dateValue, durationValue, durationUnit);
//     setSubmitting(true);
//     try {
//       // Step 1: Create key (no consumerKey/secret → Apigee generates)
//       const createPayload = {};
//       if (expiresInSeconds) createPayload.expiresInSeconds = expiresInSeconds;
//       const createRes = await apigeeApiFetch(
//         APIGEE_ENDPOINTS.APP_CREDENTIALS.CREATE_KEY(orgName, developerId, appName),
//         { method: "POST", body: JSON.stringify(createPayload) }
//       );
//       if (!createRes.ok) throw new Error(await createRes.text());
//       const keyData = await createRes.json();
//       const consumerKey = keyData.consumerKey;

//       // Step 2: Attach products
//       const attachRes = await apigeeApiFetch(
//         APIGEE_ENDPOINTS.APP_CREDENTIALS.ATTACH_PRODUCTS(orgName, developerId, appName, consumerKey),
//         { method: "POST", body: JSON.stringify({ apiProducts: products.map(p => p.name) }) }
//       );
//       if (!attachRes.ok) throw new Error(await attachRes.text());
//       const finalData = await attachRes.json();

//       const newCredential = {
//         consumerKey: finalData.consumerKey,
//         consumerSecret: finalData.consumerSecret,
//         status: finalData.status || "APPROVED",
//         issuedAt: finalData.issuedAt ? parseInt(finalData.issuedAt) : Date.now(),
//         expiresAt: finalData.expiresAt ? parseInt(finalData.expiresAt) : null,
//         apiProducts: (finalData.apiProducts || []).map(p => ({ apiproduct: p.apiproduct, status: p.status })),
//         scopes: finalData.scopes || [],
//       };
//       onAdd(newCredential);
//       setToast({ message: "Credential added successfully" + (emails ? " and email notifications sent" : ""), type: "success" });
//       onClose();
//       // Reset form
//       setExpiryType("never"); setDateValue(""); setDurationValue(1); setDurationUnit("Days");
//       setProducts([]); setEmails(""); setDateError("");
//     } catch (err) {
//       console.error(err);
//       setToast({ message: `Error: ${err.message}`, type: "error" });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
//       <div className="w-full max-w-2xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
//         <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
//           <h3 className="text-base font-semibold text-white">Add Credential</h3>
//           <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"><X size={16} /></button>
//         </div>
//         <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
//           {/* Expiry */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
//             <ExpiryTypeDropdown value={expiryType} onChange={setExpiryType} options={expiryOptions} />
//             {expiryType === "date" && (
//               <div className="mt-3">
//                 <input type="date" value={dateValue} onChange={(e) => { setDateValue(e.target.value); setDateError(""); }} className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
//                 {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
//                 <p className="mt-1 text-xs text-gray-400">Requires a date in the future</p>
//               </div>
//             )}
//             {expiryType === "duration" && (
//               <div className="mt-3 flex gap-3">
//                 <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)} className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
//                 <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white">
//                   <option>Minutes</option><option>Hours</option><option>Days</option><option>Weeks</option><option>Months</option><option>Years</option>
//                 </select>
//               </div>
//             )}
//           </div>

//           {/* Email notification */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-300">Email Notification (comma separated)</label>
//             <input type="text" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="user1@example.com, user2@example.com" className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
//             <p className="mt-1 text-xs text-gray-400">Notification emails will be sent (integration coming soon)</p>
//           </div>

//           {/* Products */}
//           <div>
//             <div className="mb-2 flex items-center justify-between">
//               <label className="text-sm font-medium text-gray-300">Products</label>
//               <AddProductsDropdown availableProducts={availableProducts} existingProductNames={existingProductNames} onAddProducts={handleAddProducts} />
//             </div>
//             <div className="rounded-md border border-dark-700">
//               <div className="grid grid-cols-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400"><span>Product Name</span><span>Status</span></div>
//               {products.length === 0 ? (
//                 <div className="px-4 py-6 text-center text-sm text-gray-400">No products added. Click "+ Add Products" to associate.</div>
//               ) : (
//                 products.map((product) => (
//                   <div key={product.name} className="grid grid-cols-2 items-center border-b border-dark-700 px-4 py-2">
//                     <div className="flex items-center justify-between"><span className="text-sm text-white">{product.name}</span></div>
//                     <div className="flex gap-2"><span className="text-xs text-green-400">Approved</span><button onClick={() => removeProduct(product.name)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//         <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
//           <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">Cancel</button>
//           <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50">
//             {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Credential"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ---------- Key Rotation Modal (creates new credential with label) ----------
// const KeyRotationModal = ({ isOpen, onClose, onRotate, credential, allProducts = [], orgName, developerId, appName, setToast, credentialIndex }) => {
//   const [expiryType, setExpiryType] = useState("never");
//   const [dateValue, setDateValue] = useState("");
//   const [durationValue, setDurationValue] = useState(1);
//   const [durationUnit, setDurationUnit] = useState("Days");
//   const [dateError, setDateError] = useState("");
//   const [products, setProducts] = useState(() => {
//     const current = credential?.apiProducts || [];
//     return current.map(p => ({ name: p.apiproduct || p.name, status: p.status || "APPROVED" }));
//   });
//   const [selectedProductNames, setSelectedProductNames] = useState([]);
//   const [selectAll, setSelectAll] = useState(false);
//   const [emails, setEmails] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const expiryOptions = [
//     { value: "never", label: "Never" },
//     { value: "date", label: "Date" },
//     { value: "duration", label: "Duration" },
//   ];

//   useEffect(() => {
//     if (products.length === 0) setSelectAll(false);
//     else setSelectAll(selectedProductNames.length === products.length);
//   }, [selectedProductNames, products]);

//   if (!isOpen) return null;

//   const handleAddProducts = (newProductNames) => {
//     const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
//     setProducts(prev => [...prev, ...newProducts]);
//   };
//   const handleStatusChange = (productName, newStatus) => {
//     setProducts(prev => prev.map(p => p.name === productName ? { ...p, status: newStatus } : p));
//   };
//   const handleRemoveProduct = (productName) => {
//     setProducts(prev => prev.filter(p => p.name !== productName));
//     setSelectedProductNames(prev => prev.filter(name => name !== productName));
//   };
//   const handleBulkAction = (action) => {
//     if (selectedProductNames.length === 0) return;
//     if (action === "remove") {
//       setProducts(prev => prev.filter(p => !selectedProductNames.includes(p.name)));
//       setSelectedProductNames([]);
//     } else {
//       setProducts(prev => prev.map(p => selectedProductNames.includes(p.name) ? { ...p, status: action === "approve" ? "APPROVED" : "REVOKED" } : p));
//     }
//   };
//   const toggleSelectProduct = (productName) => {
//     setSelectedProductNames(prev => prev.includes(productName) ? prev.filter(n => n !== productName) : [...prev, productName]);
//   };
//   const toggleSelectAll = () => {
//     if (selectAll) setSelectedProductNames([]);
//     else setSelectedProductNames(products.map(p => p.name));
//   };
//   const existingProductNames = products.map(p => p.name);

//   const handleSubmit = async () => {
//     if (expiryType === "date" && !dateValue) { setDateError("Date is required"); return; }
//     if (expiryType === "date") {
//       const selectedDate = new Date(dateValue);
//       if (selectedDate <= new Date()) { setDateError("Date must be in the future"); return; }
//     }
//     let expiresInSeconds = getExpiresInSeconds(expiryType, dateValue, durationValue, durationUnit);
//     setSubmitting(true);
//     try {
//       // Step 1: Create key with attributes (label)
//       const createPayload = {};
//       if (expiresInSeconds) createPayload.expiresInSeconds = expiresInSeconds;
//       createPayload.attributes = [{ name: `Credential ${credentialIndex + 1} rotated`, value: "rotated" }];
//       const createRes = await apigeeApiFetch(
//         APIGEE_ENDPOINTS.APP_CREDENTIALS.CREATE_KEY(orgName, developerId, appName),
//         { method: "POST", body: JSON.stringify(createPayload) }
//       );
//       if (!createRes.ok) throw new Error(await createRes.text());
//       const keyData = await createRes.json();
//       const consumerKey = keyData.consumerKey;

//       // Step 2: Attach products (only approved ones)
//       const approvedProducts = products.filter(p => p.status === "APPROVED").map(p => p.name);
//       if (approvedProducts.length > 0) {
//         const attachRes = await apigeeApiFetch(
//           APIGEE_ENDPOINTS.APP_CREDENTIALS.ATTACH_PRODUCTS(orgName, developerId, appName, consumerKey),
//           { method: "POST", body: JSON.stringify({ apiProducts: approvedProducts }) }
//         );
//         if (!attachRes.ok) throw new Error(await attachRes.text());
//       }

//       const finalData = { ...keyData, apiProducts: products.map(p => ({ apiproduct: p.name, status: p.status })) };
//       const rotatedCredential = {
//         ...credential,
//         consumerKey: finalData.consumerKey,
//         consumerSecret: finalData.consumerSecret,
//         issuedAt: finalData.issuedAt ? parseInt(finalData.issuedAt) : Date.now(),
//         expiresAt: finalData.expiresAt ? parseInt(finalData.expiresAt) : null,
//         apiProducts: products.map(p => ({ apiproduct: p.name, status: p.status })),
//         status: finalData.status,
//       };
//       onRotate(rotatedCredential);
//       setToast({ message: `Key rotated successfully${emails ? " and email notifications sent" : ""}`, type: "success" });
//       onClose();
//       // reset
//       setExpiryType("never"); setDateValue(""); setDurationValue(1); setDurationUnit("Days");
//       setSelectedProductNames([]); setEmails("");
//     } catch (err) {
//       console.error(err);
//       setToast({ message: `Rotation failed: ${err.message}`, type: "error" });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
//       <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
//         <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
//           <h3 className="text-base font-semibold text-white">Key Rotation</h3>
//           <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"><X size={16} /></button>
//         </div>
//         <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
//           {/* Expiry */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
//             <ExpiryTypeDropdown value={expiryType} onChange={setExpiryType} options={expiryOptions} />
//             {expiryType === "date" && (
//               <div className="mt-3">
//                 <input type="date" value={dateValue} onChange={(e) => { setDateValue(e.target.value); setDateError(""); }} className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
//                 {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
//               </div>
//             )}
//             {expiryType === "duration" && (
//               <div className="mt-3 flex gap-3">
//                 <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)} className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
//                 <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white">
//                   <option>Minutes</option><option>Hours</option><option>Days</option><option>Weeks</option><option>Months</option><option>Years</option>
//                 </select>
//               </div>
//             )}
//           </div>

//           {/* Email notification */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-gray-300">Email Notification (comma separated)</label>
//             <input type="text" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="user1@example.com, user2@example.com" className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white" />
//           </div>

//           {/* Products with bulk actions */}
//           <div>
//             <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
//               <label className="text-sm font-medium text-gray-300">Products</label>
//               <div className="flex gap-2">
//                 <AddProductsDropdown availableProducts={allProducts} existingProductNames={existingProductNames} onAddProducts={handleAddProducts} />
//                 <button onClick={() => handleBulkAction("approve")} disabled={selectedProductNames.length === 0} className="rounded-md bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-40">Approve</button>
//                 <button onClick={() => handleBulkAction("revoke")} disabled={selectedProductNames.length === 0} className="rounded-md bg-yellow-600/20 px-3 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-600/30 disabled:opacity-40">Revoke</button>
//                 <button onClick={() => handleBulkAction("remove")} disabled={selectedProductNames.length === 0} className="rounded-md bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-40">Remove</button>
//               </div>
//             </div>
//             <div className="rounded-md border border-dark-700">
//               <div className="grid grid-cols-12 gap-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400">
//                 <div className="col-span-1 flex items-center gap-1"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded border-dark-600 bg-dark-800 text-primary" /></div>
//                 <div className="col-span-6">Product</div><div className="col-span-3">Status</div><div className="col-span-2">Actions</div>
//               </div>
//               {products.length === 0 ? (
//                 <div className="px-4 py-6 text-center text-sm text-gray-400">No products associated. Click "+ Add Products" to add.</div>
//               ) : (
//                 products.map((product) => (
//                   <div key={product.name} className="grid grid-cols-12 items-center gap-2 border-b border-dark-700 px-4 py-2">
//                     <div className="col-span-1"><input type="checkbox" checked={selectedProductNames.includes(product.name)} onChange={() => toggleSelectProduct(product.name)} className="rounded border-dark-600 bg-dark-800 text-primary" /></div>
//                     <div className="col-span-6 text-sm text-white">{product.name}</div>
//                     <div className="col-span-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.status === "APPROVED" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{product.status === "APPROVED" ? "Approved" : "Revoked"}</span></div>
//                     <div className="col-span-2 flex gap-2">
//                       {product.status !== "APPROVED" && <button onClick={() => handleStatusChange(product.name, "APPROVED")} className="text-green-400 hover:text-green-300"><CheckCircle size={16} /></button>}
//                       {product.status !== "REVOKED" && <button onClick={() => handleStatusChange(product.name, "REVOKED")} className="text-yellow-400 hover:text-yellow-300"><XCircle size={16} /></button>}
//                       <button onClick={() => handleRemoveProduct(product.name)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//         <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
//           <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">Cancel</button>
//           <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50">
//             {submitting ? <Loader2 size={16} className="animate-spin" /> : "Rotate Keys"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ---------- Main Component ----------
// export default function AppCredentialsModal({
//   isOpen, onClose, data, isLoading, error, onRefresh, availableProducts = [],
//   orgName, developerId, appName, setToast
// }) {
//   const [visibleSecrets, setVisibleSecrets] = useState({});
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showRotationModal, setShowRotationModal] = useState(false);
//   const [selectedCredential, setSelectedCredential] = useState(null);
//   const [selectedIndex, setSelectedIndex] = useState(0);

//   if (!isOpen) return null;
//   const credentials = Array.isArray(data?.credentials) ? data.credentials : [];

//   const toggleVisibleSecret = (key) => setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
//   const renderMaskedValue = (key, value) => {
//     const isVisible = visibleSecrets[key];
//     const displayValue = isVisible ? formatValue(value) : "••••••••••••••••";
//     return (
//       <span className="col-span-2 flex min-w-0 items-center gap-2">
//         <span className="min-w-0 flex-1 break-all text-sm font-medium text-white">{displayValue}</span>
//         <button type="button" onClick={() => toggleVisibleSecret(key)} className="shrink-0 rounded-md border border-dark-600 p-1.5 text-gray-400 hover:border-primary hover:text-primary">
//           {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
//         </button>
//       </span>
//     );
//   };

//   const handleAddCredential = async (newCredential) => {
//     if (onRefresh) await onRefresh();
//     else console.log("Credential added", newCredential);
//   };
//   const handleRotateCredential = async (rotatedCredential) => {
//     if (onRefresh) await onRefresh();
//     else console.log("Credential rotated", rotatedCredential);
//   };

//   return (
//     <>
//       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
//         <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
//           <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
//             <div><h3 className="text-base font-semibold text-white">App Credentials</h3><p className="text-xs text-gray-400">{data?.name || "Fetched from Apigee"}</p></div>
//             <div className="flex items-center gap-2">
//               <button onClick={() => setShowAddModal(true)} className="rounded-lg flex items-center gap-2 bg-orange-600 px-2 py-2 text-sm text-white hover:bg-orange-700"><Plus size={14} /> Add Credential</button>
//               <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"><X size={16} /></button>
//             </div>
//           </div>
//           <div className="max-h-[70vh] overflow-y-auto p-5">
//             {isLoading ? (
//               <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400"><Loader2 size={18} className="animate-spin" /> Loading credentials...</div>
//             ) : error ? (
//               <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
//             ) : credentials.length === 0 ? (
//               <div className="rounded-lg border border-dark-700 px-4 py-8 text-center text-sm text-gray-400">No credentials found for this app.</div>
//             ) : (
//               <div className="space-y-4">
//                 {credentials.map((credential, index) => {
//                   const expiryInfo = getTimeRemaining(credential.expiresAt);
//                   return (
//                     <div key={credential.consumerKey || index} className="rounded-lg border border-dark-700 bg-dark-800/30">
//                       <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
//                         <span className="text-sm font-semibold text-white">Credential {index + 1}</span>
//                         <div className="flex items-center gap-2">
//                           <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{formatValue(credential.status)}</span>
//                           <button onClick={() => { setSelectedCredential(credential); setSelectedIndex(index); setShowRotationModal(true); }} className="flex items-center gap-1 rounded-md border border-dark-600 bg-dark-700 px-2 py-1 text-xs text-gray-300 hover:border-primary hover:text-primary"><RotateCw size={12} /> Key Rotation</button>
//                         </div>
//                       </div>
//                       <div className="divide-y divide-dark-700">
//                         {[
//                           ["Consumer Key", credential.consumerKey, true],
//                           ["Consumer Secret", credential.consumerSecret, true],
//                           ["Expires", formatDate(credential.expiresAt), false],
//                           ["Issued", formatDate(credential.issuedAt), false],
//                           ["Scopes", credential.scopes, false],
//                         ].map(([label, value, shouldMask]) => (
//                           <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
//                             <span className="text-sm text-gray-400">{label}</span>
//                             {shouldMask ? renderMaskedValue(`${index}-${label}`, value) : (
//                               <div className="col-span-2 flex items-center justify-between">
//                                 <span className="break-all text-sm font-medium text-white">{formatValue(value)}</span>
//                                 {label === "Expires" && credential.expiresAt && (
//                                   <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${expiryInfo.isExpiringSoon ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
//                                     {expiryInfo.text}
//                                   </span>
//                                 )}
//                               </div>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                       {Array.isArray(credential.apiProducts) && credential.apiProducts.length > 0 && (
//                         <div className="border-t border-dark-700 px-4 py-3">
//                           <p className="mb-2 text-sm text-gray-400">API Products</p>
//                           <div className="flex flex-wrap gap-2">
//                             {credential.apiProducts.map((product, productIndex) => (
//                               <span key={`${formatValue(product?.apiproduct || product?.name || product)}-${productIndex}`} className="rounded-full border border-dark-600 bg-[#0f172a] px-2 py-1 text-xs text-gray-200">
//                                 {formatValue(product?.apiproduct || product?.name || product)}
//                               </span>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//           <div className="flex justify-end border-t border-dark-700 px-5 py-4">
//             <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">Close</button>
//           </div>
//         </div>
//       </div>

//       <AddCredentialModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddCredential} availableProducts={availableProducts} orgName={orgName} developerId={developerId} appName={appName} setToast={setToast} />
//       {selectedCredential && (
//         <KeyRotationModal isOpen={showRotationModal} onClose={() => { setShowRotationModal(false); setSelectedCredential(null); }} onRotate={handleRotateCredential} credential={selectedCredential} allProducts={availableProducts} orgName={orgName} developerId={developerId} appName={appName} setToast={setToast} credentialIndex={selectedIndex} />
//       )}
//     </>
//   );
// }
//end
// import { Eye, EyeOff, Loader2, X, Plus, RotateCw, CheckCircle, XCircle, Trash2, ChevronDown } from "lucide-react";
// import { useState, useRef, useEffect } from "react";
// import { apigeeApiFetch } from "../../../../services/apigeeApiService";
// import { APIGEE_ENDPOINTS } from "../../../../config/apigeeConfig";

// const formatValue = (value) => {
//     if (value === undefined || value === null || value === "") return "-";
//     if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
//     if (typeof value === "object") return JSON.stringify(value);
//     return String(value);
// };

// const formatDate = (value) => {
//     if (!value || Number(value) < 0) return "Never";
//     const date = new Date(Number(value));
//     return Number.isNaN(date.getTime()) ? formatValue(value) : date.toLocaleString();
// };

// const computeDurationExpiry = (value, unit) => {
//     const now = Date.now();
//     const multipliers = {
//         Minutes: 60 * 1000,
//         Hours: 60 * 60 * 1000,
//         Days: 24 * 60 * 60 * 1000,
//         Weeks: 7 * 24 * 60 * 60 * 1000,
//         Months: 30 * 24 * 60 * 60 * 1000,
//         Years: 365 * 24 * 60 * 60 * 1000,
//     };
//     const multiplier = multipliers[unit] || multipliers.Minutes;
//     return now + value * multiplier;
// };

// const getExpiresInSeconds = (expiryType, dateValue, durationValue, durationUnit) => {
//     if (expiryType === "never") return undefined;
//     if (expiryType === "date") {
//         const selectedDate = new Date(dateValue);
//         const diffSeconds = Math.floor((selectedDate.getTime() - Date.now()) / 1000);
//         return diffSeconds > 0 ? diffSeconds.toString() : undefined;
//     }
//     if (expiryType === "duration") {
//         const multipliersSec = {
//             Minutes: 60,
//             Hours: 3600,
//             Days: 86400,
//             Weeks: 604800,
//             Months: 2592000,
//             Years: 31536000,
//         };
//         const totalSeconds = durationValue * multipliersSec[durationUnit];
//         return totalSeconds.toString();
//     }
//     return undefined;
// };

// // Dropdown component for expiry type
// const ExpiryTypeDropdown = ({ value, onChange, options }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const dropdownRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 setIsOpen(false);
//             }
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const selectedOption = options.find(opt => opt.value === value) || options[0];

//     return (
//         <div className="relative" ref={dropdownRef}>
//             <button
//                 type="button"
//                 onClick={() => setIsOpen(!isOpen)}
//                 className="flex w-full items-center justify-between rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//             >
//                 <span>{selectedOption.label}</span>
//                 <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
//             </button>
//             {isOpen && (
//                 <div className="absolute z-20 mt-1 w-full rounded-md border border-dark-600 bg-dark-800 shadow-lg">
//                     {options.map((option) => (
//                         <button
//                             key={option.value}
//                             type="button"
//                             onClick={() => {
//                                 onChange(option.value);
//                                 setIsOpen(false);
//                             }}
//                             className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-dark-700"
//                         >
//                             {option.label}
//                         </button>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// };

// // Add Products Dropdown component
// const AddProductsDropdown = ({ availableProducts, existingProductNames, onAddProducts }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const [selectedProducts, setSelectedProducts] = useState([]);
//     const dropdownRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 setIsOpen(false);
//                 setSelectedProducts([]);
//             }
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const available = availableProducts.filter(p => !existingProductNames.includes(p));
//     const toggleProduct = (product) => {
//         setSelectedProducts(prev =>
//             prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
//         );
//     };

//     const handleAdd = () => {
//         if (selectedProducts.length) {
//             onAddProducts(selectedProducts);
//             setSelectedProducts([]);
//             setIsOpen(false);
//         }
//     };

//     return (
//         <div className="relative" ref={dropdownRef}>
//             <button
//                 type="button"
//                 onClick={() => setIsOpen(!isOpen)}
//                 className="flex items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
//             >
//                 <Plus size={14} />
//                 Add Products
//             </button>
//             {isOpen && (
//                 <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-dark-600 bg-dark-800 shadow-xl">
//                     <div className="border-b border-dark-700 px-3 py-2 text-xs font-medium text-gray-400">
//                         Select products to add
//                     </div>
//                     <div className="max-h-48 overflow-y-auto p-2">
//                         {available.length === 0 ? (
//                             <div className="px-2 py-3 text-center text-xs text-gray-400">No more products available</div>
//                         ) : (
//                             available.map(product => (
//                                 <label key={product} className="flex items-center gap-2 px-2 py-1.5 hover:bg-dark-700 rounded">
//                                     <input
//                                         type="checkbox"
//                                         checked={selectedProducts.includes(product)}
//                                         onChange={() => toggleProduct(product)}
//                                         className="rounded border-dark-600 bg-dark-800 text-primary"
//                                     />
//                                     <span className="text-sm text-white">{product}</span>
//                                 </label>
//                             ))
//                         )}
//                     </div>
//                     <div className="border-t border-dark-700 p-2">
//                         <button
//                             onClick={handleAdd}
//                             disabled={selectedProducts.length === 0}
//                             className="w-full rounded bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
//                         >
//                             Add Selected ({selectedProducts.length})
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// // Add Credential Modal Component
// const AddCredentialModal = ({ isOpen, onClose, onAdd, availableProducts = [], orgName, developerId, appName }) => {
//     const [expiryType, setExpiryType] = useState("never");
//     const [dateValue, setDateValue] = useState("");
//     const [durationValue, setDurationValue] = useState(1);
//     const [durationUnit, setDurationUnit] = useState("Days");
//     const [products, setProducts] = useState([]);
//     const [dateError, setDateError] = useState("");
//     const [submitting, setSubmitting] = useState(false);

//     if (!isOpen) return null;

//     const expiryOptions = [
//         { value: "never", label: "Never" },
//         { value: "date", label: "Date" },
//         { value: "duration", label: "Duration" },
//     ];

//     const handleAddProducts = (newProductNames) => {
//         const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
//         setProducts(prev => [...prev, ...newProducts]);
//     };

//     const removeProduct = (productName) => {
//         setProducts(prev => prev.filter(p => p.name !== productName));
//     };

//     const existingProductNames = products.map(p => p.name);

//     const handleSubmit = async () => {
//         let expiresInSeconds = getExpiresInSeconds(expiryType, dateValue, durationValue, durationUnit);
//         if (expiryType === "date" && !dateValue) {
//             setDateError("Date is required");
//             return;
//         }
//         if (expiryType === "date") {
//             const selectedDate = new Date(dateValue);
//             if (selectedDate <= new Date()) {
//                 setDateError("Date must be in the future");
//                 return;
//             }
//         }
//         if (expiryType === "duration" && (!durationValue || durationValue <= 0)) return;
//         if (products.length === 0) {
//             alert("Please add at least one product");
//             return;
//         }

//         setSubmitting(true);
//         try {
//             const payload = {
//                 apiProducts: products.map(p => p.name),
//                 consumerKey: `ck-${Math.random().toString(36).substring(2, 10)}`,
//                 consumerSecret: `cs-${Math.random().toString(36).substring(2, 10)}`,
//             };
//             if (expiresInSeconds) payload.expiresInSeconds = expiresInSeconds;

//             const response = await apigeeApiFetch(
//                 APIGEE_ENDPOINTS.APP_CREDENTIALS.CREATE(orgName, developerId, appName),
//                 {
//                     method: "POST",
//                     body: JSON.stringify(payload),
//                 }
//             );

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 throw new Error(`Failed to create credential: ${response.status} ${errorText}`);
//             }

//             const newKey = await response.json();
//             const newCredential = {
//                 consumerKey: newKey.consumerKey,
//                 consumerSecret: newKey.consumerSecret,
//                 status: newKey.status || "APPROVED",
//                 issuedAt: newKey.issuedAt ? parseInt(newKey.issuedAt) : Date.now(),
//                 expiresAt: newKey.expiresAt ? parseInt(newKey.expiresAt) : null,
//                 apiProducts: (newKey.apiProducts || []).map(p => ({ apiproduct: p.apiproduct, status: p.status })),
//                 scopes: newKey.scopes || [],
//             };
//             onAdd(newCredential);
//             onClose();
//             setExpiryType("never");
//             setDateValue("");
//             setDurationValue(1);
//             setDurationUnit("Days");
//             setProducts([]);
//             setDateError("");
//         } catch (err) {
//             console.error(err);
//             alert(`Error adding credential: ${err.message}`);
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
//             <div className="w-full max-w-2xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
//                 <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
//                     <h3 className="text-base font-semibold text-white">Add Credential</h3>
//                     <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white">
//                         <X size={16} />
//                     </button>
//                 </div>

//                 <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
//                     {/* Expiry Section with Dropdown */}
//                     <div>
//                         <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
//                         <ExpiryTypeDropdown
//                             value={expiryType}
//                             onChange={setExpiryType}
//                             options={expiryOptions}
//                         />
//                         {expiryType === "date" && (
//                             <div className="mt-3">
//                                 <input
//                                     type="date"
//                                     value={dateValue}
//                                     onChange={(e) => { setDateValue(e.target.value); setDateError(""); }}
//                                     className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//                                 />
//                                 {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
//                                 <p className="mt-1 text-xs text-gray-400">Requires a date in the future</p>
//                             </div>
//                         )}
//                         {expiryType === "duration" && (
//                             <div className="mt-3 flex gap-3">
//                                 <input
//                                     type="number"
//                                     min="1"
//                                     value={durationValue}
//                                     onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
//                                     className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//                                 />
//                                 <select
//                                     value={durationUnit}
//                                     onChange={(e) => setDurationUnit(e.target.value)}
//                                     className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//                                 >
//                                     <option>Minutes</option>
//                                     <option>Hours</option>
//                                     <option>Days</option>
//                                     <option>Weeks</option>
//                                     <option>Months</option>
//                                     <option>Years</option>
//                                 </select>
//                             </div>
//                         )}
//                     </div>

//                     {/* Products Section with Add Products button */}
//                     <div>
//                         <div className="mb-2 flex items-center justify-between">
//                             <label className="text-sm font-medium text-gray-300">Products</label>
//                             <AddProductsDropdown
//                                 availableProducts={availableProducts}
//                                 existingProductNames={existingProductNames}
//                                 onAddProducts={handleAddProducts}
//                             />
//                         </div>
//                         <div className="rounded-md border border-dark-700">
//                             <div className="grid grid-cols-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400">
//                                 <span>Product Name</span>
//                                 <span>Status</span>
//                             </div>
//                             {products.length === 0 ? (
//                                 <div className="px-4 py-6 text-center text-sm text-gray-400">
//                                     No products added. Click "+ Add Products" to associate.
//                                 </div>
//                             ) : (
//                                 products.map((product) => (
//                                     <div key={product.name} className="grid grid-cols-2 items-center border-b border-dark-700 px-4 py-2">
//                                         <div className="flex items-center justify-between">
//                                             <span className="text-sm text-white">{product.name}</span>
//                                         </div>
//                                         <div className="flex gap-2">
//                                             <span className="text-xs text-green-400">Approved</span>
//                                             <button
//                                                 onClick={() => removeProduct(product.name)}
//                                                 className="text-red-400 hover:text-red-300"
//                                                 title="Remove"
//                                             >
//                                                 <Trash2 size={14} />
//                                             </button>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>
//                     </div>
//                 </div>

//                 <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
//                     <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">
//                         Cancel
//                     </button>
//                     <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50">
//                         {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Credential"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // Key Rotation Modal Component
// const KeyRotationModal = ({ isOpen, onClose, onRotate, credential, allProducts = [], orgName, developerId, appName }) => {
//     const [expiryType, setExpiryType] = useState("never");
//     const [dateValue, setDateValue] = useState("");
//     const [durationValue, setDurationValue] = useState(1);
//     const [durationUnit, setDurationUnit] = useState("Days");
//     const [dateError, setDateError] = useState("");
//     const [products, setProducts] = useState(() => {
//         const current = credential?.apiProducts || [];
//         return current.map(p => ({
//             name: p.apiproduct || p.name,
//             status: p.status || "APPROVED"
//         }));
//     });
//     const [selectedProductNames, setSelectedProductNames] = useState([]);
//     const [selectAll, setSelectAll] = useState(false);
//     const [submitting, setSubmitting] = useState(false);

//     const expiryOptions = [
//         { value: "never", label: "Never" },
//         { value: "date", label: "Date" },
//         { value: "duration", label: "Duration" },
//     ];

//     useEffect(() => {
//         if (products.length === 0) {
//             setSelectAll(false);
//             return;
//         }
//         setSelectAll(selectedProductNames.length === products.length);
//     }, [selectedProductNames, products]);

//     if (!isOpen) return null;

//     const handleAddProducts = (newProductNames) => {
//         const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
//         setProducts(prev => [...prev, ...newProducts]);
//     };

//     const handleStatusChange = (productName, newStatus) => {
//         setProducts(prev =>
//             prev.map(p =>
//                 p.name === productName ? { ...p, status: newStatus } : p
//             )
//         );
//     };

//     const handleRemoveProduct = (productName) => {
//         setProducts(prev => prev.filter(p => p.name !== productName));
//         setSelectedProductNames(prev => prev.filter(name => name !== productName));
//     };

//     const handleBulkAction = (action) => {
//         if (selectedProductNames.length === 0) return;
//         if (action === "remove") {
//             setProducts(prev => prev.filter(p => !selectedProductNames.includes(p.name)));
//             setSelectedProductNames([]);
//         } else {
//             setProducts(prev =>
//                 prev.map(p =>
//                     selectedProductNames.includes(p.name)
//                         ? { ...p, status: action === "approve" ? "APPROVED" : "REVOKED" }
//                         : p
//                 )
//             );
//         }
//     };

//     const toggleSelectProduct = (productName) => {
//         setSelectedProductNames(prev =>
//             prev.includes(productName)
//                 ? prev.filter(name => name !== productName)
//                 : [...prev, productName]
//         );
//     };

//     const toggleSelectAll = () => {
//         if (selectAll) {
//             setSelectedProductNames([]);
//         } else {
//             setSelectedProductNames(products.map(p => p.name));
//         }
//     };

//     const existingProductNames = products.map(p => p.name);

//     const updateProductStatus = async (productName, status) => {
//         const action = status === "APPROVED" ? "APPROVE" : "REVOKE";
//         const { url, method } = APIGEE_ENDPOINTS.APP_CREDENTIALS.UPDATE_PRODUCT_STATUS(
//             orgName, developerId, appName, credential.consumerKey, productName, action
//         );
//         const response = await apigeeApiFetch(url, { method });
//         if (!response.ok) throw new Error(`Failed to update product ${productName}`);
//     };

//     const handleSubmit = async () => {
//         let expiresInSeconds = getExpiresInSeconds(expiryType, dateValue, durationValue, durationUnit);
//         if (expiryType === "date" && !dateValue) {
//             setDateError("Date is required");
//             return;
//         }
//         if (expiryType === "date") {
//             const selectedDate = new Date(dateValue);
//             if (selectedDate <= new Date()) {
//                 setDateError("Date must be in the future");
//                 return;
//             }
//         }
//         if (expiryType === "duration" && (!durationValue || durationValue <= 0)) return;

//         setSubmitting(true);
//         try {
//             // 1. Update product statuses (if changed)
//             const originalProducts = credential.apiProducts || [];
//             for (const product of products) {
//                 const original = originalProducts.find(p => (p.apiproduct || p.name) === product.name);
//                 if (original && original.status !== product.status) {
//                     await updateProductStatus(product.name, product.status);
//                 }
//             }
//             // 2. Remove products that were deleted
//             for (const original of originalProducts) {
//                 const stillExists = products.find(p => p.name === (original.apiproduct || original.name));
//                 if (!stillExists) {
//                     const { url, method } = APIGEE_ENDPOINTS.APP_CREDENTIALS.UPDATE_PRODUCT_STATUS(
//                         orgName, developerId, appName, credential.consumerKey, original.apiproduct || original.name, 'DELETE'
//                     );
//                     await apigeeApiFetch(url, { method });
//                 }
//             }
//             // 3. Add new products
//             for (const product of products) {
//                 const original = originalProducts.find(p => (p.apiproduct || p.name) === product.name);
//                 if (!original) {
//                     const { url, method } = APIGEE_ENDPOINTS.APP_CREDENTIALS.UPDATE_PRODUCT_STATUS(
//                         orgName, developerId, appName, credential.consumerKey, product.name, 'APPROVE'
//                     );
//                     await apigeeApiFetch(url, { method });
//                 }
//             }

//             // 4. Rotate the key
//             // const rotateUrl = APIGEE_ENDPOINTS.APP_CREDENTIALS.ROTATE(orgName, developerId, appName, credential.consumerKey);
//             const rotateUrl = APIGEE_ENDPOINTS.APP_CREDENTIALS.ROTATE(orgName, developerId, appName);
//             const rotatePayload = expiresInSeconds ? { expiresInSeconds } : {};
//             const rotateRes = await apigeeApiFetch(rotateUrl, {
//                 method: "POST",
//                 body: JSON.stringify(rotatePayload),
//             });
//             if (!rotateRes.ok) throw new Error("Key rotation failed");
//             const rotatedKey = await rotateRes.json();
//             const rotatedCredential = {
//                 ...credential,
//                 consumerKey: rotatedKey.consumerKey,
//                 consumerSecret: rotatedKey.consumerSecret,
//                 issuedAt: rotatedKey.issuedAt ? parseInt(rotatedKey.issuedAt) : Date.now(),
//                 expiresAt: rotatedKey.expiresAt ? parseInt(rotatedKey.expiresAt) : null,
//                 apiProducts: products.map(p => ({ apiproduct: p.name, status: p.status })),
//                 status: rotatedKey.status,
//             };
//             onRotate(rotatedCredential);
//             onClose();
//             setExpiryType("never");
//             setDateValue("");
//             setDurationValue(1);
//             setDurationUnit("Days");
//             setSelectedProductNames([]);
//             setDateError("");
//         } catch (err) {
//             console.error(err);
//             alert(`Rotation failed: ${err.message}`);
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
//             <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
//                 <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
//                     <h3 className="text-base font-semibold text-white">Key Rotation</h3>
//                     <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white">
//                         <X size={16} />
//                     </button>
//                 </div>

//                 <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
//                     {/* Expiry Section with Dropdown */}
//                     <div>
//                         <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
//                         <ExpiryTypeDropdown
//                             value={expiryType}
//                             onChange={setExpiryType}
//                             options={expiryOptions}
//                         />
//                         {expiryType === "date" && (
//                             <div className="mt-3">
//                                 <input
//                                     type="date"
//                                     value={dateValue}
//                                     onChange={(e) => { setDateValue(e.target.value); setDateError(""); }}
//                                     className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//                                 />
//                                 {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
//                             </div>
//                         )}
//                         {expiryType === "duration" && (
//                             <div className="mt-3 flex gap-3">
//                                 <input
//                                     type="number"
//                                     min="1"
//                                     value={durationValue}
//                                     onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
//                                     className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//                                 />
//                                 <select
//                                     value={durationUnit}
//                                     onChange={(e) => setDurationUnit(e.target.value)}
//                                     className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
//                                 >
//                                     <option>Minutes</option>
//                                     <option>Hours</option>
//                                     <option>Days</option>
//                                     <option>Weeks</option>
//                                     <option>Months</option>
//                                     <option>Years</option>
//                                 </select>
//                             </div>
//                         )}
//                     </div>

//                     {/* Products Section with Add Products and Bulk Actions */}
//                     <div>
//                         <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
//                             <label className="text-sm font-medium text-gray-300">Products</label>
//                             <div className="flex gap-2">
//                                 <AddProductsDropdown
//                                     availableProducts={allProducts}
//                                     existingProductNames={existingProductNames}
//                                     onAddProducts={handleAddProducts}
//                                 />
//                                 <button
//                                     onClick={() => handleBulkAction("approve")}
//                                     disabled={selectedProductNames.length === 0}
//                                     className="rounded-md bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-40"
//                                 >
//                                     Approve
//                                 </button>
//                                 <button
//                                     onClick={() => handleBulkAction("revoke")}
//                                     disabled={selectedProductNames.length === 0}
//                                     className="rounded-md bg-yellow-600/20 px-3 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-600/30 disabled:opacity-40"
//                                 >
//                                     Revoke
//                                 </button>
//                                 <button
//                                     onClick={() => handleBulkAction("remove")}
//                                     disabled={selectedProductNames.length === 0}
//                                     className="rounded-md bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-40"
//                                 >
//                                     Remove
//                                 </button>
//                             </div>
//                         </div>
//                         <div className="rounded-md border border-dark-700">
//                             <div className="grid grid-cols-12 gap-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400">
//                                 <div className="col-span-1 flex items-center gap-1">
//                                     <input
//                                         type="checkbox"
//                                         checked={selectAll}
//                                         onChange={toggleSelectAll}
//                                         className="rounded border-dark-600 bg-dark-800 text-primary"
//                                     />
//                                 </div>
//                                 <div className="col-span-6">Product</div>
//                                 <div className="col-span-3">Status</div>
//                                 <div className="col-span-2">Actions</div>
//                             </div>
//                             {products.length === 0 ? (
//                                 <div className="px-4 py-6 text-center text-sm text-gray-400">
//                                     No products associated. Click "+ Add Products" to add.
//                                 </div>
//                             ) : (
//                                 products.map((product) => (
//                                     <div key={product.name} className="grid grid-cols-12 items-center gap-2 border-b border-dark-700 px-4 py-2">
//                                         <div className="col-span-1">
//                                             <input
//                                                 type="checkbox"
//                                                 checked={selectedProductNames.includes(product.name)}
//                                                 onChange={() => toggleSelectProduct(product.name)}
//                                                 className="rounded border-dark-600 bg-dark-800 text-primary"
//                                             />
//                                         </div>
//                                         <div className="col-span-6 text-sm text-white">{product.name}</div>
//                                         <div className="col-span-3">
//                                             <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
//                                                 product.status === "APPROVED" 
//                                                     ? "bg-green-500/20 text-green-400" 
//                                                     : "bg-red-500/20 text-red-400"
//                                             }`}>
//                                                 {product.status === "APPROVED" ? "Approved" : "Revoked"}
//                                             </span>
//                                         </div>
//                                         <div className="col-span-2 flex gap-2">
//                                             {product.status !== "APPROVED" && (
//                                                 <button
//                                                     onClick={() => handleStatusChange(product.name, "APPROVED")}
//                                                     className="text-green-400 hover:text-green-300"
//                                                     title="Approve"
//                                                 >
//                                                     <CheckCircle size={16} />
//                                                 </button>
//                                             )}
//                                             {product.status !== "REVOKED" && (
//                                                 <button
//                                                     onClick={() => handleStatusChange(product.name, "REVOKED")}
//                                                     className="text-yellow-400 hover:text-yellow-300"
//                                                     title="Revoke"
//                                                 >
//                                                     <XCircle size={16} />
//                                                 </button>
//                                             )}
//                                             <button
//                                                 onClick={() => handleRemoveProduct(product.name)}
//                                                 className="text-red-400 hover:text-red-300"
//                                                 title="Remove"
//                                             >
//                                                 <Trash2 size={16} />
//                                             </button>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>
//                     </div>
//                 </div>

//                 <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
//                     <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">
//                         Cancel
//                     </button>
//                     <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50">
//                         {submitting ? <Loader2 size={16} className="animate-spin" /> : "Rotate Keys"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // Main AppCredentialsModal Component
// export default function AppCredentialsModal({
//     isOpen,
//     onClose,
//     data,
//     isLoading,
//     error,
//     onRefresh,
//     availableProducts = [],
//     orgName,
//     developerId,
//     appName,
// }) {
//     const [visibleSecrets, setVisibleSecrets] = useState({});
//     const [showAddModal, setShowAddModal] = useState(false);
//     const [showRotationModal, setShowRotationModal] = useState(false);
//     const [selectedCredential, setSelectedCredential] = useState(null);

//     if (!isOpen) return null;

//     const credentials = Array.isArray(data?.credentials) ? data.credentials : [];

//     const toggleVisibleSecret = (key) => {
//         setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
//     };

//     const renderMaskedValue = (key, value) => {
//         const isVisible = visibleSecrets[key];
//         const displayValue = isVisible ? formatValue(value) : "••••••••••••••••";
//         return (
//             <span className="col-span-2 flex min-w-0 items-center gap-2">
//                 <span className="min-w-0 flex-1 break-all text-sm font-medium text-white">
//                     {displayValue}
//                 </span>
//                 <button
//                     type="button"
//                     onClick={() => toggleVisibleSecret(key)}
//                     className="shrink-0 rounded-md border border-dark-600 p-1.5 text-gray-400 hover:border-primary hover:text-primary"
//                     title={isVisible ? "Hide credential" : "View credential"}
//                 >
//                     {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
//                 </button>
//             </span>
//         );
//     };

//     const handleAddCredential = async (newCredential) => {
//         if (onRefresh) await onRefresh();
//         else console.log("Credential added (mock)", newCredential);
//     };

//     const handleRotateCredential = async (rotatedCredential) => {
//         if (onRefresh) await onRefresh();
//         else console.log("Credential rotated (mock)", rotatedCredential);
//     };

//     return (
//         <>
//             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
//                 <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
//                     <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
//                         <div>
//                             <h3 className="text-base font-semibold text-white">App Credentials</h3>
//                             <p className="text-xs text-gray-400">{data?.name || "Fetched from Apigee"}</p>
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <button
//                                 onClick={() => setShowAddModal(true)}
//                                 className="rounded-lg flex items-center gap-2 bg-orange-600 px-2 py-2 text-sm text-white hover:bg-orange-700"
//                             >
//                                 <Plus size={14} />
//                                 Add Credential
//                             </button>
//                             <button
//                                 onClick={onClose}
//                                 className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"
//                             >
//                                 <X size={16} />
//                             </button>
//                         </div>
//                     </div>

//                     <div className="max-h-[70vh] overflow-y-auto p-5">
//                         {isLoading ? (
//                             <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
//                                 <Loader2 size={18} className="animate-spin" />
//                                 Loading credentials...
//                             </div>
//                         ) : error ? (
//                             <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//                                 {error}
//                             </div>
//                         ) : credentials.length === 0 ? (
//                             <div className="rounded-lg border border-dark-700 px-4 py-8 text-center text-sm text-gray-400">
//                                 No credentials found for this app.
//                             </div>
//                         ) : (
//                             <div className="space-y-4">
//                                 {credentials.map((credential, index) => (
//                                     <div
//                                         key={credential.consumerKey || index}
//                                         className="rounded-lg border border-dark-700 bg-dark-800/30"
//                                     >
//                                         <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
//                                             <span className="text-sm font-semibold text-white">
//                                                 Credential {index + 1}
//                                             </span>
//                                             <div className="flex items-center gap-2">
//                                                 <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
//                                                     {formatValue(credential.status)}
//                                                 </span>
//                                                 <button
//                                                     onClick={() => {
//                                                         setSelectedCredential(credential);
//                                                         setShowRotationModal(true);
//                                                     }}
//                                                     className="flex items-center gap-1 rounded-md border border-dark-600 bg-dark-700 px-2 py-1 text-xs text-gray-300 hover:border-primary hover:text-primary"
//                                                 >
//                                                     <RotateCw size={12} />
//                                                     Key Rotation
//                                                 </button>
//                                             </div>
//                                         </div>

//                                         <div className="divide-y divide-dark-700">
//                                             {[
//                                                 ["Consumer Key", credential.consumerKey, true],
//                                                 ["Consumer Secret", credential.consumerSecret, true],
//                                                 ["Expires", formatDate(credential.expiresAt), false],
//                                                 ["Issued", formatDate(credential.issuedAt), false],
//                                                 ["Scopes", credential.scopes, false],
//                                             ].map(([label, value, shouldMask]) => (
//                                                 <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
//                                                     <span className="text-sm text-gray-400">{label}</span>
//                                                     {shouldMask ? (
//                                                         renderMaskedValue(`${index}-${label}`, value)
//                                                     ) : (
//                                                         <span className="col-span-2 break-all text-sm font-medium text-white">
//                                                             {formatValue(value)}
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             ))}
//                                         </div>

//                                         {Array.isArray(credential.apiProducts) && credential.apiProducts.length > 0 && (
//                                             <div className="border-t border-dark-700 px-4 py-3">
//                                                 <p className="mb-2 text-sm text-gray-400">API Products</p>
//                                                 <div className="flex flex-wrap gap-2">
//                                                     {credential.apiProducts.map((product, productIndex) => (
//                                                         <span
//                                                             key={`${formatValue(product?.apiproduct || product?.name || product)}-${productIndex}`}
//                                                             className="rounded-full border border-dark-600 bg-[#0f172a] px-2 py-1 text-xs text-gray-200"
//                                                         >
//                                                             {formatValue(product?.apiproduct || product?.name || product)}
//                                                         </span>
//                                                     ))}
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>

//                     <div className="flex justify-end border-t border-dark-700 px-5 py-4">
//                         <button
//                             onClick={onClose}
//                             className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600"
//                         >
//                             Close
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             <AddCredentialModal
//                 isOpen={showAddModal}
//                 onClose={() => setShowAddModal(false)}
//                 onAdd={handleAddCredential}
//                 availableProducts={availableProducts}
//                 orgName={orgName}
//                 developerId={developerId}
//                 appName={appName}
//             />

//             {selectedCredential && (
//                 <KeyRotationModal
//                     isOpen={showRotationModal}
//                     onClose={() => {
//                         setShowRotationModal(false);
//                         setSelectedCredential(null);
//                     }}
//                     onRotate={handleRotateCredential}
//                     credential={selectedCredential}
//                     allProducts={availableProducts}
//                     orgName={orgName}
//                     developerId={developerId}
//                     appName={appName}
//                 />
//             )}
//         </>
//     );
// }


// // import { Eye, EyeOff, Loader2, X, Plus, RotateCw, CheckCircle, XCircle, Trash2, ChevronDown } from "lucide-react";
// // import { useState, useRef, useEffect } from "react";

// // const formatValue = (value) => {
// //     if (value === undefined || value === null || value === "") return "-";
// //     if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
// //     if (typeof value === "object") return JSON.stringify(value);
// //     return String(value);
// // };

// // const formatDate = (value) => {
// //     if (!value || Number(value) < 0) return "Never";
// //     const date = new Date(Number(value));
// //     return Number.isNaN(date.getTime()) ? formatValue(value) : date.toLocaleString();
// // };

// // const computeDurationExpiry = (value, unit) => {
// //     const now = Date.now();
// //     const multipliers = {
// //         Minutes: 60 * 1000,
// //         Hours: 60 * 60 * 1000,
// //         Days: 24 * 60 * 60 * 1000,
// //         Weeks: 7 * 24 * 60 * 60 * 1000,
// //         Months: 30 * 24 * 60 * 60 * 1000,
// //         Years: 365 * 24 * 60 * 60 * 1000,
// //     };
// //     const multiplier = multipliers[unit] || multipliers.Minutes;
// //     return now + value * multiplier;
// // };

// // // Dropdown component for expiry type
// // const ExpiryTypeDropdown = ({ value, onChange, options }) => {
// //     const [isOpen, setIsOpen] = useState(false);
// //     const dropdownRef = useRef(null);

// //     useEffect(() => {
// //         const handleClickOutside = (event) => {
// //             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
// //                 setIsOpen(false);
// //             }
// //         };
// //         document.addEventListener("mousedown", handleClickOutside);
// //         return () => document.removeEventListener("mousedown", handleClickOutside);
// //     }, []);

// //     const selectedOption = options.find(opt => opt.value === value) || options[0];

// //     return (
// //         <div className="relative" ref={dropdownRef}>
// //             <button
// //                 type="button"
// //                 onClick={() => setIsOpen(!isOpen)}
// //                 className="flex w-full items-center justify-between rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //             >
// //                 <span>{selectedOption.label}</span>
// //                 <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
// //             </button>
// //             {isOpen && (
// //                 <div className="absolute z-20 mt-1 w-full rounded-md border border-dark-600 bg-dark-800 shadow-lg">
// //                     {options.map((option) => (
// //                         <button
// //                             key={option.value}
// //                             type="button"
// //                             onClick={() => {
// //                                 onChange(option.value);
// //                                 setIsOpen(false);
// //                             }}
// //                             className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-dark-700"
// //                         >
// //                             {option.label}
// //                         </button>
// //                     ))}
// //                 </div>
// //             )}
// //         </div>
// //     );
// // };

// // // Add Products Dropdown component
// // const AddProductsDropdown = ({ availableProducts, existingProductNames, onAddProducts }) => {
// //     const [isOpen, setIsOpen] = useState(false);
// //     const [selectedProducts, setSelectedProducts] = useState([]);
// //     const dropdownRef = useRef(null);

// //     useEffect(() => {
// //         const handleClickOutside = (event) => {
// //             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
// //                 setIsOpen(false);
// //                 setSelectedProducts([]);
// //             }
// //         };
// //         document.addEventListener("mousedown", handleClickOutside);
// //         return () => document.removeEventListener("mousedown", handleClickOutside);
// //     }, []);

// //     const available = availableProducts.filter(p => !existingProductNames.includes(p));
// //     const toggleProduct = (product) => {
// //         setSelectedProducts(prev =>
// //             prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
// //         );
// //     };

// //     const handleAdd = () => {
// //         if (selectedProducts.length) {
// //             onAddProducts(selectedProducts);
// //             setSelectedProducts([]);
// //             setIsOpen(false);
// //         }
// //     };

// //     return (
// //         <div className="relative" ref={dropdownRef}>
// //             <button
// //                 type="button"
// //                 onClick={() => setIsOpen(!isOpen)}
// //                 className="flex items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
// //             >
// //                 <Plus size={14} />
// //                 Add Products
// //             </button>
// //             {isOpen && (
// //                 <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-dark-600 bg-dark-800 shadow-xl">
// //                     <div className="border-b border-dark-700 px-3 py-2 text-xs font-medium text-gray-400">
// //                         Select products to add
// //                     </div>
// //                     <div className="max-h-48 overflow-y-auto p-2">
// //                         {available.length === 0 ? (
// //                             <div className="px-2 py-3 text-center text-xs text-gray-400">No more products available</div>
// //                         ) : (
// //                             available.map(product => (
// //                                 <label key={product} className="flex items-center gap-2 px-2 py-1.5 hover:bg-dark-700 rounded">
// //                                     <input
// //                                         type="checkbox"
// //                                         checked={selectedProducts.includes(product)}
// //                                         onChange={() => toggleProduct(product)}
// //                                         className="rounded border-dark-600 bg-dark-800 text-primary"
// //                                     />
// //                                     <span className="text-sm text-white">{product}</span>
// //                                 </label>
// //                             ))
// //                         )}
// //                     </div>
// //                     <div className="border-t border-dark-700 p-2">
// //                         <button
// //                             onClick={handleAdd}
// //                             disabled={selectedProducts.length === 0}
// //                             className="w-full rounded bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
// //                         >
// //                             Add Selected ({selectedProducts.length})
// //                         </button>
// //                     </div>
// //                 </div>
// //             )}
// //         </div>
// //     );
// // };

// // // Add Credential Modal Component
// // const AddCredentialModal = ({ isOpen, onClose, onAdd, availableProducts = [] }) => {
// //     const [expiryType, setExpiryType] = useState("never");
// //     const [dateValue, setDateValue] = useState("");
// //     const [durationValue, setDurationValue] = useState(1);
// //     const [durationUnit, setDurationUnit] = useState("Days");
// //     const [products, setProducts] = useState([]); // { name, status }
// //     const [dateError, setDateError] = useState("");

// //     if (!isOpen) return null;

// //     const expiryOptions = [
// //         { value: "never", label: "Never" },
// //         { value: "date", label: "Date" },
// //         { value: "duration", label: "Duration" },
// //     ];

// //     const handleAddProducts = (newProductNames) => {
// //         const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
// //         setProducts(prev => [...prev, ...newProducts]);
// //     };

// //     const removeProduct = (productName) => {
// //         setProducts(prev => prev.filter(p => p.name !== productName));
// //     };

// //     const existingProductNames = products.map(p => p.name);

// //     const handleSubmit = () => {
// //         let expiryTimestamp = null;
// //         if (expiryType === "date") {
// //             if (!dateValue) {
// //                 setDateError("Date is required");
// //                 return;
// //             }
// //             const selectedDate = new Date(dateValue);
// //             if (selectedDate <= new Date()) {
// //                 setDateError("Date must be in the future");
// //                 return;
// //             }
// //             expiryTimestamp = selectedDate.getTime();
// //         } else if (expiryType === "duration") {
// //             if (!durationValue || durationValue <= 0) {
// //                 return;
// //             }
// //             expiryTimestamp = computeDurationExpiry(durationValue, durationUnit);
// //         }

// //         const newCredential = {
// //             consumerKey: `ck_${Math.random().toString(36).substr(2, 8)}`,
// //             consumerSecret: `cs_${Math.random().toString(36).substr(2, 16)}`,
// //             status: "APPROVED",
// //             issuedAt: Date.now(),
// //             expiresAt: expiryTimestamp,
// //             apiProducts: products.map(p => ({ apiproduct: p.name, status: p.status })),
// //             scopes: [],
// //         };
// //         onAdd(newCredential);
// //         onClose();
// //         setExpiryType("never");
// //         setDateValue("");
// //         setDurationValue(1);
// //         setDurationUnit("Days");
// //         setProducts([]);
// //         setDateError("");
// //     };

// //     return (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
// //             <div className="w-full max-w-2xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
// //                 <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
// //                     <h3 className="text-base font-semibold text-white">Add Credential</h3>
// //                     <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white">
// //                         <X size={16} />
// //                     </button>
// //                 </div>

// //                 <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
// //                     {/* Expiry Section with Dropdown */}
// //                     <div>
// //                         <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
// //                         <ExpiryTypeDropdown
// //                             value={expiryType}
// //                             onChange={setExpiryType}
// //                             options={expiryOptions}
// //                         />
// //                         {expiryType === "date" && (
// //                             <div className="mt-3">
// //                                 <input
// //                                     type="date"
// //                                     value={dateValue}
// //                                     onChange={(e) => { setDateValue(e.target.value); setDateError(""); }}
// //                                     className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //                                 />
// //                                 {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
// //                                 <p className="mt-1 text-xs text-gray-400">Requires a date in the future</p>
// //                             </div>
// //                         )}
// //                         {expiryType === "duration" && (
// //                             <div className="mt-3 flex gap-3">
// //                                 <input
// //                                     type="number"
// //                                     min="1"
// //                                     value={durationValue}
// //                                     onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
// //                                     className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //                                 />
// //                                 <select
// //                                     value={durationUnit}
// //                                     onChange={(e) => setDurationUnit(e.target.value)}
// //                                     className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //                                 >
// //                                     <option>Minutes</option>
// //                                     <option>Hours</option>
// //                                     <option>Days</option>
// //                                     <option>Weeks</option>
// //                                     <option>Months</option>
// //                                     <option>Years</option>
// //                                 </select>
// //                             </div>
// //                         )}
// //                     </div>

// //                     {/* Products Section with Add Products button */}
// //                     <div>
// //                         <div className="mb-2 flex items-center justify-between">
// //                             <label className="text-sm font-medium text-gray-300">Products</label>
// //                             <AddProductsDropdown
// //                                 availableProducts={availableProducts}
// //                                 existingProductNames={existingProductNames}
// //                                 onAddProducts={handleAddProducts}
// //                             />
// //                         </div>
// //                         <div className="rounded-md border border-dark-700">
// //                             <div className="grid grid-cols-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400">
// //                                 <span>Product Name</span>
// //                                 <span>Status</span>
// //                             </div>
// //                             {products.length === 0 ? (
// //                                 <div className="px-4 py-6 text-center text-sm text-gray-400">
// //                                     No products added. Click "+ Add Products" to associate.
// //                                 </div>
// //                             ) : (
// //                                 products.map((product) => (
// //                                     <div key={product.name} className="grid grid-cols-2 items-center border-b border-dark-700 px-4 py-2">
// //                                         <div className="flex items-center justify-between">
// //                                             <span className="text-sm text-white">{product.name}</span>
// //                                         </div>
// //                                         <div className="flex gap-2">
// //                                         <span className="text-xs text-green-400">Approved</span>
// //                                             <button
// //                                                 onClick={() => removeProduct(product.name)}
// //                                                 className="text-red-400 hover:text-red-300"
// //                                                 title="Remove"
// //                                             >
// //                                                 <Trash2 size={14} />
// //                                             </button>
// //                                     </div>
// //                                     </div>
// //                                 ))
// //                             )}
// //                         </div>
// //                     </div>
// //                 </div>

// //                 <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
// //                     <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">
// //                         Cancel
// //                     </button>
// //                     <button onClick={handleSubmit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80">
// //                         Create Credential
// //                     </button>
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // };

// // // Key Rotation Modal Component
// // const KeyRotationModal = ({ isOpen, onClose, onRotate, credential, allProducts = [] }) => {
// //     const [expiryType, setExpiryType] = useState("never");
// //     const [dateValue, setDateValue] = useState("");
// //     const [durationValue, setDurationValue] = useState(1);
// //     const [durationUnit, setDurationUnit] = useState("Days");
// //     const [dateError, setDateError] = useState("");
// //     const [products, setProducts] = useState(() => {
// //         const current = credential?.apiProducts || [];
// //         return current.map(p => ({
// //             name: p.apiproduct || p.name,
// //             status: p.status || "APPROVED"
// //         }));
// //     });
// //     const [selectedProductNames, setSelectedProductNames] = useState([]);
// //     const [selectAll, setSelectAll] = useState(false);

// //     const expiryOptions = [
// //         { value: "never", label: "Never" },
// //         { value: "date", label: "Date" },
// //         { value: "duration", label: "Duration" },
// //     ];

// //     // Update selectAll when selectedProducts changes
// //     useEffect(() => {
// //         if (products.length === 0) {
// //             setSelectAll(false);
// //             return;
// //         }
// //         setSelectAll(selectedProductNames.length === products.length);
// //     }, [selectedProductNames, products]);

// //     if (!isOpen) return null;

// //     const handleAddProducts = (newProductNames) => {
// //         const newProducts = newProductNames.map(name => ({ name, status: "APPROVED" }));
// //         setProducts(prev => [...prev, ...newProducts]);
// //     };

// //     const handleStatusChange = (productName, newStatus) => {
// //         setProducts(prev =>
// //             prev.map(p =>
// //                 p.name === productName ? { ...p, status: newStatus } : p
// //             )
// //         );
// //     };

// //     const handleRemoveProduct = (productName) => {
// //         setProducts(prev => prev.filter(p => p.name !== productName));
// //         setSelectedProductNames(prev => prev.filter(name => name !== productName));
// //     };

// //     const handleBulkAction = (action) => {
// //         if (selectedProductNames.length === 0) return;
// //         if (action === "remove") {
// //             setProducts(prev => prev.filter(p => !selectedProductNames.includes(p.name)));
// //             setSelectedProductNames([]);
// //         } else {
// //             setProducts(prev =>
// //                 prev.map(p =>
// //                     selectedProductNames.includes(p.name)
// //                         ? { ...p, status: action === "approve" ? "APPROVED" : "REVOKED" }
// //                         : p
// //                 )
// //             );
// //         }
// //     };

// //     const toggleSelectProduct = (productName) => {
// //         setSelectedProductNames(prev =>
// //             prev.includes(productName)
// //                 ? prev.filter(name => name !== productName)
// //                 : [...prev, productName]
// //         );
// //     };

// //     const toggleSelectAll = () => {
// //         if (selectAll) {
// //             setSelectedProductNames([]);
// //         } else {
// //             setSelectedProductNames(products.map(p => p.name));
// //         }
// //     };

// //     const existingProductNames = products.map(p => p.name);

// //     const handleSubmit = () => {
// //         let expiryTimestamp = null;
// //         if (expiryType === "date") {
// //             if (!dateValue) {
// //                 setDateError("Date is required");
// //                 return;
// //             }
// //             const selectedDate = new Date(dateValue);
// //             if (selectedDate <= new Date()) {
// //                 setDateError("Date must be in the future");
// //                 return;
// //             }
// //             expiryTimestamp = selectedDate.getTime();
// //         } else if (expiryType === "duration") {
// //             if (!durationValue || durationValue <= 0) return;
// //             expiryTimestamp = computeDurationExpiry(durationValue, durationUnit);
// //         }

// //         const rotatedCredential = {
// //             ...credential,
// //             consumerKey: `ck_${Math.random().toString(36).substr(2, 8)}`,
// //             consumerSecret: `cs_${Math.random().toString(36).substr(2, 16)}`,
// //             issuedAt: Date.now(),
// //             expiresAt: expiryTimestamp,
// //             apiProducts: products.map(p => ({ apiproduct: p.name, status: p.status })),
// //             status: "APPROVED",
// //         };
// //         onRotate(rotatedCredential);
// //         onClose();
// //         setExpiryType("never");
// //         setDateValue("");
// //         setDurationValue(1);
// //         setDurationUnit("Days");
// //         setSelectedProductNames([]);
// //         setDateError("");
// //     };

// //     return (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
// //             <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
// //                 <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
// //                     <h3 className="text-base font-semibold text-white">Key Rotation</h3>
// //                     <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white">
// //                         <X size={16} />
// //                     </button>
// //                 </div>

// //                 <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
// //                     {/* Expiry Section with Dropdown */}
// //                     <div>
// //                         <label className="mb-2 block text-sm font-medium text-gray-300">Expiry</label>
// //                         <ExpiryTypeDropdown
// //                             value={expiryType}
// //                             onChange={setExpiryType}
// //                             options={expiryOptions}
// //                         />
// //                         {expiryType === "date" && (
// //                             <div className="mt-3">
// //                                 <input
// //                                     type="date"
// //                                     value={dateValue}
// //                                     onChange={(e) => { setDateValue(e.target.value); setDateError(""); }}
// //                                     className="w-full rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //                                 />
// //                                 {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
// //                             </div>
// //                         )}
// //                         {expiryType === "duration" && (
// //                             <div className="mt-3 flex gap-3">
// //                                 <input
// //                                     type="number"
// //                                     min="1"
// //                                     value={durationValue}
// //                                     onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
// //                                     className="w-24 rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //                                 />
// //                                 <select
// //                                     value={durationUnit}
// //                                     onChange={(e) => setDurationUnit(e.target.value)}
// //                                     className="rounded-md border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white"
// //                                 >
// //                                     <option>Minutes</option>
// //                                     <option>Hours</option>
// //                                     <option>Days</option>
// //                                     <option>Weeks</option>
// //                                     <option>Months</option>
// //                                     <option>Years</option>
// //                                 </select>
// //                             </div>
// //                         )}
// //                     </div>

// //                     {/* Products Section with Add Products and Bulk Actions */}
// //                     <div>
// //                         <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
// //                             <label className="text-sm font-medium text-gray-300">Products</label>
// //                             <div className="flex gap-2">
// //                                 <AddProductsDropdown
// //                                     availableProducts={allProducts}
// //                                     existingProductNames={existingProductNames}
// //                                     onAddProducts={handleAddProducts}
// //                                 />
// //                                 <button
// //                                     onClick={() => handleBulkAction("approve")}
// //                                     disabled={selectedProductNames.length === 0}
// //                                     className="rounded-md bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 disabled:opacity-40"
// //                                 >
// //                                     Approve
// //                                 </button>
// //                                 <button
// //                                     onClick={() => handleBulkAction("revoke")}
// //                                     disabled={selectedProductNames.length === 0}
// //                                     className="rounded-md bg-yellow-600/20 px-3 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-600/30 disabled:opacity-40"
// //                                 >
// //                                     Revoke
// //                                 </button>
// //                                 <button
// //                                     onClick={() => handleBulkAction("remove")}
// //                                     disabled={selectedProductNames.length === 0}
// //                                     className="rounded-md bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-40"
// //                                 >
// //                                     Remove
// //                                 </button>
// //                             </div>
// //                         </div>
// //                         <div className="rounded-md border border-dark-700">
// //                             <div className="grid grid-cols-12 gap-2 border-b border-dark-700 px-4 py-2 text-xs font-medium text-gray-400">
// //                                 <div className="col-span-1 flex items-center gap-1">
// //                                     <input
// //                                         type="checkbox"
// //                                         checked={selectAll}
// //                                         onChange={toggleSelectAll}
// //                                         className="rounded border-dark-600 bg-dark-800 text-primary"
// //                                     />
// //                                 </div>
// //                                 <div className="col-span-6">Product</div>
// //                                 <div className="col-span-3">Status</div>
// //                                 <div className="col-span-2">Actions</div>
// //                             </div>
// //                             {products.length === 0 ? (
// //                                 <div className="px-4 py-6 text-center text-sm text-gray-400">
// //                                     No products associated. Click "+ Add Products" to add.
// //                                 </div>
// //                             ) : (
// //                                 products.map((product) => (
// //                                     <div key={product.name} className="grid grid-cols-12 items-center gap-2 border-b border-dark-700 px-4 py-2">
// //                                         <div className="col-span-1">
// //                                             <input
// //                                                 type="checkbox"
// //                                                 checked={selectedProductNames.includes(product.name)}
// //                                                 onChange={() => toggleSelectProduct(product.name)}
// //                                                 className="rounded border-dark-600 bg-dark-800 text-primary"
// //                                             />
// //                                         </div>
// //                                         <div className="col-span-6 text-sm text-white">{product.name}</div>
// //                                         <div className="col-span-3">
// //                                             <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
// //                                                 product.status === "APPROVED" 
// //                                                     ? "bg-green-500/20 text-green-400" 
// //                                                     : "bg-red-500/20 text-red-400"
// //                                             }`}>
// //                                                 {product.status === "APPROVED" ? "Approved" : "Revoked"}
// //                                             </span>
// //                                         </div>
// //                                         <div className="col-span-2 flex gap-2">
// //                                             {product.status !== "APPROVED" && (
// //                                                 <button
// //                                                     onClick={() => handleStatusChange(product.name, "APPROVED")}
// //                                                     className="text-green-400 hover:text-green-300"
// //                                                     title="Approve"
// //                                                 >
// //                                                     <CheckCircle size={16} />
// //                                                 </button>
// //                                             )}
// //                                             {product.status !== "REVOKED" && (
// //                                                 <button
// //                                                     onClick={() => handleStatusChange(product.name, "REVOKED")}
// //                                                     className="text-yellow-400 hover:text-yellow-300"
// //                                                     title="Revoke"
// //                                                 >
// //                                                     <XCircle size={16} />
// //                                                 </button>
// //                                             )}
// //                                             <button
// //                                                 onClick={() => handleRemoveProduct(product.name)}
// //                                                 className="text-red-400 hover:text-red-300"
// //                                                 title="Remove"
// //                                             >
// //                                                 <Trash2 size={16} />
// //                                             </button>
// //                                         </div>
// //                                     </div>
// //                                 ))
// //                             )}
// //                         </div>
// //                     </div>
// //                 </div>

// //                 <div className="flex justify-end gap-3 border-t border-dark-700 px-5 py-4">
// //                     <button onClick={onClose} className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600">
// //                         Cancel
// //                     </button>
// //                     <button onClick={handleSubmit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80">
// //                         Rotate Keys
// //                     </button>
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // };

// // // Main AppCredentialsModal Component (unchanged except passing availableProducts)
// // export default function AppCredentialsModal({
// //     isOpen,
// //     onClose,
// //     data,
// //     isLoading,
// //     error,
// //     onAddCredential,
// //     onRotateCredential,
// //     availableProducts = ["userProduct", "Demo product", "sensor-product-v1", "tailor-product-v1"],
// // }) {
// //     const [visibleSecrets, setVisibleSecrets] = useState({});
// //     const [showAddModal, setShowAddModal] = useState(false);
// //     const [showRotationModal, setShowRotationModal] = useState(false);
// //     const [selectedCredential, setSelectedCredential] = useState(null);

// //     if (!isOpen) return null;

// //     const credentials = Array.isArray(data?.credentials) ? data.credentials : [];

// //     const toggleVisibleSecret = (key) => {
// //         setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
// //     };

// //     const renderMaskedValue = (key, value) => {
// //         const isVisible = visibleSecrets[key];
// //         const displayValue = isVisible ? formatValue(value) : "••••••••••••••••";

// //         return (
// //             <span className="col-span-2 flex min-w-0 items-center gap-2">
// //                 <span className="min-w-0 flex-1 break-all text-sm font-medium text-white">
// //                     {displayValue}
// //                 </span>
// //                 <button
// //                     type="button"
// //                     onClick={() => toggleVisibleSecret(key)}
// //                     className="shrink-0 rounded-md border border-dark-600 p-1.5 text-gray-400 hover:border-primary hover:text-primary"
// //                     title={isVisible ? "Hide credential" : "View credential"}
// //                 >
// //                     {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
// //                 </button>
// //             </span>
// //         );
// //     };

// //     const handleAddCredential = (newCredential) => {
// //         if (onAddCredential) {
// //             onAddCredential(newCredential);
// //         } else {
// //             console.log("New credential:", newCredential);
// //             alert("Credential added (mock). Implement onAddCredential prop to handle.");
// //         }
// //     };

// //     const handleRotateCredential = (rotatedCredential) => {
// //         if (onRotateCredential) {
// //             onRotateCredential(rotatedCredential);
// //         } else {
// //             console.log("Rotated credential:", rotatedCredential);
// //             alert("Key rotation completed (mock). Implement onRotateCredential prop.");
// //         }
// //     };

// //     return (
// //         <>
// //             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
// //                 <div className="w-full max-w-3xl rounded-xl border border-dark-700 bg-[#15192b] shadow-xl">
// //                     <div className="flex items-center justify-between border-b border-dark-700 px-5 py-4">
// //                         <div>
// //                             <h3 className="text-base font-semibold text-white">App Credentials</h3>
// //                             <p className="text-xs text-gray-400">{data?.name || "Fetched from Apigee"}</p>
// //                         </div>
// //                         <div className="flex items-center gap-2">
// //                             <button
// //                                 onClick={() => setShowAddModal(true)}
// //                             className="rounded-lg flex items-center gap-2 bg-orange-600 px-2 py-2 text-sm text-white-300 hover:bg-orange-600"
// //                             >
// //                                 <Plus size={14} />
// //                                 Add Credential
// //                             </button>
// //                             <button
// //                                 onClick={onClose}
// //                                 className="rounded-md p-2 text-gray-400 hover:bg-dark-700 hover:text-white"
// //                             >
// //                                 <X size={16} />
// //                             </button>
// //                         </div>
// //                     </div>

// //                     <div className="max-h-[70vh] overflow-y-auto p-5">
// //                         {isLoading ? (
// //                             <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
// //                                 <Loader2 size={18} className="animate-spin" />
// //                                 Loading credentials...
// //                             </div>
// //                         ) : error ? (
// //                             <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
// //                                 {error}
// //                             </div>
// //                         ) : credentials.length === 0 ? (
// //                             <div className="rounded-lg border border-dark-700 px-4 py-8 text-center text-sm text-gray-400">
// //                                 No credentials found for this app.
// //                             </div>
// //                         ) : (
// //                             <div className="space-y-4">
// //                                 {credentials.map((credential, index) => (
// //                                     <div
// //                                         key={credential.consumerKey || index}
// //                                         className="rounded-lg border border-dark-700 bg-dark-800/30"
// //                                     >
// //                                         <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
// //                                             <span className="text-sm font-semibold text-white">
// //                                                 Credential {index + 1}
// //                                             </span>
// //                                             <div className="flex items-center gap-2">
// //                                                 <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
// //                                                     {formatValue(credential.status)}
// //                                                 </span>
// //                                                 <button
// //                                                     onClick={() => {
// //                                                         setSelectedCredential(credential);
// //                                                         setShowRotationModal(true);
// //                                                     }}
// //                                                     className="flex items-center gap-1 rounded-md border border-dark-600 bg-dark-700 px-2 py-1 text-xs text-gray-300 hover:border-primary hover:text-primary"
// //                                                 >
// //                                                     <RotateCw size={12} />
// //                                                     Key Rotation
// //                                                 </button>
// //                                             </div>
// //                                         </div>

// //                                         <div className="divide-y divide-dark-700">
// //                                             {[
// //                                                 ["Consumer Key", credential.consumerKey, true],
// //                                                 ["Consumer Secret", credential.consumerSecret, true],
// //                                                 ["Expires", formatDate(credential.expiresAt), false],
// //                                                 ["Issued", formatDate(credential.issuedAt), false],
// //                                                 ["Scopes", credential.scopes, false],
// //                                             ].map(([label, value, shouldMask]) => (
// //                                                 <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
// //                                                     <span className="text-sm text-gray-400">{label}</span>
// //                                                     {shouldMask ? (
// //                                                         renderMaskedValue(`${index}-${label}`, value)
// //                                                     ) : (
// //                                                         <span className="col-span-2 break-all text-sm font-medium text-white">
// //                                                             {formatValue(value)}
// //                                                         </span>
// //                                                     )}
// //                                                 </div>
// //                                             ))}
// //                                         </div>

// //                                         {Array.isArray(credential.apiProducts) && credential.apiProducts.length > 0 && (
// //                                             <div className="border-t border-dark-700 px-4 py-3">
// //                                                 <p className="mb-2 text-sm text-gray-400">API Products</p>
// //                                                 <div className="flex flex-wrap gap-2">
// //                                                     {credential.apiProducts.map((product, productIndex) => (
// //                                                         <span
// //                                                             key={`${formatValue(product?.apiproduct || product?.name || product)}-${productIndex}`}
// //                                                             className="rounded-full border border-dark-600 bg-[#0f172a] px-2 py-1 text-xs text-gray-200"
// //                                                         >
// //                                                             {formatValue(product?.apiproduct || product?.name || product)}
// //                                                         </span>
// //                                                     ))}
// //                                                 </div>
// //                                             </div>
// //                                         )}
// //                                     </div>
// //                                 ))}
// //                             </div>
// //                         )}
// //                     </div>

// //                     <div className="flex justify-end border-t border-dark-700 px-5 py-4">
// //                         <button
// //                             onClick={onClose}
// //                             className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-600"
// //                         >
// //                             Close
// //                         </button>
// //                     </div>
// //                 </div>
// //             </div>

// //             <AddCredentialModal
// //                 isOpen={showAddModal}
// //                 onClose={() => setShowAddModal(false)}
// //                 onAdd={handleAddCredential}
// //                 availableProducts={availableProducts}
// //             />

// //             {selectedCredential && (
// //                 <KeyRotationModal
// //                     isOpen={showRotationModal}
// //                     onClose={() => {
// //                         setShowRotationModal(false);
// //                         setSelectedCredential(null);
// //                     }}
// //                     onRotate={handleRotateCredential}
// //                     credential={selectedCredential}
// //                     allProducts={availableProducts}
// //                 />
// //             )}
// //         </>
// //     );
// // }