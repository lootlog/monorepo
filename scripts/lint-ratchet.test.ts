import { expect, test } from "bun:test";

import { budgetedRules, ratchetBudgets } from "./lint-ratchet.ts";

test("a file never gains budget, and a reduction becomes its new budget", () => {
  const ratchet = ratchetBudgets(
    { "grew.ts": 2, "shrank.ts": 5, "cleared.ts": 3, "deleted.ts": 1 },
    { "grew.ts": 3, "shrank.ts": 4, "new.ts": 1 },
  );

  expect(ratchet.budgets).toEqual({ "grew.ts": 2, "shrank.ts": 4 });
  expect(ratchet.grown).toEqual(["grew.ts", "new.ts"]);
  expect(ratchet.shrunk).toEqual(["cleared.ts", "deleted.ts", "shrank.ts"]);
});

test("every rule configured with a baseline is ratcheted, whichever config enables it", () => {
  expect(
    budgetedRules([
      {
        rules: {
          eqeqeq: "error",
          "lootlog-comments/no-comments": [
            "error",
            { baseline: "comments.json" },
          ],
          "lootlog/no-wall-clock-in-tests": ["error"],
        },
      },
      {
        rules: {
          "lootlog/no-unreasoned-state-sync": [
            "error",
            { baseline: "effects.json" },
          ],
        },
      },
    ]),
  ).toEqual([
    { rule: "lootlog-comments/no-comments", baseline: "comments.json" },
    { rule: "lootlog/no-unreasoned-state-sync", baseline: "effects.json" },
  ]);
});
