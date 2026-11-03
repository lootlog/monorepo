import { useSocket } from "@/contexts/socket-context";

/**
 * The socket while it can relay loot split choices: joined to a gateway that
 * accepts `loot-split.send`. Older gateways close the socket on it.
 */
export const useLootSplitSocket = () => {
  const { socket, connected, joined } = useSocket();

  return socket && connected && joined && socket.supportsLootSplit()
    ? socket
    : null;
};
