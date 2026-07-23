import type { UserSoundSettings } from "@lootlog/types";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@lootlog/api-client/react-query/main/sound-settings";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { queryClient } from "@/lib/query-client";
import { disposeSoundPlayback, playSound } from "./sound-playback";

const audioInstances: AudioMock[] = [];

class AudioMock {
  currentTime = 4;
  volume = 1;
  playbackRate = 1;
  preservesPitch = true;
  preload = "";
  src: string;
  onended: (() => void) | null = null;
  readonly load = vi.fn();
  readonly pause = vi.fn();
  readonly play = vi.fn<() => Promise<void>>().mockResolvedValue();
  readonly removeAttribute = vi.fn((attribute: string) => {
    if (attribute === "src") this.src = "";
  });

  constructor(src: string) {
    this.src = src;
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
    disposeSoundPlayback();
    queryClient.clear();
    audioInstances.length = 0;
    vi.stubGlobal("Audio", AudioMock);
  });

  afterEach(() => {
    disposeSoundPlayback();
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
    expect(audioInstances[0]?.preload).toBe("auto");
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it("reuses the preloaded media element for repeated pings", () => {
    queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings(),
    );

    playSound("pings", "mapPing");
    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.load).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(2);
    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.currentTime).toBe(0);
  });

  it("stays silent when ping sounds are muted", () => {
    queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings({ pingsVolume: 0 }),
    );

    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(0);
  });

  it("applies a contextual ping playback profile", () => {
    queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings(),
    );

    playSound("pings", "mapPing", {
      playbackRate: 1.35,
      preservesPitch: false,
    });

    expect(audioInstances[0]?.playbackRate).toBe(1.35);
    expect(audioInstances[0]?.preservesPitch).toBe(false);
  });
});
