import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createItemStatsHash } from "../src/snapshot-hash.js";

test("seed and live ingestion keep item identity despite ordering and transient stats", () => {
  const expected = createHash("sha256").update("ac=15;lvl=100").digest("hex");
  expect(
    createItemStatsHash("lvl=100;created=1;ac=15;gold=50;amount=2;opis=text;"),
  ).toBe(expected);
  expect(createItemStatsHash("ac=15;lvl=100")).toBe(expected);
  expect(createItemStatsHash("ac=16;lvl=100")).not.toBe(expected);
  expect(createItemStatsHash("ac=15;ac=15;lvl=100")).not.toBe(expected);
});
