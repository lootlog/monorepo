import {
  GATEWAY_SOCKET_PATH,
  GATEWAY_URL,
  type GatewayEvent,
} from "@/config/gateway";
import type { ChatMessage } from "@/api/chat.api";
import type { Timer } from "@/api/timers.api";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import { io, type Socket } from "socket.io-client";
import { getSerializedDevPermissionOverride } from "@/lib/dev-permission-override";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { msgpackParser } from "@lootlog/socket-parser";
import type {
  PartyFinderVolunteer,
  PartyGatheringSession,
} from "@/store/party-finder.store";
import type { MargonemAccountProof } from "@/lib/margonem-account-proof";
import type {
  MapPingAck,
  MapPingEvent,
  MapPingSendPayload,
} from "@lootlog/types";

type ServerToClientEvents = {
  [GatewayEvent.DISCONNECT]: () => void;
  [GatewayEvent.DISCONNECTING]: () => void;
  [GatewayEvent.CONNECT]: () => void;

  [GatewayEvent.JOIN]: (data: {
    status: "success" | "error";
    code?: string;
    message?: string;
    guildsCount?: number;
    guildIds?: string[];
  }) => void;

  [GatewayEvent.PERMISSIONS_UPDATED]: (data: {
    guilds: { guild: { id: string } }[];
  }) => void;

  [GatewayEvent.TIMERS_CREATE]: (data: Timer) => void;
  [GatewayEvent.TIMERS_DELETE]: (data: Timer) => void;

  [GatewayEvent.CHAT_MESSAGE]: (data: ChatMessage) => void;

  [GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE]: (data: {
    discordId: string;
    guildId?: string;
    sessionId?: string;
    platform?: PlayerPresence["platform"];
    status?: PlayerPresence["status"];
    player?: {
      world?: string;
      name?: string;
      lvl?: number | string;
      icon?: string;
      characterId?: string;
      accountId?: string;
      prof?: string;
      margonemAccountVerified?: boolean;
      clan?: {
        id?: number;
        name?: string;
        rank?: number;
      };
      mapName?: string;
      sessionId?: string;
      location?: {
        x?: number;
        y?: number;
        map?: string;
      };
    };
  }) => void;

  [GatewayEvent.NOTIFICATION]: (data: Notification) => void;
  [GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE]: (data: {
    id: string;
    endsAt: string;
  }) => void;
  [GatewayEvent.NOTIFICATIONS_VOLUNTEER]: (data: {
    notificationId: string;
    volunteer: PartyFinderVolunteer;
  }) => void;
  [GatewayEvent.PARTY_GATHERING_SEND]: (
    data: PartyGatheringSession & { guildId: string },
  ) => void;
  [GatewayEvent.PARTY_GATHERING_CANCEL]: (data: {
    notificationId: string;
  }) => void;
  [GatewayEvent.CHAT_MESSAGE_DELETE]: (data: {
    guildId: string;
    messageId: string;
  }) => void;
  [GatewayEvent.CHAT_MESSAGE_UPDATE]: (data: {
    guildId: string;
    messageId: string;
    message: string;
  }) => void;
  [GatewayEvent.CHAT_MESSAGES_CLEAR]: (data: { guildId: string }) => void;
  [GatewayEvent.MAP_PING_RECEIVE]: (data: MapPingEvent) => void;
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
      clan?: {
        id: number;
        name: string;
        rank: number;
      };
      location: { x: number; y: number; map: string };
    };
    margonemAccountProof?: MargonemAccountProof;
  }) => void;

  [GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH]: (data: {
    guildId: string;
    world: string;
  }) => void;

  [GatewayEvent.PLAYER_PRESENCE_UPDATE]: (data: {
    isAfk?: boolean;
    mapId?: number;
    mapName?: string;
  }) => void;
  [GatewayEvent.MAP_PING_SEND]: (
    data: MapPingSendPayload,
    acknowledgement: (response: MapPingAck) => void,
  ) => void;
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
      parser: msgpackParser,
      auth: {
        devPermissionOverride: getSerializedDevPermissionOverride(),
      },
    }) as AppSocket;
  }

  return socket;
};
