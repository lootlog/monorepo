import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { decode, encode } from "@msgpack/msgpack";
import { Predicate, Result, Schema } from "effect";
import {
  PresenceSnapshot,
  MapPingAckSchema,
  AirTagSubscriptionAck,
  AirTagObservationAck,
  RealtimeFrame,
  type RealtimeFrame as RealtimeFrameType,
} from "./protocol.js";

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

      return {
        frame: validated,
        bytes: encode(validated, { ignoreUndefined: true }),
      };
    },
    catch: (error) =>
      new RealtimeCodecError({
        operation: "encode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

export const tryEncodeRealtimeFrame = (frame: RealtimeFrameType) =>
  Result.map(tryEncodeFrame(frame), ({ bytes }) => bytes);

// Only reuse values that MessagePack would leave unchanged. In particular,
// open payloads may contain accessors, binary views, undefined or custom objects.
// Keep the decoder as the authority for normalization and rejected map keys.
const isMessagePackStable = (value: unknown): value is Schema.Json => {
  if (Predicate.isNumber(value)) return !Object.is(value, -0);

  if (Predicate.isString(value)) return !/[\uD800-\uDFFF]/u.test(value);

  if (!Predicate.isObjectOrArray(value))
    return value === null || Predicate.isBoolean(value);

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

    if (key === "__proto__" || /[\uD800-\uDFFF]/u.test(key)) return false;

    if (!isMessagePackStable(property.value)) return false;
  }

  return true;
};

/** Encode once and retain the validated value when no wire normalization is needed. */
export const prepareRealtimeFrame = (frame: RealtimeFrameType) => {
  const encoded = Result.getOrThrow(tryEncodeFrame(frame));

  return {
    bytes: encoded.bytes,
    // An absent value requests the normal decoder path, never the original input.
    frame: isMessagePackStable(encoded.frame) ? encoded.frame : undefined,
  };
};

export const encodeRealtimeFrame = (
  frame: RealtimeFrameType,
): Uint8Array<ArrayBuffer> => Result.getOrThrow(tryEncodeRealtimeFrame(frame));

export const tryDecodeRealtimeFrame = (bytes: Uint8Array | ArrayBuffer) =>
  Result.try({
    try: () => {
      const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

      return Schema.decodeUnknownSync(RealtimeFrame)(decode(input));
    },
    catch: (error) =>
      new RealtimeCodecError({
        operation: "decode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

export const decodeRealtimeFrame = (
  bytes: Uint8Array | ArrayBuffer,
): RealtimeFrameType => Result.getOrThrow(tryDecodeRealtimeFrame(bytes));

export const decodePresenceSnapshot =
  Schema.decodeUnknownSync(PresenceSnapshot);

export const isMapPingAcknowledgement = Schema.is(MapPingAckSchema);

export const isAirTagSubscriptionAcknowledgement = Schema.is(
  AirTagSubscriptionAck,
);

export const isAirTagObservationAcknowledgement =
  Schema.is(AirTagObservationAck);

export const isPresenceFetchResult = Schema.is(
  Schema.Struct({
    presences: Schema.optional(PresenceSnapshot.fields.presences),
  }),
);
