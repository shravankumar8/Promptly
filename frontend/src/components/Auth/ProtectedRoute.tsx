import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@descope/react-sdk";
import LoadingSpinner from "../common/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
}) => {
  const { isAuthenticated, isSessionLoading } = useSession();
  const location = useLocation();

  if (isSessionLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // TODO: Add permission checking logic here
  // if (requiredPermissions.length > 0) {
  //   const hasPermissions = checkUserPermissions(requiredPermissions);
  //   if (!hasPermissions) {
  //     return <div>Access Denied</div>;
  //   }
  // }

  return <>{children}</>;
};

export default ProtectedRoute;
