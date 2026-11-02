CREATE TABLE "UserMargonemAccount" (
	"userId" text,
	"accountId" text,
	"verifiedAt" timestamp(3) NOT NULL,
	CONSTRAINT "UserMargonemAccount_pkey" PRIMARY KEY("userId","accountId")
);
--> statement-breakpoint
CREATE INDEX "UserMargonemAccount_accountId_verifiedAt_idx" ON "UserMargonemAccount" ("accountId","verifiedAt" DESC NULLS LAST);