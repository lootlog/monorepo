import type { SoundSettings } from "@/lib/settings-persistence/use-sound-settings";

type SoundCategoryConfig = SoundSettings["notificationsConfig"] | null;

export type SoundSettingsFixture = Omit<
  SoundSettings,
  "notificationsConfig" | "detectorConfig" | "timersConfig"
> & {
  notificationsConfig: SoundCategoryConfig;
  detectorConfig: SoundCategoryConfig;
  timersConfig: SoundCategoryConfig;
};

export const createSoundSettings = (
  overrides: Partial<SoundSettingsFixture> = {},
): SoundSettingsFixture => ({
  notificationsVolume: 0,
  detectorVolume: 0,
  timersVolume: 0,
  pingsVolume: 0,
  notificationsConfig: null,
  detectorConfig: null,
  timersConfig: null,
  ...overrides,
});
