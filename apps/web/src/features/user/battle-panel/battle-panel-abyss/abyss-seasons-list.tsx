import {
  formatBattleMetric,
  formatSignedBattleMetric,
} from "@/components/battle/utils/value-utils";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import {
  getListTileLinkClassName,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import {
  FILTERED_TABLE_HEADER_CLASS,
  RESULTS_TABLE_MEDIA_QUERY,
} from "@/components/common/page-sticky-table-header";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Badge } from "@lootlog/ui/components/badge";
import { Table } from "@lootlog/ui/components/table";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "usehooks-ts";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";

type AbyssSeasonsListProps = {
  characterId: string;
  seasons: AbyssSeason[];
};

const formatOptionalNumber = (value: number | null) =>
  value === null ? "–" : formatBattleMetric(value);

// The season's range takes the spare width; numbers line up on the right.
const getColumnClassName = (columnId: string) => {
  if (columnId === "range") return "";

  return columnId === "open" ? "w-10" : "w-28 text-right";
};

const getRatingClassName = (season: AbyssSeason) =>
  season.totalRatingDelta >= 0
    ? BATTLE_TEXT_COLORS.result.won
    : BATTLE_TEXT_COLORS.result.lost;

const renderRecord = (season: AbyssSeason) => (
  <>
    <span className={BATTLE_TEXT_COLORS.result.won}>{season.wins}</span>
    <span className="px-1 text-muted-foreground">–</span>
    <span className={BATTLE_TEXT_COLORS.result.lost}>{season.losses}</span>
  </>
);

/**
 * A character's Abyss seasons, newest first; each opens the season's page. A
 * table on wide pages, tiles where it would not fit.
 */
export function AbyssSeasonsList({
  characterId,
  seasons,
}: AbyssSeasonsListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const latestSeasonId = seasons[0]?.id;

  const getSeasonLink = (season: AbyssSeason) =>
    ({
      to: "/@me/battle-panel/abyss/$seasonId",
      params: { seasonId: season.id },
      search: { characterId },
    }) as const;

  const renderRange = (season: AbyssSeason): ReactNode => (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">
        {getAbyssSeasonRangeLabel(season)}
      </span>
      {season.id === latestSeasonId && (
        <Badge variant="secondary" className="shrink-0">
          {t("battlePanel.abyss.latestSeason")}
        </Badge>
      )}
    </span>
  );

  const columns: ColumnDef<typeof coreTableFeatures, AbyssSeason>[] = [
    {
      id: "range",
      header: () => t("battlePanel.abyss.seasonsTable.range"),
      cell: ({ row: { original: season } }) => renderRange(season),
    },
    {
      id: "totalBattles",
      header: () => t("battlePanel.abyss.seasonsTable.totalBattles"),
      cell: ({ row: { original: season } }) => season.totalBattles,
    },
    {
      id: "record",
      header: () => t("battlePanel.abyss.seasonsTable.record"),
      cell: ({ row: { original: season } }) => renderRecord(season),
    },
    {
      id: "winRate",
      header: () => t("battlePanel.abyss.seasonsTable.winRate"),
      cell: ({ row: { original: season } }) =>
        `${formatBattleMetric(season.winRate)}%`,
    },
    {
      id: "ratingDelta",
      header: () => t("battlePanel.abyss.seasonsTable.ratingDelta"),
      cell: ({ row: { original: season } }) => (
        <span className={getRatingClassName(season)}>
          {formatSignedBattleMetric(season.totalRatingDelta)}
        </span>
      ),
    },
    {
      id: "peakRating",
      header: () => t("battlePanel.abyss.seasonsTable.peakRating"),
      cell: ({ row: { original: season } }) =>
        formatOptionalNumber(season.peakRating),
    },
    {
      id: "points",
      header: () => t("battlePanel.abyss.seasonsTable.points"),
      cell: ({ row: { original: season } }) =>
        formatOptionalNumber(season.totalPointsGained),
    },
    {
      id: "open",
      header: () => (
        <span className="sr-only">
          {t("battlePanel.abyss.seasonsTable.open")}
        </span>
      ),
      cell: () => (
        <ChevronRight
          className="ml-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
      ),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: seasons,
    columns,
    getRowId: (season) => season.id,
  });

  const openSeason = (season: AbyssSeason) =>
    void navigate(getSeasonLink(season));

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    season: AbyssSeason,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openSeason(season);
  };

  if (!usesTable) {
    return (
      <ul>
        {seasons.map((season) => (
          <li key={season.id} data-list-tile className={LIST_TILE_RULE_CLASS}>
            <Link
              {...getSeasonLink(season)}
              className={cn(
                getListTileLinkClassName(false),
                "transition-colors hover:bg-muted/40",
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm">{renderRange(season)}</span>
                <span className="flex flex-wrap gap-x-3 text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold">{renderRecord(season)}</span>
                  <span>{formatBattleMetric(season.winRate)}%</span>
                  <span className={getRatingClassName(season)}>
                    {t("battlePanel.abyss.ratingValue", {
                      value: formatSignedBattleMetric(season.totalRatingDelta),
                    })}
                  </span>
                  <span>
                    {t("battlePanel.abyss.stats.totalBattles", {
                      count: season.totalBattles,
                    })}
                  </span>
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table className="border-b">
      <TanStackTableHeader
        table={table}
        className={FILTERED_TABLE_HEADER_CLASS}
        rowClassName="border-b-1! border-border"
        getHeadClassName={(header) => getColumnClassName(header.column.id)}
      />
      <TanStackTableBody
        table={table}
        rowHeaderColumnId="range"
        getCellClassName={(cell) =>
          cn(
            "tabular-nums",
            getColumnClassName(cell.column.id),
            cell.column.id === "record" && "font-medium",
          )
        }
        getRowProps={(row) => ({
          className:
            "h-14 cursor-pointer border-b border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          onClick: () => openSeason(row.original),
          onKeyDown: (event) => handleRowKeyDown(event, row.original),
          role: "link",
          tabIndex: 0,
          "aria-label": getAbyssSeasonRangeLabel(row.original),
        })}
      />
    </Table>
  );
}
