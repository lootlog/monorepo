import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { differenceInSeconds } from "date-fns";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { formatDateTime } from "../../utils/format-date";
import { KillMonsterCell } from "./kill-monster-cell";
import { formatDurationHuman } from "../../utils/format-duration";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";

type CreateEventKillsTableColumnsOptions = {
  eventId: string;
  guildId: string;
  isPreview: boolean;
  t: TFunction;
};

export const createEventKillsTableColumns = ({
  eventId,
  guildId,
  isPreview,
  t,
}: CreateEventKillsTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  HeroKill
>[] => [
  {
    id: "monster",
    header: t("events.kills.monster"),
    cell: ({ row }) => (
      <KillMonsterCell
        eventId={eventId}
        guildId={guildId}
        isDateAlwaysVisible={isPreview}
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
