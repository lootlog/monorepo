import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { formatLevel } from "@lootlog/domain/profession";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { Skull } from "lucide-react";
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
import type { StatisticsTabProps } from "./statistics-content";
import { StatisticsDelta } from "./statistics-delta";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";
import { useStatisticsSort } from "./use-statistics-sort";
import { matchesStatisticsQuery } from "./statistics-query";
import { StatisticsSortableHeader } from "./statistics-sortable-header";
import {
  sortStatisticsRows,
  statisticsTableSorting,
  type StatisticsSortColumn,
  type StatisticsSortValue,
} from "./statistics-sort";

type Npc = UserKillAnalyticsResponseDtoOutput["npcs"][number];

const SORT_COLUMNS: readonly StatisticsSortColumn[] = [
  ["kills", STATS_TABLE_COUNT_COLUMN_ID],
  ["change", `${STATS_TABLE_COUNT_COLUMN_ID}:change`],
  ["legends", `${STATS_TABLE_COUNT_COLUMN_ID}:legends`],
  ["caught", `${STATS_TABLE_COUNT_COLUMN_ID}:caught`],
];

export function StatisticsMonsters({ data, search }: StatisticsTabProps) {
  const { t } = useTranslation();
  const { npcs } = data;
  const lootStats = useStatisticsLootStats(search);

  // A boss's name, unlike its id, is the same in its kills and its loots.
  const dropsByMonster = new Map(
    lootStats.data?.monsters.map((monster) => [
      `${monster.world}:${monster.npc.name}`,
      monster,
    ]),
  );

  const drops = (npc: Npc) => dropsByMonster.get(`${npc.world}:${npc.npcName}`);

  const dropCell = (npc: Npc, field: "legends" | "caught") =>
    lootStats.data ? (
      <StatsCountCell value={drops(npc)?.[field] ?? 0} />
    ) : (
      <span className="block text-right text-muted-foreground/50">—</span>
    );

  const { sort, onSortChange } = useStatisticsSort("monsters", search);

  const sortValue = {
    kills: (npc: Npc) => npc.totalKills,
    change: (npc: Npc) => npc.deltaKills,
    legends: (npc: Npc) => drops(npc)?.legends ?? 0,
    caught: (npc: Npc) => drops(npc)?.caught ?? 0,
  } satisfies Record<StatisticsSortValue["field"], (npc: Npc) => number>;

  const sorted = sortStatisticsRows(
    npcs.filter((npc) => matchesStatisticsQuery(search.q, npc.npcName)),
    sortValue[sort.field],
    sort.asc,
  );

  const describe = (npc: Npc) =>
    `${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: formatLevel(npc.npcLvl, npc.npcProf) })}`;

  const npcCell = (npc: Npc, subtitle: string) => (
    <StatsNpcCell
      npc={{
        id: npc.npcId,
        name: npc.npcName,
        lvl: npc.npcLvl,
        icon: npc.npcIcon,
      }}
      name={npc.npcName}
      subtitle={subtitle}
    />
  );

  const columns: ColumnDef<typeof coreTableFeatures, Npc>[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      enableSorting: false,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <RankBadge rank={row.index + 1} />,
    },
    {
      id: "npc",
      enableSorting: false,
      header: () => t("statistics.npc"),
      cell: ({ row: { original: npc } }) => npcCell(npc, describe(npc)),
    },
    {
      id: "world",
      enableSorting: false,
      header: () => t("statistics.world"),
      cell: ({ row: { original: npc } }) => upperFirst(npc.world),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.kills")}
        />
      ),
      cell: ({ row: { original: npc } }) => (
        <StatsCountCell value={npc.totalKills} emphasized />
      ),
    },
    {
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:change`,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.change")}
        />
      ),
      cell: ({ row: { original: npc } }) => (
        <StatisticsDelta
          className="justify-end"
          delta={npc.deltaKills}
          percent={npc.deltaPercent}
        />
      ),
    },
    {
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:legends`,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.sort.fields.monsters.legends")}
        />
      ),
      cell: ({ row: { original: npc } }) => dropCell(npc, "legends"),
    },
    {
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:caught`,
      header: ({ column }) => (
        <StatisticsSortableHeader
          column={column}
          label={t("statistics.legendsTable.caught")}
        />
      ),
      cell: ({ row: { original: npc } }) => dropCell(npc, "caught"),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: sorted,
    columns,
    ...statisticsTableSorting(sort, SORT_COLUMNS, onSortChange),
    manualSorting: true,
    getRowId: (npc) => `${npc.world}:${npc.npcId}`,
  });

  if (!sorted.length)
    return (
      <div className="p-3">
        <EmptyState
          framed
          icon={Skull}
          title={t(npcs.length ? "common.noResults" : "statistics.noData")}
        />
      </div>
    );

  return (
    <ResultsSurface>
      <ul className="xl:hidden">
        {sorted.map((npc, index) => (
          <li
            key={`${npc.world}:${npc.npcId}`}
            data-list-tile
            className={cn(
              "flex min-w-0 items-center gap-3 py-3",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <RankBadge rank={index + 1} />
            <span className="min-w-0 flex-1">
              {npcCell(
                npc,
                [
                  describe(npc),
                  upperFirst(npc.world),
                  drops(npc)?.legends
                    ? t("statistics.monsterLegends", {
                        legends: drops(npc)?.legends,
                        caught: drops(npc)?.caught,
                      })
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" · "),
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className="text-sm font-semibold tabular-nums">
                {npc.totalKills.toLocaleString("pl-PL")}
              </span>
              <StatisticsDelta
                className="text-xs"
                delta={npc.deltaKills}
                percent={npc.deltaPercent}
              />
            </span>
          </li>
        ))}
      </ul>
      <StatsTable table={table} className="hidden border-b xl:table" />
    </ResultsSurface>
  );
}
