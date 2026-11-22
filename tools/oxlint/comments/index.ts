import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { defineRule, eslintCompatPlugin, type ESTree } from "@oxlint/plugins";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

const toolDirectivePatterns = [
  /^(?:oxlint|eslint)-(?:disable|enable)/u,
  /^@ts-(?:expect-error|ignore|nocheck|check)\b/u,
  /^@effect-diagnostics(?:-next-line)?\b/u,
  /^\/\s*<reference\b/u,
  /^@vitest-environment\b/u,
  /^[#@]__PURE__$/u,
  /^@vite-ignore$/u,
  /^@alias$/u,
  /^@jsx(?:ImportSource|Runtime)?\b/u,
];

const safetyJustification = /(?:^|[^\p{L}\p{N}_])SAFETY\s*:\s*\S/u;

function isToolDirective(value: string): boolean {
  const text = value.replace(/^\*/u, "").trim();

  return toolDirectivePatterns.some((pattern) => pattern.test(text));
}

function readBudgets(
  baselinePath: string | undefined,
): ReadonlyMap<string, number> {
  if (baselinePath === undefined) return new Map();

  const budgets: Record<string, number> = JSON.parse(
    readFileSync(resolve(repositoryRoot, baselinePath), "utf8"),
  );

  return new Map(Object.entries(budgets));
}

const noCommentsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow prose comments. Name the concept in code, record a decision in docs/adr, or file an issue for a hack.",
    },
    schema: [
      {
        type: "object",
        properties: { baseline: { type: "string", minLength: 1 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      comment:
        "Delete this comment: name the concept in code, move a decision into docs/adr, or file an issue for the hack it excuses. This file has {{count}} comments and the ratchet allows {{budget}}.",
    },
  },
  createOnce(context) {
    let budgets: ReadonlyMap<string, number> | undefined;
    let emptyContainers: ESTree.Node[] = [];

    return {
      Program() {
        emptyContainers = [];
      },
      JSXEmptyExpression(node) {
        emptyContainers.push(node.parent);
      },
      "Program:exit"() {
        budgets ??= readBudgets(context.options[0]?.baseline);

        const comments: ESTree.Comment[] = [];
        let safetyLineEnd = -1;
        let inUserscriptHeader = false;

        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === "Shebang") continue;

          if (isToolDirective(comment.value)) continue;

          const userscriptMarker = comment.value.trim();

          if (userscriptMarker === "==UserScript==") inUserscriptHeader = true;

          if (inUserscriptHeader) {
            if (userscriptMarker === "==/UserScript==")
              inUserscriptHeader = false;

            continue;
          }

          const continuesSafety =
            comment.type === "Line" &&
            comment.loc.start.line === safetyLineEnd + 1;

          if (continuesSafety || safetyJustification.test(comment.value)) {
            safetyLineEnd = comment.loc.end.line;
          } else {
            comments.push(comment);
          }
        }

        const budget =
          budgets.get(relative(repositoryRoot, context.filename)) ?? 0;

        if (comments.length <= budget) return;

        for (const comment of comments) {
          const container = emptyContainers.find(
            (node) => node.start < comment.start && comment.end < node.end,
          );

          context.report({
            node: container ?? comment,
            messageId: "comment",
            data: { count: String(comments.length), budget: String(budget) },
          });
        }
      },
    };
  },
});

const commentsPlugin = eslintCompatPlugin({
  meta: { name: "lootlog-comments" },
  rules: { "no-comments": noCommentsRule },
});

export default commentsPlugin;
