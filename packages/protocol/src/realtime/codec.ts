import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { decode, encode } from "@msgpack/msgpack";
import { Result, Schema } from "effect";
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

export const tryEncodeRealtimeFrame = (frame: RealtimeFrameType) =>
  Result.try({
    try: () => {
      const validated = Schema.encodeUnknownSync(RealtimeFrame)(frame);
      return encode(validated, { ignoreUndefined: true });
    },
    catch: (error) =>
      new RealtimeCodecError({
        operation: "encode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

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
