import { apiRequest } from "../lib/http.js";

export function runApi(config) {
  const { guildId, world, lootId, eventId, docId } = config.fixtures;

  apiRequest(config, "api", "health", "GET", "/healthz");
  apiRequest(
    config,
    "api",
    "user-preferences",
    "GET",
    "/users/@me/preferences",
  );
  apiRequest(config, "api", "user-guilds", "GET", "/users/@me/guilds");
  apiRequest(
    config,
    "api",
    "accessible-guilds",
    "GET",
    "/users/@me/guilds/accessible",
  );
  apiRequest(config, "api", "all-timers", "GET", "/timers", {
    query: { world },
  });
  apiRequest(config, "api", "timer-history", "GET", "/timers/history", {
    optional: true,
    query: { limit: 10, world },
  });
  apiRequest(config, "api", "timer-settings", "GET", "/timer-settings", {
    optional: true,
  });
  apiRequest(config, "api", "sound-settings", "GET", "/sound-settings", {
    optional: true,
  });
  apiRequest(config, "api", "maps", "GET", "/maps", {
    optional: true,
    query: { limit: 25, search: config.search.query, world },
  });
  apiRequest(
    config,
    "api",
    "user-kill-stats",
    "GET",
    "/users/@me/stats/kills",
    {
      optional: true,
      query: { world },
    },
  );
  apiRequest(
    config,
    "api",
    "user-killed-npcs",
    "GET",
    "/users/@me/kills/npcs",
    {
      optional: true,
      query: { limit: 10, search: config.search.query, world },
    },
  );

  if (!guildId) {
    return;
  }

  apiRequest(config, "api", "guild", "GET", `/guilds/${guildId}`, {
    optional: true,
  });
  apiRequest(
    config,
    "api",
    "guild-permissions",
    "GET",
    `/guilds/${guildId}/permissions`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "guild-worlds",
    "GET",
    `/guilds/${guildId}/worlds`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "guild-members-summary",
    "GET",
    `/guilds/${guildId}/members/summary`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "guild-timers",
    "GET",
    `/guilds/${guildId}/timers`,
    {
      optional: true,
      query: { limit: 20, world },
    },
  );
  apiRequest(
    config,
    "api",
    "timer-npc-search",
    "GET",
    `/guilds/${guildId}/timers/npcs/search`,
    {
      optional: true,
      query: { limit: 10, search: config.search.query, world },
    },
  );
  apiRequest(config, "api", "guild-loots", "GET", `/guilds/${guildId}/loots`, {
    optional: true,
    query: { limit: 10, world },
  });
  apiRequest(
    config,
    "api",
    "guild-loot-stats",
    "GET",
    `/guilds/${guildId}/loots/stats`,
    {
      optional: true,
      query: { world },
    },
  );
  apiRequest(
    config,
    "api",
    "guild-loot-count",
    "GET",
    `/guilds/${guildId}/loots/count`,
    {
      optional: true,
      query: { world },
    },
  );
  apiRequest(
    config,
    "api",
    "guild-reservations",
    "GET",
    `/guilds/${guildId}/reservations`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "guild-reservation-cards",
    "GET",
    `/guilds/${guildId}/reservations/cards`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "guild-events",
    "GET",
    `/guilds/${guildId}/events`,
    {
      optional: true,
      query: { limit: 10, world },
    },
  );
  apiRequest(
    config,
    "api",
    "guild-event-settings",
    "GET",
    `/guilds/${guildId}/event-settings`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "guild-kill-stats",
    "GET",
    `/guilds/${guildId}/stats/kills`,
    {
      optional: true,
      query: { world },
    },
  );
  apiRequest(
    config,
    "api",
    "guild-top-npcs",
    "GET",
    `/guilds/${guildId}/stats/kills/top-npcs`,
    {
      optional: true,
      query: { limit: 10, world },
    },
  );
  apiRequest(
    config,
    "api",
    "guild-top-killers",
    "GET",
    `/guilds/${guildId}/stats/kills/top-killers`,
    {
      optional: true,
      query: { limit: 10, world },
    },
  );
  apiRequest(config, "api", "guild-docs", "GET", `/guilds/${guildId}/docs`, {
    optional: true,
  });
  apiRequest(
    config,
    "api",
    "guild-docs-trash",
    "GET",
    `/guilds/${guildId}/docs/trash`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "public-stats-card",
    "GET",
    `/public/guilds/${guildId}/stats-card.png`,
    {
      expectedStatuses: [200],
      headers: { Accept: "image/png" },
      optional: true,
    },
  );

  if (lootId) {
    apiRequest(
      config,
      "api",
      "loot-detail",
      "GET",
      `/guilds/${guildId}/loots/${lootId}`,
      {
        optional: true,
      },
    );
    apiRequest(
      config,
      "api",
      "loot-comments",
      "GET",
      `/guilds/${guildId}/loots/${lootId}/comments`,
      {
        optional: true,
      },
    );
  }

  if (eventId) {
    runEventReads(config, guildId, eventId, world);
  }

  if (docId) {
    apiRequest(
      config,
      "api",
      "doc-detail",
      "GET",
      `/guilds/${guildId}/docs/${docId}`,
      {
        optional: true,
      },
    );
    apiRequest(
      config,
      "api",
      "doc-history",
      "GET",
      `/guilds/${guildId}/docs/${docId}/history`,
      {
        optional: true,
      },
    );
  }
}

function runEventReads(config, guildId, eventId, world) {
  apiRequest(
    config,
    "api",
    "event-detail",
    "GET",
    `/guilds/${guildId}/events/${eventId}`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-overview",
    "GET",
    `/guilds/${guildId}/events/${eventId}/overview`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-wrapped",
    "GET",
    `/guilds/${guildId}/events/${eventId}/wrapped`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-maps",
    "GET",
    `/guilds/${guildId}/events/${eventId}/maps`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-ranking",
    "GET",
    `/guilds/${guildId}/events/${eventId}/ranking`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-timers",
    "GET",
    `/guilds/${guildId}/events/${eventId}/timers`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-hero-stats",
    "GET",
    `/guilds/${guildId}/events/${eventId}/hero-stats`,
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "api",
    "event-kills",
    "GET",
    `/guilds/${guildId}/events/${eventId}/kills`,
    {
      optional: true,
      query: { limit: 10, world },
    },
  );
  apiRequest(
    config,
    "api",
    "event-coordination",
    "GET",
    `/guilds/${guildId}/events/${eventId}/coordination`,
    {
      optional: true,
    },
  );
}
