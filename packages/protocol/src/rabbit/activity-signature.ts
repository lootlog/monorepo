import { createHmac, timingSafeEqual } from "node:crypto";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import { Option, Schema } from "effect";

export const ACTIVITY_EVENT_SIGNATURE_HEADER = "x-lootlog-activity-signature";

const decodeSignature = Schema.decodeUnknownOption(
  Schema.Union([Schema.String, Schema.NonEmptyArray(Schema.String)]),
);

/** The signature header's value; AMQP may relay a header as a list. */
export const readActivityEventSignature = (
  header: string | ReadonlyArray<string> | undefined,
): string | undefined =>
  Option.getOrUndefined(
    Option.map(decodeSignature(header), (value) =>
      Array.isArray(value) ? value[0] : value,
    ),
  );

export function verifyActivityEventSignature({
  payload,
  secret,
  signature,
}: {
  payload: unknown;
  secret: string;
  signature: string | undefined;
}): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = signActivityEvent(payload, secret);

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function signActivityEvent(payload: unknown, secret: string): string {
  return createHmac("sha256", secret)
    .update(stableJsonStringify(payload))
    .digest("hex");
}
