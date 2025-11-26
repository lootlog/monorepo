import type { Loot } from "@/hooks/api/loots/use-loots";
import { NpcType } from "@/hooks/api/game-data/use-npcs";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type LootNpcsProps = {
  npcs: Loot["npcs"];
  className?: string;
};

// NPC type priority for sorting (higher = more important)
const NPC_TYPE_PRIORITY: Record<NpcType, number> = {
  [NpcType.TITAN]: 8,
  [NpcType.COLOSSUS]: 7,
  [NpcType.HERO]: 6,
  [NpcType.EVENT_HERO]: 5,
  [NpcType.ELITE3]: 4,
  [NpcType.ELITE2]: 3,
  [NpcType.ELITE]: 2,
  [NpcType.NPC]: 1,
  [NpcType.COMMON]: 0,
};

// NPC types that get special badges
const SPECIAL_NPC_TYPES = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.EVENT_HERO,
] as const;

// Get badge styling based on NPC type
const getNpcBadgeStyle = (type: NpcType) => {
  switch (type) {
    case NpcType.TITAN:
      return "bg-primary/10 text-primary border-primary/20";
    case NpcType.COLOSSUS:
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case NpcType.HERO:
      return "bg-destructive/10 text-destructive border-destructive/20";
    case NpcType.EVENT_HERO:
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    default:
      return "";
  }
};

export const LootNpcs: FC<LootNpcsProps> = ({ npcs, className }) => {
  const { t } = useTranslation();
  const sortedNpcs = [...npcs].sort(
    (a, b) =>
      (NPC_TYPE_PRIORITY[b.type] ?? 0) - (NPC_TYPE_PRIORITY[a.type] ?? 0),
  );

  const firstNpc = sortedNpcs[0];
  const restNpcs = sortedNpcs.slice(1);
  const isFirstSpecial =
    firstNpc &&
    SPECIAL_NPC_TYPES.includes(
      firstNpc.type as (typeof SPECIAL_NPC_TYPES)[number],
    );

  return (
    <div className={cn("leading-none flex flex-col gap-1", className)}>
      {firstNpc && (
        <div className="flex flex-wrap items-center gap-x-1">
          <span className="text-foreground font-bold text-sm">
            {firstNpc.name}{" "}
            {firstNpc.lvl !== 0
              ? `(${firstNpc.lvl}${firstNpc.prof?.charAt(0).toLowerCase() ?? ""})`
              : ""}
            {restNpcs.length > 0 ? "," : ""}
          </span>
          {restNpcs.map((npc, index) => {
            const isLastElement = index === restNpcs.length - 1;
            return (
              <span className="text-xs text-muted-foreground" key={index}>
                {npc.name}{" "}
                {npc.lvl !== 0
                  ? `(${npc.lvl}${npc.prof?.charAt(0).toLowerCase() ?? ""})`
                  : ""}
                {isLastElement ? "" : ","}
              </span>
            );
          })}
        </div>
      )}
      {isFirstSpecial && (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border w-fit",
            getNpcBadgeStyle(firstNpc.type),
          )}
        >
          {t(`npcType.${firstNpc.type}`)}
        </span>
      )}
    </div>
  );
};
