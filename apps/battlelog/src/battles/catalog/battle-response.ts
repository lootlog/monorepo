import { DateTime, Option, Schema } from "effect";

const DateTimeString = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u),
  Schema.makeFilter((value) => Option.isSome(DateTime.make(value)), {
    expected: "a valid UTC date-time string",
  }),
);

type DeepMutable<T> =
  T extends ReadonlyArray<infer Item>
    ? Array<DeepMutable<Item>>
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;

const BattleStatisticEntrySchema = Schema.Struct({
  warriorId: Schema.String,
  name: Schema.String,
  value: Schema.Number,
  formattedValue: Schema.optional(Schema.String),
});

const BattleComputedStatisticsSchema = Schema.Struct({
  topDamageDealer: Schema.NullOr(BattleStatisticEntrySchema),
  topTank: Schema.NullOr(BattleStatisticEntrySchema),
  bestEfficiency: Schema.NullOr(BattleStatisticEntrySchema),
  criticalMaster: Schema.NullOr(BattleStatisticEntrySchema),
  evasionExpert: Schema.NullOr(BattleStatisticEntrySchema),
  shieldWall: Schema.NullOr(BattleStatisticEntrySchema),
  damagePerTurn: Schema.NullOr(BattleStatisticEntrySchema),
  mostActive: Schema.NullOr(BattleStatisticEntrySchema),
  legendaryWarrior: Schema.NullOr(BattleStatisticEntrySchema),
  untouchable: Schema.NullOr(BattleStatisticEntrySchema),
});

const BattleWarriorResponseSchema = Schema.Struct({
  id: Schema.String,
  battleId: Schema.String,
  originalId: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  team: Schema.Number,
  turns: Schema.Number,
  turnsLost: Schema.Number,
  steps: Schema.Number,
  normalAttacks: Schema.Number,
  spellsUsed: Schema.Number,
  spellsUsedMap: Schema.Record(Schema.String, Schema.Number),
  isDead: Schema.Boolean,
  surrendered: Schema.Boolean,
  fled: Schema.Boolean,
  maxHp: Schema.Number,
  damageDealt: Schema.Number,
  distanceDamage: Schema.Number,
  meleeDamage: Schema.Number,
  auxiliaryDamage: Schema.Number,
  fireDamage: Schema.Number,
  frostDamage: Schema.Number,
  lightningDamage: Schema.Number,
  thirdAttDamage: Schema.Number,
  damageDealtAfterDefensive: Schema.Number,
  damageDealtAfterDefensivePercentage: Schema.Number,
  damageTaken: Schema.Number,
  distanceDamageTaken: Schema.Number,
  meleeDamageTaken: Schema.Number,
  auxiliaryDamageTaken: Schema.Number,
  fireDamageTaken: Schema.Number,
  frostDamageTaken: Schema.Number,
  lightningDamageTaken: Schema.Number,
  thirdAttDamageTaken: Schema.Number,
  flatDamageTaken: Schema.Number,
  rageDamageDealt: Schema.Number,
  trueDamageDealt: Schema.Number,
  trueDamageTaken: Schema.Number,
  stigmaDamageDealt: Schema.Number,
  stigmaDamageTaken: Schema.Number,
  passiveHealing: Schema.Number,
  activeHealing: Schema.Number,
  armorPierces: Schema.Number,
  criticalHits: Schema.Number,
  reducedArmor: Schema.Number,
  reducedPoisonResistance: Schema.Number,
  magicResistanceDestroyed: Schema.Number,
  evasions: Schema.Number,
  attacksEvaded: Schema.Number,
  counters: Schema.Number,
  fastArrows: Schema.Number,
  blocks: Schema.Number,
  attacksBlocked: Schema.Number,
  blockedDamage: Schema.Number,
  woundDamageTaken: Schema.Number,
  poisonDamageTaken: Schema.Number,
  injureDamageTaken: Schema.Number,
  injures: Schema.Number,
  critWoundDamageTaken: Schema.Number,
  firePassiveDamageTaken: Schema.Number,
  lightningPassiveDamageTaken: Schema.Number,
  destroyedEnergy: Schema.Number,
  destroyedMana: Schema.Number,
  regeneratedEnergy: Schema.Number,
  regeneratedMana: Schema.Number,
  reflectedDamage: Schema.Number,
  reflectedDamageTaken: Schema.Number,
  legbons: Schema.Number,
  legbonCurse: Schema.Number,
  legbonCleanse: Schema.Number,
  legbonLastheal: Schema.Number,
  legbonLasthealValue: Schema.Number,
  legbonGlare: Schema.Number,
  legbonHolytouch: Schema.Number,
  legbonHolytouchValue: Schema.Number,
  legbonCritredValue: Schema.Number,
  legbonFacadeValue: Schema.Number,
  legbonPunctureValue: Schema.Number,
  legbonVerycrit: Schema.Number,
  legbonAnguish: Schema.Number,
  legbonAnguishDamageTaken: Schema.Number,
  ph: Schema.Number,
});

