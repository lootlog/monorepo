import { useGlobalChatControllerGetWorlds } from "@lootlog/client/main";
import { useGlobalChatStore } from "@/store/global-chat.store";
import { resolveGlobalChatChannel } from "../global-chat.helpers";

const WORLDS_STALE_TIME_MS = 60 * 60_000;

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
