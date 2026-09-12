import type { UserSoundSettings } from "@lootlog/schema/sound-settings";
import {
  seedSettingsDocumentValues,
  soundSettingValues,
} from "@/test/settings-documents-fixtures";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { queryClient } from "@/lib/query-client";
import { useSettingsStore } from "@/store/settings.store";
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
  readonly load = vi.fn<() => void>();
  readonly pause = vi.fn<() => void>();
  readonly play = vi.fn<() => Promise<void>>().mockResolvedValue();
  readonly removeAttribute = vi.fn<(attribute: string) => void>(
    (attribute: string) => {
      if (attribute === "src") this.src = "";
    },
  );

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
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    audioInstances.length = 0;
    vi.stubGlobal("Audio", AudioMock);
  });

  afterEach(() => {
    disposeSoundPlayback();
    vi.unstubAllGlobals();
  });

  it("plays a map ping using settings from the generated query cache", () => {
    seedSettingsDocumentValues(
      queryClient,
      soundSettingValues(createSoundSettings()),
    );

    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.src).toBe(DEFAULT_SOUND_URLS.mapPing);
    expect(audioInstances[0]?.volume).toBe(0.4);
    expect(audioInstances[0]?.preload).toBe("auto");
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it("reuses the preloaded media element for repeated pings", () => {
    seedSettingsDocumentValues(
      queryClient,
      soundSettingValues(createSoundSettings()),
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
    seedSettingsDocumentValues(
      queryClient,
      soundSettingValues(createSoundSettings({ pingsVolume: 0 })),
    );

    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(0);
  });

  it("uses device-local master volume instead of the server value", () => {
    seedSettingsDocumentValues(
      queryClient,
      soundSettingValues(createSoundSettings({ masterVolume: 0.1 })),
    );
    useSettingsStore.getState().setMasterVolume(0.75);

    playSound("pings", "mapPing");

    expect(audioInstances[0]?.volume).toBeCloseTo(0.6);
  });

  it("stays silent when quick mute is enabled without changing volume", () => {
    seedSettingsDocumentValues(
      queryClient,
      soundSettingValues(createSoundSettings()),
    );
    useSettingsStore.getState().setMasterVolume(0.75);
    useSettingsStore.getState().toggleSoundsMuted();

    playSound("pings", "mapPing");

    expect(audioInstances).toHaveLength(0);
    expect(useSettingsStore.getState().masterVolume).toBe(0.75);
  });

  it("applies a contextual ping playback profile", () => {
    seedSettingsDocumentValues(
      queryClient,
      soundSettingValues(createSoundSettings()),
    );

    playSound("pings", "mapPing", {
      playbackRate: 1.35,
      preservesPitch: false,
    });

    expect(audioInstances[0]?.playbackRate).toBe(1.35);
    expect(audioInstances[0]?.preservesPitch).toBe(false);
  });
});
