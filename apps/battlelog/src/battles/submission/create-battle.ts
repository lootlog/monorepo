import { Effect, Option, Predicate, Schema, SchemaGetter } from "effect";

const CreateBattlePartyMembersEventSchema = Schema.Struct({
  id: Schema.Number,
  account: Schema.Number,
  nick: Schema.String,
  icon: Schema.String,
  commander: Schema.optionalKey(Schema.Number),
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

const hasCompleteWarriorSnapshot = Schema.is(
  Schema.Struct(
    Object.fromEntries(
      Object.keys(CreateBattleFightEventWarriorSchema.fields).map((key) => [
        key,
        Schema.Unknown,
      ]),
    ),
  ),
);

export const WarriorsRecordSchema = Schema.Record(
  Schema.String,
  CreateBattleFightEventWarriorSchema,
).check(
  Schema.makeFilter(
    (record) => {
      const entries = Object.entries(record);

      if (entries.length === 0) return false;

      if (entries.some(([key]) => key.startsWith("-"))) return false;

      if (entries.some(([key, warrior]) => key !== String(warrior.originalId)))
        return false;
      const teams = new Set(entries.map(([, warrior]) => warrior.team));

      return teams.size > 1;
    },
    {
      expected:
        "a valid record of warriors keyed by their originalId from at least two teams",
    },
  ),
);

const decodeWarriorsRecord = Schema.decodeUnknownEffect(WarriorsRecordSchema);

const OptionalWarriorsRecordSchema = Schema.optionalKey(Schema.Unknown).pipe(
  Schema.decodeTo(Schema.optionalKey(WarriorsRecordSchema), {
    decode: SchemaGetter.transformOptionalEffect((input) => {
      if (Option.isNone(input) || input.value === undefined)
        return Effect.succeedNone;
      const value = input.value;

      const warriors = Predicate.isObject(value)
        ? Object.fromEntries(
            Object.entries(value).filter(([, warrior]) =>
              hasCompleteWarriorSnapshot(warrior),
            ),
          )
        : value;

      if (Predicate.isObject(warriors) && Object.keys(warriors).length === 0)
        return Effect.succeedNone;

      return decodeWarriorsRecord(warriors).pipe(
        Effect.mapBoth({
          onSuccess: Option.some,
          onFailure: (error) => error.issue,
        }),
      );
    }),
    encode: SchemaGetter.passthrough(),
  }),
);

const CreateBattleFightEventSchema = Schema.Struct({
  m: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  endBattle: Schema.optionalKey(Schema.Number),
  init: Schema.optionalKey(Schema.String),
  auto: Schema.optionalKey(Schema.String),
  w: OptionalWarriorsRecordSchema,
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
  placement_cur: Schema.optionalKey(Schema.Number),
  placement_max: Schema.optionalKey(Schema.Number),
  points_gained: Schema.optionalKey(Schema.Number),
  daily_stage: Schema.optionalKey(
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
  party: Schema.optionalKey(CreateBattlePartyEventSchema),
  f: CreateBattleFightEventSchema,
  ev: Schema.optionalKey(Schema.Number),
  match_summary: Schema.optionalKey(CreateBattleMatchSummarySchema),
  matchmaking_state: Schema.optionalKey(Schema.Number),
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

export type CreateBattleInput = typeof CreateBattleSchema.Type;
