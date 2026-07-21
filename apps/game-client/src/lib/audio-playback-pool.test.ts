import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAudioPlaybackPool } from "./audio-playback-pool";

const audioInstances: AudioMock[] = [];

class AudioMock {
  currentTime = 8;
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

describe("createAudioPlaybackPool", () => {
  beforeEach(() => {
    audioInstances.length = 0;
    vi.stubGlobal("Audio", AudioMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preloads a URL once and reuses the same audio element for playback", () => {
    const pool = createAudioPlaybackPool();

    pool.preload("sound.mp3");
    pool.preload("sound.mp3");
    pool.play({ url: "sound.mp3", volume: 0.4 });
    pool.play({ url: "sound.mp3", volume: 0.6 });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.preload).toBe("auto");
    expect(audioInstances[0]?.load).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(2);
    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.currentTime).toBe(0);
    expect(audioInstances[0]?.volume).toBe(0.6);
  });

  it("keeps preview playback isolated from regular playback", () => {
    const pool = createAudioPlaybackPool();

    pool.play({ channel: "regular", url: "sound.mp3", volume: 0.4 });
    pool.play({ channel: "preview", url: "sound.mp3", volume: 0.8 });

    expect(audioInstances).toHaveLength(2);
    expect(audioInstances[0]?.pause).not.toHaveBeenCalled();
    expect(audioInstances[1]?.volume).toBe(0.8);
  });

  it("does not interrupt a different URL playing on the same channel", () => {
    const pool = createAudioPlaybackPool();

    pool.play({ channel: "regular", url: "notification.mp3", volume: 0.4 });
    pool.play({ channel: "regular", url: "detector.mp3", volume: 0.8 });

    expect(audioInstances).toHaveLength(2);
    expect(audioInstances[0]?.pause).not.toHaveBeenCalled();
    expect(audioInstances[1]?.play).toHaveBeenCalledTimes(1);
  });

  it("evicts least-recently-used audio elements above the cache limit", () => {
    const pool = createAudioPlaybackPool({ maxCachedAudio: 2 });

    pool.preload("first.mp3");
    pool.preload("second.mp3");
    pool.preload("third.mp3");

    expect(audioInstances).toHaveLength(3);
    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.removeAttribute).toHaveBeenCalledWith("src");
  });

  it("releases cached media resources on disposal", () => {
    const pool = createAudioPlaybackPool();

    pool.play({ url: "sound.mp3", volume: 0.4 });
    pool.dispose();

    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    expect(audioInstances[0]?.onended).toBeNull();
    expect(audioInstances[0]?.removeAttribute).toHaveBeenCalledWith("src");
  });
});
