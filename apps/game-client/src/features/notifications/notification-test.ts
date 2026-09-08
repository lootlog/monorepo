import { onTestFinished, vi } from "vitest";
import { createRealtimeTest } from "@/test/realtime-test";
import {
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  getSoundSettingsControllerGetSettingsQueryKey,
  type UserGameAccountPreferencesResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
  type SoundSettingsResponseDto,
} from "@lootlog/client/main";
import {
  createNotificationsSettings,
  createDetectorSettings,
} from "@/lib/game-account-preferences";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";

export const createNotificationTest = () => {
  const test = createRealtimeTest();
  const preferences: UserGameAccountPreferencesResponseDtoOutput = {
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
  const soundSettings: SoundSettingsResponseDto = {
    userId: "user",
    masterVolume: 1,
    notificationsVolume: 0.5,
    detectorVolume: 0,
    timersVolume: 0,
    pingsVolume: 0,
    notificationsConfig: { message: { volume: 0.5, soundUrl: "" } },
    detectorConfig: {},
    timersConfig: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const setPreferences = () =>
    test.queryClient.setQueryData(
      getUsersControllerGetUserGameAccountPreferencesQueryKey({
        accountId: "1",
      }),
      { ...preferences, notifications: { ...preferences.notifications } },
    );
  const setUserPreferences = () =>
    test.queryClient.setQueryData(
      getUsersControllerGetUserPreferencesQueryKey(),
      { ...userPreferences, mutes: { ...userPreferences.mutes } },
    );
  const setSounds = () =>
    test.queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      { ...soundSettings },
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
