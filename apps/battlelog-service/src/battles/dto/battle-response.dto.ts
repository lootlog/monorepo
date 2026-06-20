import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

const BattleStatisticEntrySchema = z.object({
  warriorId: z.string(),
  name: z.string(),
  value: z.number(),
  formattedValue: z.string().optional(),
});

const BattleComputedStatisticsSchema = z.object({
  topDamageDealer: BattleStatisticEntrySchema.nullable(),
  topTank: BattleStatisticEntrySchema.nullable(),
  bestEfficiency: BattleStatisticEntrySchema.nullable(),
  criticalMaster: BattleStatisticEntrySchema.nullable(),
  evasionExpert: BattleStatisticEntrySchema.nullable(),
  shieldWall: BattleStatisticEntrySchema.nullable(),
  damagePerTurn: BattleStatisticEntrySchema.nullable(),
  mostActive: BattleStatisticEntrySchema.nullable(),
  legendaryWarrior: BattleStatisticEntrySchema.nullable(),
  untouchable: BattleStatisticEntrySchema.nullable(),
});

const BattleWarriorResponseSchema = z.object({
  id: z.string(),
  battleId: z.string(),
  originalId: z.string(),
  name: z.string(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
  team: z.number(),
  turns: z.number(),
  turnsLost: z.number(),
  steps: z.number(),
  normalAttacks: z.number(),
  spellsUsed: z.number(),
  spellsUsedMap: z.record(z.string(), z.number()),
  isDead: z.boolean(),
  surrendered: z.boolean(),
  fled: z.boolean(),
  maxHp: z.number(),
  damageDealt: z.number(),
  distanceDamage: z.number(),
  meleeDamage: z.number(),
  auxiliaryDamage: z.number(),
  fireDamage: z.number(),
  frostDamage: z.number(),
  lightningDamage: z.number(),
  thirdAttDamage: z.number(),
  damageDealtAfterDefensive: z.number(),
  damageDealtAfterDefensivePercentage: z.number(),
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
  stigmaDamageDealt: z.number(),
  stigmaDamageTaken: z.number(),
  passiveHealing: z.number(),
  activeHealing: z.number(),
  armorPierces: z.number(),
  criticalHits: z.number(),
  reducedArmor: z.number(),
  reducedPoisonResistance: z.number(),
  magicResistanceDestroyed: z.number(),
  evasions: z.number(),
  attacksEvaded: z.number(),
  counters: z.number(),
  fastArrows: z.number(),
  blocks: z.number(),
  attacksBlocked: z.number(),
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
  regeneratedMana: z.number(),
  reflectedDamage: z.number(),
  reflectedDamageTaken: z.number(),
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
  legbonPunctureValue: z.number(),
  legbonVerycrit: z.number(),
  legbonAnguish: z.number(),
  legbonAnguishDamageTaken: z.number(),
  ph: z.number(),
});

const BattleResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  public: z.boolean(),
  userId: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  world: z.string(),
  duration: z.number(),
  type: z.string(),
  winner: z.string(),
  loser: z.string(),
  winningTeam: z.number(),
  losingTeam: z.number(),
  honorPoints: z.number(),
  hasFlee: z.boolean(),
  matchmaking: z.boolean(),
  statistics: BattleComputedStatisticsSchema,
  difficultyRank: z.number().nullable(),
  result: z.number().nullable(),
  ratingDelta: z.number().nullable(),
  opponentLvl: z.number().nullable(),
  opponentOplvl: z.number().nullable(),
  opponentRating: z.number().nullable(),
  rating: z.number().nullable(),
  status: z.number().nullable(),
  pointsGained: z.number().nullable(),
  placementCur: z.number().nullable(),
  placementMax: z.number().nullable(),
  dailyStageId: z.number().nullable(),
  dailyPointsCur: z.number().nullable(),
  dailyPointsMax: z.number().nullable(),
  dailyPointsStep: z.number().nullable(),
  dailyRewardsLast: z.number().nullable(),
  dailyRewardsCur: z.number().nullable(),
  dailyRewardsMax: z.number().nullable(),
  warriors: z.array(BattleWarriorResponseSchema),
});

