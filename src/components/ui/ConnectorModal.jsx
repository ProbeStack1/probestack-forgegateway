import React, { useState, useEffect } from 'react';
import { Cloud, Database, Github, Gitlab, X, Plug, Server, Settings } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardTitle } from './card';
import { cn } from '../../lib/utils';
import { connectorConfigurationService } from '../../services/connectorConfigurationService';
import { databaseService } from '../../services/databaseService';
import Toast from './toast';

// Cloud Provider Logos as SVG components
const GCPLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#4285F4" />
  </svg>
);

const AWSLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.032.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.863.279a2.27 2.27 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.263 1.005-.359.39-.096.8-.143 1.229-.143.943 0 1.629.216 2.074.647.439.432.662 1.086.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.503.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.52.52 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08h-.687zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.935-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.088.95.088.502 0 .894-.088 1.165-.264.271-.176.415-.415.415-.719 0-.207-.08-.383-.239-.519-.16-.136-.455-.264-.886-.383l-1.277-.343c-.643-.167-1.122-.415-1.421-.742-.3-.328-.454-.695-.454-1.102 0-.32.088-.607.263-.863.176-.256.415-.479.71-.655.295-.184.63-.32 1.005-.415.375-.096.766-.136 1.166-.136.16 0 .335.008.51.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 2.137 2.137 0 0 0-1.117-.279c-.455 0-.815.071-1.07.223-.255.152-.383.383-.383.71 0 .216.08.4.24.543.16.144.454.287.87.415l1.125.352c.634.2 1.094.487 1.372.838.279.352.415.75.415 1.196 0 .335-.07.647-.207.935-.14.287-.327.543-.566.758-.24.216-.526.383-.862.51-.335-.128-.71-.2-1.117-.2z" fill="#FF9900" />
    <path d="M21.512 16.428c-2.304 1.703-5.647 2.607-8.522 2.607-4.03 0-7.661-1.49-10.406-3.971-.216-.2-.024-.472.235-.32 2.965 1.726 6.63 2.759 10.418 2.759 2.555 0 5.367-.53 7.95-1.623.39-.167.719.256.335.55z" fill="#FF9900" />
    <path d="M22.176 15.723c-.295-.375-1.949-.176-2.691-.088-.223.024-.264-.168-.056-.311 1.317-.926 3.478-.655 3.726-.343.255.311-.064 2.475-1.301 3.507-.191.16-.375.072-.288-.136.28-.694.895-2.276.61-2.63z" fill="#FF9900" />
  </svg>
);

const AzureLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M5.483 18.3l4.467-7.588 4.35 7.588H5.483zM2.75 20.575h18.5l-5.35-9.35L12 8.4l-8.675 5.825 4.35 7.588H2.75v1.25h18.5v-1.25H12l4.35-7.588-3.9-2.65-4.467 7.588-4.467-7.588-4.35 7.588H2.75v1.25z" fill="#0089D6" />
  </svg>
);

