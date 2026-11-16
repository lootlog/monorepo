CREATE TABLE "battle_warrior_filters" (
	"userId" text,
	"battleId" uuid,
	"originalId" text,
	"name" text,
	"lvl" integer,
	"ph" integer,
	"team" integer,
	CONSTRAINT "battle_warrior_filters_pkey" PRIMARY KEY("userId","battleId","originalId","name","lvl","ph","team")
);

--> statement-breakpoint
-- Sorted by the primary key, so the index is built by appending instead of by
-- one random insert per row.
INSERT INTO "battle_warrior_filters" ("userId", "battleId", "originalId", "name", "lvl", "ph", "team")
SELECT b."userId", w."battleId", w."originalId", w."name", w."lvl", w."ph", w."team"
FROM "battle_warriors" w
INNER JOIN "battles" b ON b."id" = w."battleId"
ORDER BY 1, 2, 3;
