import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import BoreholeLog from "./pages/BoreholeLog";
import TestInput from "./pages/TestInput";
import GlobalMap from "./pages/GlobalMap";
import FoundationAnalysis from "./pages/FoundationAnalysis";
import ReportBuilder from "./pages/ReportBuilder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin-dashboard" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Protected Company Routes */}
          <Route path="/company-dashboard" element={
            <ProtectedRoute requiredRoles={['company', 'admin']}>
              <CompanyDashboard />
            </ProtectedRoute>
          } />
          
          {/* Protected User Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/create-project" element={
            <ProtectedRoute>
              <CreateProject />
            </ProtectedRoute>
          } />
          <Route path="/project/:id" element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          } />
          <Route path="/borehole/:boreholeId" element={
            <ProtectedRoute>
              <BoreholeLog />
            </ProtectedRoute>
          } />
          <Route path="/test/:testId" element={
            <ProtectedRoute>
              <TestInput />
            </ProtectedRoute>
          } />
          <Route path="/foundation/:projectId" element={
            <ProtectedRoute>
              <FoundationAnalysis />
            </ProtectedRoute>
          } />
          <Route path="/report/:projectId" element={
            <ProtectedRoute>
              <ReportBuilder />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute>
              <GlobalMap />
            </ProtectedRoute>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
