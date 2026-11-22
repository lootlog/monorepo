import { CursorPaginationSchema } from "#src/battles/analytics/pagination";
import {
  DateTimeString,
  type DeepMutable,
} from "#src/battles/battle-response-types";
import { Schema, Struct } from "effect";

const BattleStatisticEntrySchema = Schema.Struct({
  warriorId: Schema.String,
  name: Schema.String,
  value: Schema.Finite,
  formattedValue: Schema.optionalKey(Schema.String),
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
  battleId: Schema.String,
  originalId: Schema.String,
  name: Schema.String,
  lvl: Schema.Finite,
  prof: Schema.String,
  icon: Schema.String,
  team: Schema.Finite,
  turns: Schema.Finite,
  turnsLost: Schema.Finite,
  steps: Schema.Finite,
  normalAttacks: Schema.Finite,
  spellsUsed: Schema.Finite,
  spellsUsedMap: Schema.Record(Schema.String, Schema.Finite),
  isDead: Schema.Boolean,
  surrendered: Schema.Boolean,
  fled: Schema.Boolean,
  maxHp: Schema.Finite,
  damageDealt: Schema.Finite,
  distanceDamage: Schema.Finite,
  meleeDamage: Schema.Finite,
  auxiliaryDamage: Schema.Finite,
  fireDamage: Schema.Finite,
  frostDamage: Schema.Finite,
  lightningDamage: Schema.Finite,
  thirdAttDamage: Schema.Finite,
  damageDealtAfterDefensive: Schema.Finite,
  damageDealtAfterDefensivePercentage: Schema.Finite,
  damageTaken: Schema.Finite,
  distanceDamageTaken: Schema.Finite,
  meleeDamageTaken: Schema.Finite,
  auxiliaryDamageTaken: Schema.Finite,
  fireDamageTaken: Schema.Finite,
  frostDamageTaken: Schema.Finite,
  lightningDamageTaken: Schema.Finite,
  thirdAttDamageTaken: Schema.Finite,
  flatDamageTaken: Schema.Finite,
  rageDamageDealt: Schema.Finite,
  trueDamageDealt: Schema.Finite,
  trueDamageTaken: Schema.Finite,
  stigmaDamageDealt: Schema.Finite,
  stigmaDamageTaken: Schema.Finite,
  passiveHealing: Schema.Finite,
  activeHealing: Schema.Finite,
  armorPierces: Schema.Finite,
  criticalHits: Schema.Finite,
  reducedArmor: Schema.Finite,
  reducedPoisonResistance: Schema.Finite,
  magicResistanceDestroyed: Schema.Finite,
  evasions: Schema.Finite,
  attacksEvaded: Schema.Finite,
  counters: Schema.Finite,
  fastArrows: Schema.Finite,
  blocks: Schema.Finite,
  attacksBlocked: Schema.Finite,
  blockedDamage: Schema.Finite,
  woundDamageTaken: Schema.Finite,
  poisonDamageTaken: Schema.Finite,
  injureDamageTaken: Schema.Finite,
  injures: Schema.Finite,
  critWoundDamageTaken: Schema.Finite,
  firePassiveDamageTaken: Schema.Finite,
  lightningPassiveDamageTaken: Schema.Finite,
  destroyedEnergy: Schema.Finite,
  destroyedMana: Schema.Finite,
  regeneratedEnergy: Schema.Finite,
  regeneratedMana: Schema.Finite,
  reflectedDamage: Schema.Finite,
  reflectedDamageTaken: Schema.Finite,
  legbons: Schema.Finite,
  legbonCurse: Schema.Finite,
  legbonCleanse: Schema.Finite,
  legbonLastheal: Schema.Finite,
  legbonLasthealValue: Schema.Finite,
  legbonGlare: Schema.Finite,
  legbonHolytouch: Schema.Finite,
  legbonHolytouchValue: Schema.Finite,
  legbonCritredValue: Schema.Finite,
  legbonFacadeValue: Schema.Finite,
  legbonPunctureValue: Schema.Finite,
  legbonVerycrit: Schema.Finite,
  legbonAnguish: Schema.Finite,
  legbonAnguishDamageTaken: Schema.Finite,
  ph: Schema.Finite,
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
  duration: Schema.Finite,
  type: Schema.String,
  winner: Schema.String,
  loser: Schema.String,
  winningTeam: Schema.Finite,
  losingTeam: Schema.Finite,
  honorPoints: Schema.Finite,
  hasFlee: Schema.Boolean,
  unfinished: Schema.Boolean,
  matchmaking: Schema.Boolean,
  statistics: BattleComputedStatisticsSchema,
  difficultyRank: Schema.NullOr(Schema.Finite),
  result: Schema.NullOr(Schema.Finite),
  ratingDelta: Schema.NullOr(Schema.Finite),
  opponentLvl: Schema.NullOr(Schema.Finite),
  opponentOplvl: Schema.NullOr(Schema.Finite),
  opponentRating: Schema.NullOr(Schema.Finite),
  rating: Schema.NullOr(Schema.Finite),
  status: Schema.NullOr(Schema.Finite),
  pointsGained: Schema.NullOr(Schema.Finite),
  placementCur: Schema.NullOr(Schema.Finite),
  placementMax: Schema.NullOr(Schema.Finite),
  dailyStageId: Schema.NullOr(Schema.Finite),
  dailyPointsCur: Schema.NullOr(Schema.Finite),
  dailyPointsMax: Schema.NullOr(Schema.Finite),
  dailyPointsStep: Schema.NullOr(Schema.Finite),
  dailyRewardsLast: Schema.NullOr(Schema.Finite),
  dailyRewardsCur: Schema.NullOr(Schema.Finite),
  dailyRewardsMax: Schema.NullOr(Schema.Finite),
  warriors: Schema.Array(BattleWarriorResponseSchema),
});

