import type { LootNpc } from "@/lib/loots/loot-types";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type LootNpcsProps = {
  npcs: LootNpc[];
  className?: string;
};

// NPC type priority for sorting (higher = more important)
const NPC_TYPE_PRIORITY = {
  TITAN: 8,
  COLOSSUS: 7,
  HERO: 6,
  EVENT_HERO: 5,
  ELITE3: 4,
  ELITE2: 3,
  ELITE: 2,
  NPC: 1,
  COMMON: 0,
};

// NPC types that get special badges
const SPECIAL_NPC_TYPES = ["TITAN", "COLOSSUS", "HERO", "EVENT_HERO"] as const;
const DEFAULT_NPC_TYPE = "COMMON";
type LootNpcType = keyof typeof NPC_TYPE_PRIORITY;

// Get badge styling based on NPC type
const getNpcBadgeStyle = (type: LootNpcType) => {
  switch (type) {
    case "TITAN":
      return "bg-primary/10 text-primary border-primary/20";
    case "COLOSSUS":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "HERO":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "EVENT_HERO":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    default:
      return "";
  }
};

const normalizeNpcType = (type: LootNpc["type"]): LootNpcType =>
  type && type in NPC_TYPE_PRIORITY ? type : DEFAULT_NPC_TYPE;

const isSpecialNpcType = (
  type: LootNpcType,
): type is (typeof SPECIAL_NPC_TYPES)[number] =>
  SPECIAL_NPC_TYPES.includes(type as (typeof SPECIAL_NPC_TYPES)[number]);

export const LootNpcs: FC<LootNpcsProps> = ({ npcs, className }) => {
  const { t } = useTranslation();
  const sortedNpcs = [...npcs].sort(
    (a, b) =>
      NPC_TYPE_PRIORITY[normalizeNpcType(b.type)] -
      NPC_TYPE_PRIORITY[normalizeNpcType(a.type)],
  );

  const firstNpc = sortedNpcs[0];
  const firstNpcType = firstNpc ? normalizeNpcType(firstNpc.type) : undefined;
  const specialNpcType =
    firstNpcType && isSpecialNpcType(firstNpcType) ? firstNpcType : undefined;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-row items-center gap-2 leading-none",
        className,
      )}
    >
      {firstNpc && (
        <span className="truncate text-sm font-bold text-foreground">
          {firstNpc.name}{" "}
          {firstNpc.lvl !== 0
            ? `(${firstNpc.lvl}${firstNpc.prof?.charAt(0).toLowerCase() ?? ""})`
            : ""}
        </span>
      )}
      {specialNpcType && (
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
            getNpcBadgeStyle(specialNpcType),
          )}
        >
          {t(`npcType.${specialNpcType}`)}
        </span>
      )}
    </div>
  );
};
