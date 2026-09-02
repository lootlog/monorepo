ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "account"
    WHERE "issuer" IS NULL
      AND "providerId" <> 'discord'
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration cannot infer issuer for a non-Discord account';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "account"
    WHERE "issuer" IS NOT NULL
      AND (
        "providerId" <> 'discord'
        OR "issuer" <> 'local:oauth:discord'
      )
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found an account with an unexpected issuer';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "account"
    GROUP BY COALESCE("issuer", 'local:oauth:discord'), "accountId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Better Auth 1.7 migration found an issuer/accountId collision';
  END IF;
END
$$;--> statement-breakpoint
UPDATE "account"
SET "issuer" = 'local:oauth:discord'
WHERE "issuer" IS NULL
  AND "providerId" = 'discord';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx" ON "account" ("issuer","accountId");
