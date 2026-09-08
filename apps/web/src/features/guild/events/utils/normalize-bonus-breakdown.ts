import { z } from "zod";

const bonusBreakdownItem = z.object({
  ruleId: z.string().min(1).catch("rule"),
  ruleName: z.string().trim().min(1).nullable().catch(null),
  points: z
    .number()
    .transform((points) => Math.max(0, Math.round(points * 100) / 100))
    .pipe(z.number().positive()),
});

export type NormalizedBonusBreakdownItem = z.output<typeof bonusBreakdownItem>;

export const normalizeBonusBreakdown = z
  .array(bonusBreakdownItem.nullable().catch(null))
  .transform((entries) => entries.filter((entry) => entry !== null))
  .catch([]).parse;
