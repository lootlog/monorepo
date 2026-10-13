import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { differenceInSeconds } from "date-fns";
import type { KillHistoryEntry } from "@lootlog/client/main";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { KillMonsterCell } from "./kill-monster-cell";
import { formatDurationHuman } from "../../utils/format-duration";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";

type CreateEventKillsTableColumnsOptions = {
  eventId: string;
  guildId: string;
  isPreview: boolean;
  t: TFunction;
};

export const createKillNumberColumn = <
  TData extends Pick<KillHistoryEntry, "killNumber">,
>(
  t: TFunction,
): ColumnDef<typeof coreTableFeatures, TData> => ({
  id: "killNumber",
  header: () => (
    <span title={t("events.kills.killNumber")}>
      <span aria-hidden="true">#</span>
      <span className="sr-only">{t("events.kills.killNumber")}</span>
    </span>
  ),
  cell: ({ row }) => (
    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
      {row.original.killNumber}
    </span>
  ),
  enableSorting: false,
});

export const createEventKillsTableColumns = ({
  eventId,
  guildId,
  isPreview,
  t,
}: CreateEventKillsTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  KillHistoryEntry
>[] => [
  ...(isPreview ? [] : [createKillNumberColumn<KillHistoryEntry>(t)]),
  {
    id: "monster",
    header: t("events.kills.monster"),
    cell: ({ row }) => (
      <KillMonsterCell
        eventId={eventId}
        guildId={guildId}
        isPreview={isPreview}
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
        {timestampToDate(row.original.killedAt)}
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
        {row.original.participantCount}
      </span>
    ),
    enableSorting: false,
  },
];
