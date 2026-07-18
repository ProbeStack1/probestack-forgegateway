import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../lib/axios";
import { isDemoMode } from "../../lib/demoMode";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Loader2, Search, Plus, Pencil, Trash2, Eye, Upload, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

// Profile Config Service base URL (can be overridden via Vite env)
// Use proxy in development to avoid CORS issues, absolute URL in production
const getProfileConfigServiceBaseUrl = () => {
  // In development, use relative URL to leverage Vite proxy (bypasses CORS)
  if (import.meta.env.DEV) {
    return '/profile-config';
  }
  // In production, use absolute URL
  const url = import.meta.env.VITE_PROFILE_CONFIG_SERVICE_URL;
  return url;
};

const PROFILE_CONFIG_BASE = getProfileConfigServiceBaseUrl();

// Note: Info endpoints have been moved to Profile Config Service
// Discovery service base URL (kept for backward compatibility, but info endpoints now use PROFILE_CONFIG_BASE)
const getDiscoveryServiceBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '/discovery';
  }
  const url = import.meta.env.VITE_DISCOVERY_SERVICE_URL;
  return url;
};

const DISCOVERY_BASE = getDiscoveryServiceBaseUrl();

// Log service URLs for debugging
console.log('Environment:', import.meta.env.MODE);
console.log('Profile Config Service Base URL:', PROFILE_CONFIG_BASE);
console.log('Discovery Service Base URL:', DISCOVERY_BASE);

const DEFAULT_APIGEE_X_URL = "https://apigee.googleapis.com/v1";

