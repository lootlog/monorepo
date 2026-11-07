CREATE TABLE "CatalogItem" (
	"uid" text PRIMARY KEY,
	"gameVersion" text NOT NULL,
	"itemId" integer NOT NULL,
	"monsterKeys" text[] DEFAULT '{}'::text[] NOT NULL,
	"document" jsonb NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CatalogNpc" (
	"uid" text PRIMARY KEY,
	"monsterKey" text NOT NULL,
	"document" jsonb NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "CatalogItem_gameVersion_itemId_idx" ON "CatalogItem" ("gameVersion","itemId");--> statement-breakpoint
CREATE INDEX "CatalogItem_monsterKeys_idx" ON "CatalogItem" USING gin ("monsterKeys");--> statement-breakpoint
CREATE INDEX "CatalogNpc_monsterKey_idx" ON "CatalogNpc" ("monsterKey");