import { createHmac, timingSafeEqual } from "node:crypto";

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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => (item === undefined ? "null" : stableStringify(item)))
      .join(",")}]`;
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const properties = Object.keys(objectValue)
      .sort()
      .filter((key) => objectValue[key] !== undefined)
      .map(
        (key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`,
      );

    return `{${properties.join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}
