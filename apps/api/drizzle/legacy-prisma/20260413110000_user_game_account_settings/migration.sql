CREATE TABLE "UserGameAccountSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGameAccountSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserGameAccountSettings_userId_accountId_key"
ON "UserGameAccountSettings"("userId", "accountId");

CREATE INDEX "UserGameAccountSettings_userId_idx"
ON "UserGameAccountSettings"("userId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'UserSettings'
      AND column_name = 'accountSettings'
  ) THEN
    INSERT INTO "UserGameAccountSettings" (
      "userId",
      "accountId",
      "settings",
      "createdAt",
      "updatedAt"
    )
    SELECT
      us."userId",
      account_entry.key,
      jsonb_build_object(
        'notifications',
        COALESCE(account_entry.value->'notifications', '{}'::jsonb)
      ),
      us."createdAt",
      us."updatedAt"
    FROM "UserSettings" us
    CROSS JOIN LATERAL jsonb_each(us."accountSettings"::jsonb) AS account_entry(key, value)
    ON CONFLICT ("userId", "accountId") DO UPDATE
    SET
      "settings" = EXCLUDED."settings",
      "updatedAt" = EXCLUDED."updatedAt";

    ALTER TABLE "UserSettings" DROP COLUMN "accountSettings";
  END IF;
END $$;