const BattleResponseSchema = Schema.Struct({
  id: Schema.String,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  public: Schema.Boolean,
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  world: Schema.String,
  duration: Schema.Number,
  type: Schema.String,
  winner: Schema.String,
  loser: Schema.String,
  winningTeam: Schema.Number,
  losingTeam: Schema.Number,
  honorPoints: Schema.Number,
  hasFlee: Schema.Boolean,
  matchmaking: Schema.Boolean,
  statistics: BattleComputedStatisticsSchema,
  difficultyRank: Schema.NullOr(Schema.Number),
  result: Schema.NullOr(Schema.Number),
  ratingDelta: Schema.NullOr(Schema.Number),
  opponentLvl: Schema.NullOr(Schema.Number),
  opponentOplvl: Schema.NullOr(Schema.Number),
  opponentRating: Schema.NullOr(Schema.Number),
  rating: Schema.NullOr(Schema.Number),
  status: Schema.NullOr(Schema.Number),
  pointsGained: Schema.NullOr(Schema.Number),
  placementCur: Schema.NullOr(Schema.Number),
  placementMax: Schema.NullOr(Schema.Number),
  dailyStageId: Schema.NullOr(Schema.Number),
  dailyPointsCur: Schema.NullOr(Schema.Number),
  dailyPointsMax: Schema.NullOr(Schema.Number),
  dailyPointsStep: Schema.NullOr(Schema.Number),
  dailyRewardsLast: Schema.NullOr(Schema.Number),
  dailyRewardsCur: Schema.NullOr(Schema.Number),
  dailyRewardsMax: Schema.NullOr(Schema.Number),
  warriors: Schema.Array(BattleWarriorResponseSchema),
});

const BattlesPaginationSchema = Schema.Struct({
  size: Schema.Number,
  hasNext: Schema.Boolean,
  hasPrev: Schema.Boolean,
  nextCursor: Schema.optional(Schema.String),
  previousCursor: Schema.optional(Schema.String),
  total: Schema.optional(Schema.Number),
});

const BattlesPerformanceSchema = Schema.Struct({
  queryTime: Schema.Number,
  countTime: Schema.optional(Schema.Number),
  totalItems: Schema.optional(Schema.Number),
  estimatedTotal: Schema.optional(Schema.Boolean),
});

const BattlesListResponseSchema = Schema.Struct({
  battles: Schema.Array(BattleResponseSchema),
  pagination: BattlesPaginationSchema,
  meta: Schema.Struct({
    performance: BattlesPerformanceSchema,
  }),
});

const BattleCharacterResponseSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  world: Schema.String,
  icon: Schema.String,
});

const BattleCharactersResponseSchema = Schema.Struct({
  characters: Schema.Array(BattleCharacterResponseSchema),
});

const BattleSearchWarriorResponseSchema = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  prof: Schema.String,
  lvl: Schema.Number,
});

const BattleWarriorsSearchResponseSchema = Schema.Struct({
  warriors: Schema.Array(BattleSearchWarriorResponseSchema),
});

const BattleUserWorldsResponseSchema = Schema.Struct({
  worlds: Schema.Array(Schema.String),
});

const BattleCreatedResponseSchema = Schema.Struct({
  battleId: Schema.String,
});

const BattleDeletedResponseSchema = Schema.Struct({
  message: Schema.String,
});

const ParsedBattleActionResponseSchema = Schema.Struct({
  actionType: Schema.String,
  param: Schema.String,
});

