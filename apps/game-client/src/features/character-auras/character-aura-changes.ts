import type { CharacterAurasResponseDto } from "@lootlog/client/main";
import {
  CharacterAuraIdSchema,
  type CharacterAurasChanged,
} from "@lootlog/schema/character-aura";
import { Schema } from "effect";
import { characterAuraKey } from "./character-aura-targets";

const isCharacterAuraId = Schema.is(CharacterAuraIdSchema);

/**
 * The listed auras after a live change. Each change carries the characters'
 * current auras, so applying it twice changes nothing. An aura this client
 * cannot draw reads as none, as in the list. Without a list there is nothing
 * to patch: the first fetch brings the current one.
 */
export function applyCharacterAuraChanges(
  list: CharacterAurasResponseDto | undefined,
  change: CharacterAurasChanged,
): CharacterAurasResponseDto | undefined {
  if (!list) return list;

  const key = (aura: { gameAccountId: string; characterId: string }) =>
    characterAuraKey({
      accountId: aura.gameAccountId,
      characterId: aura.characterId,
    });

  const byKey = new Map(list.auras.map((aura) => [key(aura), aura]));

  for (const { gameAccountId, characterId, auraId } of change.auras) {
    const changed = { gameAccountId, characterId };

    if (isCharacterAuraId(auraId))
      byKey.set(key(changed), { ...changed, auraId });
    else byKey.delete(key(changed));
  }

  return { auras: [...byKey.values()] };
}
