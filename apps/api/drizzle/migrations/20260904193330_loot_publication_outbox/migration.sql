CREATE TABLE "LootPublicationOutbox" (
	"id" serial PRIMARY KEY,
	"lootId" integer NOT NULL,
	"organizationIds" text[] NOT NULL,
	"payload" jsonb NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "LootPublicationOutbox_lootId_idx" ON "LootPublicationOutbox" ("lootId");--> statement-breakpoint
ALTER TABLE "LootPublicationOutbox" ADD CONSTRAINT "LootPublicationOutbox_lootId_Loot_id_fkey" FOREIGN KEY ("lootId") REFERENCES "Loot"("id") ON DELETE CASCADE;