import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import { calendarService } from "../services/calendarService.js";
import { validateCreateEventsRequest } from "../middleware/validation.middleware.js";
import type { CalendarEvent, CreateEventRequest } from "@email-calendar/shared";

export const createEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request
    const { error, value } = validateCreateEventsRequest(req.body);
    if (error) {
      throw new AppError(
        "Invalid request parameters",
        400,
        "VALIDATION_ERROR",
        error.details
      );
    }

    const { events } = value;
    const agentA = req.get("X-Agent") === "agent-a-email";
    const userInfo = (req as any).user;

    logger.info("Creating calendar events", {
      eventCount: events.length,
      userId: userInfo?.userId,
      fromAgentA: agentA,
      scopes: userInfo?.scopes,
    });

    if (events.length === 0) {
      res.json({
        success: true,
        data: { created: [] },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate that we have the required scope
    if (!userInfo?.scopes?.includes("calendar.write")) {
      throw new AppError(
        "Insufficient permissions for calendar operations",
        403,
        "INSUFFICIENT_SCOPE"
      );
    }

    const createdEvents: CalendarEvent[] = [];
    const errors: Array<{ event: any; error: string }> = [];

    // Process each event
    for (let i = 0; i < events.length; i++) {
      const eventData = events[i];

      try {
        // Validate and enhance event data
        const enhancedEvent = await enhanceEventData(eventData);

        // Create the calendar event
        const createdEvent = await calendarService.createEvent(enhancedEvent);
        createdEvents.push(createdEvent);

        logger.info(`Successfully created calendar event`, {
          eventId: createdEvent.id,
          title: createdEvent.title,
          startTime: createdEvent.startTime,
        });
      } catch (eventError) {
        const errorMessage =
          eventError instanceof Error ? eventError.message : "Unknown error";
        errors.push({ event: eventData, error: errorMessage });

        logger.error(`Failed to create calendar event:`, {
          eventIndex: i,
          eventTitle: eventData.title,
          error: errorMessage,
        });
      }
    }

    // Prepare response
    const response = {
      created: createdEvents,
      totalRequested: events.length,
      totalCreated: createdEvents.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    logger.info("Calendar events creation completed", {
      totalRequested: response.totalRequested,
      totalCreated: response.totalCreated,
      errorCount: errors.length,
    });

    const status = errors.length > 0 && createdEvents.length === 0 ? 207 : 200; // Multi-status or success

    res.status(status).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const listEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userInfo = (req as any).user;
    const maxResults = Math.min(
      parseInt(req.query.maxResults as string) || 10,
      50
    );
    const timeMin = req.query.timeMin as string;

    logger.info("Listing calendar events", {
      userId: userInfo?.userId,
      maxResults,
      timeMin,
    });

    // Validate that we have the required scope
    if (!userInfo?.scopes?.includes("calendar.read")) {
      throw new AppError(
        "Insufficient permissions for calendar read operations",
        403,
        "INSUFFICIENT_SCOPE"
      );
    }

    const events = await calendarService.listUpcomingEvents(
      maxResults,
      timeMin
    );

    logger.info("Successfully retrieved calendar events", {
      eventCount: events.length,
    });

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
        maxResults,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userInfo = (req as any).user;

    if (!eventId) {
      throw new AppError("Event ID is required", 400, "MISSING_EVENT_ID");
    }

    logger.info("Getting calendar event", {
      eventId,
      userId: userInfo?.userId,
    });

    // Validate that we have the required scope
    if (!userInfo?.scopes?.includes("calendar.read")) {
      throw new AppError(
        "Insufficient permissions for calendar read operations",
        403,
        "INSUFFICIENT_SCOPE"
      );
    }

    const event = await calendarService.getEvent(eventId);

    if (!event) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
    }

    res.json({
      success: true,
      data: { event },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;
    const userInfo = (req as any).user;

    if (!eventId) {
      throw new AppError("Event ID is required", 400, "MISSING_EVENT_ID");
    }

    logger.info("Updating calendar event", {
      eventId,
      userId: userInfo?.userId,
    });

    // Validate that we have the required scope
    if (!userInfo?.scopes?.includes("calendar.write")) {
      throw new AppError(
        "Insufficient permissions for calendar write operations",
        403,
        "INSUFFICIENT_SCOPE"
      );
    }

    const updatedEvent = await calendarService.updateEvent(eventId, updateData);

    if (!updatedEvent) {
      throw new AppError(
        "Event not found or update failed",
        404,
        "EVENT_UPDATE_FAILED"
      );
    }

    logger.info("Successfully updated calendar event", {
      eventId: updatedEvent.id,
      title: updatedEvent.title,
    });

    res.json({
      success: true,
      data: { event: updatedEvent },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userInfo = (req as any).user;

    if (!eventId) {
      throw new AppError("Event ID is required", 400, "MISSING_EVENT_ID");
    }

    logger.info("Deleting calendar event", {
      eventId,
      userId: userInfo?.userId,
    });

    // Validate that we have the required scope
    if (!userInfo?.scopes?.includes("calendar.write")) {
      throw new AppError(
        "Insufficient permissions for calendar write operations",
        403,
        "INSUFFICIENT_SCOPE"
      );
    }

    const deleted = await calendarService.deleteEvent(eventId);

    if (!deleted) {
      throw new AppError(
        "Event not found or deletion failed",
        404,
        "EVENT_DELETE_FAILED"
      );
    }

    logger.info("Successfully deleted calendar event", { eventId });

    res.json({
      success: true,
      data: { deleted: true, eventId },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to enhance event data with defaults and validation
async function enhanceEventData(eventData: any): Promise<CreateEventRequest> {
  const now = new Date();

  // Default to 1 hour from now if no start time specified
  const defaultStartTime = new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEndTime = new Date(defaultStartTime.getTime() + 60 * 60 * 1000);

  return {
    title: eventData.title || "Untitled Event",
    description: eventData.description || "",
    startTime: eventData.startTime || defaultStartTime.toISOString(),
    endTime: eventData.endTime || defaultEndTime.toISOString(),
    attendees: Array.isArray(eventData.attendees)
      ? eventData.attendees.filter(
          (email: any) => typeof email === "string" && email.includes("@")
        )
      : [],
    location: eventData.location || "",
    reminders: eventData.reminders || {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 24 hours before
        { method: "popup", minutes: 15 }, // 15 minutes before
      ],
    },
  };
}
