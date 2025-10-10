-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "loser" TEXT NOT NULL,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_warriors" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lvl" INTEGER NOT NULL,
    "prof" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "team" INTEGER NOT NULL,
    "turns" INTEGER NOT NULL,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "damageDealtAfterDefensive" INTEGER NOT NULL DEFAULT 0,
    "damageTaken" INTEGER NOT NULL DEFAULT 0,
    "rageDamageDealt" INTEGER NOT NULL DEFAULT 0,
    "trueDamageDealt" INTEGER NOT NULL DEFAULT 0,
    "trueDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "passiveHealing" INTEGER NOT NULL DEFAULT 0,
    "activeHealing" INTEGER NOT NULL DEFAULT 0,
    "armorPierces" INTEGER NOT NULL DEFAULT 0,
    "criticalHits" INTEGER NOT NULL DEFAULT 0,
    "reducedArmor" INTEGER NOT NULL DEFAULT 0,
    "reducedPoisonResistance" INTEGER NOT NULL DEFAULT 0,
    "evasions" INTEGER NOT NULL DEFAULT 0,
    "fastArrows" INTEGER NOT NULL DEFAULT 0,
    "blocks" INTEGER NOT NULL DEFAULT 0,
    "blockedDamage" INTEGER NOT NULL DEFAULT 0,
    "woundDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "poisonDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "injureDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "critWoundDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "firePassiveDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "lightningPassiveDamageTaken" INTEGER NOT NULL DEFAULT 0,
    "destroyedEnergy" INTEGER NOT NULL DEFAULT 0,
    "destroyedMana" INTEGER NOT NULL DEFAULT 0,
    "regeneratedEnergy" INTEGER NOT NULL DEFAULT 0,
    "reflectedDamage" INTEGER NOT NULL DEFAULT 0,
    "reflectedDamageTaken" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "battle_warriors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legendary_bonuses" (
    "id" TEXT NOT NULL,
    "battleWarriorId" TEXT NOT NULL,
    "curse" INTEGER NOT NULL DEFAULT 0,
    "cleanse" INTEGER NOT NULL DEFAULT 0,
    "lastheal" INTEGER NOT NULL DEFAULT 0,
    "lasthealValue" INTEGER NOT NULL DEFAULT 0,
    "glare" INTEGER NOT NULL DEFAULT 0,
    "holytouch" INTEGER NOT NULL DEFAULT 0,
    "critred" INTEGER NOT NULL DEFAULT 0,
    "facade" INTEGER NOT NULL DEFAULT 0,
    "verycrit" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "legendary_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legendary_bonuses_battleWarriorId_key" ON "legendary_bonuses"("battleWarriorId");

-- AddForeignKey
ALTER TABLE "battle_warriors" ADD CONSTRAINT "battle_warriors_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legendary_bonuses" ADD CONSTRAINT "legendary_bonuses_battleWarriorId_fkey" FOREIGN KEY ("battleWarriorId") REFERENCES "battle_warriors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
