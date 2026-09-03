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
      affectedPackages: ["@lootlog/api", "@lootlog/web"],
      changedFiles: ["apps/api/src/main.ts"],
    });
    expect(sourcePlan.dockerTargets).toEqual([]);
    expect(sourcePlan.integrationPackages).toEqual(["@lootlog/api"]);

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

  test("release selection fails closed", async () => {
    await expect(
      createDeploymentPlan({ mode: "release", target: "unknown" }),
    ).rejects.toThrow("Unknown deployment target: unknown");
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
