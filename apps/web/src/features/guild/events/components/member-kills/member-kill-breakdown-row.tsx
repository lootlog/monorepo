import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { TableCell, TableRow } from "@lootlog/ui/components/table";
import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { ScoringBreakdownList } from "../shared/scoring-breakdown-list";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";

type MemberKillBreakdownRowProps = {
  columnCount: number;
  kill: KillHistoryMemberEntry;
};

export const MemberKillBreakdownRow = ({
  columnCount,
  kill,
}: MemberKillBreakdownRowProps) => {
  const { t } = useTranslation();

  const { point, hasManualPointsAdjustment, scoringItems } =
    getMemberKillScoringViewModel(kill, t);

  return (
    <TableRow data-state="expanded-detail">
      <TableCell
        colSpan={columnCount}
        className="h-auto whitespace-normal px-4 py-3"
      >
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("events.kills.scoringBreakdown")}
          </p>
          {(kill.isManualClose || hasManualPointsAdjustment) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {kill.isManualClose && (
                <span className="text-[10px] font-medium text-amber-400">
                  {t("events.kills.manualClose")}
                </span>
              )}
              {hasManualPointsAdjustment && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400">
                  <Info className="size-3" />
                  {t("events.points.modified")}
                </span>
              )}
            </div>
          )}
        </div>
        <ScoringBreakdownList items={scoringItems} totalPoints={point.points} />
      </TableCell>
    </TableRow>
  );
};
