type SoundCategory = "notifications" | "detector" | "timers" | "pings";

export type VisibleSoundCategory = Exclude<SoundCategory, "timers">;

export type ConfigurableSoundCategory = Exclude<VisibleSoundCategory, "pings">;
