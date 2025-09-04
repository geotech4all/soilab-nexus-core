import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getRoleBasedPath, canAccessRoute } from '@/hooks/useRoleBasedRedirect';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: Array<'admin' | 'company' | 'user'>;
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, userProfile, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !userProfile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (requiredRoles && requiredRoles.length > 0) {
    if (!canAccessRoute(userProfile.role, requiredRoles)) {
      // Redirect to appropriate dashboard based on user role
      const redirectPath = getRoleBasedPath(userProfile.role);
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}