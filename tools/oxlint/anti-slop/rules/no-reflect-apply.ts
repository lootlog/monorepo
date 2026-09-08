import { defineRule } from "@oxlint/plugins";

import { containingRuntimeFunction, functionDeclarationName } from "../shared/function-parameters.ts";

import { isGlobalReflectMethodCall } from "../shared/reflect-method.ts";

/** Ban Reflect.apply, which bypasses ordinary typed function calls. */
export const noReflectApplyRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Reflect.apply; call typed functions directly or model dynamic dispatch behind an interface.",
    },
    schema: [{
      type: "object",
      properties: {
        boundaryFunctions: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
      },
      additionalProperties: false,
    }],
    defaultOptions: [{ boundaryFunctions: [] }],
    messages: {
      reflectApply:
        "Replace `Reflect.apply` with a typed function call. Model dynamic dispatch behind a named interface.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === "Super" || node.callee.type === "V8IntrinsicExpression") return;
        const owner = containingRuntimeFunction(node);
        const name = owner === null ? null : functionDeclarationName(owner);
        if (name !== null && context.options[0]?.boundaryFunctions?.includes(name)) return;
        if (isGlobalReflectMethodCall(context.sourceCode, node.callee, "apply")) {
          context.report({ node, messageId: "reflectApply" });
        }
      },
    };
  },
});
