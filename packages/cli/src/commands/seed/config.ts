export const SCRAPER_CONFIG = {
  margoworld: {
    baseUrl: "https://margoworld.pl",
    itemsPath: "/item/",
    npcsPath: "/npc/",
    imageUrlMatch: "https://micc.garmory-cdn.cloud/obrazki/npc/",
  },
  npcTypes: ["elite2", "titan", "elite", "heros", "kolos"],
  professions: ["p", "w", "h", "b", "t", "m"] as const,
  worlds: [
    "gordion",
    "classic",
    "katahha",
    "experimental",
    "aldous",
    "gefion",
    "tempest",
  ] as const,
  lootSources: ["FIGHT", "DIALOG"] as const,
} as const;

export const SEED_CONFIG = {
  guilds: {
    count: 5,
    membersPerGuild: {
      min: 10,
      max: 50,
    },
    rolesPerGuild: {
      min: 3,
      max: 8,
    },
  },
  loots: {
    count: 5000,
    itemsPerLoot: {
      fight: { min: 1, max: 10 },
      dialog: { min: 1, max: 3 },
    },
    playersPerLoot: {
      fight: { min: 1, max: 10 },
      dialog: { min: 1, max: 3 },
    },
  },
  timers: {
    countPerGuild: 10,
  },
  battles: {
    count: 1000,
  },
} as const;
