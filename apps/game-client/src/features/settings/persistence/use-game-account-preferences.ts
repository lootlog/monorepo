import {
  normalizeAirTags,
  normalizeDetector,
  normalizeNotifications,
  normalizePings,
} from "@lootlog/domain/account-preferences";
import type {
  UpdateUserGameAccountPreferencesPayload,
  UserGameAccountPreferences,
} from "@lootlog/schema/account-preferences";
import { useGameStore } from "@/store/game.store";
import {
  hasStoredSettingsValue,
  selectSettingsValue,
  type SettingsDocuments,
} from "./settings-documents";
import { enqueueSettingsPatch } from "./settings-patch-client";
import { useSettingsSaveStatus } from "./settings-save-status.store";
import { useSettingsDocuments } from "./use-settings-documents";

const preferencesCache = new WeakMap<
  SettingsDocuments,
  Map<string, UserGameAccountPreferences>
>();

/**
 * Projects the account-scoped preference documents into the shape the
 * notifications, detector, map ping and air tag features consume.
 */
export const getGameAccountPreferences = (
  documents: SettingsDocuments | undefined,
  accountId: string,
): UserGameAccountPreferences | undefined => {
  if (!documents) return undefined;
  const cachedByAccount = preferencesCache.get(documents) ?? new Map();
  preferencesCache.set(documents, cachedByAccount);
  const cached = cachedByAccount.get(accountId);

  if (cached) return cached;

  const hasStoredNotifications = hasStoredSettingsValue(
    documents,
    "notifications.presentation",
  );

  const hasStoredDetector = hasStoredSettingsValue(
    documents,
    "gameData.detector",
  );

  const hasStoredPings = hasStoredSettingsValue(documents, "gameData.pings");

  const hasStoredAirTags = hasStoredSettingsValue(
    documents,
    "gameData.airTags",
  );

  const preferences: UserGameAccountPreferences = {
    accountId,
    notifications: normalizeNotifications(
      selectSettingsValue(documents, "notifications.presentation"),
    ),
    detector: normalizeDetector(
      selectSettingsValue(documents, "gameData.detector"),
    ),
    pings: normalizePings(selectSettingsValue(documents, "gameData.pings")),
    airTags: normalizeAirTags(
      selectSettingsValue(documents, "gameData.airTags"),
    ),
    hasStoredNotifications,
    hasStoredDetector,
    hasStoredPings,
    hasStoredAirTags,
    hasStoredPreferences:
      hasStoredNotifications ||
      hasStoredDetector ||
      hasStoredPings ||
      hasStoredAirTags,
  };

  cachedByAccount.set(accountId, preferences);

  return preferences;
};

export const useCurrentGameAccountPreferences = () => {
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? null);
  const query = useSettingsDocuments();

  return {
    ...query,
    accountId,
    data: accountId
      ? getGameAccountPreferences(query.data, accountId)
      : undefined,
  };
};

/**
 * Writes account-scoped preference patches. Nested partial records merge
 * on the server, so a payload only carries the fields that changed.
 */
export const useUpdateGameAccountPreferences = () => {
  const status = useSettingsSaveStatus();

  const mutate = (payload: UpdateUserGameAccountPreferencesPayload) => {
    const gameDataSet: Pick<
      UpdateUserGameAccountPreferencesPayload,
      "detector" | "pings" | "airTags"
    > = {};

    if (payload.detector) gameDataSet.detector = payload.detector;

    if (payload.pings) gameDataSet.pings = payload.pings;

    if (payload.airTags) gameDataSet.airTags = payload.airTags;

    if (Object.keys(gameDataSet).length > 0) {
      enqueueSettingsPatch({
        domain: "gameData",
        scopeType: "GAME_ACCOUNT",
        set: gameDataSet,
      });
    }

    if (payload.notifications) {
      enqueueSettingsPatch({
        domain: "notifications",
        scopeType: "GAME_ACCOUNT",
        set: { presentation: payload.notifications },
      });
    }
  };

  return { mutate, isPending: status === "saving" };
};
