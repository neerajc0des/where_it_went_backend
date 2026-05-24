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

// forgot password and reset password
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[0-9]/, "Must contain number"),
  })
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
  })
})

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResendVerificationEmailInput = z.infer<typeof resendVerificationSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];