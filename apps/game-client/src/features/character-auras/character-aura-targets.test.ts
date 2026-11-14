import type { CharacterAuraResponseDto } from "@lootlog/client/main";
import { describe, expect, it } from "vitest";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { HERO_AURA_KEY } from "./character-aura-renderer";
import {
  characterAuraKey,
  resolveCharacterAuraTargets,
} from "./character-aura-targets";

const other = (characterId: string, accountId: string): RuntimeOther => ({
  accountId,
  characterId,
  icon: "",
  level: 1,
  name: characterId,
  profession: "w",
});

const hero = { accountId: "1", characterId: "10" };

describe("resolveCharacterAuraTargets", () => {
  it("draws an aura only on the listed character, not on others of its account", () => {
    const { byCharacter } = resolveCharacterAuraTargets({
      listed: [{ gameAccountId: "7", characterId: "a", auraId: "frost" }],
      hero,
      heroAura: null,
      othersById: {
        a: other("a", "7"),
        b: other("b", "7"),
        // The same character id on another account is another character.
        c: other("a", "8"),
      },
    });

    expect(byCharacter).toEqual(new Map([["a", "frost"]]));
  });

  it("follows the hero's own choice before the list catches up", () => {
    const listed: CharacterAuraResponseDto[] = [
      { gameAccountId: "1", characterId: "10", auraId: "frost" },
    ];

    const removed = resolveCharacterAuraTargets({
      listed,
      hero,
      heroAura: null,
      othersById: {},
    });

    expect(removed.byCharacter.size).toBe(0);
    expect(removed.byKey.has(characterAuraKey(hero))).toBe(false);

    const changed = resolveCharacterAuraTargets({
      listed,
      hero,
      heroAura: "sakura",
      othersById: {},
    });

    expect(changed.byCharacter.get(HERO_AURA_KEY)).toBe("sakura");
    expect(changed.byKey.get(characterAuraKey(hero))).toBe("sakura");
  });
});
