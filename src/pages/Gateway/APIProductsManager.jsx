import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit, Trash2, Plus, ArrowLeft, Loader2, Copy, GitBranch, X, Eye } from 'lucide-react';
import { GatewayContextSelector } from './GatewayContextSelector';
import { PaginationControls } from "../../components/ui/PaginationControls";
import ResourceAuditDetails from './ResourceAuditDetails';
import { getTrackingHeaders, getFallbackOnboardingId } from '../Apigee/components/apigeeTracking';
import { getApplications } from '../../http-service/onboardingApi';

// Helper to fetch Apigee token
const fetchToken = async () => {
  try {
    const res = await fetch('https://forgegateway.probestack.io/apigee-wrapper/auth/apigee/token');
    if (!res.ok) throw new Error(`Token service error: ${res.status}`);
    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error('Token fetch error:', err);
    return null;
  }
};

const APIProductsManager = ({
  onBack,
  selectedOrg: externalOrg,
  onOrgChange,
  selectedBU: externalBU,
  onBUChange,
  selectedEnv: externalEnv,
  onEnvChange,
  orgId: fallbackOrg = 'gen-ai-poc-onboarding',
  envId: fallbackEnv = 'dev',
  developerEmail: externalDeveloperEmail = 'jagruti.d@krelixir.com',
  showMessage,
}) => {
  const [selectedOrg, setSelectedOrg] = useState(externalOrg || fallbackOrg);
  const [selectedBU, setSelectedBU] = useState(externalBU || '');
  const [selectedEnv, setSelectedEnv] = useState(externalEnv || fallbackEnv);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [environments, setEnvironments] = useState([]);
  const [loadingEnvs, setLoadingEnvs] = useState(false);
  const [proxiesList, setProxiesList] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(false);
  const [buAppDetails, setBuAppDetails] = useState({
    onboardingId: '',
    applicationName: '',
    applicationId: '',
    loading: false,
  });

  const [formData, setFormData] = useState({
    name: '', displayName: '', description: '', environment: '',
    accessType: 'private', autoApprove: false, quotaEnabled: false,
    quotaEvery: '', quotaInterval: '', quotaUnit: 'minute',
    llmTokenQuota: false, allowedOAuthScopes: '',
    operations: [], llmOperations: [], graphqlOperations: [],
    grpcOperations: [], customAttributes: [],
  });

  const [newOperation, setNewOperation] = useState({ proxy: '', path: '', methods: '', apiQuota: '', customAttributes: '' });
  const [newLLMOperation, setNewLLMOperation] = useState({ proxy: '', path: '', model: '', methods: '', quota: '', customAttributes: '' });
  const [newGraphQLOperation, setNewGraphQLOperation] = useState({ proxy: '', operationName: '', operationTypes: '', quota: '', customAttributes: '' });
  const [newGRPCOperation, setNewGRPCOperation] = useState({ proxy: '', serviceName: '', methods: '', quota: '', customAttributes: '' });
  const [newAttribute, setNewAttribute] = useState({ name: '', value: '' });

  const getEffectiveOrg = () => selectedOrg === "Forgesphere" ? "gen-ai-poc-onboarding" : selectedOrg;
  const getTracking = () => ({
    onboardingId: buAppDetails.onboardingId,
    microserviceId: buAppDetails.applicationId,
  });

  // Validate product name (Apigee rules: letters, numbers, hyphens, underscores, no spaces)
  const isValidProductName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);

  useEffect(() => {
    setProductPage(1);
  }, [searchTerm]);

  // Fetch an application under the selected business unit (from the onboarding hierarchy)
  const fetchBusinessUnitApplication = async () => {
    if (!selectedBU) return null;
    setBuAppDetails(prev => ({ ...prev, loading: true }));
    try {
      const apps = await getApplications({ businessUnitId: selectedBU, size: 1 });
      const app = apps?.[0];
      if (app) {
        const details = {
          onboardingId: getFallbackOnboardingId(),
          applicationName: app.name,
          applicationId: app.id,
          loading: false,
        };
        setBuAppDetails(details);
        return details;
      }
      setBuAppDetails({ onboardingId: '', applicationName: '', applicationId: '', loading: false });
    } catch (err) {
      console.error("Failed to fetch business unit application:", err);
      setBuAppDetails({ onboardingId: '', applicationName: '', applicationId: '', loading: false });
    }
    return null;
  };

  useEffect(() => {
    fetchBusinessUnitApplication();
  }, [selectedBU]);

  // Fetch environments
  const fetchEnvironments = async (org) => {
    if (!org) return;
    setLoadingEnvs(true);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('No token');
      const url = `https://apigee.googleapis.com/v1/organizations/${org}/environments`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const envList = Array.isArray(data) ? data : (data.environment || []);
      setEnvironments(envList);
    } catch (err) {
      console.error('Failed to fetch environments', err);
      setEnvironments([]);
    } finally {
      setLoadingEnvs(false);
    }
  };

  // Fetch API proxies list
  const fetchProxiesList = async () => {
    const org = getEffectiveOrg();
    if (!org) return;
    setLoadingProxies(true);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('No token');
      const url = `https://apigee.googleapis.com/v1/organizations/${org}/apis`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProxiesList(data.proxies?.map(p => p.name) || []);
    } catch (err) {
      console.error('Failed to fetch proxies', err);
      setProxiesList([]);
    } finally {
      setLoadingProxies(false);
    }
  };

  // Fetch all products
  const fetchProducts = async () => {
    const org = getEffectiveOrg();
    if (!org || !selectedEnv) return;
    setLoadingProducts(true);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('No token');
      // expand=true: without it Apigee returns bare product name strings
      // (no displayName, description, etc.) instead of full objects.
      const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${org}/apiproducts?expand=true`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data.apiProduct || [];
      const enhanced = list.map(p => ({ ...p, environments: selectedEnv }));
      setProducts(enhanced);
    } catch (err) {
      console.error('Failed to fetch products', err);
      showMessage?.(`Failed to fetch products: ${err.message}`, 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch single product details
  const fetchProductDetails = async (productName) => {
    const org = getEffectiveOrg();
    try {
      const token = await fetchToken();
      if (!token) throw new Error('No token');
       const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(productName)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to fetch product details', err);
      return null;
    }
  };

  useEffect(() => {
    if (selectedOrg) fetchProducts();
  }, [selectedOrg, selectedEnv]);

  useEffect(() => {
    if (selectedOrg) fetchEnvironments(getEffectiveOrg());
  }, [selectedOrg, isModalOpen]);

  useEffect(() => {
    if (isModalOpen && selectedOrg) fetchProxiesList();
  }, [isModalOpen, selectedOrg]);

  const handleOrgChange = (org) => {
    setSelectedOrg(org);
    onOrgChange?.(org);
  };
  const handleBUChange = (bu) => {
    setSelectedBU(bu);
    onBUChange?.(bu);
  };
  const handleEnvChange = (env) => {
    setSelectedEnv(env);
    onEnvChange?.(env);
  };

  const resetForm = () => {
    setFormData({
      name: '', displayName: '', description: '', environment: '',
      accessType: 'private', autoApprove: false, quotaEnabled: false,
      quotaEvery: '', quotaInterval: '', quotaUnit: 'minute',
      llmTokenQuota: false, allowedOAuthScopes: '',
      operations: [], llmOperations: [], graphqlOperations: [],
      grpcOperations: [], customAttributes: [],
    });
    setNewOperation({ proxy: '', path: '', methods: '', apiQuota: '', customAttributes: '' });
    setNewLLMOperation({ proxy: '', path: '', model: '', methods: '', quota: '', customAttributes: '' });
    setNewGraphQLOperation({ proxy: '', operationName: '', operationTypes: '', quota: '', customAttributes: '' });
    setNewGRPCOperation({ proxy: '', serviceName: '', methods: '', quota: '', customAttributes: '' });
    setNewAttribute({ name: '', value: '' });
  };

  const mapProductToFormData = (product) => {
    let operations = [];
    let customAttributes = product.attributes?.map((attr, idx) => ({ id: idx, name: attr.name, value: attr.value })) || [];

    if (product.operationGroup?.operationConfigs) {
      operations = product.operationGroup.operationConfigs.flatMap((config, idx) =>
        (config.operations || []).map((op, opIdx) => ({
          id: `${idx}-${opIdx}`,
          proxy: config.apiSource || '',
          path: op.resource || '',
          methods: (op.methods || []).join(','),
          apiQuota: op.quota?.limit || '',
          customAttributes: '',
        }))
      );
    }

    return {
      name: product.name,
      displayName: product.displayName || '',
      description: product.description || '',
      environment: selectedEnv,
      accessType: product.accessType || 'private',
      autoApprove: product.approvalType === 'auto',
      quotaEnabled: !!product.quota,
      quotaEvery: product.quota?.limit || '',
      quotaInterval: product.quota?.interval || '',
      quotaUnit: product.quota?.unit || 'minute',
      llmTokenQuota: false,
      allowedOAuthScopes: (product.scopes || []).join(', '),
      operations,
      llmOperations: [],
      graphqlOperations: [],
      grpcOperations: [],
      customAttributes,
    };
  };

  const handleCreate = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = async (product) => {
    setSelectedProduct(product);
    setModalMode('edit');
    const fullProduct = await fetchProductDetails(product.name);
    if (fullProduct) {
      setFormData(mapProductToFormData(fullProduct));
    } else {
      setFormData({
        name: product.name,
        displayName: product.displayName || '',
        description: product.description || '',
        environment: product.environments || selectedEnv,
        accessType: 'private',
        autoApprove: false,
        quotaEnabled: false,
        quotaEvery: '',
        quotaInterval: '',
        quotaUnit: 'minute',
        llmTokenQuota: false,
        allowedOAuthScopes: '',
        operations: [],
        llmOperations: [],
        graphqlOperations: [],
        grpcOperations: [],
        customAttributes: [],
      });
    }
    setIsModalOpen(true);
  };

  // Build payload WITHOUT accessType (matches ProxiesView)
  const buildApigeePayload = (data) => {
    const product = {
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      // accessType: data.accessType,
      approvalType: data.autoApprove ? 'auto' : 'manual',
      scopes: data.allowedOAuthScopes.split(',').map(s => s.trim()).filter(Boolean) || [],
    };

    if (data.quotaEnabled && data.quotaEvery && data.quotaInterval) {
      product.quota = {
        limit: data.quotaEvery,
        interval: data.quotaInterval,
        unit: data.quotaUnit,
      };
    }

    if (data.operations.length > 0) {
      product.operationGroup = {
        operationConfigs: [
          {
            apiSource: 'default',
            operations: data.operations.map(op => ({
              resource: op.path,
              methods: op.methods.split(',').map(m => m.trim()),
            })),
          },
        ],
      };
    }

    const attributes = [...data.customAttributes];
    if (buAppDetails.applicationId && !attributes.some(a => a.name === 'applicationId'))
      attributes.push({ name: 'applicationId', value: buAppDetails.applicationId });
    if (buAppDetails.applicationName && !attributes.some(a => a.name === 'applicationName'))
      attributes.push({ name: 'applicationName', value: buAppDetails.applicationName });
    if (buAppDetails.onboardingId && !attributes.some(a => a.name === 'onboardingId'))
      attributes.push({ name: 'onboardingId', value: buAppDetails.onboardingId });
    if (selectedBU && !attributes.some(a => a.name === 'businessUnitId'))
      attributes.push({ name: 'businessUnitId', value: selectedBU });

    // if (attributes.length > 0) product.attributes = attributes;
    return product;
  };

  const productExists = async (productName) => {
    const org = getEffectiveOrg();
    try {
      const token = await fetchToken();
      const url = `https://apigee.googleapis.com/v1/organizations/${org}/apiproducts/${productName}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    const productName = formData.name.trim();
    if (!productName) {
      showMessage?.('Product name is required.', 'error');
      return;
    }
    if (!isValidProductName(productName)) {
      showMessage?.('Product name can only contain letters, numbers, hyphens, underscores. No spaces.', 'error');
      return;
    }

    const org = getEffectiveOrg();
    const token = await fetchToken();
    if (!token) {
      showMessage?.('Failed to obtain authentication token.', 'error');
      return;
    }

    try {
      if (modalMode === 'create') {
        const exists = await productExists(productName);
        if (exists) {
          showMessage?.(`Product "${productName}" already exists. Please choose a different name.`, 'error');
          return;
        }
        const payload = buildApigeePayload(formData);
         const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(org)}/apiproducts`;
         const res = await fetch(url, {
           method: 'POST',
           headers: { Authorization: `Bearer ${token}`, ...getTrackingHeaders(getTracking()) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }
        showMessage?.('Product created successfully', 'success');
      } else {
        const payload = buildApigeePayload(formData);
         const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(productName)}`;
         const res = await fetch(url, {
           method: 'PUT',
           headers: { Authorization: `Bearer ${token}`, ...getTrackingHeaders(getTracking()) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }
        showMessage?.('Product updated successfully', 'success');
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error('Save failed', err);
      showMessage?.(`Failed to save product: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (productName) => {
    if (!window.confirm(`Delete product "${productName}"? This action cannot be undone.`)) return;
    const org = getEffectiveOrg();
    try {
      const token = await fetchToken();
      const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(productName)}`;
      const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, ...getTrackingHeaders(getTracking()) } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchProducts();
      showMessage?.(`Product "${productName}" deleted`, 'success');
    } catch (err) {
      console.error('Delete failed', err);
      showMessage?.(`Failed to delete product: ${err.message}`, 'error');
    }
  };

  const handleClone = async (product) => {
    const newName = `${product.name}_clone_${Date.now()}`;
    const fullProduct = await fetchProductDetails(product.name);
    if (!fullProduct) {
      showMessage?.('Could not fetch product details for cloning', 'error');
      return;
    }
    const clonedPayload = { ...fullProduct, name: newName, displayName: `${product.displayName} (Clone)` };
    delete clonedPayload.proxies;
    delete clonedPayload.createdAt;
    delete clonedPayload.lastModifiedAt;
    delete clonedPayload.environments;

    const org = getEffectiveOrg();
    try {
      const token = await fetchToken();
      const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${encodeURIComponent(org)}/apiproducts`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...getTrackingHeaders(getTracking()) },
        body: JSON.stringify(clonedPayload),
      });
      if (res.ok) {
        await fetchProducts();
        showMessage?.('Product cloned successfully', 'success');
      } else {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      showMessage?.(`Clone failed: ${err.message}`, 'error');
    }
  };

  const handleVersioning = (product) => {
    showMessage?.(`Versioning for: ${product.name} (coming soon)`, 'info');
  };

  const handleView = (product) => {
    setLoadingProductDetails(true);
    setSelectedProduct(product);
    setView('view');
    fetchProductDetails(product.name).then((details) => {
      if (details) setSelectedProduct({ ...product, ...details });
    }).finally(() => setLoadingProductDetails(false));
  };

  // Table row handlers with validation for plus buttons
  const addOperation = () => {
    if (!newOperation.proxy) {
      showMessage?.('Please select a proxy.', 'error');
      return;
    }
    if (!newOperation.path) {
      showMessage?.('Please enter a path.', 'error');
      return;
    }
    setFormData({
      ...formData,
      operations: [...formData.operations, { ...newOperation, id: Date.now() }]
    });
    setNewOperation({ proxy: '', path: '', methods: '', apiQuota: '', customAttributes: '' });
  };
  const updateOperation = (id, field, value) => {
    setFormData({
      ...formData,
      operations: formData.operations.map(op => op.id === id ? { ...op, [field]: value } : op)
    });
  };
  const deleteOperation = (id) => {
    setFormData({ ...formData, operations: formData.operations.filter(op => op.id !== id) });
  };

  const addLLMOperation = () => {
    if (!newLLMOperation.proxy) {
      showMessage?.('Please select a proxy.', 'error');
      return;
    }
    if (!newLLMOperation.path) {
      showMessage?.('Please enter a path.', 'error');
      return;
    }
    setFormData({
      ...formData,
      llmOperations: [...formData.llmOperations, { ...newLLMOperation, id: Date.now() }]
    });
    setNewLLMOperation({ proxy: '', path: '', model: '', methods: '', quota: '', customAttributes: '' });
  };
  const updateLLMOperation = (id, field, value) => {
    setFormData({
      ...formData,
      llmOperations: formData.llmOperations.map(op => op.id === id ? { ...op, [field]: value } : op)
    });
  };
  const deleteLLMOperation = (id) => {
    setFormData({ ...formData, llmOperations: formData.llmOperations.filter(op => op.id !== id) });
  };

  const addGraphQLOperation = () => {
    if (!newGraphQLOperation.proxy) {
      showMessage?.('Please select a proxy.', 'error');
      return;
    }
    if (!newGraphQLOperation.operationName) {
      showMessage?.('Please enter an operation name.', 'error');
      return;
    }
    setFormData({
      ...formData,
      graphqlOperations: [...formData.graphqlOperations, { ...newGraphQLOperation, id: Date.now() }]
    });
    setNewGraphQLOperation({ proxy: '', operationName: '', operationTypes: '', quota: '', customAttributes: '' });
  };
  const updateGraphQLOperation = (id, field, value) => {
    setFormData({
      ...formData,
      graphqlOperations: formData.graphqlOperations.map(op => op.id === id ? { ...op, [field]: value } : op)
    });
  };
  const deleteGraphQLOperation = (id) => {
    setFormData({ ...formData, graphqlOperations: formData.graphqlOperations.filter(op => op.id !== id) });
  };

  const addGRPCOperation = () => {
    if (!newGRPCOperation.proxy) {
      showMessage?.('Please select a proxy.', 'error');
      return;
    }
    if (!newGRPCOperation.serviceName) {
      showMessage?.('Please enter a service name.', 'error');
      return;
    }
    setFormData({
      ...formData,
      grpcOperations: [...formData.grpcOperations, { ...newGRPCOperation, id: Date.now() }]
    });
    setNewGRPCOperation({ proxy: '', serviceName: '', methods: '', quota: '', customAttributes: '' });
  };
  const updateGRPCOperation = (id, field, value) => {
    setFormData({
      ...formData,
      grpcOperations: formData.grpcOperations.map(op => op.id === id ? { ...op, [field]: value } : op)
    });
  };
  const deleteGRPCOperation = (id) => {
    setFormData({ ...formData, grpcOperations: formData.grpcOperations.filter(op => op.id !== id) });
  };

  const addAttribute = () => {
    if (!newAttribute.name) {
      showMessage?.('Please enter an attribute name.', 'error');
      return;
    }
    if (!newAttribute.value) {
      showMessage?.('Please enter an attribute value.', 'error');
      return;
    }
    setFormData({
      ...formData,
      customAttributes: [...formData.customAttributes, { ...newAttribute, id: Date.now() }]
    });
    setNewAttribute({ name: '', value: '' });
  };
  const updateAttribute = (id, field, value) => {
    setFormData({
      ...formData,
      customAttributes: formData.customAttributes.map(attr => attr.id === id ? { ...attr, [field]: value } : attr)
    });
  };
  const deleteAttribute = (id) => {
    setFormData({ ...formData, customAttributes: formData.customAttributes.filter(attr => attr.id !== id) });
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // ----- RENDER LIST VIEW -----
  if (view === 'list') {
    return (
      <div className="p-4 space-y-2">
        <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-5 space-y-4">
        <h2 className="text-2xl font-bold text-white mb-1">API Products</h2>
        <p className="text-sm text-gray-400" style={{marginBottom:"1rem"}}>Define and manage API product bundles</p>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <GatewayContextSelector
            selectedOrg={selectedOrg}
            setSelectedOrg={handleOrgChange}
            selectedBU={selectedBU}
            setSelectedBU={handleBUChange}
            selectedEnv={selectedEnv}
            setSelectedEnv={handleEnvChange}
            showEnv={true}
          />
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
              <input
                type="text"
                placeholder="Filter products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:border-[#4f8ef7]"
              />
            </div>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36] flex items-center gap-1"
            >
              <Plus size={16} /> Create
            </button>
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#ff5b1f]" /></div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-dark-700">
            <table className="w-full text-sm">
              <thead className="bg-dark-800/70 border-b border-dark-700">
                <tr>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Name</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Display Name</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Environments</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Source</th>
                  <th className="text-left p-3 text-[#5a6a8a] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(product => (
                  <tr key={product.name} className="border-b border-dark-700 hover:bg-dark-800/40 cursor-pointer">
                    <td className="p-3 text-white" onClick={() => handleView(product)}>{product.name}</td>
                    <td className="p-3 text-[#7f8fa8]" onClick={() => handleView(product)}>{product.displayName || '-'}</td>
                    <td className="p-3 text-[#7f8fa8]" onClick={() => handleView(product)}>{product.environments || selectedEnv}</td>
                    <td className="p-3 text-[#7f8fa8]">
                      {product.source === "PLATFORM" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">ForgeSphere</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">API Hub</span>
                      )}
                    </td>
                    <td className="p-3 flex gap-2">
                       <button onClick={(e) => { e.stopPropagation(); handleView(product); }} className="text-[#4f8ef7] hover:text-[#6ca9ff]" title="View details"><Eye size={16} /></button>
                       <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="text-[#4f8ef7] hover:text-[#6ca9ff]" title="Edit"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleClone(product); }} className="text-emerald-400 hover:text-emerald-300" title="Clone"><Copy size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleVersioning(product); }} className="text-amber-400 hover:text-amber-300" title="Versioning"><GitBranch size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(product.name); }} className="text-red-400 hover:text-red-500" title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {paginatedProducts.length === 0 && (
                  <tr><td colSpan="5" className="p-6 text-center text-[#7f8fa8]">No products found</td></tr>
                )}
              </tbody>
            </table>
            <PaginationControls
              currentPage={productPage}
              totalItems={filteredProducts.length}
              pageSize={productPageSize}
              onPageChange={setProductPage}
              onPageSizeChange={setProductPageSize}
            />
          </div>
        )}
        </div>

        {/* MODAL for Create/Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#111520] rounded-xl border border-[#1f2840] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-[#111520] border-b border-[#1f2840] px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">{modalMode === 'create' ? 'Create Product' : 'Edit Product'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#5a6a8a] hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-8">
                {/* Business Unit Application Details */}
                {buAppDetails.applicationName && (
                  <div className="bg-[#1a1f2e] p-3 rounded-lg border border-[#2a3550] text-sm">
                    <div className="text-xs text-[#5a6a8a] mb-1">Linked Business Unit Application</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-[#5a6a8a]">Name:</span> {buAppDetails.applicationName}</div>
                      <div><span className="text-[#5a6a8a]">Onboarding ID:</span> {buAppDetails.onboardingId}</div>
                      <div><span className="text-[#5a6a8a]">Application ID:</span> {buAppDetails.applicationId}</div>
                    </div>
                  </div>
                )}
                {buAppDetails.loading && (
                  <div className="text-center text-[#7f8fa8] text-sm py-2">
                    <Loader2 size={14} className="inline animate-spin mr-1" /> Loading business unit details...
                  </div>
                )}

                {/* Product details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Product details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        disabled={modalMode === 'edit'}
                        className={`w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4f8ef7] ${modalMode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                      />
                      {modalMode === 'edit' && <p className="text-xs text-amber-400 mt-1">Product name cannot be changed after creation.</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Display Name</label>
                      <input type="text" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Environment</label>
                      {loadingEnvs ? (
                        <div className="flex items-center gap-2 text-[#7f8fa8]"><Loader2 size={14} className="animate-spin" /> Loading environments...</div>
                      ) : (
                        <select value={formData.environment} onChange={e => setFormData({ ...formData, environment: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2">
                          <option value="">Select environment</option>
                          {environments.map(env => <option key={env} value={env}>{env}</option>)}
                        </select>
                      )}
                      <p className="text-xs text-[#5a6a8a] mt-1">Not selecting any environment will allow access to all environments.</p>
                    </div>
                  </div>
                </div>

                {/* Access Section (UI only – accessType is NOT sent to API) */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Access *</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2"><input type="radio" name="accessType" value="private" checked={formData.accessType === 'private'} onChange={() => setFormData({ ...formData, accessType: 'private' })} className="accent-[#ff5b1f]" /> Private</label>
                      <label className="flex items-center gap-2"><input type="radio" name="accessType" value="public" checked={formData.accessType === 'public'} onChange={() => setFormData({ ...formData, accessType: 'public' })} className="accent-[#ff5b1f]" /> Public</label>
                    </div>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.autoApprove} onChange={e => setFormData({ ...formData, autoApprove: e.target.checked })} /> Automatically approve access requests</label>
                    <div className="mt-4">
                      <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={formData.quotaEnabled} onChange={e => setFormData({ ...formData, quotaEnabled: e.target.checked })} /> Api quota limit</label>
                      {formData.quotaEnabled && (
                        <div className="ml-6 flex items-center gap-2 flex-wrap">
                          <span>Request every</span>
                          <input type="number" value={formData.quotaEvery} onChange={e => setFormData({ ...formData, quotaEvery: e.target.value })} className="w-20 bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" />
                          <input type="text" placeholder="Time interval" value={formData.quotaInterval} onChange={e => setFormData({ ...formData, quotaInterval: e.target.value })} className="w-32 bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" />
                          <select value={formData.quotaUnit} onChange={e => setFormData({ ...formData, quotaUnit: e.target.value })} className="bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1">
                            <option value="minute">minute</option><option value="hour">hour</option><option value="day">day</option><option value="month">month</option>
                          </select>
                        </div>
                      )}
                      <p className="text-xs text-[#5a6a8a] mt-2">You must add a Quota policy to the API proxy to enforce a quota based on these values. <a href="#" className="text-[#4f8ef7] hover:underline">Learn more</a></p>
                      <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={formData.llmTokenQuota} onChange={e => setFormData({ ...formData, llmTokenQuota: e.target.checked })} /> Set LLM token quota limit</label>
                    </div>
                  </div>
                </div>

                {/* Allowed OAuth scope */}
                <div>
                  <label className="block text-sm font-medium mb-1">Allowed OAuth scope</label>
                  <input type="text" placeholder="Comma separated scope names" value={formData.allowedOAuthScopes} onChange={e => setFormData({ ...formData, allowedOAuthScopes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2" />
                </div>

                {/* Operations Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Operations</h3>
                  <p className="text-sm text-[#7f8fa8] mb-4">Specify operations allowed on an API proxy, including resource paths, HTTP methods, and quotas.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
                        <tr><th className="p-2 text-left">Proxy</th><th className="p-2 text-left">Path</th><th className="p-2 text-left">Method(s)</th><th className="p-2 text-left">Api quota</th><th className="p-2 text-left">Custom attributes</th><th className="p-2 text-left">Actions</th></tr>
                      </thead>
                      <tbody>
                        {formData.operations.map(op => (
                          <tr key={op.id} className="border-b border-[#1f2840]">
                            <td className="p-2"><select value={op.proxy} onChange={e => updateOperation(op.id, 'proxy', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                            <td className="p-2"><input value={op.path} onChange={e => updateOperation(op.id, 'path', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.methods} onChange={e => updateOperation(op.id, 'methods', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.apiQuota} onChange={e => updateOperation(op.id, 'apiQuota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.customAttributes} onChange={e => updateOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><button onClick={() => deleteOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                        <tr className="border-b border-[#1f2840]">
                          <td className="p-2"><select value={newOperation.proxy} onChange={e => setNewOperation({ ...newOperation, proxy: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                          <td className="p-2"><input placeholder="Path" value={newOperation.path} onChange={e => setNewOperation({ ...newOperation, path: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Method(s)" value={newOperation.methods} onChange={e => setNewOperation({ ...newOperation, methods: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Api quota" value={newOperation.apiQuota} onChange={e => setNewOperation({ ...newOperation, apiQuota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Custom attributes" value={newOperation.customAttributes} onChange={e => setNewOperation({ ...newOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><button onClick={addOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* LLM Operations Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">LLM Operations</h3>
                  <p className="text-sm text-[#7f8fa8] mb-4">Specify operations allowed on an API proxy, including model, resource paths, and token quotas.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
                        <tr><th className="p-2 text-left">Proxy</th><th className="p-2 text-left">Path</th><th className="p-2 text-left">Model</th><th className="p-2 text-left">Method(s)</th><th className="p-2 text-left">Quota</th><th className="p-2 text-left">Custom attributes</th><th className="p-2 text-left">Actions</th></tr>
                      </thead>
                      <tbody>
                        {formData.llmOperations.map(op => (
                          <tr key={op.id} className="border-b border-[#1f2840]">
                            <td className="p-2"><select value={op.proxy} onChange={e => updateLLMOperation(op.id, 'proxy', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                            <td className="p-2"><input value={op.path} onChange={e => updateLLMOperation(op.id, 'path', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.model} onChange={e => updateLLMOperation(op.id, 'model', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.methods} onChange={e => updateLLMOperation(op.id, 'methods', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.quota} onChange={e => updateLLMOperation(op.id, 'quota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.customAttributes} onChange={e => updateLLMOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><button onClick={() => deleteLLMOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                        <tr className="border-b border-[#1f2840]">
                          <td className="p-2"><select value={newLLMOperation.proxy} onChange={e => setNewLLMOperation({ ...newLLMOperation, proxy: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                          <td className="p-2"><input placeholder="Path" value={newLLMOperation.path} onChange={e => setNewLLMOperation({ ...newLLMOperation, path: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Model" value={newLLMOperation.model} onChange={e => setNewLLMOperation({ ...newLLMOperation, model: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Method(s)" value={newLLMOperation.methods} onChange={e => setNewLLMOperation({ ...newLLMOperation, methods: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Quota" value={newLLMOperation.quota} onChange={e => setNewLLMOperation({ ...newLLMOperation, quota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Custom attributes" value={newLLMOperation.customAttributes} onChange={e => setNewLLMOperation({ ...newLLMOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><button onClick={addLLMOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GraphQL Operations Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">GraphQL Operations</h3>
                  <p className="text-sm text-[#7f8fa8] mb-4">Specify operation types with optional operation name to apply quota upon.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
                        <tr><th className="p-2 text-left">Proxy</th><th className="p-2 text-left">Operation Name</th><th className="p-2 text-left">Operation Type(s)</th><th className="p-2 text-left">Quota</th><th className="p-2 text-left">Custom attributes</th><th className="p-2 text-left">Actions</th></tr>
                      </thead>
                      <tbody>
                        {formData.graphqlOperations.map(op => (
                          <tr key={op.id} className="border-b border-[#1f2840]">
                            <td className="p-2"><select value={op.proxy} onChange={e => updateGraphQLOperation(op.id, 'proxy', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                            <td className="p-2"><input value={op.operationName} onChange={e => updateGraphQLOperation(op.id, 'operationName', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.operationTypes} onChange={e => updateGraphQLOperation(op.id, 'operationTypes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.quota} onChange={e => updateGraphQLOperation(op.id, 'quota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.customAttributes} onChange={e => updateGraphQLOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><button onClick={() => deleteGraphQLOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                        <tr className="border-b border-[#1f2840]">
                          <td className="p-2"><select value={newGraphQLOperation.proxy} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, proxy: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                          <td className="p-2"><input placeholder="Operation Name" value={newGraphQLOperation.operationName} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, operationName: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Operation Type(s)" value={newGraphQLOperation.operationTypes} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, operationTypes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Quota" value={newGraphQLOperation.quota} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, quota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Custom attributes" value={newGraphQLOperation.customAttributes} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><button onClick={addGraphQLOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* gRPC Operations Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">gRPC Operations</h3>
                  <p className="text-sm text-[#7f8fa8] mb-4">Specify gRPC methods allowed on an API proxy, including quotas.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
                        <tr><th className="p-2 text-left">Proxy</th><th className="p-2 text-left">Service Name</th><th className="p-2 text-left">gRPC Method(s) in service</th><th className="p-2 text-left">Quota</th><th className="p-2 text-left">Custom attributes</th><th className="p-2 text-left">Actions</th></tr>
                      </thead>
                      <tbody>
                        {formData.grpcOperations.map(op => (
                          <tr key={op.id} className="border-b border-[#1f2840]">
                            <td className="p-2"><select value={op.proxy} onChange={e => updateGRPCOperation(op.id, 'proxy', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                            <td className="p-2"><input value={op.serviceName} onChange={e => updateGRPCOperation(op.id, 'serviceName', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.methods} onChange={e => updateGRPCOperation(op.id, 'methods', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.quota} onChange={e => updateGRPCOperation(op.id, 'quota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={op.customAttributes} onChange={e => updateGRPCOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><button onClick={() => deleteGRPCOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                        <tr className="border-b border-[#1f2840]">
                          <td className="p-2"><select value={newGRPCOperation.proxy} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, proxy: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" disabled={loadingProxies}><option value="">Select proxy</option>{proxiesList.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                          <td className="p-2"><input placeholder="Service Name" value={newGRPCOperation.serviceName} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, serviceName: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Methods" value={newGRPCOperation.methods} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, methods: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Quota" value={newGRPCOperation.quota} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, quota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Custom attributes" value={newGRPCOperation.customAttributes} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><button onClick={addGRPCOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Custom Attributes Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Custom Attributes</h3>
                  <p className="text-sm text-[#7f8fa8] mb-4">Key-value pairs used to store and retrieve values at runtime. Business Unit details will be automatically included.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
                        <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Value</th><th className="p-2 text-left">Actions</th></tr>
                      </thead>
                      <tbody>
                        {formData.customAttributes.map(attr => (
                          <tr key={attr.id} className="border-b border-[#1f2840]">
                            <td className="p-2"><input value={attr.name} onChange={e => updateAttribute(attr.id, 'name', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><input value={attr.value} onChange={e => updateAttribute(attr.id, 'value', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                            <td className="p-2"><button onClick={() => deleteAttribute(attr.id)} className="text-red-400"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                        <tr className="border-b border-[#1f2840]">
                          <td className="p-2"><input placeholder="Name" value={newAttribute.name} onChange={e => setNewAttribute({ ...newAttribute, name: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><input placeholder="Value" value={newAttribute.value} onChange={e => setNewAttribute({ ...newAttribute, value: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
                          <td className="p-2"><button onClick={addAttribute} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-[#1a1f2e] border border-[#2a3550] rounded-md hover:bg-[#22273b]">Cancel</button>
                  <button onClick={handleSave} className="px-4 py-2 bg-[#ff5b1f] text-white rounded-md hover:bg-[#ff6b36]">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----- VIEW DETAILS SCREEN -----
  if (view === 'view' && selectedProduct) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('list')} className="text-[#ff5b1f] rounded-md"><ArrowLeft size={20} /></button>
          <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
        </div>
         <div className="bg-[#111520] rounded-xl border border-[#1f2840] p-6 space-y-6">
           {loadingProductDetails && <div className="text-sm text-slate-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading complete product details...</div>}
           <div className="grid grid-cols-2 gap-4">
            <div><div className="text-xs text-[#5a6a8a]">Name</div><div className="text-white">{selectedProduct.name}</div></div>
            <div><div className="text-xs text-[#5a6a8a]">Display Name</div><div className="text-white">{selectedProduct.displayName || '-'}</div></div>
            <div><div className="text-xs text-[#5a6a8a]">Environments</div><div className="text-white">{selectedProduct.environments}</div></div>
            <div><div className="text-xs text-[#5a6a8a]">Description</div><div className="text-white">{selectedProduct.description || 'N/A'}</div></div>
           </div>
           <ResourceAuditDetails audit={selectedProduct.audit} showHistory={false} showDeleted={false} />
           <details className="rounded-lg border border-[#2a3550] p-3"><summary className="cursor-pointer text-sm text-slate-300">All product fields</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-400">{JSON.stringify(selectedProduct, null, 2)}</pre></details>
         </div>
      </div>
    );
  }

  return null;
};

export default APIProductsManager;


// import React, { useState, useEffect } from 'react';
// import { Search, Edit, Trash2, Plus, ArrowLeft, Loader2, Copy, GitBranch, X } from 'lucide-react';
// import { GatewayContextSelector } from './GatewayContextSelector';
// import { APIGEE_ENDPOINTS } from '../../config/apigeeConfig';

// // Helper to fetch Apigee token
// const fetchToken = async () => {
//   try {
//     const res = await fetch('https://token-service-113875395623.us-central1.run.app/token');
//     if (!res.ok) throw new Error(`Token service error: ${res.status}`);
//     const data = await res.json();
//     return data.access_token;
//   } catch (err) {
//     console.error('Token fetch error:', err);
//     return null;
//   }
// };

// const APIProductsManager = ({
//   onBack,
//   selectedOrg: externalOrg,
//   onOrgChange,
//   selectedBU: externalBU,
//   onBUChange,
//   selectedEnv: externalEnv,
//   onEnvChange,
//   orgId: fallbackOrg = 'gen-ai-poc-onboarding',
//   envId: fallbackEnv = 'dev',
//   developerEmail: externalDeveloperEmail = 'jagruti.d@krelixir.com',
// }) => {
//   // Selection state
//   const [selectedOrg, setSelectedOrg] = useState(externalOrg || fallbackOrg);
//   const [selectedBU, setSelectedBU] = useState(externalBU || '');
//   const [selectedEnv, setSelectedEnv] = useState(externalEnv || fallbackEnv);

//   const [products, setProducts] = useState([]);
//   const [loadingProducts, setLoadingProducts] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [view, setView] = useState('list');
//   const [selectedProduct, setSelectedProduct] = useState(null);

//   // Modal state
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'

//   // Environment list from API
//   const [environments, setEnvironments] = useState([]);
//   const [loadingEnvs, setLoadingEnvs] = useState(false);

//   // Proxies list for dropdowns
//   const [proxiesList, setProxiesList] = useState([]);
//   const [loadingProxies, setLoadingProxies] = useState(false);

//   // Form state
//   const [formData, setFormData] = useState({
//     name: '', displayName: '', description: '', environment: '',
//     accessType: 'private', autoApprove: false, quotaEnabled: false,
//     quotaEvery: '', quotaInterval: '', quotaUnit: 'minute',
//     llmTokenQuota: false, allowedOAuthScopes: '',
//     operations: [], llmOperations: [], graphqlOperations: [],
//     grpcOperations: [], customAttributes: [],
//   });

//   // Inline add draft states
//   const [newOperation, setNewOperation] = useState({ proxy: '', path: '', methods: '', apiQuota: '', customAttributes: '' });
//   const [newLLMOperation, setNewLLMOperation] = useState({ proxy: '', path: '', model: '', methods: '', quota: '', customAttributes: '' });
//   const [newGraphQLOperation, setNewGraphQLOperation] = useState({ proxy: '', operationName: '', operationTypes: '', quota: '', customAttributes: '' });
//   const [newGRPCOperation, setNewGRPCOperation] = useState({ proxy: '', serviceName: '', methods: '', quota: '', customAttributes: '' });
//   const [newAttribute, setNewAttribute] = useState({ name: '', value: '' });

//   // ---------- Fetch environments from Apigee ----------
//   const fetchEnvironments = async (org) => {
//     if (!org) return;
//     setLoadingEnvs(true);
//     try {
//       const token = await fetchToken();
//       if (!token) throw new Error('No token');
//       const url = (`https://forgegateway.probestack.io/apigee-wrapper/organizations/${org}/environments`);
//       const response = await fetch(url, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const data = await response.json();
//       const envList = Array.isArray(data) ? data : (data.environment || []);
//       setEnvironments(envList);
//     } catch (err) {
//       console.error('Failed to fetch environments', err);
//       setEnvironments([]);
//     } finally {
//       setLoadingEnvs(false);
//     }
//   };

//   // ---------- Fetch list of API proxies from Apigee ----------
//   const fetchProxiesList = async () => {
//     if (!fallbackOrg) return;
//     setLoadingProxies(true);
//     try {
//       const token = await fetchToken();
//       if (!token) throw new Error('No token');
//       const url = `https://forgegateway.probestack.io/apigee-wrapper/organizations/${fallbackOrg}/apis`;
//       const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const data = await response.json();
//       // Apigee returns an array of proxy names
//       const proxyNames = data.proxies?.map(proxy => proxy.name) || [];
//       setProxiesList(proxyNames);
//     } catch (err) {
//       console.error('Failed to fetch proxies', err);
//       setProxiesList([]);
//     } finally {
//       setLoadingProxies(false);
//     }
//   };

//   // Fetch products list
//   const fetchProducts = async () => {
//     if (!fallbackOrg || !selectedEnv) return;
//     setLoadingProducts(true);
//     const effectiveOrg =
//             selectedOrg == "Forgesphere"
//                 ? "gen-ai-poc-onboarding"
//                 : selectedOrg;
//     try {
//       const token = await fetchToken();
//       if (!token) throw new Error('No token');
//       const url = APIGEE_ENDPOINTS.PRODUCTS.LIST(effectiveOrg);
//       const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const data = await res.json();
//       const list = data.apiProduct || [];
//       const enhanced = list.map(p => ({ ...p, environments: selectedEnv }));
//       setProducts(enhanced);
//     } catch (err) {
//       console.error('Failed to fetch products', err);
//       setProducts([]);
//     } finally {
//       setLoadingProducts(false);
//     }
//   };

//   // Fetch full product details for edit
//   const fetchProductDetails = async (productName) => {
//     try {
//       const token = await fetchToken();
//       if (!token) throw new Error('No token');
//       const url = APIGEE_ENDPOINTS.PRODUCTS.GET(fallbackOrg, productName);
//       const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const data = await res.json();
//       return data;
//     } catch (err) {
//       console.error('Failed to fetch product details', err);
//       return null;
//     }
//   };

//   useEffect(() => {
//     if(selectedOrg){
//       fetchProducts();
//     }
//   }, [selectedOrg, selectedEnv]);

//   useEffect(() => {
//     if (fallbackOrg) {
//       fetchEnvironments(fallbackOrg);
//     }
//   }, [selectedOrg, isModalOpen]);

//   // Fetch proxies when modal opens or fallbackOrg changes while modal open
//   useEffect(() => {
//     if (isModalOpen && fallbackOrg) {
//       fetchProxiesList();
//     }
//   }, [isModalOpen, selectedOrg]);

//   // Propagate selection changes
//   const handleOrgChange = (org) => {
//     setSelectedOrg(org);
//     if (onOrgChange) onOrgChange(org);
//   };
//   const handleBUChange = (bu) => {
//     setSelectedBU(bu);
//     if (onBUChange) onBUChange(bu);
//   };
//   const handleEnvChange = (env) => {
//     setSelectedEnv(env);
//     if (onEnvChange) onEnvChange(env);
//   };

//   // Reset form to empty state
//   const resetForm = () => {
//     setFormData({
//       name: '', displayName: '', description: '', environment: '',
//       accessType: 'private', autoApprove: false, quotaEnabled: false,
//       quotaEvery: '', quotaInterval: '', quotaUnit: 'minute',
//       llmTokenQuota: false, allowedOAuthScopes: '',
//       operations: [], llmOperations: [], graphqlOperations: [],
//       grpcOperations: [], customAttributes: [],
//     });
//     setNewOperation({ proxy: '', path: '', methods: '', apiQuota: '', customAttributes: '' });
//     setNewLLMOperation({ proxy: '', path: '', model: '', methods: '', quota: '', customAttributes: '' });
//     setNewGraphQLOperation({ proxy: '', operationName: '', operationTypes: '', quota: '', customAttributes: '' });
//     setNewGRPCOperation({ proxy: '', serviceName: '', methods: '', quota: '', customAttributes: '' });
//     setNewAttribute({ name: '', value: '' });
//   };

//   // Helper to convert Apigee product structure to our formData
//   const mapProductToFormData = (product) => {
//     let operations = [];
//     let llmOperations = [];
//     let graphqlOperations = [];
//     let grpcOperations = [];
//     let customAttributes = product.attributes?.map((attr, idx) => ({
//       id: idx,
//       name: attr.name,
//       value: attr.value,
//     })) || [];

//     if (product.operationGroup && product.operationGroup.operationConfigs) {
//       operations = product.operationGroup.operationConfigs.flatMap((config, idx) => {
//         return (config.operations || []).map((op, opIdx) => ({
//           id: `${idx}-${opIdx}`,
//           proxy: config.apiSource || '',
//           path: op.resource || '',
//           methods: (op.methods || []).join(','),
//           apiQuota: op.quota?.limit || '',
//           customAttributes: '',
//         }));
//       });
//     }

//     return {
//       name: product.name,
//       displayName: product.displayName || '',
//       description: product.description || '',
//       environment: selectedEnv,
//       accessType: product.accessType || 'private',
//       autoApprove: product.approvalType === 'auto',
//       quotaEnabled: !!product.quota,
//       quotaEvery: product.quota?.limit || '',
//       quotaInterval: product.quota?.interval || '',
//       quotaUnit: product.quota?.unit || 'minute',
//       llmTokenQuota: false,
//       allowedOAuthScopes: (product.scopes || []).join(', '),
//       operations,
//       llmOperations,
//       graphqlOperations,
//       grpcOperations,
//       customAttributes,
//     };
//   };

//   // Open modal for create
//   const handleCreate = () => {
//     resetForm();
//     setModalMode('create');
//     setIsModalOpen(true);
//   };

//   // Open modal for edit – fetch full details first
//   const handleEdit = async (product) => {
//     setSelectedProduct(product);
//     setModalMode('edit');
//     const fullProduct = await fetchProductDetails(product.name);
//     if (fullProduct) {
//       const mappedData = mapProductToFormData(fullProduct);
//       setFormData(mappedData);
//     } else {
//       setFormData({
//         name: product.name,
//         displayName: product.displayName || '',
//         description: product.description || '',
//         environment: product.environments || selectedEnv,
//         accessType: 'private',
//         autoApprove: false,
//         quotaEnabled: false,
//         quotaEvery: '',
//         quotaInterval: '',
//         quotaUnit: 'minute',
//         llmTokenQuota: false,
//         allowedOAuthScopes: '',
//         operations: [],
//         llmOperations: [],
//         graphqlOperations: [],
//         grpcOperations: [],
//         customAttributes: [],
//       });
//     }
//     setIsModalOpen(true);
//   };

//   // Save product (POST or PUT to Apigee)
//   const handleSave = async () => {
//     try {
//       const token = await fetchToken();
//       if (!token) throw new Error('No token');
//       const payload = buildApigeePayload(formData);
//       let url, method;
//       if (modalMode === 'create') {
//         url = APIGEE_ENDPOINTS.PRODUCTS.CREATE(fallbackOrg);
//         method = 'POST';
//       } else {
//         url = APIGEE_ENDPOINTS.PRODUCTS.UPDATE(fallbackOrg, formData.name);
//         method = 'PUT';
//       }
//       const res = await fetch(url, {
//         method,
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       setIsModalOpen(false);
//       fetchProducts();
//     } catch (err) {
//       console.error('Save failed', err);
//       alert('Failed to save product');
//     }
//   };

//   // Build Apigee-compatible payload from formData
//   const buildApigeePayload = (data) => {
//     const payload = {
//       name: data.name,
//       displayName: data.displayName,
//       description: data.description,
//       accessType: data.accessType,
//       approvalType: data.autoApprove ? 'auto' : 'manual',
//       scopes: data.allowedOAuthScopes.split(',').map(s => s.trim()).filter(Boolean),
//     };
//     if (data.quotaEnabled) {
//       payload.quota = {
//         limit: data.quotaEvery,
//         interval: data.quotaInterval,
//         unit: data.quotaUnit,
//       };
//     }
//     if (data.operations.length > 0) {
//       payload.operationGroup = {
//         operationConfigs: [
//           {
//             apiSource: 'default',
//             operations: data.operations.map(op => ({
//               resource: op.path,
//               methods: op.methods.split(',').map(m => m.trim()),
//             })),
//           },
//         ],
//       };
//     }
//     if (data.customAttributes.length > 0) {
//       payload.attributes = data.customAttributes.map(attr => ({ name: attr.name, value: attr.value }));
//     }
//     return payload;
//   };

//   // Delete product
//   const handleDelete = async (productName) => {
//     if (!window.confirm(`Delete product "${productName}"?`)) return;
//     try {
//       const token = await fetchToken();
//       if (!token) throw new Error('No token');
//       const url = APIGEE_ENDPOINTS.PRODUCTS.DELETE(selectedOrg, productName);
//       const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       fetchProducts();
//     } catch (err) {
//       console.error('Delete failed', err);
//       alert('Failed to delete product');
//     }
//   };

//   // Clone product
//   const handleClone = async (product) => {
//     const newName = `${product.name}_clone_${Date.now()}`;
//     const fullProduct = await fetchProductDetails(product.name);
//     if (fullProduct) {
//       const clonedPayload = { ...fullProduct, name: newName, displayName: `${product.displayName} (Clone)` };
//       try {
//         const token = await fetchToken();
//         const url = APIGEE_ENDPOINTS.PRODUCTS.CREATE(selectedOrg);
//         const res = await fetch(url, {
//           method: 'POST',
//           headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//           body: JSON.stringify(clonedPayload),
//         });
//         if (res.ok) {
//           fetchProducts();
//           alert('Product cloned successfully');
//         } else {
//           alert('Clone failed');
//         }
//       } catch (err) {
//         console.error(err);
//         alert('Clone error');
//       }
//     }
//   };

//   const handleVersioning = (product) => {
//     alert(`Versioning for: ${product.name}`);
//   };

//   const handleView = (product) => {
//     setSelectedProduct(product);
//     setView('view');
//   };

//   // ---------- Table row handlers ----------
//   const addOperation = () => {
//     if (newOperation.proxy && newOperation.path) {
//       setFormData({
//         ...formData,
//         operations: [...formData.operations, { ...newOperation, id: Date.now() }]
//       });
//       setNewOperation({ proxy: '', path: '', methods: '', apiQuota: '', customAttributes: '' });
//     }
//   };
//   const updateOperation = (id, field, value) => {
//     setFormData({
//       ...formData,
//       operations: formData.operations.map(op => op.id === id ? { ...op, [field]: value } : op)
//     });
//   };
//   const deleteOperation = (id) => {
//     setFormData({ ...formData, operations: formData.operations.filter(op => op.id !== id) });
//   };

//   const addLLMOperation = () => {
//     if (newLLMOperation.proxy && newLLMOperation.path) {
//       setFormData({
//         ...formData,
//         llmOperations: [...formData.llmOperations, { ...newLLMOperation, id: Date.now() }]
//       });
//       setNewLLMOperation({ proxy: '', path: '', model: '', methods: '', quota: '', customAttributes: '' });
//     }
//   };
//   const updateLLMOperation = (id, field, value) => {
//     setFormData({
//       ...formData,
//       llmOperations: formData.llmOperations.map(op => op.id === id ? { ...op, [field]: value } : op)
//     });
//   };
//   const deleteLLMOperation = (id) => {
//     setFormData({ ...formData, llmOperations: formData.llmOperations.filter(op => op.id !== id) });
//   };

//   const addGraphQLOperation = () => {
//     if (newGraphQLOperation.proxy && newGraphQLOperation.operationName) {
//       setFormData({
//         ...formData,
//         graphqlOperations: [...formData.graphqlOperations, { ...newGraphQLOperation, id: Date.now() }]
//       });
//       setNewGraphQLOperation({ proxy: '', operationName: '', operationTypes: '', quota: '', customAttributes: '' });
//     }
//   };
//   const updateGraphQLOperation = (id, field, value) => {
//     setFormData({
//       ...formData,
//       graphqlOperations: formData.graphqlOperations.map(op => op.id === id ? { ...op, [field]: value } : op)
//     });
//   };
//   const deleteGraphQLOperation = (id) => {
//     setFormData({ ...formData, graphqlOperations: formData.graphqlOperations.filter(op => op.id !== id) });
//   };

//   const addGRPCOperation = () => {
//     if (newGRPCOperation.proxy && newGRPCOperation.serviceName) {
//       setFormData({
//         ...formData,
//         grpcOperations: [...formData.grpcOperations, { ...newGRPCOperation, id: Date.now() }]
//       });
//       setNewGRPCOperation({ proxy: '', serviceName: '', methods: '', quota: '', customAttributes: '' });
//     }
//   };
//   const updateGRPCOperation = (id, field, value) => {
//     setFormData({
//       ...formData,
//       grpcOperations: formData.grpcOperations.map(op => op.id === id ? { ...op, [field]: value } : op)
//     });
//   };
//   const deleteGRPCOperation = (id) => {
//     setFormData({ ...formData, grpcOperations: formData.grpcOperations.filter(op => op.id !== id) });
//   };

//   const addAttribute = () => {
//     if (newAttribute.name && newAttribute.value) {
//       setFormData({
//         ...formData,
//         customAttributes: [...formData.customAttributes, { ...newAttribute, id: Date.now() }]
//       });
//       setNewAttribute({ name: '', value: '' });
//     }
//   };
//   const updateAttribute = (id, field, value) => {
//     setFormData({
//       ...formData,
//       customAttributes: formData.customAttributes.map(attr => attr.id === id ? { ...attr, [field]: value } : attr)
//     });
//   };
//   const deleteAttribute = (id) => {
//     setFormData({ ...formData, customAttributes: formData.customAttributes.filter(attr => attr.id !== id) });
//   };

//   // Filter products
//   const filteredProducts = products.filter(p =>
//     p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     p.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // ---------- RENDER LIST VIEW ----------
//   if (view === 'list') {
//     return (
//       <>
//         <div className="pl-2 space-y-2">
//           <h2 className="text-xl font-semibold ml-1">API Products</h2>
//           <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
//             <GatewayContextSelector
//               selectedOrg={selectedOrg}
//               setSelectedOrg={handleOrgChange}
//               selectedBU={selectedBU}
//               setSelectedBU={handleBUChange}
//               selectedEnv={selectedEnv}
//               setSelectedEnv={handleEnvChange}
//               showEnv={true}
//             />
//             <div className="flex gap-2">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a8a]" />
//                 <input
//                   type="text"
//                   placeholder="Filter products..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:border-[#4f8ef7]"
//                 />
//               </div>
//               <button
//                 onClick={handleCreate}
//                 className="px-3 py-1.5 bg-[#ff5b1f] text-white rounded-md text-sm font-medium hover:bg-[#ff6b36] flex items-center gap-1"
//               >
//                 <Plus size={16} /> Create
//               </button>
//             </div>
//           </div>

//           {loadingProducts ? (
//             <div className="flex justify-center py-12">
//               <Loader2 className="h-6 w-6 animate-spin text-[#ff5b1f]" />
//             </div>
//           ) : (
//             <div className="bg-[#111520] rounded-xl border border-[#1f2840] overflow-hidden">
//               <table className="w-full text-sm">
//                 <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                   <tr>
//                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Name</th>
//                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Display Name</th>
//                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Environments</th>
//                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Source</th>
//                     <th className="text-left p-3 text-[#5a6a8a] font-medium">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredProducts.map(product => (
//                     <tr key={product.name} className="border-b border-[#1f2840] hover:bg-[#1a1f2e] cursor-pointer">
//                       <td className="p-3 text-white" onClick={() => handleView(product)}>{product.name}</td>
//                       <td className="p-3 text-[#7f8fa8]" onClick={() => handleView(product)}>{product.displayName || '-'}</td>
//                       <td className="p-3 text-[#7f8fa8]" onClick={() => handleView(product)}>{product.environments || selectedEnv}</td>
//                       <td className="p-3 text-[#7f8fa8]">
//                         {product.source === "PLATFORM" ? (
//                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
//                             ForgeSphere
//                           </span>
//                         ) : (
//                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-300">
//                             API Hub
//                           </span>
//                         )}
//                       </td>
//                       <td className="p-3 flex gap-2">
//                         <button
//                           onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
//                           className="text-[#4f8ef7] hover:text-[#6ca9ff]"
//                           title="Edit"
//                         >
//                           <Edit size={16} />
//                         </button>
//                         <button
//                           onClick={(e) => { e.stopPropagation(); handleClone(product); }}
//                           className="text-emerald-400 hover:text-emerald-300"
//                           title="Clone"
//                         >
//                           <Copy size={16} />
//                         </button>
//                         <button
//                           onClick={(e) => { e.stopPropagation(); handleVersioning(product); }}
//                           className="text-amber-400 hover:text-amber-300"
//                           title="Versioning"
//                         >
//                           <GitBranch size={16} />
//                         </button>
//                         <button
//                           onClick={(e) => { e.stopPropagation(); handleDelete(product.name); }}
//                           className="text-red-400 hover:text-red-500"
//                           title="Delete"
//                         >
//                           <Trash2 size={16} />
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                   {filteredProducts.length === 0 && (
//                     <tr><td colSpan="5" className="p-6 text-center text-[#7f8fa8]">No products found</td></tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>

//         {/* MODAL for Create/Edit */}
//         {isModalOpen && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
//             <div className="bg-[#111520] rounded-xl border border-[#1f2840] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
//               <div className="sticky top-0 bg-[#111520] border-b border-[#1f2840] px-6 py-4 flex justify-between items-center">
//                 <h2 className="text-xl font-semibold">{modalMode === 'create' ? 'Create Product' : 'Edit Product'}</h2>
//                 <button onClick={() => setIsModalOpen(false)} className="text-[#5a6a8a] hover:text-white">
//                   <X size={20} />
//                 </button>
//               </div>
//               <div className="p-6 space-y-8">
//                 {/* Product details */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-4">Product details</h3>
//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-sm font-medium mb-1">Name *</label>
//                       <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4f8ef7]" />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium mb-1">Display Name</label>
//                       <input type="text" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4f8ef7]" />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium mb-1">Description</label>
//                       <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2 focus:outline-none focus:border-[#4f8ef7]" />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium mb-1">Environment</label>
//                       {loadingEnvs ? (
//                         <div className="flex items-center gap-2 text-[#7f8fa8]"><Loader2 size={14} className="animate-spin" /> Loading environments...</div>
//                       ) : (
//                         <select
//                           value={formData.environment}
//                           onChange={e => setFormData({ ...formData, environment: e.target.value })}
//                           className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2"
//                         >
//                           <option value="">Select environment</option>
//                           {environments.map(env => <option key={env} value={env}>{env}</option>)}
//                         </select>
//                       )}
//                       <p className="text-xs text-[#5a6a8a] mt-1">Not selecting any environment will allow access to all environments.</p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Access Section */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-4">Access *</h3>
//                   <div className="space-y-3">
//                     <div className="flex items-center gap-4">
//                       <label className="flex items-center gap-2">
//                         <input type="radio" name="accessType" value="private" checked={formData.accessType === 'private'} onChange={() => setFormData({ ...formData, accessType: 'private' })} className="accent-[#ff5b1f]" /> Private
//                       </label>
//                       <label className="flex items-center gap-2">
//                         <input type="radio" name="accessType" value="public" checked={formData.accessType === 'public'} onChange={() => setFormData({ ...formData, accessType: 'public' })} className="accent-[#ff5b1f]" /> Public
//                       </label>
//                     </div>
//                     <label className="flex items-center gap-2">
//                       <input type="checkbox" checked={formData.autoApprove} onChange={e => setFormData({ ...formData, autoApprove: e.target.checked })} /> Automatically approve access requests
//                     </label>
//                     <div className="mt-4">
//                       <label className="flex items-center gap-2 mb-2">
//                         <input type="checkbox" checked={formData.quotaEnabled} onChange={e => setFormData({ ...formData, quotaEnabled: e.target.checked })} /> Api quota limit
//                       </label>
//                       {formData.quotaEnabled && (
//                         <div className="ml-6 flex items-center gap-2 flex-wrap">
//                           <span>Request every</span>
//                           <input type="number" value={formData.quotaEvery} onChange={e => setFormData({ ...formData, quotaEvery: e.target.value })} className="w-20 bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" />
//                           <input type="text" placeholder="Time interval" value={formData.quotaInterval} onChange={e => setFormData({ ...formData, quotaInterval: e.target.value })} className="w-32 bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" />
//                           <select value={formData.quotaUnit} onChange={e => setFormData({ ...formData, quotaUnit: e.target.value })} className="bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1">
//                             <option value="minute">minute</option><option value="hour">hour</option><option value="day">day</option><option value="month">month</option>
//                           </select>
//                         </div>
//                       )}
//                       <p className="text-xs text-[#5a6a8a] mt-2">You must add a Quota policy to the API proxy to enforce a quota based on these values. <a href="#" className="text-[#4f8ef7] hover:underline">Learn more</a></p>
//                       <label className="flex items-center gap-2 mt-2">
//                         <input type="checkbox" checked={formData.llmTokenQuota} onChange={e => setFormData({ ...formData, llmTokenQuota: e.target.checked })} /> Set LLM token quota limit
//                       </label>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Allowed OAuth scope */}
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Allowed OAuth scope</label>
//                   <input type="text" placeholder="Comma separated scope names" value={formData.allowedOAuthScopes} onChange={e => setFormData({ ...formData, allowedOAuthScopes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-3 py-2" />
//                 </div>

//                 {/* Operations Table */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-2">Operations</h3>
//                   <p className="text-sm text-[#7f8fa8] mb-4">Specify operations allowed on an API proxy, including resource paths, HTTP methods, and quotas.</p>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm">
//                       <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                         <tr>
//                           <th className="p-2 text-left">Proxy</th>
//                           <th className="p-2 text-left">Path</th>
//                           <th className="p-2 text-left">Method(s)</th>
//                           <th className="p-2 text-left">Api quota</th>
//                           <th className="p-2 text-left">Custom attributes</th>
//                           <th className="p-2 text-left">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {formData.operations.map(op => (
//                           <tr key={op.id} className="border-b border-[#1f2840]">
//                             <td className="p-2">
//                               <select
//                                 value={op.proxy}
//                                 onChange={e => updateOperation(op.id, 'proxy', e.target.value)}
//                                 className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                                 disabled={loadingProxies}
//                               >
//                                 <option value="">Select proxy</option>
//                                 {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                               </select>
//                             </td>
//                             <td className="p-2"><input value={op.path} onChange={e => updateOperation(op.id, 'path', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.methods} onChange={e => updateOperation(op.id, 'methods', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.apiQuota} onChange={e => updateOperation(op.id, 'apiQuota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.customAttributes} onChange={e => updateOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><button onClick={() => deleteOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
//                           </tr>
//                         ))}
//                         <tr className="border-b border-[#1f2840]">
//                           <td className="p-2">
//                             <select
//                               value={newOperation.proxy}
//                               onChange={e => setNewOperation({ ...newOperation, proxy: e.target.value })}
//                               className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                               disabled={loadingProxies}
//                             >
//                               <option value="">Select proxy</option>
//                               {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                             </select>
//                           </td>
//                           <td className="p-2"><input placeholder="Path" value={newOperation.path} onChange={e => setNewOperation({ ...newOperation, path: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Method(s)" value={newOperation.methods} onChange={e => setNewOperation({ ...newOperation, methods: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Api quota" value={newOperation.apiQuota} onChange={e => setNewOperation({ ...newOperation, apiQuota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Custom attributes" value={newOperation.customAttributes} onChange={e => setNewOperation({ ...newOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><button onClick={addOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* LLM Operations Table */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-2">LLM Operations</h3>
//                   <p className="text-sm text-[#7f8fa8] mb-4">Specify operations allowed on an API proxy, including model, resource paths, and token quotas.</p>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm">
//                       <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                         <tr>
//                           <th className="p-2 text-left">Proxy</th>
//                           <th className="p-2 text-left">Path</th>
//                           <th className="p-2 text-left">Model</th>
//                           <th className="p-2 text-left">Method(s)</th>
//                           <th className="p-2 text-left">Quota</th>
//                           <th className="p-2 text-left">Custom attributes</th>
//                           <th className="p-2 text-left">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {formData.llmOperations.map(op => (
//                           <tr key={op.id} className="border-b border-[#1f2840]">
//                             <td className="p-2">
//                               <select
//                                 value={op.proxy}
//                                 onChange={e => updateLLMOperation(op.id, 'proxy', e.target.value)}
//                                 className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                                 disabled={loadingProxies}
//                               >
//                                 <option value="">Select proxy</option>
//                                 {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                               </select>
//                             </td>
//                             <td className="p-2"><input value={op.path} onChange={e => updateLLMOperation(op.id, 'path', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.model} onChange={e => updateLLMOperation(op.id, 'model', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.methods} onChange={e => updateLLMOperation(op.id, 'methods', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.quota} onChange={e => updateLLMOperation(op.id, 'quota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.customAttributes} onChange={e => updateLLMOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><button onClick={() => deleteLLMOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
//                           </tr>
//                         ))}
//                         <tr>
//                           <td className="p-2">
//                             <select
//                               value={newLLMOperation.proxy}
//                               onChange={e => setNewLLMOperation({ ...newLLMOperation, proxy: e.target.value })}
//                               className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                               disabled={loadingProxies}
//                             >
//                               <option value="">Select proxy</option>
//                               {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                             </select>
//                           </td>
//                           <td className="p-2"><input placeholder="Path" value={newLLMOperation.path} onChange={e => setNewLLMOperation({ ...newLLMOperation, path: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Model" value={newLLMOperation.model} onChange={e => setNewLLMOperation({ ...newLLMOperation, model: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Method(s)" value={newLLMOperation.methods} onChange={e => setNewLLMOperation({ ...newLLMOperation, methods: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Quota" value={newLLMOperation.quota} onChange={e => setNewLLMOperation({ ...newLLMOperation, quota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Custom attributes" value={newLLMOperation.customAttributes} onChange={e => setNewLLMOperation({ ...newLLMOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><button onClick={addLLMOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* GraphQL Operations Table */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-2">GraphQL Operations</h3>
//                   <p className="text-sm text-[#7f8fa8] mb-4">Specify operation types with optional operation name to apply quota upon.</p>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm">
//                       <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                         <tr>
//                           <th className="p-2 text-left">Proxy</th>
//                           <th className="p-2 text-left">Operation Name</th>
//                           <th className="p-2 text-left">Operation Type(s)</th>
//                           <th className="p-2 text-left">Quota</th>
//                           <th className="p-2 text-left">Custom attributes</th>
//                           <th className="p-2 text-left">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {formData.graphqlOperations.map(op => (
//                           <tr key={op.id} className="border-b border-[#1f2840]">
//                             <td className="p-2">
//                               <select
//                                 value={op.proxy}
//                                 onChange={e => updateGraphQLOperation(op.id, 'proxy', e.target.value)}
//                                 className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                                 disabled={loadingProxies}
//                               >
//                                 <option value="">Select proxy</option>
//                                 {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                               </select>
//                             </td>
//                             <td className="p-2"><input value={op.operationName} onChange={e => updateGraphQLOperation(op.id, 'operationName', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.operationTypes} onChange={e => updateGraphQLOperation(op.id, 'operationTypes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.quota} onChange={e => updateGraphQLOperation(op.id, 'quota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.customAttributes} onChange={e => updateGraphQLOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><button onClick={() => deleteGraphQLOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
//                           </tr>
//                         ))}
//                         <tr>
//                           <td className="p-2">
//                             <select
//                               value={newGraphQLOperation.proxy}
//                               onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, proxy: e.target.value })}
//                               className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                               disabled={loadingProxies}
//                             >
//                               <option value="">Select proxy</option>
//                               {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                             </select>
//                           </td>
//                           <td className="p-2"><input placeholder="Operation Name" value={newGraphQLOperation.operationName} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, operationName: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Operation Type(s)" value={newGraphQLOperation.operationTypes} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, operationTypes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Quota" value={newGraphQLOperation.quota} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, quota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Custom attributes" value={newGraphQLOperation.customAttributes} onChange={e => setNewGraphQLOperation({ ...newGraphQLOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><button onClick={addGraphQLOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* gRPC Operations Table */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-2">gRPC Operations</h3>
//                   <p className="text-sm text-[#7f8fa8] mb-4">Specify gRPC methods allowed on an API proxy, including quotas.</p>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm">
//                       <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                         <tr>
//                           <th className="p-2 text-left">Proxy</th>
//                           <th className="p-2 text-left">Service Name</th>
//                           <th className="p-2 text-left">gRPC Method(s) in service</th>
//                           <th className="p-2 text-left">Quota</th>
//                           <th className="p-2 text-left">Custom attributes</th>
//                           <th className="p-2 text-left">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {formData.grpcOperations.map(op => (
//                           <tr key={op.id} className="border-b border-[#1f2840]">
//                             <td className="p-2">
//                               <select
//                                 value={op.proxy}
//                                 onChange={e => updateGRPCOperation(op.id, 'proxy', e.target.value)}
//                                 className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                                 disabled={loadingProxies}
//                               >
//                                 <option value="">Select proxy</option>
//                                 {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                               </select>
//                             </td>
//                             <td className="p-2"><input value={op.serviceName} onChange={e => updateGRPCOperation(op.id, 'serviceName', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.methods} onChange={e => updateGRPCOperation(op.id, 'methods', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.quota} onChange={e => updateGRPCOperation(op.id, 'quota', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={op.customAttributes} onChange={e => updateGRPCOperation(op.id, 'customAttributes', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><button onClick={() => deleteGRPCOperation(op.id)} className="text-red-400"><Trash2 size={16} /></button></td>
//                           </tr>
//                         ))}
//                         <tr>
//                           <td className="p-2">
//                             <select
//                               value={newGRPCOperation.proxy}
//                               onChange={e => setNewGRPCOperation({ ...newGRPCOperation, proxy: e.target.value })}
//                               className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1"
//                               disabled={loadingProxies}
//                             >
//                               <option value="">Select proxy</option>
//                               {proxiesList.map(proxy => <option key={proxy} value={proxy}>{proxy}</option>)}
//                             </select>
//                           </td>
//                           <td className="p-2"><input placeholder="Service Name" value={newGRPCOperation.serviceName} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, serviceName: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Methods" value={newGRPCOperation.methods} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, methods: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Quota" value={newGRPCOperation.quota} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, quota: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Custom attributes" value={newGRPCOperation.customAttributes} onChange={e => setNewGRPCOperation({ ...newGRPCOperation, customAttributes: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><button onClick={addGRPCOperation} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {/* Custom Attributes Table */}
//                 <div>
//                   <h3 className="text-lg font-semibold mb-2">Custom Attributes</h3>
//                   <p className="text-sm text-[#7f8fa8] mb-4">Key-value pairs used to store and retrieve values at runtime to control API proxy execution and customize analytics reports.</p>
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm">
//                       <thead className="bg-[#1a1f2e] border-b border-[#1f2840]">
//                         <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Value</th><th className="p-2 text-left">Actions</th></tr>
//                       </thead>
//                       <tbody>
//                         {formData.customAttributes.map(attr => (
//                           <tr key={attr.id} className="border-b border-[#1f2840]">
//                             <td className="p-2"><input value={attr.name} onChange={e => updateAttribute(attr.id, 'name', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><input value={attr.value} onChange={e => updateAttribute(attr.id, 'value', e.target.value)} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                             <td className="p-2"><button onClick={() => deleteAttribute(attr.id)} className="text-red-400"><Trash2 size={16} /></button></td>
//                           </tr>
//                         ))}
//                         <tr>
//                           <td className="p-2"><input placeholder="Name" value={newAttribute.name} onChange={e => setNewAttribute({ ...newAttribute, name: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><input placeholder="Value" value={newAttribute.value} onChange={e => setNewAttribute({ ...newAttribute, value: e.target.value })} className="w-full bg-[#1a1f2e] border border-[#2a3550] rounded px-2 py-1" /></td>
//                           <td className="p-2"><button onClick={addAttribute} className="text-[#4f8ef7]"><Plus size={16} /></button></td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 <div className="flex justify-end gap-2 pt-4">
//                   <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-[#1a1f2e] border border-[#2a3550] rounded-md hover:bg-[#22273b]">Cancel</button>
//                   <button onClick={handleSave} className="px-4 py-2 bg-[#ff5b1f] text-white rounded-md hover:bg-[#ff6b36]">Save</button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </>
//     );
//   }

//   // View details screen
//   if (view === 'view' && selectedProduct) {
//     return (
//       <div className="p-6">
//         <div className="flex items-center gap-3 mb-4">
//           <button onClick={() => setView('list')} className="text-[#ff5b1f] rounded-md"><ArrowLeft size={20} /></button>
//           <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
//         </div>
//         <div className="bg-[#111520] rounded-xl border border-[#1f2840] p-6 space-y-6">
//           <div className="grid grid-cols-2 gap-4">
//             <div><div className="text-xs text-[#5a6a8a]">Name</div><div className="text-white">{selectedProduct.name}</div></div>
//             <div><div className="text-xs text-[#5a6a8a]">Display Name</div><div className="text-white">{selectedProduct.displayName || '-'}</div></div>
//             <div><div className="text-xs text-[#5a6a8a]">Environments</div><div className="text-white">{selectedProduct.environments}</div></div>
//             <div><div className="text-xs text-[#5a6a8a]">Description</div><div className="text-white">{selectedProduct.description || 'N/A'}</div></div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return null;
// };

// export default APIProductsManager;
