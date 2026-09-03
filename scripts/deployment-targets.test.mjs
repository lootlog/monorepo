import { describe, expect, test } from "bun:test";
import {
  createDeploymentPlan,
  loadDeploymentTargets,
} from "./deployment-targets.mjs";

describe("deployment targets", () => {
  test("the catalog exposes the supported deployment boundary", async () => {
    const targets = await loadDeploymentTargets();
    expect(targets.map(({ id }) => id)).toEqual([
      "activity",
      "api",
      "auth",
      "battlelog-service",
      "developer",
      "discord-bot",
      "gateway",
      "search",
      "traffic-splitter",
      "landing",
      "web",
      "game-client",
      "docs",
      "wiki",
    ]);

    const dockerTargets = targets.filter(({ kind }) => kind === "docker");
    expect(
      dockerTargets
        .filter(({ dockerfile }) => dockerfile === "docker/backend.Dockerfile")
        .map(({ id }) => id),
    ).toEqual([
      "activity",
      "api",
      "auth",
      "battlelog-service",
      "discord-bot",
      "gateway",
      "search",
    ]);
    expect(dockerTargets.find(({ id }) => id === "developer")?.dockerfile).toBe(
      "docker/developer.Dockerfile",
    );
    expect(dockerTargets.find(({ id }) => id === "api")?.installFonts).toBe(
      true,
    );
  });

  test("development selects only affected targets enabled for dev", async () => {
    const plan = await createDeploymentPlan({
      mode: "dev",
      affectedPackages: ["@lootlog/api", "@lootlog/game-client"],
    });
    expect(plan.targets.map(({ id }) => id)).toEqual(["api"]);
  });

  test("CI rebuilds images only when packaging inputs change", async () => {
    const sourcePlan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: ["@lootlog/activity", "@lootlog/api", "@lootlog/web"],
      changedFiles: ["apps/api/src/main.ts"],
    });
    expect(sourcePlan.dockerTargets).toEqual([]);
    expect(sourcePlan.integrationPackages).toEqual([
      "@lootlog/activity",
      "@lootlog/api",
    ]);

    const manifestPlan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: ["@lootlog/api"],
      changedFiles: ["apps/api/package.json"],
    });
    expect(manifestPlan.dockerTargets.map(({ id }) => id)).toEqual(["api"]);

    const rootPlan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: [],
      changedFiles: [".github/deployment-targets.json"],
    });
    expect(rootPlan.dockerTargets).toHaveLength(8);
  });

  test("CI maps shared and target-specific Docker inputs", async () => {
    const backendPlan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: [],
      changedFiles: ["docker/backend.Dockerfile"],
    });
    expect(backendPlan.dockerTargets.map(({ id }) => id)).toEqual([
      "activity",
      "api",
      "auth",
      "battlelog-service",
      "discord-bot",
      "gateway",
      "search",
    ]);

    const developerPlan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: [],
      changedFiles: ["docker/developer.Dockerfile"],
    });
    expect(developerPlan.dockerTargets.map(({ id }) => id)).toEqual([
      "developer",
    ]);

    const patchPlan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: [],
      changedFiles: ["patches/drizzle-orm.patch"],
    });
    expect(patchPlan.dockerTargets).toHaveLength(8);
  });

  test("CI rebuilds affected images for workspace manifest changes", async () => {
    const plan = await createDeploymentPlan({
      mode: "ci",
      affectedPackages: ["@lootlog/api", "@lootlog/auth", "@lootlog/schema"],
      changedFiles: ["packages/schema/package.json"],
    });

    expect(plan.dockerTargets.map(({ id }) => id)).toEqual(["api", "auth"]);
  });

  test("development deploys images after shared Dockerfile changes", async () => {
    const backendPlan = await createDeploymentPlan({
      mode: "dev",
      affectedPackages: [],
      changedFiles: ["docker/backend.Dockerfile"],
    });
    expect(backendPlan.targets.map(({ id }) => id)).toEqual([
      "activity",
      "api",
      "auth",
      "battlelog-service",
      "discord-bot",
      "gateway",
      "search",
    ]);

    const developerPlan = await createDeploymentPlan({
      mode: "dev",
      affectedPackages: [],
      changedFiles: ["docker/developer.Dockerfile"],
    });
    expect(developerPlan.targets.map(({ id }) => id)).toEqual(["developer"]);
  });

  test("release selection fails closed", async () => {
    await expect(
      createDeploymentPlan({ mode: "release", target: "unknown" }),
    ).rejects.toThrow("Unknown deployment target: unknown");
  });

  test("release keeps backend and frontend targets independent", async () => {
    for (const target of ["gateway", "web", "game-client"]) {
      const plan = await createDeploymentPlan({ mode: "release", target });
      expect(plan.targets.map(({ id }) => id)).toEqual([target]);
    }
  });

  test("release requires an explicit Auth migration confirmation", async () => {
    await expect(
      createDeploymentPlan({ mode: "release", target: "auth" }),
    ).rejects.toThrow("Auth migration confirmation is required");
    await expect(
      createDeploymentPlan({
        mode: "release",
        target: "all",
        authMigrationConfirmed: false,
      }),
    ).rejects.toThrow("Auth migration confirmation is required");

    const plan = await createDeploymentPlan({
      mode: "release",
      target: "auth",
      authMigrationConfirmed: true,
    });
    expect(plan.targets.map(({ id }) => id)).toEqual(["auth"]);
  });

  test("Game Client production builds declare their required public configuration", async () => {
    const targets = await loadDeploymentTargets();
    expect(
      targets.find(({ id }) => id === "game-client")?.production
        ?.requiredEnvironmentVariables,
    ).toEqual([
      "GAME_CLIENT_GAME_CLIENT_URL",
      "GAME_CLIENT_VITE_API_URL",
      "GAME_CLIENT_VITE_AUTH_SERVICE_URL",
      "GAME_CLIENT_VITE_BATTLELOG_API_URL",
      "GAME_CLIENT_VITE_GATEWAY_URL",
      "GAME_CLIENT_VITE_GATEWAY_SOCKET_PATH",
      "GAME_CLIENT_VITE_LOOTLOG_APP_URL",
    ]);
  });

  test("rollback exposes only targets changed by the last deployment", async () => {
    const unchanged = {
      kind: "docker",
      image: "registry/activity",
      reference: "registry/activity:sha-old",
      sourceSha: "old",
    };
    const plan = await createDeploymentPlan({
      mode: "rollback",
      currentState: {
        schemaVersion: 1,
        targets: {
          activity: unchanged,
          api: {
            kind: "docker",
            image: "registry/api",
            reference: "registry/api:sha-new",
            sourceSha: "new",
          },
        },
      },
      previousState: {
        schemaVersion: 1,
        targets: {
          activity: unchanged,
          api: {
            kind: "docker",
            image: "registry/api",
            reference: "registry/api:sha-old",
            sourceSha: "old",
          },
        },
      },
    });

    expect(plan.targets).toEqual([
      {
        id: "api",
        current: {
          kind: "docker",
          image: "registry/api",
          reference: "registry/api:sha-new",
          sourceSha: "new",
        },
        previous: {
          kind: "docker",
          image: "registry/api",
          reference: "registry/api:sha-old",
          sourceSha: "old",
        },
      },
    ]);
  });

  test("rollback fails closed for unknown or unrestorable targets", async () => {
    await expect(
      createDeploymentPlan({
        mode: "rollback",
        currentState: {
          schemaVersion: 1,
          targets: { unknown: { kind: "docker" } },
        },
        previousState: { schemaVersion: 1, targets: {} },
      }),
    ).rejects.toThrow("Current state contains unknown target: unknown");

    await expect(
      createDeploymentPlan({
        mode: "rollback",
        currentState: {
          schemaVersion: 1,
          targets: {
            api: {
              kind: "docker",
              image: "registry/api",
              reference: "registry/api:sha-new",
            },
          },
        },
        previousState: { schemaVersion: 1, targets: {} },
      }),
    ).rejects.toThrow("Previous production state does not contain target: api");
  });
});
