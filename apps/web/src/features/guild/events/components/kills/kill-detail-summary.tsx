import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Hand, Skull } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { NpcTile } from "@/components/tiles/npc-tile";
import type {
  EventConfig,
  KillDetail,
} from "../../hooks/queries/use-kill-detail";
import { formatDurationHuman } from "../../utils/format-duration";

interface KillDetailSummaryProps {
  kill: KillDetail;
  eventConfig: EventConfig;
  participantsCount: number;
  lootCount: number;
  respawnDurationText: string;
  windowDurationText: string;
  fasterThanMaxText: string | null;
  respawnComparedToMaxPercentage: number | null;
}

export const KillDetailSummary = ({
  kill,
  eventConfig,
  participantsCount,
  lootCount,
  respawnDurationText,
  windowDurationText,
  fasterThanMaxText,
  respawnComparedToMaxPercentage,
}: KillDetailSummaryProps) => {
  const { t } = useTranslation();
  const overdueDurationText =
    typeof kill.resolvedAfterMaxSpawnTimeMs === "number" &&
    kill.resolvedAfterMaxSpawnTimeMs > 0
      ? formatDurationHuman(Math.round(kill.resolvedAfterMaxSpawnTimeMs / 1000))
      : null;
  const scoringModeLabel = t(
    eventConfig.scoringMode === "SIMPLE"
      ? "events.scoring.modeSimpleTitle"
      : "events.scoring.modeAdvancedTitle",
  );
  let respawnComparisonText: string | null = null;
  let respawnDeltaText: string | null = null;
  if (overdueDurationText) {
    respawnComparisonText = t("events.killDetail.overdueBy", {
      duration: overdueDurationText,
    });
    respawnDeltaText = `+${overdueDurationText}`;
  } else if (fasterThanMaxText) {
    respawnComparisonText = t("events.killDetail.respawnFasterBy", {
      duration: fasterThanMaxText,
    });
    respawnDeltaText = `−${fasterThanMaxText}`;
  }
  const respawnMetricLabel = [
    `${t("events.killDetail.respawnTime")}: ${respawnDurationText}`,
    respawnComparisonText,
  ]
    .filter(Boolean)
    .join(", ");

  const formattedMinSpawn = format(
    new Date(kill.minSpawnTimeAtKill),
    "d MMMM yyyy, HH:mm:ss",
    { locale: pl },
  );
  const formattedMaxSpawn = format(
    new Date(kill.maxSpawnTimeAtKill),
    "d MMMM yyyy, HH:mm:ss",
    { locale: pl },
  );
  const formattedKillTime = format(
    new Date(kill.killedAt),
    "d MMMM yyyy, HH:mm:ss",
    { locale: pl },
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex min-w-0 items-center gap-3 p-3 md:px-4">
        {kill.heroNpc.npcIcon ? (
          <NpcTile
            className="flex w-10 shrink-0 items-center justify-center"
            npc={{
              id: kill.heroNpc.npcId ?? 0,
              name: kill.heroNpc.npcName,
              icon: kill.heroNpc.npcIcon,
            }}
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-border/70">
            <Skull className="size-4 text-destructive" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-none text-muted-foreground">
            {t("events.killDetail.title")}
          </p>
          <h1 className="mt-1 truncate text-base font-semibold leading-none">
            {kill.heroNpc.npcName}
          </h1>
          <p className="mt-1 truncate text-xs leading-none tabular-nums text-muted-foreground">
            {formattedKillTime}
          </p>
        </div>
        {kill.isManualClose ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-500"
                  tabIndex={0}
                  aria-label={t("events.killDetail.manualCloseTitle")}
                >
                  <Hand className="size-3.5" />
                  <span className="hidden sm:inline">
                    {t("events.kills.manualCloseLabel")}
                  </span>
                </span>
              }
            />
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
      </div>

      <dl className="grid grid-cols-3 border-t border-border/70 bg-muted/20 md:grid-cols-6">
        <div className="min-w-0 border-border/70 px-3 py-2.5">
          <dt className="truncate text-[11px] leading-tight text-muted-foreground">
            {t("events.killDetail.participantCount")}
          </dt>
          <dd className="mt-1 truncate text-base font-semibold leading-none tabular-nums">
            {participantsCount}
          </dd>
        </div>
        <div className="min-w-0 border-l border-border/70 px-3 py-2.5">
          <dt className="truncate text-[11px] leading-tight text-muted-foreground">
            {t("events.killDetail.lootCount")}
          </dt>
          <dd className="mt-1 truncate text-base font-semibold leading-none tabular-nums">
            {lootCount}
          </dd>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                className="min-w-0 cursor-help border-l border-border/70 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                aria-label={respawnMetricLabel}
              >
                <dt className="truncate text-[11px] leading-tight text-muted-foreground">
                  {t("events.killDetail.respawnTime")}
                </dt>
                <dd className="mt-0.5 flex min-w-0 items-baseline gap-1.5 whitespace-nowrap leading-none tabular-nums">
                  <span className="min-w-0 truncate text-base font-semibold">
                    {respawnDurationText}
                  </span>
                  {respawnDeltaText ? (
                    <span
                      aria-hidden="true"
                      className={
                        overdueDurationText
                          ? "shrink-0 text-[10px] font-medium text-amber-500"
                          : "shrink-0 text-[10px] font-medium text-muted-foreground"
                      }
                    >
                      {respawnDeltaText}
                    </span>
                  ) : null}
                </dd>
              </div>
            }
          />
          <TooltipContent>
            <p className="font-medium">
              {t("events.killDetail.respawnTimeDescription")}
            </p>
            <p>
              {t("events.killDetail.respawnMinLabel")}: {formattedMinSpawn}
            </p>
            <p>
              {t("events.killDetail.killTimeLabel")}: {formattedKillTime}
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                className="min-w-0 cursor-help border-t border-border/70 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:border-l md:border-t-0"
                tabIndex={0}
                aria-label={`${t("events.killDetail.respawnWindowTime")}: ${windowDurationText}`}
              >
                <dt className="truncate text-[11px] leading-tight text-muted-foreground">
                  {t("events.killDetail.respawnWindowTime")}
                </dt>
                <dd className="mt-1 truncate text-base font-semibold leading-none tabular-nums">
                  {windowDurationText}
                </dd>
              </div>
            }
          />
          <TooltipContent>
            <p className="font-medium">
              {t("events.killDetail.respawnWindowTimeDescription")}
            </p>
            <p>
              {t("events.killDetail.respawnMinLabel")}: {formattedMinSpawn}
            </p>
            <p>
              {t("events.killDetail.respawnMaxLabel")}: {formattedMaxSpawn}
            </p>
            {typeof respawnComparedToMaxPercentage === "number" ? (
              <p>
                {t("events.killDetail.respawnComparedToMax", {
                  percentage: respawnComparedToMaxPercentage,
                })}
              </p>
            ) : null}
          </TooltipContent>
        </Tooltip>
        <div className="min-w-0 border-l border-t border-border/70 px-3 py-2.5 md:border-t-0">
          <dt className="truncate text-[11px] leading-tight text-muted-foreground">
            {t("events.scoring.title")}
          </dt>
          <dd className="mt-1 truncate text-base font-semibold leading-none">
            {scoringModeLabel}
          </dd>
        </div>
        <div className="min-w-0 border-l border-t border-border/70 px-3 py-2.5 md:border-t-0">
          <dt className="truncate text-[11px] leading-tight text-muted-foreground">
            {t("events.killDetail.summaryStatus")}
          </dt>
          <dd className="mt-1 truncate text-base font-semibold leading-none">
            {kill.isManualClose
              ? t("events.kills.manualCloseLabel")
              : t("events.killDetail.automaticClose")}
          </dd>
        </div>
      </dl>
    </section>
  );
};
