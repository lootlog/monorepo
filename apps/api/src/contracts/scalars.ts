import * as Schema from "effect/Schema";

export const FiniteNumber = Schema.Number.check(
  Schema.isFinite().annotate({ expected: "a finite number" }),
);

const dateTimeString = (pattern: string) =>
  Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(new RegExp(pattern)).annotate({
      expected: `a string matching the RegExp ${pattern}`,
    }),
  );

export const DateTimeString = dateTimeString(
  "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
);

export const DateTimeWithOffsetString = dateTimeString(
  "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
);

export const NonEmptyString = Schema.String.check(
  Schema.isMinLength(1).annotate({
    expected: "a value with a length of at least 1",
  }),
);

export const JsonValue = Schema.Json.annotate({ expected: "JSON value" });

export const SafeInteger = Schema.Number.check(
  Schema.isInt().annotate({ expected: "an integer" }),
)
  .check(
    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
      expected: "a value greater than or equal to -9007199254740991",
    }),
  )
  .check(
    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
      expected: "a value less than or equal to 9007199254740991",
    }),
  );

export const PositiveSafeInteger = Schema.Number.check(
  Schema.isInt().annotate({ expected: "an integer" }),
)
  .check(
    Schema.isGreaterThanOrEqualTo(1).annotate({
      expected: "a value greater than or equal to 1",
    }),
  )
  .check(
    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
      expected: "a value less than or equal to 9007199254740991",
    }),
  );

export const NonNegativeSafeInteger = Schema.Number.check(
  Schema.isInt().annotate({ expected: "an integer" }),
)
  .check(
    Schema.isGreaterThanOrEqualTo(0).annotate({
      expected: "a value greater than or equal to 0",
    }),
  )
  .check(
    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
      expected: "a value less than or equal to 9007199254740991",
    }),
  );

export const LevelFilter = Schema.Number.check(
  Schema.isInt().annotate({ expected: "an integer" }),
)
  .check(
    Schema.isGreaterThanOrEqualTo(0).annotate({
      expected: "a value greater than or equal to 0",
    }),
  )
  .check(
    Schema.isLessThanOrEqualTo(500).annotate({
      expected: "a value less than or equal to 500",
    }),
  );

export const PageSize = Schema.Number.check(
  Schema.isInt().annotate({ expected: "an integer" }),
)
  .check(
    Schema.isGreaterThanOrEqualTo(1).annotate({
      expected: "a value greater than or equal to 1",
    }),
  )
  .check(
    Schema.isLessThanOrEqualTo(100).annotate({
      expected: "a value less than or equal to 100",
    }),
  );
