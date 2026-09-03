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
