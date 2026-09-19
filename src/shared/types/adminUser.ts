import type { Role, StaffAvailability } from "@/shared/types/user";
import type { OnboardingProgressState } from "@/lib/routing/clientDestination";

export type { StaffAvailability };

export const STAFF_AVAILABILITY_VALUES: StaffAvailability[] = ["available", "on_leave", "unavailable", "departed"];

export const STAFF_AVAILABILITY_LABEL: Record<StaffAvailability, string> = {
  available: "Available",
  on_leave: "On Leave",
  unavailable: "Unavailable",
  departed: "Departed",
};

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
  // Only ever set for role: "staff" — undefined for admin/client rows.
  availability?: StaffAvailability;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  // Only ever set for role: "client" (Stage 1 Phase 29) — feeds the "Fill
  // Onboarding"/"Continue Onboarding"/"View Submission" action in
  // UserActionsMenu.tsx. Reuses the exact same progress model
  // resolveClientDestination already uses for login routing, not a
  // second one; onboardingId is null only when no record exists yet
  // (not_started).
  onboardingProgress?: OnboardingProgressState;
  onboardingId?: string | null;
};

export const ADMIN_USER_ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  client: "Client",
  staff: "Staff",
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

