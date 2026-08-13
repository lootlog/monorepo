import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
} from "@tanstack/react-table";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { useUpdateRankingPoints } from "@lootlog/api-client/react-query/main/events";
import { Badge } from "@lootlog/ui/components/badge";
import { Table } from "@lootlog/ui/components/table";
import { cn } from "@lootlog/ui/lib/utils";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import type { EventRanking } from "../../types/api";
import { invalidateRankingQueries } from "../../hooks/mutations/invalidate-ranking-queries";
import { formatDurationHuman } from "../../utils/format-duration";
import { EventRankingActions } from "./event-ranking-actions";
import { EventRankingPoints } from "./event-ranking-points";

type EventRankingTableProps = {
  rankings: EventRanking[];
  guildId?: string;
  eventId?: string;
  canEdit?: boolean;
  currentMemberId?: number;
  variant?: "default" | "compact";
};

const LINK_COLUMN_IDS = new Set(["position", "member", "kills", "time", "afk"]);

const PRIMARY_LINK_COLUMN_ID = "member";

const RIGHT_ALIGNED_COLUMN_IDS = new Set(["kills", "time", "afk", "points"]);

const getPositionClassName = (position: number) =>
  cn(
    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
    position === 1 && "bg-yellow-500 text-yellow-950",
    position === 2 && "bg-gray-300 text-gray-800",
    position === 3 && "bg-amber-700 text-amber-100",
    position > 3 && "bg-muted text-muted-foreground",
  );

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
      return "w-20 text-right @md/ranking:w-28";
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
}: EventRankingTableProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
      await updateRankingPoints.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
          eventId: eventId ?? "",
          rankingId,
        },
        data: {
          pointsDelta,
          ...(comment ? { comment } : {}),
        },
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

  const allColumns: ColumnDef<EventRanking>[] = [
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
        <span className={getPositionClassName(row.index + 1)}>
          {row.index + 1}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "member",
      header: t("events.ranking.player"),
      cell: ({ row }) => {
        const ranking = row.original;
        const memberLabel =
          ranking.member?.name ??
          t("events.ranking.memberFallback", {
            memberId: ranking.memberId,
          });
        const roleCssColor = getCustomRoleCssColor(
          ranking.member?.roles[0]?.color,
        );

        return (
          <span
            className="block min-w-0 truncate text-xs font-semibold @md/ranking:text-sm"
            style={roleCssColor ? { color: roleCssColor } : undefined}
          >
            {memberLabel}
          </span>
        );
      },
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
            <span className="block text-right text-muted-foreground">—</span>
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
          ranking={row.original}
          canEdit={canEdit}
          onEditPoints={handleEditPoints}
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

  const table = useReactTable({
    autoResetPageIndex: false,
    data: sortedRankings,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderRankingLinkCell = (
    cell: Cell<EventRanking, unknown>,
    content: ReactNode,
  ) => {
    if (!LINK_COLUMN_IDS.has(cell.column.id) || !guildId || !eventId) {
      return content;
    }

    const ranking = cell.row.original;
    const memberLabel =
      ranking.member?.name ??
      t("events.ranking.memberFallback", {
        memberId: ranking.memberId,
      });
    const isPrimaryLink = cell.column.id === PRIMARY_LINK_COLUMN_ID;

    return (
      <Link
        to="/$guildId/events/$eventId/members/$memberId"
        params={{
          guildId,
          eventId,
          memberId: String(ranking.memberId),
        }}
        aria-label={
          isPrimaryLink
            ? t("events.ranking.openMemberStats", { memberName: memberLabel })
            : undefined
        }
        tabIndex={isPrimaryLink ? 0 : -1}
        className={cn(
          "flex min-h-12 w-full min-w-0 items-center px-2 text-inherit outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          cell.column.id === "position" && "pl-4",
          RIGHT_ALIGNED_COLUMN_IDS.has(cell.column.id) && "justify-end",
        )}
      >
        {content}
      </Link>
    );
  };

  if (rankings.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-muted-foreground">
        <Trophy className="mb-2 size-6 opacity-50" />
        <p className="text-sm">{t("events.ranking.noRanking")}</p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "@container/ranking w-full min-w-0 overflow-hidden",
        variant === "default" && "rounded-2xl border border-border bg-card",
      )}
    >
      <Table className="w-full table-fixed">
        <TanStackTableHeader
          table={table}
          className="bg-secondary/25"
          rowClassName="border-border/80"
          headClassName={(header) =>
            cn(
              "h-9 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              header.column.id === "position" && "pl-4",
              getColumnClassName(header.column.id, variant),
            )
          }
        />
        <TanStackTableBody
          table={table}
          rowClassName={(row) =>
            cn(
              "group h-12 border-border/70 hover:bg-muted/20",
              row.index < 3 && "bg-primary/[0.025]",
              row.original.memberId === currentMemberId &&
                "bg-primary/10 hover:bg-primary/15",
            )
          }
          cellClassName={(cell) =>
            cn(
              "h-12 overflow-hidden p-0! align-middle",
              getColumnClassName(cell.column.id, variant),
              variant === "compact" && cell.column.id === "points" && "pr-3!",
            )
          }
          getRowProps={(row) => ({
            "aria-selected":
              row.original.memberId === currentMemberId || undefined,
          })}
          renderCellContent={renderRankingLinkCell}
        />
      </Table>
    </section>
  );
};
