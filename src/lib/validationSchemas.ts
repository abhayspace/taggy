import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .trim(),
  
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be less than 72 characters"),
  
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters")
    .trim(),
  
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  age: z
    .number()
    .int("Age must be a whole number")
    .min(13, "You must be at least 13 years old")
    .max(19, "You must be under 20 years old")
    .optional(),
  
  gender: z
    .string()
    .refine((val) => val === "male" || val === "female", {
      message: "Please select a valid gender",
    }),
  
  interests: z
    .array(
      z.string().min(1).max(30, "Each interest must be less than 30 characters")
    )
    .max(10, "You can have a maximum of 10 interests")
    .optional(),
});

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .trim(),
  
  password: z
    .string()
    .min(1, "Password is required"),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
