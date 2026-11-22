import { getApiErrorStatus } from "@lootlog/client/transport";
import { useEffect, useEffectEvent } from "react";

export const useResetRejectedBattlePanelCursor = ({
  cursor,
  error,
  reset,
}: {
  cursor: string | null | undefined;
  error: unknown;
  reset: () => void;
}) => {
  const rejected = !!cursor && getApiErrorStatus(error) === 400;
  const resetRejectedCursor = useEffectEvent(reset);

  useEffect(() => {
    if (rejected) resetRejectedCursor();
  }, [rejected]);
};
