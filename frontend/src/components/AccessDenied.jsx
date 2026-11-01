import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/useAuth';
import { getDefaultDashboard } from '@/lib/navigation';

export const AccessDenied = ({
  allowedRoles = [],
  userRoles = [],
  message,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    navigate(getDefaultDashboard(user), { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/40 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            403 - Access Denied
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            {message || 'You do not have permission to access this page.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-md bg-muted/60 border border-border p-3 text-xs space-y-1.5">
            <p>
              <span className="font-semibold text-foreground">User:</span>{' '}
              {user?.email || 'Authenticated User'}
            </p>
            <p>
              <span className="font-semibold text-foreground">Your Role(s):</span>{' '}
              {userRoles.length ? userRoles.join(', ') : 'None'}
            </p>
            {allowedRoles.length > 0 && (
              <p>
                <span className="font-semibold text-foreground">
                  Required Role(s):
                </span>{' '}
                {allowedRoles.join(', ')}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleGoDashboard}
              className="flex-1"
              variant="default"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              My Dashboard
            </Button>
            <Button onClick={logout} variant="outline" className="flex-1">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
