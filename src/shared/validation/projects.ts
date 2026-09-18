import * as z from "zod/mini";

const PROJECT_STATUS_VALUES = [
  "planning",
  "in_progress",
  "client_review",
  "changes_requested",
  "on_hold",
  "completed",
  "cancelled",
] as const;

const MILESTONE_STATUS_VALUES = ["pending", "in_progress", "completed"] as const;

export const createProjectSchema = z.object({
  clientId: z.string().check(z.trim(), z.minLength(1)),
  serviceEngagementId: z.string().check(z.trim(), z.minLength(1)),
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
  description: z.optional(z.string().check(z.trim(), z.maxLength(2000))),
  status: z.enum(PROJECT_STATUS_VALUES),
  progress: z.optional(z.number().check(z.gte(0), z.lte(100))),
  startDate: z.optional(z.string().check(z.minLength(1))),
  targetEndDate: z.optional(z.string().check(z.minLength(1))),
  milestones: z.array(
    z.object({
      title: z.string().check(z.trim()),
      status: z.enum(MILESTONE_STATUS_VALUES),
    }),
  ),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUS_VALUES),
  progress: z.optional(z.number().check(z.gte(0), z.lte(100))),
});

export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;
