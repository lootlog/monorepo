import { decode, encode } from "@msgpack/msgpack";
import { Schema } from "effect";
import {
  RealtimeFrame,
  type RealtimeFrame as RealtimeFrameType,
} from "./protocol.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Effect TaggedError is a class factory.
export class RealtimeCodecError extends Schema.TaggedError<RealtimeCodecError>()(
  "RealtimeCodecError",
  {
    operation: Schema.Literals(["decode", "encode"]),
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

const getErrorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

export const encodeRealtimeFrame = (frame: RealtimeFrameType): Uint8Array => {
  try {
    const validated = Schema.encodeUnknownSync(RealtimeFrame)(frame);
    return encode(validated);
  } catch (error) {
    throw new RealtimeCodecError({
      operation: "encode",
      message: getErrorMessage(error),
      cause: error,
    });
  }
};

export const decodeRealtimeFrame = (
  bytes: Uint8Array | ArrayBuffer,
): RealtimeFrameType => {
  try {
    const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return Schema.decodeUnknownSync(RealtimeFrame)(decode(input));
  } catch (error) {
    throw new RealtimeCodecError({
      operation: "decode",
      message: getErrorMessage(error),
      cause: error,
    });
  }
};
