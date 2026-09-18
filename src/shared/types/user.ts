export type Role = "admin" | "client" | "staff";

// Only meaningful for role: "staff" — whether they can currently continue
// owning active service assignments. Deliberately separate from account
// `status` (active/blocked, in adminUser.ts): status answers "can this
// user authenticate at all," this answers "can this user keep doing the
// work they're assigned," and the two can move independently (e.g. a
// staff member marked "on_leave" can still log in and view history, but
// their active assignments still need a continuity plan).
export type StaffAvailability = "available" | "on_leave" | "unavailable" | "departed";

export type SessionPayload = {
  userId: string;
  role: Role;
  expiresAt: number;
  // Stamped from the user's sessionVersion at the moment this session was
  // issued. Absent on any token minted before Stage 2 Phase 4 — treated as
  // 1 wherever it's compared (see verifySession in dal.ts), the same
  // default a doc with no sessionVersion field gets. Bumping the user's
  // stored sessionVersion (on block, or an admin-initiated password
  // reset) makes every session minted before that moment compare unequal
  // and fail verifySession, which is the only session-revocation
  // mechanism this stateless-JWT design has.
  sessionVersion?: number;
};
