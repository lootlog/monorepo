CREATE TABLE "UserCharacterAuraGameAccount" (
	"gameAccountId" text PRIMARY KEY,
	"userId" text NOT NULL,
	"linkedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserCharacterAura" (
	"userId" text PRIMARY KEY,
	"auraId" text NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "UserCharacterAuraGameAccount_userId_idx" ON "UserCharacterAuraGameAccount" ("userId");