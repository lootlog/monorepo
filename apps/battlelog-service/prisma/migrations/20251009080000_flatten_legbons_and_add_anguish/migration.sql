-- AlterTable - Add legendary bonus columns to battle_warriors
ALTER TABLE "battle_warriors" ADD COLUMN "legbonCurse" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonCleanse" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonLastheal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonLasthealValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonGlare" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonHolytouch" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonHolytouchValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonCritred" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonFacade" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonVerycrit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "battle_warriors" ADD COLUMN "legbonAnguish" INTEGER NOT NULL DEFAULT 0;

-- Migrate data from legendary_bonuses to battle_warriors
UPDATE "battle_warriors" AS bw
SET
    "legbonCurse" = lb.curse,
    "legbonCleanse" = lb.cleanse,
    "legbonLastheal" = lb.lastheal,
    "legbonLasthealValue" = lb."lasthealValue",
    "legbonGlare" = lb.glare,
    "legbonHolytouch" = lb.holytouch,
    "legbonHolytouchValue" = lb."holytouchValue",
    "legbonCritred" = lb.critred,
    "legbonFacade" = lb.facade,
    "legbonVerycrit" = lb.verycrit
FROM "legendary_bonuses" AS lb
WHERE lb."battleWarriorId" = bw.id;

-- DropTable
DROP TABLE "legendary_bonuses";
