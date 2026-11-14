CREATE TABLE "CharacterAura" (
	"accountId" text,
	"characterId" text,
	"userId" text NOT NULL,
	"auraId" text NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "CharacterAura_pkey" PRIMARY KEY("accountId","characterId")
);
--> statement-breakpoint
CREATE INDEX "CharacterAura_userId_idx" ON "CharacterAura" ("userId");