import { join, resolve } from "node:path";

import { findComments } from "../tools/oxlint/comments/find-comments.ts";

const repositoryRoot = resolve(import.meta.dir, "..");

const baselinePath = "tools/oxlint/comments/baseline.json";

type Budgets = Readonly<Record<string, number>>;

export type Ratchet = {
  readonly budgets: Budgets;
  readonly grown: readonly string[];
  readonly shrunk: readonly string[];
};

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

async function countComments(): Promise<Budgets> {
  const byFile = Object.groupBy(
    await findComments(["."]),
    (comment) => comment.file,
  );

  return Object.fromEntries(
    Object.entries(byFile).map(([file, comments]) => [
      file,
      comments?.length ?? 0,
    ]),
  );
}

async function main(): Promise<void> {
  const update = process.argv.includes("--update");
  const baselineFile = Bun.file(join(repositoryRoot, baselinePath));

  const ratchet = ratchetBudgets(
    await baselineFile.json(),
    await countComments(),
  );

  if (update && ratchet.shrunk.length > 0) {
    await Bun.write(
      baselineFile,
      `${JSON.stringify(ratchet.budgets, null, 2)}\n`,
    );
    console.warn(
      `Lowered the comment budget of ${ratchet.shrunk.length} files.`,
    );
  }

  if (ratchet.grown.length > 0) {
    console.error(
      `These files have more comments than ${baselinePath} allows. Delete the new comments; the budget never grows:\n${ratchet.grown.join("\n")}`,
    );
  }

  const unlocked = !update && ratchet.shrunk.length > 0;

  if (unlocked) {
    console.error(
      `These files have fewer comments than ${baselinePath} allows. Run \`bun run comments:ratchet --update\` to lock in the reduction:\n${ratchet.shrunk.join("\n")}`,
    );
  }

  if (ratchet.grown.length > 0 || unlocked) process.exit(1);
}

if (import.meta.main) await main();
