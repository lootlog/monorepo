import { apiRequest } from "../lib/http.js";

export function runActivity(config) {
  const { activityId, guildId, userId, world } = config.fixtures;
  const query = {
    limit: 20,
    world,
  };

  apiRequest(config, "activity", "health", "GET", "/healthz");

  if (!guildId) {
    return;
  }

  apiRequest(
    config,
    "activity",
    "guild-activity-logs",
    "GET",
    `/guilds/${guildId}/activity-logs`,
    {
      query,
    },
  );
  apiRequest(
    config,
    "activity",
    "actor-name-suggestions",
    "GET",
    `/guilds/${guildId}/activity-logs/actor-name-suggestions`,
    {
      optional: true,
      query: { limit: 10, search: config.search.query },
    },
  );
  apiRequest(
    config,
    "activity",
    "world-suggestions",
    "GET",
    `/guilds/${guildId}/activity-logs/world-suggestions`,
    {
      optional: true,
      query: { limit: 10, search: world || config.search.query },
    },
  );
  apiRequest(
    config,
    "activity",
    "clan-name-suggestions",
    "GET",
    `/guilds/${guildId}/activity-logs/clan-name-suggestions`,
    {
      optional: true,
      query: { limit: 10, search: config.search.query },
    },
  );
  apiRequest(
    config,
    "activity",
    "member-activity-stats",
    "GET",
    `/guilds/${guildId}/member-activity-stats`,
    {
      optional: true,
    },
  );

  if (userId) {
    apiRequest(
      config,
      "activity",
      "user-activity-logs",
      "GET",
      `/guilds/${guildId}/users/${userId}/activity-logs`,
      {
        optional: true,
        query,
      },
    );
  }

  if (activityId) {
    apiRequest(
      config,
      "activity",
      "activity-log-detail",
      "GET",
      `/guilds/${guildId}/activity-logs/${activityId}`,
      {
        optional: true,
      },
    );
  }
}
