import { Router } from "express";
import {
  processInbox,
  extractTasks,
  getEmailSummary,
} from "../controllers/emailController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Process emails and create calendar events (main workflow)
router.post("/process-emails", processInbox);

// Extract tasks from a single email
router.post("/extract-tasks", extractTasks);

// Get summary for a specific email
router.get("/email/:emailId/summary", getEmailSummary);

export default router;
