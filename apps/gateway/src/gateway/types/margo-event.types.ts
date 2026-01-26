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

export interface HeroKill {
  killerDiscordId: string;
  killerCharacterId: string;
  killerCharacterName: string;
  heroNpcId: string;
  heroName: string;
  heroLevel: number;
  killedAt: string;
  mapId: string;
  mapName: string;
}

export interface EventRanking {
  discordId: string;
  characterId: string;
  characterName: string;
  points: number;
  kills: number;
  rank: number;
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
  heroNpcId: string;
  kill: HeroKill;
}

export interface EventRankingUpdatePayload {
  guildId: string;
  eventId: string;
  rankings: EventRanking[];
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
  mapName: string;
}
