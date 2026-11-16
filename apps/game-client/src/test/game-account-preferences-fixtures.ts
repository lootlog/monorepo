import type { UserGameAccountPreferences } from "@lootlog/schema/account-preferences";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";

export const createGameAccountPreferences = (
  accountId: string,
  overrides: Partial<UserGameAccountPreferences> = {},
): UserGameAccountPreferences => ({
  accountId,
  notifications: createNotificationsSettings(),
  detector: createDetectorSettings(),
  pings: { enabled: true },
  airTags: { enabled: true },
  hasStoredNotifications: true,
  hasStoredDetector: true,
  hasStoredPings: true,
  hasStoredAirTags: true,
  hasStoredPreferences: true,
  ...overrides,
});
