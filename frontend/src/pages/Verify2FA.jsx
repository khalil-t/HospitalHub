import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Verify2FA = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Two-factor authentication verified successfully',
    });

    navigate('/');
  };

  const handleResend = () => {
    toast({
      title: 'Code Resent',
      description: 'A new verification code has been sent to your email',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-primary">
            MediSecure
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-foreground">
                Verification Code
              </Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
                maxLength={6}
                className="bg-secondary border-border text-foreground text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Verify Code
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Didn't receive a code? Resend
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => navigate('/register')}
              className="text-muted-foreground hover:text-primary"
            >
              ← Back to registration
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verify2FA;
