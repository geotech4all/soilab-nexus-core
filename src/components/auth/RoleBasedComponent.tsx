import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Building, User, Crown } from 'lucide-react';

export const RoleBasedComponent = () => {
  const { userProfile, isAdmin, isCompanyUser, isRegularUser, signOut, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userProfile) {
    return <div>Please log in to see this content</div>;
  }

  const getRoleIcon = () => {
    switch (userProfile.role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'company':
        return <Building className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = () => {
    switch (userProfile.role) {
      case 'admin':
        return 'destructive' as const;
      case 'company':
        return 'default' as const;
      case 'user':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getRoleIcon()}
            Welcome, {userProfile.full_name}
          </CardTitle>
          <CardDescription>
            You are logged in as: 
            <Badge variant={getRoleBadgeVariant()} className="ml-2">
              {userProfile.role}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>User ID:</strong> {userProfile.id}</p>
            <p><strong>Company ID:</strong> {userProfile.company_id || 'Not assigned'}</p>
            <p><strong>Member since:</strong> {new Date(userProfile.created_at).toLocaleDateString()}</p>
          </div>
          <Button onClick={signOut} variant="outline" className="mt-4">
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Role-based content */}
      <div className="grid gap-4">
        {isAdmin() && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Admin Dashboard</CardTitle>
              <CardDescription className="text-red-600">
                Only admins can see this section
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-red-700">
                <li>• Manage all users and companies</li>
                <li>• Access system settings</li>
                <li>• View analytics and reports</li>
                <li>• Manage roles and permissions</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {(isAdmin() || isCompanyUser()) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Company Management</CardTitle>
              <CardDescription className="text-blue-600">
                Available to admins and company users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-blue-700">
                <li>• Manage company projects</li>
                <li>• Add/remove team members</li>
                <li>• View company analytics</li>
                <li>• Upload files and documents</li>
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">User Features</CardTitle>
            <CardDescription className="text-green-600">
              Available to all authenticated users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-green-700">
              <li>• View assigned projects</li>
              <li>• Update profile information</li>
              <li>• Access personal dashboard</li>
              <li>• Submit reports and data</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};