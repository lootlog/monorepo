export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string;
export const GATEWAY_SOCKET_PATH = import.meta.env.VITE_GATEWAY_SOCKET_PATH as string;

export enum GatewayEvent {
  INIT = "init",
  HELLO = "hello",
  DISCONNECTING = "disconnecting",
  DISCONNECT = "disconnect",
  CONNECT = "connect",
  JOIN = "join",
  CHAT_MESSAGE = "chat-message",
  REQUEST_SERVER_PRESENCE = "request-server-presence",
  UPDATE_SERVER_PRESENCE = "update-server-presence",
  TIMERS_CREATE = "timers-create",
  TIMERS_DELETE = "timers-delete",
  NOTIFICATION = "notifications-send",
  MEMBERS_REFRESH_JOB_UPDATE = "members-refresh-job-update",
}
