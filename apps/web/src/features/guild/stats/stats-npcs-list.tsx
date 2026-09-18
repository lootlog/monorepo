import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { StatsCountCell } from "./components/stats-count-cell";
import { StatsNpcCell } from "./components/stats-npc-cell";
import { StatsRank } from "./components/stats-rank";
import { StatsTableCard } from "./components/stats-table-card";
import { StatsTableHeader } from "./components/stats-table-header";
import { StatsTableRow } from "./components/stats-table-row";
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
        <Table className="hidden border-b md:table">
          <StatsTableHeader>
            <TableHead className="w-14 text-center">
              {t("kills.memberRanking.position")}
            </TableHead>
            <TableHead>{t("kills.npcsList.npc")}</TableHead>
            <TableHead>{t("kills.npcsList.type")}</TableHead>
            <TableHead className="text-right">
              {t("kills.npcKillers.killCount")}
            </TableHead>
          </StatsTableHeader>
          <TableBody>
            {paginatedData.map((npc, index) => (
              <StatsTableRow
                key={npc.npcId}
                onClick={() => handleRowClick(npc)}
              >
                <TableCell className="text-center">
                  <StatsRank rank={cursor + index + 1} />
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t(`npcType.${npc.npcType}`)}
                </TableCell>
                <TableCell>
                  <StatsCountCell value={npc.uniqueKills} emphasized />
                </TableCell>
              </StatsTableRow>
            ))}
          </TableBody>
        </Table>
      </StatsTableCard>
    </div>
  );
};
