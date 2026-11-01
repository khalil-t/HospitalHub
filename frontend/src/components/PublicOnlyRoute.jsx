import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { getDefaultDashboard } from '@/lib/navigation';

export const PublicOnlyRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading session...
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    const destination =
      location.state?.from?.pathname || getDefaultDashboard(user);
    return <Navigate to={destination} replace />;
  }

  return children;
};

export default PublicOnlyRoute;
