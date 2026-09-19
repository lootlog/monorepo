import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Info } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { formatDateTime } from "../../utils/format-date";
import { formatPoints } from "../../utils/format-points";
import { KillMonsterCell } from "../kills/kill-monster-cell";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";

type CreateMemberKillsTableColumnsOptions = {
  eventId: string;
  expandedKillIds: readonly string[];
  guildId: string;
  onExpandedToggle: (killId: string) => void;
  t: TFunction;
};

export const createMemberKillsTableColumns = ({
  eventId,
  expandedKillIds,
  guildId,
  onExpandedToggle,
  t,
}: CreateMemberKillsTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  EventMemberKill
>[] => [
  {
    id: "monster",
    header: t("events.kills.monster"),
    cell: ({ row }) => (
      <KillMonsterCell
        eventId={eventId}
        guildId={guildId}
        kill={row.original}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "killedAt",
    id: "date",
    header: t("events.kills.date"),
    cell: ({ row }) => (
      <div className="text-xs tabular-nums sm:text-sm">
        {formatDateTime(new Date(row.original.killedAt))}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "timeCoverage",
    header: t("events.kills.timeCoverage"),
    cell: ({ row }) =>
      getMemberKillScoringViewModel(row.original, t).trackingPercentage,
    enableSorting: false,
  },
  {
    id: "trackingTime",
    header: t("events.kills.trackingDurationTime"),
    cell: ({ row }) =>
      getMemberKillScoringViewModel(row.original, t).trackingTime,
    enableSorting: false,
  },
  {
    id: "points",
    header: t("events.kills.points"),
    cell: ({ row }) => {
      const { point, hasManualPointsAdjustment } =
        getMemberKillScoringViewModel(row.original, t);

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
            {formatPoints(point?.points ?? 0)}
            <span className="ml-1 hidden text-xs font-medium text-primary/75 sm:inline">
              {t("events.common.pointsShort", "pkt")}
            </span>
          </span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("events.kills.actions")}</span>,
    cell: ({ row }) => {
      const kill = row.original;
      const isExpanded = expandedKillIds.includes(kill.id);

      return (
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
          onClick={() => onExpandedToggle(kill.id)}
          className="size-9 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </Button>
      );
    },
    enableSorting: false,
  },
];
