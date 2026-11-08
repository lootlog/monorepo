import type { CharacterAurasResponseDto } from "@lootlog/client/main";
import {
  CharacterAuraIdSchema,
  type CharacterAurasChanged,
} from "@lootlog/schema/character-aura";
import { Schema } from "effect";

const isCharacterAuraId = Schema.is(CharacterAuraIdSchema);

/**
 * The listed auras after a live change. Each change carries the accounts'
 * current auras, so applying it twice changes nothing. An aura this client
 * cannot draw reads as none, as in the list. Without a list there is nothing
 * to patch: the first fetch brings the current one.
 */
export function applyCharacterAuraChanges(
  list: CharacterAurasResponseDto | undefined,
  change: CharacterAurasChanged,
): CharacterAurasResponseDto | undefined {
  if (!list) return list;

  const byAccount = new Map(
    list.auras.map(({ gameAccountId, auraId }) => [gameAccountId, auraId]),
  );

  for (const { gameAccountId, auraId } of change.auras) {
    if (isCharacterAuraId(auraId)) byAccount.set(gameAccountId, auraId);
    else byAccount.delete(gameAccountId);
  }

  return {
    auras: Array.from(byAccount, ([gameAccountId, auraId]) => ({
      gameAccountId,
      auraId,
    })),
  };
}
