import { defineRule, type ESTree } from "@oxlint/plugins";

import {
  INSTALLS_FAKE_TIMERS,
  TEST_FILE,
  isIdentifier,
  memberPath,
  propertyName,
  unwrap,
} from "../ast.ts";
import { baselineOptionSchema, budgetedReporter } from "../budget.ts";

const WALL_CLOCK_CALLS: ReadonlySet<string> = new Set([
  "Date.now",
  "performance.now",
  "process.hrtime",
  "process.hrtime.bigint",
  "Bun.nanoseconds",
]);

const MOCKING_FUNCTIONS: ReadonlySet<string> = new Set(["fn", "mock", "spyOn"]);

const MOCK_METHODS: ReadonlySet<string> = new Set([
  "mockImplementation",
  "mockImplementationOnce",
  "mockResolvedValue",
  "mockResolvedValueOnce",
  "mockReturnValue",
  "mockReturnValueOnce",
]);

const MESSAGE =
  "Wall-clock reading in a test: the outcome depends on when and how fast the runner is. " +
  "Use a fixed epoch, install fake timers (`vi.useFakeTimers`, `setSystemTime` from bun:test), " +
  "or drive the Effect TestClock. Assert on events and counts, not elapsed time.";

const isMockingCall = (callee: ESTree.Node) => {
  const expression = unwrap(callee);

  if (expression?.type !== "MemberExpression") return false;

  const property = propertyName(expression.property);

  if (property === undefined) return false;

  if (MOCK_METHODS.has(property)) return true;

  return (
    MOCKING_FUNCTIONS.has(property) &&
    ["vi", "jest", "mock"].some((name) => isIdentifier(expression.object, name))
  );
};

const feedsMock = (node: ESTree.Node) => {
  let child: ESTree.Node = node;
  let current = node.parent;

  while (current) {
    if (
      current.type === "CallExpression" &&
      current.callee !== child &&
      isMockingCall(current.callee)
    )
      return true;

    child = current;
    current = current.parent;
  }

  return false;
};

export const noWallClockInTestsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow wall-clock readings in tests that run on the real clock.",
    },
    schema: baselineOptionSchema,
  },
  create(context) {
    if (
      !TEST_FILE.test(context.filename) ||
      INSTALLS_FAKE_TIMERS.test(context.sourceCode.text)
    )
      return {};

    const findings = budgetedReporter(context);

    return {
      CallExpression(node) {
        const path = memberPath(node.callee)?.join(".");

        if (path === undefined || !WALL_CLOCK_CALLS.has(path)) return;

        if (!feedsMock(node)) findings.add(node, MESSAGE);
      },
      NewExpression(node) {
        if (node.arguments.length > 0 || !isIdentifier(node.callee, "Date"))
          return;

        if (!feedsMock(node)) findings.add(node, MESSAGE);
      },
      "Program:exit": findings.flush,
    };
  },
});
