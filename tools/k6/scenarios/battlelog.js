import { apiRequest } from "../lib/http.js";

export function runBattlelog(config) {
  const {
    battleCharacterId,
    battleId,
    battleOpponentId,
    publicBattleId,
    world,
  } = config.fixtures;
  const statisticsQuery = {
    search: config.search.query,
    size: 10,
    world,
  };

  apiRequest(config, "battlelog", "health", "GET", "/healthz");
  apiRequest(config, "battlelog", "dashboard-battles", "GET", "/battles/@me", {
    query: { size: 10, world },
  });
  apiRequest(
    config,
    "battlelog",
    "characters",
    "GET",
    "/battles/@me/characters",
    {
      optional: true,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "analytics",
    "GET",
    "/battles/@me/analytics",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  if (battleCharacterId) {
    apiRequest(
      config,
      "battlelog",
      "abyss-seasons",
      "GET",
      "/battles/@me/abyss/seasons",
      {
        optional: true,
        query: { characterId: battleCharacterId, world },
      },
    );
  }
  apiRequest(
    config,
    "battlelog",
    "combat-profile",
    "GET",
    "/battles/@me/statistics/combat-profile",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "profession-win-rate",
    "GET",
    "/battles/@me/statistics/profession-win-rate",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "head-to-head",
    "GET",
    "/battles/@me/statistics/head-to-head",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "streak",
    "GET",
    "/battles/@me/statistics/streak",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "duration",
    "GET",
    "/battles/@me/statistics/duration",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "ph-growth",
    "GET",
    "/battles/@me/statistics/ph-growth",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "rating-growth",
    "GET",
    "/battles/@me/statistics/rating-growth",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  apiRequest(
    config,
    "battlelog",
    "rating-delta-by-opponent",
    "GET",
    "/battles/@me/statistics/rating-delta-by-opponent",
    {
      optional: true,
      query: statisticsQuery,
    },
  );
  if (battleOpponentId) {
    apiRequest(
      config,
      "battlelog",
      "player-vs-player",
      "GET",
      "/battles/@me/statistics/player-vs-player",
      {
        optional: true,
        query: { ...statisticsQuery, opponentId: battleOpponentId },
      },
    );
  }
  apiRequest(
    config,
    "battlelog",
    "warriors-search",
    "GET",
    "/battles/@me/warriors/search",
    {
      optional: true,
      query: { q: config.search.query },
    },
  );
  apiRequest(config, "battlelog", "worlds", "GET", "/battles/@me/worlds", {
    optional: true,
  });

  if (battleId) {
    apiRequest(
      config,
      "battlelog",
      "battle-detail",
      "GET",
      `/battles/${battleId}`,
      {
        optional: true,
      },
    );
    apiRequest(
      config,
      "battlelog",
      "battle-raw",
      "GET",
      `/battles/${battleId}/raw`,
      {
        optional: true,
      },
    );
    apiRequest(
      config,
      "battlelog",
      "battle-timeline",
      "GET",
      `/battles/${battleId}/timeline`,
      {
        optional: true,
      },
    );
  }

  if (publicBattleId) {
    apiRequest(
      config,
      "battlelog",
      "public-battle",
      "GET",
      `/battles/public/${publicBattleId}`,
      {
        optional: true,
      },
    );
    apiRequest(
      config,
      "battlelog",
      "public-battle-raw",
      "GET",
      `/battles/public/${publicBattleId}/raw`,
      {
        optional: true,
      },
    );
    apiRequest(
      config,
      "battlelog",
      "public-battle-timeline",
      "GET",
      `/battles/public/${publicBattleId}/timeline`,
      {
        optional: true,
      },
    );
  }
}
