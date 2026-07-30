import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Search, Plus, RefreshCw, Plug, Trash2, ArrowUp, RotateCcw, Pencil, AlertTriangle, Eye, Key } from "lucide-react";
import CreateTargetServerModal from "./components/TargetServer/CreateTargetServerModal";
import TargetServerDetailsModal from "./components/TargetServer/TargetServerDetailsModal";
import CreateKVMModal from "./components/KVM/CreateKVMModal";
import CreateAppModal from "./components/App/CreateAppModal";
import AppCredentialsModal from "./components/App/AppCredentialsModal";
import CreateProductModal from "./components/Product/CreateProductModal";
import { AppSyncModal, KVMSyncModal, TargetServerSyncModal } from "../../components/SyncModal";
import Toast from "../../components/ui/toast";
import { APIGEE_ENDPOINTS } from "../../config/apigeeConfig";
import { apigeeApiFetch, initializeApigeeToken } from "../../services/apigeeApiService";
import useApigeeDevelopers from "./components/useApigeeDevelopers";
import { TableSkeletonRows } from "../../components/ui/SkeletonLoader";
import CreateKeystore from "./components/Keystore/CreateKeyStore";
import OnboardingCascadeSelect from "./components/OnboardingCascadeSelect";
import { appendTrackingQuery, getTrackingHeaders, loadApigeeOnboardingOptions } from "./components/apigeeTracking";

