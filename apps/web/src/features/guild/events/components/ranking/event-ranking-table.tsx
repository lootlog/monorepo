import {
  FILTERED_TABLE_HEADER_CLASS,
  RESULTS_TABLE_MEDIA_QUERY,
} from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { EmptyState } from "@/components/common/empty-state";
import { RankBadge } from "@/components/common/rank-badge";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { type Cell, type ColumnDef, useTable } from "@tanstack/react-table";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { useUpdateRankingPoints } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { Table, TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { EventRanking } from "../../types/api";
import { invalidateRankingQueries } from "../../hooks/mutations/invalidate-ranking-queries";
import { formatDurationHuman } from "../../utils/format-duration";
import { EventRankingActions } from "./event-ranking-actions";
import { EventRankingPoints } from "./event-ranking-points";
import { EventRankingPointsDialog } from "./event-ranking-points-dialog";
import { getRankingMemberName } from "./get-ranking-member-name";
import { EventRankingTiles } from "./event-ranking-tiles";
import { RankingMemberName } from "./ranking-member-name";
import { TableCellLink } from "@/components/ui/table-cell-link";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { EMPTY_VALUE } from "@/constants/empty-value";

type EventRankingTableProps = {
  rankings: EventRanking[];
  guildId?: string;
  eventId?: string;
  canEdit?: boolean;
  currentMemberId?: number;
  variant?: "default" | "compact";
  /**
   * Shows only the leaders, plus the current member's own place below them
   * when it falls outside.
   */
  limit?: number;
};

const LINK_COLUMN_IDS = new Set(["position", "member", "kills", "time", "afk"]);

const PRIMARY_LINK_COLUMN_ID = "member";

const RIGHT_ALIGNED_COLUMN_IDS = new Set(["kills", "time", "afk", "points"]);

const getColumnClassName = (
  columnId: string,
  variant: EventRankingTableProps["variant"],
) => {
  if (columnId === "position") {
    return "w-12";
  }

  if (columnId === "member") {
    return "min-w-0";
  }

  if (columnId === "kills") {
    return "hidden w-20 text-right @md/ranking:table-cell";
  }

  if (columnId === "time") {
    return "hidden w-28 text-right lg:table-cell";
  }

  if (columnId === "afk") {
    return "hidden w-20 text-right xl:table-cell";
  }

  if (columnId === "points") {
    if (variant === "compact") {
      return "w-32 text-right @md/ranking:w-36";
    }

    return "w-28 text-right md:w-36";
  }

  if (columnId === "actions") {
    return "w-12 text-right";
  }

  return "";
};

export const EventRankingTable = ({
  rankings,
  guildId,
  eventId,
  canEdit = false,
  currentMemberId,
  variant = "default",
  limit,
}: EventRankingTableProps) => {
  const { t } = useTranslation();
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const queryClient = useQueryClient();
  const [editingRankingId, setEditingRankingId] = useState<string | null>(null);

  const editingRanking = rankings.find(
    (ranking) => ranking.id === editingRankingId,
  );

  const updateRankingPoints = useUpdateRankingPoints({
    mutation: {
      onSuccess: () => {
        if (!guildId || !eventId) {
          return;
        }

        invalidateRankingQueries(queryClient, guildId, eventId);
      },
    },
  });

  const handleEditPoints = async (
    rankingId: string,
    pointsDelta: number,
    comment?: string,
  ) => {
    try {
      const data: Parameters<
        typeof updateRankingPoints.mutateAsync
      >[0]["data"] = { pointsDelta };

      if (comment) data.comment = comment;
      await updateRankingPoints.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
          eventId: eventId ?? "",
          rankingId,
        },
        data,
      });
      toast.success(t("events.points.editSuccess"));
    } catch (error) {
      toast.error(t("events.points.editError"));
      throw error;
    }
  };

  const sortedRankings = [...rankings].sort(
    (leftRanking, rightRanking) =>
      rightRanking.totalPoints - leftRanking.totalPoints,
  );

  const placeById = new Map(
    sortedRankings.map((ranking, index) => [ranking.id, index + 1]),
  );

  const leaders =
    limit === undefined ? sortedRankings : sortedRankings.slice(0, limit);

  const ownRankingBelow =
    limit === undefined
      ? undefined
      : sortedRankings
          .slice(limit)
          .find((ranking) => ranking.memberId === currentMemberId);

  const visibleRankings = ownRankingBelow
    ? [...leaders, ownRankingBelow]
    : leaders;

  const allColumns: ColumnDef<typeof coreTableFeatures, EventRanking>[] = [
    {
      id: "position",
      header: () => (
        <span
          aria-label={t("events.ranking.position")}
          title={t("events.ranking.position")}
        >
          #
        </span>
      ),
      cell: ({ row }) => (
        <RankBadge rank={placeById.get(row.original.id) ?? row.index + 1} />
      ),
      enableSorting: false,
    },
    {
      id: "member",
      header: t("events.ranking.player"),
      cell: ({ row }) => (
        <RankingMemberName
          ranking={row.original}
          className="text-xs @md/ranking:text-sm"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "totalKills",
      id: "kills",
      header: t("events.ranking.kills"),
      cell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums">
          {row.original.totalKills}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "totalTimeSeconds",
      id: "time",
      header: t("events.ranking.time"),
      cell: ({ row }) => (
        <span className="block text-right text-sm tabular-nums">
          {formatDurationHuman(row.original.totalTimeSeconds)}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "avgAfkPercentage",
      id: "afk",
      header: t("events.ranking.afk"),
      cell: ({ row }) => {
        const afkPercentage = Math.round(row.original.avgAfkPercentage);

        if (afkPercentage === 0) {
          return (
            <span className="block text-right text-muted-foreground">
              {EMPTY_VALUE}
            </span>
          );
        }

        return (
          <span className="flex justify-end">
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[11px] tabular-nums"
            >
              {afkPercentage}%
            </Badge>
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "totalPoints",
      id: "points",
      header: () => (
        <span className="block text-right">{t("events.ranking.points")}</span>
      ),
      cell: ({ row }) => (
        <EventRankingPoints ranking={row.original} canViewHistory={canEdit} />
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => (
        <span className="sr-only">{t("events.ranking.actions")}</span>
      ),
      cell: ({ row }) => (
        <EventRankingActions
          canEdit={canEdit}
          onEditPoints={() => setEditingRankingId(row.original.id)}
          isEditPending={updateRankingPoints.isPending}
        />
      ),
      enableSorting: false,
    },
  ];

  const columns =
    variant === "compact"
      ? allColumns.filter((column) =>
          ["position", "member", "kills", "points"].includes(column.id ?? ""),
        )
      : allColumns;

  const table = useTable({
    features: coreTableFeatures,
    data: visibleRankings,
    columns,
    getRowId: (ranking) => ranking.id,
  });

  const renderRankingLinkCell = (
    cell: Cell<typeof coreTableFeatures, EventRanking, unknown>,
    content: ReactNode,
  ) => {
    if (!LINK_COLUMN_IDS.has(cell.column.id) || !guildId || !eventId) {
      return content;
    }

    const ranking = cell.row.original;

    const memberLabel = getRankingMemberName(ranking, t);

    const isPrimaryLink = cell.column.id === PRIMARY_LINK_COLUMN_ID;

    return (
      <TableCellLink
        to="/$guildId/events/$eventId/members/$memberId"
        params={{
          guildId,
          eventId,
          memberId: String(ranking.memberId),
        }}
        primary={isPrimaryLink}
        label={t("events.ranking.openMemberStats", { memberName: memberLabel })}
        className={cn(
          cell.column.id === "position" && "pl-4",
          RIGHT_ALIGNED_COLUMN_IDS.has(cell.column.id) && "justify-end",
        )}
      >
        {content}
      </TableCellLink>
    );
  };

  const isPage = variant === "default";

  const renderRankings = () => {
    if (rankings.length === 0) {
      return isPage ? (
        <div className="p-3">
          <EmptyState
            fill
            icon={Trophy}
            title={t("events.ranking.noRanking")}
          />
        </div>
      ) : (
        <EmptyState icon={Trophy} title={t("events.ranking.noRanking")} />
      );
    }

    if (isPage && !usesTable && guildId && eventId) {
      return (
        <EventRankingTiles
          rankings={sortedRankings}
          guildId={guildId}
          eventId={eventId}
          canEdit={canEdit}
          currentMemberId={currentMemberId}
          onEditPoints={setEditingRankingId}
          isEditPending={updateRankingPoints.isPending}
        />
      );
    }

    return (
      <Table
        className={cn(
          "w-full table-fixed",
          isPage && "border-b",
          // The preview ends inside a column, so its last row keeps its rule.
          !isPage && "[&_tbody_tr:last-child]:border-b",
        )}
      >
        <TanStackTableHeader
          table={table}
          // A short preview scrolls past whole; only the full ranking pins it.
          className={
            variant === "compact" ? "bg-sidebar" : FILTERED_TABLE_HEADER_CLASS
          }
          rowClassName="border-b-1! border-border hover:bg-transparent"
          getHeadClassName={(header) =>
            cn(
              "whitespace-nowrap align-middle",
              header.column.id === "position" && "pl-4",
              getColumnClassName(header.column.id, variant),
            )
          }
        />
        <TanStackTableBody
          table={table}
          getRowClassName={(row) =>
            cn(
              "h-14 border-b border-border hover:bg-muted/40",
              row.original.memberId === currentMemberId &&
                "bg-primary/10 hover:bg-primary/15",
            )
          }
          getCellClassName={(cell) =>
            cn(
              "h-14 overflow-hidden p-0! align-middle",
              getColumnClassName(cell.column.id, variant),
              variant === "compact" && cell.column.id === "points" && "pr-3!",
            )
          }
          getRowProps={(row) => ({
            id: `event-ranking-row-${row.original.id}`,
            "aria-selected":
              row.original.memberId === currentMemberId || undefined,
          })}
          renderCellContent={renderRankingLinkCell}
          renderRowDetail={(row) =>
            ownRankingBelow && row.index === leaders.length - 1 ? (
              // The places skipped between the leaders and the member's own.
              <TableRow
                aria-hidden="true"
                className="h-6 border-b border-border hover:bg-transparent"
              >
                {/* One cell per column, so hidden columns stay hidden here too. */}
                {columns.map((column, index) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      "py-0 text-xs leading-none text-muted-foreground",
                      getColumnClassName(column.id ?? "", variant),
                      index === 0 && "pl-4!",
                    )}
                  >
                    {index === 0 && "⋯"}
                  </TableCell>
                ))}
              </TableRow>
            ) : null
          }
        />
      </Table>
    );
  };

  return (
    // The page lays the ranking edge to edge; the preview card frames it.
    <section className="@container/ranking w-full min-w-0 overflow-clip">
      {renderRankings()}
      {canEdit && editingRanking && (
        <EventRankingPointsDialog
          key={editingRanking.id}
          ranking={editingRanking}
          isPending={updateRankingPoints.isPending}
          onClose={() => setEditingRankingId(null)}
          onEditPoints={handleEditPoints}
        />
      )}
    </section>
  );
};
