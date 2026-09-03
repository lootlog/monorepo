/** Transport schemas owned by the health HTTP module. */
import * as Schema from "effect/Schema";

// schemas
export type HealthzControllerCheck200 = {
  readonly status?: string;
  readonly info?: { readonly [x: string]: { readonly status: string } } | null;
  readonly error?: { readonly [x: string]: { readonly status: string } } | null;
  readonly details?: { readonly [x: string]: { readonly status: string } };
};

export const HealthzControllerCheck200 = Schema.Struct({
  status: Schema.optionalKey(Schema.String.annotate({ examples: ["ok"] })),
  info: Schema.optionalKey(
    Schema.Union([
      Schema.Record(Schema.String, Schema.Struct({ status: Schema.String })),
      Schema.Null,
    ]).annotate({ examples: [{ database: { status: "up" } }] }),
  ),
  error: Schema.optionalKey(
    Schema.Union([
      Schema.Record(Schema.String, Schema.Struct({ status: Schema.String })),
      Schema.Null,
    ]).annotate({ examples: [{}] }),
  ),
  details: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Struct({ status: Schema.String }),
    ).annotate({ examples: [{ database: { status: "up" } }] }),
  ),
});

export type HealthzControllerCheck503 = {
  readonly status?: string;
  readonly info?: { readonly [x: string]: { readonly status: string } } | null;
  readonly error?: { readonly [x: string]: { readonly status: string } } | null;
  readonly details?: { readonly [x: string]: { readonly status: string } };
};

export const HealthzControllerCheck503 = Schema.Struct({
  status: Schema.optionalKey(Schema.String.annotate({ examples: ["error"] })),
  info: Schema.optionalKey(
    Schema.Union([
      Schema.Record(Schema.String, Schema.Struct({ status: Schema.String })),
      Schema.Null,
    ]).annotate({ examples: [{ database: { status: "up" } }] }),
  ),
  error: Schema.optionalKey(
    Schema.Union([
      Schema.Record(Schema.String, Schema.Struct({ status: Schema.String })),
      Schema.Null,
    ]).annotate({
      examples: [{ redis: { status: "down" } }],
    }),
  ),
  details: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Struct({ status: Schema.String }),
    ).annotate({
      examples: [
        {
          database: { status: "up" },
          redis: { status: "down" },
        },
      ],
    }),
  ),
});
