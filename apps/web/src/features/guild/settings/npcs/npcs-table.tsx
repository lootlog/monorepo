import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { getSettingsRowLinkProps } from "@/features/guild/settings/components/settings-row-link-props";
import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import type { LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc } from "@lootlog/client/main";
import { cn } from "cn";
import { Table } from "@lootlog/ui/components/table";
import { useNavigate } from "@tanstack/react-router";
import { useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { useNpcsTableColumns } from "./use-npcs-table-columns";

type NpcsTableProps = {
  guildId: string;
  isMobile: boolean;
  npcs: LootlogConfigNpc[];
};

const getNpcsTableCellClassName = (columnId: string) => {
  if (columnId === "npc") {
    return "min-w-0 overflow-hidden";
  }

  if (columnId === "rarities") {
    return "overflow-hidden";
  }

  return "text-right";
};

export const NpcsTable = ({ guildId, isMobile, npcs }: NpcsTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openNpcDetails = (npc: LootlogConfigNpc) => {
    navigate({
      to: "/$guildId/settings/npcs/$npcId",
      params: { guildId, npcId: String(npc.id) },
    });
  };

  const columns = useNpcsTableColumns({ guildId, openNpcDetails });

  const table = useTable({
    features: coreTableFeatures,
    data: npcs,
    columns,
    getRowId: (npc) => String(npc.id),
  });

  if (isMobile) {
    return (
      <div className="divide-y divide-border">
        {npcs.map((npc) => {
          const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
            npc.allowedRarities.includes(rarity.key),
          );

          return (
            <button
              key={npc.id}
              type="button"
              className="relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => openNpcDetails(npc)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {t(`npcType.${npc.npcType}`)}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {t("settings.npcs.rarityCountCompact", {
                    count: enabledRarities.length,
                    total: NPC_RARITY_CONFIG.length,
                  })}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {enabledRarities.map((rarity) => {
                  const Icon = rarity.icon;

                  return (
                    <span
                      key={rarity.key}
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-md",
                        rarity.bgColor,
                      )}
                    >
                      <Icon className={cn("size-4", rarity.color)} />
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Table className="min-w-[560px] table-fixed">
      <colgroup>
        <col className="w-[320px]" />
        <col />
        <col className="w-16" />
      </colgroup>
      <TanStackTableHeader
        table={table}
        className="sticky top-0 z-10 bg-background"
        rowClassName="border-b-1! border-border"
        getHeadClassName={(header) =>
          header.column.id === "actions" ? "text-right" : ""
        }
      />
      <TanStackTableBody
        table={table}
        getRowClassName={(row) =>
          cn(
            "relative h-14 cursor-pointer border-b border-border transition-colors hover:bg-accent/35",
            row.index === npcs.length - 1 && "border-b-0",
          )
        }
        getCellClassName={(cell) => getNpcsTableCellClassName(cell.column.id)}
        getRowProps={(row) =>
          getSettingsRowLinkProps(() => openNpcDetails(row.original))
        }
      />
    </Table>
  );
};
