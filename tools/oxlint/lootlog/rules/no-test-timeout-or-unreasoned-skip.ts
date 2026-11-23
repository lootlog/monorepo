import { defineRule, type ESTree } from "@oxlint/plugins";

import {
  TEST_FILE,
  chainRoot,
  isNumericLiteral,
  isTrueLiteral,
  propertyName,
  unwrap,
} from "../ast.ts";
import { baselineOptionSchema, budgetedReporter } from "../budget.ts";

const CONTAINER_TEST_FILE =
  /\.(?:integration|e2e)\.(?:test|spec)\.[cm]?[jt]sx?$/u;

const TEST_FUNCTIONS: ReadonlySet<string> = new Set([
  "describe",
  "it",
  "suite",
  "test",
]);

const HOOK_FUNCTIONS: ReadonlySet<string> = new Set([
  "afterAll",
  "afterEach",
  "beforeAll",
  "beforeEach",
]);

const SKIP_MODIFIERS: ReadonlySet<string> = new Set(["only", "skip", "todo"]);

const SKIP_FUNCTIONS: ReadonlySet<string> = new Set([
  "fdescribe",
  "fit",
  "xdescribe",
  "xit",
  "xtest",
]);

const TIMEOUT_OPTIONS: ReadonlySet<string> = new Set(["retry", "timeout"]);

const CONFIG_OPTIONS: ReadonlySet<string> = new Set([
  "hookTimeout",
  "retry",
  "testTimeout",
]);

export const QUARANTINE = /^\s*quarantine:\s*#\d+\s+\S/u;

const TIMEOUT_MESSAGE =
  "Per-test timeouts and retries hide waits that should be event-driven; the runner's timeout is the ceiling. " +
  "Remove the override and await the milestone. Suites that start containers (`*.integration.test.ts`, `*.e2e.test.ts`) may set timeouts.";

const SKIP_MESSAGE =
  "A skipped or focused test needs a tracking issue on the line above: `// quarantine: #1234 <why>`.";

const isTestChain = (node: ESTree.Node) => {
  const root = chainRoot(node);

  return root !== undefined && TEST_FUNCTIONS.has(root);
};

const optionsOf = (node: ESTree.Node | ESTree.SpreadElement | undefined) => {
  const expression = node?.type === "SpreadElement" ? undefined : unwrap(node);

  return expression?.type === "ObjectExpression"
    ? expression.properties.flatMap((property) =>
        property.type === "Property"
          ? [
              {
                name: propertyName(property.key),
                value: unwrap(property.value),
              },
            ]
          : [],
      )
    : [];
};

const hasOption = (
  node: ESTree.Node | ESTree.SpreadElement | undefined,
  names: ReadonlySet<string>,
) => optionsOf(node).some(({ name }) => name !== undefined && names.has(name));

const enablesOption = (
  node: ESTree.Node | ESTree.SpreadElement | undefined,
  names: ReadonlySet<string>,
) =>
  optionsOf(node).some(
    ({ name, value }) =>
      name !== undefined && names.has(name) && isTrueLiteral(value),
  );

const isNumber = (node: ESTree.Node | ESTree.SpreadElement | undefined) =>
  isNumericLiteral(node?.type === "SpreadElement" ? undefined : unwrap(node));

const overridesTimeout = (node: ESTree.CallExpression) => {
  const callee = unwrap(node.callee);
  const [first, second, third] = node.arguments;

  if (callee?.type === "Identifier" && callee.name === "setDefaultTimeout")
    return true;

  if (
    callee?.type === "MemberExpression" &&
    chainRoot(callee.object) === "vi" &&
    propertyName(callee.property) === "setConfig"
  )
    return hasOption(first, CONFIG_OPTIONS);

  if (callee?.type === "Identifier" && HOOK_FUNCTIONS.has(callee.name))
    return isNumber(second) || hasOption(second, TIMEOUT_OPTIONS);

  return (
    callee !== undefined &&
    isTestChain(callee) &&
    (isNumber(third) ||
      hasOption(third, TIMEOUT_OPTIONS) ||
      hasOption(second, TIMEOUT_OPTIONS))
  );
};

const enclosingStatement = (node: ESTree.Node) => {
  let current: ESTree.Node = node;

  while (current.parent && !/(?:Statement|Declaration)$/u.test(current.type))
    current = current.parent;

  return current;
};

export const noTestTimeoutOrUnreasonedSkipRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow per-test timeouts and retries, and require a tracking issue for skipped or focused tests.",
    },
    schema: baselineOptionSchema,
  },
  create(context) {
    if (!TEST_FILE.test(context.filename)) return {};

    const checkTimeouts = !CONTAINER_TEST_FILE.test(context.filename);
    const findings = budgetedReporter(context);

    const reportUnlessQuarantined = (node: ESTree.Node) => {
      const comments = context.sourceCode.getCommentsBefore(
        enclosingStatement(node),
      );

      if (!comments.some((comment) => QUARANTINE.test(comment.value)))
        findings.add(node, SKIP_MESSAGE);
    };

    return {
      CallExpression(node) {
        if (checkTimeouts && overridesTimeout(node))
          findings.add(node, TIMEOUT_MESSAGE);

        const [, second, third] = node.arguments;

        if (
          isTestChain(node.callee) &&
          (enablesOption(second, SKIP_MODIFIERS) ||
            enablesOption(third, SKIP_MODIFIERS))
        )
          reportUnlessQuarantined(node);
      },
      Identifier(node) {
        const parent = node.parent;

        if (
          SKIP_FUNCTIONS.has(node.name) &&
          parent?.type === "CallExpression" &&
          parent.callee === node
        )
          reportUnlessQuarantined(node);
      },
      MemberExpression(node) {
        const modifier = propertyName(node.property);

        if (modifier === undefined || !SKIP_MODIFIERS.has(modifier)) return;

        if (node.computed && unwrap(node.property)?.type !== "Literal") return;

        if (isTestChain(node.object)) reportUnlessQuarantined(node);
      },
      "Program:exit": findings.flush,
    };
  },
});
