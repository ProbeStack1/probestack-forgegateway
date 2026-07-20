import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Server, Layers, Puzzle, ClipboardCheck, Rocket, TestTube,
  User, LogOut as LogOutIcon, Activity, Settings, Shield, Database, Server as ServerIcon, Cloud,
  Plus, FolderOpen, X, UserCircle, FileText, Users, AlertCircle, Loader2, ArrowRight, CheckCircle,
  Plug, GitBranch, ChevronDown, Menu, GitMerge,
  Zap, ScrollText,Mail
} from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import Toast from './toast';
import { onboardingService } from '../../services/onboardingService';
import { useOnboardingData } from '../../hooks/UseOnboardingData';
import OnboardingModal from '../OnboardingModal';
import Sidebar from './Sidebar';

// User menu items — Audit Logs lives in the sidebar
const userMenuItems = [
  { name: "Profile", path: "/profile", icon: User },
];

// Config menu items
const configMenuItems = [
  { name: "Apigee X", path: "/config/apigee-x", icon: Cloud },
  { name: "Kong Konnect", path: "/config/kong", icon: Cloud },
];

export default function Header({ activePage, hideNav = false }) {
  const { onboardingData, hasOnboarding, clearOnboardingData } = useOnboardingData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStandaloneOnboardingOpen, setIsStandaloneOnboardingOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState('select');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [existingAppNames, setExistingAppNames] = useState([]);
  const [isFetchingAppNames, setIsFetchingAppNames] = useState(false);
  const [selectedExistingApp, setSelectedExistingApp] = useState(null);
  const [existingAppOnboarding, setExistingAppOnboarding] = useState([]);
  const [isFetchingAppOnboarding, setIsFetchingAppOnboarding] = useState(false);
  const [selectedExistingSpec, setSelectedExistingSpec] = useState(null);
  const [savedConsumers, setSavedConsumers] = useState([]);
  // New onboarding form states
  const [onboardingBusinessUnit, setOnboardingBusinessUnit] = useState('');
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
  const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] = useState([]);
  const [showConsumerSelector, setShowConsumerSelector] = useState(false);

  const [showConnectorSection, setShowConnectorSection] = useState(false);
  const [connectorConfig, setConnectorConfig] = useState({
    scmType: 'GITHUB',
    scmToken: '',
    scmOrgOrUser: '',
    scmRepo: '',
    scmBranch: 'main',
    scmIsPrivate: true,
    cloudProvider: 'GCP',
    gcpProjectId: '',
    gcpRegion: 'us-central1',
    gcpCloudRun: true,
    gcpGKE: false,
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    awsAppRunner: true,
    awsEKS: false,
    azureSubscriptionId: '',
    azureResourceGroup: '',
    azureRegion: 'eastus',
    azureContainer: true,
    databaseType: 'POSTGRESQL',
    dbHost: '',
    dbPort: '',
    dbName: '',
    dbUsername: '',
    dbPassword: '',
    dbConnectionString: '',
    dbSslMode: 'require',
    dbAuthSource: '',
  });
  const [isSavingConnector, setIsSavingConnector] = useState(false);
  const [existingConnectorId, setExistingConnectorId] = useState(null);

  const userMenuRef = useRef(null);
  const configMenuRef = useRef(null);
  const modalRef = useRef(null);

  const loggedInUserEmail = localStorage.getItem("userEmail") || "admin@test.com";
  const loggedInUserRole = localStorage.getItem("userRole") || "User";

  const handleOnboardingComplete = (context) => {
    localStorage.setItem('probeStack_onboardingId', context.onboardingId);
    localStorage.setItem('probeStack_onboardingData', JSON.stringify(context.onboardingData));
    if (context.connectorId) {
      localStorage.setItem('probeStack_connectorId', context.connectorId);
    }
    if (context.consumerIds) {
      localStorage.setItem('probeStack_onboardingConsumerIds', JSON.stringify(context.consumerIds));
    }
    if (context.requirementData) {
      localStorage.setItem('probeStack_onboardingRequirements', JSON.stringify(context.requirementData));
    }
    if (context.designData) {
      localStorage.setItem('probeStack_onboardingDesignData', JSON.stringify(context.designData));
    }
    
    setIsOnboardingModalOpen(false);
    showMessage(`Welcome! ${context.onboardingData?.applicationName} loaded successfully`, 'success');
    window.location.reload();
  };

  const handleStandaloneOnboardingComplete = (context) => {
    const data = context.onboardingData || {};
    const contextId = context.onboardingContextId || context.onboardingId;

    if (contextId) {
      localStorage.setItem('probeStack_onboardingContextId', contextId);
    }
    localStorage.removeItem('probeStack_onboardingId');
    localStorage.setItem('probeStack_onboardingData', JSON.stringify(data));

    if (context.consumerIds) {
      localStorage.setItem('probeStack_onboardingConsumerIds', JSON.stringify(context.consumerIds));
    }

    showMessage(
      `${data.applicationName || data.applicationId || 'Onboarding'} ${context.isNew ? 'created' : 'loaded'} successfully`,
      'success'
    );
  };

  const handleClearOnboarding = () => {
    clearOnboardingData();
    showMessage('Onboarding data cleared', 'info');
    window.location.reload();
  };

  // Load consumers on mount
  useEffect(() => {
    const loadConsumers = async () => {
      try {
        const { consumerService } = await import('../../services/consumerService');
        const result = await consumerService.getAllConsumers();
        if (result.success) {
          setSavedConsumers(result.data?.data || result.data || []);
        }
      } catch (error) {
        console.error('Failed to load consumers:', error);
      }
    };
    loadConsumers();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (configMenuRef.current && !configMenuRef.current.contains(event.target)) {
        setIsConfigMenuOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target) && isOnboardingModalOpen) {
        handleCloseModal();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOnboardingModalOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Push page content right of the sidebar on desktop
  useLayoutEffect(() => {
    if (!hideNav) {
      document.body.classList.add('with-sidebar');
    } else {
      document.body.classList.remove('with-sidebar');
    }
    return () => {
      document.body.classList.remove('with-sidebar');
    };
  }, [hideNav]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("authToken");
    localStorage.removeItem("pendingAuthEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userOrganization");
    navigate("/");
  };

  const showMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  const handleOpenModal = () => {
    setIsOnboardingModalOpen(true);
    setOnboardingMode('select');
    fetchExistingApplications();
  };

  const handleCloseModal = () => {
    setIsOnboardingModalOpen(false);
    setOnboardingMode('select');
    setSelectedExistingApp(null);
    setSelectedExistingSpec(null);
    setExistingAppOnboarding([]);
    resetNewOnboardingForm();
  };

  const resetNewOnboardingForm = () => {
    setOnboardingBusinessUnit('');
    setOnboardingTeamName('');
    setOnboardingApplicationName('');
    setOnboardingApplicationId('');
    setOnboardingProjectOwner('');
    setOnboardingOwnerEmail('');
    setOnboardingProjectSME('');
    setOnboardingProjectSMEEmail('');
    setOnboardingProjectDLEmail('');
    setOnboardingGoLiveDate('');
    setOnboardingTesterName('');
    setOnboardingTesterEmail('');
    setOnboardingServiceNowGroup('');
    setOnboardingServiceNowEmail('');
    setSelectedOnboardingConsumers([]);
  };

  const fetchExistingApplications = async () => {
    setIsFetchingAppNames(true);
    try {
      const result = await onboardingService.getApplicationNames('APIGEE_PROXY');
      if (result.success) {
        const names = result.data?.data || result.data || [];
        setExistingAppNames(Array.isArray(names) ? names : []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
    setIsFetchingAppNames(false);
  };

  const handleCreateOnboarding = async () => {
    if (!onboardingTeamName.trim()) {
      showMessage('Team Name is required', 'error');
      return;
    }
    if (!onboardingApplicationName.trim()) {
      showMessage('Application Name is required', 'error');
      return;
    }

    setIsLoading(true);
    const result = await onboardingService.createOnboarding({
      organizationId: 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c',
      projectType: 'APIGEE_PROXY',
      businessUnit: onboardingBusinessUnit,
      teamName: onboardingTeamName,
      applicationName: onboardingApplicationName,
      applicationId: onboardingApplicationId,
      projectOwner: onboardingProjectOwner,
      ownerEmail: onboardingOwnerEmail,
      projectSME: onboardingProjectSME,
      projectSMEEmail: onboardingProjectSMEEmail,
      projectDLEmail: onboardingProjectDLEmail,
      expectedGoLiveDate: onboardingGoLiveDate,
      testerName: onboardingTesterName,
      testerEmail: onboardingTesterEmail,
      serviceNowGroupName: onboardingServiceNowGroup,
      serviceNowEmail: onboardingServiceNowEmail,
      consumerIds: selectedOnboardingConsumers,
      connectorId: null,
      microserviceId: null,
    });
    setIsLoading(false);

    if (result.success) {
      showMessage('Onboarding created successfully!', 'success');
      handleCloseModal();
      const id = result.data?.data?.id || result.data?.id;
      localStorage.setItem('probeStack_onboardingId', id);
      localStorage.setItem('probeStack_onboardingData', JSON.stringify({
        teamName: onboardingTeamName,
        applicationName: onboardingApplicationName,
        businessUnit: onboardingBusinessUnit,
      }));
    } else {
      showMessage(result.error, 'error');
    }
  };

  const handleSelectExisting = async () => {
    if (!selectedExistingApp || !selectedExistingSpec) {
      showMessage('Please select an application and onboarding record', 'error');
      return;
    }

    setIsLoading(true);
    const result = await onboardingService.getOnboardingById(selectedExistingSpec.id);
    setIsLoading(false);

    if (!result.success) {
      showMessage(result.error, 'error');
      return;
    }

    const d = result.data?.data?.microservice || result.data?.microservice || {};

    localStorage.setItem('probeStack_onboardingId', d.id);
    localStorage.setItem('probeStack_onboardingData', JSON.stringify({
      teamName: d.teamName || '',
      applicationName: d.applicationName || '',
      businessUnit: d.businessUnit || '',
      projectOwner: d.projectOwner || '',
    }));

    showMessage(`Loaded onboarding data for ${d.applicationName || selectedExistingApp}`, 'success');
    handleCloseModal();
  };

  const getProjectType = () => {
    if (activePage === 'proxy-manager') return 'APIGEE_PROXY';
    if (activePage === 'microservices') return 'MICROSERVICE';
    return 'APIGEE_PROXY';
  };

  return (
    <>
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      )}

      {/* Fixed top header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-dark-700 flex items-center px-4 shrink-0 bg-header-bg">
        {/* Logo Section */}
        <div
          className="flex min-w-0 items-center gap-2 shrink-0 w-auto cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => { window.location.href = 'https://forgesphere.probestack.io'; }}
        >
          <img
            src="/assets/justlogo.png"
            alt="ForgeSphere logo"
            className="h-11 w-auto"
            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
          />
          <div className="flex flex-col justify-center h-11 overflow-hidden">
            <span className="text-[0.65rem] text-gray-400 leading-tight whitespace-nowrap">
              ProbeStack
            </span>
            <span className="text-lg sm:text-xl font-extrabold gradient-text font-heading whitespace-nowrap leading-tight">
              ForgeGateway
            </span>
          </div>
        </div>

        {/* Flex spacer */}
        <div className="flex-1" />

        {/* Right Side Actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0 ml-auto">
          {/* Config Menu Dropdown */}
          <div className="relative" ref={configMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="border border-dark-700 bg-dark-800/50 text-white hover:border-primary/50 hover:bg-dark-800 h-9 w-9 p-0"
              onClick={() => setIsConfigMenuOpen(!isConfigMenuOpen)}
              title="Config"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {isConfigMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg overflow-hidden z-30">
                <div className="border-b border-dark-700 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Configurations
                  </p>
                </div>
                <div className="py-1">
                  {configMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          navigate(item.path);
                          setIsConfigMenuOpen(false);
                        }}
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-800/50 transition-colors w-full text-left"
                      >
                        <Icon className="h-4 w-4 text-gray-500 transition-colors group-hover:text-primary" />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 max-w-[260px] border border-dark-700 bg-dark-800/50 px-3 text-white hover:border-primary/50 hover:bg-dark-800"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title={`${loggedInUserEmail} - ${loggedInUserRole}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden min-w-0 text-left lg:block">
                  <div className="truncate text-xs font-semibold leading-4 text-white">
                    {loggedInUserEmail}
                  </div>
                  <div className="truncate text-[10px] font-semibold uppercase leading-3 tracking-[0.1em] text-gray-400">
                    {loggedInUserRole}
                  </div>
                </div>
              </div>
            </Button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg overflow-hidden z-30">
                <div className="py-1">
                  {userMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          navigate(item.path);
                          setIsUserMenuOpen(false);
                        }}
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-800/50 transition-colors w-full text-left"
                      >
                        <Icon className="h-4 w-4 text-gray-500 transition-colors group-hover:text-primary" />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            className="border border-dark-700 bg-dark-800/50 text-white hover:border-red-500/50 hover:bg-red-500/10 h-9 w-9 p-0"
            onClick={handleLogout}
          >
            <LogOutIcon className="h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-dark-700 bg-dark-800/60 text-white transition-colors hover:border-primary/50 hover:bg-dark-800 lg:hidden"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Spacer — keeps page content below the fixed header bar */}
      <div aria-hidden="true" className="h-16 w-full shrink-0" />

      {/* Glassmorphic sidebar (desktop fixed, mobile overlay via isMobileOpen) */}
      {!hideNav && (
        <Sidebar
          activePage={activePage}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
      )}

      <OnboardingModal
        isOpen={isStandaloneOnboardingOpen}
        onClose={() => setIsStandaloneOnboardingOpen(false)}
        onComplete={handleStandaloneOnboardingComplete}
        savedConsumers={savedConsumers}
        onboardingService={onboardingService}
        projectType=""
        resourceLabel="standalone"
        defaultMode="select"
        showActionSelection={false}
        showMessage={showMessage}
      />

      {/* Onboarding Modal */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div ref={modalRef} className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-700 bg-dark-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Application Onboarding</h2>
                  <p className="text-sm text-gray-400">
                    {onboardingMode === 'select' && 'Choose how to get started'}
                    {onboardingMode === 'new' && 'Create a new application onboarding'}
                    {onboardingMode === 'existing' && 'Select an existing application'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-dark-700 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Select Mode */}
              {onboardingMode === 'select' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* New Onboarding Card */}
                    <div
                      onClick={() => setOnboardingMode('new')}
                      className="group cursor-pointer p-6 rounded-xl border-2 border-dark-700 hover:border-primary/50 transition-all bg-dark-800/30 hover:bg-primary/5"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all flex items-center justify-center mb-4">
                        <Plus className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Create New Onboarding</h3>
                      <p className="text-sm text-gray-400">
                        Start fresh with a new onboarding process. Fill in all necessary details for your application.
                      </p>
                      <div className="mt-4 flex items-center text-primary text-sm font-medium gap-1">
                        Create New <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Existing Onboarding Card */}
                    <div
                      onClick={() => setOnboardingMode('existing')}
                      className="group cursor-pointer p-6 rounded-xl border-2 border-dark-700 hover:border-primary/50 transition-all bg-dark-800/30 hover:bg-primary/5"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all flex items-center justify-center mb-4">
                        <FolderOpen className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Use Existing Application</h3>
                      <p className="text-sm text-gray-400">
                        Continue working on an existing application. Load previously saved onboarding data.
                      </p>
                      <div className="mt-4 flex items-center text-primary text-sm font-medium gap-1">
                        Load Existing <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New Onboarding Mode */}
              {onboardingMode === 'new' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setOnboardingMode('select')}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back to Options
                    </button>
                  </div>

                  {/* Business Unit Information */}
                  <div className="p-5 rounded-xl border border-dark-700" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
                    <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      Business Unit Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Business Unit</label>
                        <select
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                          value={onboardingBusinessUnit}
                          onChange={(e) => setOnboardingBusinessUnit(e.target.value)}
                        >
                          <option value="">Select Business Unit</option>
                          <option value="retail">Retail Banking</option>
                          <option value="corporate">Corporate Banking</option>
                          <option value="wealth">Wealth Management</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Team Name *</label>
                        <input
                          type="text"
                          placeholder="Enter team name"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingTeamName}
                          onChange={(e) => setOnboardingTeamName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Application Name *</label>
                        <input
                          type="text"
                          placeholder="Enter application name"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingApplicationName}
                          onChange={(e) => setOnboardingApplicationName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Application Id</label>
                        <input
                          type="text"
                          placeholder="e.g., APP-2024-001"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingApplicationId}
                          onChange={(e) => setOnboardingApplicationId(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stakeholder Information */}
                  <div className="p-5 rounded-xl border border-dark-700" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
                    <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Stakeholder Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Project Owner</label>
                        <input
                          type="text"
                          placeholder="Enter owner name"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingProjectOwner}
                          onChange={(e) => setOnboardingProjectOwner(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Owner Email</label>
                        <input
                          type="email"
                          placeholder="owner@company.com"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingOwnerEmail}
                          onChange={(e) => setOnboardingOwnerEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Project SME</label>
                        <input
                          type="text"
                          placeholder="Enter project SME name"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingProjectSME}
                          onChange={(e) => setOnboardingProjectSME(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Project SME Email</label>
                        <input
                          type="email"
                          placeholder="sme@company.com"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingProjectSMEEmail}
                          onChange={(e) => setOnboardingProjectSMEEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Project DL Email</label>
                        <input
                          type="email"
                          placeholder="project-dl@company.com"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingProjectDLEmail}
                          onChange={(e) => setOnboardingProjectDLEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Expected Go-Live Date</label>
                        <input
                          type="date"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingGoLiveDate}
                          onChange={(e) => setOnboardingGoLiveDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Tester Name</label>
                        <input
                          type="text"
                          placeholder="Enter tester name"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingTesterName}
                          onChange={(e) => setOnboardingTesterName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">Tester Email</label>
                        <input
                          type="email"
                          placeholder="tester@company.com"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingTesterEmail}
                          onChange={(e) => setOnboardingTesterEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">ServiceNow Group Name</label>
                        <input
                          type="text"
                          placeholder="Enter ServiceNow group name"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingServiceNowGroup}
                          onChange={(e) => setOnboardingServiceNowGroup(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300">ServiceNow Email</label>
                        <input
                          type="email"
                          placeholder="servicenow@company.com"
                          className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white focus:outline-none focus:border-primary"
                          value={onboardingServiceNowEmail}
                          onChange={(e) => setOnboardingServiceNowEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consumer Selection */}
                  {savedConsumers.length > 0 && (
                    <div className="p-5 rounded-xl border border-dark-700" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Select Consumers
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowConsumerSelector(!showConsumerSelector)}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          {showConsumerSelector ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showConsumerSelector && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                          {savedConsumers.map((consumer) => (
                            <label key={consumer.id} className="flex items-center gap-2 p-2 rounded-lg border border-dark-700 cursor-pointer hover:bg-primary/5">
                              <input
                                type="checkbox"
                                checked={selectedOnboardingConsumers.includes(consumer.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOnboardingConsumers([...selectedOnboardingConsumers, consumer.id]);
                                  } else {
                                    setSelectedOnboardingConsumers(selectedOnboardingConsumers.filter(id => id !== consumer.id));
                                  }
                                }}
                                className="rounded border-dark-700"
                              />
                              <span className="text-sm text-gray-300">{consumer.consumerName || consumer.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connector Configuration Section */}
                  <div className="p-5 rounded-xl border border-dark-700" style={{ backgroundColor: 'rgb(15 23 42 / 0.5)' }}>
                    <button
                      type="button"
                      onClick={() => setShowConnectorSection(!showConnectorSection)}
                      className="w-full flex items-center justify-between mb-4"
                    >
                      <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Plug className="w-4 h-4" />
                        Connector Configuration (Optional)
                      </h4>
                      <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showConnectorSection && 'rotate-180')} />
                    </button>

                    {showConnectorSection && (
                      <div className="space-y-6 mt-4">
                        {/* Source Code Management */}
                        <div>
                          <h5 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-primary" />
                            Source Code Management
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">SCM Type</label>
                              <select
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                                value={connectorConfig.scmType}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, scmType: e.target.value })}
                              >
                                <option value="GITHUB">GitHub</option>
                                <option value="GITLAB">GitLab</option>
                                <option value="BITBUCKET">Bitbucket</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">Token / Personal Access Token</label>
                              <input
                                type="password"
                                placeholder="Enter your token"
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                value={connectorConfig.scmToken}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, scmToken: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">Organization / Username</label>
                              <input
                                type="text"
                                placeholder="e.g., your-org"
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                value={connectorConfig.scmOrgOrUser}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, scmOrgOrUser: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">Repository Name</label>
                              <input
                                type="text"
                                placeholder="e.g., my-repo"
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                value={connectorConfig.scmRepo}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, scmRepo: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">Branch</label>
                              <input
                                type="text"
                                placeholder="main"
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                value={connectorConfig.scmBranch}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, scmBranch: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5 flex items-center">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={connectorConfig.scmIsPrivate}
                                  onChange={(e) => setConnectorConfig({ ...connectorConfig, scmIsPrivate: e.target.checked })}
                                  className="rounded border-dark-700"
                                />
                                <span className="text-xs text-gray-300">Private Repository</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Cloud Provider */}
                        <div>
                          <h5 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-primary" />
                            Cloud Provider
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">Provider</label>
                              <select
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                                value={connectorConfig.cloudProvider}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, cloudProvider: e.target.value })}
                              >
                                <option value="GCP">Google Cloud Platform (GCP)</option>
                                <option value="AWS">Amazon Web Services (AWS)</option>
                                <option value="AZURE">Microsoft Azure</option>
                              </select>
                            </div>

                            {/* GCP Fields */}
                            {connectorConfig.cloudProvider === 'GCP' && (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Project ID</label>
                                  <input
                                    type="text"
                                    placeholder="e.g., my-project-123"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.gcpProjectId}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, gcpProjectId: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Region</label>
                                  <input
                                    type="text"
                                    placeholder="us-central1"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.gcpRegion}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, gcpRegion: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5 flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={connectorConfig.gcpCloudRun}
                                      onChange={(e) => setConnectorConfig({ ...connectorConfig, gcpCloudRun: e.target.checked })}
                                      className="rounded border-dark-700"
                                    />
                                    <span className="text-xs text-gray-300">Cloud Run</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={connectorConfig.gcpGKE}
                                      onChange={(e) => setConnectorConfig({ ...connectorConfig, gcpGKE: e.target.checked })}
                                      className="rounded border-dark-700"
                                    />
                                    <span className="text-xs text-gray-300">GKE</span>
                                  </label>
                                </div>
                              </>
                            )}

                            {/* AWS Fields */}
                            {connectorConfig.cloudProvider === 'AWS' && (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Access Key ID</label>
                                  <input
                                    type="text"
                                    placeholder="Enter access key"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.awsAccessKeyId}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, awsAccessKeyId: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Secret Access Key</label>
                                  <input
                                    type="password"
                                    placeholder="Enter secret key"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.awsSecretAccessKey}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, awsSecretAccessKey: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Region</label>
                                  <input
                                    type="text"
                                    placeholder="us-east-1"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.awsRegion}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, awsRegion: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5 flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={connectorConfig.awsAppRunner}
                                      onChange={(e) => setConnectorConfig({ ...connectorConfig, awsAppRunner: e.target.checked })}
                                      className="rounded border-dark-700"
                                    />
                                    <span className="text-xs text-gray-300">App Runner</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={connectorConfig.awsEKS}
                                      onChange={(e) => setConnectorConfig({ ...connectorConfig, awsEKS: e.target.checked })}
                                      className="rounded border-dark-700"
                                    />
                                    <span className="text-xs text-gray-300">EKS</span>
                                  </label>
                                </div>
                              </>
                            )}

                            {/* Azure Fields */}
                            {connectorConfig.cloudProvider === 'AZURE' && (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Subscription ID</label>
                                  <input
                                    type="text"
                                    placeholder="Enter subscription ID"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.azureSubscriptionId}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, azureSubscriptionId: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Resource Group</label>
                                  <input
                                    type="text"
                                    placeholder="Enter resource group"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.azureResourceGroup}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, azureResourceGroup: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Region</label>
                                  <input
                                    type="text"
                                    placeholder="eastus"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.azureRegion}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, azureRegion: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={connectorConfig.azureContainer}
                                      onChange={(e) => setConnectorConfig({ ...connectorConfig, azureContainer: e.target.checked })}
                                      className="rounded border-dark-700"
                                    />
                                    <span className="text-xs text-gray-300">Container Instances</span>
                                  </label>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Database Connector */}
                        <div>
                          <h5 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary" />
                            Database Connector
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-300">Database Type</label>
                              <select
                                className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                                value={connectorConfig.databaseType}
                                onChange={(e) => setConnectorConfig({ ...connectorConfig, databaseType: e.target.value })}
                              >
                                <option value="POSTGRESQL">PostgreSQL</option>
                                <option value="MYSQL">MySQL</option>
                                <option value="MONGODB">MongoDB</option>
                                <option value="ORACLE">Oracle</option>
                                <option value="SQLSERVER">SQL Server</option>
                              </select>
                            </div>

                            {connectorConfig.databaseType === 'MONGODB' ? (
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs text-gray-300">Connection String</label>
                                <input
                                  type="text"
                                  placeholder="mongodb://username:password@host:port/database"
                                  className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                  value={connectorConfig.dbConnectionString}
                                  onChange={(e) => setConnectorConfig({ ...connectorConfig, dbConnectionString: e.target.value })}
                                />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Host</label>
                                  <input
                                    type="text"
                                    placeholder="localhost"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.dbHost}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, dbHost: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Port</label>
                                  <input
                                    type="text"
                                    placeholder="5432"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.dbPort}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, dbPort: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Database Name</label>
                                  <input
                                    type="text"
                                    placeholder="mydb"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.dbName}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, dbName: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Username</label>
                                  <input
                                    type="text"
                                    placeholder="admin"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.dbUsername}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, dbUsername: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">Password</label>
                                  <input
                                    type="password"
                                    placeholder="Enter password"
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm bg-dark-900 border border-dark-700 text-white"
                                    value={connectorConfig.dbPassword}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, dbPassword: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-gray-300">SSL Mode</label>
                                  <select
                                    className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                                    value={connectorConfig.dbSslMode}
                                    onChange={(e) => setConnectorConfig({ ...connectorConfig, dbSslMode: e.target.value })}
                                  >
                                    <option value="disable">Disable</option>
                                    <option value="require">Require</option>
                                    <option value="verify-ca">Verify CA</option>
                                    <option value="verify-full">Verify Full</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Existing Onboarding Mode */}
              {onboardingMode === 'existing' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setOnboardingMode('select')}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back to Options
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Application IDs */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">Select Application ID</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {isFetchingAppNames ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          </div>
                        ) : existingAppNames.length === 0 ? (
                          <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                            <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No applications found</p>
                            <button
                              onClick={() => setOnboardingMode('new')}
                              className="mt-3 text-sm text-primary hover:text-primary/80"
                            >
                              Create a new onboarding instead ?
                            </button>
                          </div>
                        ) : (
                          existingAppNames.map((appName) => (
                            <button
                              key={appName}
                              type="button"
                              onClick={() => {
                                setSelectedExistingApp(appName);
                                setSelectedExistingSpec(null);
                                setExistingAppOnboarding([]);
                                setIsFetchingAppOnboarding(true);
                                onboardingService.getByApplicationId(appName).then((result) => {
                                  if (result.success) {
                                    const data = result.data?.data || result.data;
                                    setExistingAppOnboarding(Array.isArray(data) ? data : data ? [data] : []);
                                  }
                                  setIsFetchingAppOnboarding(false);
                                });
                              }}
                              className={cn(
                                'w-full p-3 rounded-lg border text-left transition-all',
                                selectedExistingApp === appName
                                  ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                                  : 'border-dark-700 bg-dark-900/40 hover:border-primary/50'
                              )}
                            >
                              <p className="text-sm font-medium text-white">{appName}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Onboarding Records */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">
                        {selectedExistingApp ? `Onboarding for ${selectedExistingApp}` : 'Select Application First'}
                      </h4>
                      {isFetchingAppOnboarding ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : selectedExistingApp && existingAppOnboarding.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                          {existingAppOnboarding.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedExistingSpec(item)}
                              className={cn(
                                'p-3 rounded-lg border cursor-pointer transition-all',
                                selectedExistingSpec?.id === item.id
                                  ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]'
                                  : 'border-dark-700 bg-dark-900/40 hover:border-primary/50'
                              )}
                            >
                              <p className="text-sm font-medium text-white">{item.applicationName || item.name}</p>
                              {item.teamName && <p className="text-xs text-gray-400 mt-1">Team: {item.teamName}</p>}
                              {item.projectOwner && <p className="text-xs text-gray-400">Owner: {item.projectOwner}</p>}
                            </div>
                          ))}
                        </div>
                      ) : selectedExistingApp && !isFetchingAppOnboarding ? (
                        <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No onboarding data found for this application</p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                          <p className="text-sm text-gray-500">Please select an Application ID first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-dark-800/30">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                Cancel
              </button>
              {onboardingMode === 'new' && (
                <button
                  type="button"
                  onClick={handleCreateOnboarding}
                  disabled={isLoading || !onboardingTeamName || !onboardingApplicationName}
                  className={cn(
                    'px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2',
                    (onboardingTeamName && onboardingApplicationName && !isLoading)
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create & Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {onboardingMode === 'existing' && (
                <button
                  type="button"
                  onClick={handleSelectExisting}
                  disabled={isLoading || !selectedExistingApp || !selectedExistingSpec}
                  className={cn(
                    'px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2',
                    (selectedExistingApp && selectedExistingSpec && !isLoading)
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25'
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load & Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
