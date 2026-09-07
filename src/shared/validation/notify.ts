import * as z from "zod/mini";

// zod/mini (not the classic "zod" import) — the classic build isn't tree-shakeable
// on the client and alone blew ~90kB gzip past the 12kB shared budget.
// .check() applies trim/toLowerCase before the length/format checks run.
export const notifySchema = z.object({
  email: z.string().check(
    z.trim(),
    z.toLowerCase(),
    z.maxLength(254),
    z.email(),
  ),
});

export type NotifyInput = z.infer<typeof notifySchema>;
