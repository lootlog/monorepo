const ME_SCOPE = "@me" as const;
export const queryKeys = {
  auth: {
    scopes: () => ["auth-scopes"] as const,
    session: () => ["session"] as const,
    token: () => ["auth-token"] as const,
  },
  events: {
    heroActiveGaps: (
      guildId: string | undefined,
      eventId: string,
      heroId: string,
    ) => ["hero-active-gaps", guildId, eventId, heroId] as const,
    heroActiveGapsRoot: () => ["hero-active-gaps"] as const,
    heroCoverageGaps: (
      guildId: string | undefined,
      eventId: string,
      heroId: string,
    ) => ["hero-coverage-gaps", guildId, eventId, heroId] as const,
    heroKillHistoryRoot: (guildId: string, eventId: string) =>
      ["hero-kill-history", guildId, eventId] as const,
    heroPresenceStats: (
      guildId: string | undefined,
      eventId: string,
      heroId: string,
    ) => ["hero-presence-stats", guildId, eventId, heroId] as const,
    heroRespawnConfig: (
      guildId: string | undefined,
      eventId: string,
      heroId: string,
    ) => ["hero-respawn-config", guildId, eventId, heroId] as const,
    heroStats: (guildId: string, eventId: string) =>
      ["event-hero-stats", guildId, eventId] as const,
    heroTimers: (
      guildId: string | undefined,
      eventId: string,
      world?: string,
    ) =>
      world === undefined
        ? (["event-hero-timers", guildId, eventId] as const)
        : (["event-hero-timers", guildId, eventId, world] as const),
    killDetail: (
      guildId: string,
      eventId: string,
      heroId: string,
      killId: string,
    ) => ["kill-detail", guildId, eventId, heroId, killId] as const,
    killDetailRoot: (guildId: string, eventId: string) =>
      ["kill-detail", guildId, eventId] as const,
    killHistory: (
      guildId: string,
      eventId: string,
      heroId: string | undefined,
      limit: number,
    ) => ["event-kill-history", guildId, eventId, heroId, limit] as const,
    killHistoryRoot: (guildId: string, eventId: string) =>
      ["event-kill-history", guildId, eventId] as const,
    killTimeline: (
      guildId: string | undefined,
      eventId: string,
      heroId: string,
      killId: string,
    ) => ["kill-timeline", guildId, eventId, heroId, killId] as const,
    list: (
      guildId: string | undefined,
      world: string | undefined,
      activeOnly: boolean | undefined,
    ) => ["events", guildId, world, activeOnly] as const,
    listByGuild: (guildId: string | undefined) => ["events", guildId] as const,
    loots: (
      guildId: string,
      npcNamesKey: string,
      world: string,
      limit: number,
    ) => ["event-loots", guildId, npcNamesKey, world, limit] as const,
    maps: (guildId: string | undefined, eventId: string) =>
      ["event-maps", guildId, eventId] as const,
    mapActiveGap: (
      guildId: string | undefined,
      eventId: string,
      mapId: string,
    ) => ["map-active-gap", guildId, eventId, mapId] as const,
    mapActiveGapRoot: (guildId: string | undefined, eventId: string) =>
      ["map-active-gap", guildId, eventId] as const,
    mapCoverageGaps: (
      guildId: string | undefined,
      eventId: string,
      mapId: string,
    ) => ["map-coverage-gaps", guildId, eventId, mapId] as const,
    matchingLoots: (
      guildId: string | undefined,
      createdAtMin: string,
      createdAtMax: string,
      npcName: string,
    ) =>
      ["matching-loots", guildId, createdAtMin, createdAtMax, npcName] as const,
    memberKillHistory: (
      guildId: string,
      eventId: string,
      memberId: string,
      heroId: string | undefined,
      limit: number,
    ) =>
      [
        "event-member-kill-history",
        guildId,
        eventId,
        memberId,
        heroId,
        limit,
      ] as const,
    memberKillHistoryRoot: (guildId: string, eventId: string) =>
      ["event-member-kill-history", guildId, eventId] as const,
    overview: (guildId: string | undefined, eventId: string) =>
      ["event-overview", guildId, eventId] as const,
    participationConfirmations: (guildId: string, eventId: string) =>
      ["event-participation-confirmations", guildId, eventId] as const,
    ranking: (guildId: string, eventId: string) =>
      ["event-ranking", guildId, eventId] as const,
    rankingEditHistory: (
      guildId: string,
      eventId: string,
      rankingId?: string,
    ) =>
      rankingId === undefined
        ? (["ranking-edit-history", guildId, eventId] as const)
        : (["ranking-edit-history", guildId, eventId, rankingId] as const),
    recentHeroKills: (
      guildId: string,
      eventId: string,
      heroId: string | undefined,
      limit: number,
    ) => ["recent-hero-kills", guildId, eventId, heroId, limit] as const,
    recentHeroKillsRoot: (guildId: string, eventId: string) =>
      ["recent-hero-kills", guildId, eventId] as const,
    settings: (guildId: string) => ["event-settings", guildId] as const,
    wrapped: (guildId: string | undefined, eventId: string) =>
      ["event-wrapped", guildId, eventId] as const,
  },
  gameData: {
    gameMaps: () => ["game-maps"] as const,
    guildTimers: (world: string | undefined, guildId: string | undefined) =>
      ["guild-timers", world, guildId] as const,
    itemByHid: (
      hid: string | undefined,
      world: string | undefined,
      guildId: string | undefined,
    ) => ["item-by-hid", hid, world, guildId] as const,
    worlds: (guildId: string | undefined) => ["guild-worlds", guildId] as const,
  },
  guilds: {
    current: (guildId: string | undefined) => ["guilds", guildId] as const,
    discordSync: (guildId: string | undefined) =>
      ["guild-discord-sync", guildId] as const,
    lootlogConfig: (guildId: string | undefined) =>
      ["guild-lootlog-config", guildId] as const,
    manageable: () => ["manageable-guilds"] as const,
    mapTemplates: (guildId: string | undefined) =>
      ["map-templates", guildId] as const,
    notificationAvailableTargets: (guildId: string) =>
      ["guild-notification-available-targets", guildId] as const,
    notificationJobs: (guildId: string) =>
      ["guild-notification-jobs", guildId] as const,
    notifications: (guildId: string | undefined) =>
      ["guild-notifications", guildId] as const,
    permissions: (guildId: string | undefined) =>
      ["guild-permissions-v2", guildId] as const,
    roles: (guildId: string | undefined) => ["guild-roles", guildId] as const,
    user: () => ["user-guilds"] as const,
  },
  loots: {
    comments: (guildId: string | undefined, lootId: number | undefined) =>
      ["loot-comments", guildId, lootId] as const,
    detail: (
      guildId: string | undefined,
      lootId: string | number | null | undefined,
    ) => ["loot", guildId, lootId] as const,
    list: (guildId: string | undefined, queryString: string) =>
      ["loots", guildId, queryString] as const,
    listByGuild: (guildId: string | undefined) => ["loots", guildId] as const,
  },
  members: {
    current: (guildId: string | undefined) =>
      ["member", guildId, ME_SCOPE] as const,
    detailPrefix: (guildId: string | undefined) => ["member", guildId] as const,
    latestRefreshJob: (guildId: string | undefined) =>
      ["latest-refresh-job", guildId] as const,
    list: (guildId: string | undefined, includeInactive?: boolean) =>
      includeInactive === undefined
        ? (["members", guildId] as const)
        : (["members", guildId, includeInactive] as const),
    refreshJob: (guildId: string | undefined, jobId: number | undefined) =>
      ["refresh-job", guildId, jobId] as const,
  },
  notifications: {
    user: () => ["user-notifications"] as const,
  },
  reservations: {
    all: (guildId: string | undefined) => ["reservations", guildId] as const,
    cards: (guildId: string | undefined) =>
      ["reservations-cards", guildId] as const,
  },
  stats: {
    npcKills: (queryString: string) => ["npc-kills", queryString] as const,
    playerKillStats: (queryString: string) =>
      ["player-kill-stats", queryString] as const,
  },
  user: {
    preferences: () => ["user-preferences"] as const,
  },
} as const;

export const mutationKeys = {
  account: {
    delete: () => ["delete-account"] as const,
  },
  guilds: {
    updateConfig: () => ["update-guild-config"] as const,
    updateLootlogNpc: () => ["update-guild-lootlog-npc"] as const,
    updateRole: () => ["update-guild-role"] as const,
  },
  reservations: {
    create: (guildId: string | undefined) =>
      ["reservations-create", guildId] as const,
    delete: (guildId: string | undefined) =>
      ["reservations-delete", guildId] as const,
  },
  user: {
    updatePreferences: () => ["update-user-preferences"] as const,
  },
} as const;
