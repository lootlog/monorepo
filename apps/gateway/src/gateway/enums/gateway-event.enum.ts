export enum GatewayEvent {
  DISCONNECTING = 'disconnecting',
  INIT = 'init',
  JOIN = 'join',
  REQUEST_SERVER_PRESENCE = 'request-server-presence',
  UPDATE_SERVER_PRESENCE = 'update-server-presence',
  CHAT_MESSAGE = 'chat-message',
  TIMERS_CREATE = 'timers-create',
  TIMERS_DELETE = 'timers-delete',
  RESERVATIONS_CREATE = 'reservations-create',
  RESERVATIONS_DELETE = 'reservations-delete',
  NOTIFICATIONS_SEND = 'notifications-send',
  NOTIFICATIONS_VOLUNTEER = 'notifications-volunteer',
  PARTY_GATHERING_SEND = 'party-gathering-send',
  PARTY_GATHERING_CANCEL = 'party-gathering-cancel',
  CHAT_MESSAGE_DELETE = 'chat-message-delete',
  CHAT_MESSAGE_UPDATE = 'chat-message-update',
  MEMBERS_REFRESH_JOB_UPDATE = 'members-refresh-job-update',
  PERMISSIONS_UPDATED = 'permissions-updated',

  // Player presence events
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_FETCH = 'presence:fetch',

  // Margo event-specific events
  EVENT_MAP_STATUS_UPDATE = 'event:map-status:update',
  EVENT_HERO_KILLED = 'event:hero:killed',
  EVENT_RANKING_UPDATE = 'event:ranking:update',
  EVENT_RESPAWN_WINDOW_OPENED = 'event:respawn-window:opened',
  EVENT_RESPAWN_WINDOW_CLOSED = 'event:respawn-window:closed',
}
