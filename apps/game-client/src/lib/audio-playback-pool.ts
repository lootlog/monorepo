const DEFAULT_MAX_CACHED_AUDIO = 16;

export type AudioPlaybackRequest = {
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

  const audioByUrl = new Map<string, CachedAudio>();
  const activeAudioByUrl = new Map<string, HTMLAudioElement>();

  const removeCachedAudio = (url: string, cachedAudio: CachedAudio) => {
    audioByUrl.delete(url);

    if (activeAudioByUrl.get(url) === cachedAudio.audio) {
      activeAudioByUrl.delete(url);
    }

    releaseAudio(cachedAudio.audio);
  };

  const enforceCacheLimit = () => {
    while (audioByUrl.size > maxCachedAudio) {
      const oldestEntry = audioByUrl.entries().next().value;

      if (!oldestEntry) return;
      removeCachedAudio(oldestEntry[0], oldestEntry[1]);
    }
  };

  const getOrCreateAudio = (url: string) => {
    const cachedAudio = audioByUrl.get(url);

    if (cachedAudio) {
      audioByUrl.delete(url);
      audioByUrl.set(url, cachedAudio);

      return cachedAudio.audio;
    }

    const audio = new Audio(url);
    audio.preload = "auto";
    audio.load();
    audioByUrl.set(url, { audio });
    enforceCacheLimit();

    return audio;
  };

  const preload = (url: string) => {
    getOrCreateAudio(url);
  };

  const play = ({
    playbackRate = 1,
    preservesPitch = true,
    url,
    volume,
  }: AudioPlaybackRequest) => {
    const activeAudio = activeAudioByUrl.get(url);

    if (activeAudio) {
      activeAudio.pause();
      resetPlaybackPosition(activeAudio);
    }

    const audio = getOrCreateAudio(url);

    if (audio.error) {
      audio.load();
    }

    resetPlaybackPosition(audio);
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audio.preservesPitch = preservesPitch;
    activeAudioByUrl.set(url, audio);
    audio.onended = () => {
      if (activeAudioByUrl.get(url) === audio) {
        activeAudioByUrl.delete(url);
      }
    };

    audio.play().catch(() => {});
  };

  const dispose = () => {
    for (const cachedAudio of audioByUrl.values()) {
      releaseAudio(cachedAudio.audio);
    }

    audioByUrl.clear();
    activeAudioByUrl.clear();
  };

  return { dispose, play, preload };
};
