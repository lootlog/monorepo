import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Table, TableCell, TableRow } from "@lootlog/ui/components/table";
import { FILTERED_TABLE_HEADER_CLASS } from "@/components/common/page-sticky-table-header";
import { RankBadge } from "@/components/common/rank-badge";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import {
  FactionWarLeaderboardActions,
  type FactionWarModeratedPlayer,
} from "./faction-war-leaderboard-actions";
import { hasFactionWarLeaderboardGapAfter } from "./faction-war-leaderboard-gap";
import { FactionWarPlayerName } from "./faction-war-player-name";
import type { FactionWarLeaderboardEntry } from "./faction-war-queries";

type FactionWarLeaderboardTableProps = {
  entries: FactionWarLeaderboardEntry[];
  /** Given to war admins only, it adds each player's actions. */
  onDisqualify?: (player: FactionWarModeratedPlayer) => void;
};

const COLUMN_CLASS = new Map([
  ["rank", "w-16 pl-4 text-center"],
  ["world", "w-48"],
  ["points", "w-32 pr-4 text-right"],
  ["actions", "w-16 pr-4 text-right"],
]);

/** The leaderboard as a table, its header pinned under the faction tabs. */
export const FactionWarLeaderboardTable = ({
  entries,
  onDisqualify,
}: FactionWarLeaderboardTableProps) => {
  const { t } = useTranslation();

  const columns: ColumnDef<
    typeof coreTableFeatures,
    FactionWarLeaderboardEntry
  >[] = [
    {
      id: "rank",
      header: () => t("factionWar.ranking.rank"),
      cell: ({ row }) => <RankBadge rank={row.original.rank} />,
    },
    {
      id: "player",
      header: () => t("factionWar.ranking.player"),
      cell: ({ row }) => (
        <FactionWarPlayerName entry={row.original} className="text-sm" />
      ),
    },
    {
      id: "world",
      header: () => t("factionWar.ranking.world"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground capitalize">
          {row.original.world ?? "—"}
        </span>
      ),
    },
    {
      id: "points",
      header: () => t("factionWar.ranking.points"),
      cell: ({ row }) => (
        <StatsCountCell value={Math.round(row.original.points)} emphasized />
      ),
    },
    ...(onDisqualify
      ? [
          {
            id: "actions",
            header: () => (
              <span className="sr-only">
                {t("factionWar.moderation.actionsColumn")}
              </span>
            ),
            cell: ({ row }) => (
              <FactionWarLeaderboardActions
                entry={row.original}
                onDisqualify={onDisqualify}
              />
            ),
          } satisfies ColumnDef<
            typeof coreTableFeatures,
            FactionWarLeaderboardEntry
          >,
        ]
      : []),
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: entries,
    columns,
    getRowId: (entry) => String(entry.rank),
  });

  return (
    <Table className="w-full table-fixed border-b">
      <TanStackTableHeader
        table={table}
        className={FILTERED_TABLE_HEADER_CLASS}
        rowClassName="border-b-1! border-border hover:bg-transparent"
        getHeadClassName={(header) =>
          cn("whitespace-nowrap", COLUMN_CLASS.get(header.column.id))
        }
      />
      <TanStackTableBody
        table={table}
        getRowClassName={(row) =>
          cn(
            "h-14 border-b border-border hover:bg-muted/40",
            row.original.isMe && "bg-primary/10 hover:bg-primary/15",
          )
        }
        getCellClassName={(cell) =>
          cn("align-middle", COLUMN_CLASS.get(cell.column.id))
        }
        getRowProps={(row) => ({
          "aria-current": row.original.isMe || undefined,
        })}
        renderRowDetail={(row) =>
          hasFactionWarLeaderboardGapAfter(entries, row.index) ? (
            // The places between the leaders and the caller's own.
            <TableRow
              aria-hidden="true"
              className="h-6 border-b border-border hover:bg-transparent"
            >
              <TableCell
                colSpan={columns.length}
                className="py-0 pl-4 text-xs leading-none text-muted-foreground"
              >
                ⋯
              </TableCell>
            </TableRow>
          ) : null
        }
      />
    </Table>
  );
};
