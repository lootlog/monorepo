import type { ESTree } from "@oxlint/plugins";

export const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

export const INSTALLS_FAKE_TIMERS = /\buseFakeTimers\b|\bsetSystemTime\b/u;

export const FUNCTIONS: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);

const WRAPPERS: ReadonlySet<string> = new Set([
  "ChainExpression",
  "ParenthesizedExpression",
  "TSNonNullExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

type AstValue =
  | ESTree.Node
  | readonly AstValue[]
  | string
  | number
  | boolean
  | bigint
  | RegExp
  | null
  | undefined;

export const isNode = (value: AstValue): value is ESTree.Node =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

export const isStringLiteral = (
  node: ESTree.Node | undefined,
): node is ESTree.StringLiteral =>
  node?.type === "Literal" && typeof node.value === "string";

export const isNumericLiteral = (
  node: ESTree.Node | undefined,
): node is ESTree.NumericLiteral =>
  node?.type === "Literal" && typeof node.value === "number";

export const isTrueLiteral = (
  node: ESTree.Node | undefined,
): node is ESTree.BooleanLiteral =>
  node?.type === "Literal" && node.value === true;

export const unwrap = (
  node: ESTree.Node | null | undefined,
): ESTree.Node | undefined => {
  let current = node ?? undefined;

  while (current && WRAPPERS.has(current.type) && "expression" in current) {
    current = current.expression;
  }

  return current;
};

export const propertyName = (node: ESTree.Node | null | undefined) => {
  const expression = unwrap(node);

  if (expression?.type === "Identifier") return expression.name;

  if (isStringLiteral(expression)) return expression.value;

  return undefined;
};

export const isIdentifier = (
  node: ESTree.Node | null | undefined,
  name: string,
) => {
  const expression = unwrap(node);

  return expression?.type === "Identifier" && expression.name === name;
};

export const memberPath = (
  node: ESTree.Node | null | undefined,
): readonly string[] | undefined => {
  const expression = unwrap(node);

  if (expression?.type === "Identifier") return [expression.name];

  if (expression?.type !== "MemberExpression") return undefined;

  if (expression.computed && unwrap(expression.property)?.type !== "Literal")
    return undefined;

  const property = propertyName(expression.property);
  const object = memberPath(expression.object);

  return property === undefined || object === undefined
    ? undefined
    : [...object, property];
};

export const isMemberCall = (
  node: ESTree.Node | null | undefined,
  path: string,
) => memberPath(node)?.join(".") === path;

export const chainRoot = (
  node: ESTree.Node | null | undefined,
): string | undefined => {
  const expression = unwrap(node);

  if (expression?.type === "Identifier") return expression.name;

  if (expression?.type === "MemberExpression")
    return chainRoot(expression.object);

  if (expression?.type === "CallExpression")
    return chainRoot(expression.callee);

  return undefined;
};

export const someDescendant = (
  node: AstValue,
  match: (node: ESTree.Node) => boolean,
): boolean => {
  if (Array.isArray(node))
    return node.some((child: AstValue) => someDescendant(child, match));

  if (!isNode(node)) return false;

  if (match(node)) return true;

  if (FUNCTIONS.has(node.type)) return false;

  return Object.entries(node).some(
    ([key, value]: [string, AstValue]) =>
      key !== "parent" && someDescendant(value, match),
  );
};
