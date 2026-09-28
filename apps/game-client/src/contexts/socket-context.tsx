import {
  applyChatAccessPolicy,
  applyLegacyChatAccessChange,
  retainChatAccessPolicy,
  refreshChatAfterReconnect,
} from "@/features/chat/chat-access-policy";
import { useNotificationsStore } from "@/store/notifications.store";
import { reconcileNotificationAccess } from "@/features/notifications/notification-access-policy";
import { createGameAccessCache } from "@/lib/game-access-cache";
import { queryClient } from "@/lib/query-client";
import { GatewayEvent } from "@/config/gateway";
import {
  type AppSocket,
  getSocket,
  getGameSessionIdentity,
  type PermissionsUpdatedPayload,
} from "@/lib/socket";
import {
  resolveRealtimeConnectionStatus,
  type RealtimeConnectionStatus,
} from "@/lib/realtime-connection-status";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type SocketContextValue = {
  socket: AppSocket | null;
  connected: boolean;
  joined: boolean;
  joinedGuilds: string[];
  status: RealtimeConnectionStatus;
};

const EMPTY_JOINED_GUILDS: string[] = [];

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  joined: false,
  joinedGuilds: [],
  status: "connecting",
});

const subscribeConnection = (listener: () => void) => {
  const socket = getSocket();
  socket.on(GatewayEvent.CONNECT, listener);
  socket.on(GatewayEvent.DISCONNECT, listener);

  return () => {
    socket.off(GatewayEvent.CONNECT, listener);
    socket.off(GatewayEvent.DISCONNECT, listener);
  };
};

const isConnected = () => getSocket().connected;

const subscribeConnectionState = (listener: () => void) =>
  getSocket().subscribeConnectionState(listener);

