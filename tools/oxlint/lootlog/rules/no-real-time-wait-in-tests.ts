import { defineRule, type ESTree } from "@oxlint/plugins";

import {
  FUNCTIONS,
  INSTALLS_FAKE_TIMERS,
  TEST_FILE,
  isIdentifier,
  memberPath,
  propertyName,
  unwrap,
} from "../ast.ts";
import { baselineOptionSchema, budgetedReporter } from "../budget.ts";

const TIMER_PROMISE_MODULES: ReadonlySet<string> = new Set([
  "node:timers/promises",
  "timers/promises",
]);

const TIMER_FUNCTIONS: ReadonlySet<string> = new Set([
  "setTimeout",
  "setInterval",
  "setImmediate",
]);

const ALWAYS_REAL_WAITS: ReadonlySet<string> = new Set([
  "Bun.sleep",
  "Bun.sleepSync",
]);

const EFFECT_WAITS: ReadonlySet<string> = new Set([
  "Effect.sleep",
  "Effect.delay",
  "Schedule.spaced",
  "Schedule.fixed",
  "Schedule.exponential",
]);

const DRIVES_TEST_CLOCK = /\bTestClock\.(?:adjust|setTime)\b/u;

const MESSAGE =
  "Real-clock wait in a test: it is slow, and flaky under load. " +
  "Await the promise, Deferred, Queue, or event that marks the milestone; " +
  "advance fake timers (`vi.advanceTimersByTimeAsync`); or drive the Effect TestClock with `TestClock.adjust`.";

const insidePromiseExecutor = (node: ESTree.Node) => {
  let current = node.parent;

  while (current) {
    if (FUNCTIONS.has(current.type)) {
      const parent = current.parent;

      return (
        parent?.type === "NewExpression" &&
        parent.arguments[0] === current &&
        isIdentifier(parent.callee, "Promise")
      );
    }

    current = current.parent;
  }

  return false;
};

export const noRealTimeWaitInTestsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow real-clock waits in tests; await the milestone or drive a fake clock instead.",
    },
    schema: baselineOptionSchema,
  },
  create(context) {
    if (!TEST_FILE.test(context.filename)) return {};

    const { text } = context.sourceCode;
    const timersAreFake = INSTALLS_FAKE_TIMERS.test(text);
    const testClockIsDriven = DRIVES_TEST_CLOCK.test(text);
    const timerPromiseLocals = new Set<string>();
    const timerPromiseNamespaces = new Set<string>();
    const findings = budgetedReporter(context);

    const isTimerPromise = (callee: ESTree.Node) => {
      const expression = unwrap(callee);

      if (expression?.type === "Identifier")
        return timerPromiseLocals.has(expression.name);

      const path = memberPath(callee);

      return (
        path?.length === 2 &&
        timerPromiseNamespaces.has(path[0] ?? "") &&
        TIMER_FUNCTIONS.has(path[1] ?? "")
      );
    };

    const isCallbackTimer = (callee: ESTree.Node) => {
      const expression = unwrap(callee);

      return (
        expression?.type === "Identifier" &&
        TIMER_FUNCTIONS.has(expression.name) &&
        !timerPromiseLocals.has(expression.name)
      );
    };

    return {
      ImportDeclaration(node) {
        if (!TIMER_PROMISE_MODULES.has(node.source.value)) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportNamespaceSpecifier")
            timerPromiseNamespaces.add(specifier.local.name);

          if (specifier.type !== "ImportSpecifier") continue;

          const imported = propertyName(specifier.imported);

          if (imported !== undefined && TIMER_FUNCTIONS.has(imported))
            timerPromiseLocals.add(specifier.local.name);
        }
      },
      CallExpression(node) {
        const path = memberPath(node.callee)?.join(".") ?? "";

        if (ALWAYS_REAL_WAITS.has(path)) {
          findings.add(node, MESSAGE);

          return;
        }

        if (EFFECT_WAITS.has(path)) {
          if (!testClockIsDriven) findings.add(node, MESSAGE);

          return;
        }

        if (timersAreFake) return;

        if (
          isTimerPromise(node.callee) ||
          (isCallbackTimer(node.callee) && insidePromiseExecutor(node))
        )
          findings.add(node, MESSAGE);
      },
      Identifier(node) {
        if (timersAreFake || !TIMER_FUNCTIONS.has(node.name)) return;

        const parent = node.parent;

        if (
          parent?.type === "NewExpression" &&
          parent.arguments[0] === node &&
          isIdentifier(parent.callee, "Promise")
        )
          findings.add(node, MESSAGE);
      },
      "Program:exit": findings.flush,
    };
  },
});
