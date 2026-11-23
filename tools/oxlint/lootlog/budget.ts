import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { Context, ESTree } from "@oxlint/plugins";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

const budgetsByBaseline = new Map<string, ReadonlyMap<string, number>>();

export const baselineOptionSchema = [
  {
    type: "object" as const,
    properties: { baseline: { type: "string" as const, minLength: 1 } },
    additionalProperties: false,
  },
];

const readBudgets = (baselinePath: string): ReadonlyMap<string, number> => {
  const cached = budgetsByBaseline.get(baselinePath);

  if (cached) return cached;

  const budgets: Record<string, number> = JSON.parse(
    readFileSync(resolve(repositoryRoot, baselinePath), "utf8"),
  );

  const parsed = new Map(Object.entries(budgets));
  budgetsByBaseline.set(baselinePath, parsed);

  return parsed;
};

export const fileBudget = (
  filename: string,
  baselinePath: string | undefined,
) => {
  if (baselinePath === undefined) return 0;

  return readBudgets(baselinePath).get(relative(repositoryRoot, filename)) ?? 0;
};

type Finding = {
  readonly node: ESTree.Node | ESTree.Comment;
  readonly message: string;
};

const namesRule = (value: string, ruleId: string) => {
  const rules = value
    .split(",")
    .map((rule) => rule.trim())
    .filter((rule) => rule !== "");

  return (
    rules.length === 0 ||
    rules.some(
      (rule) =>
        rule === ruleId || (rule.includes("/") && ruleId.endsWith(`/${rule}`)),
    )
  );
};

const suppressedLines = (context: Context) => {
  const lines = new Set<number>();
  let disabledFrom: number | undefined;

  for (const directive of context.sourceCode.getDisableDirectives()
    .directives) {
    if (!namesRule(directive.value, context.id)) continue;

    const { start, end } = directive.node.loc;

    if (directive.type === "disable-line") lines.add(start.line);

    if (directive.type === "disable-next-line") lines.add(end.line + 1);

    if (directive.type === "disable") disabledFrom ??= start.line;

    if (directive.type === "enable" && disabledFrom !== undefined) {
      for (let line = disabledFrom; line <= start.line; line++) lines.add(line);

      disabledFrom = undefined;
    }
  }

  return { lines, disabledFrom };
};

const isSuppressed = (
  suppressed: ReturnType<typeof suppressedLines>,
  finding: Finding,
) => {
  const { line } = finding.node.loc.start;

  return (
    suppressed.lines.has(line) ||
    (suppressed.disabledFrom !== undefined && line >= suppressed.disabledFrom)
  );
};

export const budgetedReporter = (context: Context) => {
  const reported: Finding[] = [];

  return {
    add: (node: Finding["node"], message: string) => {
      reported.push({ node, message });
    },
    flush: () => {
      const budget = fileBudget(context.filename, context.options[0]?.baseline);

      if (reported.length <= budget) return;

      const suppressed = suppressedLines(context);

      const findings = reported.filter(
        (finding) => !isSuppressed(suppressed, finding),
      );

      if (findings.length <= budget) return;

      const ratchet =
        budget === 0
          ? ""
          : ` This file has ${findings.length} findings and the ratchet allows ${budget}.`;

      for (const { node, message } of findings) {
        context.report({ loc: node.loc, message: `${message}${ratchet}` });
      }
    },
  };
};
