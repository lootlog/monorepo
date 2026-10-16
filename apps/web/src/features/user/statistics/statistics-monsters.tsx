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
import { formatStatisticsDate } from "@/components/common/kill-analytics/format-statistics-date";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { StatisticsTabProps } from "./statistics-content";
import { StatisticsDelta } from "./statistics-delta";

type Npc = UserKillAnalyticsResponseDtoOutput["npcs"][number];

export function StatisticsMonsters({ data, search }: StatisticsTabProps) {
  const { t } = useTranslation();
  const npcs = search.ranking === "gains" ? data.npcGains : data.npcs;

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
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <RankBadge rank={row.index + 1} />,
    },
    {
      id: "npc",
      header: () => t("statistics.npc"),
      cell: ({ row: { original: npc } }) => npcCell(npc, describe(npc)),
    },
    {
      id: "world",
      header: () => t("statistics.world"),
      cell: ({ row: { original: npc } }) => upperFirst(npc.world),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: () => t("statistics.kills"),
      cell: ({ row: { original: npc } }) => (
        <StatsCountCell value={npc.totalKills} emphasized />
      ),
    },
    {
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:change`,
      header: () => t("statistics.change"),
      cell: ({ row: { original: npc } }) => (
        <StatisticsDelta
          className="justify-end"
          delta={npc.deltaKills}
          percent={npc.deltaPercent}
        />
      ),
    },
    {
      id: "bestDay",
      header: () => t("kills.records.bestDay"),
      cell: ({ row: { original: npc } }) =>
        npc.bestDay?.kills ? (
          <span className="flex flex-col">
            <span className="tabular-nums">
              {formatStatisticsDate(npc.bestDay.date)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("statistics.count", { count: npc.bestDay.kills })}
            </span>
          </span>
        ) : null,
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: npcs,
    columns,
    getRowId: (npc) => `${npc.world}:${npc.npcId}`,
  });

  if (!npcs.length)
    return (
      <div className="p-3">
        <EmptyState
          framed
          icon={Skull}
          title={t(
            search.ranking === "gains"
              ? "statistics.noGains"
              : "statistics.noData",
          )}
        />
      </div>
    );

  return (
    <ResultsSurface>
      <ul className="xl:hidden">
        {npcs.map((npc, index) => (
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
              {npcCell(npc, `${describe(npc)} · ${upperFirst(npc.world)}`)}
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
