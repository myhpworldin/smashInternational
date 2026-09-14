import type { Role } from "@/shared/types/user";

// Frontend-foundation shape for Phase 2 (UI only). Mirrors the fields the
// Phase 1 audit identified as needed on the real `users` collection —
// `status`, `lastLoginAt`, `mustChangePassword`, `name`, `phone` don't exist
// on UserDoc yet, so this type is intentionally separate from it rather than
// extending it, and every row using it is placeholder data pending backend.
export type AdminUserStatus = "active" | "blocked";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AdminUserStatus;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export const ADMIN_USER_ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  client: "Client",
};

export const ADMIN_USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Active",
  blocked: "Blocked",
};

// Shape of POST /api/admin/users' success response (Phase 3). `createdAt`
// travels as an ISO string over JSON — server-side callers get a real
// Date back from the service/repo layer instead.
export type CreatedAdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AdminUserStatus;
  mustChangePassword: true;
  createdAt: string;
};

