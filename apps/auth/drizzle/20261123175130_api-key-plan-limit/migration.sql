ALTER TABLE "user" ADD COLUMN "apiKeyLimit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_api_key_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  key_limit integer;
BEGIN
  SELECT "apiKeyLimit" INTO key_limit FROM "user" WHERE id = NEW."referenceId" FOR UPDATE;
  IF NEW.enabled AND (NEW."expiresAt" IS NULL OR NEW."expiresAt" > CURRENT_TIMESTAMP)
     AND (SELECT count(*) FROM apikey WHERE "referenceId" = NEW."referenceId"
          AND enabled AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
          AND id <> NEW.id) >= coalesce(key_limit, 10) THEN
    RAISE EXCEPTION 'Maximum active API keys reached' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