const getConnectionState = () => getSocket().connectionState;

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socket = getSocket();
  const connected = useSyncExternalStore(subscribeConnection, isConnected);

  const connectionState = useSyncExternalStore(
    subscribeConnectionState,
    getConnectionState,
  );

  const hasBeenUnavailable = useRef(false);

  useEffect(() => {
    if (connectionState === "reconnecting") hasBeenUnavailable.current = true;
  }, [connectionState]);

  const [joinedCharacterIdentity, setJoinedCharacterIdentity] = useState<
    string | null
  >(null);

  const [hasBeenOnline, setHasBeenOnline] = useState(false);
  const [guildIds, setJoinedGuilds] = useState<string[]>([]);
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const setSocketState = useGlobalStore((s) => s.setSocketState);

  const characterIdentity = useGameStore((state) => {
    const game = state.game;

    return game
      ? getGameSessionIdentity({ world: game.world, ...game.hero })
      : null;
  });

  const joined =
    characterIdentity !== null && joinedCharacterIdentity === characterIdentity;

  const joinedGuilds = joined ? guildIds : EMPTY_JOINED_GUILDS;

  const previousCharacterIdentity = useRef(characterIdentity);

  useEffect(() => {
    if (previousCharacterIdentity.current === characterIdentity) return;
    const previous = previousCharacterIdentity.current;
    previousCharacterIdentity.current = characterIdentity;

    if (previous !== null) socket.disconnect();

    if (characterIdentity !== null) socket.connect();
  }, [characterIdentity, socket]);

  useEffect(() => {
    setSocketState({ connected, joined, joinedGuilds });
  }, [connected, joined, joinedGuilds, setSocketState]);

  useEffect(() => {
    let cancelled = false;

    const emitJoin = async () => {
      if (gameInitialized && connected) {
        const game = useGameStore.getState().game;

        if (!game) {
          return;
        }

        const { hero, world } = game;
        const { accountId, characterId } = hero;

        if (cancelled || !socket.connected) {
          return;
        }

        await socket.join({
          world,
          name: hero.name,
          lvl: hero.level,
          icon: hero.icon,
          prof: hero.profession,
          characterId,
          accountId,
          clan: hero.clan
            ? {
                id: hero.clan.id,
                name: hero.clan.name,
                rank: hero.clan.rank,
              }
            : undefined,
        });
      }
    };

    void emitJoin().catch((error) => {
      if (import.meta.env.DEV) console.warn("[Gateway] Failed to join", error);
    });

    return () => {
      cancelled = true;
    };
  }, [gameInitialized, connected, socket, characterIdentity]);

  useEffect(() => {
    const accessCache = createGameAccessCache(queryClient);
    const releaseChatPolicy = retainChatAccessPolicy(queryClient);
    let hasJoined = false;
    let joinedConnection = false;

    const handleDisconnect = () => {
      hasBeenUnavailable.current = true;
      joinedConnection = false;
      setJoinedCharacterIdentity(null);
      setJoinedGuilds([]);
    };

    const handleJoin = (data: {
      status: "success" | "error";
      characterIdentity: string;
      code?: string;
      message?: string;
      guildsCount?: number;
      guildIds?: string[];
    }) => {
      if (data.status === "error") {
        return;
      }

      setJoinedCharacterIdentity(data.characterIdentity);
      setHasBeenOnline(true);
      setJoinedGuilds(data.guildIds ?? []);

      if (!joinedConnection) {
        if (
          hasJoined ||
          hasBeenUnavailable.current ||
          !socket.getAccessPolicy()
        )
          refreshChatAfterReconnect(queryClient, data.guildIds ?? []);
        hasJoined = true;
        joinedConnection = true;
      }

      // Emit initial presence after successful join
      // This ensures presence is sent even after browser refresh
      // (when town change event is not fired)
      const map = useGameStore.getState().game?.map;

      if (!map) {
        return;
      }

      socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
        mapId: map.id,
        mapName: map.name,
      });
    };

    const handlePermissionsUpdated = (data: PermissionsUpdatedPayload) => {
      accessCache.apply(data);

      if (data.accessPolicy) {
        applyChatAccessPolicy(queryClient, data.accessPolicy);
        reconcileNotificationAccess(data.accessPolicy);
      } else {
        applyLegacyChatAccessChange(queryClient);
        useNotificationsStore.getState().clearNotifications();
      }

      const updatedGuildIds = data.guilds?.map((guild) => guild.guild.id);

      if (!updatedGuildIds) {
        if (import.meta.env.DEV) {
          console.warn("[Gateway] No guilds data in permissions update");
        }

        setJoinedGuilds([]);
        setJoinedCharacterIdentity(null);

        return;
      }

      setJoinedGuilds(updatedGuildIds);
    };

    socket.on(GatewayEvent.DISCONNECT, handleDisconnect);
    socket.on(GatewayEvent.JOIN, handleJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    const currentPolicy = socket.getAccessPolicy?.();

    if (currentPolicy)
      handlePermissionsUpdated({
        accessPolicy: currentPolicy,
        guilds: currentPolicy.organizations.map(({ organizationId }) => ({
          guild: { id: organizationId },
        })),
      });
    socket.connect();

    return () => {
      accessCache.dispose();
      releaseChatPolicy();
      socket.off(GatewayEvent.DISCONNECT, handleDisconnect);
      socket.off(GatewayEvent.JOIN, handleJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
      socket.disconnect();
    };
  }, [socket]);

  const status = resolveRealtimeConnectionStatus({
    connected,
    hasBeenOnline,
    joined,
    state: connectionState,
  });

  return (
    // oxlint-disable-next-line react-doctor/jsx-no-constructed-context-values -- Vite React Compiler caches this object by its fields (vite.shared.ts enables compiler: true).
    <SocketContext.Provider
      value={{ socket, connected, joined, joinedGuilds, status }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

/** Wait for the first subscription before fetching snapshots, with REST fallback after a connection failure. */
export const useRealtimeSnapshotReady = () => {
  const { socket, status } = useSocket();

  return socket === null || status !== "connecting";
};
