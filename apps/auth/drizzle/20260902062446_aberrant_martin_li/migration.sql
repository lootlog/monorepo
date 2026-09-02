DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "account"
    WHERE "providerId" <> 'discord'
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found a non-Discord account';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "account" AS account
    LEFT JOIN "user" AS auth_user ON auth_user."id" = account."userId"
    WHERE auth_user."id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found an orphan account';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "account"
    GROUP BY "accountId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found an issuer/accountId collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "user"
    GROUP BY "discordId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found a duplicate active Discord ID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "user" AS auth_user
    WHERE NOT EXISTS (
      SELECT 1
      FROM "account" AS account
      WHERE account."userId" = auth_user."id"
        AND account."providerId" = 'discord'
        AND account."accountId" = auth_user."discordId"
    )
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found an active Discord ID without an owned account';
  END IF;
END
$$;--> statement-breakpoint
DO $$
DECLARE
  timestamp_column record;
BEGIN
  FOR timestamp_column IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
      AND (table_name, column_name) IN (
        ('account', 'accessTokenExpiresAt'),
        ('account', 'createdAt'),
        ('account', 'refreshTokenExpiresAt'),
        ('account', 'updatedAt'),
        ('jwks', 'createdAt'),
        ('jwks', 'expiresAt'),
        ('session', 'createdAt'),
        ('session', 'expiresAt'),
        ('session', 'updatedAt'),
        ('user', 'banExpires'),
        ('user', 'createdAt'),
        ('user', 'updatedAt'),
        ('verification', 'createdAt'),
        ('verification', 'expiresAt'),
        ('verification', 'updatedAt')
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE timestamp with time zone USING %I AT TIME ZONE %L',
      timestamp_column.table_name,
      timestamp_column.column_name,
      timestamp_column.column_name,
      'UTC'
    );
  END LOOP;
END
$$;--> statement-breakpoint
UPDATE "verification"
SET
  "createdAt" = COALESCE("createdAt", "updatedAt", "expiresAt", now()),
  "updatedAt" = COALESCE("updatedAt", "createdAt", "expiresAt", now())
WHERE "createdAt" IS NULL OR "updatedAt" IS NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updatedAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account"
SET "issuer" = 'local:oauth:discord';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer", "accountId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_discordId_key" ON "user" USING btree ("discordId");
