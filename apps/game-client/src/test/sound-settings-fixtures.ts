import type { SoundSettingsResponseDto } from "@lootlog/client/main";
export const createSoundSettings = (
  overrides: Partial<SoundSettingsResponseDto> = {},
): SoundSettingsResponseDto => ({
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
