export const queryKeys = {
  guilds: () => ["user-guilds"] as const,
  timers: (world?: string) => ["guild-timers", world] as const,
  allTimers: () => ["guild-timers"] as const,
};
