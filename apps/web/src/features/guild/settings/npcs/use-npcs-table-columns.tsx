import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { TextLink } from "@lootlog/ui/components/text-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "cn";
import { CheckCircle2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

type ColumnsProps = {
  guildId: string;
  openNpcDetails: (npc: LootlogConfigNpc) => void;
};

export function useNpcsTableColumns({ guildId, openNpcDetails }: ColumnsProps) {
  const { t } = useTranslation();

  const columns: ColumnDef<typeof coreTableFeatures, LootlogConfigNpc>[] = [
    {
      id: "npc",
      header: () => t("settings.npcs.table.npc"),
      cell: ({ row: { original: npc } }) => (
        <TextLink
          className="block truncate text-sm"
          render=<Link
            to="/$guildId/settings/npcs/$npcId"
            params={{ guildId, npcId: String(npc.id) }}
          />
        >
          {t(`npcType.${npc.npcType}`)}
        </TextLink>
      ),
    },
    {
      id: "rarities",
      header: () => t("settings.npcs.table.rarities"),
      cell: ({ row: { original: npc } }) => {
        const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
          npc.allowedRarities.includes(rarity.key),
        );

        return (
          <Link
            to="/$guildId/settings/npcs/$npcId"
            params={{ guildId, npcId: String(npc.id) }}
            className="flex min-h-7 min-w-0 items-center gap-1"
          >
            {enabledRarities.length > 0 ? (
              <TooltipProvider delay={100}>
                {enabledRarities.map((rarity) => {
                  const Icon = rarity.icon;

                  return (
                    <Tooltip key={rarity.key}>
                      <TooltipTrigger
                        render={
                          <span
                            className={cn(
                              "inline-flex size-7 items-center justify-center rounded-md",
                              rarity.bgColor,
                            )}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Icon className={cn("size-4", rarity.color)} />
                          </span>
                        }
                      />
                      <TooltipContent side="top">
                        <p className="text-sm font-semibold">
                          {t(`itemRarity.${rarity.key}`)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            ) : (
              <span className="truncate text-xs text-muted-foreground">
                {t("settings.npcs.noRarities")}
              </span>
            )}
          </Link>
        );
      },
    },
    {
      id: "actions",
      header: () => t("settings.npcs.table.actions"),
      cell: ({ row: { original: npc } }) => (
        <div data-settings-row-action>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 md:size-8"
                  aria-label={t("settings.npcs.actions.more")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openNpcDetails(npc)}>
                <CheckCircle2 className="size-4" />
                {t("settings.npcs.actions.viewDetails")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return columns;
}
