import encoding from "k6/encoding";

export const HTTP_SERVICES = ["api", "auth", "search", "battlelog", "activity"];

const SERVICE_ALIASES = {
  "battlelog-service": "battlelog",
  main: "api",
};

const LOCAL_BASE_URLS = {
  activity: "http://localhost/api/activity",
  api: "http://localhost/api/lootlog",
  auth: "http://localhost/api/auth",
  battlelog: "http://localhost/api/battlelog",
  search: "http://localhost/api/search",
};

export function createOptions() {
  const profile = getProfileName();
  const targetEnv = getTargetEnvironment();
  const selectedService = getSelectedServiceName();
  const p95Ms = numberEnv("K6_P95_MS", profile === "smoke" ? 3000 : 1500);

  return {
    discardResponseBodies: boolEnv("K6_KEEP_RESPONSE_BODIES", false) === false,
    scenarios: createScenarioOptions(profile),
    setupTimeout: stringEnv("K6_SETUP_TIMEOUT", "2m"),
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
    tags: {
      profile,
      selected_service: selectedService,
      suite: "lootlog-k6",
      target_env: targetEnv,
    },
    thresholds: {
      checks: ["rate>0.95"],
      http_req_duration: [`p(95)<${p95Ms}`],
    },
  };
}

export function buildRuntimeConfig(secrets) {
  const targetEnv = getTargetEnvironment();
  const enableWrites = boolEnv("K6_ENABLE_WRITES", false);

  if (targetEnv === "dev" && enableWrites) {
    throw new Error("K6_ENABLE_WRITES=true is blocked for K6_ENV=dev");
  }

  const authToken = secrets.AUTH_TOKEN || __ENV.AUTH_TOKEN || "";
  const authCookie = secrets.AUTH_COOKIE || __ENV.AUTH_COOKIE || "";
  const selectedService = getSelectedServiceName();
  const services = getSelectedServices(selectedService);
  const hasAuth = authToken.length > 0 || authCookie.length > 0;

  if (!hasAuth && !boolEnv("K6_ALLOW_UNAUTHENTICATED", false)) {
    throw new Error(
      "Missing AUTH_TOKEN or AUTH_COOKIE. Put one in tools/k6/.secrets.local or export it in the shell.",
    );
  }

  return {
    auth: {
      cookie: authCookie,
      hasAuth,
      token: authToken,
    },
    baseUrls: getBaseUrls(),
    devPermissionOverride: buildDevPermissionOverride(),
    enableWrites,
    features: {
      enableIdpToken: boolEnv("K6_ENABLE_IDP_TOKEN", false),
    },
    fixtures: {
      activityId: stringEnv("K6_ACTIVITY_ID", ""),
      battleCharacterId: stringEnv("K6_BATTLE_CHARACTER_ID", ""),
      battleId: stringEnv("K6_BATTLE_ID", ""),
      battleOpponentId: stringEnv("K6_BATTLE_OPPONENT_ID", ""),
      discordId: stringEnv("K6_DISCORD_ID", ""),
      docId: stringEnv("K6_DOC_ID", ""),
      eventId: stringEnv("K6_EVENT_ID", ""),
      guildId: stringEnv("K6_GUILD_ID", ""),
      lootId: stringEnv("K6_LOOT_ID", ""),
      publicBattleId: stringEnv("K6_PUBLIC_BATTLE_ID", ""),
      userId: stringEnv("K6_USER_ID", ""),
      world: stringEnv("K6_WORLD", ""),
    },
    httpTimeout: stringEnv("K6_HTTP_TIMEOUT", "30s"),
    profile: getProfileName(),
    search: {
      limit: numberEnv("K6_SEARCH_LIMIT", 10),
      query: stringEnv("K6_SEARCH_QUERY", "smok"),
      world: stringEnv("K6_SEARCH_WORLD", stringEnv("K6_WORLD", "")),
    },
    selectedService,
    services,
    sleepSeconds: numberEnv("K6_SLEEP_SECONDS", 1),
    targetEnv,
  };
}

export function getSelectedServiceName() {
  const rawService = stringEnv("K6_SERVICE", "all").trim();
  const normalized = SERVICE_ALIASES[rawService] ?? rawService;

  if (normalized !== "all" && !HTTP_SERVICES.includes(normalized)) {
    throw new Error(
      `Unknown K6_SERVICE="${rawService}". Expected one of: all, ${HTTP_SERVICES.join(", ")}`,
    );
  }

  return normalized;
}

