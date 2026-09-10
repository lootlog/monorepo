import { resolveVariable } from "./scope.ts";
import { createTypeAliasEnvironment, hasVisibleTypeBinding } from "./type-alias-resolution.ts";

import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";

/** Unwrap syntax-only wrappers when inspecting array methods and accumulator references. */
export function unwrapArrayExpression(node: ESTree.Node): ESTree.Node {
  while (
    node.type === "ParenthesizedExpression" ||
    node.type === "ChainExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  ) {
    node = node.expression;
  }
  return node;
}

/** Resolve a local binding by scope, not by identifier spelling. */
export function resolveArrayBinding(sourceCode: SourceCode, node: ESTree.Node): Variable | null {
  node = unwrapArrayExpression(node);
  return node.type === "Identifier" ? resolveVariable(sourceCode, node) : null;
}

/** Read static method names, including computed string literals, without evaluating expressions. */
export function arrayMethodTarget(
  node: ESTree.Node,
): { readonly name: string; readonly object: ESTree.Node } | null {
  node = unwrapArrayExpression(node);
  if (node.type !== "MemberExpression") return null;
  const property = node.property;
  if (!node.computed && property.type === "Identifier") {
    return { name: property.name, object: node.object };
  }
  if (node.computed && property.type === "Literal" && typeof property.value === "string") {
    return { name: property.value, object: node.object };
  }
  return null;
}

function enclosingProgram(node: ESTree.Node): ESTree.Program {
  let current: ESTree.Node = node;
  while (current.type !== "Program") current = current.parent;
  return current;
}

function isArrayAnnotation(sourceCode: SourceCode, type: ESTree.TSType): boolean {
  if (type.type === "TSArrayType" || type.type === "TSTupleType") return true;
  if (type.type === "TSParenthesizedType") return isArrayAnnotation(sourceCode, type.typeAnnotation);
  if (type.type === "TSTypeOperator" && type.operator === "readonly") {
    return isArrayAnnotation(sourceCode, type.typeAnnotation);
  }
  if (type.type !== "TSTypeReference" || type.typeName.type !== "Identifier") return false;
  const name = type.typeName.name;
  if (name !== "Array" && name !== "ReadonlyArray") return false;
  // A local import, alias, class, or type parameter named Array is not native-array evidence.
  const environment = createTypeAliasEnvironment(enclosingProgram(type), sourceCode.visitorKeys);
  return !hasVisibleTypeBinding(name, type, environment);
}

/** Recognize local array evidence; unknown receivers and iterator pipelines are deliberately excluded. */
export function isKnownArrayExpression(
  sourceCode: SourceCode,
  node: ESTree.Node,
  visited = new Set<Variable>(),
): boolean {
  node = unwrapArrayExpression(node);
  if (node.type === "ArrayExpression") return true;
  if (node.type === "CallExpression") {
    const method = arrayMethodTarget(node.callee);
    return (
      method !== null &&
      ["map", "filter", "flatMap", "slice", "concat", "toSorted", "toReversed", "toSpliced"].includes(method.name) &&
      isKnownArrayExpression(sourceCode, method.object, visited)
    );
  }
  if (node.type !== "Identifier") return false;
  const variable = resolveArrayBinding(sourceCode, node);
  if (variable === null || visited.has(variable)) return false;
  visited.add(variable);
  if (variable.references.some(reference => reference.isWrite() && !reference.init)) return false;
  for (const identifier of variable.identifiers) {
    const annotation = identifier.typeAnnotation?.typeAnnotation;
    if (annotation !== undefined) return isArrayAnnotation(sourceCode, annotation);
  }
  for (const definition of variable.defs) {
    if (
      definition.type === "Variable" && definition.node.type === "VariableDeclarator" &&
      definition.node.id.type === "Identifier" && definition.node.init !== null &&
      definition.node.parent.type === "VariableDeclaration" && definition.node.parent.kind === "const"
    ) {
      return isKnownArrayExpression(sourceCode, definition.node.init, visited);
    }
  }
  return false;
}
