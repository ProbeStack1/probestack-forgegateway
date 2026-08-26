import React from "react";
import { useNavigate } from "react-router-dom";
import { Header as LibraryHeader, ProfileDropdown } from "@probestack/probestack-ui-library";
import { useProbeStackProfile } from "../../hooks/useProbeStackProfile";

// Gateway-page header (/gateway/* routes) — same probestack-ui-library
// Header + ProfileDropdown as the rest of the app. No custom bg/border
// override here on purpose: the library's own bg-surface background and
// bottom-border gradient are what should show, not a hardcoded color.
// No "Configuration" item — this dropdown only has its built-in
// Profile/Sign out entries.
export default function GatewayHeader() {
  const navigate = useNavigate();

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

  const loggedInUserEmail = localStorage.getItem("userEmail") || "admin@test.com";
  const loggedInUserRole = localStorage.getItem("userRole") || "User";

  // Real Starter/Enterprise badge — same admin-backend `user_type` field
  // and mapping the Profile page uses, instead of the dropdown's default.
  const { userType } = useProbeStackProfile();
  const accountType = userType === 'organization' ? 'enterprise' : 'starter';

  return (
    <div className="probestack-ui-library shrink-0">
      <LibraryHeader
        logoImageSrc="/assets/justlogo.png"
        productName="API Gateway"
        brandCaption="ProbeStack"
        logoHref="https://forgesphere.probestack.io"
        logoClassName="h-12 w-auto"
        rightSlot={
          <div className="probestack-ui-library">
            <ProfileDropdown
              user={{
                name: loggedInUserEmail.split('@')[0] || 'User',
                email: loggedInUserEmail,
                role: loggedInUserRole,
                accountType,
              }}
              onSignOut={handleLogout}
              // Real Profile route — the old button here pointed at
              // "/gateway/profile", which isn't a route this app defines.
              onProfileClick={() => navigate('/gateway/profile')}
              showThemeToggle={false}
            />
          </div>
        }
        className="h-16"
      />
    </div>
  );
}
