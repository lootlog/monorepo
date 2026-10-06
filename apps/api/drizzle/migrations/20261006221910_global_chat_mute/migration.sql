CREATE TABLE "GlobalChatMute" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"displayName" text NOT NULL,
	"mutedUntil" timestamp(3),
	"mutedByUserId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "GlobalChatMute_userId_key" ON "GlobalChatMute" ("userId");