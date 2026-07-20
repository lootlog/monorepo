const DEFAULT_CHANNEL = "regular";
const DEFAULT_MAX_CACHED_AUDIO = 16;

export type AudioPlaybackRequest = {
  channel?: string;
  playbackRate?: number;
  preservesPitch?: boolean;
  url: string;
  volume: number;
};

type AudioPlaybackPoolOptions = {
  maxCachedAudio?: number;
};

type CachedAudio = {
  audio: HTMLAudioElement;
};

const resetPlaybackPosition = (audio: HTMLAudioElement) => {
  try {
    audio.currentTime = 0;
  } catch {
    // Some media implementations reject seeking before metadata is available.
  }
};

const releaseAudio = (audio: HTMLAudioElement) => {
  audio.pause();
  audio.onended = null;
  resetPlaybackPosition(audio);
  audio.removeAttribute("src");
  audio.load();
};

export const createAudioPlaybackPool = (
  options: AudioPlaybackPoolOptions = {},
) => {
  const maxCachedAudio = Math.max(
    1,
    options.maxCachedAudio ?? DEFAULT_MAX_CACHED_AUDIO,
  );
  const audioByCacheKey = new Map<string, CachedAudio>();
  const activeAudioByCacheKey = new Map<string, HTMLAudioElement>();

  const getCacheKey = (channel: string, url: string) =>
    `${channel}\u0000${url}`;

  const removeCachedAudio = (cacheKey: string, cachedAudio: CachedAudio) => {
    audioByCacheKey.delete(cacheKey);
    if (activeAudioByCacheKey.get(cacheKey) === cachedAudio.audio) {
      activeAudioByCacheKey.delete(cacheKey);
    }
    releaseAudio(cachedAudio.audio);
  };

  const enforceCacheLimit = () => {
    while (audioByCacheKey.size > maxCachedAudio) {
      const oldestEntry = audioByCacheKey.entries().next().value;
      if (!oldestEntry) return;
      removeCachedAudio(oldestEntry[0], oldestEntry[1]);
    }
  };

  const getOrCreateAudio = (url: string, channel: string) => {
    const cacheKey = getCacheKey(channel, url);
    const cachedAudio = audioByCacheKey.get(cacheKey);
    if (cachedAudio) {
      audioByCacheKey.delete(cacheKey);
      audioByCacheKey.set(cacheKey, cachedAudio);
      return cachedAudio.audio;
    }

    const audio = new Audio(url);
    audio.preload = "auto";
    audio.load();
    audioByCacheKey.set(cacheKey, { audio });
    enforceCacheLimit();
    return audio;
  };

  const preload = (url: string, channel = DEFAULT_CHANNEL) => {
    getOrCreateAudio(url, channel);
  };

  const play = ({
    channel = DEFAULT_CHANNEL,
    playbackRate = 1,
    preservesPitch = true,
    url,
    volume,
  }: AudioPlaybackRequest) => {
    const cacheKey = getCacheKey(channel, url);
    const activeAudio = activeAudioByCacheKey.get(cacheKey);
    if (activeAudio) {
      activeAudio.pause();
      resetPlaybackPosition(activeAudio);
    }

    const audio = getOrCreateAudio(url, channel);
    resetPlaybackPosition(audio);
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audio.preservesPitch = preservesPitch;
    activeAudioByCacheKey.set(cacheKey, audio);
    audio.onended = () => {
      if (activeAudioByCacheKey.get(cacheKey) === audio) {
        activeAudioByCacheKey.delete(cacheKey);
      }
    };
    audio.play().catch(() => {});
  };

  const dispose = () => {
    for (const cachedAudio of audioByCacheKey.values()) {
      releaseAudio(cachedAudio.audio);
    }
    audioByCacheKey.clear();
    activeAudioByCacheKey.clear();
  };

  return { dispose, play, preload };
};
