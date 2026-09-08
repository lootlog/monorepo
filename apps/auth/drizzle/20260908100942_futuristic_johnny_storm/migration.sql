CREATE TABLE "apikey" (
	"id" text PRIMARY KEY,
	"configId" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"referenceId" text NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"rateLimitEnabled" boolean DEFAULT true,
	"refillInterval" integer,
	"refillAmount" integer,
	"rateLimitTimeWindow" integer,
	"rateLimitMax" integer,
	"requestCount" integer,
	"remaining" integer,
	"lastRefillAt" timestamp with time zone,
	"lastRequest" timestamp with time zone,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "apikey_key_uidx" ON "apikey" ("key");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "apikey" ("referenceId");--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "apikey" ("configId");--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_referenceId_user_id_fkey" FOREIGN KEY ("referenceId") REFERENCES "user"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE FUNCTION enforce_api_key_limit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Serialize creation for this owner across all auth replicas.
  PERFORM id FROM "user" WHERE id = NEW."referenceId" FOR UPDATE;
  IF NEW.enabled AND (NEW."expiresAt" IS NULL OR NEW."expiresAt" > CURRENT_TIMESTAMP)
     AND (SELECT count(*) FROM apikey WHERE "referenceId" = NEW."referenceId"
          AND enabled AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
          AND id <> NEW.id) >= 10 THEN
    RAISE EXCEPTION 'Maximum active API keys reached' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER apikey_active_limit BEFORE INSERT ON apikey
FOR EACH ROW EXECUTE FUNCTION enforce_api_key_limit();
