import { useEffect, useEffectEvent, useRef } from "react";
import { useSocket } from "@/contexts/socket-context";

export const useReconnectCatchUp = (catchUp: () => void) => {
  const { socket, connected, joined, status } = useSocket();
  const needsCatchUp = useRef(false);
  const runCatchUp = useEffectEvent(catchUp);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- replays missed realtime state after the gateway session rejoins
  useEffect(() => {
    if (status === "unreachable") needsCatchUp.current = true;

    if (!connected || !joined || !socket) return;

    if (needsCatchUp.current) runCatchUp();
    needsCatchUp.current = true;
  }, [connected, joined, socket, status]);
};
