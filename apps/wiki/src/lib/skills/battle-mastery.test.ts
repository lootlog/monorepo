import { describe, expect, test } from "vitest";
import { moveMasteryAction } from "./battle-mastery";

const mastery = { actions: [10, 20, 30, 40], repeat: true };

describe("moveMasteryAction", () => {
  test.each([
    { from: 0, to: 2, actions: [20, 30, 10, 40] },
    { from: 3, to: 1, actions: [10, 40, 20, 30] },
    { from: 1, to: 1, actions: [10, 20, 30, 40] },
    { from: 2, to: 4, actions: [10, 20, 30, 40] },
    { from: 0, to: -1, actions: [10, 20, 30, 40] },
  ])("moves position $from to $to", ({ from, to, actions }) => {
    expect(moveMasteryAction(mastery, from, to)).toEqual({
      actions,
      repeat: true,
    });
  });
});
