import {
  RealtimeClient,
  REALTIME_JSON_SUBPROTOCOL,
  REALTIME_SUBPROTOCOL,
} from "@lootlog/client/realtime";
import { GATEWAY_URL, GATEWAY_SOCKET_PATH } from "@/config/gateway";
import {
  REALTIME_SESSION_HELLO_CAPABILITY,
  REALTIME_AIR_TAG_MAP_THREAT_CAPABILITY,
  REALTIME_AIR_TAG_SCOPE_UPDATE_CAPABILITY,
  REALTIME_NPC_PRESENCE_CAPABILITY,
  REALTIME_GLOBAL_CHAT_CAPABILITY,
  REALTIME_BATTLE_PING_CAPABILITY,
  REALTIME_PARTY_GATHERING_STATE_CAPABILITY,
  REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY,
  REALTIME_TEAM_BATTLE_PING_CAPABILITY,
} from "@lootlog/protocol/realtime";

export type GameRealtimeClient = Pick<
  RealtimeClient,
  | "connect"
  | "disconnect"
  | "join"
  | "request"
  | "subscribe"
  | "subscribeState"
  | "subscribeHeartbeatLatency"
  | "probeLatency"
  | "setReconnectHandler"
>;

export interface GameClientPlatform {
  fetch: typeof fetch;
  createRealtime: () => GameRealtimeClient;
}

export function createGameRealtimeClient(): RealtimeClient {
  const readable = import.meta.env.VITE_GATEWAY_FRAME_ENCODING === "json";

  return new RealtimeClient({
    url: GATEWAY_URL,
    path: GATEWAY_SOCKET_PATH || "/ws",
    protocols: [
      readable ? REALTIME_JSON_SUBPROTOCOL : REALTIME_SUBPROTOCOL,
      REALTIME_PARTY_GATHERING_STATE_CAPABILITY,
      REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY,
      REALTIME_BATTLE_PING_CAPABILITY,
      REALTIME_TEAM_BATTLE_PING_CAPABILITY,
      REALTIME_SESSION_HELLO_CAPABILITY,
      REALTIME_AIR_TAG_MAP_THREAT_CAPABILITY,
      REALTIME_AIR_TAG_SCOPE_UPDATE_CAPABILITY,
      REALTIME_NPC_PRESENCE_CAPABILITY,
      REALTIME_GLOBAL_CHAT_CAPABILITY,
    ],
    frameEncoding: readable ? "json" : "messagepack",
  });
}

const directPlatform: GameClientPlatform = {
  fetch: (input, init) => globalThis.fetch(input, init),
  createRealtime: createGameRealtimeClient,
};

let currentPlatform = directPlatform;

export const getGameClientPlatform = () => currentPlatform;

export const isExtensionClient = () => currentPlatform !== directPlatform;

export const gameClientFetch: typeof fetch = (input, init) =>
  currentPlatform.fetch(input, init);

export function configureGameClientPlatform(
  platform = directPlatform,
): () => void {
  const previous = currentPlatform;
  currentPlatform = platform;

  return () => {
    if (currentPlatform === platform) currentPlatform = previous;
  };
}
