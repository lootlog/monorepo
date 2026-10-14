import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPoints } from "../../utils/format-points";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";

type MemberKillPointsProps = {
  kill: KillHistoryMemberEntry;
};

/** The points the member earned for a kill, flagged when they were corrected by hand. */
export const MemberKillPoints = ({ kill }: MemberKillPointsProps) => {
  const { t } = useTranslation();

  const { point, hasManualPointsAdjustment } = getMemberKillScoringViewModel(
    kill,
    t,
  );

  return (
    <div className="flex items-center justify-end gap-1">
      {hasManualPointsAdjustment && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className="inline-flex size-6 shrink-0 items-center justify-center text-amber-400"
                tabIndex={0}
                aria-label={t("events.points.modified")}
              >
                <Info className="size-3.5" />
              </span>
            }
          />
          <TooltipContent>
            <p>{t("events.points.modified")}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <span className="font-bold text-primary tabular-nums">
        {formatPoints(point.points)}
        <span className="ml-1 hidden text-xs font-medium text-primary/75 sm:inline">
          {t("events.common.pointsShort")}
        </span>
      </span>
    </div>
  );
};
