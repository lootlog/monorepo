import { createHmac } from "node:crypto";
import { stableStringify } from "@lootlog/nest-shared/utils/stable-stringify";

export const ACTIVITY_EVENT_SIGNATURE_HEADER = "x-lootlog-activity-signature";

export function signActivityEvent(payload: unknown, secret: string): string {
  return createHmac("sha256", secret)
    .update(stableStringify(payload))
    .digest("hex");
}
