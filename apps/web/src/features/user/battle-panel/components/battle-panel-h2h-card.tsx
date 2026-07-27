import { BattlePanelH2hOpponentSummary } from "@/features/user/battle-panel/components/battle-panel-h2h-opponent-summary";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import {
  BattleResultStatus,
  getBattleResultRowClassName,
} from "@/features/user/battle-panel/components/battle-result-status";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

type BattlePanelH2hCardProps = {
  record: HeadToHeadRecord;
  showRatingDelta?: boolean;
  onOpen: (opponentId: string) => void;
};

export const BattlePanelH2hCard = ({
  record,
  showRatingDelta = false,
  onOpen,
}: BattlePanelH2hCardProps) => {
  const { t } = useTranslation();
  const exactTime = format(new Date(record.lastBattleDate), "dd.MM.yyyy HH:mm");
  const totalRatingDelta = record.totalRatingDelta ?? 0;
  const ratingDeltaSign = totalRatingDelta >= 0 ? "+" : "";

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border border-border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        getBattleResultRowClassName(record.lastBattleResult),
      )}
      onClick={() => onOpen(record.opponentId)}
    >
      <div className="flex items-start justify-between gap-3">
        <BattleResultStatus result={record.lastBattleResult} showLabel />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-right text-xs font-medium text-muted-foreground">
              {getRelativeTime(record.lastBattleDate)}
            </span>
          </TooltipTrigger>
          <TooltipContent>{exactTime}</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
        <BattlePanelH2hOpponentSummary
          record={record}
          className="max-w-[min(100%,280px)]"
        />
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              record.winRate >= 50
                ? BATTLE_TEXT_COLORS.result.won
                : BATTLE_TEXT_COLORS.result.lost,
            )}
          >
            {record.winRate.toFixed(1)}%
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("battlePanel.statistics.columns.winRate")}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md border border-border/70 bg-background p-2">
          <p className={cn("font-semibold", BATTLE_TEXT_COLORS.result.won)}>
            {record.wins}
          </p>
          <p className="text-muted-foreground">
            {t("battlePanel.filters.results.won")}
          </p>
        </div>
        <div className="rounded-md border border-border/70 bg-background p-2">
          <p className={cn("font-semibold", BATTLE_TEXT_COLORS.result.lost)}>
            {record.losses}
          </p>
          <p className="text-muted-foreground">
            {t("battlePanel.filters.results.lost")}
          </p>
        </div>
        <div className="rounded-md border border-border/70 bg-background p-2">
          <p className="font-semibold">{record.totalBattles}</p>
          <p className="text-muted-foreground">
            {t("battlePanel.statistics.columns.total")}
          </p>
        </div>
      </div>

      {showRatingDelta && (
        <div className="mt-2 rounded-md border border-border/70 bg-background p-2 text-xs">
          <span className="text-muted-foreground">
            {t("battlePanel.statistics.columns.totalRatingDelta")}:
          </span>{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              totalRatingDelta >= 0
                ? BATTLE_TEXT_COLORS.result.won
                : BATTLE_TEXT_COLORS.result.lost,
            )}
          >
            {ratingDeltaSign}
            {totalRatingDelta}
          </span>
        </div>
      )}
    </button>
  );
};
