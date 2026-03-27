export interface UserGuildEventSettings {
  userId: string;
  guildId: string;
  pinnedEvents: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateGuildEventSettingsPayload {
  pinnedEvents: string[];
}