const BattlesPerformanceSchema = Schema.Struct({
  queryTime: Schema.Finite,
  countTime: Schema.optionalKey(Schema.Finite),
  totalItems: Schema.optionalKey(Schema.Finite),
  estimatedTotal: Schema.optionalKey(Schema.Boolean),
});

const BattlesListResponseSchema = Schema.Struct({
  battles: Schema.Array(BattleResponseSchema),
  pagination: CursorPaginationSchema,
  meta: Schema.Struct({
    performance: BattlesPerformanceSchema,
  }),
});

const BattleCharacterResponseSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  world: Schema.String,
  icon: Schema.String,
  lvl: Schema.NullOr(Schema.Finite),
  prof: Schema.NullOr(Schema.String),
});

const BattleCharactersResponseSchema = Schema.Struct({
  characters: Schema.Array(BattleCharacterResponseSchema),
});

const BattleSearchWarriorResponseSchema = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  prof: Schema.String,
  lvl: Schema.Finite,
});

const BattleWarriorsSearchResponseSchema = Schema.Struct({
  warriors: Schema.Array(BattleSearchWarriorResponseSchema),
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
  attackerHpPercentage: Schema.NullOr(Schema.Finite),
  defenderHpPercentage: Schema.NullOr(Schema.Finite),
  actions: Schema.Array(ParsedBattleActionResponseSchema),
});

const BattleRawPayloadResponseSchema = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  world: Schema.String,
  events: Schema.Array(ParsedBattleMoveResponseSchema),
  sourceEvents: Schema.optionalKey(Schema.Array(Schema.Json)),
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
  value: Schema.Finite,
  handled: Schema.Boolean,
});

const BattleTimelineWarriorStatsResponseSchema = Schema.Struct({
  damageDealt: Schema.Finite,
  damageTaken: Schema.Finite,
  healingDone: Schema.Finite,
  healingReceived: Schema.Finite,
  mitigation: Schema.Finite,
  resourceDelta: Schema.Finite,
  resourcePressure: Schema.Finite,
  energyPressure: Schema.Finite,
  manaPressure: Schema.Finite,
  absorbGained: Schema.Finite,
  absorbSpent: Schema.Finite,
  magicAbsorbGained: Schema.Finite,
  magicAbsorbSpent: Schema.Finite,
  controlApplied: Schema.Finite,
  controlTaken: Schema.Finite,
});

const BattleTimelineTurnResponseSchema = Schema.Struct({
  turn: Schema.Finite,
  attackerId: Schema.NullOr(Schema.String),
  defenderId: Schema.NullOr(Schema.String),
  attackerHpPercentage: Schema.NullOr(Schema.Finite),
  defenderHpPercentage: Schema.NullOr(Schema.Finite),
  hpByWarrior: Schema.Record(Schema.String, Schema.Finite),
  teamHp: Schema.Record(Schema.String, Schema.Finite),
  teamHpDelta: Schema.Record(Schema.String, Schema.Finite),
  deltas: Schema.Struct({
    damage: Schema.Finite,
    healing: Schema.Finite,
    mitigation: Schema.Finite,
    resourcePressure: Schema.Finite,
    energyPressure: Schema.Finite,
    manaPressure: Schema.Finite,
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
  significanceScore: Schema.Finite,
  reason: Schema.String,
});

// Public links are read without signing in, so they carry no uploader identity.
const PublicBattleResponseSchema = BattleResponseSchema.mapFields(
  Struct.omit(["userId"]),
);

const BattleTimelineResponseSchema = Schema.Struct({
  battleId: Schema.String,
  generatedAt: DateTimeString,
  timeline: Schema.Array(BattleTimelineTurnResponseSchema),
  warriors: Schema.Array(BattleWarriorResponseSchema),
});

const BattleAcceptedResponseSchema = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
});

export const BattleResponseSchemas = {
  accepted: BattleAcceptedResponseSchema,
  battle: BattleResponseSchema,
  battles: BattlesListResponseSchema,
  characters: BattleCharactersResponseSchema,
  created: BattleCreatedResponseSchema,
  deleted: BattleDeletedResponseSchema,
  publicBattle: PublicBattleResponseSchema,
  raw: BattleRawResponseSchema,
  timeline: BattleTimelineResponseSchema,
  warriorsSearch: BattleWarriorsSearchResponseSchema,
} as const;
