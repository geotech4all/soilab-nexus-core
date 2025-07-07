import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithRole, type AuthUser, type UserRole } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile with role information
          setTimeout(async () => {
            const profile = await getCurrentUserWithRole();
            setUserProfile(profile);
            setLoading(false);
          }, 0);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        getCurrentUserWithRole().then((profile) => {
          setUserProfile(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setUserProfile(null);
    }
    return { error };
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!userProfile) return false;
    
    // Admin has access to everything
    if (userProfile.role === 'admin') return true;
    
    return userProfile.role === requiredRole;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!userProfile) return false;
    
    // Admin has access to everything
    if (userProfile.role === 'admin') return true;
    
    return roles.includes(userProfile.role);
  };

  const isAdmin = () => hasRole('admin');
  const isCompanyUser = () => hasRole('company');
  const isRegularUser = () => hasRole('user');

  return {
    user,
    session,
    userProfile,
    loading,
    signOut,
    hasRole,
    hasAnyRole,
    isAdmin,
    isCompanyUser,
    isRegularUser,
    isAuthenticated: !!user,
  };
};