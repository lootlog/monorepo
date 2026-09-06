import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";

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
            {npc.npcLvl}
            {npc.npcProf} · {t(`npcType.${npc.npcType}`)}
          </span>
        </>
      ),
    },
    {
      accessorKey: "world",
      header: () => t("statistics.world"),
      cell: ({ row: { original: npc } }) => npc.world,
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
              ? "—"
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
          {npc.bestDay?.date ?? "—"}
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
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("statistics.noData")}
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[680px]">
        <TanStackTableHeader table={table} />
        <TanStackTableBody table={table} />
      </Table>
    </div>
  );
}
