import { describe, expect, test } from "bun:test";

import {
  type CiPlan,
  planChecks,
  selectTestFiles,
  type Workspace,
} from "./check-changed.ts";

const workspaces: Workspace[] = [
  {
    name: "@lootlog/api",
    directory: "apps/api",
    testScript:
      "bun --conditions=development test --timeout=30000 --path-ignore-patterns=dist",
  },
  {
    name: "@lootlog/wiki",
    directory: "apps/wiki",
    testScript: "vitest run --config ./vitest.config.ts",
  },
  {
    name: "@lootlog/game-client-api",
    directory: "packages/game-client-api",
    testScript: "bun run typecheck",
  },
];

const emptyPlan: CiPlan = {
  packages: [],
  integrationPackages: [],
  runClientCheck: false,
  dockerTargets: [],
};

const plan = (tests: string[], ciPlan: Partial<CiPlan> = {}) =>
  planChecks({
    files: tests,
    present: tests,
    tests,
    workspaces,
    ciPlan: { ...emptyPlan, ...ciPlan },
    concurrency: 4,
  });

const stepNamed = (name: string, tests: string[], ciPlan?: Partial<CiPlan>) =>
  plan(tests, ciPlan).steps.find((step) => step.name.startsWith(name));

describe("selectTestFiles", () => {
  test("a changed source selects the tests beside it and not its neighbours'", () => {
    const tests = selectTestFiles(
      ["apps/web/src/kill.tsx", "apps/web/src/other.test.ts"],
      () => [
        "kill.tsx",
        "kill.test.tsx",
        "kill.browser.test.tsx",
        "killer.test.ts",
        "other.test.ts",
      ],
    );

    expect(tests).toEqual([
      "apps/web/src/kill.browser.test.tsx",
      "apps/web/src/kill.test.tsx",
      "apps/web/src/other.test.ts",
    ]);
  });
});

describe("planChecks", () => {
  test("runs a Bun workspace's tests with the runtime flags of its test script", () => {
    expect(
      stepNamed("test @lootlog/api", ["apps/api/src/kills.test.ts"])?.argv,
    ).toEqual([
      "bun",
      "--conditions=development",
      "test",
      "--timeout=30000",
      "./src/kills.test.ts",
    ]);
  });

  test("runs a Vitest workspace's tests with its config", () => {
    expect(
      stepNamed("test @lootlog/wiki", ["apps/wiki/src/page.test.tsx"])?.argv,
    ).toEqual([
      "bunx",
      "vitest",
      "run",
      "--config",
      "./vitest.config.ts",
      "./src/page.test.tsx",
    ]);
  });

  test("leaves integration and end-to-end tests to CI", () => {
    const files = [
      "apps/api/test/kills.e2e.test.ts",
      "apps/api/src/store.integration.test.ts",
    ];

    const { steps, leftToCi } = plan(files);

    expect(
      steps.some((step) => step.name.startsWith("test @lootlog/api")),
    ).toBe(false);
    expect(leftToCi).toEqual(expect.arrayContaining(files));
  });

  test("leaves tests of a workspace without a test runner to CI", () => {
    const file = "packages/game-client-api/src/api.test.ts";

    expect(plan([file]).leftToCi).toContain(file);
  });

  test("lints and typechecks every package CI plans, dependents included", () => {
    const argv =
      stepNamed("lint + typecheck", [], {
        packages: ["@lootlog/protocol", "@lootlog/web"],
      })?.argv ?? [];

    expect(argv).toEqual(
      expect.arrayContaining([
        "--filter=@lootlog/protocol",
        "--filter=@lootlog/web",
      ]),
    );
  });

  test("checks the generated client only when CI would", () => {
    expect(stepNamed("generated client", [])).toBeUndefined();
    expect(
      stepNamed("generated client", [], { runClientCheck: true }),
    ).toBeDefined();
  });
});
