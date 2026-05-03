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
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@/lib/api/generated/main/users/users";

export type GatewayProviderValue = {
  connected: boolean;
  joined: boolean;
  socket: Socket;
  lootUnreadCounts: Record<string, number>;
};

type GatewayJoinPayload = {
  status: "error" | "success";
};

type LootCreateGatewayPayload = {
  guildId: string;
  lootId: number;
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
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const routeGuildId = useGuildId();
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);
  const [unreadLootIdsByGuild, setUnreadLootIdsByGuild] = useState<
    Record<string, number[]>
  >({});

  const currentGuild = guilds?.find(
    (guild) => guild.id === routeGuildId || guild.vanityUrl === routeGuildId,
  );
  const currentGuildId = currentGuild?.id;

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
  const handleLootCreate = useEffectEvent(
    (payload: LootCreateGatewayPayload) => {
      if (payload.guildId === currentGuildId) {
        return;
      }

      setUnreadLootIdsByGuild((prev) => {
        const unreadLootIds = prev[payload.guildId] ?? [];
        if (unreadLootIds.includes(payload.lootId)) {
          return prev;
        }

        return {
          ...prev,
          [payload.guildId]: [...unreadLootIds, payload.lootId],
        };
      });
    },
  );

  useEffect(() => {
    socket.on(GatewayEvent.CONNECT, handleConnect);
    socket.on(GatewayEvent.DISCONNECT, handleDisconnect);
    socket.on(GatewayEvent.JOIN, handleJoin);
    socket.on(GatewayEvent.LOOTS_CREATE, handleLootCreate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off(GatewayEvent.CONNECT, handleConnect);
      socket.off(GatewayEvent.DISCONNECT, handleDisconnect);
      socket.off(GatewayEvent.JOIN, handleJoin);
      socket.off(GatewayEvent.LOOTS_CREATE, handleLootCreate);
    };
  }, []);

  useEffect(() => {
    if (connected && user && guilds && !joined) {
      emitJoin();
    }
  }, [connected, user, guilds, joined]);

  useEffect(() => {
    if (!currentGuildId) {
      return;
    }

    setUnreadLootIdsByGuild((prev) => {
      if (!prev[currentGuildId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[currentGuildId];
      return next;
    });
  }, [currentGuildId]);

  const lootUnreadCounts = Object.fromEntries(
    Object.entries(unreadLootIdsByGuild).map(([guildId, lootIds]) => [
      guildId,
      lootIds.length,
    ]),
  );

  const value: GatewayProviderValue = {
    connected,
    socket,
    joined,
    lootUnreadCounts,
  };

  return (
    <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>
  );
};
