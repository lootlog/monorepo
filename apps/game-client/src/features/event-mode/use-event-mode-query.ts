import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import { eventModeControllerGetEventMode } from "@/lib/api/generated/main/event-mode/event-mode";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const EVENT_MODE_REFETCH_INTERVAL_MS = 15_000;

interface EventModeQueryIdentity {
  authenticatedLootlogUserId: string;
  margonemAccountId: string;
  normalizedWorld: string;
}

export const createEventModeQueryKey = (identity: EventModeQueryIdentity) =>
  [
    "event-mode",
    identity.authenticatedLootlogUserId,
    identity.margonemAccountId,
    identity.normalizedWorld,
  ] as const;

export const useEventModeQuery = () => {
  const queryClient = useQueryClient();
  const { connected } = useSocket();
  const { data: sessionData } = useSession();
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const authenticatedLootlogUserId = sessionData?.user?.id ?? "";
  const margonemAccountId = gameInitialized ? (Game.getAccountId() ?? "") : "";
  const normalizedWorld = gameInitialized
    ? Game.getWorldName().trim().toLowerCase()
    : "";
  const enabled = Boolean(
    authenticatedLootlogUserId &&
    margonemAccountId &&
    normalizedWorld &&
    normalizedWorld !== "unknown",
  );
  const queryKey = createEventModeQueryKey({
    authenticatedLootlogUserId,
    margonemAccountId,
    normalizedWorld,
  });
  const query = useQuery({
    queryKey,
    queryFn: () => eventModeControllerGetEventMode({ world: normalizedWorld }),
    enabled,
    refetchInterval: enabled ? EVENT_MODE_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: "always",
  });
  const disconnectedSinceMountRef = useRef(false);

  useEffect(() => {
    if (!connected) {
      disconnectedSinceMountRef.current = true;
      return;
    }

    if (!enabled || !disconnectedSinceMountRef.current) {
      return;
    }

    disconnectedSinceMountRef.current = false;
    void queryClient.invalidateQueries({ queryKey, exact: true });
  }, [connected, enabled, queryClient, queryKey]);

  return {
    ...query,
    authenticatedLootlogUserId,
    margonemAccountId,
    normalizedWorld,
    enabled,
    queryKey,
  };
};
