import { z } from 'zod';

// Schema for POST /api/auth/register
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters long").max(100, "Name must be at most 100 characters long"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long")
                    .regex(/[A-Z]/, "Must contain uppercase letter")
                    .regex(/[0-9]/, "Must contain number"),
  })
});

// Schema for POST /api/auth/login
export const loginSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];