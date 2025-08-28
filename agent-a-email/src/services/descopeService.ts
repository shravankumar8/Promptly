import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import { validateProcessEmailsRequest } from "../middleware/validation.middleware.js";
import { gmailService } from "../services/gmailService.js";
import { aiService } from "../services/aiService.js";
import { descopeService } from "../services/descopeService.js";
import type {
  EmailData,
  ActionItem,
  ProcessEmailsResponse,
} from "@email-calendar/shared";

export const processInbox = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request
    const { error, value } = validateProcessEmailsRequest(req.body);
    if (error) {
      throw new AppError(
        "Invalid request parameters",
        400,
        "VALIDATION_ERROR",
        error.details
      );
    }

    const { maxResults = 5 } = value;
    const userSessionJwt = req.headers.authorization?.replace("Bearer ", "");

    if (!userSessionJwt) {
      throw new AppError("Authorization header required", 401, "MISSING_TOKEN");
    }

    logger.info("Starting email processing", {
      maxResults,
      userId: (req as any).user?.userId,
    });

    // Step 1: Fetch emails from Gmail
    const messages = await gmailService.getRecentEmails(maxResults);
    logger.info(`Fetched ${messages.length} email messages`);

    // Step 2: Process each email
    const items: Array<{
      email: EmailData;
      summary: string;
      actions: ActionItem[];
    }> = [];

    const errors: Array<{ emailId: string; error: string }> = [];

    for (const message of messages) {
      try {
        const email = await gmailService.getEmailContent(message.id);
        const summary = await aiService.summarizeEmail(email);
        const actions = await aiService.extractActionItems(email);

        items.push({ email, summary, actions });

        logger.info(`Processed email: ${email.subject}`, {
          emailId: email.id,
          actionCount: actions.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({ emailId: message.id, error: errorMessage });
        logger.error(`Failed to process email ${message.id}:`, error);
      }
    }

    // Step 3: Request delegated token for calendar operations
    const delegatedToken = await descopeService.requestDelegatedToken(
      userSessionJwt,
      "agent-b-calendar",
      ["calendar.write"]
    );

    if (!delegatedToken) {
      throw new AppError(
        "Failed to obtain delegated token for calendar operations",
        403,
        "DELEGATION_FAILED"
      );
    }

    logger.info(
      "Successfully obtained delegated token for calendar operations"
    );

    // Step 4: Prepare events for creation
    const eventsToCreate = items.flatMap((item) =>
      item.actions.map((action) => ({
        title: action.title,
        description: `${item.summary}\n\nOriginal Email: ${item.email.subject}`,
        startTime:
          action.suggestedDate ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: action.suggestedDate
          ? new Date(
              new Date(action.suggestedDate).getTime() + 60 * 60 * 1000
            ).toISOString()
          : new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        attendees: action.attendees || [],
      }))
    );

    // Step 5: Call Agent B to create calendar events
    let createdEvents = { created: [] };
    if (eventsToCreate.length > 0) {
      try {
        createdEvents = await descopeService.callAgentBCreateEvents(
          delegatedToken,
          eventsToCreate
        );
        logger.info(
          `Successfully created ${createdEvents.created.length} calendar events`
        );
      } catch (error) {
        logger.error("Failed to create calendar events:", error);
        errors.push({
          emailId: "calendar-creation",
          error:
            error instanceof Error ? error.message : "Calendar creation failed",
        });
      }
    }

    const response: ProcessEmailsResponse = {
      processed: items.length,
      summaries: items.map((item) => ({
        id: item.email.id,
        summary: item.summary,
        actionItems: item.actions,
        priority: "medium", // Could be determined by AI
        sentiment: "neutral", // Could be analyzed by AI
      })),
      eventsCreated: createdEvents.created,
      errors,
    };

    logger.info("Email processing completed successfully", {
      processed: response.processed,
      eventsCreated: response.eventsCreated.length,
      errors: response.errors.length,
    });

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const extractTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "object") {
      throw new AppError(
        "Email object is required in request body",
        400,
        "MISSING_EMAIL"
      );
    }

    logger.info("Extracting tasks from single email", { emailId: email.id });

    const summary = await aiService.summarizeEmail(email);
    const actions = await aiService.extractActionItems(email);

    const response = {
      summary,
      actions,
      metadata: {
        emailId: email.id,
        processed: true,
        actionCount: actions.length,
      },
    };

    logger.info("Task extraction completed", {
      emailId: email.id,
      actionCount: actions.length,
    });

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailId } = req.params;

    if (!emailId) {
      throw new AppError("Email ID is required", 400, "MISSING_EMAIL_ID");
    }

    logger.info("Getting email summary", { emailId });

    const email = await gmailService.getEmailContent(emailId);
    const summary = await aiService.summarizeEmail(email);
    const actions = await aiService.extractActionItems(email);

    const response = {
      email,
      summary,
      actions,
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
