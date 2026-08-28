import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Info, Skull } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { TableCell, TableRow } from "@lootlog/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { NpcTile } from "@/components/tiles";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { formatDateTime } from "../../utils/format-date";
import {
  formatPoints,
  getMemberKillScoringViewModel,
} from "./member-kills-view-model";

type MemberKillRowProps = {
  kill: EventMemberKill;
  guildId: string;
  eventId: string;
};

export const MemberKillRow = ({
  kill,
  guildId,
  eventId,
}: MemberKillRowProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    point,
    hasManualPointsAdjustment,
    trackingPercentage,
    trackingTime,
    scoringItems,
  } = getMemberKillScoringViewModel(kill, t);

  return (
    <Fragment>
      <TableRow
        data-state={isExpanded ? "selected" : undefined}
        className="group h-14 hover:bg-muted/20"
      >
        <TableCell className="min-w-0 overflow-hidden py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {kill.heroNpc.npcIcon ? (
              <NpcTile
                className="hidden shrink-0 lg:block"
                npc={{
                  id: kill.heroNpc.npcId ?? undefined,
                  name: kill.heroNpc.npcName,
                  icon: kill.heroNpc.npcIcon,
                }}
              />
            ) : (
              <Skull className="hidden size-4 shrink-0 text-muted-foreground lg:block" />
            )}
            <div className="min-w-0 flex-1">
              <Link
                to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
                params={{
                  guildId,
                  eventId,
                  heroId: kill.heroNpcId,
                  killId: kill.id,
                }}
                aria-label={t("events.kills.openKillDetails", {
                  monsterName: kill.heroNpc.npcName,
                })}
                title={t("events.kills.openKillDetails", {
                  monsterName: kill.heroNpc.npcName,
                })}
                className="inline-flex max-w-full min-w-0 items-center rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate font-semibold">
                  {kill.heroNpc.npcName}
                </span>
              </Link>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground tabular-nums sm:hidden">
                {formatDateTime(new Date(kill.killedAt))}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden w-0 py-0 sm:table-cell sm:w-28 lg:w-36">
          <div className="text-xs tabular-nums sm:text-sm">
            {formatDateTime(new Date(kill.killedAt))}
          </div>
        </TableCell>
        <TableCell className="hidden w-0 py-0 text-right font-medium tabular-nums xl:table-cell xl:w-28">
          {trackingPercentage}
        </TableCell>
        <TableCell className="hidden w-0 py-0 text-right tabular-nums xl:table-cell xl:w-40">
          {trackingTime}
        </TableCell>
        <TableCell className="w-20 py-0 text-right sm:w-24">
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
              {formatPoints(point?.points ?? 0)}
              <span className="ml-1 hidden text-xs font-medium text-primary/75 sm:inline">
                {t("events.common.pointsShort", "pkt")}
              </span>
            </span>
          </div>
        </TableCell>
        <TableCell className="w-11 py-0 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={isExpanded}
            aria-label={t(
              isExpanded
                ? "events.kills.collapseBreakdown"
                : "events.kills.expandBreakdown",
              { monsterName: kill.heroNpc.npcName },
            )}
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            className="size-9 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow data-state="expanded-detail">
          <TableCell colSpan={6} className="h-auto whitespace-normal px-4 py-3">
            {point ? (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
                <div className="min-w-0">
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
                  <dl className="grid max-w-md grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 text-xs">
                    {scoringItems.map((item) => (
                      <Fragment key={`${item.label}:${item.value}`}>
                        <dt className="truncate text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd
                          className={cn(
                            "text-right font-semibold tabular-nums",
                            item.valueClassName,
                          )}
                        >
                          {item.value}
                        </dd>
                      </Fragment>
                    ))}
                  </dl>
                </div>
                <div className="flex items-end justify-between border-t border-border/70 pt-3 sm:min-w-28 sm:flex-col sm:items-center sm:justify-center sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("events.kills.pointsTooltip.total")}
                  </span>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {formatPoints(point.points)}
                    <span className="ml-1 text-xs font-medium text-primary/75">
                      {t("events.common.pointsShort", "pkt")}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("events.kills.pointBreakdownUnavailable")}
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
};
