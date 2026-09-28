/** Transport schemas owned by the health HTTP module. */
import * as Schema from "effect/Schema";

// schemas
export type HealthzControllerCheck200 = typeof HealthzControllerCheck200.Type;

export const HealthzControllerCheck200 = Schema.Struct({
  status: Schema.optionalKey(Schema.String.annotate({ examples: ["ok"] })),
  info: Schema.optionalKey(
    Schema.Union([
      Schema.Record(Schema.String, Schema.Struct({ status: Schema.String })),
      Schema.Null,
    ]).annotate({ examples: [{ process: { status: "up" } }] }),
  ),
  error: Schema.optionalKey(
    Schema.Union([
      Schema.Record(Schema.String, Schema.Struct({ status: Schema.String })),
      Schema.Null,
    ]).annotate({ examples: [null] }),
  ),
  details: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Struct({ status: Schema.String }),
    ).annotate({ examples: [{ process: { status: "up" } }] }),
  ),
});

const DatabaseUp = Schema.Struct({
  database: Schema.Struct({ status: Schema.Literal("up") }),
});

const DatabaseDown = Schema.Struct({
  database: Schema.Struct({ status: Schema.Literal("down") }),
});

export type ReadyzControllerCheck200 = typeof ReadyzControllerCheck200.Type;

export const ReadyzControllerCheck200 = Schema.Struct({
  status: Schema.Literal("ok"),
  info: DatabaseUp,
  error: Schema.Null,
  details: DatabaseUp,
});

export type ReadyzControllerCheck503 = typeof ReadyzControllerCheck503.Type;

export const ReadyzControllerCheck503 = Schema.Struct({
  status: Schema.Literal("error"),
  info: Schema.Null,
  error: DatabaseDown,
  details: DatabaseDown,
});
