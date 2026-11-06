import { compareNpcsStrongestFirst } from "@lootlog/domain/npc-type";
import { formatLevel } from "@lootlog/domain/profession";
import { NpcTile } from "@/components/tiles/npc-tile";
import { WikiContextMenuItem } from "@/components/common/wiki-context-menu-item";
import { wikiNpcUrl } from "@/config/wiki";
import type { LootNpc } from "@/lib/loots/loot-types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type LootNpcsProps = {
  npcs: LootNpc[];
  className?: string;
  showIcon?: boolean;
  /** `lg` is the details dialog title; cards and feed rows use `sm`. */
  size?: "sm" | "lg";
};

// NPC types that get special badges
const SPECIAL_NPC_TYPES = ["TITAN", "COLOSSUS", "HERO", "EVENT_HERO"] as const;

type SpecialNpcType = (typeof SPECIAL_NPC_TYPES)[number];

// Get badge styling based on NPC type
const getNpcBadgeStyle = (type: SpecialNpcType) => {
  switch (type) {
    case "TITAN":
      return "bg-primary/10 text-primary border-primary/20";
    case "COLOSSUS":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "HERO":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "EVENT_HERO":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
  }
};

const isSpecialNpcType = (type: LootNpc["type"]): type is SpecialNpcType =>
  SPECIAL_NPC_TYPES.some((specialType) => specialType === type);

export const LootNpcs: FC<LootNpcsProps> = ({
  npcs,
  className,
  showIcon = false,
  size = "sm",
}) => {
  const { t } = useTranslation();

  // The strongest NPC names the loot, as in statistics and the activity feed.
  const sortedNpcs = [...npcs].sort((left, right) =>
    compareNpcsStrongestFirst(
      { ...left, npcId: left.id },
      { ...right, npcId: right.id },
    ),
  );

  const firstNpc = sortedNpcs[0];

  const specialNpcType =
    firstNpc && isSpecialNpcType(firstNpc.type) ? firstNpc.type : undefined;

  return (
    <span
      className={cn(
        "flex min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-1",
        className,
      )}
    >
      {showIcon && firstNpc?.icon && (
        <NpcTile
          npc={{
            name: firstNpc.name,
            icon: firstNpc.icon,
            lvl: firstNpc.lvl ?? undefined,
          }}
        />
      )}
      {firstNpc && (
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <span
                className={cn(
                  "min-w-0 cursor-context-menu break-words font-semibold leading-tight text-foreground",
                  size === "lg" ? "text-base" : "text-sm",
                )}
              />
            }
          >
            {firstNpc.name}
            {firstNpc.lvl ? (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {formatLevel(firstNpc.lvl, firstNpc.prof)}
              </span>
            ) : null}
          </ContextMenuTrigger>
          <ContextMenuContent className="min-w-[15rem]">
            <WikiContextMenuItem href={wikiNpcUrl(firstNpc)}>
              {t("loots.list.npcActions.showOnWiki")}
            </WikiContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      {specialNpcType && (
        <span
          className={cn(
            "inline-flex h-5 w-fit shrink-0 items-center rounded-md border px-2 text-2xs font-semibold leading-none",
            getNpcBadgeStyle(specialNpcType),
          )}
        >
          {t(`npcType.${specialNpcType}`)}
        </span>
      )}
    </span>
  );
};
