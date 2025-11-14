import React, { createContext, useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { GatewayEvent } from "@/config/gateway";
import { socket } from "@/lib/gateway-client";
import { useGlobalStore } from "@/store/global.store";
import { Game } from "@/lib/game";
import { useDeepCompareEffect } from "react-use";

export type GatewayProviderValue = {
  connected: boolean;
  joined: boolean;
  socket: Socket;
  joinedGuilds: string[];
};

type Props = {
  children: React.ReactNode;
};

export const GatewayContext = createContext<GatewayProviderValue | undefined>(
  undefined,
);
GatewayContext.displayName = "GatewayContext";

export const GatewayProvider: React.FC<Props> = ({ children }) => {
  const { gameInitialized } = useGlobalStore((s) => s.gameState);

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinedGuilds, setJoinedGuilds] = useState<string[]>([]);

  const emitJoin = useCallback(() => {
    if (connected && gameInitialized) {
      const world = Game.getWorldName();
      const characterId = String(Game.hero.id);
      const accountId = String(Game.hero.account);

      socket.emit(GatewayEvent.JOIN, {
        data: {
          world,
          name: Game.hero.nick,
          lvl: Game.hero.lvl,
          icon: Game.hero.img,
          prof: Game.hero.prof,
          characterId,
          accountId,
          location: {
            x: Game.hero.x,
            y: Game.hero.y,
            map: Game.map.name,
          },
        },
      });
    }
  }, [connected, gameInitialized]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log("[Gateway] Disconnected from gateway");
      setConnected(false);
      setJoined(false);
      setJoinedGuilds([]);
    };

    const onPermissionsUpdated = (data: {
      guilds?: Array<{ guild: { id: string } }>;
    }) => {
      console.log("[Gateway] Rooms rebalanced:", data);

      if (!data.guilds) {
        console.error("[Gateway] No guilds data in permissions update");
        setJoinedGuilds([]);
        setJoined(false);
        return;
      }

      setJoinedGuilds(data.guilds.map((g) => g.guild.id) || []);
    };

    const onJoin = (data: {
      status?: string;
      message?: string;
      guildIds?: string[];
    }) => {
      if (data.status === "error") {
        console.error("[Gateway] Join error:", data.message);
        return;
      }

      console.log("[Gateway] Joined successfully:", data.guildIds);

      setJoined(true);
      setJoinedGuilds(data.guildIds || []);
    };

    socket.on(GatewayEvent.CONNECT, onConnect);
    socket.on(GatewayEvent.DISCONNECT, onDisconnect);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, onPermissionsUpdated);
    socket.on(GatewayEvent.JOIN, onJoin);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off(GatewayEvent.CONNECT, onConnect);
      socket.off(GatewayEvent.DISCONNECT, onDisconnect);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, onPermissionsUpdated);
      socket.off(GatewayEvent.JOIN, onJoin);
    };
  }, []);

  useEffect(() => {
    if (connected && !joined) {
      emitJoin();
      console.log("[Gateway] Connected to gateway:", connected);
    }
  }, [connected, emitJoin, joined]);

  useDeepCompareEffect(() => {
    if (joined) {
      console.log("[Gateway] Joined gateway with guilds:", joinedGuilds);
    }
  }, [joined, joinedGuilds]);

  const value: GatewayProviderValue = {
    connected,
    socket,
    joined,
    joinedGuilds,
  };

  return (
    <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>
  );
};
