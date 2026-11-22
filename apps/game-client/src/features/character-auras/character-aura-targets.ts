import type {
  CharacterAuraResponseDto,
  OwnCharacterAuraResponseDto,
} from "@lootlog/client/main";
import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { HERO_AURA_KEY } from "./character-aura-renderer";

export type AuraCharacter = { accountId: string; characterId: string };

export const characterAuraKey = ({ accountId, characterId }: AuraCharacter) =>
  `${accountId}:${characterId}`;

export function ownAuraOf(
  own: OwnCharacterAuraResponseDto | undefined,
  character: AuraCharacter | undefined,
): CharacterAuraId | null {
  if (!own || !character) return null;
  const key = characterAuraKey(character);

  return (
    own.auras.find(
      ({ gameAccountId, characterId }) =>
        characterAuraKey({ accountId: gameAccountId, characterId }) === key,
    )?.auraId ?? null
  );
}

export type CharacterAuraTargets = {
  byKey: ReadonlyMap<string, CharacterAuraId>;
  byCharacter: ReadonlyMap<string, CharacterAuraId>;
};

export function resolveCharacterAuraTargets({
  listed,
  hero,
  heroAura,
  othersById,
}: {
  listed: readonly CharacterAuraResponseDto[];
  hero: AuraCharacter | undefined;
  heroAura: CharacterAuraId | null;
  othersById: Readonly<Record<string, RuntimeOther>>;
}): CharacterAuraTargets {
  const byKey = new Map(
    listed.map(({ gameAccountId, characterId, auraId }) => [
      characterAuraKey({ accountId: gameAccountId, characterId }),
      auraId,
    ]),
  );

  if (hero) {
    if (heroAura) byKey.set(characterAuraKey(hero), heroAura);
    else byKey.delete(characterAuraKey(hero));
  }

  const byCharacter = new Map<string, CharacterAuraId>();

  if (heroAura) byCharacter.set(HERO_AURA_KEY, heroAura);

  for (const other of Object.values(othersById)) {
    const auraId = byKey.get(characterAuraKey(other));

    if (auraId) byCharacter.set(other.characterId, auraId);
  }

  return { byKey, byCharacter };
}
