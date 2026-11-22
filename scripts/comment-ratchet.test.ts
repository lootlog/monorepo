import { expect, test } from "bun:test";

import { ratchetBudgets } from "./comment-ratchet.ts";

test("a file never gains comment budget, and a reduction becomes its new budget", () => {
  const ratchet = ratchetBudgets(
    { "grew.ts": 2, "shrank.ts": 5, "cleared.ts": 3, "deleted.ts": 1 },
    { "grew.ts": 3, "shrank.ts": 4, "new.ts": 1 },
  );

  expect(ratchet.budgets).toEqual({ "grew.ts": 2, "shrank.ts": 4 });
  expect(ratchet.grown).toEqual(["grew.ts", "new.ts"]);
  expect(ratchet.shrunk).toEqual(["cleared.ts", "deleted.ts", "shrank.ts"]);
});
