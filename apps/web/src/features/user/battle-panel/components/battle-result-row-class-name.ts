import { BATTLE_SURFACE_COLORS } from "@/components/battle/utils/battle-color-palette";
import type { BattleResultStatusValue } from "./battle-result-status";

export const getBattleResultRowClassName = (
  result?: BattleResultStatusValue | null,
) => {
  if (result === "won") {
    return BATTLE_SURFACE_COLORS.resultRow.won;
  }

  if (result === "lost") {
    return BATTLE_SURFACE_COLORS.resultRow.lost;
  }

  if (result !== "flee") {
    return BATTLE_SURFACE_COLORS.resultRow.unknown;
  }

  return BATTLE_SURFACE_COLORS.resultRow.flee;
};
