import { Effect, Option, Schema } from "effect";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import {
  looseStruct,
  optionalOrUndefined,
  withFallback,
} from "@/lib/stored-value-schema";

const generalConfig = looseStruct({
  removeTimerAfterMs: Schema.optional(Schema.Finite),
  timersGrouping: Schema.optional(Schema.Boolean),
  timersUnderBag: Schema.optional(Schema.Boolean),
  countdownMode: Schema.optional(Schema.Literals(["min", "max"])),
  compactView: Schema.optional(Schema.Boolean),
});

const displayConfig = looseStruct({
  // Missing, undefined, and invalid flags all read as the modern appearance.
  legacyAppearance: Schema.Boolean.pipe(
    withFallback(false),
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),
  showType: Schema.optional(Schema.Boolean),
  showLevel: Schema.optional(Schema.Boolean),
  fontSize: Schema.optional(Schema.Finite),
  minColumnWidth: Schema.optional(Schema.Finite),
  singleTimerDisplayMode: Schema.optional(Schema.Literals(["column", "row"])),
});

const stringList = Schema.mutable(Schema.Array(Schema.String));

const stringLists = Schema.Record(Schema.String, stringList);

const colorFields = {
  borderColor: Schema.String,
  backgroundColor: Schema.String,
};

const persistedTimerSettings = Schema.Struct({
  updatedAt: optionalOrUndefined(Schema.Finite),
  generalConfig: optionalOrUndefined(generalConfig),
  displayConfig: optionalOrUndefined(displayConfig),
  hiddenTimers: optionalOrUndefined(stringLists),
  pinnedTimers: optionalOrUndefined(stringLists),
  alwaysVisibleExpiredTimers: optionalOrUndefined(stringLists),
  timersColors: optionalOrUndefined(
    Schema.Record(Schema.String, Schema.UndefinedOr(Schema.String)),
  ),
  customColors: optionalOrUndefined(
    Schema.Record(
      Schema.String,
      Schema.Struct({ ...colorFields, id: Schema.String, name: Schema.String }),
    ),
  ),
  defaultColorNames: optionalOrUndefined(
    Schema.Record(Schema.String, Schema.String),
  ),
  overriddenDefaultColors: optionalOrUndefined(
    Schema.Record(Schema.String, Schema.Struct(colorFields)),
  ),
  hiddenDefaultColors: optionalOrUndefined(stringList),
  timersFilters: optionalOrUndefined(
    Schema.Record(
      Schema.String,
      Schema.Struct({
        minLvl: Schema.Finite,
        maxLvl: Schema.Finite,
        selectedNpcTypes: Schema.mutable(Schema.Array(NpcTypeSchema)),
        selectedColors: stringList,
      }),
    ),
  ),
  timerFiltersEnabled: optionalOrUndefined(Schema.Boolean),
  colorFiltersEnabled: optionalOrUndefined(Schema.Boolean),
  timersSortOrder: optionalOrUndefined(Schema.Literals(["asc", "desc"])),
});

const decodePersistedTimerSettings = Schema.decodeUnknownOption(
  persistedTimerSettings,
);

export const decodeTimerSettings = (value: unknown) => {
  const decoded = decodePersistedTimerSettings(value);

  return Option.isSome(decoded) ? decoded.value : {};
};
