import React from "react";
import { Navigate } from "react-router-dom";
import { Descope } from "@descope/react-sdk";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Shield, Zap } from "lucide-react";

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Mail className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CalendarAI</h1>
          <p className="text-gray-600">Transform emails into calendar events</p>
        </div>

        {/* Descope Auth Component */}
        <div className="mb-8">
          <Descope
            flowId="sign-up-or-in"
            onSuccess={(e) => {
              // Auth context will handle the success automatically
              console.log("Login successful");
            }}
            onError={(e) => {
              console.error("Login error:", e);
            }}
            theme="light"
          />
        </div>

        {/* Features */}
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-green-500 mr-2" />
            <span>Enterprise-grade security</span>
          </div>
          <div className="flex items-center">
            <Zap className="h-4 w-4 text-blue-500 mr-2" />
            <span>AI-powered email processing</span>
          </div>
          <div className="flex items-center">
            <Mail className="h-4 w-4 text-indigo-500 mr-2" />
            <span>Automatic calendar integration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
