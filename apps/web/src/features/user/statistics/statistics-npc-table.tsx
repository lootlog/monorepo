import { formatLevel } from "@lootlog/domain/profession";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { upperFirst } from "es-toolkit";
import { Skull } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { formatStatisticsDate } from "./format-statistics-date";
import { EMPTY_VALUE } from "@/constants/empty-value";

export function StatisticsNpcTable({
  npcs,
}: {
  npcs: UserKillAnalyticsResponseDtoOutput["npcs"];
}) {
  const { t } = useTranslation();

  const columns: ColumnDef<
    typeof coreTableFeatures,
    UserKillAnalyticsResponseDtoOutput["npcs"][number]
  >[] = [
    {
      accessorKey: "npcName",
      header: () => t("statistics.npc"),
      cell: ({ row: { original: npc } }) => (
        <>
          <span className="font-medium">{npc.npcName}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {formatLevel(npc.npcLvl, npc.npcProf)} ·{" "}
            {t(`npcType.${npc.npcType}`)}
          </span>
        </>
      ),
    },
    {
      accessorKey: "world",
      header: () => t("statistics.world"),
      cell: ({ row: { original: npc } }) => upperFirst(npc.world),
    },
    {
      accessorKey: "totalKills",
      header: () => t("statistics.kills"),
      cell: ({ row: { original: npc } }) =>
        npc.totalKills.toLocaleString("pl-PL"),
    },
    {
      accessorKey: "comparisonKills",
      header: () => t("statistics.current"),
      cell: ({ row: { original: npc } }) =>
        npc.comparisonKills.toLocaleString("pl-PL"),
    },
    {
      accessorKey: "previousKills",
      header: () => t("statistics.previous"),
      cell: ({ row: { original: npc } }) =>
        npc.previousKills.toLocaleString("pl-PL"),
    },
    {
      accessorKey: "deltaKills",
      header: () => t("statistics.change"),
      cell: ({ row: { original: npc } }) => (
        <>
          {npc.deltaKills.toLocaleString("pl-PL")}
          <span className="block text-xs text-muted-foreground">
            {npc.deltaPercent === null
              ? EMPTY_VALUE
              : `${npc.deltaPercent.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`}
          </span>
        </>
      ),
    },
    {
      accessorKey: "share",
      header: () => t("statistics.share"),
      cell: ({ row: { original: npc } }) => (
        <>
          {npc.share.toLocaleString("pl-PL", {
            maximumFractionDigits: 1,
          })}
          %
        </>
      ),
    },
    {
      accessorKey: "bestDay",
      header: () => t("statistics.bestDay"),
      cell: ({ row: { original: npc } }) => (
        <>
          {npc.bestDay ? formatStatisticsDate(npc.bestDay.date) : EMPTY_VALUE}
          <span className="block text-xs text-muted-foreground">
            {npc.bestDay && t("statistics.count", { count: npc.bestDay.kills })}
          </span>
        </>
      ),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: npcs,
    columns,
    getRowId: (npc) => `${npc.world}:${npc.npcId}`,
  });

  if (!npcs.length)
    return <EmptyState icon={Skull} title={t("statistics.noData")} />;

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[680px]">
        <TanStackTableHeader
          table={table}
          className="sticky top-0 z-10 bg-background"
          rowClassName="border-b-1! border-border"
        />
        <TanStackTableBody
          table={table}
          rowHeaderColumnId="npcName"
          rowClassName="h-14 border-b border-border hover:bg-muted/40"
        />
      </Table>
    </div>
  );
}
