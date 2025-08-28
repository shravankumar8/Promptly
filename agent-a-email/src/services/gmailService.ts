import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import type { EmailData } from "@email-calendar/shared";

class GmailService {
  private gmail: gmail_v1.Gmail | null = null;
  private oauth2Client: OAuth2Client | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (clientId && clientSecret) {
      this.oauth2Client = new OAuth2Client(clientId, clientSecret);
      this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
    } else {
      logger.warn(
        "Google OAuth credentials not provided, using mock Gmail service"
      );
    }
  }

  async getRecentEmails(
    maxResults: number = 10
  ): Promise<Array<{ id: string }>> {
    try {
      logger.info("Fetching recent emails", { maxResults });

      // For development/demo purposes, return mock data if no real Gmail client
      if (!this.gmail || !this.oauth2Client) {
        return this.getMockEmailList(maxResults);
      }

      const response = await this.gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: "is:unread category:primary", // Focus on unread emails in primary category
      });

      const messages = response.data.messages || [];

      logger.info(`Found ${messages.length} recent emails`);

      return messages.map((msg) => ({ id: msg.id! }));
    } catch (error) {
      logger.error("Failed to fetch recent emails:", error);

      if (error instanceof Error) {
        if (error.message.includes("invalid_grant")) {
          throw new AppError(
            "Gmail authentication expired, please re-authenticate",
            401,
            "GMAIL_AUTH_EXPIRED"
          );
        }
        if (error.message.includes("insufficient permissions")) {
          throw new AppError(
            "Insufficient permissions to access Gmail",
            403,
            "GMAIL_PERMISSIONS_ERROR"
          );
        }
      }

      // Fallback to mock data in case of error during development
      logger.info("Falling back to mock email data");
      return this.getMockEmailList(maxResults);
    }
  }

  async getEmailContent(messageId: string): Promise<EmailData> {
    try {
      logger.info("Fetching email content", { messageId });

      // For development/demo purposes, return mock data if no real Gmail client
      if (!this.gmail || !this.oauth2Client) {
        return this.getMockEmailContent(messageId);
      }

      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const message = response.data;
      const emailData = this.parseGmailMessage(message);

      logger.info("Successfully parsed email content", {
        emailId: emailData.id,
        subject: emailData.subject,
      });

      return emailData;
    } catch (error) {
      logger.error("Failed to fetch email content:", error);

      if (error instanceof Error && error.message.includes("Not Found")) {
        throw new AppError("Email not found", 404, "EMAIL_NOT_FOUND");
      }

      // Fallback to mock data
      return this.getMockEmailContent(messageId);
    }
  }

  private parseGmailMessage(message: gmail_v1.Schema$Message): EmailData {
    const headers = message.payload?.headers || [];

    const getHeader = (name: string): string => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      );
      return header?.value || "";
    };

    const subject = getHeader("Subject");
    const from = getHeader("From");
    const date = getHeader("Date");

    // Extract email body
    const body = this.extractEmailBody(message.payload);

    // Extract labels
    const labels = message.labelIds || [];

    return {
      id: message.id!,
      subject,
      from,
      body,
      threadId: message.threadId!,
      receivedAt: date ? new Date(date) : new Date(),
      isRead: !labels.includes("UNREAD"),
      labels,
    };
  }

  private extractEmailBody(
    payload: gmail_v1.Schema$MessagePart | undefined
  ): string {
    if (!payload) return "";

    // Handle multipart messages
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        // Look for text/plain first, then text/html
        if (part.mimeType === "text/plain" && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
      }

      // Fallback to HTML if no plain text found
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return this.stripHtmlTags(this.decodeBase64(part.body.data));
        }
      }

      // Recursively check nested parts
      for (const part of payload.parts) {
        const nestedBody = this.extractEmailBody(part);
        if (nestedBody) return nestedBody;
      }
    }

    // Handle single part messages
    if (payload.body?.data) {
      const decoded = this.decodeBase64(payload.body.data);

      if (payload.mimeType === "text/html") {
        return this.stripHtmlTags(decoded);
      }

      return decoded;
    }

    return "";
  }

  private decodeBase64(data: string): string {
    try {
      // Gmail uses URL-safe base64 encoding
      const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(normalized, "base64").toString("utf-8");
    } catch (error) {
      logger.error("Failed to decode base64 email body:", error);
      return "";
    }
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  // Mock data methods for development/demo
  private getMockEmailList(maxResults: number): Array<{ id: string }> {
    const mockEmails = [
      { id: "mock_email_1" },
      { id: "mock_email_2" },
      { id: "mock_email_3" },
      { id: "mock_email_4" },
      { id: "mock_email_5" },
    ];

    return mockEmails.slice(0, maxResults);
  }

  private getMockEmailContent(messageId: string): EmailData {
    const mockEmails: Record<string, EmailData> = {
      mock_email_1: {
        id: "mock_email_1",
        subject: "Project Review Meeting - Tomorrow 2PM",
        from: "alice@company.com (Alice Johnson)",
        body: "Hi Team,\n\nCan we schedule a project review meeting for tomorrow at 2 PM? We need to go over the Q4 deliverables and discuss next steps.\n\nPlease confirm your attendance.\n\nBest,\nAlice",
        threadId: "thread_1",
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: false,
        labels: ["INBOX", "UNREAD", "CATEGORY_PRIMARY"],
      },
      mock_email_2: {
        id: "mock_email_2",
        subject: "Deadline Reminder: Budget Report Due Friday",
        from: "finance@company.com (Finance Team)",
        body: "This is a reminder that the Q4 budget report is due this Friday, December 15th, by 5 PM.\n\nPlease submit your reports to the finance portal before the deadline.\n\nIf you have any questions, contact the finance team.\n\nThank you,\nFinance Team",
        threadId: "thread_2",
        receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        isRead: false,
        labels: ["INBOX", "UNREAD", "CATEGORY_PRIMARY"],
      },
      mock_email_3: {
        id: "mock_email_3",
        subject: "Follow-up: Client Presentation Feedback",
        from: "bob@company.com (Bob Wilson)",
        body: "Hi,\n\nI wanted to follow up on the client presentation from last week. The client had some feedback that we should address:\n\n1. Update the pricing model\n2. Include more case studies\n3. Schedule a follow-up call next week\n\nLet's discuss this in our next team meeting.\n\nThanks,\nBob",
        threadId: "thread_3",
        receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        isRead: false,
        labels: ["INBOX", "UNREAD", "CATEGORY_PRIMARY"],
      },
      mock_email_4: {
        id: "mock_email_4",
        subject: "Welcome to the team!",
        from: "hr@company.com (HR Department)",
        body: "Welcome to the team! We're excited to have you on board.\n\nYour first day orientation is scheduled for Monday, December 18th at 9 AM in Conference Room A.\n\nPlease bring your ID and any required documents.\n\nLooking forward to working with you!\n\nBest regards,\nHR Team",
        threadId: "thread_4",
        receivedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        isRead: false,
        labels: ["INBOX", "UNREAD", "CATEGORY_PRIMARY"],
      },
      mock_email_5: {
        id: "mock_email_5",
        subject: "Monthly Team Standup - Schedule Change",
        from: "sarah@company.com (Sarah Davis)",
        body: "Hi everyone,\n\nJust a quick update that our monthly team standup has been moved from Wednesday to Thursday at 10 AM due to the holiday schedule.\n\nThe meeting will still be in the main conference room. Please update your calendars accordingly.\n\nSee you all there!\n\nSarah",
        threadId: "thread_5",
        receivedAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
        isRead: false,
        labels: ["INBOX", "UNREAD", "CATEGORY_PRIMARY"],
      },
    };

    return (
      mockEmails[messageId] || {
        id: messageId,
        subject: "Mock Email Subject",
        from: "mock@example.com",
        body: "This is a mock email body for demonstration purposes.",
        threadId: "mock_thread",
        receivedAt: new Date(),
        isRead: false,
        labels: ["INBOX", "UNREAD"],
      }
    );
  }

  // Method to set OAuth tokens (call this after user authentication)
  setCredentials(tokens: any) {
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials(tokens);
      logger.info("Gmail OAuth credentials updated");
    }
  }

  // Method to get authentication URL for OAuth flow
  getAuthUrl(): string | null {
    if (!this.oauth2Client) return null;

    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });
  }
}

export const gmailService = new GmailService();
