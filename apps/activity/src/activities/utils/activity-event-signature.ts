import { createHmac, timingSafeEqual } from "node:crypto";
import { stableStringify } from "@lootlog/nest-shared";

export const ACTIVITY_EVENT_SIGNATURE_HEADER = "x-lootlog-activity-signature";

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

  const expectedSignature = createHmac("sha256", secret)
    .update(stableStringify(payload))
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function signActivityEvent(payload: unknown, secret: string): string {
  return createHmac("sha256", secret)
    .update(stableStringify(payload))
    .digest("hex");
}
