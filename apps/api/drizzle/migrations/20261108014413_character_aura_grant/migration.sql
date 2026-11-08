CREATE TABLE "CharacterAuraGrant" (
	"userId" text PRIMARY KEY,
	"displayName" text NOT NULL,
	"grantedByUserId" text NOT NULL,
	"createdAt" timestamp(3) NOT NULL
);
