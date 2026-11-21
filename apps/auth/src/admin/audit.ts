import type { Schema } from "effect";

/** What an operator can do in the admin panel, as the audit log names it. */
export const ADMIN_AUDIT_ACTIONS = [
  "roles.set",
  "ban.set",
  "ban.lift",
  "sessions.revoke",
  "session.revoke",
  "api-key.revoke",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

/** What an entry records beside its action, such as a ban's reason. */
export type AdminAuditDetails = Readonly<Record<string, Schema.Json>>;
