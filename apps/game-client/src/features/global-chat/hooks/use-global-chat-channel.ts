import { useGlobalChatControllerGetWorlds } from "@lootlog/client/main";
import { useGlobalChatStore } from "@/store/global-chat.store";
import { resolveGlobalChatChannel } from "../global-chat.helpers";

/** Worlds gain a channel when an Organization first records a timer there. */
const WORLDS_STALE_TIME_MS = 60 * 60_000;

/**
 * The channel the global chat shows and follows. The window loads the world
 * list and waits for it (`channel` is undefined until then); the background
 * follower never requests it, so starting the game costs no request, and it
 * moves to the window's channel once the window has loaded the list.
 */
export const useGlobalChatChannel = ({
  loadWorlds,
}: {
  loadWorlds: boolean;
}) => {
  const worldsQuery = useGlobalChatControllerGetWorlds({
    query: { enabled: loadWorlds, staleTime: WORLDS_STALE_TIME_MS },
  });

  const selected = useGlobalChatStore((state) => state.selectedChannel);
  const worlds = worldsQuery.data?.worlds;

  return {
    channel:
      worlds || !loadWorlds
        ? resolveGlobalChatChannel(selected, worlds)
        : undefined,
    worlds,
    worldsQuery,
  };
};
