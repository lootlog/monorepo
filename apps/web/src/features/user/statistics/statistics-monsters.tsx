import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { StatisticsNpcTable } from "./statistics-npc-table";

export function StatisticsMonsters({
  data,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
}) {
  const { t } = useTranslation();
  const columns: ColumnDef<
    typeof coreTableFeatures,
    UserKillAnalyticsResponseDtoOutput["types"][number]
  >[] = [
    {
      accessorKey: "npcType",
      header: () => t("statistics.type"),
      cell: ({ row: { original: type } }) => (
        <>{t(`npcType.${type.npcType}`)}</>
      ),
    },
    {
      accessorKey: "totalKills",
      header: () => t("statistics.kills"),
      cell: ({ row: { original: type } }) =>
        type.totalKills.toLocaleString("pl-PL"),
    },
    {
      accessorKey: "uniqueNpcs",
      header: () => t("statistics.uniqueNpcs"),
      cell: ({ row: { original: type } }) => type.uniqueNpcs,
    },
    {
      accessorKey: "share",
      header: () => t("statistics.share"),
      cell: ({ row: { original: type } }) => (
        <>
          {type.share.toLocaleString("pl-PL", {
            maximumFractionDigits: 1,
          })}
          %
        </>
      ),
    },
  ];
  const table = useTable({
    features: coreTableFeatures,
    data: data.types,
    columns,
    getRowId: (type) => type.npcType,
  });
  return (
    <>
      <SectionCard>
        <SectionCardHeader title={t("statistics.typeDistribution")} />
        <SectionCardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TanStackTableHeader table={table} />
              <TanStackTableBody table={table} rowHeaderColumnId="npcType" />
            </Table>
          </div>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader
          title={t("statistics.ranking")}
          description={t("statistics.alignedComparison")}
        />
        <SectionCardContent className="p-0">
          <StatisticsNpcTable npcs={data.npcs} />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader title={t("statistics.growth")} />
        <SectionCardContent className="p-0">
          <StatisticsNpcTable npcs={data.npcGains} />
        </SectionCardContent>
      </SectionCard>
    </>
  );
}
