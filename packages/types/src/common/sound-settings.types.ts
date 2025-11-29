export interface NpcTypeSoundConfig {
  volume: number;
  soundUrl: string;
}

export interface UserSoundSettings {
  userId: string;
  masterVolume: number;
  notificationsVolume: number;
  detectorVolume: number;
  timersVolume: number;
  notificationsConfig: Record<string, NpcTypeSoundConfig>;
  detectorConfig: Record<string, NpcTypeSoundConfig>;
  timersConfig: Record<string, NpcTypeSoundConfig>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateSoundSettingsPayload {
  masterVolume?: number;
  notificationsVolume?: number;
  detectorVolume?: number;
  timersVolume?: number;
  notificationsConfig?: Record<string, Partial<NpcTypeSoundConfig>>;
  detectorConfig?: Record<string, Partial<NpcTypeSoundConfig>>;
  timersConfig?: Record<string, Partial<NpcTypeSoundConfig>>;
}
