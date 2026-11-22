import { Effect, Option, Predicate, Schema, SchemaGetter } from "effect";

const CreateBattlePartyMembersEventSchema = Schema.Struct({
  id: Schema.Finite,
  account: Schema.Finite,
  nick: Schema.String,
  icon: Schema.String,
  commander: Schema.optionalKey(Schema.Finite),
});

const CreateBattlePartyEventSchema = Schema.Struct({
  members: Schema.Record(Schema.String, CreateBattlePartyMembersEventSchema),
});

const CreateBattleFightEventWarriorSchema = Schema.Struct({
  originalId: Schema.Finite,
  name: Schema.String,
  lvl: Schema.Finite,
  prof: Schema.String,
  icon: Schema.String,
  team: Schema.Finite,
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
  endBattle: Schema.optionalKey(Schema.Finite),
  init: Schema.optionalKey(Schema.String),
  auto: Schema.optionalKey(Schema.String),
  w: OptionalWarriorsRecordSchema,
});

const CreateBattleMatchSummarySchema = Schema.Struct({
  difficulty_rank: Schema.Finite,
  result: Schema.Finite,
  rating_delta: Schema.Finite,
  opponent_lvl: Schema.Finite,
  opponent_oplvl: Schema.Finite,
  opponent_rating: Schema.Finite,
  rating: Schema.Finite,
  status: Schema.Finite,
  placement_cur: Schema.optionalKey(Schema.Finite),
  placement_max: Schema.optionalKey(Schema.Finite),
  points_gained: Schema.optionalKey(Schema.Finite),
  daily_stage: Schema.optionalKey(
    Schema.Struct({
      id: Schema.Finite,
      points_cur: Schema.Finite,
      points_max: Schema.Finite,
      points_step: Schema.Finite,
      rewards_last: Schema.Finite,
      rewards_cur: Schema.Finite,
      rewards_max: Schema.Finite,
    }),
  ),
});

const CreateBattleEventsSchema = Schema.Struct({
  party: Schema.optionalKey(CreateBattlePartyEventSchema),
  f: CreateBattleFightEventSchema,
  ev: Schema.optionalKey(Schema.Finite),
  match_summary: Schema.optionalKey(CreateBattleMatchSummarySchema),
  matchmaking_state: Schema.optionalKey(Schema.Finite),
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
