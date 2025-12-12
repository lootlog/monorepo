/**
 * Timer data passed when recording a hero kill.
 * Contains spawn window information and who created the timer.
 */
export interface KillTimerData {
  /** Minimum spawn time from the timer */
  minSpawnTime: Date;
  /** Maximum spawn time from the timer */
  maxSpawnTime: Date;
  /** ID of the member who created the timer */
  memberId: number;
  /** Previous minimum spawn time (from before kill) */
  previousMinSpawnTime: Date | null;
  /** Previous maximum spawn time (from before kill) */
  previousMaxSpawnTime: Date | null;
  /** When the respawn window was opened (for summary calculation) */
  windowOpenedAt: Date | null;
}
