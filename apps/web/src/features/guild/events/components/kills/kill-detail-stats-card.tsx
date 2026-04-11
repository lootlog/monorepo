import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calculator, Clock, Package, Timer, Users } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { KillDetail } from "../../hooks/queries/use-kill-detail";
import { formatDurationHuman } from "../../utils/format-duration";

interface KillDetailStatsCardProps {
  kill: KillDetail;
  participantsCount: number;
  lootCount: number;
  respawnDurationText: string | null;
  windowDurationText: string | null;
  fasterThanMaxText: string | null;
  respawnComparedToMaxPercentage: number | null;
}

export const KillDetailStatsCard = ({
  kill,
  participantsCount,
  lootCount,
  respawnDurationText,
  windowDurationText,
  fasterThanMaxText,
  respawnComparedToMaxPercentage,
}: KillDetailStatsCardProps) => {
  const { t } = useTranslation();
  const overdueDurationText =
    typeof kill.resolvedAfterMaxSpawnTimeMs === "number" &&
    kill.resolvedAfterMaxSpawnTimeMs > 0
      ? formatDurationHuman(Math.round(kill.resolvedAfterMaxSpawnTimeMs / 1000))
      : null;

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-green-500/10">
            <Users className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-lg font-bold">{participantsCount}</p>
            <p className="text-xs text-muted-foreground">
              {t("events.killDetail.participantCount")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/10">
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold">{lootCount}</p>
            <p className="text-xs text-muted-foreground">
              {t("events.killDetail.lootCount")}
            </p>
          </div>
        </div>
        {respawnDurationText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <div className="p-1.5 rounded-md bg-orange-500/10">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{respawnDurationText}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("events.killDetail.respawnTime")}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {t("events.killDetail.respawnTimeDescription")}
                </p>
                <p>
                  {t("events.killDetail.respawnMinLabel")}:{" "}
                  {format(
                    new Date(kill.minSpawnTimeAtKill),
                    "d MMMM yyyy, HH:mm:ss",
                    { locale: pl },
                  )}
                </p>
                <p>
                  {t("events.killDetail.killTimeLabel")}:{" "}
                  {format(new Date(kill.killedAt), "d MMMM yyyy, HH:mm:ss", {
                    locale: pl,
                  })}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        {windowDurationText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <div className="p-1.5 rounded-md bg-orange-500/10">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{windowDurationText}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("events.killDetail.respawnWindowTime")}
                  </p>
                  {fasterThanMaxText && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("events.killDetail.respawnFasterBy", {
                        duration: fasterThanMaxText,
                      })}
                    </p>
                  )}
                  {typeof respawnComparedToMaxPercentage === "number" && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("events.killDetail.respawnComparedToMax", {
                        percentage: respawnComparedToMaxPercentage,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {t("events.killDetail.respawnWindowTimeDescription")}
                </p>
                <p>
                  {t("events.killDetail.respawnMinLabel")}:{" "}
                  {format(
                    new Date(kill.minSpawnTimeAtKill),
                    "d MMMM yyyy, HH:mm:ss",
                    { locale: pl },
                  )}
                </p>
                <p>
                  {t("events.killDetail.respawnMaxLabel")}:{" "}
                  {format(
                    new Date(kill.maxSpawnTimeAtKill),
                    "d MMMM yyyy, HH:mm:ss",
                    { locale: pl },
                  )}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        {overdueDurationText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <div className="p-1.5 rounded-md bg-orange-500/10">
                  <Timer className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{overdueDurationText}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("events.killDetail.overdueTitle")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("events.killDetail.overdueBy", {
                      duration: overdueDurationText,
                    })}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {t("events.killDetail.overdueDescription")}
                </p>
                <p>
                  {t("events.killDetail.respawnMaxLabel")}:{" "}
                  {format(
                    new Date(kill.maxSpawnTimeAtKill),
                    "d MMMM yyyy, HH:mm:ss",
                    { locale: pl },
                  )}
                </p>
                <p>
                  {t("events.killDetail.killTimeLabel")}:{" "}
                  {format(new Date(kill.killedAt), "d MMMM yyyy, HH:mm:ss", {
                    locale: pl,
                  })}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">
              {t("events.header.autoPointsOn")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("events.scoring.title")}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
