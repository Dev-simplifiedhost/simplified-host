import { z } from "zod";

/**
 * Centralized validation schemas for event planning
 */

// Natural Language Screen Validation
export const naturalLanguageInputSchema = z.object({
  userInput: z
    .string()
    .trim()
    .min(1, "Event description is required")
    .max(1000, "Description must be less than 1000 characters")
    .refine(
      (val) => val.trim().length > 0,
      "Description cannot be only whitespace"
    ),
  guestCount: z
    .number()
    .int("Guest count must be a whole number")
    .min(1, "Guest count must be at least 1")
    .max(500, "Guest count cannot exceed 500")
    .optional(),
  eventDate: z
    .date()
    .min(new Date(new Date().setHours(0, 0, 0, 0)), "Event date cannot be in the past")
    .optional(),
});

// Review & Customize Screen Validation
export const eventDetailsSchema = z.object({
  eventName: z
    .string()
    .trim()
    .min(1, "Event name is required")
    .max(100, "Event name must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters"),
  eventDate: z
    .date()
    .min(new Date(new Date().setHours(0, 0, 0, 0)), "Event date cannot be in the past")
    .optional(),
  location: z
    .string()
    .max(200, "Location must be less than 200 characters")
    .optional(),
});

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(200, "Task title must be less than 200 characters"),
  description: z
    .string()
    .max(500, "Task description must be less than 500 characters")
    .optional(),
  priority: z.enum(["low", "medium", "high"]),
  timelineGroup: z.string(),
  category: z.string().optional(),
});

export const itemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Item name is required")
    .max(100, "Item name must be less than 100 characters"),
  category: z.string(),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(1000, "Quantity cannot exceed 1000"),
  notes: z
    .string()
    .max(300, "Notes must be less than 300 characters")
    .optional(),
});

// Type exports for TypeScript
export type NaturalLanguageInput = z.infer<typeof naturalLanguageInputSchema>;
export type EventDetails = z.infer<typeof eventDetailsSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Item = z.infer<typeof itemSchema>;
