import React, {
  createContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import { GatewayEvent } from "@/config/gateway";
import { socket } from "@/lib/gateway-client";
import { useUser } from "@/hooks/api/user/use-user";
import { useGuildsControllerGetUserGuilds } from "@/lib/api/generated/main/guilds/guilds";

export type GatewayProviderValue = {
  connected: boolean;
  joined: boolean;
  socket: Socket;
};

type GatewayJoinPayload = {
  status: "error" | "success";
};

type Props = {
  children: React.ReactNode;
};

export const GatewayContext = createContext<GatewayProviderValue | undefined>(
  undefined,
);
GatewayContext.displayName = "GatewayContext";

export const GatewayProvider: React.FC<Props> = ({ children }) => {
  const { user } = useUser();
  const { data: guilds } = useGuildsControllerGetUserGuilds();
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);

  const handleConnect = useEffectEvent(() => {
    setConnected(true);
  });
  const handleDisconnect = useEffectEvent(() => {
    setConnected(false);
    setJoined(false);
  });
  const handleJoin = useEffectEvent((data: GatewayJoinPayload) => {
    if (data.status === "error") {
      return;
    }

    setJoined(true);
  });
  const emitJoin = useEffectEvent(() => {
    if (connected && user && guilds) {
      socket.emit(GatewayEvent.JOIN, {});
    }
  });

  useEffect(() => {
    socket.on(GatewayEvent.CONNECT, handleConnect);
    socket.on(GatewayEvent.DISCONNECT, handleDisconnect);
    socket.on(GatewayEvent.JOIN, handleJoin);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off(GatewayEvent.CONNECT, handleConnect);
      socket.off(GatewayEvent.DISCONNECT, handleDisconnect);
      socket.off(GatewayEvent.JOIN, handleJoin);
    };
  }, []);

  useEffect(() => {
    if (connected && user && guilds && !joined) {
      emitJoin();
    }
  }, [connected, user, guilds, joined]);

  const value: GatewayProviderValue = {
    connected,
    socket,
    joined,
  };

  return (
    <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>
  );
};