export const ApigeeXConfig = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active view based on route
  const isAddProjectPage = location.pathname.includes('/add');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]); // Changed from organizations to projects

  const [connectionConfig, setConnectionConfig] = useState({
    userEmail: localStorage.getItem("userEmail") || "admin@example.com",
    apigeeXUrl: DEFAULT_APIGEE_X_URL,
    apigeeEnvCategory: "x",
  });

  // Form state for adding new project
  const [newProjectForm, setNewProjectForm] = useState({
    serviceAccountJson: "", // JSON text or file content
    serviceAccountFile: null, // File object
  });
  const [addingProject, setAddingProject] = useState(false);
  const [addProjectError, setAddProjectError] = useState("");
  const [addProjectSuccess, setAddProjectSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false); // Control visibility of success message
  const [availableProjects, setAvailableProjects] = useState([]); // Projects fetched from API
  const [parsedServiceAccount, setParsedServiceAccount] = useState(null); // Parsed service account JSON
  const [profileLabel, setProfileLabel] = useState(""); // Optional label for profile name
  const [alsoAddToGCS, setAlsoAddToGCS] = useState(false); // Checkbox to also add to Google Cloud Storage
  const [gcsProfilesExist, setGcsProfilesExist] = useState(false); // Track if GCS profiles exist
  const fileInputRef = useRef(null); // Ref for file input to reset it

  // Dynamic profile name prefix based on company name
  const profileNamePrefix = useMemo(() => {
    const company = (localStorage.getItem('companyName') || "probestack").toLowerCase();
    return `${company}-x`;
  }, []);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View modal state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [projectToView, setProjectToView] = useState(null);

  // Edit/Update modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    serviceAccountJson: "",
  });
  const [updating, setUpdating] = useState(false);

  // Auto-load projects for the logged-in user on dashboard view
  useEffect(() => {
    if (!isAddProjectPage && projects.length === 0 && !loading) {
      console.log('useEffect triggered - fetching projects');
      fetchProjects();
    }
  }, [location.pathname]);

  // Check if Google Cloud Storage profiles exist (only on add page)
  useEffect(() => {
    if (isAddProjectPage) {
      checkGCSProfiles();
    }
  }, [isAddProjectPage]);

  // Auto-hide verification success message after 4 seconds
  useEffect(() => {
    if (showVerificationSuccess) {
      const timer = setTimeout(() => {
        setShowVerificationSuccess(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showVerificationSuccess]);

  const handleConnectionFieldChange = (field, value) => {
    setConnectionConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Handle view project
  const handleViewClick = (project) => {
    setProjectToView(project);
    setViewDialogOpen(true);
  };

  // Handle delete project
  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setDeleting(true);
    try {
      // Get profileName and all projects in this profile
      const profileName = projectToDelete.profileName || projectToDelete.projectId || projectToDelete.orgName || "N/A";
      const profileProjects = projects.filter(proj => {
        const projProfileName = proj.profileName || proj.projectId || proj.orgName || "N/A";
        return projProfileName === profileName;
      });

      if (profileProjects.length === 0) {
        console.error('No projects found for profile:', profileName);
        setDeleting(false);
        return;
      }

      // DELETE /apigee/x/profiles
      // API requires companyName and profileName as query parameters (per Swagger docs)
      const deleteUrl = `${PROFILE_CONFIG_BASE}/apigee/x/profiles`;

      if (!profileName || profileName === "N/A") {
        console.error('No profile name found for deletion');
        setDeleting(false);
        return;
      }

      console.log('=== DELETE PROFILE DEBUG ===');
      console.log('Project to delete object:', projectToDelete);
      console.log('Profile name extracted:', profileName);
      console.log('Profile name type:', typeof profileName);
      console.log('Profile name length:', profileName?.length);
      console.log('Projects in profile:', profileProjects.length);
      console.log('First project in profile:', profileProjects[0]);
      console.log('Delete URL:', deleteUrl);
      console.log('Query params:', { companyName: localStorage.getItem('companyName') || "probestack", profileName: profileName });
      console.log('Full URL will be:', `${deleteUrl}?companyName=${localStorage.getItem('companyName') || 'probestack'}&profileName=${encodeURIComponent(profileName)}`);

      // DELETE with companyName and profileName as required query parameters
      const response = await axios.delete(deleteUrl, {
        params: {
          companyName: localStorage.getItem('companyName') || "probestack",
          profileName: profileName, // Required: Profile name to identify the record
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response data:', JSON.stringify(response.data, null, 2));

      // Verify deletion was successful
      if (response.status === 200 || response.status === 204) {
        // Close dialog first
        setDeleteDialogOpen(false);
        setProjectToDelete(null);

        // Add a small delay to ensure backend has processed the deletion
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh the list with cache-busting to ensure we get fresh data
        await fetchProjects();

        // Double-check: verify the profile was actually deleted
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchProjects();

        console.log('Profile deletion completed and list refreshed');
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        params: err.config?.params,
      });

      let errorMessage = 'Failed to delete profile';

      if (err.response?.status === 404) {
        errorMessage = `Profile not found. It may have already been deleted.`;
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || err.response?.data?.error || 'Invalid request. Please check the profile name.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

    } finally {
      setDeleting(false);
    }
  };

  // Handle edit project (edits entire profile)
  const handleEditClick = (project) => {
    setProjectToEdit(project);
    // For X profiles, we need to get the service account JSON from storage or API
    // For now, we'll set it to empty and let user paste/upload new one
    setEditForm({
      serviceAccountJson: "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateConfirm = async () => {
    if (!projectToEdit || !editForm.serviceAccountJson) {
      return;
    }

    setUpdating(true);
    try {
      // Get profileName and all projects in this profile
      const profileName = projectToEdit.profileName || projectToEdit.projectId || projectToEdit.orgName || "N/A";
      const profileProjects = projects.filter(proj => {
        const projProfileName = proj.profileName || proj.projectId || proj.orgName || "N/A";
        return projProfileName === profileName;
      });

      if (profileProjects.length === 0) {
        console.error('No projects found for profile:', profileName);
        setUpdating(false);
        return;
      }

      // PUT /apigee/x/profiles
      // Update entire profile with all projects
      const updateUrl = `${PROFILE_CONFIG_BASE}/apigee/x/profiles`;

      // Create FormData for multipart request
      const formData = new FormData();

      // Metadata part (must be JSON string)
      const metadata = {
        companyName: localStorage.getItem('companyName') || "probestack",
        gatewayType: "apigee-x",
        apigeeUrl: DEFAULT_APIGEE_X_URL,
        apigeeEnvCategory: connectionConfig.apigeeEnvCategory || "x",
        profileName: profileName, // Use existing profileName, don't create new one
        organizations: profileProjects.map(proj => ({
          orgName: proj.orgName || proj.projectName || proj.projectId,
          environments: proj.environments || [], // Keep existing environments
        }))
      };

      // Create a Blob for the metadata
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      formData.append('metadata', metadataBlob, 'metadata.json');

      // Config file part (service account JSON) - must be named 'configFile' as per API requirements
      const configBlob = new Blob([editForm.serviceAccountJson], { type: 'application/json' });
      formData.append('configFile', configBlob, 'service-account.json');

      console.log('Updating profile:', profileName);
      console.log('Update URL:', updateUrl);
      console.log('Metadata:', metadata);
      console.log('Service Account JSON file size:', configBlob.size, 'bytes');
      console.log('Projects in profile:', profileProjects.length);

      await axios.put(updateUrl, formData, {
        params: { companyName: localStorage.getItem('companyName') || "probestack" },
        headers: {
          Accept: "application/json",
        },
        timeout: 30000,
      });


      // Refresh the list
      await fetchProjects();

      setEditDialogOpen(false);
      setProjectToEdit(null);
      setEditForm({ serviceAccountJson: "" });
    } catch (err) {
      console.error('Failed to update profile:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        params: err.config?.params,
      });
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update profile';
    } finally {
      setUpdating(false);
    }
  };

  // Check if Google Cloud Storage profiles exist
  const checkGCSProfiles = async () => {
    try {
      const endpointUrl = `${PROFILE_CONFIG_BASE}/cloud-storage/profiles`;
      const queryParams = {
        companyName: localStorage.getItem('companyName') || "probestack"
      };

      const response = await axios.get(endpointUrl, {
        params: queryParams,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      });

      // Check if any profiles exist
      let profilesData = [];
      if (Array.isArray(response.data)) {
        profilesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        profilesData = response.data.data;
      } else if (response.data && Array.isArray(response.data.profiles)) {
        profilesData = response.data.profiles;
      } else if (response.data && typeof response.data === 'object') {
        const keys = Object.keys(response.data);
        for (const key of keys) {
          if (Array.isArray(response.data[key])) {
            profilesData = response.data[key];
            break;
          }
        }
      }

      setGcsProfilesExist(profilesData.length > 0);
      console.log('GCS profiles exist:', profilesData.length > 0, 'Count:', profilesData.length);
    } catch (error) {
      // If 404 or no profiles, set to false
      if (error.response?.status === 404) {
        setGcsProfilesExist(false);
      } else {
        console.error('Error checking GCS profiles:', error);
        // Default to false if error (assume no profiles)
        setGcsProfilesExist(false);
      }
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const userEmail = connectionConfig.userEmail;

      if (!userEmail) {
        console.warn('No user email found');
        setProjects([]);
        setError("User email is required. Please log in again.");
        setLoading(false);
        return;
      }

      console.log('Fetching projects for user:', userEmail);
      console.log('Profile Config Service Base URL:', PROFILE_CONFIG_BASE);

      // Use the profile config service endpoint
      // GET /apigee/x/profiles?companyName=probestack
      const endpointUrl = `${PROFILE_CONFIG_BASE}/apigee/x/profiles`;
      const queryParams = {
        companyName: localStorage.getItem('companyName') || "probestack"
      };

      let discoveryResponse;
      try {
        console.log(`Trying GET ${endpointUrl} with params:`, queryParams);
        discoveryResponse = await axios.get(
          endpointUrl,
          {
            params: queryParams,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 30000,
          }
        );

        console.log(`✅ Success with GET ${endpointUrl}`);
        console.log('Discovery Service API response status:', discoveryResponse.status);
        console.log('Discovery Service API response data (full):', JSON.stringify(discoveryResponse.data, null, 2));
      } catch (endpointErr) {
        console.error(`GET ${endpointUrl} failed:`, endpointErr.response?.status || endpointErr.message);
        throw endpointErr; // Re-throw to be caught by the outer catch
      }

      let projectsData = [];
      if (Array.isArray(discoveryResponse.data)) {
        projectsData = discoveryResponse.data;
      } else if (discoveryResponse.data && Array.isArray(discoveryResponse.data.data)) {
        projectsData = discoveryResponse.data.data;
      } else if (discoveryResponse.data && Array.isArray(discoveryResponse.data.projects)) {
        projectsData = discoveryResponse.data.projects;
      } else if (discoveryResponse.data && Array.isArray(discoveryResponse.data.organizations)) {
        projectsData = discoveryResponse.data.organizations;
      } else if (discoveryResponse.data && typeof discoveryResponse.data === 'object') {
        const keys = Object.keys(discoveryResponse.data);
        for (const key of keys) {
          if (Array.isArray(discoveryResponse.data[key])) {
            projectsData = discoveryResponse.data[key];
            break;
          }
        }
        if (projectsData.length === 0 && discoveryResponse.data) {
          if (discoveryResponse.data.organizations && Array.isArray(discoveryResponse.data.organizations)) {
            projectsData = discoveryResponse.data.organizations;
          } else if (discoveryResponse.data.profiles && Array.isArray(discoveryResponse.data.profiles)) {
            // Keep profiles with their organizations array for proper profile name extraction
            projectsData = discoveryResponse.data.profiles.map(profile => ({
              ...profile,
              organizations: profile.organizations || [],
            }));
          }
        }
      }

      console.log('Extracted projects data:', projectsData);

      if (projectsData && projectsData.length > 0) {
        // Transform discovery service configs to projects format
        // Note: A profile can contain multiple organizations, so we need to expand them
        const projectsFromDiscovery = [];

        projectsData.forEach(config => {
          // Extract profile name from the config (this is the profileName we set when creating)
          const profileName = config.profileName || config.profile_name || config.profileId || null;

          // Log the config structure for debugging
          console.log('Processing config:', {
            profileName,
            hasOrganizations: !!config.organizations,
            organizationsCount: config.organizations?.length || 0,
            configKeys: Object.keys(config),
            firstOrgItem: config.organizations?.[0] ? Object.keys(config.organizations[0]) : null
          });

          // Check if this config has multiple organizations in an array
          if (config.organizations && Array.isArray(config.organizations) && config.organizations.length > 0) {
            // Profile has multiple organizations - create a row for each
            config.organizations.forEach((orgItem, index) => {
              // Use orgName directly from the API response - it contains the correct project ID
              // The API returns orgName: "probestack-e2068" which is what we want to display
              const projectId = orgItem.orgName || orgItem.projectId || orgItem.orgId || orgItem.organization || 'Unknown';

              console.log(`Extracted projectId for org ${index}:`, projectId, 'from orgItem:', orgItem);

              projectsFromDiscovery.push({
                projectId: projectId,
                projectName: projectId,
                orgName: projectId, // For consistency with Edge
                organization: projectId,
                profileName: profileName || (config._profile && (config._profile.profileName || config._profile.profile_name || config._profile.profileId)), // Store profile name for display
                url: config.url || config.apigeeUrl || config.apigeex_mgmt_url || DEFAULT_APIGEE_X_URL,
                environments: orgItem.environments || orgItem.environment || config.environments || (config.environment ? [config.environment] : []) || (config.apigeex_env ? [config.apigeex_env] : []),
              });
            });
          } else {
            // Single organization profile (legacy format or single org)
            // Use orgName directly from the API response - it contains the correct project ID
            const projectId = config.orgName || config.projectId || config.orgId || config.organization || 'Unknown';

            projectsFromDiscovery.push({
              projectId: projectId,
              projectName: projectId,
              orgName: projectId, // For consistency with Edge
              organization: projectId,
              profileName: profileName || (config._profile && (config._profile.profileName || config._profile.profile_name || config._profile.profileId)), // Store profile name for display
              url: config.url || config.apigeeUrl || config.apigeex_mgmt_url || DEFAULT_APIGEE_X_URL,
              environments: config.environments || (config.environment ? [config.environment] : []) || (config.apigeex_env ? [config.apigeex_env] : []),
            });
          }
        });

        console.log('Transformed projects:', projectsFromDiscovery);
        setProjects(projectsFromDiscovery);
        setError(""); // Clear any errors
        setLoading(false);
        return;
      } else {
        console.log('No projects found in response');
        const demoModeEnabled = isDemoMode();
        if (demoModeEnabled) {
          const demoProjects = [
            {
              projectId: "apigee-x-480410",
              projectName: "apigee-x-480410",
              description: "Demo Apigee X Project",
              url: "https://apigee.googleapis.com/v1",
              environments: ["qlab01", "qlab02", "prod"],
            },
            {
              projectId: "demo-x-project",
              projectName: "demo-x-project",
              description: "Demo Apigee X Project",
              url: "https://apigee.googleapis.com/v1",
              environments: ["prod", "test"],
            },
          ];
          setProjects(demoProjects);
          setError(""); // Clear any errors
          setLoading(false);
          return;
        }
        setProjects([]);
        setError("No projects found. Please add a project to get started.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config,
      });

      // Check if demo mode is enabled - if so, use fallback data
      const demoModeEnabled = isDemoMode();
      if (demoModeEnabled) {
        console.log('Demo mode enabled - using fallback data due to API error');
        const demoProjects = [
          {
            projectId: "apigee-x-480410",
            projectName: "apigee-x-480410",
            description: "Demo Apigee X Project",
            url: "https://apigee.googleapis.com/v1",
            environments: ["qlab01", "qlab02", "prod"],
          },
          {
            projectId: "demo-x-project",
            projectName: "demo-x-project",
            description: "Demo Apigee X Project",
            url: "https://apigee.googleapis.com/v1",
            environments: ["prod", "test"],
          },
        ];
        setProjects(demoProjects);
        setError(""); // Clear any errors
        setLoading(false);
        return;
      }

      // Handle specific error cases
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError("Request timed out. Please check your connection and try again.");
        setProjects([]);
        setLoading(false);
        return;
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError("Network error. Please check your connection and verify the API endpoint is accessible.");
        setProjects([]);
        setLoading(false);
        return;
      } else if (err.response?.status === 404) {
        // 404 means no projects are saved yet
        setProjects([]);
        setError("No projects found. Please add a project to get started.");
        setLoading(false);
        return;
      }

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Unable to load projects. Please try again or add a new project.";
      setError(message);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle service account JSON file upload
  const handleServiceAccountFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setAddProjectError('Please upload a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target.result;
        const parsed = JSON.parse(jsonContent);

        setNewProjectForm(prev => ({
          ...prev,
          serviceAccountJson: jsonContent,
          serviceAccountFile: file,
        }));
        setParsedServiceAccount(parsed);
        setAddProjectError("");

        // Extract project_id if available
        if (parsed.project_id) {
          console.log('Extracted project_id from service account:', parsed.project_id);
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        setAddProjectError('Invalid JSON file. Please check the file format.');
      }
    };
    reader.onerror = () => {
      setAddProjectError('Error reading file.');
    };
    reader.readAsText(file);
  };

  // Handle service account JSON text input
  const handleServiceAccountTextChange = (value) => {
    setNewProjectForm(prev => ({
      ...prev,
      serviceAccountJson: value,
    }));

    if (value.trim()) {
      try {
        const parsed = JSON.parse(value);
        setParsedServiceAccount(parsed);
        setAddProjectError("");

        // Extract project_id if available
        if (parsed.project_id) {
          console.log('Extracted project_id from service account:', parsed.project_id);
        }
      } catch (error) {
        // Don't show error while typing, only on submit
        setParsedServiceAccount(null);
      }
    } else {
      setParsedServiceAccount(null);
    }
  };

  // Process service account JSON and call API to get OAuth token
  const handleProcessServiceAccount = async () => {
    if (!newProjectForm.serviceAccountJson) {
      setAddProjectError("Please provide Service Account JSON (upload file or paste text).");
      return;
    }

    try {
      const parsed = JSON.parse(newProjectForm.serviceAccountJson);

      if (!parsed.project_id) {
        setAddProjectError("Service Account JSON must contain 'project_id' field.");
        return;
      }

      setParsedServiceAccount(parsed);
      setAddProjectError("");

      // Note: In a real implementation, you might need to call an API here to exchange
      // the service account for an OAuth token. For now, we'll use it directly in verify connection.

    } catch (error) {
      console.error('Error processing service account:', error);
      setAddProjectError('Invalid JSON format. Please check your Service Account JSON.');
      setParsedServiceAccount(null);
    }
  };

  const handleVerifyConnection = async () => {
    // Validate required fields
    if (!parsedServiceAccount || !parsedServiceAccount.project_id) {
      setAddProjectError("Please process Service Account JSON first. It must contain 'project_id'.");
      return;
    }

    setIsVerifying(true);
    setAddProjectError("");
    setAddProjectSuccess(false);
    setIsVerified(false);
    setShowVerificationSuccess(false);
    setAvailableProjects([]);

    try {
      // Call the profile config service API to fetch projects from Apigee X Management API
      // POST /apigee/x/info (multipart/form-data) (now in Profile Config Service)

      // Create FormData for multipart request
      const formData = new FormData();

      // Metadata part (must be JSON string with ;type=application/json)
      const metadata = {
        userEmail: connectionConfig.userEmail,
        gatewayType: "apigee-x",
        apigeeEdgeUrl: DEFAULT_APIGEE_X_URL,
        apigeeEnvCategory: connectionConfig.apigeeEnvCategory || "x",
        oauthToken: "", // Will be generated from service account if needed
      };

      // Create a Blob for the metadata
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      formData.append('metadata', metadataBlob, 'metadata.json');

      // Config file part (service account JSON)
      const configBlob = new Blob([newProjectForm.serviceAccountJson], { type: 'application/json' });
      formData.append('configFile', configBlob, 'service-account.json');

      console.log('Fetching projects from Apigee X Management API:', `${PROFILE_CONFIG_BASE}/apigee/x/info`);
      console.log('Metadata:', metadata);
      console.log('Service Account project_id:', parsedServiceAccount.project_id);

      const infoResponse = await axios.post(
        `${PROFILE_CONFIG_BASE}/apigee/x/info`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log('Projects API response:', infoResponse.data);

      // Extract projects from response
      const projectsList = infoResponse.data?.organizations || [];

      if (projectsList && projectsList.length > 0) {
        setAvailableProjects(projectsList);
        setIsVerified(true);
        setShowVerificationSuccess(true);
      } else {
        throw new Error('No projects found. Please verify your Service Account JSON and permissions.');
      }
    } catch (error) {
      console.error('Verification failed:', error);

      // Check if demo mode is enabled - if so, use fallback data
      const demoModeEnabled = isDemoMode();
      if (demoModeEnabled) {
        console.log('Demo mode enabled - using fallback projects due to API error');
        const demoProjects = [
          {
            orgId: "apigee-x-480410",
            orgName: "apigee-x-480410",
            projectId: "apigee-x-480410",
            description: "Primary Apigee X project",
            environments: ["qlab01", "qlab02", "prod"],
          },
          {
            orgId: "demo-x-project",
            orgName: "demo-x-project",
            projectId: "demo-x-project",
            description: "Demo Apigee X project",
            environments: ["prod", "test"],
          },
        ];
        setAvailableProjects(demoProjects);
        setIsVerified(true);
        setShowVerificationSuccess(true);
        setIsVerifying(false);
        return;
      }

      setIsVerified(false);
      setShowVerificationSuccess(false);
      setAvailableProjects([]);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.response?.statusText ||
        error.message ||
        'Failed to verify connection and fetch projects';
      setAddProjectError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddProject = async () => {
    if (availableProjects.length === 0) {
      setAddProjectError("No projects available. Please verify connection first.");
      return;
    }

    if (!parsedServiceAccount || !parsedServiceAccount.project_id) {
      setAddProjectError("Service Account JSON is required.");
      return;
    }

    setAddingProject(true);
    setAddProjectError("");
    setAddProjectSuccess(false);

    try {
      // Build profile name: {company}-x-{label} (without org-id)
      // profileNamePrefix is defined at component level
      const profileName = profileLabel.trim()
        ? `${profileNamePrefix}-${profileLabel.trim()}`
        : profileNamePrefix;

      // Create FormData for multipart request
      const formData = new FormData();

      // Metadata part (must be JSON string)
      const metadata = {
        companyName: localStorage.getItem('companyName') || "probestack",
        gatewayType: "apigee-x",
        apigeeUrl: DEFAULT_APIGEE_X_URL,
        apigeeEnvCategory: connectionConfig.apigeeEnvCategory || "x",
        profileName: profileName,
        organizations: availableProjects.map(proj => {
          // Extract project ID - prioritize projectId and orgName over orgId (which might be a UUID)
          // This matches what we display in the verify details: proj.orgName || proj.projectId || projId
          const projectId = proj.projectId || proj.orgName || proj.orgId;
          return {
            orgName: projectId,
            environments: proj.environments || [],
          };
        })
      };

      // Create a Blob for the metadata
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      formData.append('metadata', metadataBlob, 'metadata.json');

      // Config file part (service account JSON) - must be named 'configFile' as per API requirements
      const configBlob = new Blob([newProjectForm.serviceAccountJson], { type: 'application/json' });
      formData.append('configFile', configBlob, 'service-account.json');

      console.log('Saving to profile config service:', `${PROFILE_CONFIG_BASE}/apigee/x/profiles`);
      console.log('Metadata:', metadata);
      console.log('Service Account JSON file size:', configBlob.size, 'bytes');

      let saveSuccess = false;
      try {
        const discoveryResponse = await axios.post(
          `${PROFILE_CONFIG_BASE}/apigee/x/profiles`,
          formData,
          {
            headers: {
              Accept: "application/json",
            },
            params: {
              companyName: localStorage.getItem('companyName') || "probestack"
            },
            timeout: 30000,
          }
        );

        console.log('Discovery service save response:', discoveryResponse.data);
        saveSuccess = true;
      } catch (discoveryErr) {
        console.error('Discovery service save error:', {
          status: discoveryErr.response?.status,
          statusText: discoveryErr.response?.statusText,
          data: discoveryErr.response?.data,
          message: discoveryErr.message
        });

        // Re-throw the error to be handled by outer catch
        throw discoveryErr;
      }

      // Track if GCS creation failed
      let gcsErrorOccurred = false;
      let gcsErrorMessage = '';

      // If also adding to GCS and no GCS profiles exist, call GCS API
      if (saveSuccess && alsoAddToGCS && !gcsProfilesExist) {
        try {
          console.log('Also adding profile to Google Cloud Storage...');

          // Validate service account JSON is valid
          let serviceAccountJsonString = newProjectForm.serviceAccountJson;
          try {
            // Try to parse and re-stringify to ensure it's valid JSON
            const parsed = JSON.parse(serviceAccountJsonString);
            serviceAccountJsonString = JSON.stringify(parsed);
            console.log('Service Account JSON is valid, project_id:', parsed.project_id);
          } catch (jsonErr) {
            console.error('Invalid service account JSON:', jsonErr);
            throw new Error('Service Account JSON is not valid JSON');
          }

          // Create FormData for GCS (must match StorageConfig structure exactly)
          const gcsFormData = new FormData();

          // Get userEmail from localStorage (required by API)
          const userEmail = localStorage.getItem("userEmail") || connectionConfig.userEmail || "admin@example.com";

          // Metadata for GCS - must match Swagger API requirements:
          // - cloudStorage: "gcs" (required)
          // - profileName: string (required)
          // - userEmail: string (required)
          // - companyName: string (required)
          const gcsMetadata = {
            cloudStorage: "gcs",
            companyName: localStorage.getItem('companyName') || "probestack",
            profileName: "probestack-migration", // GCS uses fixed name
            userEmail: userEmail
          };

          console.log('GCS Metadata structure:', {
            companyName: gcsMetadata.companyName,
            gatewayType: gcsMetadata.gatewayType,
            profileName: gcsMetadata.profileName,
            organizationCount: gcsMetadata.organizations.length,
            firstOrg: gcsMetadata.organizations[0]
          });

          const gcsMetadataBlob = new Blob([JSON.stringify(gcsMetadata)], { type: 'application/json' });
          gcsFormData.append('metadata', gcsMetadataBlob, 'metadata.json');

          const gcsConfigBlob = new Blob([serviceAccountJsonString], { type: 'application/json' });
          gcsFormData.append('configFile', gcsConfigBlob, 'service-account.json');

          console.log('GCS API Request Details:');
          console.log('URL:', `${PROFILE_CONFIG_BASE}/cloud-storage/profiles`);
          console.log('Method: POST');
          console.log('Params:', { companyName: localStorage.getItem('companyName') || "probestack" });
          console.log('Metadata:', JSON.stringify(gcsMetadata, null, 2));
          console.log('FormData has metadata:', gcsFormData.has('metadata'));
          console.log('FormData has configFile:', gcsFormData.has('configFile'));
          console.log('FormData entries after append:', Array.from(gcsFormData.entries()).map(([key, value]) => [key, value instanceof Blob ? `Blob(${value.size} bytes, ${value.type})` : value]));

          const gcsResponse = await axios.post(
            `${PROFILE_CONFIG_BASE}/cloud-storage/profiles`,
            gcsFormData,
            {
              headers: {
                Accept: "application/json",
                // Don't set Content-Type - let axios set it with boundary for multipart/form-data
              },
              params: {
                companyName: localStorage.getItem('companyName') || "probestack"
              },
              timeout: 30000,
            }
          );

          console.log('GCS profile created successfully:', gcsResponse.data);
        } catch (gcsErr) {
          console.error('Failed to add profile to Google Cloud Storage:', gcsErr);
          console.error('GCS Error Response (full):', JSON.stringify(gcsErr.response?.data, null, 2));
          console.error('GCS Error Status:', gcsErr.response?.status);
          console.error('GCS Error Status Text:', gcsErr.response?.statusText);
          console.error('GCS Error Headers:', gcsErr.response?.headers);
          console.error('GCS Request Config:', {
            url: gcsErr.config?.url,
            method: gcsErr.config?.method,
            params: gcsErr.config?.params,
            headers: gcsErr.config?.headers
          });
          // Log the actual request data if available
          if (gcsErr.config?.data instanceof FormData) {
            console.error('GCS Request FormData entries:', Array.from(gcsErr.config.data.entries()).map(([key, value]) => [
              key,
              value instanceof Blob ? `Blob(${value.size} bytes, type: ${value.type})` : String(value).substring(0, 100)
            ]));
          }

          gcsErrorOccurred = true;

          // Extract error message from GCS API response
          if (gcsErr.response?.data) {
            gcsErrorMessage = gcsErr.response.data.message
              || gcsErr.response.data.error
              || gcsErr.response.data.detail
              || gcsErr.response.data.msg
              || (typeof gcsErr.response.data === 'string' ? gcsErr.response.data : '');

            // If we have a full error object, include more details
            if (gcsErr.response.data.status && gcsErr.response.data.error) {
              gcsErrorMessage = `${gcsErr.response.data.error} (Status: ${gcsErr.response.data.status})`;
              if (gcsErr.response.data.message) {
                gcsErrorMessage += `: ${gcsErr.response.data.message}`;
              }
            }
          }

          if (!gcsErrorMessage) {
            gcsErrorMessage = gcsErr.response?.statusText
              || gcsErr.message
              || 'Failed to add profile to Google Cloud Storage';
          }
        }
      }

      // If save was successful, show success
      if (saveSuccess) {
        // If GCS error occurred, show error message but don't navigate away
        if (gcsErrorOccurred) {
          setAddProjectError(
            `Apigee X profile created successfully, but failed to add to Google Cloud Storage:\n\n${gcsErrorMessage}`
          );
          // Don't reset form or navigate - let user see the error
        } else {
          setAddProjectSuccess(true);

          // Reset form and verification state
          setNewProjectForm({
            serviceAccountJson: "",
            serviceAccountFile: null,
          });
          setIsVerified(false);
          setAvailableProjects([]);
          setParsedServiceAccount(null);
          setProfileLabel("");
          setAlsoAddToGCS(false);

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          // Refresh projects before navigating
          await fetchProjects();

          // Navigate back to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard/configs/apigee-x');
          }, 1500);
        }
      } else {
        throw new Error('Failed to save project to discovery service');
      }
    } catch (err) {
      console.error("Failed to add project:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
      });

      // Handle 409 Conflict - Profile already exists
      if (err.response?.status === 409) {
        setAddProjectError(
          "A profile with these credentials already exists. The projects may already be saved. Please check the Dashboard."
        );
      } else {
        // Other errors
        let message = "Unable to add project. ";

        if (err.code === "ECONNABORTED") {
          message += "Request timed out. Please check your network connection and try again.";
        } else if (err.code === "ERR_NETWORK" || !err.response) {
          message += `Network error: ${err.message || "Unable to reach the server"}. Please check your internet connection and verify the API endpoint is accessible.`;
        } else if (err.response) {
          message += err.response.data?.message ||
            err.response.data?.error ||
            `Server error (${err.response.status}): ${err.response.statusText}`;
        } else {
          message += err.message || "Unknown error occurred.";
        }

        setAddProjectError(message);
      }
    } finally {
      setAddingProject(false);
    }
  };

  const totalEnvironments = useMemo(
    () =>
      projects.reduce(
        (sum, proj) => sum + (proj.environments?.length || 0),
        0
      ),
    [projects]
  );

  const renderDashboardView = () => (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={() => navigate('/config/apigee-x/add')}
              className={cn(
                                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                                'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                'flex items-center gap-2 active:scale-[0.98]'
                            )}
            >
              <Plus className="w-4 h-4" />
              Add Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && projects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <p className="text-sm text-muted-foreground">
                Loading projects for the current user...
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No records found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Profile ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Project ID(s)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Environments</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group projects by profileName
                    const groupedByProfile = projects.reduce((acc, proj) => {
                      const profileName = proj.profileName || proj.projectId || proj.orgName || "N/A";
                      if (!acc[profileName]) {
                        acc[profileName] = [];
                      }
                      acc[profileName].push(proj);
                      return acc;
                    }, {});

                    // Render rows - one per project, but merge Profile ID and Actions columns
                    const rows = [];
                    Object.entries(groupedByProfile).forEach(([profileName, projs], profileIndex) => {
                      projs.forEach((proj, projIndex) => {
                        rows.push({
                          profileName,
                          proj,
                          isFirstInGroup: projIndex === 0,
                          rowspan: projIndex === 0 ? projs.length : 0, // rowspan for first row only
                        });
                      });
                    });

                    return rows.map((row, index) => (
                      <tr
                        key={`${row.profileName}-${row.proj.projectId || index}`}
                        className="border-b border-border hover:bg-background-elevated/50 transition-colors"
                      >
                        {row.isFirstInGroup && (
                          <td
                            rowSpan={row.rowspan}
                            className="py-3 px-4 text-sm text-foreground border-r border-border"
                          >
                            <div className="font-medium">{row.profileName}</div>
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm text-foreground">
                          <div className="font-medium">{row.proj.orgName || row.proj.projectName || row.proj.projectId || "N/A"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(row.proj.environments || []).map((env, envIndex) => (
                              <Badge
                                key={`${row.proj.projectId || index}-env-${envIndex}-${env}`}
                                variant="outline"
                                className="bg-background-elevated text-foreground border-border text-xs"
                              >
                                {env}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        {row.isFirstInGroup && (
                          <td
                            rowSpan={row.rowspan}
                            className="py-3 px-4 border-l border-border"
                          >
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewClick(row.proj)}
                                className="h-8 w-8 p-0"
                                title="View project"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(row.proj)}
                                className="h-8 w-8 p-0"
                                title="Edit project"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(row.proj)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAddProjectView = () => (
    <div className="space-y-6">
      <Card className="border-border">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-4">
            {/* Service Account JSON File Upload */}
            <div>
              <Label htmlFor="service-account-file" className="text-foreground font-medium text-sm">
                Service Account JSON File *
              </Label>
              <div className="mt-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="service-account-file"
                  accept=".json,application/json"
                  onChange={handleServiceAccountFileUpload}
                  className="hidden"
                  disabled={addingProject || isVerifying || isVerified}
                />
                <label
                  htmlFor="service-account-file"
                  className={`inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer transition ${addingProject || isVerifying || isVerified
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-background-elevated'
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload JSON File</span>
                </label>
                {newProjectForm.serviceAccountFile && (
                  <span className="ml-3 text-sm text-muted-foreground">
                    {newProjectForm.serviceAccountFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Service Account JSON Text Input */}
            <div>
              <Label htmlFor="service-account-json" className="text-foreground font-medium text-sm">
                Or Paste Service Account JSON *
              </Label>
              <Textarea
                id="service-account-json"
                placeholder='Paste your Service Account JSON here (e.g., {"type": "service_account", "project_id": "...", ...})'
                value={newProjectForm.serviceAccountJson}
                onChange={(e) => handleServiceAccountTextChange(e.target.value)}
                className="mt-1.5 min-h-[200px] font-mono text-xs"
                rows={10}
                disabled={addingProject || isVerifying || isVerified}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste your Google Cloud Service Account JSON. It must contain a "project_id" field.
              </p>
              {parsedServiceAccount && parsedServiceAccount.project_id && (
                <p className="text-xs text-emerald-400 mt-1">
                  ✓ Project ID detected: {parsedServiceAccount.project_id}
                </p>
              )}
            </div>

            {/* Process JSON Button */}
            {newProjectForm.serviceAccountJson && !parsedServiceAccount && (
              <Button
                type="button"
                variant="outline"
                onClick={handleProcessServiceAccount}
                disabled={addingProject || isVerifying}
                className="w-full"
              >
                Process JSON
              </Button>
            )}
          </div>

          {addProjectError && (
            <Alert variant="destructive" className="border-2 border-destructive/50 bg-destructive/10 animate-pulse">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-semibold text-destructive whitespace-pre-wrap">
                {addProjectError}
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Status */}
          {isVerifying && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Verifying connection and fetching projects...</span>
            </div>
          )}

          {/* Projects Table - shown after verification (read-only for information) */}
          {isVerified && availableProjects.length > 0 && (
            <div className="mt-4">
              {/* Verification Success Message - shown before Verify Details */}
              {showVerificationSuccess && (
                <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 mb-4">
                  <AlertDescription>
                    <div className="flex items-center gap-2">
                      <span>✓</span>
                      <span>Connection verified successfully! You can now save the profile.</span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <Label className="text-foreground font-medium text-sm mb-3 block">
                Verify Details *
              </Label>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full border-collapse">
                  <thead className="bg-background-elevated">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground border-b border-border">Project ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground border-b border-border">Environments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableProjects.map((proj) => {
                      const projId = proj.orgId || proj.orgName || proj.projectId;
                      return (
                        <tr
                          key={projId}
                          className="border-b border-border hover:bg-background-elevated/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-foreground font-medium">
                            {proj.orgName || proj.projectId || projId}
                            {proj.description && (
                              <div className="text-xs text-muted-foreground mt-1">{proj.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(proj.environments || []).map((env) => (
                                <Badge
                                  key={env}
                                  variant="outline"
                                  className="bg-background-card text-foreground border-border text-xs"
                                >
                                  {env}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                All {availableProjects.length} organization(s) will be saved when you click "Add Profile"
              </p>
            </div>
          )}

          {/* Profile Name - shown after verification */}
          {isVerified && availableProjects.length > 0 && (
            <div className="mt-4">
              <Label htmlFor="profile-label" className="text-foreground font-medium text-sm">
                Profile Name
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm text-muted-foreground bg-muted px-3 py-2 border border-border rounded-md">
                  {profileNamePrefix}-
                </span>
                <Input
                  id="profile-label"
                  type="text"
                  placeholder="Enter optional label (e.g., production, staging)"
                  value={profileLabel}
                  onChange={(e) => setProfileLabel(e.target.value)}
                  className="flex-1"
                  disabled={addingProject}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Profile name will be: <span className="font-mono text-foreground">{profileNamePrefix}{profileLabel.trim() ? `-${profileLabel.trim()}` : ''}</span>
              </p>
            </div>
          )}

          {/* Checkbox to also add to Google Cloud Storage - only show if no GCS profiles exist */}
          {isVerified && availableProjects.length > 0 && !gcsProfilesExist && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="also-add-to-gcs"
                  checked={alsoAddToGCS}
                  onChange={(e) => setAlsoAddToGCS(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-white/30 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer"
                  disabled={addingProject}
                />
                <div className="flex-1">
                  <Label htmlFor="also-add-to-gcs" className="text-foreground font-medium text-sm cursor-pointer">
                    Also add this profile to Google Cloud Storage
                  </Label>
                  <p className="mt-1 text-xs text-foreground/70">
                    This will create the same profile in Google Cloud Storage configuration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {addProjectSuccess && (
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <AlertDescription>
                Project added successfully! It will now appear in the Dashboard.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            {!isVerified ? (
              <Button
                type="button"
                onClick={handleVerifyConnection}
                disabled={isVerifying || !parsedServiceAccount || !parsedServiceAccount.project_id}
                className={cn(
                                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                                'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25',
                                'flex items-center gap-2 active:scale-[0.98]'
                            )}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 w-4 h-4" />
                    Verify Connection
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="gradient"
                onClick={handleAddProject}
                disabled={addingProject || availableProjects.length === 0 || !parsedServiceAccount}
              >
                {addingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {addingProject ? "Adding Profile..." : "Add Profile"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewProjectForm({
                  serviceAccountJson: "",
                  serviceAccountFile: null,
                });
                setAddProjectError("");
                setAddProjectSuccess(false);
                setIsVerified(false);
                setAvailableProjects([]);
                setParsedServiceAccount(null);
                setProfileLabel("");
                setAlsoAddToGCS(false);
                // Reset file input to allow re-uploading the same file
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={addingProject || isVerifying}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-border overflow-hidden">
          <div className="p-6 bg-background-card">
            {!isAddProjectPage && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-heading font-bold mb-1">
                    Apigee X Configuration
                  </h1>
                </div>
                {renderDashboardView()}
              </>
            )}
            {isAddProjectPage && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-heading font-bold mb-1">
                        Add New Profile
                      </h1>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/config/apigee-x')}
                    >
                      Back
                    </Button>
                  </div>
                </div>
                {renderAddProjectView()}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* View Project Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
            <DialogDescription>
              View all details for the selected project profile.
            </DialogDescription>
          </DialogHeader>
          {projectToView && (() => {
            // Get all projects with the same profileName
            const profileName = projectToView.profileName || projectToView.projectId || projectToView.orgName || "N/A";
            const profileProjects = projects.filter(proj => {
              const projProfileName = proj.profileName || proj.projectId || proj.orgName || "N/A";
              return projProfileName === profileName;
            });

            return (
              <div className="py-4">
                <div className="mb-6">
                  <Label className="text-foreground font-medium text-sm">
                    Profile ID
                  </Label>
                  <div className="mt-1.5 text-sm text-foreground bg-muted p-2 rounded border border-border">
                    {profileName}
                  </div>
                </div>

                <div>
                  <Label className="text-foreground font-medium text-sm mb-3 block">
                    Organizations and Environments
                  </Label>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-background-elevated border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Project ID</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Environments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileProjects.length > 0 ? (
                          profileProjects.map((proj, index) => (
                            <tr
                              key={proj.projectId || proj.orgName || index}
                              className="border-b border-border hover:bg-background-elevated/50 transition-colors last:border-b-0"
                            >
                              <td className="py-3 px-4 text-sm text-foreground">
                                <div className="font-medium">{proj.orgName || proj.projectName || proj.projectId || "N/A"}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {proj.environments && proj.environments.length > 0 ? (
                                    proj.environments.map((env, envIdx) => (
                                      <Badge
                                        key={`${proj.projectId || proj.orgName || index}-env-${envIdx}-${env}`}
                                        variant="outline"
                                        className="bg-background-elevated text-foreground border-border text-xs"
                                      >
                                        {env}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No environments</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="py-3 px-4 text-sm text-muted-foreground text-center">
                              No projects found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewDialogOpen(false);
                setProjectToView(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Profile
            </DialogTitle>
            <DialogDescription>
              {projectToDelete && (() => {
                const profileName = projectToDelete.profileName || projectToDelete.projectId || projectToDelete.orgName || "N/A";
                const profileProjects = projects.filter(proj => {
                  const projProfileName = proj.profileName || proj.projectId || proj.orgName || "N/A";
                  return projProfileName === profileName;
                });

                return (
                  <div className="space-y-3">
                    <p>
                      Are you sure you want to delete the profile <strong>"{profileName}"</strong>?
                      This will delete all {profileProjects.length} project(s) in this profile.
                    </p>
                    {profileProjects.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Project IDs that will be deleted:</p>
                        <div className="flex flex-wrap gap-2">
                          {profileProjects.map((proj, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {proj.orgName || proj.projectName || proj.projectId || "N/A"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-destructive font-medium">
                      This action cannot be undone.
                    </p>
                  </div>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProjectToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Profile"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Update Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update the profile details. This will update all projects in the profile. Only Service Account JSON can be edited.
            </DialogDescription>
          </DialogHeader>
          {projectToEdit && (() => {
            // Get all projects with the same profileName
            const profileName = projectToEdit.profileName || projectToEdit.projectId || projectToEdit.orgName || "N/A";
            const profileProjects = projects.filter(proj => {
              const projProfileName = proj.profileName || proj.projectId || proj.orgName || "N/A";
              return projProfileName === profileName;
            });

            return (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-profile-id" className="text-foreground font-medium text-sm">
                    Profile ID
                  </Label>
                  <Input
                    id="edit-profile-id"
                    value={profileName}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                </div>
                <div>
                  <Label className="text-foreground font-medium text-sm mb-2 block">
                    Project IDs in this Profile ({profileProjects.length})
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {profileProjects.map((proj, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {proj.orgName || proj.projectName || proj.projectId || "N/A"}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-service-account-json" className="text-foreground font-medium text-sm">
                    Service Account JSON *
                  </Label>
                  <Textarea
                    id="edit-service-account-json"
                    placeholder="Paste your Service Account JSON here or upload a file"
                    value={editForm.serviceAccountJson}
                    onChange={(e) =>
                      setEditForm({ ...editForm, serviceAccountJson: e.target.value })
                    }
                    className="mt-1.5 font-mono text-xs min-h-[200px]"
                    disabled={updating}
                  />
                  <div className="mt-2">
                    <input
                      type="file"
                      id="edit-service-account-file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setEditForm({ ...editForm, serviceAccountJson: event.target.result });
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                      disabled={updating}
                    />
                    <label
                      htmlFor="edit-service-account-file"
                      className={`inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer transition ${updating
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-background-elevated'
                        }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Upload JSON File</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setProjectToEdit(null);
                setEditForm({ serviceAccountJson: "" });
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConfirm}
              disabled={updating || !editForm.serviceAccountJson}
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
