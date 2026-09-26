import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAudioPlaybackPool } from "./audio-playback-pool";

const audioInstances: AudioMock[] = [];

const unavailableUrls = new Set<string>();

const playedUrls: string[] = [];

class AudioMock {
  currentTime = 8;
  error: Pick<MediaError, "code"> | null = null;
  onended: (() => void) | null = null;
  playbackRate = 1;
  preservesPitch = true;
  preload = "";
  src: string;
  volume = 1;
  readonly load = vi.fn<() => void>(() => {
    this.error = unavailableUrls.has(this.src) ? { code: 4 } : null;
  });
  readonly pause = vi.fn<() => void>();
  readonly play = vi.fn<() => Promise<void>>(() => {
    if (this.error) {
      return Promise.reject(
        new DOMException("Unavailable media", "NotSupportedError"),
      );
    }

    playedUrls.push(this.src);

    return Promise.resolve();
  });
  readonly removeAttribute = vi.fn<(attribute: string) => void>(
    (attribute: string) => {
      if (attribute === "src") this.src = "";
    },
  );

  constructor(src = "") {
    this.src = src;
    audioInstances.push(this);
  }
}

describe("createAudioPlaybackPool", () => {
  beforeEach(() => {
    audioInstances.length = 0;
    unavailableUrls.clear();
    playedUrls.length = 0;
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

  it("plays a custom sound after its earlier preload failed and the host recovered", async () => {
    const pool = createAudioPlaybackPool();
    const url = "https://audio.test/custom-elite.mp3";
    unavailableUrls.add(url);
    pool.preload(url);

    unavailableUrls.delete(url);
    const freshPreview = new AudioMock(url);
    freshPreview.load();
    await freshPreview.play();

    pool.play({ url, volume: 0.6 });
    await Promise.resolve();

    expect(playedUrls).toEqual([url, url]);
  });

  it("does not interrupt a different URL playing at the same time", () => {
    const pool = createAudioPlaybackPool();

    pool.play({ url: "notification.mp3", volume: 0.4 });
    pool.play({ url: "detector.mp3", volume: 0.8 });

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
