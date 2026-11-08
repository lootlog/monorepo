CREATE TABLE "UserCharacterAuraGrant" (
	"userId" text PRIMARY KEY,
	"grantedByUserId" text NOT NULL,
	"grantedAt" timestamp(3) NOT NULL
);
