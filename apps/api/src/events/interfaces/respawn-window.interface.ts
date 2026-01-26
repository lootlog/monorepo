export type MapStatus =
  | 'ASSIGNED_PRESENT'
  | 'ASSIGNED_ABSENT'
  | 'UNASSIGNED'
  | 'WRONG_PLAYER';

export interface CloseRespawnWindowOptions {
  createNewWindow?: boolean;
  newMinSpawnTime?: Date;
  newMaxSpawnTime?: Date;
  isAutoClose?: boolean;
}

export interface OpenRespawnWindowOptions {
  minSpawnTime: Date;
  maxSpawnTime: Date;
}

export interface HeroRespawnConfig {
  hasTimer: boolean;
  windowStatus: 'OPEN' | 'WAITING' | 'NONE';
  minSpawnTime: Date | null;
  maxSpawnTime: Date | null;
}
