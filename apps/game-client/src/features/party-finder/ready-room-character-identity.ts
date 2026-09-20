import { useGameStore } from "@/store/game.store";
import type { ReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-cache";

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
