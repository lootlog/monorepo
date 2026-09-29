import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUsersControllerGetCurrentUserAccessibleGuilds,
  getUsersControllerGetUserFeedQueryOptions,
  getUsersControllerGetUserFeedQueryKey,
  type UserFeedResponseDtoOutput,
  type UsersControllerGetUserFeedParams,
} from "@lootlog/client/main";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import {
  initialLiveFeedState,
  liveFeedReducer,
  matchesFeedFilters,
  mergeFeedItems,
  type FeedFilters,
} from "./live-feed-state";

type FeedItem = UserFeedResponseDtoOutput["items"][number];

const feedParams = (
  filters: FeedFilters,
): UsersControllerGetUserFeedParams => ({
  ...(filters.excludedGuildIds.length > 0 && {
    excludedGuildIds: [...filters.excludedGuildIds],
  }),
  ...(filters.excludedNpcCategories.length > 0 && {
    excludedNpcCategories: [...filters.excludedNpcCategories],
  }),
  ...(filters.withLootOnly && { withLootOnly: true }),
});

type LiveFeedOptions = {
  filters: FeedFilters;
  paused: boolean;
  /** False until the stored filters and pause state are known. */
  ready: boolean;
};

export function useLiveFeed({ filters, paused, ready }: LiveFeedOptions) {
  const { socket, connected } = useGateway();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const hasNoGuilds = guilds?.length === 0;
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(liveFeedReducer, initialLiveFeedState);

  const getPaused = useEffectEvent(() => paused);
  const getFilters = useEffectEvent(() => filters);
  const filtersKey = JSON.stringify(filters);
  const appliedFiltersKey = useRef(filtersKey);

  const controlsRef = useRef<
    | {
        refresh: () => void;
        replace: () => void;
        setPaused: (value: boolean) => void;
      }
    | undefined
  >(undefined);

  // The callback-owned timer is replaced only after cancellation and cleared on cleanup.
  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- Cleanup also removes every socket listener and invalidates pending fetches.
  useEffect(() => {
    if (!ready) return;
    let generation = 0;
    let disposed = false;
    let isPaused = getPaused();
    let fetching = false;
    let revalidatingAccess = false;
    let permissionsChanged = false;
    let buffered: FeedItem[] = [];
    let accessRefreshTimer: ReturnType<typeof setTimeout> | undefined;
    const queryKey = getUsersControllerGetUserFeedQueryKey();

    const cancel = () => {
      generation += 1;
      fetching = false;
      void queryClient.cancelQueries({ queryKey });
    };

    const refresh = async (revalidateAccess = false) => {
      if (hasNoGuilds) {
        dispatch({ type: "clear" });

        return;
      }

      if (accessRefreshTimer !== undefined) return;
      revalidatingAccess ||= revalidateAccess;
      cancel();
      const requestedGeneration = generation;
      fetching = true;
      dispatch({ type: "refresh" });

      try {
        const data = await queryClient.fetchQuery({
          ...getUsersControllerGetUserFeedQueryOptions(
            feedParams(getFilters()),
          ),
          staleTime: 0,
          retry: false,
        });

        if (!disposed && requestedGeneration === generation) {
          dispatch({
            type: "received",
            items: data.items,
            liveItems: buffered,
            revalidatedAccess: revalidatingAccess,
          });
        }
      } catch {
        if (!disposed && requestedGeneration === generation) {
          if (permissionsChanged) dispatch({ type: "clear" });
          dispatch({ type: "failed" });

          if (!permissionsChanged)
            for (const item of buffered) dispatch({ type: "entry", item });
        }
      } finally {
        if (requestedGeneration === generation) {
          fetching = false;
          revalidatingAccess = false;
          permissionsChanged = false;
          buffered = [];
        }
      }
    };

    const handlePermissions = (payload?: {
      guilds: ReadonlyArray<{ guild: { id: string } }>;
    }) => {
      // Remove revoked organizations immediately; keep the remaining rows mounted.
      // Discard cached and pending data from the previous policy.
      cancel();
      queryClient.removeQueries({ queryKey });
      dispatch({
        type: "revalidate",
        organizationIds: new Set(
          payload?.guilds.map(({ guild }) => guild.id) ?? [],
        ),
      });
      buffered = [];
      permissionsChanged = true;
      revalidatingAccess = true;
      clearTimeout(accessRefreshTimer);
      // Permission notifications can arrive in bursts. Wait for them to
      // settle before fetching the replacement snapshot.
      accessRefreshTimer = setTimeout(() => {
        accessRefreshTimer = undefined;
        void refresh(true);
      }, 5000);
    };

    const handleJoin = (payload: {
      status: "success" | "error";
      recover: boolean;
    }) => {
      // A join right after the initial history fetch has nothing to catch up.
      if (payload.status !== "success" || !payload.recover) return;
      // Pausing live updates does not pause source-access revalidation.
      void refresh(true);
    };

    const onEntry = (item: FeedItem) => {
      if (isPaused || !matchesFeedFilters(item, getFilters())) return;

      if (accessRefreshTimer !== undefined) return;

      if (fetching) buffered = mergeFeedItems(buffered, [item], getFilters());
      else dispatch({ type: "entry", item });
    };

    controlsRef.current = {
      refresh: () => {
        if (!isPaused) void refresh();
      },
      // Filter changes are explicit, so they fetch even while paused.
      replace: () => void refresh(true),
      setPaused: (value) => {
        if (isPaused === value) return;
        isPaused = value;

        if (!value) void refresh();
        else if (!revalidatingAccess) cancel();
      },
    };
    socket.on(GatewayEvent.FEED_ENTRY, onEntry);
    socket.on(GatewayEvent.JOIN, handleJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissions);

    appliedFiltersKey.current = JSON.stringify(getFilters());
    dispatch({ type: "filters", filters: getFilters() });

    // History remains available when the realtime gateway cannot join.
    void refresh();

    return () => {
      disposed = true;
      clearTimeout(accessRefreshTimer);
      cancel();
      controlsRef.current = undefined;
      socket.off(GatewayEvent.FEED_ENTRY, onEntry);
      socket.off(GatewayEvent.JOIN, handleJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissions);
    };
  }, [socket, queryClient, hasNoGuilds, ready]);
  useEffect(() => {
    controlsRef.current?.setPaused(paused);
  }, [paused]);
  useEffect(() => {
    if (appliedFiltersKey.current === filtersKey) return;
    appliedFiltersKey.current = filtersKey;
    dispatch({ type: "filters", filters: getFilters() });
    // A new filter replaces the list even while the reader is scrolled.
    controlsRef.current?.replace();
  }, [filtersKey]);

  return {
    state: { ...state, isFetching: !paused && state.isFetching },
    connected,
    setAtTop: (atTop: boolean) => dispatch({ type: "position", atTop }),
    applyPending: () => dispatch({ type: "apply" }),
    refresh: () => controlsRef.current?.refresh(),
  };
}
