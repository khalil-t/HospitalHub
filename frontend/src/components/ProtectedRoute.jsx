import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import AccessDenied from './AccessDenied';

export const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireExternalDoctor = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Verifying authentication...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = user?.roles || [];

  if (requireExternalDoctor) {
    const isExternal = Boolean(
      user?.isExternalDoctor || userRoles.includes('external_doctor'),
    );
    if (!isExternal) {
      return (
        <AccessDenied
          allowedRoles={['external_doctor']}
          userRoles={userRoles}
          message="This portal is strictly reserved for external medical practitioners."
        />
      );
    }
  }

  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some((role) =>
      userRoles.includes(role),
    );
    if (!hasAllowedRole) {
      return (
        <AccessDenied
          allowedRoles={allowedRoles}
          userRoles={userRoles}
          message="You do not have the required permissions to access this page."
        />
      );
    }
  }

  return children;
};

export default ProtectedRoute;
