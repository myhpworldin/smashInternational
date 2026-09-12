import * as z from "zod/mini";

export const loginSchema = z.object({
  email: z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254), z.email()),
  password: z.string().check(z.minLength(8), z.maxLength(200)),
});

export type LoginInput = z.infer<typeof loginSchema>;
