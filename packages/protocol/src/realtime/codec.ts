import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { LootSplitAckSchema } from "@lootlog/schema/loot-split";
import { Predicate, Result, Schema } from "effect";
import {
  PresenceSnapshot,
  MapPingAckSchema,
  AirTagSubscriptionAck,
  AirTagObservationAck,
  AirTagMapThreatsFetchResponse,
  RealtimeFrame,
  type RealtimeFrame as RealtimeFrameType,
} from "./protocol.js";
import {
  NpcPresenceReportAckSchema,
  NpcPresenceSnapshotSchema,
} from "@lootlog/schema/npc-presence";

export class RealtimeCodecError extends TaggedErrorClass<RealtimeCodecError>()(
  "RealtimeCodecError",
  {
    operation: Schema.Literals(["decode", "encode"]),
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

const getErrorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const tryEncodeFrame = (frame: RealtimeFrameType) =>
  Result.try({
    try: () => {
      const validated = Schema.encodeUnknownSync(RealtimeFrame)(frame);

      return { frame: validated, text: JSON.stringify(validated) };
    },
    catch: (error) =>
      new RealtimeCodecError({
        operation: "encode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

export const tryEncodeRealtimeFrame = (frame: RealtimeFrameType) =>
  Result.map(tryEncodeFrame(frame), ({ text }) => text);

// Only reuse values that a JSON round trip would leave unchanged. In particular,
// open payloads may contain accessors, binary views, undefined or custom objects.
// Keep the decoder as the authority for normalization and rejected keys.
const isJsonStable = (value: unknown): value is Schema.Json => {
  if (Predicate.isNumber(value))
    return Number.isFinite(value) && !Object.is(value, -0);

  if (!Predicate.isObjectOrArray(value))
    return (
      value === null || Predicate.isBoolean(value) || Predicate.isString(value)
    );

  const prototype: unknown = Object.getPrototypeOf(value);
  const array = Array.isArray(value);

  if (
    prototype !== (array ? Array.prototype : Object.prototype) &&
    prototype !== null
  )
    return false;

  const keys = Reflect.ownKeys(value);

  if (array && keys.length !== value.length + 1) return false;

  for (const key of keys) {
    if (!Predicate.isString(key)) return false;

    if (array && key === "length") continue;
    const property = Object.getOwnPropertyDescriptor(value, key);

    if (!property?.enumerable || !("value" in property)) return false;

    if (key === "__proto__") return false;

    if (!isJsonStable(property.value)) return false;
  }

  return true;
};

/** Encode once and retain the validated value when no wire normalization is needed. */
export const prepareRealtimeFrame = (frame: RealtimeFrameType) => {
  const encoded = Result.getOrThrow(tryEncodeFrame(frame));

  return {
    text: encoded.text,
    // An absent value requests the normal decoder path, never the original input.
    frame: isJsonStable(encoded.frame) ? encoded.frame : undefined,
  };
};

export const encodeRealtimeFrame = (frame: RealtimeFrameType): string =>
  Result.getOrThrow(tryEncodeRealtimeFrame(frame));

// JSON.stringify writes a `__proto__` key only in this form. Receivers that
// copy keys by assignment would turn it into a prototype, so no frame has one.
const PROTO_KEY = '"__proto__":';

const assertNoProtoKey = (text: string): void => {
  if (text.includes(PROTO_KEY))
    throw new Error("The key __proto__ is not allowed");
};

/**
 * Parse a frame that a peer encoded through this schema, without validating it
 * again. Use `tryDecodeRealtimeFrame` for any other input.
 */
export const tryParseEncodedRealtimeFrame = (text: string) =>
  Result.try({
    try: () => {
      assertNoProtoKey(text);
      const value: unknown = JSON.parse(text);

      if (!Predicate.isObject(value))
        throw new Error("Realtime frame is not an object");

      // SAFETY: the caller vouches that this schema encoded the text.
      return value as RealtimeFrameType;
    },
    catch: (error) =>
      new RealtimeCodecError({
        operation: "decode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

export const tryDecodeRealtimeFrame = (text: string) =>
  Result.try({
    try: () => {
      assertNoProtoKey(text);

      return Schema.decodeUnknownSync(RealtimeFrame)(JSON.parse(text));
    },
    catch: (error) =>
      new RealtimeCodecError({
        operation: "decode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

export const decodeRealtimeFrame = (text: string): RealtimeFrameType =>
  Result.getOrThrow(tryDecodeRealtimeFrame(text));

export const decodePresenceSnapshot =
  Schema.decodeUnknownSync(PresenceSnapshot);

export const isMapPingAcknowledgement = Schema.is(MapPingAckSchema);

export const isLootSplitAcknowledgement = Schema.is(LootSplitAckSchema);

export const isAirTagSubscriptionAcknowledgement = Schema.is(
  AirTagSubscriptionAck,
);

export const isAirTagObservationAcknowledgement =
  Schema.is(AirTagObservationAck);

export const isAirTagMapThreatsFetchResponse = Schema.is(
  AirTagMapThreatsFetchResponse,
);

export const isNpcPresenceReportAcknowledgement = Schema.is(
  NpcPresenceReportAckSchema,
);

export const isNpcPresenceSnapshot = Schema.is(NpcPresenceSnapshotSchema);

export const hasRealtimeCapabilities = Schema.is(
  Schema.Struct({ capabilities: Schema.Array(Schema.NonEmptyString) }),
);

export const isPresenceFetchResult = Schema.is(
  Schema.Struct({
    presences: Schema.optional(PresenceSnapshot.fields.presences),
  }),
);
