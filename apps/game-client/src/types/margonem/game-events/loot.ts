export type LootEvent = {
  source: "dialog" | "lootbox" | "fight";
  states: Record<string, number>;
};
