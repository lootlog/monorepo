import * as Schema from "effect/Schema";

export const FiniteNumber = Schema.Number.check(
  Schema.isFinite().annotate({ expected: "a finite number" }),
);
