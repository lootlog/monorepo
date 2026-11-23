import {
  type prepareRealtimeFrame,
  tryDecodeRealtimeFrameValue,
  tryParseEncodedRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { RealtimeFrame, type ServerEvent } from "@lootlog/protocol/realtime";
import { Predicate, Result, Schema } from "effect";

export interface PublishedFrame {
  readonly event: ServerEvent;
  text?: string;
}

export const encodePublishedFrame = (frame: PublishedFrame): string =>
  (frame.text ??= JSON.stringify(frame.event));

export const FRAME_SCHEMA = Bun.hash(
  JSON.stringify(Schema.toJsonSchemaDocument(RealtimeFrame)),
).toString(36);

export const decodePublishedFrame = (
  value: Schema.Json | undefined,
  frameSchema: string | undefined,
  local: ReturnType<typeof prepareRealtimeFrame> | undefined,
) =>
  local !== undefined
    ? local.frame
      ? Result.succeed(local.frame)
      : tryParseEncodedRealtimeFrame(local.text)
    : value === undefined
      ? undefined
      : frameSchema === FRAME_SCHEMA
        ? Predicate.isObject(value)
          ? // SAFETY: a replica with this schema encoded the value through it.
            Result.succeed(value as RealtimeFrame)
          : Result.fail(new Error("Federation frame is not an object"))
        : tryDecodeRealtimeFrameValue(value);
