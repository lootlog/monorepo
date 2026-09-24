import { useState, type PropsWithChildren } from "react";
import type { Loot } from "@/lib/loots/loot-types";
import {
  LootListItemStacksContext,
  type ExpandedLootItemStack,
} from "./loot-item-stack-context";

export const LootListItemStacksProvider = ({
  children,
  loots,
}: PropsWithChildren<{ loots: readonly Pick<Loot, "id">[] }>) => {
  const state = useState<ExpandedLootItemStack[]>([]);
  const [expandedStacks, setExpandedStacks] = state;
  const lootIds = new Set(loots.map((loot) => loot.id));

  if (expandedStacks.some((stack) => !lootIds.has(stack.lootId))) {
    setExpandedStacks(
      expandedStacks.filter((stack) => lootIds.has(stack.lootId)),
    );
  }

  return (
    <LootListItemStacksContext value={state}>
      {children}
    </LootListItemStacksContext>
  );
};
