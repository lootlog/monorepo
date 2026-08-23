import { describe, expect, it } from "vitest";
import { resolveDialogLootNpcLevel } from "./resolve-dialog-loot-npc-level";

const MINE_NPC_CASES = [
  ["Pokaźne Złoże", 43],
  ["Large Deposit", 43],
  ["Naładowany kryształ", 64],
  ["Charged Crystal", 64],
  ["Błękitne złoże", 83],
  ["Azure Vein", 83],
  ["Niewydobyty minerał", 114],
  ["Unmined Mineral", 114],
  ["Zamrożony czarodziej", 300],
  ["Frozen Wizard", 300],
] as const;

describe("resolveDialogLootNpcLevel", () => {
  it.each(MINE_NPC_CASES)(
    "uses the configured level for %s",
    (npcName, expectedLevel) => {
      expect(
        resolveDialogLootNpcLevel({
          npcName,
          npcLevel: 0,
        }),
      ).toBe(expectedLevel);
    },
  );

  it("preserves a positive level reported by Margonem", () => {
    expect(
      resolveDialogLootNpcLevel({
        npcName: "Zamrożony czarodziej",
        npcLevel: 299,
      }),
    ).toBe(299);
  });

  it("does not infer a level for an unknown dialog npc", () => {
    expect(
      resolveDialogLootNpcLevel({
        npcName: "Nieznany dialog",
        npcLevel: 0,
      }),
    ).toBe(0);
  });
});
