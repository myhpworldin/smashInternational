import { ADMIN_USER_ROLE_LABEL, ADMIN_USER_STATUS_LABEL, type AdminUserStatus } from "@/shared/types/adminUser";
import type { Role } from "@/shared/types/user";

type BasicUser = { name: string; email: string; role: Role; status: AdminUserStatus };

// Name/Email/Role/Account Status only — no password, ever. Used for the
// "Copy Details" action wherever a user's temp-password result dialog also
// needs a details-only copy alongside "Copy Credentials" (Phase 6 spec §1).
export function formatUserDetailsText(user: BasicUser): string {
  return [
    `Name: ${user.name}`,
    `Email: ${user.email}`,
    `Role: ${ADMIN_USER_ROLE_LABEL[user.role]}`,
    `Account Status: ${ADMIN_USER_STATUS_LABEL[user.status]}`,
  ].join("\n");
}

// The password is only ever passed in here from a creation/reset
// response held in memory for this one result dialog — never read back
// from storage (see createUserByAdmin/resetUserPassword in
// adminUsers.service.ts, and the "no GET /users/:id/password" rule in the
// Phase 6 spec, §4).
export function formatCredentialsText(params: {
  name: string;
  email: string;
  role: Role;
  temporaryPassword: string;
  loginUrl: string;
}): string {
  return [
    "SMASH CRM Account",
    "",
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    `Role: ${ADMIN_USER_ROLE_LABEL[params.role]}`,
    `Temporary Password: ${params.temporaryPassword}`,
    "",
    `Login: ${params.loginUrl}`,
  ].join("\n");
}
