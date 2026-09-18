import * as z from "zod/mini";

const ROLE_VALUES = ["admin", "client", "staff"] as const;
const STATUS_VALUES = ["active", "blocked"] as const;

export const createUserByAdminSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
  phone: z.optional(z.string().check(z.trim(), z.maxLength(30))),
  role: z.enum(ROLE_VALUES),
  status: z.optional(z.enum(STATUS_VALUES)),
});

export type CreateUserByAdminInput = z.infer<typeof createUserByAdminSchema>;

// Deliberately excludes role, status, and password — each of those has
// its own endpoint/schema below so a generic "edit" can never touch a
// security-sensitive field.
export const updateUserProfileSchema = z.object({
  name: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(200))),
  email: z.optional(z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email())),
  phone: z.optional(z.string().check(z.trim(), z.maxLength(30))),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const changeUserRoleSchema = z.object({
  role: z.enum(ROLE_VALUES),
});

export const changeUserStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
});
