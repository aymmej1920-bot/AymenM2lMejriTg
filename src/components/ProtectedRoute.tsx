import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import SkeletonLoader from './SkeletonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'direction' | 'utilisateur')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { session, currentUser, isLoading, isProfileLoading } = useSession();
  const location = useLocation();

  if (isLoading || isProfileLoading) {
    // Show a loading indicator while session or profile is being fetched
    return (
      <div className="flex justify-center items-center h-screen">
        <SkeletonLoader count={1} height="h-16" className="w-1/2" />
      </div>
    );
  }

  if (!session) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    // If user role is not allowed, redirect to dashboard or show access denied
    // For simplicity, redirect to dashboard. A more complex app might show an "Access Denied" page.
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;