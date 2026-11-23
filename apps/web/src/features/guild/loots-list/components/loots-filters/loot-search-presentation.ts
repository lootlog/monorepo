import type { Variants } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";

export const containerVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATION.medium,
      ease: EASE_EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: MOTION_DURATION.short, ease: EASE_EMPHASIZED },
  },
};

export const allTrue = (...values: boolean[]) => values.every(Boolean);

export const anyTrue = (...values: boolean[]) => values.some(Boolean);

export const renderIf = (condition: boolean, content: ReactNode) =>
  condition ? content : null;

export type GuildSearchScope = "all" | "pages" | "npcs" | "items" | "players";

export const isInScope = (scope: GuildSearchScope, group: GuildSearchScope) =>
  scope === "all" || scope === group;

export const SEARCH_ROW_CLASS_NAME = "group h-12 gap-3 rounded-lg px-2.5";

export const getPlayerRowValue = (player: { id: string; world: string }) =>
  `player-${player.world}-${player.id}`;
