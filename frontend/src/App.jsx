import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Verify2FA from '@/pages/Verify2FA';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

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
              <Route path="/" element={<Placeholder title="MediSecure" />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-2fa" element={<Verify2FA />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/admin-dashboard"
                element={<Placeholder title="Admin Dashboard" />}
              />
              <Route
                path="/doctor-dashboard"
                element={<Placeholder title="Doctor Dashboard" />}
              />
              <Route
                path="/ServiceChef-dashboard"
                element={<Placeholder title="Service Chef Dashboard" />}
              />
              <Route
                path="/AdmissionsOfficer-dashboard"
                element={<Placeholder title="Admissions Officer Dashboard" />}
              />
              <Route
                path="/DPO-dashboard"
                element={<Placeholder title="DPO Dashboard" />}
              />
              <Route
                path="/Radiologist-dashboard"
                element={<Placeholder title="Radiologist Dashboard" />}
              />
              <Route
                path="/LaboratoryTechnician-dashboard"
                element={
                  <Placeholder title="Laboratory Technician Dashboard" />
                }
              />

              <Route
                path="/external"
                element={<Placeholder title="External Doctor Portal" />}
              />

              <Route path="*" element={<Placeholder title="Not Found" />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
