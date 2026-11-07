import { expect, test } from "bun:test";
import { mergeItemDropFields, toItemDropFields } from "./item-drops.js";

const item = {
  id: 1,
  name: "Item 1",
  worlds: ["new"],
  icon: "item.gif",
  stat: "",
  lvl: 1,
  rarity: null,
  type: null,
  gameVersion: "pl" as const,
  observedAt: "2026-10-01T00:00:00.000Z",
};

const npcDrop = (id: number, name: string) => ({
  id,
  identityNamespace: "template" as const,
  name,
  lvl: 100,
  icon: "npc.gif",
  type: "HERO",
  margonemType: 2,
  gameVersion: "pl" as const,
});

test("a monster standing in many places does not crowd out another monster's drops", () => {
  const fields = (drop: ReturnType<typeof npcDrop>) =>
    toItemDropFields({ ...item, droppedBy: drop });

  // Every Zamrożony czarodziej of a mine is its own catalog identity.
  const wizards = Array.from({ length: 24 }, (_, index) =>
    fields(npcDrop(8000 + index, "Zamrożony czarodziej")),
  ).reduce((stored, incoming) => mergeItemDropFields(incoming, stored));

  const merged = mergeItemDropFields(fields(npcDrop(7100, "Erktos")), wizards);

  expect(merged.droppedByKeys).toHaveLength(25);
  expect(merged.droppedByMonsterKeys).toEqual([
    "pl_Zamrożony czarodziej_HERO",
    "pl_Erktos_HERO",
  ]);
});
