import {
  RealtimeClient,
  REALTIME_JSON_SUBPROTOCOL,
  REALTIME_SUBPROTOCOL,
} from "@lootlog/client/realtime";
import { GATEWAY_URL, GATEWAY_SOCKET_PATH } from "@/config/gateway";
import { APP_ENVIRONMENT } from "@/config/app";
import { requestRealtimeTicket } from "./realtime-ticket";

export type GameRealtimeClient = Pick<
  RealtimeClient,
  | "connect"
  | "disconnect"
  | "join"
  | "request"
  | "subscribe"
  | "subscribeState"
  | "setReconnectHandler"
>;

export interface GameClientPlatform {
  fetch: typeof fetch;
  createRealtime: () => GameRealtimeClient;
}

export function createGameRealtimeClient(
  extensionOrigin?: string,
): RealtimeClient {
  const readable =
    APP_ENVIRONMENT === "development" || APP_ENVIRONMENT === "production-local";
  return new RealtimeClient({
    url: GATEWAY_URL,
    path: GATEWAY_SOCKET_PATH || "/ws",
    protocols: [readable ? REALTIME_JSON_SUBPROTOCOL : REALTIME_SUBPROTOCOL],
    ticketProvider: () => requestRealtimeTicket(extensionOrigin),
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
