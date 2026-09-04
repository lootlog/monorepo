import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import type { LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc } from "@lootlog/client/main";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

type NpcsTableProps = {
  guildId: string;
  isMobile: boolean;
  npcs: LootlogConfigNpc[];
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
      <TableHeader
        className="sticky top-0 z-10 bg-sidebar/95  [&_tr]:!border-b-0"
        style={{ boxShadow: "inset 0 -1px 0 var(--border)" }}
      >
        <TableRow className="h-10 border-b-0 hover:bg-transparent">
          <TableHead>{t("settings.npcs.table.npc")}</TableHead>
          <TableHead>{t("settings.npcs.table.rarities")}</TableHead>
          <TableHead className="text-right">
            {t("settings.npcs.table.actions")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {npcs.map((npc, index) => {
          const npcRouteParams = { guildId, npcId: String(npc.id) };
          const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
            npc.allowedRarities.includes(rarity.key),
          );
          const isLastNpc = index === npcs.length - 1;

          return (
            <TableRow
              key={npc.id}
              role="link"
              tabIndex={0}
              className={cn(
                "relative h-16 cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/35",
                isLastNpc && "border-b-0",
              )}
              onClickCapture={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button,a,[data-npc-row-action]")) {
                  return;
                }

                openNpcDetails(npc);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== "") {
                  return;
                }

                event.preventDefault();
                openNpcDetails(npc);
              }}
            >
              <TableCell className="min-w-0 overflow-hidden">
                <Link
                  to="/$guildId/settings/npcs/$npcId"
                  params={npcRouteParams}
                  className="block truncate text-sm font-semibold"
                >
                  {t(`npcType.${npc.npcType}`)}
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden">
                <Link
                  to="/$guildId/settings/npcs/$npcId"
                  params={npcRouteParams}
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
                                  <Icon
                                    className={cn("size-4", rarity.color)}
                                  />
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
              </TableCell>
              <TableCell
                data-npc-row-action
                className="text-right"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
