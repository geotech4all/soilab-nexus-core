import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { UserRole } from '@/lib/auth';

/**
 * Hook to handle role-based redirects.
 * Automatically redirects authenticated users to their appropriate dashboard.
 */
export const useRoleBasedRedirect = () => {
  const { isAuthenticated, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && userProfile && !loading) {
      const redirectPath = getRoleBasedPath(userProfile.role);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, userProfile, loading, navigate]);

  return { isAuthenticated, userProfile, loading };
};

/**
 * Get the appropriate dashboard path based on user role
 */
export const getRoleBasedPath = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'company':
      return '/company-dashboard';
    case 'user':
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

/**
 * Check if a user should have access to a specific role-based route
 */
export const canAccessRoute = (userRole: UserRole, requiredRoles?: UserRole[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (userRole === 'admin') return true;
  return requiredRoles.includes(userRole);
};
