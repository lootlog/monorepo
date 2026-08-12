import type { TFunction } from "i18next";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { differenceInSeconds } from "date-fns";
import { Skull } from "lucide-react";
import { NpcTile } from "@/components/tiles";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { formatDateTime } from "../../utils/format-date";
import { formatDurationHuman } from "../../utils/format-duration";

type CreateEventKillsTableColumnsOptions = {
  eventId: string;
  guildId: string;
  t: TFunction;
};

const getKillDetailParams = (
  kill: HeroKill,
  guildId: string,
  eventId: string,
) =>
  ({
    eventId,
    guildId,
    heroId: kill.heroNpcId,
    killId: kill.id,
  }) as const;

export const createEventKillsTableColumns = ({
  eventId,
  guildId,
  t,
}: CreateEventKillsTableColumnsOptions): ColumnDef<HeroKill>[] => [
  {
    id: "monster",
    header: t("events.kills.monster"),
    cell: ({ row }) => {
      const kill = row.original;
      const detailLabel = t("events.kills.openKillDetails", {
        monsterName: kill.heroNpc.npcName,
      });

      return (
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
              params={getKillDetailParams(kill, guildId, eventId)}
              aria-label={detailLabel}
              title={detailLabel}
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
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "killedAt",
    id: "date",
    header: t("events.kills.date"),
    cell: ({ row }) => (
      <span className="text-xs tabular-nums sm:text-sm">
        {formatDateTime(new Date(row.original.killedAt))}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "respawnTime",
    header: () => (
      <span className="block text-right">{t("events.kills.respawnTime")}</span>
    ),
    cell: ({ row }) => {
      const kill = row.original;

      if (kill.isManualClose) {
        return (
          <span className="block text-right text-xs font-medium text-amber-400">
            {t("events.kills.manualCloseLabel")}
          </span>
        );
      }

      const respawnTimeSeconds = differenceInSeconds(
        new Date(kill.killedAt),
        new Date(kill.minSpawnTimeAtKill),
      );

      return (
        <span className="block text-right font-medium tabular-nums">
          {formatDurationHuman(respawnTimeSeconds)}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    id: "participants",
    header: () => (
      <span className="block text-right">{t("events.kills.participants")}</span>
    ),
    cell: ({ row }) => (
      <span className="block text-right font-medium tabular-nums">
        {row.original.points?.length ?? 0}
      </span>
    ),
    enableSorting: false,
  },
];
