import { Effect, flow, Option, Schema } from "effect";
import { NpcTypeSchema } from "./npc-type.js";
import {
  looseStruct,
  optionalOrUndefined,
  withFallback,
} from "./stored-value.js";

export type NpcType =
  | "COMMON"
  | "ELITE"
  | "ELITE2"
  | "ELITE3"
  | "HERO"
  | "EVENT_HERO"
  | "TITAN"
  | "COLOSSUS"
  | "NPC";

export interface TimersFilters {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
  selectedColors: string[];
  selectedLists: string[];
}

export interface TimersGeneralConfig {
  removeTimerAfterMs: number;
  timersGrouping: boolean;
  timersUnderBag: boolean;
  countdownMode: "min" | "max";
}

export interface TimersDisplayConfig {
  legacyAppearance: boolean;
  showType: boolean;
  showLevel: boolean;
  fontSize: number;
  minColumnWidth: number;
  singleTimerDisplayMode: "column" | "row";
}

export type CustomTimerColor = {
  id: string;
  name: string;
  borderColor: string;
  backgroundColor: string;
};

/** A player-defined list of timers, matched by monster name. */
export type CustomTimerList = {
  id: string;
  name: string;
  npcNames: string[];
};

export interface UserTimerSettings {
  userId: string;
  generalConfig: TimersGeneralConfig;
  displayConfig: TimersDisplayConfig;
  customColors: Record<string, CustomTimerColor>;
  timersColors: Record<string, string | undefined>;
  customLists: Record<string, CustomTimerList>;
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors: string[];
  timerFiltersEnabled: boolean;
  colorFiltersEnabled: boolean;
  timersSortOrder: "asc" | "desc";
  syncEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateTimerSettingsPayload {
  generalConfig?: Partial<TimersGeneralConfig>;
  displayConfig?: Partial<TimersDisplayConfig>;
  customColors?: Record<string, CustomTimerColor>;
  timersColors?: Record<string, string | undefined>;
  alwaysVisibleExpiredTimers?: Record<string, string[]>;
  defaultColorNames?: Record<string, string>;
  overriddenDefaultColors?: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors?: string[];
  timerFiltersEnabled?: boolean;
  colorFiltersEnabled?: boolean;
  timersSortOrder?: "asc" | "desc";
  syncEnabled?: boolean;
}

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

// Filters stored before lists existed have no list selection.
const selectedLists = stringList.pipe(
  withFallback([]),
  Schema.withDecodingDefaultType(Effect.succeed([])),
);

const colorFields = {
  borderColor: Schema.String,
  backgroundColor: Schema.String,
};

const timerFilters = Schema.Record(
  Schema.String,
  Schema.Struct({
    minLvl: Schema.Finite,
    maxLvl: Schema.Finite,
    selectedNpcTypes: Schema.mutable(Schema.Array(NpcTypeSchema)),
    selectedColors: stringList,
    selectedLists,
  }),
);

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
  customLists: optionalOrUndefined(
    Schema.Record(
      Schema.String,
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        npcNames: stringList,
      }),
    ),
  ),
  timersFilters: optionalOrUndefined(timerFilters),
  legacyTimersFilters: optionalOrUndefined(timerFilters),
  timerFiltersEnabled: optionalOrUndefined(Schema.Boolean),
  colorFiltersEnabled: optionalOrUndefined(Schema.Boolean),
  timersSortOrder: optionalOrUndefined(Schema.Literals(["asc", "desc"])),
});

/**
 * Reads timer settings stored by any earlier release, in localStorage or in a
 * settings document; one invalid field falls back without losing the rest.
 */
export const decodeTimerSettings = flow(
  Schema.decodeUnknownOption(persistedTimerSettings),
  // Every stored field is optional, so nothing readable is an empty object.
  Option.getOrElse((): typeof persistedTimerSettings.Type => ({})),
);
