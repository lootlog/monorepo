import type { CharacterAurasResponseDto } from "@lootlog/client/main";
import { describe, expect, it } from "vitest";
import { applyCharacterAuraChanges } from "./character-aura-changes";

const list: CharacterAurasResponseDto = {
  auras: [
    { gameAccountId: "101", auraId: "frost" },
    { gameAccountId: "202", auraId: "void" },
  ],
};

describe("applyCharacterAuraChanges", () => {
  it("shows a new aura, swaps one and removes another without touching other accounts", () => {
    expect(
      applyCharacterAuraChanges(list, {
        auras: [
          { gameAccountId: "101", auraId: null },
          { gameAccountId: "202", auraId: "tide" },
          { gameAccountId: "303", auraId: "sakura" },
        ],
      }),
    ).toEqual({
      auras: [
        { gameAccountId: "202", auraId: "tide" },
        { gameAccountId: "303", auraId: "sakura" },
      ],
    });
  });

  it("drops an aura this client cannot draw instead of showing a stale one", () => {
    expect(
      applyCharacterAuraChanges(list, {
        auras: [{ gameAccountId: "101", auraId: "from-a-newer-client" }],
      }),
    ).toEqual({ auras: [{ gameAccountId: "202", auraId: "void" }] });
  });

  it("leaves an unloaded list for its first fetch", () => {
    expect(
      applyCharacterAuraChanges(undefined, {
        auras: [{ gameAccountId: "101", auraId: "frost" }],
      }),
    ).toBeUndefined();
  });
});
