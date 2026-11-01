import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import { USER_ROLE } from "@/lib/roles";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Verify2FA from "@/pages/Verify2FA";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AdmissionsOfficerDashboard from "@/pages/AdmissionsOfficerDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import RadiologistDashboard from "@/pages/RadiologistDashboard";
import LaboratoryTechnicianDashboard from "@/pages/LaboratoryTechnicianDashboard";
import ExternalDoctorRequest from "@/pages/ExternalDoctorRequest";
import ExternalDoctorManagement from "@/pages/ExternalDoctorManagement";
import External from "@/pages/external";
import DPODashboard from "@/pages/DPODashboard";
import AdminDashboard from "@/pages/AdminDashboard";

const queryClient = new QueryClient();

const Placeholder = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center">
    <h1 className="text-2xl font-semibold text-primary">{title}</h1>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Root */}
              <Route
                path="/"
                element={
                  <PublicOnlyRoute>
                    <Navigate to="/login" replace />
                  </PublicOnlyRoute>
                }
              />

              {/* Public Guest-Only Routes */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <Register />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/verify-2fa"
                element={
                  <PublicOnlyRoute>
                    <Verify2FA />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicOnlyRoute>
                    <ForgotPassword />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicOnlyRoute>
                    <ResetPassword />
                  </PublicOnlyRoute>
                }
              />

              {/* Public Form Route */}
              <Route
                path="/external-doctor-request"
                element={<ExternalDoctorRequest />}
              />

              {/* Protected Clinical and Administrative Routes */}
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.SUPER_ADMIN,
                      USER_ROLE.SERVICE_HEAD,
                    ]}
                  >
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.INTERNAL_DOCTOR,
                      USER_ROLE.SUPER_ADMIN,
                    ]}
                  >
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/AdmissionsOfficer-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.ADMISSION_AGENT,
                      USER_ROLE.SUPER_ADMIN,
                    ]}
                  >
                    <AdmissionsOfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/DPO-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.VERIFICATION_CLERK,
                      USER_ROLE.SUPER_ADMIN,
                    ]}
                  >
                    <DPODashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Radiologist-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.RADIOLOGIST,
                      USER_ROLE.SUPER_ADMIN,
                    ]}
                  >
                    <RadiologistDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/LaboratoryTechnician-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.LABORATORY_TECHNICIAN,
                      USER_ROLE.SUPER_ADMIN,
                    ]}
                  >
                    <LaboratoryTechnicianDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected External Doctor Routes */}
              <Route
                path="/external"
                element={
                  <ProtectedRoute requireExternalDoctor={true}>
                    <External />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/external-doctor-management"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      USER_ROLE.SUPER_ADMIN,
                      USER_ROLE.ADMISSION_AGENT,
                    ]}
                  >
                    <ExternalDoctorManagement />
                  </ProtectedRoute>
                }
              />

              {/* Catch-All */}
              <Route path="*" element={<Placeholder title="Not Found" />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
