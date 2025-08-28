import React, { useState } from "react";
import { useUser, useDescope, getSessionToken } from "@descope/react-sdk";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Mail,
  Calendar,
  Zap,
  LogOut,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { processEmails } from "../../services/api.service";

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { logout } = useDescope();
  const [results, setResults] = useState<any>(null);

  const processEmailsMutation = useMutation({
    mutationFn: processEmails,
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Processed ${data.items.length} emails successfully!`);
    },
    onError: (error: any) => {
      console.error("Process emails error:", error);
      toast.error(error.response?.data?.error || "Failed to process emails");
    },
  });

  const handleProcessEmails = async () => {
    try {
      const token = getSessionToken();
      if (!token) {
        toast.error("No session token available");
        return;
      }
      await processEmailsMutation.mutateAsync({ maxResults: 5 });
    } catch (error) {
      console.error("Error processing emails:", error);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CalendarAI</h1>
                <p className="text-sm text-gray-600">
                  Email Summarizer + Calendar Follower
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              {user?.picture && (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="h-8 w-8 rounded-full"
                />
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Process Your Gmail Inbox
            </h2>
            <p className="text-gray-600">
              Our AI agents will analyze your recent emails, extract actionable
              items, and securely create calendar events for you.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcessEmails}
              disabled={processEmailsMutation.isPending}
              className="flex items-center space-x-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {processEmailsMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
              <span>
                {processEmailsMutation.isPending
                  ? "Processing..."
                  : "Process Emails & Create Events"}
              </span>
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Summaries */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Email Summaries ({results.items.length})
                </h3>
              </div>
              <div className="space-y-4">
                {results.items.map((item: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {item.email.subject}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {item.email.from}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.summary}</p>
                    {item.actions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Action Items: {item.actions.length}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.actions.map((action: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                            >
                              {action.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Events */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Created Events ({results.created.created.length})
                </h3>
              </div>
              <div className="space-y-4">
                {results.created.created.map((event: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <h4 className="font-medium text-gray-900">
                        {event.title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {new Date(event.startTime).toLocaleString()}
                    </p>
                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        View in Google Calendar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* How it Works */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Email Analysis</h4>
              <p className="text-sm text-gray-600">
                Agent A securely fetches your Gmail messages and uses AI to
                summarize content and extract actionable items.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">
                Secure Delegation
              </h4>
              <p className="text-sm text-gray-600">
                Agent A requests a scoped token from Descope to securely
                communicate with Agent B for calendar operations.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Event Creation</h4>
              <p className="text-sm text-gray-600">
                Agent B validates the token, enforces scopes, and creates
                calendar events with proper permissions.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
