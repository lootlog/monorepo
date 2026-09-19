import type {
  guildTable,
  memberTable,
  playerSnapshotTable,
  roleTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";

export type Guild = typeof guildTable.$inferSelect;

export type Member = typeof memberTable.$inferSelect;

export type PlayerSnapshot = typeof playerSnapshotTable.$inferSelect;

export type Role = typeof roleTable.$inferSelect;

export type Timer = typeof timerTable.$inferSelect;

export type TimerHistoryEntry = typeof timerHistoryEntryTable.$inferSelect;

export const TimerHistoryAction = {
  CREATE: "CREATE",
  RESET: "RESET",
  DELETE: "DELETE",
  RESTORE: "RESTORE",
} as const;

export type TimerHistoryAction =
  (typeof TimerHistoryAction)[keyof typeof TimerHistoryAction];
