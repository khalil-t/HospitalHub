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
import { useToast } from '@/hooks/use-toast';
import Lottie from 'lottie-react';
import myAnimation from '@/animations/medical.json';
import { authService } from '@/services/authService';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [animationFinished, setAnimationFinished] = useState(false);
  const [adminExists, setAdminExists] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const exists = await authService.checkIfAdminExists();
      if (exists) {
        navigate('/login', { replace: true });
        return;
      }
      setAdminExists(false);
    };

    checkAdmin();
  }, [navigate]);

  if (adminExists === null) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !fullName || !username) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        username: username,
        email: email,
        fullName: fullName,
        password: password,
      });

      toast({
        title: 'Success',
        description: 'Account created successfully! You can now sign in.',
      });

      navigate('/login');
    } catch (error) {
      if (error.status === 404) {
        toast({
          title: 'Registration Closed',
          description:
            'An administrator account already exists. Please sign in instead.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
        return;
      }

      toast({
        title: 'Registration Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary to-primary/40 text-white p-12">
        <div className="max-w-md text-center">
          <Motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={
              animationFinished
                ? { opacity: 1, y: 120 }
                : { opacity: 0.7, y: -20 }
            }
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
              Set Up MediSecure
            </h1>
            <p className="text-lg opacity-90 mb-6">
              Create the first administrator account for your hospital.
            </p>
          </Motion.div>

          <Lottie
            animationData={myAnimation}
            loop={false}
            autoplay={true}
            onComplete={() => setAnimationFinished(true)}
            style={{ width: 500, margin: '0 auto' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-xl bg-card/70 border border-border shadow-xl rounded-2xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-4xl font-semibold text-primary">
                MediSecure
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create the first administrator account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
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
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {isLoading
                    ? 'Creating Account...'
                    : 'Create Administrator Account'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  Already have an account?{' '}
                </span>
                <button
                  onClick={() => navigate('/')}
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </div>
            </CardContent>
          </Card>
        </Motion.div>
      </div>
    </div>
  );
};

export default Register;
