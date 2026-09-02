import { Effect, Predicate, Schema, SchemaGetter } from "effect";

const CreateBattlePartyMembersEventSchema = Schema.Struct({
  id: Schema.Number,
  account: Schema.Number,
  nick: Schema.String,
  icon: Schema.String,
  commander: Schema.optional(Schema.Number),
});

const CreateBattlePartyEventSchema = Schema.Struct({
  members: Schema.Record(Schema.String, CreateBattlePartyMembersEventSchema),
});

const CreateBattleFightEventWarriorSchema = Schema.Struct({
  originalId: Schema.Number,
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  team: Schema.Number,
});

const requiredWarriorSnapshotFields = [
  "originalId",
  "name",
  "lvl",
  "prof",
  "icon",
  "team",
] as const;

const hasCompleteWarriorSnapshotShape = (value: unknown): boolean =>
  Predicate.isObject(value) &&
  requiredWarriorSnapshotFields.every((field) => field in value);

const removeIncompleteWarriorSnapshots = (value: unknown): unknown => {
  if (!Predicate.isObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).filter(([, warrior]) =>
      hasCompleteWarriorSnapshotShape(warrior),
    ),
  );
};

export const WarriorsRecordSchema = Schema.Record(
  Schema.String,
  CreateBattleFightEventWarriorSchema,
).check(
  Schema.makeFilter(
    (record) => {
      const entries = Object.entries(record);
      if (entries.length === 0) return false;
      if (entries.some(([key]) => key.startsWith("-"))) return false;
      const teams = new Set(entries.map(([, warrior]) => warrior.team));
      return teams.size > 1;
    },
    { expected: "a valid record of warriors from at least two teams" },
  ),
);

const optionalWarriorsRecord = Schema.optional(WarriorsRecordSchema);
const decodeOptionalWarriorsRecord = Schema.decodeUnknownEffect(
  optionalWarriorsRecord,
);

const OptionalWarriorsRecordSchema = Schema.Unknown.pipe(
  Schema.decodeTo(optionalWarriorsRecord, {
    decode: SchemaGetter.transformOrFail((value) => {
      const warriors = removeIncompleteWarriorSnapshots(value);
      const normalized =
        Predicate.isObject(warriors) && Object.keys(warriors).length === 0
          ? undefined
          : warriors;

      return decodeOptionalWarriorsRecord(normalized).pipe(
        Effect.mapError((error) => error.issue),
      );
    }),
    encode: SchemaGetter.transform((value) => value),
  }),
);

const CreateBattleFightEventSchema = Schema.Struct({
  m: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  endBattle: Schema.optional(Schema.Number),
  init: Schema.optional(Schema.String),
  auto: Schema.optional(Schema.String),
  w: Schema.optional(OptionalWarriorsRecordSchema),
});

const CreateBattleMatchSummarySchema = Schema.Struct({
  difficulty_rank: Schema.Number,
  result: Schema.Number,
  rating_delta: Schema.Number,
  opponent_lvl: Schema.Number,
  opponent_oplvl: Schema.Number,
  opponent_rating: Schema.Number,
  rating: Schema.Number,
  status: Schema.Number,
  placement_cur: Schema.optional(Schema.Number),
  placement_max: Schema.optional(Schema.Number),
  points_gained: Schema.optional(Schema.Number),
  daily_stage: Schema.optional(
    Schema.Struct({
      id: Schema.Number,
      points_cur: Schema.Number,
      points_max: Schema.Number,
      points_step: Schema.Number,
      rewards_last: Schema.Number,
      rewards_cur: Schema.Number,
      rewards_max: Schema.Number,
    }),
  ),
});

const CreateBattleEventsSchema = Schema.Struct({
  party: Schema.optional(CreateBattlePartyEventSchema),
  f: CreateBattleFightEventSchema,
  ev: Schema.optional(Schema.Number),
  match_summary: Schema.optional(CreateBattleMatchSummarySchema),
  matchmaking_state: Schema.optional(Schema.Number),
});

export const CreateBattleSchema = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  submissionId: Schema.optional(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  ),
  world: Schema.String,
  matchmaking: Schema.optional(Schema.Boolean),
  events: Schema.mutable(Schema.Array(CreateBattleEventsSchema)).check(
    Schema.isMinLength(1),
  ),
});

export type CreateBattleDto = typeof CreateBattleSchema.Type;
