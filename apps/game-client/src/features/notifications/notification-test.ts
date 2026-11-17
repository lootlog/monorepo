import type { UserGameAccountPreferences } from "@lootlog/schema/account-preferences";
import type { SoundSettingsFixture } from "@/test/sound-settings-fixtures";
import { onTestFinished, vi } from "vitest";
import { createRealtimeTest } from "@/test/realtime-test";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import {
  accountPreferenceValues,
  seedSettingsDocumentValues,
  soundSettingValues,
  userPreferenceValues,
} from "@/test/settings-documents-fixtures";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";

export const createNotificationTest = () => {
  const test = createRealtimeTest();

  const preferences: UserGameAccountPreferences = {
    accountId: "1",
    notifications: createNotificationsSettings(["guild-1"]),
    detector: createDetectorSettings(),
    pings: { enabled: false },
    airTags: { enabled: false },
    hasStoredNotifications: true,
    hasStoredDetector: true,
    hasStoredPings: true,
    hasStoredAirTags: true,
    hasStoredPreferences: true,
  };

  preferences.notifications.message = {
    ...preferences.notifications.message,
    sound: false,
    autoHideTimeout: 30,
  };

  const userPreferences: UserPreferencesResponseDtoOutput = {
    userId: "user",
    guildsOrder: [],
    hiddenGuildIds: [],
    theme: "dark",
    chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
    mutes: { players: [], npcs: [] },
  };

  const soundSettings: SoundSettingsFixture = {
    notificationsVolume: 0.5,
    detectorVolume: 0,
    timersVolume: 0,
    pingsVolume: 0,
    notificationsConfig: { message: { volume: 0.5, soundUrl: "" } },
    detectorConfig: {},
    timersConfig: {},
  };

  const setPreferences = () =>
    seedSettingsDocumentValues(
      test.queryClient,
      accountPreferenceValues({
        ...preferences,
        notifications: { ...preferences.notifications },
      }),
    );

  const setUserPreferences = () => {
    test.queryClient.setQueryData(
      getUsersControllerGetUserPreferencesQueryKey(),
      { ...userPreferences, mutes: { ...userPreferences.mutes } },
    );
    seedSettingsDocumentValues(
      test.queryClient,
      userPreferenceValues({ mutes: { ...userPreferences.mutes } }),
    );
  };

  const setSounds = () =>
    seedSettingsDocumentValues(
      test.queryClient,
      soundSettingValues({ ...soundSettings }),
    );

  setPreferences();
  setUserPreferences();
  setSounds();
  useSettingsStore.setState({ soundsMuted: false, masterVolume: 1 });
  useWindowsStore.getState().setOpen("notifications", false);
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const audio: HTMLAudioElement[] = [];

  const load = vi
    .spyOn(HTMLMediaElement.prototype, "load")
    .mockImplementation(function (this: HTMLAudioElement) {
      if (!audio.includes(this)) audio.push(this);
    });

  const pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});

  onTestFinished(() => {
    play.mockRestore();
    load.mockRestore();
    pause.mockRestore();
  });

  return {
    ...test,
    preferences,
    userPreferences,
    soundSettings,
    setPreferences,
    setUserPreferences,
    setSounds,
    play,
    load,
    pause,
    audio,
  };
};
