import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import type { CalendarEvent, CreateEventRequest } from "@email-calendar/shared";

class CalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private oauth2Client: OAuth2Client | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (clientId && clientSecret) {
      this.oauth2Client = new OAuth2Client(clientId, clientSecret);
      this.calendar = google.calendar({
        version: "v3",
        auth: this.oauth2Client,
      });
    } else {
      logger.warn(
        "Google OAuth credentials not provided, using mock calendar service"
      );
    }
  }

  async createEvent(eventData: CreateEventRequest): Promise<CalendarEvent> {
    try {
      logger.info("Creating calendar event", { title: eventData.title });

      // For development/demo purposes, return mock data if no real calendar client
      if (!this.calendar || !this.oauth2Client) {
        return this.createMockEvent(eventData);
      }

      // Prepare the event object for Google Calendar API
      const calendarEvent: calendar_v3.Schema$Event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startTime,
          timeZone: "UTC",
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: "UTC",
        },
        attendees: eventData.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: eventData.reminders?.useDefault ?? false,
          overrides: eventData.reminders?.overrides?.map((reminder) => ({
            method: reminder.method,
            minutes: reminder.minutes,
          })),
        },
        // Additional metadata
        source: {
          title: "Email Calendar Agent",
          url: process.env.FRONTEND_URL || "http://localhost:5173",
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        resource: calendarEvent,
        sendUpdates: "all", // Send invitations to attendees
      });

      if (!response.data.id) {
        throw new AppError(
          "Failed to create calendar event - no ID returned",
          500,
          "CALENDAR_CREATE_FAILED"
        );
      }

      const createdEvent = this.mapToCalendarEvent(response.data);

      logger.info("Successfully created Google Calendar event", {
        eventId: createdEvent.id,
        title: createdEvent.title,
        startTime: createdEvent.startTime,
      });

      return createdEvent;
    } catch (error) {
      logger.error("Failed to create calendar event:", error);

      if (error instanceof Error) {
        if (error.message.includes("invalid_grant")) {
          throw new AppError(
            "Calendar authentication expired, please re-authenticate",
            401,
            "CALENDAR_AUTH_EXPIRED"
          );
        }
        if (error.message.includes("insufficient permissions")) {
          throw new AppError(
            "Insufficient permissions to create calendar events",
            403,
            "CALENDAR_PERMISSIONS_ERROR"
          );
        }
        if (error.message.includes("Invalid value")) {
          throw new AppError(
            "Invalid event data provided",
            400,
            "INVALID_EVENT_DATA"
          );
        }
      }

      // Fallback to mock event in case of error during development
      logger.info("Falling back to mock event creation");
      return this.createMockEvent(eventData);
    }
  }

  async listUpcomingEvents(
    maxResults: number = 10,
    timeMin?: string
  ): Promise<CalendarEvent[]> {
    try {
      logger.info("Listing upcoming calendar events", { maxResults, timeMin });

      // For development/demo purposes, return mock data if no real calendar client
      if (!this.calendar || !this.oauth2Client) {
        return this.getMockEvents(maxResults);
      }

      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin || new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      const calendarEvents = events
        .filter((event) => event.id && event.summary) // Filter out invalid events
        .map((event) => this.mapToCalendarEvent(event));

      logger.info(
        `Successfully retrieved ${calendarEvents.length} calendar events`
      );

      return calendarEvents;
    } catch (error) {
      logger.error("Failed to list calendar events:", error);

      // Fallback to mock events
      return this.getMockEvents(maxResults);
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      logger.info("Getting calendar event", { eventId });

      // For development/demo purposes, return mock data if no real calendar client
      if (!this.calendar || !this.oauth2Client) {
        return this.getMockEvent(eventId);
      }

      const response = await this.calendar.events.get({
        calendarId: "primary",
        eventId,
      });

      if (!response.data) {
        return null;
      }

      const event = this.mapToCalendarEvent(response.data);

      logger.info("Successfully retrieved calendar event", {
        eventId: event.id,
        title: event.title,
      });

      return event;
    } catch (error) {
      logger.error("Failed to get calendar event:", error);

      if (error instanceof Error && error.message.includes("Not Found")) {
        return null;
      }

      // Fallback to mock event
      return this.getMockEvent(eventId);
    }
  }

  async updateEvent(
    eventId: string,
    updateData: Partial<CreateEventRequest>
  ): Promise<CalendarEvent | null> {
    try {
      logger.info("Updating calendar event", { eventId, updateData });

      // For development/demo purposes, return mock data if no real calendar client
      if (!this.calendar || !this.oauth2Client) {
        return this.updateMockEvent(eventId, updateData);
      }

      // First, get the existing event
      const existingEvent = await this.calendar.events.get({
        calendarId: "primary",
        eventId,
      });

      if (!existingEvent.data) {
        return null;
      }

      // Prepare the update object
      const updates: calendar_v3.Schema$Event = {
        ...existingEvent.data,
        summary: updateData.title ?? existingEvent.data.summary,
        description: updateData.description ?? existingEvent.data.description,
        location: updateData.location ?? existingEvent.data.location,
      };

      if (updateData.startTime) {
        updates.start = { dateTime: updateData.startTime, timeZone: "UTC" };
      }

      if (updateData.endTime) {
        updates.end = { dateTime: updateData.endTime, timeZone: "UTC" };
      }

      if (updateData.attendees) {
        updates.attendees = updateData.attendees.map((email) => ({ email }));
      }

      const response = await this.calendar.events.update({
        calendarId: "primary",
        eventId,
        resource: updates,
      });

      if (!response.data) {
        return null;
      }

      const updatedEvent = this.mapToCalendarEvent(response.data);

      logger.info("Successfully updated calendar event", {
        eventId: updatedEvent.id,
        title: updatedEvent.title,
      });

      return updatedEvent;
    } catch (error) {
      logger.error("Failed to update calendar event:", error);

      if (error instanceof Error && error.message.includes("Not Found")) {
        return null;
      }

      // Fallback to mock update
      return this.updateMockEvent(eventId, updateData);
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      logger.info("Deleting calendar event", { eventId });

      // For development/demo purposes, return success if no real calendar client
      if (!this.calendar || !this.oauth2Client) {
        logger.info("Mock calendar event deletion successful");
        return true;
      }

      await this.calendar.events.delete({
        calendarId: "primary",
        eventId,
      });

      logger.info("Successfully deleted calendar event", { eventId });
      return true;
    } catch (error) {
      logger.error("Failed to delete calendar event:", error);

      if (error instanceof Error && error.message.includes("Not Found")) {
        return false;
      }

      throw new AppError(
        "Failed to delete calendar event",
        500,
        "CALENDAR_DELETE_FAILED"
      );
    }
  }

  private mapToCalendarEvent(
    googleEvent: calendar_v3.Schema$Event
  ): CalendarEvent {
    return {
      id: googleEvent.id!,
      title: googleEvent.summary || "Untitled Event",
      description: googleEvent.description,
      startTime:
        googleEvent.start?.dateTime ||
        googleEvent.start?.date ||
        new Date().toISOString(),
      endTime:
        googleEvent.end?.dateTime ||
        googleEvent.end?.date ||
        new Date().toISOString(),
      attendees: googleEvent.attendees
        ?.map((attendee) => attendee.email!)
        .filter(Boolean),
      location: googleEvent.location,
      htmlLink: googleEvent.htmlLink,
      status:
        (googleEvent.status as "confirmed" | "tentative" | "cancelled") ||
        "confirmed",
    };
  }

  // Mock methods for development/demo
  private createMockEvent(eventData: CreateEventRequest): CalendarEvent {
    const mockId = `mock_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: mockId,
      title: eventData.title,
      description: eventData.description,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      attendees: eventData.attendees,
      location: eventData.location,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${mockId}`,
      status: "confirmed",
    };
  }

  private getMockEvents(maxResults: number): CalendarEvent[] {
    const now = new Date();
    const mockEvents: CalendarEvent[] = [];

    for (let i = 0; i < Math.min(maxResults, 5); i++) {
      const startTime = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      mockEvents.push({
        id: `mock_event_${i + 1}`,
        title: `Mock Event ${i + 1}`,
        description: `This is a mock calendar event for demonstration purposes.`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        htmlLink: `https://calendar.google.com/calendar/event?eid=mock_event_${
          i + 1
        }`,
        status: "confirmed",
      });
    }

    return mockEvents;
  }

  private getMockEvent(eventId: string): CalendarEvent {
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    return {
      id: eventId,
      title: `Mock Event: ${eventId}`,
      description: "This is a mock calendar event for demonstration purposes.",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
      status: "confirmed",
    };
  }

  private updateMockEvent(
    eventId: string,
    updateData: Partial<CreateEventRequest>
  ): CalendarEvent {
    const baseEvent = this.getMockEvent(eventId);

    return {
      ...baseEvent,
      title: updateData.title || baseEvent.title,
      description: updateData.description || baseEvent.description,
      startTime: updateData.startTime || baseEvent.startTime,
      endTime: updateData.endTime || baseEvent.endTime,
      attendees: updateData.attendees || baseEvent.attendees,
      location: updateData.location || baseEvent.location,
    };
  }

  // Method to set OAuth tokens (call this after user authentication)
  setCredentials(tokens: any) {
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials(tokens);
      logger.info("Calendar OAuth credentials updated");
    }
  }
}

export const calendarService = new CalendarService();
