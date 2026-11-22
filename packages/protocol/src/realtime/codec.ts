import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Predicate, Result, Schema } from "effect";
import {
  CommandSuccess,
  RealtimeFrame,
  type ClientCommand,
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

export const prepareRealtimeFrame = (frame: RealtimeFrameType) => {
  const encoded = Result.getOrThrow(tryEncodeFrame(frame));

  return {
    text: encoded.text,
    frame: isJsonStable(encoded.frame) ? encoded.frame : undefined,
  };
};

export const encodeRealtimeFrame = (frame: RealtimeFrameType): string =>
  Result.getOrThrow(tryEncodeRealtimeFrame(frame));

const rejectProtoKey = (key: string, value: Schema.Json) => {
  if (key === "__proto__") throw new Error("The key __proto__ is not allowed");

  return value;
};

const isWithoutProtoKey = (text: string): boolean =>
  !text.includes("__proto__") && !text.includes("\\u");

export const parseRealtimeJson = (text: string): Schema.Json =>
  isWithoutProtoKey(text) ? JSON.parse(text) : JSON.parse(text, rejectProtoKey);

export const tryParseEncodedRealtimeFrame = (text: string) =>
  Result.try({
    try: () => {
      const value = parseRealtimeJson(text);

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

const tryDecode = (input: () => Schema.Json) =>
  Result.try({
    try: () => Schema.decodeUnknownSync(RealtimeFrame)(input()),
    catch: (error) =>
      new RealtimeCodecError({
        operation: "decode",
        message: getErrorMessage(error),
        cause: error,
      }),
  });

export const tryDecodeRealtimeFrameValue = (value: Schema.Json) =>
  tryDecode(() => value);

export const tryDecodeRealtimeFrame = (text: string) =>
  tryDecode(() => parseRealtimeJson(text));

export const decodeRealtimeFrame = (text: string): RealtimeFrameType =>
  Result.getOrThrow(tryDecodeRealtimeFrame(text));

type CommandType = ClientCommand["type"];

const commandSuccessDecoders = new Map<
  CommandType,
  ReturnType<typeof Schema.decodeUnknownSync>
>();

export const decodeCommandSuccess = <Type extends CommandType>(
  type: Type,
  data: unknown,
): CommandSuccess<Type> => {
  let decode = commandSuccessDecoders.get(type);

  if (!decode) {
    decode = Schema.decodeUnknownSync(CommandSuccess[type]);
    commandSuccessDecoders.set(type, decode);
  }

  try {
    // SAFETY: the decoder stored under `type` is CommandSuccess[type]'s.
    return decode(data) as CommandSuccess<Type>;
  } catch (cause) {
    throw new RealtimeCodecError({
      operation: "decode",
      message: `Invalid ${type} response`,
      cause,
    });
  }
};
