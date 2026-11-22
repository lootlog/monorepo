import type { Schema } from "effect";

export const ADMIN_AUDIT_ACTIONS = [
  "roles.set",
  "ban.set",
  "ban.lift",
  "sessions.revoke",
  "session.revoke",
  "api-key.revoke",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export type AdminAuditDetails = Readonly<Record<string, Schema.Json>>;
