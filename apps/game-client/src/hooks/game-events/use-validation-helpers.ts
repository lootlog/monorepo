import { useMemo, useCallback } from "react";

export const useValidationHelpers = (world?: string, characterId?: string, accountId?: string) => {
  const isValidGameState = useMemo(
    () => Boolean(world && characterId && accountId),
    [world, characterId, accountId]
  );

  const isLootDistributionMessage = useCallback(
    (msgData: any) => msgData.msg?.includes("Podział"),
    []
  );

  return {
    isValidGameState,
    isLootDistributionMessage,
  };
};