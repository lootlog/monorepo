import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import {
  formatBattleMetric,
  formatSignedBattleMetric,
} from "@/components/battle/utils/value-utils";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { BattlePanelH2hOpponentSummary } from "@/features/user/battle-panel/components/battle-panel-h2h-opponent-summary";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

type BattleOpponentRowProps = {
  record: HeadToHeadRecord;
  /** The head-to-head page with this opponent. */
  link: LinkProps;
  /** Abyss battles also show how the rating moved against the opponent. */
  rated?: boolean;
};

/** One opponent in a list: who, the record against them and when last. */
export const BattleOpponentRow = ({
  record,
  link,
  rated = false,
}: BattleOpponentRowProps) => {
  const { t } = useTranslation();
  const ratingDelta = record.totalRatingDelta ?? 0;

  return (
    <li data-list-tile className={LIST_TILE_RULE_CLASS}>
      <Link
        {...link}
        className={cn(
          "flex min-h-14 min-w-0 items-center gap-3 py-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          LIST_TILE_INSET_CLASS,
        )}
      >
        <BattlePanelH2hOpponentSummary
          record={record}
          className="min-w-0 flex-1"
        />
        <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground sm:block">
          {getRelativeTime(record.lastBattleDate)}
        </span>
        {rated && (
          <span
            className={cn(
              "w-12 shrink-0 text-right text-sm font-medium tabular-nums",
              ratingDelta >= 0
                ? BATTLE_TEXT_COLORS.result.won
                : BATTLE_TEXT_COLORS.result.lost,
            )}
          >
            <span className="sr-only">
              {t("battlePanel.statistics.columns.totalRatingDelta")}:{" "}
            </span>
            {formatSignedBattleMetric(ratingDelta)}
          </span>
        )}
        <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
          <span className="sr-only">
            {t("battlePanel.statistics.columns.winLoss")}:{" "}
          </span>
          <span className={BATTLE_TEXT_COLORS.result.won}>{record.wins}</span>
          <span className="px-1 text-muted-foreground">–</span>
          <span className={BATTLE_TEXT_COLORS.result.lost}>
            {record.losses}
          </span>
        </span>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          <span className="sr-only">
            {t("battlePanel.statistics.columns.winRate")}:{" "}
          </span>
          {formatBattleMetric(record.winRate)}%
        </span>
      </Link>
    </li>
  );
};
