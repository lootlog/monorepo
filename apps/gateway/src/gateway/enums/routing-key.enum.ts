export enum RoutingKey {
  GUILDS_LOOTS_CREATE = 'guilds.loots.create',
  GUILDS_LOOTS_UPDATE = 'guilds.loots.update',
  GUILDS_LOOTS_DELETE = 'guilds.loots.delete',

  GUILDS_TIMERS_CREATE = 'guilds.timers.create',
  GUILDS_TIMERS_UPDATE = 'guilds.timers.update',
  GUILDS_TIMERS_UPDATE_DLQ = 'guilds.timers.update.dlq',
  GUILDS_TIMERS_UPDATE_RETRY = 'guilds.timers.update.retry',
  GUILDS_TIMERS_DELETE = 'guilds.timers.delete',
  GUILDS_TIMERS_DELETE_DLQ = 'guilds.timers.delete.dlq',
  GUILDS_TIMERS_DELETE_RETRY = 'guilds.timers.delete.retry',

  GUILDS_SEND_MESSAGE = 'guilds.send.message',
  GUILDS_SEND_MESSAGE_DLQ = 'guilds.send.message.dlq',
  GUILDS_SEND_MESSAGE_RETRY = 'guilds.send.message.retry',

  GUILDS_MEMBERS_ADD = 'guilds.members.add',
  GUILDS_MEMBERS_ADD_DLQ = 'guilds.members.add.dlq',
  GUILDS_MEMBERS_ADD_RETRY = 'guilds.members.add.retry',
  GUILDS_MEMBERS_REMOVE = 'guilds.members.remove',
  GUILDS_MEMBERS_REMOVE_DLQ = 'guilds.members.remove.dlq',
  GUILDS_MEMBERS_REMOVE_RETRY = 'guilds.members.remove.retry',
  GUILDS_MEMBERS_UPDATE = 'guilds.members.update',
  GUILDS_MEMBERS_UPDATE_DLQ = 'guilds.members.update.dlq',
  GUILDS_MEMBERS_UPDATE_RETRY = 'guilds.members.update.retry',

  GUILDS_MEMBERS_ADD_ROLE = 'guilds.members.add.role',
  GUILDS_MEMBERS_ADD_ROLE_DLQ = 'guilds.members.add.role.dlq',
  GUILDS_MEMBERS_ADD_ROLE_RETRY = 'guilds.members.add.role.retry',
  GUILDS_MEMBERS_REMOVE_ROLE = 'guilds.members.remove.role',
  GUILDS_MEMBERS_REMOVE_ROLE_DLQ = 'guilds.members.remove.role.dlq',
  GUILDS_MEMBERS_REMOVE_ROLE_RETRY = 'guilds.members.remove.role.retry',

  GUILDS_NOTIFICATIONS_SEND = 'guilds.notifications.send',
  GUILDS_NOTIFICATIONS_SEND_DLQ = 'guilds.notifications.send.dlq',
  GUILDS_NOTIFICATIONS_SEND_RETRY = 'guilds.notifications.send.retry',
}