const BattlesPaginationSchema = z.object({
  size: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
  nextCursor: z.string().optional(),
  previousCursor: z.string().optional(),
  total: z.number().optional(),
});

const BattlesPerformanceSchema = z.object({
  queryTime: z.number(),
  countTime: z.number().optional(),
  totalItems: z.number().optional(),
  estimatedTotal: z.boolean().optional(),
});

const BattlesListResponseSchema = z.object({
  battles: z.array(BattleResponseSchema),
  pagination: BattlesPaginationSchema,
  meta: z.object({
    performance: BattlesPerformanceSchema,
  }),
});

const BattleCharacterResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  world: z.string(),
  icon: z.string(),
});

const BattleCharactersResponseSchema = z.object({
  characters: z.array(BattleCharacterResponseSchema),
});

const BattleSearchWarriorResponseSchema = z.object({
  name: z.string(),
  icon: z.string(),
  prof: z.string(),
  lvl: z.number(),
});

const BattleWarriorsSearchResponseSchema = z.object({
  warriors: z.array(BattleSearchWarriorResponseSchema),
});

const BattleUserWorldsResponseSchema = z.object({
  worlds: z.array(z.string()),
});

const BattleCreatedResponseSchema = z.object({
  battleId: z.string(),
});

const BattleDeletedResponseSchema = z.object({
  message: z.string(),
});

const ParsedBattleActionResponseSchema = z.object({
  actionType: z.string(),
  param: z.string(),
});

const ParsedBattleMoveResponseSchema = z.object({
  attackerId: z.string().nullable(),
  defenderId: z.string().nullable(),
  attackerHpPercentage: z.number().nullable(),
  defenderHpPercentage: z.number().nullable(),
  actions: z.array(ParsedBattleActionResponseSchema),
});

const BattleRawPayloadResponseSchema = z.object({
  accountId: z.string(),
  characterId: z.string(),
  world: z.string(),
  events: z.array(ParsedBattleMoveResponseSchema),
  sourceEvents: z.array(z.unknown()).optional(),
});

const BattleRawResponseSchema = z.object({
  battleId: z.string(),
  timestamp: z.string().datetime(),
  rawData: BattleRawPayloadResponseSchema,
});

const BattleTimelineActionResponseSchema = z.object({
  actionType: z.string(),
  param: z.string(),
  category: z.string(),
  actorId: z.string().nullable(),
  targetId: z.string().nullable(),
  value: z.number(),
  handled: z.boolean(),
});

const BattleTimelineWarriorStatsResponseSchema = z.object({
  damageDealt: z.number(),
  damageTaken: z.number(),
  healingDone: z.number(),
  healingReceived: z.number(),
  mitigation: z.number(),
  resourceDelta: z.number(),
  resourcePressure: z.number(),
  energyPressure: z.number(),
  manaPressure: z.number(),
  absorbGained: z.number(),
  absorbSpent: z.number(),
  magicAbsorbGained: z.number(),
  magicAbsorbSpent: z.number(),
  controlApplied: z.number(),
  controlTaken: z.number(),
});

const BattleTimelineTurnResponseSchema = z.object({
  turn: z.number(),
  attackerId: z.string().nullable(),
  defenderId: z.string().nullable(),
  attackerHpPercentage: z.number().nullable(),
  defenderHpPercentage: z.number().nullable(),
  hpByWarrior: z.record(z.string(), z.number()),
  teamHp: z.record(z.string(), z.number()),
  teamHpDelta: z.record(z.string(), z.number()),
  deltas: z.object({
    damage: z.number(),
    healing: z.number(),
    mitigation: z.number(),
    resourcePressure: z.number(),
    energyPressure: z.number(),
    manaPressure: z.number(),
    byWarrior: z.record(z.string(), BattleTimelineWarriorStatsResponseSchema),
  }),
  cumulative: z.record(z.string(), BattleTimelineWarriorStatsResponseSchema),
  actions: z.array(BattleTimelineActionResponseSchema),
  flags: z.array(z.string()),
  labels: z.array(z.string()),
  significanceScore: z.number(),
  reason: z.string(),
});

