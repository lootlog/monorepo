import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Loot } from "@/lib/loots/loot-types";

export type ExpandedLootItemStack = {
  lootId: Loot["id"];
  playerId: Loot["players"][number]["id"];
  anchorRect: DOMRect;
};

export const LootListItemStacksContext = createContext<
  | [ExpandedLootItemStack[], Dispatch<SetStateAction<ExpandedLootItemStack[]>>]
  | null
>(null);

export const LootItemStackLootIdContext = createContext<Loot["id"] | null>(
  null,
);
