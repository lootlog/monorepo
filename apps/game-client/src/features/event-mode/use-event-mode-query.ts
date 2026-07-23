import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import { eventModeControllerGetEventMode } from "@/lib/api/generated/main/event-mode/event-mode";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const EVENT_MODE_REFETCH_INTERVAL_MS = 15_000;

interface EventModeQueryIdentity {
  authenticatedLootlogUserId: string;
  margonemAccountId: string;
  normalizedWorld: string;
}

type UseEventModeQueryOptions = {
  active: boolean;
};

export const createEventModeQueryKey = (identity: EventModeQueryIdentity) =>
  [
    "event-mode",
    identity.authenticatedLootlogUserId,
    identity.margonemAccountId,
    identity.normalizedWorld,
  ] as const;

export const useEventModeQuery = ({ active }: UseEventModeQueryOptions) => {
  const queryClient = useQueryClient();
  const { connected } = useSocket();
  const { data: sessionData } = useSession();
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const authenticatedLootlogUserId = sessionData?.user?.id ?? "";
  const runtimeGame = useGameStore((state) => state.game);
  const margonemAccountId = gameInitialized
    ? (runtimeGame?.hero.accountId ?? "")
    : "";
  const normalizedWorld = gameInitialized
    ? (runtimeGame?.world.trim().toLowerCase() ?? "")
    : "";
  const enabled = Boolean(
    active &&
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
    queryFn: async () => {
      const response = await eventModeControllerGetEventMode({
        world: normalizedWorld,
      });

      return { events: response.events };
    },
    enabled,
    notifyOnChangeProps: ["data", "isError"],
    refetchInterval: enabled ? EVENT_MODE_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: enabled ? "always" : false,
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
    data: query.data,
    dataUpdatedAt: query.dataUpdatedAt,
    isError: query.isError,
    authenticatedLootlogUserId,
    margonemAccountId,
    normalizedWorld,
    enabled,
    queryKey,
  };
};
