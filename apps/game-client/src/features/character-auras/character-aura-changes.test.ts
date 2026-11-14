import type { CharacterAurasResponseDto } from "@lootlog/client/main";
import { describe, expect, it } from "vitest";
import { applyCharacterAuraChanges } from "./character-aura-changes";

const list: CharacterAurasResponseDto = {
  auras: [
    { gameAccountId: "101", characterId: "1", auraId: "frost" },
    { gameAccountId: "202", characterId: "2", auraId: "void" },
  ],
};

describe("applyCharacterAuraChanges", () => {
  it("shows a new aura, swaps one and removes another without touching other characters", () => {
    expect(
      applyCharacterAuraChanges(list, {
        auras: [
          { gameAccountId: "101", characterId: "1", auraId: null },
          { gameAccountId: "202", characterId: "2", auraId: "tide" },
          { gameAccountId: "202", characterId: "3", auraId: "sakura" },
        ],
      }),
    ).toEqual({
      auras: [
        { gameAccountId: "202", characterId: "2", auraId: "tide" },
        { gameAccountId: "202", characterId: "3", auraId: "sakura" },
      ],
    });
  });

  it("drops an aura this client cannot draw instead of showing a stale one", () => {
    expect(
      applyCharacterAuraChanges(list, {
        auras: [
          {
            gameAccountId: "101",
            characterId: "1",
            auraId: "from-a-newer-client",
          },
        ],
      }),
    ).toEqual({
      auras: [{ gameAccountId: "202", characterId: "2", auraId: "void" }],
    });
  });

  it("leaves an unloaded list for its first fetch", () => {
    expect(
      applyCharacterAuraChanges(undefined, {
        auras: [{ gameAccountId: "101", characterId: "1", auraId: "frost" }],
      }),
    ).toBeUndefined();
  });
});
