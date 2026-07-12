import type { UserSoundSettings } from "@lootlog/types";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@/lib/api/generated/main/sound-settings/sound-settings";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { queryClient } from "@/lib/query-client";
import { playSound } from "./sound-playback";

const audioInstances: AudioMock[] = [];

class AudioMock {
  volume = 1;
  onended: (() => void) | null = null;
  readonly pause = vi.fn();
  readonly play = vi.fn<() => Promise<void>>().mockResolvedValue();

  constructor(readonly src: string) {
    audioInstances.push(this);
  }
}

const createSoundSettings = (
  overrides: Partial<UserSoundSettings> = {},
): UserSoundSettings => ({
  userId: "user-1",
  masterVolume: 0.5,
  notificationsVolume: 0.5,
  detectorVolume: 0.5,
  timersVolume: 0.5,
  pingsVolume: 0.8,
  notificationsConfig: {},
  detectorConfig: {},
  timersConfig: {},
  ...overrides,
});

describe("playSound", () => {
  beforeEach(() => {
    queryClient.clear();
    audioInstances.length = 0;
    vi.stubGlobal("Audio", AudioMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays a map ping using settings from the generated query cache", () => {
    queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings(),
    );

    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.src).toBe(DEFAULT_SOUND_URLS.mapPing);
    expect(audioInstances[0]?.volume).toBe(0.4);
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it("stays silent when ping sounds are muted", () => {
    queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings({ pingsVolume: 0 }),
    );

    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(0);
  });
});
