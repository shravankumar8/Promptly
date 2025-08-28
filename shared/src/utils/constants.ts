export const API_ROUTES = {
  AGENT_A: {
    PROCESS_EMAILS: "/api/process-emails",
    EXTRACT_TASKS: "/api/extract-tasks",
    HEALTH: "/api/health",
  },
  AGENT_B: {
    CREATE_EVENTS: "/api/create-events",
    LIST_EVENTS: "/api/events",
    HEALTH: "/api/health",
  },
} as const;

export const SCOPES = {
  EMAIL_READ: "email.read",
  CALENDAR_WRITE: "calendar.write",
  CALENDAR_READ: "calendar.read",
  NOTIFICATIONS_SEND: "notifications.send",
} as const;

export const AUDIENCES = {
  AGENT_A: "agent-a-email",
  AGENT_B: "agent-b-calendar",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const RATE_LIMITS = {
  EMAIL_PROCESSING: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // requests per window
  },
  CALENDAR_OPERATIONS: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // requests per window
  },
} as const;
