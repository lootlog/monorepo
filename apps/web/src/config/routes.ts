const USER_BASE = "/@me";

const ROUTES = {
  signin: "/signin",
  init: "/init",

  user: {
    base: USER_BASE,
    dashboard: USER_BASE,
    battlePanel: {
      base: `${USER_BASE}/battle-panel`,
      statistics: `${USER_BASE}/battle-panel/statistics`,
      abyss: `${USER_BASE}/battle-panel/abyss`,
      h2h: `${USER_BASE}/battle-panel/statistics/h2h`,
      matchmakingH2h: `${USER_BASE}/battle-panel/abyss/h2h`,
      playerVsPlayer: (myId: string, opponentId: string) =>
        `${USER_BASE}/battle-panel/statistics/player-vs-player/${myId}/${opponentId}`,
      battle: (battleId: string) =>
        `${USER_BASE}/battle-panel/battles/${battleId}`,
    },
    settings: {
      base: `${USER_BASE}/settings`,
      appearance: `${USER_BASE}/settings/appearance`,
      account: `${USER_BASE}/settings/account`,
      servers: `${USER_BASE}/settings/servers`,
    },
    notifications: {
      base: `${USER_BASE}/notifications`,
    },
  },

  guild: {
    base: (guildId: string) => `/${guildId}`,
    lootlog: (guildId: string) => `/${guildId}`,
    timers: (guildId: string) => `/${guildId}/timers`,
    stats: (guildId: string) => `/${guildId}/stats`,
    statsKills: (guildId: string) => `/${guildId}/stats/kills`,
    statsLoots: (guildId: string) => `/${guildId}/stats/loots`,
    statsNpcs: (guildId: string) => `/${guildId}/stats/npcs`,
    statsNpcKillers: (guildId: string, npcId: string) =>
      `/${guildId}/stats/npcs/${npcId}`,
    reservations: {
      base: (guildId: string) => `/${guildId}/reservations`,
      reservationId: (guildId: string, reservationId: string) =>
        `/${guildId}/reservations/${reservationId}`,
    },
    docs: {
      base: (guildId: string) => `/${guildId}/docs`,
      document: (guildId: string, docId: string) => `/${guildId}/docs/${docId}`,
    },
    activityLogs: (guildId: string) => `/${guildId}/activity-logs`,
    events: (guildId: string) => `/${guildId}/events`,
    notifications: {
      base: (guildId: string) => `/${guildId}/notifications`,
      create: (guildId: string) => `/${guildId}/notifications/create`,
      rule: (guildId: string, ruleId: string) =>
        `/${guildId}/notifications/${ruleId}`,
      history: (guildId: string) => `/${guildId}/notifications/history`,
    },
    settings: {
      base: (guildId: string) => `/${guildId}/settings`,
      roles: (guildId: string) => `/${guildId}/settings/roles`,
      role: (guildId: string, roleId: string) =>
        `/${guildId}/settings/roles/${roleId}`,
      npcs: (guildId: string) => `/${guildId}/settings/npcs`,
      npc: (guildId: string, npcId: string) =>
        `/${guildId}/settings/npcs/${npcId}`,
      mapTemplates: (guildId: string) => `/${guildId}/settings/map-templates`,
      reservationsSettings: (guildId: string) =>
        `/${guildId}/settings/reservations`,
      members: (guildId: string) => `/${guildId}/settings/members`,
      member: (guildId: string, memberId: string) =>
        `/${guildId}/settings/members/${memberId}`,
      info: (guildId: string) => `/${guildId}/settings/info`,
      appearance: (guildId: string) => `/${guildId}/settings/appearance`,
      servers: (guildId: string) => `/${guildId}/settings/servers`,
    },
  },

  public: {
    battle: (battleId: string) => `/battles/${battleId}`,
  },
} as const;

const ROUTE_SEGMENTS = {
  user: {
    base: "/@me",
    battlePanel: "/battle-panel",
    settings: "/settings",
    notifications: "/notifications",
    appearance: "/appearance",
    account: "/account",
    servers: "/servers",
  },
  guild: {
    timers: "/timers",
    reservations: "/reservations",
    docs: "/docs",
    stats: "/stats",
    statsKills: "/stats/kills",
    statsLoots: "/stats/loots",
    events: "/events",
    notifications: "/notifications",
    settings: "/settings",
    roles: "/roles",
    npcs: "/npcs",
    reservationsSettings: "/reservations",
    members: "/members",
    info: "/info",
    appearance: "/appearance",
    servers: "/servers",
    activityLogs: "/activity-logs",
    mapTemplates: "/map-templates",
  },
} as const;

export { ROUTES, ROUTE_SEGMENTS };
