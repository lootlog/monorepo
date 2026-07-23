import { useGameStore } from "@/store/game.store";
import type { ReadyRoomCharacterIdentity } from "@/store/party-finder.store";

export function getCurrentReadyRoomCharacterIdentity(): ReadyRoomCharacterIdentity | null {
  const hero = useGameStore.getState().game?.hero;
  if (!hero) {
    return null;
  }

  return {
    accountId: hero.accountId,
    characterId: hero.characterId,
  };
}
