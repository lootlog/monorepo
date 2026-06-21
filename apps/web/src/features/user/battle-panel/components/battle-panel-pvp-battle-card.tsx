import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import type { PlayerVsPlayerBattle } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { cn } from "@lootlog/ui/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { getPlayerVsPlayerBattleResult } from "./battle-panel-battle-presentation";
import { BattlePanelPvpWarriorSummary } from "./battle-panel-pvp-warrior-summary";
import {
  BattleResultStatus,
  getBattleResultRowClassName,
} from "./battle-result-status";

type BattlePanelPvpBattleCardProps = {
  battle: PlayerVsPlayerBattle;
  onBattleClick: (battleId: string) => void;
};

export const BattlePanelPvpBattleCard = ({
  battle,
  onBattleClick,
}: BattlePanelPvpBattleCardProps) => {
  const { t } = useTranslation();
  const result = getPlayerVsPlayerBattleResult(battle);
  const exactTime = format(new Date(battle.createdAt), "dd.MM.yyyy HH:mm");
  const ratingDelta = battle.ratingDelta;
  let ratingDeltaLabel = t("battlePanel.single.recentOpponent.noRating");

  if (ratingDelta !== null) {
    const sign = ratingDelta >= 0 ? "+" : "";
    ratingDeltaLabel = `${sign}${ratingDelta}`;
  }

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border border-border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        getBattleResultRowClassName(result),
      )}
      onClick={() => onBattleClick(battle.battleId)}
    >
      <div className="flex items-start justify-between gap-3">
        <BattleResultStatus result={result} showLabel />
        <span className="text-xs text-muted-foreground">
          {getRelativeTime(battle.createdAt)}
        </span>
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] text-muted-foreground">
            {t("battlePanel.list.columns.yourTeam")}
          </p>
          <BattlePanelPvpWarriorSummary
            warrior={battle.userWarrior}
            opposingWarrior={battle.opponentWarrior}
            className="max-w-full"
          />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[11px] text-muted-foreground">
            {t("battlePanel.list.columns.opponents")}
          </p>
          <BattlePanelPvpWarriorSummary
            warrior={battle.opponentWarrior}
            opposingWarrior={battle.userWarrior}
            className="max-w-full"
          />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">{exactTime}</p>
        <div className="text-right">
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              ratingDelta !== null &&
                (ratingDelta >= 0
                  ? BATTLE_TEXT_COLORS.result.won
                  : BATTLE_TEXT_COLORS.result.lost),
            )}
          >
            {ratingDeltaLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("battlePanel.statistics.columns.ratingDelta")}
          </p>
        </div>
      </div>
    </button>
  );
};
