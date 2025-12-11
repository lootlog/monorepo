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
  MEMBERS_REFRESH_JOB_UPDATE = 'members-refresh-job-update',
  PERMISSIONS_UPDATED = 'permissions-updated',

  // Subscription events
  GUILD_SUBSCRIBE = 'guild:subscribe',
  SUBSCRIPTION_MODE = 'subscription:mode',

  // Player presence events (renamed from event:* to presence:*)
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_FETCH = 'presence:fetch',

  // Margo event-specific events (keeping event:* prefix)
  EVENT_MAP_STATUS_UPDATE = 'event:map-status:update',
  EVENT_HERO_KILLED = 'event:hero:killed',
  EVENT_RANKING_UPDATE = 'event:ranking:update',
  EVENT_RESPAWN_WINDOW_OPENED = 'event:respawn-window:opened',
  EVENT_RESPAWN_WINDOW_CLOSED = 'event:respawn-window:closed',
}
