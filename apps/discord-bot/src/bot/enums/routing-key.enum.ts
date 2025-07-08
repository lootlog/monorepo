export enum RoutingKey {
  GUILDS_INITIALIZE_BOT = 'guilds.initialize-bot',
  GUILDS_INITIALIZE = 'guilds.initialize',
  GUILDS_DELETE = 'guilds.delete',
  GUILDS_UPDATE = 'guilds.update',
  GUILDS_CREATE = 'guilds.create',
  GUILDS_SYNC = 'guilds.sync',
  GUILDS_SYNC_TRIGGER = 'guilds.sync.trigger',

  GUILDS_CREATE_ROLE = 'guilds.create.role',
  GUILDS_UPDATE_ROLE = 'guilds.update.role',
  GUILDS_DELETE_ROLE = 'guilds.delete.role',

  GUILDS_MEMBERS_ADD = 'guilds.members.add',
  GUILDS_MEMBERS_REMOVE = 'guilds.members.remove',
  GUILDS_MEMBERS_UPDATE = 'guilds.members.update',

  GUILDS_MEMBERS_ADD_ROLE = 'guilds.members.add.role',
  GUILDS_MEMBERS_REMOVE_ROLE = 'guilds.members.remove.role',

  GUILDS_TIMER_UPDATE = 'guilds.timer.update',
}
