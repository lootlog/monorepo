import { GatewayEvent } from "@/config/gateway";
import {
  DEV_PERMISSION_OVERRIDE_EVENT,
  getSerializedDevPermissionOverride,
} from "@/lib/dev-permission-override";
import { requestMargonemAccountProof } from "@/lib/margonem-account-proof";
import {
  type AppSocket,
  getSocket,
  type PermissionsUpdatedPayload,
} from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useRef,
} from "react";

type SocketContextValue = {
  socket: AppSocket | null;
  connected: boolean;
  joined: boolean;
  joinedGuilds: string[];
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  joined: false,
  joinedGuilds: [],
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket] = useState(() => getSocket());
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);
  const [joinedGuilds, setJoinedGuilds] = useState<string[]>([]);
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const setSocketState = useGlobalStore((s) => s.setSocketState);
  const setSocketStateRef = useRef(setSocketState);
  setSocketStateRef.current = setSocketState;

  // Sync socket state to global store for non-reactive access in callbacks
  useEffect(() => {
    setSocketStateRef.current({ connected, joined, joinedGuilds });
  }, [connected, joined, joinedGuilds]);

  useEffect(() => {
    let cancelled = false;

    const emitJoin = async () => {
      if (gameInitialized && connected) {
        const game = useGameStore.getState().game;
        if (!game) {
          return;
        }

        const { hero, map, world } = game;
        const { accountId, characterId } = hero;
        const socketId = socket.id;

        if (!socketId) {
          return;
        }

        const margonemAccountProof = await requestMargonemAccountProof({
          socketId,
          accountId,
          characterId,
          clanId: hero.clan?.id,
        }).catch((error) => {
          if (import.meta.env.DEV) {
            console.warn("[Gateway] Failed to verify Margonem account", error);
          }

          return undefined;
        });

        if (cancelled || !socket.connected) {
          return;
        }

        socket.emit(GatewayEvent.JOIN, {
          data: {
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
            location: {
              x: hero.x,
              y: hero.y,
              map: map.name,
            },
          },
          ...(margonemAccountProof ? { margonemAccountProof } : {}),
        });
      }
    };

    void emitJoin().catch((error) => {
      if (import.meta.env.DEV) {
        console.warn("[Gateway] Failed to verify Margonem account", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameInitialized, connected, socket]);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleJoin = (data: {
      status: "success" | "error";
      code?: string;
      message?: string;
      guildsCount?: number;
      guildIds?: string[];
    }) => {
      if (data.status === "error") {
        return;
      }

      setJoined(true);
      setJoinedGuilds(data.guildIds ?? []);

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
        isAfk: false,
      });
    };
    const handlePermissionsUpdated = (data: PermissionsUpdatedPayload) => {
      if (import.meta.env.DEV) {
        console.warn("[Gateway] Rooms rebalanced:", data);
      }

      const updatedGuildIds = data.guilds?.map((guild) => guild.guild.id);

      if (!updatedGuildIds) {
        if (import.meta.env.DEV) {
          console.warn("[Gateway] No guilds data in permissions update");
        }
        setJoinedGuilds([]);
        setJoined(false);
        return;
      }

      setJoinedGuilds(updatedGuildIds);
    };

    socket.on(GatewayEvent.CONNECT, handleConnect);
    socket.on(GatewayEvent.DISCONNECT, handleDisconnect);
    socket.on(GatewayEvent.JOIN, handleJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    const handleDevPermissionOverrideChange = () => {
      socket.auth = {
        ...(typeof socket.auth === "object" ? socket.auth : {}),
        devPermissionOverride: getSerializedDevPermissionOverride(),
      };
      setJoined(false);
      setJoinedGuilds([]);

      if (socket.connected) {
        socket.disconnect();
      }

      socket.connect();
    };

    socket.auth = {
      ...(typeof socket.auth === "object" ? socket.auth : {}),
      devPermissionOverride: getSerializedDevPermissionOverride(),
    };
    window.addEventListener(
      DEV_PERMISSION_OVERRIDE_EVENT,
      handleDevPermissionOverrideChange,
    );
    socket.connect();

    return () => {
      socket.off(GatewayEvent.CONNECT, handleConnect);
      socket.off(GatewayEvent.DISCONNECT, handleDisconnect);
      socket.off(GatewayEvent.JOIN, handleJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
      window.removeEventListener(
        DEV_PERMISSION_OVERRIDE_EVENT,
        handleDevPermissionOverrideChange,
      );

      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, connected, joined, joinedGuilds }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
