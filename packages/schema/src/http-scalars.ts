import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import { NpcTypeSchema } from "./npc-type.js";

export const FiniteNumber = Schema.Number.check(
  Schema.isFinite().annotate({ expected: "a finite number" }),
);

const dateTimeString = (pattern: string) =>
  Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(new RegExp(pattern, "u")).annotate({
      expected: `a string matching the RegExp ${pattern}`,
    }),
  );

const dateTimePattern = (timeZonePattern: string) =>
  `^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:${timeZonePattern}))$`;

export const DATE_TIME_STRING_PATTERN = dateTimePattern("Z");

export const DateTimeString = dateTimeString(DATE_TIME_STRING_PATTERN);

export const DateTimeWithOffsetString = dateTimeString(
  dateTimePattern("Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)"),
);

export const NonEmptyString = Schema.String.check(
  Schema.isMinLength(1).annotate({
    expected: "a value with a length of at least 1",
  }),
);

export const JsonValue = Schema.Json.annotate({ expected: "JSON value" });

const boundedInteger = (minimum: number, maximum: number) =>
  Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
    .check(
      Schema.isGreaterThanOrEqualTo(minimum).annotate({
        expected: `a value greater than or equal to ${minimum}`,
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(maximum).annotate({
        expected: `a value less than or equal to ${maximum}`,
      }),
    );

export const SafeInteger = boundedInteger(-9007199254740991, 9007199254740991);

export const PositiveSafeInteger = boundedInteger(1, 9007199254740991);

export const NonNegativeSafeInteger = boundedInteger(0, 9007199254740991);

export const LevelFilter = boundedInteger(0, 500);

export const PageSize = boundedInteger(1, 100);

export const levelRangeCheck = <Min extends string, Max extends string>(
  minKey: Min,
  maxKey: Max,
) =>
  Schema.makeFilter<{ readonly [K in Min | Max]?: number }>((data) => {
    const min = data[minKey];
    const max = data[maxKey];

    return min === undefined || max === undefined || min <= max
      ? undefined
      : { path: [minKey], issue: `${minKey} must be <= ${maxKey}` };
  });

export const NpcLevelRange = {
  fields: {
    npcLevelMin: Schema.optionalKey(LevelFilter),
    npcLevelMax: Schema.optionalKey(LevelFilter),
  },
  check: levelRangeCheck("npcLevelMin", "npcLevelMax"),
};

export const NpcTypes = Schema.Array(NpcTypeSchema);

export const Period = Schema.Literals([
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
  "90d",
  "180d",
  "all",
]).annotate({ default: "7d" });

export type Period = typeof Period.Type;

export const DEFAULT_PERIOD: Period = "7d";

export const BooleanQuery = Schema.Boolean;

const WORLD_MAX_LENGTH = 64;

export const WorldParam = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(WORLD_MAX_LENGTH),
)
  .pipe(
    Schema.decode(SchemaTransformation.trim()),
    Schema.decode(SchemaTransformation.toLowerCase()),
  )
  .check(Schema.isMinLength(1).annotate({ expected: "a non-empty world" }));

const SEARCH_TEXT_MAX_LENGTH = 100;

export const SearchText = Schema.String.check(
  Schema.isMaxLength(SEARCH_TEXT_MAX_LENGTH),
).pipe(Schema.decode(SchemaTransformation.trim()));

export const PageCursor = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(512),
);

export const Page = <Item extends Schema.Top>(item: Item) =>
  Schema.Struct({
    items: Schema.Array(item),
    nextCursor: Schema.NullOr(Schema.String),
  });
