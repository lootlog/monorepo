import { join, resolve } from "node:path";

import { findDiagnostics } from "../tools/oxlint/find-diagnostics.ts";

const repositoryRoot = resolve(import.meta.dir, "..");

const configPaths = [".oxlintrc.json", ".oxlintrc.react.json"];

type Budgets = Readonly<Record<string, number>>;

export type Ratchet = {
  readonly budgets: Budgets;
  readonly grown: readonly string[];
  readonly shrunk: readonly string[];
};

type RuleSetting = string | readonly [string, { readonly baseline?: string }?];

type OxlintConfig = {
  readonly rules?: Readonly<Record<string, RuleSetting>>;
};

export type BudgetedRule = { readonly rule: string; readonly baseline: string };

export function ratchetBudgets(budgets: Budgets, counts: Budgets): Ratchet {
  const files = [
    ...new Set([...Object.keys(budgets), ...Object.keys(counts)]),
  ].toSorted();

  const next: Record<string, number> = {};
  const grown: string[] = [];
  const shrunk: string[] = [];

  for (const file of files) {
    const budget = budgets[file] ?? 0;
    const count = counts[file] ?? 0;

    if (count > budget) grown.push(file);

    if (count < budget) shrunk.push(file);
    const allowed = Math.min(budget, count);

    if (allowed > 0) next[file] = allowed;
  }

  return { budgets: next, grown, shrunk };
}

export function budgetedRules(
  configs: readonly OxlintConfig[],
): BudgetedRule[] {
  return configs.flatMap((config) =>
    Object.entries(config.rules ?? {}).flatMap(([rule, setting]) => {
      const baseline = Array.isArray(setting)
        ? setting[1]?.baseline
        : undefined;

      return baseline === undefined ? [] : [{ rule, baseline }];
    }),
  );
}

async function readBudgetedRules(): Promise<BudgetedRule[]> {
  const configs: OxlintConfig[] = await Promise.all(
    configPaths.map(async (path) =>
      Bun.JSONC.parse(await Bun.file(join(repositoryRoot, path)).text()),
    ),
  );

  return budgetedRules(configs);
}

async function main(): Promise<void> {
  const update = process.argv.includes("--update");
  const rules = await readBudgetedRules();

  const diagnostics = Object.groupBy(
    await findDiagnostics(
      rules.map(({ rule }) => rule),
      ["."],
    ),
    (diagnostic) => diagnostic.rule,
  );

  let failed = false;

  for (const { rule, baseline } of rules) {
    const baselineFile = Bun.file(join(repositoryRoot, baseline));

    const counts = Object.fromEntries(
      Object.entries(
        Object.groupBy(
          diagnostics[rule] ?? [],
          (diagnostic) => diagnostic.file,
        ),
      ).map(([file, found]) => [file, found?.length ?? 0]),
    );

    const ratchet = ratchetBudgets(await baselineFile.json(), counts);

    if (update && ratchet.shrunk.length > 0) {
      await Bun.write(
        baselineFile,
        `${JSON.stringify(ratchet.budgets, null, 2)}\n`,
      );
      console.warn(
        `Lowered the ${rule} budget of ${ratchet.shrunk.length} files.`,
      );
    }

    if (ratchet.grown.length > 0) {
      failed = true;
      console.error(
        `These files have more ${rule} findings than ${baseline} allows. Fix the new findings; the budget never grows:\n${ratchet.grown.join("\n")}`,
      );
    }

    if (!update && ratchet.shrunk.length > 0) {
      failed = true;
      console.error(
        `These files have fewer ${rule} findings than ${baseline} allows. Run \`bun run lint:ratchet --update\` to lock in the reduction:\n${ratchet.shrunk.join("\n")}`,
      );
    }
  }

  if (failed) process.exit(1);
}

if (import.meta.main) await main();
