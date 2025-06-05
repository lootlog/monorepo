import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Socket } from "socket.io-client";
import { GatewayEvent } from "@/config/gateway";
import { useAuthToken } from "@/hooks/auth/use-auth-token";
import { useGuilds } from "@/hooks/api/use-guilds";
import { socket } from "@/lib/gateway-client";
import { useGlobalStore } from "@/store/global.store";

export type GatewayProviderValue = {
  connected: boolean;
  socket: Socket;
};

type Props = {
  children: React.ReactNode;
};

export const GatewayProvider: React.FC<Props> = (props) => {
  const { data: token } = useAuthToken();
  const { gameInitialized } = useGlobalStore((state) => state.gameState);
  const { data: guilds } = useGuilds();

  const [connected, setConnected] = useState(false);
  const guildIds = useMemo(
    () => (guilds ? guilds?.map((server) => server.id) : null),
    [guilds]
  );

  const setupBaseListeners = useCallback(async () => {
    socket.on(GatewayEvent.DISCONNECT, () => {
      setConnected(false);
    });

    await socket.emitWithAck(GatewayEvent.INIT, { token });

    socket.emit(GatewayEvent.JOIN, {
      name: "twoj stary",
      source: "game",
      guildIds,
    });
    setConnected(true);
  }, [token, guildIds, gameInitialized]);

  useEffect(() => {
    console.log("Connected to gateway: ", connected);
  }, [connected]);

  useEffect(() => {
    if (gameInitialized && token && !connected && guildIds) {
      setupBaseListeners();
    }
  }, [gameInitialized, token, connected, guildIds]);

  const value: GatewayProviderValue = {
    socket,
    connected,
  };

  return (
    <GatewayContext.Provider value={value} {...props}>
      {props.children}
    </GatewayContext.Provider>
  );
};

export const GatewayContext = createContext<GatewayProviderValue>(
  {} as GatewayProviderValue
);
GatewayContext.displayName = "GatewayContext";
