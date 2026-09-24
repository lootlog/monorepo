/* eslint-disable react-doctor/context-provider-value-from-unmemoized-local-literal -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { GatewayContext, type GatewayProviderValue } from "./gateway-context";
import React, {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";
import { useTimersSocket } from "@/features/guild/timers/use-timers-socket";
import { useKillStatsUpdates } from "@/hooks/utils/use-kill-stats-updates";
import { GatewayEvent } from "@/config/gateway";
import { socket } from "@/lib/gateway-client";
import { useUser } from "@/hooks/api/user/use-user";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { LootUnreadProvider } from "./loot-unread-provider";

type GatewayJoinPayload = {
  status: "error" | "success";
};

type Props = {
  children: React.ReactNode;
};

const subscribeConnection = (listener: () => void) => {
  socket.on(GatewayEvent.CONNECT, listener);
  socket.on(GatewayEvent.DISCONNECT, listener);

  return () => {
    socket.off(GatewayEvent.CONNECT, listener);
    socket.off(GatewayEvent.DISCONNECT, listener);
  };
};

const isConnected = () => socket.connected;

export const GatewayProvider: React.FC<Props> = ({ children }) => {
  useKillStatsUpdates(socket);
  const { user } = useUser();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  useTimersSocket({ socket, guilds });
  const connected = useSyncExternalStore(subscribeConnection, isConnected);
  const [joined, setJoined] = useState(false);

  const canConnect = Boolean(user && guilds?.length);

  const handleDisconnect = useEffectEvent(() => {
    setJoined(false);
  });

  const handleJoin = useEffectEvent((data: GatewayJoinPayload) => {
    if (data.status === "error") {
      return;
    }

    setJoined(true);
  });

  const emitJoin = useEffectEvent(() => {
    if (connected && canConnect) {
      socket.emit(GatewayEvent.JOIN);
    }
  });

  useEffect(() => {
    socket.on(GatewayEvent.DISCONNECT, handleDisconnect);
    socket.on(GatewayEvent.JOIN, handleJoin);

    return () => {
      socket.off(GatewayEvent.DISCONNECT, handleDisconnect);
      socket.off(GatewayEvent.JOIN, handleJoin);
    };
  }, []);

  useEffect(() => {
    if (!canConnect) {
      socket.disconnect();

      return;
    }

    socket.connect();

    return () => socket.disconnect();
  }, [canConnect]);

  useEffect(() => {
    if (connected && canConnect && !joined) {
      emitJoin();
    }
  }, [connected, canConnect, joined]);

  const value: GatewayProviderValue = {
    connected,
    socket,
    joined,
  };

  return (
    <GatewayContext.Provider value={value}>
      <LootUnreadProvider>{children}</LootUnreadProvider>
    </GatewayContext.Provider>
  );
};
