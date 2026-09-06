import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useQueryClient } from "@tanstack/react-query";
import {
  getUsersControllerGetUserFeedQueryOptions,
  getUsersControllerGetUserFeedQueryKey,
  type UserFeedResponseDtoOutput,
} from "@lootlog/client/main";
import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import {
  initialLiveFeedState,
  liveFeedReducer,
  mergeFeedItems,
} from "./live-feed-state";

type FeedItem = UserFeedResponseDtoOutput["items"][number];
export function useLiveFeed() {
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(liveFeedReducer, initialLiveFeedState);
  const [paused, setStoredPaused] = useLocalStorage(
    "lootlog:dashboard:feed-paused",
    false,
  );
  const getPaused = useEffectEvent(() => paused);
  const controlsRef = useRef<
    { refresh: () => void; setPaused: (value: boolean) => void } | undefined
  >(undefined);
  useEffect(() => {
    let generation = 0;
    let disposed = false;
    let isPaused = getPaused();
    let fetching = false;
    let buffered: FeedItem[] = [];
    const queryKey = getUsersControllerGetUserFeedQueryKey();
    const cancel = () => {
      generation += 1;
      fetching = false;
      buffered = [];
      void queryClient.cancelQueries({ queryKey });
    };
    const refresh = async () => {
      cancel();
      const requestedGeneration = generation;
      fetching = true;
      dispatch({ type: "refresh" });
      try {
        const data = await queryClient.fetchQuery({
          ...getUsersControllerGetUserFeedQueryOptions(),
          staleTime: 0,
          retry: false,
        });
        if (!disposed && requestedGeneration === generation) {
          dispatch({
            type: "received",
            items: mergeFeedItems(data.items, buffered),
          });
        }
      } catch {
        if (!disposed && requestedGeneration === generation) {
          dispatch({ type: "failed" });
          for (const item of buffered) dispatch({ type: "entry", item });
        }
      } finally {
        if (requestedGeneration === generation) {
          fetching = false;
          buffered = [];
        }
      }
    };
    const clear = () => {
      cancel();
      dispatch({ type: "clear" });
      queryClient.removeQueries({ queryKey });
    };
    const handlePermissions = () => {
      clear();
      if (!isPaused) void refresh();
    };
    const onEntry = (item: FeedItem) => {
      if (isPaused) return;
      if (fetching) buffered = mergeFeedItems(buffered, [item]);
      else dispatch({ type: "entry", item });
    };
    controlsRef.current = {
      refresh: () => {
        if (!isPaused) void refresh();
      },
      setPaused: (value) => {
        if (isPaused === value) return;
        isPaused = value;
        if (value) cancel();
        else void refresh();
      },
    };
    socket.on(GatewayEvent.FEED_ENTRY, onEntry);
    socket.on(GatewayEvent.CONNECT, handlePermissions);
    socket.on(GatewayEvent.JOIN, handlePermissions);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissions);
    void refresh();
    return () => {
      disposed = true;
      cancel();
      controlsRef.current = undefined;
      socket.off(GatewayEvent.FEED_ENTRY, onEntry);
      socket.off(GatewayEvent.CONNECT, handlePermissions);
      socket.off(GatewayEvent.JOIN, handlePermissions);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissions);
    };
  }, [socket, queryClient]);
  useEffect(() => {
    controlsRef.current?.setPaused(paused);
  }, [paused]);
  const setPaused = (value: boolean) => {
    controlsRef.current?.setPaused(value);
    setStoredPaused(value);
  };
  return {
    state: { ...state, isFetching: !paused && state.isFetching },
    paused,
    connected,
    setPaused,
    setAtTop: (atTop: boolean) => dispatch({ type: "position", atTop }),
    applyPending: () => dispatch({ type: "apply" }),
    refresh: () => controlsRef.current?.refresh(),
  };
}
