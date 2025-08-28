import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "@descope/react-sdk";
import LoginPage from "./components/Auth/LoginPage";
import Dashboard from "./components/Dashboard/Dashboard";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import LoadingSpinner from "./components/common/LoadingSpinner";

const App: React.FC = () => {
  const { isSessionLoading } = useSession();

  if (isSessionLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default App;
