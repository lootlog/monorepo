export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string;
export const GATEWAY_SOCKET_PATH = import.meta.env
  .VITE_GATEWAY_SOCKET_PATH as string;

export enum GatewayEvent {
  INIT = "init",
  HELLO = "hello",
  DISCONNECTING = "disconnecting",
  DISCONNECT = "disconnect",
  CONNECT = "connect",
  JOIN = "join",
  CHAT_MESSAGE = "chat-message",
  LOOTS_CREATE = "loots-create",
  LOOTS_SHARE_UPDATE = "loots-share-update",
  ONLINE_PLAYERS_PRESENCE_FETCH = "online-players:presence:fetch",
  ONLINE_PLAYERS_PRESENCE_UPDATE = "online-players:presence:update",
  TIMERS_CREATE = "timers-create",
  TIMERS_DELETE = "timers-delete",
  RESERVATIONS_CREATE = "reservations-create",
  RESERVATIONS_DELETE = "reservations-delete",
  NOTIFICATION = "notifications-send",
  MEMBERS_REFRESH_JOB_UPDATE = "members-refresh-job-update",

  // Event map presence
  EVENT_PRESENCE_UPDATE = "event-presence:update",
  EVENT_PRESENCE_FETCH = "event-presence:fetch",

  // Margo Events (game-specific)
  EVENT_MAP_STATUS_UPDATE = "event:map-status:update",
  EVENT_HERO_KILLED = "event:hero:killed",
  EVENT_RANKING_UPDATE = "event:ranking:update",
  EVENT_RESPAWN_WINDOW_OPENED = "event:respawn-window:opened",
  EVENT_RESPAWN_WINDOW_CLOSED = "event:respawn-window:closed",
}
