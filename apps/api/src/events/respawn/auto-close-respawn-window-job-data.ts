export interface AutoCloseRespawnWindowJobData {
  guildId: string;
  eventId: string;
  heroId: string;
  npcId: number;
  world: string;
  autoCloseAttempt?: number;
}
