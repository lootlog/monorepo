/**
 * Types for Margo game events received via RabbitMQ.
 * These events are related to in-game activities during guild events.
 */

export interface EventPresencePlayer {
  discordId: string;
  characterId: string;
  characterName: string;
  mapId: string;
  mapName: string;
  isAfk: boolean;
}

export interface EventPresenceLog {
  players: EventPresencePlayer[];
  timestamp: number;
}

export interface EventPresenceUpdatePayload {
  guildId: string;
  eventId: string;
  mapId: string;
  presenceLog: EventPresenceLog;
}

export interface EventHeroKilledPayload {
  guildId: string;
  eventId: string;
  killId: string;
}

export interface EventRankingUpdatePayload {
  guildId: string;
  eventId: string;
}

export interface EventRespawnWindowPayload {
  guildId: string;
  eventId: string;
  heroId: string;
}

export interface EventMapStatusUpdatePayload {
  guildId: string;
  eventId: string;
  mapId: string;
}
