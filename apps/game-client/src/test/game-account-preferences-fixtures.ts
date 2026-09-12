import type { UserGameAccountPreferencesResponseDtoOutput } from "@lootlog/client/main";
import { NOTIFICATION_TYPES } from "@lootlog/schema/account-preferences";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";

type LegacyNotificationsResponse =
  UserGameAccountPreferencesResponseDtoOutput["notifications"];

/**
 * The legacy game-preferences response mirrors the shared server list into
 * every notification type for deployed clients.
 */
export const createNotificationsResponse = (
  guildIds: string[] = [],
): LegacyNotificationsResponse => {
  const settings = createNotificationsSettings(guildIds);
  // SAFETY: every notification type is overwritten below with a record that
  // carries the per-type list the legacy response requires.
  const response = { ...settings } as LegacyNotificationsResponse;

  for (const type of NOTIFICATION_TYPES) {
    response[type] = { ...settings[type], guildIds: [...guildIds] };
  }

  return response;
};

export const createGameAccountPreferences = (
  accountId: string,
  overrides: Partial<UserGameAccountPreferencesResponseDtoOutput> = {},
): UserGameAccountPreferencesResponseDtoOutput => ({
  accountId,
  notifications: createNotificationsResponse(),
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
