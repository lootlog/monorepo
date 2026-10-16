import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { formatPoints } from "../../utils/format-points";
import { useTranslation } from "react-i18next";
import { Clock, Moon, Sparkles, Swords } from "lucide-react";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  type MemberStatsSummary,
  formatPercentage,
} from "./member-kills-view-model";

type MemberSummaryStripProps = {
  contextStats: MemberStatsSummary;
  /** Kills of the shown heroes in the whole event, for the participation share. */
  eventKillCount?: number;
};

/** A thin bar with a caption, for KPIs that are a share of something. */
const ShareDetail = ({ share, label }: { share: number; label: string }) => (
  <span className="flex min-w-0 items-center gap-2">
    <span
      aria-hidden
      className="relative h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
      />
    </span>
    <span className="truncate">{label}</span>
  </span>
);

/** The member's totals for the heroes the page shows, related to the event. */
export const MemberSummaryStrip = ({
  contextStats,
  eventKillCount,
}: MemberSummaryStripProps) => {
  const { t } = useTranslation();

  const participationShare =
    eventKillCount && eventKillCount > 0
      ? Math.round((contextStats.totalKills / eventKillCount) * 100)
      : null;

  const activeShare =
    contextStats.totalKills > 0 ? 100 - contextStats.avgAfkPercentage : null;

  return (
    <StatsTileGrid className="grid-cols-2 xl:grid-cols-4">
      <StatsTile
        icon={Swords}
        label={t("events.kills.kpiKills")}
        value={contextStats.totalKills}
        detail={
          participationShare !== null ? (
            <ShareDetail
              share={participationShare}
              label={t("events.kills.kpiShareOfEventKills", {
                percentage: participationShare,
              })}
            />
          ) : null
        }
      />
      <StatsTile
        icon={Sparkles}
        label={t("events.kills.kpiPoints")}
        value={
          <span className="text-primary">
            {formatPoints(contextStats.totalPoints)}
            <span className="ml-1 text-sm font-medium text-primary/75">
              {t("events.common.pointsShort")}
            </span>
          </span>
        }
        detail={t("events.kills.kpiPerKill", {
          value: formatPoints(contextStats.avgPointsPerKill),
        })}
      />
      <StatsTile
        icon={Clock}
        label={t("events.kills.kpiTotalTime")}
        value={formatDurationHuman(contextStats.totalTimeSeconds)}
        detail={t("events.kills.kpiPerKill", {
          value: formatDurationHuman(
            Math.round(contextStats.avgTimePerKillSeconds),
          ),
        })}
      />
      <StatsTile
        icon={Moon}
        label={t("events.kills.kpiAvgAfk")}
        value={formatPercentage(contextStats.avgAfkPercentage)}
        detail={
          activeShare !== null ? (
            <ShareDetail
              share={activeShare}
              label={t("events.kills.kpiActiveShare", {
                percentage: formatPoints(activeShare),
              })}
            />
          ) : null
        }
      />
    </StatsTileGrid>
  );
};
