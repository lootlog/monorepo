import { defineRule } from "@oxlint/plugins";

const GENERATED_FILE = /\.gen\.[cm]?[jt]sx?$/u;

const TS_DIRECTIVE =
  /^\s*\*?\s*@ts-(?:expect-error|ignore|nocheck)(?![\w-])(.*)$/su;

const EFFECT_DIRECTIVE =
  /^\s*\*?\s*@effect-diagnostics(?:-next-line)?((?:\s+[\w-]+:\w+)*)(.*)$/su;

const LINT_MESSAGE =
  "Say why this rule does not apply here: end the directive with ` -- <reason>`.";

const TOOL_MESSAGE =
  "Say why this check does not apply here: write the reason after the directive.";

const hasReason = (text: string) => text.replace(/^[\s:-]+/u, "").trim() !== "";

export const requireSuppressionReasonRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require every lint, type-checker, or Effect diagnostics suppression to say why.",
    },
  },
  create(context) {
    if (GENERATED_FILE.test(context.filename)) return {};

    return {
      Program() {
        const { sourceCode } = context;

        for (const directive of sourceCode.getDisableDirectives().directives) {
          if (directive.type === "enable" || directive.justification.trim())
            continue;

          context.report({ loc: directive.node.loc, message: LINT_MESSAGE });
        }

        for (const comment of sourceCode.getAllComments()) {
          const reason =
            TS_DIRECTIVE.exec(comment.value)?.[1] ??
            EFFECT_DIRECTIVE.exec(comment.value)?.[2];

          if (reason === undefined || hasReason(reason)) continue;

          context.report({ loc: comment.loc, message: TOOL_MESSAGE });
        }
      },
    };
  },
});
