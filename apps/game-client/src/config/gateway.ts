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

  // online players presence
  ONLINE_PLAYERS_PRESENCE_FETCH = "online-players:presence:fetch",
  ONLINE_PLAYERS_PRESENCE_UPDATE = "online-players:presence:update",

  // current player presence
  PLAYER_PRESENCE_UPDATE = "player-presence:update",

  // timers
  TIMERS_CREATE = "timers-create",
  TIMERS_DELETE = "timers-delete",

  // notifications
  NOTIFICATION = "notifications-send",
  NOTIFICATIONS_VOLUNTEER = "notifications-volunteer",
  PARTY_GATHERING_SEND = "party-gathering-send",
  PARTY_GATHERING_CANCEL = "party-gathering-cancel",
  PARTY_READY_ROOM_UPDATE = "party-ready-room:update",
  CHAT_MESSAGE_DELETE = "chat-message-delete",
  CHAT_MESSAGE_UPDATE = "chat-message-update",
  CHAT_MESSAGES_CLEAR = "chat-messages-clear",

  // members
  MEMBERS_REFRESH_JOB_UPDATE = "members-refresh-job-update",
  MAP_PING_SEND = "map-ping:send",
  MAP_PING_RECEIVE = "map-ping:receive",

  // margo events (game-specific)
  EVENT_MAP_STATUS_UPDATE = "event:map-status:update",
  EVENT_HERO_KILLED = "event:hero:killed",
  EVENT_RANKING_UPDATE = "event:ranking:update",
}
