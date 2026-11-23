import { defineRule, type ESTree } from "@oxlint/plugins";

import {
  FUNCTIONS,
  TEST_FILE,
  isIdentifier,
  isMemberCall,
  isNode,
  isNumericLiteral,
  isTrueLiteral,
  someDescendant,
  unwrap,
} from "../ast.ts";
import { baselineOptionSchema, budgetedReporter } from "../budget.ts";

const COUNTER_OPERATORS: ReadonlySet<string> = new Set(["<", "<=", ">", ">="]);

const TIMERS: ReadonlySet<string> = new Set(["setImmediate", "setTimeout"]);

const SLEEPS: readonly string[] = [
  "Effect.sleep",
  "Bun.sleep",
  "Bun.sleepSync",
];

const MESSAGE =
  "Polling loop in a test: spinning on sleeps or ticks until a predicate holds depends on the scheduler and runner load. " +
  "Await the promise, Deferred, Queue, Stream element, or event that marks the milestone, " +
  "Where only an external system such as a test container can signal it, use the suite's shared `waitFor` helper or `vi.waitFor`.";

type LoopNode =
  | ESTree.ForStatement
  | ESTree.WhileStatement
  | ESTree.DoWhileStatement;

const isTimerReference = (node: ESTree.Node | null | undefined) => {
  const expression = unwrap(node);

  return expression?.type === "Identifier" && TIMERS.has(expression.name);
};

const isTickPromise = (node: ESTree.Node | null | undefined) => {
  const expression = unwrap(node);

  if (expression?.type === "CallExpression")
    return isMemberCall(expression.callee, "Promise.resolve");

  if (
    expression?.type !== "NewExpression" ||
    !isIdentifier(expression.callee, "Promise")
  )
    return false;

  const [executor] = expression.arguments;

  if (isTimerReference(executor)) return true;

  if (
    !isNode(executor) ||
    !FUNCTIONS.has(executor.type) ||
    !("body" in executor)
  )
    return false;

  return someDescendant(
    executor.body,
    (child) =>
      child.type === "CallExpression" && isTimerReference(child.callee),
  );
};

const isWait = (node: ESTree.Node) => {
  if (node.type === "MemberExpression")
    return isMemberCall(node, "Effect.yieldNow");

  if (node.type === "AwaitExpression") return isTickPromise(node.argument);

  if (node.type === "NewExpression") return isTickPromise(node);

  if (node.type !== "CallExpression") return false;

  return (
    SLEEPS.some((sleep) => isMemberCall(node.callee, sleep)) ||
    isIdentifier(node.callee, "setImmediate")
  );
};

const hasConditionalExit = (body: ESTree.Node) =>
  someDescendant(
    body,
    (node) =>
      node.type === "IfStatement" &&
      someDescendant(
        [node.consequent, node.alternate],
        (child) =>
          child.type === "ReturnStatement" ||
          child.type === "BreakStatement" ||
          child.type === "ThrowStatement",
      ),
  );

const updatesCounter = (nodes: readonly (ESTree.Node | null)[], name: string) =>
  someDescendant(
    nodes,
    (child) =>
      (child.type === "UpdateExpression" &&
        isIdentifier(child.argument, name)) ||
      (child.type === "AssignmentExpression" &&
        (child.operator === "+=" || child.operator === "-=") &&
        isIdentifier(child.left, name)),
  );

const isCounterTest = (loop: LoopNode) => {
  const test = unwrap(loop.test);

  if (
    test?.type !== "BinaryExpression" ||
    !COUNTER_OPERATORS.has(test.operator)
  )
    return false;

  const advances = [
    loop.body,
    loop.type === "ForStatement" ? loop.update : null,
  ];

  return [
    [test.left, test.right],
    [test.right, test.left],
  ].some(([counter, bound]) => {
    const name = unwrap(counter);
    const limit = unwrap(bound);

    return (
      name?.type === "Identifier" &&
      (limit?.type === "Identifier" || isNumericLiteral(limit)) &&
      updatesCounter(advances, name.name)
    );
  });
};

const hasPredicateExit = (loop: LoopNode) =>
  hasConditionalExit(loop.body) ||
  (loop.test !== null &&
    !isTrueLiteral(unwrap(loop.test)) &&
    !isCounterTest(loop));

export const noPollingLoopInTestsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow loops in tests that spin on sleeps or ticks until a predicate holds; await the milestone instead.",
    },
    schema: baselineOptionSchema,
  },
  create(context) {
    if (!TEST_FILE.test(context.filename)) return {};

    const findings = budgetedReporter(context);

    const check = (loop: LoopNode) => {
      if (someDescendant(loop.body, isWait) && hasPredicateExit(loop))
        findings.add(loop, MESSAGE);
    };

    return {
      ForStatement: check,
      WhileStatement: check,
      DoWhileStatement: check,
      "Program:exit": findings.flush,
    };
  },
});
