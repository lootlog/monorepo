import { Schema } from "effect";

export const EXTENSION_CHANNEL = "lootlog.extension.v1";

export const MAX_MESSAGE_LENGTH = 20 * 1024 * 1024;

export const MAX_PENDING_REQUESTS = 64;

export const REQUEST_TIMEOUT_MS = 30_000;

const isSerializedMessage = Schema.is(
  Schema.String.check(Schema.isMaxLength(MAX_MESSAGE_LENGTH)),
);

const maxLength = (length: number) =>
  Schema.String.check(Schema.isMaxLength(length));

const id = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(80));

const ExtensionRequestSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("http"),
    id,
    request: Schema.Struct({
      url: maxLength(8192),
      method: maxLength(10),
      headers: Schema.Record(maxLength(100), maxLength(8192)),
      body: Schema.optional(Schema.String),
    }),
  }),
  Schema.Struct({ type: Schema.Literal("cancel"), id }),
  Schema.Struct({ type: Schema.Literal("connect"), id }),
  Schema.Struct({ type: Schema.Literal("disconnect"), id }),
  Schema.Struct({ type: Schema.Literal("release"), id }),
  Schema.Struct({
    type: Schema.Literal("command"),
    id,
    command: Schema.Unknown,
  }),
]);

export type ExtensionRequest = typeof ExtensionRequestSchema.Type;

/**
 * Requests cross from the page into the extension, so unknown keys (and
 * header names over the key limit) are rejected rather than stripped.
 */
export const decodeExtensionRequest = Schema.decodeUnknownSync(
  ExtensionRequestSchema,
  { onExcessProperty: "error" },
);

const ExtensionMessageSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("ready") }),
  Schema.Struct({ type: Schema.Literal("reset") }),
  Schema.Struct({ type: Schema.Literal("closed") }),
  Schema.Struct({ type: Schema.Literal("result"), id, data: Schema.Unknown }),
  Schema.Struct({
    type: Schema.Literal("error"),
    id,
    message: Schema.String,
    code: Schema.optional(Schema.String),
    retryable: Schema.optional(Schema.Boolean),
    retryAfterMs: Schema.optional(Schema.Finite),
  }),
  Schema.Struct({
    type: Schema.Literal("state"),
    state: Schema.Literals([
      "disconnected",
      "connecting",
      "connected",
      "joining",
      "ready",
      "reconnecting",
    ]),
  }),
  Schema.Struct({
    type: Schema.Literal("heartbeat-latency"),
    latencyMs: Schema.NullOr(
      Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
    ),
  }),
  Schema.Struct({ type: Schema.Literal("event"), event: Schema.Unknown }),
]);

export type ExtensionMessage = typeof ExtensionMessageSchema.Type;

export const decodeExtensionMessage = Schema.decodeUnknownSync(
  ExtensionMessageSchema,
);

export function decodeMessage(value: unknown): unknown {
  if (!isSerializedMessage(value)) throw new Error("Invalid extension message");

  return JSON.parse(value);
}

export function encodeMessage(
  value: ExtensionRequest | ExtensionMessage,
): string {
  const serialized = JSON.stringify(value);

  if (serialized.length > MAX_MESSAGE_LENGTH)
    throw new Error("Extension message too large");

  return serialized;
}
