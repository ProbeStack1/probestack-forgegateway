import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Key, Sun, Bell, LogOut, Headphones, Moon,
  Server, Layers, Puzzle, ClipboardCheck, Rocket, TestTube,
  LayoutDashboard, CheckCircle, Clock, Shield, Settings,
  LogOut as LogOutIcon
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { cn } from "../lib/utils";

// Simple toast implementation (kept as before)
const toast = {
  error: (msg) => console.error(msg),
  success: (msg) => console.log(msg),
};

export default function Profile({ showHeader = true }) {
  const navigate = useNavigate();

  // ---------- State ----------
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'notifications'
  const [theme, setTheme] = useState('dark');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Profile data fetched from API – stored in state, not localStorage
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    isLoading: true,
    error: null
  });

  // ---------- Fetch Profile on Mount ----------
  useEffect(() => {
    const fetchProfile = async () => {
      const email = localStorage.getItem('userEmail');
      const token = localStorage.getItem('authToken');

      if (!email || !token) {
        setProfile({
          name: 'Guest',
          email: 'Not logged in',
          organization: '',
          role: '',
          isLoading: false,
          error: 'No session'
        });
        return;
      }

      try {
        const response = await fetch(
          `https://probestack.io/admin-backend/api/public/users/${email}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Update state with fresh API data
          setProfile({
            name: data.admin?.name || data.name || email.split('@')[0],
            email: data.email || email,
            organization: data.organization_name || '',
            role: data.role || data.role_name || 'User',
            isLoading: false,
            error: null
          });
        } else {
          // Fallback to localStorage if API fails
          setProfile({
            name: localStorage.getItem('userFirstName') || 'Developer',
            email: localStorage.getItem('userEmail') || email,
            organization: localStorage.getItem('userOrganization') || '',
            role: localStorage.getItem('userRole') || 'User',
            isLoading: false,
            error: 'Using cached data'
          });
        }
      } catch (err) {
        // Network error – fallback to localStorage
        setProfile({
          name: localStorage.getItem('userFirstName') || 'Developer',
          email: localStorage.getItem('userEmail') || email,
          organization: localStorage.getItem('userOrganization') || '',
          role: localStorage.getItem('userRole') || 'User',
          isLoading: false,
          error: 'Network error'
        });
      }
    };

    fetchProfile();
  }, []);

  // ---------- Helpers ----------
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  // Get browser timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };


  // ---------- Render ----------
  return (
    <div className={cn("flex flex-col", showHeader ? "min-h-screen" : "min-h-full")} style={{ backgroundColor: '#0e172a' }}>
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Your profile</h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage your account, security &amp; notification preferences.
            </p>
          </div>

          {/* ===== Profile Summary Card ===== */}
          <div className="rounded-xl border border-dark-700 p-6 mb-6 flex flex-col md:flex-row items-start md:items-center gap-6" style={{ backgroundColor: '#15192b' }}>
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-primary">
                {getInitials(profile.name)}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <h2 className="text-xl font-semibold text-white">{profile.name}</h2>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 w-fit">
                  {profile.role.toUpperCase()}
                </span>
              </div>
              
              <p className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                {profile.email}
                <span className="inline-flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {userTimezone}
                </span>
                <span>Organization: {profile.organization || 'N/A'}</span>
              </div>
            </div>

            {/* Support Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-dark-700 text-white hover:bg-dark-800 shrink-0"
              onClick={() => navigate("/profile/support")}
            >
              <Headphones className="h-4 w-4 mr-2" />
              Support
            </Button>
          </div>

          {/* ===== Tabs Navigation ===== */}
          <div className="border-b border-dark-700 mb-6">
            <nav className="flex gap-6 -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "pb-3 px-1 text-sm font-medium transition-colors border-b-2",
                  activeTab === 'profile'
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={cn(
                  "pb-3 px-1 text-sm font-medium transition-colors border-b-2",
                  activeTab === 'security'
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "pb-3 px-1 text-sm font-medium transition-colors border-b-2",
                  activeTab === 'notifications'
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                )}
              >
                Notifications
              </button>
            </nav>
          </div>

          {/* ===== Tab Content ===== */}

          {/* --- PROFILE TAB --- */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Personal Details */}
              <Card className="border-dark-700" style={{ backgroundColor: '#15192b' }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-400">Full Name</Label>
                      <p className="text-white text-sm mt-1">{profile.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Email Address</Label>
                      <p className="text-white text-sm mt-1">{profile.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Organization</Label>
                      <p className="text-white text-sm mt-1">{profile.organization || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Role</Label>
                      <p className="text-white text-sm mt-1">{profile.role}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Timezone</Label>
                      <p className="text-white text-sm mt-1">{userTimezone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Account Status</Label>
                      <p className="text-green-400 text-sm mt-1 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Verified
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferences (Appearance) */}
              <Card className="border-dark-700" style={{ backgroundColor: '#15192b' }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="text-sm font-medium text-white">Dark Mode</h4>
                      <p className="text-sm text-gray-400">Toggle between light and dark themes</p>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={toggleTheme}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* --- SECURITY TAB --- */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="border-dark-700" style={{ backgroundColor: '#15192b' }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Security
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">Manage your password and session</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Change Password */}
                  <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
                    <div>
                      <h4 className="text-sm font-medium text-white">Password</h4>
                      <p className="text-sm text-gray-400">Change your account password</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-dark-700 text-white hover:bg-dark-800"
                    >
                      Change Password
                    </Button>
                  </div>

                  {/* Logout */}
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="text-sm font-medium text-red-400">Sign Out</h4>
                      <p className="text-sm text-gray-400">End your current session</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* --- NOTIFICATIONS TAB --- */}
          {activeTab === 'notifications' && (
            <Card className="border-dark-700" style={{ backgroundColor: '#15192b' }}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">Configure how you receive updates</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
                  <div>
                    <h4 className="text-sm font-medium text-white">Email Notifications</h4>
                    <p className="text-sm text-gray-400">Receive emails for organization updates</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="text-sm font-medium text-white">Push Notifications</h4>
                    <p className="text-sm text-gray-400">Browser notifications for important alerts</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      {/* Footer (unchanged) */}
      <footer className="border-t border-dark-700 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/assets/justlogo.png"
                alt="ForgeSphere logo"
                className="h-6 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <span className="font-semibold gradient-text">
                ProbeStack
              </span>
              <span className="text-gray-400">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="/privacy-policy"
                className="hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-primary transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/security"
                className="hover:text-primary transition-colors"
              >
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
