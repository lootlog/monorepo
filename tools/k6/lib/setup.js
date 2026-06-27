import secrets from "k6/secrets";
import { buildRuntimeConfig } from "./config.js";
import { firstCollectionItem, jsonBody, rawGet, readId } from "./http.js";

export async function setupSuite() {
  const config = buildRuntimeConfig(await loadSecrets());

  verifyAuth(config);
  config.fixtures = discoverFixtures(config);
  warnAboutMissingFixtures(config);

  return { config };
}

async function loadSecrets() {
  return {
    AUTH_COOKIE: await readSecret("AUTH_COOKIE"),
    AUTH_TOKEN: await readSecret("AUTH_TOKEN"),
  };
}

async function readSecret(name) {
  try {
    return (await secrets.get(name)) ?? "";
  } catch {
    return "";
  }
}

function verifyAuth(config) {
  if (!config.services.includes("auth") && !config.auth.hasAuth) {
    return;
  }

  const response = rawGet(config, "auth", "/auth/verify");
  if (response.status !== 200) {
    throw new Error(
      `Auth preflight failed with status ${response.status}. Refresh AUTH_TOKEN/AUTH_COOKIE for the target environment.`,
    );
  }
}

function discoverFixtures(config) {
  const fixtures = { ...config.fixtures };

  discoverApiFixtures(config, fixtures);
  discoverBattlelogFixtures(config, fixtures);
  discoverActivityFixtures(config, fixtures);

  return fixtures;
}

function discoverApiFixtures(config, fixtures) {
  const needsApiData =
    config.services.includes("api") ||
    config.services.includes("activity") ||
    config.selectedService === "all";

  if (!needsApiData) {
    return;
  }

  if (!fixtures.guildId) {
    const response = rawGet(config, "api", "/users/@me/guilds/accessible");
    if (response.status === 200) {
      fixtures.guildId = readId(firstCollectionItem(jsonBody(response)));
    }
  }

  if (!fixtures.guildId) {
    return;
  }

  if (!fixtures.world) {
    const response = rawGet(
      config,
      "api",
      `/guilds/${fixtures.guildId}/worlds`,
    );
    if (response.status === 200) {
      const worlds = jsonBody(response, []);
      fixtures.world = Array.isArray(worlds) ? (worlds[0] ?? "") : "";
    }
  }

  if (!fixtures.lootId) {
    const response = rawGet(
      config,
      "api",
      `/guilds/${fixtures.guildId}/loots`,
      {
        limit: 1,
        world: fixtures.world,
      },
    );
    if (response.status === 200) {
      fixtures.lootId = readId(firstCollectionItem(jsonBody(response)));
    }
  }

  if (!fixtures.eventId) {
    const response = rawGet(
      config,
      "api",
      `/guilds/${fixtures.guildId}/events`,
      {
        limit: 1,
        world: fixtures.world,
      },
    );
    if (response.status === 200) {
      fixtures.eventId = readId(firstCollectionItem(jsonBody(response)));
    }
  }

  if (!fixtures.docId) {
    const response = rawGet(config, "api", `/guilds/${fixtures.guildId}/docs`);
    if (response.status === 200) {
      fixtures.docId = readId(firstCollectionItem(jsonBody(response)));
    }
  }
}

function discoverBattlelogFixtures(config, fixtures) {
  if (
    !config.services.includes("battlelog") &&
    config.selectedService !== "all"
  ) {
    return;
  }

  if (!fixtures.battleId) {
    const response = rawGet(config, "battlelog", "/battles/@me", { size: 1 });
    if (response.status === 200) {
      const battle = firstCollectionItem(jsonBody(response));
      fixtures.battleId = readId(battle);
      discoverBattlelogWarriorFixtures(fixtures, battle);
    }
  }

  if (!fixtures.publicBattleId) {
    fixtures.publicBattleId = fixtures.battleId;
  }
}

function discoverBattlelogWarriorFixtures(fixtures, battle) {
  if (!battle || typeof battle !== "object") {
    return;
  }

  if (!fixtures.battleCharacterId && typeof battle.characterId === "string") {
    fixtures.battleCharacterId = battle.characterId;
  }

  if (fixtures.battleOpponentId || !Array.isArray(battle.warriors)) {
    return;
  }

  const opponent = battle.warriors.find(
    (warrior) =>
      warrior &&
      typeof warrior === "object" &&
      typeof warrior.originalId === "string" &&
      warrior.originalId !== fixtures.battleCharacterId,
  );

  if (opponent) {
    fixtures.battleOpponentId = opponent.originalId;
  }
}

function discoverActivityFixtures(config, fixtures) {
  if (!fixtures.guildId) {
    return;
  }

  if (
    !config.services.includes("activity") &&
    config.selectedService !== "all"
  ) {
    return;
  }

  if (!fixtures.activityId) {
    const response = rawGet(
      config,
      "activity",
      `/guilds/${fixtures.guildId}/activity-logs`,
      {
        limit: 1,
        world: fixtures.world,
      },
    );
    if (response.status === 200) {
      fixtures.activityId = readId(firstCollectionItem(jsonBody(response)));
    }
  }
}

function warnAboutMissingFixtures(config) {
  const { fixtures, services } = config;
  const warnings = [];

  if (
    (services.includes("api") || services.includes("activity")) &&
    !fixtures.guildId
  ) {
    warnings.push(
      "K6_GUILD_ID was not provided and fixture discovery found no accessible guild.",
    );
  }

  if (services.includes("battlelog") && !fixtures.battleId) {
    warnings.push(
      "K6_BATTLE_ID was not provided and fixture discovery found no battle.",
    );
  }

  if (services.includes("activity") && !fixtures.activityId) {
    warnings.push(
      "K6_ACTIVITY_ID was not provided and fixture discovery found no activity log.",
    );
  }

  for (const warning of warnings) {
    console.warn(`[k6 setup] ${warning}`);
  }
}
