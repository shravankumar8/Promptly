// Email-related types
export interface EmailData {
  id: string;
  subject: string;
  from: string;
  body: string;
  threadId: string;
  receivedAt: Date;
  isRead: boolean;
  labels: string[];
}

export interface EmailSummary {
  id: string;
  summary: string;
  actionItems: ActionItem[];
  priority: "low" | "medium" | "high";
  sentiment: "positive" | "neutral" | "negative";
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  suggestedDate?: string;
  priority: "low" | "medium" | "high";
  type: "meeting" | "deadline" | "followup" | "reminder";
  attendees?: string[];
}

// Calendar-related types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
  htmlLink?: string;
  status: "confirmed" | "tentative" | "cancelled";
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: "email" | "popup";
      minutes: number;
    }>;
  };
}

// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified: boolean;
  permissions: string[];
  tenants?: string[];
}

export interface AuthToken {
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

export interface DelegatedTokenRequest {
  sessionJwt: string;
  targetAudience: string;
  requestedScopes: string[];
  expirationTime?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  timestamp: string;
}

export interface ProcessEmailsResponse {
  processed: number;
  summaries: EmailSummary[];
  eventsCreated: CalendarEvent[];
  errors: Array<{
    emailId: string;
    error: string;
  }>;
}

// Error types
export interface AppError extends Error {
  code: string;
  status: number;
  details?: any;
}
