CREATE TABLE "admin_audit_log" (
	"id" text PRIMARY KEY,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"targetUserId" text,
	"details" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_createdAt_idx" ON "admin_audit_log" ("createdAt");--> statement-breakpoint
CREATE INDEX "admin_audit_log_targetUserId_idx" ON "admin_audit_log" ("targetUserId");