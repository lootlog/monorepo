export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string;
export const GATEWAY_SOCKET_PATH = import.meta.env
  .VITE_GATEWAY_SOCKET_PATH as string;

export enum GatewayEvent {
  // connection
  DISCONNECTING = "disconnecting",
  DISCONNECT = "disconnect",
  CONNECT = "connect",

  // permissions
  PERMISSIONS_UPDATED = "permissions-updated",

  //rooms
  JOIN = "join",

  // chat
  CHAT_MESSAGE = "chat-message",

  // presence
  REQUEST_SERVER_PRESENCE = "request-server-presence",
  UPDATE_SERVER_PRESENCE = "update-server-presence",

  // player presence events
  PRESENCE_UPDATE = "presence:update",
  PRESENCE_FETCH = "presence:fetch",

  // timers
  TIMERS_CREATE = "timers-create",
  TIMERS_DELETE = "timers-delete",

  // notifications
  NOTIFICATION = "notifications-send",

  // members
  MEMBERS_REFRESH_JOB_UPDATE = "members-refresh-job-update",

  // margo events (game-specific)
  EVENT_MAP_STATUS_UPDATE = "event:map-status:update",
  EVENT_HERO_KILLED = "event:hero:killed",
  EVENT_RANKING_UPDATE = "event:ranking:update",
}
