import { useMemo, useCallback } from "react";
import { ChatEventMsg } from "@/types/margonem/game-events/chat";

export const useValidationHelpers = (
  world?: string,
  characterId?: string,
  accountId?: string
) => {
  const isValidGameState = useMemo(
    () => Boolean(world && characterId && accountId),
    [world, characterId, accountId]
  );

  const isLootDistributionMessage = useCallback(
    (msgData: ChatEventMsg) => msgData.msg?.includes("Podział"),
    []
  );

  return {
    isValidGameState,
    isLootDistributionMessage,
  };
};
