import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import Navigation from "./Navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="flex">
        {/* Sidebar could go here */}

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
            </div>

            {/* Page content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
