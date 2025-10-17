import React, { createContext, useCallback, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { GatewayEvent } from "@/config/gateway";
import { socket } from "@/lib/gateway-client";
import { useGuilds } from "@/hooks/api/guilds/use-guilds";
import { useUser } from "@/hooks/api/user/use-user";

export type GatewayProviderValue = {
  connected: boolean;
  joined: boolean;
  socket: Socket;
};

type Props = {
  children: React.ReactNode;
};

export const GatewayContext = createContext<GatewayProviderValue | undefined>(
  undefined
);
GatewayContext.displayName = "GatewayContext";

export const GatewayProvider: React.FC<Props> = ({ children }) => {
  const { user } = useUser();
  const { data: guilds } = useGuilds();
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);

  const setupBaseListeners = useCallback(() => {
    socket.on(GatewayEvent.CONNECT, () => {
      console.log("[Gateway] Connected");
      setConnected(true);
    });

    socket.on(GatewayEvent.DISCONNECT, () => {
      console.log("[Gateway] Disconnected");
      setConnected(false);
      setJoined(false);
    });

    socket.on(GatewayEvent.JOIN, (data) => {
      if (data.status === "error") {
        console.error("[Gateway] Join error:", data.message);
        return;
      }

      console.log("[Gateway] Joined guild rooms");
      setJoined(true);
    });

    return () => {
      socket.off(GatewayEvent.CONNECT);
      socket.off(GatewayEvent.DISCONNECT);
      socket.off(GatewayEvent.JOIN);
    };
  }, []);

  const emitJoin = useCallback(() => {
    if (connected && user && guilds) {
      const guildIds = guilds.map((g) => g.id);

      socket.emit(GatewayEvent.JOIN, {
        data: {
          discordId: user.discordId,
          guildIds,
        },
      });
    }
  }, [connected, user, guilds]);

  useEffect(() => {
    const cleanup = setupBaseListeners();

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      cleanup();
    };
  }, [setupBaseListeners]);

  useEffect(() => {
    if (connected && user && guilds && !joined) {
      emitJoin();
    }
  }, [connected, user, guilds, joined, emitJoin]);

  const value: GatewayProviderValue = {
    connected,
    socket,
    joined,
  };

  return (
    <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>
  );
};