export default function ConnectorModal({
  isOpen,
  onClose,
  onSave,
  pageType = 'microservice',
  organizationId,
  connectorId = null,
  pipelineConfig = null,       // directly the pipeline object (not wrapped)
  readOnlyFields = [],
  devBranchName = null,        // from default strategy's dev branch
}) {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingConfigId, setExistingConfigId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // SCM State – repo removed
  const [pushToGitHub, setPushToGitHub] = useState(false);
  const [pushToGitLab, setPushToGitLab] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [githubOrg, setGithubOrg] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubPrivate, setGithubPrivate] = useState(true);
  const [gitlabToken, setGitlabToken] = useState('');
  const [gitlabOrg, setGitlabOrg] = useState('');
  const [gitlabBranch, setGitlabBranch] = useState('main');
  const [gitlabPrivate, setGitlabPrivate] = useState(true);

  // Cloud Providers State – deployment type removed
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpRegion, setGcpRegion] = useState('');
  const [gcpServiceAccountJson, setGcpServiceAccountJson] = useState('');
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');
  const [azureResourceGroup, setAzureResourceGroup] = useState('');
  const [azureRegion, setAzureRegion] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegionDeploy, setAwsRegionDeploy] = useState('');

  // API Gateway State
  const [selectedGateway, setSelectedGateway] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('probeStack_proxySelectedGateway') || '';
    }
    return '';
  });
  const [gatewayConfig, setGatewayConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('probeStack_gatewayConfig_Apigee X') || localStorage.getItem('probeStack_gatewayConfig_Apigee Edge');
      return saved ? JSON.parse(saved) : { serviceAccountJson: '' };
    }
    return { serviceAccountJson: '' };
  });

  // Add Apigee Edge Configuration State
  const [apigeeEdgeConfig, setApigeeEdgeConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('probeStack_apigeeEdgeConfig');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {
      ssoEnabled: null,
      tokenUrl: '',
      username: '',
      password: '',
      organizationName: ''
    };
  });

  // Database States
  const [mysqlHost, setMysqlHost] = useState('');
  const [mysqlPort, setMysqlPort] = useState('3306');
  const [mysqlDatabase, setMysqlDatabase] = useState('');
  const [mysqlUser, setMysqlUser] = useState('');
  const [mysqlPassword, setMysqlPassword] = useState('');
  const [mysqlSslMode, setMysqlSslMode] = useState('required');

  const [mongoConnectionString, setConnectionString] = useState('');
  const [mongoHost, setMongoHost] = useState('');
  const [mongoPort, setMongoPort] = useState('27017');
  const [mongoDatabase, setMongoDatabase] = useState('');
  const [mongoUser, setMongoUser] = useState('');
  const [mongoPassword, setMongoPassword] = useState('');
  const [mongoAuthSource, setMongoAuthSource] = useState('admin');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const [postgresHost, setPostgresHost] = useState('');
  const [postgresPort, setPostgresPort] = useState('5432');
  const [postgresDatabase, setPostgresDatabase] = useState('');
  const [postgresUser, setPostgresUser] = useState('');
  const [postgresPassword, setPostgresPassword] = useState('');
  const [postgresSslMode, setPostgresSslMode] = useState('require');

  // Reset function
  const resetConnectorForm = () => {
    setExistingConfigId(null);
    setPushToGitHub(false);
    setPushToGitLab(false);
    setGithubToken('');
    setGithubOrg('');
    setGithubBranch('main');
    setGithubPrivate(true);
    setGitlabToken('');
    setGitlabOrg('');
    setGitlabBranch('main');
    setGitlabPrivate(true);
    setConnectionString('');
    setMongoHost('');
    setMongoPort('27017');
    setMongoDatabase('');
    setMongoUser('');
    setMongoPassword('');
    setMongoAuthSource('admin');
  };

  // Main effect: load connector config + override with pipeline
  useEffect(() => {
    const fetchExistingConfig = async () => {
      if (isOpen && organizationId) {
        setIsLoading(true);
        resetConnectorForm();

        // 1. Fetch connector config (or defaults)
        const result = connectorId
          ? await connectorConfigurationService.getConnectorConfigurationById(connectorId)
          : await connectorConfigurationService.getConnectorConfigurationDefaults(organizationId);

        if (result.success && result.data?.data) {
          const config = result.data.data;
          setExistingConfigId(connectorId ? config.id : null);

          // --- SCM from config ---
          if (config.sourceCodeManagement) {
            const scm = config.sourceCodeManagement;
            if (scm.type === 'GITHUB') {
              setPushToGitHub(true);
              setGithubToken(scm.token || '');
              setGithubOrg(scm.orgOrUser || '');
              setGithubBranch(scm.branch || 'main');
              setGithubPrivate(scm.isPrivate ?? true);
            } else if (scm.type === 'GITLAB') {
              setPushToGitLab(true);
              setGitlabToken(scm.token || '');
              setGitlabOrg(scm.orgOrUser || '');
              setGitlabBranch(scm.branch || 'main');
              setGitlabPrivate(scm.isPrivate ?? true);
            }
          }

          // --- Cloud from config ---
          if (config.cloudProvider) {
            const cloud = config.cloudProvider;
            if (cloud.provider === 'GCP') {
              setSelectedDeployment('gcp');
              setGcpProjectId(cloud.gcpProjectId || '');
              setGcpRegion(cloud.gcpRegion || '');
              setGcpServiceAccountJson(cloud.serviceAccountCredentials || '');
            } else if (cloud.provider === 'AWS') {
              setSelectedDeployment('aws');
              setAwsAccessKeyId(cloud.accessKeyId || '');
              setAwsSecretAccessKey(cloud.secretAccessKey || '');
              setAwsRegionDeploy(cloud.awsRegion || '');
            } else if (cloud.provider === 'AZURE') {
              setSelectedDeployment('azure');
              setAzureSubscriptionId(cloud.subscriptionId || '');
              setAzureResourceGroup(cloud.resourceGroup || '');
              setAzureRegion(cloud.azureRegion || '');
            }
          }

          // --- Database from config ---
          if (config.databaseConnector) {
            const db = config.databaseConnector;
            if (db.databaseType === 'MYSQL') {
              setMysqlHost(db.host || '');
              setMysqlPort(db.port?.toString() || '3306');
              setMysqlDatabase(db.databaseName || '');
              setMysqlUser(db.username || '');
              setMysqlPassword(db.password || '');
              setMysqlSslMode(db.sslMode || 'required');
            } else if (db.databaseType === 'MONGODB') {
              setConnectionString(db.connectionString || '');
              setMongoHost(db.host || '');
              setMongoPort(db.port?.toString() || '27017');
              setMongoDatabase(db.databaseName || '');
              setMongoUser(db.username || '');
              setMongoPassword(db.password || '');
              setMongoAuthSource(db.authSource || 'admin');
            } else if (db.databaseType === 'POSTGRESQL') {
              setPostgresHost(db.host || '');
              setPostgresPort(db.port?.toString() || '5432');
              setPostgresDatabase(db.databaseName || '');
              setPostgresUser(db.username || '');
              setPostgresPassword(db.password || '');
              setPostgresSslMode(db.sslMode || 'require');
            }
          }
        }

        // --- 🔥 OVERRIDE with pipeline values (directly from pipelineConfig) ---
        if (pipelineConfig) {
          // SCM
          if (pipelineConfig.scm) {
            const scmProvider = pipelineConfig.scm.provider?.toUpperCase();
            if (scmProvider === 'GITHUB') {
              setPushToGitHub(true);
              setPushToGitLab(false);
              if (pipelineConfig.scm.orgUser) setGithubOrg(pipelineConfig.scm.orgUser);
              if (pipelineConfig.scm.token) setGithubToken(pipelineConfig.scm.token);
              if (devBranchName) {
                setGithubBranch(devBranchName);
              } else if (pipelineConfig.scm.branch) {
                setGithubBranch(pipelineConfig.scm.branch);
              }
              if (pipelineConfig.scm.visibility) {
                setGithubPrivate(pipelineConfig.scm.visibility === 'PRIVATE');
              }
            } else if (scmProvider === 'GITLAB') {
              setPushToGitLab(true);
              setPushToGitHub(false);
              if (pipelineConfig.scm.orgUser) setGitlabOrg(pipelineConfig.scm.orgUser);
              if (pipelineConfig.scm.token) setGitlabToken(pipelineConfig.scm.token);
              if (devBranchName) {
                setGitlabBranch(devBranchName);
              } else if (pipelineConfig.scm.branch) {
                setGitlabBranch(pipelineConfig.scm.branch);
              }
              if (pipelineConfig.scm.visibility) {
                setGitlabPrivate(pipelineConfig.scm.visibility === 'PRIVATE');
              }
            }
          }

          // Cloud
          if (pipelineConfig.selectedCloudProvider || pipelineConfig.cloudProvider) {
            const provider = (pipelineConfig.selectedCloudProvider || pipelineConfig.cloudProvider).toUpperCase();
            const details = pipelineConfig.cloudDetails?.[provider.toLowerCase()] || {};
            if (provider === 'GCP') {
              setSelectedDeployment('gcp');
              setGcpProjectId(details.projectId || pipelineConfig.gcpProjectId || '');
              setGcpRegion(details.region || pipelineConfig.gcpRegion || '');
              setGcpServiceAccountJson(details.serviceAccountJson || pipelineConfig.gcpServiceAccount || '');
            } else if (provider === 'AWS') {
              setSelectedDeployment('aws');
              setAwsAccessKeyId(details.accessKeyId || pipelineConfig.awsAccessKeyId || '');
              setAwsSecretAccessKey(details.secretAccessKey || pipelineConfig.awsSecretAccessKey || '');
              setAwsRegionDeploy(details.region || pipelineConfig.awsRegion || '');
            } else if (provider === 'AZURE') {
              setSelectedDeployment('azure');
              setAzureSubscriptionId(details.subscriptionId || pipelineConfig.azureSubscriptionId || '');
              setAzureResourceGroup(details.resourceGroup || pipelineConfig.azureResourceGroup || '');
              setAzureRegion(details.region || pipelineConfig.azureRegion || '');
            }
          }
        }

        setIsLoading(false);
      }
    };

    fetchExistingConfig();
  }, [isOpen, organizationId, connectorId, pipelineConfig, devBranchName]);

  // Test MongoDB connection
  const handleTestMongoConnection = async () => {
    setIsTestingConnection(true);
    const payload = {
      databaseType: 'MONGODB',
    };

    if (mongoConnectionString) {
      payload.connectionString = mongoConnectionString;
    } else {
      payload.host = mongoHost;
      payload.port = parseInt(mongoPort);
      payload.databaseName = mongoDatabase;
      payload.username = mongoUser;
      payload.password = mongoPassword;
      payload.authSource = mongoAuthSource;
    }

    const result = await databaseService.testConnection(payload);
    setIsTestingConnection(false);

    if (result.data.success) {
      setToast({ message: 'MongoDB connection successful!', type: 'success' });
    } else {
      setToast({ message: "Connection Error", type: 'error' });
    }
  };

  // Save handler – excludes repo & deployment type, conditionally includes SCM/Cloud
  const handleSave = async () => {
    setIsSaving(true);

    const payload = {
      organizationId,
      sourceCodeManagement: null,
      cloudProvider: null,
      databaseConnector: null,
    };

    // SCM – only if not read-only
    if (!readOnlyFields?.includes('scm')) {
      if (pushToGitHub) {
        payload.sourceCodeManagement = {
          type: 'GITHUB',
          token: githubToken,
          orgOrUser: githubOrg,
          branch: githubBranch,
          isPrivate: githubPrivate,
        };
      } else if (pushToGitLab) {
        payload.sourceCodeManagement = {
          type: 'GITLAB',
          token: gitlabToken,
          orgOrUser: gitlabOrg,
          branch: gitlabBranch,
          isPrivate: gitlabPrivate,
        };
      }
    }

    // Cloud Provider – only if not read-only
    if (!readOnlyFields?.includes('cloudProvider')) {
      if (selectedDeployment === 'gcp') {
        payload.cloudProvider = {
          provider: 'GCP',
          gcpProjectId,
          gcpRegion,
          serviceAccountCredentials: gcpServiceAccountJson,
          cloudRun: null,
          gke: null,
          accessKeyId: null,
          secretAccessKey: null,
          awsRegion: null,
          appRunner: null,
          eks: null,
          subscriptionId: null,
          resourceGroup: null,
          azureRegion: null,
          container: null,
        };
      } else if (selectedDeployment === 'aws') {
        payload.cloudProvider = {
          provider: 'AWS',
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
          awsRegion: awsRegionDeploy,
          appRunner: null,
          eks: null,
          gcpProjectId: null,
          gcpRegion: null,
          serviceAccountCredentials: null,
          cloudRun: null,
          gke: null,
          subscriptionId: null,
          resourceGroup: null,
          azureRegion: null,
          container: null,
        };
      } else if (selectedDeployment === 'azure') {
        payload.cloudProvider = {
          provider: 'AZURE',
          subscriptionId: azureSubscriptionId,
          resourceGroup: azureResourceGroup,
          azureRegion,
          container: null,
          gcpProjectId: null,
          gcpRegion: null,
          serviceAccountCredentials: null,
          cloudRun: null,
          gke: null,
          accessKeyId: null,
          secretAccessKey: null,
          awsRegion: null,
          appRunner: null,
          eks: null,
        };
      }
    }

    // Database (always included)
    if (mysqlHost) {
      payload.databaseConnector = {
        databaseType: 'MYSQL',
        host: mysqlHost,
        port: parseInt(mysqlPort),
        databaseName: mysqlDatabase,
        username: mysqlUser,
        password: mysqlPassword,
        sslMode: mysqlSslMode,
        authSource: null,
      };
    } else if (mongoConnectionString || mongoHost) {
      payload.databaseConnector = {
        databaseType: 'MONGODB',
        connectionString: mongoConnectionString || null,
        host: mongoHost || null,
        port: mongoPort ? parseInt(mongoPort) : null,
        databaseName: mongoDatabase || null,
        username: mongoUser || null,
        password: mongoPassword || null,
        sslMode: null,
        authSource: mongoAuthSource || null,
      };
    } else if (postgresHost) {
      payload.databaseConnector = {
        databaseType: 'POSTGRESQL',
        host: postgresHost,
        port: parseInt(postgresPort),
        databaseName: postgresDatabase,
        username: postgresUser,
        password: postgresPassword,
        sslMode: postgresSslMode,
        authSource: null,
      };
    }

    const result = existingConfigId
      ? await connectorConfigurationService.updateConnectorConfiguration(existingConfigId, payload)
      : await connectorConfigurationService.createConnectorConfiguration(payload);

    setIsSaving(false);

    if (result.success) {
      setToast({ message: existingConfigId ? 'Connector configuration updated successfully!' : 'Connector configuration saved successfully!', type: 'success' });
      setTimeout(() => {
        onSave(result.data);
        onClose();
      }, 1000);
    } else {
      setToast({ message: result.error, type: 'error' });
    }
  };

  const toggleAccordion = (id) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-dark-700 shadow-2xl flex flex-col" style={{ backgroundColor: '#15192b' }}>
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-900/40">
            <div className="flex items-center gap-2">
              <Plug className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Configure Connectors & Cloud Providers</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-4">
              {/* Source Code Management */}
              <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                <CardTitle className="mb-3 text-white text-base">Source Code Management</CardTitle>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pushToGitHub}
                      onChange={(e) => setPushToGitHub(e.target.checked)}
                      className="accent-primary"
                      disabled={readOnlyFields?.includes('scm')}
                    />
                    <span className="text-xs text-gray-300">Push to GitHub</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pushToGitLab}
                      onChange={(e) => setPushToGitLab(e.target.checked)}
                      className="accent-primary"
                      disabled={readOnlyFields?.includes('scm')}
                    />
                    <span className="text-xs text-gray-300">Push to GitLab</span>
                  </label>
                </div>

                {/* GitHub Conditional – Repo removed */}
                {pushToGitHub && (
                  <div className="mt-3 space-y-2.5 rounded-md border border-dark-700 p-3" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300">GitHub Token</Label>
                      <Input
                        type="password"
                        placeholder="ghp_xxxx"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="h-9 text-sm"
                        autoComplete="off"
                        disabled={readOnlyFields?.includes('scm')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300">Org / user <span className="text-red-400">*</span></Label>
                      <Input
                        placeholder="username"
                        value={githubOrg}
                        onChange={(e) => setGithubOrg(e.target.value)}
                        className="h-9 text-sm"
                        autoComplete="off"
                        disabled={readOnlyFields?.includes('scm')}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-gray-300">Branch</Label>
                        <Input
                          placeholder="main"
                          value={githubBranch}
                          onChange={(e) => setGithubBranch(e.target.value)}
                          className="h-9 text-sm"
                          autoComplete="off"
                          disabled={readOnlyFields?.includes('scm')}
                        />
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          checked={githubPrivate}
                          onChange={(e) => setGithubPrivate(e.target.checked)}
                          className="accent-primary"
                          disabled={readOnlyFields?.includes('scm')}
                        />
                        <span className="text-xs text-gray-300">Private</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* GitLab Conditional – Repo removed */}
                {pushToGitLab && (
                  <div className="mt-3 space-y-2.5 rounded-md border border-dark-700 p-3" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300">GitLab Token</Label>
                      <Input
                        type="password"
                        placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                        value={gitlabToken}
                        onChange={(e) => setGitlabToken(e.target.value)}
                        className="h-9 text-sm"
                        autoComplete="off"
                        disabled={readOnlyFields?.includes('scm')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-300">Group / user <span className="text-red-400">*</span></Label>
                      <Input
                        placeholder="username"
                        value={gitlabOrg}
                        onChange={(e) => setGitlabOrg(e.target.value)}
                        className="h-9 text-sm"
                        autoComplete="off"
                        disabled={readOnlyFields?.includes('scm')}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-gray-300">Branch</Label>
                        <Input
                          placeholder="main"
                          value={gitlabBranch}
                          onChange={(e) => setGitlabBranch(e.target.value)}
                          className="h-9 text-sm"
                          autoComplete="off"
                          disabled={readOnlyFields?.includes('scm')}
                        />
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          checked={gitlabPrivate}
                          onChange={(e) => setGitlabPrivate(e.target.checked)}
                          className="accent-primary"
                          disabled={readOnlyFields?.includes('scm')}
                        />
                        <span className="text-xs text-gray-300">Private</span>
                      </label>
                    </div>
                  </div>
                )}
              </Card>

              {/* API GATEWAY – proxy only */}
              {pageType === 'proxy' && (
                <>
                  <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                    <CardTitle className="mb-3 text-white text-base">API GATEWAY</CardTitle>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { name: 'Apigee X', enabled: true },
                        { name: 'Apigee Edge', enabled: true },
                        { name: 'Kong', enabled: false },
                        { name: 'MuleSoft', enabled: false }
                      ].map((gateway) => (
                        <button
                          key={gateway.name}
                          type="button"
                          disabled={!gateway.enabled}
                          onClick={() => {
                            if (!gateway.enabled) return;
                            setSelectedGateway(selectedGateway === gateway.name ? '' : gateway.name);
                            if (gateway.name === 'Apigee Edge') {
                              setApigeeEdgeConfig(prev => ({ ...prev, ssoEnabled: null }));
                            }
                          }}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2',
                            selectedGateway === gateway.name
                              ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                              : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50',
                            !gateway.enabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Server className="w-4 h-4" />
                          {gateway.name}
                        </button>
                      ))}
                    </div>

                    {(selectedGateway === 'Apigee X' || selectedGateway === 'Apigee Edge') && (
                      <div className="mt-3 space-y-2.5 rounded-md border border-dark-700 p-3" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>

                        {/* SSO Toggle for Apigee Edge */}
                        {selectedGateway === 'Apigee Edge' && (
                          <div className="mb-4 space-y-3">
                            <Label className="text-sm text-gray-300">SSO Configuration</Label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="ssoEnabled"
                                  checked={apigeeEdgeConfig.ssoEnabled === true}
                                  onChange={() => setApigeeEdgeConfig({ ...apigeeEdgeConfig, ssoEnabled: true })}
                                  className="w-4 h-4 text-primary"
                                  disabled={readOnlyFields?.includes('fieldKey')}
                                />
                                <span className="text-sm text-white">SSO Enabled</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="ssoEnabled"
                                  checked={apigeeEdgeConfig.ssoEnabled === false}
                                  onChange={() => setApigeeEdgeConfig({ ...apigeeEdgeConfig, ssoEnabled: false })}
                                  className="w-4 h-4 text-primary"
                                  disabled={readOnlyFields?.includes('fieldKey')}
                                />
                                <span className="text-sm text-white">SSO Disabled</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Apigee X Configuration */}
                        {selectedGateway === 'Apigee X' && (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs text-gray-300">{selectedGateway} Configuration</Label>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Service Account JSON</Label>
                              <textarea
                                value={gatewayConfig.serviceAccountJson}
                                onChange={(e) => setGatewayConfig({ ...gatewayConfig, serviceAccountJson: e.target.value })}
                                placeholder='Paste your service account JSON here...'
                                className="w-full min-h-[100px] rounded-lg px-3 py-2 text-xs text-white font-mono resize-none border border-dark-700"
                                style={{ backgroundColor: '#0f172a80' }}
                                disabled={readOnlyFields?.includes('serviceAccountJson')}
                              />
                            </div>
                          </>
                        )}

                        {/* Apigee Edge Configuration based on SSO selection */}
                        {selectedGateway === 'Apigee Edge' && apigeeEdgeConfig.ssoEnabled !== null && (
                          <div className="mt-3 pt-3 border-t border-dark-700">
                            {apigeeEdgeConfig.ssoEnabled ? (
                              <div className="space-y-3">
                                <Label className="text-xs text-gray-300">SSO Configuration</Label>
                                <div className="space-y-2">
                                  <div>
                                    <Label className="text-xs text-gray-400">Token URL *</Label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">https://</span>
                                      <div className="absolute left-[62px] top-1/2 -translate-y-1/2 w-px h-4 bg-gray-600"></div>
                                      <input
                                        type="text"
                                        value={apigeeEdgeConfig.companyIdentifier || ''}
                                        onChange={(e) => setApigeeEdgeConfig({
                                          ...apigeeEdgeConfig,
                                          companyIdentifier: e.target.value,
                                          tokenUrl: `https://${e.target.value}.login.apigee.com/oauth/token`
                                        })}
                                        placeholder="[Enter Company Identifier]"
                                        className="w-full rounded-lg pl-16 pr-3 py-2 text-sm text-white border border-dark-700"
                                        style={{ backgroundColor: '#0f172a80' }}
                                        disabled={readOnlyFields?.includes('fieldKey')}
                                      />
                                      <div className="absolute right-[215px] top-1/2 -translate-y-1/2 w-px h-4 bg-gray-600"></div>
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">.login.apigee.com/oauth/token</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Full URL: https://{apigeeEdgeConfig.companyIdentifier || '[Company Identifier]'}.login.apigee.com/oauth/token</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-400">Username *</Label>
                                    <input
                                      type="text"
                                      value={apigeeEdgeConfig.username}
                                      onChange={(e) => setApigeeEdgeConfig({ ...apigeeEdgeConfig, username: e.target.value })}
                                      placeholder="Enter username"
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                                      style={{ backgroundColor: '#0f172a80' }}
                                      disabled={readOnlyFields?.includes('fieldKey')}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-400">Password *</Label>
                                    <input
                                      type="password"
                                      value={apigeeEdgeConfig.password}
                                      onChange={(e) => setApigeeEdgeConfig({ ...apigeeEdgeConfig, password: e.target.value })}
                                      placeholder="Enter password"
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                                      style={{ backgroundColor: '#0f172a80' }}
                                      disabled={readOnlyFields?.includes('fieldKey')}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <Label className="text-xs text-gray-300">Standard Configuration</Label>
                                <div className="space-y-2">
                                  <div>
                                    <Label className="text-xs text-gray-400">Organization Name *</Label>
                                    <input
                                      type="text"
                                      value={apigeeEdgeConfig.organizationName}
                                      onChange={(e) => setApigeeEdgeConfig({ ...apigeeEdgeConfig, organizationName: e.target.value })}
                                      placeholder="Enter organization name"
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                                      style={{ backgroundColor: '#0f172a80' }}
                                      disabled={readOnlyFields?.includes('fieldKey')}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-400">Username *</Label>
                                    <input
                                      type="text"
                                      value={apigeeEdgeConfig.username}
                                      onChange={(e) => setApigeeEdgeConfig({ ...apigeeEdgeConfig, username: e.target.value })}
                                      placeholder="Enter username"
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                                      style={{ backgroundColor: '#0f172a80' }}
                                      disabled={readOnlyFields?.includes('fieldKey')}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-400">Token URL *</Label>
                                    <input
                                      type="text"
                                      value={apigeeEdgeConfig.tokenUrl}
                                      onChange={(e) => setApigeeEdgeConfig({ ...apigeeEdgeConfig, tokenUrl: e.target.value })}
                                      placeholder="https://login.apigee.com/oauth/token"
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                                      style={{ backgroundColor: '#0f172a80' }}
                                      disabled={readOnlyFields?.includes('fieldKey')}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-400">Password *</Label>
                                    <input
                                      type="password"
                                      value={apigeeEdgeConfig.password}
                                      onChange={(e) => setApigeeEdgeConfig({ ...apigeeEdgeConfig, password: e.target.value })}
                                      placeholder="Enter password"
                                      className="w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700"
                                      style={{ backgroundColor: '#0f172a80' }}
                                      disabled={readOnlyFields?.includes('fieldKey')}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Save/Load buttons for Apigee Edge */}
                            <div className="pt-4 border-t border-dark-700 flex gap-2 mt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  localStorage.setItem(`probeStack_gatewayConfig_ApigeeEdge`, JSON.stringify(apigeeEdgeConfig));
                                  alert('Apigee Edge configuration saved!');
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors"
                              >
                                Save Configuration
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const saved = localStorage.getItem(`probeStack_gatewayConfig_ApigeeEdge`);
                                  if (saved) {
                                    setApigeeEdgeConfig(JSON.parse(saved));
                                    alert('Configuration loaded from localStorage');
                                  }
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-dark-700 text-white hover:bg-dark-600 transition-colors"
                              >
                                Load Saved
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (apigeeEdgeConfig.ssoEnabled) {
                                    alert('Verifying SSO connection...');
                                  } else {
                                    alert('Verifying standard connection...');
                                  }
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                Verify Connection
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setApigeeEdgeConfig({
                                    ssoEnabled: null,
                                    tokenUrl: '',
                                    username: '',
                                    password: '',
                                    organizationName: ''
                                  });
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs bg-dark-700 text-white hover:bg-dark-600 transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Save/Load buttons for Apigee X */}
                        {selectedGateway === 'Apigee X' && (
                          <div className="pt-2 border-t border-dark-700 flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem(`probeStack_gatewayConfig_${selectedGateway}`, JSON.stringify(gatewayConfig));
                                alert(`${selectedGateway} configuration saved!`);
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors"
                            >
                              Save Configuration
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const saved = localStorage.getItem(`probeStack_gatewayConfig_${selectedGateway}`);
                                if (saved) {
                                  setGatewayConfig(JSON.parse(saved));
                                  alert('Configuration loaded from localStorage');
                                }
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs bg-dark-700 text-white hover:bg-dark-600 transition-colors"
                            >
                              Load Saved
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </>
              )}

              {/* CLOUD PROVIDERS – deployment type removed */}
              {pageType !== 'proxy' && (
                <>
                  <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                    <CardTitle className="mb-3 text-white text-base">CLOUD PROVIDERS</CardTitle>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setSelectedDeployment(selectedDeployment === 'aws' ? null : 'aws')}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2',
                          selectedDeployment === 'aws'
                            ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                            : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                        )}
                        disabled={readOnlyFields?.includes('cloudProvider')}
                      >
                        <AWSLogo />
                        AWS
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDeployment(selectedDeployment === 'gcp' ? null : 'gcp')}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2',
                          selectedDeployment === 'gcp'
                            ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                            : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                        )}
                        disabled={readOnlyFields?.includes('cloudProvider')}
                      >
                        <GCPLogo />
                        GCP
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDeployment(selectedDeployment === 'azure' ? null : 'azure')}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2',
                          selectedDeployment === 'azure'
                            ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,91,31,0.3)]'
                            : 'border-dark-700 bg-dark-800/50 text-gray-300 hover:border-primary/50'
                        )}
                        disabled={readOnlyFields?.includes('cloudProvider')}
                      >
                        <AzureLogo />
                        Azure
                      </button>
                    </div>

                    {/* AWS Fields – deployment type removed */}
                    {selectedDeployment === 'aws' && (
                      <div className="mt-3 space-y-2.5 rounded-md border border-dark-700 p-3" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Access Key ID</Label>
                          <Input
                            value={awsAccessKeyId}
                            onChange={(e) => setAwsAccessKeyId(e.target.value)}
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Secret Access Key</Label>
                          <Input
                            type="password"
                            value={awsSecretAccessKey}
                            onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Region</Label>
                          <Input
                            value={awsRegionDeploy}
                            onChange={(e) => setAwsRegionDeploy(e.target.value)}
                            placeholder="us-east-1"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                      </div>
                    )}

                    {/* GCP Fields – deployment type removed */}
                    {selectedDeployment === 'gcp' && (
                      <div className="mt-3 space-y-2.5 rounded-md border border-dark-700 p-3" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">GCP Project ID</Label>
                          <Input
                            value={gcpProjectId}
                            onChange={(e) => setGcpProjectId(e.target.value)}
                            placeholder="my-project-123"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Region</Label>
                          <Input
                            value={gcpRegion}
                            onChange={(e) => setGcpRegion(e.target.value)}
                            placeholder="us-central1"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Service Account Credentials (JSON)</Label>
                          <textarea
                            value={gcpServiceAccountJson}
                            onChange={(e) => setGcpServiceAccountJson(e.target.value)}
                            placeholder='Paste JSON here...'
                            className="w-full min-h-[100px] rounded-lg px-3 py-2 text-xs text-white font-mono resize-none bg-dark-900 border border-dark-700"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                      </div>
                    )}

                    {/* Azure Fields – deployment type removed */}
                    {selectedDeployment === 'azure' && (
                      <div className="mt-3 space-y-2.5 rounded-md border border-dark-700 p-3" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Subscription ID</Label>
                          <Input
                            value={azureSubscriptionId}
                            onChange={(e) => setAzureSubscriptionId(e.target.value)}
                            placeholder="12345678-1234-1234-1234-123456789012"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Resource Group</Label>
                          <Input
                            value={azureResourceGroup}
                            onChange={(e) => setAzureResourceGroup(e.target.value)}
                            placeholder="my-resource-group"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-300">Region</Label>
                          <Input
                            value={azureRegion}
                            onChange={(e) => setAzureRegion(e.target.value)}
                            placeholder="East US"
                            className="h-9 text-sm"
                            disabled={readOnlyFields?.includes('cloudProvider')}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </>
              )}

              {/* DATABASE CONNECTOR - MySQL, MongoDB, PostgreSQL */}
              {pageType !== "proxy" && (
                <Card className="p-4" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                  <CardTitle className="mb-3 text-white text-base">DATABASE CONNECTOR</CardTitle>
                  <div className="space-y-3">
                    {/* MySQL */}
                    <div className="rounded-lg border border-dark-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAccordion('mysql')}
                        className="w-full flex items-center justify-between px-4 py-3 bg-dark-900/40 hover:bg-dark-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-white">MySQL</span>
                        </div>
                        <svg className={cn('w-4 h-4 text-gray-400 transition-transform', openAccordion === 'mysql' && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openAccordion === 'mysql' && (
                        <div className="p-4 space-y-3 border-t border-dark-700" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Host</Label>
                              <Input value={mysqlHost} onChange={(e) => setMysqlHost(e.target.value)} placeholder="localhost" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Port</Label>
                              <Input value={mysqlPort} onChange={(e) => setMysqlPort(e.target.value)} placeholder="3306" className="h-9 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">Database Name</Label>
                            <Input value={mysqlDatabase} onChange={(e) => setMysqlDatabase(e.target.value)} placeholder="mydb" className="h-9 text-sm" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Username</Label>
                              <Input value={mysqlUser} onChange={(e) => setMysqlUser(e.target.value)} placeholder="root" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Password</Label>
                              <Input type="password" value={mysqlPassword} onChange={(e) => setMysqlPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">SSL Mode</Label>
                            <select
                              value={mysqlSslMode}
                              onChange={(e) => setMysqlSslMode(e.target.value)}
                              className="w-full h-9 rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                            >
                              <option value="required">required</option>
                              <option value="preferred">preferred</option>
                              <option value="disabled">disabled</option>
                              <option value="verify_ca">verify_ca</option>
                              <option value="verify_identity">verify_identity</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MongoDB */}
                    <div className="rounded-lg border border-dark-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAccordion('mongodb')}
                        className="w-full flex items-center justify-between px-4 py-3 bg-dark-900/40 hover:bg-dark-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">MongoDB</span>
                        </div>
                        <svg className={cn('w-4 h-4 text-gray-400 transition-transform', openAccordion === 'mongodb' && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openAccordion === 'mongodb' && (
                        <div className="p-4 space-y-3 border-t border-dark-700" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">Connection String</Label>
                            <Input
                              value={mongoConnectionString}
                              onChange={(e) => setConnectionString(e.target.value)}
                              placeholder="mongodb://username:password@host:port/database"
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-3 py-2">
                            <div className="flex-1 border-t border-dark-600"></div>
                            <span className="text-xs text-gray-400 font-medium">OR</span>
                            <div className="flex-1 border-t border-dark-600"></div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Host</Label>
                              <Input
                                value={mongoHost}
                                onChange={(e) => setMongoHost(e.target.value)}
                                placeholder="localhost"
                                className="h-9 text-sm"
                                disabled={!!mongoConnectionString}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Port</Label>
                              <Input
                                value={mongoPort}
                                onChange={(e) => setMongoPort(e.target.value)}
                                placeholder="27017"
                                className="h-9 text-sm"
                                disabled={!!mongoConnectionString}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">Database Name</Label>
                            <Input
                              value={mongoDatabase}
                              onChange={(e) => setMongoDatabase(e.target.value)}
                              placeholder="mydb"
                              className="h-9 text-sm"
                              disabled={!!mongoConnectionString}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Username</Label>
                              <Input
                                value={mongoUser}
                                onChange={(e) => setMongoUser(e.target.value)}
                                placeholder="admin"
                                className="h-9 text-sm"
                                disabled={!!mongoConnectionString}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Password</Label>
                              <Input
                                type="password"
                                value={mongoPassword}
                                onChange={(e) => setMongoPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-9 text-sm"
                                disabled={!!mongoConnectionString}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">Auth Source</Label>
                            <Input
                              value={mongoAuthSource}
                              onChange={(e) => setMongoAuthSource(e.target.value)}
                              placeholder="admin"
                              className="h-9 text-sm"
                              disabled={!!mongoConnectionString}
                            />
                          </div>
                          <div className="pt-2">
                            <Button
                              type="button"
                              onClick={handleTestMongoConnection}
                              disabled={isTestingConnection || (!mongoConnectionString && (!mongoHost || !mongoPort || !mongoDatabase))}
                              className={cn(
                                'px-4 py-2 rounded-lg text-xs font-medium transition-all',
                                'bg-green-600 hover:bg-green-700 text-white',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                              )}
                            >
                              {isTestingConnection ? 'Testing...' : 'Test Connection'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PostgreSQL */}
                    <div className="rounded-lg border border-dark-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAccordion('postgresql')}
                        className="w-full flex items-center justify-between px-4 py-3 bg-dark-900/40 hover:bg-dark-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-white">PostgreSQL</span>
                        </div>
                        <svg className={cn('w-4 h-4 text-gray-400 transition-transform', openAccordion === 'postgresql' && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openAccordion === 'postgresql' && (
                        <div className="p-4 space-y-3 border-t border-dark-700" style={{ backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' }}>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Host</Label>
                              <Input value={postgresHost} onChange={(e) => setPostgresHost(e.target.value)} placeholder="localhost" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Port</Label>
                              <Input value={postgresPort} onChange={(e) => setPostgresPort(e.target.value)} placeholder="5432" className="h-9 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">Database Name</Label>
                            <Input value={postgresDatabase} onChange={(e) => setPostgresDatabase(e.target.value)} placeholder="mydb" className="h-9 text-sm" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Username</Label>
                              <Input value={postgresUser} onChange={(e) => setPostgresUser(e.target.value)} placeholder="postgres" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">Password</Label>
                              <Input type="password" value={postgresPassword} onChange={(e) => setPostgresPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-300">SSL Mode</Label>
                            <select
                              value={postgresSslMode}
                              onChange={(e) => setPostgresSslMode(e.target.value)}
                              className="w-full h-9 rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                            >
                              <option value="require">require</option>
                              <option value="prefer">prefer</option>
                              <option value="disable">disable</option>
                              <option value="verify-ca">verify-ca</option>
                              <option value="verify-full">verify-full</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-dark-700 bg-dark-900/40">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                'active:scale-[0.98]',
                isSaving && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSaving ? 'Saving...' : 'Save All Connections'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}