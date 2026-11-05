import { useSocket } from "@/contexts/socket-context";

/** The socket while it can relay loot split choices: connected and joined. */
export const useLootSplitSocket = () => {
  const { socket, connected, joined } = useSocket();

  return socket && connected && joined ? socket : null;
};
