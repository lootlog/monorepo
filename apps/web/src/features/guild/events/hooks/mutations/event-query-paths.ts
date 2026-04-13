export const getEventKillsPath = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/kills`;

export const getEventMembersPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/members/`;

export const getEventHeroesPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/heroes/`;

export const getEventMapsPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/maps/`;

export const getEventTimersPath = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/timers`;

export const getEventRankingHistoryPathPrefix = (
  guildId: string,
  eventId: string,
) => `/guilds/${guildId}/events/${eventId}/ranking/`;
