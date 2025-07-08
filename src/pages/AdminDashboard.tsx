import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Users, Building, Settings, Shield, BarChart3, Plus, Edit } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  contact_email: string | null;
  address: string | null;
  created_at: string;
  project_count: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  company_id: string | null;
  company_name: string | null;
}

interface SiteMetrics {
  totalProjects: number;
  totalTests: number;
  totalUsers: number;
  totalCompanies: number;
}

const AdminDashboard = () => {
  const { userProfile, signOut, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SiteMetrics>({
    totalProjects: 0,
    totalTests: 0,
    totalUsers: 0,
    totalCompanies: 0
  });
  
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    contact_email: '',
    address: ''
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (userProfile && isAdmin()) {
      fetchData();
    }
  }, [userProfile, isAdmin]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch companies with project counts
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          *,
          projects:projects(count)
        `)
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      const companiesWithCounts = companiesData?.map(company => ({
        ...company,
        project_count: company.projects?.[0]?.count || 0
      })) || [];

      setCompanies(companiesWithCounts);

      // Fetch users with company names
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          companies:company_id(name)
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const usersWithCompanyNames = usersData?.map(user => ({
        ...user,
        company_name: user.companies?.name || null
      })) || [];

      setUsers(usersWithCompanyNames);

      // Fetch metrics
      const [projectsResponse, testsResponse] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('tests').select('id', { count: 'exact', head: true })
      ]);

      setMetrics({
        totalProjects: projectsResponse.count || 0,
        totalTests: testsResponse.count || 0,
        totalUsers: usersData?.length || 0,
        totalCompanies: companiesData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCompany) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update(companyForm)
          .eq('id', editingCompany.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Company updated successfully'
        });
      } else {
        // Create new company
        const { error } = await supabase
          .from('companies')
          .insert([companyForm]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Company created successfully'
        });
      }

      setIsCreateCompanyOpen(false);
      setEditingCompany(null);
      setCompanyForm({ name: '', contact_email: '', address: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company',
        variant: 'destructive'
      });
    }
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      contact_email: company.contact_email || '',
      address: company.address || ''
    });
    setIsCreateCompanyOpen(true);
  };

  const resetCompanyForm = () => {
    setEditingCompany(null);
    setCompanyForm({ name: '', contact_email: '', address: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile || !isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">SoilLab Admin</h1>
              <p className="text-sm text-muted-foreground">Administrator Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{userProfile.full_name}</p>
              <Badge variant="destructive" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userProfile.full_name}</h2>
          <p className="text-muted-foreground">Manage your SoilLab platform from here.</p>
        </div>

        {/* Site Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">Active companies</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">All projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests Run</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTests}</div>
              <p className="text-xs text-muted-foreground">Soil tests</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Companies</h3>
              <Dialog open={isCreateCompanyOpen} onOpenChange={(open) => {
                setIsCreateCompanyOpen(open);
                if (!open) resetCompanyForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCompany ? 'Edit Company' : 'Create New Company'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCompany ? 'Update company information' : 'Add a new company to the platform'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCompanySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name</Label>
                      <Input
                        id="name"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={companyForm.contact_email}
                        onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateCompanyOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingCompany ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Contact Email</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          Loading companies...
                        </TableCell>
                      </TableRow>
                    ) : companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No companies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>{company.contact_email || 'N/A'}</TableCell>
                          <TableCell>{company.project_count}</TableCell>
                          <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCompany(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <h3 className="text-lg font-semibold">All Users</h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.role === 'admin' ? 'destructive' : user.role === 'company' ? 'default' : 'secondary'}
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.company_name || 'N/A'}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;