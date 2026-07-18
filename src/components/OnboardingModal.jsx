// src/components/OnboardingModal.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  UserCircle,
  FileText,
  Users,
  Plug,
  CheckCircle,
  Loader2,
  ArrowRight,
  Server,
  Layers,
  ChevronDown,
  X,
  AlertCircle,
  Plus,
  FolderOpen,
  Search,
  GitBranch,
  Zap,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import { cicdProfileService } from "../services/cicdProfileService";
import { CONFIGURABLE_STEPS } from "../utils/workflowUtils";

export default function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
  selectedGateway = "",
  savedConsumers = [],
  onboardingService,
  getProjectType,
  projectType,
  resourceLabel,
  defaultMode = "select",
  lockMode = false,
  showActionSelection = false,
  actionMode = "create",
  onActionModeChange = () => {},
  actionOptions = [],
  onAddConsumer = null,
  onEditConsumer = null,
  initialExistingRecord = null,
  initialActionDetails = null,
  showMessage = () => {},
  availableWorkflows = null,
  selectedWorkflow = null,
  onWorkflowChange = null,
}) {
  const [mode, setMode] = useState(defaultMode);
  const [isLoading, setIsLoading] = useState(false);

  // Existing onboarding states
  const [isFetchingAppNames, setIsFetchingAppNames] = useState(false);
  const [selectedExistingApp, setSelectedExistingApp] = useState(null);
  const [selectedExistingSpec, setSelectedExistingSpec] = useState(null);
  const [selectedExistingResource, setSelectedExistingResource] =
    useState(null);
  const [existingOnboardingRecords, setExistingOnboardingRecords] = useState(
    [],
  );
  const [hasLoadedExistingContexts, setHasLoadedExistingContexts] =
    useState(false);
  const [existingContextSearch, setExistingContextSearch] = useState("");
  const [existingContextPage, setExistingContextPage] = useState(0);
  const [existingContextPageInfo, setExistingContextPageInfo] = useState({
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 15,
  });
  const [selectedBusinessUnitFilter, setSelectedBusinessUnitFilter] =
    useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("");
  const [selectedApplicationIdFilter, setSelectedApplicationIdFilter] =
    useState("");
  const [actionResourceName, setActionResourceName] = useState("");
  const [actionBasePath, setActionBasePath] = useState("");
  const [actionVersion, setActionVersion] = useState("");
  const [actionVersionError, setActionVersionError] = useState("");

  // New onboarding states
  const [onboardingBusinessUnit, setOnboardingBusinessUnit] = useState("");
  const [onboardingTeamName, setOnboardingTeamName] = useState("");
  const [onboardingApplicationName, setOnboardingApplicationName] =
    useState("");
  const [onboardingApplicationId, setOnboardingApplicationId] = useState("");
  const [onboardingProjectOwner, setOnboardingProjectOwner] = useState("");
  const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState("");
  const [onboardingProjectSME, setOnboardingProjectSME] = useState("");
  const [onboardingProjectSMEEmail, setOnboardingProjectSMEEmail] =
    useState("");
  const [onboardingProjectDLEmail, setOnboardingProjectDLEmail] = useState("");
  const [onboardingGoLiveDate, setOnboardingGoLiveDate] = useState("");
  const [onboardingTesterName, setOnboardingTesterName] = useState("");
  const [onboardingTesterEmail, setOnboardingTesterEmail] = useState("");
  const [onboardingServiceNowGroup, setOnboardingServiceNowGroup] =
    useState("");
  const [onboardingServiceNowEmail, setOnboardingServiceNowEmail] =
    useState("");
  const [selectedOnboardingConsumers, setSelectedOnboardingConsumers] =
    useState([]);
  const [showConsumerSelector, setShowConsumerSelector] = useState(false);

  // ── CI/CD Profile states ──────────────────────────────────────────────
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [workflowDropdownOpen, setWorkflowDropdownOpen] = useState(false);
  const [hoveredWorkflowId, setHoveredWorkflowId] = useState(null);
  const workflowDropdownRef = useRef(null);

  const resolvedProjectType = getProjectType ? getProjectType() : projectType;
  const resolvedResourceLabel =
    resourceLabel ||
    (selectedGateway === "Kong"
      ? "Kong gateway service"
      : resolvedProjectType === "MICROSERVICE"
        ? "microservice"
        : resolvedProjectType === "APIGEE_SHARED_FLOW"
          ? "shared flow"
          : "proxy");
  const onboardingTitle = `${resolvedResourceLabel
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")} Onboarding`;
  const resolvedActionOptions =
    actionOptions.length > 0
      ? actionOptions
      : [
          {
            id: "create",
            title: "Create",
            description: `Start a new ${resolvedResourceLabel} flow.`,
            icon: Plus,
            nextMode: "select",
          },
          {
            id: "update",
            title: "Edit",
            description: `Load an existing ${resolvedResourceLabel} onboarding into Step 1.`,
            icon: FileText,
            nextMode: "existing",
            existingOnly: true,
          },
          {
            id: "cloning",
            title: "Cloning",
            description: `Choose new or existing onboarding before cloning.`,
            icon: Layers,
            nextMode: "select",
          },
          {
            id: "versioning",
            title: "Versioning",
            description: `Choose new or existing onboarding before versioning.`,
            icon: CheckCircle,
            nextMode: "select",
          },
        ];
  const selectedActionOption = resolvedActionOptions.find(
    (option) => option.id === actionMode,
  );
  const isModeLocked = lockMode || selectedActionOption?.existingOnly;
  const uniqueValues = (items, key) => [
    ...new Set(items.map((item) => item[key]).filter(Boolean)),
  ];
  const normalizeExistingRecord = (item) => ({
    ...(item?.onboarding || item?.microservice || item || {}),
    resources: item?.resources || [],
  });
  const normalizeInitialExistingRecord = () => {
    if (!initialExistingRecord) return null;

    const context =
      initialExistingRecord.onboarding ||
      initialExistingRecord.context ||
      initialExistingRecord.onboardingContext ||
      {};
    const resource =
      initialExistingRecord.resource?.microservice ||
      initialExistingRecord.microservice ||
      initialExistingRecord.resource ||
      initialExistingRecord;
    const resourceId =
      resource?.id ||
      resource?._id ||
      initialExistingRecord.id ||
      initialExistingRecord._id;
    const contextId =
      context.id ||
      context._id ||
      resource?.onboardingId ||
      resource?.onboardingContextId ||
      initialExistingRecord.onboardingId ||
      initialExistingRecord.onboardingContextId ||
      resourceId;
    const resources = Array.isArray(context.resources)
      ? context.resources
      : Array.isArray(initialExistingRecord.resources)
        ? initialExistingRecord.resources
        : [];
    const normalizedResource = {
      ...resource,
      id: resourceId,
      businessUnit: resource?.businessUnit || context.businessUnit || "",
      teamName: resource?.teamName || context.teamName || "",
      applicationName:
        resource?.applicationName || context.applicationName || "",
      applicationId: resource?.applicationId || context.applicationId || "",
    };
    const hasResource = resources.some(
      (item) => (item.id || item._id) === resourceId,
    );

    return {
      ...context,
      id: contextId,
      businessUnit: context.businessUnit || resource?.businessUnit || "",
      teamName: context.teamName || resource?.teamName || "",
      applicationName:
        context.applicationName || resource?.applicationName || "",
      applicationId: context.applicationId || resource?.applicationId || "",
      resources: hasResource
        ? resources
        : [normalizedResource, ...resources].filter(
            (item) => item?.id || item?._id,
          ),
    };
  };
  const mergeInitialExistingRecord = (records) => {
    const initialRecord = normalizeInitialExistingRecord();
    if (!initialRecord) return records;

    const initialKey = initialRecord.id || initialRecord.applicationId;
    return [
      initialRecord,
      ...records.filter(
        (record) => (record.id || record.applicationId) !== initialKey,
      ),
    ];
  };
  const filteredByBusinessUnit = selectedBusinessUnitFilter
    ? existingOnboardingRecords.filter(
        (item) => item.businessUnit === selectedBusinessUnitFilter,
      )
    : [];
  const filteredByTeam = selectedTeamFilter
    ? filteredByBusinessUnit.filter(
        (item) => item.teamName === selectedTeamFilter,
      )
    : [];
  const businessUnitOptions = uniqueValues(
    existingOnboardingRecords,
    "businessUnit",
  );
  const teamOptions = uniqueValues(filteredByBusinessUnit, "teamName");
  const applicationIdOptions = uniqueValues(filteredByTeam, "applicationId");
  const needsCloneOrVersionDetails =
    actionMode === "cloning" || actionMode === "versioning";
  const shouldSelectExistingResource =
    selectedActionOption?.existingOnly ||
    actionMode === "update" ||
    needsCloneOrVersionDetails;
  const selectedResourceOptions = selectedExistingSpec?.resources || [];
  const resourceNameLabel =
    resolvedProjectType === "MICROSERVICE"
      ? "New Microservice Name"
      : "New Resource Name";
  const formatPreviewValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return value;
  };
  const formatPreviewDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  const selectedOnboardingDetails = selectedExistingSpec
    ? [
        ["Business Unit", selectedExistingSpec.businessUnit],
        ["Project", selectedExistingSpec.teamName],
        ["Application Name", selectedExistingSpec.applicationName],
        ["Application ID", selectedExistingSpec.applicationId],
        ["Project Owner", selectedExistingSpec.projectOwner],
        ["Owner Email", selectedExistingSpec.ownerEmail],
        ["Project SME", selectedExistingSpec.projectSME],
        ["SME Email", selectedExistingSpec.projectSMEEmail],
        ["DL Email", selectedExistingSpec.projectDLEmail],
        ["Go Live Date", selectedExistingSpec.expectedGoLiveDate],
        ["Tester", selectedExistingSpec.testerName],
        ["Tester Email", selectedExistingSpec.testerEmail],
        ["ServiceNow Group", selectedExistingSpec.serviceNowGroupName],
        ["ServiceNow Email", selectedExistingSpec.serviceNowEmail],
        ["Created By", selectedExistingSpec.createdBy],
        ["Updated By", selectedExistingSpec.updatedBy],
        ["Created At", formatPreviewDate(selectedExistingSpec.createdAt)],
        ["Updated At", formatPreviewDate(selectedExistingSpec.updatedAt)],
      ].filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      )
    : [];
  const selectedResourceDetails = selectedExistingResource
    ? [
        [
          resolvedProjectType === "MICROSERVICE"
            ? "Service Name"
            : "Resource Name",
          selectedExistingResource.apiName || selectedExistingResource.name,
        ],
        ["Application Name", selectedExistingResource.applicationName],
        ["Application ID", selectedExistingResource.applicationId],
        [
          "Base Path",
          selectedExistingResource.basePath || selectedExistingResource.path,
        ],
        ["Version", selectedExistingResource.version],
        ["Status", selectedExistingResource.status],
        ["Deployment URL", selectedExistingResource.deploymentUrl],
        ["Created By", selectedExistingResource.createdBy],
        ["Updated By", selectedExistingResource.updatedBy],
        ["Created At", formatPreviewDate(selectedExistingResource.createdAt)],
        ["Updated At", formatPreviewDate(selectedExistingResource.updatedAt)],
      ].filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      )
    : [];
  const hasActionDetails =
    actionMode === "cloning"
      ? actionResourceName.trim() &&
        actionVersion.trim() &&
        actionBasePath.trim()
      : actionMode === "versioning"
        ? actionVersion.trim() && actionBasePath.trim()
        : true;
  const canLoadExisting =
    selectedExistingApp &&
    selectedExistingSpec &&
    (!shouldSelectExistingResource || selectedExistingResource) &&
    hasActionDetails;

  // ── Fetch profiles when modal opens in 'new' mode ──────────────────────
  const fetchProfiles = async () => {
    setProfilesLoading(true);
    try {
      const res = await cicdProfileService.listProfiles();
      if (res.success) {
        setAvailableProfiles(res.data || []);
        // Auto-select if profileId is in URL
        const params = new URLSearchParams(window.location.search);
        const profileId = params.get("profileId");
        if (profileId && res.data.some((p) => p.id === profileId)) {
          setSelectedProfileId(profileId);
          // Clean URL param to avoid repeated auto-select
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }
      } else {
        showMessage(
          "Failed to load profiles: " + (res.error || "Unknown error"),
          "error",
        );
      }
    } catch (e) {
      showMessage("Error loading profiles: " + e.message, "error");
    }
    setProfilesLoading(false);
  };

  useEffect(() => {
    if (isOpen && mode === "new") {
      fetchProfiles();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!workflowDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (
        workflowDropdownRef.current &&
        !workflowDropdownRef.current.contains(e.target)
      ) {
        setWorkflowDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [workflowDropdownOpen]);

  const handleActionSelect = (option) => {
    onActionModeChange(option.id);
    setActionResourceName("");
    setActionBasePath("");
    setActionVersion("");
    setActionVersionError("");
    setMode(option.nextMode || (option.existingOnly ? "existing" : "select"));
  };

  // Fetch existing applications when switching to existing mode
  useEffect(() => {
    if (
      mode === "existing" &&
      !hasLoadedExistingContexts &&
      !isFetchingAppNames &&
      isOpen
    ) {
      setIsFetchingAppNames(true);
      onboardingService
        .getOnboardingContextsPage("", {
          search: existingContextSearch,
          page: existingContextPage,
          pageSize: existingContextPageInfo.size,
        })
        .then((result) => {
          if (result.success) {
            const records = result.data?.data || result.data || [];
            const normalizedRecords = Array.isArray(records)
              ? records.map(normalizeExistingRecord)
              : [];
            setExistingOnboardingRecords(
              mergeInitialExistingRecord(normalizedRecords),
            );
            setExistingContextPageInfo({
              totalElements: result.data?.totalElements || 0,
              totalPages: result.data?.totalPages || 0,
              page: result.data?.page || 0,
              size: result.data?.size || existingContextPageInfo.size,
            });
          } else {
            showMessage(result.error, "error");
          }
          setHasLoadedExistingContexts(true);
          setIsFetchingAppNames(false);
        });
    }
  }, [
    mode,
    isOpen,
    hasLoadedExistingContexts,
    isFetchingAppNames,
    onboardingService,
    resolvedProjectType,
    initialExistingRecord,
    showMessage,
    existingContextSearch,
    existingContextPage,
    existingContextPageInfo.size,
  ]);

  useEffect(() => {
    if (!isOpen || !initialExistingRecord) return;

    const initialRecord = normalizeInitialExistingRecord();
    if (!initialRecord) return;

    const initialResourceId =
      initialExistingRecord.resource?.microservice?.id ||
      initialExistingRecord.microservice?.id ||
      initialExistingRecord.resource?.id ||
      initialExistingRecord.id ||
      initialExistingRecord._id;
    const initialResource =
      initialRecord.resources?.find(
        (resource) => (resource.id || resource._id) === initialResourceId,
      ) ||
      initialRecord.resources?.[0] ||
      null;
    setExistingOnboardingRecords((records) =>
      mergeInitialExistingRecord(records),
    );
    setHasLoadedExistingContexts(true);
    setSelectedBusinessUnitFilter(initialRecord.businessUnit || "");
    setSelectedTeamFilter(initialRecord.teamName || "");
    setSelectedApplicationIdFilter(initialRecord.applicationId || "");
    setSelectedExistingApp(initialRecord.applicationId || null);
    setSelectedExistingSpec(initialRecord);
    setSelectedExistingResource(initialResource);

    if (actionMode === "cloning") {
      setActionResourceName(
        initialActionDetails?.newResourceName ||
          `${initialResource?.apiName || initialResource?.applicationName || resolvedResourceLabel} Copy`,
      );
    } else {
      setActionResourceName(initialActionDetails?.newResourceName || "");
    }
    setActionBasePath(initialActionDetails?.basePath || "");
    setActionVersion(initialActionDetails?.version || "");
    setActionVersionError("");
  }, [
    isOpen,
    initialExistingRecord,
    initialActionDetails,
    actionMode,
    resolvedResourceLabel,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialExistingRecord) return;
    setHasLoadedExistingContexts(false);
    setExistingOnboardingRecords([]);
  }, [isOpen, resolvedProjectType, initialExistingRecord]);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
    }
  }, [defaultMode, isOpen]);

  // Reset form when modal closes
  const resetModal = () => {
    setMode(defaultMode);
    setSelectedExistingApp(null);
    setSelectedExistingSpec(null);
    setSelectedExistingResource(null);
    setExistingOnboardingRecords([]);
    setHasLoadedExistingContexts(false);
    setSelectedBusinessUnitFilter("");
    setSelectedTeamFilter("");
    setSelectedApplicationIdFilter("");
    setActionResourceName("");
    setActionBasePath("");
    setActionVersion("");
    setActionVersionError("");
    setOnboardingBusinessUnit("");
    setOnboardingTeamName("");
    setOnboardingApplicationName("");
    setOnboardingApplicationId("");
    setOnboardingProjectOwner("");
    setOnboardingOwnerEmail("");
    setOnboardingProjectSME("");
    setOnboardingProjectSMEEmail("");
    setOnboardingProjectDLEmail("");
    setOnboardingGoLiveDate("");
    setOnboardingTesterName("");
    setOnboardingTesterEmail("");
    setOnboardingServiceNowGroup("");
    setOnboardingServiceNowEmail("");
    setSelectedOnboardingConsumers([]);
    setShowConsumerSelector(false);
    setSelectedProfileId(null);
    setAvailableProfiles([]);
  };

  const handleClose = (reason = "cancel") => {
    resetModal();
    onClose(reason);
  };

  // ─── Create onboarding and apply profile ──────────────────────────────
  const handleCreateOnboarding = async () => {
    // Validation
    if (!onboardingTeamName.trim()) {
      showMessage("Project is required", "error");
      return;
    }
    if (!onboardingApplicationName.trim()) {
      showMessage("Application Name is required", "error");
      return;
    }

    setIsLoading(true);
    const result = await onboardingService.createOnboardingContext({
      organizationId: "f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c",
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
    });
    setIsLoading(false);

    if (result.success) {
      const newOnboardingId = result.data?.data?.id || result.data?.id;

      // Apply selected profile if any
      if (selectedProfileId && newOnboardingId) {
        try {
          const applyRes = await cicdProfileService.applyProfileToOnboarding(
            selectedProfileId,
            newOnboardingId,
          );
          if (!applyRes.success) {
            showMessage(
              "Onboarding created but failed to apply profile: " +
                applyRes.error,
              "warning",
            );
          } else {
            showMessage(
              "Onboarding created and profile applied successfully!",
              "success",
            );
          }
        } catch (e) {
          showMessage(
            "Onboarding created but profile application failed: " + e.message,
            "warning",
          );
        }
      } else {
        showMessage("Onboarding created successfully!", "success");
      }

      const completeOnboardingData = {
        onboardingId: newOnboardingId,
        onboardingContextId: newOnboardingId,
        resourceId: null,
        isNew: true,
        projectType: resolvedProjectType,
        onboardingData: {
          teamName: onboardingTeamName,
          applicationName: onboardingApplicationName,
          applicationId: onboardingApplicationId,
          businessUnit: onboardingBusinessUnit,
          projectOwner: onboardingProjectOwner,
          ownerEmail: onboardingOwnerEmail,
          projectSME: onboardingProjectSME,
          projectSMEEmail: onboardingProjectSMEEmail,
          projectDLEmail: onboardingProjectDLEmail,
          goLiveDate: onboardingGoLiveDate,
          testerName: onboardingTesterName,
          testerEmail: onboardingTesterEmail,
          serviceNowGroup: onboardingServiceNowGroup,
          serviceNowEmail: onboardingServiceNowEmail,
        },
        consumerIds: selectedOnboardingConsumers,
        connectorId: null,
        appliedProfileId: selectedProfileId || null,
      };

      onComplete(completeOnboardingData);
      handleClose("complete");
    } else {
      showMessage(result.error, "error");
    }
  };

  const handleSelectExisting = async () => {
    if (!selectedApplicationIdFilter || !selectedExistingSpec) {
      showMessage("Please select an application id", "error");
      return;
    }
    if (shouldSelectExistingResource && !selectedExistingResource) {
      showMessage(`Please select a ${resolvedResourceLabel}`, "error");
      return;
    }
    if (
      actionMode === "cloning" &&
      (!actionResourceName.trim() ||
        !actionVersion.trim() ||
        !actionBasePath.trim())
    ) {
      showMessage(
        `Please provide ${resourceNameLabel.toLowerCase()}, version, and base path`,
        "error",
      );
      return;
    }
    if (
      actionMode === "versioning" &&
      (!actionVersion.trim() || !actionBasePath.trim())
    ) {
      showMessage("Please provide version and base path", "error");
      return;
    }

    setIsLoading(true);
    const result = shouldSelectExistingResource
      ? await onboardingService.getResourceDetails(selectedExistingResource?.id)
      : await onboardingService.getOnboardingContextById(
          selectedExistingSpec.id,
        );
    setIsLoading(false);

    if (!result.success) {
      showMessage(result.error, "error");
      return;
    }

    const payload = result.data?.data || result.data || {};
    const resourceDetails = payload.resource || payload || {};
    const microservice =
      resourceDetails.microservice ||
      payload.microservice ||
      resourceDetails.onboarding ||
      resourceDetails.context ||
      selectedExistingResource ||
      {};
    const context =
      payload.onboarding ||
      payload.context ||
      resourceDetails.onboarding ||
      resourceDetails.context ||
      selectedExistingSpec ||
      microservice ||
      {};
    const requirement =
      resourceDetails.requirement || payload.requirement || null;
    const design = resourceDetails.apiDesign || payload.apiDesign || null;
    const consumers =
      resourceDetails.consumerInformation || payload.consumerInformation || [];
    const selectedRecord = shouldSelectExistingResource
      ? microservice
      : context;
    const designData = design?.specMetadata
      ? {
          id: design.specMetadata.id,
          apiDesignId: design.id,
          specMetadataId: design.specMetadata.id,
          name: design.specMetadata.specName || design.specMetadata.fileName,
          specName: design.specMetadata.specName,
          fileName: design.specMetadata.fileName,
          source: "existing-onboarding",
        }
      : null;

    const completeExistingData = {
      onboardingId: null,
      onboardingContextId: context.id || selectedExistingSpec.id,
      resourceId: shouldSelectExistingResource
        ? microservice.id || selectedExistingResource?.id
        : null,
      isNew: false,
      shouldLoadFullFlowData: shouldSelectExistingResource,
      projectType: resolvedProjectType,
      onboardingData: {
        teamName: selectedRecord.teamName || context.teamName || "",
        applicationName:
          selectedRecord.applicationName || context.applicationName || "",
        applicationId:
          selectedRecord.applicationId || context.applicationId || "",
        businessUnit: selectedRecord.businessUnit || context.businessUnit || "",
        projectOwner: selectedRecord.projectOwner || context.projectOwner || "",
        ownerEmail: selectedRecord.ownerEmail || context.ownerEmail || "",
        projectSME: selectedRecord.projectSME || context.projectSME || "",
        projectSMEEmail:
          selectedRecord.projectSMEEmail || context.projectSMEEmail || "",
        projectDLEmail:
          selectedRecord.projectDLEmail || context.projectDLEmail || "",
        goLiveDate:
          selectedRecord.expectedGoLiveDate || context.expectedGoLiveDate || "",
        testerName: selectedRecord.testerName || context.testerName || "",
        testerEmail: selectedRecord.testerEmail || context.testerEmail || "",
        serviceNowGroup:
          selectedRecord.serviceNowGroupName ||
          context.serviceNowGroupName ||
          "",
        serviceNowEmail:
          selectedRecord.serviceNowEmail || context.serviceNowEmail || "",
      },
      consumerIds:
        consumers.length > 0
          ? consumers.map((consumer) => consumer.id)
          : selectedRecord.consumerIds || context.consumerIds || [],
      existingConfigId:
        selectedRecord.connectorId ||
        resourceDetails.connectorConfiguration?.id ||
        null,
      requirementData: requirement
        ? {
            ...requirement,
            functionalReqs: requirement.functionalRequirements || "",
            nonFunctionalReqs: requirement.nonFunctionalRequirements || "",
          }
        : null,
      designData,
      stepStatuses: payload.steps || selectedExistingResource?.steps || [],
      actionMode,
      actionDetails: needsCloneOrVersionDetails
        ? {
            newResourceName: actionResourceName.trim(),
            basePath: actionBasePath.trim(),
            version: actionVersion.trim(),
          }
        : null,
    };

    onComplete(completeExistingData);
    handleClose("complete");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-dark-700 shadow-2xl flex flex-col"
        style={{ backgroundColor: "rgb(22 27 48 / var(--tw-bg-opacity, 1))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-700 bg-dark-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {onboardingTitle}
              </h2>
              <p className="text-sm text-gray-400">
                {mode === "action" &&
                  `Choose what to do with this ${resolvedResourceLabel}`}
                {mode === "select" && "Choose how to get started"}
                {mode === "new" &&
                  `Create a new ${resolvedResourceLabel} onboarding`}
                {mode === "existing" &&
                  `Select an existing ${resolvedResourceLabel} onboarding`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Workflow Selector — new mode only; existing mode shows it after app-id selection */}
          {availableWorkflows !== null && mode === "new" && (
            <div className="mb-5 pb-5 border-b border-dark-700/60">
              <div className="flex items-start gap-3">
                <span className="text-sm text-gray-400 flex-shrink-0 mt-2">
                  Workflow:
                </span>
                <div className="relative flex-1" ref={workflowDropdownRef}>
                  {/* Trigger button */}
                  <button
                    type="button"
                    onClick={() => {
                      setHoveredWorkflowId(
                        selectedWorkflow?.id ?? "__default__",
                      );
                      setWorkflowDropdownOpen((o) => !o);
                    }}
                    className="w-full flex items-center justify-between gap-2 text-sm bg-dark-800/60 border border-dark-700 rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none hover:border-dark-600 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      {selectedWorkflow
                        ? selectedWorkflow.name
                        : "Default (all required)"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-gray-500 transition-transform flex-shrink-0",
                        workflowDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Two-panel dropdown */}
                  {workflowDropdownOpen && (
                    <div
                      className="absolute z-50 top-full left-0 mt-1 bg-[rgb(15_23_42)] border border-dark-700 rounded-xl shadow-2xl overflow-hidden flex"
                      style={{ minWidth: "480px", maxWidth: "600px" }}
                    >
                      {/* Left: workflow list */}
                      <div className="w-52 border-r border-dark-700/80 py-1 flex-shrink-0 overflow-y-auto max-h-72">
                        <button
                          type="button"
                          onClick={() => {
                            onWorkflowChange && onWorkflowChange(null);
                            setWorkflowDropdownOpen(false);
                          }}
                          onMouseEnter={() =>
                            setHoveredWorkflowId("__default__")
                          }
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                            !selectedWorkflow
                              ? "bg-primary/10 text-primary"
                              : "text-gray-300 hover:bg-dark-800/60",
                          )}
                        >
                          <CheckCircle
                            className={cn(
                              "w-3.5 h-3.5 flex-shrink-0",
                              !selectedWorkflow
                                ? "text-primary"
                                : "text-gray-600",
                            )}
                          />
                          <span className="truncate">
                            Default (all required)
                          </span>
                        </button>
                        {availableWorkflows.map((wf) => (
                          <button
                            key={wf.id}
                            type="button"
                            onClick={() => {
                              onWorkflowChange && onWorkflowChange(wf);
                              setWorkflowDropdownOpen(false);
                            }}
                            onMouseEnter={() => setHoveredWorkflowId(wf.id)}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                              selectedWorkflow?.id === wf.id
                                ? "bg-primary/10 text-primary"
                                : "text-gray-300 hover:bg-dark-800/60",
                            )}
                          >
                            <GitBranch
                              className={cn(
                                "w-3.5 h-3.5 flex-shrink-0",
                                selectedWorkflow?.id === wf.id
                                  ? "text-primary"
                                  : "text-gray-600",
                              )}
                            />
                            <span className="truncate">{wf.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Right: step preview panel */}
                      <div className="flex-1 p-4 min-w-0">
                        {(() => {
                          const previewWf =
                            hoveredWorkflowId === "__default__"
                              ? null
                              : availableWorkflows.find(
                                  (w) => w.id === hoveredWorkflowId,
                                ) || selectedWorkflow;
                          const optionalCount = previewWf
                            ? CONFIGURABLE_STEPS.filter(
                                (s) =>
                                  previewWf.steps?.[s.id]?.required === false,
                              ).length
                            : 0;
                          return (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-gray-300 truncate">
                                  {previewWf ? previewWf.name : "Default"}
                                </p>
                                {optionalCount > 0 && (
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                                    {optionalCount} skippable
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                {CONFIGURABLE_STEPS.map((step) => {
                                  const isRequired =
                                    !previewWf ||
                                    previewWf.steps?.[step.id]?.required !==
                                      false;
                                  return (
                                    <div
                                      key={step.id}
                                      className="flex items-center justify-between gap-3"
                                    >
                                      <span className="text-xs text-gray-400 truncate">
                                        {step.name}
                                      </span>
                                      {isRequired ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                          Required
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                          Optional
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {previewWf?.description && (
                                <p className="mt-3 text-xs text-gray-500 italic leading-relaxed">
                                  {previewWf.description}
                                </p>
                              )}
                              {!previewWf && (
                                <p className="mt-3 text-xs text-gray-600 italic">
                                  All steps are required with no skippable
                                  stages.
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {selectedWorkflow && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0 mt-2">
                    Amber steps are skippable
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Mode */}
          {mode === "action" && showActionSelection && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resolvedActionOptions.map((option) => {
                  const Icon = option.icon || FileText;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleActionSelect(option)}
                      className={cn(
                        "group text-left p-5 rounded-xl border transition-all",
                        actionMode === option.id
                          ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                          : "border-dark-700 bg-dark-800/30 hover:border-primary/50 hover:bg-primary/5",
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            {option.title}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Select Mode */}
          {mode === "select" && (
            <div className="space-y-6">
              {showActionSelection && (
                <button
                  onClick={() => setMode("action")}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Actions
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Onboarding Card */}
                <div
                  onClick={() => setMode("new")}
                  className="group cursor-pointer p-6 rounded-xl border-2 border-dark-700 hover:border-primary/50 transition-all bg-dark-800/30 hover:bg-primary/5"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all flex items-center justify-center mb-4">
                    <Plus className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Create New Onboarding
                  </h3>
                  <p className="text-sm text-gray-400">
                    Start fresh with a new {resolvedResourceLabel} onboarding
                    process. Fill in all necessary details.
                  </p>
                  <div className="mt-4 flex items-center text-primary text-sm font-medium gap-1">
                    Create New <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Existing Onboarding Card */}
                <div
                  onClick={() => setMode("existing")}
                  className="group cursor-pointer p-6 rounded-xl border-2 border-dark-700 hover:border-primary/50 transition-all bg-dark-800/30 hover:bg-primary/5"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all flex items-center justify-center mb-4">
                    <FolderOpen className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Use Existing Application
                  </h3>
                  <p className="text-sm text-gray-400">
                    Continue working on an existing {resolvedResourceLabel}.
                    Load previously saved data.
                  </p>
                  <div className="mt-4 flex items-center text-primary text-sm font-medium gap-1">
                    Load Existing <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New Onboarding Mode */}
          {mode === "new" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                {!isModeLocked && (
                  <button
                    onClick={() =>
                      setMode(showActionSelection ? "action" : "select")
                    }
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    {showActionSelection
                      ? "Back to Actions"
                      : "Back to Options"}
                  </button>
                )}
              </div>

              {/* Business Unit Information */}
              <Card
                className="p-5"
                style={{ backgroundColor: "rgb(15 23 42 / 0.5)" }}
              >
                <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <UserCircle className="w-4 h-4" />
                  Business Unit Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Business Unit
                    </Label>
                    <select
                      className="h-9 w-full rounded-lg px-3 py-2 text-sm text-white border border-dark-700 bg-dark-900"
                      value={onboardingBusinessUnit}
                      onChange={(e) =>
                        setOnboardingBusinessUnit(e.target.value)
                      }
                    >
                      <option value="">Select Business Unit</option>
                      <option value="retail">Retail Banking</option>
                      <option value="corporate">Corporate Banking</option>
                      <option value="wealth">Wealth Management</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">Project *</Label>
                    <Input
                      placeholder="Enter team name"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingTeamName}
                      onChange={(e) => setOnboardingTeamName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Application Name *
                    </Label>
                    <Input
                      placeholder="Enter application name"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingApplicationName}
                      onChange={(e) =>
                        setOnboardingApplicationName(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Application Id
                    </Label>
                    <Input
                      placeholder="e.g., APP-2024-001"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingApplicationId}
                      onChange={(e) =>
                        setOnboardingApplicationId(e.target.value)
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Stakeholder Information */}
              <Card
                className="p-5"
                style={{ backgroundColor: "rgb(15 23 42 / 0.5)" }}
              >
                <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Stakeholder Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Project Owner
                    </Label>
                    <Input
                      placeholder="Enter owner name"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingProjectOwner}
                      onChange={(e) =>
                        setOnboardingProjectOwner(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">Owner Email</Label>
                    <Input
                      type="email"
                      placeholder="owner@company.com"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingOwnerEmail}
                      onChange={(e) => setOnboardingOwnerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">Project SME</Label>
                    <Input
                      placeholder="Enter project SME name"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingProjectSME}
                      onChange={(e) => setOnboardingProjectSME(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Project SME Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="sme@company.com"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingProjectSMEEmail}
                      onChange={(e) =>
                        setOnboardingProjectSMEEmail(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Project DL Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="project-dl@company.com"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingProjectDLEmail}
                      onChange={(e) =>
                        setOnboardingProjectDLEmail(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Expected Go-Live Date
                    </Label>
                    <Input
                      type="date"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingGoLiveDate}
                      onChange={(e) => setOnboardingGoLiveDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">Tester Name</Label>
                    <Input
                      placeholder="Enter tester name"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingTesterName}
                      onChange={(e) => setOnboardingTesterName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      Tester Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="tester@company.com"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingTesterEmail}
                      onChange={(e) => setOnboardingTesterEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      ServiceNow Group Name
                    </Label>
                    <Input
                      placeholder="Enter ServiceNow group name"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingServiceNowGroup}
                      onChange={(e) =>
                        setOnboardingServiceNowGroup(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">
                      ServiceNow Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="servicenow@company.com"
                      className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                      value={onboardingServiceNowEmail}
                      onChange={(e) =>
                        setOnboardingServiceNowEmail(e.target.value)
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Consumer Selection */}
              <Card
                className="p-5"
                style={{ backgroundColor: "rgb(15 23 42 / 0.5)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Consumer Information
                  </h4>
                  {onAddConsumer && (
                    <button
                      type="button"
                      onClick={onAddConsumer}
                      className="px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-1.5 active:scale-[0.98]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Consumer
                    </button>
                  )}
                </div>

                {savedConsumers.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {savedConsumers.map((consumer) => {
                      const isSelected = selectedOnboardingConsumers.includes(
                        consumer.id,
                      );

                      return (
                        <div
                          key={consumer.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all relative group",
                            isSelected
                              ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]"
                              : "border-dark-700 hover:border-primary/50 bg-dark-900/60",
                          )}
                        >
                          <div
                            onClick={() => {
                              if (isSelected) {
                                setSelectedOnboardingConsumers(
                                  selectedOnboardingConsumers.filter(
                                    (id) => id !== consumer.id,
                                  ),
                                );
                              } else {
                                setSelectedOnboardingConsumers([
                                  ...selectedOnboardingConsumers,
                                  consumer.id,
                                ]);
                              }
                            }}
                          >
                            <p className="text-xs font-medium text-white truncate pr-6">
                              {consumer.consumerName ||
                                consumer.name ||
                                "Unnamed"}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {consumer.consumerPocName || "No POC"}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {consumer.consumerPocEmail || "No POC email"}
                            </p>
                            {isSelected && (
                              <div className="mt-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-primary" />
                                <span className="text-[10px] text-primary">
                                  Selected
                                </span>
                              </div>
                            )}
                          </div>

                          {onEditConsumer && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditConsumer(consumer);
                              }}
                              className="absolute top-2 right-2 p-1 rounded-md bg-dark-800/80 text-gray-400 hover:text-primary hover:bg-dark-700/80 transition-all opacity-0 group-hover:opacity-100"
                              title="Edit Consumer"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                    <p className="text-sm text-gray-500">
                      No consumers saved yet.
                    </p>
                  </div>
                )}
              </Card>

              {/* ─── NEW: CI/CD Profile Selection ───────────────────────── */}
              <Card
                className="p-5"
                style={{ backgroundColor: "rgb(15 23 42 / 0.5)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Apply CI/CD Profile
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/cicd-automation";
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-all border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Profile
                  </button>
                </div>

                {profilesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : availableProfiles.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                    <p className="text-sm text-gray-400">
                      No CI/CD profiles found.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Create one from the CI/CD Automation page.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {availableProfiles.map((profile) => {
                      const isSelected = selectedProfileId === profile.id;
                      return (
                        <div
                          key={profile.id}
                          onClick={() => setSelectedProfileId(profile.id)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected
                              ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.3)]"
                              : "border-dark-700 hover:border-primary/50 bg-dark-900/60",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-white truncate">
                                {profile.profileName}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {profile.description || "No description"}
                              </p>
                              {profile.pipelineConfigs && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {Object.keys(profile.pipelineConfigs).length}{" "}
                                  asset type(s) configured
                                </p>
                              )}
                              {profile.strategies &&
                                profile.strategies.length > 0 && (
                                  <p className="text-[10px] text-primary mt-1">
                                    {profile.strategies.length} strategy(ies)
                                    included
                                  </p>
                                )}
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedProfileId && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    Profile selected
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Existing Onboarding Mode - unchanged */}
          {mode === "existing" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                {!isModeLocked && (
                  <button
                    onClick={() =>
                      setMode(showActionSelection ? "action" : "select")
                    }
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    {showActionSelection
                      ? "Back to Actions"
                      : "Back to Options"}
                  </button>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative md:w-[360px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={existingContextSearch}
                        onChange={(event) => {
                          setExistingContextSearch(event.target.value);
                          setExistingContextPage(0);
                          setHasLoadedExistingContexts(false);
                          setSelectedBusinessUnitFilter("");
                          setSelectedTeamFilter("");
                          setSelectedApplicationIdFilter("");
                          setSelectedExistingApp(null);
                          setSelectedExistingSpec(null);
                          setSelectedExistingResource(null);
                        }}
                        placeholder={`Search existing ${resolvedResourceLabel.toLowerCase()} onboarding...`}
                        className="h-10 w-full rounded-lg border border-dark-700 bg-dark-950/60 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-primary/50"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <span>
                        {existingContextPageInfo.totalElements} records
                      </span>
                      <span className="hidden h-1 w-1 rounded-full bg-gray-600 md:inline-block" />
                      <span>
                        Page{" "}
                        {existingContextPageInfo.totalPages
                          ? existingContextPageInfo.page + 1
                          : 0}{" "}
                        of {existingContextPageInfo.totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={
                            isFetchingAppNames || existingContextPage <= 0
                          }
                          onClick={() => {
                            setExistingContextPage((page) =>
                              Math.max(0, page - 1),
                            );
                            setHasLoadedExistingContexts(false);
                          }}
                          className="rounded-full border border-dark-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={
                            isFetchingAppNames ||
                            existingContextPage + 1 >=
                              existingContextPageInfo.totalPages
                          }
                          onClick={() => {
                            setExistingContextPage((page) => page + 1);
                            setHasLoadedExistingContexts(false);
                          }}
                          className="rounded-full border border-dark-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {isFetchingAppNames ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : existingOnboardingRecords.length === 0 ? (
                  <div className="p-5 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No onboarding records found
                    </p>
                    <button
                      onClick={() => !isModeLocked && setMode("new")}
                      className="mt-3 text-sm text-primary hover:text-primary/80"
                    >
                      Create a new onboarding instead
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">
                          Business Unit
                        </h4>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                          {businessUnitOptions.map((businessUnit) => (
                            <button
                              key={businessUnit}
                              type="button"
                              onClick={() => {
                                setSelectedBusinessUnitFilter(businessUnit);
                                setSelectedTeamFilter("");
                                setSelectedApplicationIdFilter("");
                                setSelectedExistingApp(null);
                                setSelectedExistingSpec(null);
                                setSelectedExistingResource(null);
                              }}
                              className={cn(
                                "w-full p-3 rounded-lg border text-left transition-all",
                                selectedBusinessUnitFilter === businessUnit
                                  ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                                  : "border-dark-700 bg-dark-900/40 hover:border-primary/50",
                              )}
                            >
                              <p className="text-sm font-medium text-white">
                                {businessUnit}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">
                          Project
                        </h4>
                        {selectedBusinessUnitFilter ? (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                            {teamOptions.map((teamName) => (
                              <button
                                key={teamName}
                                type="button"
                                onClick={() => {
                                  setSelectedTeamFilter(teamName);
                                  setSelectedApplicationIdFilter("");
                                  setSelectedExistingApp(null);
                                  setSelectedExistingSpec(null);
                                  setSelectedExistingResource(null);
                                }}
                                className={cn(
                                  "w-full p-3 rounded-lg border text-left transition-all",
                                  selectedTeamFilter === teamName
                                    ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                                    : "border-dark-700 bg-dark-900/40 hover:border-primary/50",
                                )}
                              >
                                <p className="text-sm font-medium text-white">
                                  {teamName}
                                </p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                            <p className="text-sm text-gray-500">
                              Select a business unit first
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">
                          Application
                        </h4>
                        {selectedTeamFilter ? (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                            {applicationIdOptions.map((applicationId) => {
                              // Find the first matching record to get the application name
                              const matchingRecord = filteredByTeam.find(
                                (item) => item.applicationId === applicationId,
                              );
                              const appName =
                                matchingRecord?.applicationName ||
                                applicationId;

                              return (
                                <button
                                  key={applicationId}
                                  type="button"
                                  onClick={() => {
                                    const matchingRecords =
                                      filteredByTeam.filter(
                                        (item) =>
                                          item.applicationId === applicationId,
                                      );
                                    setSelectedApplicationIdFilter(
                                      applicationId,
                                    );
                                    setSelectedExistingApp(applicationId);
                                    setSelectedExistingSpec(
                                      matchingRecords[0] || null,
                                    );
                                    setSelectedExistingResource(null);
                                  }}
                                  className={cn(
                                    "w-full p-3 rounded-lg border text-left transition-all",
                                    selectedApplicationIdFilter ===
                                      applicationId
                                      ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                                      : "border-dark-700 bg-dark-900/40 hover:border-primary/50",
                                  )}
                                >
                                  <div>
                                    <p className="text-sm font-medium text-white truncate">
                                      {appName}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {applicationId}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                            <p className="text-sm text-gray-500">
                              Select a team first
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Workflow selector — visible once an application ID is chosen */}
                    {selectedApplicationIdFilter &&
                      availableWorkflows !== null && (
                        <div className="pb-5 border-b border-dark-700/60">
                          <div className="flex items-start gap-3">
                            <span className="text-sm text-gray-400 flex-shrink-0 mt-2">
                              Workflow:
                            </span>
                            <div
                              className="relative flex-1"
                              ref={workflowDropdownRef}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setHoveredWorkflowId(
                                    selectedWorkflow?.id ?? "__default__",
                                  );
                                  setWorkflowDropdownOpen((o) => !o);
                                }}
                                className="w-full flex items-center justify-between gap-2 text-sm bg-dark-800/60 border border-dark-700 rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none hover:border-dark-600 transition-all"
                              >
                                <span className="flex items-center gap-2">
                                  <GitBranch className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  {selectedWorkflow
                                    ? selectedWorkflow.name
                                    : "Default (all required)"}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "w-4 h-4 text-gray-500 transition-transform flex-shrink-0",
                                    workflowDropdownOpen && "rotate-180",
                                  )}
                                />
                              </button>

                              {workflowDropdownOpen && (
                                <div
                                  className="absolute z-50 top-full left-0 mt-1 bg-[rgb(15_23_42)] border border-dark-700 rounded-xl shadow-2xl overflow-hidden flex"
                                  style={{
                                    minWidth: "480px",
                                    maxWidth: "600px",
                                  }}
                                >
                                  <div className="w-52 border-r border-dark-700/80 py-1 flex-shrink-0 overflow-y-auto max-h-72">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onWorkflowChange &&
                                          onWorkflowChange(null);
                                        setWorkflowDropdownOpen(false);
                                      }}
                                      onMouseEnter={() =>
                                        setHoveredWorkflowId("__default__")
                                      }
                                      className={cn(
                                        "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                                        !selectedWorkflow
                                          ? "bg-primary/10 text-primary"
                                          : "text-gray-300 hover:bg-dark-800/60",
                                      )}
                                    >
                                      <CheckCircle
                                        className={cn(
                                          "w-3.5 h-3.5 flex-shrink-0",
                                          !selectedWorkflow
                                            ? "text-primary"
                                            : "text-gray-600",
                                        )}
                                      />
                                      <span className="truncate">
                                        Default (all required)
                                      </span>
                                    </button>
                                    {availableWorkflows.map((wf) => (
                                      <button
                                        key={wf.id}
                                        type="button"
                                        onClick={() => {
                                          onWorkflowChange &&
                                            onWorkflowChange(wf);
                                          setWorkflowDropdownOpen(false);
                                        }}
                                        onMouseEnter={() =>
                                          setHoveredWorkflowId(wf.id)
                                        }
                                        className={cn(
                                          "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                                          selectedWorkflow?.id === wf.id
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-300 hover:bg-dark-800/60",
                                        )}
                                      >
                                        <GitBranch
                                          className={cn(
                                            "w-3.5 h-3.5 flex-shrink-0",
                                            selectedWorkflow?.id === wf.id
                                              ? "text-primary"
                                              : "text-gray-600",
                                          )}
                                        />
                                        <span className="truncate">
                                          {wf.name}
                                        </span>
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex-1 p-4 min-w-0">
                                    {(() => {
                                      const previewWf =
                                        hoveredWorkflowId === "__default__"
                                          ? null
                                          : availableWorkflows.find(
                                              (w) => w.id === hoveredWorkflowId,
                                            ) || selectedWorkflow;
                                      const optionalCount = previewWf
                                        ? CONFIGURABLE_STEPS.filter(
                                            (s) =>
                                              previewWf.steps?.[s.id]
                                                ?.required === false,
                                          ).length
                                        : 0;
                                      return (
                                        <>
                                          <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-gray-300 truncate">
                                              {previewWf
                                                ? previewWf.name
                                                : "Default"}
                                            </p>
                                            {optionalCount > 0 && (
                                              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                                                {optionalCount} skippable
                                              </span>
                                            )}
                                          </div>
                                          <div className="space-y-1.5">
                                            {CONFIGURABLE_STEPS.map((step) => {
                                              const isRequired =
                                                !previewWf ||
                                                previewWf.steps?.[step.id]
                                                  ?.required !== false;
                                              return (
                                                <div
                                                  key={step.id}
                                                  className="flex items-center justify-between gap-3"
                                                >
                                                  <span className="text-xs text-gray-400 truncate">
                                                    {step.name}
                                                  </span>
                                                  {isRequired ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                                      Required
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                                      Optional
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                          {previewWf?.description && (
                                            <p className="mt-3 text-xs text-gray-500 italic leading-relaxed">
                                              {previewWf.description}
                                            </p>
                                          )}
                                          {!previewWf && (
                                            <p className="mt-3 text-xs text-gray-600 italic">
                                              All steps are required with no
                                              skippable stages.
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                            {selectedWorkflow && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0 mt-2">
                                Amber steps are skippable
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                    {selectedApplicationIdFilter &&
                      shouldSelectExistingResource && (
                        <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-4">
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-white">
                                Select {resolvedResourceLabel}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Choose the child resource to edit and load its
                                completed step data.
                              </p>
                            </div>
                            <Server className="w-5 h-5 text-primary shrink-0" />
                          </div>

                          {selectedResourceOptions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                              {selectedResourceOptions.map((resource) => {
                                const isSelected =
                                  selectedExistingResource?.id === resource.id;
                                const completedCount = (
                                  resource.steps || []
                                ).filter((step) => step.completed).length;
                                const totalCount = resource.steps?.length || 0;

                                return (
                                  <button
                                    key={resource.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedExistingResource(resource)
                                    }
                                    className={cn(
                                      "w-full p-3 rounded-lg border text-left transition-all",
                                      isSelected
                                        ? "border-primary bg-primary/20 shadow-[0_0_10px_rgba(255,91,31,0.2)]"
                                        : "border-dark-700 bg-dark-900/60 hover:border-primary/50",
                                    )}
                                  >
                                    <p className="text-sm font-medium text-white truncate">
                                      {resource.apiName || "API name pending"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 truncate">
                                      {resource.applicationName ||
                                        resource.projectType ||
                                        resolvedProjectType}
                                    </p>
                                    {totalCount > 0 && (
                                      <p className="text-[11px] text-primary mt-2">
                                        {completedCount} of {totalCount} steps
                                        completed
                                      </p>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg border border-dark-700 bg-dark-900/40 text-center">
                              <p className="text-sm text-gray-500">
                                No {resolvedResourceLabel} found under this
                                onboarding
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    {selectedApplicationIdFilter && selectedExistingSpec && (
                      <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-4">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-white">
                              Selected onboarding details
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Review this onboarding before loading it into the
                              flow.
                            </p>
                          </div>
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedOnboardingDetails
                            .slice(0, 12)
                            .map(([label, value]) => (
                              <div
                                key={label}
                                className="min-w-0 rounded-lg border border-dark-700/70 bg-dark-900/60 px-3 py-2"
                              >
                                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                                  {label}
                                </p>
                                <p
                                  className="mt-1 text-sm font-medium text-gray-100 truncate"
                                  title={String(formatPreviewValue(value))}
                                >
                                  {formatPreviewValue(value)}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {selectedApplicationIdFilter &&
                      selectedExistingResource && (
                        <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-4">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-white">
                                Selected {resolvedResourceLabel} details
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                This is the resource that will be loaded when
                                you continue.
                              </p>
                            </div>
                            <Server className="w-5 h-5 text-primary shrink-0" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {selectedResourceDetails
                              .slice(0, 9)
                              .map(([label, value]) => (
                                <div
                                  key={label}
                                  className="min-w-0 rounded-lg border border-dark-700/70 bg-dark-900/60 px-3 py-2"
                                >
                                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                                    {label}
                                  </p>
                                  <p
                                    className="mt-1 text-sm font-medium text-gray-100 truncate"
                                    title={String(formatPreviewValue(value))}
                                  >
                                    {formatPreviewValue(value)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {selectedApplicationIdFilter &&
                      selectedExistingResource &&
                      needsCloneOrVersionDetails && (
                        <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                          <div className="mb-4">
                            <p className="text-sm font-medium text-white">
                              {actionMode === "cloning"
                                ? `New ${resolvedResourceLabel} details`
                                : "New version details"}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {actionMode === "cloning"
                                ? "Choose the source above, then enter the new resource name, version, and base path."
                                : "Choose the source above, then enter the new version and base path."}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {actionMode === "cloning" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-gray-300">
                                  {resourceNameLabel} *
                                </Label>
                                <Input
                                  placeholder={`e.g., ${resolvedResourceLabel} v2`}
                                  className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                  value={actionResourceName}
                                  onChange={(event) =>
                                    setActionResourceName(event.target.value)
                                  }
                                />
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">
                                Version *
                              </Label>
                              <Input
                                placeholder="e.g., 2.0.0"
                                className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                value={actionVersion}
                                onChange={(event) => {
                                  setActionVersion(event.target.value);
                                  setActionVersionError("");
                                }}
                              />
                              {actionVersionError ? (
                                <p className="text-xs text-red-400">
                                  {actionVersionError}
                                </p>
                              ) : null}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-300">
                                Base Path *
                              </Label>
                              <Input
                                placeholder="e.g., /v2/orders"
                                className="h-9 text-sm bg-dark-900 border-dark-700 text-white"
                                value={actionBasePath}
                                onChange={(event) =>
                                  setActionBasePath(event.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}

                    {selectedApplicationIdFilter &&
                      !shouldSelectExistingResource && (
                        <div className="rounded-lg border border-dark-700 bg-dark-900/40 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-white">
                                Ready to load onboarding data
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Only Step 1 onboarding information will be
                                populated for this action.
                              </p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700 bg-dark-800/30">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
          >
            Cancel
          </button>
          {mode === "new" && (
            <button
              type="button"
              onClick={handleCreateOnboarding}
              disabled={
                isLoading || !onboardingTeamName || !onboardingApplicationName
              }
              className={cn(
                "px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2",
                onboardingTeamName && onboardingApplicationName && !isLoading
                  ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
                  : "bg-dark-700 text-gray-500 cursor-not-allowed",
              )}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {mode === "existing" && (
            <button
              type="button"
              onClick={handleSelectExisting}
              disabled={isLoading || !canLoadExisting}
              className={cn(
                "px-6 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2",
                canLoadExisting && !isLoading
                  ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
                  : "bg-dark-700 text-gray-500 cursor-not-allowed",
              )}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionMode === "cloning"
                ? "Clone & Continue"
                : actionMode === "versioning"
                  ? "Create Version & Continue"
                  : "Load & Continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1f35;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2a2f4a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3a3f5a;
        }
      `}</style>
    </div>
  );
}
