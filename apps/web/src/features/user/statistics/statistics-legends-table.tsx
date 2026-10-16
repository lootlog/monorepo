import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import type { UserLootStatsResponseDtoOutputLegendsItem } from "@lootlog/client/main";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/common/empty-state";
import { RankBadge } from "@/components/common/rank-badge";
import { ResultsSurface } from "@/components/common/results-surface";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { StatsNpcCell } from "@/components/common/stats-npc-cell";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  StatsTable,
} from "@/components/common/stats-table";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { StatisticsSortableHeader } from "./statistics-sortable-header";
import { StatisticsLegendItem } from "./statistics-legend-item";
import {
  sortStatisticsRows,
  statisticsTableSorting,
  type StatisticsSortColumn,
  type StatisticsSortValue,
} from "./statistics-sort";

type Legend = UserLootStatsResponseDtoOutputLegendsItem;

const legendKey = (legend: Legend) =>
  `${legend.itemId}:${legend.world}:${legend.npc.id}`;

const numberFormatter = new Intl.NumberFormat("pl-PL");

const SORT_COLUMNS: readonly StatisticsSortColumn[] = [
  ["legends", STATS_TABLE_COUNT_COLUMN_ID],
  ["caught", `${STATS_TABLE_COUNT_COLUMN_ID}:caught`],
  ["kills", `${STATS_TABLE_COUNT_COLUMN_ID}:kills`],
];

const sortValue: Partial<
  Record<StatisticsSortValue["field"], (legend: Legend) => number>
> = {
  legends: (legend) => legend.count,
  caught: (legend) => legend.caught,
  kills: (legend) => legend.npcKills,
};

type StatisticsLegendsTableProps = {
  legends: Legend[];
  sort: StatisticsSortValue;
  onSortChange: (sort: StatisticsSortValue) => void;
  /** The legends are narrowed by a search, so none means no match. */
  filtered?: boolean;
};

/** Every legendary drop of the period: dropped, caught, and the user's kills of its monster. */
export function StatisticsLegendsTable({
  legends,
  sort,
  onSortChange,
  filtered = false,
}: StatisticsLegendsTableProps) {
  const { t } = useTranslation();

  const sorted = sortStatisticsRows(
    legends,
    sortValue[sort.field] ?? ((legend) => legend.count),
    sort.asc,
  );

  const itemCell = (legend: Legend) => (
    <span className="flex min-w-0 items-center gap-3">
      <StatisticsLegendItem legend={legend} />
      <span className="truncate font-medium">{legend.name}</span>
    </span>
  );

  const npcCell = (legend: Legend, subtitle: string) => (
    <StatsNpcCell
      npc={{
        id: legend.npc.id,
        name: legend.npc.name,
        lvl: legend.npc.lvl ?? 0,
        icon: legend.npc.icon,
      }}
      name={legend.npc.name}
      subtitle={subtitle}
    />
  );

  const columns: ColumnDef<typeof coreTableFeatures, Legend>[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      enableSorting: false,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <RankBadge rank={row.index + 1} />,
    },
    {
      id: "item",
      enableSorting: false,
      header: () => t("statistics.legendsTable.item"),
      cell: ({ row: { original } }) => itemCell(original),
    },
    {
      id: "npc",
      enableSorting: false,
      header: () => t("statistics.npc"),
      cell: ({ row: { original } }) =>
        npcCell(original, upperFirst(original.world)),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.legendsTable.present")}
        />
      ),
      cell: ({ row: { original } }) => (
        <StatsCountCell value={original.count} emphasized />
      ),
    },
    {
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:caught`,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.legendsTable.caught")}
        />
      ),
      cell: ({ row: { original } }) => (
        <StatsCountCell value={original.caught} />
      ),
    },
    {
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:kills`,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.legendsTable.kills")}
        />
      ),
      cell: ({ row: { original } }) => (
        <StatsCountCell value={original.npcKills} />
      ),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: sorted,
    columns,
    ...statisticsTableSorting(sort, SORT_COLUMNS, onSortChange),
    manualSorting: true,
    getRowId: (legend) => legendKey(legend),
  });

  if (!legends.length)
    return (
      <div className="p-3">
        <EmptyState
          framed
          icon={Crown}
          title={t(
            filtered ? "common.noResults" : "loots.stats.topItems.noData",
          )}
        />
      </div>
    );

  return (
    <ResultsSurface>
      <ul className="xl:hidden">
        {sorted.map((legend, index) => (
          <li
            key={legendKey(legend)}
            data-list-tile
            className={cn(
              "flex min-w-0 items-center gap-3 py-3",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <RankBadge rank={index + 1} />
            <StatisticsLegendItem legend={legend} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {legend.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {`${legend.npc.name} · ${upperFirst(legend.world)}`}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className="text-sm font-semibold tabular-nums">
                {numberFormatter.format(legend.count)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("statistics.legend.caught", { count: legend.caught })}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <StatsTable table={table} className="hidden border-b xl:table" />
    </ResultsSurface>
  );
}
