import type { NpcTypeSoundConfig } from "@lootlog/schema/sound-settings";

export const DEFAULT_SOUND_URLS = {
  message: "https://gordion.margonem.pl/sounds/new_mail.mp3",
  ELITE2: "https://cronus.margonem.com/sounds/elite2_here.mp3",
  HERO: "https://cronus.margonem.com/sounds/heroes_here.mp3",
  EVENT_HERO: "https://cronus.margonem.com/sounds/heroes_here.mp3",
  COLOSSUS: "https://cronus.margonem.com/sounds/heroes_here.mp3",
  TITAN: "https://cronus.margonem.com/sounds/heroes_here.mp3",
  HERO_TRACKER: "https://cronus.margonem.com/sounds/heroes_here.mp3",
  ELITE3: "https://cronus.margonem.com/sounds/elite2_here.mp3",
  timerReady: "https://gordion.margonem.pl/sounds/new_mail.mp3",
  mapPing: "https://gordion.margonem.pl/sounds/new_mail.mp3",
};

const isDefaultSoundKey = (
  key: string,
): key is keyof typeof DEFAULT_SOUND_URLS =>
  Object.hasOwn(DEFAULT_SOUND_URLS, key);

const getDefaultSoundUrl = (key: string): string | undefined =>
  isDefaultSoundKey(key) ? DEFAULT_SOUND_URLS[key] : undefined;

type SoundConfig = Readonly<Record<string, Partial<NpcTypeSoundConfig>>>;

/** The sound a key plays while the player has not given it its own. */
export const getFallbackSoundUrl = (
  config: SoundConfig | undefined,
  key: string,
): string | undefined =>
  // Event heroes played the hero sound; they keep the one a player chose.
  key === "EVENT_HERO"
    ? resolveSoundUrl(config, "HERO")
    : getDefaultSoundUrl(key);

export const resolveSoundUrl = (
  config: SoundConfig | undefined,
  key: string,
): string | undefined =>
  config?.[key]?.soundUrl || getFallbackSoundUrl(config, key);
