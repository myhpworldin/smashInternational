import * as z from "zod/mini";

export const loginSchema = z.object({
  email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
  password: z.string().check(z.minLength(8), z.maxLength(200)),
});

export type LoginInput = z.infer<typeof loginSchema>;

// The signup API only ever receives {email, password} — confirmPassword
// is purely a frontend UX check (see signupSchema below) that never needs
// to reach the server. Same shape and rules as loginSchema, so it's
// literally that schema under a name that reads correctly at its actual
// call site (the signup route), not a coincidence to keep in sync by hand.
export const signupRequestSchema = loginSchema;

export const signupSchema = z
  .object({
    email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
    password: z.string().check(z.minLength(8), z.maxLength(200)),
    confirmPassword: z.string().check(z.minLength(8), z.maxLength(200)),
  })
  .check(
    z.refine((val) => val.password === val.confirmPassword, "Passwords do not match"),
  );

export type SignupInput = z.infer<typeof signupSchema>;

const OTP_CODE_PATTERN = /^\d{6}$/;

export const verifyOtpSchema = z.object({
  email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
  code: z.string().check(z.trim(), z.refine((v) => OTP_CODE_PATTERN.test(v), "Enter the 6-digit code")),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

// Same shape as signup's resend/verify schemas, named for where login's
// OTP routes actually use them — same alias reasoning as
// signupRequestSchema above.
export const loginOtpRequestSchema = resendOtpSchema;
export const loginOtpVerifySchema = verifyOtpSchema;
