import { useEffect, useState } from 'react';

/**
 * Fetches the current user's profile from the ProbeStack admin-backend —
 * same endpoint Profile.jsx already called on its own, now shared so
 * GatewayHeader's account-type badge (Starter/Enterprise) reflects the
 * same real `user_type` field instead of a hardcoded/default guess.
 * Mirrors forgesphere-api-lifecycle's useProbeStackProfile hook (same
 * field names), but keeps this app's existing fetch()+Bearer-token auth
 * instead of switching to its axios/cookie approach.
 */
export function useProbeStackProfile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    userType: 'individual', // 'organization' | 'individual' — drives Starter/Enterprise
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      const email = localStorage.getItem('userEmail');
      const token = localStorage.getItem('authToken');

      if (!email || !token) {
        if (!cancelled) {
          setProfile({
            name: 'Guest',
            email: 'Not logged in',
            organization: '',
            role: '',
            userType: 'individual',
            isLoading: false,
            error: 'No session',
          });
        }
        return;
      }

      try {
        const response = await fetch(
          `https://probestack.io/admin-backend/api/public/users/${email}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          setProfile({
            name: data.admin?.name || data.name || email.split('@')[0],
            email: data.email || email,
            organization: data.organization_name || '',
            role: data.role || data.role_name || 'User',
            userType: data.user_type || 'individual',
            isLoading: false,
            error: null,
          });
        } else {
          setProfile({
            name: localStorage.getItem('userFirstName') || 'Developer',
            email: localStorage.getItem('userEmail') || email,
            organization: localStorage.getItem('userOrganization') || '',
            role: localStorage.getItem('userRole') || 'User',
            userType: 'individual',
            isLoading: false,
            error: 'Using cached data',
          });
        }
      } catch (err) {
        if (cancelled) return;
        setProfile({
          name: localStorage.getItem('userFirstName') || 'Developer',
          email: localStorage.getItem('userEmail') || email,
          organization: localStorage.getItem('userOrganization') || '',
          role: localStorage.getItem('userRole') || 'User',
          userType: 'individual',
          isLoading: false,
          error: 'Network error',
        });
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, []);

  return profile;
}
