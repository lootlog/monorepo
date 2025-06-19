import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useEffect, useRef, useState } from "react";

type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

export type PlayerPresence = {
  discordId: string;
  sessionId: string;
  platform: "game" | "web-app";
  status: "online" | "offline";
  guildId: string;
  player?: {
    world: string;
    name: string;
    lvl: number;
    icon: string;
    characterId: string;
    accountId: string;
    prof: string;
    location: {
      x: number;
      y: number;
      map: string;
    };
  };
};

const getPresenceKey = (presence: PlayerPresence) => {
  if (!presence.player) return "web-app";
  return `${presence.player.accountId}-${presence.player.characterId}`;
};

export const usePlayersPresence = (
  selectedGuildId?: string
): [
  PlayerPresenceResponse,
  boolean,
  React.Dispatch<React.SetStateAction<PlayerPresenceResponse>>,
] => {
  const { world } = useGlobalStore((state) => state.gameState);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const { socket, joined } = useGateway();

  const selectedGuildIdRef = useRef(selectedGuildId);
  const requestIdRef = useRef(0);

  useEffect(() => {
    selectedGuildIdRef.current = selectedGuildId;
  }, [selectedGuildId]);

  useEffect(() => {
    if (!joined || !socket || !selectedGuildIdRef.current || !world) return;

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    socket
      .emitWithAck(GatewayEvent.REQUEST_SERVER_PRESENCE, {
        guildId: selectedGuildIdRef.current,
        world,
      })
      .then((data) => {
        // ignore stale responses
        if (requestIdRef.current !== currentRequestId) return;

        if (data) {
          setOnlinePlayers(data);
        }
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      });
  }, [joined, socket, world, selectedGuildId]);

  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (data: PlayerPresence) => {
      if (
        data.guildId !== selectedGuildIdRef.current ||
        data.player?.world !== world
      )
        return;

      setOnlinePlayers((prev) => {
        const updated = structuredClone(prev);
        const key = getPresenceKey(data);
        const list = updated[data.discordId] || [];

        if (data.status === "offline") {
          const newList = list.filter((p) => getPresenceKey(p) !== key);
          if (newList.length > 0) {
            updated[data.discordId] = newList;
          } else {
            delete updated[data.discordId];
          }
        } else if (data.status === "online") {
          const exists = list.some((p) => getPresenceKey(p) === key);
          if (!exists) {
            updated[data.discordId] = [...list, data];
          }
        }

        return updated;
      });
    };

    socket.on(GatewayEvent.UPDATE_SERVER_PRESENCE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.UPDATE_SERVER_PRESENCE, handlePresenceUpdate);
    };
  }, [socket, world]);

  return [onlinePlayers, loading, setOnlinePlayers];
};
