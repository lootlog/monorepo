import { useGateway } from "@/hooks/gateway/use-gateway";
import { useEffect, useState } from "react";

type PlayerPresenceResponse = Record<string, PlayerPresence[]>;

export type PlayerPresence = {
  discordId: string;
  sessionId: string;
  platform: "game" | "web-app";
  status: "online" | "offline";
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

export const usePlayersPresence = (selectedGuildId?: string) => {
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {}
  );
  const { socket, joined } = useGateway();

  console.log("Online Players:", onlinePlayers);

  useEffect(() => {
    if (joined && socket && selectedGuildId) {
      socket
        .emitWithAck("request-server-presence", { guildId: selectedGuildId })
        .then((data) => {
          if (data) {
            setOnlinePlayers(data);
          }
        });

      socket.on("update-server-presence", (data: PlayerPresence) => {
        console.log("Received server presence update:", data);
        if (data && data.status === "offline") {
          setOnlinePlayers((prev) => {
            const updatedPlayers = { ...prev };
            const updatedPlayerList = updatedPlayers[data.discordId]?.filter(
              (presence) => presence.sessionId !== data.sessionId
            );
            if (updatedPlayerList && updatedPlayerList.length > 0) {
              updatedPlayers[data.discordId] = updatedPlayerList;
            } else {
              delete updatedPlayers[data.discordId];
            }

            return updatedPlayers;
          });
        }
        // if (data) {
        //   setOnlinePlayers((prev) => ({
        //     ...prev,
        //     ...data,
        //   }));
        // }
      });
    }
  }, [joined, socket, selectedGuildId]);

  return [onlinePlayers, setOnlinePlayers];
};
