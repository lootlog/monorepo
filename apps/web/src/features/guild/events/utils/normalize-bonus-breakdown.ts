export interface NormalizedBonusBreakdownItem {
  ruleId: string;
  ruleName: string | null;
  points: number;
}

export const normalizeBonusBreakdown = (
  bonusBreakdown: unknown,
): NormalizedBonusBreakdownItem[] => {
  if (!Array.isArray(bonusBreakdown)) {
    return [];
  }

  return bonusBreakdown
    .map((entry) => {
      const points =
        typeof entry?.points === "number" && Number.isFinite(entry.points)
          ? Math.max(0, Math.round(entry.points * 100) / 100)
          : null;
      if (points === null || points <= 0) {
        return null;
      }

      return {
        ruleId:
          typeof entry.ruleId === "string" && entry.ruleId.length > 0
            ? entry.ruleId
            : "rule",
        ruleName:
          typeof entry.ruleName === "string" && entry.ruleName.trim().length > 0
            ? entry.ruleName.trim()
            : null,
        points,
      };
    })
    .filter((entry): entry is NormalizedBonusBreakdownItem => entry !== null);
};
