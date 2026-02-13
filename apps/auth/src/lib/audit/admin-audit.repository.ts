import { randomUUID } from "node:crypto";
import { authPool } from "../auth.js";

export type AdminAuditStatus = "success" | "error";

export type CreateAdminAuditLogInput = {
  actorUserId: string;
  actorRole: string | null;
  action: string;
  targetUserId: string | null;
  status: AdminAuditStatus;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
};

export const ensureAdminAuditLogTable = async () => {
  await authPool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_role TEXT,
      action TEXT NOT NULL,
      target_user_id TEXT,
      status TEXT NOT NULL,
      before_payload JSONB,
      after_payload JSONB,
      metadata JSONB,
      ip TEXT,
      user_agent TEXT,
      request_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await authPool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
      ON admin_audit_log (created_at DESC);
  `);

  await authPool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_user_id
      ON admin_audit_log (actor_user_id);
  `);

  await authPool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id
      ON admin_audit_log (target_user_id);
  `);
};

export const createAdminAuditLog = async (input: CreateAdminAuditLogInput) => {
  const id = randomUUID();
  const safeBefore = input.before === undefined ? null : input.before;
  const safeAfter = input.after === undefined ? null : input.after;
  const safeMetadata = input.metadata === undefined ? null : input.metadata;

  await authPool.query(
    `
      INSERT INTO admin_audit_log (
        id,
        actor_user_id,
        actor_role,
        action,
        target_user_id,
        status,
        before_payload,
        after_payload,
        metadata,
        ip,
        user_agent,
        request_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        $8::jsonb,
        $9::jsonb,
        $10,
        $11,
        $12
      )
    `,
    [
      id,
      input.actorUserId,
      input.actorRole,
      input.action,
      input.targetUserId,
      input.status,
      JSON.stringify(safeBefore),
      JSON.stringify(safeAfter),
      JSON.stringify(safeMetadata),
      input.ip,
      input.userAgent,
      input.requestId,
    ],
  );

  return id;
};
