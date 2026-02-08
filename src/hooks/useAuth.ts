import { useState, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { syncClerkUser, getUserByClerkId, type AuthUser, type UserRole } from '@/lib/auth';

export const useAuth = () => {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Sync Clerk user to Supabase when signed in
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn || !clerkUser) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      setSyncing(true);
      try {
        // First try to get existing profile
        let profile = await getUserByClerkId(clerkUser.id);

        if (!profile) {
          // Sync/create user via edge function
          const email = clerkUser.primaryEmailAddress?.emailAddress || '';
          const fullName = clerkUser.fullName || clerkUser.firstName || email.split('@')[0];
          profile = await syncClerkUser(clerkUser.id, email, fullName);
        }

        setUserProfile(profile);
      } catch (error) {
        console.error('Error syncing user:', error);
        setUserProfile(null);
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    };

    syncUser();
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      setUserProfile(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [clerkSignOut]);

  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    return userProfile.role === requiredRole;
  }, [userProfile]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    return roles.includes(userProfile.role);
  }, [userProfile]);

  return {
    user: clerkUser ?? null,
    session: isSignedIn ? {} : null,
    userProfile,
    loading: !clerkLoaded || loading,
    syncing,
    signOut,
    hasRole,
    hasAnyRole,
    isAdmin: () => hasRole('admin'),
    isCompanyUser: () => hasRole('company'),
    isRegularUser: () => hasRole('user'),
    isAuthenticated: !!isSignedIn,
  };
};
