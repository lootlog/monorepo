export type SoundCategory = "notifications" | "detector" | "timers" | "pings";

/** Categories shown in the settings; timers stay hidden until supported. */
export type VisibleSoundCategory = Exclude<SoundCategory, "timers">;

/** Categories with one configurable sound url per NPC type. */
export type ConfigurableSoundCategory = Exclude<VisibleSoundCategory, "pings">;
