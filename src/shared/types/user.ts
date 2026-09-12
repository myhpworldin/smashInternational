export type Role = "admin" | "client";

export type SessionPayload = {
  userId: string;
  role: Role;
  expiresAt: number;
};