const BattleTimelineResponseSchema = z.object({
  battleId: z.string(),
  generatedAt: z.string().datetime(),
  timeline: z.array(BattleTimelineTurnResponseSchema),
  warriors: z.array(BattleWarriorResponseSchema),
});

const BattleAcceptedResponseSchema = z.object({
  status: z.literal("ACCEPTED"),
});

export type BattleResponseInput = z.input<typeof BattleResponseSchema>;
export type BattlesListResponseInput = z.input<
  typeof BattlesListResponseSchema
>;
export type BattleTimelineResponseInput = z.input<
  typeof BattleTimelineResponseSchema
>;

const BattleWarriorResponseDtoBase: ZodDto<
  typeof BattleWarriorResponseSchema,
  false
> = createZodDto(BattleWarriorResponseSchema);

export class BattleWarriorResponseDto extends BattleWarriorResponseDtoBase {}

const BattleResponseDtoBase: ZodDto<typeof BattleResponseSchema, false> =
  createZodDto(BattleResponseSchema);

export class BattleResponseDto extends BattleResponseDtoBase {}

const BattlesListResponseDtoBase: ZodDto<
  typeof BattlesListResponseSchema,
  false
> = createZodDto(BattlesListResponseSchema);

export class BattlesListResponseDto extends BattlesListResponseDtoBase {}

const BattleCharactersResponseDtoBase: ZodDto<
  typeof BattleCharactersResponseSchema,
  false
> = createZodDto(BattleCharactersResponseSchema);

export class BattleCharactersResponseDto extends BattleCharactersResponseDtoBase {}

const BattleWarriorsSearchResponseDtoBase: ZodDto<
  typeof BattleWarriorsSearchResponseSchema,
  false
> = createZodDto(BattleWarriorsSearchResponseSchema);

export class BattleWarriorsSearchResponseDto extends BattleWarriorsSearchResponseDtoBase {}

const BattleUserWorldsResponseDtoBase: ZodDto<
  typeof BattleUserWorldsResponseSchema,
  false
> = createZodDto(BattleUserWorldsResponseSchema);

export class BattleUserWorldsResponseDto extends BattleUserWorldsResponseDtoBase {}

const BattleCreatedResponseDtoBase: ZodDto<
  typeof BattleCreatedResponseSchema,
  false
> = createZodDto(BattleCreatedResponseSchema);

export class BattleCreatedResponseDto extends BattleCreatedResponseDtoBase {}

const BattleDeletedResponseDtoBase: ZodDto<
  typeof BattleDeletedResponseSchema,
  false
> = createZodDto(BattleDeletedResponseSchema);

export class BattleDeletedResponseDto extends BattleDeletedResponseDtoBase {}

const BattleRawResponseDtoBase: ZodDto<typeof BattleRawResponseSchema, false> =
  createZodDto(BattleRawResponseSchema);

export class BattleRawResponseDto extends BattleRawResponseDtoBase {}

const BattleTimelineResponseDtoBase: ZodDto<
  typeof BattleTimelineResponseSchema,
  false
> = createZodDto(BattleTimelineResponseSchema);

export class BattleTimelineResponseDto extends BattleTimelineResponseDtoBase {}

const BattleAcceptedResponseDtoBase: ZodDto<
  typeof BattleAcceptedResponseSchema,
  false
> = createZodDto(BattleAcceptedResponseSchema);

export class BattleAcceptedResponseDto extends BattleAcceptedResponseDtoBase {}
