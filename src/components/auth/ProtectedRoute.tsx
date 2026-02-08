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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but profile not yet synced, show loading
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!canAccessRoute(userProfile.role, requiredRoles)) {
      const redirectPath = getRoleBasedPath(userProfile.role);
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