const ParsedBattleMoveResponseSchema = Schema.Struct({
  attackerId: Schema.NullOr(Schema.String),
  defenderId: Schema.NullOr(Schema.String),
  attackerHpPercentage: Schema.NullOr(Schema.Number),
  defenderHpPercentage: Schema.NullOr(Schema.Number),
  actions: Schema.Array(ParsedBattleActionResponseSchema),
});

const BattleRawPayloadResponseSchema = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  world: Schema.String,
  events: Schema.Array(ParsedBattleMoveResponseSchema),
  sourceEvents: Schema.optional(Schema.Array(Schema.Unknown)),
});

const BattleRawResponseSchema = Schema.Struct({
  battleId: Schema.String,
  timestamp: DateTimeString,
  rawData: BattleRawPayloadResponseSchema,
});

const BattleTimelineActionResponseSchema = Schema.Struct({
  actionType: Schema.String,
  param: Schema.String,
  category: Schema.String,
  actorId: Schema.NullOr(Schema.String),
  targetId: Schema.NullOr(Schema.String),
  value: Schema.Number,
  handled: Schema.Boolean,
});

const BattleTimelineWarriorStatsResponseSchema = Schema.Struct({
  damageDealt: Schema.Number,
  damageTaken: Schema.Number,
  healingDone: Schema.Number,
  healingReceived: Schema.Number,
  mitigation: Schema.Number,
  resourceDelta: Schema.Number,
  resourcePressure: Schema.Number,
  energyPressure: Schema.Number,
  manaPressure: Schema.Number,
  absorbGained: Schema.Number,
  absorbSpent: Schema.Number,
  magicAbsorbGained: Schema.Number,
  magicAbsorbSpent: Schema.Number,
  controlApplied: Schema.Number,
  controlTaken: Schema.Number,
});

const BattleTimelineTurnResponseSchema = Schema.Struct({
  turn: Schema.Number,
  attackerId: Schema.NullOr(Schema.String),
  defenderId: Schema.NullOr(Schema.String),
  attackerHpPercentage: Schema.NullOr(Schema.Number),
  defenderHpPercentage: Schema.NullOr(Schema.Number),
  hpByWarrior: Schema.Record(Schema.String, Schema.Number),
  teamHp: Schema.Record(Schema.String, Schema.Number),
  teamHpDelta: Schema.Record(Schema.String, Schema.Number),
  deltas: Schema.Struct({
    damage: Schema.Number,
    healing: Schema.Number,
    mitigation: Schema.Number,
    resourcePressure: Schema.Number,
    energyPressure: Schema.Number,
    manaPressure: Schema.Number,
    byWarrior: Schema.Record(
      Schema.String,
      BattleTimelineWarriorStatsResponseSchema,
    ),
  }),
  cumulative: Schema.Record(
    Schema.String,
    BattleTimelineWarriorStatsResponseSchema,
  ),
  actions: Schema.Array(BattleTimelineActionResponseSchema),
  flags: Schema.Array(Schema.String),
  labels: Schema.Array(Schema.String),
  significanceScore: Schema.Number,
  reason: Schema.String,
});

const BattleTimelineResponseSchema = Schema.Struct({
  battleId: Schema.String,
  generatedAt: DateTimeString,
  timeline: Schema.Array(BattleTimelineTurnResponseSchema),
  warriors: Schema.Array(BattleWarriorResponseSchema),
});

const BattleAcceptedResponseSchema = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
});

export type BattleResponseInput = DeepMutable<
  typeof BattleResponseSchema.Encoded
>;
export type BattlesListResponseInput = DeepMutable<
  typeof BattlesListResponseSchema.Encoded
>;
export type BattleTimelineResponseInput = DeepMutable<
  typeof BattleTimelineResponseSchema.Encoded
>;

export const BattleResponseSchemas = {
  accepted: BattleAcceptedResponseSchema,
  battle: BattleResponseSchema,
  battles: BattlesListResponseSchema,
  characters: BattleCharactersResponseSchema,
  created: BattleCreatedResponseSchema,
  deleted: BattleDeletedResponseSchema,
  raw: BattleRawResponseSchema,
  timeline: BattleTimelineResponseSchema,
  userWorlds: BattleUserWorldsResponseSchema,
  warriorsSearch: BattleWarriorsSearchResponseSchema,
} as const;
