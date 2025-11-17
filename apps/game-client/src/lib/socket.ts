import {
  GATEWAY_SOCKET_PATH,
  GATEWAY_URL,
  type GatewayEvent,
} from "@/config/gateway";
import type { Timer } from "@/hooks/api/use-timers";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import { io, type Socket } from "socket.io-client";
import type { PlayerPresence } from "@/features/online-players/hooks/use-players-presence";
import type { ChatMessage } from "@/hooks/api/use-chat-messages";

type ServerToClientEvents = {
  [GatewayEvent.DISCONNECT]: () => void;
  [GatewayEvent.DISCONNECTING]: () => void;
  [GatewayEvent.CONNECT]: () => void;

  [GatewayEvent.JOIN]: (data: {
    status: "success" | "error";
    guildsCount: number;
    guildIds: string[];
  }) => void;

  [GatewayEvent.PERMISSIONS_UPDATED]: (data: {
    guilds: { guild: { id: string } }[];
  }) => void;

  [GatewayEvent.TIMERS_CREATE]: (data: Timer) => void;
  [GatewayEvent.TIMERS_DELETE]: (data: Timer) => void;

  [GatewayEvent.CHAT_MESSAGE]: (data: ChatMessage) => void;

  [GatewayEvent.UPDATE_SERVER_PRESENCE]: (data: PlayerPresence) => void;

  [GatewayEvent.NOTIFICATION]: (data: Notification) => void;
  [GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE]: (data: {
    id: string;
    endsAt: string;
  }) => void;
};

type ClientToServerEvents = {
  [GatewayEvent.JOIN]: (data: {
    data: {
      world: string;
      name: string;
      lvl: number;
      icon: string;
      prof: string;
      characterId: string;
      accountId: string;
      location: { x: number; y: number; map: string };
    };
  }) => void;

  [GatewayEvent.REQUEST_SERVER_PRESENCE]: () => void;
};

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export const getSocket = (): AppSocket => {
  if (!socket) {
    socket = io(GATEWAY_URL, {
      transports: ["websocket"],
      path: `${GATEWAY_SOCKET_PATH ?? ""}/socket.io`,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: true,
      autoConnect: false,
    }) as AppSocket;
  }

  return socket;
};
