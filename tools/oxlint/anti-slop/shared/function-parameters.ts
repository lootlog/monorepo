import type { ESTree, SourceCode } from "@oxlint/plugins";

export type FunctionParameter = ESTree.ParamPattern;

/** Return whether a type is or contains TypeScript's absorbing unknown top type. */
export function containsUnknownType(type: ESTree.TSType): boolean {
	if (type.type === "TSUnknownKeyword") return true;
	if (type.type === "TSParenthesizedType") return containsUnknownType(type.typeAnnotation);
	return type.type === "TSUnionType" && type.types.some(containsUnknownType);
}

/** Return the TypeScript annotation attached to a function parameter or its wrapped binding. */
export function functionParameterTypeAnnotation(
	parameter: FunctionParameter,
): ESTree.TSTypeAnnotation | null | undefined {
	if (parameter.type === "TSParameterProperty") {
		return functionParameterTypeAnnotation(parameter.parameter);
	}
	if (parameter.type === "RestElement") {
		return parameter.typeAnnotation ?? functionParameterTypeAnnotation(parameter.argument);
	}
	if (parameter.type === "AssignmentPattern") {
		return parameter.typeAnnotation ?? functionParameterTypeAnnotation(parameter.left);
	}
	return parameter.typeAnnotation;
}

/** Return only a function parameter's local binding, excluding its annotation and default value. */
export function functionParameterBindingName(
	parameter: FunctionParameter,
	sourceCode: SourceCode,
): string {
	if (parameter.type === "TSParameterProperty") {
		return functionParameterBindingName(parameter.parameter, sourceCode);
	}
	if (parameter.type === "AssignmentPattern") {
		return functionParameterBindingName(parameter.left, sourceCode);
	}
	if (parameter.type === "RestElement") {
		return functionParameterBindingName(parameter.argument, sourceCode);
	}
	if (parameter.type === "Identifier") return parameter.name;

	const sourceText = sourceCode.getText(parameter);
	const annotationStart = parameter.typeAnnotation?.start;
	return annotationStart === undefined
		? sourceText
		: sourceText.slice(0, annotationStart - parameter.start).trimEnd();
}

/** Resolve only the declaration's own name, never a surrounding caller's name. */
export function functionDeclarationName(node: ESTree.Node): string | null {
  if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && node.id) {
    return node.id.name;
  }
  if (node.type === "TSMethodSignature" && !node.computed && node.key.type === "Identifier") return node.key.name;
  const parent = node.parent;
  if (node.type === "TSFunctionType" && parent.type === "TSTypeAliasDeclaration" && parent.typeAnnotation === node) {
    return parent.id.name;
  }
  if (node.type === "TSFunctionType" && parent.type === "TSTypeAnnotation" &&
      parent.typeAnnotation === node && parent.parent.type === "TSPropertySignature" &&
      parent.parent.typeAnnotation === parent && !parent.parent.computed) {
    const key = parent.parent.key;
    if (key.type === "Identifier") return key.name;
    if (key.type === "Literal" && typeof key.value === "string") return key.value;
  }
  if (parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name;
  }
  if ((parent.type === "Property" || parent.type === "MethodDefinition") &&
      parent.value === node && !parent.computed) {
    if (parent.key.type === "Identifier") return parent.key.name;
    if (parent.key.type === "Literal" && typeof parent.key.value === "string") return parent.key.value;
  }
  return null;
}

/** Return the nearest runtime function, keeping callback boundaries distinct. */
export function containingRuntimeFunction(
  node: ESTree.Node,
): ESTree.ArrowFunctionExpression | ESTree.Function | null {
  let current: ESTree.Node | null = node.parent;
  while (current !== null && current.type !== "Program") {
    if (current.type === "ArrowFunctionExpression" || current.type === "FunctionDeclaration" || current.type === "FunctionExpression") return current;
    current = current.parent;
  }
  return null;
}
