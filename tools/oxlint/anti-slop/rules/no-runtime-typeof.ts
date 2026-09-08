import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";
import { containingRuntimeFunction, functionDeclarationName } from "../shared/function-parameters.ts";

function isInsideBoundary(node: ESTree.Node, allowTypeGuards: boolean, boundaryFunctions: readonly string[]): boolean {
  const owner = containingRuntimeFunction(node);
  if (!owner) return false;
  const name = functionDeclarationName(owner);
  return (allowTypeGuards && owner.returnType?.typeAnnotation.type === "TSTypePredicate") ||
    (name !== null && boundaryFunctions.includes(name));
}

/** Return whether typeof safely probes for the existence of a possibly absent binding. */
function isExistenceProbe(node: ESTree.UnaryExpression): boolean {
	const parent = node.parent;
	if (parent.type !== "BinaryExpression") return false;
	if (!["===", "!==", "==", "!="].includes(parent.operator)) return false;
	const other = parent.left === node ? parent.right : parent.left;
	return other.type === "Literal" && other.value === "undefined";
}

/** Disallow runtime typeof checks that narrow unparsed values instead of decoding them. */
export const noRuntimeTypeofRule = defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow runtime typeof checks; external values must be decoded into meaningful types at their I/O boundary.",
		},
		messages: {
			runtimeTypeof:
				"A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.",
		},
		schema: [
			{
				type: "object",
				properties: {
					allowInTypeGuards: { type: "boolean" },
                    boundaryFunctions: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
				},
				additionalProperties: false,
			},
		],
		defaultOptions: [{ allowInTypeGuards: false, boundaryFunctions: [] }],
	},
	createOnce(context) {
		return {
			UnaryExpression(node) {
				const option = context.options?.[0];
				const allowInTypeGuards =
					typeof option === "object" &&
					option !== null &&
					!Array.isArray(option) &&
					option.allowInTypeGuards === true;
				if (
					node.operator === "typeof" &&
					!isExistenceProbe(node) &&
					!isInsideBoundary(node, allowInTypeGuards, option?.boundaryFunctions ?? [])
				) {
					context.report({ node, messageId: "runtimeTypeof" });
				}
			},
		};
	},
});
