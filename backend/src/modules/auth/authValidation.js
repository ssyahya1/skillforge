
import { z } from "zod";

export const signupSchema = z.strictObject({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be no more than 72 characters"),
  display_name: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(60, "Display name must be no more than 60 characters"),
});

export const loginSchema = z.strictObject({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(72),
});

export const resetPasswordSchema = z.strictObject({
  email: z.string().trim().email("Enter a valid email address").max(254),
});

export const updatePasswordSchema = z.strictObject({
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
