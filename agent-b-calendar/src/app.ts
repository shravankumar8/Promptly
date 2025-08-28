import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import calendarRoutes from "./routes/calendarRoutes.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:5173",
      process.env.AGENT_A_URL || "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Agent",
      "X-Requested-With",
    ],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for calendar operations
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Calendar operations rate limiting
const calendarLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 calendar operations per minute
  skip: (req) =>
    !req.path.includes("/create-events") && !req.path.includes("/events"),
  message: {
    error: "Too many calendar operations, please try again later.",
    retryAfter: "1 minute",
  },
});
app.use(["/api/create-events", "/api/events"], calendarLimiter);

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "agent-b-calendar",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    capabilities: ["calendar.write", "calendar.read"],
  });
});

// API routes
app.use("/api", calendarRoutes);

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

export { app };
