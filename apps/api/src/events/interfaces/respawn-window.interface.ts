/**
 * Status of a map in terms of player assignment and presence.
 */
export type MapStatus =
  | 'ASSIGNED_PRESENT'
  | 'ASSIGNED_ABSENT'
  | 'UNASSIGNED'
  | 'WRONG_PLAYER';

/**
 * Options for closing a respawn window.
 */
export interface CloseRespawnWindowOptions {
  /** Whether to create a new respawn window after closing */
  createNewWindow?: boolean;
  /** Minimum spawn time for the new window (if createNewWindow is true) */
  newMinSpawnTime?: Date;
  /** Maximum spawn time for the new window (if createNewWindow is true) */
  newMaxSpawnTime?: Date;
  /** Whether this is an auto-close triggered by the scheduler */
  isAutoClose?: boolean;
}

/**
 * Options for opening a respawn window.
 */
export interface OpenRespawnWindowOptions {
  /** Custom minimum spawn time (overrides default calculation) */
  minSpawnTime?: Date;
  /** Custom maximum spawn time (overrides default calculation) */
  maxSpawnTime?: Date;
}

/**
 * Hero respawn configuration returned to frontend.
 */
export interface HeroRespawnConfig {
  /** Whether the hero has an active timer */
  hasTimer: boolean;
  /** Current respawn window status */
  windowStatus: 'OPEN' | 'WAITING' | 'NONE';
  /** Minimum spawn time (null if no timer) */
  minSpawnTime: Date | null;
  /** Maximum spawn time (null if no timer) */
  maxSpawnTime: Date | null;
  /** Default respawn base time in seconds */
  defaultRespBaseSeconds: number;
  /** Default respawn randomness percentage */
  defaultRespRandomness: number;
}
