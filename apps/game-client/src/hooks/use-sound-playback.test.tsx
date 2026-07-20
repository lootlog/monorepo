import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { useSoundPlayback } from "./use-sound-playback";

const mocks = vi.hoisted(() => ({
  cachedSettings: undefined as unknown,
  soundSettings: {
    userId: "user-1",
    masterVolume: 0.5,
    notificationsVolume: 0.5,
    detectorVolume: 0,
    timersVolume: 0,
    pingsVolume: 0,
    notificationsConfig: {
      message: { volume: 0.5, soundUrl: "" },
    },
    detectorConfig: {},
    timersConfig: {},
  },
}));

vi.mock("@/hooks/api/use-sound-settings", () => ({
  useSoundSettings: () => ({ data: mocks.soundSettings }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: () => mocks.cachedSettings,
  }),
}));

vi.mock("@/lib/api/generated-helpers", () => ({
  normalizeSoundSettings: (settings: unknown) => settings,
}));

vi.mock("@/lib/api/generated/main/sound-settings/sound-settings", () => ({
  getSoundSettingsControllerGetSettingsQueryKey: () => ["sound-settings"],
}));

const audioInstances: AudioMock[] = [];

class AudioMock {
  currentTime = 3;
  onended: (() => void) | null = null;
  playbackRate = 1;
  preservesPitch = true;
  preload = "";
  src: string;
  volume = 1;
  readonly load = vi.fn();
  readonly pause = vi.fn();
  readonly play = vi.fn<() => Promise<void>>().mockResolvedValue();
  readonly removeAttribute = vi.fn((attribute: string) => {
    if (attribute === "src") this.src = "";
  });

  constructor(src = "") {
    this.src = src;
    audioInstances.push(this);
  }
}

describe("useSoundPlayback", () => {
  beforeEach(() => {
    audioInstances.length = 0;
    mocks.cachedSettings = undefined;
    mocks.soundSettings.notificationsConfig.message.soundUrl = "";
    delete (
      mocks.soundSettings.notificationsConfig as Record<
        string,
        { volume: number; soundUrl: string }
      >
    ).HERO;
    vi.stubGlobal("Audio", AudioMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preloads after the first interaction and reuses the media element", () => {
    const { result, unmount } = renderHook(() => useSoundPlayback());

    expect(audioInstances).toHaveLength(0);

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.src).toBe(DEFAULT_SOUND_URLS.message);
    expect(audioInstances[0]?.preload).toBe("auto");

    act(() => {
      result.current.playSound("notifications", "message");
      result.current.playSound("notifications", "message");
    });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.load).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(2);
    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);

    unmount();

    expect(audioInstances[0]?.removeAttribute).toHaveBeenCalledWith("src");
    expect(audioInstances[0]?.onended).toBeNull();
  });

  it("shares one cached media element across hook consumers", () => {
    const first = renderHook(() => useSoundPlayback());
    const second = renderHook(() => useSoundPlayback());

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    expect(audioInstances).toHaveLength(1);

    first.unmount();
    expect(audioInstances[0]?.removeAttribute).not.toHaveBeenCalled();

    second.unmount();
    expect(audioInstances[0]?.removeAttribute).toHaveBeenCalledWith("src");
  });

  it("plays one sound when different settings keys resolve to the same URL", () => {
    mocks.soundSettings.notificationsConfig.message.soundUrl =
      "shared-notification.mp3";
    const notificationsConfig = mocks.soundSettings
      .notificationsConfig as Record<
      string,
      { volume: number; soundUrl: string }
    >;
    notificationsConfig.HERO = {
      volume: 0.5,
      soundUrl: "shared-notification.mp3",
    };
    const { result, unmount } = renderHook(() => useSoundPlayback());

    act(() => {
      result.current.playSounds("notifications", ["message", "HERO"]);
    });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.src).toBe("shared-notification.mp3");
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(1);

    unmount();
  });
});
