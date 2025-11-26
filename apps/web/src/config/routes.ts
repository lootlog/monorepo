const USER_BASE = "/@me";
const GUILD_BASE_PARAM = ":guildId";

const ROUTES = {
  signin: "/signin",
  init: "/init",

  user: {
    base: USER_BASE,
    dashboard: USER_BASE,
    battlePanel: {
      base: `${USER_BASE}/battle-panel`,
      stats: `${USER_BASE}/battle-panel/stats`,
      statistics: `${USER_BASE}/battle-panel/statistics`,
      h2h: `${USER_BASE}/battle-panel/statistics/h2h`,
      matchmakingH2h: `${USER_BASE}/battle-panel/statistics/matchmaking-h2h`,
      playerVsPlayer: (myId: string, opponentId: string) =>
        `${USER_BASE}/battle-panel/statistics/player-vs-player/${myId}/${opponentId}`,
      battles: `${USER_BASE}/battle-panel/battles`,
      battle: (battleId: string) =>
        `${USER_BASE}/battle-panel/battles/${battleId}`,
    },
    settings: {
      base: `${USER_BASE}/settings`,
      appearance: `${USER_BASE}/settings/appearance`,
    },
  },

  guild: {
    base: (guildId: string) => `/${guildId}`,
    lootlog: (guildId: string) => `/${guildId}`,
    timers: (guildId: string) => `/${guildId}/timers`,
    stats: (guildId: string) => `/${guildId}/stats`,
    reservations: {
      base: (guildId: string) => `/${guildId}/reservations`,
      reservationId: (guildId: string, reservationId: string) =>
        `/${guildId}/reservations/${reservationId}`,
    },
    settings: {
      base: (guildId: string) => `/${guildId}/settings`,
      roles: (guildId: string) => `/${guildId}/settings/roles`,
      role: (guildId: string, roleId: string) =>
        `/${guildId}/settings/roles/${roleId}`,
      npcs: (guildId: string) => `/${guildId}/settings/npcs`,
      members: (guildId: string) => `/${guildId}/settings/members`,
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
    battles: "/battles",
    stats: "/stats",
    settings: "/settings",
    appearance: "/appearance",
  },
  guild: {
    timers: "/timers",
    reservations: "/reservations",
    stats: "/stats",
    settings: "/settings",
    roles: "/roles",
    npcs: "/npcs",
    members: "/members",
    appearance: "/appearance",
    servers: "/servers",
  },
} as const;

export { ROUTES, ROUTE_SEGMENTS, USER_BASE, GUILD_BASE_PARAM };
