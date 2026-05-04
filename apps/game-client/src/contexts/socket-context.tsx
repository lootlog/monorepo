import { GatewayEvent } from "@/config/gateway";
import { Game } from "@/lib/game";
import { type AppSocket, getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
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
    const emitJoin = () => {
      if (gameInitialized && connected) {
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
            clan: Game.hero.clan
              ? {
                  id: Game.hero.clan.id,
                  name: Game.hero.clan.name,
                  rank: Game.hero.clan.rank,
                }
              : undefined,
            location: {
              x: Game.hero.x,
              y: Game.hero.y,
              map: Game.map.name,
            },
          },
        });
      }
    };

    emitJoin();
  }, [gameInitialized, connected, socket]);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleJoin = (data: {
      status: "success" | "error";
      guildsCount: number;
      guildIds: string[];
    }) => {
      if (data.status === "error") {
        return;
      }

      setJoined(true);
      setJoinedGuilds(data.guildIds);

      // Emit initial presence after successful join
      // This ensures presence is sent even after browser refresh
      // (when town change event is not fired)
      socket.emit(GatewayEvent.PRESENCE_UPDATE, {
        mapId: Game.map.id,
        mapName: Game.map.name,
        isAfk: false,
      });
    };
    const handlePermissionsUpdated = (data: {
      guilds: { guild: { id: string } }[];
    }) => {
      if (import.meta.env.DEV) {
        console.log("[Gateway] Rooms rebalanced:", data);
      }

      if (!data.guilds) {
        if (import.meta.env.DEV) {
          console.error("[Gateway] No guilds data in permissions update");
        }
        setJoinedGuilds([]);
        setJoined(false);
        return;
      }

      setJoinedGuilds(data.guilds.map((g) => g.guild.id) || []);
    };

    socket.on(GatewayEvent.CONNECT, handleConnect);
    socket.on(GatewayEvent.DISCONNECT, handleDisconnect);
    socket.on(GatewayEvent.JOIN, handleJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    if (import.meta.env.DEV) {
      socket.onAny((event, ...args) => {
        console.log(`[Gateway] Event: ${event}`, args);
      });
    }

    socket.connect();

    return () => {
      socket.off(GatewayEvent.CONNECT, handleConnect);
      socket.off(GatewayEvent.DISCONNECT, handleDisconnect);
      socket.off(GatewayEvent.JOIN, handleJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

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
