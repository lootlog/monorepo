import { DetailBar } from "@/components/common/detail-bar";
import { MetaItem } from "@/components/common/meta-item";
import { formatLevel } from "@lootlog/domain/profession";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { differenceInSeconds } from "date-fns";
import { CalendarDays, Hand, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeroAvatar } from "../shared/hero-avatar";
import type { KillDetail } from "../../hooks/queries/use-kill-detail";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { KillRespawnGauge } from "./kill-respawn-gauge";

/**
 * Where the kill landed in its respawn window. Stored durations win; older
 * kills without them fall back to the window timestamps.
 */
const getKillRespawnTiming = (kill: KillDetail) => {
  const minSpawn = new Date(kill.minSpawnTimeAtKill);

  const respawnSeconds =
    kill.respawnDurationSeconds ??
    Math.max(0, differenceInSeconds(new Date(kill.killedAt), minSpawn));

  const windowSeconds =
    kill.windowDurationSeconds ??
    Math.max(
      0,
      differenceInSeconds(new Date(kill.maxSpawnTimeAtKill), minSpawn),
    );

  const overdueSeconds =
    kill.resolvedAfterMaxSpawnTimeMs !== null &&
    kill.resolvedAfterMaxSpawnTimeMs > 0
      ? Math.round(kill.resolvedAfterMaxSpawnTimeMs / 1000)
      : null;

  const windowShare = windowSeconds > 0 ? respawnSeconds / windowSeconds : null;

  return {
    respawnSeconds,
    windowSeconds,
    overdueSeconds,
    windowPercentage:
      windowShare === null ? null : Math.round(windowShare * 100),
    gaugeFill:
      overdueSeconds !== null ? 1 : Math.min(1, Math.max(0, windowShare ?? 0)),
  };
};

interface KillDetailSummaryProps {
  kill: KillDetail;
  heroProf: string | null;
}

export const KillDetailSummary = ({
  kill,
  heroProf,
}: KillDetailSummaryProps) => {
  const { t } = useTranslation();

  const timing = getKillRespawnTiming(kill);
  const respawnText = formatDurationHuman(timing.respawnSeconds);

  const comparisonText =
    timing.overdueSeconds !== null
      ? t("events.killDetail.overdueBy", {
          duration: formatDurationHuman(timing.overdueSeconds),
        })
      : timing.windowPercentage !== null
        ? t("events.killDetail.windowShare", {
            percentage: timing.windowPercentage,
          })
        : null;

  const gaugeLabel = [
    `${t("events.killDetail.respawnTime")}: ${respawnText}`,
    comparisonText,
  ]
    .filter(Boolean)
    .join(", ");

  const formatTimestamp = (timestamp: string) =>
    timestampToDate(timestamp, DATE_TIME_WITH_SECONDS_FORMAT);

  return (
    <>
      <h1 className="sr-only">{kill.heroNpc.npcName}</h1>
      <DetailBar
        meta={
          <>
            <span className="flex min-w-0 items-center gap-2.5">
              <HeroAvatar hero={kill.heroNpc} />
              <span className="min-w-0 truncate text-sm font-semibold">
                {kill.heroNpc.npcName}
                {kill.heroNpc.npcLvl ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {formatLevel(kill.heroNpc.npcLvl, heroProf)}
                  </span>
                ) : null}
              </span>
            </span>
            {kill.isManualClose ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge
                      variant="timer"
                      className="h-5 gap-1 px-2 text-[11px]"
                      tabIndex={0}
                      aria-label={t("events.killDetail.manualCloseTitle")}
                    />
                  }
                >
                  <Hand className="size-3" aria-hidden />
                  {t("events.kills.manualCloseLabel")}
                </TooltipTrigger>
                <TooltipContent className="max-w-72">
                  <p className="font-medium">
                    {t("events.killDetail.manualCloseTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("events.killDetail.manualCloseDescription")}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            <MetaItem icon={CalendarDays}>
              {formatTimestamp(kill.killedAt)}
            </MetaItem>
            <MetaItem icon={Users}>
              {t("events.kills.participantCount", {
                count: kill.points.length,
              })}
            </MetaItem>
          </>
        }
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <div
                  className="flex cursor-help items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  tabIndex={0}
                  aria-label={gaugeLabel}
                />
              }
            >
              <KillRespawnGauge
                fill={timing.gaugeFill}
                isOverdue={timing.overdueSeconds !== null}
              />
              <div aria-hidden className="min-w-0">
                <div className="text-lg font-semibold leading-tight tabular-nums">
                  {respawnText}
                </div>
                {comparisonText ? (
                  <div
                    className={
                      timing.overdueSeconds !== null
                        ? "text-xs font-medium text-signal-timer"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {comparisonText}
                  </div>
                ) : null}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">
                {t("events.killDetail.respawnTimeDescription")}
              </p>
              <p>
                {t("events.killDetail.respawnMinLabel")}:{" "}
                {formatTimestamp(kill.minSpawnTimeAtKill)}
              </p>
              <p>
                {t("events.killDetail.killTimeLabel")}:{" "}
                {formatTimestamp(kill.killedAt)}
              </p>
              <p>
                {t("events.killDetail.respawnMaxLabel")}:{" "}
                {formatTimestamp(kill.maxSpawnTimeAtKill)}
              </p>
              <p>
                {t("events.killDetail.respawnWindowTime")}:{" "}
                {formatDurationHuman(timing.windowSeconds)}
              </p>
            </TooltipContent>
          </Tooltip>
        }
      />
    </>
  );
};
