import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import Lottie from 'lottie-react';
import medical2 from '@/animations/medical2.json';
import { authService } from '@/services/authService';
import { auditService } from '@/services/auditService';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    auditService.logPageVisit('Login Page');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login(email, password);
      const user = response.user;

      toast.success('Login successful!');

      const userRoles = user.roles || [];

      if (user.isExternalDoctor) {
        navigate('/external', { replace: true });
        return;
      }

      if (userRoles.includes('super_admin')) {
        navigate('/admin-dashboard', { replace: true });
      } else if (userRoles.includes('internal_doctor')) {
        navigate('/doctor-dashboard', { replace: true });
      } else if (userRoles.includes('service_head')) {
        navigate('/ServiceChef-dashboard', { replace: true });
      } else if (userRoles.includes('admission_agent')) {
        navigate('/AdmissionsOfficer-dashboard', { replace: true });
      } else if (userRoles.includes('verification_clerk')) {
        navigate('/DPO-dashboard', { replace: true });
      } else if (userRoles.includes('RADIOLOGIST')) {
        navigate('/Radiologist-dashboard', { replace: true });
      } else if (userRoles.includes('LAB_TECHNICIAN')) {
        navigate('/LaboratoryTechnician-dashboard', { replace: true });
      }
    } catch (error) {
      const message =
        error.status === 429
          ? 'Too many login attempts. Please try again later.'
          : error.message || 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 ">
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary to-primary/40 text-white p-12">
        <Motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-md text-center"
        >
          <Motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={
              animationFinished ? { opacity: 1, y: 50 } : { opacity: 0.7, y: 0 }
            }
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
              Welcome Back
            </h1>
            <p className="text-lg opacity-90 mb-6">
              Log in to continue to your MediSecure dashboard.
            </p>
          </Motion.div>

          <Lottie
            animationData={medical2}
            loop={false}
            autoplay={true}
            onComplete={() => setAnimationFinished(true)}
            style={{ width: 450, margin: '0 auto' }}
          />
        </Motion.div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-xl bg-card/70 border border-border shadow-xl rounded-2xl">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="text-4xl font-semibold text-primary">
                MediSecure
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full py-2 text-lg rounded-xl shadow-md hover:shadow-lg transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>

                <div className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-primary hover:underline font-medium"
                    disabled={isLoading}
                  >
                    Register
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Motion.div>
      </div>
    </div>
  );
};

export default Login;
