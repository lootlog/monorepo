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

  return `${presence.player?.accountId}-${presence.player?.characterId}`;
};

export const usePlayersPresence = (selectedGuildId?: string) => {
  const { world } = useGlobalStore((state) => state.gameState);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {}
  );
  const { socket, joined } = useGateway();
  const selectedGuildIdRef = useRef(selectedGuildId);

  selectedGuildIdRef.current = selectedGuildId;

  useEffect(() => {
    if (joined && socket && selectedGuildIdRef.current && world) {
      socket
        .emitWithAck(GatewayEvent.REQUEST_SERVER_PRESENCE, {
          guildId: selectedGuildIdRef.current,
          world,
        })
        .then((data) => {
          if (data) {
            setOnlinePlayers(data);
          }
        });

      socket.on(GatewayEvent.UPDATE_SERVER_PRESENCE, (data: PlayerPresence) => {
        if (
          data.guildId !== selectedGuildIdRef.current ||
          data.player?.world !== world
        )
          return;

        if (data && data.status === "offline") {
          setOnlinePlayers((prev) => {
            const updatedPlayers = { ...prev };
            const updatedPlayerList = updatedPlayers[data.discordId]?.filter(
              (presence) => {
                const key = getPresenceKey(presence);
                const updatedKey = getPresenceKey(data);

                return key !== updatedKey;
              }
            );
            if (updatedPlayerList && updatedPlayerList.length > 0) {
              updatedPlayers[data.discordId] = updatedPlayerList;
            } else {
              delete updatedPlayers[data.discordId];
            }

            return updatedPlayers;
          });
        }

        if (data && data.status === "online") {
          setOnlinePlayers((prev) => {
            const updatedPlayers = { ...prev };

            if (!updatedPlayers[data.discordId]) {
              updatedPlayers[data.discordId] = [];
            }

            const key = getPresenceKey(data);
            const existingIndex = updatedPlayers[data.discordId].findIndex(
              (presence) => {
                const existingKey = getPresenceKey(presence);
                return existingKey === key;
              }
            );
            if (existingIndex === -1) {
              updatedPlayers[data.discordId].push(data);
              return updatedPlayers;
            }

            return updatedPlayers;
          });
        }
      });
    }
  }, [joined, socket, world]);

  return [onlinePlayers, setOnlinePlayers];
};