export default function ApigeeMainPage({showHeader = true, forceTab = null, overrideIsGatewayPage = null}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [resourceType, setResourceType] = useState("Backend Service");
  const [activeTab, setActiveTab] = useState(resourceType);
  const [isTargetServerModal, setIsTargetServerModal] = useState(false);
  const [isKVMModal, setIsKVMModal] = useState(false);
  const [isAppModal, setIsAppModal] = useState(false);
  const [isProductModal, setIsProductModal] = useState(false);
  const [isKeystoreModal, setIsKeystoreModal] = useState(false);
  const [selectedAppName, setSelectedAppName] = useState("");

  //sync modals
  const [isTSSyncModal, setIsTSSyncModal] = useState(false);
  const [isKVMSyncModal, setIsKVMSyncModal] = useState(false);
  const [isAppSyncModal, setIsAppSyncModal] = useState(false);

  const [tsEditData, setTSEditData] = useState(null);
  const [tsDetailsData, setTSDetailsData] = useState(null);
  const [isTSDetailsModalOpen, setIsTSDetailsModalOpen] = useState(false);
  const [isFetchingTSDetails, setIsFetchingTSDetails] = useState(false);
  const [tsDetailsError, setTSDetailsError] = useState("");
  const [kvmEditData, setKVMEditData] = useState(null);
  const [appEditData, setAppEditData] = useState(null);
  const [appDetailsData, setAppDetailsData] = useState(null);
  const [isAppCredentialsModalOpen, setIsAppCredentialsModalOpen] = useState(false);
  const [isFetchingAppDetails, setIsFetchingAppDetails] = useState(false);
  const [appDetailsError, setAppDetailsError] = useState("");
  const [productEditData, setProductEditData] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [gatewayType, setGatewayType] = useState("Apigee X");
  const [appId, setAppId] = useState("");
  const [projectId, setProjectId] = useState("gen-ai-poc-onboarding");
  const [env, setEnv] = useState("dev");
  const [developerEmail, setDeveloperEmail] = useState("jagruti.d@krelixir.com");
  const [organizations, setOrganizations] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [isFetchingOrganizations, setIsFetchingOrganizations] = useState(false);
  const [isFetchingEnvironments, setIsFetchingEnvironments] = useState(false);
  const [keystoreEditData, setKeystoreEditData] = useState(null);

  // Search states
  const [targetServerSearch, setTargetServerSearch] = useState("");
  const [kvmSearch, setKvmSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [keystoreSearch, setKeystoreSearch] = useState("");

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null, // 'targetServer', 'kvm', 'app', 'product'
    itemName: null,
    itemId: null,
    deleteFunction: null
  });

  // Backend Service real data state
  const [targetServers, setTargetServers] = useState([]);
  const [isFetchingTS, setIsFetchingTS] = useState(false);
  const [kvms, setKvms] = useState([]);
  const [isFetchingKVM, setIsFetchingKVM] = useState(false);
  const [apps, setApps] = useState([]);
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const [products, setProducts] = useState([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [keystores, setKeystores] = useState([]);
  const [isFetchingKeystores, setIsFetchingKeystores] = useState(false);
  const { developers, isFetchingDevelopers } = useApigeeDevelopers(projectId);
  const [onboardingOptions, setOnboardingOptions] = useState([]);
  const [isFetchingOnboardings, setIsFetchingOnboardings] = useState(false);
  const [selectedOnboardingId, setSelectedOnboardingId] = useState("");
  const [selectedMicroserviceId, setSelectedMicroserviceId] = useState("");
  const isGatewayEnvironmentsPage = overrideIsGatewayPage !== null
    ? overrideIsGatewayPage
    : location.pathname.startsWith("/gateway") || location.pathname.startsWith("/fs-gateway/");
  const configureTabs = useMemo(() => (
    isGatewayEnvironmentsPage
      ? [
        { label: "Backend Service", value: "Backend Service" },
        { label: "Config Map", value: "KVM" },
        { label: "Trust Store", value: "Key Store" },
      ]
      : [
        { label: "Backend Service", value: "Backend Service" },
        { label: "KVM", value: "KVM" },
        { label: "Apps", value: "App" },
        { label: "Product", value: "Product" },
      ]
  ), [isGatewayEnvironmentsPage]);

  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab);
      setResourceType(forceTab);
      return;
    }
    if (!configureTabs.some((tab) => tab.value === activeTab)) {
      const nextTab = configureTabs[0]?.value || "Backend Service";
      setActiveTab(nextTab);
      setResourceType(nextTab);
    }
  }, [configureTabs, activeTab, forceTab]);

  // Initialize Apigee token on component mount
  useEffect(() => {
    initializeApigeeToken()
      .then(() => fetchOrganizations())
      .catch((error) => {
        console.error("Failed to initialize Apigee token", error);
      });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setIsFetchingOnboardings(true);
      try {
        const options = await loadApigeeOnboardingOptions();
        if (!mounted) return;

        setOnboardingOptions(options);

        const selected = options.find((option) => option.onboardingId === selectedOnboardingId);
        if (selected) {
          setSelectedMicroserviceId(selected.microserviceId || "");
        }
      } catch (error) {
        console.error("Failed to load onboarding options", error);
      } finally {
        if (mounted) {
          setIsFetchingOnboardings(false);
        }
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizeNameList = (data, primaryKey) => {
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.[primaryKey])
        ? data[primaryKey]
        : Array.isArray(data?.name)
          ? data.name
          : [];

    return rawList
      .map((item) => (
        typeof item === 'string'
          ? item
          : item?.organization || item?.projectId || item?.name || item?.displayName || item?.id
      ))
      .filter(Boolean);
  };

  const fetchKeystores = async (org = projectId, environment = env) => {
    if (!org || !environment) return;
    setIsFetchingKeystores(true);
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.TLS_KEYSTORES.LIST(org, environment));
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map((item) => (typeof item === 'string' ? { name: item } : item))
        : [];
      // For each keystore, try to fetch first alias to populate common name, type, expiration
      const enriched = await Promise.all(
        list.map(async (ks) => {
          try {
            const aliasRes = await apigeeApiFetch(
              APIGEE_ENDPOINTS.TLS_KEYSTORES.ALIASES.LIST(org, environment, ks.name)
            );
            const aliasData = await aliasRes.json();
            const aliases = Array.isArray(aliasData) ? aliasData : aliasData?.aliases || [];
            if (aliases.length > 0) {
              const first = aliases[0];
              return {
                ...ks,
                commonName: first?.certInfo?.commonName || first?.commonName || "",
                certType: first?.type || "",
                expiration: first?.certInfo?.expiryDate
                  ? new Date(first.certInfo.expiryDate).toLocaleDateString()
                  : first?.expiryDate
                    ? new Date(first.expiryDate).toLocaleDateString()
                    : ""
              };
            }
          } catch (e) {
            console.warn("Could not fetch aliases for", ks.name, e);
          }
          return ks;
        })
      );
      setKeystores(enriched);
    } catch (e) {
      console.error('Failed to fetch keystores', e);
    }
    setIsFetchingKeystores(false);
  };

  // --- NEW DELETE KEYSTORE ---
  const deleteKeystore = async (name) => {
    if (!name) return;
    try {
      await apigeeApiFetch(APIGEE_ENDPOINTS.TLS_KEYSTORES.DELETE(projectId, env, name), {
        method: 'DELETE',
      });
      setKeystores(prev => prev.filter(k => k.name !== name));
    } catch (e) {
      console.error('Failed to delete keystore', e);
      alert('Failed to delete keystore. Please try again.');
    }
  };

  const fetchOrganizations = async () => {
    setIsFetchingOrganizations(true);
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.ORGANIZATIONS.LIST);
      const data = await res.json();
      const list = normalizeNameList(data, 'organizations');
      setOrganizations(list);
      if (list.length > 0 && !list.includes(projectId)) {
        setProjectId(list[0]);
      }
    } catch (e) {
      console.error('Failed to fetch organizations', e);
    }
    setIsFetchingOrganizations(false);
  };

  const fetchEnvironments = async (org = projectId) => {
    if (!org) return;
    setIsFetchingEnvironments(true);
    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.ENVIRONMENT.LIST(org));
      const data = await res.json();
      const list = normalizeNameList(data, 'environments');
      setEnvironments(list);
      if (list.length > 0 && !list.includes(env)) {
        setEnv(list[0]);
      }
    } catch (e) {
      console.error('Failed to fetch environments', e);
      setEnvironments([]);
    }
    setIsFetchingEnvironments(false);
  };

  useEffect(() => {
    if (projectId) fetchEnvironments(projectId);
  }, [projectId]);

  useEffect(() => {
    if (developers.length > 0 && !developers.includes(developerEmail)) {
      setDeveloperEmail(developers[0]);
    }
  }, [developers, developerEmail]);

  const renderOrganizationSelect = () => (
    <select
      value={projectId}
      onChange={(e) => setProjectId(e.target.value)}
      className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
    >
      {isFetchingOrganizations ? (
        <option value={projectId}>Loading organizations...</option>
      ) : (
        <>
          {projectId && !organizations.includes(projectId) && <option value={projectId}>{projectId}</option>}
          {organizations.length === 0 && <option value="">No organizations found</option>}
          {organizations.map((org) => (
            <option key={org} value={org}>{org}</option>
          ))}
        </>
      )}
    </select>
  );

  const renderEnvironmentSelect = () => (
    <select
      value={env}
      onChange={(e) => setEnv(e.target.value)}
      disabled={isFetchingEnvironments || environments.length === 0}
      className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isFetchingEnvironments ? (
        <option value={env}>Loading environments...</option>
      ) : (
        <>
          {env && !environments.includes(env) && <option value={env}>{env}</option>}
          {environments.length === 0 && <option value="">No environments found</option>}
          {environments.map((environment) => (
            <option key={environment} value={environment}>{environment}</option>
          ))}
        </>
      )}
    </select>
  );

  const handleOnboardingChange = (onboardingId, option) => {
    setSelectedOnboardingId(onboardingId);
    setSelectedMicroserviceId(option?.microserviceId || "");
  };

  const renderListOnboardingSelect = () => (
    <OnboardingCascadeSelect
      value={selectedOnboardingId}
      onChange={handleOnboardingChange}
      options={onboardingOptions}
      isLoading={isFetchingOnboardings}
      allowAll
      className="min-w-[680px]"
    />
  );

  const renderSourceBadge = (source) => {
    const normalizedSource = source === "PLATFORM" ? "PLATFORM" : "DIRECT_MANAGEMENT_API";
    const label = normalizedSource === "PLATFORM" ? "ForgeSphere" : "Api Hub";
    const className = normalizedSource === "PLATFORM"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/40 bg-amber-500/10 text-amber-300";

    return (
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  const getResourceTracking = (resource = {}) => ({
    onboardingId: resource.onboardingId || selectedOnboardingId,
    microserviceId: resource.microserviceId || selectedMicroserviceId,
  });

  const getListUrl = (url) => appendTrackingQuery(url, {
    onboardingId: selectedOnboardingId,
    microserviceId: selectedMicroserviceId,
  });

  const getDeleteHeaders = (resource = {}) => {
    const tracking = getResourceTracking(resource);

    if (!tracking.onboardingId) {
      alert("Please select an onboarding before deleting this Apigee config.");
      return null;
    }

    return getTrackingHeaders(tracking);
  };

  const fetchTargetServers = async (org = projectId, environment = env) => {
    if (!org || !environment) return;
    setIsFetchingTS(true);
    try {
      const res = await apigeeApiFetch(getListUrl(APIGEE_ENDPOINTS.TARGET_SERVERS.LIST(org, environment)));
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map((item) => (typeof item === 'string' ? { name: item, projectId, env, isEnabled: true } : item))
        : [];
      setTargetServers(list);
    } catch (e) {
      console.error('Failed to fetch target servers', e);
    }
    setIsFetchingTS(false);
  };

  const fetchKVMServers = async (org = projectId, environment = env) => {
    if (!org || !environment) return;
    setIsFetchingKVM(true);
    try {
      const res = await apigeeApiFetch(getListUrl(APIGEE_ENDPOINTS.KVM_ENV_LEVEL.LIST(org, environment)));
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map((item) => (typeof item === 'string' ? { name: item, projectId, env, isEnabled: true } : item))
        : [];
      setKvms(list);
    } catch (e) {
      console.error('Failed to fetch KVM', e);
    }
    setIsFetchingKVM(false);
  };

  const deleteTargetServer = async (name) => {
    if (!name) return;
    const resource = targetServers.find((server) => server.name === name);
    const headers = getDeleteHeaders(resource);
    if (!headers) return;
    try {
      await apigeeApiFetch(APIGEE_ENDPOINTS.TARGET_SERVERS.DELETE(projectId, env, name), {
        method: 'DELETE',
        headers,
      });
      setTargetServers(prev => prev.filter(s => s.name !== name));
    } catch (e) {
      console.error('Failed to delete target server', e);
      alert('Failed to delete target server. Please try again.');
    }
  };

  const deleteKVM = async (name) => {
    if (!name) return;
    const resource = kvms.find((kvm) => kvm.name === name);
    const headers = getDeleteHeaders(resource);
    if (!headers) return;
    try {
      await apigeeApiFetch(APIGEE_ENDPOINTS.KVM_ENV_LEVEL.DELETE(projectId, env, name), {
        method: 'DELETE',
        headers,
      });
      setKvms(prev => prev.filter(k => k.name !== name));
    } catch (e) {
      console.error('Failed to delete KVM', e);
      alert('Failed to delete KVM. Please try again.');
    }
  };

  const deleteApp = async (name) => {
    if (!name || !developerEmail) return;
    const resource = apps.find((app) => app.name === name || app.appId === name);
    const headers = getDeleteHeaders(resource);
    if (!headers) return;
    try {
      await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.DELETE(projectId, developerEmail, name), {
        method: 'DELETE',
        headers,
      });
      setApps(prev => prev.filter(a => a.name !== name));
    } catch (e) {
      console.error('Failed to delete app', e);
      alert('Failed to delete app. Please try again.');
    }
  };

  const deleteProduct = async (name) => {
    if (!name) return;
    const resource = products.find((product) => product.name === name);
    const headers = getDeleteHeaders(resource);
    if (!headers) return;
    try {
      await apigeeApiFetch(APIGEE_ENDPOINTS.PRODUCTS.DELETE(projectId, name), {
        method: 'DELETE',
        headers,
      });
      setProducts(prev => prev.filter(p => p.name !== name));
    } catch (e) {
      console.error('Failed to delete product', e);
      alert('Failed to delete product. Please try again.');
    }
  };

  // Show confirmation dialog
  const showConfirmDialog = (type, itemName, deleteFunction) => {
    setConfirmDialog({
      isOpen: true,
      type,
      itemName,
      deleteFunction,
    });
  };

  // Handle confirmation
  const handleConfirmDelete = async () => {
    if (confirmDialog.deleteFunction) {
      await confirmDialog.deleteFunction(confirmDialog.itemName);
    }
    setConfirmDialog({ isOpen: false, type: null, itemName: null, deleteFunction: null });
  };

  // Handle cancel
  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, type: null, itemName: null, deleteFunction: null });
  };

  const fetchApps = async (org = projectId, developer_email = developerEmail) => {
    if (!org || !developer_email) return;
    setIsFetchingApps(true);
    try {
      const res = await apigeeApiFetch(getListUrl(APIGEE_ENDPOINTS.APPS.LIST(org, developer_email)));
      const data = await res.json();
      const list = Array.isArray(data?.app)
        ? data.app.map((item) => (
          typeof item === 'string'
            ? { name: item, appId: item, status: '' }
            : { ...item, name: item?.name || item?.appId }
        ))
        : [];
      console.log(list);
      setApps(list);
    } catch (e) {
      console.error('Failed to fetch apps', e);
    }
    setIsFetchingApps(false);
  };

  const fetchProducts = async (org = projectId) => {
    if (!org) return;
    setIsFetchingProducts(true);
    try {
      const res = await apigeeApiFetch(getListUrl(APIGEE_ENDPOINTS.PRODUCTS.LIST(org)));
      const data = await res.json();
      const list = Array.isArray(data?.apiProduct)
        ? data.apiProduct.map((item) => (typeof item === 'string' ? { name: item } : item))
        : Array.isArray(data)
          ? data.map((item) => (typeof item === 'string' ? { name: item } : item))
          : [];
      setProducts(list);
    } catch (e) {
      console.error('Failed to fetch products', e);
    }
    setIsFetchingProducts(false);
  };

  useEffect(() => {
    if (activeTab === 'Backend Service') fetchTargetServers();
    if (activeTab === 'KVM') fetchKVMServers();
    if (activeTab === 'App') {
      fetchApps();
      fetchProducts();
    }
    if (activeTab === 'Product') fetchProducts();
    if (activeTab === 'Key Store') fetchKeystores();
  }, [activeTab, projectId, env, developerEmail, selectedOnboardingId, selectedMicroserviceId]);

  // Filtered and sorted data for each grid

  const filteredAndSortedTargetServers = useMemo(() => {
    let filtered = targetServers;
    if (targetServerSearch) {
      filtered = targetServers.filter(server =>
        server.name?.toLowerCase().includes(targetServerSearch.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [targetServers, targetServerSearch]);

  const filteredAndSortedKVMs = useMemo(() => {
    let filtered = kvms;
    if (kvmSearch) {
      filtered = kvms.filter(kvm =>
        kvm.name?.toLowerCase().includes(kvmSearch.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [kvms, kvmSearch]);

  const filteredAndSortedApps = useMemo(() => {
    let filtered = apps;
    if (appSearch) {
      filtered = apps.filter(app =>
        app.name?.toLowerCase().includes(appSearch.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [apps, appSearch]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;
    if (productSearch) {
      filtered = products.filter(product =>
        product.name?.toLowerCase().includes(productSearch.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products, productSearch]);

  const filteredAndSortedKeystores = useMemo(() => {
    let filtered = keystores;
    if (keystoreSearch) {
      filtered = keystores.filter(ks =>
        ks.name?.toLowerCase().includes(keystoreSearch.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [keystores, keystoreSearch]);

  // Handlers (add missing ones for keystore)
  const handleKeystoreEdit = (ks) => {
    setKeystoreEditData(ks);
    setIsKeystoreModal(true);
  };

  const handleKeystoreSearch = (e) => {
    e.preventDefault();
  };

  const handleTSEdit = (server) => {
    setTSEditData(server);
    setIsTargetServerModal(true);
  };

  const handleTSView = async (server) => {
    if (!server?.name) return;

    const org = server.projectId || projectId;
    const environment = server.env || env;

    setTSDetailsData(null);
    setTSDetailsError("");
    setIsTSDetailsModalOpen(true);
    setIsFetchingTSDetails(true);

    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.TARGET_SERVERS.GET(org, environment, server.name));
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch details: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      setTSDetailsData({
        ...data,
        projectId: org,
        env: environment,
      });
    } catch (error) {
      console.error("Failed to fetch target server details", error);
      setTSDetailsError(error?.message || "Failed to fetch target server details.");
    } finally {
      setIsFetchingTSDetails(false);
    }
  };

  const handleKVMEdit = (server) => {
    setKVMEditData(server);
    setIsKVMModal(true);
  };

  const handleAppEdit = (server) => {
    setAppEditData(server);
    setIsAppModal(true);
  };

  const handleAppView = async (app) => {
    const appName = app?.name || app?.appId;
    if (!appName || !developerEmail) return;

    setSelectedAppName(appName);
    setAppDetailsData(null);
    setAppDetailsError("");
    setIsAppCredentialsModalOpen(true);
    setIsFetchingAppDetails(true);

    try {
      const res = await apigeeApiFetch(APIGEE_ENDPOINTS.APPS.GET(projectId, developerEmail, appName));
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch app details: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      setAppDetailsData(data);
    } catch (error) {
      console.error("Failed to fetch app details", error);
      setAppDetailsError(error?.message || "Failed to fetch app details.");
    } finally {
      setIsFetchingAppDetails(false);
    }
  };

  const handleProductEdit = (server) => {
    setProductEditData(server);
    setIsProductModal(true);
  };

  // Search handlers
  const handleTargetServerSearch = (e) => {
    e.preventDefault();
  };

  const handleKVMSearch = (e) => {
    e.preventDefault();
  };

  const handleAppSearch = (e) => {
    e.preventDefault();
  };

  const handleProductSearch = (e) => {
    e.preventDefault();
  };

  // Confirmation Dialog Component
  const ConfirmationDialog = () => {
    if (!confirmDialog.isOpen) return null;

    const getTypeLabel = () => {
      switch (confirmDialog.type) {
        case 'targetServer': return 'Backend Service';
        case 'kvm': return 'KVM';
        case 'app': return 'App';
        case 'product': return 'Product';
        case 'keystore': return 'Trust Store';
        default: return 'Item';
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-full">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
          </div>

          <p className="text-gray-300 mb-2">
            Are you sure you want to delete this <span className="font-semibold text-white">{getTypeLabel()}</span>?
          </p>
          <p className="text-sm text-gray-400 mb-6 break-all">
            "<span className="font-mono text-primary">{confirmDialog.itemName}</span>"
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancelDelete}
              className="px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0e172a] text-white">

      {/* Confirmation Dialog */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
      <ConfirmationDialog />
      <TargetServerDetailsModal
        isOpen={isTSDetailsModalOpen}
        onClose={() => setIsTSDetailsModalOpen(false)}
        data={tsDetailsData}
        isLoading={isFetchingTSDetails}
        error={tsDetailsError}
      />
      <AppCredentialsModal
        isOpen={isAppCredentialsModalOpen}
        onClose={() => setIsAppCredentialsModalOpen(false)}
        data={appDetailsData}
        isLoading={isFetchingAppDetails}
        error={appDetailsError}
        onRefresh={fetchApps}
        availableProducts={products.map(p => p.name)}
        orgName={projectId}
        developerId={developerEmail}
        appName={selectedAppName}
        setToast={setToast}
      />

      {/* Page Container */}
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{showHeader === true ? "Configure" : "Environment Config"}</h1>
          <p className="text-sm text-gray-400">
            Define and manage your API resources.
          </p>
        </div>

        {/* Tabs */}
        {!forceTab && (
          <div className="flex gap-6 border-b border-dark-700 pb-2">
            {configureTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setResourceType(tab.value);
                }}
                className={cn(
                  "pb-2 text-sm font-medium capitalize",
                  activeTab === tab.value
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ================= TARGET SERVER SECTION ================= */}
        {activeTab === "Backend Service" && (
          <div key={resourceType} className="target-server-content">
            {/* Top Filter Card */}
           {showHeader && <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              <h2 className="text-lg font-semibold">
                View Backend Services
              </h2>

              <p className="text-sm text-gray-400">
                Check out your backend services based on a gateway type and Application Id.
              </p>

              {/* Filters Row */}
              {renderListOnboardingSelect()}
            </div>}

            {/* Table Section */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              {/* Header + Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    Backend Services
                  </h3>
                  <p className="text-sm text-gray-400">
                    Use the filters to focus on the resources you want
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setTSEditData(null);
                      setIsTargetServerModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Plus size={16} /> Create
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600" onClick={() => setIsTSSyncModal(true)}>
                    <RefreshCw size={16} /> Sync
                  </button>

                  {/* <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600">
                    <Plug size={16} /> Test Connection
                  </button> */}
                </div>
              </div>

              {/* Secondary Filters */}
              <div className="flex justify-between items-center">

                <div className="flex gap-3">
                  {renderOrganizationSelect()}
                  {renderEnvironmentSelect()}
                </div>

                {/* Search Box */}
                <form onSubmit={handleTargetServerSearch} className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
                  <input
                    placeholder="Search by name..."
                    value={targetServerSearch}
                    onChange={(e) => setTargetServerSearch(e.target.value)}
                    className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
                  />
                  <button type="submit" className="px-3 text-gray-400 hover:text-white">
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-dark-700">
                <table className="w-full text-sm">

                  <thead className="bg-dark-800/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400">Backend Service Name</th>
                      <th className="px-4 py-3 text-left text-gray-400">Project Id</th>
                      <th className="px-4 py-3 text-left text-gray-400">Env.</th>
                      <th className="px-4 py-3 text-left text-gray-400">Source</th>
                      <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {isFetchingTS ? (
                      <TableSkeletonRows columns={5} rows={5} />
                    ) : (
                      filteredAndSortedTargetServers.map((server) => (
                        <tr
                          key={server.id || server.name}
                          className="border-t border-dark-700 hover:bg-dark-800/40"
                        >
                          {/* Name */}
                          <td className="px-4 py-3 text-white">
                            {server.name}
                          </td>

                          {/* Project Id */}
                          <td className="px-4 py-3 text-gray-300">
                            {server.projectId || projectId}
                          </td>

                          {/* Env Badge */}
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-md text-xs border border-primary text-primary">
                              {server.env || env}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {renderSourceBadge(server.source)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* View */}
                              <button
                                onClick={() => handleTSView(server)}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                                title="View details"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  handleTSEdit(server)
                                }}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Revert */}
                              {/* <button
                                 onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-400 hover:bg-dark-800"
                              >
                                <RotateCcw size={14} />
                              </button> */}

                              {/* Up / Deploy */}
                              {/* <button
                                onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                              >
                                <ArrowUp size={14} />
                              </button> */}

                              {/* Delete */}
                              <button
                                onClick={() => showConfirmDialog('targetServer', server.name, deleteTargetServer)}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800"
                              >
                                <Trash2 size={14} />
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))
                    )}

                    {!isFetchingTS && filteredAndSortedTargetServers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400">
                          {targetServerSearch ? "No matching target servers found" : "No data found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= KVM TAB ================= */}
        {activeTab === "KVM" && (
          <div key={resourceType} className="kvm-content">
            {/* Top Filter Card */}
            {showHeader && 
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              <h2 className="text-lg font-semibold">
                View Key Value Map
              </h2>

              <p className="text-sm text-gray-400">
                Check out your key value maps based on a gateway type and Application Id.
              </p>

              {/* Filters Row */}
              {renderListOnboardingSelect()}
            </div>}

            {/* Table Section */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              {/* Header + Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    Key Value Map
                  </h3>
                  <p className="text-sm text-gray-400">
                    Use the filters to focus on the resources you want
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setKVMEditData(null);
                      setIsKVMModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Plus size={16} /> Create
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600" onClick={() => setIsKVMSyncModal(true)}>
                    <RefreshCw size={16} /> Sync
                  </button>
                </div>
              </div>

              {/* Secondary Filters */}
              <div className="flex justify-between items-center">

                <div className="flex gap-3">
                  {renderOrganizationSelect()}
                  {renderEnvironmentSelect()}
                </div>

                {/* Search Box */}
                <form onSubmit={handleKVMSearch} className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
                  <input
                    placeholder="Search by name..."
                    value={kvmSearch}
                    onChange={(e) => setKvmSearch(e.target.value)}
                    className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
                  />
                  <button type="submit" className="px-3 text-gray-400 hover:text-white">
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-dark-700">
                <table className="w-full text-sm">

                  <thead className="bg-dark-800/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400">Key Value Map</th>
                      <th className="px-4 py-3 text-left text-gray-400">Project Id</th>
                      <th className="px-4 py-3 text-left text-gray-400">Key/Secret</th>
                      <th className="px-4 py-3 text-left text-gray-400">Source</th>
                      <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {isFetchingKVM ? (
                      <TableSkeletonRows columns={5} rows={5} />
                    ) : (
                      filteredAndSortedKVMs.map((server) => (
                        <tr
                          key={server.id || server.name}
                          className="border-t border-dark-700 hover:bg-dark-800/40"
                        >
                          {/* Name */}
                          <td className="px-4 py-3 text-white">
                            {server.name}
                          </td>

                          {/* Project Id */}
                          <td className="px-4 py-3 text-gray-300">
                            {server.projectId || projectId}
                          </td>

                          {/* Env Badge */}
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-md text-xs border border-primary text-primary">
                              {server.env || env}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {renderSourceBadge(server.source)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  handleKVMEdit(server)
                                }}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Revert */}
                              {/* <button
                                 onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-400 hover:bg-dark-800"
                              >
                                <RotateCcw size={14} />
                              </button> */}

                              {/* Up / Deploy */}
                              {/* <button
                                onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                              >
                                <ArrowUp size={14} />
                              </button> */}

                              {/* Delete */}
                              <button
                                onClick={() => showConfirmDialog('kvm', server.name, deleteKVM)}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800"
                              >
                                <Trash2 size={14} />
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))
                    )}

                    {!isFetchingKVM && filteredAndSortedKVMs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400">
                          {kvmSearch ? "No matching KVMs found" : "No data found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "App" && (
          <div key={resourceType} className="app-content">
            {/* Top Filter Card */}
            {showHeader && <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              <h2 className="text-lg font-semibold">
                View Apps
              </h2>

              <p className="text-sm text-gray-400">
                Check out your apps based on a gateway type and Application Id.
              </p>

              {/* Filters Row */}
              {renderListOnboardingSelect()}
            </div>}

            {/* Table Section */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              {/* Header + Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    Apps
                  </h3>
                  <p className="text-sm text-gray-400">
                    Use the filters to focus on the resources you want
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAppEditData(null);
                      setIsAppModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Plus size={16} /> Create
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600" onClick={() => setIsAppSyncModal(true)}>
                    <RefreshCw size={16} /> Sync
                  </button>
                </div>
              </div>

              {/* Secondary Filters */}
              <div className="flex justify-between items-center">

                <div className="flex gap-3">
                  {renderOrganizationSelect()}
                  <select
                    value={developerEmail}
                    onChange={(e) => setDeveloperEmail(e.target.value)}
                    disabled={isFetchingDevelopers}
                    className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {isFetchingDevelopers ? "Loading developers..." : "Select Developer"}
                    </option>
                    {developerEmail && !developers.includes(developerEmail) && (
                      <option value={developerEmail}>{developerEmail}</option>
                    )}
                    {developers.map((developer) => (
                      <option key={developer} value={developer}>{developer}</option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <form onSubmit={handleAppSearch} className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
                  <input
                    placeholder="Search by name..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
                  />
                  <button type="submit" className="px-3 text-gray-400 hover:text-white">
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-dark-700">
                <table className="w-full text-sm">

                  <thead className="bg-dark-800/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400">App Name</th>
                      <th className="px-4 py-3 text-left text-gray-400">Project Id</th>
                      <th className="px-4 py-3 text-left text-gray-400">Source</th>
                      <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {isFetchingApps ? (
                      <TableSkeletonRows columns={4} rows={5} />
                    ) : (
                      filteredAndSortedApps.map((app) => (
                        <tr key={app.appId || app.name} className="border-t border-dark-700 hover:bg-dark-800/40">
                          <td className="px-4 py-3 text-white">{app.name}</td>
                          <td className="px-4 py-3 text-gray-300">{projectId}</td>
                          <td className="px-4 py-3">{renderSourceBadge(app.source)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAppView(app)}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800"
                                title="View credentials"
                              >
                                <Key size={14} />
                              </button>
                              <button onClick={() => handleAppEdit(app)} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800">
                                <Pencil size={14} />
                              </button>
                              {/* <button onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-400 hover:bg-dark-800">
                                <RotateCcw size={14} />
                              </button>
                              <button onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800">
                                <ArrowUp size={14} />
                              </button> */}
                              <button onClick={() => showConfirmDialog('app', app.name, deleteApp)} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {!isFetchingApps && filteredAndSortedApps.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-gray-400">
                          {appSearch ? "No matching apps found" : "No data found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= Product List ================= */}
        {activeTab === "Product" && (
          <div key={resourceType} className="product-content">
            {/* Top Filter Card */}
            {showHeader && <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              <h2 className="text-lg font-semibold">
                View Product Lists
              </h2>

              <p className="text-sm text-gray-400">
                Check out your product lists based on a gateway type and Application Id.
              </p>

              {/* Filters Row */}
              {renderListOnboardingSelect()}
            </div>}

            {/* Table Section */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">

              {/* Header + Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    Product List
                  </h3>
                  <p className="text-sm text-gray-400">
                    Use the filters to focus on the resources you want
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setProductEditData(null);
                      setIsProductModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Plus size={16} /> Create
                  </button>
                </div>
              </div>

              {/* Secondary Filters */}
              <div className="flex justify-between items-center">

                <div className="flex gap-3">
                  {renderOrganizationSelect()}
                  {renderEnvironmentSelect()}
                </div>

                {/* Search Box */}
                <form onSubmit={handleProductSearch} className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
                  <input
                    placeholder="Search by name..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
                  />
                  <button type="submit" className="px-3 text-gray-400 hover:text-white">
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-dark-700">
                <table className="w-full text-sm">

                  <thead className="bg-dark-800/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400">Product Name</th>
                      <th className="px-4 py-3 text-left text-gray-400">Project Id</th>
                      <th className="px-4 py-3 text-left text-gray-400">Env.</th>
                      <th className="px-4 py-3 text-left text-gray-400">Source</th>
                      <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {isFetchingProducts ? (
                      <TableSkeletonRows columns={5} rows={5} />
                    ) : (
                      filteredAndSortedProducts.map((product) => (
                        <tr key={product.name} className="border-t border-dark-700 hover:bg-dark-800/40">
                          <td className="px-4 py-3 text-white">{product.name}</td>
                          <td className="px-4 py-3 text-gray-300">{projectId}</td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-md text-xs border border-primary text-primary">
                              {product.environments?.[0] ?? env}
                            </span>
                          </td>
                          <td className="px-4 py-3">{renderSourceBadge(product.source)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleProductEdit(product)} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800">
                                <Pencil size={14} />
                              </button>
                              {/* <button  onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-400 hover:bg-dark-800">
                                <RotateCcw size={14} />
                              </button>
                              <button onClick={() => navigate('/api-deploy', { state: { isGateway: !showHeader, from: location.pathname } })} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-dark-800">
                                <ArrowUp size={14} />
                              </button> */}
                              <button onClick={() => showConfirmDialog('product', product.name, deleteProduct)} className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {!isFetchingProducts && filteredAndSortedProducts.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400">
                          {productSearch ? "No matching products found" : "No data found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= NEW KEY STORE TAB ================= */}
        {activeTab === "Key Store" && (
          <div key={resourceType} className="keystore-content">
            {/* Top Filter Card */}
            {showHeader && <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">
              <h2 className="text-lg font-semibold">View TrustStores</h2>
              <p className="text-sm text-gray-400">
                Check out your TLS TrustStores and their certificate aliases.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Application Id</label>
                  <input
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="APID0000072"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-white shadow-lg shadow-primary/30">
                    SEARCH
                  </button>
                </div>
              </div>
            </div>}

            {/* Table Section */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-5 space-y-4">
              {/* Header + Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Keystores</h3>
                  <p className="text-sm text-gray-400">
                    Use the filters to focus on the resources you want
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setKeystoreEditData(null);
                      setIsKeystoreModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Plus size={16} /> Create Keystore
                  </button>
                </div>
              </div>

              {/* Secondary Filters */}
              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  {renderOrganizationSelect()}
                  {renderEnvironmentSelect()}
                </div>
                <form onSubmit={handleKeystoreSearch} className="flex items-center border border-dark-700 rounded-lg overflow-hidden">
                  <input
                    placeholder="Search by name..."
                    value={keystoreSearch}
                    onChange={(e) => setKeystoreSearch(e.target.value)}
                    className="bg-dark-800 px-3 py-2 text-sm outline-none w-64"
                  />
                  <button type="submit" className="px-3 text-gray-400 hover:text-white">
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-dark-700">
                <table className="w-full text-sm">
                  <thead className="bg-dark-800/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400">Name</th>
                      <th className="px-4 py-3 text-left text-gray-400">Common name</th>
                      <th className="px-4 py-3 text-left text-gray-400">Certificate type</th>
                      <th className="px-4 py-3 text-left text-gray-400">Expiration</th>
                      <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFetchingKeystores ? (
                      <TableSkeletonRows columns={5} rows={5} />
                    ) : (
                      filteredAndSortedKeystores.map((ks) => (
                        <tr key={ks.name} className="border-t border-dark-700 hover:bg-dark-800/40">
                          <td className="px-4 py-3 text-white">{ks.name}</td>
                          <td className="px-4 py-3 text-gray-300">{ks.commonName || "—"}</td>
                          <td className="px-4 py-3 text-gray-300">{ks.certType || "—"}</td>
                          <td className="px-4 py-3 text-gray-300">{ks.expiration || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleKeystoreEdit(ks)}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-primary hover:border-primary hover:bg-dark-800"
                                title="Edit / Add aliases"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => showConfirmDialog('keystore', ks.name, deleteKeystore)}
                                className="p-2 rounded-md border border-dark-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-dark-800"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {!isFetchingKeystores && filteredAndSortedKeystores.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400">
                          {keystoreSearch ? "No matching keystores found" : "No data found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {isTargetServerModal && (
        <CreateTargetServerModal
          onClose={() => {
            setIsTargetServerModal(false);
            fetchTargetServers();
          }}
          editData={tsEditData}
          organization={projectId}
          environment={env}
          onboardingOptions={onboardingOptions}
          isFetchingOnboardings={isFetchingOnboardings}
          defaultOnboardingId={selectedOnboardingId}
          defaultMicroserviceId={selectedMicroserviceId}
        />
      )}
      {isKVMModal && (
        <CreateKVMModal
          onClose={() => setIsKVMModal(false)}
          onSuccess={fetchKVMServers}
          editData={kvmEditData}
          organization={projectId}
          environment={env}
          onboardingOptions={onboardingOptions}
          isFetchingOnboardings={isFetchingOnboardings}
          defaultOnboardingId={selectedOnboardingId}
          defaultMicroserviceId={selectedMicroserviceId}
        />
      )}
      {isAppModal && (
        <CreateAppModal
          onClose={() => {setIsAppModal(false);fetchApps()}}
          editData={appEditData}
          organization={projectId}
          environment={env}
          developerEmail={developerEmail}
          onboardingOptions={onboardingOptions}
          isFetchingOnboardings={isFetchingOnboardings}
          defaultOnboardingId={selectedOnboardingId}
          defaultMicroserviceId={selectedMicroserviceId}
        />
      )}
      {isProductModal && (
        <CreateProductModal
          onClose={() => {
            setIsProductModal(false);
            fetchProducts();
          }}
          editData={productEditData}
          organization={projectId}
          environment={env}
          onboardingOptions={onboardingOptions}
          isFetchingOnboardings={isFetchingOnboardings}
          defaultOnboardingId={selectedOnboardingId}
          defaultMicroserviceId={selectedMicroserviceId}
        />
      )}
      {isKeystoreModal && (
        <CreateKeystore
          onClose={() => setIsKeystoreModal(false)}
          onSuccess={() => fetchKeystores()}
          editData={keystoreEditData}
          organization={projectId}
          environment={env}
        />
      )}
      {isTSSyncModal && (
        <TargetServerSyncModal
          onClose={() => setIsTSSyncModal(false)}
          defaultOrg={projectId}
          defaultEnv={env}
          onSynced={fetchTargetServers}
          onSuccess={(message) => setToast({ message, type: "success" })}
        />
      )}
      {isKVMSyncModal && (
        <KVMSyncModal
          onClose={() => setIsKVMSyncModal(false)}
          defaultOrg={projectId}
          defaultEnv={env}
          onSynced={fetchKVMServers}
          onSuccess={(message) => setToast({ message, type: "success" })}
        />
      )}
      {isAppSyncModal && (
        <AppSyncModal
          onClose={() => setIsAppSyncModal(false)}
          defaultOrg={projectId}
          defaultDeveloperEmail={developerEmail}
          onSynced={fetchApps}
          onSuccess={(message) => setToast({ message, type: "success" })}
        />
      )}
    </div>
  );
}
