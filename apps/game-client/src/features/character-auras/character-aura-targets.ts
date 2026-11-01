import type { CharacterAuraResponseDto } from "@lootlog/client/main";
import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { HERO_AURA_KEY } from "./character-aura-renderer";

export type CharacterAuraTargets = {
  /** Auras by the Margonem account a character tip belongs to. */
  byAccount: ReadonlyMap<string, CharacterAuraId>;
  /** Auras to draw, by `HERO_AURA_KEY` or the other's character id. */
  byCharacter: ReadonlyMap<string, CharacterAuraId>;
};

/**
 * Which characters on the map wear which aura. The hero follows the User's
 * own choice at once instead of the listed one, which trails it by up to a
 * refresh.
 */
export function resolveCharacterAuraTargets({
  listed,
  heroAccountId,
  heroAura,
  othersById,
}: {
  listed: readonly CharacterAuraResponseDto[];
  heroAccountId: string | undefined;
  heroAura: CharacterAuraId | null;
  othersById: Readonly<Record<string, RuntimeOther>>;
}): CharacterAuraTargets {
  const byAccount = new Map(
    listed.map(({ gameAccountId, auraId }) => [gameAccountId, auraId]),
  );

  if (heroAccountId) {
    if (heroAura) byAccount.set(heroAccountId, heroAura);
    else byAccount.delete(heroAccountId);
  }

  const byCharacter = new Map<string, CharacterAuraId>();

  if (heroAura) byCharacter.set(HERO_AURA_KEY, heroAura);

  for (const other of Object.values(othersById)) {
    const auraId = byAccount.get(other.accountId);

    if (auraId) byCharacter.set(other.characterId, auraId);
  }

  return { byAccount, byCharacter };
}
