CREATE TABLE "UserPersonalCharacterAuraGrant" (
	"userId" text,
	"auraId" text,
	"grantedByUserId" text NOT NULL,
	"grantedAt" timestamp(3) NOT NULL,
	CONSTRAINT "UserPersonalCharacterAuraGrant_pkey" PRIMARY KEY("userId","auraId")
);
