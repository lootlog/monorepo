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
import { useGlobalContext } from "@/contexts/global-context";
import { socket } from "@/lib/gateway-client";

export type GatewayProviderValue = {
  connected: boolean;
  socket: Socket;
};

type Props = {
  children: React.ReactNode;
};

export const GatewayProvider: React.FC<Props> = (props) => {
  const { data: token } = useAuthToken();
  const { initialized } = useGlobalContext();
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
  }, [token, guildIds, initialized]);

  useEffect(() => {
    console.log("Connected to gateway: ", connected);
  }, [connected]);

  useEffect(() => {
    if (initialized && token && !connected && guildIds) {
      setupBaseListeners();
    }
  }, [initialized, token, connected, guildIds]);

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
