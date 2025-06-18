export enum GatewayEvent {
  DISCONNECTING = 'disconnecting',
  INIT = 'init',
  JOIN = 'join',
  REQUEST_SERVER_PRESENCE = 'request-server-presence',
  UPDATE_SERVER_PRESENCE = 'update-server-presence',
  CHAT_MESSAGE = 'chat-message',
  TIMERS_CREATE = 'timers-create',
  TIMERS_DELETE = 'timers-delete',
}
