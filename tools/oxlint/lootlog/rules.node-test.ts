import { describe, it } from "node:test";
import { resolve } from "node:path";

import { RuleTester } from "oxlint/plugins-dev";

import { noPollingLoopInTestsRule } from "./rules/no-polling-loop-in-tests.ts";
import { noRealTimeWaitInTestsRule } from "./rules/no-real-time-wait-in-tests.ts";
import { noTestTimeoutOrUnreasonedSkipRule } from "./rules/no-test-timeout-or-unreasoned-skip.ts";
import { noUnreasonedStateSyncRule } from "./rules/no-unreasoned-state-sync.ts";
import { noWallClockInTestsRule } from "./rules/no-wall-clock-in-tests.ts";
import { requireSuppressionReasonRule } from "./rules/require-suppression-reason.ts";

RuleTester.describe = describe;

RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

const testFile = "feature.test.ts";

const sourceFile = "feature.tsx";

const budgetedFile = resolve(import.meta.dirname, "fixtures/budgeted.test.ts");

const baseline = { baseline: "tools/oxlint/lootlog/fixtures/baseline.json" };

tester.run("lootlog/require-suppression-reason", requireSuppressionReasonRule, {
  valid: [
    "// oxlint-disable-next-line no-console -- the CLI prints its report\nconsole.log(1);",
    "// @ts-expect-error malformed external payload\nparse(1);",
    "// @effect-diagnostics-next-line returnEffectInGen:off -- the fake returns its lifetime\nrun();",
    {
      code: "/* eslint-disable */\n// @ts-nocheck\nexport {};",
      filename: "routeTree.gen.ts",
    },
  ],
  invalid: [
    {
      code: "// oxlint-disable-next-line no-console\nconsole.log(1);",
      errors: 1,
    },
    { code: "// @ts-expect-error\nparse(1);", errors: 1 },
    {
      code: "// @effect-diagnostics-next-line returnEffectInGen:off\nrun();",
      errors: 1,
    },
  ],
});

tester.run("lootlog/no-unreasoned-state-sync", noUnreasonedStateSyncRule, {
  valid: [
    { code: "useEffect(() => {}, []);", filename: testFile },
    { code: "const value = useMemoizedThing();", filename: sourceFile },
  ],
  invalid: [
    {
      code: "useEffect(() => setOpen(false), [id]);",
      filename: sourceFile,
      errors: 1,
    },
    {
      code: "React.useLayoutEffect(() => measure());",
      filename: sourceFile,
      errors: 1,
    },
  ],
});

tester.run("lootlog/no-wall-clock-in-tests", noWallClockInTestsRule, {
  valid: [
    { code: "const now = Date.now();", filename: sourceFile },
    {
      code: "vi.useFakeTimers();\nconst now = Date.now();",
      filename: testFile,
    },
    {
      code: "vi.spyOn(Date, 'now').mockReturnValue(Date.now());",
      filename: testFile,
    },
    {
      code: "const fixed = new Date('2026-01-01T00:00:00Z');",
      filename: testFile,
    },
  ],
  invalid: [
    {
      code: "const started = performance.now();",
      filename: testFile,
      errors: 1,
    },
    { code: "const createdAt = new Date();", filename: testFile, errors: 1 },
  ],
});

tester.run("lootlog/no-real-time-wait-in-tests", noRealTimeWaitInTestsRule, {
  valid: [
    {
      code: "vi.useFakeTimers();\nawait new Promise((resolve) => setTimeout(resolve, 50));",
      filename: testFile,
    },
    {
      code: "const fiber = Effect.sleep('1 second');\nyield* TestClock.adjust('1 second');",
      filename: testFile,
    },
    { code: "await Bun.sleep(10);", filename: sourceFile },
  ],
  invalid: [
    { code: "await Bun.sleep(10);", filename: testFile, errors: 1 },
    {
      code: "await new Promise((resolve) => setTimeout(resolve, 50));",
      filename: testFile,
      errors: 1,
    },
    {
      code: "import { setTimeout as delay } from 'node:timers/promises';\nawait delay(50);",
      filename: testFile,
      errors: 1,
    },
    { code: "yield* Effect.sleep('1 second');", filename: testFile, errors: 1 },
  ],
});

tester.run("lootlog/no-polling-loop-in-tests", noPollingLoopInTestsRule, {
  valid: [
    {
      code: "for (let flush = 0; flush < 3; flush++) await Promise.resolve();",
      filename: testFile,
    },
    { code: "while (!done) await Bun.sleep(10);", filename: sourceFile },
  ],
  invalid: [
    {
      code: "while (!received) await Bun.sleep(10);",
      filename: testFile,
      errors: 1,
    },
    {
      code: "for (;;) { if (queue.length > 0) break; await new Promise((resolve) => setTimeout(resolve, 5)); }",
      filename: testFile,
      errors: 1,
    },
  ],
});

tester.run(
  "lootlog/no-test-timeout-or-unreasoned-skip",
  noTestTimeoutOrUnreasonedSkipRule,
  {
    valid: [
      { code: "test('settles', async () => {});", filename: testFile },
      {
        code: "beforeAll(async () => start(), 60_000);",
        filename: "rabbit.integration.test.ts",
      },
      {
        code: "// quarantine: #2391 the upstream sandbox drops the connection\ntest.skip('reconnects', () => {});",
        filename: testFile,
      },
    ],
    invalid: [
      {
        code: "test('settles', async () => {}, 10_000);",
        filename: testFile,
        errors: 1,
      },
      {
        code: "it('settles', { timeout: 10_000 }, async () => {});",
        filename: testFile,
        errors: 1,
      },
      { code: "setDefaultTimeout(30_000);", filename: testFile, errors: 1 },
      {
        code: "describe.skip('suite', () => {});",
        filename: testFile,
        errors: 1,
      },
      {
        code: "test.only('focused', () => {});",
        filename: testFile,
        errors: 1,
      },
    ],
  },
);

tester.run("lootlog/no-wall-clock-in-tests", noWallClockInTestsRule, {
  valid: [
    {
      code: "const createdAt = Date.now();",
      filename: budgetedFile,
      options: [baseline],
    },
  ],
  invalid: [
    {
      code: "const createdAt = Date.now();\nconst updatedAt = Date.now();",
      filename: budgetedFile,
      options: [baseline],
      errors: 2,
    },
  ],
});

tester.run("lootlog/no-unreasoned-state-sync", noUnreasonedStateSyncRule, {
  valid: [
    {
      code: "useEffect(() => subscribe(), []);\n// oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- keeps the socket subscription open while mounted\nuseEffect(() => connect(), []);",
      filename: resolve(import.meta.dirname, "fixtures/budgeted.tsx"),
      options: [
        { baseline: "tools/oxlint/lootlog/fixtures/state-sync-baseline.json" },
      ],
    },
  ],
  invalid: [],
});
