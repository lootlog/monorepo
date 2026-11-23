import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScoringBreakdownList } from "../shared/scoring-breakdown-list";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";

type MemberKillBreakdownProps = {
  kill: KillHistoryMemberEntry;
};

export const MemberKillBreakdown = ({ kill }: MemberKillBreakdownProps) => {
  const { t } = useTranslation();

  const { point, hasManualPointsAdjustment, scoringItems } =
    getMemberKillScoringViewModel(kill, t);

  return (
    <>
      <div className="mb-2">
        <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("events.kills.scoringBreakdown")}
        </p>
        {(kill.isManualClose || hasManualPointsAdjustment) && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {kill.isManualClose && (
              <span className="text-2xs font-medium text-signal-timer">
                {t("events.kills.manualClose")}
              </span>
            )}
            {hasManualPointsAdjustment && (
              <span className="inline-flex items-center gap-1 text-2xs font-medium text-signal-timer">
                <Info className="size-3" />
                {t("events.points.modified")}
              </span>
            )}
          </div>
        )}
      </div>
      <ScoringBreakdownList items={scoringItems} totalPoints={point.points} />
    </>
  );
};
