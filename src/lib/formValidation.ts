import { z } from 'zod';

/**
 * Comprehensive Form Validation Schemas
 * Provides strict validation rules to prevent malicious input
 */

// Name validation (2-100 characters, no special characters except spaces, hyphens, apostrophes)
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð]+$/, 
    'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform(val => val.trim());

// Email validation with additional security checks
export const emailSchema = z
  .string()
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters')
  .email('Please enter a valid email address')
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format')
  .transform(val => val.toLowerCase().trim());

// Password validation (8+ chars, with strength requirements)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Event name validation
export const eventNameSchema = z
  .string()
  .min(3, 'Event name must be at least 3 characters')
  .max(200, 'Event name must be less than 200 characters')
  .transform(val => val.trim());

// Event description validation
export const eventDescriptionSchema = z
  .string()
  .max(5000, 'Description must be less than 5000 characters')
  .optional()
  .transform(val => val?.trim() || '');

// Location validation
export const locationSchema = z
  .string()
  .min(3, 'Location must be at least 3 characters')
  .max(500, 'Location must be less than 500 characters')
  .optional()
  .transform(val => val?.trim());

// Message/Note validation (for guest messages, item notes, etc.)
export const messageSchema = z
  .string()
  .max(1000, 'Message must be less than 1000 characters')
  .optional()
  .transform(val => val?.trim() || '');

// Item name validation
export const itemNameSchema = z
  .string()
  .min(2, 'Item name must be at least 2 characters')
  .max(200, 'Item name must be less than 200 characters')
  .transform(val => val.trim());

// Category validation
export const categorySchema = z
  .string()
  .max(50, 'Category must be less than 50 characters')
  .optional()
  .transform(val => val?.trim());

// Quantity validation
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(9999, 'Quantity must be less than 10,000');

// Event code validation (6 characters, alphanumeric)
export const eventCodeSchema = z
  .string()
  .length(6, 'Event code must be exactly 6 characters')
  .regex(/^[A-Z0-9]{6}$/, 'Event code must contain only letters and numbers')
  .transform(val => val.toUpperCase());

// Phone number validation (international support)
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      // Allow international format with +
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length >= 7 && cleaned.length <= 15;
    },
    { message: "Please enter a valid phone number" }
  );

// URL validation
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .max(2000, 'URL must be less than 2000 characters')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  )
  .optional();

// Guest count validation
export const guestCountSchema = z
  .number()
  .int('Guest count must be a whole number')
  .min(1, 'Guest count must be at least 1')
  .max(10000, 'Guest count must be less than 10,000')
  .optional();

/**
 * Complete form validation schemas
 */

// RSVP Form Schema
export const rsvpFormSchema = z.object({
  guestName: nameSchema,
  guestEmail: emailSchema.optional().or(z.literal('')),
  rsvpStatus: z.enum(['attending', 'maybe', 'not_attending'], {
    required_error: 'Please select your RSVP status'
  }),
  message: messageSchema,
  additionalGuests: z.array(
    z.string()
      .min(1, 'Guest name cannot be empty')
      .max(100, 'Guest name must be less than 100 characters')
      .transform(val => val.trim())
  ).max(20, 'Cannot have more than 20 additional guests').optional(),
});

// Item Claim Form Schema
export const itemClaimSchema = z.object({
  itemName: itemNameSchema,
  category: categorySchema,
  notes: messageSchema,
  guestName: nameSchema,
});

// Auth Sign Up Schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Auth Sign In Schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Event Creation Schema
export const eventCreationSchema = z.object({
  name: eventNameSchema,
  description: eventDescriptionSchema,
  eventDate: z.date().optional(),
  location: locationSchema,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  maxAttendees: quantitySchema.optional(),
  rsvpDeadline: z.date().optional(),
});

// Task Schema
export const taskFormSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters').max(200, 'Task title must be less than 200 characters'),
  description: eventDescriptionSchema,
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

// Announcement Schema
export const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be less than 200 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message must be less than 5000 characters'),
  category: z.enum(['general', 'important', 'reminder', 'update']).optional(),
});
