import { Game } from "@/lib/game";
import type { ReadyRoomCharacterIdentity } from "@/store/party-finder.store";

export function getCurrentReadyRoomCharacterIdentity(): ReadyRoomCharacterIdentity | null {
  const accountId = Game.getAccountId();
  const characterId = Game.hero?.id;
  if (!accountId || characterId === undefined || characterId === null) {
    return null;
  }

  return { accountId, characterId: String(characterId) };
}
