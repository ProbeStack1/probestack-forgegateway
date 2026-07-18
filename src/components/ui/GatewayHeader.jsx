import React from "react";
import { LogOut as LogOutIcon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  return (
    <header className="h-16 shrink-0 border-b border-[#1f2840] bg-[#080826] px-4">
      <div className="flex h-full items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/gateway/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#27314e] bg-white/[0.04] text-white transition-colors hover:border-[#ff5b1f]/45 hover:bg-white/[0.08]"
            title="User"
            aria-label="User"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#27314e] bg-white/[0.04] text-white transition-colors hover:border-[#ff5b1f]/45 hover:bg-[#ff5b1f]/10"
            title="Logout"
            aria-label="Logout"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
