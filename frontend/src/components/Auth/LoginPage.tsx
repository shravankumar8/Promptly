import React from "react";
import { Navigate } from "react-router-dom";
import { Descope, useSession } from "@descope/react-sdk";
import { Mail, Shield, Zap, Users } from "lucide-react";

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useSession();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-indigo-600 p-3 rounded-xl">
                  <Mail className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                CalendarAI
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Transform your emails into organized calendar events
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              <div className="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm">
                <Shield className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Enterprise Security
                  </h3>
                  <p className="text-sm text-gray-600">
                    OAuth 2.0 with scoped permissions
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm">
                <Zap className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">AI-Powered</h3>
                  <p className="text-sm text-gray-600">
                    Smart email summarization and task extraction
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm">
                <Users className="h-5 w-5 text-purple-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Agent Collaboration
                  </h3>
                  <p className="text-sm text-gray-600">
                    Secure multi-agent communication
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center bg-white shadow-xl">
          <div className="max-w-md w-full px-8 py-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600">Sign in to access your dashboard</p>
            </div>

            <Descope
              flowId="sign-up-or-in"
              onSuccess={(e) => {
                console.log("Login successful:", e.detail.user);
              }}
              onError={(e) => {
                console.error("Login error:", e);
              }}
              theme="light"
            />

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                🔒 This app will request permission to:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Read your Gmail messages</li>
                <li>• Create Google Calendar events</li>
                <li>• Send notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
