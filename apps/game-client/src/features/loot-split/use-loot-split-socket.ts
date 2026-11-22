import { useSocket } from "@/contexts/socket-context";

export const useLootSplitSocket = () => {
  const { socket, connected, joined } = useSocket();

  return socket && connected && joined ? socket : null;
};
