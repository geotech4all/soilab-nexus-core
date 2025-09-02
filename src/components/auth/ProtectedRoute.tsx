import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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
    const hasRequiredRole = requiredRoles.includes(userProfile.role) || userProfile.role === 'admin';
    
    if (!hasRequiredRole) {
      // Redirect to appropriate dashboard based on user role
      const redirectPath = userProfile.role === 'admin' ? '/admin-dashboard' : 
                          userProfile.role === 'company' ? '/company-dashboard' : 
                          '/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}