export function getSelectedServices(
  selectedService = getSelectedServiceName(),
) {
  return selectedService === "all" ? HTTP_SERVICES : [selectedService];
}

export function getProfileName() {
  const profile = stringEnv("K6_PROFILE", "smoke").trim();

  if (!["smoke", "load", "stress"].includes(profile)) {
    throw new Error('K6_PROFILE must be one of "smoke", "load", or "stress"');
  }

  return profile;
}

export function getTargetEnvironment() {
  return stringEnv("K6_ENV", "local").trim();
}

export function stringEnv(name, fallback) {
  const value = __ENV[name];
  return value === undefined || value === "" ? fallback : value;
}

export function numberEnv(name, fallback) {
  const rawValue = __ENV[name];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function boolEnv(name, fallback) {
  const rawValue = __ENV[name];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(rawValue.toLowerCase());
}

function getBaseUrls() {
  return {
    activity: stringEnv("K6_ACTIVITY_BASE_URL", LOCAL_BASE_URLS.activity),
    api: stringEnv("K6_API_BASE_URL", LOCAL_BASE_URLS.api),
    auth: stringEnv("K6_AUTH_BASE_URL", LOCAL_BASE_URLS.auth),
    battlelog: stringEnv(
      "K6_BATTLELOG_BASE_URL",
      stringEnv("K6_BATTLELOG_SERVICE_BASE_URL", LOCAL_BASE_URLS.battlelog),
    ),
    search: stringEnv("K6_SEARCH_BASE_URL", LOCAL_BASE_URLS.search),
  };
}

function createScenarioOptions(profile) {
  if (profile === "smoke") {
    return {
      smoke: {
        executor: "shared-iterations",
        iterations: scenarioNumberEnv("ITERATIONS", 1),
        maxDuration: scenarioStringEnv("MAX_DURATION", "2m"),
        vus: scenarioNumberEnv("VUS", 1),
      },
    };
  }

  if (profile === "stress") {
    return {
      stress: {
        executor: "ramping-arrival-rate",
        maxVUs: scenarioNumberEnv("MAX_VUS", 50),
        preAllocatedVUs: scenarioNumberEnv("PRE_ALLOCATED_VUS", 8),
        stages: [
          {
            duration: scenarioStringEnv("RAMP_UP_DURATION", "1m"),
            target: scenarioNumberEnv("RATE", 5),
          },
          {
            duration: scenarioStringEnv("DURATION", "2m"),
            target: scenarioNumberEnv("STRESS_RATE", 10),
          },
          {
            duration: scenarioStringEnv("RAMP_DOWN_DURATION", "30s"),
            target: 0,
          },
        ],
        timeUnit: scenarioStringEnv("TIME_UNIT", "1s"),
      },
    };
  }

  return {
    load: {
      duration: scenarioStringEnv("DURATION", "1m"),
      executor: "constant-arrival-rate",
      maxVUs: scenarioNumberEnv("MAX_VUS", 20),
      preAllocatedVUs: scenarioNumberEnv("PRE_ALLOCATED_VUS", 4),
      rate: scenarioNumberEnv("RATE", 2),
      timeUnit: scenarioStringEnv("TIME_UNIT", "1s"),
    },
  };
}

function scenarioStringEnv(name, fallback) {
  return stringEnv(`LOOTLOG_K6_${name}`, fallback);
}

function scenarioNumberEnv(name, fallback) {
  return numberEnv(`LOOTLOG_K6_${name}`, fallback);
}

function buildDevPermissionOverride() {
  const explicitOverride = stringEnv("K6_DEV_PERMISSION_OVERRIDE", "");
  if (explicitOverride) {
    return explicitOverride;
  }

  const permissions = listEnv("K6_DEV_PERMISSIONS");
  if (
    permissions.length === 0 &&
    !boolEnv("K6_DEV_PERMISSION_OVERRIDE_ENABLED", false)
  ) {
    return "";
  }

  const override = {
    enabled: true,
    permissions: permissions.length > 0 ? permissions : ["OWNER"],
  };
  const guildId = stringEnv(
    "K6_DEV_PERMISSION_GUILD_ID",
    stringEnv("K6_GUILD_ID", ""),
  );

  if (guildId) {
    override.guildId = guildId;
  }

  return encoding.b64encode(JSON.stringify(override), "rawurl");
}

function listEnv(name) {
  return stringEnv(name, "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
