CREATE TABLE "weapon_kills" (
	"world" text,
	"characterId" text,
	"killFingerprint" text,
	"itemId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weapon_kills_pkey" PRIMARY KEY("world","characterId","killFingerprint")
);
--> statement-breakpoint
CREATE INDEX "weapon_kills_world_characterId_itemId_idx" ON "weapon_kills" ("world","characterId","itemId");--> statement-breakpoint
CREATE INDEX "weapon_kills_userId_idx" ON "weapon_kills" ("userId");