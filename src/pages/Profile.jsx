/**
 * Profile page — uses the generic `ProfilePage` from the UI library (same
 * pattern as forgesphere-api-lifecycle's Profile.jsx / GatewayHeader.jsx).
 * The real admin-backend fetch below is unchanged from before; its result
 * is mapped into the library's `user`/`config` shape — whatever data comes
 * back from that fetch is what the library's fields show.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useProbeStackProfile } from "../hooks/useProbeStackProfile";

import { ProfilePage as LibraryProfilePage } from "@probestack/probestack-ui-library";

export default function Profile({ showHeader = true }) {
  const navigate = useNavigate();

  // Same admin-backend fetch as before, now shared via a hook so
  // GatewayHeader's account-type badge reflects this same real data.
  const profile = useProbeStackProfile();

  // Get browser timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  // ---------- Build `user` object for the library ----------
  // The fetch effect sets this exact error string only on the no-session
  // (not logged in) branch — use it to tell that state apart from a real
  // profile, instead of treating "Guest" / "Not logged in" as real data.
  const isGuest = profile.error === 'No session';
  const [firstName, ...restName] = (profile.name || 'Developer').split(' ');
  // profile.email is the literal string "Not logged in" while a guest —
  // not a real address, so it shouldn't be echoed into email/username.
  const realEmail = isGuest ? '' : profile.email || '';
  const libraryUser = {
    firstName: firstName || 'Developer',
    lastName: restName.join(' '),
    email: realEmail,
    username: realEmail.includes('@') ? realEmail.split('@')[0] : '',
    jobTitle: profile.role || 'N/A',
    department: '',
    phone: '',
    // Real field from the admin-backend (`user_type`), same mapping
    // GatewayHeader's dropdown uses — 'organization' accounts show as
    // Enterprise, everyone else as Starter.
    accountType: profile.userType === 'organization' ? 'enterprise' : 'starter',
    // No verification flag comes back from this API — but a signed-out
    // guest is never "verified", so at minimum that much has to be real
    // rather than a badge that showed regardless of session state.
    emailVerified: !isGuest,
  };

  // ---------- Build config for ProfilePage ----------
  const config = {
    tabs: {
      profile: {
        sections: {
          personal: {
            fields: {
              firstName: { value: libraryUser.firstName, editable: false },
              lastName: { value: libraryUser.lastName, editable: false },
              email: { value: libraryUser.email },
              username: { value: libraryUser.username },
              jobTitle: { label: 'Role', value: libraryUser.jobTitle, editable: false },
              department: { enabled: false },
              phone: { enabled: false },
              organization: {
                label: 'Organization',
                value: profile.organization || 'N/A',
                editable: false,
              },
              timezone: {
                label: 'Timezone',
                value: userTimezone,
                editable: false,
              },
            },
          },
        },
      },

      security: { enabled: false },
      products: { enabled: true },
    },
  };

  return (
    <div className={cn("flex flex-col", showHeader ? "min-h-screen" : "min-h-full")}>
      <main className="flex-1 overflow-auto probestack-ui-library">
        {/* onBack renders the library's own back arrow to the LEFT of the
            avatar/name/badge in ProfilePage's header. */}
        <LibraryProfilePage user={libraryUser} config={config} onBack={() => navigate(-1)} />
      </main>

      {/* Footer (unchanged) */}
      <footer className="border-t border-dark-700">
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
