import {
  createAudioPlaybackPool,
  type AudioPlaybackRequest,
} from "@/lib/audio-playback-pool";

const audioPlaybackPool = createAudioPlaybackPool();
let audioPlaybackConsumers = 0;

export const preloadSoundUrl = (url: string, channel?: string) => {
  audioPlaybackPool.preload(url, channel);
};

export const playSoundRequest = (request: AudioPlaybackRequest) => {
  audioPlaybackPool.play(request);
};

export const acquireSoundPlayback = () => {
  audioPlaybackConsumers += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    audioPlaybackConsumers = Math.max(0, audioPlaybackConsumers - 1);
    if (audioPlaybackConsumers === 0) {
      audioPlaybackPool.dispose();
    }
  };
};

export const disposeSoundPlayback = () => {
  audioPlaybackPool.dispose();
};
