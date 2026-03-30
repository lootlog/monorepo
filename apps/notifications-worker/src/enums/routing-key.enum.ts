export enum RoutingKey {
  // Consumed from apps/api
  GUILDS_TIMERS_UPDATE = "guilds.timers.update",
  LOOTS_CREATED = "loots.created",
  EVENT_RESPAWN_WINDOW_OPENED = "event.respawn-window.opened",

  // Published to discord-bot
  NOTIFICATIONS_DISCORD_SEND = "notifications.discord.send",

  // Consumed from discord-bot
  NOTIFICATIONS_DELIVERY_RESULT = "notifications.delivery.result",
}
