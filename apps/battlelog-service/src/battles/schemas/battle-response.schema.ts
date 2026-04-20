import { z } from "@hono/zod-openapi";

export const warriorSchema = z
  .object({
    id: z.string(),
    battleId: z.string(),
    originalId: z.string(),
    name: z.string(),
    lvl: z.number(),
    prof: z.string(),
    icon: z.string(),
    team: z.number(),
    turns: z.number(),
    damageDealt: z.number(),
    distanceDamage: z.number(),
    meleeDamage: z.number(),
    auxiliaryDamage: z.number(),
    fireDamage: z.number(),
    frostDamage: z.number(),
    lightningDamage: z.number(),
    thirdAttDamage: z.number(),
    damageDealtAfterDefensive: z.number(),
    damageTaken: z.number(),
    distanceDamageTaken: z.number(),
    meleeDamageTaken: z.number(),
    auxiliaryDamageTaken: z.number(),
    fireDamageTaken: z.number(),
    frostDamageTaken: z.number(),
    lightningDamageTaken: z.number(),
    thirdAttDamageTaken: z.number(),
    flatDamageTaken: z.number(),
    rageDamageDealt: z.number(),
    trueDamageDealt: z.number(),
    trueDamageTaken: z.number(),
    passiveHealing: z.number(),
    activeHealing: z.number(),
    armorPierces: z.number(),
    criticalHits: z.number(),
    reducedArmor: z.number(),
    reducedPoisonResistance: z.number(),
    magicResistanceDestroyed: z.number(),
    evasions: z.number(),
    counters: z.number(),
    fastArrows: z.number(),
    blocks: z.number(),
    blockedDamage: z.number(),
    woundDamageTaken: z.number(),
    poisonDamageTaken: z.number(),
    injureDamageTaken: z.number(),
    injures: z.number(),
    critWoundDamageTaken: z.number(),
    firePassiveDamageTaken: z.number(),
    lightningPassiveDamageTaken: z.number(),
    destroyedEnergy: z.number(),
    destroyedMana: z.number(),
    regeneratedEnergy: z.number(),
    reflectedDamage: z.number(),
    reflectedDamageTaken: z.number(),
    damageDealtAfterDefensivePercentage: z.number(),
    isDead: z.boolean(),
    surrendered: z.boolean(),
    fled: z.boolean(),
    spellsUsed: z.number(),
    spellsUsedMap: z.record(z.string(), z.number()).nullable(),
    normalAttacks: z.number(),
    steps: z.number(),
    turnsLost: z.number(),
    legbons: z.number(),
    legbonCurse: z.number(),
    legbonCleanse: z.number(),
    legbonLastheal: z.number(),
    legbonLasthealValue: z.number(),
    legbonGlare: z.number(),
    legbonHolytouch: z.number(),
    legbonHolytouchValue: z.number(),
    legbonCritredValue: z.number(),
    legbonFacadeValue: z.number(),
    legbonVerycrit: z.number(),
    legbonAnguish: z.number(),
    legbonPunctureValue: z.number(),
    legbonAnguishDamageTaken: z.number(),
    stigmaDamageDealt: z.number(),
    stigmaDamageTaken: z.number(),
    ph: z.number(),
  })
  .passthrough()
  .openapi("BattleWarrior");

export const battleSchema = z
  .object({
    id: z.string(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    public: z.boolean(),
    userId: z.string(),
    accountId: z.string(),
    characterId: z.string(),
    duration: z.number(),
    type: z.string(),
    winner: z.string(),
    loser: z.string(),
    winningTeam: z.number(),
    losingTeam: z.number(),
    hasFlee: z.boolean(),
    world: z.string(),
    matchmaking: z.boolean(),
    warriors: z.array(warriorSchema),
  })
  .passthrough()
  .openapi("Battle");

export const getBattlesResponseSchema = z
  .object({
    battles: z.array(battleSchema),
    pagination: z.object({
      size: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
      nextCursor: z.string().optional(),
      total: z.number().optional(),
    }),
    meta: z.object({
      performance: z.object({
        queryTime: z.number(),
        countTime: z.number().optional(),
        totalItems: z.number().optional(),
        estimatedTotal: z.boolean().optional(),
      }),
    }),
  })
  .openapi("GetBattlesResponse");

export const getBattleCharactersResponseSchema = z
  .object({
    characters: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        world: z.string(),
        icon: z.string(),
      }),
    ),
  })
  .openapi("GetBattleCharactersResponse");

export const getUserWorldsResponseSchema = z
  .object({
    worlds: z.array(z.string()),
  })
  .openapi("GetUserWorldsResponse");

export const searchWarriorsResponseSchema = z
  .object({
    warriors: z.array(
      z.object({
        name: z.string(),
        icon: z.string(),
        prof: z.string(),
        lvl: z.number(),
      }),
    ),
  })
  .openapi("SearchWarriorsResponse");

export const rawBattleParsedEventActionSchema = z.object({
  actionType: z.string(),
  param: z.string(),
});

export const rawBattleParsedEventSchema = z.object({
  attackerId: z.string().nullable(),
  defenderId: z.string().nullable(),
  actions: z.array(rawBattleParsedEventActionSchema),
  attackerHpPercentage: z.number().nullable(),
  defenderHpPercentage: z.number().nullable(),
});

export const rawBattleResponseSchema = z
  .object({
    battleId: z.string(),
    timestamp: z.string(),
    rawData: z.object({
      accountId: z.string(),
      characterId: z.string(),
      world: z.string(),
      events: z.array(rawBattleParsedEventSchema),
    }),
  })
  .passthrough()
  .openapi("GetBattleRawResponse");

export const createBattleResponseSchema = z
  .object({
    battleId: z.string(),
  })
  .openapi("CreateBattleResponse");

export const deleteBattleResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi("DeleteBattleResponse");
