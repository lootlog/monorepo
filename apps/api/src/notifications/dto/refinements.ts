import { z } from "zod";
import { Error } from "src/notifications/enum/error.enum";

export function refineNpcIds(
  data: { npcId?: number; npcIds?: number[] },
  ctx: z.RefinementCtx,
) {
  const hasNpcId = typeof data.npcId === "number";
  const hasNpcIds = Array.isArray(data.npcIds) && data.npcIds.length > 0;

  if (data.npcId !== undefined || data.npcIds !== undefined) {
    if (!hasNpcId && !hasNpcIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: Error.NOTIFICATION_RULE_MUST_TARGET_AT_LEAST_ONE_NPC,
        path: ["npcId"],
      });
    }
  }
}
