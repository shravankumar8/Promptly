import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthLayout } from "../components/Layout/AuthLayout";
import { DashboardLayout } from "../components/Layout/DashboardLayout";

// Page imports
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import EmailsPage from "../pages/EmailsPage";
import CalendarPage from "../pages/CalendarPage";
import ConsentPage from "../pages/ConsentPage";

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />

        <Route
          path="/consent"
          element={
            <AuthLayout>
              <ConsentPage />
            </AuthLayout>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/emails"
          element={
            <ProtectedRoute requiredPermission="email.read">
              <DashboardLayout>
                <EmailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute requiredPermission="calendar.write">
              <DashboardLayout>
                <CalendarPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
