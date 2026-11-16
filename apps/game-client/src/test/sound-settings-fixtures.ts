import type { StoredSoundSettings } from "@/lib/api/generated-helpers";
import type { UserSoundSettings } from "@lootlog/schema/sound-settings";

type SoundCategoryConfig = UserSoundSettings["notificationsConfig"] | null;

export type SoundSettingsFixture = Omit<
  StoredSoundSettings,
  "notificationsConfig" | "detectorConfig" | "timersConfig"
> & {
  notificationsConfig: SoundCategoryConfig;
  detectorConfig: SoundCategoryConfig;
  timersConfig: SoundCategoryConfig;
};

export const createSoundSettings = (
  overrides: Partial<SoundSettingsFixture> = {},
): SoundSettingsFixture => ({
  userId: "user",
  masterVolume: 0,
  notificationsVolume: 0,
  detectorVolume: 0,
  timersVolume: 0,
  pingsVolume: 0,
  notificationsConfig: null,
  detectorConfig: null,
  timersConfig: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});
