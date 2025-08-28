import OpenAI from "openai";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import type { EmailData, ActionItem } from "@email-calendar/shared";

class AIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({ apiKey });
  }

  async summarizeEmail(email: EmailData): Promise<string> {
    try {
      logger.info("Summarizing email", { emailId: email.id });

      const prompt = this.buildSummarizationPrompt(email);

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes emails concisely and professionally.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
        presence_penalty: 0.1,
      });

      const summary = response.choices[0]?.message?.content?.trim() || "";

      if (!summary) {
        logger.warn("Empty summary generated for email", { emailId: email.id });
        return "Unable to generate summary for this email.";
      }

      logger.info("Successfully generated email summary", {
        emailId: email.id,
        summaryLength: summary.length,
      });

      return summary;
    } catch (error) {
      logger.error("Failed to summarize email:", error);

      if (error instanceof Error && error.message.includes("rate_limit")) {
        throw new AppError(
          "OpenAI rate limit exceeded",
          429,
          "RATE_LIMIT_EXCEEDED"
        );
      }

      if (
        error instanceof Error &&
        error.message.includes("insufficient_quota")
      ) {
        throw new AppError("OpenAI quota exceeded", 429, "QUOTA_EXCEEDED");
      }

      throw new AppError(
        "Failed to generate email summary",
        500,
        "AI_SUMMARIZATION_FAILED"
      );
    }
  }

  async extractActionItems(email: EmailData): Promise<ActionItem[]> {
    try {
      logger.info("Extracting action items from email", { emailId: email.id });

      const prompt = this.buildActionExtractionPrompt(email);

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts actionable items from emails. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 400,
        temperature: 0.1,
        presence_penalty: 0.1,
      });

      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        logger.warn("Empty response from action extraction", {
          emailId: email.id,
        });
        return [];
      }

      try {
        const actions = JSON.parse(content) as ActionItem[];

        // Validate and enhance the extracted actions
        const validActions = this.validateAndEnhanceActions(actions, email);

        logger.info("Successfully extracted action items", {
          emailId: email.id,
          actionCount: validActions.length,
        });

        return validActions;
      } catch (parseError) {
        logger.error("Failed to parse action items JSON:", parseError);
        logger.debug("Raw AI response:", content);

        // Fallback: try to extract actions using simple regex patterns
        return this.extractActionsWithRegex(email);
      }
    } catch (error) {
      logger.error("Failed to extract action items:", error);

      if (error instanceof Error && error.message.includes("rate_limit")) {
        throw new AppError(
          "OpenAI rate limit exceeded",
          429,
          "RATE_LIMIT_EXCEEDED"
        );
      }

      throw new AppError(
        "Failed to extract action items",
        500,
        "AI_EXTRACTION_FAILED"
      );
    }
  }

  private buildSummarizationPrompt(email: EmailData): string {
    return `
Please summarize the following email in 2-3 clear, concise sentences. Focus on the main purpose and key information:

Subject: ${email.subject}
From: ${email.from}
Date: ${email.receivedAt}

Email Body:
${email.body.substring(0, 2000)} ${email.body.length > 2000 ? "..." : ""}

Summary:`;
  }

  private buildActionExtractionPrompt(email: EmailData): string {
    return `
Extract actionable items from the following email that should be added to a calendar. 
Return ONLY a JSON array of objects with the structure: [{title, description, suggestedDate, priority, type, attendees}]

Guidelines:
- Only include items with clear deadlines, meetings, or follow-up actions
- Use ISO 8601 format for suggestedDate (e.g., "2023-12-25T14:00:00Z")
- Priority: "low", "medium", or "high"
- Type: "meeting", "deadline", "followup", or "reminder"
- If no specific date is mentioned, omit the suggestedDate field
- Extract email addresses for attendees if mentioned

Subject: ${email.subject}
From: ${email.from}
Date: ${email.receivedAt}

Email Body:
${email.body.substring(0, 1500)} ${email.body.length > 1500 ? "..." : ""}

JSON Array:`;
  }

  private validateAndEnhanceActions(
    actions: any[],
    email: EmailData
  ): ActionItem[] {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions
      .filter((action) => action && typeof action === "object" && action.title)
      .map((action, index) => ({
        id: `${email.id}_action_${index}`,
        title: String(action.title).trim(),
        description: action.description
          ? String(action.description).trim()
          : undefined,
        suggestedDate: this.validateDate(action.suggestedDate),
        priority: this.validatePriority(action.priority),
        type: this.validateType(action.type),
        attendees: Array.isArray(action.attendees)
          ? action.attendees.filter(
              (email) => typeof email === "string" && email.includes("@")
            )
          : undefined,
      }))
      .filter((action) => action.title.length > 0);
  }

  private validateDate(date: any): string | undefined {
    if (!date || typeof date !== "string") return undefined;

    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return undefined;

      // Check if date is in the future
      if (parsed < new Date()) return undefined;

      return parsed.toISOString();
    } catch {
      return undefined;
    }
  }

  private validatePriority(priority: any): "low" | "medium" | "high" {
    const validPriorities = ["low", "medium", "high"];
    return validPriorities.includes(priority) ? priority : "medium";
  }

  private validateType(
    type: any
  ): "meeting" | "deadline" | "followup" | "reminder" {
    const validTypes = ["meeting", "deadline", "followup", "reminder"];
    return validTypes.includes(type) ? type : "reminder";
  }

  private extractActionsWithRegex(email: EmailData): ActionItem[] {
    logger.info("Falling back to regex-based action extraction", {
      emailId: email.id,
    });

    const actions: ActionItem[] = [];
    const text = `${email.subject} ${email.body}`.toLowerCase();

    // Simple patterns for common action items
    const patterns = [
      /meeting.*?(?:tomorrow|next week|monday|tuesday|wednesday|thursday|friday)/gi,
      /deadline.*?(?:today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday)/gi,
      /follow.?up.*?(?:next week|monday|tuesday|wednesday|thursday|friday)/gi,
      /call.*?(?:today|tomorrow|next week)/gi,
      /review.*?(?:by|before|deadline)/gi,
    ];

    patterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match, matchIndex) => {
          actions.push({
            id: `${email.id}_regex_${index}_${matchIndex}`,
            title: match.trim(),
            priority: "medium",
            type: "reminder",
          });
        });
      }
    });

    return actions.slice(0, 3); // Limit to 3 regex-extracted actions
  }
}

export const aiService = new AIService();
