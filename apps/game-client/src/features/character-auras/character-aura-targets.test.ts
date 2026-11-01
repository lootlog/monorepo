import { describe, expect, it } from "vitest";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { HERO_AURA_KEY } from "./character-aura-renderer";
import { resolveCharacterAuraTargets } from "./character-aura-targets";

const other = (characterId: string, accountId: string): RuntimeOther => ({
  accountId,
  characterId,
  icon: "",
  level: 1,
  name: characterId,
  profession: "w",
});

describe("resolveCharacterAuraTargets", () => {
  it("draws an aura on every visible character of a listed account", () => {
    const { byCharacter } = resolveCharacterAuraTargets({
      listed: [{ gameAccountId: "7", auraId: "frost" }],
      heroAccountId: "1",
      heroAura: null,
      othersById: {
        a: other("a", "7"),
        b: other("b", "7"),
        c: other("c", "8"),
      },
    });

    expect(byCharacter).toEqual(
      new Map([
        ["a", "frost"],
        ["b", "frost"],
      ]),
    );
  });

  it("follows the hero's own choice before the list catches up", () => {
    const removed = resolveCharacterAuraTargets({
      listed: [{ gameAccountId: "1", auraId: "frost" }],
      heroAccountId: "1",
      heroAura: null,
      othersById: {},
    });

    expect(removed.byCharacter.size).toBe(0);
    expect(removed.byAccount.has("1")).toBe(false);

    const changed = resolveCharacterAuraTargets({
      listed: [{ gameAccountId: "1", auraId: "frost" }],
      heroAccountId: "1",
      heroAura: "sakura",
      othersById: {},
    });

    expect(changed.byCharacter.get(HERO_AURA_KEY)).toBe("sakura");
    expect(changed.byAccount.get("1")).toBe("sakura");
  });
});
