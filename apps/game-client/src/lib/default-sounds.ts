import type {
  NpcTypeSoundConfig,
  SoundSettings,
} from "@/lib/settings-persistence/use-sound-settings";

export type SoundCategory = "notifications" | "detector" | "timers" | "pings";

export type ConfigurableSoundCategory = Exclude<SoundCategory, "pings">;

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

const getFallbackSoundUrl = (
  config: SoundConfig | undefined,
  key: string,
): string | undefined =>
  key === "EVENT_HERO"
    ? resolveSoundUrl(config, "HERO")
    : getDefaultSoundUrl(key);

const resolveSoundUrl = (
  config: SoundConfig | undefined,
  key: string,
): string | undefined =>
  config?.[key]?.soundUrl || getFallbackSoundUrl(config, key);

export const getCategoryFallbackSoundUrl = (
  category: ConfigurableSoundCategory,
  config: SoundConfig | undefined,
  key: string,
): string | undefined =>
  category === "timers"
    ? DEFAULT_SOUND_URLS.timerReady
    : getFallbackSoundUrl(config, key);

export const resolveCategorySoundUrl = (
  settings: SoundSettings,
  category: SoundCategory,
  key: string,
): string | undefined => {
  if (category === "pings") return getDefaultSoundUrl(key);
  const config = settings[`${category}Config`];

  return (
    config[key]?.soundUrl || getCategoryFallbackSoundUrl(category, config, key)
  );
};
