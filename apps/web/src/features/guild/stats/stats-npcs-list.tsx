import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { StatsCountCell } from "./components/stats-count-cell";
import { StatsNpcCell } from "./components/stats-npc-cell";
import { StatsRank } from "./components/stats-rank";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  STATS_TABLE_TYPE_COLUMN_ID,
  StatsTable,
} from "./components/stats-table";
import { StatsTableCard } from "./components/stats-table-card";
import { useStatsNpcsListModel } from "./use-stats-npcs-list-model";

export const StatsNpcsList = () => {
  const {
    t,
    search,
    handleSearchChange,
    settings,
    handleWorldChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    paginatedData,
    hasActiveFilters,
    handleRowClick,
    cursor,
    guildId,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  } = useStatsNpcsListModel();

  const columns: ColumnDef<
    typeof coreTableFeatures,
    (typeof paginatedData)[number]
  >[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <StatsRank rank={cursor + row.index + 1} />,
    },
    {
      id: "npc",
      header: () => t("kills.npcsList.npc"),
      cell: ({ row: { original: npc } }) => (
        <StatsNpcCell
          npc={{
            id: npc.npcId,
            name: npc.npcName,
            lvl: npc.npcLvl,
            icon: npc.npcIcon,
          }}
          name={
            <TextLink
              onClick={(event) => event.stopPropagation()}
              render=<Link
                to="/$guildId/stats/npcs/$npcId"
                params={{ guildId, npcId: String(npc.npcId) }}
              />
            >
              {npc.npcName}
            </TextLink>
          }
          subtitle={t("kills.level", { level: npc.npcLvl })}
        />
      ),
    },
    {
      id: STATS_TABLE_TYPE_COLUMN_ID,
      header: () => t("kills.npcsList.type"),
      cell: ({ row: { original: npc } }) => t(`npcType.${npc.npcType}`),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: () => t("kills.npcKillers.killCount"),
      cell: ({ row: { original: npc } }) => (
        <StatsCountCell value={npc.uniqueKills} emphasized />
      ),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: paginatedData,
    columns,
    getRowId: (npc) => String(npc.npcId),
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background px-3 pb-3">
      <h1 className="sr-only">{t("kills.npcsList.title")}</h1>
      <KillStatsFilterBar
        world={settings.world}
        period={settings.period}
        onWorldChange={handleWorldChange}
        onPeriodChange={handlePeriodChange}
        search={{
          value: search,
          placeholder: t("kills.npcsList.searchPlaceholder"),
          onChange: handleSearchChange,
        }}
        level={{
          minLvl: settings.minLvl,
          maxLvl: settings.maxLvl,
          onMinLvlChange: handleMinLvlChange,
          onMaxLvlChange: handleMaxLvlChange,
        }}
        npcType={{
          value: settings.npcType,
          onValueChange: handleNpcTypeChange,
        }}
      />

      <StatsTableCard
        isLoading={isLoading}
        emptyMessage={
          paginatedData.length === 0
            ? t(
                hasActiveFilters
                  ? "kills.topNpcs.filteredNoData"
                  : "kills.topNpcs.noData",
              )
            : undefined
        }
        footer={
          <TablePaginationFooter
            totalLabel={t("kills.npcsList.total", { count: total })}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        }
      >
        <ul className="md:hidden">
          {paginatedData.map((npc, index) => (
            <li
              key={npc.npcId}
              className="border-b border-border last:border-b-0"
            >
              <Link
                to="/$guildId/stats/npcs/$npcId"
                params={{ guildId, npcId: String(npc.npcId) }}
                className="flex min-w-0 items-center gap-3 p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <StatsRank rank={cursor + index + 1} />
                <span className="min-w-0 flex-1">
                  <StatsNpcCell
                    npc={{
                      id: npc.npcId,
                      name: npc.npcName,
                      lvl: npc.npcLvl,
                      icon: npc.npcIcon,
                    }}
                    name={npc.npcName}
                    subtitle={`${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: npc.npcLvl })}`}
                  />
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {npc.uniqueKills.toLocaleString("pl-PL")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <StatsTable
          table={table}
          className="hidden border-b md:table"
          onRowClick={handleRowClick}
        />
      </StatsTableCard>
    </div>
  );
};
