import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
import { Loader2, Server, Pencil, Trash2, Search, Plus, Eye, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
// import { PROFILE_CONFIG_BASE } from "../features/migration/urls";

const DEFAULT_ADMIN_URL = "https://us.api.konghq.com";
const DEFAULT_REGION = "us";
const PROFILE_CONFIG_BASE = "https://example.com";

export const KongKonnectConfig = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active view based on route
  const isAddProfilePage = location.pathname.includes('/add');
  const configBasePath = '/config/kong';
  const configTitle = 'Kong Konnect Configuration';
  const configShortName = 'Kong Konnect';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState([]);

  // Form state for adding new profile
  const [newProfileForm, setNewProfileForm] = useState({
    adminUrl: DEFAULT_ADMIN_URL,
    personalAccessToken: "",
  });
  const [addingProfile, setAddingProfile] = useState(false);
  const [addProfileError, setAddProfileError] = useState("");
  const [addProfileSuccess, setAddProfileSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [availableControlPlanes, setAvailableControlPlanes] = useState([]);
  const [profileLabel, setProfileLabel] = useState("");
  const [defaultRegion, setDefaultRegion] = useState(null);
  const [defaultControlPlane, setDefaultControlPlane] = useState(null);
  const justSavedRef = useRef(false);
  const [errorFormState, setErrorFormState] = useState(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View modal state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [profileToView, setProfileToView] = useState(null);

  // Edit/Update modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    adminUrl: "",
    personalAccessToken: "",
  });
  const [editDefaultRegion, setEditDefaultRegion] = useState(null);
  const [editDefaultControlPlane, setEditDefaultControlPlane] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Dynamic profile name prefix based on company name
  const profileNamePrefix = useMemo(() => {
    const company = (localStorage.getItem('companyName') || "probestack").toLowerCase();
    return `${company}-kong-konnect`;
  }, []);

  // Auto-load profiles on mount and when pathname changes
  useEffect(() => {
    if (!loading) {
      if (justSavedRef.current) {
        console.log('useEffect triggered but skipping fetch (just saved)');
        justSavedRef.current = false;
      } else {
        console.log('useEffect triggered - fetching profiles');
        fetchProfiles();
      }
    }
  }, [location.pathname]);

  // Auto-hide verification success message after 4 seconds
  useEffect(() => {
    if (showVerificationSuccess) {
      const timer = setTimeout(() => {
        setShowVerificationSuccess(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showVerificationSuccess]);

  const fetchProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      const companyName = localStorage.getItem('companyName') || "probestack";
      const endpointUrl = `${PROFILE_CONFIG_BASE}/kong-konnect/profiles`;
      
      const response = await axios.get(endpointUrl, {
        params: { companyName },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      
      // API returns array of profiles
      const profilesData = Array.isArray(response.data) ? response.data : [];
      setProfiles(profilesData);
      setError("");
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
      // If 404 or no profiles, just set empty array
      if (err.response?.status === 404) {
        setProfiles([]);
        setError("");
      } else {
        setError("Failed to load profiles. Please try again.");
        setProfiles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = (profile) => {
    setProfileToView(profile);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (profile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;

    setDeleting(true);
    try {
      const companyName = localStorage.getItem('companyName') || "probestack";
      const userEmail = localStorage.getItem('userEmail') || "";
      const profileId = profileToDelete.id;

      if (!profileId) {
        console.error('Profile ID not found for deletion');
        setDeleting(false);
        return;
      }

      const endpointUrl = `${PROFILE_CONFIG_BASE}/kong-konnect/profiles/${profileId}`;
      
      console.log('Deleting Kong Konnect profile:', endpointUrl);
      console.log('Params:', { companyName, userEmail });

      await axios.delete(endpointUrl, {
        params: {
          companyName: companyName,
          userEmail: userEmail,
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log('Profile deleted successfully');

      await fetchProfiles();
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
    } catch (err) {
      console.error('Failed to delete profile:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete profile.';
      console.error('Delete error:', errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (profile) => {
    setProfileToEdit(profile);
    setEditForm({
      adminUrl: profile.adminUrl || DEFAULT_ADMIN_URL,
      personalAccessToken: profile.personalAccessToken || "",
    });
    setEditDefaultRegion(profile.defaultRegion || null);
    setEditDefaultControlPlane(profile.defaultControlPlane || null);
    setEditDialogOpen(true);
  };

  const handleUpdateConfirm = async () => {
    if (!profileToEdit) return;

    setUpdating(true);
    try {
      // Simulated update - replace with actual API call
      const storedProfiles = localStorage.getItem('kong_konnect_profiles');
      if (storedProfiles) {
        const parsedProfiles = JSON.parse(storedProfiles);
        const updatedProfiles = parsedProfiles.map(p => {
          if (p.profileName === profileToEdit.profileName) {
            return {
              ...p,
              adminUrl: editForm.adminUrl,
              personalAccessToken: editForm.personalAccessToken,
              defaultRegion: "US (North America)",
              defaultControlPlane: editDefaultControlPlane,
            };
          }
          return p;
        });
        localStorage.setItem('kong_konnect_profiles', JSON.stringify(updatedProfiles));
      }

      await fetchProfiles();
      setEditDialogOpen(false);
      setProfileToEdit(null);
      setEditForm({ adminUrl: "", personalAccessToken: "" });
      setEditDefaultRegion(null);
      setEditDefaultControlPlane(null);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyConnection = async () => {
    if (!newProfileForm.adminUrl || !newProfileForm.personalAccessToken) {
      setAddProfileError("Admin URL and Personal Access Token are required to verify connection.");
      return;
    }

    setIsVerifying(true);
    setAddProfileError("");
    setAddProfileSuccess(false);
    setIsVerified(false);
    setShowVerificationSuccess(false);
    setAvailableControlPlanes([]);

    try {
      const companyName = localStorage.getItem('companyName') || "probestack";
      const endpointUrl = `${PROFILE_CONFIG_BASE}/kong-konnect/profiles/verify`;
      
      const payload = {
        companyName: companyName,
        adminUrl: newProfileForm.adminUrl,
        konnectPat: newProfileForm.personalAccessToken,
        region: DEFAULT_REGION,
      };

      console.log('Verifying Kong Konnect connection:', endpointUrl);
      console.log('Payload:', { ...payload, konnectPat: '***hidden***' });

      const response = await axios.post(endpointUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log('Verify response:', response.data);

      // Map response controlPlanes to UI format
      const controlPlanes = (response.data.controlPlanes || []).map(cp => ({
        id: cp.id,
        name: cp.name,
        region: "US (North America)",
      }));

      setAvailableControlPlanes(controlPlanes);
      setIsVerified(true);
      setShowVerificationSuccess(true);
    } catch (error) {
      console.error('Verification failed:', error);
      setIsVerified(false);
      setShowVerificationSuccess(false);
      setAvailableControlPlanes([]);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to verify connection. Please check your credentials.';
      setAddProfileError(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddProfile = async () => {
    if (availableControlPlanes.length === 0) {
      setAddProfileError("No control planes available. Please verify connection first.");
      return;
    }

    if (!newProfileForm.adminUrl || !newProfileForm.personalAccessToken) {
      setAddProfileError("Admin URL and Personal Access Token are required.");
      return;
    }


    setAddingProfile(true);
    setAddProfileError("");
    setAddProfileSuccess(false);

    const profileName = profileLabel.trim()
      ? `${profileNamePrefix}-${profileLabel.trim()}`
      : profileNamePrefix;

    try {
      const companyName = localStorage.getItem('companyName') || "probestack";
      const userEmail = localStorage.getItem('userEmail') || "";
      const endpointUrl = `${PROFILE_CONFIG_BASE}/kong-konnect/profiles`;
      
      const payload = {
        profileName: profileName,
        companyName: companyName,
        adminUrl: newProfileForm.adminUrl,
        konnectPat: newProfileForm.personalAccessToken,
        region: DEFAULT_REGION,
        userEmail: userEmail,
      };

      console.log('Adding Kong Konnect profile:', endpointUrl);
      console.log('Payload:', { ...payload, konnectPat: '***hidden***' });

      const response = await axios.post(endpointUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log('Add profile response:', response.data);

      setAddProfileSuccess(true);

      // Reset form
      setNewProfileForm({
        adminUrl: DEFAULT_ADMIN_URL,
        personalAccessToken: "",
      });
      setIsVerified(false);
      setShowVerificationSuccess(false);
      setAvailableControlPlanes([]);
      setProfileLabel("");
      setDefaultRegion(null);
      setDefaultControlPlane(null);

      justSavedRef.current = true;
      await fetchProfiles();

      setTimeout(() => {
        navigate(configBasePath);
      }, 1500);
    } catch (err) {
      console.error("Failed to add profile:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to add profile. Please try again.";
      setAddProfileError(errorMsg);
      setErrorFormState({
        personalAccessToken: newProfileForm.personalAccessToken,
        profileLabel: profileLabel,
      });
    } finally {
      setAddingProfile(false);
    }
  };

  const renderDashboardView = () => (
    <div className="space-y-6">
      {location.state?.message && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-foreground">
            {location.state.message}
          </AlertDescription>
        </Alert>
      )}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={() => navigate(`${configBasePath}/add`)}
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
          {loading && profiles.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <p className="text-sm text-muted-foreground">
                Loading profiles...
              </p>
            </div>
          ) : profiles.length === 0 ? (
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
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Region</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Control Planes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile, index) => (
                    <tr
                      key={profile.profileName || index}
                      className="border-b border-border hover:bg-background-elevated/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-foreground font-medium">
                        {profile.profileName}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        <span>US (North America)</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {(profile.controlPlanes || []).map((cp, cpIndex) => {
                            // Handle both API response format (controlPlaneId/controlPlaneName) and local format (id/name)
                            const cpId = cp.controlPlaneId || cp.id;
                            const cpName = cp.controlPlaneName || cp.name;
                            const isDefault = profile.defaultControlPlane === cpId;
                            return (
                              <div key={cpIndex} className="flex items-center gap-2 text-xs">
                                <Badge
                                  variant="outline"
                                  className={`${isDefault
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/30 font-semibold"
                                    : "bg-background-elevated text-foreground border-border"
                                    }`}
                                >
                                  <span className="font-medium">{cpName}</span>
                                  {isDefault && <span className="ml-1">⭐</span>}
                                </Badge>
                                <span className="text-muted-foreground">ID: {cpId}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClick(profile)}
                            className="h-8 w-8 p-0"
                            title="View profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(profile)}
                            className="h-8 w-8 p-0"
                            title="Edit profile"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(profile)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAddProfileView = () => (
    <div className="space-y-6">
      <Card className="border-border">
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Admin URL */}
            <div>
              <Label htmlFor="admin-url" className="text-foreground font-medium text-sm block mb-1.5">
                Admin URL *
              </Label>
              <Input
                id="admin-url"
                placeholder="https://us.api.konghq.com"
                value={newProfileForm.adminUrl}
                onChange={(e) =>
                  setNewProfileForm({ ...newProfileForm, adminUrl: e.target.value })
                }
                className="mt-1.5"
                disabled={addingProfile || isVerifying || isVerified}
              />
            </div>

            {/* Personal Access Token */}
            <div>
              <Label htmlFor="personal-access-token" className="text-foreground font-medium text-sm">
                Konnect Personal Access Token (PAT) *
              </Label>
              <Input
                id="personal-access-token"
                type="password"
                placeholder="Enter your Personal Access Token"
                value={newProfileForm.personalAccessToken}
                onChange={(e) => {
                  setNewProfileForm({ ...newProfileForm, personalAccessToken: e.target.value });
                  if (addProfileError) {
                    setAddProfileError("");
                    setErrorFormState(null);
                  }
                }}
                className="mt-1.5"
                disabled={addingProfile || isVerifying || isVerified}
              />
            </div>
          </div>

          {/* Control Planes Table - shown after verification */}
          {isVerified && availableControlPlanes.length > 0 && (
            <div className="mt-4">
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
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground border-b border-border">Region</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground border-b border-border">Control Plane</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableControlPlanes.map((cp) => {
                      return (
                        <tr
                          key={cp.id}
                          className="border-b border-border"
                        >
                          <td className="py-3 px-4 text-sm text-foreground font-medium">
                            {cp.region}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-sm font-medium text-foreground">{cp.name}</div>
                                <div className="text-xs text-muted-foreground">ID: {cp.id}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                All {availableControlPlanes.length} control plane(s) will be saved when you click "Add Profile"
              </p>
            </div>
          )}

          {/* Profile Name - shown after verification */}
          {isVerified && availableControlPlanes.length > 0 && (
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
                  onChange={(e) => {
                    setProfileLabel(e.target.value);
                    if (addProfileError) {
                      setAddProfileError("");
                      setErrorFormState(null);
                    }
                  }}
                  className="flex-1"
                  disabled={addingProfile}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Profile name will be: <span className="font-mono text-foreground">{profileNamePrefix}{profileLabel.trim() ? `-${profileLabel.trim()}` : ''}</span>
              </p>
            </div>
          )}

          {addProfileError && (
            <Alert variant="destructive" className="border-2 border-destructive/50 bg-destructive/10 animate-pulse">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-semibold text-destructive whitespace-pre-wrap">
                {addProfileError}
              </AlertDescription>
            </Alert>
          )}

          {isVerifying && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Verifying connection...</span>
            </div>
          )}

          {addProfileSuccess && (
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <AlertDescription>
                Profile added successfully! It will now appear in the Dashboard.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            {!isVerified ? (
              <Button
                type="button"
                onClick={handleVerifyConnection}
                disabled={isVerifying || !newProfileForm.adminUrl || !newProfileForm.personalAccessToken}
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
                onClick={handleAddProfile}
                disabled={
                  addingProfile ||
                  availableControlPlanes.length === 0 ||
                  !newProfileForm.adminUrl ||
                  !newProfileForm.personalAccessToken ||
                  !isVerified ||
                  (addProfileError && errorFormState && (
                    newProfileForm.personalAccessToken === errorFormState.personalAccessToken &&
                    profileLabel === errorFormState.profileLabel
                  ))
                }
              >
                {addingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {addingProfile ? `Adding Profile...` : `Add Profile`}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewProfileForm({
                  adminUrl: DEFAULT_ADMIN_URL,
                  personalAccessToken: "",
                });
                setAddProfileError("");
                setAddProfileSuccess(false);
                setIsVerified(false);
                setAvailableControlPlanes([]);
                setProfileLabel("");
                setDefaultRegion(null);
                setDefaultControlPlane(null);
                setErrorFormState(null);
              }}
              disabled={addingProfile || isVerifying}
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
            {!isAddProfilePage && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-heading font-bold mb-1">
                    {configTitle}
                  </h1>
                </div>
                {renderDashboardView()}
              </>
            )}
            {isAddProfilePage && (
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
                      onClick={() => navigate(configBasePath)}
                    >
                      Back
                    </Button>
                  </div>
                </div>
                {renderAddProfileView()}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* View Profile Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile Details</DialogTitle>
            <DialogDescription>
              View all details for the selected Kong Konnect profile.
            </DialogDescription>
          </DialogHeader>
          {profileToView && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label className="text-foreground font-medium text-sm">
                    Profile ID
                  </Label>
                  <div className="mt-1.5 text-sm text-foreground bg-muted p-2 rounded border border-border">
                    {profileToView.profileName}
                  </div>
                </div>
                <div>
                  <Label className="text-foreground font-medium text-sm">
                    Admin URL
                  </Label>
                  <div className="mt-1.5 text-sm text-foreground bg-muted p-2 rounded border border-border break-words">
                    {profileToView.adminUrl || DEFAULT_ADMIN_URL}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-foreground font-medium text-sm mb-3 block">
                  Control Planes
                </Label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-background-elevated border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Region</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(profileToView.controlPlanes || []).map((cp, index) => {
                        // Handle both API response format (controlPlaneId/controlPlaneName) and local format (id/name)
                        const cpId = cp.controlPlaneId || cp.id;
                        const cpName = cp.controlPlaneName || cp.name;
                        return (
                          <tr
                            key={index}
                            className="border-b border-border last:border-b-0"
                          >
                            <td className="py-3 px-4 text-sm text-foreground">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{cpName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                              {cpId}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              US (North America)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewDialogOpen(false);
                setProfileToView(null);
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
              {profileToDelete && (
                <div className="space-y-3">
                  <p>
                    Are you sure you want to delete the profile <strong>"{profileToDelete.profileName}"</strong>?
                  </p>
                  <p className="text-sm text-destructive font-medium">
                    This action cannot be undone.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProfileToDelete(null);
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
          </DialogHeader>
          {profileToEdit && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-profile-id" className="text-foreground font-medium text-sm">
                  Profile ID
                </Label>
                <Input
                  id="edit-profile-id"
                  value={profileToEdit.profileName}
                  disabled
                  className="mt-1.5 bg-muted"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-admin-url" className="text-foreground font-medium text-sm">
                    Admin URL *
                  </Label>
                  <Input
                    id="edit-admin-url"
                    placeholder="https://us.api.konghq.com"
                    value={editForm.adminUrl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, adminUrl: e.target.value })
                    }
                    className="mt-1.5"
                    disabled={updating}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-pat" className="text-foreground font-medium text-sm">
                    Personal Access Token *
                  </Label>
                  <Input
                    id="edit-pat"
                    type="password"
                    placeholder="Enter token"
                    value={editForm.personalAccessToken}
                    onChange={(e) =>
                      setEditForm({ ...editForm, personalAccessToken: e.target.value })
                    }
                    className="mt-1.5"
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-foreground font-medium text-sm mb-3 block">
                  Control Planes
                </Label>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full border-collapse">
                    <thead className="bg-background-elevated">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground border-b border-border">Region</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground border-b border-border">Control Plane</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(profileToEdit.controlPlanes || []).map((cp, index) => {
                        // Handle both API response format (controlPlaneId/controlPlaneName) and local format (id/name)
                        const cpId = cp.controlPlaneId || cp.id;
                        const cpName = cp.controlPlaneName || cp.name;
                        return (
                          <tr
                            key={cpId || index}
                            className="border-b border-border"
                          >
                            <td className="py-3 px-4 text-sm text-foreground font-medium">
                              US (North America)
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="text-sm font-medium text-foreground">{cpName}</div>
                                  <div className="text-xs text-muted-foreground">ID: {cpId}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setProfileToEdit(null);
                setEditForm({ adminUrl: "", personalAccessToken: "" });
                setEditDefaultRegion(null);
                setEditDefaultControlPlane(null);
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConfirm}
              disabled={updating || !editForm.adminUrl || !editForm.personalAccessToken}
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
